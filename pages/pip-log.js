import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { Box, Typography, List, ListItem, Paper, Avatar, CircularProgress } from '@mui/material';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import dynamic from 'next/dynamic';


const ScrollToBottom = dynamic(() => import('react-scroll-to-bottom'), {
    ssr: false,
});


const pipTheme = createTheme({

    palette: { mode: 'light', background: { paper: '#ffffff', default: '#f0f0f0', }, text: { primary: '#111111', secondary: '#555555', }, primary: { main: '#1976d2', contrastText: '#ffffff', }, secondary: { light: '#ff80ab', main: '#f50057', contrastText: '#fff' }, grey: { 400: '#bdbdbd', 500: '#9e9e9e' } }, typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', body1: { fontSize: '13px', lineHeight: 1.5 }, body2: { fontSize: '12px', lineHeight: 1.45 }, caption: { fontSize: '11px' }, subtitle2: { fontSize: '13px', fontWeight: 'bold' }, }, components: { MuiPaper: { styleOverrides: { root: { padding: '6px 10px', marginBottom: '6px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflowWrap: 'break-word', } } }, MuiListItem: { styleOverrides: { root: { paddingTop: '3px', paddingBottom: '3px', alignItems: 'flex-start', } } }, MuiAvatar: { styleOverrides: { root: { width: 26, height: 26, marginRight: '8px', } } } }
});


const RootBox = styled(Box)(({ theme }) => ({
  height: '100%',
  position: 'relative', 
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
}));


