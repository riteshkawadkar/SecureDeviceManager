import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LoginResponse } from '../types/auth';
import type { User } from '../types/user';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (response: LoginResponse) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  const raw = localStorage.getItem('sdm_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('sdm_token'));
  const [user, setUser] = useState<User | null>(readStoredUser());

  function login(response: LoginResponse) {
    localStorage.setItem('sdm_token', response.token);
    localStorage.setItem('sdm_user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  }

  function logout() {
    localStorage.removeItem('sdm_token');
    localStorage.removeItem('sdm_user');
    setToken(null);
    setUser(null);
  }

  function hasRole(...roles: string[]) {
    return !!user && roles.includes(user.roleName);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
