// src/components/coverage/CoverageMap.jsx
//
// Mapa de cobertura: cada sede con coordenadas se dibuja como un círculo coloreado según su
// estado de atención. También exporta LocationPickerMap, el mapa donde el Distrito marca la
// ubicación de una sede (usado en Gestión de Espacios).
//
// Se usa CircleMarker (vectorial) para no depender de los íconos por defecto de Leaflet,
// que fallan con los bundlers.

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Alert, Chip } from '@mui/material';

import { COVERAGE_STATUS } from './coverageUtils';
import { formatDate } from '../dashboard/common/helpers';
import { getContractorName } from '../../config/contractors';

export const BARRANQUILLA_CENTER = [10.9685, -74.7813];
const DEFAULT_ZOOM = 12;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const STATUS_STYLE = {
  [COVERAGE_STATUS.OK]: { label: 'Al día', fill: '#2e7d32', stroke: '#1b5e20' },
  [COVERAGE_STATUS.WARNING]: { label: 'En alerta', fill: '#ed6c02', stroke: '#b45309' },
  [COVERAGE_STATUS.CRITICAL]: { label: 'Crítica', fill: '#d32f2f', stroke: '#9a1c1c' },
  [COVERAGE_STATUS.NEVER]: { label: 'Nunca atendida', fill: '#9e9e9e', stroke: '#d32f2f' }
};

const TYPE_LABELS = { center: 'CDV (centro fijo)', park: 'Parque / espacio', unknown: 'Otro' };

const MAP_HEIGHT = { xs: 320, md: 420 };

/**
 * Lee las coordenadas de una sede ({lat, lng} o {latitude, longitude}; números o texto).
 * Devuelve { lat, lng } o null si faltan o no son válidas.
 */
export const parseCoordinates = (coordinates) => {
  if (!coordinates || typeof coordinates !== 'object') return null;
  const rawLat = coordinates.lat ?? coordinates.latitude;
  const rawLng = coordinates.lng ?? coordinates.longitude;
  const isEmpty = (value) => value === null || value === undefined || value === '';
  if (isEmpty(rawLat) || isEmpty(rawLng)) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const formatDaysSince = (days) => {
  if (days === null || days === undefined) return 'Nunca';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Hace 1 día';
  return `Hace ${days} días`;
};

// Ajusta la vista a los puntos y corrige el tamaño cuando el mapa se monta dentro de un contenedor animado
const FitToPoints = ({ points, boundsKey }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView(points[0], 15);
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
      }
    }, 50);
    return () => clearTimeout(timer);
    // points se recalcula en cada render del padre; boundsKey identifica su contenido
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);
  return null;
};

/**
 * @param {Array}  rows          Filas de cobertura (computeLocationCoverage().rows), ya filtradas si se desea
 * @param {Array}  locations     Sedes con `coordinates`
 * @param {boolean} showContractor  Mostrar el contratista en el popup
 */
