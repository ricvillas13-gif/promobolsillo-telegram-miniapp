import React, { useEffect, useMemo, useRef, useState } from "react";
// E010_UX_ACTION_FIRST_SUPERVISOR: rediseño UX visual action-first conservando E009B inline demo.
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  Check,
  ClipboardList,
  Store,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

type Role = "promotor" | "supervisor" | "cliente";
type AppRole = Role | null;
type PromotorModule = "asistencia" | "evidencias" | "mis_evidencias" | "resumen";
type SupervisorModule = "equipo" | "alertas" | "evidencias" | "resumen";
type ClientModule = "resumen" | "tiendas" | "evidencias" | "incidencias" | "entregables";
type EvidenceGroupMode = "marca" | "tienda" | "promotor" | "estatus";
type EvidencePhase = "NA" | "ANTES" | "DESPUES";
type CaptureKind = "entrada" | "salida";
type CameraTarget = "entrada" | "salida" | "evidencia" | "reemplazo";
type SupervisorDecision = "APROBADA" | "OBSERVADA" | "RECHAZADA";
type AlertFinalStatus = "RESUELTA" | "DESCARTADA";

type BootstrapResponse = {
  ok: boolean;
  role: Role;
  profile?: { nombre?: string };
};

type StoreItem = {
  tienda_id: string;
  nombre_tienda: string;
  tienda_display?: string;
  cadena?: string;
};

type VisitItem = {
  visita_id: string;
  tienda_id: string;
  tienda_nombre: string;
  tienda_display?: string;
  hora_inicio: string;
  hora_fin: string;
  estado_visita?: string;
  resultado_geocerca_entrada?: string;
  resultado_geocerca_salida?: string;
  promotor_nombre?: string;
};

type EvidenceItem = {
  evidencia_id: string;
  visita_id?: string;
  tipo_evento: string;
  tipo_evidencia: string;
  marca_id?: string;
  marca_nombre: string;
  riesgo: string;
  fecha_hora_fmt: string;
  fecha_hora?: string;
  url_foto: string;
  descripcion: string;
  tienda_nombre?: string;
  tienda_display?: string;
  tienda_id?: string;
  promotor_id?: string;
  promotor_nombre?: string;
  fase?: string;
  status?: string;
  decision_supervisor?: string;
  motivo_revision?: string;
  revisado_por?: string;
  fecha_revision?: string;
  hallazgos_ai?: string;
  reglas_disparadas?: string;
  resultado_ai?: string;
  score_confianza?: string;
};

type UiEvidence = EvidenceItem & {
  status?: "ACTIVA" | "ANULADA" | string;
};

type PromotorUsageSummary = {
  today?: { bytes: number; mb: number; gb: number; fotos: number };
  month?: { bytes: number; mb: number; gb: number; fotos: number };
  reference?: { budget_mxn: number; reference_pct: number; estimated_mxn: number; note: string };
};

type DashboardResponse = {
  ok: boolean;
  promotor?: { nombre?: string };
  stores?: StoreItem[];
  openVisits?: VisitItem[];
  visitsToday?: VisitItem[];
  summary?: {
    assignedStores?: number;
    openVisits?: number;
    closedVisits?: number;
    evidenciasHoy?: number;
  };
  usage?: PromotorUsageSummary;
};

type EvidencesTodayResponse = {
  ok: boolean;
  evidencias?: EvidenceItem[];
};

type StartEntryResponse = {
  ok: boolean;
  visita_id: string;
  tienda_id: string;
  tienda_nombre: string;
  tienda_display?: string;
  started_at: string;
  warning?: string;
};

type CloseVisitResponse = {
  ok: boolean;
  visita_id: string;
  closed_at: string;
  warning?: string;
};

type EvidenceRegisterResponse = {
  ok: boolean;
  visita_id: string;
  created: string[];
  count: number;
  warning?: string;
};

type ReplaceEvidenceResponse = {
  ok: boolean;
  evidencia_id: string;
  replaced: boolean;
  warning?: string;
};

type EvidenceContextResponse = {
  ok: boolean;
  visita?: {
    visita_id: string;
    tienda_id: string;
    tienda_nombre: string;
    tienda_display?: string;
  };
  marcas?: Array<{ marca_id: string; marca_nombre: string }>;
};

type EvidenceRulesResponse = {
  ok: boolean;
  reglas?: Array<{
    marca_id?: string;
    tipo_evidencia: string;
    fotos_requeridas: number;
    requiere_antes_despues: boolean;
    orden?: number;
    obligatoria?: boolean;
    observaciones?: string;
  }>;
};

type SupervisorSummary = {
  promotores: number;
  visitasHoy: number;
  abiertas: number;
  evidenciasHoy: number;
  alertas: number;
};

type SupervisorUsageSummary = {
  today?: { bytes: number; mb: number; gb: number; fotos: number };
  month?: { bytes: number; mb: number; gb: number; fotos: number };
};

type SupervisorPendingClose = {
  open_visits?: number;
  open_alerts?: number;
  pending_reviews?: number;
};

type SupervisorDashboardResponse = {
  ok: boolean;
  supervisor?: { nombre?: string };
  summary?: Partial<SupervisorSummary>;
  usage?: SupervisorUsageSummary;
  pending_close?: SupervisorPendingClose;
};

type SupervisorTeamRow = {
  promotor_id: string;
  external_id: string;
  nombre: string;
  region: string;
  visitas_hoy: number;
  visitas_abiertas: number;
  evidencias_hoy: number;
  alertas_abiertas: number;
  ultima_tienda: string;
  ultima_tienda_display?: string;
  ultima_entrada: string;
  ultima_salida: string;
  ultima_visita_id: string;
  status_general: string;
};

type SupervisorTeamResponse = {
  ok: boolean;
  team?: SupervisorTeamRow[];
};

type SupervisorDayRouteRow = {
  promotor_id?: string;
  visita_id: string;
  tienda_id: string;
  tienda_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  entry_fmt?: string;
  exit_fmt?: string;
  stay_minutes?: number;
  geofence_entry?: string;
  geofence_exit?: string;
  total_evidencias: number;
  total_alertas: number;
  summary_by_brand?: Array<{ marca_id: string; marca_nombre: string; total: number }>;
};

type SupervisorDayRouteResponse = {
  ok: boolean;
  rows?: SupervisorDayRouteRow[];
};

type SupervisorAlert = {
  alerta_id: string;
  fecha_hora: string;
  fecha_hora_fmt: string;
  promotor_id: string;
  promotor_nombre: string;
  visita_id: string;
  evidencia_id: string;
  tipo_alerta: string;
  severidad: string;
  descripcion: string;
  status: string;
  supervisor_id?: string;
  tienda_id?: string;
  tienda_nombre?: string;
  atendida_por?: string;
  fecha_atencion?: string;
  canal_notificacion?: string;
  comentario_cierre?: string;
  origen_cierre?: string;
  url_foto?: string;
  photo_url?: string;
  hallazgos_ai?: string;
  reglas_disparadas?: string;
  tienda_display?: string;
};

type SupervisorAlertsResponse = {
  ok: boolean;
  alerts?: SupervisorAlert[];
};

type PromotorRecentAlert = {
  alerta_id: string;
  tipo_alerta: string;
  status: string;
  fecha_hora?: string;
  fecha_hora_fmt?: string;
  tienda_id?: string;
  tienda_nombre?: string;
  resolved_classification?: string;
};

type PromotorRecentAlertsResponse = {
  ok: boolean;
  rows?: PromotorRecentAlert[];
};

type ClientFilterOption = { id: string; label: string };

type ClientBootstrapResponse = {
  ok: boolean;
  data?: {
    role: "cliente";
    cliente?: {
      cliente_id: string;
      cliente_nombre: string;
      logo_url?: string;
      color_primario?: string;
    };
    access?: {
      nombre_contacto?: string;
      rol_cliente?: string;
    };
  };
};

type ClientDashboardData = {
  period?: { fecha_inicio: string; fecha_fin: string; label: string };
  cliente?: { cliente_id: string; cliente_nombre: string; logo_url?: string; color_primario?: string };
  kpis?: {
    tiendas_visibles: number;
    tiendas_visitadas: number;
    visitas: number;
    cumplimiento_pct: number;
    evidencias: number;
    aprobadas: number;
    observadas: number;
    rechazadas: number;
    alertas: number;
    geocerca_ok_pct: number;
  };
  top_alerts?: Array<{ tipo_alerta: string; total: number }>;
};

type ClientStoreRow = {
  tienda_id: string;
  tienda_nombre: string;
  cadena: string;
  region: string;
  ciudad: string;
  visitas: number;
  ultima_visita: string;
  ultima_visita_fmt: string;
  evidencias: number;
  aprobadas: number;
  observadas: number;
  alertas: number;
  estatus: string;
};

type ClientStoreDetail = {
  store?: { tienda_id: string; nombre_tienda: string; cadena?: string; region?: string; ciudad?: string; direccion?: string };
  summary?: { visitas: number; evidencias: number; aprobadas: number; observadas: number; alertas: number };
  visits?: VisitItem[];
  evidences?: EvidenceItem[];
  alerts?: SupervisorAlert[];
};

type ClientEnvelope<T> = {
  ok: boolean;
  data?: T;
  meta?: { page?: number; page_size?: number; total_rows?: number; total_pages?: number };
  error?: string | null;
};

type SupervisorAlertCloseResponse = {
  ok: boolean;
  alerta_id: string;
  status: string;
};

type SupervisorEvidenceReviewResponse = {
  ok: boolean;
  evidencia_id: string;
  decision_supervisor: string;
  status: string;
};

type SupervisorEvidencesResponse = {
  ok: boolean;
  evidences?: EvidenceItem[];
};

type EvidenceAuditRow = {
  audit_id?: string;
  fecha_hora?: string;
  accion?: string;
  evidencia_id?: string;
  actor_role?: string;
  actor_id?: string;
  estado_previo?: string;
  estado_nuevo?: string;
  comentario?: string;
};

type EvidenceAuditResponse = {
  ok: boolean;
  rows?: EvidenceAuditRow[];
};

type VisitExpedientResponse = {
  ok: boolean;
  visita?: VisitItem & { stay_minutes?: number; entry_fmt?: string; exit_fmt?: string };
  evidencias?: EvidenceItem[];
  alertas?: SupervisorAlert[];
  summary?: { total_evidencias?: number; total_alertas?: number };
  summary_by_brand?: Array<{
    marca_id?: string;
    marca_nombre?: string;
    total?: number;
    types?: Array<{
      tipo_evidencia?: string;
      total?: number;
      phases?: Array<{ fase?: string; total?: number }>;
    }>;
  }>;
};

type LocationCapture = {
  lat: number;
  lon: number;
  accuracy: number;
  capturedAt: string;
};

type PhotoCapture = {
  name: string;
  dataUrl: string;
  capturedAt: string;
};

type PendingQueueStatus = "PENDIENTE_ENVIO" | "ERROR_ENVIO";
type PendingOpKind = "entry" | "evidence" | "close";
type PendingQueueOp = {
  id: string;
  kind: PendingOpKind;
  createdAt: string;
  status: PendingQueueStatus;
  attempts: number;
  lastError?: string;
  localVisitId?: string;
  visitaId?: string;
  tienda_id: string;
  tienda_nombre: string;
  payload: Record<string, any>;
};

type GalleryAuthorizationDebug = {
  now_local?: string;
  rows_scanned?: number;
  sheet_error?: string;
  reason?: string;
  autorizacion_id?: string;
};

type GalleryAuthorizationInfo = {
  allowed: boolean;
  authorization?: {
    autorizacion_id?: string;
    motivo?: string;
    autorizado_por?: string;
    vigencia_inicio?: string;
    vigencia_fin?: string;
    max_fotos?: number;
    fotos_usadas?: number;
  } | null;
  debug?: GalleryAuthorizationDebug;
};

type GalleryAuthorizationResponse = {
  ok: boolean;
  allowed: boolean;
  mode?: string;
  authorization?: GalleryAuthorizationInfo["authorization"];
  debug?: GalleryAuthorizationDebug;
};


const API_BASE = (import.meta.env.VITE_API_BASE || "https://promobolsillo-telegram.onrender.com").replace(/\/+$/, "");
const E011_GROUPS_PER_PAGE = 8;
const E011_THUMBS_PER_GROUP = 18;
const SHEETS_SAFE_PHOTO_CHARS = 42000;
const PENDING_QUEUE_KEY = "promobolsillo_pending_queue_v1";
const STORE_BRANDS_CACHE_KEY = "promobolsillo_store_brands_v1";

