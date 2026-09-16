import rateLimit from 'express-rate-limit';

// Helper to extract true client IP behind Cloudflare WAF, Nginx, or Reverse Proxy
export const getClientIp = (req: any): string => {
  try {
    const cfIp = req.headers?.['cf-connecting-ip'];
    if (cfIp) return Array.isArray(cfIp) ? String(cfIp[0]).trim() : String(cfIp).trim();
    const xForwardedFor = req.headers?.['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : String(xForwardedFor).split(',')[0];
      return String(ips).trim();
    }
    const xRealIp = req.headers?.['x-real-ip'];
    if (xRealIp) return Array.isArray(xRealIp) ? String(xRealIp[0]).trim() : String(xRealIp).trim();
    return req.ip || req.connection?.remoteAddress || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
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
  keyGenerator: (req) => getClientIp(req),
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

// 🌐 IP-level Anti-Bruteforce Login Limiter (Max 30 login attempts / min per IP)
// Stops credential stuffing, username enumeration, and rapid dictionary attacks
export const authIpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => getClientIp(req),
  message: {
    error: 'Terlalu banyak percobaan login dari alamat IP ini. Harap tunggu 1 menit sebelum mencoba kembali.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to generate account-isolated rate limit key
export const getAuthLimiterKey = (req: any): string => {
  try {
    const rawTarget = req.body?.usernameOrEmail ?? req.body?.username ?? req.body?.email;
    // Strictly ensure targetAccount is a string to prevent JavaScriptCore 'TypeError: No default value'
    const targetAccount = typeof rawTarget === 'string' ? rawTarget.trim().toLowerCase().slice(0, 100) : '';
    const ip = getClientIp(req);
    return targetAccount ? `${ip}_${targetAccount}` : ip;
  } catch {
    return getClientIp(req);
  }
};

// 🔒 Account-level Anti-Bruteforce login limiter (Per-Account Isolation: 10 attempts / min per username)
// 💡 Catatan: Menggunakan kombinasi IP + Target Username agar jika 1 peserta salah password di router bersama,
// peserta lain di router yang sama TIDAK ikut terblokir!
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: getAuthLimiterKey,
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
    try {
      const teamId = (req as any).user?.team_id || (req as any).user?.id || (req as any).user?.username;
      const ip = getClientIp(req);
      return teamId ? `team_${String(teamId)}` : `ip_${ip}`;
    } catch {
      return getClientIp(req);
    }
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
    try {
      const teamName = typeof req.body?.team_name === 'string' ? req.body.team_name : (req as any).user?.team_id;
      const ip = getClientIp(req);
      return teamName ? `ssh_${String(teamName)}` : `ssh_ip_${ip}`;
    } catch {
      return getClientIp(req);
    }
  },
  message: {
    error: 'SSH Event Rate Limit: Terlalu banyak event dalam waktu singkat.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

