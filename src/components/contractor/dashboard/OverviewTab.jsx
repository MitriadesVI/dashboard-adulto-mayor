// src/components/contractor/dashboard/OverviewTab.jsx

import React, { useMemo } from 'react';
import { Grid, Card, CardContent, CardHeader, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { toDateKey } from '../../../utils/dates';
import {
  getActivityTypeLabel,
  getEducationalActivityCount,
  calculateUniqueAttendance,
  formatDate
} from '../../dashboard/common/helpers';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#E53935', '#1976D2', '#8E24AA'];
const GOAL_COMPONENTS = ['nutrition', 'physical', 'psychosocial'];

/**
 * Avance general de metas (0-100) o null si no hay metas cargadas para el año.
 * Promedia solo los componentes que tienen alguna meta > 0 (un componente sin meta no cuenta
 * como 0%) y limita cada componente a 100% para que una estrategia sobrecumplida no infle el total.
 */
export const getOverallProgress = (goals) => {
  if (!goals || !goals.hasGoals) return null;

  const components = GOAL_COMPONENTS.filter((component) =>
    Object.values(goals.goals?.[component] || {}).some((value) => Number(value) > 0)
  );
  if (components.length === 0) return null;

  const total = components.reduce(
    (sum, component) => sum + Math.min(100, Number(goals.averages?.[component]) || 0),
    0
  );
  return total / components.length;
};

const OverviewTab = ({ activities, goals, user }) => {
  const contractor = user?.contractor;

  const dataByType = useMemo(() => {
    const counts = {};
    activities.forEach((activity) => {
      if (!activity || !activity.educationalActivity?.included) return;

      const type = activity.educationalActivity.type;
      const label = getActivityTypeLabel(type, activity.contractor || contractor);
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activities, contractor]);

  const dataByDate = useMemo(() => {
    const counts = {};
    activities.forEach((activity) => {
      if (!activity || !activity.educationalActivity?.included) return;

      const dateKey = activity.dateKey || toDateKey(activity.date);
      if (!dateKey) return;
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    // Las claves 'YYYY-MM-DD' se ordenan correctamente como texto
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [activities]);

  // Evita el doble conteo: agrupa por ubicación + fecha + jornada y toma el máximo
  const beneficiariesTotal = useMemo(() => calculateUniqueAttendance(activities), [activities]);
  const educationalCount = useMemo(() => getEducationalActivityCount(activities), [activities]);
  const overallProgress = useMemo(() => getOverallProgress(goals), [goals]);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                Actividades Educativas
              </Typography>
              <Typography variant="h3" align="center" color="primary">
                {educationalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                Total de Beneficiarios
              </Typography>
              <Typography variant="h3" align="center" color="primary">
                {beneficiariesTotal}
              </Typography>
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                (Evita duplicados por jornada)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                % Avance General
              </Typography>
              <Typography variant="h3" align="center" color="primary">
                {overallProgress === null ? '—' : `${Math.round(overallProgress)}%`}
              </Typography>
              {overallProgress === null && (
                <Typography variant="caption" align="center" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  (Sin metas cargadas para este año)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Actividades Educativas por Tipo" />
            <CardContent>
              {dataByType.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
                  No hay actividades educativas para los filtros seleccionados.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dataByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {dataByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Actividades por Fecha" />
            <CardContent>
              {dataByDate.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
                  No hay actividades educativas para los filtros seleccionados.
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dataByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => formatDate(value).slice(0, 5)} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(value) => formatDate(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="Actividades" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewTab;
