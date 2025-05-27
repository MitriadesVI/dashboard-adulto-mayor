// src/components/contractor/dashboard/UsersReportTab.jsx

import React from 'react';
import { Grid, Card, CardHeader, CardContent, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';

// CORRECCIÓN: Ruta correcta para helpers (cambio de ../../../ a ../../)
import { 
  getActivitySubtypeLabel,
  calculateUniqueAttendanceByUser  // NUEVA FUNCIÓN IMPORTADA
} from '../../dashboard/common/helpers';

const UsersReportTab = ({ activities, user }) => {
  const getUserActivityStats = () => {
    if (!activities.length) return { activeUsers: [], inactiveUsers: [], inactiveAlerts: [] };
    
    const userStats = {};
    const today = new Date();
    
    const isWeekday = (date) => {
      const dayOfWeek = date.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    };
    
    let weekdaysInLastTwoDays = 0;
    for (let i = 0; i < 2; i++) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() - i);
      if (isWeekday(checkDate)) {
        weekdaysInLastTwoDays++;
      }
    }
    
    activities.forEach(activity => {
      if (!activity.createdBy?.name) return;
      
      const userName = activity.createdBy.name;
      const userUid = activity.createdBy.uid;
      
      if (!userStats[userUid]) {
        userStats[userUid] = {
          name: userName,
          uid: userUid,
          totalActivities: 0,
          approvedActivities: 0,
          rejectedActivities: 0,
          pendingActivities: 0,
          lastActivityDate: null,
          activitiesLast7Days: 0,
          educationalActivities: 0,
          nutritionDeliveries: 0,
          totalBeneficiaries: 0,  // Se calculará al final usando función corregida
          strategies: {}
        };
      }
      
      const createdDate = new Date(activity.createdAt);
      
      userStats[userUid].totalActivities += 1;
      
      // ========== CORRECCIÓN: NO sumar directamente totalBeneficiaries aquí ==========
      // ANTES: userStats[userUid].totalBeneficiaries += (Number(activity.totalBeneficiaries) || 0);
      // DESPUÉS: Se calculará al final usando calculateUniqueAttendanceByUser()
      
      if (activity.status === 'approved') userStats[userUid].approvedActivities += 1;
      else if (activity.status === 'rejected') userStats[userUid].rejectedActivities += 1;
      else if (activity.status === 'pending') userStats[userUid].pendingActivities += 1;
      
      if (activity.educationalActivity?.included) {
        userStats[userUid].educationalActivities += 1;
        
        const type = activity.educationalActivity.type;
        const subtype = activity.educationalActivity.subtype;
        const strategyLabel = getActivitySubtypeLabel(type, subtype, activity.contractor);
        
        userStats[userUid].strategies[strategyLabel] = (userStats[userUid].strategies[strategyLabel] || 0) + 1;
      }
      
      if (activity.nutritionDelivery?.included) {
        userStats[userUid].nutritionDeliveries += 1;
      }
      
      if (!userStats[userUid].lastActivityDate || createdDate > userStats[userUid].lastActivityDate) {
        userStats[userUid].lastActivityDate = createdDate;
      }
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      if (createdDate >= sevenDaysAgo) {
        userStats[userUid].activitiesLast7Days += 1;
      }
    });
    
    const processedUsers = Object.values(userStats).map(user => {
      const daysSinceLastActivity = user.lastActivityDate 
        ? Math.floor((today - user.lastActivityDate) / (1000 * 60 * 60 * 24))
        : 999;
      
      // ========== CORRECCIÓN: Calcular beneficiarios únicos por usuario ==========
      const uniqueBeneficiaries = calculateUniqueAttendanceByUser(activities, user.uid);
      
      return {
        ...user,
        totalBeneficiaries: uniqueBeneficiaries,  // VALOR CORREGIDO
        daysSinceLastActivity,
        isActive: daysSinceLastActivity <= 2 && user.activitiesLast7Days > 0,
        needsAlert: weekdaysInLastTwoDays > 0 && daysSinceLastActivity >= 2
      };
    });
    
    const activeUsers = processedUsers
      .filter(u => u.isActive)
      .sort((a, b) => b.activitiesLast7Days - a.activitiesLast7Days);
    
    const inactiveUsers = processedUsers
      .filter(u => !u.isActive)
      .sort((a, b) => a.daysSinceLastActivity - b.daysSinceLastActivity);
    
    const inactiveAlerts = processedUsers
      .filter(u => u.needsAlert)
      .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
    
    return { activeUsers, inactiveUsers, inactiveAlerts };
  };

  const { activeUsers, inactiveUsers, inactiveAlerts } = getUserActivityStats();
  const allUsers = [...activeUsers, ...inactiveUsers];

  return (
    <Box>
      {inactiveAlerts.length > 0 && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            ⚠️ {inactiveAlerts.length} usuario(s) inactivo(s) por más de 2 días laborables
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {inactiveAlerts.slice(0, 5).map((user, index) => (
              <Chip 
                key={index}
                label={`${user.name} (${user.daysSinceLastActivity}d)`}
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
                (actividad en últimos 2 días)
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
                (sin actividad reciente)
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
                ({user.contractor})
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Reporte Detallado por Usuario de Campo" />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Usuario</strong></TableCell>
                      <TableCell align="center"><strong>Estado</strong></TableCell>
                      <TableCell align="center"><strong>Total</strong></TableCell>
                      <TableCell align="center"><strong>Educativas</strong></TableCell>
                      <TableCell align="center"><strong>Nutricionales</strong></TableCell>
                      <TableCell align="center"><strong>Beneficiarios</strong></TableCell>
                      <TableCell><strong>Estrategias Top</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos de usuarios para mostrar
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allUsers.map((userData, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {userData.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={userData.isActive ? 'Activo' : `${userData.daysSinceLastActivity}d inactivo`}
                              color={userData.isActive ? 'success' : userData.needsAlert ? 'error' : 'warning'}
                              size="small"
                            />
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
                                .sort(([,a], [,b]) => b - a)
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