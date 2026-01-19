import React from 'react';
import { Box, Chip, Typography, Paper } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const ContextPanel = ({ keywords }) => {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AutoAwesomeIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" fontWeight="bold">
                    Context & Insights
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {keywords.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                        Listening for keywords...
                    </Typography>
                )}
                {keywords.map((word, index) => (
                    <Chip
                        key={index}
                        label={word}
                        size="small"
                        color="default"
                        variant="outlined"
                        sx={{
                            borderRadius: '4px',
                            fontWeight: 500
                        }}
                    />
                ))}
            </Box>

            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                * Keywords detected from conversation for OSINT research.
            </Typography>
        </Paper>
    );
};

export default ContextPanel;
