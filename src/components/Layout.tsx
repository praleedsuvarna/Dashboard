import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', path: '/' },
    { text: 'MR Content', path: '/mr-content' },
    { text: 'Profile', path: '/profile' },
    { text: 'Settings', path: '/settings' },
  ];

  const drawer = (
    <List>
      {menuItems.map((item) => (
        <ListItem key={item.path} disablePadding>
          <ListItemButton
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                handleDrawerToggle();
              }
            }}
          >
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      ))}
      <ListItem disablePadding>
        <ListItemButton onClick={handleLogout}>
          <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
        </ListItemButton>
      </ListItem>
    </List>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            MR Content Management
          </Typography>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  onClick={() => navigate(item.path)}
                >
                  {item.text}
                </Button>
              ))}
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {isMobile && (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': { width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default Layout; 