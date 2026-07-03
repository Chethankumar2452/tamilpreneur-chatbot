// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gs_admin_token'));
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (token) {
      // Verify token
      fetch(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.admin) setAdmin(data.admin);
          else logout();
        })
        .catch(logout)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(username, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setToken(data.token);
    setAdmin(data.admin);
    localStorage.setItem('gs_admin_token', data.token);
    return data;
  }

  function logout() {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('gs_admin_token');
  }

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, loading, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
