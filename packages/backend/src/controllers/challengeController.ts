import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { hashFlag, verifyFlag } from '../utils/crypto.js';
import {
  broadcastScoreboardUpdate,
  broadcastFirstBlood,
  broadcastAttackResult,
  broadcastScoreboardSync,
  broadcastLiveActivity,
  broadcastChallengeVisibility
} from '../sockets/scoreboardSocket.js';
import redis from '../config/redis.js';
import { logger } from '../utils/logger.ts';
import { checkIsAdminOrStaff, hasRolePermission } from '../utils/rbac.ts';
import { calculateSolvePoints } from '../utils/scoring.js';
import { acquireSubmissionLock, releaseSubmissionLock } from '../utils/submissionLock.ts';


/**
 * Evaluates whether a challenge is locked by event chaining rules.
 * 
 * Chaining Step Rules:
 * 1. Step 1 challenges (unlock_order <= 1 or 0) are ALWAYS unlocked from the start.
 * 2. If a challenge has unlock_order > 1 (Step 2, Step 3, etc.):
 *    - It requires all challenges in the same category belonging to earlier steps (strictly lower unlock_order)
 *      to be solved by the team.
 *    - If any earlier step challenge is unsolved, this challenge is locked.
 *    - unlocksAfterTitle points to the unsolved earlier step challenge.
 * 3. If all challenges in the category share the same unlock_order <= 1, ALL of them are unlocked!
 */
export const evaluateChainingLock = (
  targetChallenge: { id: string; category: string; unlock_order?: number; title: string },
  allCategoryChallenges: Array<{ id: string; category: string; unlock_order?: number; title: string }>,
  solvedChallengeIds: string[]
): { isLocked: boolean; unlocksAfterTitle: string | null } => {
  const currentStep = Math.max(1, targetChallenge.unlock_order || 1);

  // Step 1 (or 0) is a starting challenge and NEVER locked by chaining!
  if (currentStep <= 1) {
    return { isLocked: false, unlocksAfterTitle: null };
  }

  // Find all challenges in the same category with strictly lower step order
  const earlierStepChallenges = allCategoryChallenges.filter(
    (c) => c.id !== targetChallenge.id && Math.max(1, c.unlock_order || 1) < currentStep
  );

  if (earlierStepChallenges.length === 0) {
    return { isLocked: false, unlocksAfterTitle: null };
  }

  // Sort earlier steps descending so we show the immediate preceding challenge first in error/unlocks_after_title
  earlierStepChallenges.sort((a, b) => Math.max(1, b.unlock_order || 1) - Math.max(1, a.unlock_order || 1));

  // If any earlier challenge is unsolved, target challenge is locked
  for (const earlier of earlierStepChallenges) {
    if (!solvedChallengeIds.includes(earlier.id)) {
      return { isLocked: true, unlocksAfterTitle: earlier.title };
    }
  }

  return { isLocked: false, unlocksAfterTitle: null };
};

