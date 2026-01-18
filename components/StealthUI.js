import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    AppBar,
    Box,
    Button,
    Container,
    Divider,
    Paper,
    Toolbar,
    Typography,
    useTheme
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

export default function StealthUI({
    onStartMic,
    onStartSystemAudio,
    isMicActive,
    isSystemActive,
    onOpenSettings
}) {
    const theme = useTheme();

    // "Disguised" UI constants
    const pageTitle = "API Documentation v2.4.1";
    const lastUpdated = "Last updated: Oct 24, 2025";

    return (
        <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
            {/* Fake Header */}
            <AppBar position="static" elevation={0} sx={{ bgcolor: '#24292f', borderBottom: '1px solid #e1e4e8' }}>
                <Toolbar variant="dense">
                    <DescriptionIcon sx={{ mr: 2, color: '#ffffff' }} fontSize="small" />
                    <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1, color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>
                        System Docs
                    </Typography>
                    {/* Hidden Settings Trigger: Looks like a "Log In" or "Version" link */}
                    <Button
                        color="inherit"
                        size="small"
                        onClick={onOpenSettings}
                        sx={{ textTransform: 'none', color: '#d0d7de', fontSize: '0.8rem', minWidth: 0 }}
                    >
                        v2.4.1
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1, display: 'flex', flexDirection: 'row', gap: 4 }}>
                {/* Fake Sidebar */}
                <Box sx={{ width: 240, display: { xs: 'none', md: 'block' }, borderRight: '1px solid #e0e0e0', pr: 2 }}>
                    {['Introduction', 'Authentication', 'Endpoints', 'Rate Limiting', 'Errors', 'SDKs'].map((text) => (
                        <Typography key={text} variant="body2" sx={{ py: 1, color: text === 'Introduction' ? '#0969da' : '#57606a', fontWeight: text === 'Introduction' ? 600 : 400, cursor: 'default' }}>
                            {text}
                        </Typography>
                    ))}
                </Box>

                {/* Main Content Area */}
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" gutterBottom sx={{ color: '#1f2328', fontWeight: 600 }}>
                        Introduction
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#57606a', mb: 2 }}>
                        {lastUpdated}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Typography paragraph sx={{ color: '#24292f', fontSize: '1rem', lineHeight: 1.6 }}>
                        Welcome to the internal system API documentation. This API allows you to programmatically access and manage your organization's resources.
                        Please review the authentication section before making your first request.
                    </Typography>

                    <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f6f8fa', borderRadius: 2, mb: 4, fontFamily: 'monospace', fontSize: '0.85rem', color: '#24292f' }}>
                        GET https://api.internal-sys.net/v1/resource
                    </Paper>

                    <Typography variant="h6" gutterBottom sx={{ color: '#1f2328', fontWeight: 600, mt: 4 }}>
                        Quick Actions
                    </Typography>
                    <Typography paragraph sx={{ color: '#24292f', fontSize: '1rem', lineHeight: 1.6 }}>
                        Use the buttons below to refresh the documentation cache or sync with the latest API definitions.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        {/* HIDDEN MIC TRIGGER: Disguised as "Update Docs" */}
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onStartMic}
                            sx={{
                                textTransform: 'none',
                                color: '#24292f',
                                borderColor: '#d0d7de',
                                bgcolor: isMicActive ? '#dafbe1' : 'transparent', // Subtle green tint when active
                                '&:hover': {
                                    bgcolor: isMicActive ? '#dafbe1' : '#f3f4f6'
                                }
                            }}
                        >
                            Update Docs
                        </Button>

                        {/* HIDDEN SYSTEM AUDIO TRIGGER: Disguised as "Sync API" */}
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onStartSystemAudio}
                            sx={{
                                textTransform: 'none',
                                color: '#24292f',
                                borderColor: '#d0d7de',
                                bgcolor: isSystemActive ? '#ddf4ff' : 'transparent', // Subtle blue tint when active
                                '&:hover': {
                                    bgcolor: isSystemActive ? '#ddf4ff' : '#f3f4f6'
                                }
                            }}
                        >
                            Sync API
                        </Button>
                    </Box>

                    {/* Status Text (Very subtle) */}
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#cf222e' }}>
                        {(isMicActive || isSystemActive) ? "Syncing..." : ""}
                    </Typography>

                </Box>
            </Container>
        </Box>
    );
}

StealthUI.propTypes = {
    onStartMic: PropTypes.func.isRequired,
    onStartSystemAudio: PropTypes.func.isRequired,
    isMicActive: PropTypes.bool.isRequired,
    isSystemActive: PropTypes.bool.isRequired,
    onOpenSettings: PropTypes.func.isRequired
};
