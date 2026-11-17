// src/components/reports/MonthlyReportPage.jsx
//
// "Informe mensual de supervisión" de un contratista: vista previa en pantalla (imprimible)
// y descarga en PDF. Ruta /informe?contractor=<id>&month=YYYY-MM (distrito y representante).

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Box, Paper, Typography, Button, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Chip, Grid, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, GlobalStyles, LinearProgress, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AssessmentIcon from '@mui/icons-material/Assessment';

import activitiesService from '../../services/activitiesService';
import locationsService from '../../services/locationsService';
import goalsService from '../../services/goalsService';
import { CONTRACTORS, getContractor } from '../../config/contractors';
import {
  buildMonthlyReport, getMonthOptions, currentMonthKey, formatNumber, formatPercent, formatDateKey,
  MONTH_KEY_REGEX
} from './buildMonthlyReport';

const STATUS_COLOR = { ok: 'success.main', warning: 'warning.main', critical: 'error.main', never: 'error.main' };

const printStyles = (
  <GlobalStyles
    styles={{
      '@media print': {
        '.no-print': { display: 'none !important' },
        'header, nav, footer, .MuiAppBar-root': { display: 'none !important' },
        body: { background: '#fff !important' },
        '.report-sheet': { boxShadow: 'none !important', border: 'none !important' },
        '.report-section': { breakInside: 'avoid' },
        '@page': { size: 'A4 portrait', margin: '12mm' }
      }
    }}
  />
);

/* ------------------------------ piezas de presentación ------------------------------ */

const SectionTitle = ({ children }) => (
  <Typography
    variant="h6"
    component="h2"
    sx={{ mt: 4, mb: 1.5, pl: 1.5, py: 0.5, borderLeft: 4, borderColor: 'primary.main', bgcolor: 'action.hover', fontSize: '1.05rem' }}
  >
    {children}
  </Typography>
);

const KpiCard = ({ label, value, color = 'primary.main', caption }) => (
  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, minHeight: '2.6em' }}>
      {label}
    </Typography>
    <Typography variant="h5" component="div" sx={{ fontWeight: 700, color }}>
      {value}
    </Typography>
    {caption && (
      <Typography variant="caption" color="text.secondary">{caption}</Typography>
    )}
  </Paper>
);

const Empty = ({ children }) => (
  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>{children}</Typography>
);