// Participant: List active challenges summary (WITHOUT description or file_url to prevent sniffing)
export const listChallenges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    let eventId = req.user!.event_id;
    const teamId = req.user!.team_id;

    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(role);
    const queryEventId = (req.query.event_id && typeof req.query.event_id === 'string') ? req.query.event_id.trim() : null;

    if (isStaff && queryEventId) {
      eventId = queryEventId;
    }

    if (!eventId && !isStaff) {
      res.status(403).json({
        error: 'Anda belum menukarkan (Redeem) Access Token. Silakan masukkan Access Token untuk membuka tantangan event Anda.',
        require_token: true
      });
      return;
    }

    let event = eventId ? await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        is_chained: true,
        is_active: true,
        is_paused: true,
        is_finished: true,
        start_time: true,
        end_time: true,
        freeze_time: true,
        participation_mode: true,
        min_team_size: true,
        max_team_size: true
      }
    }) : (isStaff ? await prisma.event.findFirst({
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
      select: {
        id: true,
        name: true,
        is_chained: true,
        is_active: true,
        is_paused: true,
        is_finished: true,
        start_time: true,
        end_time: true,
        freeze_time: true,
        participation_mode: true,
        min_team_size: true,
        max_team_size: true
      }
    }) : null);

    if (role === 'PARTICIPANT' && event && !event.is_active) {
      res.status(403).json({ error: 'Arena event sedang tidak aktif.' });
      return;
    }

    // Enforce team participation & minimum team size if event requires it
    const isTeamMode = (event?.participation_mode === 'TEAM' || !event?.participation_mode);
    if (role === 'PARTICIPANT' && isTeamMode) {
      if (!teamId) {
        res.status(403).json({
          error: 'Event ini mewajibkan Anda berada di dalam Tim (Squad). Anda belum bergabung atau baru saja keluar dari tim.',
          require_team: true,
          event_name: event?.name
        });
        return;
      }

      const minMembers = event?.min_team_size || 1;
      if (minMembers > 1) {
        const teamMemberCount = await prisma.teamMember.count({
          where: { team_id: teamId }
        });
        if (teamMemberCount < minMembers) {
          res.status(403).json({
            error: `🔒 Syarat Minimal Anggota Belum Terpenuhi! Event ini mewajibkan minimal ${minMembers} anggota per tim untuk dapat mulai mengerjakan tantangan (Saat ini tim Anda memiliki ${teamMemberCount}/${minMembers} anggota).`,
            require_min_members: true,
            min_team_size: minMembers,
            current_team_size: teamMemberCount,
            event_name: event?.name
          });
          return;
        }
      }
    }


    // Check if event hasn't started yet
    const now = new Date();
    const notStartedYet = role === 'PARTICIPANT' && event?.start_time && new Date(event.start_time) > now;

    // -----------------------------------------------------------------------
    // Redis Cache Layer: challenge metadata shared per-event (TTL 30s)
    // -----------------------------------------------------------------------
    const CACHE_TTL = 30; // seconds
    const requestedCategory = req.query.category ? String(req.query.category).trim() : null;
    const chalCacheKey = `challenges:event:${event?.id ?? 'global'}${isStaff ? ':staff' : ''}`;
    const solvedCacheKey = teamId ? `challenges:solved:${teamId}` : null;

    let challenges: any[] = [];
    const cachedChal = await redis.get(chalCacheKey).catch(() => null);
    if (cachedChal) {
      challenges = JSON.parse(cachedChal);
    } else {
      challenges = await (prisma.challenge as any).findMany({
        where: {
          ...(isStaff ? {} : { is_active: true, is_hidden: false }),
          ...(event ? { event_id: event.id } : {})
        },
        select: {
          id: true,
          title: true,
          category: true,
          points: true,
          unlock_order: true,
          event_id: true,
          is_active: true,
          is_hidden: true,
          created_at: true,
          first_blood: {
            include: { team: { select: { id: true, name: true } } }
          },
          _count: {
            select: { submissions: { where: { is_correct: true } } }
          }
        },
        orderBy: [{ unlock_order: 'asc' }, { created_at: 'asc' }]
      });
      await redis.set(chalCacheKey, JSON.stringify(challenges), 'EX', CACHE_TTL).catch(() => { });
    }

    // Determine which challenges have been solved by this user's team (cached per team)
    let solvedChallengeIds: string[] = [];
    if (teamId) {
      const cachedSolved = solvedCacheKey ? await redis.get(solvedCacheKey).catch(() => null) : null;
      if (cachedSolved) {
        solvedChallengeIds = JSON.parse(cachedSolved);
      } else {
        const solves = await prisma.submission.findMany({
          where: { team_id: teamId, is_correct: true },
          select: { challenge_id: true }
        });
        solvedChallengeIds = solves.map((s: any) => s.challenge_id);
        if (solvedCacheKey) {
          await redis.set(solvedCacheKey, JSON.stringify(solvedChallengeIds), 'EX', CACHE_TTL).catch(() => { });
        }
      }
    }

    // Group challenges by category for chaining computation
    const isChained = event?.is_chained ?? false;
    const categoryGroups: Record<string, any[]> = {};

    (challenges || []).forEach((c: any) => {
      if (!categoryGroups[c.category]) {
        categoryGroups[c.category] = [];
      }
      categoryGroups[c.category].push(c);
    });

    // Map each challenge with is_locked and unlocks_after
    let formatted = (challenges || []).map((c: any) => {
      const isSolved = solvedChallengeIds.includes(c.id);
      let isLocked = false;
      let unlocksAfterTitle: string | null = null;

      if (notStartedYet) {
        isLocked = true;
      } else if (isChained) {
        const catList = categoryGroups[c.category] || [];
        const lockStatus = evaluateChainingLock(c, catList, solvedChallengeIds);
        isLocked = lockStatus.isLocked;
        unlocksAfterTitle = lockStatus.unlocksAfterTitle;
      }

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        points: c.points,
        unlock_order: c.unlock_order || 0,
        created_at: c.created_at,
        first_blood: isLocked ? null : c.first_blood,
        is_solved_by_me: isSolved,
        is_locked: isLocked,
        is_hidden: Boolean(c.is_hidden),
        is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
        unlocks_after_title: unlocksAfterTitle,
        solves_count: c._count?.submissions || 0
      };
    });

    // If client requested a specific category (on-demand loading per tab click)
    if (requestedCategory && requestedCategory !== 'ALL') {
      formatted = formatted.filter((c: any) => c.category === requestedCategory);
    }

    res.json(formatted);
  } catch (err) {
    console.error('List challenges error:', err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

// Participant: Get available categories for current arena event
export const listCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(role);
    const queryEventId = (req.query.event_id && typeof req.query.event_id === 'string') ? req.query.event_id.trim() : null;
    const eventId = (isStaff && queryEventId) ? queryEventId : req.user!.event_id;

    const catCacheKey = `categories:event:${eventId ?? 'global'}${isStaff ? ':staff' : ''}`;

    const cached = await redis.get(catCacheKey).catch(() => null);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const challenges = await (prisma.challenge as any).findMany({
      where: {
        ...(isStaff ? {} : { is_active: true, is_hidden: false }),
        ...(eventId ? { event_id: eventId } : {})
      },
      select: { category: true },
      distinct: ['category']
    });

    const categories = ['ALL', ...challenges.map((c: any) => c.category).sort()];
    await redis.set(catCacheKey, JSON.stringify(categories), 'EX', 60).catch(() => { });

    res.json(categories);
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Participant: Get single challenge detail (requires valid event enrollment and unlocked status)
export const getChallengeDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    const eventId = req.user!.event_id;
    const teamId = req.user!.team_id;

    const isStaff = await checkIsAdminOrStaff(role);
    const canViewSolutions = isStaff || (await hasRolePermission(role, 'View Challenge Solutions & Flags'));

    if (!eventId && !isStaff && role === 'PARTICIPANT') {
      res.status(403).json({
        error: 'Akses ditolak: Anda belum menukarkan (Redeem) Access Token untuk arena ini.',
        require_token: true
      });
      return;
    }

    const challenge = await (prisma.challenge as any).findFirst({
      where: isStaff ? { id } : { id, is_active: true, is_hidden: false },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        points: true,
        hint: canViewSolutions ? true : false,
        hint_cost: true,
        file_url: true,
        flag: canViewSolutions ? true : false,
        event_id: true,
        created_at: true,
        first_blood: {
          include: { team: { select: { name: true } } }
        }
      }
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found or inactive' });
      return;
    }

    // Verify event ownership
    if (role === 'PARTICIPANT' && challenge.event_id && challenge.event_id !== eventId) {
      res.status(403).json({ error: 'Akses ditolak: Tantangan ini milik kategori/arena lain yang tidak terdaftar di tiket Anda.' });
      return;
    }

    // Check event timing, active status, and team requirement
    let isEventPaused = false;
    let isEventFinished = false;
    let eventRecord: any = null;

    if (challenge.event_id) {
      const event = await (prisma as any).event.findUnique({
        where: { id: challenge.event_id },
        select: {
          id: true,
          name: true,
          is_active: true,
          is_paused: true,
          is_finished: true,
          start_time: true,
          end_time: true,
          freeze_time: true,
          is_chained: true,
          participation_mode: true,
          min_team_size: true
        } as any
      });

      if (event) {
        eventRecord = event;
        isEventPaused = Boolean((event as any).is_paused);
        isEventFinished = Boolean((event as any).is_finished);
      }

      if (role === 'PARTICIPANT' && event) {
        if (!event.is_active) {
          res.status(403).json({ error: 'Arena event sedang dinonaktifkan .' });
          return;
        }

        const isTeamMode = (event.participation_mode === 'TEAM' || !event.participation_mode);
        if (isTeamMode) {
          if (!teamId) {
            res.status(403).json({
              error: 'Akses ditolak: Anda telah keluar dari Tim. Event ini mewajibkan partisipasi berbasis Tim (Squad). Silakan buat atau gabung ke tim terlebih dahulu di menu Squad.',
              require_team: true
            });
            return;
          }

          const minMembers = event.min_team_size || 1;
          if (minMembers > 1) {
            const teamMemberCount = await prisma.teamMember.count({ where: { team_id: teamId } });
            if (teamMemberCount < minMembers) {
              res.status(403).json({
                error: `🔒 Syarat Minimal Anggota Belum Terpenuhi! Event ini mewajibkan minimal ${minMembers} anggota per tim untuk dapat membuka tantangan (Saat ini tim Anda memiliki ${teamMemberCount}/${minMembers} anggota).`,
                require_min_members: true,
                min_team_size: minMembers,
                current_team_size: teamMemberCount
              });
              return;
            }
          }
        }

        const now = new Date();
        if (event.start_time && new Date(event.start_time) > now) {
          const wibStart = new Date(event.start_time).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          res.status(403).json({
            error: `Kompetisi belum dimulai! Arena akan dibuka pada ${wibStart} WIB.`
          });
          return;
        }
      }
    }

    // Check attempt status (force stop / pause)
    let isForceStopped = false;
    let isSessionPaused = false;
    let pausedDurationSeconds = 0;

    if (userId && !isStaff) {
      const userAttempt = await (prisma as any).challengeAttempt.findUnique({
        where: {
          user_id_challenge_id: {
            user_id: userId,
            challenge_id: challenge.id
          }
        }
      });

      if (userAttempt) {
        isForceStopped = Boolean(userAttempt.is_force_stopped);
        isSessionPaused = Boolean(userAttempt.is_paused);
        pausedDurationSeconds = userAttempt.paused_duration_seconds || 0;
      }
    }

    if (teamId && !isStaff) {
      const teamRecord = await (prisma as any).team.findUnique({
        where: { id: teamId },
        select: { is_force_stopped: true, is_paused: true }
      });
      if (teamRecord?.is_force_stopped) isForceStopped = true;
      if (teamRecord?.is_paused) isSessionPaused = true;
    }

    // Check chaining status
    let isLocked = false;
    let unlocksAfterTitle: string | null = null;

    if (challenge.event_id && !isStaff) {
      const event = await prisma.event.findUnique({
        where: { id: challenge.event_id },
        select: { is_chained: true }
      });

      if (event?.is_chained && role === 'PARTICIPANT') {
        const catChallenges = await (prisma.challenge as any).findMany({
          where: { is_active: true, event_id: challenge.event_id, category: challenge.category },
          select: { id: true, title: true, category: true, unlock_order: true }
        });

        const solvedList = teamId ? (await prisma.submission.findMany({
          where: { team_id: teamId, is_correct: true },
          select: { challenge_id: true }
        })).map((s: any) => s.challenge_id) : [];

        const lockStatus = evaluateChainingLock(challenge, catChallenges, solvedList);
        if (lockStatus.isLocked) {
          isLocked = true;
          unlocksAfterTitle = lockStatus.unlocksAfterTitle;
        }
      }
    }

    if (isLocked && !isStaff) {
      // Return 403 Forbidden with lock metadata to prevent sniffing via direct API call
      res.status(403).json({
        error: `🔒 Tantangan ini terkunci! Selesaikan tantangan "${unlocksAfterTitle || 'sebelumnya'}" terlebih dahulu.`,
        is_locked: true,
        unlocks_after_title: unlocksAfterTitle
      });
      return;
    }

    let isSolved = false;
    let unlockedHintText: string | null = null;
    let teamScore = 0;
    if (teamId) {
      const [solve, hintRecord, currentTeam] = await Promise.all([
        prisma.submission.findFirst({
          where: { team_id: teamId, challenge_id: challenge.id, is_correct: true }
        }),
        (prisma as any).unlockedHint.findUnique({
          where: {
            team_id_challenge_id: {
              team_id: teamId,
              challenge_id: challenge.id
            }
          },
          include: {
            challenge: { select: { hint: true } }
          }
        }),
        prisma.team.findUnique({
          where: { id: teamId },
          select: { score: true }
        })
      ]);
      isSolved = Boolean(solve);
      teamScore = currentTeam?.score || 0;
      if (hintRecord?.challenge?.hint) {
        unlockedHintText = hintRecord.challenge.hint;
      }
    }

    res.json({
      ...challenge,
      event: eventRecord,
      event_name: eventRecord?.name,
      event_start_time: eventRecord?.start_time,
      event_end_time: eventRecord?.end_time,
      event_freeze_time: eventRecord?.freeze_time,
      hint: canViewSolutions ? challenge.hint : (unlockedHintText || null),
      unlocked_hint: unlockedHintText,
      team_score: teamScore,
      is_locked: false,
      unlocks_after_title: null,
      is_solved: isSolved,
      is_event_paused: isEventPaused,
      is_event_finished: isEventFinished,
      is_force_stopped: isForceStopped,
      is_session_paused: isSessionPaused,
      paused_duration_seconds: pausedDurationSeconds,
      is_admin_preview: isStaff
    });
  } catch (err) {
    console.error('Get challenge detail error:', err);
    res.status(500).json({ error: 'Failed to fetch challenge detail' });
  }
};

