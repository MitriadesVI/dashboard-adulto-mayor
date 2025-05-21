/**
 * Servicio para manejar el almacenamiento local
 * Útil para guardar actividades cuando no hay conexión y sincronizar después
 */

const KEYS = {
    USER: 'adultosm_user',
    PENDING_ACTIVITIES: 'adultosm_pending_activities',
    DASHBOARD_FILTERS: 'adultosm_dashboard_filters',
    FORM_DRAFT: 'adultosm_form_draft'
  };
  
  const localStorageService = {
    /**
     * Guarda información del usuario actual
     * @param {Object} user - Objeto con datos del usuario
     */
    // --- FUNCIÓN saveUser MODIFICADA ---
    saveUser: (user) => {
      try {
        if (!user) {
          localStorage.removeItem(KEYS.USER);
          console.log("Usuario eliminado de localStorage");
          return;
        }
        
        const userData = { ...user };
        
        // Eliminar campos no serializables o convertir Timestamps a ISOString
        if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
          userData.createdAt = userData.createdAt.toDate().toISOString();
        } else if (userData.createdAt && userData.createdAt._seconds) { // Manejar si ya es un objeto simple de Firestore Timestamp
            userData.createdAt = new Date(userData.createdAt._seconds * 1000).toISOString();
        }

        if (userData.lastLogin && typeof userData.lastLogin.toDate === 'function') {
          userData.lastLogin = userData.lastLogin.toDate().toISOString();
        } else if (userData.lastLogin && userData.lastLogin._seconds) { // Manejar si ya es un objeto simple de Firestore Timestamp
            userData.lastLogin = new Date(userData.lastLogin._seconds * 1000).toISOString();
        }
        
        // Añadir timestamp para poder verificar frescura de los datos
        userData._savedAt = new Date().toISOString();
        
        localStorage.setItem(KEYS.USER, JSON.stringify(userData));
        console.log("Usuario guardado en localStorage:", userData.email);
      } catch (error) {
        console.error('Error al guardar usuario en localStorage:', error);
      }
    },
    // --- FIN FUNCIÓN saveUser MODIFICADA ---
    
    /**
     * Obtiene información del usuario guardado
     * @returns {Object|null} Datos del usuario o null si no hay ninguno
     */
    // --- FUNCIÓN getUser MODIFICADA ---
    getUser: () => {
      try {
        const userDataString = localStorage.getItem(KEYS.USER); // Renombrado para claridad
        if (!userDataString) {
          console.log("No hay usuario en localStorage");
          return null;
        }
        
        const user = JSON.parse(userDataString);
        console.log("Usuario recuperado de localStorage:", user.email);
        
        // Verificar si los datos son demasiado antiguos (opcional, más de 24h)
        if (user._savedAt) { // Verificar que _savedAt exista
            const savedAt = new Date(user._savedAt);
            const now = new Date();
            // Verificar que savedAt es una fecha válida
            if (!isNaN(savedAt.getTime())) {
                const hoursSinceSaved = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
                
                if (hoursSinceSaved > 24) {
                  console.warn(`Datos de usuario en localStorage son antiguos: ${hoursSinceSaved.toFixed(2)} horas. Usuario: ${user.email}`);
                }
            } else {
                console.warn("El campo _savedAt del usuario en localStorage no es una fecha válida.");
            }
        } else {
            console.log("El usuario en localStorage no tiene timestamp _savedAt para verificar frescura.");
        }
        
        // Convertir campos de fecha ISOString de vuelta a objetos Date si es necesario al usarlos
        // Por ejemplo, si al usar user.createdAt se espera un objeto Date:
        // if (user.createdAt && typeof user.createdAt === 'string') {
        //   user.createdAt = new Date(user.createdAt);
        // }
        // if (user.lastLogin && typeof user.lastLogin === 'string') {
        //   user.lastLogin = new Date(user.lastLogin);
        // }
        // Esta conversión es opcional y depende de cómo uses estos campos después de obtenerlos.
        // Por ahora, se devuelven como strings ISO si se guardaron así.

        return user;
      } catch (error) {
        console.error('Error al obtener usuario de localStorage:', error);
        return null;
      }
    },
    // --- FIN FUNCIÓN getUser MODIFICADA ---
    
    /**
     * Guarda una actividad pendiente cuando no hay conexión
     * @param {Object} activity - Datos de la actividad a guardar
     */
    savePendingActivity: (activity) => {
      try {
        const pendingActivities = localStorageService.getPendingActivities();
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // ID temporal más único
        
        // Asegurarse de que el objeto activity que se guarda no tenga Timestamps de Firestore sin convertir
        const activityToSave = { ...activity };
        if (activityToSave.createdAt && typeof activityToSave.createdAt.toDate === 'function') {
            activityToSave.createdAt = activityToSave.createdAt.toDate().toISOString();
        } else if (!activityToSave.createdAt) { // Si se está creando offline, ponerle un createdAt
            activityToSave.createdAt = new Date().toISOString();
        }
        // Hacer lo mismo para otros campos de fecha si los tienes (ej. activity.date)

        pendingActivities.push({
          ...activityToSave,
          id: tempId, // Usar el id temporal generado
          status: 'offline_pending' // Un estado más específico para actividades guardadas offline
        });
        
        localStorage.setItem(KEYS.PENDING_ACTIVITIES, JSON.stringify(pendingActivities));
        return tempId;
      } catch (error) {
        console.error('Error al guardar actividad pendiente:', error);
        throw error; // Re-lanzar para que el llamador sepa que falló
      }
    },
    
    /**
     * Obtiene todas las actividades pendientes de sincronización
     * @returns {Array} Lista de actividades pendientes
     */
    getPendingActivities: () => {
      try {
        const activitiesData = localStorage.getItem(KEYS.PENDING_ACTIVITIES);
        return activitiesData ? JSON.parse(activitiesData) : [];
      } catch (error) {
        console.error('Error al obtener actividades pendientes:', error);
        return [];
      }
    },
    
    /**
     * Elimina una actividad pendiente después de sincronizarla
     * @param {String} tempId - ID temporal de la actividad
     */
    removePendingActivity: (tempId) => {
      try {
        const pendingActivities = localStorageService.getPendingActivities();
        const updatedActivities = pendingActivities.filter(activity => activity.id !== tempId);
        
        localStorage.setItem(KEYS.PENDING_ACTIVITIES, JSON.stringify(updatedActivities));
      } catch (error) {
        console.error('Error al eliminar actividad pendiente:', error);
      }
    },
    
    /**
     * Guarda un borrador del formulario de actividad
     * @param {Object} formData - Datos del formulario
     */
    saveFormDraft: (formData) => {
      try {
        localStorage.setItem(KEYS.FORM_DRAFT, JSON.stringify(formData));
      } catch (error) {
        console.error('Error al guardar borrador del formulario:', error);
      }
    },
    
    /**
     * Obtiene el borrador guardado del formulario
     * @returns {Object|null} Datos del borrador o null si no hay ninguno
     */
    getFormDraft: () => {
      try {
        const draftData = localStorage.getItem(KEYS.FORM_DRAFT);
        return draftData ? JSON.parse(draftData) : null;
      } catch (error) {
        console.error('Error al obtener borrador del formulario:', error);
        return null;
      }
    },
    
    /**
     * Elimina el borrador del formulario
     */
    clearFormDraft: () => {
      try {
        localStorage.removeItem(KEYS.FORM_DRAFT);
      } catch (error) {
        console.error('Error al eliminar borrador del formulario:', error);
      }
    },
    
    /**
     * Guarda los filtros del dashboard
     * @param {Object} filters - Configuración de filtros
     */
    saveDashboardFilters: (filters) => {
      try {
        localStorage.setItem(KEYS.DASHBOARD_FILTERS, JSON.stringify(filters));
      } catch (error) {
        console.error('Error al guardar filtros del dashboard:', error);
      }
    },
    
    /**
     * Obtiene los filtros guardados del dashboard
     * @returns {Object} Configuración de filtros guardada
     */
    getDashboardFilters: () => {
      try {
        const filtersData = localStorage.getItem(KEYS.DASHBOARD_FILTERS);
        
        if (filtersData) {
          return JSON.parse(filtersData);
        }
        
        return {
          contractor: 'all',
          type: 'all',
          locationType: 'all',
          dateRange: [], // O quizás startDate: '', endDate: ''
          // Asegúrate que los valores por defecto coincidan con lo que espera el Dashboard
        };
      } catch (error) {
        console.error('Error al obtener filtros del dashboard:', error);
        return {
          contractor: 'all',
          type: 'all',
          locationType: 'all',
          dateRange: [],
        };
      }
    },
    
    /**
     * Verifica si hay conexión a Internet
     * @returns {Boolean} true si hay conexión, false si no
     */
    isOnline: () => {
      return navigator.onLine;
    },
    
    /**
     * Limpia todos los datos de localStorage definidos por esta app
     */
    clearAll: () => {
      try {
        console.log("Limpiando datos de localStorage para la aplicación...");
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
        console.log("LocalStorage de la aplicación limpiado.");
      } catch (error) {
        console.error('Error al limpiar localStorage:', error);
      }
    }
  };
  
  export default localStorageService;