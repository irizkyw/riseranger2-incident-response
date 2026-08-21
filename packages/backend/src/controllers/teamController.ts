import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { generateInviteCode } from '../utils/crypto.js';
import { broadcastScoreboardUpdate, broadcastScoreboardSync, fetchLeaderboardData } from '../sockets/scoreboardSocket.js';
import { calculateLargestRemainderPercentages } from '../utils/scoring.js';

export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const eventId = req.user!.event_id;
    const { name, color } = req.body;

    if (!eventId) {
      res.status(403).json({ error: 'You must join an event first' });
      return;
    }

    // Check if user already in a team (1 user -> 1 team per event rule)
    const existingMember = await prisma.teamMember.findUnique({
      where: { user_id: userId }
    });

    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of a team. Leave your current team first.' });
      return;
    }

    const existingTeam = await prisma.team.findUnique({ where: { name } });
    if (existingTeam) {
      res.status(409).json({ error: 'Team name is already taken' });
      return;
    }

    const invite_code = generateInviteCode();
    const NEON_COLORS = ['#00F0FF', '#00FF66', '#A855F7', '#FF007F', '#FACC15', '#38BDF8', '#4ADE80', '#F472B6', '#FB923C', '#EF4444'];
    const randomColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];

    const event = await prisma.event.findUnique({ where: { id: eventId } });

    // 🔒 Enforce Roster Lock: Cannot create team while competition is running
    const now = new Date();
    const isEventOngoing = event &&
      event.start_time &&
      now >= new Date(event.start_time) &&
      !event.is_finished &&
      (!event.end_time || now < new Date(event.end_time));

    if (isEventOngoing && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Tidak dapat membuat tim baru saat event kompetisi sedang berjalan demi integritas kompetisi.'
      });
      return;
    }

    // Create team and auto-assign user as leader & member in a transaction
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
          invite_code,
          leader_id: userId,
          event_id: eventId,
          color: color || randomColor
        } as any
      });

      await tx.teamMember.create({
        data: {
          team_id: newTeam.id,
          user_id: userId
        }
      });

      // Record in UserTeamHistory
      await tx.userTeamHistory.create({
        data: {
          user_id: userId,
          team_name: name,
          invite_code,
          role: 'LEADER',
          event_name: event?.name || 'Arena Event',
          action: 'CREATED',
          color: color || randomColor,
          score: 0
        }
      });

      return newTeam;
    });

    await broadcastScoreboardUpdate(eventId);
    await broadcastScoreboardSync(eventId);
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
};


export const joinTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { invite_code } = req.body;

    const existingMember = await prisma.teamMember.findUnique({
      where: { user_id: userId }
    });

    if (existingMember) {
      res.status(400).json({ error: 'You are already in a team. Leave it before joining another.' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { invite_code: invite_code.toUpperCase() }
    });

    if (!team) {
      res.status(404).json({ error: 'Invalid invite code. Team not found.' });
      return;
    }

    if (team.is_banned) {
      res.status(403).json({ error: 'This team has been disqualified/banned by Admin.' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: team.event_id } });

    // 🔒 Enforce Roster Lock: Cannot join team while competition is running
    const now = new Date();
    const isEventOngoing = event &&
      event.start_time &&
      now >= new Date(event.start_time) &&
      !event.is_finished &&
      (!event.end_time || now < new Date(event.end_time));

    if (isEventOngoing && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        error: 'Tidak dapat bergabung ke dalam tim saat event kompetisi sedang berjalan demi integritas kompetisi.'
      });
      return;
    }

    const maxMembers = event?.max_team_size || 5;

    const membersCount = await prisma.teamMember.count({ where: { team_id: team.id } });
    if (membersCount >= maxMembers) {
      res.status(400).json({ error: `Squad "${team.name}" sudah penuh (Maksimal ${maxMembers} anggota per tim).` });
      return;
    }

    const isFirstMember = membersCount === 0;

    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          team_id: team.id,
          user_id: userId
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { event_id: team.event_id }
      }),
      prisma.userTeamHistory.create({
        data: {
          user_id: userId,
          team_name: team.name,
          invite_code: team.invite_code,
          role: isFirstMember ? 'LEADER' : 'MEMBER',
          event_name: event?.name || 'Arena Event',
          action: 'JOINED',
          color: team.color,
          score: team.score
        }
      }),
      ...(isFirstMember ? [
        prisma.team.update({
          where: { id: team.id },
          data: { leader_id: userId }
        })
      ] : [])
    ]);


    await broadcastScoreboardUpdate(team.event_id);
    await broadcastScoreboardSync(team.event_id);
    res.json({ message: `Successfully joined team ${team.name}`, team_id: team.id });
  } catch (err) {
    console.error('Join team error:', err);
    res.status(500).json({ error: 'Failed to join team' });
  }
};

