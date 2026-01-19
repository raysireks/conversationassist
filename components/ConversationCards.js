import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Fade } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PushPinIcon from '@mui/icons-material/PushPin';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const ConversationCards = ({ history }) => {
    // 'history' is expected to be an array of completion objects { type, text, summary, timestamp }
    const [pinnedIndices, setPinnedIndices] = useState([]);

    const togglePin = (realIndex) => {
        setPinnedIndices(prev => {
            if (prev.includes(realIndex)) return prev.filter(i => i !== realIndex);
            return [...prev, realIndex];
        });
    };

    // Pinned items are rendered separately from the scroll view
    const pinnedItems = pinnedIndices.map(idx => ({ item: history[idx], originalIndex: idx })).filter(x => x.item);

    // Create a reversed list for display (Newest First)
    // We map original index to keep track of it for pinning
    const scrollItems = history.map((item, index) => ({ item, originalIndex: index })).reverse();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', height: '100%', overflow: 'hidden' }}>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', pr: 1 }}>
                {/* 1. PINNED ITEMS (Always Top) */}
                {pinnedItems.map(({ item, originalIndex }) => (
                    <ConversationCard
                        key={`pinned-${originalIndex}`}
                        item={item}
                        isPinned={true}
                        onTogglePin={() => togglePin(originalIndex)}
                    />
                ))}

                {/* 2. SCROLLING ITEMS (Newest First) */}
                {history.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                        Listening for thoughts...
                    </Typography>
                )}

                {scrollItems.map(({ item, originalIndex }) => {
                    // correct key to avoid re-render flicker
                    if (pinnedIndices.includes(originalIndex)) return null;
                    return (
                        <ConversationCard
                            key={`hist-${originalIndex}`}
                            item={item}
                            isPinned={false}
                            onTogglePin={() => togglePin(originalIndex)}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};

// Sub-component for individual card
const ConversationCard = ({ item, isPinned, onTogglePin }) => {
    // Map backend types to friendly labels/colors
    const getTypeDetails = (type) => {
        switch ((type || '').toUpperCase()) {
            case 'QUESTION': return { label: 'Question', color: 'warning.main' };
            case 'CONCLUSION': return { label: 'Key Insight', color: 'success.main' };
            case 'STATEMENT': return { label: 'Statement', color: 'text.secondary' };
            default: return { label: 'Thought', color: 'primary.main' };
        }
    };

    const { label, color } = getTypeDetails(item.type);

    return (
        <Fade in={true}>
            <Card elevation={isPinned ? 5 : 2} sx={{
                borderRadius: 2,
                bgcolor: isPinned ? '#fafafa' : 'background.paper',
                border: isPinned ? '1px solid #1976d2' : 'none',
                flexShrink: 0 // Prevent crushing
            }}>
                <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SmartToyIcon sx={{ mr: 1, fontSize: 20, color: color }} />
                        <Typography variant="overline" sx={{ color: color, fontWeight: 'bold' }}>
                            {label}
                        </Typography>

                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ mr: 1, color: 'text.secondary' }}>
                                {item.timestamp}
                            </Typography>
                            <IconButton size="small" onClick={onTogglePin} color={isPinned ? "primary" : "default"}>
                                {/* Using placeholder icon if PushPin not imported yet */}
                                <PushPinIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    {item.summary && (
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>
                            {item.summary}
                        </Typography>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.text}
                    </Typography>
                </CardContent>
            </Card>
        </Fade>
    );
};

export default ConversationCards;
