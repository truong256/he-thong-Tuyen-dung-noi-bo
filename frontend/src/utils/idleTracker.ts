/**
 * Idle Activity Tracker
 * Tracks user activity and enforces a 30-second idle timeout requirement.
 * 
 * Requirements:
 * - Minimum 30s idle threshold.
 * - Valid activities: mouse click, navigation, authenticated actions, user inputs.
 * - Does NOT abruptly kick the user at second 30 without action.
 * - On the next action after >30s idle:
 *   blocks the action, terminates the session, clears tokens, and redirects to /login.
 * - If user remains active (e.g. actions every 15-20s), the idle timer resets and user stays logged in.
 */

const configuredTimeout = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS);

export const DEFAULT_IDLE_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 5 * 60 * 1000; // 5 phút (300,000 ms)

const LAST_ACTIVITY_KEY = 'ats:last_activity_time';
const SESSION_EXPIRED_KEY = 'ats:session_expired';
const AUTH_NOTICE_KEY = 'ats:auth_notice';
const SESSION_EXPIRED_REASON_KEY = 'ats:session_expired_reason';

let customTimeoutMs: number | null = null;

/**
 * Configure a custom idle timeout (primarily used in automated test environments).
 */
export const setCustomIdleTimeout = (ms: number | null): void => {
  customTimeoutMs = ms;
};

/**
 * Get current idle timeout in milliseconds.
 */
export const getIdleTimeoutMs = (): number => {
  return customTimeoutMs !== null ? customTimeoutMs : DEFAULT_IDLE_TIMEOUT_MS;
};

/**
 * Retrieve the timestamp of the last recorded user activity.
 */
export const getLastActivityTime = (): number => {
  if (typeof window === 'undefined') return Date.now();
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!stored) {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    return now;
  }
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? Date.now() : parsed;
};

/**
 * Record a valid user activity (mouse click, navigation, typing, etc.)
 */
export const recordActivity = (): void => {
  if (typeof window === 'undefined') return;
  // Only record activity if the user has an active access token
  const token = localStorage.getItem('accessToken');
  if (token) {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }
};

/**
 * Check whether the user has been idle beyond the timeout duration.
 */
export const isIdleExpired = (timeoutMs: number = getIdleTimeoutMs()): boolean => {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  const lastActivity = getLastActivityTime();
  return Date.now() - lastActivity >= timeoutMs;
};

/**
 * Clear the activity tracker timestamp (e.g., upon logout).
 */
export const clearActivity = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

/**
 * Reset activity timer to current timestamp.
 */
export const resetActivity = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

export {
  LAST_ACTIVITY_KEY,
  SESSION_EXPIRED_KEY,
  AUTH_NOTICE_KEY,
  SESSION_EXPIRED_REASON_KEY,
};
