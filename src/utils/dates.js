// src/utils/dates.js
//
// Fechas de actividades en hora local (Colombia, UTC-5).
//
// Las actividades se guardan como 'YYYY-MM-DD'. Las antiguas se guardaron como
// '2026-10-07T00:00:00.000Z' (medianoche UTC), que en Colombia es el día anterior
// a las 7 pm; por eso se toma solo la parte 'YYYY-MM-DD' y se interpreta en hora local.
// Nunca usar new Date('YYYY-MM-DD') con estas fechas: JavaScript la interpreta como UTC.

const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

const pad = (n) => String(n).padStart(2, '0');

/**
 * Convierte un Date a 'YYYY-MM-DD' usando la fecha local (no UTC).
 */
export const dateToKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Convierte el valor de fecha de una actividad (string 'YYYY-MM-DD', ISO legado,
 * Date o Timestamp de Firestore) a un Date en medianoche local. Devuelve null si no es válido.
 */
export const parseActivityDate = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.match(DATE_KEY_REGEX);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const date = typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Devuelve 'YYYY-MM-DD' para cualquier valor de fecha aceptado por parseActivityDate.
 */
export const toDateKey = (value) => {
  const date = parseActivityDate(value);
  return date ? dateToKey(date) : null;
};

/**
 * Fecha de hoy en hora local como 'YYYY-MM-DD' (para valores por defecto de inputs type="date").
 */
export const todayKey = () => dateToKey(new Date());

/**
 * Inicio del día local de un valor de filtro 'YYYY-MM-DD'.
 */
export const startOfDay = (value) => parseActivityDate(value);

/**
 * Fin del día local (23:59:59.999) de un valor de filtro 'YYYY-MM-DD'.
 */
export const endOfDay = (value) => {
  const date = parseActivityDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Días completos entre dos fechas locales (b - a).
 */
export const daysBetween = (a, b) => {
  const start = parseActivityDate(a);
  const end = parseActivityDate(b);
  if (!start || !end) return null;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

/**
 * Año local de la fecha de una actividad.
 */
export const getActivityYear = (value) => {
  const date = parseActivityDate(value);
  return date ? date.getFullYear() : null;
};
