import { createContext, useContext } from 'react';
import type { Lecturer } from './types';
export interface Auth {
  lecturer?: Lecturer;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
export const AuthContext = createContext<Auth | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Thiếu AuthProvider');
  return context;
}
