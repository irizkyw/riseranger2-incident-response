import rateLimit from 'express-rate-limit';

// Helper to extract true client IP behind Cloudflare WAF, Nginx, or Reverse Proxy
export const getClientIp = (req: any): string => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : String(cfIp).trim();
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : String(xForwardedFor).split(',')[0];
    return ips.trim();
  }
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) return Array.isArray(xRealIp) ? xRealIp[0] : String(xRealIp).trim();
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};

// Helper to detect private LAN / Venue Subnets
export const isPrivateLan = (ip: string): boolean => {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '');
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean.startsWith('192.168.') ||
    clean.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)
  );
};

// 🛡️ Global API rate limiter (Tournament NAT-Safe: 5,000 req/min for shared venue routers)
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5000, // High threshold allowing 100+ participants sharing 2 venue routers / hotspots
  keyGenerator: getClientIp,
  message: {
    error: 'Terlalu banyak permintaan (Rate Limit Exceeded). Harap kurangi kecepatan request Anda.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip static assets or internal health checks
    return req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/assets/');
  }
});

// 🔒 Anti-bruteforce login limiter (Per-Account Isolation: 15 attempts / min per username)
// 💡 Catatan: Menggunakan kombinasi IP + Target Username agar jika 1 peserta salah password di router bersama,
// peserta lain di router yang sama TIDAK ikut terblokir!
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  keyGenerator: (req) => {
    const targetAccount = req.body?.usernameOrEmail || req.body?.username || req.body?.email || '';
    const ip = getClientIp(req);
    return targetAccount ? `${ip}_${String(targetAccount).trim().toLowerCase()}` : ip;
  },
  message: {
    error: 'Terlalu banyak percobaan autentikasi pada akun ini. Silakan tunggu 1 menit sebelum mencoba kembali.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🚩 Anti-bruteforce flag submission limiter (Per-Team Isolation: 20 submission attempts / min per Team)
// 💡 Catatan: Diberikan kuota per Tim/User sehingga tim lain di router yang sama tidak terpengaruh!
export const flagSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: (req) => {
    const teamId = (req as any).user?.team_id || (req as any).user?.id || (req as any).user?.username;
    const ip = getClientIp(req);
    return teamId ? `team_${teamId}` : `ip_${ip}`;
  },
  message: {
    error: 'Rate limit submission tim tercapai: Terlalu banyak percobaan submit flag! Harap tunggu 1 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ⚡ SSH Event Webhook Limiter (Per-Team Isolation: max 300 events / min)
export const sshEventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: (req) => {
    const teamName = req.body?.team_name || (req as any).user?.team_id;
    const ip = getClientIp(req);
    return teamName ? `ssh_${teamName}` : `ssh_ip_${ip}`;
  },
  message: {
    error: 'SSH Event Rate Limit: Terlalu banyak event dalam waktu singkat.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
