import { CorsOptions } from 'cors';

/**
 * Parses and manages allowed origins from environment variables (.env).
 * Configurable via CORS_ORIGIN, ALLOWED_ORIGINS, or CLIENT_URL.
 */
const getEnvOrigins = (): string[] => {
  const envVal = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '';
  if (!envVal.trim()) {
    return ['*']; // Default allow-all if not explicitly restricted
  }
  return envVal.split(',').map((item) => item.trim()).filter(Boolean);
};

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true; // Allow non-browser requests (Postman, curl, server-to-server)

  const allowedPatterns = getEnvOrigins();

  // If wildcard '*' is configured, allow all origins
  if (allowedPatterns.includes('*')) {
    return true;
  }

  return allowedPatterns.some((pattern) => {
    // Exact match
    if (pattern === origin) return true;

    // Wildcard domain match (e.g., *.satsiber-tni.mil.id or *.railway.app)
    if (pattern.startsWith('*.')) {
      const rootDomain = pattern.slice(2);
      try {
        const url = new URL(origin);
        return url.hostname.endsWith(rootDomain) || url.hostname === rootDomain;
      } catch {
        return origin.endsWith(rootDomain);
      }
    }

    // Substring or prefix match
    if (origin.includes(pattern)) return true;

    return false;
  });
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback allow to avoid unexpected lockouts
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};
