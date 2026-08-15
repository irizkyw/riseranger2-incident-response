import crypto from 'crypto';
import redis from '../config/redis.js';

// In-memory dual-layer store ensuring zero-failure even if Redis is slow/unavailable
const localCaptchaStore = new Map<string, { answer: string; expiresAt: number }>();

// Periodic cleanup of local store every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of localCaptchaStore.entries()) {
    if (data.expiresAt < now) {
      localCaptchaStore.delete(id);
    }
  }
}, 60000);

export interface CaptchaResult {
  id: string;
  svg: string;
  expiresInSeconds: number;
}

export const generateCaptcha = async (): Promise<CaptchaResult> => {
  const id = crypto.randomUUID();
  
  // Clear, unambiguous character set (no 0/O, 1/I/L)
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  const answer = code.toUpperCase();

  // Generate crisp, clean Cyber SVG
  const width = 160;
  const height = 48;
  
  // Background noise lines (subtle, non-obstructive)
  let lines = '';
  for (let i = 0; i < 3; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const stroke = i === 0 ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 0, 127, 0.2)';
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.5" />`;
  }

  // Render each character with high readability
  const charSpacing = width / 5;
  let textElements = '';
  const colors = ['#00F0FF', '#38BDF8', '#00FF66', '#FACC15'];
  
  for (let i = 0; i < 4; i++) {
    const char = code[i];
    const x = charSpacing * (i + 1);
    const y = 32;
    const rot = (Math.random() * 12 - 6).toFixed(1); // subtle rotation for readability
    const color = colors[i % colors.length];
    textElements += `<text x="${x}" y="${y}" fill="${color}" font-family="'Outfit', monospace, sans-serif" font-size="24" font-weight="900" transform="rotate(${rot} ${x} ${y})" text-anchor="middle" letter-spacing="4">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#090d16; border-radius:6px; user-select:none;">
    <rect width="100%" height="100%" fill="#0a0f1d" rx="6" stroke="#1e293b" stroke-width="1" />
    ${lines}
    ${textElements}
  </svg>`;

  const TTL_SECONDS = 300; // 5 minutes

  // Dual save to both local memory and Redis
  localCaptchaStore.set(id, { answer, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  try {
    await redis.set(`captcha:${id}`, answer, 'EX', TTL_SECONDS);
  } catch (err) {}

  return {
    id,
    svg,
    expiresInSeconds: TTL_SECONDS
  };
};

export const verifyCaptcha = async (id?: string, userInput?: string): Promise<boolean> => {
  if (!id || !userInput) return false;

  const inputClean = userInput.trim().toUpperCase().replace(/\s+/g, '');
  let expectedAnswer: string | null = null;

  // 1. Check local in-memory store
  const local = localCaptchaStore.get(id);
  if (local && local.expiresAt > Date.now()) {
    expectedAnswer = local.answer;
    localCaptchaStore.delete(id); // Single-use consumption
  }

  // 2. Fallback to Redis
  if (!expectedAnswer) {
    try {
      expectedAnswer = await redis.get(`captcha:${id}`);
      if (expectedAnswer) {
        await redis.del(`captcha:${id}`);
      }
    } catch (err) {}
  }

  if (!expectedAnswer) return false;

  const expectedClean = expectedAnswer.trim().toUpperCase().replace(/\s+/g, '');
  return inputClean === expectedClean;
};