export const leaveTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const member = await prisma.teamMember.findUnique({
      where: { user_id: userId },
      include: { team: true }
    });

    if (!member) {
      res.status(400).json({ error: 'You are not in any team.' });
      return;
    }

    const eventId = member.team.event_id || req.user?.event_id;
    const teamEvent = eventId 
      ? await prisma.event.findUnique({ where: { id: eventId } }) 
      : null;

    const now = new Date();
    const isEventOngoing = teamEvent &&
      teamEvent.start_time &&
      now >= new Date(teamEvent.start_time) &&
      !teamEvent.is_finished &&
      (!teamEvent.end_time || now < new Date(teamEvent.end_time));

    if (isEventOngoing) {
      res.status(403).json({
        error: 'Tidak dapat keluar atau membubarkan tim saat event kompetisi sedang berjalan demi integritas kompetisi.'
      });
      return;
    }


    if (member.team.leader_id === userId) {
      // If leader leaves, check if there are other members
      const otherMembers = await prisma.teamMember.findMany({
        where: { team_id: member.team_id, NOT: { user_id: userId } }
      });

      if (otherMembers.length > 0) {
        // Transfer leadership to next member
        await prisma.team.update({
          where: { id: member.team_id },
          data: { leader_id: otherMembers[0].user_id }
        });
        await prisma.userTeamHistory.create({
          data: {
            user_id: userId,
            team_name: member.team.name,
            invite_code: member.team.invite_code,
            role: 'LEADER',
            event_name: teamEvent?.name || 'Arena Event',
            action: 'LEFT',
            color: member.team.color,
            score: member.team.score
          }
        });
      } else {
        // Disband team if last member leaves
        await prisma.userTeamHistory.create({
          data: {
            user_id: userId,
            team_name: member.team.name,
            invite_code: member.team.invite_code,
            role: 'LEADER',
            event_name: teamEvent?.name || 'Arena Event',
            action: 'DISBANDED',
            color: member.team.color,
            score: member.team.score
          }
        });
        await prisma.team.delete({ where: { id: member.team_id } });
        await broadcastScoreboardUpdate(member.team.event_id);
        await broadcastScoreboardSync(member.team.event_id);
        res.json({ message: 'Left team. Team disbanded as you were the last member.' });
        return;
      }
    } else {
      await prisma.userTeamHistory.create({
        data: {
          user_id: userId,
          team_name: member.team.name,
          invite_code: member.team.invite_code,
          role: 'MEMBER',
          event_name: teamEvent?.name || 'Arena Event',
          action: 'LEFT',
          color: member.team.color,
          score: member.team.score
        }
      });
    }

    await prisma.teamMember.delete({
      where: { user_id: userId }
    });

    await broadcastScoreboardUpdate(member.team.event_id);
    await broadcastScoreboardSync(member.team.event_id);
    res.json({ message: 'Successfully left the team.' });
  } catch (err) {
    console.error('Leave team error:', err);
    res.status(500).json({ error: 'Failed to leave team' });
  }
};

export const kickMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leaderId = req.user!.id;
    const { targetUserId } = req.params;

    const member = await prisma.teamMember.findUnique({
      where: { user_id: leaderId },
      include: { team: true }
    });

    if (!member || member.team.leader_id !== leaderId) {
      res.status(403).json({ error: 'Only the team leader can kick members.' });
      return;
    }

    const eventId = member.team.event_id || req.user?.event_id;
    const teamEvent = eventId 
      ? await prisma.event.findUnique({ where: { id: eventId } }) 
      : null;

    const now = new Date();
    const isEventOngoing = teamEvent &&
      teamEvent.start_time &&
      now >= new Date(teamEvent.start_time) &&
      !teamEvent.is_finished &&
      (!teamEvent.end_time || now < new Date(teamEvent.end_time));

    if (isEventOngoing) {
      res.status(403).json({
        error: 'Tidak dapat mengeluarkan anggota tim saat event kompetisi sedang berjalan demi integritas kompetisi.'
      });
      return;
    }


    if (targetUserId === leaderId) {
      res.status(400).json({ error: 'You cannot kick yourself. Use leave team instead.' });
      return;
    }

    const targetMember = await prisma.teamMember.findFirst({
      where: { team_id: member.team_id, user_id: targetUserId }
    });

    if (!targetMember) {
      res.status(404).json({ error: 'Operative not found in your team.' });
      return;
    }

    await prisma.teamMember.delete({
      where: { id: targetMember.id }
    });

    await broadcastScoreboardUpdate(member.team.event_id);
    await broadcastScoreboardSync(member.team.event_id);
    res.json({ message: 'Operative removed from team successfully.' });
  } catch (err) {
    console.error('Kick member error:', err);
    res.status(500).json({ error: 'Failed to kick member' });
  }
};