const CoverageMap = ({ rows, locations, showContractor = false }) => {
  const { markers, missing } = useMemo(() => {
    const coordsById = new Map();
    (locations || []).forEach((location) => {
      if (location?.id) coordsById.set(location.id, parseCoordinates(location.coordinates));
    });
    const found = [];
    let withoutCoordinates = 0;
    (rows || []).forEach((row) => {
      const coords = coordsById.get(row.id);
      if (coords) found.push({ row, coords });
      else withoutCoordinates += 1;
    });
    return { markers: found, missing: withoutCoordinates };
  }, [rows, locations]);

  const points = useMemo(() => markers.map((m) => [m.coords.lat, m.coords.lng]), [markers]);
  const boundsKey = useMemo(() => points.map((p) => p.join(',')).join(';'), [points]);

  // Las sedes críticas se dibujan al final para que queden encima
  const ordered = useMemo(() => {
    const priority = {
      [COVERAGE_STATUS.OK]: 0, [COVERAGE_STATUS.WARNING]: 1, [COVERAGE_STATUS.NEVER]: 2, [COVERAGE_STATUS.CRITICAL]: 3
    };
    return [...markers].sort((a, b) => priority[a.row.status] - priority[b.row.status]);
  }, [markers]);

  return (
    <Box>
      {missing > 0 && (
        <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
          {missing} {missing === 1 ? 'sede sin coordenadas' : 'sedes sin coordenadas'} — el Distrito puede ubicarlas en Gestión de Espacios.
        </Alert>
      )}

      <Box sx={{ height: MAP_HEIGHT, borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
        <MapContainer
          center={BARRANQUILLA_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <FitToPoints points={points} boundsKey={boundsKey} />
          {ordered.map(({ row, coords }) => {
            const style = STATUS_STYLE[row.status] || STATUS_STYLE[COVERAGE_STATUS.NEVER];
            return (
              <CircleMarker
                key={row.id}
                center={[coords.lat, coords.lng]}
                radius={row.type === 'center' ? 10 : 8}
                pathOptions={{ color: style.stroke, fillColor: style.fill, fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
                    <Typography variant="body2">{TYPE_LABELS[row.type] || TYPE_LABELS.unknown}</Typography>
                    {showContractor && row.contractor && (
                      <Typography variant="body2">Entidad: {getContractorName(row.contractor)}</Typography>
                    )}
                    <Typography variant="body2" sx={{ color: style.fill, fontWeight: 700 }}>{style.label}</Typography>
                    <Typography variant="body2">
                      Última atención: {row.lastAttentionKey ? formatDate(row.lastAttentionKey) : 'Nunca'}
                    </Typography>
                    <Typography variant="body2">{formatDaysSince(row.daysSince)}</Typography>
                    <Typography variant="body2">Actividades (30 días): {row.activities30}</Typography>
                  </Box>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, alignItems: 'center' }}>
        {Object.values(STATUS_STYLE).map((style) => (
          <Chip
            key={style.label}
            size="small"
            variant="outlined"
            label={style.label}
            icon={(
              <Box
                component="span"
                sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: style.fill, border: `2px solid ${style.stroke}`, ml: '8px !important' }}
              />
            )}
          />
        ))}
        <Typography variant="caption" color="text.secondary">
          {markers.length === 0
            ? 'Ninguna sede tiene coordenadas todavía.'
            : `${markers.length} ${markers.length === 1 ? 'sede ubicada' : 'sedes ubicadas'} en el mapa. Toca un punto para ver el detalle.`}
        </Typography>
      </Box>
    </Box>
  );
};

/* ------------------------------ selector de punto (Gestión de Espacios) ------------------------------ */

const ClickHandler = ({ onPick }) => {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng)
  });
  return null;
};

const FollowPoint = ({ point }) => {
  const map = useMap();
  const lat = point ? point.lat : null;
  const lng = point ? point.lng : null;
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (lat !== null && lng !== null && !map.getBounds().contains([lat, lng])) {
        map.panTo([lat, lng]);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [map, lat, lng]);
  return null;
};

/**
 * Mapa para elegir un punto con un clic.
 * @param {{lat:number,lng:number}|null} value  Punto actual (null → centrado en Barranquilla, sin marcador)
 * @param {(lat:number, lng:number) => void} onChange  Recibe el punto con 6 decimales
 */
export const LocationPickerMap = ({ value, onChange, height = 260 }) => {
  const center = value ? [value.lat, value.lng] : BARRANQUILLA_CENTER;
  return (
    <Box sx={{ height, borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      <MapContainer
        center={center}
        zoom={value ? 16 : DEFAULT_ZOOM}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <ClickHandler onPick={(lat, lng) => onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))} />
        <FollowPoint point={value} />
        {value && (
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={10}
            pathOptions={{ color: '#154370', fillColor: '#2196f3', fillOpacity: 0.85, weight: 3 }}
          />
        )}
      </MapContainer>
    </Box>
  );
};

export default CoverageMap;
