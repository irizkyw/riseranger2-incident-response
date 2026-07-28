import rateLimit from 'express-rate-limit';

// Global API rate limiter (100 requests per 15 minutes per IP)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anti-bruteforce flag submission limiter (max 5 submission attempts per minute per IP/User)
export const flagSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Rate limit exceeded: Too many flag submission attempts! Please wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
