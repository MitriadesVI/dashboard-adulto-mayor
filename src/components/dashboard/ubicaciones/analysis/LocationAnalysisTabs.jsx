import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Box, Tabs, Tab, CardContent, Typography, Grid, 
  Button, IconButton, Alert, Chip
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PieChartIcon from '@mui/icons-material/PieChart';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

// Importar charts individuales
import WeeklyTrendChart from '../charts/WeeklyTrendChart';
import MonthlyCalendarChart from '../charts/MonthlyCalendarChart';
import ComponentsDistributionChart from '../charts/ComponentsDistributionChart';

// Componente mejorado para navegación de meses
const MonthNavigation = ({ selectedMonth, availableMonths, onMonthChange }) => {
  const currentIndex = availableMonths.indexOf(selectedMonth);
  
  const formatMonthName = (monthStr) => {
    try {
      return new Date(monthStr + '-01').toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return monthStr;
    }
  };

  if (availableMonths.length <= 1) {
    return (
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Chip 
          icon={<CalendarMonthIcon />}
          label={formatMonthName(selectedMonth)}
          color="primary"
          variant="outlined"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
      <IconButton 
        disabled={currentIndex <= 0}
        onClick={() => onMonthChange(availableMonths[currentIndex - 1])}
        size="small"
        sx={{ mr: 1 }}
      >
        <ArrowBackIosIcon />
      </IconButton>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
        <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ minWidth: '200px', textAlign: 'center' }}>
          {formatMonthName(selectedMonth)}
        </Typography>
      </Box>
      
      <IconButton 
        disabled={currentIndex >= availableMonths.length - 1}
        onClick={() => onMonthChange(availableMonths[currentIndex + 1])}
        size="small"
        sx={{ ml: 1 }}
      >
        <ArrowForwardIosIcon />
      </IconButton>
      
      {/* Indicador de posición */}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
        {currentIndex + 1} de {availableMonths.length}
      </Typography>
    </Box>
  );
};

const LocationAnalysisTabs = ({ analysisData, onMonthChange }) => {
  const [tabValue, setTabValue] = useState(0);
  
  // ✅ INICIALIZAR MES ACTUAL CON EL PRIMER MES DISPONIBLE
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (analysisData?.charts?.availableMonths?.length > 0) {
      return analysisData.charts.availableMonths[0];
    }
    return new Date().toISOString().slice(0, 7);
  });

  // ✅ ACTUALIZAR MES CUANDO CAMBIEN LOS DATOS
  useEffect(() => {
    if (analysisData?.charts?.availableMonths?.length > 0) {
      const firstAvailableMonth = analysisData.charts.availableMonths[0];
      if (currentMonth !== firstAvailableMonth) {
        setCurrentMonth(firstAvailableMonth);
      }
    }
  }, [analysisData?.charts?.availableMonths, currentMonth]);

  const handleMonthChange = (newMonth) => {
    console.log('📅 Cambiando mes de', currentMonth, 'a', newMonth);
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  // ✅ FILTRAR DATOS DEL CALENDARIO MENSUAL POR MES ACTUAL - CORREGIDO
  const currentMonthData = useMemo(() => {
    if (!analysisData?.charts?.monthlyCalendar) return [];
    
    // Convertir objeto a array si es necesario
    const calendarArray = Array.isArray(analysisData.charts.monthlyCalendar) 
      ? analysisData.charts.monthlyCalendar 
      : Object.values(analysisData.charts.monthlyCalendar);
    
    // Filtrar por mes actual
    const filtered = calendarArray.filter(day => {
      if (!day || !day.date) return false;
      return day.date.startsWith(currentMonth);
    });
    
    console.log(`📅 Datos mensuales para ${currentMonth}:`, {
      totalDatos: calendarArray.length,
      filtrados: filtered.length,
      muestra: filtered.slice(0, 2)
    });
    
    return filtered;
  }, [analysisData?.charts?.monthlyCalendar, currentMonth]);

  return (
    <Card>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)} 
          variant="fullWidth"
          sx={{ minHeight: 64 }}
        >
          <Tab 
            label="Tendencias Semanales" 
            icon={<TrendingUpIcon />} 
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab 
            label="Actividad Mensual" 
            icon={<CalendarTodayIcon />} 
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab 
            label="Tipos de Sesión" 
            icon={<PieChartIcon />} 
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Box>

      {/* Tab: Tendencias Semanales */}
      {tabValue === 0 && (
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tendencia Semanal de Asistencia y Sesiones
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Evolución temporal desde la primera semana con actividad registrada
          </Typography>
          
          {!analysisData.charts.weeklyTrend || analysisData.charts.weeklyTrend.length === 0 ? (
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>Sin datos semanales suficientes</Typography>
              <Typography variant="body2">
                Se necesitan actividades en al menos 2 semanas diferentes para mostrar tendencias.
                Actualmente solo hay datos en una semana o menos.
              </Typography>
            </Alert>
          ) : (
            <WeeklyTrendChart data={analysisData.charts.weeklyTrend} />
          )}
        </CardContent>
      )}

      {/* Tab: Calendario Mensual */}
      {tabValue === 1 && (
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Actividad Diaria por Mes
          </Typography>
          
          {/* Navegación de meses mejorada */}
          {analysisData.charts.availableMonths && analysisData.charts.availableMonths.length > 0 && (
            <MonthNavigation 
              selectedMonth={currentMonth}
              availableMonths={analysisData.charts.availableMonths}
              onMonthChange={handleMonthChange}
            />
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vista detallada de asistencia, raciones y sesiones por día. 
            {analysisData.charts.availableMonths?.length > 1 && 
              ' Use las flechas para navegar entre meses con datos.'}
          </Typography>
          
          <MonthlyCalendarChart 
            data={currentMonthData}
            currentMonth={currentMonth}
          />
        </CardContent>
      )}

      {/* Tab: Componentes */}
      {tabValue === 2 && (
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Distribución de Tipos de Sesiones de Servicio
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Importante:</strong> Las entregas de raciones NO se cuentan como actividades educativas.
            Solo se muestran las sesiones educativas reales agrupadas por estrategia.
          </Typography>
          <ComponentsDistributionChart 
            data={analysisData.charts.components}
            components={analysisData.components}
          />
        </CardContent>
      )}

      {/* Panel de información general */}
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              <strong>Período analizado:</strong> {analysisData.charts.availableMonths?.length || 0} meses con datos
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary" align="right">
              <strong>Última actualización:</strong> {new Date().toLocaleTimeString()}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
};

export default LocationAnalysisTabs;