const DataTable = ({ head, children, minWidth = 560 }) => (
  <TableContainer component={Paper} variant="outlined">
    <Table size="small" sx={{ minWidth }}>
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          {head.map((h, i) => (
            <TableCell key={h} align={i === 0 ? 'left' : 'center'} sx={{ fontWeight: 700 }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>{children}</TableBody>
    </Table>
  </TableContainer>
);

const center = { textAlign: 'center' };

/* ------------------------------ vista del informe ------------------------------ */

const ReportView = ({ report }) => {
  const { meta, summary, coverage, goals, components, delivery, professionals, quality, closing } = report;
  const jornadaPercent = summary.cdvJornadas.percent;

  return (
    <Paper className="report-sheet" variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
      {/* Encabezado */}
      <Box className="report-section">
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          {meta.program}
        </Typography>
        <Typography variant="h4" component="h1" color="primary" sx={{ fontWeight: 700, fontSize: { xs: '1.6rem', sm: '2.1rem' } }}>
          {meta.title}
        </Typography>
        <Typography variant="h6" component="p" sx={{ mt: 0.5 }}>{meta.contractorFullName}</Typography>
        <Typography variant="subtitle1">
          Periodo: <strong>{meta.periodLabel}</strong>
          {meta.cutoffNote ? ` (${meta.cutoffNote})` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Generado el {meta.generatedAtLabel}{meta.generatedBy ? ` por ${meta.generatedBy}` : ''}
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {report.isEmpty && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No hay actividades registradas por {meta.contractorName} en {meta.periodLabel}. Las secciones se muestran sin información del periodo.
        </Alert>
      )}

      {/* 1. Resumen */}
      <SectionTitle>1. Resumen del mes</SectionTitle>
      <Grid container spacing={1.5} className="report-section">
        {[
          ['Actividades educativas aprobadas', formatNumber(summary.educationalActivities)],
          ['Atenciones (personas atendidas)', formatNumber(summary.attentions)],
          ['Asistentes a actividades educativas', formatNumber(summary.attendees)],
          ['Raciones en CDV', formatNumber(summary.centerRations)],
          ['Meriendas en parques', formatNumber(summary.parkSnacks)],
          ['Jornadas atendidas', formatNumber(summary.jornadas)],
          ['Sedes atendidas / activas', `${formatNumber(summary.sedesAttended)} / ${formatNumber(summary.sedesActive)}`],
          ['Sedes sin atención en el mes', formatNumber(summary.sedesWithoutAttention), summary.sedesWithoutAttention > 0 ? 'error.main' : 'success.main'],
          [
            'Cobertura de jornadas en CDV',
            jornadaPercent === null ? 'Sin CDV' : formatPercent(jornadaPercent),
            jornadaPercent === null ? 'text.secondary' : jornadaPercent >= 80 ? 'success.main' : jornadaPercent >= 50 ? 'warning.main' : 'error.main',
            jornadaPercent === null ? undefined : `${formatNumber(summary.cdvJornadas.covered)} de ${formatNumber(summary.cdvJornadas.expected)} jornadas`
          ]
        ].map(([label, value, color, caption]) => (
          <Grid item xs={6} md={4} key={label}>
            <KpiCard label={label} value={value} color={color} caption={caption} />
          </Grid>
        ))}
      </Grid>

      {/* 2. Cobertura por sede */}
      <SectionTitle>2. Cobertura por sede</SectionTitle>
      {coverage.rows.length === 0 ? (
        <Empty>No hay sedes activas registradas para este contratista.</Empty>
      ) : (
        <DataTable
          minWidth={900}
          head={['Sede', 'Tipo', 'Días con atención', 'Jornadas cubiertas', 'Actividades', 'Atenciones', 'Raciones / meriendas', 'Última atención', 'Estado al corte']}
        >
          {coverage.rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
              <TableCell sx={center}>{row.typeLabel}</TableCell>
              <TableCell sx={{ ...center, color: row.daysWithAttention === 0 ? 'error.main' : undefined }}>
                {formatNumber(row.daysWithAttention)}
              </TableCell>
              <TableCell sx={center}>
                {row.jornadasExpected === null ? 'N/A' : `${row.jornadasCovered} de ${row.jornadasExpected}`}
              </TableCell>
              <TableCell sx={center}>{formatNumber(row.activities)}</TableCell>
              <TableCell sx={center}>{formatNumber(row.attentions)}</TableCell>
              <TableCell sx={center}>{formatNumber(row.rations)}</TableCell>
              <TableCell sx={center}>{row.lastAttentionKey ? formatDateKey(row.lastAttentionKey) : 'Nunca'}</TableCell>
              <TableCell sx={{ ...center, color: STATUS_COLOR[row.status], fontWeight: 700 }}>{row.statusLabel}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Box className="report-section" sx={{ mt: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main' }}>
          Sedes sin atención en el mes
        </Typography>
        {coverage.withoutAttention.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'success.main' }}>
            Todas las sedes activas recibieron al menos una atención aprobada en el periodo.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {coverage.withoutAttention.map((row) => (
              <Chip
                key={row.id}
                color="error"
                variant="outlined"
                label={`${row.name} (${row.typeLabel}) · última atención: ${row.lastAttentionKey ? formatDateKey(row.lastAttentionKey) : 'nunca'}`}
              />
            ))}
          </Box>
        )}
        {coverage.unmatchedCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Nota: {coverage.unmatchedCount} actividad(es) están registradas en lugares que no coinciden con ninguna sede registrada.
          </Typography>
        )}
      </Box>

      {/* 3. Metas */}
      <SectionTitle>{`3. Avance de metas anuales ${goals.year}`}</SectionTitle>
      {!goals.available ? (
        <Empty>No hay metas configuradas para {meta.contractorName} en {goals.year}.</Empty>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Porcentaje esperado al corte ({meta.cutoffLabel}): <strong>{formatPercent(goals.expectedPercent)}</strong> del año.
            {goals.riskCount > 0 && (
              <> <strong style={{ color: '#d32f2f' }}>{goals.riskCount} estrategia{goals.riskCount === 1 ? '' : 's'} en riesgo.</strong></>
            )}
          </Typography>
          <DataTable
            minWidth={680}
            head={['Estrategia', 'Meta anual', 'Ejecutado en el mes', 'Acumulado del año', '% avance', '% esperado', 'Estado']}
          >
            {goals.components.map((component) => (
              <React.Fragment key={component.id}>
                <TableRow sx={{ bgcolor: 'action.selected' }}>
                  <TableCell colSpan={7} sx={{ fontWeight: 700 }}>{component.label}</TableCell>
                </TableRow>
                {component.rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell sx={center}>{formatNumber(row.goal)}</TableCell>
                    <TableCell sx={center}>{formatNumber(row.inMonth)}</TableCell>
                    <TableCell sx={center}>{formatNumber(row.accumulated)}</TableCell>
                    <TableCell sx={center}>
                      <Box sx={{ minWidth: 80 }}>
                        {formatPercent(row.progressPercent)}
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, row.progressPercent)}
                          color={row.atRisk ? 'error' : 'success'}
                          sx={{ height: 5, borderRadius: 3, mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={center}>{formatPercent(row.expectedPercent)}</TableCell>
                    <TableCell sx={center}>
                      <Chip size="small" color={row.atRisk ? 'error' : 'success'} label={row.atRisk ? 'En riesgo' : 'Al ritmo'} />
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </DataTable>
        </>
      )}

      {/* 4. Componentes */}
      <SectionTitle>4. Actividades por componente y estrategia</SectionTitle>
      <DataTable head={['Componente / estrategia', 'Actividades', 'Atenciones']} minWidth={420}>
        {components.map((component) => (
          <React.Fragment key={component.type}>
            <TableRow sx={{ bgcolor: 'action.selected' }}>
              <TableCell sx={{ fontWeight: 700 }}>{component.label}</TableCell>
              <TableCell sx={{ ...center, fontWeight: 700 }}>{formatNumber(component.activities)}</TableCell>
              <TableCell sx={{ ...center, fontWeight: 700 }}>{formatNumber(component.attentions)}</TableCell>
            </TableRow>
            {component.strategies.length === 0 && (
              <TableRow>
                <TableCell sx={{ pl: 4, color: 'text.secondary' }} colSpan={3}>Sin actividades en el periodo</TableCell>
              </TableRow>
            )}
            {component.strategies.map((strategy) => (
              <TableRow key={strategy.subtype}>
                <TableCell sx={{ pl: 4 }}>{strategy.label}</TableCell>
                <TableCell sx={center}>{formatNumber(strategy.activities)}</TableCell>
                <TableCell sx={center}>{formatNumber(strategy.attentions)}</TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
        <TableRow sx={{ bgcolor: 'action.selected' }}>
          <TableCell sx={{ fontWeight: 700 }} colSpan={3}>Entrega de alimentación</TableCell>
        </TableRow>
        {delivery.map((item) => (
          <TableRow key={item.label}>
            <TableCell sx={{ pl: 4 }}>{item.label}</TableCell>
            <TableCell sx={center}>{formatNumber(item.activities)}</TableCell>
            <TableCell sx={center}>{formatNumber(item.rations)} raciones</TableCell>
          </TableRow>
        ))}
      </DataTable>

      {/* 5. Profesionales */}
      <SectionTitle>5. Desempeño por profesional</SectionTitle>
      {professionals.length === 0 ? (
        <Empty>No hay actividades aprobadas en el periodo.</Empty>
      ) : (
        <DataTable
          minWidth={640}
          head={['Profesional', 'Actividades', 'Atenciones', 'Sedes distintas', 'Días con actividad', 'Registradas por otra persona']}
        >
          {professionals.map((p) => (
            <TableRow key={p.uid} hover>
              <TableCell>{p.name}</TableCell>
              <TableCell sx={center}>{formatNumber(p.activities)}</TableCell>
              <TableCell sx={center}>{formatNumber(p.attentions)}</TableCell>
              <TableCell sx={center}>{formatNumber(p.sedes)}</TableCell>
              <TableCell sx={center}>{formatNumber(p.activeDays)}</TableCell>
              <TableCell sx={center}>{formatNumber(p.onBehalf)}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      {/* 6. Calidad */}
      <SectionTitle>6. Calidad del registro</SectionTitle>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Actividades con fecha dentro del periodo, en cualquier estado.
      </Typography>
      <Grid container spacing={1.5} className="report-section">
        {[
          ['Registradas', formatNumber(quality.registered)],
          ['Aprobadas', formatNumber(quality.approved), 'success.main'],
          ['Rechazadas', formatNumber(quality.rejected), quality.rejected > 0 ? 'error.main' : undefined],
          ['Pendientes de aprobación', formatNumber(quality.pending), quality.pending > 0 ? 'warning.main' : undefined],
          ['Sin enlace de evidencia', formatPercent(quality.withoutLinkPercent), quality.withoutLinkPercent > 0 ? 'warning.main' : undefined, `${formatNumber(quality.withoutLink)} actividad(es)`],
          [`Con más de ${quality.lateDays} días de retraso`, formatNumber(quality.late), quality.late > 0 ? 'warning.main' : undefined],
          ['Cargadas por encargado o representante', formatNumber(quality.onBehalf)]
        ].map(([label, value, color, caption]) => (
          <Grid item xs={6} md={3} key={label}>
            <KpiCard label={label} value={value} color={color} caption={caption} />
          </Grid>
        ))}
      </Grid>
      {quality.topRejectionReasons.length > 0 && (
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          <strong>Principales motivos de rechazo:</strong>{' '}
          {quality.topRejectionReasons.map((r) => `${r.reason} (${r.count})`).join('; ')}.
        </Typography>
      )}

      {/* 7. Cierre */}
      <Box className="report-section">
        <SectionTitle>7. Observaciones y firmas</SectionTitle>
        <Typography variant="subtitle2" gutterBottom>{closing.observationsLabel}</Typography>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: 120 }} />
        <Grid container spacing={6} sx={{ mt: 4 }}>
          {closing.signatures.map((label) => (
            <Grid item xs={12} sm={6} key={label}>
              <Box sx={{ borderTop: 1, borderColor: 'text.primary', pt: 0.5, textAlign: 'center' }}>
                <Typography variant="body2">{label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 4 }}>
          {closing.footnotes.map((note, index) => (
            <Typography key={note} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {index + 1}. {note}
            </Typography>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

/* ------------------------------ página ------------------------------ */

const MonthlyReportPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const lockedContractor = user?.role === 'district' ? null : (user?.contractor || null);
  const monthOptions = useMemo(() => getMonthOptions(new Date(), 24), []);

  // Valores iniciales desde la URL (una sola vez)
  const [initial] = useState(() => {
    const paramContractor = searchParams.get('contractor');
    const paramMonth = searchParams.get('month');
    const contractor = lockedContractor
      || (getContractor(paramContractor) ? paramContractor : CONTRACTORS[0].id);
    const month = MONTH_KEY_REGEX.test(paramMonth || '') && paramMonth <= currentMonthKey()
      ? paramMonth
      : currentMonthKey();
    return { contractor, month };
  });

  const [contractorInput, setContractorInput] = useState(initial.contractor);
  const [monthInput, setMonthInput] = useState(initial.month);
  // Parámetros aplicados; `nonce` fuerza una nueva carga al pulsar "Generar" con los mismos valores
  const [applied, setApplied] = useState({ ...initial, nonce: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const contractor = lockedContractor || applied.contractor;
  const monthKey = applied.month;

  useEffect(() => {
    if (!contractor) {
      setLoading(false);
      setError('Tu usuario no tiene una entidad asignada.');
      return undefined;
    }
    let cancelled = false;
    const year = Number(monthKey.slice(0, 4));
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const newWarnings = [];
        const [activities, locations, goals] = await Promise.all([
          activitiesService.getActivitiesByContractor(contractor),
          locationsService.getLocationsByContractor(contractor).catch((err) => {
            console.error('Error al cargar sedes para el informe:', err);
            newWarnings.push('No se pudieron cargar las sedes registradas; la cobertura por sede puede estar incompleta.');
            return [];
          }),
          goalsService.getGoals(contractor, year).catch((err) => {
            console.error('Error al cargar metas para el informe:', err);
            newWarnings.push('No se pudieron cargar las metas anuales.');
            return null;
          })
        ]);
        if (cancelled) return;
        setData({ activities, locations, goals, generatedAt: new Date() });
        setWarnings(newWarnings);
      } catch (err) {
        console.error('Error al generar el informe mensual:', err);
        if (!cancelled) {
          setData(null);
          setError('No se pudo generar el informe. Verifica tu conexión e inténtalo de nuevo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contractor, monthKey, applied.nonce]);

  const report = useMemo(() => {
    if (!data) return null;
    try {
      return buildMonthlyReport(contractor, monthKey, {
        activities: data.activities,
        locations: data.locations,
        goals: data.goals,
        generatedBy: user?.name || user?.displayName || user?.email || '',
        now: data.generatedAt
      });
    } catch (err) {
      console.error('Error al construir el informe:', err);
      return null;
    }
  }, [data, contractor, monthKey, user]);

  const handleGenerate = useCallback(() => {
    setApplied((prev) => ({ contractor: contractorInput, month: monthInput, nonce: prev.nonce + 1 }));
    const params = {};
    if (!lockedContractor) params.contractor = contractorInput;
    params.month = monthInput;
    setSearchParams(params, { replace: true });
  }, [contractorInput, monthInput, lockedContractor, setSearchParams]);

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { downloadMonthlyReportPdf } = await import('./monthlyReportPdf');
      await downloadMonthlyReportPdf(report);
    } catch (err) {
      console.error('Error al generar el PDF:', err);
      setDownloadError('No se pudo generar el PDF. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {printStyles}

      <Box className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h5" component="h1">Informe mensual de supervisión</Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            {!lockedContractor && (
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 240 } }}>
                <InputLabel id="informe-contratista">Entidad contratista</InputLabel>
                <Select
                  labelId="informe-contratista"
                  label="Entidad contratista"
                  value={contractorInput}
                  onChange={(e) => setContractorInput(e.target.value)}
                >
                  {CONTRACTORS.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel id="informe-mes">Mes</InputLabel>
              <Select
                labelId="informe-mes"
                label="Mes"
                value={monthInput}
                onChange={(e) => setMonthInput(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {monthOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleGenerate} disabled={loading}>
              Generar
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={downloading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
              onClick={handleDownload}
              disabled={!report || loading || downloading}
            >
              {downloading ? 'Generando PDF...' : 'Descargar PDF'}
            </Button>
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Volver
            </Button>
          </Box>
        </Paper>

        {warnings.map((warning) => (
          <Alert key={warning} severity="warning" sx={{ mb: 2 }}>{warning}</Alert>
        ))}
        {downloadError && <Alert severity="error" sx={{ mb: 2 }}>{downloadError}</Alert>}
      </Box>

      {loading && (
        <Box className="no-print" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">Generando informe...</Typography>
        </Box>
      )}

      {!loading && error && (
        <Alert
          className="no-print"
          severity="error"
          action={<Button color="inherit" size="small" onClick={handleGenerate}>Reintentar</Button>}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && report && <ReportView report={report} />}
    </Container>
  );
};

export default MonthlyReportPage;
