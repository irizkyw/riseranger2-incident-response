import fs from 'fs';
import path from 'path';

// Ensure log directory exists
const LOGS_DIR = path.resolve('logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file streams
const accessLogPath = path.join(LOGS_DIR, 'access.log');
const securityLogPath = path.join(LOGS_DIR, 'security.log');
const errorLogPath = path.join(LOGS_DIR, 'error.log');

const appendToFile = (filePath: string, message: string) => {
  try {
    fs.appendFileSync(filePath, message + '\n', 'utf-8');
  } catch (err) {
    console.error(`[Logger Error] Failed to write to ${filePath}:`, err);
  }
};

// ANSI Color Codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

const getTimestamp = (): string => {
  return new Date().toISOString();
};

export const logger = {
  info: (context: string, message: string, meta?: any) => {
    const ts = getTimestamp();
    const formatted = `${colors.gray}[${ts}]${colors.reset} ${colors.cyan}[INFO]${colors.reset} ${colors.bright}[${context}]${colors.reset} ${message}`;
    console.log(formatted, meta !== undefined ? meta : '');
    appendToFile(accessLogPath, `[${ts}] [INFO] [${context}] ${message} ${meta ? JSON.stringify(meta) : ''}`);
  },

  http: (method: string, url: string, status: number, durationMs: number, user?: string, ip?: string) => {
    const ts = getTimestamp();
    
    // Status color
    let statusColor = colors.green;
    if (status >= 400 && status < 500) statusColor = colors.yellow;
    if (status >= 500) statusColor = colors.red;

    const userInfo = user ? `${colors.magenta}(@${user})${colors.reset}` : `${colors.gray}(guest)${colors.reset}`;
    const ipInfo = ip ? `${colors.gray}[${ip}]${colors.reset}` : '';

    const formatted = `${colors.gray}[${ts}]${colors.reset} ${colors.blue}[HTTP]${colors.reset} ${colors.bright}${method.padEnd(6)}${colors.reset} ${url.padEnd(35)} ${statusColor}${status}${colors.reset} ${colors.dim}${durationMs.toFixed(1)}ms${colors.reset} ${userInfo} ${ipInfo}`;
    console.log(formatted);

    appendToFile(accessLogPath, `[${ts}] [HTTP] ${method} ${url} ${status} ${durationMs.toFixed(1)}ms user=${user || 'guest'} ip=${ip || '-'}`);
  },

  security: (event: string, details: string, meta?: any) => {
    const ts = getTimestamp();
    const formatted = `${colors.gray}[${ts}]${colors.reset} ${colors.bgRed}${colors.bright} [SECURITY] ${colors.reset} ${colors.yellow}[${event}]${colors.reset} ${details}`;
    console.warn(formatted, meta !== undefined ? meta : '');
    
    appendToFile(securityLogPath, `[${ts}] [SECURITY] [${event}] ${details} ${meta ? JSON.stringify(meta) : ''}`);

    // Auto-broadcast real-time security event via Socket.IO
    try {
      import('../sockets/scoreboardSocket.js').then(({ broadcastSecurityEvent }) => {
        if (broadcastSecurityEvent) {
          let logType = 'AUDIT';
          let logSeverity = 'INFO';
          if (event.includes('MULTI_LOGIN') || event.includes('SINGLE_LOGIN') || event.includes('COLLISION')) {
            logType = 'MULTI_LOGIN';
            logSeverity = 'CRITICAL';
          } else if (event.includes('FAILED') || event.includes('CAPTCHA')) {
            logType = 'AUTH_FAILURE';
            logSeverity = 'SUSPICIOUS';
          } else if (event.includes('BRUTE')) {
            logType = 'BRUTE_FORCE';
            logSeverity = 'CRITICAL';
          }

          broadcastSecurityEvent({
            id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: ts,
            type: logType,
            severity: logSeverity,
            title: event.replace(/_/g, ' '),
            details: details,
            ip: meta?.ip,
            username: meta?.username,
            user_id: meta?.user_id,
            team_name: meta?.team_name,
            metadata: meta
          });
        }
      }).catch(() => {});
    } catch {}
  },

  warn: (context: string, message: string, meta?: any) => {
    const ts = getTimestamp();
    const formatted = `${colors.gray}[${ts}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${colors.bright}[${context}]${colors.reset} ${message}`;
    console.warn(formatted, meta !== undefined ? meta : '');
    
    appendToFile(accessLogPath, `[${ts}] [WARN] [${context}] ${message} ${meta ? JSON.stringify(meta) : ''}`);
  },

  error: (context: string, message: string, error?: any) => {
    const ts = getTimestamp();
    const formatted = `${colors.gray}[${ts}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${colors.bright}[${context}]${colors.reset} ${message}`;
    console.error(formatted, error !== undefined ? error : '');
    
    appendToFile(errorLogPath, `[${ts}] [ERROR] [${context}] ${message} ${error?.stack || error || ''}`);
  },

  audit: (actor: string, action: string, target: string, meta?: any) => {
    const ts = getTimestamp();
    const formatted = `${colors.gray}[${ts}]${colors.reset} ${colors.magenta}[AUDIT]${colors.reset} ${colors.bright}@${actor}${colors.reset} -> ${colors.green}${action}${colors.reset} on ${colors.cyan}${target}${colors.reset}`;
    console.log(formatted, meta !== undefined ? meta : '');
    
    appendToFile(securityLogPath, `[${ts}] [AUDIT] @${actor} -> ${action} on ${target} ${meta ? JSON.stringify(meta) : ''}`);

    try {
      import('../sockets/scoreboardSocket.js').then(({ broadcastSecurityEvent }) => {
        if (broadcastSecurityEvent) {
          broadcastSecurityEvent({
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: ts,
            type: 'AUDIT',
            severity: 'INFO',
            title: `Audit: ${action.replace(/_/g, ' ')}`,
            details: `@${actor} -> ${action} on ${target}`,
            username: actor,
            metadata: meta
          });
        }
      }).catch(() => {});
    } catch {}
  },

  ctf: (event: 'FLAG_HIT' | 'FLAG_MISS' | 'FIRST_BLOOD' | 'HINT_UNLOCKED', team: string, challenge: string, points?: number) => {
    const ts = getTimestamp();
    let badge = colors.green;
    if (event === 'FLAG_MISS') badge = colors.red;
    if (event === 'FIRST_BLOOD') badge = colors.bgGreen;
    if (event === 'HINT_UNLOCKED') badge = colors.yellow;

    const formatted = `${colors.gray}[${ts}]${colors.reset} ${badge}[${event}]${colors.reset} Team: ${colors.bright}${team}${colors.reset} | Challenge: ${colors.cyan}${challenge}${colors.reset} ${points !== undefined ? `(${points > 0 ? '+' : ''}${points} PTS)` : ''}`;
    console.log(formatted);

    appendToFile(accessLogPath, `[${ts}] [CTF:${event}] Team="${team}" Challenge="${challenge}" points=${points || 0}`);
  }
};
