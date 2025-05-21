// src/components/dashboard/common/helpers.js

// Función para obtener etiqueta del tipo de actividad
export const getActivityTypeLabel = (type, contractor) => {
  if (type === 'nutrition') {
    if (contractor === 'CUC') return 'Educación Nutricional';
    if (contractor === 'FUNDACARIBE') return 'Salud Nutricional';
    return 'Nutrición'; // Default para otros contratistas
  } else if (type === 'physical') {
    if (contractor === 'CUC') return 'Educación en Salud Física';
    if (contractor === 'FUNDACARIBE') return 'Salud Física';
    return 'Actividad Física'; // Default
  } else if (type === 'psychosocial') {
    if (contractor === 'CUC') return 'Educación Psicosocial';
    if (contractor === 'FUNDACARIBE') return 'Salud Psicosocial';
    return 'Actividad Psicosocial'; // Default
  }
  return 'Desconocido';
};

// Función para obtener etiqueta del subtipo de actividad
export const getActivitySubtypeLabel = (type, subtype, contractor) => {
  if (type === 'nutrition') {
    if (subtype === 'workshop') {
      if (contractor === 'CUC') return 'Taller educativo del cuidado nutricional';
      if (contractor === 'FUNDACARIBE') return 'Jornada de promoción de la salud nutricional';
      return 'Taller nutricional'; // Default
    } else if (subtype === 'ration') {
      return 'Raciones alimenticias/meriendas';
    }
  } else if (type === 'physical') {
    if (subtype === 'prevention') {
      return 'Charlas de prevención de enfermedad';
    } else if (subtype === 'therapeutic') {
      return 'Actividad física terapéutica';
    } else if (subtype === 'rumba') {
      return 'Rumbaterapia y ejercicios dirigidos';
    } else if (subtype === 'walking') {
      return 'Club de caminantes';
    }
  } else if (type === 'psychosocial') {
    if (subtype === 'mental') {
      return 'Jornadas/talleres en salud mental';
    } else if (subtype === 'cognitive') {
      return 'Jornadas/talleres cognitivos';
    } else if (subtype === 'abuse') {
      return 'Talleres en prevención al maltrato';
    } else if (subtype === 'arts') {
      return 'Talleres en artes y oficios';
    } else if (subtype === 'intergenerational') {
      return 'Encuentros intergeneracionales';
    }
  }
  return 'Subtipo Desconocido';
};

// Formatear fechas
export const formatDate = (dateString) => {
  if (!dateString) return 'Fecha desconocida';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    console.warn("Error al formatear fecha:", dateString);
    return dateString;
  }
};

// Colores para gráficos
export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#E53935', '#1976D2', '#8E24AA'];

export const PIE_COLORS = { 
  nutrition: '#4CAF50', 
  physical: '#2196F3', 
  psychosocial: '#9C27B0',
  unknown: '#757575'
};

// Función para exportar datos a CSV
export const exportToCSV = (activities) => {
  if (!activities || !activities.length) return;
  
  // Crear encabezado CSV
  let csv = 'Fecha,Tipo,Subtipo,Contratista,Ubicación,Tipo Ubicación,Beneficiarios,Descripción\n';
  
  // Agregar cada actividad
  activities.forEach(activity => {
    if (!activity) return;
    
    try {
      const row = [
        activity.date ? formatDate(activity.date) : '',
        activity.type ? getActivityTypeLabel(activity.type, activity.contractor) : '',
        activity.subtype ? getActivitySubtypeLabel(activity.type, activity.subtype, activity.contractor) : '',
        activity.contractor || '',
        activity.location?.name || '',
        activity.location?.type === 'center' ? 'Centro Fijo' : 'Espacio Comunitario',
        activity.beneficiaries || 0,
        activity.description ? `"${activity.description.replace(/"/g, '""')}"` : ''
      ];
      
      csv += row.join(',') + '\n';
    } catch (e) {
      console.warn("Error exportando actividad:", e);
    }
  });
  
  // Crear y descargar el archivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `actividades_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};