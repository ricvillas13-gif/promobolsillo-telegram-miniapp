import React, { useEffect, useMemo, useState } from "react";
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
type PromotorModule = "asistencia" | "evidencias" | "mis_evidencias" | "resumen";
type SupervisorModule = "equipo" | "alertas" | "evidencias" | "resumen";
type EvidencePhase = "NA" | "ANTES" | "DESPUES";
type CaptureKind = "entrada" | "salida";
type SupervisorDecision = "APROBADA" | "OBSERVADA" | "RECHAZADA";

type BootstrapResponse = {
  ok: boolean;
  role: Role;
  profile?: { nombre?: string };
};

type StoreItem = {
  tienda_id: string;
  nombre_tienda: string;
  cadena?: string;
};

type VisitItem = {
  visita_id: string;
  tienda_id: string;
  tienda_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  estado_visita?: string;
  resultado_geocerca_entrada?: string;
  resultado_geocerca_salida?: string;
};

type EvidenceItem = {
  evidencia_id: string;
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
  tienda_id?: string;
  promotor_id?: string;
  promotor_nombre?: string;
  fase?: string;
  status?: string;
  decision_supervisor?: string;
  motivo_revision?: string;
};

type UiEvidence = EvidenceItem & {
  status?: "ACTIVA" | "ANULADA" | string;
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
  };
  marcas?: Array<{ marca_id: string; marca_nombre: string }>;
};

type EvidenceRulesResponse = {
  ok: boolean;
  reglas?: Array<{
    marca_id: string;
    tipo_evidencia: string;
    fotos_requeridas: number;
    requiere_antes_despues: boolean;
  }>;
};

type SupervisorSummary = {
  promotores: number;
  visitasHoy: number;
  abiertas: number;
  evidenciasHoy: number;
  alertas: number;
};

type SupervisorDashboardResponse = {
  ok: boolean;
  supervisor?: { nombre?: string };
  summary?: Partial<SupervisorSummary>;
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
  ultima_entrada: string;
  ultima_salida: string;
  ultima_visita_id: string;
  status_general: string;
};

type SupervisorTeamResponse = {
  ok: boolean;
  team?: SupervisorTeamRow[];
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
};

