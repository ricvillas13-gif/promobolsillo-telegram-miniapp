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

type BootstrapResponse = {
  ok: boolean;
  role: Role;
  profile?: {
    nombre?: string;
  };
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
};

type UiEvidence = EvidenceItem & {
  status?: "ACTIVA" | "ANULADA";
  note?: string;
  tienda_nombre?: string;
};

type DashboardResponse = {
  ok: boolean;
  promotor?: {
    nombre?: string;
  };
  stores?: StoreItem[];
  openVisits?: VisitItem[];
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
};

type CloseVisitResponse = {
  ok: boolean;
  visita_id: string;
  closed_at: string;
};

const API_BASE = "https://promobolsillo-telegram.onrender.com";
const ASSET_VERSION = "20260321e";

const MOCK_STORES: StoreItem[] = [
  { tienda_id: "TDA-001", nombre_tienda: "Bodega Aurrera San Mateo", cadena: "Bodega Aurrera" },
  { tienda_id: "TDA-002", nombre_tienda: "Walmart Las Torres", cadena: "Walmart" },
];

const MOCK_VISITS: VisitItem[] = [
  {
    visita_id: "V-1001",
    tienda_id: "TDA-001",
    tienda_nombre: "Bodega Aurrera San Mateo",
    hora_inicio: "2026-03-21T09:10:00.000Z",
    hora_fin: "",
  },
];

const MOCK_GALLERY: UiEvidence[] = [
  {
    evidencia_id: "EV-1",
    tipo_evento: "EVIDENCIA_PRECIO",
    tipo_evidencia: "Precio",
    marca_nombre: "Marca de ejemplo",
    riesgo: "BAJO",
    fecha_hora_fmt: "2026-03-21 09:42",
    url_foto: "https://picsum.photos/seed/rezgo1/1200/900",
    descripcion: "Referencia local.",
    status: "ACTIVA",
    tienda_nombre: "Bodega Aurrera San Mateo",
  },
];

function getTelegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

function getInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || "";
}

function getLogoUrl(mode: Exclude<LogoMode, "text">) {
  const path = mode === "primary" ? "rezgo-horizontal.jpeg" : "rezgo-square.jpeg";
  if (typeof window === "undefined") return `/${path}?v=${ASSET_VERSION}`;
  return `${window.location.origin}/${path}?v=${ASSET_VERSION}`;
}

async function postJson<T>(path: string, payload: Record<string, unknown>, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: getInitData(), ...payload }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);
    return (await res.json()) as T;
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

function looksLikeStoreId(value: string) {
  return /^TDA[-_]/i.test(value) || /^TIENDA[-_]/i.test(value) || /^[A-Z]{2,}-\d+/i.test(value);
}

function getStoreNameById(storeId: string, stores: StoreItem[]) {
  const found = stores.find((store) => store.tienda_id === storeId || store.nombre_tienda === storeId);
  return found?.nombre_tienda || "";
}

