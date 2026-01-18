// final/pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// This page will simply redirect to the landing page.
// It can also be used for initial auth checks or loading states in the future.
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/landing'); // Redirect to the landing page
  }, [router]);

  // Optional: Show a loading indicator while redirecting
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'background.default'
      }}
    >
      <CircularProgress />
    </Box>
  );
}
