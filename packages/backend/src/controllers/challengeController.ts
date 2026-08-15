import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { hashFlag, verifyFlag } from '../utils/crypto.js';
import { broadcastScoreboardUpdate, broadcastFirstBlood, broadcastAttackResult, broadcastScoreboardSync } from '../sockets/scoreboardSocket.js';
import redis from '../config/redis.js';

// Participant: List active challenges (without flag_hash)
export const listChallenges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    let eventId = req.user!.event_id;
    const teamId = req.user!.team_id;

    // If user is in a team, prefer team's event_id if user's event_id is null
    if (!eventId && teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { event_id: true }
      });
      if (team?.event_id) {
        eventId = team.event_id;
      }
    }

    if (!eventId && role === 'PARTICIPANT') {
      res.status(403).json({ 
        error: 'Anda belum menukarkan (Redeem) Access Token. Silakan masukkan Access Token untuk membuka tantangan event Anda.',
        require_token: true
      });
      return;
    }

    let event = eventId ? await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, is_chained: true }
    }) : null;

    let challenges = await prisma.challenge.findMany({
      where: {
        is_active: true,
        ...(event ? { event_id: event.id } : {})
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        points: true,
        hint_cost: true,
        file_url: true,
        event_id: true,
        created_at: true,
        first_blood: {
          include: { team: { select: { id: true, name: true } } }
        },
        _count: {
          select: { submissions: { where: { is_correct: true } } }
        }
      },
      orderBy: [{ points: 'asc' }, { created_at: 'asc' }]
    });


    // Determine which challenges have been solved by this user's team
    let solvedChallengeIds: string[] = [];
    if (teamId) {
      const solves = await prisma.submission.findMany({
        where: { team_id: teamId, is_correct: true },
        select: { challenge_id: true }
      });
      solvedChallengeIds = solves.map(s => s.challenge_id);
    }

    // Group challenges by category for chaining computation
    const isChained = event?.is_chained ?? false;
    const categoryGroups: Record<string, typeof challenges> = {};

    challenges.forEach(c => {
      if (!categoryGroups[c.category]) {
        categoryGroups[c.category] = [];
      }
      categoryGroups[c.category].push(c);
    });

    // Map each challenge with is_locked and unlocks_after
    const formatted = challenges.map(c => {
      const isSolved = solvedChallengeIds.includes(c.id);
      let isLocked = false;
      let unlocksAfterTitle: string | null = null;

      if (isChained) {
        const catList = categoryGroups[c.category] || [];
        const index = catList.findIndex(item => item.id === c.id);
        if (index > 0) {
          const prevChal = catList[index - 1];
          const isPrevSolved = teamId ? solvedChallengeIds.includes(prevChal.id) : false;
          if (!isPrevSolved) {
            isLocked = true;
            unlocksAfterTitle = prevChal.title;
          }
        }
      }

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        points: c.points,
        created_at: c.created_at,
        // REDACT sensitive fields when locked to prevent network tab leakage
        description: isLocked
          ? `🔒 Tantangan ini terkunci. Selesaikan tantangan "${unlocksAfterTitle || 'sebelumnya'}" terlebih dahulu.`
          : c.description,
        file_url: isLocked ? null : c.file_url,
        hint_cost: isLocked ? 0 : c.hint_cost,
        first_blood: isLocked ? null : c.first_blood,
        is_solved_by_me: isSolved,
        is_locked: isLocked,
        unlocks_after_title: unlocksAfterTitle,
        total_solves: c._count.submissions
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('List challenges error:', err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

// Participant: Get single challenge detail
export const getChallengeDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teamId = req.user!.team_id;
    const eventId = req.user!.event_id;

    const challenge = await prisma.challenge.findFirst({
      where: { id, is_active: true },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        points: true,
        hint_cost: true,
        file_url: true,
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

    // Check chaining status
    let isLocked = false;
    let unlocksAfterTitle: string | null = null;

    if (challenge.event_id) {
      const event = await prisma.event.findUnique({
        where: { id: challenge.event_id },
        select: { is_chained: true }
      });

      if (event?.is_chained) {
        // Find all challenges in same category
        const catChallenges = await prisma.challenge.findMany({
          where: { is_active: true, event_id: challenge.event_id, category: challenge.category },
          orderBy: [{ points: 'asc' }, { created_at: 'asc' }],
          select: { id: true, title: true }
        });

        const index = catChallenges.findIndex(c => c.id === challenge.id);
        if (index > 0) {
          const prevChal = catChallenges[index - 1];
          const prevSolved = teamId ? await prisma.submission.findFirst({
            where: { team_id: teamId, challenge_id: prevChal.id, is_correct: true }
          }) : null;

          if (!prevSolved) {
            isLocked = true;
            unlocksAfterTitle = prevChal.title;
          }
        }
      }
    }

    if (isLocked) {
      // Return 403 Forbidden with lock metadata to prevent sniffing via direct API call
      res.status(403).json({
        error: `🔒 Tantangan ini terkunci! Selesaikan tantangan "${unlocksAfterTitle || 'sebelumnya'}" terlebih dahulu.`,
        is_locked: true,
        unlocks_after_title: unlocksAfterTitle
      });
      return;
    }

    res.json({
      ...challenge,
      is_locked: false,
      unlocks_after_title: null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge detail' });
  }
};

// Participant: Unlock hint (deduct points from team)
export const unlockHint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teamId = req.user!.team_id;

    if (!teamId) {
      res.status(403).json({ error: 'You must join a team first to unlock hints' });
      return;
    }

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge || !challenge.hint) {
      res.status(404).json({ error: 'Hint not available for this challenge' });
      return;
    }

    // Check if challenge is locked
    if (challenge.event_id) {
      const event = await prisma.event.findUnique({
        where: { id: challenge.event_id },
        select: { is_chained: true }
      });

      if (event?.is_chained) {
        const catChallenges = await prisma.challenge.findMany({
          where: { is_active: true, event_id: challenge.event_id, category: challenge.category },
          orderBy: [{ points: 'asc' }, { created_at: 'asc' }],
          select: { id: true, title: true }
        });

        const index = catChallenges.findIndex(c => c.id === challenge.id);
        if (index > 0) {
          const prevChal = catChallenges[index - 1];
          const prevSolved = await prisma.submission.findFirst({
            where: { team_id: teamId, challenge_id: prevChal.id, is_correct: true }
          });
          if (!prevSolved) {
            res.status(403).json({ error: '🔒 Tidak dapat membuka hint untuk tantangan yang masih terkunci!' });
            return;
          }
        }
      }
    }

    // Deduct points if cost > 0
    if (challenge.hint_cost > 0) {
      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: { score: { decrement: challenge.hint_cost } }
      });
      
      try {
        await redis.del(`leaderboard:${updatedTeam.event_id}`);
        await redis.del(`chart:${updatedTeam.event_id}`);
      } catch (err) {}

      await broadcastScoreboardUpdate(updatedTeam.event_id);
      await broadcastScoreboardSync(updatedTeam.event_id);
    }

    res.json({ hint: challenge.hint, cost_deducted: challenge.hint_cost });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlock hint' });
  }
};

