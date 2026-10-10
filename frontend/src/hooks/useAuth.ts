import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';

export type UseAuthReturn = AuthContextType;

export const useAuth = (): UseAuthReturn => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return {
    ...context,
    permissions: context.permissions ?? [],
    hasPermission: context.hasPermission ?? (() => false),
    hasAnyPermission: context.hasAnyPermission ?? (() => false),
  };
};

export default useAuth;
