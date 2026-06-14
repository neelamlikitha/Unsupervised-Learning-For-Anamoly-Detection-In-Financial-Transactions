import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddCardIcon from '@mui/icons-material/AddCard';
import ShieldIcon from '@mui/icons-material/Shield';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

const DRAWER_WIDTH = 230;

export const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',        icon: <DashboardIcon /> },
  { id: 'transactions',  label: 'My Transactions',  icon: <ReceiptLongIcon /> },
  { id: 'analytics',     label: 'Analytics',        icon: <BarChartIcon /> },
  { id: 'simulate',      label: 'Simulate',         icon: <AddCardIcon /> },
  { id: 'risk-report',   label: 'Risk Report',      icon: <ShieldIcon /> }
];

export default function UserLayout({ active, onNavigate, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            letterSpacing: '0.1em',
            background: 'linear-gradient(90deg,#e5e7eb,#a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          FINANCE GUARD
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>
          User Portal
        </Typography>
      </Box>

      {/* User info */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#4f46e5', fontSize: '0.9rem' }}>
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ color: '#e5e7eb', fontWeight: 600 }} noWrap>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.7)' }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', mx: 2, my: 1 }} />

      {/* Nav */}
      <List sx={{ px: 1, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <ListItemButton
              key={item.id}
              onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: 1.5,
                py: 1,
                color: isActive ? '#fff' : 'rgba(148,163,184,0.8)',
                background: isActive
                  ? 'linear-gradient(90deg,rgba(79,70,229,0.9),rgba(139,92,246,0.7))'
                  : 'transparent',
                '&:hover': {
                  background: isActive
                    ? 'linear-gradient(90deg,rgba(79,70,229,0.9),rgba(139,92,246,0.7))'
                    : 'rgba(79,70,229,0.15)'
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? '#fff' : 'rgba(148,163,184,0.6)',
                  minWidth: 36
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', mx: 2, my: 1 }} />

      {/* Bottom actions */}
      <Box sx={{ px: 1, pb: 2 }}>
        {user?.role === 'admin' && (
          <ListItemButton
            onClick={() => navigate('/admin')}
            sx={{ borderRadius: 2, mb: 0.5, px: 1.5, py: 1, color: 'rgba(148,163,184,0.8)' }}
          >
            <ListItemIcon sx={{ color: '#22c55e', minWidth: 36 }}>
              <AdminPanelSettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Admin Portal"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </ListItemButton>
        )}
        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: 2, px: 1.5, py: 1, color: 'rgba(148,163,184,0.8)' }}
        >
          <ListItemIcon sx={{ color: '#ef4444', minWidth: 36 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at top left,#1e293b,#020617)' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: 'none' },
          background: 'rgba(15,23,42,0.95)',
          borderBottom: '1px solid rgba(148,163,184,0.15)',
          backdropFilter: 'blur(10px)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '0.06em', flexGrow: 1 }}>
            FINANCE GUARD
          </Typography>
          <Tooltip title="Logout">
            <IconButton color="inherit" size="small" onClick={handleLogout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            background: 'rgba(10,15,30,0.98)',
            border: 'none',
            borderRight: '1px solid rgba(148,163,184,0.15)'
          }
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            background: 'rgba(10,15,30,0.97)',
            border: 'none',
            borderRight: '1px solid rgba(148,163,184,0.12)'
          }
        }}
        open
      >
        {sidebarContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          mt: { xs: '56px', md: 0 },
          minWidth: 0
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
