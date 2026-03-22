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
type LogoMode = "primary" | "secondary" | "text";
type CaptureKind = "entrada" | "salida";

type BootstrapResponse = {
  ok: boolean;
  role: Role;
  profile?: { nombre?: string };
};

type StoreItem = {
  tienda_id: string;
  nombre_tienda: string;
  cadena: string;
};

type VisitItem = {
  visita_id: string;
  tienda_id: string;
  tienda_nombre: string;
  hora_inicio: string;
  hora_fin: string;
};

type EvidenceItem = {
  evidencia_id: string;
  tipo_evento: string;
  tipo_evidencia: string;
  marca_nombre: string;
  riesgo: string;
  fecha_hora_fmt: string;
  url_foto: string;
  descripcion: string;
  tienda_nombre?: string;
  tienda_id?: string;
};

type UiEvidence = EvidenceItem & {
  status?: "ACTIVA" | "ANULADA";
};

type DashboardResponse = {
  ok: boolean;
  promotor?: { nombre?: string };
  stores?: StoreItem[];
  openVisits?: VisitItem[];
  visitsToday?: VisitItem[];
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
const ASSET_VERSION = "20260322b";

function getTelegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

function getInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || "";
}

function getLogoUrl(mode: Exclude<LogoMode, "text">) {
  const file = mode === "primary" ? "rezgo-horizontal.jpeg" : "rezgo-square.jpeg";
  if (typeof window === "undefined") return `/${file}?v=${ASSET_VERSION}`;
  return `${window.location.origin}/${file}?v=${ASSET_VERSION}`;
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
      throw new Error(json?.error || `Error ${res.status}`);
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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto"));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl: string, maxSide = 1280, quality = 0.82) {
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

async function readCompressedPhoto(file: File) {
  const raw = await fileToDataUrl(file);
  return compressDataUrl(raw);
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

const supervisorCards: Array<{ key: string; Icon: React.ElementType; title: string; text: string }> = [
  { key: "equipo", Icon: Users, title: "Equipo del día", text: "Promotores, visitas activas y desempeño del turno." },
  { key: "alertas", Icon: ShieldAlert, title: "Alertas", text: "Asistencias incompletas, riesgos y pendientes." },
  { key: "evidencias", Icon: ImageIcon, title: "Evidencias", text: "Revisión operativa y visual por promotor." },
  { key: "seguimiento", Icon: Pencil, title: "Seguimiento", text: "Casos por continuar y validaciones del supervisor." },
];

export default function App() {
  const tg = getTelegramWebApp();

  const [role, setRole] = useState<Role>("promotor");
  const [actorLabel, setActorLabel] = useState("Promotor");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [logoMode, setLogoMode] = useState<LogoMode>("primary");

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [promotorModule, setPromotorModule] = useState<PromotorModule>("asistencia");
  const [supervisorModule, setSupervisorModule] = useState<SupervisorModule>("equipo");

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

  const [gallery, setGallery] = useState<UiEvidence[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

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
    const t = setTimeout(() => setStatusMsg(""), 2800);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const openVisits = useMemo(() => visits.filter((v) => !v.hora_fin), [visits]);
  const hasOpenVisit = openVisits.length > 0;
  const selectedEvidence = useMemo(
    () => gallery.find((item) => item.evidencia_id === selectedEvidenceId) || gallery[0] || null,
    [gallery, selectedEvidenceId]
  );

  const summary = useMemo(
    () => ({
      assignedStores: stores.length,
      openVisits: openVisits.length,
      evidenciasHoy: gallery.length,
      alertas: gallery.filter((g) => g.riesgo === "ALTO" || g.riesgo === "MEDIO").length,
    }),
    [stores, openVisits, gallery]
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

  async function loadDashboard() {
    if (role !== "promotor") return;
    const dashboard = await postJson<DashboardResponse>("/miniapp/promotor/dashboard", {});
    if (dashboard.promotor?.nombre) setActorLabel(dashboard.promotor.nombre);
    if (dashboard.stores?.length) setStores(dashboard.stores);
    if (dashboard.openVisits) {
      setVisits(dashboard.openVisits);
      if (!selectedVisitId) {
        setSelectedVisitId(dashboard.openVisits[0]?.visita_id || "");
      } else {
        const currentStillExists = dashboard.openVisits.find((v) => v.visita_id === selectedVisitId);
        if (!currentStillExists) {
          setSelectedVisitId(dashboard.openVisits[0]?.visita_id || "");
        }
      }
    }
  }

  async function loadEvidencesToday() {
    if (role !== "promotor") return;
    const data = await postJson<EvidencesTodayResponse>("/miniapp/promotor/evidences-today", {});
    const rows = (data.evidencias || []).map((item) => ({ ...item, status: "ACTIVA" as const }));
    setGallery(rows);
    if (rows.length && !rows.find((r) => r.evidencia_id === selectedEvidenceId)) {
      setSelectedEvidenceId(rows[0].evidencia_id);
    }
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
      setBrandRules(rules.reglas || []);
      if (rules.reglas?.length) {
        const first = rules.reglas[0];
        if (!evidenceType) setEvidenceType(first.tipo_evidencia);
        setEvidenceQty(first.fotos_requeridas || 1);
        if (first.requiere_antes_despues && evidencePhase === "NA") {
          setEvidencePhase("ANTES");
        }
      }
    } catch {
      setBrandRules([]);
    }
  }

  async function initialize() {
    try {
      setLoading(true);
      setError("");
      await loadBootstrap();
      await loadDashboard();
      await loadEvidencesToday();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la operación.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (role === "promotor") {
      loadEvidenceContext(selectedVisitId);
    }
  }, [selectedVisitId, role]);

  useEffect(() => {
    if (role === "promotor") {
      loadRulesForBrand(evidenceBrandId, evidenceBrandLabel);
    }
  }, [evidenceBrandId]);

  function handleLogoError() {
    setLogoMode((prev) => {
      if (prev === "primary") return "secondary";
      if (prev === "secondary") return "text";
      return prev;
    });
  }

  async function captureLocation(kind: CaptureKind) {
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
      const dataUrl = await readCompressedPhoto(file);
      const payload: PhotoCapture = {
        name: file.name,
        dataUrl,
        capturedAt: nowMxString(),
      };

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
          dataUrl: await readCompressedPhoto(file),
          capturedAt: nowMxString(),
        }))
      );
      setEvidencePhotos(processed);
      setStatusMsg(`${processed.length} foto(s) de evidencia listas.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudieron procesar las fotos.");
    } finally {
      setCapturingPhoto(null);
    }
  }

  async function createEntry() {
    try {
      if (!selectedStoreId) {
        setStatusMsg("Selecciona una tienda.");
        return;
      }
      if (!entryLocation) {
        setStatusMsg("Captura la ubicación de entrada.");
        return;
      }
      if (!entryPhoto) {
        setStatusMsg("Captura la foto de entrada.");
        return;
      }
      if (!getInitData()) {
        setStatusMsg("Esta acción real solo funciona desde Telegram.");
        return;
      }

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

      if (response.warning) {
        setStatusMsg("Entrada registrada. La evidencia auxiliar no se guardó, pero la visita sí.");
      } else {
        setStatusMsg(`Entrada registrada en ${response.tienda_nombre}`);
      }

      setEntryLocation(null);
      setEntryPhoto(null);
      setExitLocation(null);
      setExitPhoto(null);

      await loadDashboard();
      await loadEvidencesToday();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo registrar la entrada real.");
    } finally {
      setSyncing(false);
    }
  }

  async function closeVisit() {
    try {
      if (!selectedVisitId) {
        setStatusMsg("Selecciona una visita abierta.");
        return;
      }
      if (!exitLocation) {
        setStatusMsg("Captura la ubicación de salida.");
        return;
      }
      if (!exitPhoto) {
        setStatusMsg("Captura la foto de salida.");
        return;
      }
      if (!getInitData()) {
        setStatusMsg("Esta acción real solo funciona desde Telegram.");
        return;
      }

      const selectedVisit = openVisits.find((visit) => visit.visita_id === selectedVisitId);
      const confirmMessage = `¿Deseas registrar salida en ${selectedVisit ? getVisitDisplayName(selectedVisit, stores) : "la visita seleccionada"}?`;
      if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;

      setSyncing(true);
      const response = await postJson<CloseVisitResponse>("/miniapp/promotor/close-visit", {
        visita_id: selectedVisitId,
        lat: exitLocation.lat,
        lon: exitLocation.lon,
        accuracy: exitLocation.accuracy,
        foto_nombre: exitPhoto.name,
        foto_data_url: exitPhoto.dataUrl,
      });

      if (response.warning) {
        setStatusMsg("Salida registrada. La evidencia auxiliar no se guardó, pero la visita sí.");
      } else {
        setStatusMsg("Salida registrada correctamente.");
      }

      setExitLocation(null);
      setExitPhoto(null);

      await loadDashboard();
      await loadEvidencesToday();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo registrar la salida real.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveEvidenceFlow() {
    try {
      if (!selectedVisitId) {
        setStatusMsg("Selecciona una visita activa.");
        return;
      }
      if (!evidenceBrandLabel.trim()) {
        setStatusMsg("Selecciona una marca.");
        return;
      }
      if (!evidenceType.trim()) {
        setStatusMsg("Selecciona o escribe el tipo de evidencia.");
        return;
      }
      if (!evidencePhotos.length) {
        setStatusMsg("Agrega al menos una foto de evidencia.");
        return;
      }
      if (evidencePhotos.length < evidenceQty) {
        setStatusMsg(`Debes cargar al menos ${evidenceQty} foto(s).`);
        return;
      }

      setSyncing(true);
      await postJson("/miniapp/promotor/evidence-register", {
        visita_id: selectedVisitId,
        marca_id: evidenceBrandId,
        marca_nombre: evidenceBrandLabel,
        tipo_evidencia: evidenceType,
        fase: evidencePhase,
        descripcion: `${selectedVisitStoreName ? `[${selectedVisitStoreName}] ` : ""}${evidenceDescription}`.trim(),
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
      setStatusMsg("Evidencia registrada correctamente.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo registrar la evidencia.");
    } finally {
      setSyncing(false);
    }
  }

  async function markEvidenceAsCancelled() {
    try {
      if (!selectedEvidence) {
        setStatusMsg("Selecciona una evidencia.");
        return;
      }
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
      const dataUrl = await readCompressedPhoto(file);
      await postJson("/miniapp/promotor/replace-evidence", {
        evidencia_id: selectedEvidence.evidencia_id,
        foto_data_url: dataUrl,
      });
      await loadEvidencesToday();
      setStatusMsg("Evidencia reemplazada.");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "No se pudo reemplazar la evidencia.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveNote() {
    try {
      if (!selectedEvidence || !noteDraft.trim()) {
        setStatusMsg("Escribe una nota y selecciona una evidencia.");
        return;
      }
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
              {logoMode !== "text" ? (
                <div className="brandPlate brandPlateHorizontal">
                  <img
                    src={getLogoUrl(logoMode)}
                    alt="REZGO"
                    className={logoMode === "primary" ? "brandLogoHorizontal" : "brandLogoSquare"}
                    onError={handleLogoError}
                  />
                </div>
              ) : (
                <div className="brandWord">REZGO</div>
              )}
            </div>
            <div className="heroTitleBlock heroTitleBlockWide">
              <div className="heroTitle heroTitleTight">Operación<br />del promotor</div>
              <div className="heroMetaSingle heroMetaSingleWide">{actorLabel}</div>
            </div>
          </motion.div>

          {role === "supervisor" ? (
            <div className="tabsBar tabsInline">
              {supervisorTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`tabBtn ${supervisorModule === tab.key ? "tabBtnActive" : ""}`}
                  onClick={() => setSupervisorModule(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="tabsBar tabsInline">
              {promotorTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`tabBtn ${promotorModule === tab.key ? "tabBtnActive" : ""}`}
                  onClick={() => setPromotorModule(tab.key)}
                >
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
                    <option key={store.tienda_id} value={store.tienda_id}>
                      {store.nombre_tienda}
                    </option>
                  ))}
                </select>

                <div className="captureBlock">
                  <div className="captureTitle">Entrada</div>
                  <div className="captureGrid">
                    <button className="secondaryBtn compactBtn" onClick={() => captureLocation("entrada")} disabled={capturingLocation === "entrada"}>
                      <MapPin size={16} />
                      {capturingLocation === "entrada" ? "Ubicando..." : entryLocation ? "Ubicación lista" : "Capturar ubicación"}
                    </button>
                    <label className="fileBtn compactBtn">
                      <Camera size={16} />
                      {capturingPhoto === "entrada" ? "Procesando..." : entryPhoto ? "Foto lista" : "Capturar foto"}
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => captureAttendancePhoto("entrada", e.target.files)} />
                    </label>
                  </div>
                  {entryLocation ? <div className="captureMeta">Lat {entryLocation.lat.toFixed(5)} · Lon {entryLocation.lon.toFixed(5)}</div> : null}
                  {entryPhoto ? <div className="thumbRow"><img src={entryPhoto.dataUrl} className="thumb" alt="Entrada" /></div> : null}
                </div>

                <button className="primaryBtn" onClick={createEntry} disabled={syncing}>
                  <MapPin size={16} />
                  {syncing ? "Procesando..." : "Registrar entrada"}
                </button>

                {hasOpenVisit ? (
                  <>
                    <div className="captureBlock">
                      <div className="captureTitle">Salida</div>
                      <div className="captureGrid">
                        <button className="secondaryBtn compactBtn" onClick={() => captureLocation("salida")} disabled={capturingLocation === "salida"}>
                          <MapPin size={16} />
                          {capturingLocation === "salida" ? "Ubicando..." : exitLocation ? "Ubicación lista" : "Capturar ubicación"}
                        </button>
                        <label className="fileBtn compactBtn">
                          <Camera size={16} />
                          {capturingPhoto === "salida" ? "Procesando..." : exitPhoto ? "Foto lista" : "Capturar foto"}
                          <input type="file" accept="image/*" capture="environment" onChange={(e) => captureAttendancePhoto("salida", e.target.files)} />
                        </label>
                      </div>
                      {exitLocation ? <div className="captureMeta">Lat {exitLocation.lat.toFixed(5)} · Lon {exitLocation.lon.toFixed(5)}</div> : null}
                      {exitPhoto ? <div className="thumbRow"><img src={exitPhoto.dataUrl} className="thumb" alt="Salida" /></div> : null}
                    </div>

                    <button className="secondaryBtn" onClick={closeVisit} disabled={syncing || !hasOpenVisit}>
                      <CheckCircle2 size={16} />
                      {syncing ? "Procesando..." : "Registrar salida"}
                    </button>
                  </>
                ) : null}
              </div>

              <div className="panel">
                <div className="miniTitle">Tiendas activas / visitas abiertas</div>
                <div className="stack compactStack">
                  {openVisits.map((visit) => (
                    <button
                      key={visit.visita_id}
                      onClick={() => setSelectedVisitId(visit.visita_id)}
                      className={`listBtn ${selectedVisitId === visit.visita_id ? "listBtnGreen" : ""}`}
                    >
                      <div className="listTitle">{getVisitDisplayName(visit, stores)}</div>
                      <div className="listSub">Entrada: {formatHourFromIso(visit.hora_inicio)}</div>
                    </button>
                  ))}
                  {!openVisits.length ? <div className="emptyBox">No hay visitas abiertas.</div> : null}
                </div>
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
                    <option key={visit.visita_id} value={visit.visita_id}>
                      {getVisitDisplayName(visit, stores)}
                    </option>
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
                    setEvidenceBrandLabel(brand?.marca_nombre || "");
                    setEvidenceType("");
                  }}
                >
                  <option value="">Selecciona una marca</option>
                  {availableBrands.map((brand) => (
                    <option key={brand.marca_id} value={brand.marca_id}>
                      {brand.marca_nombre}
                    </option>
                  ))}
                </select>

                <label className="fieldLabel" style={{ marginTop: 10 }}>Tipo</label>
                {brandRules.length ? (
                  <select className="inputLike" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
                    <option value="">Selecciona un tipo</option>
                    {brandRules.map((rule) => (
                      <option key={rule.tipo_evidencia} value={rule.tipo_evidencia}>
                        {rule.tipo_evidencia}
                      </option>
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
                <input
                  className="inputLike"
                  type="number"
                  min={1}
                  max={10}
                  value={evidenceQty}
                  onChange={(e) => setEvidenceQty(Math.max(1, Number(e.target.value || 1)))}
                />
              </div>

              <div className="panel">
                <label className="fieldLabel">Observación</label>
                <input
                  className="inputLike"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  placeholder="Ej. Cabecera completa, competencia lateral..."
                />

                <label className="fileBtn wideFileBtn" style={{ marginTop: 12 }}>
                  <Camera size={16} />
                  {capturingPhoto ? "Procesando..." : evidencePhotos.length ? `${evidencePhotos.length} foto(s) listas` : "Agregar fotos de evidencia"}
                  <input type="file" accept="image/*" multiple onChange={(e) => captureEvidencePhotos(e.target.files)} />
                </label>

                {evidencePhotos.length ? (
                  <div className="thumbGrid">
                    {evidencePhotos.map((photo) => (
                      <img key={`${photo.name}-${photo.capturedAt}`} src={photo.dataUrl} className="thumb" alt={photo.name} />
                    ))}
                  </div>
                ) : null}

                <button className="primaryBtn" onClick={saveEvidenceFlow} disabled={syncing}>
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
            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Listado</div>
                <div className="stack compactStack">
                  {gallery.map((item) => (
                    <button
                      key={item.evidencia_id}
                      onClick={() => setSelectedEvidenceId(item.evidencia_id)}
                      className={`listBtn ${selectedEvidenceId === item.evidencia_id ? "listBtnGreen" : ""}`}
                    >
                      <div className="listTitle">{item.tienda_nombre || "Visita activa"}</div>
                      <div className="listSub">{item.tipo_evidencia} · {item.marca_nombre}</div>
                    </button>
                  ))}
                  {!gallery.length ? <div className="emptyBox">No hay evidencias activas.</div> : null}
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
                    <div className="summaryLine">{selectedEvidence.tipo_evidencia} · <strong>{selectedEvidence.marca_nombre}</strong></div>
                    <div className="summaryLine">{selectedEvidence.fecha_hora_fmt}</div>

                    <div className="actionGrid actionGridButtons">
                      <button className="actionButton" onClick={() => setStatusMsg("Vista previa lista.") }>
                        <Eye size={16} />
                        <span>Ver</span>
                      </button>

                      <button className="actionButton" onClick={markEvidenceAsCancelled}>
                        <Trash2 size={16} />
                        <span>Anular</span>
                      </button>

                      <label className="actionButton">
                        <Camera size={16} />
                        <span>Reemplazar</span>
                        <input type="file" accept="image/*" onChange={(e) => replaceEvidencePhoto(e.target.files)} />
                      </label>

                      <button className="actionButton" onClick={saveNote}>
                        <Pencil size={16} />
                        <span>Guardar nota</span>
                      </button>
                    </div>

                    <label className="fieldLabel" style={{ marginTop: 10 }}>Nota</label>
                    <input
                      className="inputLike"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Escribe una observación"
                    />
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
                <div className="summaryLine">Tiendas asignadas: <strong>{summary.assignedStores}</strong></div>
                <div className="summaryLine">Visitas abiertas: <strong>{summary.openVisits}</strong></div>
                <div className="summaryLine">Evidencias hoy: <strong>{summary.evidenciasHoy}</strong></div>
                <div className="summaryLine">Alertas: <strong>{summary.alertas}</strong></div>
              </div>
              <div className="summaryBlock">
                <div className="miniTitle">Registros de visitas</div>
                {visits.length ? (
                  visits.map((visit) => (
                    <div className="summaryLine" key={visit.visita_id}>
                      {getVisitDisplayName(visit, stores)} · Entrada <strong>{formatHourFromIso(visit.hora_inicio)}</strong>{visit.hora_fin ? ` · Salida ${formatHourFromIso(visit.hora_fin)}` : " · Sin salida"}
                    </div>
                  ))
                ) : (
                  <div className="summaryLine">No hay registros del día.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" ? (
          <div className="card">
            <div className="sectionTitle">Supervisor</div>
            <div className="actionGrid">
              {supervisorCards.map((item) => {
                const Icon = item.Icon;
                return (
                  <div className="actionCard" key={item.key}>
                    <div className="iconWrap grayWrap"><Icon size={16} /></div>
                    <div>
                      <div className="flowTitle">{item.title}</div>
                      <div className="flowText">{item.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {gallery.length > 0 ? (
          <div className="card">
            <div className="sectionTitle">Galería del día</div>
            <div className="galleryGrid">
              {gallery.slice(0, 6).map((item) => (
                <div className="galleryCard" key={item.evidencia_id}>
                  <div className="imageFrame">
                    <img src={item.url_foto} alt={item.tipo_evidencia} className="img" />
                  </div>
                  <div className="galleryTop">
                    <div className="galleryTitle">{item.tipo_evidencia || item.tipo_evento}</div>
                    <span className={`riskBadge ${item.riesgo === "ALTO" ? "riskRed" : item.riesgo === "MEDIO" ? "riskAmber" : "riskGreen"}`}>
                      {item.riesgo}
                    </span>
                  </div>
                  {item.tienda_nombre ? <div className="gallerySub">{item.tienda_nombre}</div> : null}
                  <div className="galleryDate">{item.fecha_hora_fmt}</div>
                  <div className="galleryDesc">{item.descripcion}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {statusMsg ? <div className="statusBar">{statusMsg}</div> : null}

        <div className="footerActions">
          <button
            className="secondaryBtn footerBtn"
            onClick={async () => {
              try {
                setSyncing(true);
                await loadDashboard();
                await loadEvidencesToday();
                setStatusMsg("Información actualizada.");
              } catch (err) {
                setStatusMsg(err instanceof Error ? err.message : "No se pudo recargar.");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing || !!error || role !== "promotor"}
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
.brandPlate {
  background: #ffffff;
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 12px;
  padding: 5px 8px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 4px 10px rgba(38,50,56,0.05);
}
.brandPlateHorizontal { min-height: 34px; }
.brandLogoHorizontal { width: 108px; height: auto; display: block; object-fit: contain; }
.brandLogoSquare { width: 26px; height: 26px; display: block; object-fit: contain; }
.brandWord {
  font-size: 20px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #43a047;
}
.heroTitle {
  font-size: 14px;
  line-height: 1.05;
  font-weight: 800;
  color: #263238;
}
.heroTitleTight {
  text-align: right;
  max-width: 132px;
}
.heroMetaSingle {
  color: #78909c;
  font-size: 10px;
  text-align: right;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.heroMetaSingleWide {
  width: 100%;
  max-width: 200px;
}
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
  display: flex; align-items: center; gap: 10px; color: #263238;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
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
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;
}
.miniTitle { font-size: 15px; font-weight: 800; margin-bottom: 10px; color: #263238; }
.stack { display: flex; flex-direction: column; gap: 8px; }
.compactStack { max-height: 260px; overflow: auto; }
.listBtn {
  width: 100%; text-align: left; border-radius: 16px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96); padding: 12px; color: #263238; cursor: pointer;
}
.listBtnGreen { border-color: rgba(76,175,80,.45); background: rgba(232,245,233,0.95); }
.listTitle { font-weight: 800; }
.listSub { margin-top: 4px; color: #607d8b; font-size: 12px; }
.panel {
  border-radius: 16px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(248,249,251,0.95); padding: 14px;
}
.fieldLabel { margin-bottom: 6px; display: block; font-size: 13px; color: #546e7a; }
.inputLike {
  width: 100%; border-radius: 12px; border: 1px solid rgba(38,50,56,0.10);
  background: rgba(255,255,255,0.96); color: #263238; padding: 11px 12px;
}
.contextHint {
  margin-top: 8px;
  font-size: 12px;
  color: #607d8b;
}
.primaryBtn, .secondaryBtn, .fileBtn {
  margin-top: 10px; width: 100%; border: 0; border-radius: 14px; padding: 13px 14px;
  display: inline-flex; justify-content: center; align-items: center; gap: 8px;
  font-weight: 800; cursor: pointer;
  text-decoration: none;
}
.primaryBtn { background: #4caf50; color: white; }
.secondaryBtn, .fileBtn { background: #eceff1; color: #37474f; }
.primaryBtn:disabled, .secondaryBtn:disabled { opacity: 0.7; cursor: not-allowed; }
.compactBtn { margin-top: 0; padding: 11px 12px; }
.wideFileBtn { margin-top: 12px; }
.emptyBox {
  padding: 12px; border-radius: 12px; background: rgba(96,125,139,0.08); color: #607d8b; font-size: 13px;
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
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.captureMeta {
  margin-top: 8px;
  font-size: 12px;
  color: #607d8b;
}
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
  margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
}
.actionGridButtons { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.actionCard {
  display: flex; gap: 10px; align-items: flex-start; border-radius: 16px;
  padding: 14px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08);
}
.flowTitle { font-weight: 800; color: #263238; }
.flowText { margin-top: 4px; color: #607d8b; font-size: 13px; line-height: 1.45; }
.summaryBlock {
  border-radius: 16px; padding: 14px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08);
}
.summaryLine { color: #455a64; font-size: 13px; margin-top: 8px; }
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
.galleryGrid {
  margin-top: 14px;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
}
.galleryCard {
  border-radius: 18px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96); padding: 12px;
}
.imageFrame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 14px;
  background: #dfe5e8;
}
.img { width: 100%; height: 100%; object-fit: cover; display: block; }
.galleryTop {
  margin-top: 10px; display: flex; justify-content: space-between; gap: 8px; align-items: center;
}
.galleryTitle { font-weight: 800; color: #263238; }
.gallerySub { margin-top: 4px; color: #607d8b; font-size: 13px; }
.galleryDate { margin-top: 4px; color: #78909c; font-size: 12px; }
.galleryDesc { margin-top: 8px; color: #455a64; font-size: 13px; line-height: 1.45; }
.riskBadge {
  border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 800;
}
.riskRed { background: rgba(239,68,68,.14); color: #d32f2f; }
.riskAmber { background: rgba(245,158,11,.14); color: #ed6c02; }
.riskGreen { background: rgba(76,175,80,.14); color: #2e7d32; }
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
.footerActions { margin-top: 12px; margin-bottom: 74px; display: flex; justify-content: flex-end; }
.footerBtn { width: auto; min-width: 160px; }
@media (max-width: 900px) {
  .twoCol, .galleryGrid, .actionGrid, .summaryGrid, .actionGridButtons, .captureGrid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .heroTitleBlockWide { width: min(220px, 58%); min-width: 168px; }
  .heroMetaSingleWide { max-width: 190px; }
}
