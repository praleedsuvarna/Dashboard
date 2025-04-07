import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as OrganizationIcon,
  VerifiedUser as RoleIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApiService } from '../services/api';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  organization_id: string;
  username: string;
  email: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  TokenExpiry: string;
  organization_name: string;
}

const Profile: React.FC = () => {
  const queryClient = useQueryClient();
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: userApiService.getProfile,
  });

  const updateOrgMutation = useMutation({
    mutationFn: userApiService.updateOrganization,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsEditingOrg(false);
      setSuccess('Organization name updated successfully');
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const updateUsernameMutation = useMutation({
    mutationFn: userApiService.updateUsername,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsEditingUsername(false);
      setSuccess('Username updated successfully');
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const handleEditOrg = () => {
    if (profile) {
      setNewOrgName(profile.organization_name);
      setIsEditingOrg(true);
    }
  };

  const handleEditUsername = () => {
    if (profile) {
      setNewUsername(profile.username);
      setIsEditingUsername(true);
    }
  };

  const handleSaveOrg = () => {
    if (newOrgName.trim()) {
      updateOrgMutation.mutate(newOrgName);
    }
  };

  const handleSaveUsername = () => {
    if (newUsername.trim()) {
      updateUsernameMutation.mutate(newUsername);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingOrg(false);
    setIsEditingUsername(false);
    setNewOrgName('');
    setNewUsername('');
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main' }}
          >
            <PersonIcon sx={{ fontSize: 60 }} />
          </Avatar>
          {isEditingUsername ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <IconButton onClick={handleSaveUsername} color="primary">
                <CheckIcon />
              </IconButton>
              <IconButton onClick={handleCancelEdit} color="error">
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h4" component="h1">
                {profile?.username}
              </Typography>
              <IconButton onClick={handleEditUsername} size="small">
                <EditIcon />
              </IconButton>
            </Box>
          )}
          <Typography variant="subtitle1" color="text.secondary">
            {profile?.email}
          </Typography>
        </Box>

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

        <List>
          <ListItem>
            <ListItemIcon>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText
              primary="Email"
              secondary={profile?.email}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <OrganizationIcon />
            </ListItemIcon>
            {isEditingOrg ? (
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
                <IconButton onClick={handleSaveOrg} color="primary">
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={handleCancelEdit} color="error">
                  <CloseIcon />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <ListItemText
                  primary="Organization"
                  secondary={profile?.organization_name}
                />
                <IconButton onClick={handleEditOrg} size="small">
                  <EditIcon />
                </IconButton>
              </Box>
            )}
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <RoleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Role"
              secondary={profile?.role}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <CalendarIcon />
            </ListItemIcon>
            <ListItemText
              primary="Member Since"
              secondary={format(new Date(profile?.created_at || ''), 'MMMM d, yyyy')}
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <RefreshIcon />
            </ListItemIcon>
            <ListItemText
              primary="Token Expiry"
              secondary={format(new Date(profile?.TokenExpiry || ''), 'MMMM d, yyyy h:mm a')}
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default Profile; 