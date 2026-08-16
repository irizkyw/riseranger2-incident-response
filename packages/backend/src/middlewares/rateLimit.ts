import rateLimit from 'express-rate-limit';

// Helper to extract true client IP behind Cloudflare WAF & Nginx
const getClientIp = (req: any): string => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : String(cfIp).trim();
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) return Array.isArray(xRealIp) ? xRealIp[0] : String(xRealIp).trim();
  return req.ip || '127.0.0.1';
};

// Global API rate limiter (300 requests per 15 minutes per IP)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: getClientIp,
  message: { error: 'Terlalu banyak request dari IP ini, silakan coba beberapa saat lagi.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anti-bruteforce login & registration limiter (max 6 attempts per minute per IP)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6,
  keyGenerator: getClientIp,
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
  keyGenerator: getClientIp,
  message: { error: 'Rate limit exceeded: Terlalu banyak percobaan flag! Harap tunggu 1 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});
