import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { generateInviteCode } from '../utils/crypto.js';
import { broadcastScoreboardUpdate, broadcastScoreboardSync } from '../sockets/scoreboardSocket.ts';

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
      } else {
        // Disband team if last member leaves
        await prisma.team.delete({ where: { id: member.team_id } });
        await broadcastScoreboardUpdate(member.team.event_id);
        await broadcastScoreboardSync(member.team.event_id);
        res.json({ message: 'Left team. Team disbanded as you were the last member.' });
        return;
      }
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

    if (targetUserId === leaderId) {
      res.status(400).json({ error: 'You cannot kick yourself. Use leave team instead.' });
      return;
    }

    const targetMember = await prisma.teamMember.findFirst({
      where: { team_id: member.team_id, user_id: targetUserId }
    });

    if (!targetMember) {
      res.status(404).json({ error: 'Target user is not a member of your team.' });
      return;
    }

    await prisma.teamMember.delete({ where: { id: targetMember.id } });
    await broadcastScoreboardUpdate(member.team.event_id);
    await broadcastScoreboardSync(member.team.event_id);
    res.json({ message: 'Member kicked successfully.' });
  } catch (err) {
    console.error('Kick member error:', err);
    res.status(500).json({ error: 'Failed to kick member' });
  }
};

export const getTeamDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, email: true, role: true } }
          }
        },
        submissions: {
          where: { is_correct: true },
          include: { challenge: { select: { title: true, category: true, points: true } } },
          orderBy: { submitted_at: 'desc' }
        },
        first_bloods: {
          include: { challenge: { select: { title: true } } }
        }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Calculate rank
    const teamsWithHigherScore = await prisma.team.count({
      where: {
        is_banned: false,
        score: { gt: team.score }
      }
    });

    res.json({
      ...team,
      rank: teamsWithHigherScore + 1
    });
  } catch (err) {
    console.error('Get team details error:', err);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
};
