// App.js (Código Completo Mejorado)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { esES } from '@mui/material/locale';
import { Box, CircularProgress, Typography, Alert, Snackbar } from '@mui/material';

// Componentes de páginas
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import ActivitiesPage from './components/pages/ActivitiesPage';
import ApprovalPanel from './components/approval/ApprovalPanel';
import AdminPanel from './components/pages/AdminPanel';
import DiagnosticPage from './components/DiagnosticPage';

// Componentes funcionales
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Servicios
import authService from './services/authService';
import activitiesService from './services/activitiesService';
import goalsService from './services/goalsService';
import localStorageService from './services/localStorageService';

// Tema personalizado de Material UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#673ab7',
    },
    success: {
      main: '#2e7d32'
    },
    error: {
      main: '#d32f2f'
    },
    warning: {
      main: '#ed6c02'
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
}, esES);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState(null);
  
  // Refs para controlar la inicialización
  const isInitialMount = useRef(true);
  const authCheckCompleted = useRef(false);

  // Comprobar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (!isInitialMount.current) return;
      isInitialMount.current = false;
      
      console.log("Iniciando verificación de autenticación...");
      setLoading(true);
      setError(null);
      
      // Agregar un timeout de seguridad para evitar carga infinita
      const authTimeout = setTimeout(() => {
        console.log("Timeout de autenticación activado, continuando con usuario local si existe");
        setLoading(false);
        const localUser = localStorageService.getUser();
        if (localUser) {
          console.log("Usando usuario de localStorage debido a timeout:", localUser.email);
          setUser(localUser);
        }
      }, 8000); // 8 segundos de timeout
      
      try {
        // Primero intentar obtener usuario de localStorage para carga rápida
        const localUser = localStorageService.getUser();
        
        if (localUser) {
          console.log("Usuario encontrado en localStorage:", localUser.email);
          setUser(localUser);
          clearTimeout(authTimeout); // Limpiar el timeout ya que tenemos usuario
          setLoading(false); // Quitar estado de carga aquí también
          
          // Luego verificar con Firebase para confirmar/actualizar
          try {
            console.log("Verificando usuario con Firebase en segundo plano...");
            const firebaseUser = await authService.getCurrentUser();
            
            if (firebaseUser) {
              console.log("Usuario verificado en Firebase:", firebaseUser.email);
              // Actualizar el usuario si hay cambios
              setUser(firebaseUser);
              localStorageService.saveUser(firebaseUser);
            } else {
              console.warn("Firebase no tiene usuario autenticado pero existe en localStorage");
              // Podemos mantener el usuario local o limpiar según preferencia
              // Por ahora lo mantenemos hasta que el usuario haga logout explícito
            }
          } catch (firebaseError) {
            console.error("Error al verificar con Firebase:", firebaseError);
            setError("Error de conexión. Usando datos locales.");
            // Mantenemos el usuario local por ahora
          }
        } else {
          console.log("No hay usuario en localStorage, verificando con Firebase...");
          try {
            const firebaseUser = await authService.getCurrentUser();
            clearTimeout(authTimeout); // Limpiar el timeout
            
            if (firebaseUser) {
              console.log("Usuario encontrado en Firebase:", firebaseUser.email);
              setUser(firebaseUser);
              localStorageService.saveUser(firebaseUser);
            } else {
              console.log("No hay usuario autenticado en Firebase");
              setUser(null);
            }
          } catch (firebaseError) {
            console.error("Error al verificar con Firebase:", firebaseError);
            setError("Error de conexión. Por favor inicie sesión nuevamente.");
            setUser(null);
          } finally {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error general en checkAuth:', error);
        setError("Error inesperado. Por favor recargue la aplicación.");
        setUser(null);
        clearTimeout(authTimeout);
        setLoading(false);
      } finally {
        authCheckCompleted.current = true;
        console.log("Verificación de autenticación completada.");
      }
    };

    checkAuth();
    
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Función para cargar datos del dashboard
  const loadDashboardData = useCallback(async (filters = {}) => {
    console.log("loadDashboardData llamado, verificando usuario...");
    
    // Verificar usuario actual
    const currentUser = user || localStorageService.getUser();
    
    if (!currentUser) {
      console.warn("No hay usuario disponible para cargar datos del dashboard");
      setActivities([]);
      setGoals(null);
      return;
    }
    
    if (currentUser.role !== 'district') {
      console.warn(`Usuario con rol ${currentUser.role} no tiene permiso para ver el dashboard`);
      setActivities([]);
      setGoals(null);
      return;
    }

    console.log("Cargando datos del dashboard para:", currentUser.email);
    console.log("Filtros aplicados:", filters);
    setLoadingDashboard(true);
    
    try {
      // Obtener todas las actividades primero
      console.log("Obteniendo todas las actividades...");
      const allActivitiesRaw = await activitiesService.getAllActivities();
      console.log(`Se encontraron ${allActivitiesRaw.length} actividades en total`);
      
      // Filtrar por aprobadas
      const approvedActivities = allActivitiesRaw.filter(a => a && a.status === 'approved');
      console.log(`De esas, ${approvedActivities.length} están aprobadas`);
      
      // Aplicar filtros adicionales en memoria
      let filtered = [...approvedActivities];
      
      if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
        filtered = filtered.filter(a => a && a.contractor === filters.contractor);
        console.log(`Después de filtrar por contratista ${filters.contractor}: ${filtered.length} actividades`);
      }
      
      if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(a => a && a.type === filters.type);
        console.log(`Después de filtrar por tipo ${filters.type}: ${filtered.length} actividades`);
      }
      
      if (filters.locationType && filters.locationType !== 'all') {
        filtered = filtered.filter(a => a && a.location && a.location.type === filters.locationType);
        console.log(`Después de filtrar por ubicación ${filters.locationType}: ${filtered.length} actividades`);
      }
      
      if (filters.startDate) {
        try {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0,0,0,0);
          filtered = filtered.filter(a => {
            if (!a || !a.date) return false;
            const activityDate = new Date(a.date);
            return !isNaN(activityDate.getTime()) && activityDate >= startDate;
          });
          console.log(`Después de filtrar por fecha inicial ${filters.startDate}: ${filtered.length} actividades`);
        } catch (e) {
          console.error("Error filtrando por fecha inicial:", filters.startDate, e);
        }
      }
      
      if (filters.endDate) {
        try {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23,59,59,999);
          filtered = filtered.filter(a => {
            if (!a || !a.date) return false;
            const activityDate = new Date(a.date);
            return !isNaN(activityDate.getTime()) && activityDate <= endDate;
          });
          console.log(`Después de filtrar por fecha final ${filters.endDate}: ${filtered.length} actividades`);
        } catch (e) {
          console.error("Error filtrando por fecha final:", filters.endDate, e);
        }
      }
      
      setActivities(filtered);
      console.log(`Actividades establecidas en el estado: ${filtered.length}`);
      
      // Cargar metas si se especifica un contratista
      if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
        try {
          const year = new Date().getFullYear();
          const goalsData = await goalsService.calculateProgress(filters.contractor, year, filtered);
          setGoals(goalsData);
          console.log("Metas calculadas para el contratista:", filters.contractor);
        } catch (error) {
          console.error("Error al cargar/calcular metas:", error);
          setGoals(null);
        }
      } else {
        setGoals(null);
      }
    } catch (error) {
      console.error('Error general al cargar datos del dashboard:', error);
      setError("Error al cargar datos. Intente recargar la página.");
      setActivities([]);
      setGoals(null);
    } finally {
      setLoadingDashboard(false);
      console.log("Carga de datos del dashboard finalizada.");
    }
  }, [user]);

  // Cargar datos del dashboard cuando cambia el usuario
  useEffect(() => {
    if (user && user.role === 'district' && authCheckCompleted.current) { 
      console.log("Usuario district detectado, cargando datos iniciales del dashboard...");
      // Pequeño retraso para asegurar que todo está inicializado
      const timer = setTimeout(() => {
        loadDashboardData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loadDashboardData]);

  // Funciones para login y logout
  const handleLoginSuccess = (loggedInUser) => {
    console.log("Login exitoso:", loggedInUser.email);
    setUser(loggedInUser); 
    localStorageService.saveUser(loggedInUser);
    setError(null); 
  };

  const handleLogout = async () => {
    console.log("Cerrando sesión...");
    try {
      await authService.logout();
      setUser(null);
      localStorageService.clearAll();
      console.log("Sesión cerrada y datos locales eliminados");
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setError("Error al cerrar sesión. Los datos locales han sido eliminados.");
      // Aún así limpiamos datos locales
      localStorageService.clearAll();
      setUser(null);
    }
  };

  // Cerrar mensajes de error
  const handleCloseError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">Cargando la aplicación...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Verificando autenticación
        </Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {user && <Navbar user={user} onLogout={handleLogout} offline={offline} />}
        
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: user ? 'calc(100vh - 64px - 56px)' : '100vh', 
            pt: user ? 0 : 0, 
            pb: user ? 0 : 0, 
          }}
        >
          {/* Mensajes de error persistentes */}
          <Snackbar 
            open={!!error} 
            autoHideDuration={6000} 
            onClose={handleCloseError}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          </Snackbar>
          
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" /> : <Login onLoginSuccess={handleLoginSuccess} />} 
            />
            
            <Route path="/activities" element={
              <PrivateRoute user={user} allowedRoles={['field', 'contractor-admin', 'district']}> 
                <ActivitiesPage user={user} />
              </PrivateRoute>
            } />
            
            <Route path="/approval" element={
              <PrivateRoute user={user} allowedRoles={['contractor-admin']}>
                <ApprovalPanel user={user} />
              </PrivateRoute>
            } />
            
            <Route path="/dashboard" element={
              <PrivateRoute user={user} allowedRoles={['district']}>
                <Dashboard 
                  user={user} 
                  activities={activities} 
                  goals={goals} 
                  loading={loadingDashboard}
                  onFilterChange={loadDashboardData} 
                />
              </PrivateRoute>
            } />
            
            <Route path="/admin" element={
              <PrivateRoute user={user} allowedRoles={['district']}> 
                <AdminPanel user={user} />
              </PrivateRoute>
            } />
            
            <Route path="/diagnostic" element={
              <PrivateRoute user={user} allowedRoles={['district']}>
                <DiagnosticPage />
              </PrivateRoute>
            } />
            
            <Route 
              path="/" 
              element={
                !user ? <Navigate to="/login" replace /> : 
                user.role === 'field' ? <Navigate to="/activities" replace /> :
                user.role === 'contractor-admin' ? <Navigate to="/approval" replace /> :
                user.role === 'district' ? <Navigate to="/dashboard" replace /> :
                <Navigate to="/login" replace /> 
              } 
            />
            
            <Route path="*" element={
              <Box sx={{ p: 4, textAlign: 'center', mt: user ? 8 : 0 }}>
                <Typography variant="h4" gutterBottom>
                  404 - Página no encontrada
                </Typography>
                <Typography variant="body1">
                  La página que estás buscando no existe o no tienes permiso para accederla.
                </Typography>
              </Box>
            } />
          </Routes>
        </Box>
        
        {user && <Footer />}
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;