export default function PipLogPage() {
    const [historicalResponses, setHistoricalResponses] = useState([]);
    const [currentStreamingText, setCurrentStreamingText] = useState('');
    const [isCurrentlyProcessing, setIsCurrentlyProcessing] = useState(false);
    const [sortOrder, setSortOrder] = useState('newestAtTop');
    const theme = pipTheme;
    const rootBoxRef = useRef(null);

    const formatAndDisplayResponse = useCallback((response) => {
        if (!response) return null;
        return (
            <ReactMarkdown
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <Box sx={{ my: 0.5, '& pre': { borderRadius: '3px', padding: '8px !important', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#282c34', color: '#abb2bf' } }}>
                                <pre><code className={className} {...props} dangerouslySetInnerHTML={{ __html: hljs.highlight(String(children).replace(/\n$/, ''), { language: match[1], ignoreIllegals: true }).value }} /></pre>
                            </Box>
                        ) : (
                            <code className={className} {...props} style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '1px 3px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{children}</code>
                        );
                    },
                     p: ({node, ...props}) => <Typography variant="body1" paragraph {...props} sx={{mb: 0.5, wordBreak: 'break-word'}}/>,
                    strong: ({node, ...props}) => <Typography component="strong" variant="body1" fontWeight="bold" {...props} />,
                    em: ({node, ...props}) => <Typography component="em" variant="body1" fontStyle="italic" {...props} />,
                    ul: ({node, ...props}) => <Typography component="ul" variant="body1" sx={{pl: 1.5, mb: 0.5}} {...props} />,
                    ol: ({node, ...props}) => <Typography component="ol" variant="body1" sx={{pl: 1.5, mb: 0.5}} {...props} />,
                    li: ({node, ...props}) => <Typography component="li" variant="body1" sx={{mb: 0.1}} {...props} />,
                }}
            >
                {response}
            </ReactMarkdown>
        );
    }, []);


    useEffect(() => {
        const handleMessage = (event) => {
            const { type, payload } = event.data;

            if (type === 'AI_LOG_DATA') {
                const data = payload;
                setHistoricalResponses(Array.isArray(data.historicalResponses) ? data.historicalResponses : []);
                setCurrentStreamingText(data.currentStreamingText || '');
                setIsCurrentlyProcessing(data.isProcessing || false);
                if (data.sortOrder) {
                    setSortOrder(data.sortOrder);
                }
            } else if (type === 'PIP_RESIZE') {
                if (rootBoxRef.current && payload && payload.height) {
                    rootBoxRef.current.style.height = `${payload.height}px`;
                }
            }
        };

        window.addEventListener('message', handleMessage);

        const readyMessage = { type: window.opener ? 'PIP_WINDOW_READY' : 'PIP_IFRAME_READY' };
        const target = window.opener || window.parent;
        if (target && target !== window) {
            target.postMessage(readyMessage, '*');
        }

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    let itemsToRender = [...historicalResponses];
    if (sortOrder === 'newestAtTop') {
        itemsToRender.reverse();
    }

    const streamingItemForRender = (isCurrentlyProcessing && currentStreamingText) ?
        { text: currentStreamingText, timestamp: 'Streaming...', type: 'current_streaming' } : null;

    if (streamingItemForRender) {
        if (sortOrder === 'newestAtTop') {
            itemsToRender.unshift(streamingItemForRender);
        } else {
            itemsToRender.push(streamingItemForRender);
        }
    }


    return (
        <ThemeProvider theme={pipTheme}>
            <CssBaseline />
            <Head>
                <title>AI Log</title>
            </Head>
            <RootBox ref={rootBoxRef}>
                <ScrollToBottom
                    className="pip-scroll-to-bottom"
                    mode={sortOrder === 'newestAtTop' ? "top" : "bottom"}
                    followButtonClassName="hidden-follow-button"
                    initialScrollBehavior="auto"
                >
                    <List dense disablePadding sx={{ px: 0.5, py: 0.5 }}>
                        {itemsToRender.map((item, index) => (
                            <ListItem key={`${item.type}-${item.timestamp}-${index}`} sx={{ alignItems: 'flex-start', px:0, py: 0.25}}>
                                <Avatar sx={{ bgcolor: theme.palette.secondary.light, mr: 1, mt: 0.1, width: 24, height: 24 }}>
                                    <SmartToyIcon sx={{ color: theme.palette.getContrastText(theme.palette.secondary.light), fontSize: '0.9rem' }} />
                                </Avatar>
                                <Paper variant="outlined" sx={{ p: 0.75, flexGrow: 1, bgcolor: theme.palette.background.paper, borderColor: theme.palette.divider, minHeight: '28px', }} >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.1 }}>
                                        <Typography variant="subtitle2" color="text.primary">AI Assistant</Typography>
                                        {item.timestamp !== 'Streaming...' && <Typography variant="caption" color="text.secondary">{item.timestamp}</Typography>}
                                    </Box>
                                    {formatAndDisplayResponse(item.text)}
                                    {item.type === 'current_streaming' && <CircularProgress size={12} sx={{ml:0.5, mt:0.5, display:'inline-block', verticalAlign: 'middle'}} />}
                                </Paper>
                            </ListItem>
                        ))}
                         {itemsToRender.length === 0 && !isCurrentlyProcessing && ( <ListItem sx={{justifyContent: 'center', pt: 2}}> <Typography variant="caption" color="textSecondary">Waiting for AI responses...</Typography> </ListItem> )}
                         {isCurrentlyProcessing && itemsToRender.length === 0 && ( <ListItem sx={{justifyContent: 'center', pt: 2}}> <CircularProgress size={16} /> <Typography variant="caption" color="textSecondary" sx={{ml:1}}>AI is thinking...</Typography> </ListItem> )}
                    </List>
                </ScrollToBottom>
            </RootBox>
            <style jsx global>{`
                html, body, #__next {
                    height: 100%;
                    overflow: hidden;
                }
                /* <<< CHANGED: Revert scroll container to absolute positioning */
                .pip-scroll-to-bottom {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    overflow-y: auto;
                    background-color: ${pipTheme.palette.background.default};
                    padding: ${pipTheme.spacing(0.5)};
                }
                .hidden-follow-button {
                    display: none;
                }
                .pip-scroll-to-bottom::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .pip-scroll-to-bottom::-webkit-scrollbar-track {
                    background: ${pipTheme.palette.background.paper};
                }
                .pip-scroll-to-bottom::-webkit-scrollbar-thumb {
                    background-color: ${pipTheme.palette.grey[400]};
                    border-radius: 3px;
                }
                .pip-scroll-to-bottom::-webkit-scrollbar-thumb:hover {
                    background-color: ${pipTheme.palette.grey[500]};
                }
                .pip-scroll-to-bottom {
                    scrollbar-width: thin;
                    scrollbar-color: ${pipTheme.palette.grey[400]} ${pipTheme.palette.background.default};
                }
            `}</style>
        </ThemeProvider>
    );
}