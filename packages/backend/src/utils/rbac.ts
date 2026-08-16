import prisma from '../config/db.js';
import redis from '../config/redis.js';

export const getRolePermissions = async (roleName: string): Promise<string[]> => {
  if (!roleName) return [];
  const normalized = roleName.toUpperCase().trim();
  if (normalized === 'ADMIN' || normalized === 'SUPERADMIN' || normalized === 'HQ') {
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
  if (normalized === 'ADMIN' || normalized === 'SUPERADMIN') return true;
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
  if (['ADMIN', 'SUPERADMIN', 'JURY', 'MODERATOR', 'HQ'].includes(normalized)) {
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
