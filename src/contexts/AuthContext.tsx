import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  isInitialized: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const validateToken = useCallback((token: string): boolean => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp ? decoded.exp > currentTime : false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      if (validateToken(token)) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } else {
        // Token is expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    }
    setIsInitialized(true);
  }, [validateToken]);

  const login = useCallback((token: string, userData: any) => {
    if (validateToken(token)) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
    } else {
      console.error('Invalid or expired token');
      logout();
    }
  }, [validateToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({
    isAuthenticated,
    user,
    isInitialized,
    login,
    logout,
  }), [isAuthenticated, user, isInitialized, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 