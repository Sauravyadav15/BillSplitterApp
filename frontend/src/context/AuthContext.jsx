// frontend/src/context/AuthContext.jsx

import { createContext, useContext, useState } from 'react';
import { login as loginApi, signup as signupApi } from '../api/auth';

const AuthContext = createContext(null);

function readStoredUser() {
  const raw = localStorage.getItem('billsplit_user');
  return raw ? JSON.parse(raw) : null;
}

function persist(token, user) {
  localStorage.setItem('billsplit_token', token);
  localStorage.setItem('billsplit_user', JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('billsplit_token'));
  const [user, setUser] = useState(readStoredUser);

  const login = async (email, password) => {
    const data = await loginApi({ email, password });
    persist(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await signupApi({ name, email, password });
    persist(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('billsplit_token');
    localStorage.removeItem('billsplit_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
