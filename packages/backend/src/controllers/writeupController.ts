import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';
import redis from '../config/redis.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { broadcastScoreboardUpdate, broadcastScoreboardSync } from '../sockets/scoreboardSocket.ts';


// Participant: Get current team's writeup for active event
export const getMyWriteup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const eventId = req.user!.event_id;
    const teamId = req.user!.team_id;

    if (!eventId) {
      res.status(403).json({ error: 'Akses ditolak: Anda belum menukarkan (Redeem) Access Token untuk arena ini.', require_token: true });
      return;
    }

    if (!teamId) {
      res.status(403).json({ error: 'Anda harus memiliki Tim / Squad untuk mengunggah dokumen Writeup.', require_team: true });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, start_time: true, end_time: true, is_active: true, is_paused: true, is_finished: true }
    });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        score: true,
        writeup_score: true,
        color: true,
        _count: {
          select: { submissions: { where: { is_correct: true } } }
        }
      }
    });

    const writeup = await prisma.writeup.findUnique({
      where: {
        team_id_event_id: {
          team_id: teamId,
          event_id: eventId
        }
      },
      include: {
        team: { select: { id: true, name: true, color: true, score: true, writeup_score: true } },
        user: { select: { id: true, username: true } }
      }
    });

    res.json({
      event,
      team,
      writeup
    });

  } catch (err) {
    console.error('Get my writeup error:', err);
    res.status(500).json({ error: 'Failed to fetch writeup status' });
  }
};

// Participant / Admin: Upload or Replace Writeup File
export const uploadWriteup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const userEventId = req.user!.event_id;
    const userTeamId = req.user!.team_id;
    const file = req.file;
    const { notes, team_id, event_id } = req.body;

    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'].includes((role || '').toUpperCase());

    let targetTeamId = userTeamId;
    let targetEventId = userEventId;

    if (isStaff && team_id) {
      const specifiedTeam = await prisma.team.findUnique({
        where: { id: team_id },
        select: { id: true, name: true, event_id: true }
      });
      if (!specifiedTeam) {
        res.status(404).json({ error: 'Tim yang dipilih tidak ditemukan.' });
        return;
      }
      targetTeamId = specifiedTeam.id;
      targetEventId = specifiedTeam.event_id || event_id || userEventId;
    } else if (isStaff && event_id && !targetEventId) {
      targetEventId = event_id;
    }

    if (!targetTeamId) {
      res.status(403).json({ error: 'Anda harus memilih / bergabung ke Tim (Squad) untuk mengunggah dokumen Writeup.', require_team: true });
      return;
    }

    if (!targetEventId) {
      res.status(403).json({ error: 'Akses ditolak: Event arena tidak valid.', require_token: true });
      return;
    }

    // Verify event status (locked when finished or paused for participants)
    const event = await prisma.event.findUnique({
      where: { id: targetEventId },
      select: { id: true, name: true, start_time: true, end_time: true, is_active: true, is_paused: true, is_finished: true }
    });

    if (!event || (!event.is_active && !isStaff)) {
      res.status(403).json({ error: 'Arena event sedang tidak aktif.' });
      return;
    }

    if (!isStaff && event.is_paused) {
      res.status(403).json({ error: 'Kompetisi arena sedang dijeda (Paused). Pengunggahan laporan writeup dibekukan sementara.' });
      return;
    }

    const now = new Date();
    const isFinished = event.is_finished || (event.end_time && new Date(event.end_time) < now);
    if (!isStaff && isFinished) {
      res.status(403).json({
        error: '🔒 Kompetisi arena telah berakhir secara resmi. Pengiriman dan perubahan laporan writeup telah dikunci.',
        is_finished: true
      });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'File writeup/laporan wajib diunggah (.pdf, .zip, .docx, .rar, .md).' });
      return;
    }

    // Check existing writeup to remove old physical file if replaced
    const existing = await prisma.writeup.findUnique({
      where: {
        team_id_event_id: {
          team_id: targetTeamId,
          event_id: targetEventId
        }
      }
    });

    if (existing && existing.file_url) {
      const oldFilePath = path.resolve(existing.file_url);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (e) {
          console.warn('Failed to delete previous writeup file:', e);
        }
      }
    }

    let fileBase64: string | null = null;
    if (file.path && fs.existsSync(file.path)) {
      try {
        fileBase64 = fs.readFileSync(file.path).toString('base64');
      } catch (e) {
        console.warn('Failed to read file buffer for database storage:', e);
      }
    }

    const savedWriteup = await prisma.writeup.upsert({
      where: {
        team_id_event_id: {
          team_id: targetTeamId,
          event_id: targetEventId
        }
      },
      create: {
        team_id: targetTeamId,
        user_id: userId,
        event_id: targetEventId,
        file_url: file.path,
        file_name: file.originalname,
        file_size: file.size,
        file_data: fileBase64,
        notes: notes || null
      },
      update: {
        user_id: userId,
        file_url: file.path,
        file_name: file.originalname,
        file_size: file.size,
        file_data: fileBase64 || undefined,
        notes: notes || undefined,
        submitted_at: new Date()
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, username: true } }
      }
    });

    res.status(201).json({
      message: 'Dokumen writeup berhasil diunggah!',
      writeup: savedWriteup
    });
  } catch (err) {
    console.error('Upload writeup error:', err);
    res.status(500).json({ error: 'Gagal mengunggah file writeup.' });
  }
};

