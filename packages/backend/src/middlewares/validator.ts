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
  username: z.string().min(3, 'Username must be at least 3 characters').max(25),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'PARTICIPANT']).optional().default('PARTICIPANT')
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
