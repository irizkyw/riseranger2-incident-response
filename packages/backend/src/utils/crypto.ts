import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Hash CTF flag using SHA256 (e.g. SHA256("CTF{my_secret_flag}"))
export const hashFlag = (flag: string): string => {
  return crypto.createHash('sha256').update(flag.trim()).digest('hex');
};

// Compare plain flag against stored hash
export const verifyFlag = (inputFlag: string, storedHash: string): boolean => {
  const inputHash = hashFlag(inputFlag);
  return crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(storedHash, 'hex'));
};

// Hash password with bcrypt
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password with bcrypt hash
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Generate random invite code for teams
export const generateInviteCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g., "8F3A2C1B"
};
