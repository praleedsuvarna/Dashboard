import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { userApiService } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const email = location.state?.email || '';

  const resendMutation = useMutation({
    mutationFn: () => userApiService.resendVerificationEmail({ email }),
    onSuccess: () => {
      setSuccess('Verification email has been resent. Please check your inbox.');
      setError(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to resend verification email';
      setError(errorMessage);
      setSuccess(null);
    },
  });

  const handleResend = () => {
    setError(null);
    setSuccess(null);
    resendMutation.mutate();
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Email Verification Required
        </Typography>

        <Typography variant="body1" paragraph>
          Please verify your email address to continue. We've sent a verification email to:
        </Typography>

        <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          {email}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleResend}
            disabled={resendMutation.isPending}
          >
            {resendMutation.isPending ? 'Resending...' : 'Resend Verification Email'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EmailVerification; 