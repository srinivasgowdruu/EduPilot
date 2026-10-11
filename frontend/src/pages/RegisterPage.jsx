import React, { useState } from 'react';
import { useAuth } from "../context/useAuth";
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Alert, CircularProgress, Card, CardContent, Avatar, Grow } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            await register(username, password);
            setSuccess('Registration successful! Please log in.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.msg || err.message || 'Registration failed.');
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                background: '#ffffff',
                overflow: 'hidden',
            }}
        >
            {/* LEFT BRANDING PANEL */}
            <Box
                sx={{
                    width: { xs: '100%', md: '52%' },
                    minHeight: '100vh',
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    px: { md: 8, lg: 10 },
                    py: 5,
                    color: 'white',
                    background:
                        'linear-gradient(135deg, #080b2b 0%, #102b78 42%, #087cff 100%)',
                }}
            >
                {/* Decorative glow */}
                <Box
                    sx={{
                        position: 'absolute',
                        width: 500,
                        height: 500,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(55,150,255,0.35) 0%, rgba(55,150,255,0) 70%)',
                        right: -180,
                        bottom: -180,
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
                            background: 'rgba(255,255,255,0.10)',
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
                        mt: -8,
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
                        Start your
                        <br />
                        <Box
                            component="span"
                            sx={{
                                color: '#7ec8ff',
                            }}
                        >
                            smarter journey.
                        </Box>
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: '1rem',
                            lineHeight: 1.7,
                            color: 'rgba(255,255,255,0.72)',
                            maxWidth: 500,
                            mb: 4,
                        }}
                    >
                        Create your EduPilot account and turn complex learning
                        into simple, focused progress.
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1.5,
                            flexWrap: 'wrap',
                        }}
                    >
                        {['Smart Learning', 'AI Insights', 'Track Progress'].map(
                            (item) => (
                                <Box
                                    key={item}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        borderRadius: '999px',
                                        background:
                                            'rgba(255,255,255,0.08)',
                                        border:
                                            '1px solid rgba(255,255,255,0.12)',
                                        color: 'rgba(255,255,255,0.82)',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {item}
                                </Box>
                            )
                        )}
                    </Box>
                </Box>

                {/* Footer */}
                <Typography
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.45)',
                    }}
                >
                    © Developed By Srinivas
                </Typography>
            </Box>

            {/* RIGHT REGISTRATION PANEL */}
            <Box
                sx={{
                    width: { xs: '100%', md: '48%' },
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 3, sm: 6, md: 8 },
                    py: 5,
                    background: '#ffffff',
                }}
            >
                <Grow in={true} timeout={800}>
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 440,
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ mb: 4 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '14px',
                                    background:
                                        'linear-gradient(135deg, #0d6efd, #0066ff)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 2.5,
                                    boxShadow:
                                        '0 10px 25px rgba(13,110,253,0.20)',
                                }}
                            >
                                <LockOutlinedIcon sx={{ color: 'white' }} />
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: '2rem',
                                    fontWeight: 800,
                                    color: '#111827',
                                    letterSpacing: '-0.8px',
                                }}
                            >
                                Create your account
                            </Typography>

                            <Typography
                                sx={{
                                    mt: 1,
                                    color: '#6b7280',
                                    fontSize: '0.95rem',
                                }}
                            >
                                Join EduPilot and start your learning journey.
                            </Typography>
                        </Box>

                        {/* Form */}
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 2.5,
                                        borderRadius: '12px',
                                    }}
                                >
                                    {error}
                                </Alert>
                            )}

                            {success && (
                                <Alert
                                    severity="success"
                                    sx={{
                                        mb: 2.5,
                                        borderRadius: '12px',
                                    }}
                                >
                                    {success}
                                </Alert>
                            )}

                            <TextField
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        background: '#f8fafc',
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        background: '#f8fafc',
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Confirm Password"
                                type="password"
                                id="confirmPassword"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                disabled={loading}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        background: '#f8fafc',
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                sx={{
                                    mt: 1,
                                    mb: 2.5,
                                    height: 52,
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    background:
                                        'linear-gradient(135deg, #087cff, #075bd3)',
                                    boxShadow:
                                        '0 10px 25px rgba(8,124,255,0.20)',
                                    '&:hover': {
                                        background:
                                            'linear-gradient(135deg, #076ee0, #064fb8)',
                                    },
                                }}
                            >
                                {loading ? (
                                    <CircularProgress
                                        size={24}
                                        color="inherit"
                                    />
                                ) : (
                                    'Create my EduPilot account'
                                )}
                            </Button>

                            <Box
                                sx={{
                                    textAlign: 'center',
                                    pt: 1,
                                    borderTop: '1px solid #eef0f3',
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 2,
                                        color: '#6b7280',
                                    }}
                                >
                                    Already have an account?{' '}
                                    <RouterLink
                                        to="/login"
                                        style={{
                                            textDecoration: 'none',
                                            color: '#087cff',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Sign in
                                    </RouterLink>
                                </Typography>

                                <Typography
                                    sx={{
                                        mt: 3,
                                        fontSize: '0.72rem',
                                        color: '#9ca3af',
                                    }}
                                >
                                    Your learning journey starts here.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Grow>
            </Box>
        </Box>
    );
}

export default RegisterPage;