// Participant: Track challenge work session start
export const trackChallengeSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    // Do NOT track sessions or timers for Admin, Jury, Moderator, or other staff roles
    if (role && role !== 'PARTICIPANT') {
      res.json({
        session_id: null,
        challenge_id: id,
        status: 'ADMIN_PREVIEW',
        is_admin_preview: true,
        elapsed_seconds: 0
      });
      return;
    }

    const userId = req.user!.id;
    const teamId = req.user!.team_id;
    const eventId = req.user!.event_id;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      select: { id: true, title: true, category: true, points: true, event_id: true }
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    const event = challenge.event_id ? await (prisma as any).event.findUnique({
      where: { id: challenge.event_id },
      select: { id: true, is_paused: true } as any
    }) : null;

    const isEventPaused = Boolean((event as any)?.is_paused);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true }
    });

    const team = teamId ? await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true }
    }) : null;

    // Check if already solved
    const existingSolve = teamId ? await prisma.submission.findFirst({
      where: { team_id: teamId, challenge_id: challenge.id, is_correct: true }
    }) : await prisma.submission.findFirst({
      where: { user_id: userId, challenge_id: challenge.id, is_correct: true }
    });

    const isSolved = Boolean(existingSolve);
    const now = new Date();

    const existingAttempt = await (prisma as any).challengeAttempt.findUnique({
      where: {
        user_id_challenge_id: {
          user_id: userId,
          challenge_id: challenge.id
        }
      }
    });

    let currentStatus = isSolved ? 'SOLVED' : 'IN_PROGRESS';
    let isForceStopped = false;
    let isPaused = false;
    let pausedDurationSeconds = 0;

    if (existingAttempt) {
      isForceStopped = Boolean(existingAttempt.is_force_stopped);
      isPaused = Boolean(existingAttempt.is_paused);
      pausedDurationSeconds = existingAttempt.paused_duration_seconds || 0;
      if (isForceStopped) currentStatus = 'FORCE_STOPPED';
      else if (isPaused || isEventPaused) currentStatus = 'PAUSED';
    }

    const attempt = await (prisma as any).challengeAttempt.upsert({
      where: {
        user_id_challenge_id: {
          user_id: userId,
          challenge_id: challenge.id
        }
      },
      update: {
        team_id: teamId || null,
        event_id: challenge.event_id || eventId || null,
        last_active_at: now,
        status: isSolved ? 'SOLVED' : currentStatus
      },
      create: {
        user_id: userId,
        team_id: teamId || null,
        challenge_id: challenge.id,
        event_id: challenge.event_id || eventId || null,
        started_at: now,
        last_active_at: now,
        status: isSolved ? 'SOLVED' : currentStatus,
        solved_at: isSolved ? existingSolve?.submitted_at : null
      }
    });

    const netElapsedSeconds = Math.max(0, Math.floor((now.getTime() - new Date(attempt.started_at).getTime()) / 1000) - (pausedDurationSeconds || 0));

    // Broadcast real-time activity update
    broadcastLiveActivity({
      type: 'SESSION_START',
      user_id: userId,
      username: user?.username || 'Unknown',
      email: user?.email,
      team_id: teamId,
      team_name: team?.name || null,
      challenge_id: challenge.id,
      challenge_title: challenge.title,
      category: challenge.category,
      points: challenge.points,
      event_id: challenge.event_id || eventId || null,
      started_at: attempt.started_at.toISOString(),
      last_active_at: attempt.last_active_at.toISOString(),
      solved_at: attempt.solved_at ? attempt.solved_at.toISOString() : null,
      status: attempt.status,
      is_force_stopped: Boolean(attempt.is_force_stopped),
      is_paused: Boolean(attempt.is_paused)
    });

    res.json({
      session_id: attempt.id,
      challenge_id: challenge.id,
      started_at: attempt.started_at,
      last_active_at: attempt.last_active_at,
      status: attempt.status,
      elapsed_seconds: netElapsedSeconds,
      is_solved: isSolved,
      is_force_stopped: isForceStopped,
      is_paused: isPaused,
      is_event_paused: isEventPaused,
      paused_duration_seconds: pausedDurationSeconds,
      paused_at: attempt.paused_at
    });
  } catch (err) {
    console.error('Track challenge session error:', err);
    res.status(500).json({ error: 'Failed to track challenge session' });
  }
};

