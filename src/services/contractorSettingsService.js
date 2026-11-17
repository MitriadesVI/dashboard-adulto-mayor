// src/services/contractorSettingsService.js
//
// Configuración de cada entidad contratista (contractorSettings/{contractor}).
// La edita el representante legal (o el distrito).

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEFAULT_REGISTRATION } from '../config/roles';

const contractorSettingsService = {
  // Devuelve la configuración con valores por defecto si la entidad aún no la ha definido
  getSettings: async (contractor) => {
    if (!contractor) return { registration: { ...DEFAULT_REGISTRATION } };
    try {
      const snap = await getDoc(doc(db, 'contractorSettings', contractor));
      const data = snap.exists() ? snap.data() : {};
      return {
        ...data,
        registration: { ...DEFAULT_REGISTRATION, ...(data.registration || {}) }
      };
    } catch (error) {
      console.error('Error al obtener la configuración del contratista:', error);
      return { registration: { ...DEFAULT_REGISTRATION } };
    }
  },

  // registration: { professionals: bool, dataEntry: bool, representative: bool }
  saveRegistration: async (contractor, registration, user) => {
    const values = {
      professionals: Boolean(registration.professionals),
      dataEntry: Boolean(registration.dataEntry),
      representative: Boolean(registration.representative)
    };
    if (!values.professionals && !values.dataEntry && !values.representative) {
      throw new Error('Debe haber al menos una forma de registrar actividades.');
    }
    await setDoc(doc(db, 'contractorSettings', contractor), {
      contractor,
      registration: values,
      updatedAt: serverTimestamp(),
      updatedBy: user ? { uid: user.uid, name: user.name || user.email || '' } : null
    }, { merge: true });
    return values;
  }
};

export default contractorSettingsService;
