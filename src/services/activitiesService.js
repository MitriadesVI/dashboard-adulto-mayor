// src/services/activitiesService.js

import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  startAfter
} from 'firebase/firestore';
import { db } from '../firebase/config'; 

const activitiesService = {
  // --- MÉTODO getAllActivities ACTUALIZADO ---
  getAllActivities: async () => {
    try {
      console.log("Obteniendo todas las actividades sin filtros (getAllActivities)");
      
      // Consulta simple sin restricciones complejas
      // Podrías añadir un orderBy('createdAt', 'desc') si quieres un orden por defecto
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc')); // Ejemplo de orden
      const querySnapshot = await getDocs(q);
      
      console.log(`Se encontraron ${querySnapshot.size} actividades en total (getAllActivities)`);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Asegurar campos necesarios y valores por defecto
          type: data.type || 'unknown',
          subtype: data.subtype || 'unknown',
          contractor: data.contractor || 'unknown',
          status: data.status || 'unknown',
          beneficiaries: data.beneficiaries || 0,
          location: data.location || { type: 'unknown', name: 'Desconocido', coordinates: null },
          photos: data.photos || [], // Asegurar que photos sea un array
          date: data.date || null, // o new Date(data.date).toISOString() si siempre debe ser string
          // Convertir timestamps a Date si existen y son objetos Timestamp de Firestore
          createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
          approvedAt: data.approvedAt ? (typeof data.approvedAt.toDate === 'function' ? data.approvedAt.toDate() : new Date(data.approvedAt)) : null,
          createdBy: data.createdBy || { uid: 'unknown', name: 'Desconocido', role: 'unknown' } // Fallback
        };
      });
    } catch (error) {
      console.error('Error al obtener todas las actividades (getAllActivities):', error);
      console.error('Detalles adicionales (getAllActivities):', error.code, error.message);
      return []; 
    }
  },
  // --- FIN MÉTODO getAllActivities ACTUALIZADO ---

  createActivity: async (activityData) => { 
    try {
      const activityToSave = {
        type: activityData.type,
        subtype: activityData.subtype,
        date: new Date(activityData.date).toISOString(), 
        contractor: activityData.contractor,
        location: {
          name: activityData.location.name,
          type: activityData.location.type,
          coordinates: activityData.location.coordinates
        },
        schedule: activityData.schedule || 'morning',
        beneficiaries: Number(activityData.beneficiaries),
        description: activityData.description,
        photos: activityData.photosDataURLs || [], 
        createdBy: {
          uid: activityData.createdBy.uid, 
          name: activityData.createdBy.name,
          role: activityData.createdBy.role
        },
        status: 'pending',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'activities'), activityToSave);
      return { id: docRef.id, ...activityToSave, createdAt: new Date() };
    } catch (error) {
      console.error('Error al crear actividad en Firestore:', error);
      throw error; 
    }
  },
  
  getApprovedActivities: async (filters = {}) => {
    try {
      console.log("Consultando actividades aprobadas con método SIMPLIFICADO (getApprovedActivities)");
      
      const basicQuery = query(collection(db, 'activities'), where('status', '==', 'approved'));
      
      try {
        const querySnapshot = await getDocs(basicQuery);
        console.log(`Consulta básica encontró ${querySnapshot.size} actividades aprobadas (getApprovedActivities)`);
        
        let results = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            type: data.type || 'unknown',
            subtype: data.subtype || 'unknown',
            contractor: data.contractor || 'unknown',
            status: data.status || 'unknown',
            beneficiaries: data.beneficiaries || 0,
            location: data.location || { type: 'unknown', name: 'Desconocido', coordinates: null },
            photos: data.photos || [],
            date: data.date || null,
            createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
            approvedAt: data.approvedAt ? (typeof data.approvedAt.toDate === 'function' ? data.approvedAt.toDate() : new Date(data.approvedAt)) : null,
            createdBy: data.createdBy || { uid: 'unknown', name: 'Desconocido', role: 'unknown' }
          };
        });
        
        console.log("Primera actividad antes de filtrado (getApprovedActivities):", results.length > 0 ? results[0] : "No hay datos");
        
        if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
          results = results.filter(activity => activity.contractor === filters.contractor);
        }
        if (filters.type && filters.type !== 'all') {
          results = results.filter(activity => activity.type === filters.type);
        }
        if (filters.locationType && filters.locationType !== 'all') {
          results = results.filter(activity => activity.location && activity.location.type === filters.locationType);
        }
        if (filters.startDate) {
          const startDate = new Date(filters.startDate); startDate.setHours(0,0,0,0);
          results = results.filter(activity => { if (!activity.date) return false; try { return new Date(activity.date) >= startDate; } catch (e) { return false; } });
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate); endDate.setHours(23,59,59,999);
          results = results.filter(activity => { if (!activity.date) return false; try { return new Date(activity.date) <= endDate; } catch (e) { return false; } });
        }
        
        console.log(`Después de filtrar en memoria (getApprovedActivities): ${results.length} actividades`);
        return results;
        
      } catch (innerError) {
        console.error("Error en consulta básica (getApprovedActivities):", innerError);
        return [];
      }
    } catch (error) {
      console.error('Error general en getApprovedActivities:', error);
      return [];
    }
  },
  
  approveActivity: async (activityId, approverUser) => {
    try {
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, {
        status: 'approved',
        approvedBy: { uid: approverUser.uid, name: approverUser.name, role: approverUser.role },
        approvedAt: serverTimestamp(), rejectionReason: null
      });
      return true;
    } catch (error) { console.error('Error al aprobar actividad:', error); throw error; }
  },
  
  rejectActivity: async (activityId, reason, approverUser) => {
    try {
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, {
        status: 'rejected', rejectionReason: reason,
        approvedBy: { uid: approverUser.uid, name: approverUser.name, role: approverUser.role },
        approvedAt: serverTimestamp()
      });
      return true;
    } catch (error) { console.error('Error al rechazar actividad:', error); throw error; }
  },
  
  getActivityById: async (activityId) => {
    try {
      const activityDoc = await getDoc(doc(db, 'activities', activityId));
      if (activityDoc.exists()) {
        const data = doc.data();
        return { 
          id: activityDoc.id, ...data, 
          date: data.date ? new Date(data.date) : null, 
          createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null), 
          approvedAt: data.approvedAt?.toDate?.() || (data.approvedAt ? new Date(data.approvedAt) : null)
        };
      } else { console.warn(`Actividad ${activityId} no encontrada.`); return null; }
    } catch (error) { console.error('Error al obtener actividad por ID:', error); throw error; }
  },
  
  getPendingActivitiesByContractor: async (contractor) => {
    try {
      const q = query( collection(db, 'activities'), where('contractor', '==', contractor), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, ...doc.data(), 
        date: doc.data().date ? new Date(doc.data().date) : null, 
        createdAt: doc.data().createdAt?.toDate?.() || (doc.data().createdAt ? new Date(doc.data().createdAt) : null)
      }));
    } catch (error) { console.error('Error al obtener pendientes por contratista:', error); throw error; }
  },
  
  getActivitiesByUser: async (userId, statusFilter = null, pageSize = 10, lastDocSnapshot = null) => {
    try {
      const constraints = [ where('createdBy.uid', '==', userId), orderBy('createdAt', 'desc'), limit(pageSize) ];
      if (statusFilter) { constraints.unshift(where('status', '==', statusFilter)); }
      if (lastDocSnapshot) { constraints.push(startAfter(lastDocSnapshot)); }
      const q = query(collection(db, 'activities'), ...constraints);
      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => ({ 
        id: doc.id, ...doc.data(), 
        date: doc.data().date ? new Date(doc.data().date) : null, 
        createdAt: doc.data().createdAt?.toDate?.() || (doc.data().createdAt ? new Date(doc.data().createdAt) : null)
      }));
      const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      return { activities, lastVisible: newLastVisible || null };
    } catch (error) { console.error('Error al obtener actividades por usuario:', error); throw error; }
  },
  
  deleteActivity: async (activityId) => {
    try { await deleteDoc(doc(db, 'activities', activityId)); return true; }
    catch (error) { console.error('Error al eliminar actividad:', error); throw error; }
  }
};

export default activitiesService;