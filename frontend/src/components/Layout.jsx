import React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, #1e293b, #020617)'
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'rgba(15,23,42,0.9)',
          borderBottom: '1px solid rgba(148,163,184,0.2)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 600, letterSpacing: '0.06em' }}
          >
            FINANCE GUARD
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            {user?.role === 'admin' && (
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/admin')}
              >
                Admin
              </Button>
            )}
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/user')}
            >
              User
            </Button>
            {user && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main' }}>
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ maxWidth: 140 }} noWrap>
                  {user.email}
                </Typography>
              </Stack>
            )}
            <Button
              color="secondary"
              variant="contained"
              size="small"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          sx={{
            mb: 3,
            fontWeight: 700,
            background: 'linear-gradient(90deg,#e5e7eb,#a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {title}
        </Typography>
        {children}
      </Container>
    </Box>
  );
}

