import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { HOME_BY_ROLE } from '../config/roles';

const PrivateRoute = ({ children, allowedRoles = [], user }) => {
  // Si no hay usuario definido, mostrar loading (App.js aún está verificando auth)
  if (user === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles permitidos y el usuario no tiene ninguno de ellos
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirigir a la página de inicio de su rol
    const home = HOME_BY_ROLE[user.role];
    return <Navigate to={home || '/login'} replace />;
  }

  // Si el usuario tiene acceso, mostrar los componentes hijos
  return children;
};

export default PrivateRoute;