export const getTeamDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    const [team, rawSubmissions, rawUnlockedHints] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              is_active: true,
              min_team_size: true,
              is_frozen: true,
              freeze_time: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  role: true,
                  created_at: true
                }
              }
            },
            orderBy: { joined_at: 'asc' }
          },
          first_bloods: {
            include: { challenge: { select: { title: true } } }
          }
        }
      }),
      prisma.submission.findMany({
        where: { team_id: teamId },
        include: {
          challenge: { select: { id: true, title: true, category: true, points: true } },
          user: { select: { id: true, username: true } }
        },
        orderBy: { submitted_at: 'desc' }
      }),
      (prisma as any).unlockedHint.findMany({
        where: { team_id: teamId },
        select: { id: true, cost_deducted: true, unlocked_at: true }
      })
    ]);

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(userRole);
    const isTeamMember = userId ? team.members.some(m => m.user.id === userId) : false;
    const canSeePrivateDetails = isStaff || isTeamMember;

    const now = new Date();
    const isFrozen = Boolean(team.event?.is_frozen || (team.event?.freeze_time && now >= new Date(team.event.freeze_time)));
    let freezeThreshold: Date | null = null;
    if (isFrozen && !canSeePrivateDetails) {
      if (team.event?.freeze_time) {
        const fTime = new Date(team.event.freeze_time);
        freezeThreshold = fTime <= now ? fTime : now;
      } else {
        freezeThreshold = now;
      }
    }

    // Filter submissions and hints if freeze is active for public viewers
    const allSubmissions = freezeThreshold
      ? rawSubmissions.filter(s => s.submitted_at && new Date(s.submitted_at) <= freezeThreshold!)
      : rawSubmissions;

    const teamUnlockedHints = freezeThreshold
      ? rawUnlockedHints.filter((h: any) => h.unlocked_at && new Date(h.unlocked_at) <= freezeThreshold!)
      : rawUnlockedHints;

    // Submissions Breakdown (Success vs Failed)
    const correctSubmissions = allSubmissions.filter((s) => s.is_correct);
    const failedSubmissions = allSubmissions.filter((s) => !s.is_correct);
    const totalSubmissions = allSubmissions.length;
    const correctCount = correctSubmissions.length;
    const failedCount = failedSubmissions.length;
    const accuracyRate = totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0;
    const hintsCount = teamUnlockedHints.length;
    const hintsCost = teamUnlockedHints.reduce((sum: number, h: any) => sum + (h.cost_deducted || 0), 0);

    // Calculate accurate score and rank
    let effectiveScore = team.score;
    let rank = 1;

    let solvedChallengesInfo: any[] = [];
    if (team.event?.id) {
      const leaderboard = await fetchLeaderboardData(team.event.id, canSeePrivateDetails);
      const teamInBoard = leaderboard.find((t: any) => t.id === team.id);
      if (teamInBoard) {
        effectiveScore = teamInBoard.score;
        rank = teamInBoard.rank;
        solvedChallengesInfo = teamInBoard.solved_challenges || [];
      }
    } else {
      const teamsWithHigherScore = await prisma.team.count({
        where: {
          is_banned: false,
          score: { gt: team.score }
        }
      });
      rank = teamsWithHigherScore + 1;
    }

    // Member Contribution Stats with individual points & accuracy (including FB bonuses)
    const membersWithStats = team.members.map((member) => {
      const userSubmissions = allSubmissions.filter((s) => s.user_id === member.user.id);
      const userCorrect = userSubmissions.filter((s) => s.is_correct);
      const userFailed = userSubmissions.filter((s) => !s.is_correct);

      const userSolvedChallenges = userCorrect.map((s) => {
        const solvedInfo = solvedChallengesInfo.find((sc: any) => sc.id === s.challenge.id);
        return {
          id: s.challenge.id,
          title: s.challenge.title,
          category: s.challenge.category,
          points: solvedInfo ? solvedInfo.points : s.challenge.points,
          base_points: s.challenge.points,
          bonus_points: solvedInfo?.bonus_points || 0,
          is_first_blood: solvedInfo?.is_first_blood || false,
          solve_rank: solvedInfo?.solve_rank || 1,
          solved_at: s.submitted_at
        };
      });

      const userPoints = userSolvedChallenges.reduce((sum, s) => sum + s.points, 0);
      const userAccuracy = userSubmissions.length > 0 ? Math.round((userCorrect.length / userSubmissions.length) * 100) : 0;

      return {
        ...member,
        score: userPoints,
        solved_count: userCorrect.length,
        failed_count: userFailed.length,
        total_attempts: userSubmissions.length,
        accuracy_rate: userAccuracy,
        contribution_percentage: 0,
        solved_challenges: userSolvedChallenges
      };
    });

    const memberScores = membersWithStats.map((m) => m.score);
    const calculatedPercentages = calculateLargestRemainderPercentages(memberScores, 100);
    membersWithStats.forEach((m, idx) => {
      m.contribution_percentage = calculatedPercentages[idx] || 0;
    });

    // Category Breakdown for Charts
    const categoryMap: Record<string, { category: string; count: number; points: number }> = {};
    correctSubmissions.forEach((s) => {
      const cat = s.challenge?.category || 'MISC';
      const solvedInfo = solvedChallengesInfo.find((sc: any) => sc.id === s.challenge.id);
      const pts = solvedInfo ? solvedInfo.points : (s.challenge?.points || 0);
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, count: 0, points: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].points += pts;
    });

    const categoryBreakdown = Object.values(categoryMap).map((c) => ({
      ...c,
      percentage: effectiveScore > 0 ? Math.round((c.points / effectiveScore) * 100) : 0
    }));

    res.json({
      ...team,
      score: effectiveScore,
      invite_code: canSeePrivateDetails ? team.invite_code : undefined,
      rank,
      stats: {
        total_submissions: totalSubmissions,
        correct_submissions: correctCount,
        failed_submissions: failedCount,
        accuracy_rate: accuracyRate,
        first_blood_count: team.first_bloods.length,
        total_solves: correctCount,
        hints_used_count: hintsCount,
        hints_cost_total: hintsCost
      },
      members: membersWithStats.map(m => ({
        ...m,
        user: {
          ...m.user,
          email: canSeePrivateDetails ? m.user.email : undefined
        }
      })),
      category_breakdown: categoryBreakdown,
      submissions: correctSubmissions
    });
  } catch (err) {
    console.error('Get team details error:', err);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
};

