import rateLimit from 'express-rate-limit';

// Global API rate limiter (200 requests per 15 minutes per IP)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Terlalu banyak request dari IP ini, silakan coba beberapa saat lagi.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anti-bruteforce login & registration limiter (max 6 attempts per minute per IP)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6,
  message: { 
    error: '⚠️ Terlalu banyak percobaan autentikasi dari IP Anda (Anti-Bruteforce Triggered). Silakan tunggu 1 menit sebelum mencoba kembali.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anti-bruteforce flag submission limiter (max 5 submission attempts per minute per IP/User)
export const flagSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Rate limit exceeded: Terlalu banyak percobaan flag! Harap tunggu 1 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});
