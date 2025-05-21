// src/components/dashboard/filters/FilterContext.jsx

import React, { createContext, useState, useContext } from 'react';

// Crear contexto
const FilterContext = createContext();

// Hook personalizado para usar el contexto
export const useFilterContext = () => useContext(FilterContext);

// Proveedor del contexto
export const FilterProvider = ({ children, initialFilters = {} }) => {
  // Estado para los filtros
  const [filters, setFilters] = useState({
    contractor: initialFilters.contractor || 'all',
    type: initialFilters.type || 'all',
    locationType: initialFilters.locationType || 'all',
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
  });
  
  // Función para actualizar un filtro específico
  const updateFilter = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  // Función para resetear todos los filtros
  const resetFilters = () => {
    setFilters({
      contractor: 'all',
      type: 'all',
      locationType: 'all',
      startDate: '',
      endDate: '',
    });
  };
  
  // Valor del contexto
  const value = {
    filters,
    updateFilter,
    resetFilters,
    setFilters
  };
  
  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};