// Participant: Challenge working heartbeat
export const challengeHeartbeat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const now = new Date();

    const attempt = await (prisma as any).challengeAttempt.findUnique({
      where: {
        user_id_challenge_id: {
          user_id: userId,
          challenge_id: id
        }
      },
      include: {
        user: { select: { username: true, email: true } },
        challenge: {
          select: {
            title: true,
            category: true,
            points: true,
            event_id: true,
            event: { select: { id: true, is_paused: true } }
          }
        }
      }
    });

    if (attempt) {
      const isEventPaused = Boolean(attempt.challenge?.event?.is_paused);
      let newStatus = attempt.status;
      if (attempt.status !== 'SOLVED') {
        if (attempt.is_force_stopped) {
          newStatus = 'FORCE_STOPPED';
        } else if (attempt.is_paused || isEventPaused) {
          newStatus = 'PAUSED';
        } else {
          newStatus = 'IN_PROGRESS';
        }
      }

      const updated = await (prisma as any).challengeAttempt.update({
        where: { id: attempt.id },
        data: {
          last_active_at: now,
          status: newStatus
        }
      });

      broadcastLiveActivity({
        type: 'HEARTBEAT',
        user_id: userId,
        username: attempt.user?.username || 'Unknown',
        email: attempt.user?.email,
        team_id: attempt.team_id,
        challenge_id: attempt.challenge_id,
        challenge_title: attempt.challenge?.title || 'Unknown',
        category: attempt.challenge?.category,
        points: attempt.challenge?.points,
        event_id: attempt.event_id || attempt.challenge?.event_id,
        started_at: updated.started_at.toISOString(),
        last_active_at: updated.last_active_at.toISOString(),
        solved_at: updated.solved_at ? updated.solved_at.toISOString() : null,
        status: updated.status,
        is_force_stopped: Boolean(attempt.is_force_stopped),
        is_paused: Boolean(attempt.is_paused)
      });

      const pausedSec = attempt.paused_duration_seconds || 0;
      const netElapsed = Math.max(0, Math.floor((now.getTime() - new Date(attempt.started_at).getTime()) / 1000) - pausedSec);

      res.json({
        status: updated.status,
        last_active_at: updated.last_active_at,
        started_at: updated.started_at,
        elapsed_seconds: netElapsed,
        paused_duration_seconds: pausedSec,
        paused_at: attempt.paused_at,
        is_force_stopped: Boolean(attempt.is_force_stopped),
        is_paused: Boolean(attempt.is_paused),
        is_event_paused: isEventPaused
      });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
};

// Participant: Unlock hint (deduct points from team)
export const unlockHint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = req.user!.role;
    const eventId = req.user!.event_id;
    const teamId = req.user!.team_id;

    if (!eventId && role === 'PARTICIPANT') {
      res.status(403).json({
        error: 'Akses ditolak: Anda belum menukarkan (Redeem) Access Token untuk arena ini.',
        require_token: true
      });
      return;
    }

    if (!teamId) {
      res.status(403).json({ error: 'You must join a team first to unlock hints' });
      return;
    }

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    if (!challenge.hint) {
      res.status(400).json({ error: 'This challenge has no hints available' });
      return;
    }

    // Check if challenge is locked
    if (challenge.event_id) {
      const event = await prisma.event.findUnique({
        where: { id: challenge.event_id },
        select: { is_chained: true }
      });

      if (event?.is_chained) {
        const catChallenges = await (prisma.challenge as any).findMany({
          where: { is_active: true, event_id: challenge.event_id, category: challenge.category },
          select: { id: true, title: true, category: true, unlock_order: true }
        });

        const solvedList = teamId ? (await prisma.submission.findMany({
          where: { team_id: teamId, is_correct: true },
          select: { challenge_id: true }
        })).map((s: any) => s.challenge_id) : [];

        const lockStatus = evaluateChainingLock(challenge, catChallenges, solvedList);
        if (lockStatus.isLocked) {
          res.status(403).json({
            error: `🔒 Tidak dapat membuka hint untuk tantangan yang masih terkunci! Selesaikan tantangan "${lockStatus.unlocksAfterTitle || 'sebelumnya'}" terlebih dahulu.`
          });
          return;
        }
      }
    }

    const userId = req.user!.id;

    // Check if challenge is already solved by the team -> if solved, hint request is locked
    const alreadySolved = await prisma.submission.findFirst({
      where: { team_id: teamId, challenge_id: challenge.id, is_correct: true }
    });

    if (alreadySolved) {
      res.status(400).json({
        error: '🔒 Tantangan ini telah berhasil dipecahkan (Solved) oleh tim Anda! Permintaan hint telah terkunci.'
      });
      return;
    }

    // Check if event is finished -> if finished, hint is free for review/learning
    let isEventFinished = false;
    if (challenge.event_id) {
      const eventRecord = await prisma.event.findUnique({
        where: { id: challenge.event_id },
        select: { is_finished: true, end_time: true }
      });
      if (eventRecord?.is_finished || (eventRecord?.end_time && new Date(eventRecord.end_time) <= new Date())) {
        isEventFinished = true;
      }
    }

    // Check if team has enough points before unlocking hint
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, score: true }
    });

    if (!team) {
      res.status(404).json({ error: 'Tim tidak ditemukan' });
      return;
    }

    if (challenge.hint_cost > 0 && !isEventFinished) {
      if (team.score < challenge.hint_cost) {
        res.status(400).json({
          error: `🔒 Skor tim Anda (${team.score} PTS) tidak mencukupi untuk membuka petunjuk ini! Dibutuhkan minimal ${challenge.hint_cost} PTS. Selesaikan tantangan lain terlebih dahulu untuk mengumpulkan poin.`
        });
        return;
      }
    }

    // Run atomic transaction to unlock hint & deduct cost
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if team already unlocked this hint inside tx
      const existingUnlock = await (tx as any).unlockedHint.findUnique({
        where: {
          team_id_challenge_id: {
            team_id: teamId,
            challenge_id: challenge.id
          }
        }
      });

      if (existingUnlock) {
        return {
          alreadyUnlocked: true,
          hint: challenge.hint,
          costDeducted: 0
        };
      }

      // 2. Strict score check inside tx
      const currentTeam = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, score: true }
      });

      if (!currentTeam) {
        throw new Error('Tim tidak ditemukan');
      }

      let costDeducted = 0;
      if (challenge.hint_cost > 0 && !isEventFinished) {
        if (currentTeam.score < challenge.hint_cost) {
          throw new Error(`🔒 Skor tim Anda (${currentTeam.score} PTS) tidak mencukupi untuk membuka petunjuk ini! Dibutuhkan minimal ${challenge.hint_cost} PTS.`);
        }

        costDeducted = challenge.hint_cost;
        await tx.team.update({
          where: { id: teamId },
          data: { score: { decrement: challenge.hint_cost } }
        });
      }

      await (tx as any).unlockedHint.create({
        data: {
          team_id: teamId,
          user_id: userId,
          challenge_id: challenge.id,
          event_id: challenge.event_id,
          cost_deducted: costDeducted
        }
      });

      return {
        alreadyUnlocked: false,
        hint: challenge.hint,
        costDeducted
      };
    });

    if (result.alreadyUnlocked) {
      res.json({
        hint: result.hint,
        cost_deducted: 0,
        message: 'Petunjuk (hint) telah dibuka sebelumnya untuk tim Anda.'
      });
      return;
    }

    if (result.costDeducted > 0) {
      try {
        await redis.del(`leaderboard:${challenge.event_id}`);
        await redis.del(`chart:${challenge.event_id}`);
      } catch (err) { }

      if (challenge.event_id) {
        await broadcastScoreboardUpdate(challenge.event_id);
        await broadcastScoreboardSync(challenge.event_id);
      }
    }

    res.json({
      hint: result.hint,
      cost_deducted: result.costDeducted,
      message: isEventFinished
        ? 'Kompetisi telah selesai: Petunjuk (hint) dibuka gratis untuk mode review.'
        : result.costDeducted > 0
          ? `Petunjuk berhasil dibuka! Skor tim dipotong ${result.costDeducted} PTS.`
          : 'Petunjuk berhasil dibuka!'
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      // Caught concurrent unique constraint: already unlocked
      const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
      res.json({
        hint: challenge?.hint,
        cost_deducted: 0,
        message: 'Petunjuk telah berhasil dibuka sebelumnya.'
      });
      return;
    }
    console.error('Unlock hint error:', err);
    res.status(400).json({ error: err.message || 'Gagal membuka hint' });
  }
};

