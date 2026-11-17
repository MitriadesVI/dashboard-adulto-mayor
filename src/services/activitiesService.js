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
  startAfter,
  runTransaction,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { parseActivityDate, toDateKey, startOfDay, endOfDay } from '../utils/dates';

const toJsDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// Forma única de una actividad leída de Firestore.
// `date` es un Date en medianoche local y `dateKey` es 'YYYY-MM-DD'.
const normalizeActivity = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    date: parseActivityDate(data.date),
    dateKey: toDateKey(data.date),
    totalBeneficiaries: Number(data.totalBeneficiaries) || 0,
    location: data.location || { type: 'unknown', name: 'Desconocido', coordinates: null },
    createdAt: toJsDate(data.createdAt),
    approvedAt: toJsDate(data.approvedAt),
    resubmittedAt: toJsDate(data.resubmittedAt),
    createdBy: data.createdBy || { uid: 'unknown', name: 'Desconocido', role: 'unknown' },
    educationalActivity: data.educationalActivity || { included: false },
    nutritionDelivery: data.nutritionDelivery || { included: false }
  };
};

const sortByCreatedAtDesc = (activities) =>
  activities.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

// Campos editables de una actividad (comunes a crear y reenviar)
const buildActivityFields = (activityData) => ({
  date: toDateKey(activityData.date),
  location: activityData.location,
  locationId: activityData.locationId || null,
  totalBeneficiaries: Number(activityData.totalBeneficiaries),
  educationalActivity: activityData.educationalActivity,
  nutritionDelivery: activityData.nutritionDelivery,
  generalObservations: activityData.generalObservations || null,
  schedule: activityData.schedule,
  driveLink: activityData.driveLink || null
});

const activitiesService = {
  // Todas las actividades de todos los contratistas. Solo para el distrito.
  getAllActivities: async () => {
    try {
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeActivity);
    } catch (error) {
      console.error('Error al obtener todas las actividades (getAllActivities):', error);
      return [];
    }
  },

  // Actividades de un contratista (opcionalmente filtradas por estado).
  // Solo usa filtros de igualdad para no requerir índices compuestos.
  getActivitiesByContractor: async (contractor, status = null) => {
    try {
      const constraints = [where('contractor', '==', contractor)];
      if (status) constraints.push(where('status', '==', status));
      const querySnapshot = await getDocs(query(collection(db, 'activities'), ...constraints));
      return sortByCreatedAtDesc(querySnapshot.docs.map(normalizeActivity));
    } catch (error) {
      console.error('Error al obtener actividades del contratista:', error);
      throw error;
    }
  },

  createActivity: async (activityData) => {
    try {
      const activityToSave = {
        ...buildActivityFields(activityData),
        contractor: activityData.contractor,
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

  // Corrige una actividad rechazada y la devuelve a 'pending' (no crea un duplicado).
  // Guarda el motivo del rechazo anterior en rejectionHistory para trazabilidad.
  resubmitActivity: async (activityId, activityData, previous = {}) => {
    try {
      const update = {
        ...buildActivityFields(activityData),
        status: 'pending',
        rejectionReason: null,
        approvedBy: null,
        approvedAt: null,
        resubmittedAt: serverTimestamp(),
        resubmissionCount: increment(1)
      };

      if (previous.rejectionReason) {
        update.rejectionHistory = arrayUnion({
          reason: previous.rejectionReason,
          rejectedBy: previous.approvedBy?.name || null,
          rejectedAt: previous.approvedAt ? new Date(previous.approvedAt).toISOString() : null
        });
      }

      await updateDoc(doc(db, 'activities', activityId), update);
      return true;
    } catch (error) {
      console.error('Error al reenviar actividad corregida:', error);
      throw error;
    }
  },

  getApprovedActivities: async (filters = {}) => {
    try {
      const constraints = [where('status', '==', 'approved')];
      if (filters.contractor && filters.contractor !== 'all' && filters.contractor !== 'Todos') {
        constraints.push(where('contractor', '==', filters.contractor));
      }
      const querySnapshot = await getDocs(query(collection(db, 'activities'), ...constraints));
      let results = querySnapshot.docs.map(normalizeActivity);

      if (filters.locationType && filters.locationType !== 'all') {
        results = results.filter(activity => {
          const type = (activity.location?.type || '').toLowerCase();
          return type === filters.locationType ||
            (filters.locationType === 'center' && type.includes('centro')) ||
            (filters.locationType === 'park' && type.includes('parque'));
        });
      }

      const start = filters.startDate ? startOfDay(filters.startDate) : null;
      const end = filters.endDate ? endOfDay(filters.endDate) : null;
      if (start) results = results.filter(activity => activity.date && activity.date >= start);
      if (end) results = results.filter(activity => activity.date && activity.date <= end);

      return results;
    } catch (error) {
      console.error('Error general en getApprovedActivities:', error);
      return [];
    }
  },

  // Aprobar/rechazar solo si la actividad sigue pendiente (evita que dos
  // administradores se pisen o que se apruebe algo ya rechazado).
  approveActivity: async (activityId, approverUser) => {
    const activityRef = doc(db, 'activities', activityId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(activityRef);
      if (!snap.exists()) throw new Error('La actividad ya no existe');
      if (snap.data().status !== 'pending') throw new Error('La actividad ya fue revisada por otra persona');
      transaction.update(activityRef, {
        status: 'approved',
        approvedBy: { uid: approverUser.uid, name: approverUser.name || approverUser.email, role: approverUser.role },
        approvedAt: serverTimestamp(),
        rejectionReason: null
      });
    });
    return true;
  },

  rejectActivity: async (activityId, reason, approverUser) => {
    const activityRef = doc(db, 'activities', activityId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(activityRef);
      if (!snap.exists()) throw new Error('La actividad ya no existe');
      if (snap.data().status !== 'pending') throw new Error('La actividad ya fue revisada por otra persona');
      transaction.update(activityRef, {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: { uid: approverUser.uid, name: approverUser.name || approverUser.email, role: approverUser.role },
        approvedAt: serverTimestamp()
      });
    });
    return true;
  },

  getActivityById: async (activityId) => {
    try {
      const activityDoc = await getDoc(doc(db, 'activities', activityId));
      if (activityDoc.exists()) {
        return normalizeActivity(activityDoc);
      }
      console.warn(`Actividad ${activityId} no encontrada.`);
      return null;
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
      return querySnapshot.docs.map(normalizeActivity);
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

      const activities = querySnapshot.docs.map(normalizeActivity);
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
