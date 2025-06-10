import React, { useState } from 'react';
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

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    create_org: true,
    organization_details: {
      name: '',
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      const requestData = {
        email: data.email,
        password: data.password,
        username: data.username,
        role: 'admin',
        create_org: data.create_org,
        organization_details: data.organization_details,
      };
      console.log('Signup request data:', JSON.stringify(requestData, null, 2));
      const response = await userApiService.signup(requestData);
      console.log('Signup response:', response);
      return response;
    },
    onSuccess: (response) => {
      console.log('Signup success response:', response);
      if (response.success) {
        setSuccessMessage('Registration successful! Please check your email to verify your account before logging in.');
        // Clear the form
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'admin',
          create_org: true,
          organization_details: {
            name: '',
          },
        });
      } else {
        setError('Failed to sign up');
      }
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
      setError(error.response?.data?.error || 'Failed to sign up');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'organization_name') {
      setFormData(prev => ({
        ...prev,
        organization_details: {
          ...prev.organization_details,
          name: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Remove confirmPassword from the data sent to the API
    const { confirmPassword, ...signupData } = formData;
    console.log('Submitting signup data:', signupData);
    signupMutation.mutate(signupData);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sign Up
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              required
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />
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
            <TextField
              required
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <TextField
              required
              fullWidth
              label="Organization Name"
              name="organization_name"
              value={formData.organization_details.name}
              onChange={handleChange}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={signupMutation.isPending}
          >
            {signupMutation.isPending ? 'Signing up...' : 'Sign Up'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link href="/login" variant="body2">
              Already have an account? Login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup; 