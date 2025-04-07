import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Slider,
  useTheme
} from '@mui/material';
import { ChromePicker } from 'react-color';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, UserSettings } from '../services/settingsService';
import { useSnackbar } from 'notistack';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings()
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<UserSettings>) => settingsService.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      enqueueSnackbar('Settings updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to update settings', { variant: 'error' });
    }
  });

  const resetMutation = useMutation({
    mutationFn: () => settingsService.resetSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      enqueueSnackbar('Settings reset to defaults', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to reset settings', { variant: 'error' });
    }
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !settings) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Failed to load settings'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4">Settings</Typography>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            Reset to Defaults
          </Button>
        </Box>

        <Stack spacing={4}>
          {/* Theme Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>Theme Settings</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.darkMode}
                    onChange={(e) => updateMutation.mutate({ darkMode: e.target.checked })}
                  />
                }
                label="Dark Mode"
              />
              <Box>
                <Typography variant="subtitle2" gutterBottom>Primary Color</Typography>
                <ChromePicker
                  color={settings.primaryColor}
                  onChange={(color) => updateMutation.mutate({ primaryColor: color.hex })}
                  disableAlpha
                />
              </Box>
            </Stack>
          </Box>

          {/* Display Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>Display Settings</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Items Per Page</Typography>
                <Slider
                  value={settings.itemsPerPage}
                  onChange={(_, value) => updateMutation.mutate({ itemsPerPage: value as number })}
                  min={5}
                  max={50}
                  step={5}
                  marks={[
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
              <FormControl fullWidth>
                <InputLabel>Default View Mode</InputLabel>
                <Select
                  value={settings.defaultViewMode}
                  label="Default View Mode"
                  onChange={(e) => updateMutation.mutate({ defaultViewMode: e.target.value as 'grid' | 'list' })}
                >
                  <MenuItem value="grid">Grid</MenuItem>
                  <MenuItem value="list">List</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Notification Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>Notification Settings</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => updateMutation.mutate({ emailNotifications: e.target.checked })}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.inAppNotifications}
                    onChange={(e) => updateMutation.mutate({ inAppNotifications: e.target.checked })}
                  />
                }
                label="In-App Notifications"
              />
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Settings; 