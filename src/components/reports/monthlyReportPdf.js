// src/components/reports/monthlyReportPdf.js
//
// Genera el PDF (A4 vertical) del informe mensual a partir del objeto de buildMonthlyReport.
// jsPDF y jspdf-autotable se cargan con import() dinámico: no forman parte del bundle principal.

import { formatNumber, formatPercent, formatDateKey } from './buildMonthlyReport';

const PAGE = { width: 210, height: 297, margin: 14, top: 24, bottom: 18 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const COLORS = {
  primary: [21, 67, 112],
  text: [33, 37, 41],
  muted: [108, 117, 125],
  line: [206, 212, 218],
  band: [237, 243, 249],
  ok: [46, 125, 50],
  warning: [237, 108, 2],
  critical: [211, 47, 47]
};

const STATUS_COLORS = {
  ok: COLORS.ok,
  warning: COLORS.warning,
  critical: COLORS.critical,
  never: COLORS.critical
};

const TABLE_BASE = {
  theme: 'grid',
  styles: {
    font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: COLORS.line, lineWidth: 0.1, textColor: COLORS.text, overflow: 'linebreak'
  },
  headStyles: { fillColor: COLORS.primary, textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle' },
  alternateRowStyles: { fillColor: [249, 250, 251] },
  margin: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.margin, right: PAGE.margin }
};

/**
 * Construye el PDF y devuelve { doc, fileName }.
 */
export const buildMonthlyReportPdf = async (report) => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `${report.meta.title} - ${report.meta.contractorName} - ${report.meta.periodLabel}`,
    subject: report.meta.program,
    author: report.meta.generatedBy || report.meta.program,
    creator: 'Dashboard Adulto Mayor'
  });

  let y = PAGE.top;
  const bottomLimit = PAGE.height - PAGE.bottom;

  const ensureSpace = (needed) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = PAGE.top;
    }
  };

  const setText = (size, style = 'normal', color = COLORS.text) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const sectionTitle = (text) => {
    ensureSpace(24);
    y += 3;
    doc.setFillColor(...COLORS.band);
    doc.rect(PAGE.margin, y - 5, CONTENT_WIDTH, 8, 'F');
    doc.setFillColor(...COLORS.primary);
    doc.rect(PAGE.margin, y - 5, 1.2, 8, 'F');
    setText(11, 'bold', COLORS.primary);
    doc.text(text, PAGE.margin + 3.5, y + 0.6);
    y += 8;
  };

  const paragraph = (text, { size = 8.5, color = COLORS.text, style = 'normal', gap = 1.5 } = {}) => {
    setText(size, style, color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    const lineHeight = size * 0.46;
    ensureSpace(lines.length * lineHeight + gap);
    doc.text(lines, PAGE.margin, y);
    y += lines.length * lineHeight + gap;
  };

  const table = (options) => {
    ensureSpace(20);
    autoTable(doc, { ...TABLE_BASE, ...options, startY: y });
    y = doc.lastAutoTable.finalY + 4;
  };

  const { meta, summary } = report;

  /* ------------------------------ Encabezado ------------------------------ */
  setText(9, 'bold', COLORS.muted);
  doc.text(meta.program.toUpperCase(), PAGE.margin, y);
  y += 7;
  setText(19, 'bold', COLORS.primary);
  doc.text(meta.title, PAGE.margin, y);
  y += 7;
  setText(12, 'bold');
  const nameLines = doc.splitTextToSize(meta.contractorFullName, CONTENT_WIDTH);
  doc.text(nameLines, PAGE.margin, y);
  y += nameLines.length * 5.2;
  setText(10.5, 'normal');
  doc.text(`Periodo: ${meta.periodLabel}${meta.cutoffNote ? ` (${meta.cutoffNote})` : ''}`, PAGE.margin, y);
  y += 5;
  setText(8.5, 'normal', COLORS.muted);
  doc.text(
    `Generado el ${meta.generatedAtLabel}${meta.generatedBy ? ` por ${meta.generatedBy}` : ''}`,
    PAGE.margin,
    y
  );
  y += 3;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 2;

  if (report.isEmpty) {
    y += 4;
    paragraph(
      `No hay actividades registradas por ${meta.contractorName} en ${meta.periodLabel}. `
      + 'Las secciones siguientes se muestran sin información del periodo.',
      { style: 'italic', color: COLORS.warning }
    );
  }

  /* ------------------------------ 1. Resumen ------------------------------ */
  sectionTitle('1. Resumen del mes');
  const jornadaText = summary.cdvJornadas.percent === null
    ? 'Sin CDV'
    : `${formatPercent(summary.cdvJornadas.percent)}`;
  const kpis = [
    ['Actividades educativas aprobadas', formatNumber(summary.educationalActivities)],
    ['Atenciones (personas atendidas)', formatNumber(summary.attentions)],
    ['Asistentes a act. educativas', formatNumber(summary.attendees)],
    ['Raciones en CDV', formatNumber(summary.centerRations)],
    ['Meriendas en parques', formatNumber(summary.parkSnacks)],
    ['Jornadas atendidas', formatNumber(summary.jornadas)],
    ['Sedes atendidas / activas', `${formatNumber(summary.sedesAttended)} / ${formatNumber(summary.sedesActive)}`],
    ['Sedes sin atención en el mes', formatNumber(summary.sedesWithoutAttention)],
    ['Cobertura de jornadas en CDV', jornadaText]
  ];
  const boxGap = 3;
  const boxWidth = (CONTENT_WIDTH - boxGap * 2) / 3;
  const boxHeight = 17;
  y += 1;
  for (let i = 0; i < kpis.length; i += 3) {
    ensureSpace(boxHeight + boxGap);
    const boxY = y;
    kpis.slice(i, i + 3).forEach(([label, value], col) => {
      const x = PAGE.margin + col * (boxWidth + boxGap);
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.2);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
      setText(7.5, 'normal', COLORS.muted);
      doc.text(doc.splitTextToSize(label, boxWidth - 5), x + 2.5, boxY + 4.5);
      const warn = label.startsWith('Sedes sin atención') && summary.sedesWithoutAttention > 0;
      setText(15, 'bold', warn ? COLORS.critical : COLORS.primary);
      doc.text(value, x + 2.5, boxY + 13.5);
    });
    y += boxHeight + boxGap;
  }
  paragraph(
    `Días hábiles del periodo hasta el corte: ${summary.workingDays}. `
    + (summary.cdvJornadas.expected > 0
      ? `Jornadas de CDV cubiertas: ${formatNumber(summary.cdvJornadas.covered)} de ${formatNumber(summary.cdvJornadas.expected)} esperadas `
        + `(${summary.cdvCount} CDV x ${summary.workingDays} días x 2 jornadas).`
      : 'No hay CDV activos registrados.'),
    { size: 8, color: COLORS.muted }
  );

  /* ------------------------------ 2. Cobertura por sede ------------------------------ */
  sectionTitle('2. Cobertura por sede');
  if (report.coverage.rows.length === 0) {
    paragraph('No hay sedes activas registradas para este contratista.', { style: 'italic', color: COLORS.muted });
  } else {
    table({
      head: [['Sede', 'Tipo', 'Días con atención', 'Jornadas cubiertas', 'Activ.', 'Atenciones', 'Raciones / meriendas', 'Última atención', 'Estado al corte']],
      body: report.coverage.rows.map((row) => [
        row.name,
        row.typeLabel,
        formatNumber(row.daysWithAttention),
        row.jornadasExpected === null ? 'N/A' : `${row.jornadasCovered} de ${row.jornadasExpected}`,
        formatNumber(row.activities),
        formatNumber(row.attentions),
        formatNumber(row.rations),
        row.lastAttentionKey ? formatDateKey(row.lastAttentionKey) : 'Nunca',
        row.statusLabel
      ]),
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 19, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 21, halign: 'center' },
        6: { cellWidth: 17, halign: 'center' },
        7: { cellWidth: 21, halign: 'center' },
        8: { cellWidth: 25, halign: 'center' }
      },
      styles: { ...TABLE_BASE.styles, fontSize: 7.5 },
      didParseCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 8) {
          const row = report.coverage.rows[hook.row.index];
          hook.cell.styles.textColor = STATUS_COLORS[row?.status] || COLORS.text;
          hook.cell.styles.fontStyle = 'bold';
        }
        if (hook.section === 'body' && hook.column.index === 2) {
          const row = report.coverage.rows[hook.row.index];
          if (row && row.daysWithAttention === 0) hook.cell.styles.textColor = COLORS.critical;
        }
      }
    });
  }

  ensureSpace(14);
  setText(9.5, 'bold', COLORS.critical);
  doc.text('Sedes sin atención en el mes', PAGE.margin, y);
  y += 2.5;
  if (report.coverage.withoutAttention.length === 0) {
    y += 2;
    paragraph('Todas las sedes activas recibieron al menos una atención aprobada en el periodo.', { color: COLORS.ok });
  } else {
    table({
      head: [['Sede', 'Tipo', 'Última atención aprobada', 'Estado al corte']],
      body: report.coverage.withoutAttention.map((row) => [
        row.name, row.typeLabel, row.lastAttentionKey ? formatDateKey(row.lastAttentionKey) : 'Nunca', row.statusLabel
      ]),
      headStyles: { ...TABLE_BASE.headStyles, fillColor: COLORS.critical },
      columnStyles: { 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 40 }, 3: { halign: 'center', cellWidth: 32 } }
    });
  }
  if (report.coverage.unmatchedCount > 0) {
    paragraph(
      `Nota: ${report.coverage.unmatchedCount} actividad(es) están registradas en lugares que no coinciden con ninguna sede registrada.`,
      { size: 8, color: COLORS.muted }
    );
  }

  /* ------------------------------ 3. Metas ------------------------------ */
  sectionTitle(`3. Avance de metas anuales ${report.goals.year}`);
  if (!report.goals.available) {
    paragraph(
      `No hay metas configuradas para ${meta.contractorName} en ${report.goals.year}.`,
      { style: 'italic', color: COLORS.muted }
    );
  } else {
    paragraph(
      `Porcentaje esperado a la fecha de corte (${meta.cutoffLabel}): ${formatPercent(report.goals.expectedPercent)} del año. `
      + `Una estrategia se marca "En riesgo" si su avance está más de 10 puntos por debajo.`,
      { size: 8, color: COLORS.muted }
    );
    const body = [];
    const flags = [];
    report.goals.components.forEach((component) => {
      body.push([{ content: component.label, colSpan: 7, styles: { fontStyle: 'bold', fillColor: COLORS.band, textColor: COLORS.primary } }]);
      flags.push(null);
      component.rows.forEach((row) => {
        body.push([
          row.label,
          formatNumber(row.goal),
          formatNumber(row.inMonth),
          formatNumber(row.accumulated),
          formatPercent(row.progressPercent),
          formatPercent(row.expectedPercent),
          row.atRisk ? 'En riesgo' : 'Al ritmo'
        ]);
        flags.push(row.atRisk);
      });
    });
    table({
      head: [['Estrategia', 'Meta anual', 'Ejecutado en el mes', 'Acumulado del año', '% avance', '% esperado', 'Estado']],
      body,
      columnStyles: {
        0: { cellWidth: 62 },
        1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' },
        4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center', cellWidth: 20 }
      },
      didParseCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 6 && flags[hook.row.index] !== null) {
          hook.cell.styles.textColor = flags[hook.row.index] ? COLORS.critical : COLORS.ok;
          hook.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }

  /* ------------------------------ 4. Componentes ------------------------------ */
  sectionTitle('4. Actividades por componente y estrategia');
  {
    const body = [];
    const groupRows = new Set();
    report.components.forEach((component) => {
      groupRows.add(body.length);
      body.push([component.label, formatNumber(component.activities), formatNumber(component.attentions)]);
      component.strategies.forEach((strategy) => {
        body.push([`    ${strategy.label}`, formatNumber(strategy.activities), formatNumber(strategy.attentions)]);
      });
      if (component.strategies.length === 0) body.push(['    Sin actividades en el periodo', '0', '0']);
    });
    groupRows.add(body.length);
    body.push(['Entrega de alimentación', '', '']);
    report.delivery.forEach((item) => {
      body.push([`    ${item.label}`, formatNumber(item.activities), `${formatNumber(item.rations)} raciones`]);
    });
    table({
      head: [['Componente / estrategia', 'Actividades', 'Atenciones']],
      body,
      columnStyles: { 1: { halign: 'center', cellWidth: 30 }, 2: { halign: 'center', cellWidth: 40 } },
      didParseCell: (hook) => {
        if (hook.section === 'body' && groupRows.has(hook.row.index)) {
          hook.cell.styles.fontStyle = 'bold';
          hook.cell.styles.fillColor = COLORS.band;
        }
      }
    });
  }

  /* ------------------------------ 5. Profesionales ------------------------------ */
  sectionTitle('5. Desempeño por profesional');
  if (report.professionals.length === 0) {
    paragraph('No hay actividades aprobadas en el periodo.', { style: 'italic', color: COLORS.muted });
  } else {
    table({
      head: [['Profesional', 'Actividades', 'Atenciones', 'Sedes distintas', 'Días con actividad', 'Registradas por otra persona']],
      body: report.professionals.map((p) => [
        p.name, formatNumber(p.activities), formatNumber(p.attentions), formatNumber(p.sedes), formatNumber(p.activeDays), formatNumber(p.onBehalf)
      ]),
      columnStyles: {
        0: { cellWidth: 62 },
        1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }
      }
    });
  }

  /* ------------------------------ 6. Calidad ------------------------------ */
  sectionTitle('6. Calidad del registro');
  {
    const q = report.quality;
    table({
      head: [['Indicador (actividades con fecha en el periodo, todos los estados)', 'Valor']],
      body: [
        ['Registradas', formatNumber(q.registered)],
        ['Aprobadas', formatNumber(q.approved)],
        ['Rechazadas', formatNumber(q.rejected)],
        ['Pendientes de aprobación', formatNumber(q.pending)],
        ['Sin enlace de evidencia', `${formatNumber(q.withoutLink)} (${formatPercent(q.withoutLinkPercent)})`],
        [`Registradas con más de ${q.lateDays} días de retraso`, formatNumber(q.late)],
        ['Cargadas por encargado o representante a nombre del profesional', formatNumber(q.onBehalf)]
      ],
      columnStyles: { 1: { halign: 'center', cellWidth: 40 } }
    });
    if (q.topRejectionReasons.length > 0) {
      paragraph(
        `Principales motivos de rechazo: ${q.topRejectionReasons.map((r) => `${r.reason} (${r.count})`).join('; ')}.`,
        { size: 8.5 }
      );
    }
  }

  /* ------------------------------ 7. Cierre ------------------------------ */
  ensureSpace(88);
  sectionTitle('7. Observaciones y firmas');
  setText(9, 'bold');
  doc.text(report.closing.observationsLabel, PAGE.margin, y);
  y += 2;
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.rect(PAGE.margin, y, CONTENT_WIDTH, 32);
  y += 32 + 18;
  const signWidth = (CONTENT_WIDTH - 20) / 2;
  report.closing.signatures.forEach((label, index) => {
    const x = PAGE.margin + index * (signWidth + 20);
    doc.setDrawColor(...COLORS.text);
    doc.setLineWidth(0.3);
    doc.line(x, y, x + signWidth, y);
    setText(8.5, 'normal');
    doc.text(label, x + signWidth / 2, y + 4.5, { align: 'center' });
  });
  y += 12;
  report.closing.footnotes.forEach((note, index) => {
    paragraph(`${index + 1}. ${note}`, { size: 7.5, color: COLORS.muted, gap: 1 });
  });

  /* ------------------------------ Encabezado y pie en cada página ------------------------------ */
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    setText(7.5, 'normal', COLORS.muted);
    if (page > 1) {
      doc.text(`${meta.program}  |  ${meta.title}`, PAGE.margin, 11);
      doc.text(`${meta.contractorName} - ${meta.periodLabel}`, PAGE.width - PAGE.margin, 11, { align: 'right' });
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.2);
      doc.line(PAGE.margin, 13.5, PAGE.width - PAGE.margin, 13.5);
    }
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, PAGE.height - 13, PAGE.width - PAGE.margin, PAGE.height - 13);
    setText(7.5, 'normal', COLORS.muted);
    doc.text(`Generado el ${meta.generatedAtLabel}`, PAGE.margin, PAGE.height - 8.5);
    doc.text(`Página ${page} de ${totalPages}`, PAGE.width - PAGE.margin, PAGE.height - 8.5, { align: 'right' });
  }

  return { doc, fileName: meta.fileName };
};

/**
 * Genera el PDF y lo descarga en el navegador.
 */
export const downloadMonthlyReportPdf = async (report) => {
  const { doc, fileName } = await buildMonthlyReportPdf(report);
  doc.save(fileName);
  return fileName;
};

export default downloadMonthlyReportPdf;
