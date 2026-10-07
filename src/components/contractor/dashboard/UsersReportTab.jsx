// src/components/contractor/dashboard/UsersReportTab.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Card, CardHeader, CardContent, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert, CircularProgress } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { db } from '../../../firebase/config';
import { getContractorName } from '../../../config/contractors';
import { parseActivityDate, todayKey, dateToKey } from '../../../utils/dates';
import { workingDaysBetween } from '../../coverage/coverageUtils';
import {
  getActivitySubtypeLabel,
  calculateUniqueAttendance,
  formatDate
} from '../../dashboard/common/helpers';

// Un usuario está activo si registró actividad en los últimos 2 días hábiles (L–V);
// con más de 2 días hábiles sin registrar se genera una alerta.
const MAX_ACTIVE_WORKING_DAYS = 2;

const formatWorkingDays = (days) => (days === 1 ? '1 día hábil' : `${days} días hábiles`);

// `activities` debe traer la lista COMPLETA del contratista (todos los estados):
// los contadores de pendientes/rechazadas dependen de ello. Educativas, nutricionales,
// beneficiarios y estrategias cuentan solo las aprobadas.
const UsersReportTab = ({ activities, user }) => {
  const contractor = user?.contractor;
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState(false);

  // Usuarios del contratista (para mostrar también a quienes no han registrado nada)
  useEffect(() => {
    if (!contractor) {
      setLoadingUsers(false);
      return undefined;
    }

    let cancelled = false;
    const loadUsers = async () => {
      setLoadingUsers(true);
      setUsersError(false);
      try {
        const snapshot = await getDocs(query(collection(db, 'users'), where('contractor', '==', contractor)));
        if (!cancelled) setUsers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      } catch (error) {
        console.error('Error al cargar usuarios del contratista:', error);
        if (!cancelled) {
          setUsers([]);
          setUsersError(true);
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    loadUsers();
    return () => { cancelled = true; };
  }, [contractor]);

  // Agrupar las actividades por usuario una sola vez
  const activitiesByUser = useMemo(() => {
    const map = new Map();
    (activities || []).forEach((activity) => {
      const uid = activity?.createdBy?.uid;
      if (!uid || uid === 'unknown') return;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid).push(activity);
    });
    return map;
  }, [activities]);

  const today = todayKey();

  const { activeUsers, inactiveUsers, inactiveAlerts } = useMemo(() => {
    // Lista de usuarios: personal de campo del contratista + cualquiera que haya registrado actividades
    const roster = new Map();
    users.forEach((u) => {
      const uid = u.uid || u.id;
      if (!uid) return;
      const accountActive = u.active !== false;
      const hasActivities = activitiesByUser.has(uid);
      if (u.role !== 'field' && !hasActivities) return;
      if (!accountActive && !hasActivities) return;
      roster.set(uid, { uid, name: u.name || u.email || 'Sin nombre', accountActive });
    });
    activitiesByUser.forEach((list, uid) => {
      if (!roster.has(uid)) {
        roster.set(uid, { uid, name: list[0].createdBy?.name || 'Desconocido', accountActive: true });
      }
    });

    const todayDate = parseActivityDate(today);
    const sevenDaysAgo = new Date(todayDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoKey = dateToKey(sevenDaysAgo);

    const processedUsers = Array.from(roster.values()).map((member) => {
      const userActivities = activitiesByUser.get(member.uid) || [];
      const approved = userActivities.filter((a) => a.status === 'approved');

      const stats = {
        ...member,
        totalActivities: userActivities.length,
        approvedActivities: approved.length,
        pendingActivities: 0,
        rejectedActivities: 0,
        educationalActivities: 0,
        nutritionDeliveries: 0,
        activitiesLast7Days: 0,
        strategies: {}
      };
      let lastActivity = null;

      userActivities.forEach((activity) => {
        if (activity.status === 'pending') stats.pendingActivities += 1;
        else if (activity.status === 'rejected') stats.rejectedActivities += 1;

        // Fecha de la última vez que registró algo (día local)
        const createdDate = parseActivityDate(activity.createdAt || activity.date);
        if (createdDate) {
          if (!lastActivity || createdDate > lastActivity) lastActivity = createdDate;
          if (dateToKey(createdDate) >= sevenDaysAgoKey) stats.activitiesLast7Days += 1;
        }
      });

      approved.forEach((activity) => {
        if (activity.educationalActivity?.included) {
          stats.educationalActivities += 1;
          const { type, subtype } = activity.educationalActivity;
          const strategyLabel = getActivitySubtypeLabel(type, subtype, activity.contractor);
          stats.strategies[strategyLabel] = (stats.strategies[strategyLabel] || 0) + 1;
        }
        if (activity.nutritionDelivery?.included) {
          stats.nutritionDeliveries += 1;
        }
      });

      // Días HÁBILES (L–V) desde la última actividad; null si nunca ha registrado
      const workingDaysSinceLastActivity = lastActivity ? workingDaysBetween(lastActivity, todayDate) : null;
      const isActive = workingDaysSinceLastActivity !== null && workingDaysSinceLastActivity <= MAX_ACTIVE_WORKING_DAYS;

      return {
        ...stats,
        lastActivityDate: lastActivity,
        workingDaysSinceLastActivity,
        totalBeneficiaries: calculateUniqueAttendance(approved),
        isActive,
        // Las cuentas desactivadas no generan alerta
        needsAlert: member.accountActive && !isActive
      };
    });

    // Más inactivo primero (quien nunca ha registrado, al inicio), luego por nombre
    const inactivityOf = (u) => (u.workingDaysSinceLastActivity === null ? Infinity : u.workingDaysSinceLastActivity);
    const byInactivityDesc = (a, b) => {
      const aDays = inactivityOf(a);
      const bDays = inactivityOf(b);
      if (aDays !== bDays) return aDays > bDays ? -1 : 1;
      return a.name.localeCompare(b.name, 'es');
    };

    return {
      activeUsers: processedUsers
        .filter((u) => u.isActive)
        .sort((a, b) => b.activitiesLast7Days - a.activitiesLast7Days || a.name.localeCompare(b.name, 'es')),
      inactiveUsers: processedUsers.filter((u) => !u.isActive).sort(byInactivityDesc),
      inactiveAlerts: processedUsers.filter((u) => u.needsAlert).sort(byInactivityDesc)
    };
  }, [users, activitiesByUser, today]);

  const allUsers = useMemo(() => [...activeUsers, ...inactiveUsers], [activeUsers, inactiveUsers]);

  const getStatusChip = (userData) => {
    if (userData.isActive) {
      return <Chip label="Activo" color="success" size="small" />;
    }
    if (userData.workingDaysSinceLastActivity === null) {
      return <Chip label="Sin actividad" color={userData.accountActive ? 'warning' : 'default'} size="small" />;
    }
    return (
      <Chip
        label={`${formatWorkingDays(userData.workingDaysSinceLastActivity)} inactivo`}
        color={userData.needsAlert ? 'error' : 'default'}
        size="small"
      />
    );
  };

  return (
    <Box>
      {usersError && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No se pudo cargar la lista de usuarios; se muestran solo quienes han registrado actividades.
        </Alert>
      )}

      {inactiveAlerts.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {inactiveAlerts.length} usuario(s) sin registrar actividad por más de {MAX_ACTIVE_WORKING_DAYS} días hábiles
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {inactiveAlerts.slice(0, 5).map((alertUser) => (
              <Chip
                key={alertUser.uid}
                label={`${alertUser.name} (${alertUser.workingDaysSinceLastActivity === null ? 'sin actividad' : `${alertUser.workingDaysSinceLastActivity} d. háb.`})`}
                color="warning"
                size="small"
                variant="outlined"
              />
            ))}
            {inactiveAlerts.length > 5 && (
              <Chip
                label={`+${inactiveAlerts.length - 5} más`}
                color="warning"
                size="small"
              />
            )}
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {activeUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usuarios Activos
              </Typography>
              <Typography variant="caption">
                (actividad en los últimos {MAX_ACTIVE_WORKING_DAYS} días hábiles)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingDownIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="error.main">
                {inactiveUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usuarios Inactivos
              </Typography>
              <Typography variant="caption">
                (incluye quienes aún no registran actividades)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary.main">
                {allUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Usuarios
              </Typography>
              <Typography variant="caption">
                ({getContractorName(contractor)})
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Reporte Detallado por Usuario de Campo"
              subheader="Total, pendientes y rechazadas incluyen todos los estados; educativas, nutricionales, beneficiarios y estrategias cuentan solo actividades aprobadas."
            />
            <CardContent>
              {loadingUsers && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}><strong>Usuario</strong></TableCell>
                      <TableCell align="center"><strong>Estado</strong></TableCell>
                      <TableCell align="center"><strong>Última actividad</strong></TableCell>
                      <TableCell align="center"><strong>Total</strong></TableCell>
                      <TableCell align="center"><strong>Pendientes</strong></TableCell>
                      <TableCell align="center"><strong>Rechazadas</strong></TableCell>
                      <TableCell align="center"><strong>Educativas</strong></TableCell>
                      <TableCell align="center"><strong>Nutricionales</strong></TableCell>
                      <TableCell align="center"><strong>Beneficiarios</strong></TableCell>
                      <TableCell><strong>Estrategias Top</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos de usuarios para mostrar
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allUsers.map((userData) => (
                        <TableRow key={userData.uid} hover>
                          <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', minWidth: 140 }}>
                            <Typography variant="subtitle2">
                              {userData.name}
                            </Typography>
                            {!userData.accountActive && (
                              <Typography variant="caption" color="text.secondary">
                                Cuenta desactivada
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {getStatusChip(userData)}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {userData.lastActivityDate ? formatDate(userData.lastActivityDate) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={userData.totalActivities}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={userData.pendingActivities}
                              color={userData.pendingActivities > 0 ? 'warning' : 'default'}
                              variant={userData.pendingActivities > 0 ? 'filled' : 'outlined'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={userData.rejectedActivities}
                              color={userData.rejectedActivities > 0 ? 'error' : 'default'}
                              variant={userData.rejectedActivities > 0 ? 'filled' : 'outlined'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={userData.educationalActivities}
                              color="success"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={userData.nutritionDeliveries}
                              color="secondary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {userData.totalBeneficiaries}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              (únicos)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {Object.entries(userData.strategies)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 3)
                                .map(([strategy, count]) => (
                                  <Chip
                                    key={strategy}
                                    label={`${strategy} (${count})`}
                                    variant="outlined"
                                    size="small"
                                  />
                                ))
                              }
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UsersReportTab;
