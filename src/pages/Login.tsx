import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Alert,
  Link,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { userApiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Log component mount and state changes
  useEffect(() => {
    console.log('Login component mounted');
    console.log('Initial isAuthenticated:', isAuthenticated);
    return () => {
      console.log('Login component unmounted');
      console.log('Final isAuthenticated:', isAuthenticated);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    console.log('Error state changed:', error);
  }, [error]);

  useEffect(() => {
    console.log('Form data changed:', formData);
  }, [formData]);

  // Only redirect if authenticated
  useEffect(() => {
    console.log('Auth effect triggered, isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('Navigating to home due to authentication');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const loginMutation = useMutation({
    mutationFn: userApiService.login,
    onSuccess: (response) => {
      console.log('Login success response:', response);
      const data = response.data as LoginResponse;
      if (data.access_token) {
        console.log('Login successful, storing token');
        login(data.access_token, data.user);
      } else {
        console.log('No access token in response');
        setError('No authentication token received from server');
      }
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      
      const errorResponse = error.response?.data;
      console.error('Error response data:', errorResponse);
      
      if (errorResponse?.error) {
        const errorMessage = errorResponse.error.toLowerCase();
        if (errorMessage.includes('email') && errorMessage.includes('verification')) {
          console.log('Email verification error detected, redirecting...');
          // Navigate to email verification page without setting error state
          navigate('/email-verification', { state: { email: formData.email } });
          return;
        }
        console.log('Setting error message:', errorResponse.error);
        setError(errorResponse.error);
      } else {
        console.log('Setting generic error message');
        setError('Failed to login');
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('Form field changed:', name, value);
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    setError(null);
    loginMutation.mutate(formData);
  };

  console.log('Login component render, isAuthenticated:', isAuthenticated, 'Error:', error);

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Login
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              '& .MuiAlert-message': {
                whiteSpace: 'pre-line'
              }
            }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              required
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link href="/signup" variant="body2">
              Don't have an account? Sign up
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login; 