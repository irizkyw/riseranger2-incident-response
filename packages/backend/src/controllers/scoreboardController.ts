import { Request, Response } from 'express';
import prisma from '../config/db.js';
import { fetchLeaderboardData, broadcastAttackResult } from '../sockets/scoreboardSocket.js';
import redis from '../config/redis.js';
import { calculateSolvePoints } from '../utils/scoring.js';

export const getActiveEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=15');
    const { all } = req.query;

    const events = await prisma.event.findMany({
      where: all === 'false' ? { is_active: true } : undefined,
      orderBy: [
        { is_active: 'desc' },
        { created_at: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        is_active: true,
        is_paused: true,
        is_finished: true,
        start_time: true,
        end_time: true,
        freeze_time: true,
        participation_mode: true,
        min_team_size: true,
        max_team_size: true,
        _count: {
          select: {
            teams: true,
            challenges: true
          }
        }
      }
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { event_id } = req.query;
    if (!event_id || typeof event_id !== 'string') {
      res.status(400).json({ error: 'event_id query parameter is required' });
      return;
    }

    // Set cache headers so Cloudflare and browser can cache for 5s with stale-while-revalidate
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=15');

    const event = await prisma.event.findUnique({ where: { id: event_id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const now = new Date();
    const isFrozen = Boolean(event.is_frozen || (event.freeze_time && now >= new Date(event.freeze_time)));
    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'].includes(((req as any).user?.role || '').toUpperCase());
    const isAdminView = isStaff && req.query.mode !== 'public';
    let freezeThreshold: Date | null = null;
    if (isFrozen && !isAdminView) {
      if (event.freeze_time) {
        const fTime = new Date(event.freeze_time);
        freezeThreshold = fTime <= now ? fTime : now;
      } else {
        freezeThreshold = now;
      }
    }

    const leaderboard = await fetchLeaderboardData(event_id, isAdminView);

    const challenges = await prisma.challenge.findMany({
      where: { is_active: true, event_id: event_id },
      select: {
        id: true,
        title: true,
        category: true,
        points: true,
        unlock_order: true,
        created_at: true,
        first_blood: {
          select: {
            achieved_at: true,
            team: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { unlock_order: 'asc' },
        { created_at: 'asc' }
      ]
    });

    const sanitizedChallenges = challenges.map((ch) => {
      let fb = ch.first_blood;
      if (freezeThreshold && fb && fb.achieved_at && new Date(fb.achieved_at) > freezeThreshold) {
        fb = null;
      }
      return {
        id: ch.id,
        title: ch.title,
        category: ch.category,
        points: ch.points,
        unlock_order: ch.unlock_order,
        created_at: ch.created_at,
        first_blood: fb ? { team: fb.team } : null
      };
    });

    res.json({
      is_frozen: !!isFrozen,
      leaderboard,
      challenges: sanitizedChallenges
    });
  } catch (err) {
    console.error('Scoreboard error:', err);
    res.status(500).json({ error: 'Failed to fetch scoreboard' });
  }
};

// Data for Recharts Line Chart (score progression over time)
export const getScoreProgressionChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { event_id } = req.query;
    if (!event_id || typeof event_id !== 'string') {
      res.status(400).json({ error: 'event_id query parameter is required' });
      return;
    }

    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'].includes(((req as any).user?.role || '').toUpperCase());
    const isAdminView = isStaff && req.query.mode !== 'public';
    const cacheKey = isAdminView ? `chart:${event_id}:admin` : `chart:${event_id}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    } catch (err) {
      console.warn('[Redis] Cache read error:', err);
    }

    const event = await prisma.event.findUnique({
      where: { id: event_id },
      select: { is_frozen: true, freeze_time: true }
    });

    const now = new Date();
    const isFrozen = Boolean(event?.is_frozen || (event?.freeze_time && now >= new Date(event.freeze_time)));
    let freezeThreshold: Date | null = null;
    if (isFrozen && !isAdminView) {
      if (event?.freeze_time) {
        const fTime = new Date(event.freeze_time);
        freezeThreshold = fTime <= now ? fTime : now;
      } else {
        freezeThreshold = now;
      }
    }

    // Determine top 10 teams based on appropriate (frozen or live) leaderboard
    const leaderboard = await fetchLeaderboardData(event_id, isAdminView);
    const topTeams = leaderboard.slice(0, 10);
    const teamIds = topTeams.map((t: any) => t.id);

    const solvesWhere: any = {
      team_id: { in: teamIds },
      is_correct: true
    };
    if (freezeThreshold) {
      solvesWhere.submitted_at = { lte: freezeThreshold };
    }

    // Fetch all correct submissions for these teams ordered chronologically
    const solves = await prisma.submission.findMany({
      where: solvesWhere,
      include: {
        challenge: { select: { points: true } },
        team: { select: { name: true } }
      },
      orderBy: { submitted_at: 'asc' }
    });

    // Build solve rank map for all solves in this event
    const allSolvesWhere: any = {
      is_correct: true,
      team: { is_banned: false, event_id: event_id }
    };
    if (freezeThreshold) {
      allSolvesWhere.submitted_at = { lte: freezeThreshold };
    }
    const allEventSolves = await prisma.submission.findMany({
      where: allSolvesWhere,
      orderBy: { submitted_at: 'asc' },
      select: { challenge_id: true, team_id: true }
    });

    const solveRankMap = new Map<string, number>();
    const solveCountPerChal = new Map<string, number>();
    for (const s of allEventSolves) {
      const key = `${s.challenge_id}-${s.team_id}`;
      if (!solveRankMap.has(key)) {
        const currentRank = (solveCountPerChal.get(s.challenge_id) || 0) + 1;
        solveCountPerChal.set(s.challenge_id, currentRank);
        solveRankMap.set(key, currentRank);
      }
    }

    // Build timeline data points
    const teamScores: Record<string, number> = {};
    topTeams.forEach((t: any) => { teamScores[t.name] = 0; });

    const timeline: Array<{ timestamp: string; [teamName: string]: any }> = [
      { timestamp: 'Start', ...teamScores }
    ];

    solves.forEach(solve => {
      const key = `${solve.challenge_id}-${solve.team_id}`;
      const currentRank = solveRankMap.get(key) || 1;
      const { totalPoints: earned } = calculateSolvePoints(solve.challenge.points, currentRank);

      teamScores[solve.team.name] = (teamScores[solve.team.name] || 0) + earned;
      timeline.push({
        timestamp: new Date(solve.submitted_at).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        ...teamScores
      });
    });

    if (topTeams.length > 0) {
      const currentScores: Record<string, number> = {};
      topTeams.forEach((t: any) => { currentScores[t.name] = t.score; });
      timeline.push({
        timestamp: isFrozen && !isAdminView ? 'Freeze' : 'Now',
        ...currentScores
      });
    }

    const result = {
      teams: topTeams.map((t: any) => t.name),
      timeline
    };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 10);
    } catch (cacheErr) {
      console.error('Redis cache error:', cacheErr);
    }

    res.json(result);
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ error: 'Failed to fetch chart progression data' });
  }
};

export const getEventStats = async (req: Request, res: Response): Promise<void> => {
  try {
    let { id } = req.params;
    
    // Auto-resolve active event if id is empty, 'active', 'undefined', or 'null'
    if (!id || id === 'active' || id === 'undefined' || id === 'null') {
      const activeEvent = await prisma.event.findFirst({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        select: { id: true }
      }) || await prisma.event.findFirst({
        orderBy: { created_at: 'desc' },
        select: { id: true }
      });

      if (!activeEvent) {
        res.status(404).json({ error: 'No arena event found' });
        return;
      }
      id = activeEvent.id;
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teams: true,
            users: true,
            challenges: true,
            event_tokens: true
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'].includes(((req as any).user?.role || '').toUpperCase());
    const isAdminView = isStaff && req.query.mode !== 'public';
    const now = new Date();
    const isFrozen = Boolean(event.is_frozen || (event.freeze_time && now >= new Date(event.freeze_time)));
    let freezeThreshold: Date | null = null;
    if (isFrozen && !isAdminView) {
      if (event.freeze_time) {
        const fTime = new Date(event.freeze_time);
        freezeThreshold = fTime <= now ? fTime : now;
      } else {
        freezeThreshold = now;
      }
    }

    const submissionsWhere: any = { challenge: { event_id: id } };
    if (freezeThreshold) {
      submissionsWhere.submitted_at = { lte: freezeThreshold };
    }

    const firstBloodsWhere: any = { challenge: { event_id: id } };
    if (freezeThreshold) {
      firstBloodsWhere.achieved_at = { lte: freezeThreshold };
    }

    const hintsWhere: any = { event_id: id };
    if (freezeThreshold) {
      hintsWhere.unlocked_at = { lte: freezeThreshold };
    }

    const [challenges, teams, allSubmissions, firstBloods, eventUnlockedHints, leaderboard] = await Promise.all([
      prisma.challenge.findMany({
        where: { event_id: id },
        include: {
          first_blood: {
            include: { team: { select: { id: true, name: true, color: true } } }
          }
        },
        orderBy: [
          { unlock_order: 'asc' },
          { created_at: 'asc' }
        ]
      }),
      prisma.team.findMany({
        where: { event_id: id, is_banned: false },
        include: {
          members: { include: { user: { select: { id: true, username: true } } } },
          first_bloods: {
            where: freezeThreshold ? { achieved_at: { lte: freezeThreshold } } : undefined
          }
        },
        orderBy: { score: 'desc' }
      }),
      prisma.submission.findMany({
        where: submissionsWhere,
        include: {
          challenge: { select: { id: true, category: true, points: true } },
          team: { select: { id: true, name: true } }
        }
      }),
      prisma.firstBlood.findMany({
        where: firstBloodsWhere,
        include: {
          challenge: { select: { id: true, title: true, category: true, points: true } },
          team: { select: { id: true, name: true, color: true } }
        },
        orderBy: { achieved_at: 'asc' }
      }),
      (prisma as any).unlockedHint.findMany({
        where: hintsWhere,
        select: { id: true, cost_deducted: true }
      }),
      fetchLeaderboardData(id, isAdminView)
    ]);

    const totalAvailablePoints = challenges.reduce((sum, ch) => sum + ch.points, 0);
    const correctSubmissions = allSubmissions.filter((s) => s.is_correct);
    const failedSubmissions = allSubmissions.filter((s) => !s.is_correct);
    const totalSubmissions = allSubmissions.length;
    const accuracyRate = totalSubmissions > 0 ? Math.round((correctSubmissions.length / totalSubmissions) * 100) : 0;
    const totalHintsUsed = eventUnlockedHints.length;
    const totalHintsCost = eventUnlockedHints.reduce((sum: number, h: any) => sum + (h.cost_deducted || 0), 0);

    // Category Breakdown (Challenge counts, points, and solves)
    const categoryMap: Record<string, { category: string; challenge_count: number; total_points: number; solve_count: number; failed_count: number }> = {};
    challenges.forEach((ch) => {
      const cat = ch.category || 'MISC';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          challenge_count: 0,
          total_points: 0,
          solve_count: 0,
          failed_count: 0
        };
      }
      categoryMap[cat].challenge_count += 1;
      categoryMap[cat].total_points += ch.points;
    });

    allSubmissions.forEach((s) => {
      const cat = s.challenge?.category || 'MISC';
      if (categoryMap[cat]) {
        if (s.is_correct) {
          categoryMap[cat].solve_count += 1;
        } else {
          categoryMap[cat].failed_count += 1;
        }
      }
    });

    const categoryBreakdown = Object.values(categoryMap).map((c) => ({
      ...c,
      accuracy_rate: (c.solve_count + c.failed_count) > 0 ? Math.round((c.solve_count / (c.solve_count + c.failed_count)) * 100) : 0,
      points_percentage: totalAvailablePoints > 0 ? Math.round((c.total_points / totalAvailablePoints) * 100) : 0
    }));

    // Top Teams with accurate frozen or live scores
    const leaderboardScoreMap = new Map<string, number>();
    const leaderboardRankMap = new Map<string, number>();
    leaderboard.forEach((item: any) => {
      leaderboardScoreMap.set(item.id, item.score);
      leaderboardRankMap.set(item.id, item.rank);
    });

    const topTeams = teams.map((team) => {
      const teamSubs = allSubmissions.filter((s) => s.team?.id === team.id);
      const teamCorrect = teamSubs.filter((s) => s.is_correct);
      const teamFailed = teamSubs.filter((s) => !s.is_correct);
      const teamAccuracy = teamSubs.length > 0 ? Math.round((teamCorrect.length / teamSubs.length) * 100) : 0;
      const accurateScore = leaderboardScoreMap.get(team.id) ?? team.score;
      const accurateRank = leaderboardRankMap.get(team.id) ?? 999;

      return {
        id: team.id,
        rank: accurateRank,
        name: team.name,
        color: team.color,
        score: accurateScore,
        members_count: team.members.length,
        solved_count: teamCorrect.length,
        failed_count: teamFailed.length,
        total_attempts: teamSubs.length,
        accuracy_rate: teamAccuracy,
        first_bloods_count: team.first_bloods.length
      };
    }).sort((a, b) => a.rank - b.rank);

    // Challenge solve rate overview
    const challengesOverview = challenges.map((ch) => {
      const chSubs = allSubmissions.filter((s) => s.challenge?.id === ch.id);
      const chCorrect = chSubs.filter((s) => s.is_correct);
      const chFailed = chSubs.filter((s) => !s.is_correct);
      const chFb = firstBloods.find(fb => fb.challenge_id === ch.id);

      return {
        id: ch.id,
        title: ch.title,
        category: ch.category,
        points: ch.points,
        is_active: ch.is_active,
        total_solves: chCorrect.length,
        failed_attempts: chFailed.length,
        solve_rate: teams.length > 0 ? Math.round((chCorrect.length / teams.length) * 100) : 0,
        first_blood: chFb ? {
          team_name: chFb.team.name,
          team_id: chFb.team.id
        } : null
      };
    });

    res.json({
      event: {
        id: event.id,
        name: event.name,
        is_active: event.is_active,
        is_frozen: event.is_frozen,
        is_chained: event.is_chained,
        start_time: event.start_time,
        end_time: event.end_time,
        freeze_time: event.freeze_time,
        participation_mode: event.participation_mode,
        min_team_size: event.min_team_size,
        max_team_size: event.max_team_size,
        created_at: event.created_at
      },
      summary: {
        total_teams: event._count.teams,
        total_participants: event._count.users,
        total_challenges: event._count.challenges,
        total_available_points: totalAvailablePoints,
        total_submissions: totalSubmissions,
        correct_submissions: correctSubmissions.length,
        failed_submissions: failedSubmissions.length,
        accuracy_rate: accuracyRate,
        first_bloods_count: firstBloods.length,
        total_hints_used: totalHintsUsed,
        total_hints_cost: totalHintsCost
      },
      category_breakdown: categoryBreakdown,
      top_teams: topTeams,
      challenges_overview: challengesOverview,
      first_bloods: firstBloods.map((fb) => ({
        id: fb.id,
        challenge_id: fb.challenge_id,
        challenge_title: fb.challenge.title,
        challenge_category: fb.challenge.category,
        challenge_points: fb.challenge.points,
        team_id: fb.team_id,
        team_name: fb.team.name,
        team_color: fb.team.color,
        achieved_at: fb.achieved_at
      }))
    });
  } catch (err) {
    console.error('getEventStats error:', err);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
};

// Participant or SSH CLI: Broadcast Laser Attack (1x Beam on Correct / 3x Rapid Burst on Miss)
export const handleSshEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    // 🛡️ Security Check: Validate internal SSH secret or localhost origin
    const sshSecret = req.headers['x-ssh-secret'] || req.headers['x-api-key'];
    const expectedSecret = process.env.SSH_INTERNAL_SECRET || 'ctfriseranger2_ssh_sec_2026';
    const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || '';
    const rawIp = String(Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    const isLocalhost = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(rawIp);

    if (sshSecret !== expectedSecret && !isLocalhost && !(req as any).user) {
      res.status(403).json({ error: 'Forbidden: Unauthorized SSH Event Webhook Access' });
      return;
    }

    const {
      case_id,
      case_title,
      team_name,
      user_input,
      is_correct,
      is_case_completed,
      points,
      client_ip,
      event_id
    } = req.body;

    // 1. Try to match team across database
    let team: any = null;
    if (team_name) {
      team = await prisma.team.findFirst({
        where: {
          name: { equals: String(team_name).trim(), mode: 'insensitive' },
          is_banned: false
        },
        include: { event: true }
      });
    }

    // 2. If team not found by exact name, find by client_ip
    if (!team && client_ip) {
      const user = await prisma.user.findFirst({
        where: { last_ip: String(client_ip).trim(), team_member: { isNot: null } },
        orderBy: { last_login_at: 'desc' },
        include: { team_member: { include: { team: true } } }
      });
      if (user?.team_member?.team) {
        team = user.team_member.team;
      }
    }

    // 3. If still no team, fallback to active event with teams
    if (!team) {
      const eventWithTeams = await prisma.event.findFirst({
        where: { is_active: true, teams: { some: {} } },
        orderBy: { created_at: 'desc' },
        include: { teams: { where: { is_banned: false }, orderBy: { score: 'desc' } } }
      });
      if (eventWithTeams && eventWithTeams.teams.length > 0) {
        team = eventWithTeams.teams[0];
      }
    }

    // 4. Ultimate fallback to any team in database
    if (!team) {
      team = await prisma.team.findFirst({
        where: { is_banned: false },
        orderBy: { score: 'desc' }
      });
    }

    const targetEventId = event_id || team?.event_id || 'global';
    const resolvedTeamId = team?.id || 'ssh-investigator';
    const resolvedTeamName = team_name || team?.name || 'Ghost Operative';
    const chalTitle = case_title || (case_id !== undefined ? `Case #${case_id}` : 'Forensic Investigation');
    const chalId = `case-${case_id ?? 0}`;
    const success = Boolean(is_correct);

    // Broadcast 3D laser attack to all connected scoreboard clients:
    // SSH Hit: 1x Large Laser Beam (success: true)
    // SSH Miss: 1x Small Laser (success: false, shotsCount: 1, totalShots: 1)
    broadcastAttackResult(targetEventId, {
      id: `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      teamId: resolvedTeamId,
      teamName: resolvedTeamName,
      challengeId: chalId,
      challengeTitle: chalTitle,
      success: success,
      isFirstBlood: false,
      shotsCount: 1,
      totalShots: 1,
      pointsGained: success ? (Number(points) || 0) : 0,
      newTotalScore: team?.score || 0,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      laser_fired: success ? '1x_large_beam' : '1x_small_miss_laser',
      team: resolvedTeamName,
      team_id: resolvedTeamId,
      event_id: targetEventId,
      challenge: chalTitle
    });
  } catch (err: any) {
    console.error('handleSshEvent error:', err);
    res.status(500).json({ error: err.message || 'Failed to handle SSH event' });
  }
};

// Fetch list of registered active teams for SSH CLI selection & auto-detect team by user session/IP
export const getSshTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { event_id, client_ip, search } = req.query;
    let targetEventId = event_id as string | undefined;

    if (!targetEventId) {
      // Find active event that has registered teams
      const eventWithTeams = await prisma.event.findFirst({
        where: {
          is_active: true,
          teams: { some: {} }
        },
        orderBy: { created_at: 'desc' }
      });
      targetEventId = eventWithTeams?.id;
    }

    // 1. Auto-detect user & team by client IP (from recent web platform login)
    let autoDetected: any = null;
    if (client_ip && typeof client_ip === 'string') {
      const cleanIp = client_ip.trim();
      const matchedUser = await prisma.user.findFirst({
        where: {
          last_ip: cleanIp,
          team_member: { isNot: null }
        },
        orderBy: { last_login_at: 'desc' },
        include: {
          team_member: {
            include: { team: true }
          }
        }
      });

      if (matchedUser?.team_member?.team) {
        autoDetected = {
          username: matchedUser.username,
          team_id: matchedUser.team_member.team.id,
          team_name: matchedUser.team_member.team.name
        };
      }
    }

    // 2. Search by website username / email / invite code / team name
    let searchResult: any = null;
    if (search && typeof search === 'string') {
      const s = search.trim();
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: s, mode: 'insensitive' } },
            { email: { equals: s, mode: 'insensitive' } }
          ],
          team_member: { isNot: null }
        },
        include: {
          team_member: {
            include: { team: true }
          }
        }
      });

      if (user?.team_member?.team) {
        searchResult = {
          username: user.username,
          team_id: user.team_member.team.id,
          team_name: user.team_member.team.name
        };
      } else {
        const team = await prisma.team.findFirst({
          where: {
            OR: [
              { name: { equals: s, mode: 'insensitive' } },
              { invite_code: { equals: s, mode: 'insensitive' } }
            ]
          }
        });
        if (team) {
          searchResult = {
            team_id: team.id,
            team_name: team.name
          };
        }
      }
    }

    const whereClause: any = { is_banned: false };
    if (targetEventId) {
      whereClause.event_id = targetEventId;
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        score: true,
        color: true,
        event_id: true,
        event: {
          select: { name: true }
        }
      }
    });

    res.json({
      auto_detected: autoDetected,
      search_result: searchResult,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        score: t.score,
        color: t.color,
        event_name: t.event?.name || 'Default'
      }))
    });
  } catch (err: any) {
    console.error('getSshTeams error:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};


