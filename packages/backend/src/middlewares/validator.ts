import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
        return;
      }
      res.status(500).json({ error: 'Internal Server Error during validation' });
    }
  };
};

export const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').max(25),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'PARTICIPANT']).optional().default('PARTICIPANT'),
  captcha_id: z.string().min(1, 'Captcha ID wajib disertakan'),
  captcha_answer: z.string().min(1, 'Kode Captcha wajib diisi')
});


export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required')
});

export const createTeamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters').max(30)
});

export const joinTeamSchema = z.object({
  invite_code: z.string().min(4, 'Invite code is required')
});

export const challengeSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  category: z.enum(['WEB', 'CRYPTO', 'FORENSIC', 'PWN', 'MISC', 'REVERSE']),
  points: z.number().int().positive().default(100),
  flag: z.string().min(4, 'Flag is required (e.g., CTF{...})'),
  hint: z.string().optional(),
  hint_cost: z.number().int().nonnegative().default(0),
  file_url: z.string().optional(),
  is_active: z.boolean().default(true)
});

export const submitFlagSchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID'),
  flag: z.string().min(1, 'Flag is required')
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(25, 'Username maksimal 25 karakter')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh terdiri dari huruf, angka, titik, underscore (_), dan strip (-)')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .max(100, 'Email maksimal 100 karakter')
    .optional()
}).refine(data => Boolean(data.username || data.email), {
  message: 'Setidaknya username atau email harus diisi untuk pembaruan profil'
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi').max(100),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter').max(100, 'Password baru maksimal 100 karakter')
});


