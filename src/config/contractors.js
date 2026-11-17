// src/config/contractors.js
//
// Lista única de contratistas del programa. Para cambiar o agregar un contratista,
// editar solo este archivo. El `id` es el valor guardado en Firestore
// (campo `contractor` de usuarios, actividades, ubicaciones y metas).
//
// labelStyle:
//   'education' → "Educación Nutricional", "Taller educativo del cuidado nutricional", ...
//   'health'    → "Salud Nutricional", "Jornada de promoción de la salud nutricional", ...

// El id 'CUC' se conserva porque es el valor ya guardado en Firestore para este contrato,
// que desde 2026 ejecuta la Fundación I+D+I (reemplazó a la CUC). Para usar otro id habría
// que migrar el campo `contractor` en users, activities, locations y goals.
export const CONTRACTORS = [
  {
    id: 'CUC',
    name: 'Fundación I+D+I',
    fullName: 'Fundación para la Investigación, Desarrollo e Innovación I+D+I',
    labelStyle: 'education',
    color: '#2196F3'
  },
  { id: 'FUNDACARIBE', name: 'FUNDACARIBE', fullName: 'FUNDACARIBE', labelStyle: 'health', color: '#4CAF50' }
];

export const DEFAULT_CONTRACTOR = CONTRACTORS[0].id;

export const getContractor = (id) => CONTRACTORS.find((c) => c.id === id) || null;

export const getContractorName = (id) => getContractor(id)?.name || id || '';

export const getContractorFullName = (id) => getContractor(id)?.fullName || getContractorName(id);

export const usesEducationLabels = (id) => getContractor(id)?.labelStyle === 'education';

export const getContractorColor = (id, fallback = '#9E9E9E') => getContractor(id)?.color || fallback;
