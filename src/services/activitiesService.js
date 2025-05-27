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
  getAllActivities: async () => {
    try {
      console.log("Obteniendo todas las actividades sin filtros (getAllActivities)");
      
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log(`Se encontraron ${querySnapshot.size} actividades en total (getAllActivities)`);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Asegurar campos necesarios y valores por defecto
          totalBeneficiaries: data.totalBeneficiaries || 0,
          location: data.location || { type: 'unknown', name: 'Desconocido', coordinates: null },
          date: data.date || null,
          // Convertir timestamps a Date si existen y son objetos Timestamp de Firestore
          createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
          approvedAt: data.approvedAt ? (typeof data.approvedAt.toDate === 'function' ? data.approvedAt.toDate() : new Date(data.approvedAt)) : null,
          createdBy: data.createdBy || { uid: 'unknown', name: 'Desconocido', role: 'unknown' },
          
          // Asegurar que existan las estructuras de actividad y alimentación
          educationalActivity: data.educationalActivity || { included: false },
          nutritionDelivery: data.nutritionDelivery || { included: false }
        };
      });
    } catch (error) {
      console.error('Error al obtener todas las actividades (getAllActivities):', error);
      console.error('Detalles adicionales (getAllActivities):', error.code, error.message);
      return []; 
    }
  },

  createActivity: async (activityData) => { 
    try {
      const activityToSave = {
        date: new Date(activityData.date).toISOString(),
        contractor: activityData.contractor,
        location: activityData.location,
        totalBeneficiaries: Number(activityData.totalBeneficiaries),
        
        // Nuevas estructuras de datos
        educationalActivity: activityData.educationalActivity,
        nutritionDelivery: activityData.nutritionDelivery,
        
        schedule: activityData.schedule,
        driveLink: activityData.driveLink,
        createdBy: activityData.createdBy,
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
      console.log("Consultando actividades aprobadas (getApprovedActivities)");
      
      const basicQuery = query(collection(db, 'activities'), where('status', '==', 'approved'));
      
      try {
        const querySnapshot = await getDocs(basicQuery);
        console.log(`Consulta básica encontró ${querySnapshot.size} actividades aprobadas (getApprovedActivities)`);
        
        let results = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            totalBeneficiaries: data.totalBeneficiaries || 0,
            location: data.location || { type: 'unknown', name: 'Desconocido', coordinates: null },
            date: data.date || null,
            createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null,
            approvedAt: data.approvedAt ? (typeof data.approvedAt.toDate === 'function' ? data.approvedAt.toDate() : new Date(data.approvedAt)) : null,
            createdBy: data.createdBy || { uid: 'unknown', name: 'Desconocido', role: 'unknown' },
            educationalActivity: data.educationalActivity || { included: false },
            nutritionDelivery: data.nutritionDelivery || { included: false }
          };
        });
        
        // Aplicar filtros
        if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
          results = results.filter(activity => activity.contractor === filters.contractor);
        }
        
        if (filters.locationType && filters.locationType !== 'all') {
          results = results.filter(activity => 
            activity.location && 
            (activity.location.type === filters.locationType || 
             (filters.locationType === 'center' && activity.location.type.toLowerCase().includes('centro')) ||
             (filters.locationType === 'park' && activity.location.type.toLowerCase().includes('parque')))
          );
        }
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate); 
          startDate.setHours(0,0,0,0);
          results = results.filter(activity => {
            if (!activity.date) return false;
            try {
              return new Date(activity.date) >= startDate;
            } catch (e) {
              return false;
            }
          });
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23,59,59,999);
          results = results.filter(activity => {
            if (!activity.date) return false;
            try {
              return new Date(activity.date) <= endDate;
            } catch (e) {
              return false;
            }
          });
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
        approvedAt: serverTimestamp(),
        rejectionReason: null
      });
      return true;
    } catch (error) {
      console.error('Error al aprobar actividad:', error);
      throw error;
    }
  },
  
  rejectActivity: async (activityId, reason, approverUser) => {
    try {
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: { uid: approverUser.uid, name: approverUser.name, role: approverUser.role },
        approvedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error al rechazar actividad:', error);
      throw error;
    }
  },
  
  getActivityById: async (activityId) => {
    try {
      const activityDoc = await getDoc(doc(db, 'activities', activityId));
      if (activityDoc.exists()) {
        const data = activityDoc.data();
        return { 
          id: activityDoc.id, 
          ...data, 
          date: data.date ? new Date(data.date) : null, 
          createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null), 
          approvedAt: data.approvedAt?.toDate?.() || (data.approvedAt ? new Date(data.approvedAt) : null),
          educationalActivity: data.educationalActivity || { included: false },
          nutritionDelivery: data.nutritionDelivery || { included: false }
        };
      } else {
        console.warn(`Actividad ${activityId} no encontrada.`);
        return null;
      }
    } catch (error) {
      console.error('Error al obtener actividad por ID:', error);
      throw error;
    }
  },
  
  getPendingActivitiesByContractor: async (contractor) => {
    try {
      const q = query(
        collection(db, 'activities'),
        where('contractor', '==', contractor),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id,
          ...data, 
          date: data.date ? new Date(data.date) : null, 
          createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null),
          educationalActivity: data.educationalActivity || { included: false },
          nutritionDelivery: data.nutritionDelivery || { included: false }
        };
      });
    } catch (error) {
      console.error('Error al obtener pendientes por contratista:', error);
      throw error;
    }
  },
  
  getActivitiesByUser: async (userId, statusFilter = null, pageSize = 10, lastDocSnapshot = null) => {
    try {
      const constraints = [
        where('createdBy.uid', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      ];
      
      if (statusFilter) {
        constraints.unshift(where('status', '==', statusFilter));
      }
      
      if (lastDocSnapshot) {
        constraints.push(startAfter(lastDocSnapshot));
      }
      
      const q = query(collection(db, 'activities'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const activities = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id,
          ...data, 
          date: data.date ? new Date(data.date) : null, 
          createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null),
          educationalActivity: data.educationalActivity || { included: false },
          nutritionDelivery: data.nutritionDelivery || { included: false }
        };
      });
      
      const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      return { activities, lastVisible: newLastVisible || null };
    } catch (error) {
      console.error('Error al obtener actividades por usuario:', error);
      throw error;
    }
  },
  
  deleteActivity: async (activityId) => {
    try {
      await deleteDoc(doc(db, 'activities', activityId));
      return true;
    } catch (error) {
      console.error('Error al eliminar actividad:', error);
      throw error;
    }
  }
};

export default activitiesService;