import prisma from '../config/db.js';
import redis from '../config/redis.js';

export const getRolePermissions = async (roleName: string): Promise<string[]> => {
  if (!roleName) return [];
  const normalized = roleName.toUpperCase().trim();
  if (['ADMIN', 'SUPERADMIN', 'WADMIN', 'HQ'].includes(normalized)) {
    return ['*'];
  }

  const cacheKey = `rbac:role_perms:${normalized}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  try {
    const customRole = await (prisma as any).customRole.findUnique({
      where: { name: normalized }
    });
    const perms = Array.isArray(customRole?.permissions) ? customRole.permissions : [];
    await redis.set(cacheKey, JSON.stringify(perms), 'EX', 120).catch(() => {});
    return perms;
  } catch {
    return [];
  }
};

export const hasRolePermission = async (
  roleName: string,
  requiredPermission: string
): Promise<boolean> => {
  if (!roleName) return false;
  const normalized = roleName.toUpperCase().trim();
  if (['ADMIN', 'SUPERADMIN', 'WADMIN', 'HQ'].includes(normalized)) return true;
  if (normalized === 'PARTICIPANT') return false;

  const permissions = await getRolePermissions(roleName);
  if (permissions.includes('*')) return true;

  const reqLower = requiredPermission.toLowerCase();
  return permissions.some(
    (p: string) => p.toLowerCase() === reqLower || p.toLowerCase().includes(reqLower)
  );
};

export const checkIsAdminOrStaff = async (roleName: string): Promise<boolean> => {
  if (!roleName) return false;
  const normalized = roleName.toUpperCase().trim();
  if (['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'].includes(normalized)) {
    return true;
  }
  if (normalized === 'PARTICIPANT') return false;

  const permissions = await getRolePermissions(roleName);
  if (permissions.includes('*')) return true;
  return permissions.some((p: string) => {
    const pl = p.toLowerCase();
    return (
      pl.includes('admin') ||
      pl.includes('hq') ||
      pl.includes('challenge') ||
      pl.includes('solution') ||
      pl.includes('flag') ||
      pl.includes('moderation') ||
      pl.includes('viewer')
    );
  });
};

export const getRoleRank = (roleName: string): number => {
  if (!roleName) return 0;
  const normalized = roleName.toUpperCase().trim();
  switch (normalized) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'HQ':
      return 100;
    case 'WADMIN':
      return 80;
    case 'MODERATOR':
      return 50;
    case 'JURY':
      return 40;
    case 'PARTICIPANT':
      return 10;
    default:
      return 20; // Default rank for custom roles
  }
};

