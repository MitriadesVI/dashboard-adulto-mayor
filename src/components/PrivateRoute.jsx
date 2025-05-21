import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { auth } from '../firebase/config';
import authService from '../services/authService';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si hay un usuario autenticado en Firebase
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            // Obtener datos completos del usuario de Firestore
            const userData = await authService.getCurrentUser();
            setUser(userData);
          } else {
            setUser(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no hay usuario, redirigir al login
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