import React from 'react';
import { Box, Paper, Typography, LinearProgress, Button } from '@mui/material';

const ThoughtProcess = ({ currentThought, status, onForceFinalize }) => {
    // status: 'idle', 'forming', 'finalizing'

    return (
        <Paper
            elevation={4}
            sx={{
                mt: 2,
                mb: 2,
                p: 0,
                overflow: 'hidden',
                borderTop: '6px solid', // Thick top border
                borderTopColor: status === 'finalizing' ? 'secondary.main' : 'primary.main',
                transition: 'border-color 0.3s ease'
            }}
        >
            <Box sx={{ p: 2, minHeight: 120, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        {status === 'idle' ? 'Ready' : (status === 'finalizing' ? 'Finalizing Thought...' : 'Thinking...')}
                    </Typography>
                    {status !== 'idle' && (
                        <Button
                            size="small"
                            color="warning"
                            variant="outlined"
                            onClick={onForceFinalize}
                            sx={{ fontSize: '0.7rem', py: 0, height: 24, minHeight: 0 }}
                        >
                            End Thought
                        </Button>
                    )}
                </Box>

                {/* Inner Box for Final/Active State */}
                <Box sx={{
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: status === 'finalizing' ? 'action.hover' : 'transparent',
                    transition: 'background-color 0.3s'
                }}>
                    <Typography variant="body1" sx={{ fontStyle: status === 'idle' ? 'italic' : 'normal', color: status === 'idle' ? 'text.secondary' : 'text.primary' }}>
                        {currentThought || "Waiting for input..."}
                    </Typography>
                </Box>
            </Box>
            {status !== 'idle' && <LinearProgress color={status === 'finalizing' ? 'secondary' : 'primary'} />}
        </Paper>
    );
};

export default ThoughtProcess;
