// src/config/roles.js
//
// Roles de usuario (campo `role` en users/{uid}).

export const ROLES = {
  DISTRICT: 'district',
  CONTRACTOR_ADMIN: 'contractor-admin',
  DATA_ENTRY: 'data-entry',
  FIELD: 'field'
};

export const ROLE_LABELS = {
  [ROLES.DISTRICT]: 'Funcionario Distrital',
  [ROLES.CONTRACTOR_ADMIN]: 'Representante / Administrador',
  [ROLES.DATA_ENTRY]: 'Encargado de carga',
  [ROLES.FIELD]: 'Profesional de campo'
};

export const getRoleLabel = (role, adminType) => {
  if (role === ROLES.CONTRACTOR_ADMIN) {
    return adminType === 'secondary' ? 'Administrador' : 'Representante Legal';
  }
  return ROLE_LABELS[role] || role || '';
};

// Página de inicio de cada rol
export const HOME_BY_ROLE = {
  [ROLES.DISTRICT]: '/dashboard',
  [ROLES.CONTRACTOR_ADMIN]: '/approval',
  [ROLES.DATA_ENTRY]: '/activities',
  [ROLES.FIELD]: '/activities'
};

// ¿Quién puede registrar actividades? Lo decide el representante legal de cada entidad.
// Clave en contractorSettings/{contractor}.registration
export const REGISTRATION_OPTIONS = [
  {
    key: 'professionals',
    role: ROLES.FIELD,
    label: 'Cada profesional de campo registra sus actividades',
    help: 'El profesional entra a la app y registra lo que realizó.'
  },
  {
    key: 'dataEntry',
    role: ROLES.DATA_ENTRY,
    label: 'Un encargado de carga registra a nombre de los profesionales',
    help: 'Una persona de la entidad digita las actividades e indica qué profesional las realizó.'
  },
  {
    key: 'representative',
    role: ROLES.CONTRACTOR_ADMIN,
    label: 'El representante legal o los administradores registran',
    help: 'Desde su cuenta, indicando qué profesional realizó cada actividad.'
  }
];

export const DEFAULT_REGISTRATION = { professionals: true, dataEntry: true, representative: true };

const REGISTRATION_KEY_BY_ROLE = REGISTRATION_OPTIONS.reduce((acc, option) => {
  acc[option.role] = option.key;
  return acc;
}, {});

/**
 * ¿Puede este usuario registrar actividades según la configuración de su entidad?
 */
export const canRegisterActivities = (user, registration = DEFAULT_REGISTRATION) => {
  if (!user) return false;
  if (user.role === ROLES.DISTRICT) return false;
  const key = REGISTRATION_KEY_BY_ROLE[user.role];
  if (!key) return false;
  return registration?.[key] !== false;
};

/**
 * ¿Debe este usuario indicar qué profesional realizó la actividad? (encargado o representante)
 */
export const registersOnBehalf = (user) =>
  user?.role === ROLES.DATA_ENTRY || user?.role === ROLES.CONTRACTOR_ADMIN;