// Participant: Submit Flag (Hit The Flag!)
export const submitFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const eventId = req.user!.event_id;
  const teamId = req.user!.team_id;
  const { challenge_id, flag } = req.body;

  if (role !== 'PARTICIPANT') {
    res.status(403).json({ error: '🔒 Akun Administrator / Staff tidak diizinkan melakukan pengiriman flag ke scoreboard arena kompetisi.' });
    return;
  }

  if (!eventId) {
    res.status(403).json({
      error: 'Akses ditolak: Anda belum menukarkan (Redeem) Access Token untuk arena ini.',
      require_token: true
    });
    return;
  }

  if (!teamId) {
    res.status(403).json({ error: 'You must be in a team to submit flags!' });
    return;
  }

  // Acquire in-flight submission lock to prevent concurrent spam
  const hasLock = await acquireSubmissionLock(teamId, challenge_id);
  if (!hasLock) {
    res.status(429).json({ error: '⏳ Verifikasi pengiriman flag sedang diproses. Harap tunggu sebentar.' });
    return;
  }

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ error: 'Team not found!' });
      return;
    }
    if (team.is_banned) {
      res.status(403).json({ error: 'Your team is disqualified from the competition.' });
      return;
    }
    if ((team as any).is_force_stopped) {
      res.status(403).json({ error: '🔒 Seluruh pengerjaan tim Anda telah dikunci (Force Stopped) .' });
      return;
    }
    if ((team as any).is_paused) {
      res.status(403).json({ error: 'Timer pengerjaan tim Anda sedang di-pause !' });
      return;
    }

    // Check event pause / freeze / timing rules and team size
    const event = await prisma.event.findUnique({ where: { id: team.event_id } });
    if (event) {
      if ((event as any).is_finished) {
        res.status(403).json({ error: '🏆 Kompetisi arena ini telah diselesaikan secara resmi oleh Panitia! Pengiriman flag ditutup.' });
        return;
      }

      if ((event as any).is_paused) {
        res.status(403).json({ error: 'Kompetisi sedang di-pause ! Pengiriman flag dinonaktifkan sementara.' });
        return;
      }

      const isTeamMode = (event.participation_mode === 'TEAM' || !event.participation_mode);
      if (isTeamMode) {
        const minMembers = event.min_team_size || 1;
        if (minMembers > 1) {
          const teamMemberCount = await prisma.teamMember.count({ where: { team_id: teamId } });
          if (teamMemberCount < minMembers) {
            res.status(403).json({
              error: `🔒 Syarat Minimal Anggota Belum Terpenuhi! Event ini mewajibkan minimal ${minMembers} anggota per tim untuk dapat melakukan submit flag (Saat ini tim Anda memiliki ${teamMemberCount}/${minMembers} anggota).`,
              require_min_members: true,
              min_team_size: minMembers,
              current_team_size: teamMemberCount
            });
            return;
          }
        }
      }

      const now = new Date();
      if (event.start_time && now < new Date(event.start_time)) {
        res.status(403).json({ error: 'Event has not started yet!' });
        return;
      }
      if (event.end_time && now > new Date(event.end_time)) {
        res.status(403).json({ error: 'Event has already ended! Submissions are closed.' });
        return;
      }
      if (event.is_frozen || (event.freeze_time && now > new Date(event.freeze_time))) {
        // We still accept submissions during freeze, but scoreboard won't show updates to participants!
      }
    }

    // Check individual participant session lock / pause
    const userAttempt = await (prisma as any).challengeAttempt.findUnique({
      where: {
        user_id_challenge_id: {
          user_id: userId,
          challenge_id
        }
      }
    });

    if (userAttempt?.is_force_stopped) {
      res.status(403).json({ error: '🔒 Pengerjaan tantangan Anda telah dikunci (Force Stopped) .' });
      return;
    }

    if (userAttempt?.is_paused) {
      res.status(403).json({ error: 'Waktu pengerjaan tantangan sedang di-pause .' });
      return;
    }

    const challenge = await (prisma.challenge as any).findFirst({
      where: { id: challenge_id, is_active: true, is_hidden: false },
      include: {
        event: {
          select: {
            enable_fb_bonus: true,
            fb_bonus_1st: true,
            fb_bonus_2nd: true,
            fb_bonus_3rd: true,
            solve_decay_pts: true
          }
        }
      }
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    // Chaining rule enforcement: check if previous challenge in this category was solved
    if (event?.is_chained) {
      const catChallenges = await (prisma.challenge as any).findMany({
        where: { is_active: true, event_id: team.event_id, category: challenge.category },
        select: { id: true, title: true, category: true, unlock_order: true }
      });

      const solvedList = (await prisma.submission.findMany({
        where: { team_id: teamId, is_correct: true },
        select: { challenge_id: true }
      })).map((s: any) => s.challenge_id);

      const lockStatus = evaluateChainingLock(challenge, catChallenges, solvedList);
      if (lockStatus.isLocked) {
        res.status(403).json({
          error: `🔒 Tantangan ini terkunci! Selesaikan tantangan "${lockStatus.unlocksAfterTitle || 'sebelumnya'}" dalam kategori ini terlebih dahulu.`
        });
        return;
      }
    }

    // Validate SHA256 Hash
    const isCorrect = verifyFlag(flag, challenge.flag_hash);
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip || null;

    // ATOMIC TRANSACTION: Check solve status, insert submission, award points, record First Blood & update attempts
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check one solve per team inside the transaction
      const existingSolve = await tx.submission.findFirst({
        where: { team_id: teamId, challenge_id: challenge.id, is_correct: true }
      });

      if (existingSolve) {
        const err: any = new Error('ALREADY_SOLVED');
        err.isCustomSolveError = true;
        throw err;
      }

      // 2. Record submission log inside transaction
      const submission = await tx.submission.create({
        data: {
          team_id: teamId,
          user_id: userId,
          challenge_id: challenge.id,
          flag: String(flag).trim().slice(0, 500),
          ip: clientIp ? String(clientIp).slice(0, 100) : null,
          is_correct: isCorrect
        }
      });

      if (!isCorrect) {
        return { isCorrect: false, submissionId: submission.id };
      }

      // 3. FLAG IS CORRECT: Count prior solves by other teams to determine solve rank (Hit #1, #2, #3, ...)
      const priorSolves = await tx.submission.findMany({
        where: {
          challenge_id: challenge.id,
          is_correct: true,
          team_id: { not: teamId }
        },
        select: { team_id: true },
        distinct: ['team_id']
      });

      const solveRank = priorSolves.length + 1;

      // Build scoring rules: per-challenge override takes priority over event-level config
      const chalAny = challenge as any;
      const evRules = chalAny.event || {};
      const scoringRules: import('../utils/scoring.js').EventScoringRules = chalAny.fb_bonus_override
        ? {
          enable_fb_bonus: true,
          fb_bonus_1st: chalAny.fb_bonus_override_1st ?? 50,
          fb_bonus_2nd: chalAny.fb_bonus_override_2nd ?? 25,
          fb_bonus_3rd: chalAny.fb_bonus_override_3rd ?? 10,
          solve_decay_pts: evRules.solve_decay_pts ?? 5
        }
        : {
          enable_fb_bonus: evRules.enable_fb_bonus ?? true,
          fb_bonus_1st: evRules.fb_bonus_1st ?? 50,
          fb_bonus_2nd: evRules.fb_bonus_2nd ?? 25,
          fb_bonus_3rd: evRules.fb_bonus_3rd ?? 10,
          solve_decay_pts: evRules.solve_decay_pts ?? 5
        };

      const { totalPoints: awardedPoints, bonusPoints, isFirstBlood } = calculateSolvePoints(challenge.points, solveRank, scoringRules);

      // Check & record First Blood inside tx if solveRank === 1
      if (isFirstBlood) {
        const existingFB = await tx.firstBlood.findUnique({
          where: { challenge_id: challenge.id }
        });

        if (!existingFB) {
          await tx.firstBlood.create({
            data: {
              challenge_id: challenge.id,
              team_id: teamId
            }
          });
        }
      }

      // Add score to team inside tx
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: { score: { increment: awardedPoints } }
      });

      // Mark challenge attempt as solved inside tx
      const solvedAt = new Date();
      let updatedAttempt: any = null;
      try {
        updatedAttempt = await (tx as any).challengeAttempt.upsert({
          where: {
            user_id_challenge_id: {
              user_id: userId,
              challenge_id: challenge.id
            }
          },
          update: {
            status: 'SOLVED',
            solved_at: solvedAt,
            last_active_at: solvedAt
          },
          create: {
            user_id: userId,
            team_id: teamId,
            challenge_id: challenge.id,
            event_id: team?.event_id || challenge.event_id,
            started_at: solvedAt,
            solved_at: solvedAt,
            last_active_at: solvedAt,
            status: 'SOLVED'
          }
        });
      } catch (attErr) {
        console.warn('Could not update challenge attempt status inside tx:', attErr);
      }

      return {
        isCorrect: true,
        submissionId: submission.id,
        awardedPoints,
        bonusPoints,
        isFirstBlood,
        solveRank,
        updatedTeam,
        updatedAttempt,
        solvedAt
      };
    });

    if (!result.isCorrect) {
      logger.ctf('FLAG_MISS', team!.name, challenge.title, 0);
      try {
        const { broadcastSecurityEvent } = await import('../sockets/scoreboardSocket.js');
        broadcastSecurityEvent({
          type: 'BRUTE_FORCE',
          severity: 'WARNING',
          title: `Flag Salah: ${challenge.title}`,
          details: `Tim "${team?.name}" (@${req.user?.username}) memasukkan flag yang salah pada tantangan "${challenge.title}".`,
          team_id: team?.id,
          team_name: team?.name,
          user_id: userId,
          username: req.user?.username,
          challenge_id: challenge.id,
          challenge_title: challenge.title,
          timestamp: new Date().toISOString()
        });
      } catch { }
      broadcastAttackResult(team!.event_id, {
        id: result.submissionId,
        teamId: team!.id,
        teamName: team!.name,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        success: false,
        isFirstBlood: false,
        pointsGained: 0,
        newTotalScore: team!.score,
        timestamp: new Date().toISOString()
      });
      res.status(400).json({ error: 'Incorrect flag! Keep trying!' });
      return;
    }

    // FLAG IS CORRECT AND COMMITTED
    const { awardedPoints, bonusPoints, isFirstBlood, solveRank, updatedTeam, updatedAttempt, solvedAt, submissionId } = result;

    if (isFirstBlood) {
      logger.ctf('FIRST_BLOOD', team!.name, challenge.title, awardedPoints);
      broadcastFirstBlood(team!.event_id, {
        team_name: team!.name,
        challenge_title: challenge.title,
        points: awardedPoints
      });
    } else {
      logger.ctf('FLAG_HIT', team!.name, challenge.title, awardedPoints);
    }

    if (updatedAttempt) {
      broadcastLiveActivity({
        type: 'SOLVED',
        user_id: userId,
        username: req.user?.username || 'Unknown',
        email: (req.user as any)?.email,
        team_id: teamId,
        team_name: team?.name || null,
        challenge_id: challenge.id,
        challenge_title: challenge.title,
        category: challenge.category,
        points: awardedPoints,
        event_id: team?.event_id || challenge.event_id,
        started_at: updatedAttempt.started_at ? updatedAttempt.started_at.toISOString() : solvedAt!.toISOString(),
        last_active_at: updatedAttempt.last_active_at ? updatedAttempt.last_active_at.toISOString() : solvedAt!.toISOString(),
        solved_at: updatedAttempt.solved_at ? updatedAttempt.solved_at.toISOString() : solvedAt!.toISOString(),
        status: 'SOLVED'
      });
    }

    try {
      await redis.del(`leaderboard:${team!.event_id}`);
      await redis.del(`chart:${team!.event_id}`);
      await redis.del(`challenges:event:${team!.event_id}`);
      await redis.del(`challenges:solved:${teamId}`);
    } catch (err) { }

    // Broadcast live scoreboard update & 3D attack result via WebSocket
    await broadcastScoreboardUpdate(team!.event_id);
    await broadcastScoreboardSync(team!.event_id);
    broadcastAttackResult(team!.event_id, {
      id: submissionId,
      teamId: team!.id,
      teamName: team!.name,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      success: true,
      isFirstBlood: isFirstBlood ?? false,
      pointsGained: awardedPoints || 0,
      newTotalScore: updatedTeam?.score ?? team!.score + (awardedPoints || 0),
      timestamp: new Date().toISOString()
    });

    let successMsg = `🎉 Correct flag! Awarded ${awardedPoints} points!`;
    if (solveRank === 1) {
      successMsg = `👑 FIRST BLOOD! Correct flag! Awarded ${awardedPoints} points (+50 1st Blood bonus)!`;
    } else if (solveRank === 2) {
      successMsg = `🥈 SECOND BLOOD! Correct flag! Awarded ${awardedPoints} points (+25 2nd Blood bonus)!`;
    } else if (solveRank === 3) {
      successMsg = `🥉 THIRD BLOOD! Correct flag! Awarded ${awardedPoints} points (+10 3rd Blood bonus)!`;
    } else if (solveRank && solveRank >= 5 && bonusPoints && bonusPoints < 0) {
      successMsg = `🎉 Solved (#${solveRank})! Awarded ${awardedPoints} points (decayed by ${Math.abs(bonusPoints)} PTS)!`;
    }

    res.json({
      success: true,
      message: successMsg,
      points_awarded: awardedPoints,
      solve_rank: solveRank,
      is_first_blood: isFirstBlood
    });
  } catch (err: any) {
    if (err.message === 'ALREADY_SOLVED' || err.isCustomSolveError || err.code === 'P2002' || (err.message && err.message.includes('unique_correct_team_challenge'))) {
      res.status(400).json({ error: 'Your team has already solved this challenge!' });
      return;
    }
    console.error('Submit flag error:', err);
    res.status(500).json({ error: 'Failed to process submission' });
  } finally {
    await releaseSubmissionLock(teamId, challenge_id);
  }
};

