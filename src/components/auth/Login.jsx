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

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Función para crear un usuario administrador (SOLO PARA DESARROLLO)
  const createAdminUser = async () => {
    setLoading(true);
    setError('');
    try {
      const email = "admin@ejemplo.com"; // Cambia esto al correo que prefieras
      const password = "Admin1234!"; // Cambia esto a una contraseña segura
      
      const userData = {
        name: "Administrador",
        role: "district",
        contractor: "DISTRITO",
        active: true
      };
      
      await authService.registerUser(email, password, userData);
      
      alert(`Usuario administrador creado con éxito:\nEmail: ${email}\nContraseña: ${password}\n\nGuarda esta información antes de continuar.`);
    } catch (error) {
      console.error('Error al crear usuario administrador:', error);
      setError('Error al crear usuario administrador: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  // Función para crear un usuario representante legal de contratista
  const createContractorAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const email = "cuc@ejemplo.com";
      const password = "Cuc1234!";
      
      const userData = {
        name: "Representante CUC",
        role: "contractor-admin",
        contractor: "CUC",
        active: true
      };
      
      await authService.registerUser(email, password, userData);
      
      alert(`Usuario representante creado con éxito:\nEmail: ${email}\nContraseña: ${password}\n\nGuarda esta información antes de continuar.`);
    } catch (error) {
      console.error('Error al crear usuario representante:', error);
      setError('Error al crear usuario representante: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  // Función para crear un usuario de campo
  const createFieldUser = async () => {
    setLoading(true);
    setError('');
    try {
      const email = "campo@ejemplo.com";
      const password = "Campo1234!";
      
      const userData = {
        name: "Usuario de Campo",
        role: "field",
        contractor: "CUC",
        active: true
      };
      
      await authService.registerUser(email, password, userData);
      
      alert(`Usuario de campo creado con éxito:\nEmail: ${email}\nContraseña: ${password}\n\nGuarda esta información antes de continuar.`);
    } catch (error) {
      console.error('Error al crear usuario de campo:', error);
      setError('Error al crear usuario de campo: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

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
        const user = await authService.login(values.email, values.password);
        
        // Guardar usuario en localStorage
        localStorageService.saveUser(user);
        
        // Redirigir según el rol
        if (user.role === 'district') {
          navigate('/dashboard');
        } else if (user.role === 'contractor-admin') {
          navigate('/approval');
        } else {
          navigate('/activities');
        }
      } catch (error) {
        console.error('Error de inicio de sesión:', error);
        
        // Manejar diferentes tipos de errores de autenticación de Firebase
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          setError('Correo electrónico o contraseña incorrectos');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Demasiados intentos fallidos. Intente de nuevo más tarde');
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
              
              {/* Botones para crear usuarios (solo para desarrollo) */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" align="center" gutterBottom>
                  Herramientas de Desarrollo (Remover en Producción)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      color="primary"
                      onClick={createAdminUser}
                      disabled={loading}
                      size="small"
                    >
                      Crear Admin
                    </Button>
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      onClick={createContractorAdmin}
                      disabled={loading}
                      size="small"
                    >
                      Crear Representante
                    </Button>
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      color="info"
                      onClick={createFieldUser}
                      disabled={loading}
                      size="small"
                    >
                      Crear Usuario Campo
                    </Button>
                  </Grid>
                </Grid>
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