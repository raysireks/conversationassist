import { createTheme } from '@mui/material/styles';
import { red, grey } from '@mui/material/colors';

// Create a theme instance.
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // A professional blue
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e', // A vibrant pink/red for accents
      light: '#ff4081',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: grey[100], // A very light grey for the app background
      paper: '#ffffff',   // White for paper elements
    },
    text: {
      primary: grey[900], // Dark grey for primary text
      secondary: grey[700], // Medium grey for secondary text
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#333333', // Darker color for main headings
      marginBottom: '0.75em',
    },
    h5: {
      fontWeight: 600,
      color: '#444444',
      marginBottom: '0.5em',
    },
    h6: {
      fontWeight: 600,
      color: '#555555', // Slightly lighter for subheadings
      marginBottom: '0.5em',
    },
    button: {
      textTransform: 'none', // Keep button text case as is
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
    body1: {
      lineHeight: 1.6,
    },
    caption: {
      color: grey[600],
    }
  },
  shape: {
    borderRadius: 8, // Default border radius for components
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          // borderRadius: 12, // Slightly more rounded corners for paper
          boxShadow: '0px 5px 15px rgba(0,0,0,0.08)', // Softer, more modern shadow
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          // borderRadius: 8, // Consistent rounded corners for buttons
          padding: '10px 20px', // More generous padding
          boxShadow: 'none', // Remove default button shadow for a flatter look, can add on hover
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0,0,0,0.1)', // Subtle shadow on hover
          }
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1565c0', // Darken primary on hover
          }
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#9a0036', // Darken secondary on hover
          }
        },
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            // borderRadius: 8, // Rounded corners for text fields
            '& fieldset': {
              // borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: '#1976d2', // Primary color border on hover
            },
            // '&.Mui-focused fieldset': {
            //   borderColor: '#1976d2', // Primary color border when focused
            // },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#1976d2', // Primary color for label when focused
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.06)' // Standard hover for icon buttons
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          // borderRadius: 16, // More rounded chips
          fontWeight: 500,
        }
      }
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.06), 0px 4px 5px 0px rgba(0,0,0,0.04), 0px 1px 10px 0px rgba(0,0,0,0.03)', // Softer app bar shadow
            }
        }
    },
    MuiList: {
        styleOverrides: {
            root: {
                '& .MuiListItem-root': {
                    borderRadius: 8, // Rounded list items if they are interactive
                }
            }
        }
    },
    MuiCard: {
        styleOverrides: {
            root: {
                // borderRadius: 12,
                // boxShadow: '0px 5px 15px rgba(0,0,0,0.08)',
            }
        }
    }
  }
});

export default theme;