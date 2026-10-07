import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import authService from '../../services/authService';
import localStorageService from '../../services/localStorageService';

const Login = ({ onLoginSuccess }) => { // ← RECIBIR LA PROP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Dirección de correo electrónico inválida')
        .required('El correo electrónico es obligatorio'),
      password: Yup.string()
        .required('La contraseña es obligatoria')
    }),
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      
      try {
        console.log("🔑 Intentando login con:", values.email);
        const user = await authService.login(values.email, values.password);
        
        console.log("✅ Login exitoso en Login.jsx:", user.email, "Rol:", user.role);
        
        // Guardar usuario en localStorage
        localStorageService.saveUser(user);
        console.log("💾 Usuario guardado en localStorage");
        
        // ✅ LLAMAR A onLoginSuccess ANTES DE NAVEGAR
        if (onLoginSuccess) {
          console.log("📞 Llamando onLoginSuccess...");
          onLoginSuccess(user);
        }
        
        // ✅ NAVEGACIÓN AUTOMÁTICA BASADA EN ROLES
        // App.js se encargará de la navegación automática, pero por si acaso:
        setTimeout(() => {
          if (user.role === 'district') {
            navigate('/dashboard');
          } else if (user.role === 'contractor-admin') {
            navigate('/approval');
          } else {
            navigate('/activities');
          }
        }, 100); // Pequeño delay para que App.js procese primero
        
      } catch (error) {
        console.error('❌ Error de inicio de sesión:', error);
        
        // Manejar diferentes tipos de errores de autenticación de Firebase
        if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/invalid-email'].includes(error.code)) {
          setError('Correo electrónico o contraseña incorrectos');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Demasiados intentos fallidos. Intente de nuevo más tarde');
        } else if (error.code === 'auth/user-disabled' || error.code === 'app/user-disabled') {
          setError('Su cuenta está desactivada. Contacte al administrador.');
        } else if (error.code === 'app/no-profile') {
          setError(error.message);
        } else if (error.code === 'auth/network-request-failed') {
          setError('Sin conexión a internet. Verifique su conexión e intente de nuevo.');
        } else {
          setError('Error al iniciar sesión. Por favor, intente de nuevo.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const handleForgotPassword = async () => {
    if (!formik.values.email) {
      setError('Ingrese su correo electrónico para restablecer la contraseña');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await authService.resetPassword(formik.values.email);
      alert('Se ha enviado un correo para restablecer su contraseña');
    } catch (error) {
      console.error('Error al enviar correo de restablecimiento:', error);
      setError('Error al enviar correo de restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 8
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2
          }}
        >
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Programa Adulto Mayor
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sistema de Seguimiento de Actividades
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Correo Electrónico"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Contraseña"
                  type="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ mt: 1, mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
                </Button>
              </Grid>
              
            </Grid>
          </form>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ cursor: 'pointer' }}
            >
              ¿Olvidó su contraseña?
            </Link>
          </Box>
        </Paper>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Distrito de Barranquilla &copy; {new Date().getFullYear()}
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;