// src/services/locationsService.js

import { 
  collection, 
  doc, 
  addDoc,
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const locationsService = {
  // Obtener todas las ubicaciones
  getAllLocations: async () => {
    try {
      const q = query(collection(db, 'locations'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error al obtener ubicaciones:', error);
      throw error;
    }
  },
  
  // Obtener ubicaciones por tipo
  getLocationsByType: async (locationType) => {
    try {
      const q = query(
        collection(db, 'locations'), 
        where('type', '==', locationType),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error(`Error al obtener ubicaciones por tipo (${locationType}):`, error);
      throw error;
    }
  },
  
  // Obtener ubicaciones por contratista
  getLocationsByContractor: async (contractor) => {
    try {
      const q = query(
        collection(db, 'locations'), 
        where('contractor', '==', contractor),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error(`Error al obtener ubicaciones por contratista (${contractor}):`, error);
      throw error;
    }
  },
  
  // Obtener una ubicación por ID
  getLocationById: async (locationId) => {
    try {
      const locationDoc = await getDoc(doc(db, 'locations', locationId));
      
      if (locationDoc.exists()) {
        const data = locationDoc.data();
        return {
          id: locationDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null
        };
      } else {
        console.warn(`Ubicación ${locationId} no encontrada.`);
        return null;
      }
    } catch (error) {
      console.error(`Error al obtener ubicación por ID (${locationId}):`, error);
      throw error;
    }
  },
  
  // Crear nueva ubicación
  createLocation: async (locationData) => {
    try {
      const locationToSave = {
        name: locationData.name,
        type: locationData.type,
        address: locationData.address,
        capacity: Number(locationData.capacity) || 0,
        contractor: locationData.contractor || '',
        coordinates: locationData.coordinates || null,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'locations'), locationToSave);
      return { id: docRef.id, ...locationToSave, createdAt: new Date(), updatedAt: new Date() };
    } catch (error) {
      console.error('Error al crear ubicación:', error);
      throw error;
    }
  },
  
  // Actualizar ubicación existente
  updateLocation: async (locationId, locationData) => {
    try {
      const locationToUpdate = {
        ...locationData,
        updatedAt: serverTimestamp()
      };
      
      // Asegurar que ciertos campos sean del tipo correcto
      if (locationData.capacity) {
        locationToUpdate.capacity = Number(locationData.capacity);
      }
      
      await updateDoc(doc(db, 'locations', locationId), locationToUpdate);
      return { id: locationId, ...locationToUpdate, updatedAt: new Date() };
    } catch (error) {
      console.error(`Error al actualizar ubicación (${locationId}):`, error);
      throw error;
    }
  },
  
  // Asignar contratista a una ubicación
  assignContractor: async (locationId, contractor) => {
    try {
      await updateDoc(doc(db, 'locations', locationId), {
        contractor,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error al asignar contratista a ubicación (${locationId}):`, error);
      throw error;
    }
  },
  
  // Activar o desactivar ubicación
  toggleLocationStatus: async (locationId, active) => {
    try {
      await updateDoc(doc(db, 'locations', locationId), {
        active,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error al cambiar estado de ubicación (${locationId}):`, error);
      throw error;
    }
  },
  
  // Eliminar ubicación
  deleteLocation: async (locationId) => {
    try {
      await deleteDoc(doc(db, 'locations', locationId));
      return true;
    } catch (error) {
      console.error(`Error al eliminar ubicación (${locationId}):`, error);
      throw error;
    }
  },
  
  // Obtener estadísticas de ubicaciones
  getLocationStats: async () => {
    try {
      // Obtener todas las ubicaciones
      const locationsSnapshot = await getDocs(collection(db, 'locations'));
      const locations = locationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Obtener todas las actividades para calcular estadísticas
      const activitiesSnapshot = await getDocs(collection(db, 'activities'));
      const activities = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calcular estadísticas por ubicación
      const stats = locations.map(location => {
        // Filtrar actividades para esta ubicación
        const locationActivities = activities.filter(
          activity => activity.location && activity.location.name === location.name
        );
        
        // Calcular total de beneficiarios
        const totalBeneficiaries = locationActivities.reduce(
          (sum, activity) => sum + (Number(activity.beneficiaries) || 0), 0
        );
        
        // Calcular promedio de beneficiarios por actividad
        const avgBeneficiaries = locationActivities.length > 0 
          ? totalBeneficiaries / locationActivities.length 
          : 0;
        
        return {
          id: location.id,
          name: location.name,
          type: location.type,
          contractor: location.contractor || 'Sin asignar',
          totalActivities: locationActivities.length,
          totalBeneficiaries,
          avgBeneficiaries: Math.round(avgBeneficiaries)
        };
      });
      
      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas de ubicaciones:', error);
      throw error;
    }
  }
};

export default locationsService;