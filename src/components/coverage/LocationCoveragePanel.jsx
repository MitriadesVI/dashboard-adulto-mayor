// src/components/coverage/LocationCoveragePanel.jsx
//
// "Cobertura de sedes": qué sedes registradas (CDV y parques) han recibido atención y
// cuáles no. Componente genérico: lo usa el dashboard del contratista y puede usarlo el
// distrito con todas las sedes y todas las actividades (showContractor).

import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardActionArea, CardContent, Chip, Alert, Tooltip,
  FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, LinearProgress, Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

import { formatDate } from '../dashboard/common/helpers';
import { toDateKey, todayKey } from '../../utils/dates';
import { getContractorName, getContractorColor } from '../../config/contractors';
import {
  COVERAGE_STATUS,
  OK_MAX_DAYS,
  WARNING_MAX_DAYS,
  JORNADA_WINDOW_WORKING_DAYS,
  RECENT_WINDOW_DAYS,
  computeLocationCoverage,
  summarizeCoverage
} from './coverageUtils';

const STATUS_META = {
  [COVERAGE_STATUS.OK]: {
    label: 'Al día',
    color: 'success',
    description: `Atendida en los últimos ${OK_MAX_DAYS} días`
  },
  [COVERAGE_STATUS.WARNING]: {
    label: 'En alerta',
    color: 'warning',
    description: `Sin atención hace ${OK_MAX_DAYS + 1} a ${WARNING_MAX_DAYS} días`
  },
  [COVERAGE_STATUS.CRITICAL]: {
    label: 'Crítica',
    color: 'error',
    description: `Sin atención hace más de ${WARNING_MAX_DAYS} días`
  },
  [COVERAGE_STATUS.NEVER]: {
    label: 'Nunca atendida',
    color: 'error',
    description: 'No tiene ninguna actividad aprobada'
  }
};

const TYPE_LABELS = { center: 'CDV', park: 'Parque', unknown: 'Otro' };

// Valor por el que se ordena cada columna
const SORT_VALUES = {
  name: (row) => row.name,
  contractor: (row) => getContractorName(row.contractor),
  type: (row) => TYPE_LABELS[row.type],
  days: (row) => (row.daysSince === null ? Infinity : row.daysSince),
  activities30: (row) => row.activities30,
  beneficiaries30: (row) => row.beneficiaries30,
  pending: (row) => row.pendingCount,
  jornada: (row) => (row.jornada ? row.jornada.percent : -1)
};

const TEXT_COLUMNS = ['name', 'contractor', 'type'];

