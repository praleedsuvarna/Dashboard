import { createTheme, ThemeOptions } from '@mui/material/styles';

// Function to create theme based on mode and primary color
export const createAppTheme = (darkMode: boolean, primaryColor: string) => {
  const themeOptions: ThemeOptions = {
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: primaryColor,
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1e1e1e' : primaryColor,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

// Default theme
export const theme = createAppTheme(false, '#1976d2'); 