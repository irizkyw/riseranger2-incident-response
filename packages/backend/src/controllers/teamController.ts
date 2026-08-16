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

    const event = await prisma.event.findUnique({ where: { id: eventId } });

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

    const teamEvent = member.team.event_id 
      ? await prisma.event.findUnique({ where: { id: member.team.event_id } }) 
      : null;

    if (teamEvent?.start_time && new Date() >= new Date(teamEvent.start_time)) {
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

    const teamEvent = member.team.event_id 
      ? await prisma.event.findUnique({ where: { id: member.team.event_id } }) 
      : null;

    if (teamEvent?.start_time && new Date() >= new Date(teamEvent.start_time)) {
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

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                created_at: true
              }
            }
          },
          orderBy: { joined_at: 'asc' }
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

    for (const log of historyLogs) {
      if (seenTeamNames.has(log.team_name)) {
        continue;
      }
      seenTeamNames.add(log.team_name);
      historyList.push({
        id: log.id,
        name: log.team_name,
        invite_code: log.invite_code || '—',
        color: log.color,
        score: log.score,
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