// ADMIN CRUD
export const createChallengeAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, category, points, flag, hint, hint_cost,
      file_url, is_active, is_hidden = false, event_id, unlock_order,
      fb_bonus_override = false,
      fb_bonus_override_1st = 50,
      fb_bonus_override_2nd = 25,
      fb_bonus_override_3rd = 10
    } = req.body;

    const trimmedFlag = (flag || '').trim();
    const flag_hash = hashFlag(trimmedFlag);

    const challenge = await (prisma.challenge as any).create({
      data: {
        title,
        description,
        category,
        points,
        flag: trimmedFlag,
        flag_hash,
        hint,
        hint_cost,
        file_url,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        is_hidden: Boolean(is_hidden),
        event_id,
        unlock_order: unlock_order !== undefined ? parseInt(String(unlock_order), 10) || 0 : 0,
        created_by: req.user!.id,
        fb_bonus_override: Boolean(fb_bonus_override),
        fb_bonus_override_1st: Math.max(0, Number(fb_bonus_override_1st) || 50),
        fb_bonus_override_2nd: Math.max(0, Number(fb_bonus_override_2nd) || 25),
        fb_bonus_override_3rd: Math.max(0, Number(fb_bonus_override_3rd) || 10)
      }
    });

    // Invalidate redis cache
    if (event_id) {
      await redis.del(`challenges:event:${event_id}`).catch(() => {});
      await redis.del(`categories:event:${event_id}`).catch(() => {});
    }

    res.status(201).json({ message: 'Challenge created successfully', challenge });
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

