import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';
import redis, { cacheGet, cacheSet, cacheDel } from '../config/redis.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { logger } from '../utils/logger.ts';
import { broadcastLiveActivity, broadcastSessionControl } from '../sockets/scoreboardSocket.js';

const LOGS_DIR = path.resolve('logs');
const securityLogPath = path.join(LOGS_DIR, 'security.log');

export interface SecurityLogItem {
  id: string;
  timestamp: string;
  type: 'BRUTE_FORCE' | 'IP_CONFLICT' | 'SPEED_ANOMALY' | 'MULTI_LOGIN' | 'FLAG_COLLISION' | 'AUDIT' | 'AUTH_FAILURE';
  severity: 'CRITICAL' | 'WARNING' | 'SUSPICIOUS' | 'INFO';
  title: string;
  details: string;
  ip?: string;
  user_id?: string;
  username?: string;
  team_id?: string;
  team_name?: string;
  challenge_id?: string;
  challenge_title?: string;
  event_id?: string;
  metadata?: any;
}

export const getAntiCheatLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type = 'ALL', severity = 'ALL', search = '', limit = '100', page = '1' } = req.query;
    const parsedLimit = Math.min(200, Math.max(10, parseInt(String(limit), 10) || 50));
    const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);

    const generatedLogs: SecurityLogItem[] = [];

    // 1. Parse static file security logs (if file exists)
    const fileLogs: SecurityLogItem[] = [];
    if (fs.existsSync(securityLogPath)) {
      try {
        const fileContent = fs.readFileSync(securityLogPath, 'utf-8');
        const lines = fileContent.trim().split('\n').filter(Boolean);

        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].replace(/\r$/, '');
          const match = line.match(/^\[(.*?)\] \[SECURITY\] \[(.*?)\] (.*)$/);
          if (match) {
            const [, ts, eventTag, rawMessage] = match;
            let logType: SecurityLogItem['type'] = 'AUDIT';
            let logSeverity: SecurityLogItem['severity'] = 'INFO';

            if (eventTag.includes('MULTI_LOGIN') || eventTag.includes('SINGLE_LOGIN') || eventTag.includes('COLLISION')) {
              logType = 'MULTI_LOGIN';
              logSeverity = 'WARNING';
            } else if (eventTag.includes('FAILED') || eventTag.includes('CAPTCHA')) {
              logType = 'AUTH_FAILURE';
              logSeverity = 'SUSPICIOUS';
            } else if (eventTag.includes('BRUTE')) {
              logType = 'BRUTE_FORCE';
              logSeverity = 'CRITICAL';
            }

            // Extract trailing JSON metadata blob from the log line (if present)
            // Format: "Human readable details {\"ip\":\"...\",\"username\":\"...\"}"
            let details = rawMessage.trim();
            let parsedMeta: Record<string, any> = {};
            const jsonStartIdx = rawMessage.lastIndexOf('{');
            if (jsonStartIdx !== -1) {
              try {
                parsedMeta = JSON.parse(rawMessage.slice(jsonStartIdx));
                details = rawMessage.slice(0, jsonStartIdx).trim();
              } catch {
                // Not valid JSON suffix — keep details as-is
              }
            }

            // Fallback: extract @username and IP from the message text for legacy log lines
            if (!parsedMeta.username) {
              const usernameMatch = details.match(/@(\w+)/);
              if (usernameMatch) parsedMeta.username = usernameMatch[1];
            }
            if (!parsedMeta.ip) {
              const ipMatch = details.match(/IP\s+([\d.:a-fA-F]+)/);
              if (ipMatch) parsedMeta.ip = ipMatch[1];
            }

            fileLogs.push({
              id: `file-${i}-${Date.parse(ts) || i}`,
              timestamp: ts,
              type: logType,
              severity: logSeverity,
              title: eventTag.replace(/_/g, ' '),
              details: details || rawMessage,
              ip: parsedMeta.ip,
              user_id: parsedMeta.user_id,
              username: parsedMeta.username ? String(parsedMeta.username).replace(/^@/, '') : undefined,
              team_id: parsedMeta.team_id,
              team_name: parsedMeta.team_name,
              challenge_id: parsedMeta.challenge_id,
              challenge_title: parsedMeta.challenge_title,
              event_id: parsedMeta.event_id,
              metadata: Object.keys(parsedMeta).length > 0 ? parsedMeta : undefined
            });
          }
        }

        // Batch DB lookup: resolve user_id + team info for logs that have username but no user_id
        const usernamesNeedingLookup = [
          ...new Set(fileLogs.filter(l => l.username && !l.user_id).map(l => l.username!))
        ];
        if (usernamesNeedingLookup.length > 0) {
          const resolvedUsers = await prisma.user.findMany({
            where: { username: { in: usernamesNeedingLookup } },
            select: {
              id: true,
              username: true,
              team_member: {
                select: { team: { select: { id: true, name: true } } }
              }
            }
          });
          const userMap = new Map(resolvedUsers.map(u => [u.username, u]));
          for (const log of fileLogs) {
            if (log.username && !log.user_id) {
              const u = userMap.get(log.username);
              if (u) {
                log.user_id = u.id;
                if (!log.team_id && u.team_member?.team) {
                  log.team_id = u.team_member.team.id;
                  log.team_name = u.team_member.team.name;
                }
              }
            }
          }
        }

        generatedLogs.push(...fileLogs);
      } catch (err) {
        console.warn('Failed to parse security.log:', err);
      }
    }

    // 2. Real-Time DB Heuristic: Multi-Team IP Sharing (Collision)
    const activeUsersWithIp = await prisma.user.findMany({
      where: {
        last_ip: { not: null },
        team_member: { isNot: null }
      },
      select: {
        id: true,
        username: true,
        email: true,
        last_ip: true,
        last_login_at: true,
        event_id: true,
        team_member: {
          select: {
            team: { select: { id: true, name: true, is_banned: true } }
          }
        }
      }
    });

    const isPrivateOrLocalIP = (ipStr: string): boolean => {
      if (!ipStr) return true;
      const ip = ipStr.replace(/^::ffff:/, '').trim();
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '0.0.0.0') return true;
      if (ip.startsWith('10.')) return true;
      if (ip.startsWith('192.168.')) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
      return false;
    };

    const ipToTeamsMap = new Map<string, Array<{ userId: string; username: string; teamId: string; teamName: string }>>();
    for (const u of activeUsersWithIp) {
      if (!u.last_ip || !u.team_member?.team) continue;
      if (isPrivateOrLocalIP(u.last_ip)) continue; // Ignore local/LAN venue IP
      const list = ipToTeamsMap.get(u.last_ip) || [];
      list.push({
        userId: u.id,
        username: u.username,
        teamId: u.team_member.team.id,
        teamName: u.team_member.team.name
      });
      ipToTeamsMap.set(u.last_ip, list);
    }

    for (const [ip, entries] of ipToTeamsMap.entries()) {
      const distinctTeamIds = Array.from(new Set(entries.map((e) => e.teamId)));
      if (distinctTeamIds.length > 1) {
        const teamNames = Array.from(new Set(entries.map((e) => e.teamName))).join(' & ');
        const userNames = entries.map((e) => `@${e.username}`).join(', ');
        generatedLogs.push({
          id: `ip-conflict-${ip}`,
          timestamp: new Date().toISOString(),
          type: 'IP_CONFLICT',
          severity: 'WARNING',
          title: 'IP Collision Across Competing Squads (Public IP Sharing)',
          details: `Multiple different teams are sharing identical public IP (${ip}): ${teamNames} (Users: ${userNames})`,
          ip,
          team_id: entries[0].teamId,
          team_name: teamNames,
          metadata: { affectedUsers: entries }
        });
      }
    }

    // 3. Real-Time DB Heuristic: Flag Brute Force Rate (Frequent Incorrect Submissions)
    const recentFailedSubmissions = await prisma.submission.findMany({
      where: {
        is_correct: false,
        submitted_at: { gte: new Date(Date.now() - 1000 * 60 * 15) } // last 15 mins
      },
      orderBy: { submitted_at: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        team: { select: { id: true, name: true } },
        challenge: { select: { id: true, title: true, points: true } }
      }
    });

    const failCountMap = new Map<string, { count: number; user: any; team: any; challenge: any; latestAt: Date }>();
    for (const s of recentFailedSubmissions) {
      const key = `${s.team_id}-${s.challenge_id}`;
      const existing = failCountMap.get(key) || { count: 0, user: s.user, team: s.team, challenge: s.challenge, latestAt: s.submitted_at };
      existing.count += 1;
      if (s.submitted_at > existing.latestAt) existing.latestAt = s.submitted_at;
      failCountMap.set(key, existing);
    }

    for (const [key, item] of failCountMap.entries()) {
      if (item.count >= 3) {
        const isCritical = item.count >= 6;
        generatedLogs.push({
          id: `brute-${key}-${item.latestAt.getTime()}`,
          timestamp: item.latestAt.toISOString(),
          type: 'BRUTE_FORCE',
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          title: `Rapid Flag Guessing / Brute-Force Spike (${item.count} Wrong Attempts)`,
          details: `Team ${item.team?.name || 'Unknown'} submitted ${item.count} incorrect flags within 15 minutes on "${item.challenge?.title || 'Challenge'}".`,
          user_id: item.user?.id,
          username: item.user?.username,
          team_id: item.team?.id,
          team_name: item.team?.name,
          challenge_id: item.challenge?.id,
          challenge_title: item.challenge?.title,
          metadata: { attemptCount: item.count }
        });
      }
    }

    // 4. Real-Time DB Heuristic: Unusually Fast Solves (Speed Anomaly)
    const solvedAttempts = await (prisma as any).challengeAttempt.findMany({
      where: {
        status: 'SOLVED'
      },
      take: 50,
      orderBy: { solved_at: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        challenge: { select: { id: true, title: true, points: true } }
      }
    }).catch((e: any) => {
      console.warn('find solvedAttempts error:', e?.message);
      return [];
    });

    for (const att of (solvedAttempts || [])) {
      if (att.started_at && att.solved_at && att.challenge?.points >= 150) {
        const diffSeconds = (new Date(att.solved_at).getTime() - new Date(att.started_at).getTime()) / 1000;
        if (diffSeconds > 0 && diffSeconds < 25) {
          generatedLogs.push({
            id: `speed-${att.id}`,
            timestamp: new Date(att.solved_at).toISOString(),
            type: 'SPEED_ANOMALY',
            severity: 'WARNING',
            title: `Instant Solve Anomaly (${Math.round(diffSeconds)}s solve time)`,
            details: `Operative @${att.user?.username || 'User'} solved ${att.challenge?.points} PTS challenge "${att.challenge?.title}" in only ${Math.round(diffSeconds)} seconds from session start.`,
            user_id: att.user?.id,
            username: att.user?.username,
            challenge_id: att.challenge?.id,
            challenge_title: att.challenge?.title,
            metadata: { durationSeconds: diffSeconds, points: att.challenge?.points }
          });
        }
      }
    }

    // Sort all logs newest first
    generatedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Deduplicate duplicate log IDs
    const uniqueLogs: SecurityLogItem[] = [];
    const seenIds = new Set<string>();
    for (const log of generatedLogs) {
      if (!seenIds.has(log.id)) {
        seenIds.add(log.id);
        uniqueLogs.push(log);
      }
    }

    // Filtering
    let filtered = uniqueLogs;
    if (type !== 'ALL') {
      filtered = filtered.filter((l) => l.type === type);
    }
    if (severity !== 'ALL') {
      filtered = filtered.filter((l) => l.severity === severity);
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        (l.username && l.username.toLowerCase().includes(q)) ||
        (l.team_name && l.team_name.toLowerCase().includes(q)) ||
        (l.ip && l.ip.includes(q)) ||
        (l.challenge_title && l.challenge_title.toLowerCase().includes(q))
      );
    }

    // Calculate Summary Stats
    const totalTriggers = uniqueLogs.length;
    const criticalCount = uniqueLogs.filter((l) => l.severity === 'CRITICAL').length;
    const warningCount = uniqueLogs.filter((l) => l.severity === 'WARNING').length;
    const ipConflictCount = uniqueLogs.filter((l) => l.type === 'IP_CONFLICT').length;
    const bruteForceCount = uniqueLogs.filter((l) => l.type === 'BRUTE_FORCE').length;
    const speedAnomalyCount = uniqueLogs.filter((l) => l.type === 'SPEED_ANOMALY').length;
    const multiLoginCount = uniqueLogs.filter((l) => l.type === 'MULTI_LOGIN').length;

    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / parsedLimit) || 1;
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedItems = filtered.slice(startIndex, startIndex + parsedLimit);

    res.json({
      summary: {
        total_triggers: totalTriggers,
        critical_count: criticalCount,
        warning_count: warningCount,
        ip_conflict_count: ipConflictCount,
        brute_force_count: bruteForceCount,
        speed_anomaly_count: speedAnomalyCount,
        multi_login_count: multiLoginCount
      },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total_items: totalItems,
        total_pages: totalPages
      },
      logs: paginatedItems
    });
  } catch (err: any) {
    logger.error('AntiCheat', 'getAntiCheatLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch anti-cheat security logs', details: err.message });
  }
};