function safeReadLocalStorage(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeWriteLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function readPendingQueueStorage(): PendingQueueOp[] {
  const raw = safeReadLocalStorage(PENDING_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingQueueStorage(rows: PendingQueueOp[]) {
  safeWriteLocalStorage(PENDING_QUEUE_KEY, JSON.stringify(rows));
}

function readStoreBrandsCacheStorage(): Record<string, Array<{ marca_id: string; marca_nombre: string }>> {
  const raw = safeReadLocalStorage(STORE_BRANDS_CACHE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoreBrandsCacheStorage(value: Record<string, Array<{ marca_id: string; marca_nombre: string }>>) {
  safeWriteLocalStorage(STORE_BRANDS_CACHE_KEY, JSON.stringify(value));
}

function isLocalVisitId(value?: string) {
  return String(value || "").startsWith("LOCAL-");
}

function buildPendingQueueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shouldQueueSubmission(err: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = err instanceof Error ? err.message : String(err || "");
  const text = message.toLowerCase();
  return text.includes("failed to fetch") || text.includes("networkerror") || text.includes("network request failed") || text.includes("abort") || text.includes("network") || text.includes("load failed");
}

function sortPendingQueue(rows: PendingQueueOp[]) {
  return [...rows].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function formatPendingQueueLabel(item: PendingQueueOp) {
  if (item.kind === "entry") return `Entrada pendiente · ${formatStoreDisplay(item.tienda_id, item.tienda_nombre)}`;
  if (item.kind === "close") return `Salida pendiente · ${formatStoreDisplay(item.tienda_id, item.tienda_nombre)}`;
  const brand = String(item.payload?.marca_nombre || item.payload?.marca_id || "Marca");
  const type = String(item.payload?.tipo_evidencia || "Evidencia");
  return `Evidencia pendiente · ${formatStoreDisplay(item.tienda_id, item.tienda_nombre)} · ${brand} · ${type}`;
}

function getTelegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

function getInitData() {
  return getTelegramWebApp()?.initData || "";
}

async function postJson<T>(path: string, payload: Record<string, unknown>, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData(), ...payload }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error || `Error ${res.status}`);
    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

function formatHourFromIso(iso: string) {
  if (!iso) return "pendiente";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateTimeMaybe(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractStoreDeterminant(value?: string) {
  const match = String(value || "").trim().match(/(\d+)\s*$/);
  return match ? match[1] : "";
}

function formatStoreDisplay(storeId?: string, storeName?: string) {
  const determinante = extractStoreDeterminant(storeId);
  const nombre = (storeName || "").trim();
  if (!determinante) return nombre;
  const prefixed = `${determinante} - `;
  if (nombre.startsWith(prefixed)) return nombre;
  return nombre ? `${prefixed}${nombre}` : determinante;
}

function getStoreDisplayFromItem(item?: { tienda_display?: string; tienda_id?: string; tienda_nombre?: string }) {
  if (!item) return "";
  return item.tienda_display || formatStoreDisplay(item.tienda_id, item.tienda_nombre);
}

function formatPhaseLabel(value?: string) {
  const phase = String(value || "").trim().toUpperCase();
  if (phase === "ANTES") return "Antes";
  if (phase === "DESPUES") return "Después";
  if (phase === "NA") return "Foto estado actual";
  return value || "";
}


function nowMxString() {
  return formatDateTimeMaybe(new Date().toISOString());
}

function getStoreNameById(storeId: string, stores: StoreItem[]) {
  const found = stores.find((store) => store.tienda_id === storeId || store.nombre_tienda === storeId);
  return found ? (found.nombre_tienda || found.tienda_id || "") : "";
}

function getVisitDisplayName(visit: VisitItem, stores: StoreItem[]) {
  const storeName = getStoreNameById(visit.tienda_id, stores) || visit.tienda_nombre || "Visita activa";
  return visit.tienda_display || formatStoreDisplay(visit.tienda_id, storeName);
}

function normalizeBrandLabel(rawLabel: string, fallbackId: string) {
  const label = (rawLabel || "").trim();
  if (!label) return fallbackId || "Marca";
  if (/^(true|false)$/i.test(label)) return fallbackId || "Marca";
  return label;
}

function isOperationalEvidence(item: EvidenceItem) {
  return (item.tipo_evidencia || "").trim().toUpperCase() !== "ASISTENCIA";
}

function isAttendanceEvidence(item: EvidenceItem) {
  return !isOperationalEvidence(item);
}

function isValidRuleType(value: string) {
  const v = (value || "").trim();
  return !!v && !/^(true|false)$/i.test(v);
}

function compactMetaLine(item: EvidenceItem) {
  const parts = [getStoreDisplayFromItem(item), normalizeBrandLabel(item.marca_nombre || "", "Marca"), item.fase ? `Fase: ${item.fase}` : ""].filter(Boolean);
  return parts.join(" · ");
}

function cleanEvidenceDescription(value: string) {
  return (value || "").replace(/^\[[^\]]+\]\s*/, "").trim();
}

function geofenceShortLabel(value?: string) {
  const v = (value || "").trim().toUpperCase();
  if (!v) return "Sin dato";
  if (v === "OK_EN_GEOCERCA") return "En geocerca";
  if (v === "OK_CON_TOLERANCIA_GPS") return "Con tolerancia";
  if (v === "FUERA_DE_GEOCERCA") return "Fuera";
  return v;
}

function geofenceClass(value?: string) {
  const v = (value || "").trim().toUpperCase();
  if (v === "FUERA_DE_GEOCERCA") return "geoRed";
  if (v === "OK_CON_TOLERANCIA_GPS") return "geoAmber";
  if (v === "OK_EN_GEOCERCA") return "geoGreen";
  return "geoNeutral";
}

function severityClass(value?: string) {
  const v = (value || "").trim().toUpperCase();
  if (["ALTA", "ALTO"].includes(v)) return "riskRed";
  if (["MEDIA", "MEDIO"].includes(v)) return "riskAmber";
  return "riskGreen";
}

function statusClass(value?: string) {
  const v = (value || "").trim().toUpperCase();
  if (["ALERTA", "ABIERTA", "RECHAZADA", "DESCARTADA"].includes(v)) return "riskRed";
  if (["OBSERVADA", "PENDIENTE_REVISION", "ABIERTA_CON_ALERTA"].includes(v)) return "riskAmber";
  return "riskGreen";
}

function getSupervisorReviewState(item?: Pick<EvidenceItem, "decision_supervisor" | "status"> | null) {
  const decision = String(item?.decision_supervisor || "").trim().toUpperCase();
  if (["APROBADA", "OBSERVADA", "RECHAZADA"].includes(decision)) return decision;
  const status = String(item?.status || "").trim().toUpperCase();
  if (["APROBADA", "OBSERVADA", "RECHAZADA"].includes(status)) return status;
  return "PENDIENTE";
}

function getSupervisorReviewClass(item?: Pick<EvidenceItem, "decision_supervisor" | "status"> | null) {
  const state = getSupervisorReviewState(item);
  if (state === "APROBADA") return "riskGreen";
  if (state === "OBSERVADA") return "riskAmber";
  if (state === "RECHAZADA") return "riskRed";
  return "riskNeutral";
}

function getSupervisorReviewLabel(value?: string | Pick<EvidenceItem, "decision_supervisor" | "status"> | null) {
  const state = typeof value === "string" ? value.trim().toUpperCase() : getSupervisorReviewState(value);
  if (state === "OBSERVADA") return "COMENTADA";
  if (state === "PENDIENTE") return "PENDIENTE";
  if (state === "APROBADA") return "APROBADA";
  if (state === "RECHAZADA") return "RECHAZADA";
  return state || "PENDIENTE";
}

function isSupervisorPendingEvidence(item?: Pick<EvidenceItem, "decision_supervisor" | "status"> | null) {
  return getSupervisorReviewState(item) === "PENDIENTE";
}

function getEvidenceGroupModeLabel(mode: EvidenceGroupMode) {
  if (mode === "tienda") return "Tienda";
  if (mode === "promotor") return "Promotor";
  if (mode === "estatus") return "Estatus";
  return "Marca";
}

function getEvidenceGroupInfo(item: EvidenceItem, mode: EvidenceGroupMode) {
  const brandLabel = normalizeBrandLabel(item.marca_nombre || "", item.marca_id || "Marca");
  const storeLabel = getStoreDisplayFromItem(item) || item.tienda_nombre || item.tienda_id || "Tienda sin nombre";
  const promotorLabel = item.promotor_nombre || item.promotor_id || "Promotor sin nombre";
  const state = getSupervisorReviewState(item);
  if (mode === "tienda") {
    return { key: `tienda::${item.tienda_id || storeLabel}`, label: storeLabel, subtitle: `${brandLabel} · ${promotorLabel}` };
  }
  if (mode === "promotor") {
    return { key: `promotor::${item.promotor_id || promotorLabel}`, label: promotorLabel, subtitle: `${storeLabel} · ${brandLabel}` };
  }
  if (mode === "estatus") {
    return { key: `estatus::${state}`, label: getSupervisorReviewLabel(state), subtitle: `${brandLabel} · ${storeLabel}` };
  }
  return { key: `marca::${item.marca_id || brandLabel}`, label: brandLabel, subtitle: `${storeLabel} · ${promotorLabel}` };
}

function buildEvidenceGroups(items: EvidenceItem[], mode: EvidenceGroupMode) {
  const groups = new Map<string, {
    brandKey: string;
    brandLabel: string;
    brandSubtitle: string;
    items: EvidenceItem[];
    previewItems: EvidenceItem[];
    total: number;
    pendientes: number;
    aprobadas: number;
    observadas: number;
    rechazadas: number;
    tiendas: string[];
    promotores: string[];
    marcas: string[];
  }>();
  items.forEach((item) => {
    const info = getEvidenceGroupInfo(item, mode);
    const current = groups.get(info.key) || {
      brandKey: info.key,
      brandLabel: info.label,
      brandSubtitle: info.subtitle,
      items: [],
      previewItems: [],
      total: 0,
      pendientes: 0,
      aprobadas: 0,
      observadas: 0,
      rechazadas: 0,
      tiendas: [],
      promotores: [],
      marcas: [],
    };
    current.items.push(item);
    current.total += 1;
    const state = getSupervisorReviewState(item);
    if (state === "APROBADA") current.aprobadas += 1;
    else if (state === "OBSERVADA") current.observadas += 1;
    else if (state === "RECHAZADA") current.rechazadas += 1;
    else current.pendientes += 1;
    const storeLabel = getStoreDisplayFromItem(item) || item.tienda_nombre || item.tienda_id || "";
    const promotorLabel = item.promotor_nombre || item.promotor_id || "";
    const brandLabel = normalizeBrandLabel(item.marca_nombre || "", item.marca_id || "");
    if (storeLabel && !current.tiendas.includes(storeLabel)) current.tiendas.push(storeLabel);
    if (promotorLabel && !current.promotores.includes(promotorLabel)) current.promotores.push(promotorLabel);
    if (brandLabel && !current.marcas.includes(brandLabel)) current.marcas.push(brandLabel);
    groups.set(info.key, current);
  });
  return Array.from(groups.values())
    .map((group) => {
      const sortedItems = [...group.items].sort((a, b) => String(b.fecha_hora || b.fecha_hora_fmt || "").localeCompare(String(a.fecha_hora || a.fecha_hora_fmt || "")));
      return { ...group, items: sortedItems, previewItems: sortedItems.slice(0, 4) };
    })
    .sort((a, b) => {
      if (b.pendientes !== a.pendientes) return b.pendientes - a.pendientes;
      if (b.total !== a.total) return b.total - a.total;
      return a.brandLabel.localeCompare(b.brandLabel);
    });
}

function compressDataUrl(dataUrl: string, maxSide: number, quality: number) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const larger = Math.max(width, height);
      if (larger > maxSide) {
        const scale = maxSide / larger;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la foto"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("No se pudo procesar la foto"));
    img.src = dataUrl;
  });
}

async function compressDataUrlToSheetsSafeSize(dataUrl: string, maxChars = SHEETS_SAFE_PHOTO_CHARS) {
  const attempts = [
    { side: 1440, quality: 0.92 },
    { side: 1280, quality: 0.9 },
    { side: 1180, quality: 0.88 },
    { side: 1080, quality: 0.86 },
    { side: 960, quality: 0.84 },
    { side: 840, quality: 0.8 },
    { side: 720, quality: 0.76 },
    { side: 640, quality: 0.72 },
    { side: 560, quality: 0.68 },
    { side: 480, quality: 0.62 },
    { side: 420, quality: 0.58 },
  ];
  let last = dataUrl;
  for (const attempt of attempts) {
    last = await compressDataUrl(dataUrl, attempt.side, attempt.quality);
    if (last.length <= maxChars) return last;
  }
  return last;
}


async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto seleccionada."));
    reader.readAsDataURL(file);
  });
}

async function readPhotoForSheets(file: File) {
  const raw = await fileToDataUrl(file);
  const dataUrl = await compressDataUrlToSheetsSafeSize(raw);
  return {
    name: `galeria-${Date.now()}-${file.name || "foto.jpg"}`,
    dataUrl,
    capturedAt: nowMxString(),
  } as PhotoCapture;
}

function getCurrentLocation() {
  return new Promise<LocationCapture>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalización no disponible"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: nowMxString(),
        });
      },
      () => reject(new Error("No se pudo obtener la ubicación")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

const promotorTabs: Array<{ key: PromotorModule; label: string }> = [
  { key: "asistencia", label: "Inicio" },
  { key: "evidencias", label: "Capturar" },
  { key: "mis_evidencias", label: "Mis fotos" },
  { key: "resumen", label: "Resumen" },
];

const supervisorTabs: Array<{ key: SupervisorModule; label: string }> = [
  { key: "evidencias", label: "Bandeja" },
  { key: "alertas", label: "Alertas" },
  { key: "equipo", label: "Equipo" },
  { key: "resumen", label: "Dashboard" },
];

const clientTabs: Array<{ key: ClientModule; label: string }> = [
  { key: "resumen", label: "Dashboard" },
  { key: "tiendas", label: "Tiendas" },
  { key: "evidencias", label: "Evidencia validada" },
  { key: "incidencias", label: "Incidencias" },
  { key: "entregables", label: "Entregables" },
];

export default function App() {
  const tg = getTelegramWebApp();

  const [role, setRole] = useState<AppRole>(null);
  const [actorLabel, setActorLabel] = useState("Operador");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [detectedExternalId, setDetectedExternalId] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusMsgDuration, setStatusMsgDuration] = useState(6800);

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [promotorModule, setPromotorModule] = useState<PromotorModule>("asistencia");

  const [entryLocation, setEntryLocation] = useState<LocationCapture | null>(null);
  const [, setExitLocation] = useState<LocationCapture | null>(null);
  const [entryPhoto, setEntryPhoto] = useState<PhotoCapture | null>(null);
  const [, setExitPhoto] = useState<PhotoCapture | null>(null);
  const [capturingLocation, setCapturingLocation] = useState<CaptureKind | null>(null);
  const [, setCapturingPhoto] = useState<CameraTarget | null>(null);

  const [evidenceBrandId, setEvidenceBrandId] = useState("");
  const [evidenceBrandLabel, setEvidenceBrandLabel] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [evidencePhase, setEvidencePhase] = useState<EvidencePhase>("NA");
  const [evidenceQty, setEvidenceQty] = useState(1);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<PhotoCapture[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Array<{ marca_id: string; marca_nombre: string }>>([]);
  const [brandRules, setBrandRules] = useState<Array<{ tipo_evidencia: string; fotos_requeridas: number; requiere_antes_despues: boolean; orden?: number; obligatoria?: boolean; observaciones?: string }>>([]);
  const [selectedVisitStoreName, setSelectedVisitStoreName] = useState("");

  const [allEvidenceRows, setAllEvidenceRows] = useState<UiEvidence[]>([]);
  const [promotorUsage, setPromotorUsage] = useState<PromotorUsageSummary>({});
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [promotorRecentAlerts, setPromotorRecentAlerts] = useState<PromotorRecentAlert[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingQueueOp[]>([]);
  const [syncingPendingQueue, setSyncingPendingQueue] = useState(false);
  const [storeBrandsCache, setStoreBrandsCache] = useState<Record<string, Array<{ marca_id: string; marca_nombre: string }>>>(readStoreBrandsCacheStorage());
  const [attendanceGalleryAuth, setAttendanceGalleryAuth] = useState<GalleryAuthorizationInfo>({ allowed: false, authorization: null, debug: { reason: "NO_STORE" } });
  const [evidenceGalleryAuth, setEvidenceGalleryAuth] = useState<GalleryAuthorizationInfo>({ allowed: false, authorization: null, debug: { reason: "NO_VISIT" } });
  const [replaceGalleryAuth, setReplaceGalleryAuth] = useState<GalleryAuthorizationInfo>({ allowed: false, authorization: null, debug: { reason: "NO_EVIDENCE" } });
  const [evidenceFilterStore, setEvidenceFilterStore] = useState("");
  const [evidenceFilterBrand, setEvidenceFilterBrand] = useState("");
  const [evidenceFilterType, setEvidenceFilterType] = useState("");
  const [evidenceFilterPhase, setEvidenceFilterPhase] = useState("");
  const localEvidencePreviewsRef = useRef<Record<string, string>>({}); // E009A_LOCAL_PREVIEW_AFTER_REGISTER

  const [supervisorModule, setSupervisorModule] = useState<SupervisorModule>("evidencias");
  const [supervisorSummary, setSupervisorSummary] = useState<SupervisorSummary>({ promotores: 0, visitasHoy: 0, abiertas: 0, evidenciasHoy: 0, alertas: 0 });
  const [supervisorUsage, setSupervisorUsage] = useState<SupervisorUsageSummary>({});
  const [supervisorPendingClose, setSupervisorPendingClose] = useState<SupervisorPendingClose>({});
  const [supervisorTeam, setSupervisorTeam] = useState<SupervisorTeamRow[]>([]);
  const [selectedTeamPromotorId, setSelectedTeamPromotorId] = useState("");
  const [supervisorDayRoute, setSupervisorDayRoute] = useState<SupervisorDayRouteRow[]>([]);
  const [dayRouteLoading, setDayRouteLoading] = useState(false);
  const [selectedRouteVisitId, setSelectedRouteVisitId] = useState("");
  const [supervisorAlerts, setSupervisorAlerts] = useState<SupervisorAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [alertStatusFilter, setAlertStatusFilter] = useState("");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState("");
  const [alertPromotorFilter, setAlertPromotorFilter] = useState("");
  const [alertFinalStatus, setAlertFinalStatus] = useState<AlertFinalStatus>("RESUELTA");
  const [supervisorEvidences, setSupervisorEvidences] = useState<EvidenceItem[]>([]);
  const [selectedSupEvidenceId, setSelectedSupEvidenceId] = useState("");
  const [selectedSupEvidenceIds, setSelectedSupEvidenceIds] = useState<string[]>([]);
  const [supervisorEvidenceAudit, setSupervisorEvidenceAudit] = useState<EvidenceAuditRow[]>([]);
  const [supEvidencePromotorFilter, setSupEvidencePromotorFilter] = useState("");
  const [supEvidenceStoreFilter, setSupEvidenceStoreFilter] = useState("");
  const [supEvidenceBrandFilter, setSupEvidenceBrandFilter] = useState("");
  const [supEvidenceTypeFilter, setSupEvidenceTypeFilter] = useState("");
  const [supEvidencePhaseFilter, setSupEvidencePhaseFilter] = useState("");
  const [supEvidenceRiskFilter, setSupEvidenceRiskFilter] = useState("");
  const [supEvidenceStatusFilter, setSupEvidenceStatusFilter] = useState("");
  const [supEvidenceOnlyPending, setSupEvidenceOnlyPending] = useState(false);
  const [supEvidenceGroupMode, setSupEvidenceGroupMode] = useState<EvidenceGroupMode>("marca");
  const [activeSupEvidenceGroupKey, setActiveSupEvidenceGroupKey] = useState("");
  const [supEvidenceGroupPage, setSupEvidenceGroupPage] = useState(1);
  const [reviewDecision, setReviewDecision] = useState<SupervisorDecision>("APROBADA");
  const [reviewNote, setReviewNote] = useState("");
  const [alertCloseNote, setAlertCloseNote] = useState("");
  const [expedient, setExpedient] = useState<VisitExpedientResponse | null>(null);
  const [expedientLoading, setExpedientLoading] = useState(false);

  const [clientModule, setClientModule] = useState<ClientModule>("resumen");
  const [clientBranding, setClientBranding] = useState<{ cliente_nombre?: string; logo_url?: string; color_primario?: string }>({});
  const [clientFilterOptions, setClientFilterOptions] = useState<{
    cadenas: ClientFilterOption[];
    regiones: ClientFilterOption[];
    tiendas: ClientFilterOption[];
    marcas: ClientFilterOption[];
    tipos_evidencia: ClientFilterOption[];
    riesgos: ClientFilterOption[];
    decisiones: ClientFilterOption[];
    severidades: ClientFilterOption[];
    estatus_alerta: ClientFilterOption[];
  }>({ cadenas: [], regiones: [], tiendas: [], marcas: [], tipos_evidencia: [], riesgos: [], decisiones: [], severidades: [], estatus_alerta: [] });
  const [clientFilters, setClientFilters] = useState({
    fecha_inicio: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    fecha_fin: new Date().toISOString().slice(0, 10),
    cadena: "",
    region: "",
    tienda_id: "",
    marca_id: "",
    tipo_evidencia: "",
    fase: "",
    decision_supervisor: "",
    riesgo: "",
    tipo_alerta: "",
    severidad: "",
    status: "",
  });
  const [clientDashboard, setClientDashboard] = useState<ClientDashboardData>({});
  const [clientStores, setClientStores] = useState<ClientStoreRow[]>([]);
  const [selectedClientStoreId, setSelectedClientStoreId] = useState("");
  const [clientStoreDetail, setClientStoreDetail] = useState<ClientStoreDetail | null>(null);
  const [clientEvidences, setClientEvidences] = useState<EvidenceItem[]>([]);
  const [clientEvidenceGroupMode, setClientEvidenceGroupMode] = useState<EvidenceGroupMode>("marca");
  const [activeClientEvidenceGroupKey, setActiveClientEvidenceGroupKey] = useState("");
  const [clientEvidenceGroupPage, setClientEvidenceGroupPage] = useState(1);
  const [clientIncidents, setClientIncidents] = useState<SupervisorAlert[]>([]);
  const [clientDeliverablesMessage, setClientDeliverablesMessage] = useState("");
  const [imageViewerSrc, setImageViewerSrc] = useState("");
  const [imageViewerEvidenceId, setImageViewerEvidenceId] = useState("");
  const [imageViewerScale, setImageViewerScale] = useState(1);
  const [imageViewerOffset, setImageViewerOffset] = useState({ x: 0, y: 0 });
  const [imageViewerDragging, setImageViewerDragging] = useState(false);
  const [cameraModal, setCameraModal] = useState<{ open: boolean; target: CameraTarget | null; facing: "user" | "environment" }>({ open: false, target: null, facing: "environment" });
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const lastImageTapRef = useRef<{ src: string; at: number }>({ src: "", at: 0 });
  const imageViewerTouchRef = useRef<{ distance: number; startScale: number; dragging: boolean; dragStartX: number; dragStartY: number; originX: number; originY: number }>({ distance: 0, startScale: 1, dragging: false, dragStartX: 0, dragStartY: 0, originX: 0, originY: 0 });
  const attendancePhotoRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const entryGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const evidenceGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const replaceGalleryInputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => {
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#f4f5f7");
      tg.setBackgroundColor?.("#eef1f4");
    }
  }, [tg]);

  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(""), statusMsgDuration);
    return () => clearTimeout(t);
  }, [statusMsg, statusMsgDuration]);

  useEffect(() => {
    setPendingQueue(sortPendingQueue(readPendingQueueStorage()));
  }, []);

  useEffect(() => {
    writeStoreBrandsCacheStorage(storeBrandsCache);
  }, [storeBrandsCache]);

  useEffect(() => {
    const onOnline = () => {
      if (role === "promotor") {
        void syncPendingQueue(false);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [role, pendingQueue]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (role === "supervisor") {
        void loadSupervisorDashboard();
        void loadSupervisorTeam();
        void loadSupervisorAlerts();
        void loadSupervisorEvidences();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [role, alertStatusFilter, alertSeverityFilter, alertPromotorFilter, supEvidencePromotorFilter, supEvidenceStoreFilter, supEvidenceBrandFilter, supEvidenceTypeFilter, supEvidenceRiskFilter]);

  useEffect(() => () => { void stopCameraStream(); }, []);

  const pendingVisits = useMemo<VisitItem[]>(() => {
    const visitMap = new Map<string, VisitItem>();
    visits.forEach((visit) => visitMap.set(visit.visita_id, { ...visit }));
    for (const item of sortPendingQueue(pendingQueue)) {
      if (item.kind === "entry" && item.localVisitId) {
        visitMap.set(item.localVisitId, {
          visita_id: item.localVisitId,
          tienda_id: item.tienda_id,
          tienda_nombre: item.tienda_nombre,
          tienda_display: formatStoreDisplay(item.tienda_id, item.tienda_nombre),
          hora_inicio: item.createdAt,
          hora_fin: "",
          estado_visita: item.status,
          resultado_geocerca_entrada: "PENDIENTE_ENVIO",
          resultado_geocerca_salida: "",
        });
      }
      if (item.kind === "close" && item.visitaId) {
        const existing = visitMap.get(item.visitaId);
        if (existing) {
          visitMap.set(item.visitaId, {
            ...existing,
            hora_fin: item.createdAt,
            estado_visita: item.status,
            resultado_geocerca_salida: existing.resultado_geocerca_salida || "PENDIENTE_ENVIO",
          });
        }
      }
    }
    return Array.from(visitMap.values()).sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
  }, [visits, pendingQueue]);
  const openVisits = useMemo(() => pendingVisits.filter((v) => !v.hora_fin), [pendingVisits]);
  const exitVisit = useMemo(() => openVisits.find((v) => v.visita_id === selectedVisitId) || openVisits[0] || null, [openVisits, selectedVisitId]);
  const hasOpenVisit = Boolean(exitVisit);
  const evidenceTypeOptions = useMemo(() => {
    return brandRules
      .filter((item, index, arr) => !!item.tipo_evidencia && arr.findIndex((row) => row.tipo_evidencia === item.tipo_evidencia) === index)
      .sort((a, b) => Number(a.orden || 999) - Number(b.orden || 999) || String(a.tipo_evidencia).localeCompare(String(b.tipo_evidencia)));
  }, [brandRules]);
  const evidencePhaseOptions = useMemo(() => ["NA", "ANTES", "DESPUES"] as EvidencePhase[], []);

  const pendingEvidenceRows = useMemo<UiEvidence[]>(() => {
    const rows: UiEvidence[] = [];
    for (const item of pendingQueue) {
      if (item.kind === "entry") {
        const photo = item.payload?.entryPhoto as PhotoCapture | undefined;
        if (!photo?.dataUrl) continue;
        rows.push({
          evidencia_id: `PEND-${item.id}`,
          visita_id: item.localVisitId,
          tipo_evento: "ASISTENCIA_ENTRADA",
          tipo_evidencia: "ASISTENCIA",
          marca_nombre: "",
          riesgo: "PENDIENTE",
          fecha_hora_fmt: formatDateTimeMaybe(item.createdAt),
          fecha_hora: item.createdAt,
          url_foto: photo.dataUrl,
          descripcion: "Pendiente por enviar",
          tienda_id: item.tienda_id,
          tienda_nombre: item.tienda_nombre,
          tienda_display: formatStoreDisplay(item.tienda_id, item.tienda_nombre),
          status: item.status,
        });
      }
      if (item.kind === "evidence") {
        const photos = Array.isArray(item.payload?.fotos) ? (item.payload.fotos as PhotoCapture[]) : [];
        photos.forEach((photo, idx) => {
          rows.push({
            evidencia_id: `PEND-${item.id}-${idx}`,
            visita_id: item.visitaId,
            tipo_evento: "EVIDENCIA_PENDIENTE",
            tipo_evidencia: String(item.payload?.tipo_evidencia || "Evidencia"),
            marca_id: item.payload?.marca_id,
            marca_nombre: normalizeBrandLabel(String(item.payload?.marca_nombre || ""), String(item.payload?.marca_id || "Marca")),
            riesgo: "PENDIENTE",
            fecha_hora_fmt: formatDateTimeMaybe(item.createdAt),
            fecha_hora: item.createdAt,
            url_foto: photo.dataUrl,
            descripcion: item.status === "ERROR_ENVIO" ? `Error pendiente: ${item.lastError || "Reintentar envío"}` : "Pendiente por enviar",
            tienda_id: item.tienda_id,
            tienda_nombre: item.tienda_nombre,
            tienda_display: formatStoreDisplay(item.tienda_id, item.tienda_nombre),
            fase: item.payload?.fase,
            status: item.status,
          });
        });
      }
    }
    return rows;
  }, [pendingQueue]);

  const mergedEvidenceRows = useMemo(() => [...pendingEvidenceRows, ...allEvidenceRows], [pendingEvidenceRows, allEvidenceRows]);
  const attendanceGallery = useMemo(() => mergedEvidenceRows.filter((item) => !isOperationalEvidence(item)), [mergedEvidenceRows]);
  const operationalGallery = useMemo(() => mergedEvidenceRows.filter((item) => isOperationalEvidence(item) && String(item.status || "ACTIVA").toUpperCase() !== "ANULADA"), [mergedEvidenceRows]);

  const evidenceFilterOptions = useMemo(() => {
    const storeRows = operationalGallery;
    const brandRows = evidenceFilterStore ? storeRows.filter((item) => getStoreDisplayFromItem(item) === evidenceFilterStore) : storeRows;
    const typeRows = evidenceFilterBrand ? brandRows.filter((item) => normalizeBrandLabel(item.marca_nombre || "", "Marca") === evidenceFilterBrand) : brandRows;
    const phaseRows = evidenceFilterType ? typeRows.filter((item) => (item.tipo_evidencia || "") === evidenceFilterType) : typeRows;
    return {
      stores: Array.from(new Set(storeRows.map((item) => getStoreDisplayFromItem(item)).filter(Boolean))).sort(),
      brands: Array.from(new Set(brandRows.map((item) => normalizeBrandLabel(item.marca_nombre || "", "Marca")).filter(Boolean))).sort(),
      types: Array.from(new Set(typeRows.map((item) => item.tipo_evidencia || "").filter(Boolean))).sort(),
      phases: Array.from(new Set(phaseRows.map((item) => item.fase || "").filter(Boolean))).sort(),
    };
  }, [operationalGallery, evidenceFilterStore, evidenceFilterBrand, evidenceFilterType]);

  const filteredOperationalGallery = useMemo(() => {
    return operationalGallery.filter((item) => {
      const byStore = !evidenceFilterStore || getStoreDisplayFromItem(item) === evidenceFilterStore;
      const byBrand = !evidenceFilterBrand || normalizeBrandLabel(item.marca_nombre || "", "Marca") === evidenceFilterBrand;
      const byType = !evidenceFilterType || (item.tipo_evidencia || "") === evidenceFilterType;
      const byPhase = !evidenceFilterPhase || (item.fase || "") === evidenceFilterPhase;
      return byStore && byBrand && byType && byPhase;
    });
  }, [operationalGallery, evidenceFilterStore, evidenceFilterBrand, evidenceFilterType, evidenceFilterPhase]);

  const selectedEvidence = useMemo(() => filteredOperationalGallery.find((item) => item.evidencia_id === selectedEvidenceId) || filteredOperationalGallery[0] || null, [filteredOperationalGallery, selectedEvidenceId]);

  function isStoredPhotoUnavailable(value?: string) {
    const textValue = String(value || "").trim();
    return !textValue || textValue === "[DRIVE_UPLOAD_FAILED]" || textValue.startsWith("[") || textValue.startsWith("PHOTO_STORAGE:");
  }

  function rememberLocalEvidencePreviews(entries: Record<string, string>) {
    const cleanEntries = Object.entries(entries).filter(([id, dataUrl]) => Boolean(id && dataUrl));
    if (!cleanEntries.length) return;
    localEvidencePreviewsRef.current = { ...localEvidencePreviewsRef.current, ...Object.fromEntries(cleanEntries) };
  }

  function withLocalEvidencePreviews<T extends UiEvidence | EvidenceItem>(rows: T[]): T[] {
    const previewMap = localEvidencePreviewsRef.current;
    return rows.map((row) => {
      const localPreview = previewMap[row.evidencia_id];
      if (localPreview && isStoredPhotoUnavailable(row.url_foto)) {
        return { ...row, url_foto: localPreview, descripcion: row.descripcion || "Vista previa local" };
      }
      return row;
    });
  }

  useEffect(() => {
    if (role !== "promotor") return;
    if (!selectedStoreId) {
      setAttendanceGalleryAuth({ allowed: false, authorization: null, debug: { reason: "NO_STORE" } });
      return;
    }
    void loadGalleryAuthorization("attendance", {
      tienda_id: selectedStoreId,
      visita_id: "",
      marca_id: "",
      tipo_evidencia: "ASISTENCIA",
    }, setAttendanceGalleryAuth);
  }, [role, selectedStoreId]);

  useEffect(() => {
    if (role !== "promotor") return;
    if (!selectedVisitId) {
      setEvidenceGalleryAuth({ allowed: false, authorization: null, debug: { reason: "NO_VISIT" } });
      return;
    }
    const selectedVisit = pendingVisits.find((item) => item.visita_id === selectedVisitId);
    void loadGalleryAuthorization("evidence", {
      tienda_id: selectedVisit?.tienda_id || "",
      visita_id: isLocalVisitId(selectedVisitId) ? "" : selectedVisitId,
      marca_id: evidenceBrandId,
      tipo_evidencia: evidenceType,
    }, setEvidenceGalleryAuth);
  }, [role, selectedVisitId, evidenceBrandId, evidenceType, pendingVisits]);

  useEffect(() => {
    if (role !== "promotor") return;
    if (!selectedEvidence || String(selectedEvidence.status || "").toUpperCase().startsWith("PEND")) {
      setReplaceGalleryAuth({ allowed: false, authorization: null, debug: { reason: "NO_EVIDENCE" } });
      return;
    }
    void loadGalleryAuthorization("replace", {
      tienda_id: selectedEvidence.tienda_id || "",
      visita_id: selectedEvidence.visita_id || "",
      marca_id: selectedEvidence.marca_id || "",
      tipo_evidencia: selectedEvidence.tipo_evidencia || "",
    }, setReplaceGalleryAuth);
  }, [role, selectedEvidence]);


  const supervisorPromotorOptions = useMemo(() => supervisorTeam.map((item) => ({ id: item.promotor_id, nombre: item.nombre })), [supervisorTeam]);

  const visibleSupervisorEvidencesBase = useMemo(() => supervisorEvidences.filter((item) => getSupervisorReviewState(item) !== "APROBADA"), [supervisorEvidences]);

  const filteredSupervisorEvidences = useMemo(() => visibleSupervisorEvidencesBase.filter((item) => {
    const byPromotor = !supEvidencePromotorFilter || item.promotor_id === supEvidencePromotorFilter;
    const byStore = !supEvidenceStoreFilter || getStoreDisplayFromItem(item) === supEvidenceStoreFilter;
    const byBrand = !supEvidenceBrandFilter || normalizeBrandLabel(item.marca_nombre || "", "Marca") === supEvidenceBrandFilter;
    const byType = !supEvidenceTypeFilter || (item.tipo_evidencia || "") === supEvidenceTypeFilter;
    const byPhase = !supEvidencePhaseFilter || String(item.fase || "").toUpperCase() === supEvidencePhaseFilter;
    const byRisk = !supEvidenceRiskFilter || (item.riesgo || "") === supEvidenceRiskFilter;
    const byStatus = !supEvidenceStatusFilter || getSupervisorReviewState(item) === supEvidenceStatusFilter;
    const byPending = !supEvidenceOnlyPending || isSupervisorPendingEvidence(item);
    return byPromotor && byStore && byBrand && byType && byPhase && byRisk && byStatus && byPending;
  }), [
    visibleSupervisorEvidencesBase,
    supEvidencePromotorFilter,
    supEvidenceStoreFilter,
    supEvidenceBrandFilter,
    supEvidenceTypeFilter,
    supEvidencePhaseFilter,
    supEvidenceRiskFilter,
    supEvidenceStatusFilter,
    supEvidenceOnlyPending,
  ]);

  const supervisorEvidenceFilterOptions = useMemo(() => {
    const promotorRows = supEvidencePromotorFilter ? visibleSupervisorEvidencesBase.filter((item) => item.promotor_id === supEvidencePromotorFilter) : visibleSupervisorEvidencesBase;
    const storeRows = supEvidenceStoreFilter ? promotorRows.filter((item) => getStoreDisplayFromItem(item) === supEvidenceStoreFilter) : promotorRows;
    const brandRows = supEvidenceBrandFilter ? storeRows.filter((item) => normalizeBrandLabel(item.marca_nombre || "", "Marca") === supEvidenceBrandFilter) : storeRows;
    const typeRows = supEvidenceTypeFilter ? brandRows.filter((item) => (item.tipo_evidencia || "") === supEvidenceTypeFilter) : brandRows;
    const phaseRows = supEvidencePhaseFilter ? typeRows.filter((item) => String(item.fase || "").toUpperCase() === supEvidencePhaseFilter) : typeRows;
    return {
      stores: Array.from(new Set(promotorRows.map((item) => getStoreDisplayFromItem(item)).filter(Boolean))).sort(),
      brands: Array.from(new Set(storeRows.map((item) => normalizeBrandLabel(item.marca_nombre || "", "Marca")).filter(Boolean))).sort(),
      types: Array.from(new Set(brandRows.map((item) => item.tipo_evidencia || "").filter(Boolean))).sort(),
      phases: Array.from(new Set(typeRows.map((item) => String(item.fase || "").toUpperCase()).filter(Boolean))).sort(),
      risks: Array.from(new Set(phaseRows.map((item) => item.riesgo || "").filter(Boolean))).sort(),
      statuses: Array.from(new Set(phaseRows.map((item) => getSupervisorReviewState(item)).filter(Boolean))).sort(),
    };
  }, [
    visibleSupervisorEvidencesBase,
    supEvidencePromotorFilter,
    supEvidenceStoreFilter,
    supEvidenceBrandFilter,
    supEvidenceTypeFilter,
    supEvidencePhaseFilter,
  ]);

  const supervisorEvidenceSummary = useMemo(() => {
    return filteredSupervisorEvidences.reduce((acc, item) => {
      const state = getSupervisorReviewState(item);
      acc.total += 1;
      if (state === "APROBADA") acc.aprobadas += 1;
      else if (state === "OBSERVADA") acc.observadas += 1;
      else if (state === "RECHAZADA") acc.rechazadas += 1;
      else acc.pendientes += 1;
      return acc;
    }, { total: 0, pendientes: 0, aprobadas: 0, observadas: 0, rechazadas: 0 });
  }, [filteredSupervisorEvidences]);

  const groupedSupervisorEvidences = useMemo(() => buildEvidenceGroups(filteredSupervisorEvidences, supEvidenceGroupMode), [filteredSupervisorEvidences, supEvidenceGroupMode]);

  const supervisorEvidenceGroupPageCount = useMemo(() => Math.max(1, Math.ceil(groupedSupervisorEvidences.length / E011_GROUPS_PER_PAGE)), [groupedSupervisorEvidences]);
  const supervisorEvidenceGroupSafePage = Math.min(supEvidenceGroupPage, supervisorEvidenceGroupPageCount);
  const pagedSupervisorEvidenceGroups = useMemo(() => {
    const start = (supervisorEvidenceGroupSafePage - 1) * E011_GROUPS_PER_PAGE;
    return groupedSupervisorEvidences.slice(start, start + E011_GROUPS_PER_PAGE);
  }, [groupedSupervisorEvidences, supervisorEvidenceGroupSafePage]);
  const activeSupervisorEvidenceGroup = useMemo(() => groupedSupervisorEvidences.find((item) => item.brandKey === activeSupEvidenceGroupKey) || groupedSupervisorEvidences[0] || null, [groupedSupervisorEvidences, activeSupEvidenceGroupKey]);

  const clientEvidenceGroups = useMemo(() => buildEvidenceGroups(clientEvidences, clientEvidenceGroupMode), [clientEvidences, clientEvidenceGroupMode]);
  const clientEvidenceGroupPageCount = useMemo(() => Math.max(1, Math.ceil(clientEvidenceGroups.length / E011_GROUPS_PER_PAGE)), [clientEvidenceGroups]);
  const clientEvidenceGroupSafePage = Math.min(clientEvidenceGroupPage, clientEvidenceGroupPageCount);
  const pagedClientEvidenceGroups = useMemo(() => {
    const start = (clientEvidenceGroupSafePage - 1) * E011_GROUPS_PER_PAGE;
    return clientEvidenceGroups.slice(start, start + E011_GROUPS_PER_PAGE);
  }, [clientEvidenceGroups, clientEvidenceGroupSafePage]);
  const activeClientEvidenceGroup = useMemo(() => clientEvidenceGroups.find((item) => item.brandKey === activeClientEvidenceGroupKey) || clientEvidenceGroups[0] || null, [clientEvidenceGroups, activeClientEvidenceGroupKey]);

  const activeViewerSupervisorEvidence = useMemo(() => imageViewerEvidenceId ? filteredSupervisorEvidences.find((item) => item.evidencia_id === imageViewerEvidenceId) || null : null, [filteredSupervisorEvidences, imageViewerEvidenceId]);
  const activeViewerSupervisorEvidenceSequence = useMemo(() => activeSupervisorEvidenceGroup?.items?.length ? activeSupervisorEvidenceGroup.items : filteredSupervisorEvidences, [activeSupervisorEvidenceGroup, filteredSupervisorEvidences]);
  const activeViewerSupervisorEvidenceIndex = useMemo(() => activeViewerSupervisorEvidence ? activeViewerSupervisorEvidenceSequence.findIndex((item) => item.evidencia_id === activeViewerSupervisorEvidence.evidencia_id) : -1, [activeViewerSupervisorEvidenceSequence, activeViewerSupervisorEvidence]);

  const selectedTeamMember = useMemo(() => supervisorTeam.find((item) => item.promotor_id === selectedTeamPromotorId) || supervisorTeam[0] || null, [supervisorTeam, selectedTeamPromotorId]);
  const selectedAlert = useMemo(() => supervisorAlerts.find((item) => item.alerta_id === selectedAlertId) || supervisorAlerts[0] || null, [supervisorAlerts, selectedAlertId]);
  const selectedSupervisorEvidence = useMemo(() => filteredSupervisorEvidences.find((item) => item.evidencia_id === selectedSupEvidenceId) || filteredSupervisorEvidences[0] || null, [filteredSupervisorEvidences, selectedSupEvidenceId]);

  function refreshPendingQueue() {
    setPendingQueue(sortPendingQueue(readPendingQueueStorage()));
  }

  function upsertPendingOperation(operation: PendingQueueOp) {
    const current = readPendingQueueStorage().filter((item) => item.id !== operation.id);
    const next = sortPendingQueue([...current, operation]);
    writePendingQueueStorage(next);
    setPendingQueue(next);
  }

  function removePendingOperation(operationId: string) {
    const next = readPendingQueueStorage().filter((item) => item.id !== operationId);
    writePendingQueueStorage(next);
    setPendingQueue(sortPendingQueue(next));
  }

  function patchPendingOperation(operationId: string, patch: Partial<PendingQueueOp>) {
    const next = readPendingQueueStorage().map((item) => (item.id === operationId ? { ...item, ...patch } : item));
    writePendingQueueStorage(next);
    setPendingQueue(sortPendingQueue(next));
  }

  function replacePendingVisitId(previousVisitId: string, nextVisitId: string) {
    const next = readPendingQueueStorage().map((item) => {
      const updated: PendingQueueOp = { ...item };
      if (updated.localVisitId === previousVisitId) updated.localVisitId = nextVisitId;
      if (updated.visitaId === previousVisitId) updated.visitaId = nextVisitId;
      if (updated.payload?.visita_id === previousVisitId) {
        updated.payload = { ...updated.payload, visita_id: nextVisitId };
      }
      return updated;
    });
    writePendingQueueStorage(next);
    setPendingQueue(sortPendingQueue(next));
  }

  async function syncPendingQueue(showStatus = true) {
    if (!getInitData()) return;
    const queue = sortPendingQueue(readPendingQueueStorage());
    if (!queue.length || syncingPendingQueue) return;
    try {
      setSyncingPendingQueue(true);
      let synced = 0;
      for (const item of queue) {
        try {
          if (item.kind === "entry") {
            const payload = item.payload || {};
            const response = await postJson<StartEntryResponse>("/miniapp/promotor/start-entry", {
              tienda_id: payload.tienda_id,
              lat: payload.lat,
              lon: payload.lon,
              accuracy: payload.accuracy,
              foto_nombre: payload.foto_nombre,
              foto_data_url: payload.foto_data_url,
            });
            const previousVisitId = item.localVisitId || payload.localVisitId;
            removePendingOperation(item.id);
            if (previousVisitId) replacePendingVisitId(previousVisitId, response.visita_id);
            synced += 1;
            continue;
          }

          if (item.kind === "evidence") {
            const visitId = item.visitaId || item.payload?.visita_id || "";
            if (!visitId || isLocalVisitId(visitId)) continue;
            await postJson<EvidenceRegisterResponse>("/miniapp/promotor/evidence-register", {
              visita_id: visitId,
              marca_id: item.payload?.marca_id,
              marca_nombre: item.payload?.marca_nombre,
              tipo_evidencia: item.payload?.tipo_evidencia,
              fase: item.payload?.fase,
              descripcion: item.payload?.descripcion,
              fotos: item.payload?.fotos,
            });
            removePendingOperation(item.id);
            synced += 1;
            continue;
          }

          if (item.kind === "close") {
            const visitId = item.visitaId || item.payload?.visita_id || "";
            if (!visitId || isLocalVisitId(visitId)) continue;
            await postJson<CloseVisitResponse>("/miniapp/promotor/close-visit", { visita_id: visitId });
            removePendingOperation(item.id);
            synced += 1;
          }
        } catch (err) {
          if (shouldQueueSubmission(err)) {
            patchPendingOperation(item.id, { attempts: item.attempts + 1, status: "PENDIENTE_ENVIO", lastError: "" });
            break;
          }
          patchPendingOperation(item.id, { attempts: item.attempts + 1, status: "ERROR_ENVIO", lastError: err instanceof Error ? err.message : "No se pudo enviar" });
        }
      }
      if (synced) {
        await loadPromotorDashboard();
        await loadEvidencesToday();
        await loadPromotorRecentAlerts();
        if (showStatus) {
          setStatusMsgDuration(7000);
          setStatusMsg(`${synced} registro(s) pendiente(s) enviados.`);
        }
      } else if (showStatus && readPendingQueueStorage().length) {
        setStatusMsgDuration(7000);
        setStatusMsg("Pendientes conservados. Se reenviarán cuando vuelva la conexión.");
      }
      refreshPendingQueue();
    } finally {
      setSyncingPendingQueue(false);
    }
  }

  const expedientAttendance = useMemo(() => (expedient?.evidencias || []).filter(isAttendanceEvidence), [expedient]);
  const expedientOperational = useMemo(() => (expedient?.evidencias || []).filter((item) => isOperationalEvidence(item) && String(item.status || "ACTIVA").toUpperCase() !== "ANULADA"), [expedient]);

  async function loadBootstrap() {
    const initData = getInitData();
    if (!initData) {
      setDetectedExternalId("");
      setError("Vista local de referencia. Abre la Mini App desde Telegram para usar la operación en línea.");
      setLoading(false);
      return;
    }
    const data = await postJson<BootstrapResponse>("/miniapp/bootstrap", {});
    setDetectedExternalId("");
    if (data.role) setRole(data.role);
    if (data.profile?.nombre) setActorLabel(data.profile.nombre);
  }

  async function loadPromotorDashboard() {
    const dashboard = await postJson<DashboardResponse>("/miniapp/promotor/dashboard", {});
    if (dashboard.promotor?.nombre) setActorLabel(dashboard.promotor.nombre);
    setStores(dashboard.stores || []);
    setPromotorUsage(dashboard.usage || {});
    const nextVisits = dashboard.visitsToday || [];
    const nextOpenVisits = nextVisits.filter((visit) => !visit.hora_fin);
    setVisits(nextVisits);
    if (!nextOpenVisits.length) {
      setSelectedVisitId("");
      setExitLocation(null);
      setExitPhoto(null);
      return;
    }
    const currentStillExists = nextOpenVisits.find((v) => v.visita_id === selectedVisitId);
    setSelectedVisitId(currentStillExists ? currentStillExists.visita_id : nextOpenVisits[0].visita_id);
  }

  async function loadEvidencesToday() {
    const data = await postJson<EvidencesTodayResponse>("/miniapp/promotor/evidences-today", {});
    const rows = withLocalEvidencePreviews((data.evidencias || []).map((item) => ({ ...item, status: item.status || ("ACTIVA" as const) })));
    const operationalRows = rows.filter((item) => isOperationalEvidence(item) && String(item.status || "ACTIVA").toUpperCase() !== "ANULADA");
    setAllEvidenceRows(rows);
    if (operationalRows.length && !operationalRows.find((r) => r.evidencia_id === selectedEvidenceId)) setSelectedEvidenceId(operationalRows[0].evidencia_id);
    if (!operationalRows.length) setSelectedEvidenceId("");
  }

  async function loadEvidenceContext(visitaId: string) {
    if (!visitaId) {
      setAvailableBrands([]);
      setBrandRules([]);
      setSelectedVisitStoreName("");
      return;
    }
    const offlineVisit = pendingVisits.find((item) => item.visita_id === visitaId);
    if (isLocalVisitId(visitaId) && offlineVisit) {
      const cachedBrands = storeBrandsCache[offlineVisit.tienda_id] || [];
      setAvailableBrands(cachedBrands);
      setSelectedVisitStoreName(getVisitDisplayName(offlineVisit, stores));
      return;
    }
    try {
      const ctx = await postJson<EvidenceContextResponse>("/miniapp/promotor/evidence-context", { visita_id: visitaId });
      setAvailableBrands(ctx.marcas || []);
      setSelectedVisitStoreName(ctx.visita?.tienda_display || ctx.visita?.tienda_nombre || "");
      if (ctx.visita?.tienda_id && ctx.marcas?.length) {
        setStoreBrandsCache((prev) => ({ ...prev, [ctx.visita!.tienda_id]: ctx.marcas || [] }));
      }
    } catch {
      setAvailableBrands([]);
      setSelectedVisitStoreName("");
    }
  }

  async function loadRulesForBrand(brandId: string, brandLabel: string) {
    try {
      if (!brandId && !brandLabel) {
        setBrandRules([]);
        setEvidenceType("");
        setEvidencePhase("NA");
        setEvidenceQty(1);
        return;
      }
      const rules = await postJson<EvidenceRulesResponse>("/miniapp/promotor/evidence-rules", { marca_id: brandId, marca_nombre: brandLabel });
      const usableRules = (rules.reglas || []).filter((rule) => isValidRuleType(rule.tipo_evidencia));
      setBrandRules(usableRules);
      if (usableRules.length) {
        const selectedRule = usableRules.find((item) => item.tipo_evidencia === evidenceType) || usableRules[0];
        if (!evidenceType || !usableRules.find((item) => item.tipo_evidencia === evidenceType)) setEvidenceType(selectedRule.tipo_evidencia);
        setEvidenceQty(selectedRule.fotos_requeridas || 1);
      } else {
        setEvidenceType("");
        setEvidencePhase("NA");
        setEvidenceQty(1);
      }
    } catch {
      setBrandRules([]);
      setEvidenceType("");
      setEvidencePhase("NA");
      setEvidenceQty(1);
    }
  }

  async function loadSupervisorDashboard() {
    const data = await postJson<SupervisorDashboardResponse>("/miniapp/supervisor/dashboard", {});
    if (data.supervisor?.nombre) setActorLabel(data.supervisor.nombre);
    setSupervisorSummary({
      promotores: data.summary?.promotores || 0,
      visitasHoy: data.summary?.visitasHoy || 0,
      abiertas: data.summary?.abiertas || 0,
      evidenciasHoy: data.summary?.evidenciasHoy || 0,
      alertas: data.summary?.alertas || 0,
    });
    setSupervisorUsage(data.usage || {});
    setSupervisorPendingClose(data.pending_close || {});
  }

  async function loadSupervisorTeam() {
    const data = await postJson<SupervisorTeamResponse>("/miniapp/supervisor/team", {});
    const rows = data.team || [];
    setSupervisorTeam(rows);
    if (rows.length && !rows.find((row) => row.promotor_id === selectedTeamPromotorId)) setSelectedTeamPromotorId(rows[0].promotor_id);
  }

  async function loadSupervisorDayRoute(promotorId: string) {
    if (!promotorId) {
      setSupervisorDayRoute([]);
      setSelectedRouteVisitId("");
      return;
    }
    try {
      setDayRouteLoading(true);
      const data = await postJson<SupervisorDayRouteResponse>("/miniapp/supervisor/day-route", { promotor_id: promotorId });
      const rows = data.rows || [];
      setSupervisorDayRoute(rows);
      setSelectedRouteVisitId((current) => (rows.some((item) => item.visita_id === current) ? current : ""));
    } catch (err) {
      setSupervisorDayRoute([]);
      setSelectedRouteVisitId("");
      setStatusMsg(err instanceof Error ? err.message : "No se pudo cargar la ruta del día.");
    } finally {
      setDayRouteLoading(false);
    }
  }

  async function loadSupervisorAlerts() {
    const data = await postJson<SupervisorAlertsResponse>("/miniapp/supervisor/alerts", { status: alertStatusFilter, severidad: alertSeverityFilter, promotor_id: alertPromotorFilter });
    const rows = data.alerts || [];
    setSupervisorAlerts(rows);
    if (rows.length && !rows.find((row) => row.alerta_id === selectedAlertId)) setSelectedAlertId(rows[0].alerta_id);
    if (!rows.length) {
      setSelectedAlertId("");
      setExpedient(null);
    }
  }

  async function loadSupervisorEvidences() {
    const data = await postJson<SupervisorEvidencesResponse>("/miniapp/supervisor/evidences", {
      promotor_id: supEvidencePromotorFilter,
    });
    const rows = data.evidences || [];
    setSupervisorEvidences(rows);
    if (rows.length && !rows.find((row) => row.evidencia_id === selectedSupEvidenceId)) setSelectedSupEvidenceId(rows[0].evidencia_id);
    if (!rows.length) setSelectedSupEvidenceId("");
  }

  async function openVisitExpedient(visitaId: string) {
    if (!visitaId) return;
    try {
      setExpedientLoading(true);
      const data = await postJson<VisitExpedientResponse>("/miniapp/supervisor/visit-expedient", { visita_id: visitaId });
      setExpedient(data);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo abrir el expediente.");
    } finally {
      setExpedientLoading(false);
    }
  }

  async function loadPromotorRecentAlerts() {
    try {
      const data = await postJson<PromotorRecentAlertsResponse>("/miniapp/promotor/alerts-recent", {});
      setPromotorRecentAlerts(data.rows || []);
    } catch {
      setPromotorRecentAlerts([]);
    }
  }

  async function loadSupervisorEvidenceAudit(evidenciaId: string) {
    if (!evidenciaId) {
      setSupervisorEvidenceAudit([]);
      return;
    }
    try {
      const data = await postJson<EvidenceAuditResponse>("/miniapp/supervisor/evidence-audit", { evidencia_id: evidenciaId });
      setSupervisorEvidenceAudit(data.rows || []);
    } catch {
      setSupervisorEvidenceAudit([]);
    }
  }

  async function loadClientBootstrap() {
    const data = await postJson<ClientEnvelope<ClientBootstrapResponse["data"]>>("/miniapp/cliente/bootstrap", {});
    const payload = data.data;
    if (!payload) return;
    if (payload.cliente) setClientBranding(payload.cliente);
    if (payload.access?.nombre_contacto) setActorLabel(payload.access.nombre_contacto);
  }

  async function loadClientFilterOptions() {
    const data = await postJson<ClientEnvelope<any>>("/miniapp/cliente/filter-options", clientFilters);
    setClientFilterOptions({
      cadenas: data.data?.cadenas || [],
      regiones: data.data?.regiones || [],
      tiendas: data.data?.tiendas || [],
      marcas: data.data?.marcas || [],
      tipos_evidencia: data.data?.tipos_evidencia || [],
      riesgos: data.data?.riesgos || [],
      decisiones: data.data?.decisiones || [],
      severidades: data.data?.severidades || [],
      estatus_alerta: data.data?.estatus_alerta || [],
    });
  }

  async function loadClientDashboard() {
    const data = await postJson<ClientEnvelope<ClientDashboardData>>("/miniapp/cliente/dashboard", { filters: clientFilters });
    setClientDashboard(data.data || {});
    if (data.data?.cliente) setClientBranding(data.data.cliente);
  }

  async function loadClientStores() {
    const data = await postJson<ClientEnvelope<{ rows: ClientStoreRow[] }>>("/miniapp/cliente/stores", { filters: clientFilters, pagination: { page: 1, page_size: 100 } });
    const rows = data.data?.rows || [];
    setClientStores(rows);
    if (rows.length && !rows.some((row) => row.tienda_id === selectedClientStoreId)) setSelectedClientStoreId(rows[0].tienda_id);
    if (!rows.length) {
      setSelectedClientStoreId("");
      setClientStoreDetail(null);
    }
  }

  async function loadClientStoreDetail(storeId: string) {
    if (!storeId) {
      setClientStoreDetail(null);
      return;
    }
    const data = await postJson<ClientEnvelope<ClientStoreDetail>>("/miniapp/cliente/store-detail", { tienda_id: storeId, filters: clientFilters });
    setClientStoreDetail(data.data || null);
  }

  async function loadClientEvidences() {
    const data = await postJson<ClientEnvelope<{ rows: EvidenceItem[] }>>("/miniapp/cliente/evidences", { filters: clientFilters, pagination: { page: 1, page_size: 80 } });
    setClientEvidences(data.data?.rows || []);
  }

  async function loadClientIncidents() {
    const data = await postJson<ClientEnvelope<{ rows: SupervisorAlert[] }>>("/miniapp/cliente/incidents", { filters: clientFilters, pagination: { page: 1, page_size: 80 } });
    setClientIncidents(data.data?.rows || []);
  }

  async function loadClientDeliverables() {
    const data = await postJson<ClientEnvelope<{ enabled: boolean; message: string }>>("/miniapp/cliente/deliverables", { filters: clientFilters });
    setClientDeliverablesMessage(data.data?.message || "Entregables no disponibles por ahora.");
  }

  async function initialize() {
    try {
      setLoading(true);
      setError("");
      setDetectedExternalId("");
      await loadBootstrap();
    } catch (err) {
      setRole(null);
      const nextError = err instanceof Error ? err.message : "No se pudo cargar la operación.";
      setError(nextError);
      const match = String(nextError).match(/external_id detectado:\s*([^\s.]+)/i);
      setDetectedExternalId(match?.[1] || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void initialize(); }, []);

  useEffect(() => {
    if (role === "promotor") {
      void loadPromotorDashboard();
      void loadEvidencesToday();
      void loadPromotorRecentAlerts();
      void loadRulesForBrand("", "");
      void syncPendingQueue(false);
    }
    if (role === "supervisor") {
      void loadSupervisorDashboard();
      void loadSupervisorTeam();
      void loadSupervisorAlerts();
      void loadSupervisorEvidences();
    }
    if (role === "cliente") {
      void loadClientBootstrap();
      void loadClientFilterOptions();
      void loadClientDashboard();
      void loadClientStores();
      void loadClientEvidences();
      void loadClientIncidents();
      void loadClientDeliverables();
    }
  }, [role]);

  useEffect(() => { if (role === "promotor") { setEvidenceBrandId(""); setEvidenceBrandLabel(""); setEvidenceType(""); setEvidencePhase("NA"); void loadEvidenceContext(selectedVisitId); } }, [selectedVisitId, role]);
  useEffect(() => { if (role === "promotor") void loadRulesForBrand(evidenceBrandId, evidenceBrandLabel); }, [evidenceBrandId, evidenceBrandLabel, role]);
  useEffect(() => { if (role === "supervisor") void loadSupervisorAlerts(); }, [alertStatusFilter, alertSeverityFilter, alertPromotorFilter]);
  useEffect(() => { if (role === "supervisor") void loadSupervisorEvidences(); }, [supEvidencePromotorFilter, role]);
  useEffect(() => {
    if (role !== "supervisor") return;
    void loadSupervisorDayRoute(selectedTeamPromotorId);
    setExpedient(null);
  }, [role, selectedTeamPromotorId]);

  useEffect(() => {
    if (role !== "supervisor") return;
    void loadSupervisorEvidenceAudit(selectedSupEvidenceId);
  }, [selectedSupEvidenceId, role]);

  useEffect(() => {
    if (role !== "supervisor") return;
    if (!supervisorAlerts.length) {
      setSelectedAlertId("");
      setExpedient(null);
      return;
    }
    const stillExists = supervisorAlerts.some((item) => item.alerta_id === selectedAlertId);
    if (!stillExists) setSelectedAlertId(supervisorAlerts[0].alerta_id);
  }, [supervisorAlerts, selectedAlertId, role]);

  useEffect(() => {
    if (role !== "supervisor") return;
    if (!supEvidencePromotorFilter) return;
    const hasVisibleEvidenceForPromotor = supervisorEvidences.some((item) => item.promotor_id === supEvidencePromotorFilter);
    if (!hasVisibleEvidenceForPromotor) {
      setSelectedSupEvidenceId("");
      setSelectedSupEvidenceIds([]);
      setExpedient(null);
    }
  }, [supEvidencePromotorFilter, supervisorEvidences, role]);

  useEffect(() => {
    if (role !== "supervisor") return;
    setSelectedSupEvidenceIds((prev) => prev.filter((id) => supervisorEvidences.some((item) => item.evidencia_id === id)));
  }, [supervisorEvidences, role]);

  useEffect(() => {
    if (role !== "supervisor") return;
    setSelectedSupEvidenceIds((prev) => prev.filter((id) => filteredSupervisorEvidences.some((item) => item.evidencia_id === id)));
  }, [filteredSupervisorEvidences, role]);

  useEffect(() => {
    if (role !== "supervisor") return;
    setSupEvidenceGroupPage(1);
    setActiveSupEvidenceGroupKey("");
  }, [role, supEvidenceGroupMode, supEvidencePromotorFilter, supEvidenceStoreFilter, supEvidenceBrandFilter, supEvidenceTypeFilter, supEvidencePhaseFilter, supEvidenceRiskFilter, supEvidenceStatusFilter, supEvidenceOnlyPending]);

  useEffect(() => {
    if (role !== "cliente") return;
    setClientEvidenceGroupPage(1);
    setActiveClientEvidenceGroupKey("");
  }, [role, clientEvidenceGroupMode, clientFilters.fecha_inicio, clientFilters.fecha_fin, clientFilters.cadena, clientFilters.region, clientFilters.tienda_id, clientFilters.marca_id, clientFilters.tipo_evidencia, clientFilters.decision_supervisor, clientFilters.riesgo]);

  useEffect(() => {
    if (role !== "supervisor") return;
    if (supEvidenceStoreFilter && !supervisorEvidenceFilterOptions.stores.includes(supEvidenceStoreFilter)) setSupEvidenceStoreFilter("");
    if (supEvidenceBrandFilter && !supervisorEvidenceFilterOptions.brands.includes(supEvidenceBrandFilter)) setSupEvidenceBrandFilter("");
    if (supEvidenceTypeFilter && !supervisorEvidenceFilterOptions.types.includes(supEvidenceTypeFilter)) setSupEvidenceTypeFilter("");
    if (supEvidencePhaseFilter && !supervisorEvidenceFilterOptions.phases.includes(supEvidencePhaseFilter)) setSupEvidencePhaseFilter("");
    if (supEvidenceRiskFilter && !supervisorEvidenceFilterOptions.risks.includes(supEvidenceRiskFilter)) setSupEvidenceRiskFilter("");
    if (supEvidenceStatusFilter && !supervisorEvidenceFilterOptions.statuses.includes(supEvidenceStatusFilter)) setSupEvidenceStatusFilter("");
  }, [role, supervisorEvidenceFilterOptions, supEvidenceStoreFilter, supEvidenceBrandFilter, supEvidenceTypeFilter, supEvidencePhaseFilter, supEvidenceRiskFilter, supEvidenceStatusFilter]);

  useEffect(() => {
    if (role !== "cliente") return;
    void loadClientFilterOptions();
    void loadClientDashboard();
    void loadClientStores();
    void loadClientEvidences();
    void loadClientIncidents();
    void loadClientDeliverables();
  }, [role, clientFilters]);


  useEffect(() => {
    if (role !== "cliente") return;
    if (!selectedClientStoreId) {
      setClientStoreDetail(null);
      return;
    }
    void loadClientStoreDetail(selectedClientStoreId);
  }, [role, selectedClientStoreId]);

  async function loadGalleryAuthorization(mode: string, payload: Record<string, unknown>, setter: React.Dispatch<React.SetStateAction<GalleryAuthorizationInfo>>) {
    try {
      const response = await postJson<GalleryAuthorizationResponse>("/miniapp/promotor/gallery-authorization", { mode, ...payload });
      setter({ allowed: !!response.allowed, authorization: response.authorization || null, debug: response.debug || { reason: response.allowed ? "MATCH" : "NO_MATCH" } });
    } catch (err) {
      setter({ allowed: false, authorization: null, debug: { reason: "REQUEST_ERROR", sheet_error: err instanceof Error ? err.message : "No se pudo validar la autorización" } });
    }
  }

  async function handleGallerySelection(target: "attendance-entry" | "evidence" | "replace", fileList: FileList | null) {
    try {
      const files = Array.from(fileList || []).filter(Boolean);
      if (!files.length) return;
      if (target === "attendance-entry") {
        const photo = await readPhotoForSheets(files[0]);
        setEntryPhoto(photo);
        setStatusMsg("Foto desde galería lista.");
        return;
      }
      if (target === "replace") {
        const photo = await readPhotoForSheets(files[0]);
        setStatusMsg("Reemplazando foto...");
        setStatusMsgDuration(7000);
        await replaceEvidencePhotoPayload(photo.name, photo.dataUrl, "GALERIA_AUTORIZADA");
        return;
      }
      const nextPhotos = [] as PhotoCapture[];
      for (const file of files.slice(0, 24)) {
        nextPhotos.push(await readPhotoForSheets(file));
      }
      setEvidencePhotos((prev) => [...prev, ...nextPhotos].slice(0, 24));
      setStatusMsg(`${nextPhotos.length} foto(s) desde galería agregada(s).`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo leer la foto seleccionada.");
    }
  }

  function galleryReasonLabel(info: GalleryAuthorizationInfo) {
    const reason = String(info.debug?.reason || "").toUpperCase();
    if (info.allowed) return `Autorizada${info.authorization?.autorizacion_id ? ` · ${info.authorization.autorizacion_id}` : ""}`;
    if (reason === "NO_STORE") return "Selecciona una tienda.";
    if (reason === "NO_VISIT") return "Selecciona una visita.";
    if (reason === "NO_EVIDENCE") return "Selecciona una evidencia.";
    if (reason === "OUTSIDE_WINDOW_BEFORE" || reason === "OUTSIDE_WINDOW_AFTER") return "Fuera de vigencia.";
    if (reason === "MAX_REACHED") return "Límite de fotos alcanzado.";
    if (reason === "SHEET_ERROR" || reason === "REQUEST_ERROR") return info.debug?.sheet_error || "No se pudo leer la autorización.";
    return "Sin autorización activa.";
  }

  async function stopCameraStream() {
    try {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    } finally {
      cameraStreamRef.current = null;
    }
  }

  async function openCamera(target: CameraTarget, facing: "user" | "environment") {
    try {
      setCapturingPhoto(target === "evidencia" ? "entrada" : target);
      await stopCameraStream();
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        { video: { facingMode: facing }, audio: false },
        { video: true, audio: false },
      ];
      let stream: MediaStream | null = null;
      let lastError: unknown = null;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!stream) throw lastError || new Error("No se pudo abrir la cámara.");
      cameraStreamRef.current = stream;
      setCameraModal({ open: true, target, facing });
      window.setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          void cameraVideoRef.current.play().catch(() => undefined);
        }
      }, 10);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err || "");
      const friendly = rawMessage.includes("Could not start video source")
        ? "No se pudo iniciar la cámara. Cierra otras apps que la estén usando e inténtalo de nuevo."
        : (rawMessage || "No se pudo abrir la cámara.");
      setStatusMsg(friendly);
      setStatusMsgDuration(7200);
    } finally {
      setCapturingPhoto(null);
    }
  }

  async function captureFromCameraModal() {
    const video = cameraVideoRef.current;
    if (!video || !cameraModal.target) return;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const raw = canvas.toDataURL("image/jpeg", 0.92);
    const dataUrl = await compressDataUrlToSheetsSafeSize(raw);
    const payload: PhotoCapture = { name: `captura-${Date.now()}.jpg`, dataUrl, capturedAt: nowMxString() };
    if (cameraModal.target === "entrada") {
      setEntryPhoto(payload);
      setStatusMsg("Foto de entrada lista.");
    } else if (cameraModal.target === "salida") {
      setExitPhoto(payload);
      setStatusMsg("Foto de salida lista.");
    } else if (cameraModal.target === "reemplazo") {
      setStatusMsg("Reemplazando foto...");
      setStatusMsgDuration(7000);
      await replaceEvidencePhotoPayload(payload.name, payload.dataUrl);
    } else {
      setEvidencePhotos((prev) => [...prev, payload].slice(0, 24));
      setStatusMsg("Foto de evidencia agregada.");
    }
    setCameraModal({ open: false, target: null, facing: "environment" });
    await stopCameraStream();
  }

  async function closeCameraModal() {
    setCameraModal({ open: false, target: null, facing: "environment" });
    await stopCameraStream();
  }

  function openImageViewer(src?: string, evidenceId = "") {
    if (!src) return;
    setImageViewerScale(1);
    setImageViewerOffset({ x: 0, y: 0 });
    setImageViewerDragging(false);
    imageViewerTouchRef.current = { distance: 0, startScale: 1, dragging: false, dragStartX: 0, dragStartY: 0, originX: 0, originY: 0 };
    setImageViewerEvidenceId(evidenceId);
    setImageViewerSrc(src);
  }

  function closeImageViewer() {
    setImageViewerSrc("");
    setImageViewerEvidenceId("");
    setImageViewerScale(1);
    setImageViewerOffset({ x: 0, y: 0 });
    setImageViewerDragging(false);
    imageViewerTouchRef.current = { distance: 0, startScale: 1, dragging: false, dragStartX: 0, dragStartY: 0, originX: 0, originY: 0 };
  }

  function zoomImageViewer(nextScale: number) {
    const normalized = Math.min(4, Math.max(1, Number(nextScale.toFixed(2))));
    setImageViewerScale(normalized);
    if (normalized <= 1.02) {
      setImageViewerOffset({ x: 0, y: 0 });
      setImageViewerDragging(false);
    }
  }

  function startImageViewerDrag(clientX: number, clientY: number) {
    if (imageViewerScale <= 1) return;
    imageViewerTouchRef.current = {
      ...imageViewerTouchRef.current,
      dragging: true,
      dragStartX: clientX,
      dragStartY: clientY,
      originX: imageViewerOffset.x,
      originY: imageViewerOffset.y,
    };
    setImageViewerDragging(true);
  }

  function moveImageViewerDrag(clientX: number, clientY: number) {
    if (!imageViewerTouchRef.current.dragging || imageViewerScale <= 1) return;
    const dx = clientX - imageViewerTouchRef.current.dragStartX;
    const dy = clientY - imageViewerTouchRef.current.dragStartY;
    setImageViewerOffset({
      x: imageViewerTouchRef.current.originX + dx,
      y: imageViewerTouchRef.current.originY + dy,
    });
  }

  function endImageViewerDrag() {
    imageViewerTouchRef.current = { ...imageViewerTouchRef.current, dragging: false };
    setImageViewerDragging(false);
  }

  function handleImageViewerWheel(event: React.WheelEvent<HTMLImageElement>) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.18 : -0.18;
    zoomImageViewer(imageViewerScale + delta);
  }

  function handleImageViewerMouseDown(event: React.MouseEvent<HTMLImageElement>) {
    event.preventDefault();
    event.stopPropagation();
    startImageViewerDrag(event.clientX, event.clientY);
  }

  function handleImageViewerMouseMove(event: React.MouseEvent<HTMLImageElement>) {
    if (!imageViewerDragging) return;
    event.preventDefault();
    moveImageViewerDrag(event.clientX, event.clientY);
  }

  function handleImageViewerMouseUp() {
    endImageViewerDrag();
  }

  function handleImageViewerTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (event.touches.length === 2) {
      const a = event.touches[0];
      const b = event.touches[1];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      imageViewerTouchRef.current = { ...imageViewerTouchRef.current, distance, startScale: imageViewerScale, dragging: false };
      return;
    }
    if (event.touches.length === 1 && imageViewerScale > 1) {
      const touch = event.touches[0];
      startImageViewerDrag(touch.clientX, touch.clientY);
    }
  }

  function handleImageViewerTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (event.touches.length === 2) {
      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const base = imageViewerTouchRef.current.distance || distance;
      const ratio = distance / Math.max(base, 1);
      zoomImageViewer(imageViewerTouchRef.current.startScale * ratio);
      return;
    }
    if (event.touches.length === 1 && imageViewerScale > 1) {
      event.preventDefault();
      const touch = event.touches[0];
      if (!imageViewerTouchRef.current.dragging) {
        startImageViewerDrag(touch.clientX, touch.clientY);
      }
      moveImageViewerDrag(touch.clientX, touch.clientY);
    }
  }

  function handleImageViewerTouchEnd() {
    if (imageViewerScale < 1.02) {
      setImageViewerScale(1);
      setImageViewerOffset({ x: 0, y: 0 });
    }
    endImageViewerDrag();
  }

  function handleImageTap(src?: string) {
    if (!src) return;
    const now = Date.now();
    if (lastImageTapRef.current.src === src && now - lastImageTapRef.current.at < 280) {
      openImageViewer(src);
      lastImageTapRef.current = { src: "", at: 0 };
      return;
    }
    lastImageTapRef.current = { src, at: now };
  }

  function focusAttendanceForVisit(visitaId: string) {
    const targetEvidence = attendanceGallery.find((item) => item.visita_id === visitaId);
    if (!targetEvidence) return;
    window.setTimeout(() => {
      attendancePhotoRefs.current[targetEvidence.evidencia_id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }

  function removeEvidencePhotoAt(index: number) {
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function clearEvidencePhotos() {
    setEvidencePhotos([]);
  }

  async function captureLocation(kind: CaptureKind) {
    setStatusMsg(kind === "entrada" ? "Se solicitará tu ubicación para registrar la entrada." : "Se solicitará tu ubicación para registrar la salida.");
    try {
      setCapturingLocation(kind);
      const location = await getCurrentLocation();
      if (kind === "entrada") {
        setEntryLocation(location);
        setStatusMsg("Ubicación de entrada capturada.");
      } else {
        setExitLocation(location);
        setStatusMsg("Ubicación de salida capturada.");
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo obtener la ubicación.");
    } finally {
      setCapturingLocation(null);
    }
  }



  async function createEntry() {
    let queuedPayload: Record<string, unknown> | null = null;
    try {
      if (!selectedStoreId) return setStatusMsg("Selecciona una tienda.");
      if (!entryLocation) return setStatusMsg("Captura la ubicación de entrada.");
      if (!entryPhoto) return setStatusMsg("Captura la foto de entrada.");
      if (!getInitData()) return setStatusMsg("Esta acción real solo funciona desde Telegram.");
      const selectedStore = stores.find((store) => store.tienda_id === selectedStoreId);
      const selectedStoreLabel = selectedStore ? formatStoreDisplay(selectedStore.tienda_id, selectedStore.nombre_tienda) : "la tienda seleccionada";
      if (typeof window !== "undefined" && !window.confirm(`¿Deseas registrar entrada en ${selectedStoreLabel}?`)) return;
      setSyncing(true);
      queuedPayload = {
        tienda_id: selectedStoreId,
        lat: entryLocation.lat,
        lon: entryLocation.lon,
        accuracy: entryLocation.accuracy,
        foto_nombre: entryPhoto.name,
        foto_data_url: entryPhoto.dataUrl,
        source: String(entryPhoto.name || "").startsWith("galeria-") ? "GALERIA_AUTORIZADA" : "CAMARA",
      };
      const response = await postJson<StartEntryResponse>("/miniapp/promotor/start-entry", queuedPayload);
      setStatusMsgDuration(6800);
      setStatusMsg(response.warning === "attendance_photo_too_large_for_sheets" ? "Entrada registrada. La visita quedó guardada, pero la foto no cupo completa en Sheets." : `Entrada registrada en ${response.tienda_display || response.tienda_nombre}`);
      setEntryLocation(null);
      setEntryPhoto(null);
      setExitLocation(null);
      setExitPhoto(null);
      await loadPromotorDashboard();
      await loadEvidencesToday();
    } catch (err) {
      if (shouldQueueSubmission(err) && selectedStoreId && entryLocation && entryPhoto && queuedPayload) {
        const selectedStore = stores.find((store) => store.tienda_id === selectedStoreId);
        const localVisitId = buildPendingQueueId("LOCAL");
        upsertPendingOperation({
          id: buildPendingQueueId("QENTRY"),
          kind: "entry",
          createdAt: new Date().toISOString(),
          status: "PENDIENTE_ENVIO",
          attempts: 0,
          localVisitId,
          tienda_id: selectedStoreId,
          tienda_nombre: selectedStore?.nombre_tienda || selectedStoreId,
          payload: {
            ...queuedPayload,
            entryPhoto,
            localVisitId,
          },
        });
        setSelectedVisitId(localVisitId);
        setEntryLocation(null);
        setEntryPhoto(null);
        setStatusMsgDuration(7500);
        setStatusMsg("Entrada guardada localmente. Se enviará cuando vuelva la conexión.");
        return;
      }
      const message = err instanceof Error ? err.message : "No se pudo registrar la entrada real.";
      if (message.includes("Ya tienes una visita abierta")) {
        setEntryPhoto(null);
        setStatusMsgDuration(7000);
      }
      setStatusMsg(message);
    } finally {
      setSyncing(false);
    }
  }

  async function closeVisit() {
    try {
      if (!exitVisit) return setStatusMsg("No hay visita abierta para registrar salida.");
      if (!getInitData()) return setStatusMsg("Esta acción real solo funciona desde Telegram.");
      if (typeof window !== "undefined" && !window.confirm(`¿Deseas registrar salida en ${getVisitDisplayName(exitVisit, stores)}?`)) return;
      setSyncing(true);
      const payload = { visita_id: exitVisit.visita_id };
      const response = await postJson<CloseVisitResponse>("/miniapp/promotor/close-visit", payload);
      setStatusMsg(response.warning === "attendance_photo_too_large_for_sheets" ? "Salida registrada. La visita quedó guardada, pero la foto no cupo completa en Sheets." : "Salida registrada correctamente.");
      setExitLocation(null);
      setExitPhoto(null);
      await loadPromotorDashboard();
      await loadEvidencesToday();
    } catch (err) {
      if (shouldQueueSubmission(err) && exitVisit) {
        upsertPendingOperation({
          id: buildPendingQueueId("QCLOSE"),
          kind: "close",
          createdAt: new Date().toISOString(),
          status: "PENDIENTE_ENVIO",
          attempts: 0,
          visitaId: exitVisit.visita_id,
          tienda_id: exitVisit.tienda_id,
          tienda_nombre: exitVisit.tienda_nombre,
          payload: { visita_id: exitVisit.visita_id },
        });
        setVisits((prev) => prev.map((item) => item.visita_id === exitVisit.visita_id ? { ...item, hora_fin: new Date().toISOString(), estado_visita: "PENDIENTE_ENVIO" } : item));
        setStatusMsgDuration(7500);
        setStatusMsg("Salida guardada localmente. Se enviará cuando vuelva la conexión.");
        return;
      }
      const message = err instanceof Error ? err.message : "No se pudo registrar la salida real.";
      if (message.includes("Faltan fotos DESPUES") || message.includes("No puedes registrar salida todavía")) {
        setPromotorModule("evidencias");
        setStatusMsgDuration(7500);
      }
      setStatusMsg(message);
    } finally {
      setSyncing(false);
    }
  }

  async function saveEvidenceFlow() {
    let queuedPayload: Record<string, unknown> | null = null;
    try {
      if (!selectedVisitId) return setStatusMsg("Selecciona una visita activa.");
      if (!evidenceBrandLabel.trim()) return setStatusMsg("Selecciona una marca.");
      if (!evidenceType.trim()) return setStatusMsg("Selecciona o escribe el tipo de evidencia.");
      if (!evidencePhotos.length) return setStatusMsg("Agrega al menos una foto de evidencia.");
      if (evidencePhotos.length < evidenceQty) return setStatusMsg(`Debes cargar al menos ${evidenceQty} foto(s).`);
      setSyncing(true);
      const evidenceSource = evidencePhotos.some((photo) => !String(photo.name || "").startsWith("captura-")) ? "GALERIA_AUTORIZADA" : "CAMARA";
      const localPhotosForPreview = evidencePhotos.map((photo) => ({ ...photo }));
      const savedVisitId = selectedVisitId;
      const savedVisit = pendingVisits.find((item) => item.visita_id === savedVisitId);
      const savedBrandId = evidenceBrandId;
      const savedBrandLabel = evidenceBrandLabel;
      const savedEvidenceType = evidenceType;
      const savedEvidencePhase = evidencePhase;
      const savedDescription = evidenceDescription.trim();
      queuedPayload = {
        visita_id: selectedVisitId,
        marca_id: evidenceBrandId,
        marca_nombre: evidenceBrandLabel,
        tipo_evidencia: evidenceType,
        fase: evidencePhase,
        descripcion: evidenceDescription.trim(),
        source: evidenceSource,
        fotos: localPhotosForPreview.map((photo) => ({ name: photo.name, dataUrl: photo.dataUrl, capturedAt: photo.capturedAt })),
      };
      const result = await postJson<EvidenceRegisterResponse>("/miniapp/promotor/evidence-register", queuedPayload);
      const createdIds = Array.isArray(result.created) ? result.created.filter(Boolean) : [];
      if (createdIds.length) {
        const previewEntries: Record<string, string> = {};
        createdIds.forEach((id, index) => {
          const photo = localPhotosForPreview[index] || localPhotosForPreview[0];
          if (photo?.dataUrl) previewEntries[id] = photo.dataUrl;
        });
        rememberLocalEvidencePreviews(previewEntries);
        const optimisticRows: UiEvidence[] = createdIds.map((id, index) => {
          const photo = localPhotosForPreview[index] || localPhotosForPreview[0];
          return {
            evidencia_id: id,
            visita_id: savedVisitId,
            tipo_evento: "EVIDENCIA_OPERATIVA",
            tipo_evidencia: savedEvidenceType,
            marca_id: savedBrandId,
            marca_nombre: savedBrandLabel,
            riesgo: "PENDIENTE",
            fecha_hora_fmt: formatDateTimeMaybe(photo?.capturedAt || new Date().toISOString()),
            fecha_hora: photo?.capturedAt || new Date().toISOString(),
            url_foto: photo?.dataUrl || "",
            descripcion: savedDescription || "Vista previa local",
            tienda_id: savedVisit?.tienda_id || "",
            tienda_nombre: savedVisit?.tienda_nombre || selectedVisitStoreName || "",
            tienda_display: savedVisit ? formatStoreDisplay(savedVisit.tienda_id, savedVisit.tienda_nombre) : selectedVisitStoreName,
            fase: savedEvidencePhase,
            status: "ACTIVA",
          };
        });
        setAllEvidenceRows((prev) => withLocalEvidencePreviews([...optimisticRows, ...prev.filter((row) => !createdIds.includes(row.evidencia_id))]));
        setSelectedEvidenceId(createdIds[0]);
        setPromotorModule("mis_evidencias");
      }
      setEvidenceType("");
      setEvidencePhase("NA");
      setEvidenceQty(1);
      setEvidenceDescription("");
      setEvidencePhotos([]);
      await loadEvidencesToday();
      if (createdIds[0]) {
        setSelectedEvidenceId(createdIds[0]);
        setPromotorModule("mis_evidencias");
      }
      if ((result as any).postprocess_warning) {
        setStatusMsg("Evidencia registrada. El análisis quedó programado y puede tardar unos segundos.");
      } else {
        setStatusMsg(result.warning === "evidence_photo_too_large_for_sheets" ? "Evidencia registrada, pero al menos una foto no cupo completa en Sheets." : "Evidencia registrada correctamente.");
      }
    } catch (err) {
      if (shouldQueueSubmission(err) && queuedPayload) {
        const visit = pendingVisits.find((item) => item.visita_id === selectedVisitId);
        upsertPendingOperation({
          id: buildPendingQueueId("QEVID"),
          kind: "evidence",
          createdAt: new Date().toISOString(),
          status: "PENDIENTE_ENVIO",
          attempts: 0,
          visitaId: selectedVisitId,
          tienda_id: visit?.tienda_id || "",
          tienda_nombre: visit?.tienda_nombre || selectedVisitStoreName || "",
          payload: queuedPayload,
        });
        setEvidenceType("");
        setEvidencePhase("NA");
        setEvidenceQty(1);
        setEvidenceDescription("");
        setEvidencePhotos([]);
        setStatusMsgDuration(7500);
        setStatusMsg("Evidencia guardada localmente. Se enviará cuando vuelva la conexión.");
        return;
      }
      const message = err instanceof Error ? err.message : "No se pudo registrar la evidencia.";
      if (message.includes("Primero debes registrar al menos 1 foto ANTES")) {
        setStatusMsgDuration(7500);
      }
      setStatusMsg(message);
    } finally {
      setSyncing(false);
    }
  }

  async function replaceEvidencePhotoPayload(fileName: string, dataUrl: string, source = "CAMARA") {
    if (!selectedEvidence) return;
    setSyncing(true);
    try {
      const result = await postJson<ReplaceEvidenceResponse>("/miniapp/promotor/replace-evidence", { evidencia_id: selectedEvidence.evidencia_id, foto_nombre: fileName, foto_data_url: dataUrl, source });
      await loadEvidencesToday();
      setStatusMsg(result.warning === "evidence_photo_too_large_for_sheets" ? "La evidencia se reemplazó, pero la foto no cupo completa en Sheets." : "Evidencia reemplazada.");
      setStatusMsgDuration(6800);
    } finally {
      setSyncing(false);
    }
  }

  async function markEvidenceAsCancelled() {
    try {
      if (!selectedEvidence) return setStatusMsg("Selecciona una evidencia.");
      const confirmed = typeof window === "undefined" ? true : window.confirm(`¿Realmente deseas anular esta foto?

${getStoreDisplayFromItem(selectedEvidence)}
${normalizeBrandLabel(selectedEvidence.marca_nombre || "", "Marca")}
${selectedEvidence.tipo_evidencia}
${selectedEvidence.fecha_hora_fmt}`);
      if (!confirmed) return;
      setStatusMsg("Anulando evidencia...");
      setStatusMsgDuration(7000);
      setSyncing(true);
      await postJson("/miniapp/promotor/cancel-evidence", { evidencia_id: selectedEvidence.evidencia_id, note: noteDraft || "" });
      setNoteDraft("");
      await loadEvidencesToday();
      setSelectedEvidenceId("");
      setStatusMsg("Evidencia anulada.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo anular la evidencia.");
    } finally {
      setSyncing(false);
    }
  }


  async function saveNote() {
    try {
      if (!selectedEvidence || !noteDraft.trim()) return setStatusMsg("Escribe una nota y selecciona una evidencia.");
      setSyncing(true);
      await postJson("/miniapp/promotor/evidence-note", { evidencia_id: selectedEvidence.evidencia_id, note: noteDraft.trim() });
      setNoteDraft("");
      await loadEvidencesToday();
      setStatusMsg("Nota guardada.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo guardar la nota.");
    } finally {
      setSyncing(false);
    }
  }

  async function closeSelectedAlert() {
    try {
      if (!selectedAlert) return setStatusMsg("Selecciona una alerta.");
      setSyncing(true);
      await postJson<SupervisorAlertCloseResponse>("/miniapp/supervisor/alert-close", {
        alerta_id: selectedAlert.alerta_id,
        comentario_cierre: alertCloseNote.trim(),
        origen_cierre: "SUPERVISOR",
        status: alertFinalStatus,
      });
      setAlertCloseNote("");
      await loadSupervisorDashboard();
      await loadSupervisorAlerts();
      setStatusMsg(`Alerta ${alertFinalStatus.toLowerCase()}.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo cerrar la alerta.");
    } finally {
      setSyncing(false);
    }
  }

  async function applyEvidenceReviewBatch(evidenceIds: string[], decision: SupervisorDecision, note: string, options?: { clearSelection?: boolean; successMessage?: string; focusEvidenceId?: string; autoAdvance?: boolean }) {
    try {
      if (!evidenceIds.length) return setStatusMsg("Selecciona al menos una evidencia.");
      const trimmedNote = note.trim();
      if ((decision === "OBSERVADA" || decision === "RECHAZADA") && !trimmedNote) {
        return setStatusMsg(decision === "OBSERVADA" ? "Agrega un comentario para comentar la evidencia." : "Agrega un motivo para rechazar la evidencia.");
      }
      const visibleIds = filteredSupervisorEvidences.map((item) => item.evidencia_id);
      const focusId = options?.focusEvidenceId || evidenceIds[0] || "";
      const focusIndex = focusId ? visibleIds.indexOf(focusId) : -1;
      const nextId = options?.autoAdvance && focusIndex >= 0 ? (visibleIds[focusIndex + 1] || visibleIds[focusIndex - 1] || "") : "";
      setSyncing(true);
      for (const evidenciaId of evidenceIds) {
        await postJson<SupervisorEvidenceReviewResponse>("/miniapp/supervisor/evidence-review", {
          evidencia_id: evidenciaId,
          decision_supervisor: decision,
          motivo_revision: trimmedNote,
          requiere_revision_supervisor: decision !== "APROBADA",
        });
      }
      if (options?.clearSelection) setSelectedSupEvidenceIds([]);
      setReviewNote("");
      await loadSupervisorDashboard();
      await loadSupervisorEvidences();
      if (nextId) {
        setSelectedSupEvidenceId(nextId);
        const nextItem = filteredSupervisorEvidences.find((item) => item.evidencia_id === nextId);
        if (nextItem) openImageViewer(nextItem.url_foto, nextItem.evidencia_id);
      } else if (options?.focusEvidenceId && imageViewerEvidenceId === options.focusEvidenceId) {
        closeImageViewer();
      }
      const decisionLabel = decision === "OBSERVADA" ? "comentadas" : decision === "RECHAZADA" ? "rechazadas" : "aprobadas";
      setStatusMsg(options?.successMessage || `${evidenceIds.length} evidencia(s) ${decisionLabel}.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo aplicar la revisión.");
    } finally {
      setSyncing(false);
    }
  }

  async function reviewSelectedEvidence() {
    if (!selectedSupervisorEvidence) return setStatusMsg("Selecciona una evidencia.");
    await applyEvidenceReviewBatch([selectedSupervisorEvidence.evidencia_id], reviewDecision, reviewNote, {
      successMessage: `Evidencia ${reviewDecision.toLowerCase()}.`,
      focusEvidenceId: selectedSupervisorEvidence.evidencia_id,
      autoAdvance: !!imageViewerEvidenceId,
    });
  }

  async function quickReviewEvidence(item: EvidenceItem, decision: SupervisorDecision) {
    const requiresNote = decision === "OBSERVADA" || decision === "RECHAZADA";
    const prompted = requiresNote ? window.prompt(decision === "OBSERVADA" ? "Escribe el comentario:" : "Escribe el motivo del rechazo:", reviewNote || item.motivo_revision || "") : (reviewNote || item.motivo_revision || "");
    if (requiresNote && !String(prompted || "").trim()) return setStatusMsg(decision === "OBSERVADA" ? "Se canceló el comentario por falta de texto." : "Se canceló el rechazo por falta de motivo.");
    setSelectedSupEvidenceId(item.evidencia_id);
    await applyEvidenceReviewBatch([item.evidencia_id], decision, String(prompted || ""), {
      successMessage: `${item.tipo_evidencia || "Evidencia"} ${decision === "OBSERVADA" ? "comentada" : decision === "RECHAZADA" ? "rechazada" : "aprobada"}.`,
      focusEvidenceId: item.evidencia_id,
      autoAdvance: imageViewerEvidenceId === item.evidencia_id,
    });
  }

  function toggleSupervisorEvidenceSelection(evidenceId: string) {
    setSelectedSupEvidenceId(evidenceId);
    setSelectedSupEvidenceIds((prev) => prev.includes(evidenceId) ? prev.filter((id) => id !== evidenceId) : [...prev, evidenceId]);
  }

  function selectAllVisibleSupervisorEvidences() {
    const ids = filteredSupervisorEvidences.map((item) => item.evidencia_id);
    setSelectedSupEvidenceIds(ids);
    if (ids[0]) setSelectedSupEvidenceId(ids[0]);
  }

  function selectBrandSupervisorEvidences(brandKey: string) {
    const group = groupedSupervisorEvidences.find((item) => item.brandKey === brandKey);
    const ids = group?.items.map((item) => item.evidencia_id) || [];
    setSelectedSupEvidenceIds(ids);
    if (ids[0]) setSelectedSupEvidenceId(ids[0]);
  }

  async function runBatchEvidenceReview(decision: SupervisorDecision) {
    await applyEvidenceReviewBatch(selectedSupEvidenceIds, decision, reviewNote, { clearSelection: true });
  }

  async function runBrandEvidenceReview(brandKey: string, decision: SupervisorDecision) {
    const group = groupedSupervisorEvidences.find((item) => item.brandKey === brandKey);
    if (!group?.items.length) return setStatusMsg("No hay evidencias visibles en ese grupo.");
    const requiresNote = decision === "OBSERVADA" || decision === "RECHAZADA";
    const prompted = requiresNote ? window.prompt(decision === "OBSERVADA" ? `Comentario general para ${group.brandLabel}:` : `Motivo general de rechazo para ${group.brandLabel}:`, reviewNote || "") : reviewNote;
    if (requiresNote && !String(prompted || "").trim()) return setStatusMsg(decision === "OBSERVADA" ? "Se canceló el comentario masivo por falta de texto." : "Se canceló el rechazo masivo por falta de motivo.");
    setSelectedSupEvidenceId(group.items[0].evidencia_id);
    await applyEvidenceReviewBatch(group.items.map((item) => item.evidencia_id), decision, String(prompted || ""), {
      successMessage: `${group.items.length} evidencia(s) de ${group.brandLabel} ${decision === "OBSERVADA" ? "comentadas" : decision === "RECHAZADA" ? "rechazadas" : "aprobadas"}.`,
      focusEvidenceId: group.items[0].evidencia_id,
    });
  }

  function clearSupervisorEvidenceFilters() {
    setSupEvidencePromotorFilter("");
    setSupEvidenceStoreFilter("");
    setSupEvidenceBrandFilter("");
    setSupEvidenceTypeFilter("");
    setSupEvidencePhaseFilter("");
    setSupEvidenceRiskFilter("");
    setSupEvidenceStatusFilter("");
    setSupEvidenceOnlyPending(false);
  }

  function moveSupervisorEvidenceViewer(step: number) {
    if (activeViewerSupervisorEvidenceIndex < 0) return;
    const next = activeViewerSupervisorEvidenceSequence[activeViewerSupervisorEvidenceIndex + step];
    if (!next) return;
    setSelectedSupEvidenceId(next.evidencia_id);
    openImageViewer(next.url_foto, next.evidencia_id);
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div className="shell">
          <div className="card loadingCard">
            <div className="loadingRow">
              <RefreshCw className="spin" size={18} />
              <span>Cargando operación...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <div className="shell">
        <div className="stickyTop">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hero heroSplit">
            <div className="heroLogoBlock">
              <div className="brandWord">REZGO</div>
            </div>
            <div className="heroTitleBlock heroTitleBlockWide">
              <div className="heroTitle heroTitleTight">{role === "supervisor" ? <>Operación<br />supervisor</> : role === "cliente" ? <>Consulta<br />cliente</> : role === "promotor" ? <>Operación<br />del promotor</> : <>Acceso<br />no configurado</>}</div>
              <div className="heroMetaSingle heroMetaSingleWide">{actorLabel}</div>
            </div>
          </motion.div>

          {role === "supervisor" ? (
            <div className="tabsBar tabsInline">
              {supervisorTabs.map((tab) => (
                <button key={tab.key} className={`tabBtn ${supervisorModule === tab.key ? "tabBtnActive" : ""}`} onClick={() => setSupervisorModule(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          ) : role === "cliente" ? (
            <div className="tabsBar tabsInline">
              {clientTabs.map((tab) => (
                <button key={tab.key} className={`tabBtn ${clientModule === tab.key ? "tabBtnActive" : ""}`} onClick={() => setClientModule(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          ) : role === "promotor" ? (
            <div className="tabsBar tabsInline">
              {promotorTabs.map((tab) => (
                <button key={tab.key} className={`tabBtn ${promotorModule === tab.key ? "tabBtnActive" : ""}`} onClick={() => setPromotorModule(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="card warning">
            <div className="warningRow">
              <AlertTriangle size={18} />
              <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{error}</span>
            </div>
          </div>
        ) : null}

        {!role ? (
          <div className="card">
            <div className="sectionTitle">Acceso pendiente de configuración</div>
            <div className="helperText">
              Esta cuenta no fue reconocida con un rol válido en la plataforma. Si este acceso debe entrar como cliente, promotor o supervisor, valida el external_id correspondiente y vuelve a abrir la mini app desde Telegram.
            </div>
            {detectedExternalId ? (
              <div className="miniKpi" style={{ marginTop: 12 }}>
                <div className="miniKpiLabel">external_id detectado</div>
                <div className="miniKpiValue" style={{ fontSize: 14, wordBreak: "break-all" }}>{detectedExternalId}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {role === "cliente" ? (
          <div className="card">
            <div className="sectionTitle">Filtros del cliente</div>
            <div className="filtersRow twoColsFilters">
              <input className="inputLike" type="date" value={clientFilters.fecha_inicio} onChange={(e) => setClientFilters((prev) => ({ ...prev, fecha_inicio: e.target.value }))} />
              <input className="inputLike" type="date" value={clientFilters.fecha_fin} onChange={(e) => setClientFilters((prev) => ({ ...prev, fecha_fin: e.target.value }))} />
              <select className="inputLike" value={clientFilters.cadena} onChange={(e) => setClientFilters((prev) => ({ ...prev, cadena: e.target.value, tienda_id: "" }))}>
                <option value="">Todas las cadenas</option>
                {clientFilterOptions.cadenas.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <select className="inputLike" value={clientFilters.region} onChange={(e) => setClientFilters((prev) => ({ ...prev, region: e.target.value, tienda_id: "" }))}>
                <option value="">Todas las regiones</option>
                {clientFilterOptions.regiones.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <select className="inputLike" value={clientFilters.tienda_id} onChange={(e) => setClientFilters((prev) => ({ ...prev, tienda_id: e.target.value }))}>
                <option value="">Todas las tiendas</option>
                {clientFilterOptions.tiendas.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <select className="inputLike" value={clientFilters.marca_id} onChange={(e) => setClientFilters((prev) => ({ ...prev, marca_id: e.target.value }))}>
                <option value="">Todas las marcas</option>
                {clientFilterOptions.marcas.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        ) : null}

        {role === "cliente" && clientModule === "resumen" ? (
          <div className="card">
            <div className="sectionTitle">Resumen cliente</div>
            <div className="summaryLine">Periodo: <strong>{clientDashboard.period?.label || `${clientFilters.fecha_inicio} a ${clientFilters.fecha_fin}`}</strong></div>
            <div className="summaryGrid">
              <div className="summaryBlock kpiBlock"><Store size={16} /><div className="kpiValue">{clientDashboard.kpis?.tiendas_visibles || 0}</div><div className="kpiLabel">Tiendas visibles</div></div>
              <div className="summaryBlock kpiBlock"><ClipboardList size={16} /><div className="kpiValue">{clientDashboard.kpis?.visitas || 0}</div><div className="kpiLabel">Visitas</div></div>
              <div className="summaryBlock kpiBlock"><CheckCircle2 size={16} /><div className="kpiValue">{clientDashboard.kpis?.cumplimiento_pct || 0}%</div><div className="kpiLabel">Cumplimiento</div></div>
              <div className="summaryBlock kpiBlock"><ImageIcon size={16} /><div className="kpiValue">{clientDashboard.kpis?.evidencias || 0}</div><div className="kpiLabel">Evidencias</div></div>
              <div className="summaryBlock kpiBlock"><Check size={16} /><div className="kpiValue">{clientDashboard.kpis?.aprobadas || 0}</div><div className="kpiLabel">Aprobadas</div></div>
              <div className="summaryBlock kpiBlock"><AlertTriangle size={16} /><div className="kpiValue">{clientDashboard.kpis?.alertas || 0}</div><div className="kpiLabel">Alertas</div></div>
            </div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Marcas / cuenta</div>
                <div className="summaryLine"><strong>{clientBranding.cliente_nombre || actorLabel}</strong></div>
                <div className="summaryLine">Geocerca OK: <strong>{clientDashboard.kpis?.geocerca_ok_pct || 0}%</strong></div>
                <div className="summaryLine">Observadas: <strong>{clientDashboard.kpis?.observadas || 0}</strong></div>
                <div className="summaryLine">Rechazadas: <strong>{clientDashboard.kpis?.rechazadas || 0}</strong></div>
              </div>
              <div className="panel">
                <div className="miniTitle">Top incidencias</div>
                <div className="stack compactStack">
                  {(clientDashboard.top_alerts || []).map((item) => (
                    <div className="listBtn" key={item.tipo_alerta}>
                      <div className="listTitle">{item.tipo_alerta}</div>
                      <div className="listSub">{item.total} registro(s)</div>
                    </div>
                  ))}
                  {!(clientDashboard.top_alerts || []).length ? <div className="emptyBox">Sin incidencias relevantes en el periodo.</div> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {role === "cliente" && clientModule === "tiendas" ? (
          <div className="card">
            <div className="sectionTitle">Tiendas</div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Listado</div>
                <div className="stack compactStack">
                  {clientStores.map((item) => (
                    <button key={item.tienda_id} className={`listBtn ${selectedClientStoreId === item.tienda_id ? "listBtnGreen" : ""}`} onClick={() => setSelectedClientStoreId(item.tienda_id)}>
                      <div className="listTitle">{item.tienda_nombre}</div>
                      <div className="listSub">{item.cadena || "Sin cadena"} · {item.region || "Sin región"}</div>
                      <div className="geoRow">
                        <span className={`riskBadge ${statusClass(item.estatus)}`}>{item.estatus}</span>
                        <span className="riskBadge riskGreen">Visitas {item.visitas}</span>
                      </div>
                    </button>
                  ))}
                  {!clientStores.length ? <div className="emptyBox">No hay tiendas con actividad para los filtros seleccionados.</div> : null}
                </div>
              </div>
              <div className="panel">
                <div className="miniTitle">Detalle</div>
                {clientStoreDetail?.store ? (
                  <>
                    <div className="summaryLine"><strong>{clientStoreDetail.store.nombre_tienda || clientStoreDetail.store.tienda_id}</strong></div>
                    <div className="summaryLine">Cadena: {clientStoreDetail.store.cadena || "-"}</div>
                    <div className="summaryLine">Región: {clientStoreDetail.store.region || "-"}</div>
                    <div className="summaryLine">Ciudad: {clientStoreDetail.store.ciudad || "-"}</div>
                    <div className="summaryLine">Visitas: <strong>{clientStoreDetail.summary?.visitas || 0}</strong></div>
                    <div className="summaryLine">Evidencias: <strong>{clientStoreDetail.summary?.evidencias || 0}</strong></div>
                    <div className="summaryLine">Aprobadas: <strong>{clientStoreDetail.summary?.aprobadas || 0}</strong></div>
                    <div className="summaryLine">Observadas: <strong>{clientStoreDetail.summary?.observadas || 0}</strong></div>
                    <div className="summaryLine">Alertas: <strong>{clientStoreDetail.summary?.alertas || 0}</strong></div>
                  </>
                ) : <div className="emptyBox">Selecciona una tienda.</div>}
              </div>
            </div>
          </div>
        ) : null}

        {role === "cliente" && clientModule === "evidencias" ? (
          <div className="card e011GroupedEvidenceHub">
            <div className="sectionTitle">Evidencias presentables</div>
            <div className="contextHint">Primero se muestran grupos de análisis; las fotos se revisan en detalle solo al abrir el grupo o el visor ampliado.</div>
            <div className="filtersRow twoColsFilters">
              <select className="inputLike" value={clientFilters.tipo_evidencia} onChange={(e) => setClientFilters((prev) => ({ ...prev, tipo_evidencia: e.target.value }))}>
                <option value="">Todos los tipos</option>
                {clientFilterOptions.tipos_evidencia.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <select className="inputLike" value={clientFilters.decision_supervisor} onChange={(e) => setClientFilters((prev) => ({ ...prev, decision_supervisor: e.target.value }))}>
                <option value="">Aprobadas + observadas</option>
                {clientFilterOptions.decisiones.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <select className="inputLike" value={clientFilters.riesgo} onChange={(e) => setClientFilters((prev) => ({ ...prev, riesgo: e.target.value }))}>
                <option value="">Todos los riesgos</option>
                {clientFilterOptions.riesgos.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
            <div className="e011ModeRow">
              <span className="e011ModeLabel">Agrupar por</span>
              {(["marca", "tienda", "estatus"] as EvidenceGroupMode[]).map((mode) => (
                <button key={mode} className={`e011ModeBtn ${clientEvidenceGroupMode === mode ? "e011ModeBtnActive" : ""}`} onClick={() => setClientEvidenceGroupMode(mode)}>{getEvidenceGroupModeLabel(mode)}</button>
              ))}
            </div>

            {!clientEvidences.length ? <div className="emptyBox">No hay evidencias para mostrar.</div> : null}

            {clientEvidences.length ? (
              <>
                <div className="e011EvidenceBoardHeader">
                  <div>
                    <div className="miniTitle">Grupos visibles</div>
                    <div className="contextHint">{clientEvidenceGroups.length} grupo(s), {clientEvidences.length} evidencia(s). Página {clientEvidenceGroupSafePage} de {clientEvidenceGroupPageCount}.</div>
                  </div>
                  <div className="e011Pager">
                    <button className="actionButton compactBtn" disabled={clientEvidenceGroupSafePage <= 1} onClick={() => setClientEvidenceGroupPage((prev) => Math.max(1, prev - 1))}>‹ Anterior</button>
                    <button className="actionButton compactBtn" disabled={clientEvidenceGroupSafePage >= clientEvidenceGroupPageCount} onClick={() => setClientEvidenceGroupPage((prev) => Math.min(clientEvidenceGroupPageCount, prev + 1))}>Siguiente ›</button>
                  </div>
                </div>
                <div className="e011GroupBoard">
                  {pagedClientEvidenceGroups.map((group) => (
                    <button key={group.brandKey} type="button" className={`e011GroupTile ${activeClientEvidenceGroup?.brandKey === group.brandKey ? "e011GroupTileActive" : ""}`} onClick={() => setActiveClientEvidenceGroupKey(group.brandKey)}>
                      <div className="e011GroupTileTop">
                        <div>
                          <div className="e011GroupKind">{getEvidenceGroupModeLabel(clientEvidenceGroupMode)}</div>
                          <div className="e011GroupTitle">{group.brandLabel}</div>
                        </div>
                        <span className="riskBadge riskNeutral">{group.total}</span>
                      </div>
                      <div className="e011MiniCollage">
                        {group.previewItems.map((item) => <img key={item.evidencia_id} src={item.url_foto} alt={item.tipo_evidencia || "Evidencia"} />)}
                        {!group.previewItems.length ? <div className="e011EmptyThumb"><ImageIcon size={18} /></div> : null}
                      </div>
                      <div className="e011GroupStats">
                        <span className="riskBadge riskGreen">{group.aprobadas} aprobadas</span>
                        <span className="riskBadge riskAmber">{group.observadas} observadas</span>
                        <span className="riskBadge riskRed">{group.rechazadas} rechazadas</span>
                      </div>
                      <div className="e011GroupMeta">{group.tiendas.slice(0, 2).join(" · ") || group.brandSubtitle}</div>
                    </button>
                  ))}
                </div>

                {activeClientEvidenceGroup ? (
                  <div className="e011ReviewWorkspace clientWorkspace">
                    <div className="e011WorkspaceHeader">
                      <div>
                        <div className="miniTitle">{activeClientEvidenceGroup.brandLabel}</div>
                        <div className="contextHint">{activeClientEvidenceGroup.total} evidencia(s). Se muestran miniaturas compactas; doble clic abre la foto grande.</div>
                      </div>
                    </div>
                    <div className="e011ThumbStrip">
                      {activeClientEvidenceGroup.items.slice(0, E011_THUMBS_PER_GROUP).map((item) => (
                        <button key={item.evidencia_id} type="button" className="e011ThumbCard" onClick={() => handleImageTap(item.url_foto)} onDoubleClick={() => openImageViewer(item.url_foto)}>
                          <img src={item.url_foto} alt={item.tipo_evidencia || item.tipo_evento} />
                          <div className="e011ThumbInfo">
                            <strong>{item.tipo_evidencia || item.tipo_evento}</strong>
                            <span>{getStoreDisplayFromItem(item) || item.tienda_nombre || "Tienda"}</span>
                            <span>{item.fecha_hora_fmt}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {activeClientEvidenceGroup.items.length > E011_THUMBS_PER_GROUP ? <div className="contextHint">Hay {activeClientEvidenceGroup.items.length - E011_THUMBS_PER_GROUP} evidencia(s) más en este grupo; filtra por tienda, tipo o riesgo para acotar el análisis.</div> : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {role === "cliente" && clientModule === "incidencias" ? (
          <div className="card">
            <div className="sectionTitle">Incidencias</div>
            <div className="filtersRow twoColsFilters">
              <select className="inputLike" value={clientFilters.severidad} onChange={(e) => setClientFilters((prev) => ({ ...prev, severidad: e.target.value }))}>
                <option value="">Todas las severidades</option>
                {clientFilterOptions.severidades.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
              <select className="inputLike" value={clientFilters.status} onChange={(e) => setClientFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="">Todos los estatus</option>
                {clientFilterOptions.estatus_alerta.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
            <div className="stack compactStack" style={{ marginTop: 12 }}>
              {clientIncidents.map((item) => (
                <div className="listBtn" key={item.alerta_id}>
                  <div className="listTitle">{item.tienda_nombre || item.tienda_id || "Tienda"}</div>
                  <div className="listSub">{item.tipo_alerta} · {item.fecha_hora_fmt}</div>
                  <div className="summaryLine">{item.descripcion}</div>
                  <div className="geoRow">
                    <span className={`riskBadge ${severityClass(item.severidad)}`}>{item.severidad}</span>
                    <span className={`riskBadge ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                </div>
              ))}
              {!clientIncidents.length ? <div className="emptyBox">Sin incidencias para los filtros seleccionados.</div> : null}
            </div>
          </div>
        ) : null}

        {role === "cliente" && clientModule === "entregables" ? (
          <div className="card">
            <div className="sectionTitle">Entregables</div>
            <div className="panel">
              <div className="summaryLine">{clientDeliverablesMessage || "Los entregables automáticos estarán disponibles en la siguiente fase."}</div>
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "asistencia" ? (
          <div className="card">
            <div className="sectionTitle">Asistencia</div>
            <div className="twoCol">
              <div className="panel">
                <label className="fieldLabel">Tienda</label>
                <select className="inputLike" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                  <option value="">Selecciona una tienda</option>
                  {stores.map((store) => (
                    <option key={store.tienda_id} value={store.tienda_id}>{formatStoreDisplay(store.tienda_id, store.nombre_tienda)}</option>
                  ))}
                </select>

                <div className="captureBlock">
                  <div className="captureTitle">Entrada</div>
                  <div className="captureStack">
                    <button className="secondaryBtn compactBtn assistQuickBtn" onClick={() => void captureLocation("entrada")} disabled={capturingLocation === "entrada"}>
                      <MapPin size={16} />
                      {capturingLocation === "entrada" ? "Ubicando..." : entryLocation ? "Ubicación lista" : "Capturar ubicación"}
                    </button>
                    <button className="secondaryBtn compactBtn assistQuickBtn" onClick={() => void openCamera("entrada", "user")}>
                      <Camera size={16} />
                      {entryPhoto ? "Selfie lista" : "Tomar selfie"}
                    </button>
                    {attendanceGalleryAuth.allowed ? (
                      <button className="secondaryBtn compactBtn assistQuickBtn" onClick={() => entryGalleryInputRef.current?.click()}>
                        <ImageIcon size={16} />
                        Galería autorizada
                      </button>
                    ) : null}
                  </div>
                  <input ref={entryGalleryInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleGallerySelection("attendance-entry", e.target.files)} />
                  <div className="authTraceBox">Galería asistencia: <strong>{galleryReasonLabel(attendanceGalleryAuth)}</strong></div>
                  {entryLocation ? <div className="captureMeta">Lat {entryLocation.lat.toFixed(5)} · Lon {entryLocation.lon.toFixed(5)}</div> : null}
                  {entryPhoto ? <div className="thumbRow"><img src={entryPhoto.dataUrl} className="thumb" alt="Entrada" /></div> : null}
                </div>

                <button className="primaryBtn mainActionBtn entryActionBtn" onClick={() => void createEntry()} disabled={syncing}>
                  <span className="mainActionTop"><MapPin size={16} /><span>{syncing ? "Procesando..." : "Registrar entrada"}</span></span>
                </button>

                {hasOpenVisit && exitVisit ? (
                  <button className="secondaryBtn dangerBtn mainActionBtn exitActionBtn" onClick={() => void closeVisit()} disabled={syncing || !hasOpenVisit}>
                    <span className="mainActionTop"><CheckCircle2 size={16} /><span>{syncing ? "Procesando..." : "Registrar salida"}</span></span>
                    {!syncing && exitVisit ? <span className="mainActionSub">{getVisitDisplayName(exitVisit, stores)}</span> : null}
                  </button>
                ) : null}
              </div>

              <div className="panel">
                <div className="miniTitle">Visitas de hoy</div>
                <div className="stack compactStack">
                  {pendingVisits.map((visit) => {
                    const isOpen = !visit.hora_fin;
                    return (
                      <button key={visit.visita_id} onClick={() => { if (isOpen) setSelectedVisitId(visit.visita_id); focusAttendanceForVisit(visit.visita_id); }} className={`listBtn ${isOpen && selectedVisitId === visit.visita_id ? "listBtnGreen" : ""}`}>
                        <div className="listTitle">{getVisitDisplayName(visit, stores)}</div>
                        <div className="listSub">Entrada: {formatHourFromIso(visit.hora_inicio)} · {isOpen ? "Salida pendiente" : `Salida: ${formatHourFromIso(visit.hora_fin)}`}</div>
                        <div className="geoRow">
                          <span className={`geoBadge ${geofenceClass(visit.resultado_geocerca_entrada)}`}>E: {geofenceShortLabel(visit.resultado_geocerca_entrada)}</span>
                          {!isOpen ? <span className={`geoBadge ${geofenceClass(visit.resultado_geocerca_salida)}`}>S: {geofenceShortLabel(visit.resultado_geocerca_salida)}</span> : null}
                        </div>
                      </button>
                    );
                  })}
                  {!pendingVisits.length ? <div className="emptyBox">No hay visitas registradas hoy.</div> : null}
                </div>

                {attendanceGallery.length ? (
                  <div className="attendanceGalleryBlock">
                    <div className="miniTitle" style={{ marginTop: 12 }}>Fotos de asistencia</div>
                    <div className="galleryScroll compactGalleryScroll">
                      <div className="galleryGrid attendanceGalleryGrid">
                        {attendanceGallery.map((item) => (
                          <div className="galleryCard" key={item.evidencia_id} ref={(el) => { attendancePhotoRefs.current[item.evidencia_id] = el; }}>
                            <div className="imageFrame"><img src={item.url_foto} alt={item.tipo_evento} className="img" onDoubleClick={() => openImageViewer(item.url_foto)} onClick={(e) => { e.stopPropagation(); handleImageTap(item.url_foto); }} /></div>
                            <div className="galleryTop">
                              <div className="galleryTitle">{item.tipo_evento === "ASISTENCIA_ENTRADA" ? "Entrada" : "Salida"}</div>
                              <span className={`riskBadge ${severityClass(item.riesgo)}`}>{item.riesgo || "BAJO"}</span>
                            </div>
                            {getStoreDisplayFromItem(item) ? <div className="gallerySub compactMeta">{getStoreDisplayFromItem(item)}</div> : null}
                            <div className="galleryDate">{item.fecha_hora_fmt}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "evidencias" ? (
          <div className="card">
            <div className="sectionTitle">Evidencias</div>
            <div className="twoCol">
              <div className="panel">
                <label className="fieldLabel">Visita activa</label>
                <select className="inputLike" value={selectedVisitId} onChange={(e) => setSelectedVisitId(e.target.value)}>
                  <option value="">Selecciona una visita</option>
                  {openVisits.map((visit) => (
                    <option key={visit.visita_id} value={visit.visita_id}>{getVisitDisplayName(visit, stores)}</option>
                  ))}
                </select>
                {selectedVisitStoreName ? <div className="contextHint">Tienda vinculada: {selectedVisitStoreName}</div> : null}

                <label className="fieldLabel" style={{ marginTop: 10 }}>Marca</label>
                <select className="inputLike" value={evidenceBrandId} onChange={(e) => {
                  const brand = availableBrands.find((item) => item.marca_id === e.target.value);
                  setEvidenceBrandId(e.target.value);
                  setEvidenceBrandLabel(normalizeBrandLabel(brand?.marca_nombre || "", brand?.marca_id || ""));
                  setEvidenceType("");
                  setEvidencePhase("NA");
                }}>
                  <option value="">Selecciona una marca</option>
                  {availableBrands.map((brand) => (
                    <option key={brand.marca_id} value={brand.marca_id}>{normalizeBrandLabel(brand.marca_nombre, brand.marca_id)}</option>
                  ))}
                </select>

                <label className="fieldLabel" style={{ marginTop: 10 }}>Tipo</label>
                <select className="inputLike" value={evidenceType} onChange={(e) => {
                  const nextType = e.target.value;
                  setEvidenceType(nextType);
                  const nextRule = evidenceTypeOptions.find((item) => item.tipo_evidencia === nextType);
                  if (nextRule) {
                    setEvidenceQty(nextRule.fotos_requeridas || 1);
                  }
                }} disabled={!evidenceTypeOptions.length}>
                  <option value="">{evidenceTypeOptions.length ? "Selecciona un tipo" : "Selecciona primero tienda y marca"}</option>
                  {evidenceTypeOptions.map((rule) => (
                    <option key={rule.tipo_evidencia} value={rule.tipo_evidencia}>{rule.tipo_evidencia}</option>
                  ))}
                </select>

                <label className="fieldLabel" style={{ marginTop: 10 }}>Fase</label>
                <select className="inputLike" value={evidencePhase} onChange={(e) => setEvidencePhase(e.target.value as EvidencePhase)} disabled={!evidenceType}>
                  {evidencePhaseOptions.map((value) => <option key={value} value={value}>{formatPhaseLabel(value)}</option>)}
                </select>

                <label className="fieldLabel" style={{ marginTop: 10 }}>Cantidad requerida</label>
                <input className="inputLike" type="number" min={1} max={24} value={evidenceQty} readOnly disabled />
              </div>

              <div className="panel">
                <label className="fieldLabel">Observación</label>
                <input className="inputLike" value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="Ej. Cabecera completa, competencia lateral..." />
                <div className="captureGrid" style={{ marginTop: 12 }}>
                  <button className="secondaryBtn compactBtn" onClick={() => void openCamera("evidencia", "environment") }>
                    <Camera size={16} />
                    Tomar foto
                  </button>
                  {evidenceGalleryAuth.allowed ? (
                    <button className="secondaryBtn compactBtn" onClick={() => evidenceGalleryInputRef.current?.click()}>
                      <ImageIcon size={16} />
                      Galería autorizada
                    </button>
                  ) : null}
                </div>
                <input ref={evidenceGalleryInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => void handleGallerySelection("evidence", e.target.files)} />
                <div className="contextHint">Las evidencias normalmente se capturan con cámara. Máximo 24 fotos en la selección actual.</div>
                <div className="authTraceBox">Galería evidencia: <strong>{galleryReasonLabel(evidenceGalleryAuth)}</strong></div>
                {evidencePhotos.length ? (
                  <>
                    <div className="thumbGrid">{evidencePhotos.map((photo, index) => (
                      <div key={`${photo.name}-${photo.capturedAt}`} style={{ position: "relative" }}>
                        <img src={photo.dataUrl} className="thumb" alt={photo.name} />
                        <button className="removeThumbBtn" onClick={() => removeEvidencePhotoAt(index)} aria-label="Quitar foto">×</button>
                      </div>
                    ))}</div>
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => clearEvidencePhotos()}><Trash2 size={16} /><span>Limpiar selección</span></button>
                    </div>
                  </>
                ) : null}
                <button className="primaryBtn mainActionBtn" onClick={() => void saveEvidenceFlow()} disabled={syncing}>
                  <Camera size={16} />
                  {syncing ? "Guardando..." : "Registrar evidencia"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "mis_evidencias" ? (
          <div className="card">
            <div className="sectionTitle">Mis evidencias</div>
            <div className="filtersRow">
              <select className="inputLike" value={evidenceFilterStore} onChange={(e) => { setEvidenceFilterStore(e.target.value); setEvidenceFilterBrand(""); setEvidenceFilterType(""); setEvidenceFilterPhase(""); }}>
                <option value="">Todas las tiendas</option>
                {evidenceFilterOptions.stores.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select className="inputLike" value={evidenceFilterBrand} onChange={(e) => { setEvidenceFilterBrand(e.target.value); setEvidenceFilterType(""); setEvidenceFilterPhase(""); }}>
                <option value="">Todas las marcas</option>
                {evidenceFilterOptions.brands.map((value) => <option key={value} value={value}>{normalizeBrandLabel(value, "Marca")}</option>)}
              </select>
              <select className="inputLike" value={evidenceFilterType} onChange={(e) => { setEvidenceFilterType(e.target.value); setEvidenceFilterPhase(""); }}>
                <option value="">Todos los tipos</option>
                {evidenceFilterOptions.types.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select className="inputLike" value={evidenceFilterPhase} onChange={(e) => setEvidenceFilterPhase(e.target.value)}>
                <option value="">Todas las fases</option>
                {evidenceFilterOptions.phases.map((value) => <option key={value} value={value}>{formatPhaseLabel(value)}</option>)}
              </select>
            </div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Listado</div>
                <div className="stack compactStack">
                  {filteredOperationalGallery.map((item) => (
                    <button key={item.evidencia_id} onClick={() => setSelectedEvidenceId(item.evidencia_id)} className={`listBtn ${selectedEvidenceId === item.evidencia_id ? "listBtnGreen" : ""}`}>
                      <div className="listTitle">{getStoreDisplayFromItem(item) || "Visita activa"}</div>
                      <div className="listSub">{item.tipo_evidencia} · {normalizeBrandLabel(item.marca_nombre, "Marca")}</div>
                    </button>
                  ))}
                  {!filteredOperationalGallery.length ? <div className="emptyBox">No hay evidencias con esos filtros.</div> : null}
                </div>
              </div>
              <div className="panel">
                <div className="miniTitle">Acciones</div>
                {selectedEvidence ? (
                  <>
                    <div className="previewFrame" onDoubleClick={() => openImageViewer(selectedEvidence.url_foto)} onClick={() => handleImageTap(selectedEvidence.url_foto)}><img src={selectedEvidence.url_foto} alt={selectedEvidence.tipo_evidencia} className="img" /></div>
                    {getStoreDisplayFromItem(selectedEvidence) ? <div className="summaryLine">{getStoreDisplayFromItem(selectedEvidence)}</div> : null}
                    <div className="summaryLine">{selectedEvidence.tipo_evidencia} · <strong>{normalizeBrandLabel(selectedEvidence.marca_nombre, "Marca")}</strong></div>
                    <div className="summaryLine">{selectedEvidence.fecha_hora_fmt}</div>
                    <div className="summaryLine">Riesgo: <strong>{selectedEvidence.riesgo}</strong></div>
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => openImageViewer(selectedEvidence.url_foto)}><Eye size={16} /><span>Ver foto</span></button>
                      <button className="actionButton" onClick={() => void markEvidenceAsCancelled()}><Trash2 size={16} /><span>Anular</span></button>
                      <button className="actionButton" onClick={() => void openCamera("reemplazo", "environment")}><Camera size={16} /><span>Reemplazar cámara</span></button>
                      {replaceGalleryAuth.allowed ? <button className="actionButton" onClick={() => replaceGalleryInputRef.current?.click()}><ImageIcon size={16} /><span>Galería autorizada</span></button> : null}
                      <button className="actionButton" onClick={() => void saveNote()}><Pencil size={16} /><span>Guardar nota</span></button>
                    </div>
                    <input ref={replaceGalleryInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleGallerySelection("replace", e.target.files)} />
                    <div className="authTraceBox">Galería reemplazo: <strong>{galleryReasonLabel(replaceGalleryAuth)}</strong></div>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Nota</label>
                    <input className="inputLike" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Escribe una observación" />
                  </>
                ) : (
                  <div className="emptyBox">Selecciona una evidencia.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "resumen" ? (
          <div className="card">
            <div className="sectionTitle">Resumen</div>
            <div className="summaryGrid">
              <div className="summaryBlock">
                <div className="miniTitle">Operación del día</div>
                <div className="summaryLine">Tiendas asignadas: <strong>{stores.length}</strong></div>
                <div className="summaryLine">Visitas abiertas: <strong>{openVisits.length}</strong></div>
                <div className="summaryLine">Evidencias hoy: <strong>{operationalGallery.length}</strong></div>
                <div className="summaryLine">Alertas: <strong>{operationalGallery.filter((g) => g.riesgo === "ALTO" || g.riesgo === "MEDIO").length}</strong></div>
              </div>
              <div className="summaryBlock">
                <div className="miniTitle">Consumo estimado</div>
                <div className="summaryLine">Fotos hoy: <strong>{promotorUsage.today?.fotos || 0}</strong></div>
                <div className="summaryLine">MB hoy: <strong>{promotorUsage.today?.mb?.toFixed ? promotorUsage.today.mb.toFixed(2) : (promotorUsage.today?.mb || 0)}</strong></div>
                <div className="summaryLine">MB mes: <strong>{promotorUsage.month?.mb?.toFixed ? promotorUsage.month.mb.toFixed(2) : (promotorUsage.month?.mb || 0)}</strong></div>
                <div className="summaryLine">GB mes: <strong>{promotorUsage.month?.gb?.toFixed ? promotorUsage.month.gb.toFixed(3) : (promotorUsage.month?.gb || 0)}</strong></div>
                <div className="summaryLine">Referencia bolsa $200: <strong>{promotorUsage.reference?.reference_pct || 0}% · ~$ {promotorUsage.reference?.estimated_mxn || 0}</strong></div>
                <div className="summaryLine summaryGeo">{promotorUsage.reference?.note || "Estimado de uso de la mini app. No es saldo real del operador."}</div>
              </div>
              <div className="summaryBlock">
                <div className="miniTitle">Pendientes por enviar</div>
                <div className="summaryLine">Pendientes: <strong>{pendingQueue.length}</strong></div>
                <div className="summaryLine">Errores: <strong>{pendingQueue.filter((item) => item.status === "ERROR_ENVIO").length}</strong></div>
                <div className="summaryLine">Con conexión, la app intentará reenviar automáticamente.</div>
                <button className="secondaryBtn" style={{ marginTop: 10 }} onClick={() => void syncPendingQueue(true)} disabled={syncingPendingQueue || !pendingQueue.length}>
                  <RefreshCw size={16} className={syncingPendingQueue ? "spin" : ""} />
                  {syncingPendingQueue ? "Reintentando..." : "Reintentar envíos"}
                </button>
                {pendingQueue.length ? (
                  <div className="stack compactStack" style={{ marginTop: 12, maxHeight: 180, overflowY: "auto" }}>
                    {pendingQueue.map((item) => (
                      <div className="listBtn" key={item.id}>
                        <div className="listTitle">{formatPendingQueueLabel(item)}</div>
                        <div className="listSub">{formatDateTimeMaybe(item.createdAt)} · {item.status === "ERROR_ENVIO" ? "Error" : "Pendiente"}</div>
                        {item.lastError ? <div className="summaryLine summaryGeo">{item.lastError}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="summaryBlock">
                <div className="miniTitle">Registros de visitas</div>
                {pendingVisits.length ? pendingVisits.map((visit) => (
                  <React.Fragment key={visit.visita_id}>
                    <div className="summaryLine">{getVisitDisplayName(visit, stores)} · Entrada <strong>{formatHourFromIso(visit.hora_inicio)}</strong>{visit.hora_fin ? ` · Salida ${formatHourFromIso(visit.hora_fin)}` : " · Sin salida"}</div>
                    <div className="summaryLine summaryGeo">E: {geofenceShortLabel(visit.resultado_geocerca_entrada)}{visit.hora_fin ? ` · S: ${geofenceShortLabel(visit.resultado_geocerca_salida)}` : ""}</div>
                  </React.Fragment>
                )) : <div className="summaryLine">No hay registros del día.</div>}
              </div>

              <div className="summaryBlock">
                <div className="miniTitle">Alertas recientes</div>
                {promotorRecentAlerts.length ? promotorRecentAlerts.map((item) => (
                  <React.Fragment key={item.alerta_id}>
                    <div className="summaryLine"><strong>{item.tipo_alerta}</strong> · {item.tienda_nombre || item.tienda_id || "Tienda"}</div>
                    <div className="summaryLine summaryGeo">{item.fecha_hora_fmt || ""} · <span className={`riskBadge ${statusClass(item.status)}`}>{item.status}</span>{item.resolved_classification ? ` · ${item.resolved_classification}` : ""}</div>
                  </React.Fragment>
                )) : <div className="summaryLine">Sin alertas recientes.</div>}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" && supervisorModule === "resumen" ? (
          <div className="card">
            <div className="sectionTitle">Resumen supervisor</div>
            <div className="summaryGrid">
              <div className="summaryBlock kpiBlock"><Users size={16} /><div className="kpiValue">{supervisorSummary.promotores}</div><div className="kpiLabel">Promotores</div></div>
              <div className="summaryBlock kpiBlock"><ClipboardList size={16} /><div className="kpiValue">{supervisorSummary.visitasHoy}</div><div className="kpiLabel">Visitas hoy</div></div>
              <div className="summaryBlock kpiBlock"><Store size={16} /><div className="kpiValue">{supervisorSummary.abiertas}</div><div className="kpiLabel">Abiertas</div></div>
              <div className="summaryBlock kpiBlock"><ImageIcon size={16} /><div className="kpiValue">{supervisorSummary.evidenciasHoy}</div><div className="kpiLabel">Evidencias</div></div>
              <div className="summaryBlock kpiBlock"><ShieldAlert size={16} /><div className="kpiValue">{supervisorSummary.alertas}</div><div className="kpiLabel">Alertas</div></div>
            </div>
            <div className="twoCol" style={{ marginTop: 12 }}>
              <div className="panel">
                <div className="miniTitle">Consumo aproximado</div>
                <div className="summaryLine">Fotos hoy: <strong>{supervisorUsage.today?.fotos || 0}</strong></div>
                <div className="summaryLine">MB hoy: <strong>{supervisorUsage.today?.mb?.toFixed ? supervisorUsage.today.mb.toFixed(2) : (supervisorUsage.today?.mb || 0)}</strong></div>
                <div className="summaryLine">MB mes: <strong>{supervisorUsage.month?.mb?.toFixed ? supervisorUsage.month.mb.toFixed(2) : (supervisorUsage.month?.mb || 0)}</strong></div>
              </div>
              <div className="panel">
                <div className="miniTitle">Pendientes de cierre</div>
                <div className="summaryLine">Visitas abiertas: <strong>{supervisorPendingClose.open_visits || 0}</strong></div>
                <div className="summaryLine">Alertas abiertas: <strong>{supervisorPendingClose.open_alerts || 0}</strong></div>
                <div className="summaryLine">Revisiones pendientes: <strong>{supervisorPendingClose.pending_reviews || 0}</strong></div>
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" && supervisorModule === "equipo" ? (
          <div className="card">
            <div className="sectionTitle">Equipo</div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Promotores</div>
                <div className="stack compactStack">
                  {supervisorTeam.map((item) => (
                    <button
                      key={item.promotor_id}
                      onClick={() => {
                        setSelectedTeamPromotorId(item.promotor_id);
                        setSelectedRouteVisitId("");
                        setExpedient(null);
                      }}
                      className={`listBtn ${selectedTeamPromotorId === item.promotor_id ? "listBtnGreen" : ""}`}
                    >
                      <div className="listTitle">{item.nombre}</div>
                      <div className="listSub">Visitas: {item.visitas_hoy} · Abiertas: {item.visitas_abiertas} · Alertas: {item.alertas_abiertas}</div>
                      <div className="geoRow"><span className={`riskBadge ${statusClass(item.status_general)}`}>{item.status_general}</span></div>
                    </button>
                  ))}
                  {!supervisorTeam.length ? <div className="emptyBox">No hay promotores ligados a este supervisor.</div> : null}
                </div>
              </div>
              <div className="panel">
                <div className="miniTitle">Detalle</div>
                {selectedTeamMember ? (
                  <>
                    <div className="summaryLine"><strong>{selectedTeamMember.nombre}</strong></div>
                    <div className="summaryLine">Región: {selectedTeamMember.region || "-"}</div>
                    <div className="summaryLine">Visitas hoy: <strong>{selectedTeamMember.visitas_hoy}</strong></div>
                    <div className="summaryLine">Abiertas: <strong>{selectedTeamMember.visitas_abiertas}</strong></div>
                    <div className="summaryLine">Evidencias hoy: <strong>{selectedTeamMember.evidencias_hoy}</strong></div>
                    <div className="summaryLine">Alertas abiertas: <strong>{selectedTeamMember.alertas_abiertas}</strong></div>
                    <div className="summaryLine">Última tienda: {selectedTeamMember.ultima_tienda_display || selectedTeamMember.ultima_tienda || "-"}</div>
                    <div className="summaryLine">Última entrada: {formatHourFromIso(selectedTeamMember.ultima_entrada)}</div>
                    <div className="summaryLine">Última salida: {selectedTeamMember.ultima_salida ? formatHourFromIso(selectedTeamMember.ultima_salida) : "Pendiente"}</div>
                    <div className="summaryLine">Estatus: <span className={`riskBadge ${statusClass(selectedTeamMember.status_general)}`}>{selectedTeamMember.status_general}</span></div>
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => { setSupEvidencePromotorFilter(selectedTeamMember.promotor_id); setSupervisorModule("evidencias"); }}><ImageIcon size={16} /><span>Ver evidencias</span></button>
                      <button className="actionButton" onClick={() => { setAlertPromotorFilter(selectedTeamMember.promotor_id); setSupervisorModule("alertas"); }}><ShieldAlert size={16} /><span>Ver alertas</span></button>
                      <button className="actionButton" onClick={() => setStatusMsg(supervisorDayRoute.length ? "Selecciona una visita del día abajo." : "Este promotor no tiene visitas del día.")}><Eye size={16} /><span>Ver visitas</span></button>
                    </div>
                    <div className="miniTitle" style={{ marginTop: 14 }}>Visitas del día</div>
                    {dayRouteLoading ? <div className="emptyBox">Cargando visitas del día...</div> : null}
                    {!dayRouteLoading ? (
                      <div className="stack compactStack" style={{ marginTop: 8 }}>
                        {supervisorDayRoute.map((row) => (
                          <button
                            key={row.visita_id}
                            className={`listBtn ${selectedRouteVisitId === row.visita_id ? "listBtnGreen" : ""}`}
                            onClick={() => {
                              setSelectedRouteVisitId(row.visita_id);
                              void openVisitExpedient(row.visita_id);
                            }}
                          >
                            <div className="listTitle">{row.tienda_nombre || row.tienda_id || "Tienda"}</div>
                            <div className="listSub">Entrada: {row.entry_fmt || formatHourFromIso(row.hora_inicio)} · {row.exit_fmt ? `Salida: ${row.exit_fmt}` : "Salida pendiente"}</div>
                            <div className="listSub">Estancia: {row.stay_minutes ? `${row.stay_minutes} min` : (row.hora_fin ? "0 min" : "En curso")} · Evidencias: {row.total_evidencias} · Alertas: {row.total_alertas}</div>
                            <div className="geoRow">
                              <span className={`geoBadge ${geofenceClass(row.geofence_entry)}`}>E: {geofenceShortLabel(row.geofence_entry)}</span>
                              <span className={`geoBadge ${geofenceClass(row.geofence_exit)}`}>S: {geofenceShortLabel(row.geofence_exit)}</span>
                            </div>
                            <div className="geoRow" style={{ marginTop: 8 }}>
                              <span className="riskBadge riskGreen">Abrir expediente</span>
                            </div>
                          </button>
                        ))}
                        {!supervisorDayRoute.length ? <div className="emptyBox">{selectedTeamMember?.visitas_hoy ? "No se pudieron cargar las visitas registradas del día." : "Este promotor no tiene visitas registradas hoy."}</div> : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="emptyBox">Selecciona un promotor.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" && supervisorModule === "alertas" ? (
          <div className="card">
            <div className="sectionTitle">Alertas</div>
            <div className="filtersRow">
              <select className="inputLike" value={alertPromotorFilter} onChange={(e) => setAlertPromotorFilter(e.target.value)}>
                <option value="">Todos los promotores</option>
                {supervisorPromotorOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
              </select>
              <select className="inputLike" value={alertStatusFilter} onChange={(e) => setAlertStatusFilter(e.target.value)}>
                <option value="">Todos los estatus</option>
                <option value="ABIERTA">ABIERTA</option>
                <option value="RESUELTA">RESUELTA</option>
                <option value="DESCARTADA">DESCARTADA</option>
              </select>
              <select className="inputLike" value={alertSeverityFilter} onChange={(e) => setAlertSeverityFilter(e.target.value)}>
                <option value="">Todas las severidades</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAJA">BAJA</option>
              </select>
            </div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Listado</div>
                <div className="stack compactStack">
                  {supervisorAlerts.map((item) => (
                    <button key={item.alerta_id} onClick={() => setSelectedAlertId(item.alerta_id)} className={`listBtn ${selectedAlertId === item.alerta_id ? "listBtnGreen" : ""}`}>
                      <div className="listTitle">{item.promotor_nombre || item.promotor_id}</div>
                      <div className="listSub">{item.tienda_display || item.tienda_nombre || item.tienda_id || "Tienda"} · {item.tipo_alerta}</div>
                      <div className="geoRow">
                        <span className={`riskBadge ${severityClass(item.severidad)}`}>{item.severidad}</span>
                        <span className={`riskBadge ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                    </button>
                  ))}
                  {!supervisorAlerts.length ? <div className="emptyBox">No hay alertas con esos filtros.</div> : null}
                </div>
              </div>
              <div className="panel">
                <div className="miniTitle">Detalle</div>
                {selectedAlert ? (
                  <>
                    <div className="summaryLine"><strong>{selectedAlert.promotor_nombre || selectedAlert.promotor_id}</strong></div>
                    <div className="summaryLine">Tienda: {selectedAlert.tienda_display || selectedAlert.tienda_nombre || selectedAlert.tienda_id || "-"}</div>
                    <div className="summaryLine">Tipo: {selectedAlert.tipo_alerta}</div>
                    <div className="summaryLine">Fecha: {selectedAlert.fecha_hora_fmt}</div>
                    <div className="summaryLine">Canal: {selectedAlert.canal_notificacion || "-"}</div>
                    <div className="summaryLine">Descripción: {selectedAlert.descripcion || "-"}</div>
                    {(selectedAlert.photo_url || selectedAlert.url_foto) ? <div className="previewFrame" onDoubleClick={() => openImageViewer(selectedAlert.photo_url || selectedAlert.url_foto || "")} onClick={() => handleImageTap(selectedAlert.photo_url || selectedAlert.url_foto || "")}><img src={selectedAlert.photo_url || selectedAlert.url_foto} alt={selectedAlert.tipo_alerta} className="img" /></div> : null}
                    {selectedAlert.hallazgos_ai ? <div className="summaryLine">Causa detectada: {selectedAlert.hallazgos_ai}</div> : null}
                    <div className="geoRow">
                      <span className={`riskBadge ${severityClass(selectedAlert.severidad)}`}>{selectedAlert.severidad}</span>
                      <span className={`riskBadge ${statusClass(selectedAlert.status)}`}>{selectedAlert.status}</span>
                    </div>
                    {(selectedAlert.atendida_por || selectedAlert.fecha_atencion || selectedAlert.comentario_cierre || selectedAlert.origen_cierre) ? (
                      <div className="traceBox">
                        <div className="traceTitle">Trazabilidad</div>
                        {selectedAlert.atendida_por ? <div className="summaryLine">Atendida por: <strong>{selectedAlert.atendida_por}</strong></div> : null}
                        {selectedAlert.fecha_atencion ? <div className="summaryLine">Fecha atención: <strong>{formatDateTimeMaybe(selectedAlert.fecha_atencion)}</strong></div> : null}
                        {selectedAlert.origen_cierre ? <div className="summaryLine">Origen cierre: <strong>{selectedAlert.origen_cierre}</strong></div> : null}
                        {selectedAlert.comentario_cierre ? <div className="summaryLine">Comentario: {selectedAlert.comentario_cierre}</div> : null}
                      </div>
                    ) : null}
                    <div className="traceBox" style={{ marginBottom: 10 }}><div className="traceTitle">¿Qué significa?</div><div className="summaryLine"><strong>RESUELTA</strong>: la alerta sí aplicaba y ya fue atendida.</div><div className="summaryLine"><strong>DESCARTADA</strong>: la alerta no aplicaba o fue falso positivo.</div></div><label className="fieldLabel" style={{ marginTop: 10 }}>Estatus final</label>
                    <select className="inputLike" value={alertFinalStatus} onChange={(e) => setAlertFinalStatus(e.target.value as AlertFinalStatus)}>
                      <option value="RESUELTA">RESUELTA</option>
                      <option value="DESCARTADA">DESCARTADA</option>
                    </select>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Comentario de cierre</label>
                    <input className="inputLike" value={alertCloseNote} onChange={(e) => setAlertCloseNote(e.target.value)} placeholder="Validado con promotor / visita revisada" />
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => void closeSelectedAlert()}><Check size={16} /><span>Cerrar alerta</span></button>
                      <button className="actionButton" onClick={() => { if (selectedAlert.visita_id) void openVisitExpedient(selectedAlert.visita_id); }}><Eye size={16} /><span>Ver visita</span></button>
                    </div>
                  </>
                ) : (
                  <div className="emptyBox">Selecciona una alerta.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" && supervisorModule === "evidencias" ? (
          <div className="card e010ReviewHub e011GroupedEvidenceHub">
            <div className="sectionTitle e010PageTitle">Bandeja de revisión</div>
            <div className="contextHint e010PageSub">La bandeja ya no despliega todos los carretes hacia abajo. Primero eliges un grupo de análisis y después revisas sus miniaturas compactas en un solo espacio controlado.</div>
            <div className="e010FlowSteps">
              <div><strong>1</strong><span>Filtrar</span></div>
              <div><strong>2</strong><span>Elegir grupo</span></div>
              <div><strong>3</strong><span>Revisar miniaturas</span></div>
              <div><strong>4</strong><span>Abrir foto grande</span></div>
              <div><strong>5</strong><span>Autorizar / comentar</span></div>
            </div>
            <div className="filtersStickyCard">
              <div className="filtersRow filtersRowSupervisorTop">
                <select className="inputLike" value={supEvidencePromotorFilter} onChange={(e) => { setSupEvidencePromotorFilter(e.target.value); setSupEvidenceStoreFilter(""); setSupEvidenceBrandFilter(""); setSupEvidenceTypeFilter(""); setSupEvidencePhaseFilter(""); }}>
                  <option value="">Todos los promotores</option>
                  {supervisorPromotorOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                </select>
                <select className="inputLike" value={supEvidenceStoreFilter} onChange={(e) => { setSupEvidenceStoreFilter(e.target.value); setSupEvidenceBrandFilter(""); setSupEvidenceTypeFilter(""); setSupEvidencePhaseFilter(""); }}>
                  <option value="">Todas las tiendas</option>
                  {supervisorEvidenceFilterOptions.stores.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select className="inputLike" value={supEvidenceBrandFilter} onChange={(e) => { setSupEvidenceBrandFilter(e.target.value); setSupEvidenceTypeFilter(""); setSupEvidencePhaseFilter(""); }}>
                  <option value="">Todas las marcas</option>
                  {supervisorEvidenceFilterOptions.brands.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                <select className="inputLike" value={supEvidenceTypeFilter} onChange={(e) => { setSupEvidenceTypeFilter(e.target.value); setSupEvidencePhaseFilter(""); }}>
                  <option value="">Todos los tipos</option>
                  {supervisorEvidenceFilterOptions.types.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="filtersRow filtersRowSupervisorBottom" style={{ marginTop: 8 }}>
                <select className="inputLike" value={supEvidencePhaseFilter} onChange={(e) => setSupEvidencePhaseFilter(e.target.value)}>
                  <option value="">Todas las fases</option>
                  {supervisorEvidenceFilterOptions.phases.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select className="inputLike" value={supEvidenceRiskFilter} onChange={(e) => setSupEvidenceRiskFilter(e.target.value)}>
                  <option value="">Todos los riesgos</option>
                  {supervisorEvidenceFilterOptions.risks.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select className="inputLike" value={supEvidenceStatusFilter} onChange={(e) => setSupEvidenceStatusFilter(e.target.value)}>
                  <option value="">Todos los estatus</option>
                  {supervisorEvidenceFilterOptions.statuses.map((value) => <option key={value} value={value}>{getSupervisorReviewLabel(value)}</option>)}
                </select>
                <label className="toggleCard">
                  <input type="checkbox" checked={supEvidenceOnlyPending} onChange={(e) => setSupEvidenceOnlyPending(e.target.checked)} />
                  <span>Solo pendientes</span>
                </label>
              </div>
              <div className="selectionToolbar" style={{ marginTop: 10 }}>
                <div className="selectionToolbarLeft">
                  <strong>{selectedSupEvidenceIds.length}</strong>
                  <span>seleccionada(s)</span>
                </div>
                <div className="selectionToolbarActions">
                  <button className="actionButton" onClick={() => selectAllVisibleSupervisorEvidences()}><Check size={16} /><span>Seleccionar visibles</span></button>
                  <button className="actionButton" onClick={() => clearSupervisorEvidenceFilters()}><Trash2 size={16} /><span>Limpiar filtros</span></button>
                  <button className="actionButton" onClick={() => setSelectedSupEvidenceIds([])}><Trash2 size={16} /><span>Limpiar selección</span></button>
                </div>
              </div>
            </div>

            <div className="summaryGrid supervisorSummaryGrid">
              <div className="summaryBlock kpiBlock"><ImageIcon size={16} /><div className="kpiValue">{supervisorEvidenceSummary.total}</div><div className="kpiLabel">Fotos visibles</div></div>
              <div className="summaryBlock kpiBlock"><ClipboardList size={16} /><div className="kpiValue">{supervisorEvidenceSummary.pendientes}</div><div className="kpiLabel">Pendientes</div></div>
              <div className="summaryBlock kpiBlock"><Check size={16} /><div className="kpiValue">{supervisorEvidenceSummary.aprobadas}</div><div className="kpiLabel">Aprobadas</div></div>
              <div className="summaryBlock kpiBlock"><Pencil size={16} /><div className="kpiValue">{supervisorEvidenceSummary.observadas}</div><div className="kpiLabel">Comentadas</div></div>
              <div className="summaryBlock kpiBlock"><Trash2 size={16} /><div className="kpiValue">{supervisorEvidenceSummary.rechazadas}</div><div className="kpiLabel">Rechazadas</div></div>
            </div>

            <div className="e011ModeRow">
              <span className="e011ModeLabel">Agrupar por</span>
              {(["marca", "tienda", "promotor", "estatus"] as EvidenceGroupMode[]).map((mode) => (
                <button key={mode} className={`e011ModeBtn ${supEvidenceGroupMode === mode ? "e011ModeBtnActive" : ""}`} onClick={() => setSupEvidenceGroupMode(mode)}>{getEvidenceGroupModeLabel(mode)}</button>
              ))}
            </div>

            {!filteredSupervisorEvidences.length ? <div className="contextHint">Aún no hay evidencias operativas con esos filtros. En esta vista solo se consideran evidencias operativas; las fotos de asistencia se consultan dentro del expediente de la visita.</div> : null}

            {selectedSupEvidenceIds.length > 0 ? (
              <div className="traceBox" style={{ marginTop: 12 }}>
                <div className="traceTitle">Revisión masiva global</div>
                <label className="fieldLabel" style={{ marginTop: 8 }}>Comentario del lote</label>
                <input className="inputLike" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Comentario general para las evidencias seleccionadas" />
                <div className="actionGrid actionGridButtons">
                  <button className="actionButton" onClick={() => void runBatchEvidenceReview("APROBADA")}><Check size={16} /><span>Aprobar lote</span></button>
                  <button className="actionButton" onClick={() => void runBatchEvidenceReview("OBSERVADA")}><Pencil size={16} /><span>Comentar lote</span></button>
                  <button className="actionButton" onClick={() => void runBatchEvidenceReview("RECHAZADA")}><Trash2 size={16} /><span>Rechazar lote</span></button>
                </div>
              </div>
            ) : null}

            {filteredSupervisorEvidences.length ? (
              <>
                <div className="e011EvidenceBoardHeader">
                  <div>
                    <div className="miniTitle">Grupos de análisis</div>
                    <div className="contextHint">{groupedSupervisorEvidences.length} grupo(s), {filteredSupervisorEvidences.length} foto(s). Página {supervisorEvidenceGroupSafePage} de {supervisorEvidenceGroupPageCount}.</div>
                  </div>
                  <div className="e011Pager">
                    <button className="actionButton compactBtn" disabled={supervisorEvidenceGroupSafePage <= 1} onClick={() => setSupEvidenceGroupPage((prev) => Math.max(1, prev - 1))}>‹ Anterior</button>
                    <button className="actionButton compactBtn" disabled={supervisorEvidenceGroupSafePage >= supervisorEvidenceGroupPageCount} onClick={() => setSupEvidenceGroupPage((prev) => Math.min(supervisorEvidenceGroupPageCount, prev + 1))}>Siguiente ›</button>
                  </div>
                </div>

                <div className="e011GroupBoard">
                  {pagedSupervisorEvidenceGroups.map((group) => (
                    <button key={group.brandKey} type="button" className={`e011GroupTile ${activeSupervisorEvidenceGroup?.brandKey === group.brandKey ? "e011GroupTileActive" : ""}`} onClick={() => { setActiveSupEvidenceGroupKey(group.brandKey); if (group.items[0]) setSelectedSupEvidenceId(group.items[0].evidencia_id); }}>
                      <div className="e011GroupTileTop">
                        <div>
                          <div className="e011GroupKind">{getEvidenceGroupModeLabel(supEvidenceGroupMode)}</div>
                          <div className="e011GroupTitle">{group.brandLabel}</div>
                        </div>
                        <span className="riskBadge riskNeutral">{group.total}</span>
                      </div>
                      <div className="e011MiniCollage">
                        {group.previewItems.map((item) => <img key={item.evidencia_id} src={item.url_foto} alt={item.tipo_evidencia || "Evidencia"} />)}
                        {!group.previewItems.length ? <div className="e011EmptyThumb"><ImageIcon size={18} /></div> : null}
                      </div>
                      <div className="e011GroupStats">
                        <span className="riskBadge riskNeutral">{group.pendientes} pendientes</span>
                        <span className="riskBadge riskGreen">{group.aprobadas} aprobadas</span>
                        <span className="riskBadge riskAmber">{group.observadas} comentadas</span>
                        <span className="riskBadge riskRed">{group.rechazadas} rechazadas</span>
                      </div>
                      <div className="e011GroupMeta">{group.tiendas.slice(0, 2).join(" · ") || group.brandSubtitle}</div>
                    </button>
                  ))}
                </div>

                {activeSupervisorEvidenceGroup ? (
                  <div className="e011ReviewWorkspace">
                    <div className="e011WorkspaceHeader">
                      <div>
                        <div className="miniTitle">Revisión del grupo: {activeSupervisorEvidenceGroup.brandLabel}</div>
                        <div className="contextHint">{activeSupervisorEvidenceGroup.total} foto(s). Se muestran máximo {E011_THUMBS_PER_GROUP} miniaturas para mantener la pantalla controlada.</div>
                      </div>
                      <div className="brandGroupActions e011WorkspaceActions">
                        <button className="actionButton" onClick={() => selectBrandSupervisorEvidences(activeSupervisorEvidenceGroup.brandKey)}><Check size={16} /><span>Seleccionar grupo</span></button>
                        <button className="actionButton" onClick={() => void runBrandEvidenceReview(activeSupervisorEvidenceGroup.brandKey, "APROBADA")}><Check size={16} /><span>Aprobar grupo</span></button>
                        <button className="actionButton" onClick={() => void runBrandEvidenceReview(activeSupervisorEvidenceGroup.brandKey, "OBSERVADA")}><Pencil size={16} /><span>Comentar grupo</span></button>
                        <button className="actionButton" onClick={() => void runBrandEvidenceReview(activeSupervisorEvidenceGroup.brandKey, "RECHAZADA")}><Trash2 size={16} /><span>Rechazar grupo</span></button>
                      </div>
                    </div>
                    <div className="e011ThumbStrip">
                      {activeSupervisorEvidenceGroup.items.slice(0, E011_THUMBS_PER_GROUP).map((item) => {
                        const isSelected = selectedSupEvidenceIds.includes(item.evidencia_id);
                        const reviewState = getSupervisorReviewState(item);
                        return (
                          <button key={item.evidencia_id} type="button" className={`e011ThumbCard ${selectedSupEvidenceId === item.evidencia_id ? "e011ThumbCardActive" : ""}`} onClick={() => setSelectedSupEvidenceId(item.evidencia_id)} onDoubleClick={() => openImageViewer(item.url_foto, item.evidencia_id)}>
                            <div className="e011ThumbImageWrap">
                              <img src={item.url_foto} alt={item.tipo_evidencia || item.tipo_evento} />
                              <span className={`selectionPill ${isSelected ? "selectionPillActive" : ""}`} onClick={(e) => { e.stopPropagation(); toggleSupervisorEvidenceSelection(item.evidencia_id); }}>{isSelected ? "✓" : "○"}</span>
                            </div>
                            <div className="e011ThumbInfo">
                              <strong>{item.tipo_evidencia || item.tipo_evento}</strong>
                              <span>{item.promotor_nombre || item.promotor_id || "Promotor"}</span>
                              <span>{getStoreDisplayFromItem(item) || item.tienda_nombre || "Tienda"}</span>
                              <span>{item.fecha_hora_fmt}</span>
                            </div>
                            <div className="e011ThumbBadges">
                              <span className={`riskBadge ${severityClass(item.riesgo || "BAJO")}`}>{item.riesgo || "Sin riesgo"}</span>
                              {item.fase ? <span className="riskBadge riskNeutral">{item.fase}</span> : null}
                              <span className={`riskBadge ${getSupervisorReviewClass(item)}`}>{getSupervisorReviewLabel(reviewState)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {activeSupervisorEvidenceGroup.items.length > E011_THUMBS_PER_GROUP ? <div className="contextHint">Hay {activeSupervisorEvidenceGroup.items.length - E011_THUMBS_PER_GROUP} foto(s) más en este grupo. Usa filtros o acciones masivas para acotar sin crear scroll vertical interminable.</div> : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {selectedSupervisorEvidence ? (
              <div className="card detailSubcard e011DetailCard">
                <div className="sectionTitle">Detalle de evidencia</div>
                <div className="contextHint">La foto grande se abre con doble clic desde cualquier miniatura. Aquí se conserva la trazabilidad y la revisión individual.</div>
                <div className="twoCol">
                  <div className="panel">
                    <div className="e011DetailPreview" onDoubleClick={() => openImageViewer(selectedSupervisorEvidence.url_foto, selectedSupervisorEvidence.evidencia_id)} onClick={() => handleImageTap(selectedSupervisorEvidence.url_foto)}><img src={selectedSupervisorEvidence.url_foto} alt={selectedSupervisorEvidence.tipo_evidencia} className="img" /></div>
                    <div className="summaryLine"><strong>{selectedSupervisorEvidence.promotor_nombre || selectedSupervisorEvidence.promotor_id || "Promotor"}</strong></div>
                    <div className="summaryLine">{compactMetaLine(selectedSupervisorEvidence)}</div>
                    <div className="summaryLine">{selectedSupervisorEvidence.fecha_hora_fmt}</div>
                    <div className="summaryLine">Descripción: {cleanEvidenceDescription(selectedSupervisorEvidence.descripcion)}</div>
                    {selectedSupervisorEvidence.resultado_ai ? <div className="summaryLine">Resultado AI: <strong>{selectedSupervisorEvidence.resultado_ai}</strong></div> : null}
                    {selectedSupervisorEvidence.hallazgos_ai ? <div className="summaryLine">Causa detectada: {selectedSupervisorEvidence.hallazgos_ai}</div> : null}
                    {selectedSupervisorEvidence.reglas_disparadas ? <div className="summaryLine">Reglas activadas: {selectedSupervisorEvidence.reglas_disparadas}</div> : null}
                    {selectedSupervisorEvidence.score_confianza ? <div className="summaryLine">Confianza estimada: {selectedSupervisorEvidence.score_confianza}</div> : null}
                  </div>
                  <div className="panel">
                    <div className="miniTitle">Revisión individual</div>
                    <div className="summaryLine">Estatus actual: <span className={`riskBadge ${getSupervisorReviewClass(selectedSupervisorEvidence)}`}>{getSupervisorReviewLabel(selectedSupervisorEvidence)}</span></div>
                    {(selectedSupervisorEvidence.decision_supervisor || selectedSupervisorEvidence.revisado_por || selectedSupervisorEvidence.fecha_revision || selectedSupervisorEvidence.motivo_revision) ? (
                      <div className="traceBox">
                        <div className="traceTitle">Última revisión</div>
                        {selectedSupervisorEvidence.decision_supervisor ? <div className="summaryLine">Decisión: <strong>{getSupervisorReviewLabel(selectedSupervisorEvidence.decision_supervisor)}</strong></div> : null}
                        {selectedSupervisorEvidence.revisado_por ? <div className="summaryLine">Revisado por: <strong>{selectedSupervisorEvidence.revisado_por}</strong></div> : null}
                        {selectedSupervisorEvidence.fecha_revision ? <div className="summaryLine">Fecha revisión: <strong>{formatDateTimeMaybe(selectedSupervisorEvidence.fecha_revision)}</strong></div> : null}
                        {selectedSupervisorEvidence.motivo_revision ? <div className="summaryLine">Motivo: {selectedSupervisorEvidence.motivo_revision}</div> : null}
                      </div>
                    ) : null}
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Decisión</label>
                    <select className="inputLike" value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value as SupervisorDecision)}>
                      <option value="APROBADA">APROBADA</option>
                      <option value="OBSERVADA">COMENTADA</option>
                      <option value="RECHAZADA">RECHAZADA</option>
                    </select>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Motivo</label>
                    <input className="inputLike" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Comentario" />
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => void reviewSelectedEvidence()}><Check size={16} /><span>Guardar revisión</span></button>
                      <button className="actionButton" onClick={() => { if (selectedSupervisorEvidence.visita_id) void openVisitExpedient(selectedSupervisorEvidence.visita_id); }}><Eye size={16} /><span>Expediente</span></button>
                    </div>
                    <div className="traceBox" style={{ marginTop: 12 }}>
                      <div className="traceTitle">Historial</div>
                      {supervisorEvidenceAudit.length ? supervisorEvidenceAudit.map((row, idx) => (
                        <div key={`${row.audit_id || row.fecha_hora || idx}`} className="summaryLine"><strong>{row.accion || "ACCION"}</strong> · {formatDateTimeMaybe(row.fecha_hora)} · {row.actor_role || ""}{row.actor_id ? ` (${row.actor_id})` : ""}{row.comentario ? ` · ${row.comentario}` : ""}</div>
                      )) : <div className="summaryLine">Sin historial visible.</div>}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {role === "promotor" && (promotorModule === "evidencias" || promotorModule === "mis_evidencias") && filteredOperationalGallery.length > 0 ? (
          <div className="card">
            <div className="sectionTitle">Galería de evidencias</div>
            <div className="galleryScroll">
              <div className="galleryGrid">
                {filteredOperationalGallery.slice(0, 30).map((item) => (
                  <div className="galleryCard galleryCardCompact" key={item.evidencia_id}>
                    <div className="imageFrame imageFrameCompact"><img src={item.url_foto} alt={item.tipo_evidencia} className="img" onDoubleClick={() => openImageViewer(item.url_foto)} onClick={(e) => { e.stopPropagation(); handleImageTap(item.url_foto); }} /></div>
                    <div className="galleryBodyCompact">
                      <div className="galleryTop compactTop">
                        <div className="galleryTitle">{item.tipo_evidencia || item.tipo_evento}</div>
                        <span className={`riskBadge ${severityClass(item.riesgo)}`}>{item.riesgo}</span>
                      </div>
                      <div className="gallerySub compactMeta">{compactMetaLine({ ...item, marca_nombre: normalizeBrandLabel(item.marca_nombre, "Marca") })}</div>
                      <div className="galleryDate">{item.fecha_hora_fmt}</div>
                      <div className="galleryDesc compactDesc">{cleanEvidenceDescription(item.descripcion)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" && expedient ? (
          <div className="card">
            <div className="sectionTitle">Expediente de visita</div>
            {expedientLoading ? (
              <div className="emptyBox">Cargando expediente...</div>
            ) : (
              <div className="twoCol">
                <div className="panel">
                  <div className="miniTitle">Visita</div>
                  <div className="summaryLine"><strong>{expedient.visita?.promotor_nombre || "Promotor"}</strong></div>
                  <div className="summaryLine">Tienda: {expedient.visita?.tienda_display || expedient.visita?.tienda_nombre || expedient.visita?.tienda_id || "-"}</div>
                  <div className="summaryLine">Entrada: {expedient.visita?.entry_fmt || formatHourFromIso(expedient.visita?.hora_inicio || "")}</div>
                  <div className="summaryLine">Salida: {expedient.visita?.exit_fmt || (expedient.visita?.hora_fin ? formatHourFromIso(expedient.visita.hora_fin) : "Pendiente")}</div>
                  <div className="summaryLine">Tiempo de estancia: {typeof expedient.visita?.stay_minutes === "number" ? `${expedient.visita.stay_minutes} min` : "-"}</div>
                  <div className="geoRow">
                    <span className={`geoBadge ${geofenceClass(expedient.visita?.resultado_geocerca_entrada)}`}>E: {geofenceShortLabel(expedient.visita?.resultado_geocerca_entrada)}</span>
                    <span className={`geoBadge ${geofenceClass(expedient.visita?.resultado_geocerca_salida)}`}>S: {geofenceShortLabel(expedient.visita?.resultado_geocerca_salida)}</span>
                  </div>
                </div>
                <div className="panel">
                  <div className="miniTitle">Resumen de la visita</div>
                  <div className="summaryLine">Evidencias operativas: <strong>{expedient.summary?.total_evidencias || 0}</strong></div>
                  <div className="summaryLine">Alertas: <strong>{expedient.summary?.total_alertas || 0}</strong></div>
                  {expedient.summary_by_brand?.length ? expedient.summary_by_brand.map((brand) => (
                    <div key={`${brand.marca_id || brand.marca_nombre}`} className="traceBox">
                      <div className="traceTitle">Marca · {brand.marca_nombre || brand.marca_id || "Marca"} <span style={{ fontWeight: 400 }}>({brand.total || 0})</span></div>
                      {(brand.types || []).map((tipo) => (
                        <div key={`${brand.marca_id}-${tipo.tipo_evidencia}`} style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid rgba(15,118,110,0.15)" }}>
                          <div className="summaryLine"><strong>Tipo:</strong> {tipo.tipo_evidencia} <span style={{ opacity: 0.75 }}>({tipo.total || 0})</span></div>
                          <div className="summaryLine"><strong>Fases:</strong> {(tipo.phases || []).map((phase) => `${phase.fase || "NA"} ${phase.total || 0}`).join(" · ")}</div>
                        </div>
                      ))}
                    </div>
                  )) : null}
                </div>
                <div className="panel">
                  <div className="miniTitle">Alertas ligadas</div>
                  <div className="stack compactStack">
                    {(expedient.alertas || []).map((item) => (
                      <div className="listBtn" key={item.alerta_id}>
                        <div className="listTitle">{item.tipo_alerta}</div>
                        <div className="listSub">{item.descripcion}</div>
                        <div className="geoRow">
                          <span className={`riskBadge ${severityClass(item.severidad)}`}>{item.severidad}</span>
                          <span className={`riskBadge ${statusClass(item.status)}`}>{item.status}</span>
                        </div>
                      </div>
                    ))}
                    {!(expedient.alertas || []).length ? <div className="emptyBox">Sin alertas ligadas.</div> : null}
                  </div>
                </div>
                <div className="panel fullSpan">
                  <div className="miniTitle">Asistencia de la visita</div>
                  <div className="galleryScroll compactGalleryScroll">
                  <div className="galleryGrid">
                    {expedientAttendance.map((item) => (
                      <div className="galleryCard galleryCardCompact" key={item.evidencia_id}>
                        <div className="imageFrame imageFrameCompact"><img src={item.url_foto} alt={item.tipo_evento} className="img" onDoubleClick={() => openImageViewer(item.url_foto)} onClick={(e) => { e.stopPropagation(); handleImageTap(item.url_foto); }} /></div>
                        <div className="galleryBodyCompact">
                          <div className="galleryTop compactTop">
                            <div className="galleryTitle">{item.tipo_evento === "ASISTENCIA_ENTRADA" ? "Entrada" : "Salida"}</div>
                            <span className={`riskBadge ${severityClass(item.riesgo)}`}>{item.riesgo}</span>
                          </div>
                          <div className="galleryDate">{item.fecha_hora_fmt}</div>
                          <div className="galleryDesc compactDesc">{cleanEvidenceDescription(item.descripcion)}</div>
                        </div>
                      </div>
                    ))}
                    {!expedientAttendance.length ? <div className="emptyBox">Sin fotos de asistencia ligadas.</div> : null}
                  </div>
                  </div>
                </div>
                <div className="panel fullSpan">
                  <div className="miniTitle">Evidencias operativas de la visita</div>
                  <div className="galleryScroll compactGalleryScroll">
                  <div className="galleryGrid">
                    {expedientOperational.map((item) => (
                      <div className="galleryCard galleryCardCompact" key={item.evidencia_id}>
                        <div className="imageFrame imageFrameCompact"><img src={item.url_foto} alt={item.tipo_evidencia} className="img" onDoubleClick={() => openImageViewer(item.url_foto)} onClick={(e) => { e.stopPropagation(); handleImageTap(item.url_foto); }} /></div>
                        <div className="galleryBodyCompact">
                          <div className="galleryTop compactTop">
                            <div className="galleryTitle">{item.tipo_evidencia || item.tipo_evento}</div>
                            <span className={`riskBadge ${severityClass(item.riesgo)}`}>{item.riesgo}</span>
                          </div>
                          <div className="gallerySub compactMeta">{compactMetaLine(item)}</div>
                          <div className="galleryDate">{item.fecha_hora_fmt}</div>
                          <div className="galleryDesc compactDesc">{cleanEvidenceDescription(item.descripcion)}</div>
                        </div>
                      </div>
                    ))}
                    {!expedientOperational.length ? <div className="emptyBox">Sin evidencias operativas ligadas.</div> : null}
                  </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {cameraModal.open ? (
          <div className="overlayBackdrop cameraBackdrop" onClick={() => void closeCameraModal()}>
            <div className="cameraModal cameraModalTight" onClick={(e) => e.stopPropagation()}>
              <div className="miniTitle cameraTitle">Captura de foto</div>
              <div className="cameraViewport cameraViewportTight">
                <video ref={cameraVideoRef} className="cameraVideo cameraVideoTight" playsInline muted autoPlay />
              </div>
              <div className="cameraHint">Ajusta la foto antes de capturar.</div>
              <div className="cameraActionRow cameraActionRowTight">
                <button className="cameraCaptureBtn cameraCaptureBtnTight" onClick={() => void captureFromCameraModal()}><Camera size={18} />Capturar</button>
                <button className="cameraCancelBtn cameraCancelBtnTight" onClick={() => void closeCameraModal()}><Trash2 size={16} />Cancelar</button>
              </div>
            </div>
          </div>
        ) : null}

        {imageViewerSrc ? (
          <div
            className="overlayBackdrop overlayBackdropRich"
            onClick={(e) => { if (e.target === e.currentTarget) closeImageViewer(); }}
            onMouseMove={handleImageViewerMouseMove as any}
            onMouseUp={handleImageViewerMouseUp}
            onMouseLeave={handleImageViewerMouseUp}
            onTouchStart={handleImageViewerTouchStart as any}
            onTouchMove={handleImageViewerTouchMove as any}
            onTouchEnd={handleImageViewerTouchEnd}
          >
            {activeViewerSupervisorEvidence ? (
              <>
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: "fixed", top: 12, left: 12, zIndex: 92, maxWidth: "min(420px, calc(100vw - 96px))", borderRadius: 14, background: "rgba(15,23,42,0.56)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: "#fff", padding: "10px 12px", display: "grid", gap: 6 }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{normalizeBrandLabel(activeViewerSupervisorEvidence.marca_nombre || "", activeViewerSupervisorEvidence.marca_id || "Marca")} · {activeViewerSupervisorEvidence.tipo_evidencia || activeViewerSupervisorEvidence.tipo_evento}</div>
                  <div style={{ fontSize: 12, opacity: 0.84 }}>{activeViewerSupervisorEvidence.promotor_nombre || activeViewerSupervisorEvidence.promotor_id || "Promotor"} · {getStoreDisplayFromItem(activeViewerSupervisorEvidence) || activeViewerSupervisorEvidence.tienda_nombre || "Tienda"}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {activeViewerSupervisorEvidence.fase ? <span className="riskBadge riskNeutral">{activeViewerSupervisorEvidence.fase}</span> : null}
                    <span className={`riskBadge ${severityClass(activeViewerSupervisorEvidence.riesgo || "BAJO")}`}>{activeViewerSupervisorEvidence.riesgo || "Sin riesgo"}</span>
                    <span className={`riskBadge ${getSupervisorReviewClass(activeViewerSupervisorEvidence)}`}>{getSupervisorReviewLabel(activeViewerSupervisorEvidence)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeImageViewer(); }}
                  style={{ position: "fixed", top: 12, right: 12, zIndex: 92, borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(15,23,42,0.62)", color: "#fff", padding: "10px 14px", cursor: "pointer", backdropFilter: "blur(8px)", fontWeight: 700 }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveSupervisorEvidenceViewer(-1); }}
                  disabled={activeViewerSupervisorEvidenceIndex <= 0}
                  style={{ position: "fixed", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 92, borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: activeViewerSupervisorEvidenceIndex <= 0 ? "rgba(15,23,42,0.28)" : "rgba(15,23,42,0.62)", color: "#fff", padding: "12px 14px", cursor: activeViewerSupervisorEvidenceIndex <= 0 ? "not-allowed" : "pointer", backdropFilter: "blur(8px)", fontWeight: 700 }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveSupervisorEvidenceViewer(1); }}
                  disabled={activeViewerSupervisorEvidenceIndex < 0 || activeViewerSupervisorEvidenceIndex >= activeViewerSupervisorEvidenceSequence.length - 1}
                  style={{ position: "fixed", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 92, borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: activeViewerSupervisorEvidenceIndex < 0 || activeViewerSupervisorEvidenceIndex >= activeViewerSupervisorEvidenceSequence.length - 1 ? "rgba(15,23,42,0.28)" : "rgba(15,23,42,0.62)", color: "#fff", padding: "12px 14px", cursor: activeViewerSupervisorEvidenceIndex < 0 || activeViewerSupervisorEvidenceIndex >= activeViewerSupervisorEvidenceSequence.length - 1 ? "not-allowed" : "pointer", backdropFilter: "blur(8px)", fontWeight: 700 }}
                >
                  ›
                </button>
              </>
            ) : null}

            <img
              src={imageViewerSrc}
              alt="Vista ampliada"
              className="overlayImage"
              draggable={false}
              style={{ transform: `translate(${imageViewerOffset.x}px, ${imageViewerOffset.y}px) scale(${imageViewerScale})`, cursor: imageViewerScale > 1 ? (imageViewerDragging ? "grabbing" : "grab") : "zoom-in", transition: imageViewerDragging ? "none" : "transform .12s ease", userSelect: "none" }}
              onClick={(e) => e.stopPropagation()}
              onWheel={handleImageViewerWheel}
              onMouseDown={handleImageViewerMouseDown}
              onMouseMove={handleImageViewerMouseMove}
              onMouseUp={handleImageViewerMouseUp}
              onMouseLeave={handleImageViewerMouseUp}
              onTouchStart={handleImageViewerTouchStart}
              onTouchMove={handleImageViewerTouchMove}
              onTouchEnd={handleImageViewerTouchEnd}
              onDoubleClick={(e) => { e.stopPropagation(); if (imageViewerScale > 1) { setImageViewerOffset({ x: 0, y: 0 }); zoomImageViewer(1); } else { zoomImageViewer(2); } }}
            />

            {activeViewerSupervisorEvidence ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: "fixed", left: "50%", bottom: 14, transform: "translateX(-50%)", zIndex: 92, width: "min(920px, calc(100vw - 24px))", borderRadius: 16, background: "rgba(15,23,42,0.50)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(8px)", padding: 10, display: "grid", gap: 8 }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="actionButton compactBtn" onClick={() => void quickReviewEvidence(activeViewerSupervisorEvidence, "APROBADA")}><Check size={14} /><span>Aprobar</span></button>
                  <button className="actionButton compactBtn" onClick={() => { setReviewDecision("OBSERVADA"); void quickReviewEvidence(activeViewerSupervisorEvidence, "OBSERVADA"); }}><Pencil size={14} /><span>Comentar</span></button>
                  <button className="actionButton compactBtn" onClick={() => { setReviewDecision("RECHAZADA"); void quickReviewEvidence(activeViewerSupervisorEvidence, "RECHAZADA"); }}><Trash2 size={14} /><span>Rechazar</span></button>
                  <input className="inputLike" style={{ minWidth: 220, flex: "1 1 260px", maxWidth: 360, margin: 0 }} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Comentario" />
                </div>
                <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.74)" }}>Doble clic para zoom. Arrastra la imagen cuando esté ampliada.</div>
              </div>
            ) : null}
          </div>
        ) : null}

{statusMsg ? <div className="statusBar">{statusMsg}</div> : null}

        <div className="footerActions">
          <button className="secondaryBtn footerBtn" onClick={() => {
            void (async () => {
              try {
                setSyncing(true);
                if (role === "promotor") {
                  await loadPromotorDashboard();
                  await loadEvidencesToday();
                }
                if (role === "supervisor") {
                  await loadSupervisorDashboard();
                  await loadSupervisorTeam();
                  await loadSupervisorAlerts();
                  await loadSupervisorEvidences();
                }
                if (role === "cliente") {
                  await loadClientBootstrap();
                  await loadClientFilterOptions();
                  await loadClientDashboard();
                  await loadClientStores();
                  await loadClientEvidences();
                  await loadClientIncidents();
                  await loadClientDeliverables();
                  if (selectedClientStoreId) await loadClientStoreDetail(selectedClientStoreId);
                }
                setStatusMsg("Información actualizada.");
              } catch (err) {
                setStatusMsg(err instanceof Error ? err.message : "No se pudo recargar.");
              } finally {
                setSyncing(false);
              }
            })();
          }} disabled={syncing || !!error}>
            <RefreshCw size={16} />
            {syncing ? "Sincronizando..." : "Recargar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eef1f4 0%, #e7ebef 100%)",
    color: "#263238",
    padding: "12px 12px 28px",
    overflowX: "hidden",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
};

const globalCss = `
* { box-sizing: border-box; }
html, body, #root { max-width: 100%; overflow-x: hidden; }
body { margin: 0; background: #eef1f4; }
button, input, select { font: inherit; }
input[type=file] { display: none; }
.shell { width: 100%; max-width: 1180px; margin: 0 auto; overflow-x: hidden; }
.stickyTop { position: sticky; top: 0; z-index: 20; background: linear-gradient(180deg, rgba(238,241,244,0.97) 0%, rgba(238,241,244,0.92) 100%); backdrop-filter: blur(6px); padding-bottom: 8px; }
.hero { display: flex; background: linear-gradient(135deg, #f8f9fb 0%, #edf1f3 100%); border: 1px solid rgba(38,50,56,0.08); border-radius: 16px; padding: 8px 12px; box-shadow: 0 6px 16px rgba(38,50,56,0.06); }
.heroSplit { justify-content: space-between; align-items: center; gap: 12px; }
.heroLogoBlock { display: flex; align-items: center; min-width: 0; }
.brandWord { font-size: 22px; line-height: 1; font-weight: 900; letter-spacing: 0.02em; color: #43a047; }
.heroTitleBlock { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; margin-left: auto; overflow: hidden; }
.heroTitleBlockWide { width: min(240px, 48%); min-width: 190px; }
.heroTitle { font-size: 14px; line-height: 1.05; font-weight: 800; color: #263238; }
.heroTitleTight { text-align: right; max-width: 132px; }
.heroMetaSingle { color: #78909c; font-size: 10px; text-align: right; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.heroMetaSingleWide { width: 100%; max-width: 220px; }
.card { margin-top: 12px; background: rgba(255,255,255,0.92); border: 1px solid rgba(38,50,56,0.08); border-radius: 18px; padding: 14px; box-shadow: 0 10px 22px rgba(38,50,56,0.07); }
.loadingCard { background: rgba(255,255,255,0.95); }
.warning { background: rgba(255,244,229,0.96); border-color: rgba(245,158,11,0.25); }
.warningRow, .loadingRow { display: flex; align-items: center; gap: 10px; color: #263238; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.sectionTitle { font-size: 18px; font-weight: 800; color: #263238; }
.tabsBar { margin-top: 8px; display: flex; gap: 4px; overflow-x: auto; white-space: nowrap; background: rgba(255,255,255,0.92); border: 1px solid rgba(38,50,56,0.08); border-radius: 14px; padding: 4px; scrollbar-width: thin; }
.tabsInline::-webkit-scrollbar { height: 6px; }
.tabsInline::-webkit-scrollbar-thumb { background: rgba(96,125,139,0.24); border-radius: 999px; }
.tabBtn { border: 0; border-radius: 8px; background: transparent; color: #546e7a; padding: 8px 12px; cursor: pointer; font-weight: 700; flex: 0 0 auto; }
.tabBtnActive { background: rgba(76,175,80,.14); color: #2e7d32; }
/* E008_TAB_HORIZONTAL_SCROLL: en celular conserva una sola linea horizontal y permite scroll lateral. */
@media (max-width: 430px) {
  .tabsBar { display: flex; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; white-space: nowrap; -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; gap: 4px; }
  .tabBtn { flex: 0 0 auto; min-width: 118px; width: auto; padding: 8px 12px; font-size: 12px; text-align: center; justify-content: center; scroll-snap-align: start; }
}
.twoCol { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.miniTitle { font-size: 15px; font-weight: 800; margin-bottom: 10px; color: #263238; }
.stack { display: flex; flex-direction: column; gap: 8px; }
.compactStack { max-height: 320px; overflow-y: auto; overflow-x: hidden; scrollbar-width: auto; scrollbar-color: rgba(76,175,80,.58) rgba(76,175,80,.12); border: 1px solid rgba(76,175,80,.16); border-radius: 14px; padding: 8px; background: rgba(255,255,255,0.72); }
.compactStack::-webkit-scrollbar { width: 8px; }
.compactStack::-webkit-scrollbar-thumb { background: rgba(76,175,80,.52); border-radius: 999px; }
.compactStack::-webkit-scrollbar-track { background: rgba(76,175,80,.10); border-radius: 999px; }
.listBtn { width: 100%; text-align: left; border-radius: 16px; border: 1px solid rgba(38,50,56,0.08); background: rgba(255,255,255,0.96); padding: 12px; color: #263238; cursor: pointer; }
.listBtnGreen { border-color: rgba(76,175,80,.45); background: rgba(232,245,233,0.95); }
.listTitle { font-weight: 800; }
.listSub { margin-top: 4px; color: #607d8b; font-size: 12px; }
.geoRow { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
.geoBadge { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 4px 8px; }
.geoGreen { background: rgba(76,175,80,.14); color: #2e7d32; }
.geoAmber { background: rgba(245,158,11,.14); color: #ed6c02; }
.geoRed { background: rgba(239,68,68,.14); color: #d32f2f; }
.geoNeutral { background: rgba(96,125,139,.12); color: #546e7a; }
.panel { border-radius: 16px; border: 1px solid rgba(38,50,56,0.08); background: rgba(248,249,251,0.95); padding: 14px; width: 100%; max-width: 100%; overflow-x: hidden; }
/* E008_TAB_VISIBILITY_FIX: tabsBar no debe ocultar el boton Resumen; scroll horizontal permitido. */
.card, .captureBlock, .hero { width: 100%; max-width: 100%; overflow-x: hidden; }
.fieldLabel { margin-bottom: 6px; display: block; font-size: 13px; color: #546e7a; }
.inputLike { width: 100%; border-radius: 12px; border: 1px solid rgba(38,50,56,0.10); background: rgba(255,255,255,0.96); color: #263238; padding: 11px 12px; }
.contextHint { margin-top: 8px; font-size: 12px; color: #607d8b; }
.primaryBtn, .secondaryBtn, .fileBtn { margin-top: 10px; width: 100%; max-width: 100%; border: 0; border-radius: 14px; padding: 13px 14px; display: flex; justify-content: flex-start; align-items: center; gap: 8px; font-weight: 800; cursor: pointer; text-decoration: none; flex-wrap: wrap; min-width: 0; text-align: left; line-height: 1.15; overflow-wrap: anywhere; word-break: break-word; }
.primaryBtn svg, .secondaryBtn svg, .fileBtn svg { flex: 0 0 auto; }
.primaryBtn { background: #4caf50; color: white; }
.secondaryBtn, .fileBtn { background: #eceff1; color: #37474f; }
.primaryBtn:disabled, .secondaryBtn:disabled, .inputLike:disabled { opacity: 0.7; cursor: not-allowed; }
.compactBtn { margin-top: 0; padding: 11px 12px; min-height: 48px; }
.assistQuickBtn { justify-content: flex-start; text-align: left; padding: 12px 14px; }
.wideFileBtn { margin-top: 12px; }
.emptyBox { padding: 12px; border-radius: 12px; background: rgba(96,125,139,0.08); color: #607d8b; font-size: 13px; }
.captureBlock { margin-top: 12px; border-radius: 14px; background: rgba(255,255,255,0.86); border: 1px solid rgba(38,50,56,0.08); padding: 12px; }
.captureTitle { font-size: 13px; font-weight: 800; color: #37474f; margin-bottom: 8px; }
.captureGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: 100%; min-width: 0; }
.captureGrid.threeCols { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.captureGrid > * { min-width: 0; }
.captureStack { display: flex; flex-direction: column; gap: 8px; width: 100%; min-width: 0; }
.captureStack > * { min-width: 0; }
.captureMeta { margin-top: 8px; font-size: 12px; color: #607d8b; }
.thumbRow, .thumbGrid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.thumb { width: 66px; height: 66px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(38,50,56,0.12); }
.actionGrid, .summaryGrid { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.actionGridButtons { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.summaryBlock { border-radius: 16px; padding: 14px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08); }
.kpiBlock { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.kpiValue { font-size: 28px; font-weight: 900; color: #263238; }
.kpiLabel { font-size: 12px; color: #607d8b; font-weight: 700; }
.summaryLine { color: #455a64; font-size: 13px; margin-top: 8px; }
.summaryGeo { margin-top: 4px; color: #607d8b; font-size: 12px; }
.previewFrame { aspect-ratio: 4 / 3; overflow: hidden; border-radius: 14px; background: #dfe5e8; margin-bottom: 10px; }
.actionButton { border: 0; border-radius: 12px; background: rgba(96,125,139,0.12); color: #37474f; font-weight: 700; padding: 10px 12px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
.galleryScroll { max-width: 100%; overflow-x: auto; overflow-y: hidden; padding: 8px 8px 10px 8px; scrollbar-width: auto; scrollbar-color: rgba(76,175,80,.58) rgba(76,175,80,.12); border: 1px solid rgba(76,175,80,.16); border-radius: 14px; background: rgba(255,255,255,0.72); }
.galleryScroll::-webkit-scrollbar { height: 8px; }
.galleryScroll::-webkit-scrollbar-thumb { background: rgba(76,175,80,.52); border-radius: 999px; }
.galleryScroll::-webkit-scrollbar-track { background: rgba(76,175,80,.10); border-radius: 999px; }
.compactGalleryScroll { max-width: 100%; }
.galleryGrid { margin-top: 6px; display: flex; flex-wrap: nowrap; gap: 12px; width: max-content; min-width: 100%; align-items: stretch; }
.attendanceGalleryGrid { display: flex; flex-wrap: nowrap; }
.attendanceGalleryBlock { margin-top: 8px; }
.galleryCard { flex: 0 0 240px; border-radius: 18px; border: 1px solid rgba(38,50,56,0.08); background: rgba(255,255,255,0.96); padding: 12px; }
.galleryCardCompact { display: grid; grid-template-columns: 72px 1fr; gap: 10px; align-items: start; min-width: 280px; }
.galleryBodyCompact { min-width: 0; }
.imageFrame { aspect-ratio: 4 / 3; overflow: hidden; border-radius: 14px; background: #dfe5e8; }
.imageFrameCompact { width: 72px; height: 72px; aspect-ratio: auto; }
.img { width: 100%; height: 100%; object-fit: cover; display: block; }
.galleryTop { margin-top: 10px; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.compactTop { margin-top: 0; }
.galleryTitle { font-weight: 800; color: #263238; font-size: 13px; }
.gallerySub { margin-top: 4px; color: #607d8b; font-size: 13px; }
.compactMeta { line-height: 1.2; }
.galleryDate { margin-top: 4px; color: #78909c; font-size: 12px; }
.galleryDesc { margin-top: 8px; color: #455a64; font-size: 13px; line-height: 1.45; }
.compactDesc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.riskBadge { border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 800; }
.riskRed { background: rgba(239,68,68,.14); color: #d32f2f; }
.riskAmber { background: rgba(245,158,11,.14); color: #ed6c02; }
.riskGreen { background: rgba(76,175,80,.14); color: #2e7d32; }
.riskNeutral { background: rgba(96,125,139,.14); color: #546e7a; }
.filtersRow { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.filtersStickyCard { margin-top: 10px; padding: 12px; border-radius: 16px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08); }
.filtersRowSupervisorBottom { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.toggleCard { min-height: 48px; border-radius: 12px; border: 1px solid rgba(38,50,56,0.10); background: rgba(255,255,255,0.96); padding: 10px 12px; display: inline-flex; align-items: center; gap: 10px; color: #37474f; font-weight: 700; }
.supervisorSummaryGrid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.brandGroupList { margin-top: 14px; display: flex; flex-direction: column; gap: 14px; }
.brandGroupCard { border-radius: 18px; border: 1px solid rgba(38,50,56,0.08); background: rgba(255,255,255,0.96); padding: 14px; }
.brandGroupHeader { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.brandGroupTitle { font-size: 16px; font-weight: 900; color: #263238; }
.brandGroupCounters { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
.brandGroupActions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.reviewRailCardWide { flex-basis: 220px; }
.reviewRailBodyWide { display: flex; flex-direction: column; gap: 6px; }
.reviewRailBadges { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
.reviewRailDesc { min-height: 32px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.quickActionRow { margin-top: 8px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.overlayBackdropRich { padding: 12px; }
.viewerChrome { position: fixed; left: 12px; right: 12px; z-index: 92; max-width: 1040px; margin: 0 auto; border-radius: 16px; background: rgba(15,23,42,0.86); border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(12px); padding: 12px; color: white; display: flex; gap: 12px; justify-content: space-between; align-items: center; }
.viewerChromeTop { top: 10px; }
.viewerChromeBottom { bottom: 10px; flex-direction: column; align-items: stretch; }
.viewerTitle { font-size: 14px; font-weight: 900; }
.viewerMeta, .viewerFooterMeta { font-size: 12px; color: rgba(255,255,255,0.72); }
.viewerTopBadges { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
.viewerActionRow { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.viewerInput { margin-top: 8px; }
.twoColsFilters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.statusBar { position: fixed; left: 50%; transform: translateX(-50%); bottom: 12px; z-index: 60; width: calc(100% - 24px); max-width: 760px; border-radius: 16px; padding: 12px 14px; background: rgba(232,245,233,0.98); color: #2e7d32; border: 1px solid rgba(76,175,80,0.20); font-weight: 700; box-shadow: 0 12px 28px rgba(38,50,56,0.16); }
.footerActions { margin-top: 12px; margin-bottom: 74px; display: flex; justify-content: flex-end; }
.footerBtn { width: auto; min-width: 160px; }
.fullSpan { grid-column: 1 / -1; }
.traceBox { margin-top: 10px; border-radius: 12px; padding: 10px 12px; background: rgba(96,125,139,0.08); border: 1px solid rgba(38,50,56,0.08); }
.selectionToolbar { margin-top: 12px; display: flex; justify-content: space-between; gap: 10px; align-items: center; flex-wrap: wrap; }
.selectionToolbarLeft { display: inline-flex; gap: 6px; align-items: center; color: #455a64; }
.selectionToolbarActions { display: inline-flex; gap: 8px; flex-wrap: wrap; }
.railScrollFrame { margin-top: 14px; border: 1px solid rgba(76,175,80,.16); border-radius: 14px; background: rgba(255,255,255,0.72); padding: 8px; }
.reviewRail { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: auto; scrollbar-color: rgba(76,175,80,.58) rgba(76,175,80,.12); }
.reviewRail::-webkit-scrollbar { height: 8px; }
.reviewRail::-webkit-scrollbar-thumb { background: rgba(76,175,80,.52); border-radius: 999px; }
.reviewRail::-webkit-scrollbar-track { background: rgba(76,175,80,.10); border-radius: 999px; }
.reviewRailCard { flex: 0 0 152px; border-radius: 16px; border: 2px solid rgba(38,50,56,0.08); background: rgba(255,255,255,0.96); overflow: hidden; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; padding: 0; text-align: left; }
.reviewRailCard:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(38,50,56,0.10); }
.reviewRailCardSelected { border-color: rgba(76,175,80,.65); box-shadow: 0 12px 20px rgba(76,175,80,.12); }
.reviewRailMedia { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: #dfe5e8; }
.reviewRailBody { padding: 8px 10px 10px; }
.reviewRailTitle { font-weight: 800; color: #263238; font-size: 12px; line-height: 1.2; }
.reviewRailMeta { margin-top: 4px; color: #607d8b; font-size: 11px; line-height: 1.2; }
.selectionPill { position: absolute; right: 10px; top: 10px; width: 28px; height: 28px; border-radius: 999px; background: rgba(255,255,255,0.92); color: #546e7a; display: grid; place-items: center; font-weight: 900; border: 1px solid rgba(38,50,56,0.14); }
.selectionPillActive { background: #4caf50; color: white; border-color: rgba(76,175,80,.65); }
.detailSubcard { margin-top: 16px; }
.traceTitle { font-size: 12px; font-weight: 800; color: #455a64; margin-bottom: 4px; }
.removeThumbBtn { position: absolute; right: -4px; top: -4px; width: 22px; height: 22px; border-radius: 999px; border: 0; background: rgba(211,47,47,0.95); color: white; font-weight: 900; cursor: pointer; }
.authTraceBox { margin-top: 8px; padding: 9px 11px; border-radius: 12px; background: rgba(76,175,80,0.08); border: 1px solid rgba(76,175,80,0.18); color: #2f4f37; font-size: 11px; line-height: 1.3; white-space: normal; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; }
.mainActionBtn { width: 100%; max-width: 100%; box-sizing: border-box; padding: 12px 14px; white-space: normal; line-height: 1.15; min-height: 56px; display: flex; flex-direction: column; align-items: stretch; justify-content: center; text-align: left; gap: 4px; overflow: hidden; }
.mainActionTop { display: inline-flex; align-items: center; justify-content: flex-start; gap: 8px; flex-wrap: wrap; width: 100%; max-width: 100%; min-width: 0; text-align: left; }
.mainActionTop > span:last-child { min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; }
.mainActionSub { display: block; width: 100%; max-width: 100%; font-size: 11px; font-weight: 700; opacity: 0.96; overflow-wrap: anywhere; word-break: break-word; padding: 0; text-align: left; }
.entryActionBtn { background: #4caf50; color: white; }
.dangerBtn { background: #d32f2f !important; color: white !important; }
.overlayBackdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.86); z-index: 90; display: grid; place-items: center; padding: 10px; touch-action: none; overflow: hidden; }
.cameraBackdrop { align-content: center; }
.overlayImage { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; transition: transform .12s ease; touch-action: none; }
.cameraModal { width: min(calc(100vw - 20px), 320px); max-width: calc(100vw - 20px); max-height: calc(100vh - 90px); background: #111; border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; box-sizing: border-box; margin: 0 auto; }
.cameraModalTight { width: min(calc(100vw - 20px), 320px); max-width: calc(100vw - 20px); }
.cameraViewport { width: 100%; border-radius: 12px; overflow: hidden; background: #000; aspect-ratio: 1 / 1; max-height: min(38vh, 300px); }
.cameraViewportTight { aspect-ratio: 3 / 4; max-height: min(46vh, 420px); }
.cameraVideo { width: 100%; height: 100%; min-height: 0; max-height: min(38vh, 300px); border-radius: 12px; background: #000; object-fit: cover; display: block; }
.cameraVideoTight { max-height: min(46vh, 420px); }
.cameraHint { color: rgba(255,255,255,0.74); font-size: 11px; text-align: center; }
.cameraActionRow { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cameraActionRowTight { margin-top: 2px; }
.cameraCaptureBtn, .cameraCancelBtn { border: 0; border-radius: 14px; min-height: 50px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; flex-wrap: wrap; }
.cameraCaptureBtnTight, .cameraCancelBtnTight { min-height: 52px; }
.cameraCaptureBtn { background: #4caf50; color: white; }
.cameraCancelBtn { background: #eceff1; color: #37474f; }
@media (max-width: 900px) { .twoCol, .actionGrid, .summaryGrid, .actionGridButtons, .captureGrid, .captureGrid.threeCols, .filtersRow, .twoColsFilters, .quickActionRow, .viewerActionRow, .supervisorSummaryGrid { grid-template-columns: 1fr; } .reviewRailCard { flex-basis: 136px; } .reviewRailCardWide { flex-basis: 180px; } .galleryCard { flex-basis: 220px; } .galleryCardCompact { min-width: 240px; } .viewerChrome { left: 8px; right: 8px; } }
@media (max-width: 760px) { .heroTitleBlockWide { width: min(220px, 58%); min-width: 168px; } .heroMetaSingleWide { max-width: 190px; } .cameraModal, .cameraModalTight { width: calc(100vw - 16px); max-height: calc(100vh - 64px); padding: 10px; } .cameraViewport { max-height: min(42vh, 320px); } .cameraViewportTight { max-height: min(48vh, 440px); } .cameraVideo { min-height: 0; max-height: min(42vh, 320px); } .cameraVideoTight { max-height: min(48vh, 440px); } .cameraActionRow, .cameraActionRowTight { grid-template-columns: 1fr 1fr; } .mainActionBtn { min-height: 54px; padding: 12px 12px; } .compactBtn, .assistQuickBtn { padding: 12px 14px; } }


/* E010_UX_ACTION_FIRST_SUPERVISOR -------------------------------------------------
   Refresh visual para Promobolsillo: más actual, móvil y orientado a acción.
   Mantiene la funcionalidad E009B; cambia jerarquía visual, tabs, tarjetas y bandeja supervisor.
*/
:root {
  --e010-bg: #f7f8fb;
  --e010-ink: #0f172a;
  --e010-muted: #64748b;
  --e010-line: rgba(15, 23, 42, 0.08);
  --e010-green: #16a34a;
  --e010-green-dark: #047857;
  --e010-purple: #6d28d9;
  --e010-orange: #f97316;
  --e010-red: #ef4444;
  --e010-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}
body {
  background:
    radial-gradient(circle at 16% 4%, rgba(34, 197, 94, 0.12), transparent 30%),
    radial-gradient(circle at 92% 0%, rgba(109, 40, 217, 0.10), transparent 28%),
    var(--e010-bg);
}
.shell { max-width: 1240px; }
.stickyTop {
  background: rgba(247, 248, 251, 0.84);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding-top: 6px;
}
.hero {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 28px;
  box-shadow: var(--e010-shadow);
}
.heroTitle, .heroTitleTight {
  letter-spacing: -0.04em;
  color: var(--e010-ink);
  font-weight: 900;
}
.brandWord { color: var(--e010-green); }
.tabsBar {
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 999px;
  padding: 6px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
  overflow-x: auto;
  scrollbar-width: none;
}
.tabsBar::-webkit-scrollbar { display: none; }
.tabBtn {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--e010-muted);
  font-weight: 800;
  padding: 11px 16px;
  white-space: nowrap;
  transition: all 160ms ease;
}
.tabBtnActive {
  background: linear-gradient(135deg, var(--e010-green) 0%, var(--e010-green-dark) 100%);
  color: #fff;
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.24);
}
.card, .panel, .detailSubcard, .filtersStickyCard, .traceBox, .emptyBox {
  border-radius: 28px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--e010-shadow);
}
.panel { box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05); }
.sectionTitle {
  color: var(--e010-ink);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.03em;
}
.contextHint, .helperText, .summaryLine, .listSub, .reviewRailMeta, .kpiLabel {
  color: var(--e010-muted);
}
.e010PageTitle { font-size: 24px; margin-bottom: 6px; }
.e010PageSub { max-width: 820px; margin-bottom: 12px; }
.e010FlowSteps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0 14px;
}
.e010FlowSteps > div {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(109,40,217,0.09), rgba(34,197,94,0.07));
  border: 1px solid rgba(109, 40, 217, 0.10);
  color: var(--e010-ink);
  font-weight: 800;
  font-size: 12px;
}
.e010FlowSteps strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #fff;
  background: var(--e010-purple);
  flex: 0 0 auto;
}
.inputLike, select.inputLike, input.inputLike {
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.92);
  min-height: 42px;
  color: var(--e010-ink);
}
.summaryGrid { gap: 12px; }
.summaryBlock, .kpiBlock {
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid rgba(15, 23, 42, 0.07);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}
.kpiValue {
  color: var(--e010-ink);
  font-size: 26px;
  letter-spacing: -0.04em;
}
.filtersStickyCard {
  position: sticky;
  top: 112px;
  z-index: 9;
  padding: 12px;
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.selectionToolbar {
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.08), rgba(22, 163, 74, 0.06));
  border: 1px solid rgba(109, 40, 217, 0.12);
}
.actionButton, .primaryBtn, .secondaryBtn, .mainActionBtn, .compactBtn {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  font-weight: 850;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.actionButton:active, .primaryBtn:active, .secondaryBtn:active, .mainActionBtn:active { transform: translateY(1px) scale(0.99); }
.mainActionBtn, .primaryBtn {
  background: linear-gradient(135deg, var(--e010-green) 0%, var(--e010-green-dark) 100%);
  color: #fff;
  box-shadow: 0 14px 30px rgba(22, 163, 74, 0.25);
}
.brandGroupCard {
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%);
  border: 1px solid rgba(109, 40, 217, 0.10);
  box-shadow: var(--e010-shadow);
  overflow: hidden;
}
.brandGroupHeader {
  padding: 16px;
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.08), rgba(22, 163, 74, 0.04));
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.brandGroupTitle {
  font-size: 18px;
  font-weight: 900;
  color: var(--e010-ink);
  letter-spacing: -0.03em;
}
.railScrollFrame { padding: 14px 16px 18px; }
.reviewRail { gap: 14px; }
.reviewRailCard, .reviewRailCardWide {
  min-width: 260px;
  max-width: 280px;
  border-radius: 26px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.07);
  overflow: hidden;
}
.reviewRailCardSelected {
  outline: 3px solid rgba(109, 40, 217, 0.28);
  box-shadow: 0 18px 42px rgba(109, 40, 217, 0.16);
}
.reviewRailMedia {
  height: 158px;
  border-radius: 22px;
  margin: 10px 10px 0;
  overflow: hidden;
  background: #0f172a;
}
.reviewRailBody { padding: 12px; }
.reviewRailTitle {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--e010-ink);
}
.riskBadge {
  border-radius: 999px;
  padding: 5px 9px;
  font-weight: 850;
  letter-spacing: -0.01em;
}
.quickActionRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
.quickActionRow .actionButton:nth-child(1) { background: #ecfdf5; color: #166534; border-color: rgba(22, 163, 74, 0.18); }
.quickActionRow .actionButton:nth-child(2) { background: #fff7ed; color: #9a3412; border-color: rgba(249, 115, 22, 0.20); }
.quickActionRow .actionButton:nth-child(3) { background: #fef2f2; color: #991b1b; border-color: rgba(239, 68, 68, 0.20); }
.quickActionRow .actionButton:nth-child(4) { background: #f8fafc; color: #334155; border-color: rgba(15, 23, 42, 0.10); }
.detailSubcard {
  margin-top: 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,243,255,0.86));
  border-color: rgba(109, 40, 217, 0.16);
}
.previewFrame, .imageFrame, .galleryCard {
  border-radius: 24px;
  overflow: hidden;
}
.galleryCard {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}
.footerActions {
  background: rgba(255,255,255,0.86);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}
.footerBtn {
  border-radius: 18px;
  font-weight: 800;
}
@media (max-width: 820px) {
  .shell { max-width: 100%; }
  .hero { border-radius: 24px; }
  .card, .panel, .detailSubcard, .filtersStickyCard { border-radius: 24px; }
  .e010FlowSteps { grid-template-columns: 1fr; }
  .e010FlowSteps > div { justify-content: flex-start; }
  .filtersStickyCard { top: 98px; }
  .reviewRailCard, .reviewRailCardWide { min-width: 78vw; max-width: 78vw; }
  .reviewRailMedia { height: 190px; }
  .brandGroupActions { width: 100%; overflow-x: auto; padding-bottom: 3px; }
  .quickActionRow { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .reviewRailCard, .reviewRailCardWide { min-width: 84vw; max-width: 84vw; }
  .reviewRailMedia { height: 172px; }
  .tabBtn { padding: 10px 14px; }
  .kpiValue { font-size: 23px; }
}

/* E011_EVIDENCIAS_AGRUPADAS_SUPERVISOR_CLIENTE -------------------------------
   La galería deja de ser una lista vertical de carretes. Primero hay tarjetas
   de grupo paginadas y luego un workspace de revisión con miniaturas compactas.
*/
.e011GroupedEvidenceHub { overflow: visible; }
.e011ModeRow { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.e011ModeLabel { color: var(--e010-muted, #64748b); font-weight: 850; font-size: 12px; margin-right: 4px; }
.e011ModeBtn { border: 1px solid rgba(15,23,42,.08); background: rgba(255,255,255,.86); color: #334155; border-radius: 999px; padding: 9px 12px; font-weight: 850; cursor: pointer; }
.e011ModeBtnActive { background: #0f172a; color: white; box-shadow: 0 10px 24px rgba(15,23,42,.16); }
.e011EvidenceBoardHeader { margin-top: 16px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.e011Pager { display: inline-flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.e011Pager .actionButton:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
.e011GroupBoard { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.e011GroupTile { width: 100%; border: 1px solid rgba(15,23,42,.08); background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.96)); border-radius: 24px; padding: 12px; box-shadow: 0 14px 30px rgba(15,23,42,.06); cursor: pointer; text-align: left; transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
.e011GroupTile:hover { transform: translateY(-1px); box-shadow: 0 18px 38px rgba(15,23,42,.10); }
.e011GroupTileActive { border-color: rgba(109,40,217,.42); outline: 3px solid rgba(109,40,217,.14); }
.e011GroupTileTop { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.e011GroupKind { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 900; }
.e011GroupTitle { margin-top: 2px; font-size: 15px; line-height: 1.15; font-weight: 950; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 34px; }
.e011MiniCollage { margin-top: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; height: 54px; overflow: hidden; }
.e011MiniCollage img, .e011EmptyThumb { width: 100%; height: 54px; object-fit: cover; border-radius: 12px; background: #e2e8f0; display: grid; place-items: center; color: #64748b; }
.e011GroupStats { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
.e011GroupStats .riskBadge { padding: 4px 7px; font-size: 10px; }
.e011GroupMeta { margin-top: 8px; font-size: 11px; line-height: 1.25; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 27px; }
.e011ReviewWorkspace { margin-top: 16px; border: 1px solid rgba(109,40,217,.12); background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(245,243,255,.82)); border-radius: 28px; padding: 14px; box-shadow: 0 16px 36px rgba(15,23,42,.07); }
.e011WorkspaceHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.e011WorkspaceActions { justify-content: flex-start; }
.e011ThumbStrip { margin-top: 12px; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.e011ThumbCard { border: 1px solid rgba(15,23,42,.08); background: white; border-radius: 18px; padding: 8px; box-shadow: 0 8px 20px rgba(15,23,42,.05); cursor: pointer; text-align: left; min-width: 0; }
.e011ThumbCardActive { outline: 3px solid rgba(22,163,74,.18); border-color: rgba(22,163,74,.42); }
.e011ThumbImageWrap { position: relative; height: 82px; border-radius: 14px; overflow: hidden; background: #0f172a; }
.e011ThumbImageWrap img, .e011ThumbCard > img { width: 100%; height: 82px; object-fit: cover; border-radius: 14px; display: block; background: #0f172a; }
.e011ThumbCard .selectionPill { right: 6px; top: 6px; width: 26px; height: 26px; font-size: 13px; }
.e011ThumbInfo { margin-top: 7px; display: grid; gap: 2px; min-width: 0; }
.e011ThumbInfo strong, .e011ThumbInfo span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.e011ThumbInfo strong { font-size: 12px; color: #0f172a; font-weight: 900; }
.e011ThumbInfo span { font-size: 10.5px; color: #64748b; }
.e011ThumbBadges { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 5px; }
.e011ThumbBadges .riskBadge { padding: 4px 6px; font-size: 9.5px; }
.e011DetailCard { margin-top: 14px; }
.e011DetailPreview { width: 132px; height: 132px; border-radius: 20px; overflow: hidden; background: #0f172a; margin-bottom: 10px; }
.clientWorkspace .e011ThumbStrip { grid-template-columns: repeat(6, minmax(0, 1fr)); }
@media (max-width: 1080px) {
  .e011GroupBoard { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .e011ThumbStrip, .clientWorkspace .e011ThumbStrip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .e011GroupBoard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .e011ThumbStrip, .clientWorkspace .e011ThumbStrip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .e011ThumbImageWrap, .e011ThumbImageWrap img, .e011ThumbCard > img { height: 74px; }
  .e011WorkspaceHeader { gap: 8px; }
}
@media (max-width: 480px) {
  .e011GroupBoard { grid-template-columns: 1fr 1fr; gap: 8px; }
  .e011GroupTile { border-radius: 20px; padding: 10px; }
  .e011GroupTitle { font-size: 13px; min-height: 31px; }
  .e011MiniCollage { height: 46px; }
  .e011MiniCollage img, .e011EmptyThumb { height: 46px; border-radius: 10px; }
  .e011ThumbStrip, .clientWorkspace .e011ThumbStrip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

`;