export const updateChallengeAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title, description, category, points, flag, hint, hint_cost,
      file_url, is_active, is_hidden, event_id, unlock_order,
      fb_bonus_override,
      fb_bonus_override_1st,
      fb_bonus_override_2nd,
      fb_bonus_override_3rd
    } = req.body;

    const updateData: any = { title, description, category, points, hint, hint_cost, file_url };
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (is_hidden !== undefined) updateData.is_hidden = Boolean(is_hidden);
    if (event_id) updateData.event_id = event_id;
    if (unlock_order !== undefined) {
      updateData.unlock_order = parseInt(String(unlock_order), 10) || 0;
    }
    if (flag !== undefined && flag !== null && flag.trim() !== '') {
      const trimmedFlag = flag.trim();
      updateData.flag = trimmedFlag;
      updateData.flag_hash = hashFlag(trimmedFlag);
    }

    // Per-challenge FB bonus override fields
    if (fb_bonus_override !== undefined) {
      updateData.fb_bonus_override = Boolean(fb_bonus_override);
    }
    if (fb_bonus_override_1st !== undefined) {
      updateData.fb_bonus_override_1st = Math.max(0, Number(fb_bonus_override_1st));
    }
    if (fb_bonus_override_2nd !== undefined) {
      updateData.fb_bonus_override_2nd = Math.max(0, Number(fb_bonus_override_2nd));
    }
    if (fb_bonus_override_3rd !== undefined) {
      updateData.fb_bonus_override_3rd = Math.max(0, Number(fb_bonus_override_3rd));
    }

    const challenge = await (prisma.challenge as any).update({
      where: { id },
      data: updateData
    });

    // Invalidate redis cache
    if (challenge.event_id) {
      await redis.del(`challenges:event:${challenge.event_id}`).catch(() => {});
      await redis.del(`categories:event:${challenge.event_id}`).catch(() => {});
    }

    res.json({ message: 'Challenge updated successfully', challenge });
  } catch (err) {
    console.error('Failed to update challenge:', err);
    res.status(500).json({ error: 'Failed to update challenge' });
  }
};

export const deleteChallengeAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.delete({ where: { id } });
    if (challenge.event_id) {
      await redis.del(`challenges:event:${challenge.event_id}`).catch(() => {});
      await redis.del(`categories:event:${challenge.event_id}`).catch(() => {});
    }
    res.json({ message: 'Challenge deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
};

// Admin: Toggle single challenge visibility (Show / Hide)
export const toggleChallengeVisibilityAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_hidden } = req.body;

    const current = await (prisma.challenge as any).findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Challenge tidak ditemukan' });
      return;
    }

    const newHidden = is_hidden !== undefined ? Boolean(is_hidden) : !current.is_hidden;
    const updated = await (prisma.challenge as any).update({
      where: { id },
      data: { is_hidden: newHidden }
    });

    if (updated.event_id) {
      await redis.del(`challenges:event:${updated.event_id}`).catch(() => {});
      await redis.del(`categories:event:${updated.event_id}`).catch(() => {});
    }
    await redis.del('challenges:event:global').catch(() => {});
    await redis.del('categories:event:global').catch(() => {});

    logger.audit(
      req.user?.username || 'Admin',
      newHidden ? 'HIDE_CHALLENGE' : 'SHOW_CHALLENGE',
      updated.title,
      { challenge_id: updated.id, is_hidden: newHidden, event_id: updated.event_id }
    );

    // Realtime broadcast so admin tables update instantly without a page refresh
    broadcastChallengeVisibility({
      type: 'single',
      challenge_id: updated.id,
      event_id: updated.event_id,
      is_hidden: newHidden
    });

    res.json({
      message: newHidden ? `Challenge "${updated.title}" is now hidden from participants.` : `Challenge "${updated.title}" is now visible to participants.`,
      challenge: updated
    });
  } catch (err: any) {
    console.error('Toggle visibility error:', err);
    res.status(500).json({ error: 'Failed to update challenge visibility', details: err.message });
  }
};