// Participant: Submit Flag (Hit The Flag!)
export const submitFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const teamId = req.user!.team_id;
    const { challenge_id, flag } = req.body;

    if (!teamId) {
      res.status(403).json({ error: 'You must be in a team to submit flags!' });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ error: 'Team not found!' });
      return;
    }
    if (team.is_banned) {
      res.status(403).json({ error: 'Your team is disqualified from the competition.' });
      return;
    }

    // Check event freeze / timing rules
    const event = await prisma.event.findUnique({ where: { id: team.event_id } });
    if (event) {
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

    const challenge = await prisma.challenge.findFirst({
      where: { id: challenge_id, is_active: true }
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    // Chaining rule enforcement: check if previous challenge in this category was solved
    if (event?.is_chained) {
      const catChallenges = await prisma.challenge.findMany({
        where: { is_active: true, event_id: team.event_id, category: challenge.category },
        orderBy: [{ points: 'asc' }, { created_at: 'asc' }],
        select: { id: true, title: true }
      });

      const index = catChallenges.findIndex(c => c.id === challenge.id);
      if (index > 0) {
        const prevChal = catChallenges[index - 1];
        const prevSolved = await prisma.submission.findFirst({
          where: { team_id: teamId, challenge_id: prevChal.id, is_correct: true }
        });
        if (!prevSolved) {
          res.status(403).json({
            error: `🔒 Tantangan ini terkunci! Selesaikan tantangan "${prevChal.title}" dalam kategori ini terlebih dahulu.`
          });
          return;
        }
      }
    }

    // Check one solve per team
    const existingSolve = await prisma.submission.findFirst({
      where: { team_id: teamId, challenge_id: challenge.id, is_correct: true }
    });

    if (existingSolve) {
      res.status(400).json({ error: 'Your team has already solved this challenge!' });
      return;
    }

    // Validate SHA256 Hash
    const isCorrect = verifyFlag(flag, challenge.flag_hash);

    // Record submission log (both correct & wrong for rate limit audit & brute force detection)
    await prisma.submission.create({
      data: {
        team_id: teamId,
        user_id: userId,
        challenge_id: challenge.id,
        is_correct: isCorrect
      }
    });

    if (!isCorrect) {
      broadcastAttackResult(team!.event_id, {
        teamId: team!.id,
        teamName: team!.name,
        challengeId: challenge.id,
        success: false,
        isFirstBlood: false,
        pointsGained: 0,
        newTotalScore: team!.score,
        timestamp: new Date().toISOString()
      });
      res.status(400).json({ error: 'Incorrect flag! Keep trying!' });
      return;
    }

    // FLAG IS CORRECT!
    let awardedPoints = challenge.points;
    let isFirstBlood = false;

    // Check First Blood
    const existingFB = await prisma.firstBlood.findUnique({
      where: { challenge_id: challenge.id }
    });

    if (!existingFB) {
      isFirstBlood = true;
      const fbBonus = 50; // First blood bonus
      awardedPoints += fbBonus;

      await prisma.firstBlood.create({
        data: {
          challenge_id: challenge.id,
          team_id: teamId
        }
      });

      // Emit real-time alert for first blood
      broadcastFirstBlood(team!.event_id, {
        team_name: team!.name,
        challenge_title: challenge.title,
        points: awardedPoints
      });
    }

    // Add score to team
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { score: { increment: awardedPoints } }
    });

    try {
      await redis.del(`leaderboard:${team!.event_id}`);
      await redis.del(`chart:${team!.event_id}`);
    } catch (err) {}

    // Broadcast live scoreboard update & 3D attack result via WebSocket
    await broadcastScoreboardUpdate(team!.event_id);
    await broadcastScoreboardSync(team!.event_id);
    broadcastAttackResult(team!.event_id, {
      teamId: team!.id,
      teamName: team!.name,
      challengeId: challenge.id,
      success: true,
      isFirstBlood,
      pointsGained: awardedPoints,
      newTotalScore: updatedTeam.score,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: isFirstBlood 
        ? `🎉 FIRST BLOOD! Correct flag! Awarded ${awardedPoints} points (+50 FB bonus)!`
        : `🎉 Correct flag! Awarded ${awardedPoints} points to your team!`,
      points_awarded: awardedPoints,
      is_first_blood: isFirstBlood
    });
  } catch (err) {
    console.error('Submit flag error:', err);
    res.status(500).json({ error: 'Failed to process submission' });
  }
};

