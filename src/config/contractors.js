// src/config/contractors.js
//
// Lista única de contratistas del programa. Para cambiar o agregar un contratista,
// editar solo este archivo. El `id` es el valor guardado en Firestore
// (campo `contractor` de usuarios, actividades, ubicaciones y metas).
//
// labelStyle:
//   'education' → "Educación Nutricional", "Taller educativo del cuidado nutricional", ...
//   'health'    → "Salud Nutricional", "Jornada de promoción de la salud nutricional", ...

export const CONTRACTORS = [
  { id: 'CUC', name: 'CUC', labelStyle: 'education', color: '#2196F3' },
  { id: 'FUNDACARIBE', name: 'FUNDACARIBE', labelStyle: 'health', color: '#4CAF50' }
];

export const DEFAULT_CONTRACTOR = CONTRACTORS[0].id;

export const getContractor = (id) => CONTRACTORS.find((c) => c.id === id) || null;

export const getContractorName = (id) => getContractor(id)?.name || id || '';

export const usesEducationLabels = (id) => getContractor(id)?.labelStyle === 'education';

export const getContractorColor = (id, fallback = '#9E9E9E') => getContractor(id)?.color || fallback;