// Admin: Bulk Toggle Challenge Visibility (All challenges, per category, or per event)
export const bulkToggleChallengeVisibilityAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { event_id, category, challenge_ids, is_hidden } = req.body;
    if (is_hidden === undefined) {
      res.status(400).json({ error: 'Parameter is_hidden wajib disertakan (true / false)' });
      return;
    }

    const targetHidden = Boolean(is_hidden);
    const whereCondition: any = {};

    if (event_id && event_id !== 'ALL') {
      whereCondition.event_id = event_id;
    }
    if (category && category !== 'ALL') {
      whereCondition.category = category;
    }
    if (Array.isArray(challenge_ids) && challenge_ids.length > 0) {
      whereCondition.id = { in: challenge_ids };
    }

    const result = await (prisma.challenge as any).updateMany({
      where: whereCondition,
      data: { is_hidden: targetHidden }
    });

    // Invalidate Redis cache
    if (event_id && event_id !== 'ALL') {
      await redis.del(`challenges:event:${event_id}`).catch(() => {});
      await redis.del(`categories:event:${event_id}`).catch(() => {});
    } else {
      try {
        if (redis.client && redis.client.status === 'ready') {
          const keys = await redis.client.keys('challenges:event:*');
          if (keys.length > 0) await redis.client.del(...keys);
          const catKeys = await redis.client.keys('categories:event:*');
          if (catKeys.length > 0) await redis.client.del(...catKeys);
        }
      } catch { }
    }

    const actionText = targetHidden ? 'disembunyikan dari peserta' : 'ditampilkan ke peserta';
    let targetLabel = 'Semua tantangan';
    if (category && category !== 'ALL') {
      targetLabel = `Tantangan kategori "${category}"`;
    }
    if (event_id && event_id !== 'ALL') {
      targetLabel += ` di arena terpilih`;
    }

    logger.audit(
      req.user?.username || 'Admin',
      targetHidden ? 'BULK_HIDE_CHALLENGES' : 'BULK_SHOW_CHALLENGES',
      targetLabel,
      { count: result.count, is_hidden: targetHidden, event_id, category }
    );

    // Realtime broadcast so admin tables update instantly without a page refresh
    broadcastChallengeVisibility({
      type: 'bulk',
      event_id: event_id && event_id !== 'ALL' ? event_id : null,
      category: category && category !== 'ALL' ? category : null,
      is_hidden: targetHidden,
      count: result.count
    });

    res.json({
      message: `${targetLabel} successfully ${targetHidden ? 'hidden from' : 'shown to'} participants (${result.count} challenges).`,
      count: result.count,
      is_hidden: targetHidden
    });
  } catch (err: any) {
    console.error('Bulk visibility error:', err);
    res.status(500).json({ error: 'Failed to bulk update challenge visibility', details: err.message });
  }
};

export const getAllChallengesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenges = await (prisma.challenge as any).findMany({
      orderBy: [{ event_id: 'asc' }, { category: 'asc' }, { unlock_order: 'asc' }, { created_at: 'asc' }],
      include: {
        event: {
          select: {
            id: true,
            name: true,
            is_chained: true,
            enable_fb_bonus: true,
            fb_bonus_1st: true,
            fb_bonus_2nd: true,
            fb_bonus_3rd: true,
            solve_decay_pts: true
          }
        },
        _count: { select: { submissions: true } },
        first_blood: { include: { team: { select: { name: true } } } }
      }
    });
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin challenges' });
  }
};

// Admin: Import bulk challenges via JSON or Spreadsheet (XLSX / CSV)
export const importChallengesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challenges, default_event_id } = req.body;
    if (!Array.isArray(challenges)) {
      res.status(400).json({ error: 'Expected an array of challenges in "challenges" field' });
      return;
    }

    if (challenges.length === 0) {
      res.status(400).json({ error: 'Data tantangan kosong' });
      return;
    }

    // Fetch existing events and categories for fast mapping
    const [allEvents, allCategories] = await Promise.all([
      prisma.event.findMany({ select: { id: true, name: true } }),
      prisma.category.findMany({ select: { id: true, name: true } })
    ]);

    const eventMap = new Map<string, string>();
    for (const ev of allEvents) {
      eventMap.set(ev.name.trim().toLowerCase(), ev.id);
    }

    const existingCategoryNames = new Set(allCategories.map(c => c.name.trim().toUpperCase()));

    let fallbackEventId = default_event_id;
    if (!fallbackEventId && allEvents.length > 0) {
      fallbackEventId = allEvents[0].id;
    }

    const warnings: string[] = [];
    let createdCount = 0;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < challenges.length; i++) {
        const raw = challenges[i];
        const title = (raw.title || raw.Title || raw.name || raw.Judul || raw.judul || '').trim();
        const rawFlag = (raw.flag || raw.Flag || raw.kunci || raw.flag_key || '').toString().trim();

        if (!title) {
          warnings.push(`Baris #${i + 1}: Judul tantangan tidak boleh kosong, dilewati.`);
          continue;
        }

        if (!rawFlag) {
          warnings.push(`Baris #${i + 1} (${title}): Flag tantangan tidak boleh kosong, dilewati.`);
          continue;
        }

        const categoryRaw = (raw.category || raw.Category || raw.kategori || 'MISC').toString().trim().toUpperCase();
        const category = categoryRaw || 'MISC';

        // Auto upsert category if new
        if (!existingCategoryNames.has(category)) {
          try {
            await tx.category.upsert({
              where: { name: category },
              update: {},
              create: { name: category }
            });
            existingCategoryNames.add(category);
          } catch (e) {
            // Ignore if race condition
          }
        }

        // Determine target event_id
        let targetEventId = raw.event_id || raw.eventId;
        if (!targetEventId && (raw.event_name || raw.EventName || raw.event || raw.Event)) {
          const evName = String(raw.event_name || raw.EventName || raw.event || raw.Event).trim().toLowerCase();
          targetEventId = eventMap.get(evName);
        }

        if (!targetEventId) {
          targetEventId = fallbackEventId;
        }

        if (!targetEventId) {
          warnings.push(`Baris #${i + 1} (${title}): Tidak ada Event Arena yang valid, dilewati.`);
          continue;
        }

        // Parse points
        const points = Math.max(0, parseInt(String(raw.points ?? raw.Points ?? raw.poin ?? raw.score ?? 100), 10) || 100);

        // Parse description
        const description = (raw.description || raw.Description || raw.deskripsi || raw.instruksi || 'No description provided.').trim();

        // Parse hint & hint_cost
        const hint = (raw.hint || raw.Hint || raw.petunjuk || '').toString().trim() || null;
        const hint_cost = Math.max(0, parseInt(String(raw.hint_cost ?? raw.HintCost ?? raw.hint_points ?? 0), 10) || 0);

        // Parse file_url
        const file_url = (raw.file_url || raw.FileUrl || raw.file || raw.link || raw.attachment || '').toString().trim() || null;

        // Parse is_active
        let is_active = true;
        if (raw.is_active !== undefined || raw.IsActive !== undefined || raw.status !== undefined || raw.Status !== undefined) {
          const val = String(raw.is_active ?? raw.IsActive ?? raw.status ?? raw.Status).toLowerCase().trim();
          if (val === 'false' || val === '0' || val === 'inactive' || val === 'no' || val === 'nonaktif' || val === 'off') {
            is_active = false;
          }
        }

        // Parse unlock_order (chaining step number)
        const unlock_order = Math.max(0, parseInt(String(raw.unlock_order ?? raw.UnlockOrder ?? raw.order ?? raw.step ?? raw.chain_order ?? 0), 10) || 0);

        await (tx as any).challenge.create({
          data: {
            title,
            description,
            category,
            points,
            flag: rawFlag,
            flag_hash: hashFlag(rawFlag),
            hint,
            hint_cost,
            file_url,
            is_active,
            unlock_order,
            event_id: targetEventId,
            created_by: req.user?.id || null
          }
        });

        createdCount++;
      }
    });

    res.json({
      message: `Berhasil mengimpor ${createdCount} tantangan CTF!`,
      count: createdCount,
      total: challenges.length,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (err: any) {
    console.error('Import challenges error:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses import tantangan' });
  }
};
