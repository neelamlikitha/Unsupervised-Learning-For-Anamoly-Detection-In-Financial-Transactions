import React, { createContext, useContext, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const raw = window.localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = (newToken, newUser, newRefreshToken) => {
    setToken(newToken);
    setUser(newUser);
    window.localStorage.setItem('token', newToken);
    window.localStorage.setItem('user', JSON.stringify(newUser));
    if (newRefreshToken) window.localStorage.setItem('refreshToken', newRefreshToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('refreshToken');
  };

  const value = useMemo(
    () => ({ token, user, login, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function PrivateRoute({ children, roles }) {
  const { token, user } = useAuth();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    const target = user.role === 'admin' ? '/admin' : '/user';
    return <Navigate to={target} replace />;
  }
  return children;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4f46e5'
    },
    secondary: {
      main: '#22c55e'
    },
    background: {
      default: '#020617',
      paper: '#020617'
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
});

function AppShell() {
  const { user } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={user.role === 'admin' ? '/admin' : '/user'}
                  replace
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/user"
            element={
              <PrivateRoute roles={['user', 'admin']}>
                <UserDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