export const getWriteupUploadDir = (): string => {
  const custom = process.env.UPLOAD_DIR;
  const targetDir = custom
    ? path.resolve(custom, 'writeups')
    : path.resolve('uploads/writeups');

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      console.warn('Failed to ensure writeup upload dir:', e);
    }
  }
  return targetDir;
};

export const resolveWriteupFile = (fileUrl: string): string | null => {
  if (!fileUrl) return null;
  const fileName = path.basename(fileUrl);
  const currentUploadDir = getWriteupUploadDir();

  const candidatePaths = [
    path.resolve(fileUrl),
    path.resolve(currentUploadDir, fileName),
    path.resolve('uploads/writeups', fileName),
    path.resolve(process.cwd(), 'uploads/writeups', fileName),
    path.resolve('/app/uploads/writeups', fileName),
    path.resolve('/app/packages/backend/uploads/writeups', fileName),
    path.resolve('uploads', fileName),
    path.resolve('/app/uploads', fileName)
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {}
  }

  return null;
};

// Participant / Admin: Download Writeup File
export const downloadWriteup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = req.user!.role;
    const teamId = req.user!.team_id;

    const writeup = await prisma.writeup.findUnique({
      where: { id },
      include: { team: true }
    });

    if (!writeup) {
      res.status(404).json({ error: 'File writeup tidak ditemukan.' });
      return;
    }

    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes((role || '').toUpperCase());

    // Permission check: only staff or team member can download
    if (!isStaff && writeup.team_id !== teamId) {
      res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin mengunduh file ini.' });
      return;
    }

    let filePath = resolveWriteupFile(writeup.file_url);

    // Auto-recover from DB if physical file is missing from container disk
    if ((!filePath || !fs.existsSync(filePath)) && writeup.file_data) {
      try {
        const uploadDir = getWriteupUploadDir();
        const recoveredPath = path.resolve(uploadDir, path.basename(writeup.file_url || writeup.file_name));
        const fileBuffer = Buffer.from(writeup.file_data, 'base64');
        fs.writeFileSync(recoveredPath, fileBuffer);
        filePath = recoveredPath;
      } catch (err) {
        console.warn('Failed to recover writeup file to disk:', err);
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      res.download(filePath, writeup.file_name);
      return;
    }

    // Direct buffer response fallback if disk write failed
    if (writeup.file_data) {
      const fileBuffer = Buffer.from(writeup.file_data, 'base64');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(writeup.file_name)}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.end(fileBuffer);
      return;
    }

    res.status(404).json({
      error: 'File fisik tidak ditemukan di server storage dan tidak tersimpan di database backup.',
      filename: writeup.file_name,
      stored_path: writeup.file_url
    });
  } catch (err) {
    console.error('Download writeup error:', err);
    res.status(500).json({ error: 'Failed to download writeup' });
  }
};

