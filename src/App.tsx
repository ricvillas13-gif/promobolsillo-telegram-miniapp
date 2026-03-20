import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FolderOpen,
  Image as ImageIcon,
  ListChecks,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Store,
  UserCheck,
  Users,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Role = "promotor" | "supervisor" | "cliente";
type PromotorModule = "asistencia" | "evidencias" | "mis_evidencias" | "resumen";
type SupervisorModule = "equipo" | "alertas" | "evidencias" | "resumen";

type BootstrapResponse = {
  ok: boolean;
  role: Role;
  profile: {
    nombre?: string;
    promotor_id?: string;
    region?: string;
    cadena_principal?: string;
    external_id?: string;
  };
};

type StoreItem = {
  tienda_id: string;
  nombre_tienda: string;
  cadena: string;
  ciudad: string;
  cliente: string;
  zona: string;
};

type VisitItem = {
  visita_id: string;
  tienda_id: string;
  tienda_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  notas: string;
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

type DashboardResponse = {
  ok: boolean;
  promotor?: {
    nombre?: string;
    promotor_id?: string;
    region?: string;
    cadena_principal?: string;
    external_id?: string;
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

const MOCK_STORES: StoreItem[] = [
  {
    tienda_id: "TDA-001",
    nombre_tienda: "Bodega Aurrera San Mateo",
    cadena: "Bodega Aurrera",
    ciudad: "CDMX",
    cliente: "REZGO",
    zona: "Norte",
  },
  {
    tienda_id: "TDA-002",
    nombre_tienda: "Walmart Las Torres",
    cadena: "Walmart",
    ciudad: "CDMX",
    cliente: "REZGO",
    zona: "Centro",
  },
];

const MOCK_VISITS: VisitItem[] = [
  {
    visita_id: "V-1001",
    tienda_id: "TDA-001",
    tienda_nombre: "Bodega Aurrera San Mateo",
    fecha: "2026-03-20",
    hora_inicio: "2026-03-20T09:10:00.000Z",
    hora_fin: "",
    notas: "",
  },
];

const MOCK_GALLERY: EvidenceItem[] = [
  {
    evidencia_id: "EV-1",
    tipo_evento: "EVIDENCIA_PRECIO",
    tipo_evidencia: "Precio",
    marca_nombre: "Dove",
    riesgo: "BAJO",
    fecha_hora_fmt: "2026-03-20 09:42",
    url_foto: "https://picsum.photos/seed/rezgo1/1200/900",
    descripcion: "Referencia local.",
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

async function postJson<T>(path: string, payload: Record<string, any>, timeoutMs = 8000) {
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

export default function App() {
  const tg = getTelegramWebApp();

  const [role, setRole] = useState<Role>("promotor");
  const [actorLabel, setActorLabel] = useState("Promotor");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [logoMissing, setLogoMissing] = useState(false);

  const [stores, setStores] = useState<StoreItem[]>(MOCK_STORES);
  const [visits, setVisits] = useState<VisitItem[]>(MOCK_VISITS);
  const [gallery, setGallery] = useState<EvidenceItem[]>(MOCK_GALLERY);
  const [selectedStoreId, setSelectedStoreId] = useState(MOCK_STORES[0]?.tienda_id || "");
  const [selectedVisitId, setSelectedVisitId] = useState(MOCK_VISITS[0]?.visita_id || "");

  const [promotorModule, setPromotorModule] = useState<PromotorModule>("asistencia");
  const [supervisorModule, setSupervisorModule] = useState<SupervisorModule>("equipo");

  useEffect(() => {
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#f4f5f7");
      tg.setBackgroundColor?.("#eef1f4");
    }
  }, [tg]);

  const openVisits = useMemo(() => visits.filter((v) => !v.hora_fin), [visits]);

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

    const data = await postJson<BootstrapResponse>("/miniapp/bootstrap", {}, 8000);
    if (data?.role) setRole(data.role);
    if (data?.profile?.nombre) setActorLabel(data.profile.nombre);
  }

  async function loadRealDashboard() {
    if (role !== "promotor") return;

    try {
      setSyncing(true);
      const dashboard = await postJson<DashboardResponse>("/miniapp/promotor/dashboard", {}, 8000);
      if (dashboard?.promotor?.nombre) setActorLabel(dashboard.promotor.nombre);
      if (dashboard?.stores?.length) {
        setStores(dashboard.stores);
        setSelectedStoreId((prev) => prev || dashboard.stores?.[0]?.tienda_id || "");
      }
      if (dashboard?.openVisits) {
        setVisits(dashboard.openVisits);
        setSelectedVisitId((prev) => prev || dashboard.openVisits?.[0]?.visita_id || "");
      } else {
        setVisits([]);
      }

      const evidences = await postJson<EvidencesTodayResponse>("/miniapp/promotor/evidences-today", {}, 8000);
      if (evidences?.evidencias) {
        setGallery(evidences.evidencias.filter((item) => !!item.url_foto));
      }

      setError("");
    } catch (_err) {
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
    } catch (_err) {
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

      setSyncing(true);
      const response = await postJson<StartEntryResponse>("/miniapp/promotor/start-entry", {
        tienda_id: selectedStoreId,
      });

      const newVisit: VisitItem = {
        visita_id: response.visita_id,
        tienda_id: response.tienda_id,
        tienda_nombre: response.tienda_nombre,
        fecha: new Date().toISOString().slice(0, 10),
        hora_inicio: response.started_at,
        hora_fin: "",
        notas: "",
      };

      setVisits((prev) => [newVisit, ...prev.filter((v) => v.visita_id !== newVisit.visita_id)]);
      setSelectedVisitId(newVisit.visita_id);
      setStatusMsg(`✅ Entrada registrada en ${response.tienda_nombre}`);
      await loadRealDashboard();
    } catch (_err) {
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
    } catch (_err) {
      setStatusMsg("⚠️ No se pudo registrar la salida real.");
    } finally {
      setSyncing(false);
    }
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

  const evidenceFlow: Array<{ key: string; title: string; text: string }> = [
    { key: "visita", title: "Elegir visita activa", text: "Usar la visita abierta correcta antes de capturar." },
    { key: "marca", title: "Elegir marca", text: "Tomar marca del catálogo operativo." },
    { key: "tipo", title: "Elegir tipo", text: "Precio, promoción, competencia, anaquel u otro tipo." },
    { key: "fase", title: "Elegir fase", text: "Antes o después cuando la regla lo pida." },
    { key: "fotos", title: "Cargar fotos", text: "Subir la cantidad requerida por la regla." },
    { key: "continuar", title: "Continuar", text: "Nueva evidencia, cambiar marca o volver a menú." },
  ];

  const myEvidenceActions: Array<{ key: string; Icon: React.ElementType; title: string; text: string }> = [
    { key: "ver", Icon: FolderOpen, title: "Ver evidencia", text: "Abrir foto y detalle de la captura." },
    { key: "anular", Icon: AlertTriangle, title: "Anular", text: "Marcar evidencia como anulada con motivo." },
    { key: "reemplazar", Icon: Camera, title: "Reemplazar", text: "Subir nueva foto y ligar reemplazo." },
    { key: "nota", Icon: ListChecks, title: "Agregar nota", text: "Guardar observación operativa sobre la evidencia." },
  ];

  const supervisorCards: Array<{ key: string; Icon: React.ElementType; title: string; text: string }> = [
    { key: "equipo", Icon: Users, title: "Equipo del día", text: "Promotores, visitas activas y desempeño del turno." },
    { key: "alertas", Icon: ShieldAlert, title: "Alertas", text: "Asistencias incompletas, riesgos y pendientes." },
    { key: "evidencias", Icon: ImageIcon, title: "Evidencias", text: "Revisión operativa y visual por promotor." },
    { key: "seguimiento", Icon: ListChecks, title: "Seguimiento", text: "Casos por continuar y validaciones del supervisor." },
  ];

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
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hero">
          <div className="heroLeft">
            {!logoMissing ? (
              <div className="brandPlate brandPlateHorizontal">
                <img
                  src="/rezgo-horizontal.jpeg"
                  alt="REZGO"
                  className="brandLogoHorizontal"
                  onError={() => setLogoMissing(true)}
                />
              </div>
            ) : (
              <div className="brandWord">REZGO</div>
            )}
            <div className="heroTitle">{role === "supervisor" ? "Operación del supervisor" : "Operación del promotor"}</div>
            <div className="heroText">Pasión por la movilidad</div>
            <div className="heroMeta">{actorLabel}</div>
          </div>
        </motion.div>

        {error ? (
          <div className="card warning compactNotice">
            <div className="warningRow">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <div className="statsGrid">
          <div className="statCard">
            <div>
              <div className="statLabel">Tiendas asignadas</div>
              <div className="statValue">{summary.assignedStores}</div>
            </div>
            <div className="iconWrap greenWrap"><Store size={16} /></div>
          </div>
          <div className="statCard">
            <div>
              <div className="statLabel">Visitas abiertas</div>
              <div className="statValue">{summary.openVisits}</div>
            </div>
            <div className="iconWrap grayWrap"><UserCheck size={16} /></div>
          </div>
          <div className="statCard">
            <div>
              <div className="statLabel">Evidencias hoy</div>
              <div className="statValue">{summary.evidenciasHoy}</div>
            </div>
            <div className="iconWrap greenWrap"><ImageIcon size={16} /></div>
          </div>
          <div className="statCard">
            <div>
              <div className="statLabel">Alertas</div>
              <div className="statValue">{summary.alertas}</div>
            </div>
            <div className="iconWrap grayWrap"><ShieldAlert size={16} /></div>
          </div>
        </div>

        {role === "supervisor" ? (
          <div className="tabsBar tabsBarFour">
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
          <div className="tabsBar tabsBarFour">
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

        {role === "promotor" && promotorModule === "asistencia" ? (
          <div className="card compactCard">
            <div className="sectionTitle">Asistencia</div>
            <div className="sectionSub">Fase actual: entrada y salida reales. Próximo bloque: foto, ubicación, historial y corrección de fotos.</div>

            <div className="twoCol">
              <div className="panel">
                <label className="fieldLabel">Tienda</label>
                <select className="inputLike" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                  {stores.map((store) => (
                    <option key={store.tienda_id} value={store.tienda_id}>
                      {store.nombre_tienda}
                    </option>
                  ))}
                </select>

                <div className="actionHintRow">
                  <span className="hintChip hintLive">Entrada real</span>
                  <span className="hintChip hintLive">Salida real</span>
                  <span className="hintChip">Foto</span>
                  <span className="hintChip">Ubicación</span>
                  <span className="hintChip">Historial</span>
                  <span className="hintChip">Corregir foto</span>
                </div>

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
                      <div className="listTitle">{visit.tienda_nombre}</div>
                      <div className="listSub">Inicio: {formatHourFromIso(visit.hora_inicio)}</div>
                    </button>
                  ))}
                  {!openVisits.length ? <div className="emptyBox">No hay visitas abiertas.</div> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "evidencias" ? (
          <div className="card compactCard">
            <div className="sectionTitle">Evidencias</div>
            <div className="sectionSub">Flujo esperado del chatbot: visita activa → marca → tipo → fase → fotos → confirmación.</div>

            <div className="flowGrid">
              {evidenceFlow.map((item, index) => (
                <div className="flowCard" key={item.key}>
                  <div className="flowStep">{index + 1}</div>
                  <div>
                    <div className="flowTitle">{item.title}</div>
                    <div className="flowText">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "mis_evidencias" ? (
          <div className="card compactCard">
            <div className="sectionTitle">Mis evidencias</div>
            <div className="sectionSub">Acciones heredadas del chatbot: ver, anular, reemplazar y agregar nota.</div>

            <div className="actionGrid">
              {myEvidenceActions.map((item) => (
                <div className="actionCard" key={item.key}>
                  <div className="iconWrap grayWrap"><item.Icon size={16} /></div>
                  <div>
                    <div className="flowTitle">{item.title}</div>
                    <div className="flowText">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {role === "promotor" && promotorModule === "resumen" ? (
          <div className="card compactCard">
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
                <div className="miniTitle">Visitas activas</div>
                {openVisits.length ? (
                  openVisits.map((visit) => (
                    <div className="summaryLine" key={visit.visita_id}>
                      {visit.tienda_nombre} · <strong>{formatHourFromIso(visit.hora_inicio)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="summaryLine">No hay visitas activas.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {role === "supervisor" ? (
          <div className="card compactCard">
            <div className="sectionTitle">Supervisor</div>
            <div className="sectionSub">Estructura visual para hoy: equipo, alertas, evidencias y seguimiento. Siguiente bloque: conectar endpoints reales del supervisor.</div>
            <div className="actionGrid">
              {supervisorCards.map((item) => (
                <div className="actionCard" key={item.key}>
                  <div className="iconWrap grayWrap"><item.Icon size={16} /></div>
                  <div>
                    <div className="flowTitle">{item.title}</div>
                    <div className="flowText">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {gallery.length > 0 ? (
          <div className="card compactCard">
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
                  <div className="gallerySub">{item.marca_nombre}</div>
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
    padding: "14px 12px 28px",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
};

const globalCss = `
* { box-sizing: border-box; }
body { margin: 0; background: #eef1f4; }
button, input, select { font: inherit; }
.shell { max-width: 1180px; margin: 0 auto; }
.hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  background: linear-gradient(135deg, #f8f9fb 0%, #edf1f3 100%);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 24px;
  padding: 14px 16px;
  box-shadow: 0 10px 24px rgba(38,50,56,0.08);
}
.heroLeft { display: flex; flex-direction: column; gap: 6px; }
.brandPlate {
  background: #ffffff;
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 14px;
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 5px 14px rgba(38,50,56,0.07);
}
.brandPlateHorizontal { min-height: 52px; }
.brandLogoHorizontal { width: 170px; height: auto; display: block; object-fit: contain; }
.brandWord {
  font-size: 24px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #43a047;
}
.heroTitle {
  font-size: 18px;
  line-height: 1.1;
  font-weight: 800;
  color: #263238;
  white-space: nowrap;
}
.heroText { color: #5f6b72; font-size: 14px; }
.heroMeta { color: #78909c; font-size: 12px; }
.card {
  margin-top: 12px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 22px;
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
.statsGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.statCard {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 18px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-height: 68px;
}
.statLabel { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #607d8b; }
.statValue { margin-top: 4px; font-size: 22px; font-weight: 800; color: #263238; }
.iconWrap { border-radius: 14px; padding: 8px; }
.greenWrap { background: rgba(76,175,80,.14); color: #43a047; }
.grayWrap { background: rgba(96,125,139,.14); color: #607d8b; }
.sectionTitle { font-size: 18px; font-weight: 800; color: #263238; }
.sectionSub { margin-top: 4px; color: #607d8b; font-size: 13px; }
.tabsBar {
  margin-top: 12px;
  display: grid;
  gap: 8px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 18px;
  padding: 6px;
}
.tabsBarFour { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.tabBtn {
  border: 0; border-radius: 12px; background: transparent; color: #546e7a;
  padding: 11px 8px; cursor: pointer; font-weight: 700;
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
  border-radius: 18px; border: 1px solid rgba(38,50,56,0.08);
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
.actionHintRow {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; margin-bottom: 2px;
}
.hintChip {
  display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px;
  font-size: 11px; font-weight: 700; color: #546e7a; background: rgba(96,125,139,0.12);
}
.hintLive { background: rgba(76,175,80,.16); color: #2e7d32; }
.flowGrid, .actionGrid, .summaryGrid {
  margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
}
.flowCard, .actionCard {
  display: flex; gap: 10px; align-items: flex-start; border-radius: 16px;
  padding: 14px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08);
}
.flowStep {
  min-width: 28px; height: 28px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(76,175,80,.14); color: #2e7d32; font-weight: 800; font-size: 13px;
}
.flowTitle { font-weight: 800; color: #263238; }
.flowText { margin-top: 4px; color: #607d8b; font-size: 13px; line-height: 1.45; }
.summaryBlock {
  border-radius: 16px; padding: 14px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08);
}
.summaryLine { color: #455a64; font-size: 13px; margin-top: 8px; }
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
  .twoCol, .galleryGrid, .flowGrid, .actionGrid, .summaryGrid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .tabsBarFour { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero { flex-direction: column; }
}
`}
