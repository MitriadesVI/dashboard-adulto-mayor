// App.js (Código Completo con ProfilePanel agregado)

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
import ProfilePanel from './components/profile/ProfilePanel';

// Componentes funcionales
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Servicios
import authService from './services/authService';
import activitiesService from './services/activitiesService';
import goalsService from './services/goalsService';
import localStorageService from './services/localStorageService';
import { startOfDay, endOfDay, parseActivityDate } from './utils/dates';
import { matchesActivityType } from './components/dashboard/common/helpers';

// Cambios del perfil que obligan a actualizar el usuario guardado localmente
const profileChanged = (a, b) =>
  ['email', 'role', 'contractor', 'name', 'adminType', 'active'].some(key => a?.[key] !== b?.[key]);

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
  // Estados de autenticación
  const [user, setUser] = useState(undefined); // undefined = verificando, null = no autenticado, objeto = autenticado
  const [loading, setLoading] = useState(true);
  const [authCompleted, setAuthCompleted] = useState(false);
  
  // Estados del dashboard (solo para distrito)
  const [activities, setActivities] = useState([]);
  const [goals, setGoals] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  
  // Estados de UI
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState(null);
  
  // Refs para controlar la inicialización
  const isInitialMount = useRef(true);

  // ✅ VERIFICACIÓN DE AUTENTICACIÓN MEJORADA
  useEffect(() => {
    const checkAuth = async () => {
      if (!isInitialMount.current) return;
      isInitialMount.current = false;
      
      console.log("🔍 Iniciando verificación de autenticación...");
      setLoading(true);
      setError(null);
      
      try {
        // Usuario guardado localmente: carga rápida y permite abrir la app sin conexión
        const localUser = localStorageService.getUser();
        if (localUser) {
          // Mostrar la app de inmediato; la sesión se verifica en segundo plano
          setUser(localUser);
          setLoading(false);
          setAuthCompleted(true);
        }

        try {
          const firebaseUser = await authService.getCurrentUser();
          if (firebaseUser) {
            if (!localUser || profileChanged(firebaseUser, localUser)) {
              setUser(firebaseUser);
              localStorageService.saveUser(firebaseUser);
            }
          } else {
            // Sin sesión en Firebase, o usuario sin perfil / desactivado
            if (localUser) {
              console.warn("⚠️ La sesión ya no es válida; se requiere iniciar sesión de nuevo");
              localStorageService.clearAll();
            }
            setUser(null);
          }
        } catch (verifyError) {
          // No se pudo verificar (sin conexión): se mantiene el usuario local si existe
          console.warn("⚠️ No se pudo verificar la sesión:", verifyError.message);
          if (!localUser) {
            setUser(null);
            setError("Error de conexión. Por favor inicie sesión nuevamente.");
          }
        }
      } catch (error) {
        console.error('❌ Error general en checkAuth:', error);
        setError("Error inesperado. Por favor recargue la aplicación.");
        setUser(null);
      } finally {
        setLoading(false);
        setAuthCompleted(true);
        console.log("✅ Verificación de autenticación completada");
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

  // ✅ CARGA DE DATOS DEL DASHBOARD MEJORADA
  const loadDashboardData = useCallback(async (filters = {}) => {
    // Solo cargar si hay usuario distrito y auth está completa
    if (!user || user.role !== 'district' || !authCompleted) {
      console.log("⏭️ Saltando carga de dashboard - usuario no es distrito o auth incompleta");
      return;
    }

    console.log("📊 Cargando datos del dashboard para:", user.email);
    setLoadingDashboard(true);
    
    try {
      const allActivitiesRaw = await activitiesService.getAllActivities();
      const approvedActivities = allActivitiesRaw.filter(a => a && a.status === 'approved');
      
      // Aplicar filtros
      let filtered = [...approvedActivities];
      
      if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
        filtered = filtered.filter(a => a && a.contractor === filters.contractor);
      }
      
      if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(a => matchesActivityType(a, filters.type));
      }
      
      if (filters.locationType && filters.locationType !== 'all') {
        filtered = filtered.filter(a => a && a.location && a.location.type === filters.locationType);
      }
      
      const startDate = filters.startDate ? startOfDay(filters.startDate) : null;
      const endDate = filters.endDate ? endOfDay(filters.endDate) : null;
      if (startDate) filtered = filtered.filter(a => a.date && a.date >= startDate);
      if (endDate) filtered = filtered.filter(a => a.date && a.date <= endDate);
      
      setActivities(filtered);
      
      // Metas anuales del contratista: se calculan con todas sus actividades aprobadas
      // del año (no dependen de los filtros de tipo, ubicación o fecha)
      if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
        try {
          const referenceDate = parseActivityDate(filters.endDate) || parseActivityDate(filters.startDate) || new Date();
          const year = referenceDate.getFullYear();
          const contractorApproved = approvedActivities.filter(a => a.contractor === filters.contractor);
          const goalsData = await goalsService.calculateProgress(filters.contractor, year, contractorApproved);
          setGoals(goalsData);
        } catch (error) {
          console.error("Error al cargar/calcular metas:", error);
          setGoals(null);
        }
      } else {
        setGoals(null);
      }
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      setError("Error al cargar datos. Intente recargar la página.");
      setActivities([]);
      setGoals(null);
    } finally {
      setLoadingDashboard(false);
    }
  }, [user, authCompleted]);

  // ✅ CARGAR DATOS INICIALES SOLO CUANDO AUTH ESTÉ COMPLETA
  useEffect(() => {
    if (user && user.role === 'district' && authCompleted) { 
      console.log("📊 Usuario distrito detectado, cargando datos iniciales...");
      loadDashboardData({
        contractor: 'all',
        type: 'all',
        locationType: 'all',
        startDate: '',
        endDate: ''
      });
    }
  }, [user, authCompleted, loadDashboardData]);

  // ✅ FUNCIONES DE LOGIN/LOGOUT MEJORADAS
  const handleLoginSuccess = (loggedInUser) => {
    console.log("✅ Login exitoso:", loggedInUser.email);
    setUser(loggedInUser); 
    localStorageService.saveUser(loggedInUser);
    setError(null);
    setAuthCompleted(true); // Marcar auth como completa
  };

  const handleLogout = async () => {
    const pendingCount = user ? localStorageService.getPendingActivities(user.uid).length : 0;
    if (pendingCount > 0) {
      const proceed = window.confirm(
        `Tiene ${pendingCount} actividad(es) registradas sin conexión que aún no se han enviado. ` +
        'Se conservarán en este dispositivo y se enviarán cuando vuelva a iniciar sesión con conexión. ¿Desea cerrar sesión?'
      );
      if (!proceed) return;
    }

    console.log("🚪 Cerrando sesión...");
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setError("Error al cerrar sesión. Los datos locales han sido eliminados.");
    } finally {
      localStorageService.clearAll();
      setUser(null);
      setActivities([]);
      setGoals(null);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  // ✅ PANTALLA DE CARGA MEJORADA
  if (loading || !authCompleted) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">Cargando la aplicación...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {user === undefined ? 'Verificando autenticación...' : 'Preparando interfaz...'}
        </Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {/* ✅ NAVBAR SOLO SI HAY USUARIO AUTENTICADO */}
        {user && <Navbar user={user} onLogout={handleLogout} offline={offline} />}
        
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: user ? 'calc(100vh - 64px - 56px)' : '100vh', 
            pt: user ? 0 : 0, 
            pb: user ? 0 : 0, 
          }}
        >
          {/* Mensajes de error */}
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
            {/* ✅ LOGIN - Solo mostrar si no hay usuario */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" /> : <Login onLoginSuccess={handleLoginSuccess} />} 
            />
            
            {/* ✅ RUTAS PROTEGIDAS - Pasar user como prop */}
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
            
            <Route path="/profile" element={
              <PrivateRoute user={user} allowedRoles={['field', 'contractor-admin', 'district']}>
                <ProfilePanel user={user} />
              </PrivateRoute>
            } />
            
            {/* ✅ RUTA PRINCIPAL - Navegación inteligente */}
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
            
            {/* ✅ 404 */}
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
        
        {/* ✅ FOOTER SOLO SI HAY USUARIO */}
        {user && <Footer />}
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;