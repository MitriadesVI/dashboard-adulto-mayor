// src/utils/attendance.js
//
// Reglas de conteo de personas atendidas y raciones (fuente única para todos los
// dashboards, informes y metas).
//
// - totalBeneficiaries: personas que participaron en la actividad de esa jornada.
//   Si el registro es solo de alimentación, son las personas que recibieron ración.
// - nutritionDelivery.rations: raciones (CDV) o meriendas (parques) entregadas. Puede ser
//   mayor que los asistentes cuando alguien recibe la ración y se va antes de la actividad.
//   En actividades antiguas no existe y se asume igual a totalBeneficiaries.
// - Personas atendidas de una jornada = máximo entre asistentes y raciones, tomando el
//   máximo entre todos los registros de la misma sede + fecha + jornada (así un registro
//   educativo y uno de alimentación del mismo grupo no se suman dos veces).
// - J1 y J2 son grupos de personas distintos: se suman. En parques la jornada es única.
// - Entre días distintos se suman: el resultado son atenciones (persona-jornada), no
//   personas únicas. Contar personas únicas exigiría un registro de beneficiarios con documento.

import { toDateKey } from './dates';

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Profesional que realizó la actividad. En actividades antiguas (sin performedBy)
 * es quien la registró.
 */
export const getPerformer = (activity) => {
  const performer = activity?.performedBy;
  if (performer?.uid) return { uid: performer.uid, name: performer.name || 'Sin nombre' };
  const creator = activity?.createdBy;
  return { uid: creator?.uid || 'unknown', name: creator?.name || 'Desconocido' };
};

/**
 * true si quien registró la actividad no es quien la realizó (la cargó un encargado
 * o el representante a nombre de un profesional).
 */
export const isRegisteredOnBehalf = (activity) => {
  const performer = activity?.performedBy?.uid;
  const creator = activity?.createdBy?.uid;
  return Boolean(performer && creator && performer !== creator);
};

/**
 * Raciones o meriendas entregadas en la actividad (0 si no incluye alimentación).
 */
export const getActivityRations = (activity) => {
  if (!activity?.nutritionDelivery?.included) return 0;
  const rations = activity.nutritionDelivery.rations;
  return rations === undefined || rations === null || rations === ''
    ? toNumber(activity.totalBeneficiaries)
    : toNumber(rations);
};

/**
 * Personas que participaron en la actividad educativa (0 si no incluye actividad educativa).
 */
export const getActivityAttendees = (activity) =>
  activity?.educationalActivity?.included ? toNumber(activity.totalBeneficiaries) : 0;

/**
 * Personas atendidas por un registro: máximo entre asistentes y raciones.
 */
export const getActivityPeople = (activity) =>
  Math.max(toNumber(activity?.totalBeneficiaries), getActivityRations(activity));

/**
 * Jornada normalizada: 'J1' | 'J2' | 'UNICA' (parques o sin jornada).
 */
export const normalizeJornada = (schedule) => {
  const value = String(schedule || '').toUpperCase();
  if (value === 'J1' || value === 'MORNING') return 'J1';
  if (value === 'J2' || value === 'AFTERNOON') return 'J2';
  return 'UNICA';
};

const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Clave del grupo de personas: sede + fecha + jornada.
 */
export const attendanceGroupKey = (activity) => {
  const location = activity?.locationId || normalizeText(activity?.location?.name) || 'sin-sede';
  const dateKey = activity?.dateKey || toDateKey(activity?.date) || 'sin-fecha';
  return `${location}|${dateKey}|${normalizeJornada(activity?.schedule)}`;
};

/**
 * Agrupa registros por sede + fecha + jornada y devuelve, por grupo, las personas atendidas
 * (máximo), los asistentes a actividades educativas (máximo) y las raciones (máximo).
 */
export const groupAttendance = (activities) => {
  const groups = new Map();
  (activities || []).forEach((activity) => {
    if (!activity) return;
    const key = attendanceGroupKey(activity);
    const current = groups.get(key) || { key, people: 0, attendees: 0, rations: 0, records: 0 };
    current.people = Math.max(current.people, getActivityPeople(activity));
    current.attendees = Math.max(current.attendees, getActivityAttendees(activity));
    current.rations = Math.max(current.rations, getActivityRations(activity));
    current.records += 1;
    groups.set(key, current);
  });
  return Array.from(groups.values());
};

/**
 * Resumen de atención de un conjunto de registros.
 * - people: personas atendidas (sin doble conteo dentro de una jornada)
 * - attendees: asistentes a actividades educativas
 * - rations: raciones/meriendas entregadas
 * - jornadas: grupos sede + fecha + jornada
 * - averagePerJornada: personas atendidas por jornada
 */
export const summarizeAttendance = (activities) => {
  const groups = groupAttendance(activities);
  const totals = groups.reduce(
    (acc, group) => ({
      people: acc.people + group.people,
      attendees: acc.attendees + group.attendees,
      rations: acc.rations + group.rations
    }),
    { people: 0, attendees: 0, rations: 0 }
  );
  return {
    ...totals,
    jornadas: groups.length,
    averagePerJornada: groups.length > 0 ? Math.round(totals.people / groups.length) : 0
  };
};

/**
 * Personas atendidas (atajo de summarizeAttendance(...).people).
 */
export const calculatePeopleAttended = (activities) => summarizeAttendance(activities).people;

const rationLocationType = (location) => {
  const type = normalizeText(location?.type);
  if (type === 'center' || type.includes('centro') || type.includes('cdv') || type.includes('fijo')) return 'center';
  if (type === 'park' || type.includes('parque') || type.includes('espacio')) return 'park';
  return 'other';
};

/**
 * Raciones (CDV) y meriendas (parques) entregadas, sin doble conteo: por sede + fecha +
 * jornada se toma el máximo entre los registros con alimentación (un registro educativo
 * con ración y otro solo de ración del mismo grupo son una sola entrega).
 * Devuelve { center, park, other, total, deliveries } (deliveries = jornadas con entrega).
 */
export const summarizeRations = (activities) => {
  const groups = new Map();
  (activities || []).forEach((activity) => {
    const rations = getActivityRations(activity);
    if (!rations) return;
    const key = attendanceGroupKey(activity);
    const group = groups.get(key) || { rations: 0, type: rationLocationType(activity.location) };
    group.rations = Math.max(group.rations, rations);
    groups.set(key, group);
  });
  const result = { center: 0, park: 0, other: 0, total: 0, deliveries: groups.size };
  groups.forEach((group) => {
    result[group.type] += group.rations;
    result.total += group.rations;
  });
  return result;
};