// One-Click Anti-Cheat Mitigation Action (Ban Team, Force Stop Attempt, Revoke Session)
export const takeAntiCheatAction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, team_id, user_id, challenge_id, reason } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Action parameter is required' });
      return;
    }

    const adminUsername = req.user?.username || 'Admin';

    if (action === 'BAN_TEAM') {
      if (!team_id) {
        res.status(400).json({ error: 'team_id is required to ban team' });
        return;
      }
      const team = await prisma.team.update({
        where: { id: team_id },
        data: { is_banned: true }
      });
      logger.audit(adminUsername, 'BAN_TEAM_ANTI_CHEAT', team.name, { reason });
      res.json({ message: `Tim "${team.name}" berhasil didiskualifikasi (Banned) dari kompetisi!` });
      return;
    }

    if (action === 'FORCE_STOP_USER') {
      if (!user_id) {
        res.status(400).json({ error: 'user_id is required' });
        return;
      }
      await (prisma as any).challengeAttempt.updateMany({
        where: { user_id, status: { in: ['IN_PROGRESS', 'IDLE', 'PAUSED'] } },
        data: { is_force_stopped: true, status: 'FORCE_STOPPED', last_active_at: new Date() }
      });
      logger.audit(adminUsername, 'FORCE_STOP_ALL_ATTEMPTS', user_id, { reason });
      res.json({ message: `Seluruh pengerjaan tantangan peserta berhasil dikunci (Force Stopped)!` });
      return;
    }

    if (action === 'REVOKE_USER_SESSION') {
      if (!user_id) {
        res.status(400).json({ error: 'user_id is required' });
        return;
      }
      await prisma.user.update({
        where: { id: user_id },
        data: { active_session_id: null } as any
      });
      await cacheDel(`active_session:${user_id}`);
      await cacheDel(`auth:me:${user_id}`);
      try {
        const { getIO } = await import('../sockets/scoreboardSocket.js');
        const io = getIO();
        io.to(`user_${user_id}`).emit('force_logout', {
          code: 'SESSION_REVOKED_BY_ADMIN',
          message: `Sesi login Anda revoked @${adminUsername}. Silakan login kembali.`,
          timestamp: new Date().toISOString()
        });
        io.emit('force_logout_user', {
          userId: user_id,
          code: 'SESSION_REVOKED_BY_ADMIN',
          message: `Sesi login Anda revoked @${adminUsername}. Silakan login kembali.`
        });
      } catch (socketErr) {
        console.warn('Socket force_logout emit error:', socketErr);
      }
      logger.audit(adminUsername, 'REVOKE_USER_SESSION', user_id, { reason });
      res.json({ message: `Sesi login peserta berhasil di-revoke. Peserta otomatis di-logout.` });
      return;
    }

    res.status(400).json({ error: `Unknown anti-cheat action: ${action}` });
  } catch (err: any) {
    logger.error('AntiCheat', 'takeAntiCheatAction error:', err);
    res.status(500).json({ error: 'Failed to execute anti-cheat action', details: err.message });
  }
};

// Clear / Rotate Security Log File
export const clearSecurityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (fs.existsSync(securityLogPath)) {
      fs.writeFileSync(securityLogPath, '', 'utf-8');
    }
    logger.audit(req.user?.username || 'Admin', 'CLEAR_SECURITY_LOGS', 'security.log');
    res.json({ message: 'Security log file berhasil di-reset / dibersihkan.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear security log file', details: err.message });
  }
};