const compareValues = (a, b) => {
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const formatDaysSince = (days) => {
  if (days === null) return 'Nunca';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Hace 1 día';
  return `Hace ${days} días`;
};

const getJornadaColor = (percent) => {
  if (percent >= 80) return 'success';
  if (percent >= 50) return 'warning';
  return 'error';
};

const SummaryCard = ({ label, value, caption, color, selected, onClick }) => (
  <Card
    variant="outlined"
    sx={{ borderColor: selected ? color : 'divider', borderWidth: selected ? 2 : 1 }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography variant="h4" component="div" sx={{ color, fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: '1.5em' }}>
          {caption || ' '}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

const LocationCoveragePanel = ({
  locations,
  activities,
  title = 'Cobertura de sedes',
  showContractor = false,
  referenceDate
}) => {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contractorFilter, setContractorFilter] = useState('all');
  const [orderBy, setOrderBy] = useState('days');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // La fecha de corte se reduce a 'YYYY-MM-DD' para que un Date nuevo en cada render
  // del padre no invalide la memoización.
  const referenceKey = toDateKey(referenceDate) || todayKey();

  const coverage = useMemo(
    () => computeLocationCoverage(locations, activities, referenceKey),
    [locations, activities, referenceKey]
  );

  const contractorOptions = useMemo(() => {
    if (!showContractor) return [];
    return Array.from(new Set(coverage.rows.map((row) => row.contractor).filter(Boolean)))
      .sort((a, b) => getContractorName(a).localeCompare(getContractorName(b), 'es'));
  }, [coverage.rows, showContractor]);

  // Filas tras los filtros de texto, tipo y contratista (las tarjetas resumen cuentan sobre estas)
  const baseRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return coverage.rows.filter((row) => {
      if (typeFilter !== 'all' && row.type !== typeFilter) return false;
      if (showContractor && contractorFilter !== 'all' && row.contractor !== contractorFilter) return false;
      if (search && !`${row.name} ${row.address}`.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [coverage.rows, searchText, typeFilter, contractorFilter, showContractor]);

  const summary = useMemo(() => summarizeCoverage(baseRows), [baseRows]);

  const sortedRows = useMemo(() => {
    const filtered = baseRows.filter((row) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'attention') {
        return row.status === COVERAGE_STATUS.CRITICAL || row.status === COVERAGE_STATUS.NEVER;
      }
      return row.status === statusFilter;
    });
    const getValue = SORT_VALUES[orderBy] || SORT_VALUES.days;
    return [...filtered].sort((a, b) => {
      const result = compareValues(getValue(a), getValue(b));
      if (result !== 0) return order === 'asc' ? result : -result;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
  }, [baseRows, statusFilter, orderBy, order]);

  const lastPage = Math.max(0, Math.ceil(sortedRows.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, lastPage);
  const visibleRows = sortedRows.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

  const handleSort = (columnId) => {
    if (orderBy === columnId) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(columnId);
      setOrder(TEXT_COLUMNS.includes(columnId) ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(0);
  };

  const renderSortableHeader = (columnId, label, tooltip) => {
    const header = (
      <TableSortLabel
        active={orderBy === columnId}
        direction={orderBy === columnId ? order : 'asc'}
        onClick={() => handleSort(columnId)}
      >
        {label}
      </TableSortLabel>
    );
    return tooltip ? <Tooltip title={tooltip}>{header}</Tooltip> : header;
  };

  const stickyCell = { position: 'sticky', left: 0, bgcolor: 'background.paper' };

  const hasLocations = coverage.rows.length > 0;
  const { unmatched } = coverage;
  const unmatchedNames = unmatched.byName.slice(0, 5);
  const unmatchedRest = unmatched.byName.length - unmatchedNames.length;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Corte al {formatDate(referenceKey)}. Se considera atención toda actividad aprobada en la sede.
        </Typography>
      </Box>

      {!hasLocations && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aún no hay sedes activas registradas. Cuando se registren, aquí verás cuáles han recibido
          atención y cuáles no.
        </Alert>
      )}

      {hasLocations && (
        <>
          {/* TARJETAS RESUMEN (también funcionan como filtro rápido de estado) */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              mb: 2,
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }
            }}
          >
            <SummaryCard
              label="Total de sedes"
              value={summary.total}
              caption="Sedes activas"
              color="primary.main"
              selected={statusFilter === 'all'}
              onClick={() => handleStatusFilter('all')}
            />
            <SummaryCard
              label={`Atendidas últimos ${OK_MAX_DAYS} días`}
              value={summary.ok}
              caption="Al día"
              color="success.main"
              selected={statusFilter === COVERAGE_STATUS.OK}
              onClick={() => handleStatusFilter(COVERAGE_STATUS.OK)}
            />
            <SummaryCard
              label={`En alerta (${OK_MAX_DAYS + 1}–${WARNING_MAX_DAYS} días)`}
              value={summary.warning}
              caption="Requieren visita pronto"
              color="warning.main"
              selected={statusFilter === COVERAGE_STATUS.WARNING}
              onClick={() => handleStatusFilter(COVERAGE_STATUS.WARNING)}
            />
            <SummaryCard
              label={`Críticas (>${WARNING_MAX_DAYS} días) o nunca`}
              value={summary.needsAttention}
              caption={summary.never > 0 ? `${summary.never} nunca atendida${summary.never === 1 ? '' : 's'}` : 'Sin atención prolongada'}
              color="error.main"
              selected={statusFilter === 'attention'}
              onClick={() => handleStatusFilter('attention')}
            />
          </Box>

          {/* FILTROS */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              mb: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: showContractor ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr'
              }
            }}
          >
            <TextField
              size="small"
              label="Buscar sede"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel id="coverage-type-label">Tipo de sede</InputLabel>
              <Select
                labelId="coverage-type-label"
                label="Tipo de sede"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="center">CDV (centros)</MenuItem>
                <MenuItem value="park">Parques</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="coverage-status-label">Estado</InputLabel>
              <Select
                labelId="coverage-status-label"
                label="Estado"
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value={COVERAGE_STATUS.OK}>{STATUS_META.ok.label} (≤ {OK_MAX_DAYS} días)</MenuItem>
                <MenuItem value={COVERAGE_STATUS.WARNING}>{STATUS_META.warning.label} ({OK_MAX_DAYS + 1}–{WARNING_MAX_DAYS} días)</MenuItem>
                <MenuItem value={COVERAGE_STATUS.CRITICAL}>{STATUS_META.critical.label} (&gt; {WARNING_MAX_DAYS} días)</MenuItem>
                <MenuItem value={COVERAGE_STATUS.NEVER}>{STATUS_META.never.label}</MenuItem>
                <MenuItem value="attention">Críticas y nunca atendidas</MenuItem>
              </Select>
            </FormControl>
            {showContractor && (
              <FormControl size="small" fullWidth>
                <InputLabel id="coverage-contractor-label">Contratista</InputLabel>
                <Select
                  labelId="coverage-contractor-label"
                  label="Contratista"
                  value={contractorFilter}
                  onChange={(e) => { setContractorFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {contractorOptions.map((contractor) => (
                    <MenuItem key={contractor} value={contractor}>{getContractorName(contractor)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* TABLA (con desplazamiento horizontal en pantallas pequeñas) */}
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: showContractor ? 940 : 820 }} aria-label="Cobertura de sedes">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...stickyCell, zIndex: 3, minWidth: 150 }}>
                    {renderSortableHeader('name', 'Sede')}
                  </TableCell>
                  {showContractor && (
                    <TableCell>{renderSortableHeader('contractor', 'Contratista')}</TableCell>
                  )}
                  <TableCell>{renderSortableHeader('type', 'Tipo')}</TableCell>
                  <TableCell>
                    {renderSortableHeader('days', 'Última atención', 'Fecha de la última actividad aprobada en la sede')}
                  </TableCell>
                  <TableCell align="right">
                    {renderSortableHeader('activities30', 'Act. 30 d', `Actividades aprobadas en los últimos ${RECENT_WINDOW_DAYS} días`)}
                  </TableCell>
                  <TableCell align="right">
                    {renderSortableHeader('beneficiaries30', 'Benef. 30 d', `Beneficiarios únicos atendidos en los últimos ${RECENT_WINDOW_DAYS} días`)}
                  </TableCell>
                  <TableCell align="center">
                    {renderSortableHeader('pending', 'Pendientes', 'Actividades registradas que aún esperan aprobación')}
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    {renderSortableHeader(
                      'jornada',
                      'Jornadas J1/J2',
                      `Solo CDV: jornadas J1 y J2 con actividad aprobada en los últimos ${JORNADA_WINDOW_WORKING_DAYS} días hábiles (lunes a viernes)`
                    )}
                  </TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showContractor ? 9 : 8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        Ninguna sede coincide con los filtros seleccionados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => {
                    const meta = STATUS_META[row.status];
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell
                          sx={{
                            ...stickyCell,
                            zIndex: 1,
                            minWidth: 150,
                            maxWidth: 240,
                            borderLeft: 4,
                            borderLeftStyle: 'solid',
                            borderLeftColor: `${meta.color}.main`
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
                            {row.name}
                          </Typography>
                          {row.address && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                              {row.address}
                            </Typography>
                          )}
                        </TableCell>
                        {showContractor && (
                          <TableCell>
                            {row.contractor ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={getContractorName(row.contractor)}
                                sx={{
                                  color: getContractorColor(row.contractor),
                                  borderColor: getContractorColor(row.contractor)
                                }}
                              />
                            ) : '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip size="small" variant="outlined" label={TYPE_LABELS[row.type]} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2">
                            {row.lastAttentionDate ? formatDate(row.lastAttentionDate) : 'Sin registro'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDaysSince(row.daysSince)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{row.activities30}</TableCell>
                        <TableCell align="right">{row.beneficiaries30.toLocaleString('es-CO')}</TableCell>
                        <TableCell align="center">
                          {row.pendingCount > 0 ? (
                            <Chip size="small" color="warning" label={row.pendingCount} />
                          ) : (
                            <Typography variant="body2" color="text.secondary">0</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.jornada ? (
                            <Tooltip
                              title={`${row.jornada.covered} de ${row.jornada.expected} jornadas (J1/J2) con actividad aprobada en los últimos ${row.jornada.workingDays} días hábiles`}
                            >
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                  {row.jornada.percent}%{' '}
                                  <Typography component="span" variant="caption" color="text.secondary">
                                    ({row.jornada.covered}/{row.jornada.expected})
                                  </Typography>
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={row.jornada.percent}
                                  color={getJornadaColor(row.jornada.percent)}
                                  sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                                />
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={meta.description}>
                            <Chip
                              size="small"
                              color={meta.color}
                              variant={row.status === COVERAGE_STATUS.NEVER ? 'outlined' : 'filled'}
                              label={meta.label}
                            />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={sortedRows.length}
            page={currentPage}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Al día: hasta {OK_MAX_DAYS} días · En alerta: {OK_MAX_DAYS + 1} a {WARNING_MAX_DAYS} días · Crítica: más de {WARNING_MAX_DAYS} días.
            Jornadas J1/J2 (solo CDV): jornadas con actividad aprobada en los últimos {JORNADA_WINDOW_WORKING_DAYS} días
            hábiles (lunes a viernes) sobre {JORNADA_WINDOW_WORKING_DAYS * 2}; no descuenta festivos.
          </Typography>
        </>
      )}

      {unmatched.count > 0 && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          <strong>Sin sede registrada:</strong>{' '}
          {unmatched.count} actividad{unmatched.count === 1 ? '' : 'es'} en lugares que no coinciden con
          ninguna sede registrada ({unmatchedNames.map((item) => `${item.name} (${item.count})`).join(', ')}
          {unmatchedRest > 0 ? ` y ${unmatchedRest} más` : ''}).
          Revisa que el nombre del lugar sea igual al de la sede.
        </Alert>
      )}
    </Box>
  );
};

export default LocationCoveragePanel;