// Participant / Admin: Stream/View Writeup File Inline for Document Viewer
export const viewWriteupInline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = req.user!.role;
    const teamId = req.user!.team_id;

    const writeup = await prisma.writeup.findUnique({
      where: { id },
      include: { team: true }
    });

    if (!writeup) {
      res.status(404).json({ error: 'File writeup tidak ditemukan.' });
      return;
    }

    const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes((role || '').toUpperCase());

    if (!isStaff && writeup.team_id !== teamId) {
      res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin melihat file ini.' });
      return;
    }

    let filePath = resolveWriteupFile(writeup.file_url);

    // Auto-recover from DB if physical file is missing from container disk
    if ((!filePath || !fs.existsSync(filePath)) && writeup.file_data) {
      try {
        const uploadDir = getWriteupUploadDir();
        const recoveredPath = path.resolve(uploadDir, path.basename(writeup.file_url || writeup.file_name));
        const fileBuffer = Buffer.from(writeup.file_data, 'base64');
        fs.writeFileSync(recoveredPath, fileBuffer);
        filePath = recoveredPath;
      } catch (err) {
        console.warn('Failed to recover writeup file to disk:', err);
      }
    }

    const ext = path.extname(writeup.file_name || '').toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.md' || ext === '.txt') mimeType = 'text/plain; charset=utf-8';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.html') mimeType = 'text/html; charset=utf-8';
    else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (filePath && fs.existsSync(filePath)) {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(writeup.file_name)}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      return;
    }

    // Direct buffer response fallback if disk write failed
    if (writeup.file_data) {
      const fileBuffer = Buffer.from(writeup.file_data, 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(writeup.file_name)}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(fileBuffer);
      return;
    }

    res.status(404).json({
      error: 'File fisik tidak ditemukan di server storage dan tidak tersimpan di database backup.',
      filename: writeup.file_name,
      stored_path: writeup.file_url
    });
  } catch (err) {
    console.error('View writeup error:', err);
    res.status(500).json({ error: 'Failed to view writeup file' });
  }
};

// Admin / Juri: Get all submitted writeups with event filter
export const getAllWriteupsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { event_id } = req.query;

    const writeups = await prisma.writeup.findMany({
      where: {
        ...(event_id && typeof event_id === 'string' ? { event_id } : {})
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            score: true,
            writeup_score: true,
            color: true,
            members: {
              include: { user: { select: { id: true, username: true, email: true } } }
            },
            _count: {
              select: { submissions: { where: { is_correct: true } } }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            _count: {
              select: { submissions: { where: { is_correct: true } } }
            }
          }
        },
        event: {
          select: { id: true, name: true }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json(writeups);

  } catch (err) {
    console.error('Get all writeups error:', err);
    res.status(500).json({ error: 'Failed to fetch writeup submissions' });
  }
};

// Admin / Juri: Evaluate & Assign Score/Feedback to Team Writeup
export const evaluateWriteupAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const adminUsername = req.user!.username;

    const numScore = Math.max(0, Number(score) || 0);

    const writeup = await prisma.writeup.findUnique({
      where: { id },
      include: { team: true }
    });

    if (!writeup) {
      res.status(404).json({ error: 'Writeup not found' });
      return;
    }

    const previousScore = writeup.score || 0;
    const scoreDiff = numScore - previousScore;

    // Transaction to update writeup grade & recalculate team score
    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.writeup.update({
        where: { id },
        data: {
          score: numScore,
          feedback: feedback !== undefined ? String(feedback) : undefined,
          evaluated_by: adminUsername,
          evaluated_at: new Date()
        }
      });

      // Update Team's writeup_score and total score
      await tx.team.update({
        where: { id: writeup.team_id },
        data: {
          writeup_score: numScore,
          score: { increment: scoreDiff }
        }
      });

      return w;
    });

    // Invalidate Redis scoreboard cache so fresh DB data is calculated
    try {
      await redis.del(`leaderboard:${writeup.event_id}`);
    } catch (redisErr) {
      console.warn('[Redis] Leaderboard cache invalidation warning:', redisErr);
    }

    // Realtime scoreboard broadcast to 2D table and 3D space arena
    await broadcastScoreboardUpdate(writeup.event_id);
    await broadcastScoreboardSync(writeup.event_id);

    res.json({

      message: `Penilaian Writeup berhasil disimpan (+${numScore} poin)!`,
      writeup: updated
    });
  } catch (err) {
    console.error('Evaluate writeup error:', err);
    res.status(500).json({ error: 'Gagal menyimpan penilaian writeup.' });
  }
};
