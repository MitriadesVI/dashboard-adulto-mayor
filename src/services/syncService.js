import localStorageService from './localStorageService';
import activitiesService from './activitiesService';

// Evita dos sincronizaciones simultáneas (botón + evento 'online'), que subirían duplicados
let syncInProgress = null;

const syncService = {
  /**
   * Sincroniza las actividades del usuario guardadas localmente cuando no había conexión
   * @param {Object} user - Datos del usuario actual
   * @returns {Object} Resultado de la sincronización
   */
  syncPendingActivities: async (user) => {
    if (syncInProgress) return syncInProgress;

    syncInProgress = (async () => {
      try {
        const pendingActivities = localStorageService.getPendingActivities(user?.uid);
        
        if (pendingActivities.length === 0) {
          return { success: true, synced: 0, failed: 0, total: 0 };
        }
        
        let synced = 0;
        let failed = 0;
        
        for (const pending of pendingActivities) {
          const { id: tempId, status, ...activity } = pending;
          try {
            await activitiesService.createActivity(activity);
            localStorageService.removePendingActivity(tempId);
            synced++;
          } catch (error) {
            console.error('Error al sincronizar actividad:', error);
            failed++;
          }
        }
        
        return {
          success: failed === 0,
          synced,
          failed,
          total: pendingActivities.length
        };
      } catch (error) {
        console.error('Error durante la sincronización:', error);
        return { success: false, synced: 0, failed: 0, error: error.message };
      } finally {
        syncInProgress = null;
      }
    })();

    return syncInProgress;
  },
  
  /**
   * Configura listeners para sincronización automática cuando se restaura la conexión
   * @param {Function} onSync - Callback para ejecutar después de sincronizar
   * @param {Object} user - Datos del usuario
   * @returns {Function} Función para remover listeners
   */
  setupAutoSync: (onSync, user) => {
    const handleOnline = async () => {
      try {
        // Solo sincronizar si hay actividades pendientes
        const pendingActivities = localStorageService.getPendingActivities(user?.uid);
        if (pendingActivities.length > 0) {
          await syncService.syncPendingActivities(user);
          
          // Ejecutar callback si existe
          if (typeof onSync === 'function') {
            onSync();
          }
        }
      } catch (error) {
        console.error('Error durante la sincronización automática:', error);
      }
    };
    
    // Agregar listener para eventos de conexión
    window.addEventListener('online', handleOnline);
    
    // Retornar función para limpiar
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  },
  
  /**
   * Verifica si hay actividades pendientes de sincronizar
   * @returns {Number} Número de actividades pendientes
   */
  checkPendingActivities: (uid) => {
    return localStorageService.getPendingActivities(uid).length;
  },
  
  /**
   * Verifica si el dispositivo tiene conexión
   * @returns {Boolean} true si hay conexión, false si no
   */
  isOnline: () => {
    return navigator.onLine;
  }
};

export default syncService;