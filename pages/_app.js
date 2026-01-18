import { Provider } from 'react-redux';
import "@/styles/globals.css"; // Ensure this is imported before theme for overrides to work correctly
import store from '../store';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme'; // Import the custom theme

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </Provider>
  );
}
