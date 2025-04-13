import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppTheme } from './theme';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from './services/settingsService';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MRContent from './pages/MRContent';
import { CreateMRContent } from './pages/CreateMRContent';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';

// Create a client
const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const AppRoutes: React.FC = () => {
  const { data: settings = { darkMode: false, primaryColor: '#1976d2' } } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings()
  });

  const theme = useMemo(
    () => createAppTheme(settings.darkMode, settings.primaryColor),
    [settings.darkMode, settings.primaryColor]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Outlet />
                </MainLayout>
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="mr-content">
              <Route index element={<MRContent />} />
              <Route path="create" element={<CreateMRContent />} />
            </Route>
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
