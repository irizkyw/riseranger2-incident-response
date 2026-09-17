export interface StoredAuth {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
}

/**
 * Validates JWT token structure and expiration timestamp.
 */
export const isValidToken = (token: string | null): boolean => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false; // Token expired
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Retrieves the current authentication state from localStorage.
 */
export const getStoredAuth = (): StoredAuth => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  let user: any = null;

  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  }

  const isAuthenticated = Boolean(token && user && isValidToken(token));

  return {
    token,
    user,
    isAuthenticated,
  };
};

/**
 * Clears all authentication tokens from localStorage and removes all cached arena
 * challenges, events, and categories from sessionStorage to prevent unauthorized stale data flash.
 */
export const clearAuthSession = (reason?: string): void => {
  // Clear persistent tokens & profile
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('dashboard_event_id');

  // Clear runtime arena cache from sessionStorage
  sessionStorage.removeItem('arena_challenges');
  sessionStorage.removeItem('arena_categories');
  sessionStorage.removeItem('arena_team_info');
  sessionStorage.removeItem('arena_event_info');
  sessionStorage.removeItem('dashboard_all_events');
  sessionStorage.removeItem('dashboard_selected_event_id');

  if (reason) {
    sessionStorage.setItem('logout_reason', reason);
  }
};
