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
      select: { id: true, name: true, start_time: true, end_time: true, is_active: true }
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

// Participant: Upload or Replace Writeup File
export const uploadWriteup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const eventId = req.user!.event_id;
    const teamId = req.user!.team_id;
    const file = req.file;
    const { notes } = req.body;

    if (!eventId) {
      res.status(403).json({ error: 'Akses ditolak: Anda belum menukarkan (Redeem) Access Token untuk arena ini.', require_token: true });
      return;
    }

    if (!teamId) {
      res.status(403).json({ error: 'Anda harus memiliki Tim / Squad untuk mengunggah dokumen Writeup.' });
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
          team_id: teamId,
          event_id: eventId
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

    const savedWriteup = await prisma.writeup.upsert({
      where: {
        team_id_event_id: {
          team_id: teamId,
          event_id: eventId
        }
      },
      create: {
        team_id: teamId,
        user_id: userId,
        event_id: eventId,
        file_url: file.path,
        file_name: file.originalname,
        file_size: file.size,
        notes: notes || null
      },

      update: {
        user_id: userId,
        file_url: file.path,
        file_name: file.originalname,
        file_size: file.size,
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

    const uploadBaseDir = path.resolve('uploads/writeups');
    const filePath = path.resolve(writeup.file_url);
    if (!filePath.startsWith(uploadBaseDir) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File fisik tidak ditemukan di server storage.' });
      return;
    }

    res.download(filePath, writeup.file_name);
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

    const uploadBaseDir = path.resolve('uploads/writeups');
    const filePath = path.resolve(writeup.file_url);
    if (!filePath.startsWith(uploadBaseDir) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File fisik tidak ditemukan di server storage.' });
      return;
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

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(writeup.file_name)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
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