// Participant: Get team creation and membership history for current user
export const getMyTeamHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Fetch persistent history logs
    const historyLogs = await prisma.userTeamHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    // 2. Fetch current live team (if any)
    const currentMember = await prisma.teamMember.findUnique({
      where: { user_id: userId },
      include: {
        team: {
          include: {
            event: { select: { id: true, name: true } },
            members: { include: { user: { select: { id: true, username: true } } } },
            submissions: { where: { is_correct: true }, select: { id: true } }
          }
        }
      }
    });

    // 3. Construct unified history list
    const historyList: any[] = [];
    const seenTeamNames = new Set<string>();

    if (currentMember && currentMember.team) {
      const curTeam = currentMember.team;
      seenTeamNames.add(curTeam.name);
      historyList.push({
        id: curTeam.id,
        team_id: curTeam.id,
        name: curTeam.name,
        invite_code: curTeam.invite_code,
        color: curTeam.color,
        score: curTeam.score,
        is_my_creation: curTeam.leader_id === userId,
        is_current_member: true,
        action: curTeam.leader_id === userId ? 'CREATED' : 'JOINED',
        role: curTeam.leader_id === userId ? 'LEADER' : 'MEMBER',
        created_at: curTeam.created_at,
        event: curTeam.event,
        members_count: curTeam.members.length,
        solved_count: curTeam.submissions.length,
        members: curTeam.members.map(m => ({
          id: m.user.id,
          username: m.user.username,
          is_leader: m.user.id === curTeam.leader_id
        }))
      });
    }

    const teamNames = historyLogs.map(l => l.team_name);
    const existingTeams = await prisma.team.findMany({
      where: { name: { in: teamNames } },
      select: { id: true, name: true, score: true, invite_code: true, color: true }
    });
    const teamMap = new Map(existingTeams.map(t => [t.name, t]));

    for (const log of historyLogs) {
      if (seenTeamNames.has(log.team_name)) {
        continue;
      }
      seenTeamNames.add(log.team_name);
      const matched = teamMap.get(log.team_name);
      historyList.push({
        id: matched?.id || log.id,
        team_id: matched?.id || null,
        name: log.team_name,
        invite_code: matched?.invite_code || log.invite_code || '—',
        color: matched?.color || log.color,
        score: matched?.score ?? log.score,
        is_my_creation: log.role === 'LEADER',
        is_current_member: false,
        action: log.action,
        role: log.role,
        created_at: log.created_at,
        event: { name: log.event_name || 'Arena Event' },
        members_count: 0,
        solved_count: 0,
        members: []
      });
    }

    res.json(historyList);
  } catch (err) {
    console.error('Get my team history error:', err);
    res.status(500).json({ error: 'Failed to fetch squad history' });
  }
};
