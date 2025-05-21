// src/components/dashboard/index.js

// Componente principal
export { default } from './Dashboard';

// Exportar otros componentes para uso externo
export { default as ActivityTypeChart } from './overview/ActivityTypeChart';
export { default as ActivitySubtypeChart } from './activities/ActivitySubtypeChart';
export { default as KPICards } from './overview/KPICards';
export { default as GoalsSummary } from './goals/GoalsSummary';
export { default as LocationManager } from './locations/LocationManager';
export { default as FilterPanel } from './filters/FilterPanel';
export { FilterProvider, useFilterContext } from './filters/FilterContext';