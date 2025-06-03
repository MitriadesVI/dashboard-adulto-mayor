import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Button, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider,
  ListItemIcon,
  Badge,
  Tooltip
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudOffIcon from '@mui/icons-material/CloudOff';

const Navbar = ({ user, onLogout, offline }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const handleLogout = async () => {
    handleMenuClose();
    await onLogout();
    navigate('/login');
  };
  
  // Determinar los elementos de navegación según el rol
  const getNavItems = () => {
    if (user.role === 'field') {
      return [
        { label: 'Mis Actividades', path: '/activities', icon: <AssignmentIcon /> }
      ];
    } else if (user.role === 'contractor-admin') {
      return [
        { label: 'Aprobación', path: '/approval', icon: <CheckCircleIcon /> }
      ];
    } else if (user.role === 'district') {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
        { label: 'Administración', path: '/admin', icon: <AdminPanelSettingsIcon /> }
      ];
    }
    return [];
  };
  
  const navItems = getNavItems();
  
  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo/Título */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ 
            textDecoration: 'none',
            color: 'white',
            flexGrow: { xs: 1, md: 0 },
            mr: 2
          }}
        >
          Adulto Mayor
        </Typography>
        
        {/* Botón de menú móvil */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleMobileMenuToggle}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        {/* Links de navegación - Escritorio */}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              sx={{ 
                color: 'white',
                mx: 1,
                backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
              }}
              startIcon={item.icon}
            >
              {item.label}
            </Button>
          ))}
        </Box>
        
        {/* Indicador de Conexión */}
        <Tooltip title={offline ? "Sin conexión" : "Conectado"}>
          <Badge
            color={offline ? "error" : "success"}
            variant="dot"
            sx={{ mr: 2 }}
          >
            {offline ? <CloudOffIcon /> : null}
          </Badge>
        </Tooltip>
        
        {/* Avatar y menú de usuario */}
        <Box>
          <IconButton
            onClick={handleMenuClick}
            sx={{ p: 0 }}
            aria-controls="user-menu"
            aria-haspopup="true"
          >
            <Avatar sx={{ bgcolor: user.role === 'field' ? 'primary.main' : user.role === 'contractor-admin' ? 'secondary.main' : 'success.main' }}>
              {user.name ? user.name.charAt(0).toUpperCase() : <AccountCircleIcon />}
            </Avatar>
          </IconButton>
          
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <Box>
                <Typography variant="body1">{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.contractor} - {user.role === 'field' ? 'Personal de Campo' : 
                   user.role === 'contractor-admin' ? 'Representante Legal' : 'Funcionario Distrital'}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            {navItems.map((item) => (
              <MenuItem 
                key={item.path} 
                onClick={() => {
                  handleMenuClose();
                  navigate(item.path);
                }}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                {item.label}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={() => {
              handleMenuClose();
              navigate('/profile');
            }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Mi Perfil
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      
      {/* Menú móvil */}
      {mobileMenuOpen && (
        <Box sx={{ display: { xs: 'block', md: 'none' }, bgcolor: 'primary.dark', p: 2 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              sx={{ 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                textAlign: 'left',
                py: 1,
                px: 2,
                backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
              }}
              startIcon={item.icon}
              onClick={handleMobileMenuToggle}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      )}
    </AppBar>
  );
};

export default Navbar;