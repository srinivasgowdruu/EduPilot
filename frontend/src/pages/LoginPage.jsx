import React, { useState } from 'react';
import { useAuth } from "../context/useAuth";
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    Paper,
    Divider,
    Fade,
} from '@mui/material';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            setSuccess(true);

            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError(
                err.response?.data?.msg ||
                err.message ||
                'Login failed. Please check credentials.'
            );

            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                background: '#f6f8fc',
                overflow: 'hidden',
                position: 'relative',
            }}
        >

            {/* =====================================================
                LEFT BRANDING PANEL
            ====================================================== */}

            <Box
                sx={{
                    width: '50%',
                    minHeight: '100vh',
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    background:
                        'linear-gradient(145deg, #071a3d 0%, #0b3b82 45%, #2563eb 100%)',
                    color: 'white',
                    p: { md: 6, lg: 8 },
                }}
            >

                {/* Decorative circles */}

                <Box
                    sx={{
                        position: 'absolute',
                        width: 500,
                        height: 500,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(96,165,250,0.28) 0%, rgba(96,165,250,0) 70%)',
                        top: -180,
                        right: -180,
                    }}
                />

                <Box
                    sx={{
                        position: 'absolute',
                        width: 450,
                        height: 450,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(129,140,248,0.25) 0%, rgba(129,140,248,0) 70%)',
                        bottom: -180,
                        left: -180,
                    }}
                />

                {/* Brand */}

                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.14)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.18)',
                        }}
                    >
                        <Box
                            component="img"
                            src="/edupilot-icon.jpeg"
                            alt="EduPilot"
                            sx={{
                                width: 30,
                                height: 30,
                                objectFit: 'cover',
                                borderRadius: '8px',
                            }}
                        />
                    </Box>

                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: '1.5px',
                        }}
                    >
                        EDUPILOT
                    </Typography>
                </Box>

                {/* Main message */}

                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        maxWidth: 600,
                        mt: -4,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: { md: '2.8rem', lg: '3.8rem' },
                            fontWeight: 800,
                            lineHeight: 1.08,
                            letterSpacing: '-1.5px',
                            mb: 3,
                        }}
                    >
                        Learn smarter.
                        <br />
                        <Box
                            component="span"
                            sx={{
                                color: '#93c5fd',
                            }}
                        >
                            Achieve more.
                        </Box>
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: '1.05rem',
                            lineHeight: 1.8,
                            color: 'rgba(255,255,255,0.72)',
                            maxWidth: 500,
                        }}
                    >
                        Your AI-powered study companion for turning
                        complex learning into simple, focused progress.
                    </Typography>

                    {/* Feature highlights */}

                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            mt: 5,
                            flexWrap: 'wrap',
                        }}
                    >

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 2,
                                py: 1.2,
                                borderRadius: 3,
                                background: 'rgba(255,255,255,0.09)',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <SchoolOutlinedIcon fontSize="small" />
                            <Typography variant="body2">
                                Smart Learning
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 2,
                                py: 1.2,
                                borderRadius: 3,
                                background: 'rgba(255,255,255,0.09)',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <PsychologyOutlinedIcon fontSize="small" />
                            <Typography variant="body2">
                                AI Insights
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 2,
                                py: 1.2,
                                borderRadius: 3,
                                background: 'rgba(255,255,255,0.09)',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <TrendingUpIcon fontSize="small" />
                            <Typography variant="body2">
                                Track Progress
                            </Typography>
                        </Box>

                    </Box>
                </Box>

                {/* Footer */}

                <Typography
                    variant="caption"
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        color: 'rgba(255,255,255,0.45)',
                    }}
                >
                    © Developed By Srinivas
                </Typography>

            </Box>


            {/* =====================================================
                RIGHT LOGIN PANEL
            ====================================================== */}

            <Box
                sx={{
                    width: { xs: '100%', md: '50%' },
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 3, sm: 5, md: 6, lg: 10 },
                    py: 5,
                    position: 'relative',
                }}
            >

                {/* Mobile logo */}

                <Box
                    sx={{
                        display: { xs: 'flex', md: 'none' },
                        position: 'absolute',
                        top: 28,
                        left: 28,
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <AutoAwesomeIcon sx={{ color: '#2563eb' }} />

                    <Typography
                        sx={{
                            fontWeight: 800,
                            letterSpacing: 1,
                            color: '#0f172a',
                        }}
                    >
                        EDUPILOT
                    </Typography>
                </Box>


                <Fade in={!success} timeout={700}>
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 460,
                        }}
                    >

                        {/* Login heading */}

                        <Box sx={{ mb: 4 }}>

                            <Box
                                sx={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: '16px',
                                    background:
                                        'linear-gradient(135deg, #2563eb, #6366f1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    mb: 3,
                                    boxShadow:
                                        '0 10px 25px rgba(37,99,235,0.25)',
                                }}
                            >
                                <LockOutlinedIcon />
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: { xs: '2rem', sm: '2.4rem' },
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    letterSpacing: '-0.8px',
                                }}
                            >
                                Welcome back
                            </Typography>

                            <Typography
                                sx={{
                                    mt: 1,
                                    color: '#64748b',
                                    fontSize: '0.98rem',
                                }}
                            >
                                Sign in to continue your learning journey.
                            </Typography>

                        </Box>


                        {/* Login form */}

                        <Paper
                            elevation={0}
                            sx={{
                                background: 'transparent',
                            }}
                        >

                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 2.5,
                                        borderRadius: 2,
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            <Box
                                component="form"
                                onSubmit={handleSubmit}
                                noValidate
                            >

                                {/* Username */}

                                <Typography
                                    sx={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#334155',
                                        mb: 0.8,
                                    }}
                                >
                                    Username
                                </Typography>

                                <TextField
                                    required
                                    fullWidth
                                    id="username"
                                    name="username"
                                    autoComplete="username"
                                    autoFocus
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    disabled={loading}
                                    sx={{
                                        mb: 2.5,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            background: '#ffffff',
                                            transition: 'all 0.2s ease',

                                            '& fieldset': {
                                                borderColor: '#dbe2ea',
                                            },

                                            '&:hover fieldset': {
                                                borderColor: '#93c5fd',
                                            },

                                            '&.Mui-focused fieldset': {
                                                borderColor: '#2563eb',
                                                borderWidth: '2px',
                                            },
                                        },
                                    }}
                                />


                                {/* Password */}

                                <Typography
                                    sx={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#334155',
                                        mb: 0.8,
                                    }}
                                >
                                    Password
                                </Typography>

                                <TextField
                                    required
                                    fullWidth
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    disabled={loading}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword
                                                        )
                                                    }
                                                    edge="end"
                                                    disabled={loading}
                                                    aria-label="toggle password visibility"
                                                >
                                                    {showPassword ? (
                                                        <VisibilityOffIcon />
                                                    ) : (
                                                        <VisibilityIcon />
                                                    )}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            background: '#ffffff',
                                            transition: 'all 0.2s ease',

                                            '& fieldset': {
                                                borderColor: '#dbe2ea',
                                            },

                                            '&:hover fieldset': {
                                                borderColor: '#93c5fd',
                                            },

                                            '&.Mui-focused fieldset': {
                                                borderColor: '#2563eb',
                                                borderWidth: '2px',
                                            },
                                        },
                                    }}
                                />


                                {/* Sign in button */}

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={loading}
                                    sx={{
                                        mt: 3.5,
                                        height: 54,
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        background:
                                            'linear-gradient(135deg, #2563eb, #4f46e5)',
                                        boxShadow:
                                            '0 10px 20px rgba(37,99,235,0.22)',
                                        transition: 'all 0.25s ease',

                                        '&:hover': {
                                            background:
                                                'linear-gradient(135deg, #1d4ed8, #4338ca)',
                                            transform: 'translateY(-1px)',
                                            boxShadow:
                                                '0 14px 25px rgba(37,99,235,0.28)',
                                        },

                                        '&:disabled': {
                                            background: '#94a3b8',
                                        },
                                    }}
                                >
                                    {loading ? (
                                        <CircularProgress
                                            size={24}
                                            sx={{ color: 'white' }}
                                        />
                                    ) : (
                                        'Sign in to EduPilot'
                                    )}
                                </Button>

                            </Box>

                        </Paper>


                        {/* Divider */}

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                my: 4,
                            }}
                        >
                            <Divider sx={{ flex: 1 }} />

                            <Typography
                                variant="caption"
                                sx={{ color: '#94a3b8' }}
                            >
                                NEW TO EDUPILOT?
                            </Typography>

                            <Divider sx={{ flex: 1 }} />
                        </Box>


                        {/* Register */}

                        <Typography
                            sx={{
                                textAlign: 'center',
                                color: '#64748b',
                                fontSize: '0.92rem',
                            }}
                        >
                            Don't have an account?{' '}

                            <Box
                                component={RouterLink}
                                to="/register"
                                sx={{
                                    color: '#2563eb',
                                    fontWeight: 700,
                                    textDecoration: 'none',

                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                Create an account
                            </Box>
                        </Typography>


                        {/* Small footer */}

                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                textAlign: 'center',
                                mt: 5,
                                color: '#94a3b8',
                            }}
                        >
                            Your learning. Your progress. Your EduPilot.
                        </Typography>

                    </Box>
                </Fade>


                {/* =================================================
                    SUCCESS SCREEN
                ================================================== */}

                {success && (
                    <Box
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                                'linear-gradient(135deg, #050817 0%, #0b1f5c 45%, #087cff 100%)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Background glow */}
                        <Box
                            sx={{
                                position: 'absolute',
                                width: 600,
                                height: 600,
                                borderRadius: '50%',
                                background:
                                    'radial-gradient(circle, rgba(76,201,240,0.25) 0%, rgba(76,201,240,0) 70%)',
                                top: '-220px',
                                right: '-180px',
                            }}
                        />

                        <Box
                            sx={{
                                position: 'absolute',
                                width: 500,
                                height: 500,
                                borderRadius: '50%',
                                background:
                                    'radial-gradient(circle, rgba(8,124,255,0.30) 0%, rgba(8,124,255,0) 70%)',
                                bottom: '-220px',
                                left: '-180px',
                            }}
                        />

                        {/* Success content */}
                        <Box
                            sx={{
                                position: 'relative',
                                zIndex: 2,
                                textAlign: 'center',
                                color: 'white',
                                animation: 'fadeIn 0.5s ease-out',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 82,
                                    height: 82,
                                    borderRadius: '50%',
                                    margin: '0 auto 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(56, 189, 248, 0.12)',
                                    border: '2px solid rgba(56, 189, 248, 0.7)',
                                    boxShadow:
                                        '0 0 0 10px rgba(56, 189, 248, 0.08), 0 0 35px rgba(56, 189, 248, 0.35)',
                                }}
                                >
                                <CheckCircleOutlineIcon
                                    sx={{
                                        fontSize: 48,
                                        color: 'white',
                                    }}
                                />
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: {
                                        xs: '2rem',
                                        sm: '2.5rem',
                                    },
                                    fontWeight: 800,
                                    letterSpacing: '-0.8px',
                                    mb: 1,
                                }}
                            >
                                Login successful
                            </Typography>

                            <Typography
                                sx={{
                                    color: 'rgba(255,255,255,0.72)',
                                    fontSize: '0.95rem',
                                }}
                            >
                                Taking you to your learning dashboard...
                            </Typography>

                            <Box
                                sx={{
                                    width: 180,
                                    height: 3,
                                    borderRadius: 10,
                                    background: 'rgba(255,255,255,0.15)',
                                    overflow: 'hidden',
                                    mx: 'auto',
                                    mt: 4,
                                }}
                            >
                                <Box
                                    sx={{
                                        height: '100%',
                                        width: '45%',
                                        borderRadius: 10,
                                        background: '#7dd3fc',
                                        animation: 'loadingBar 1.8s ease-in-out infinite',
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                )}

            </Box>

        </Box>
    );
}

export default LoginPage;