function getVisitDisplayName(visit: VisitItem, stores: StoreItem[]) {
  const byId = getStoreNameById(visit.tienda_id, stores);
  if (byId) return byId;

  const byName = getStoreNameById(visit.tienda_nombre, stores);
  if (byName) return byName;

  if (visit.tienda_nombre && !looksLikeStoreId(visit.tienda_nombre)) return visit.tienda_nombre;
  return "Visita activa";
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

const myEvidenceActions: Array<{ key: string; Icon: React.ElementType; title: string }> = [
  { key: "ver", Icon: Eye, title: "Ver" },
  { key: "anular", Icon: Trash2, title: "Anular" },
  { key: "reemplazar", Icon: Camera, title: "Reemplazar" },
  { key: "nota", Icon: Pencil, title: "Nota" },
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

  const [stores, setStores] = useState<StoreItem[]>(MOCK_STORES);
  const [visits, setVisits] = useState<VisitItem[]>(MOCK_VISITS);
  const [gallery, setGallery] = useState<UiEvidence[]>(MOCK_GALLERY);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState(MOCK_VISITS[0]?.visita_id || "");
  const [promotorModule, setPromotorModule] = useState<PromotorModule>("asistencia");
  const [supervisorModule, setSupervisorModule] = useState<SupervisorModule>("equipo");

  const [evidenceBrand, setEvidenceBrand] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [evidencePhase, setEvidencePhase] = useState<EvidencePhase>("NA");
  const [evidenceQty, setEvidenceQty] = useState(1);
  const [evidenceDescription, setEvidenceDescription] = useState("");

  const [selectedEvidenceId, setSelectedEvidenceId] = useState(MOCK_GALLERY[0]?.evidencia_id || "");
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#f4f5f7");
      tg.setBackgroundColor?.("#eef1f4");
    }
  }, [tg]);

  const openVisits = useMemo(() => visits.filter((v) => !v.hora_fin), [visits]);
  const activeGallery = useMemo(() => gallery.filter((item) => item.status !== "ANULADA"), [gallery]);
  const selectedEvidence = useMemo(
    () => activeGallery.find((item) => item.evidencia_id === selectedEvidenceId) || activeGallery[0] || null,
    [activeGallery, selectedEvidenceId]
  );

  const summary = useMemo(
    () => ({
      assignedStores: stores.length,
      openVisits: openVisits.length,
      evidenciasHoy: activeGallery.length,
      alertas: activeGallery.filter((g) => g.riesgo === "ALTO" || g.riesgo === "MEDIO").length,
    }),
    [stores, openVisits, activeGallery]
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

  async function loadRealDashboard() {
    if (role !== "promotor") return;

    try {
      setSyncing(true);
      const dashboard = await postJson<DashboardResponse>("/miniapp/promotor/dashboard", {});
      if (dashboard.promotor?.nombre) setActorLabel(dashboard.promotor.nombre);
      if (dashboard.stores) setStores(dashboard.stores);
      if (dashboard.openVisits) {
        setVisits(dashboard.openVisits);
        if (!selectedVisitId && dashboard.openVisits[0]?.visita_id) {
          setSelectedVisitId(dashboard.openVisits[0].visita_id);
        }
      }

      const evidences = await postJson<EvidencesTodayResponse>("/miniapp/promotor/evidences-today", {});
      if (evidences.evidencias) {
        setGallery(
          evidences.evidencias.map((item) => ({
            ...item,
            status: "ACTIVA",
          }))
        );
        if (!selectedEvidenceId && evidences.evidencias[0]?.evidencia_id) {
          setSelectedEvidenceId(evidences.evidencias[0].evidencia_id);
        }
      }

      setError("");
    } catch {
      setError("No se pudo cargar toda la operación real. Se muestra una vista local de referencia.");
    } finally {
      setSyncing(false);
    }
  }

  async function initialize() {
    try {
      setLoading(true);
      setError("");
      await loadBootstrap();
    } catch {
      setError("No se pudo validar la sesión en línea. Se muestra una vista local de referencia.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!loading && !error && role === "promotor") {
      loadRealDashboard();
    }
  }, [loading, error, role]);

  function handleLogoError() {
    setLogoMode((prev) => {
      if (prev === "primary") return "secondary";
      if (prev === "secondary") return "text";
      return prev;
    });
  }

  async function createEntry() {
    try {
      if (!selectedStoreId) {
        setStatusMsg("⚠️ Selecciona una tienda.");
        return;
      }
      if (!getInitData()) {
        setStatusMsg("⚠️ Esta acción real solo funciona desde Telegram.");
        return;
      }

      const selectedStore = stores.find((store) => store.tienda_id === selectedStoreId);
      const confirmMessage = `¿Deseas registrar entrada en ${selectedStore?.nombre_tienda || "la tienda seleccionada"}?`;
      if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
        return;
      }

      setSyncing(true);
      const response = await postJson<StartEntryResponse>("/miniapp/promotor/start-entry", {
        tienda_id: selectedStoreId,
      });

      const newVisit: VisitItem = {
        visita_id: response.visita_id,
        tienda_id: response.tienda_id,
        tienda_nombre: response.tienda_nombre,
        hora_inicio: response.started_at,
        hora_fin: "",
      };

      setVisits((prev) => [newVisit, ...prev.filter((v) => v.visita_id !== newVisit.visita_id)]);
      setSelectedVisitId(newVisit.visita_id);
      setStatusMsg(`✅ Entrada registrada en ${response.tienda_nombre}`);
      await loadRealDashboard();
    } catch {
      setStatusMsg("⚠️ No se pudo registrar la entrada real.");
    } finally {
      setSyncing(false);
    }
  }

  async function closeVisit() {
    try {
      if (!selectedVisitId) {
        setStatusMsg("⚠️ Selecciona una visita abierta.");
        return;
      }
      if (!getInitData()) {
        setStatusMsg("⚠️ Esta acción real solo funciona desde Telegram.");
        return;
      }

      setSyncing(true);
      await postJson<CloseVisitResponse>("/miniapp/promotor/close-visit", {
        visita_id: selectedVisitId,
      });

      setStatusMsg("✅ Salida registrada correctamente.");
      await loadRealDashboard();
    } catch {
      setStatusMsg("⚠️ No se pudo registrar la salida real.");
    } finally {
      setSyncing(false);
    }
  }

  function saveEvidenceFlow() {
    const visit = openVisits.find((item) => item.visita_id === selectedVisitId) || openVisits[0];
    if (!visit) {
      setStatusMsg("⚠️ Necesitas una visita activa para registrar evidencias.");
      return;
    }

    const created: UiEvidence[] = Array.from({ length: evidenceQty }).map((_, index) => ({
      evidencia_id: `UI-${Date.now()}-${index + 1}`,
      tipo_evento: `EVIDENCIA_${(evidenceType || "GENERAL").toUpperCase()}`,
      tipo_evidencia: evidenceType || "Sin tipo",
      marca_nombre: evidenceBrand || "Sin marca",
      riesgo: index === 0 ? "BAJO" : "MEDIO",
      fecha_hora_fmt: nowMxString(),
      url_foto: `https://picsum.photos/seed/${Date.now()}-${index}/1200/900`,
      descripcion: evidenceDescription || "Captura registrada desde la UI",
      status: "ACTIVA",
      tienda_nombre: getVisitDisplayName(visit, stores),
    }));

    setGallery((prev) => [...created, ...prev]);
    setSelectedEvidenceId(created[0].evidencia_id);
    setEvidenceDescription("");
    setEvidenceQty(1);
    setStatusMsg("✅ Flujo visible guardado. La conexión final de evidencias aún está pendiente.");
  }

  function markEvidenceAsCancelled() {
    if (!selectedEvidence) {
      setStatusMsg("⚠️ Selecciona una evidencia.");
      return;
    }
    setGallery((prev) =>
      prev.map((item) =>
        item.evidencia_id === selectedEvidence.evidencia_id
          ? { ...item, status: "ANULADA" }
          : item
      )
    );
    setStatusMsg("✅ Evidencia marcada como anulada en la UI.");
  }

  function replaceEvidence() {
    if (!selectedEvidence) {
      setStatusMsg("⚠️ Selecciona una evidencia.");
      return;
    }
    setGallery((prev) =>
      prev.map((item) =>
        item.evidencia_id === selectedEvidence.evidencia_id
          ? { ...item, url_foto: `https://picsum.photos/seed/replaced-${Date.now()}/1200/900`, fecha_hora_fmt: nowMxString() }
          : item
      )
    );
    setStatusMsg("✅ Evidencia reemplazada en la UI.");
  }

  function saveNote() {
    if (!selectedEvidence || !noteDraft.trim()) {
      setStatusMsg("⚠️ Escribe una nota y selecciona una evidencia.");
      return;
    }
    setGallery((prev) =>
      prev.map((item) =>
        item.evidencia_id === selectedEvidence.evidencia_id
          ? { ...item, note: noteDraft.trim() }
          : item
      )
    );
    setNoteDraft("");
    setStatusMsg("✅ Nota agregada en la UI.");
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
                    alt=""
                    aria-label="REZGO"
                    className={logoMode === "primary" ? "brandLogoHorizontal" : "brandLogoSquare"}
                    onError={handleLogoError}
                  />
                </div>
              ) : (
                <div className="brandWord">REZGO</div>
              )}
            </div>
            <div className="heroTitleBlock">
              <div className="heroTitle heroTitleTight">Operación<br />del promotor</div>
              <div className="heroMetaSingle">{actorLabel}</div>
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

                <button className="primaryBtn" onClick={createEntry} disabled={syncing}>
                  <MapPin size={16} />
                  {syncing ? "Procesando..." : "Registrar entrada"}
                </button>

                <button className="secondaryBtn" onClick={closeVisit} disabled={syncing}>
                  <CheckCircle2 size={16} />
                  {syncing ? "Procesando..." : "Registrar salida"}
                </button>
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

                <label className="fieldLabel" style={{ marginTop: 10 }}>Marca</label>
                <input className="inputLike" value={evidenceBrand} onChange={(e) => setEvidenceBrand(e.target.value)} placeholder="Marca" />

                <label className="fieldLabel" style={{ marginTop: 10 }}>Tipo</label>
                <input className="inputLike" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} placeholder="Tipo de evidencia" />

                <label className="fieldLabel" style={{ marginTop: 10 }}>Fase</label>
                <select className="inputLike" value={evidencePhase} onChange={(e) => setEvidencePhase(e.target.value as EvidencePhase)}>
                  <option value="NA">No aplica</option>
                  <option value="ANTES">Antes</option>
                  <option value="DESPUES">Después</option>
                </select>
              </div>

              <div className="panel">
                <label className="fieldLabel">Cantidad de fotos</label>
                <input
                  className="inputLike"
                  type="number"
                  min={1}
                  max={10}
                  value={evidenceQty}
                  onChange={(e) => setEvidenceQty(Math.max(1, Number(e.target.value || 1)))}
                />

                <label className="fieldLabel" style={{ marginTop: 10 }}>Observación</label>
                <input
                  className="inputLike"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  placeholder="Ej. Cabecera completa, competencia lateral..."
                />

                <button className="primaryBtn" onClick={saveEvidenceFlow}>
                  <Camera size={16} />
                  Guardar flujo visible
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
                  {activeGallery.map((item) => (
                    <button
                      key={item.evidencia_id}
                      onClick={() => setSelectedEvidenceId(item.evidencia_id)}
                      className={`listBtn ${selectedEvidenceId === item.evidencia_id ? "listBtnGreen" : ""}`}
                    >
                      <div className="listTitle">{item.tienda_nombre || "Sin nombre de tienda"}</div>
                      <div className="listSub">{item.tipo_evidencia} · {item.marca_nombre}</div>
                    </button>
                  ))}
                  {!activeGallery.length ? <div className="emptyBox">No hay evidencias activas.</div> : null}
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
                      {myEvidenceActions.map((item) => {
                        const Icon = item.Icon;
                        const handleClick =
                          item.key === "anular"
                            ? markEvidenceAsCancelled
                            : item.key === "reemplazar"
                              ? replaceEvidence
                              : undefined;
                        return (
                          <button className="actionButton" key={item.key} onClick={handleClick}>
                            <Icon size={16} />
                            <span>{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                    <label className="fieldLabel" style={{ marginTop: 10 }}>Nota</label>
                    <input
                      className="inputLike"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Escribe una observación"
                    />
                    <button className="secondaryBtn" onClick={saveNote}>
                      <Pencil size={16} />
                      Guardar nota
                    </button>
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

        {activeGallery.length > 0 ? (
          <div className="card">
            <div className="sectionTitle">Galería del día</div>
            <div className="galleryGrid">
              {activeGallery.slice(0, 6).map((item) => (
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
          <button className="secondaryBtn footerBtn" onClick={loadRealDashboard} disabled={syncing || !!error || role !== "promotor"}>
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
  width: 118px;
  min-width: 118px;
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
  max-width: 118px;
}
.heroMetaSingle {
  color: #78909c;
  font-size: 11px;
  text-align: right;
  margin-top: 3px;
  white-space: nowrap;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
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
.primaryBtn, .secondaryBtn {
  margin-top: 10px; width: 100%; border: 0; border-radius: 14px; padding: 13px 14px;
  display: inline-flex; justify-content: center; align-items: center; gap: 8px;
  font-weight: 800; cursor: pointer;
}
.primaryBtn { background: #4caf50; color: white; }
.secondaryBtn { background: #eceff1; color: #37474f; }
.primaryBtn:disabled, .secondaryBtn:disabled { opacity: 0.7; cursor: not-allowed; }
.emptyBox {
  padding: 12px; border-radius: 12px; background: rgba(96,125,139,0.08); color: #607d8b; font-size: 13px;
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
  margin-top: 12px; border-radius: 16px; padding: 12px 14px;
  background: rgba(232,245,233,0.96); color: #2e7d32; border: 1px solid rgba(76,175,80,0.20);
  font-weight: 700;
}
.footerActions { margin-top: 12px; display: flex; justify-content: flex-end; }
.footerBtn { width: auto; min-width: 160px; }
@media (max-width: 900px) {
  .twoCol, .galleryGrid, .actionGrid, .summaryGrid, .actionGridButtons { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .heroTitleBlock { width: 112px; min-width: 112px; }
  .heroTitleTight { max-width: 112px; }
}
`;
