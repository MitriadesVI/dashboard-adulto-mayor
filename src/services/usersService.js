// src/services/usersService.js
//
// Consultas y altas de perfiles de usuario (colección users).

import { collection, doc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ROLES } from '../config/roles';

const usersService = {
  // Profesionales de campo de una entidad (con o sin acceso a la app), ordenados por nombre
  getContractorProfessionals: async (contractor, { includeInactive = false } = {}) => {
    const q = query(
      collection(db, 'users'),
      where('contractor', '==', contractor),
      where('role', '==', ROLES.FIELD)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(userDoc => ({ id: userDoc.id, uid: userDoc.id, ...userDoc.data() }))
      .filter(user => includeInactive || user.active !== false)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
  },

  // Profesional sin acceso a la app: solo aparece para que el encargado de carga o el
  // representante registren actividades a su nombre. No tiene cuenta de inicio de sesión.
  createProfessionalWithoutLogin: async ({ name, documentId, profession, contractor }, creator) => {
    const ref = doc(collection(db, 'users'));
    const profile = {
      uid: ref.id,
      name: name.trim(),
      documentId: documentId ? String(documentId).trim() : null,
      profession: profession ? profession.trim() : null,
      role: ROLES.FIELD,
      contractor,
      hasLogin: false,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: creator?.uid || null
    };
    await setDoc(ref, profile);
    return { id: ref.id, ...profile };
  }
};

export default usersService;
