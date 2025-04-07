import React from 'react';
import { Container, Typography, Paper, Box, List, ListItem, ListItemText } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { mrContentApiService } from '../services/api';
import { AxiosResponse } from 'axios';

interface ContentItem {
  id: string;
  name: string;
  status: string;
  is_active?: boolean;
}

interface ContentResponse {
  data: ContentItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const Dashboard = () => {
  const { data: response, isLoading, error } = useQuery<AxiosResponse<ContentResponse>>({
    queryKey: ['mrContent'],
    queryFn: () => mrContentApiService.getAllContent({ page: 1, limit: 10 }),
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error">Error loading content</Typography>
      </Container>
    );
  }

  const contents = response?.data?.data || [];
  console.log('Dashboard content data:', contents);
  
  // Check both status and is_active fields
  const activeContentCount = contents.filter((item: ContentItem) => 
    item.status === 'active' || item.is_active === true
  ).length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Total Content
          </Typography>
          <Typography variant="h4">
            {response?.data?.total || 0}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Content
          </Typography>
          <Typography variant="h4">
            {activeContentCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}>
          <Typography variant="h6" gutterBottom>
            Recent Content
          </Typography>
          <List>
            {contents.slice(0, 5).map((item: ContentItem) => (
              <ListItem key={item.id}>
                <ListItemText
                  primary={item.name}
                  secondary={`Status: ${item.status}${item.is_active !== undefined ? `, Active: ${item.is_active}` : ''}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard; 