type SupervisorAlertsResponse = {
  ok: boolean;
  alerts?: SupervisorAlert[];
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

type VisitExpedientResponse = {
  ok: boolean;
  visita?: VisitItem & {
    promotor_nombre?: string;
  };
  evidencias?: EvidenceItem[];
  alertas?: SupervisorAlert[];
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

const API_BASE = "https://promobolsillo-telegram.onrender.com";
const SHEETS_SAFE_PHOTO_CHARS = 43000;

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
    if (!res.ok) {
      throw new Error((json as { error?: string }).error || `Error ${res.status}`);
    }
    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

function formatHourFromIso(iso: string) {
  if (!iso) return "pendiente";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function nowMxString() {
  return new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStoreNameById(storeId: string, stores: StoreItem[]) {
  return stores.find((store) => store.tienda_id === storeId || store.nombre_tienda === storeId)?.nombre_tienda || "";
}

function getVisitDisplayName(visit: VisitItem, stores: StoreItem[]) {
  return getStoreNameById(visit.tienda_id, stores) || visit.tienda_nombre || "Visita activa";
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

function isValidRuleType(value: string) {
  const v = (value || "").trim();
  if (!v) return false;
  if (/^(true|false)$/i.test(v)) return false;
  return true;
}

function compactMetaLine(item: EvidenceItem) {
  const parts = [
    item.tienda_nombre || "",
    normalizeBrandLabel(item.marca_nombre || "", "Marca"),
    item.fase ? `Fase: ${item.fase}` : "",
  ].filter(Boolean);
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
  if (v === "ALTA") return "riskRed";
  if (v === "MEDIA") return "riskAmber";
  return "riskGreen";
}

function statusClass(value?: string) {
  const v = (value || "").trim().toUpperCase();
  if (v === "ALERTA" || v === "ABIERTA" || v === "RECHAZADA") return "riskRed";
  if (v === "OBSERVADA" || v === "PENDIENTE_REVISION" || v === "ABIERTA_CON_ALERTA") return "riskAmber";
  return "riskGreen";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto"));
    reader.readAsDataURL(file);
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
    { side: 720, quality: 0.72 },
    { side: 640, quality: 0.65 },
    { side: 560, quality: 0.58 },
    { side: 480, quality: 0.5 },
    { side: 420, quality: 0.44 },
    { side: 360, quality: 0.38 },
    { side: 320, quality: 0.32 },
    { side: 280, quality: 0.28 },
  ];
  let last = dataUrl;
  for (const attempt of attempts) {
    last = await compressDataUrl(dataUrl, attempt.side, attempt.quality);
    if (last.length <= maxChars) return last;
  }
  return last;
}

async function readPhotoForSheets(file: File) {
  const raw = await fileToDataUrl(file);
  return compressDataUrlToSheetsSafeSize(raw);
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
  { key: "asistencia", label: "Asistencia" },
  { key: "evidencias", label: "Evidencias" },
  { key: "mis_evidencias", label: "Mis evidencias" },
  { key: "resumen", label: "Resumen" },
];

const supervisorTabs: Array<{ key: SupervisorModule; label: string }> = [
  { key: "equipo", label: "Equipo" },
  { key: "alertas", label: "Alertas" },
  { key: "evidencias", label: "Evidencias" },
  { key: "resumen", label: "Resumen" },
];

export default function App() {
  const tg = getTelegramWebApp();

  const [role, setRole] = useState<Role>("promotor");
  const [actorLabel, setActorLabel] = useState("Operador");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [promotorModule, setPromotorModule] = useState<PromotorModule>("asistencia");

  const [entryLocation, setEntryLocation] = useState<LocationCapture | null>(null);
  const [exitLocation, setExitLocation] = useState<LocationCapture | null>(null);
  const [entryPhoto, setEntryPhoto] = useState<PhotoCapture | null>(null);
  const [exitPhoto, setExitPhoto] = useState<PhotoCapture | null>(null);
  const [capturingLocation, setCapturingLocation] = useState<CaptureKind | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState<CaptureKind | null>(null);

  const [evidenceBrandId, setEvidenceBrandId] = useState("");
  const [evidenceBrandLabel, setEvidenceBrandLabel] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [evidencePhase, setEvidencePhase] = useState<EvidencePhase>("NA");
  const [evidenceQty, setEvidenceQty] = useState(1);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<PhotoCapture[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Array<{ marca_id: string; marca_nombre: string }>>([]);
  const [brandRules, setBrandRules] = useState<Array<{ tipo_evidencia: string; fotos_requeridas: number; requiere_antes_despues: boolean }>>([]);
  const [selectedVisitStoreName, setSelectedVisitStoreName] = useState("");

  const [allEvidenceRows, setAllEvidenceRows] = useState<UiEvidence[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [evidenceFilterStore, setEvidenceFilterStore] = useState("");
  const [evidenceFilterBrand, setEvidenceFilterBrand] = useState("");
  const [evidenceFilterType, setEvidenceFilterType] = useState("");
  const [evidenceFilterPhase, setEvidenceFilterPhase] = useState("");

  const [supervisorModule, setSupervisorModule] = useState<SupervisorModule>("equipo");
  const [supervisorSummary, setSupervisorSummary] = useState<SupervisorSummary>({
    promotores: 0,
    visitasHoy: 0,
    abiertas: 0,
    evidenciasHoy: 0,
    alertas: 0,
  });
  const [supervisorTeam, setSupervisorTeam] = useState<SupervisorTeamRow[]>([]);
  const [selectedTeamPromotorId, setSelectedTeamPromotorId] = useState("");
  const [supervisorAlerts, setSupervisorAlerts] = useState<SupervisorAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [alertStatusFilter, setAlertStatusFilter] = useState("");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState("");
  const [supervisorEvidences, setSupervisorEvidences] = useState<EvidenceItem[]>([]);
  const [selectedSupEvidenceId, setSelectedSupEvidenceId] = useState("");
  const [supEvidencePromotorFilter, setSupEvidencePromotorFilter] = useState("");
  const [supEvidenceStoreFilter, setSupEvidenceStoreFilter] = useState("");
  const [supEvidenceBrandFilter, setSupEvidenceBrandFilter] = useState("");
  const [supEvidenceTypeFilter, setSupEvidenceTypeFilter] = useState("");
  const [supEvidenceRiskFilter, setSupEvidenceRiskFilter] = useState("");
  const [reviewDecision, setReviewDecision] = useState<SupervisorDecision>("APROBADA");
  const [reviewNote, setReviewNote] = useState("");
  const [alertCloseNote, setAlertCloseNote] = useState("");
  const [expedient, setExpedient] = useState<VisitExpedientResponse | null>(null);
  const [expedientLoading, setExpedientLoading] = useState(false);

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
    const t = setTimeout(() => setStatusMsg(""), 3200);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const openVisits = useMemo(() => visits.filter((v) => !v.hora_fin), [visits]);
  const exitVisit = useMemo(
    () => openVisits.find((v) => v.visita_id === selectedVisitId) || openVisits[0] || null,
    [openVisits, selectedVisitId]
  );
  const hasOpenVisit = Boolean(exitVisit);

  const attendanceGallery = useMemo(() => allEvidenceRows.filter((item) => !isOperationalEvidence(item)), [allEvidenceRows]);
  const operationalGallery = useMemo(() => allEvidenceRows.filter((item) => isOperationalEvidence(item)), [allEvidenceRows]);

  const filteredOperationalGallery = useMemo(() => {
    return operationalGallery.filter((item) => {
      const byStore = !evidenceFilterStore || (item.tienda_nombre || "") === evidenceFilterStore;
      const byBrand = !evidenceFilterBrand || normalizeBrandLabel(item.marca_nombre || "", "Marca") === evidenceFilterBrand;
      const byType = !evidenceFilterType || (item.tipo_evidencia || "") === evidenceFilterType;
      const byPhase = !evidenceFilterPhase || (item.fase || "") === evidenceFilterPhase;
      return byStore && byBrand && byType && byPhase;
    });
  }, [operationalGallery, evidenceFilterStore, evidenceFilterBrand, evidenceFilterType, evidenceFilterPhase]);

  const selectedEvidence = useMemo(() => {
    return (
      filteredOperationalGallery.find((item) => item.evidencia_id === selectedEvidenceId) ||
      operationalGallery.find((item) => item.evidencia_id === selectedEvidenceId) ||
      filteredOperationalGallery[0] ||
      operationalGallery[0] ||
      null
    );
  }, [filteredOperationalGallery, operationalGallery, selectedEvidenceId]);

  const evidenceFilterOptions = useMemo(() => {
    return {
      stores: Array.from(new Set(operationalGallery.map((item) => item.tienda_nombre || "").filter(Boolean))).sort(),
      brands: Array.from(new Set(operationalGallery.map((item) => normalizeBrandLabel(item.marca_nombre || "", "Marca")).filter(Boolean))).sort(),
      types: Array.from(new Set(operationalGallery.map((item) => item.tipo_evidencia || "").filter(Boolean))).sort(),
      phases: Array.from(new Set(operationalGallery.map((item) => item.fase || "").filter(Boolean))).sort(),
    };
  }, [operationalGallery]);

  const supervisorPromotorOptions = useMemo(
    () => supervisorTeam.map((item) => ({ id: item.promotor_id, nombre: item.nombre })),
    [supervisorTeam]
  );

  const supervisorEvidenceFilterOptions = useMemo(() => {
    return {
      stores: Array.from(new Set(supervisorEvidences.map((item) => item.tienda_nombre || "").filter(Boolean))).sort(),
      brands: Array.from(new Set(supervisorEvidences.map((item) => normalizeBrandLabel(item.marca_nombre || "", "Marca")).filter(Boolean))).sort(),
      types: Array.from(new Set(supervisorEvidences.map((item) => item.tipo_evidencia || "").filter(Boolean))).sort(),
      risks: Array.from(new Set(supervisorEvidences.map((item) => item.riesgo || "").filter(Boolean))).sort(),
    };
  }, [supervisorEvidences]);

  const selectedTeamMember = useMemo(
    () => supervisorTeam.find((item) => item.promotor_id === selectedTeamPromotorId) || supervisorTeam[0] || null,
    [supervisorTeam, selectedTeamPromotorId]
  );

  const selectedAlert = useMemo(
    () => supervisorAlerts.find((item) => item.alerta_id === selectedAlertId) || supervisorAlerts[0] || null,
    [supervisorAlerts, selectedAlertId]
  );

  const selectedSupervisorEvidence = useMemo(
    () => supervisorEvidences.find((item) => item.evidencia_id === selectedSupEvidenceId) || supervisorEvidences[0] || null,
    [supervisorEvidences, selectedSupEvidenceId]
  );

  async function loadBootstrap() {
    const initData = getInitData();
    if (!initData) {
      setError("Vista local de referencia. Abre la Mini App desde Telegram para usar la operación en línea.");
      setLoading(false);
      return;
    }
    const data = await postJson<BootstrapResponse>("/miniapp/bootstrap", {});
    if (data.role) setRole(data.role);
    if (data.profile?.nombre) setActorLabel(data.profile.nombre);
  }

  async function loadPromotorDashboard() {
    const dashboard = await postJson<DashboardResponse>("/miniapp/promotor/dashboard", {});
    if (dashboard.promotor?.nombre) setActorLabel(dashboard.promotor.nombre);
    setStores(dashboard.stores || []);
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
    const rows = (data.evidencias || []).map((item) => ({ ...item, status: item.status || "ACTIVA" as const }));
    const operationalRows = rows.filter(isOperationalEvidence);
    setAllEvidenceRows(rows);
    if (operationalRows.length && !operationalRows.find((r) => r.evidencia_id === selectedEvidenceId)) {
      setSelectedEvidenceId(operationalRows[0].evidencia_id);
    }
    if (!operationalRows.length) setSelectedEvidenceId("");
  }

  async function loadEvidenceContext(visitaId: string) {
    if (!visitaId) {
      setAvailableBrands([]);
      setBrandRules([]);
      setSelectedVisitStoreName("");
      return;
    }
    try {
      const ctx = await postJson<EvidenceContextResponse>("/miniapp/promotor/evidence-context", { visita_id: visitaId });
      setAvailableBrands(ctx.marcas || []);
      setSelectedVisitStoreName(ctx.visita?.tienda_nombre || "");
    } catch {
      setAvailableBrands([]);
      setSelectedVisitStoreName("");
    }
  }

  async function loadRulesForBrand(brandId: string, brandLabel: string) {
    if (!brandId && !brandLabel) {
      setBrandRules([]);
      return;
    }
    try {
      const rules = await postJson<EvidenceRulesResponse>("/miniapp/promotor/evidence-rules", {
        marca_id: brandId,
        marca_nombre: brandLabel,
      });
      const usableRules = (rules.reglas || []).filter((rule) => isValidRuleType(rule.tipo_evidencia));
      setBrandRules(usableRules);
      if (usableRules.length) {
        const first = usableRules[0];
        if (!evidenceType || !isValidRuleType(evidenceType)) setEvidenceType(first.tipo_evidencia);
        setEvidenceQty(first.fotos_requeridas || 1);
        if (first.requiere_antes_despues && evidencePhase === "NA") setEvidencePhase("ANTES");
      }
    } catch {
      setBrandRules([]);
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
  }

  async function loadSupervisorTeam() {
    const data = await postJson<SupervisorTeamResponse>("/miniapp/supervisor/team", {});
    const rows = data.team || [];
    setSupervisorTeam(rows);
    if (rows.length && !rows.find((row) => row.promotor_id === selectedTeamPromotorId)) {
      setSelectedTeamPromotorId(rows[0].promotor_id);
    }
  }

  async function loadSupervisorAlerts() {
    const data = await postJson<SupervisorAlertsResponse>("/miniapp/supervisor/alerts", {
      status: alertStatusFilter,
      severidad: alertSeverityFilter,
    });
    const rows = data.alerts || [];
    setSupervisorAlerts(rows);
    if (rows.length && !rows.find((row) => row.alerta_id === selectedAlertId)) {
      setSelectedAlertId(rows[0].alerta_id);
    }
    if (!rows.length) setSelectedAlertId("");
  }

  async function loadSupervisorEvidences() {
    const data = await postJson<SupervisorEvidencesResponse>("/miniapp/supervisor/evidences", {
      promotor_id: supEvidencePromotorFilter,
      tienda_id: supEvidenceStoreFilter,
      marca_id: supEvidenceBrandFilter,
      tipo_evidencia: supEvidenceTypeFilter,
      riesgo: supEvidenceRiskFilter,
    });
    const rows = data.evidences || [];
    setSupervisorEvidences(rows);
    if (rows.length && !rows.find((row) => row.evidencia_id === selectedSupEvidenceId)) {
      setSelectedSupEvidenceId(rows[0].evidencia_id);
    }
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

  async function initialize() {
    try {
      setLoading(true);
      setError("");
      await loadBootstrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la operación.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (role === "promotor") {
      void loadPromotorDashboard();
      void loadEvidencesToday();
    }
    if (role === "supervisor") {
      void loadSupervisorDashboard();
      void loadSupervisorTeam();
      void loadSupervisorAlerts();
      void loadSupervisorEvidences();
    }
  }, [role]);

  useEffect(() => {
    if (role === "promotor") void loadEvidenceContext(selectedVisitId);
  }, [selectedVisitId, role]);

  useEffect(() => {
    if (role === "promotor") void loadRulesForBrand(evidenceBrandId, evidenceBrandLabel);
  }, [evidenceBrandId, evidenceBrandLabel, role]);

  useEffect(() => {
    if (role === "supervisor") void loadSupervisorAlerts();
  }, [alertStatusFilter, alertSeverityFilter]);

  useEffect(() => {
    if (role === "supervisor") void loadSupervisorEvidences();
  }, [supEvidencePromotorFilter, supEvidenceStoreFilter, supEvidenceBrandFilter, supEvidenceTypeFilter, supEvidenceRiskFilter]);

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

  async function captureAttendancePhoto(kind: CaptureKind, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      setCapturingPhoto(kind);
      const dataUrl = await readPhotoForSheets(file);
      const payload: PhotoCapture = { name: file.name, dataUrl, capturedAt: nowMxString() };
      if (kind === "entrada") {
        setEntryPhoto(payload);
        setStatusMsg("Foto de entrada lista.");
      } else {
        setExitPhoto(payload);
        setStatusMsg("Foto de salida lista.");
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo procesar la foto.");
    } finally {
      setCapturingPhoto(null);
    }
  }

  async function captureEvidencePhotos(fileList: FileList | null) {
    const files = Array.from(fileList || []).slice(0, 10);
    if (!files.length) return;
    try {
      setCapturingPhoto("entrada");
      const processed = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          dataUrl: await readPhotoForSheets(file),
          capturedAt: nowMxString(),
        }))
      );
      setEvidencePhotos((prev) => [...prev, ...processed].slice(0, 12));
      setStatusMsg(`${processed.length} foto(s) agregadas.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudieron procesar las fotos.");
    } finally {
      setCapturingPhoto(null);
    }
  }

  async function createEntry() {
    try {
      if (!selectedStoreId) return setStatusMsg("Selecciona una tienda.");
      if (!entryLocation) return setStatusMsg("Captura la ubicación de entrada.");
      if (!entryPhoto) return setStatusMsg("Captura la foto de entrada.");
      if (!getInitData()) return setStatusMsg("Esta acción real solo funciona desde Telegram.");
      const selectedStore = stores.find((store) => store.tienda_id === selectedStoreId);
      const confirmMessage = `¿Deseas registrar entrada en ${selectedStore?.nombre_tienda || "la tienda seleccionada"}?`;
      if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;
      setSyncing(true);
      const response = await postJson<StartEntryResponse>("/miniapp/promotor/start-entry", {
        tienda_id: selectedStoreId,
        lat: entryLocation.lat,
        lon: entryLocation.lon,
        accuracy: entryLocation.accuracy,
        foto_nombre: entryPhoto.name,
        foto_data_url: entryPhoto.dataUrl,
      });
      if (response.warning === "attendance_photo_too_large_for_sheets") {
        setStatusMsg("Entrada registrada. La visita quedó guardada, pero la foto no cupo completa en Sheets.");
      } else {
        setStatusMsg(`Entrada registrada en ${response.tienda_nombre}`);
      }
      setEntryLocation(null);
      setEntryPhoto(null);
      setExitLocation(null);
      setExitPhoto(null);
      await loadPromotorDashboard();
      await loadEvidencesToday();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo registrar la entrada real.");
    } finally {
      setSyncing(false);
    }
  }

  async function closeVisit() {
    try {
      if (!exitVisit) return setStatusMsg("No hay visita abierta para registrar salida.");
      if (!exitLocation) return setStatusMsg("Captura la ubicación de salida.");
      if (!exitPhoto) return setStatusMsg("Captura la foto de salida.");
      if (!getInitData()) return setStatusMsg("Esta acción real solo funciona desde Telegram.");
      const confirmMessage = `¿Deseas registrar salida en ${getVisitDisplayName(exitVisit, stores)}?`;
      if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;
      setSyncing(true);
      const response = await postJson<CloseVisitResponse>("/miniapp/promotor/close-visit", {
        visita_id: exitVisit.visita_id,
        lat: exitLocation.lat,
        lon: exitLocation.lon,
        accuracy: exitLocation.accuracy,
        foto_nombre: exitPhoto.name,
        foto_data_url: exitPhoto.dataUrl,
      });
      if (response.warning === "attendance_photo_too_large_for_sheets") {
        setStatusMsg("Salida registrada. La visita quedó guardada, pero la foto no cupo completa en Sheets.");
      } else {
        setStatusMsg("Salida registrada correctamente.");
      }
      setExitLocation(null);
      setExitPhoto(null);
      await loadPromotorDashboard();
      await loadEvidencesToday();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo registrar la salida real.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveEvidenceFlow() {
    try {
      if (!selectedVisitId) return setStatusMsg("Selecciona una visita activa.");
      if (!evidenceBrandLabel.trim()) return setStatusMsg("Selecciona una marca.");
      if (!evidenceType.trim()) return setStatusMsg("Selecciona o escribe el tipo de evidencia.");
      if (!evidencePhotos.length) return setStatusMsg("Agrega al menos una foto de evidencia.");
      if (evidencePhotos.length < evidenceQty) return setStatusMsg(`Debes cargar al menos ${evidenceQty} foto(s).`);
      setSyncing(true);
      const result = await postJson<EvidenceRegisterResponse>("/miniapp/promotor/evidence-register", {
        visita_id: selectedVisitId,
        marca_id: evidenceBrandId,
        marca_nombre: evidenceBrandLabel,
        tipo_evidencia: evidenceType,
        fase: evidencePhase,
        descripcion: evidenceDescription.trim(),
        fotos: evidencePhotos.map((photo) => ({
          name: photo.name,
          dataUrl: photo.dataUrl,
          capturedAt: photo.capturedAt,
        })),
      });
      setEvidenceBrandId("");
      setEvidenceBrandLabel("");
      setEvidenceType("");
      setEvidencePhase("NA");
      setEvidenceQty(1);
      setEvidenceDescription("");
      setEvidencePhotos([]);
      setBrandRules([]);
      await loadEvidencesToday();
      if (result.warning === "evidence_photo_too_large_for_sheets") {
        setStatusMsg("Evidencia registrada, pero al menos una foto no cupo completa en Sheets.");
      } else {
        setStatusMsg("Evidencia registrada correctamente.");
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo registrar la evidencia.");
    } finally {
      setSyncing(false);
    }
  }

  async function markEvidenceAsCancelled() {
    try {
      if (!selectedEvidence) return setStatusMsg("Selecciona una evidencia.");
      setSyncing(true);
      await postJson("/miniapp/promotor/cancel-evidence", {
        evidencia_id: selectedEvidence.evidencia_id,
        note: noteDraft || "",
      });
      setNoteDraft("");
      await loadEvidencesToday();
      setStatusMsg("Evidencia anulada.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo anular la evidencia.");
    } finally {
      setSyncing(false);
    }
  }

  async function replaceEvidencePhoto(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !selectedEvidence) return;
    try {
      setSyncing(true);
      const dataUrl = await readPhotoForSheets(file);
      const result = await postJson<ReplaceEvidenceResponse>("/miniapp/promotor/replace-evidence", {
        evidencia_id: selectedEvidence.evidencia_id,
        foto_nombre: file.name,
        foto_data_url: dataUrl,
      });
      await loadEvidencesToday();
      if (result.warning === "evidence_photo_too_large_for_sheets") {
        setStatusMsg("La evidencia se reemplazó, pero la foto no cupo completa en Sheets.");
      } else {
        setStatusMsg("Evidencia reemplazada.");
      }
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo reemplazar la evidencia.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveNote() {
    try {
      if (!selectedEvidence || !noteDraft.trim()) return setStatusMsg("Escribe una nota y selecciona una evidencia.");
      setSyncing(true);
      await postJson("/miniapp/promotor/evidence-note", {
        evidencia_id: selectedEvidence.evidencia_id,
        note: noteDraft.trim(),
      });
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
      });
      setAlertCloseNote("");
      await loadSupervisorDashboard();
      await loadSupervisorAlerts();
      setStatusMsg("Alerta atendida.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo cerrar la alerta.");
    } finally {
      setSyncing(false);
    }
  }

  async function reviewSelectedEvidence() {
    try {
      if (!selectedSupervisorEvidence) return setStatusMsg("Selecciona una evidencia.");
      setSyncing(true);
      await postJson<SupervisorEvidenceReviewResponse>("/miniapp/supervisor/evidence-review", {
        evidencia_id: selectedSupervisorEvidence.evidencia_id,
        decision_supervisor: reviewDecision,
        motivo_revision: reviewNote.trim(),
        requiere_revision_supervisor: reviewDecision !== "APROBADA",
      });
      setReviewNote("");
      await loadSupervisorDashboard();
      await loadSupervisorEvidences();
      setStatusMsg(`Evidencia ${reviewDecision.toLowerCase()}.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo revisar la evidencia.");
    } finally {
      setSyncing(false);
    }
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
              <div className="heroTitle heroTitleTight">{role === "supervisor" ? <>Operación<br />supervisor</> : <>Operación<br />del promotor</>}</div>
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
          ) : (
            <div className="tabsBar tabsInline">
              {promotorTabs.map((tab) => (
                <button key={tab.key} className={`tabBtn ${promotorModule === tab.key ? "tabBtnActive" : ""}`} onClick={() => setPromotorModule(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="card warning">
            <div className="warningRow">
              <AlertTriangle size={18} />
              <span>{error}</span>
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
                    <option key={store.tienda_id} value={store.tienda_id}>{store.nombre_tienda}</option>
                  ))}
                </select>

                <div className="captureBlock">
                  <div className="captureTitle">Entrada</div>
                  <div className="captureGrid threeCols">
                    <button className="secondaryBtn compactBtn" onClick={() => void captureLocation("entrada")} disabled={capturingLocation === "entrada"}>
                      <MapPin size={16} />
                      {capturingLocation === "entrada" ? "Ubicando..." : entryLocation ? "Ubicación lista" : "Capturar ubicación"}
                    </button>
                    <label className="fileBtn compactBtn">
                      <Camera size={16} />
                      {capturingPhoto === "entrada" ? "Procesando..." : entryPhoto ? "Selfie lista" : "Tomar selfie"}
                      <input type="file" accept="image/*" capture="user" onChange={(e) => void captureAttendancePhoto("entrada", e.target.files)} />
                    </label>
                    <label className="fileBtn compactBtn">
                      <ImageIcon size={16} />
                      {entryPhoto ? "Reemplazar con galería" : "Elegir de galería"}
                      <input type="file" accept="image/*" onChange={(e) => void captureAttendancePhoto("entrada", e.target.files)} />
                    </label>
                  </div>
                  {entryLocation ? <div className="captureMeta">Lat {entryLocation.lat.toFixed(5)} · Lon {entryLocation.lon.toFixed(5)}</div> : null}
                  {entryPhoto ? <div className="thumbRow"><img src={entryPhoto.dataUrl} className="thumb" alt="Entrada" /></div> : null}
                </div>

                <button className="primaryBtn" onClick={() => void createEntry()} disabled={syncing}>
                  <MapPin size={16} />
                  {syncing ? "Procesando..." : "Registrar entrada"}
                </button>

                {hasOpenVisit && exitVisit ? (
                  <>
                    <div className="captureBlock">
                      <div className="captureTitle">Salida · {getVisitDisplayName(exitVisit, stores)}</div>
                      <div className="captureGrid threeCols">
                        <button className="secondaryBtn compactBtn" onClick={() => void captureLocation("salida")} disabled={capturingLocation === "salida"}>
                          <MapPin size={16} />
                          {capturingLocation === "salida" ? "Ubicando..." : exitLocation ? "Ubicación lista" : "Capturar ubicación"}
                        </button>
                        <label className="fileBtn compactBtn">
                          <Camera size={16} />
                          {capturingPhoto === "salida" ? "Procesando..." : exitPhoto ? "Selfie lista" : "Tomar selfie"}
                          <input type="file" accept="image/*" capture="user" onChange={(e) => void captureAttendancePhoto("salida", e.target.files)} />
                        </label>
                        <label className="fileBtn compactBtn">
                          <ImageIcon size={16} />
                          {exitPhoto ? "Reemplazar con galería" : "Elegir de galería"}
                          <input type="file" accept="image/*" onChange={(e) => void captureAttendancePhoto("salida", e.target.files)} />
                        </label>
                      </div>
                      {exitLocation ? <div className="captureMeta">Lat {exitLocation.lat.toFixed(5)} · Lon {exitLocation.lon.toFixed(5)}</div> : null}
                      {exitPhoto ? <div className="thumbRow"><img src={exitPhoto.dataUrl} className="thumb" alt="Salida" /></div> : null}
                    </div>

                    <button className="secondaryBtn" onClick={() => void closeVisit()} disabled={syncing || !hasOpenVisit}>
                      <CheckCircle2 size={16} />
                      {syncing ? "Procesando..." : "Registrar salida"}
                    </button>
                  </>
                ) : null}
              </div>

              <div className="panel">
                <div className="miniTitle">Visitas de hoy</div>
                <div className="stack compactStack">
                  {visits.map((visit) => {
                    const isOpen = !visit.hora_fin;
                    return (
                      <button
                        key={visit.visita_id}
                        onClick={() => {
                          if (isOpen) setSelectedVisitId(visit.visita_id);
                        }}
                        className={`listBtn ${isOpen && selectedVisitId === visit.visita_id ? "listBtnGreen" : ""}`}
                      >
                        <div className="listTitle">{getVisitDisplayName(visit, stores)}</div>
                        <div className="listSub">Entrada: {formatHourFromIso(visit.hora_inicio)} · {isOpen ? "Salida pendiente" : `Salida: ${formatHourFromIso(visit.hora_fin)}`}</div>
                        <div className="geoRow">
                          <span className={`geoBadge ${geofenceClass(visit.resultado_geocerca_entrada)}`}>E: {geofenceShortLabel(visit.resultado_geocerca_entrada)}</span>
                          {!isOpen ? <span className={`geoBadge ${geofenceClass(visit.resultado_geocerca_salida)}`}>S: {geofenceShortLabel(visit.resultado_geocerca_salida)}</span> : null}
                        </div>
                      </button>
                    );
                  })}
                  {!visits.length ? <div className="emptyBox">No hay visitas registradas hoy.</div> : null}
                </div>

                {attendanceGallery.length ? (
                  <div className="attendanceGalleryBlock">
                    <div className="miniTitle" style={{ marginTop: 12 }}>Fotos de asistencia</div>
                    <div className="galleryScroll compactGalleryScroll">
                      <div className="galleryGrid attendanceGalleryGrid">
                        {attendanceGallery.map((item) => (
                          <div className="galleryCard" key={item.evidencia_id}>
                            <div className="imageFrame">
                              <img src={item.url_foto} alt={item.tipo_evento} className="img" />
                            </div>
                            <div className="galleryTop">
                              <div className="galleryTitle">{item.tipo_evento === "ASISTENCIA_ENTRADA" ? "Entrada" : "Salida"}</div>
                              <span className={`riskBadge ${severityClass(item.riesgo)}`}>{item.riesgo || "BAJO"}</span>
                            </div>
                            {item.tienda_nombre ? <div className="gallerySub compactMeta">{item.tienda_nombre}</div> : null}
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
                <select
                  className="inputLike"
                  value={evidenceBrandId}
                  onChange={(e) => {
                    const brand = availableBrands.find((item) => item.marca_id === e.target.value);
                    setEvidenceBrandId(e.target.value);
                    setEvidenceBrandLabel(normalizeBrandLabel(brand?.marca_nombre || "", brand?.marca_id || ""));
                    setEvidenceType("");
                  }}
                >
                  <option value="">Selecciona una marca</option>
                  {availableBrands.map((brand) => (
                    <option key={brand.marca_id} value={brand.marca_id}>{normalizeBrandLabel(brand.marca_nombre, brand.marca_id)}</option>
                  ))}
                </select>

                <label className="fieldLabel" style={{ marginTop: 10 }}>Tipo</label>
                {brandRules.length ? (
                  <select className="inputLike" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
                    <option value="">Selecciona un tipo</option>
                    {brandRules.filter((rule) => isValidRuleType(rule.tipo_evidencia)).map((rule) => (
                      <option key={rule.tipo_evidencia} value={rule.tipo_evidencia}>{rule.tipo_evidencia}</option>
                    ))}
                  </select>
                ) : (
                  <input className="inputLike" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} placeholder="Tipo de evidencia" />
                )}

                <label className="fieldLabel" style={{ marginTop: 10 }}>Fase</label>
                <select className="inputLike" value={evidencePhase} onChange={(e) => setEvidencePhase(e.target.value as EvidencePhase)}>
                  <option value="NA">No aplica</option>
                  <option value="ANTES">Antes</option>
                  <option value="DESPUES">Después</option>
                </select>

                <label className="fieldLabel" style={{ marginTop: 10 }}>Cantidad requerida</label>
                <input className="inputLike" type="number" min={1} max={10} value={evidenceQty} readOnly disabled />
              </div>

              <div className="panel">
                <label className="fieldLabel">Observación</label>
                <input className="inputLike" value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="Ej. Cabecera completa, competencia lateral..." />
                <label className="fileBtn wideFileBtn" style={{ marginTop: 12 }}>
                  <Camera size={16} />
                  {capturingPhoto ? "Procesando..." : evidencePhotos.length ? `${evidencePhotos.length} foto(s) listas` : "Agregar fotos de evidencia"}
                  <input type="file" accept="image/*" multiple onChange={(e) => void captureEvidencePhotos(e.target.files)} />
                </label>
                {evidencePhotos.length ? (
                  <div className="thumbGrid">
                    {evidencePhotos.map((photo) => (
                      <img key={`${photo.name}-${photo.capturedAt}`} src={photo.dataUrl} className="thumb" alt={photo.name} />
                    ))}
                  </div>
                ) : null}
                <button className="primaryBtn" onClick={() => void saveEvidenceFlow()} disabled={syncing}>
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
              <select className="inputLike" value={evidenceFilterStore} onChange={(e) => setEvidenceFilterStore(e.target.value)}>
                <option value="">Todas las tiendas</option>
                {evidenceFilterOptions.stores.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select className="inputLike" value={evidenceFilterBrand} onChange={(e) => setEvidenceFilterBrand(e.target.value)}>
                <option value="">Todas las marcas</option>
                {evidenceFilterOptions.brands.map((value) => <option key={value} value={value}>{normalizeBrandLabel(value, "Marca")}</option>)}
              </select>
              <select className="inputLike" value={evidenceFilterType} onChange={(e) => setEvidenceFilterType(e.target.value)}>
                <option value="">Todos los tipos</option>
                {evidenceFilterOptions.types.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select className="inputLike" value={evidenceFilterPhase} onChange={(e) => setEvidenceFilterPhase(e.target.value)}>
                <option value="">Todas las fases</option>
                {evidenceFilterOptions.phases.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Listado</div>
                <div className="stack compactStack">
                  {filteredOperationalGallery.map((item) => (
                    <button key={item.evidencia_id} onClick={() => setSelectedEvidenceId(item.evidencia_id)} className={`listBtn ${selectedEvidenceId === item.evidencia_id ? "listBtnGreen" : ""}`}>
                      <div className="listTitle">{item.tienda_nombre || "Visita activa"}</div>
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
                    <div className="previewFrame">
                      <img src={selectedEvidence.url_foto} alt={selectedEvidence.tipo_evidencia} className="img" />
                    </div>
                    {selectedEvidence.tienda_nombre ? <div className="summaryLine">{selectedEvidence.tienda_nombre}</div> : null}
                    <div className="summaryLine">{selectedEvidence.tipo_evidencia} · <strong>{normalizeBrandLabel(selectedEvidence.marca_nombre, "Marca")}</strong></div>
                    <div className="summaryLine">{selectedEvidence.fecha_hora_fmt}</div>
                    <div className="summaryLine">Riesgo: <strong>{selectedEvidence.riesgo}</strong></div>
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => setStatusMsg("Vista previa lista.")}>
                        <Eye size={16} />
                        <span>Ver</span>
                      </button>
                      <button className="actionButton" onClick={() => void markEvidenceAsCancelled()}>
                        <Trash2 size={16} />
                        <span>Anular</span>
                      </button>
                      <label className="actionButton">
                        <Camera size={16} />
                        <span>Reemplazar</span>
                        <input type="file" accept="image/*" onChange={(e) => void replaceEvidencePhoto(e.target.files)} />
                      </label>
                      <button className="actionButton" onClick={() => void saveNote()}>
                        <Pencil size={16} />
                        <span>Guardar nota</span>
                      </button>
                    </div>
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
                <div className="miniTitle">Registros de visitas</div>
                {visits.length ? (
                  visits.map((visit) => (
                    <React.Fragment key={visit.visita_id}>
                      <div className="summaryLine">{getVisitDisplayName(visit, stores)} · Entrada <strong>{formatHourFromIso(visit.hora_inicio)}</strong>{visit.hora_fin ? ` · Salida ${formatHourFromIso(visit.hora_fin)}` : " · Sin salida"}</div>
                      <div className="summaryLine summaryGeo">E: {geofenceShortLabel(visit.resultado_geocerca_entrada)}{visit.hora_fin ? ` · S: ${geofenceShortLabel(visit.resultado_geocerca_salida)}` : ""}</div>
                    </React.Fragment>
                  ))
                ) : (
                  <div className="summaryLine">No hay registros del día.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" && supervisorModule === "resumen" ? (
          <div className="card">
            <div className="sectionTitle">Resumen supervisor</div>
            <div className="summaryGrid">
              <div className="summaryBlock kpiBlock">
                <Users size={16} />
                <div className="kpiValue">{supervisorSummary.promotores}</div>
                <div className="kpiLabel">Promotores</div>
              </div>
              <div className="summaryBlock kpiBlock">
                <ClipboardList size={16} />
                <div className="kpiValue">{supervisorSummary.visitasHoy}</div>
                <div className="kpiLabel">Visitas hoy</div>
              </div>
              <div className="summaryBlock kpiBlock">
                <Store size={16} />
                <div className="kpiValue">{supervisorSummary.abiertas}</div>
                <div className="kpiLabel">Abiertas</div>
              </div>
              <div className="summaryBlock kpiBlock">
                <ImageIcon size={16} />
                <div className="kpiValue">{supervisorSummary.evidenciasHoy}</div>
                <div className="kpiLabel">Evidencias</div>
              </div>
              <div className="summaryBlock kpiBlock">
                <ShieldAlert size={16} />
                <div className="kpiValue">{supervisorSummary.alertas}</div>
                <div className="kpiLabel">Alertas</div>
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
                    <button key={item.promotor_id} onClick={() => setSelectedTeamPromotorId(item.promotor_id)} className={`listBtn ${selectedTeamPromotorId === item.promotor_id ? "listBtnGreen" : ""}`}>
                      <div className="listTitle">{item.nombre}</div>
                      <div className="listSub">Visitas: {item.visitas_hoy} · Abiertas: {item.visitas_abiertas} · Alertas: {item.alertas_abiertas}</div>
                      <div className="geoRow">
                        <span className={`riskBadge ${statusClass(item.status_general)}`}>{item.status_general}</span>
                      </div>
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
                    <div className="summaryLine">Última tienda: {selectedTeamMember.ultima_tienda || "-"}</div>
                    <div className="summaryLine">Última entrada: {formatHourFromIso(selectedTeamMember.ultima_entrada)}</div>
                    <div className="summaryLine">Última salida: {selectedTeamMember.ultima_salida ? formatHourFromIso(selectedTeamMember.ultima_salida) : "Pendiente"}</div>
                    <div className="summaryLine">Estatus: <span className={`riskBadge ${statusClass(selectedTeamMember.status_general)}`}>{selectedTeamMember.status_general}</span></div>
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => setSupEvidencePromotorFilter(selectedTeamMember.promotor_id)}>
                        <ImageIcon size={16} />
                        <span>Ver evidencias</span>
                      </button>
                      <button className="actionButton" onClick={() => {
                        if (selectedTeamMember.ultima_visita_id) void openVisitExpedient(selectedTeamMember.ultima_visita_id);
                      }}>
                        <Eye size={16} />
                        <span>Expediente</span>
                      </button>
                    </div>
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
            <div className="filtersRow twoColsFilters">
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
                      <div className="listSub">{item.tienda_nombre || item.tienda_id || "Tienda"} · {item.tipo_alerta}</div>
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
                    <div className="summaryLine">Tienda: {selectedAlert.tienda_nombre || selectedAlert.tienda_id || "-"}</div>
                    <div className="summaryLine">Tipo: {selectedAlert.tipo_alerta}</div>
                    <div className="summaryLine">Fecha: {selectedAlert.fecha_hora_fmt}</div>
                    <div className="summaryLine">Canal: {selectedAlert.canal_notificacion || "-"}</div>
                    <div className="summaryLine">Descripción: {selectedAlert.descripcion || "-"}</div>
                    <div className="geoRow">
                      <span className={`riskBadge ${severityClass(selectedAlert.severidad)}`}>{selectedAlert.severidad}</span>
                      <span className={`riskBadge ${statusClass(selectedAlert.status)}`}>{selectedAlert.status}</span>
                    </div>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Comentario de cierre</label>
                    <input className="inputLike" value={alertCloseNote} onChange={(e) => setAlertCloseNote(e.target.value)} placeholder="Validado con promotor / visita revisada" />
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => void closeSelectedAlert()}>
                        <Check size={16} />
                        <span>Atender alerta</span>
                      </button>
                      <button className="actionButton" onClick={() => {
                        if (selectedAlert.visita_id) void openVisitExpedient(selectedAlert.visita_id);
                      }}>
                        <Eye size={16} />
                        <span>Ver visita</span>
                      </button>
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
          <div className="card">
            <div className="sectionTitle">Evidencias</div>
            <div className="filtersRow">
              <select className="inputLike" value={supEvidencePromotorFilter} onChange={(e) => setSupEvidencePromotorFilter(e.target.value)}>
                <option value="">Todos los promotores</option>
                {supervisorPromotorOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
              </select>
              <select className="inputLike" value={supEvidenceStoreFilter} onChange={(e) => setSupEvidenceStoreFilter(e.target.value)}>
                <option value="">Todas las tiendas</option>
                {supervisorEvidenceFilterOptions.stores.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select className="inputLike" value={supEvidenceBrandFilter} onChange={(e) => setSupEvidenceBrandFilter(e.target.value)}>
                <option value="">Todas las marcas</option>
                {supervisorEvidenceFilterOptions.brands.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select className="inputLike" value={supEvidenceTypeFilter} onChange={(e) => setSupEvidenceTypeFilter(e.target.value)}>
                <option value="">Todos los tipos</option>
                {supervisorEvidenceFilterOptions.types.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="filtersRow twoColsFilters" style={{ marginTop: 8 }}>
              <select className="inputLike" value={supEvidenceRiskFilter} onChange={(e) => setSupEvidenceRiskFilter(e.target.value)}>
                <option value="">Todos los riesgos</option>
                {supervisorEvidenceFilterOptions.risks.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Listado</div>
                <div className="stack compactStack">
                  {supervisorEvidences.map((item) => (
                    <button key={item.evidencia_id} onClick={() => setSelectedSupEvidenceId(item.evidencia_id)} className={`listBtn ${selectedSupEvidenceId === item.evidencia_id ? "listBtnGreen" : ""}`}>
                      <div className="listTitle">{item.promotor_nombre || item.promotor_id || "Promotor"}</div>
                      <div className="listSub">{item.tienda_nombre || "Tienda"} · {item.tipo_evidencia}</div>
                      <div className="geoRow">
                        <span className={`riskBadge ${severityClass(item.riesgo)}`}>{item.riesgo}</span>
                        <span className={`riskBadge ${statusClass(item.status || item.decision_supervisor)}`}>{item.status || item.decision_supervisor || "RECIBIDA"}</span>
                      </div>
                    </button>
                  ))}
                  {!supervisorEvidences.length ? <div className="emptyBox">No hay evidencias con esos filtros.</div> : null}
                </div>
              </div>
              <div className="panel">
                <div className="miniTitle">Revisión</div>
                {selectedSupervisorEvidence ? (
                  <>
                    <div className="previewFrame">
                      <img src={selectedSupervisorEvidence.url_foto} alt={selectedSupervisorEvidence.tipo_evidencia} className="img" />
                    </div>
                    <div className="summaryLine"><strong>{selectedSupervisorEvidence.promotor_nombre || selectedSupervisorEvidence.promotor_id || "Promotor"}</strong></div>
                    <div className="summaryLine">{compactMetaLine(selectedSupervisorEvidence)}</div>
                    <div className="summaryLine">{selectedSupervisorEvidence.fecha_hora_fmt}</div>
                    <div className="summaryLine">Riesgo: <span className={`riskBadge ${severityClass(selectedSupervisorEvidence.riesgo)}`}>{selectedSupervisorEvidence.riesgo}</span></div>
                    <div className="summaryLine">Descripción: {cleanEvidenceDescription(selectedSupervisorEvidence.descripcion)}</div>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Decisión</label>
                    <select className="inputLike" value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value as SupervisorDecision)}>
                      <option value="APROBADA">APROBADA</option>
                      <option value="OBSERVADA">OBSERVADA</option>
                      <option value="RECHAZADA">RECHAZADA</option>
                    </select>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Motivo</label>
                    <input className="inputLike" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Comentario de revisión" />
                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => void reviewSelectedEvidence()}>
                        <Check size={16} />
                        <span>Guardar revisión</span>
                      </button>
                      <button className="actionButton" onClick={() => {
                        if (selectedSupervisorEvidence.tienda_id && selectedSupervisorEvidence.promotor_id) {
                          const teamRow = supervisorTeam.find((row) => row.promotor_id === selectedSupervisorEvidence.promotor_id);
                          if (teamRow?.ultima_visita_id) void openVisitExpedient(teamRow.ultima_visita_id);
                        }
                      }}>
                        <Eye size={16} />
                        <span>Expediente</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="emptyBox">Selecciona una evidencia.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "promotor" && (promotorModule === "evidencias" || promotorModule === "mis_evidencias") && filteredOperationalGallery.length > 0 ? (
          <div className="card">
            <div className="sectionTitle">Galería de evidencias</div>
            <div className="galleryScroll">
              <div className="galleryGrid">
                {filteredOperationalGallery.slice(0, 30).map((item) => (
                  <div className="galleryCard galleryCardCompact" key={item.evidencia_id}>
                    <div className="imageFrame imageFrameCompact">
                      <img src={item.url_foto} alt={item.tipo_evidencia} className="img" />
                    </div>
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
                  <div className="summaryLine">Tienda: {expedient.visita?.tienda_nombre || expedient.visita?.tienda_id || "-"}</div>
                  <div className="summaryLine">Entrada: {formatHourFromIso(expedient.visita?.hora_inicio || "")}</div>
                  <div className="summaryLine">Salida: {expedient.visita?.hora_fin ? formatHourFromIso(expedient.visita.hora_fin) : "Pendiente"}</div>
                  <div className="geoRow">
                    <span className={`geoBadge ${geofenceClass(expedient.visita?.resultado_geocerca_entrada)}`}>E: {geofenceShortLabel(expedient.visita?.resultado_geocerca_entrada)}</span>
                    <span className={`geoBadge ${geofenceClass(expedient.visita?.resultado_geocerca_salida)}`}>S: {geofenceShortLabel(expedient.visita?.resultado_geocerca_salida)}</span>
                  </div>
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
                  <div className="miniTitle">Evidencias de la visita</div>
                  <div className="galleryGrid">
                    {(expedient.evidencias || []).map((item) => (
                      <div className="galleryCard galleryCardCompact" key={item.evidencia_id}>
                        <div className="imageFrame imageFrameCompact">
                          <img src={item.url_foto} alt={item.tipo_evidencia} className="img" />
                        </div>
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
                    {!(expedient.evidencias || []).length ? <div className="emptyBox">Sin evidencias ligadas.</div> : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {statusMsg ? <div className="statusBar">{statusMsg}</div> : null}

        <div className="footerActions">
          <button
            className="secondaryBtn footerBtn"
            onClick={() => {
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
                  setStatusMsg("Información actualizada.");
                } catch (err) {
                  setStatusMsg(err instanceof Error ? err.message : "No se pudo recargar.");
                } finally {
                  setSyncing(false);
                }
              })();
            }}
            disabled={syncing || !!error}
          >
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
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
};

const globalCss = `
* { box-sizing: border-box; }
body { margin: 0; background: #eef1f4; }
button, input, select { font: inherit; }
input[type=file] { display: none; }
.shell { max-width: 1180px; margin: 0 auto; }
.stickyTop {
  position: sticky;
  top: 0;
  z-index: 20;
  background: linear-gradient(180deg, rgba(238,241,244,0.97) 0%, rgba(238,241,244,0.92) 100%);
  backdrop-filter: blur(6px);
  padding-bottom: 8px;
}
.hero {
  display: flex;
  background: linear-gradient(135deg, #f8f9fb 0%, #edf1f3 100%);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 16px;
  padding: 8px 12px;
  box-shadow: 0 6px 16px rgba(38,50,56,0.06);
}
.heroSplit {
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.heroLogoBlock {
  display: flex;
  align-items: center;
  min-width: 0;
}
.brandWord {
  font-size: 22px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #43a047;
}
.heroTitleBlock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  margin-left: auto;
  overflow: hidden;
}
.heroTitleBlockWide {
  width: min(240px, 48%);
  min-width: 190px;
}
.heroTitle {
  font-size: 14px;
  line-height: 1.05;
  font-weight: 800;
  color: #263238;
}
.heroTitleTight { text-align: right; max-width: 132px; }
.heroMetaSingle {
  color: #78909c;
  font-size: 10px;
  text-align: right;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.heroMetaSingleWide { width: 100%; max-width: 220px; }
.card {
  margin-top: 12px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 10px 22px rgba(38,50,56,0.07);
}
.loadingCard { background: rgba(255,255,255,0.95); }
.warning { background: rgba(255,244,229,0.96); border-color: rgba(245,158,11,0.25); }
.warningRow, .loadingRow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #263238;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.sectionTitle { font-size: 18px; font-weight: 800; color: #263238; }
.tabsBar {
  margin-top: 8px;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  white-space: nowrap;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 14px;
  padding: 4px;
  scrollbar-width: thin;
}
.tabsInline::-webkit-scrollbar { height: 6px; }
.tabsInline::-webkit-scrollbar-thumb { background: rgba(96,125,139,0.24); border-radius: 999px; }
.tabBtn {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #546e7a;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 700;
  flex: 0 0 auto;
}
.tabBtnActive { background: rgba(76,175,80,.14); color: #2e7d32; }
.twoCol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}
.miniTitle { font-size: 15px; font-weight: 800; margin-bottom: 10px; color: #263238; }
.stack { display: flex; flex-direction: column; gap: 8px; }
.compactStack { max-height: 320px; overflow: auto; }
.listBtn {
  width: 100%;
  text-align: left;
  border-radius: 16px;
  border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96);
  padding: 12px;
  color: #263238;
  cursor: pointer;
}
.listBtnGreen { border-color: rgba(76,175,80,.45); background: rgba(232,245,233,0.95); }
.listTitle { font-weight: 800; }
.listSub { margin-top: 4px; color: #607d8b; font-size: 12px; }
.geoRow {
  margin-top: 6px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.geoBadge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 8px;
}
.geoGreen { background: rgba(76,175,80,.14); color: #2e7d32; }
.geoAmber { background: rgba(245,158,11,.14); color: #ed6c02; }
.geoRed { background: rgba(239,68,68,.14); color: #d32f2f; }
.geoNeutral { background: rgba(96,125,139,.12); color: #546e7a; }
.panel {
  border-radius: 16px;
  border: 1px solid rgba(38,50,56,0.08);
  background: rgba(248,249,251,0.95);
  padding: 14px;
}
.fieldLabel { margin-bottom: 6px; display: block; font-size: 13px; color: #546e7a; }
.inputLike {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(38,50,56,0.10);
  background: rgba(255,255,255,0.96);
  color: #263238;
  padding: 11px 12px;
}
.contextHint { margin-top: 8px; font-size: 12px; color: #607d8b; }
.primaryBtn, .secondaryBtn, .fileBtn {
  margin-top: 10px;
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 13px 14px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
}
.primaryBtn { background: #4caf50; color: white; }
.secondaryBtn, .fileBtn { background: #eceff1; color: #37474f; }
.primaryBtn:disabled, .secondaryBtn:disabled, .inputLike:disabled { opacity: 0.7; cursor: not-allowed; }
.compactBtn { margin-top: 0; padding: 11px 12px; }
.wideFileBtn { margin-top: 12px; }
.emptyBox {
  padding: 12px;
  border-radius: 12px;
  background: rgba(96,125,139,0.08);
  color: #607d8b;
  font-size: 13px;
}
.captureBlock {
  margin-top: 12px;
  border-radius: 14px;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(38,50,56,0.08);
  padding: 12px;
}
.captureTitle {
  font-size: 13px;
  font-weight: 800;
  color: #37474f;
  margin-bottom: 8px;
}
.captureGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.captureGrid.threeCols { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.captureMeta { margin-top: 8px; font-size: 12px; color: #607d8b; }
.thumbRow, .thumbGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.thumb {
  width: 66px;
  height: 66px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(38,50,56,0.12);
}
.actionGrid, .summaryGrid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.actionGridButtons { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.summaryBlock {
  border-radius: 16px;
  padding: 14px;
  background: rgba(248,249,251,0.95);
  border: 1px solid rgba(38,50,56,0.08);
}
.kpiBlock { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.kpiValue { font-size: 28px; font-weight: 900; color: #263238; }
.kpiLabel { font-size: 12px; color: #607d8b; font-weight: 700; }
.summaryLine { color: #455a64; font-size: 13px; margin-top: 8px; }
.summaryGeo { margin-top: 4px; color: #607d8b; font-size: 12px; }
.previewFrame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 14px;
  background: #dfe5e8;
  margin-bottom: 10px;
}
.actionButton {
  border: 0;
  border-radius: 12px;
  background: rgba(96,125,139,0.12);
  color: #37474f;
  font-weight: 700;
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}
.galleryScroll { max-height: 420px; overflow: auto; padding-right: 4px; }
.compactGalleryScroll { max-height: 320px; }
.galleryGrid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.attendanceGalleryGrid { grid-template-columns: 1fr; }
.attendanceGalleryBlock { margin-top: 8px; }
.galleryCard {
  border-radius: 18px;
  border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96);
  padding: 12px;
}
.galleryCardCompact {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  align-items: start;
}
.galleryBodyCompact { min-width: 0; }
.imageFrame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 14px;
  background: #dfe5e8;
}
.imageFrameCompact {
  width: 72px;
  height: 72px;
  aspect-ratio: auto;
}
.img { width: 100%; height: 100%; object-fit: cover; display: block; }
.galleryTop {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.compactTop { margin-top: 0; }
.galleryTitle { font-weight: 800; color: #263238; font-size: 13px; }
.gallerySub { margin-top: 4px; color: #607d8b; font-size: 13px; }
.compactMeta { line-height: 1.2; }
.galleryDate { margin-top: 4px; color: #78909c; font-size: 12px; }
.galleryDesc { margin-top: 8px; color: #455a64; font-size: 13px; line-height: 1.45; }
.compactDesc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.riskBadge {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 800;
}
.riskRed { background: rgba(239,68,68,.14); color: #d32f2f; }
.riskAmber { background: rgba(245,158,11,.14); color: #ed6c02; }
.riskGreen { background: rgba(76,175,80,.14); color: #2e7d32; }
.filtersRow {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.twoColsFilters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.statusBar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 12px;
  z-index: 60;
  width: calc(100% - 24px);
  max-width: 760px;
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(232,245,233,0.98);
  color: #2e7d32;
  border: 1px solid rgba(76,175,80,0.20);
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(38,50,56,0.16);
}
.footerActions {
  margin-top: 12px;
  margin-bottom: 74px;
  display: flex;
  justify-content: flex-end;
}
.footerBtn { width: auto; min-width: 160px; }
.fullSpan { grid-column: 1 / -1; }
@media (max-width: 900px) {
  .twoCol, .galleryGrid, .actionGrid, .summaryGrid, .actionGridButtons, .captureGrid, .captureGrid.threeCols, .filtersRow, .twoColsFilters {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .heroTitleBlockWide { width: min(220px, 58%); min-width: 168px; }
  .heroMetaSingleWide { max-width: 190px; }
}
`;
