// src/components/field/stats/FieldExportButton.jsx
import React from 'react';
import { Button } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { prepareDataForCSVExport } from '../utils/fieldHelpers';

const FieldExportButton = ({ activities, userContractor, dateRange, periodLabel }) => {
  
  // Función para generar CSV directamente (sin usar helpers.js)
  const generateCSVDirect = (data, fileName) => {
    if (!data || data.length === 0) return;
    
    // Crear encabezados
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(',') + '\n';
    
    // Agregar filas de datos
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] || '';
        // Convertir a string y escapar comillas
        value = String(value).replace(/"/g, '""');
        // Envolver en comillas si contiene comas
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        return value;
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Crear y descargar archivo
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generando CSV:', error);
      alert('Error al generar el archivo CSV.');
    }
  };

  const handleExport = () => {
    if (!activities || activities.length === 0) {
      alert('No hay actividades para exportar en el período seleccionado.');
      return;
    }

    console.log('Actividades a exportar:', activities.length);

    // Filtrar solo actividades aprobadas y pendientes
    const activitiesToExport = activities.filter(
      (activity) => activity && (activity.status === 'approved' || activity.status === 'pending')
    );
    
    console.log('Actividades después del filtro:', activitiesToExport.length);
    
    if (activitiesToExport.length === 0) {
        alert('No hay actividades aprobadas o pendientes para exportar en el período seleccionado.');
        return;
    }

    // Preparar datos usando el helper corregido
    const dataForCSV = prepareDataForCSVExport(activitiesToExport, userContractor);
    
    console.log('Datos preparados para CSV:', dataForCSV.length);
    console.log('Muestra de datos:', dataForCSV.slice(0, 3));

    if (dataForCSV && dataForCSV.length > 0) {
      // Generar nombre de archivo con rango de fechas
      const startDateStr = dateRange.currentStartDate.toISOString().slice(0, 10);
      const endDateStr = dateRange.currentEndDate.toISOString().slice(0, 10);
      const fileName = `reporte_actividades_${userContractor}_${startDateStr}_a_${endDateStr}.csv`;
      
      console.log('Generando CSV con nombre:', fileName);
      
      // Usar función directa de CSV
      generateCSVDirect(dataForCSV, fileName);
    } else {
      alert('No hay datos válidos para exportar después del procesamiento.');
    }
  };

  return (
    <Button
      variant="outlined"
      startIcon={<FileDownloadIcon />}
      onClick={handleExport}
      disabled={!activities || activities.length === 0}
    >
      Exportar CSV ({periodLabel})
    </Button>
  );
};

export default FieldExportButton;