// ADMIN CRUD
export const createChallengeAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, points, flag, hint, hint_cost, file_url, is_active, event_id } = req.body;

    const trimmedFlag = (flag || '').trim();
    const flag_hash = hashFlag(trimmedFlag);

    const challenge = await prisma.challenge.create({
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
        is_active,
        event_id,
        created_by: req.user!.id
      }
    });

    res.status(201).json({ message: 'Challenge created successfully', challenge });
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

export const updateChallengeAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, category, points, flag, hint, hint_cost, file_url, is_active, event_id } = req.body;

    const updateData: any = { title, description, category, points, hint, hint_cost, file_url, is_active };
    if (event_id) {
      updateData.event_id = event_id;
    }
    if (flag !== undefined && flag !== null && flag.trim() !== '') {
      const trimmedFlag = flag.trim();
      updateData.flag = trimmedFlag;
      updateData.flag_hash = hashFlag(trimmedFlag);
    }

    const challenge = await prisma.challenge.update({
      where: { id },
      data: updateData
    });

    res.json({ message: 'Challenge updated successfully', challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update challenge' });
  }
};

export const deleteChallengeAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.challenge.delete({ where: { id } });
    res.json({ message: 'Challenge deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
};

export const getAllChallengesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        event: { select: { name: true } },
        _count: { select: { submissions: true } },
        first_blood: { include: { team: { select: { name: true } } } }
      }
    });
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin challenges' });
  }
};

// Admin: Import bulk challenges via JSON
export const importChallengesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challenges } = req.body; // Array of challenge objects
    if (!Array.isArray(challenges)) {
      res.status(400).json({ error: 'Expected an array of challenges in "challenges" field' });
      return;
    }

    const createdCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const c of challenges) {
        if (!c.title || !c.flag || !c.category || !c.event_id) continue;
        const trimmedFlag = String(c.flag).trim();
        await tx.challenge.create({
          data: {
            title: c.title,
            description: c.description || 'No description',
            category: c.category || 'MISC',
            points: Number(c.points) || 100,
            flag: trimmedFlag,
            flag_hash: hashFlag(trimmedFlag),
            hint: c.hint || null,
            hint_cost: Number(c.hint_cost) || 0,
            file_url: c.file_url || null,
            is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
            event_id: c.event_id,
            created_by: req.user!.id
          }
        });
        count++;
      }
      return count;
    });

    res.json({ message: `Successfully imported ${createdCount} challenges!` });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import challenges' });
  }
};
