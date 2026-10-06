/**
 * Định nghĩa hằng số các đường dẫn routing trong hệ thống ATS
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  UNAUTHORIZED: '/unauthorized',
  FORBIDDEN: '/403',
  UNAUTHENTICATED: '/401',
  FIRST_LOGIN_CHANGE_PASSWORD: '/first-login/change-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  ORGANIZATION: '/organization',
  JOB_TITLES: '/job-titles',
  CATEGORIES: '/categories',
  ADMIN_CATEGORIES: '/admin/categories',
  QUESTIONS: '/questions',
  USERS: '/users',
  IMPORT_EXCEL: '/users/import-excel',
  PREVIEW_IMPORT_EXCEL: '/preview/import-excel',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
