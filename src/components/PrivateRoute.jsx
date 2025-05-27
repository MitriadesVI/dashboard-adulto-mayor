import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

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
    // Redirigir según el rol del usuario
    if (user.role === 'field') {
      return <Navigate to="/activities" replace />;
    } else if (user.role === 'contractor-admin') {
      return <Navigate to="/approval" replace />;
    } else if (user.role === 'district') {
      return <Navigate to="/dashboard" replace />;
    } else {
      // Si no coincide con ninguno conocido, ir a una página por defecto
      return <Navigate to="/" replace />;
    }
  }

  // Si el usuario tiene acceso, mostrar los componentes hijos
  return children;
};

export default PrivateRoute;