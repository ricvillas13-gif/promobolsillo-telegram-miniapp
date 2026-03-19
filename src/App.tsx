import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,  UserCheck,
  ShieldAlert,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Role = "promotor" | "supervisor" | "cliente";

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
  telegramUser?: {
    id?: number;
    first_name?: string;
    username?: string;
  };
  serverTime?: string;
  today?: string;
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
  summary?: {
    assignedStores: number;
    openVisits: number;
    evidenciasHoy: number;
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
    fecha: "2026-03-19",
    hora_inicio: "2026-03-19T09:10:00.000Z",
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
    fecha_hora_fmt: "2026-03-19 09:42",
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: getInitData(),
        ...payload,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}`);
    }

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
  const [promotorName, setPromotorName] = useState("Promotor");
  const [today, setToday] = useState("2026-03-19");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const [stores, setStores] = useState<StoreItem[]>(MOCK_STORES);
  const [visits, setVisits] = useState<VisitItem[]>(MOCK_VISITS);
  const [gallery, setGallery] = useState<EvidenceItem[]>(MOCK_GALLERY);

  const [tab, setTab] = useState("asistencia");
  const [selectedStoreId, setSelectedStoreId] = useState(MOCK_STORES[0]?.tienda_id || "");
  const [selectedVisitId, setSelectedVisitId] = useState(MOCK_VISITS[0]?.visita_id || "");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#f4f5f7");
      tg.setBackgroundColor?.("#eef1f4");
    }
  }, [tg]);

  const summary = useMemo(() => {
    return {
      assignedStores: stores.length,
      openVisits: visits.filter((v) => !v.hora_fin).length,
      evidenciasHoy: gallery.length,
      alertas: gallery.filter((g) => g.riesgo === "ALTO" || g.riesgo === "MEDIO").length,
    };
  }, [stores, visits, gallery]);

  async function loadBootstrap() {
    const initData = getInitData();

    if (!initData) {
      setError("Vista local de referencia. Abre la Mini App desde Telegram para usar la operación en línea.");
      setLoading(false);
      return;
    }

    const data = await postJson<BootstrapResponse>("/miniapp/bootstrap", {}, 8000);
    if (data?.role) setRole(data.role);
    if (data?.profile?.nombre) setPromotorName(data.profile.nombre);
    if (data?.today) setToday(data.today);
  }

  async function loadRealDashboard() {
    if (role !== "promotor") return;

    try {
      setSyncing(true);
      const dashboard = await postJson<DashboardResponse>("/miniapp/promotor/dashboard", {}, 8000);
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
      setInfoMsg("Operación conectada a datos reales.");
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
      setInfoMsg("");
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

      const initData = getInitData();
      if (!initData) {
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
        fecha: today,
        hora_inicio: response.started_at,
        hora_fin: "",
        notas: "",
      };

      setVisits((prev) => [newVisit, ...prev.filter((v) => v.visita_id !== newVisit.visita_id)]);
      setSelectedVisitId(newVisit.visita_id);
      setStatusMsg(`✅ Entrada real registrada en ${response.tienda_nombre}`);
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

      const initData = getInitData();
      if (!initData) {
        setStatusMsg("⚠️ Esta acción real solo funciona desde Telegram.");
        return;
      }

      setSyncing(true);
      await postJson<CloseVisitResponse>("/miniapp/promotor/close-visit", {
        visita_id: selectedVisitId,
      });

      setStatusMsg("✅ Salida real registrada correctamente.");
      await loadRealDashboard();
    } catch (_err) {
      setStatusMsg("⚠️ No se pudo registrar la salida real.");
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
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="hero">
          <div className="heroLeft">
            <div className="brandPlate">
              <img src="/rezgo-horizontal.jpeg" alt="REZGO" className="brandLogo" />
            </div>
            <div className="heroTitle">Operación del promotor</div>
            <div className="heroText">Seguimiento operativo en campo</div>
          </div>

          <div className="badgeRow">
            <span className="badge badgeLight">{promotorName}</span>
            <span className="badge badgeGreen">Rol: {role}</span>
            <span className="badge badgeDark">{today}</span>
          </div>
        </motion.div>

        {error ? (
          <div className="card warning">
            <div className="warningRow">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        {infoMsg ? (
          <div className="card infoCard">
            <div className="infoRow">
              <CheckCircle2 size={18} />
              <span>{infoMsg}</span>
            </div>
          </div>
        ) : null}

        <div className="statsGrid">
          <div className="statCard">
            <div>
              <div className="statLabel">Tiendas asignadas</div>
              <div className="statValue">{summary.assignedStores}</div>
              <div className="statSub">Catálogo operativo activo</div>
            </div>
            <div className="iconWrap greenWrap">
              <Store size={18} />
            </div>
          </div>

          <div className="statCard">
            <div>
              <div className="statLabel">Visitas abiertas</div>
              <div className="statValue">{summary.openVisits}</div>
              <div className="statSub">Seguimiento del día</div>
            </div>
            <div className="iconWrap grayWrap">
              <UserCheck size={18} />
            </div>
          </div>

          <div className="statCard">
            <div>
              <div className="statLabel">Evidencias hoy</div>
              <div className="statValue">{summary.evidenciasHoy}</div>
              <div className="statSub">Registro fotográfico</div>
            </div>
            <div className="iconWrap greenWrap">
              <ImageIcon size={18} />
            </div>
          </div>

          <div className="statCard">
            <div>
              <div className="statLabel">Alertas</div>
              <div className="statValue">{summary.alertas}</div>
              <div className="statSub">Riesgo medio / alto</div>
            </div>
            <div className="iconWrap grayWrap">
              <ShieldAlert size={18} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="sectionTop">
            <div>
              <div className="sectionTitle">Avance operativo del día</div>
              <div className="sectionSub">Seguimiento visual de la actividad del día.</div>
            </div>
            <div className="progressPct">{Math.min(100, summary.openVisits * 35)}%</div>
          </div>
          <div className="progressBar">
            <div className="progressFill" style={{ width: `${Math.min(100, summary.openVisits * 35)}%` }} />
          </div>
        </div>

        <div className="tabsBar">
          {[
            ["asistencia", "Asistencia"],
            ["galeria", "Galería"],
            ["beneficios", "Beneficios"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tabBtn ${tab === key ? "tabBtnActive" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "asistencia" && (
          <div className="card">
            <div className="sectionTitle">Entrada / salida guiada</div>
            <div className="sectionSub">Registro estructurado por tienda y visita activa.</div>

            <div className="twoCol">
              <div>
                <div className="miniTitle">Selecciona tienda</div>
                <div className="stack">
                  {stores.map((store) => (
                    <button
                      key={store.tienda_id}
                      onClick={() => setSelectedStoreId(store.tienda_id)}
                      className={`listBtn ${selectedStoreId === store.tienda_id ? "listBtnSelected" : ""}`}
                    >
                      <div className="listTitle">{store.nombre_tienda}</div>
                      <div className="listSub">
                        {store.cadena} · {store.ciudad} · {store.cliente}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="miniTitle">Acciones reales</div>
                <div className="panel">
                  <div className="smallInfo">
                    Tienda seleccionada:{" "}
                    <strong>{stores.find((s) => s.tienda_id === selectedStoreId)?.nombre_tienda || "—"}</strong>
                  </div>

                  <button className="primaryBtn" onClick={createEntry} disabled={syncing}>
                    <MapPin size={16} />
                    {syncing ? "Procesando..." : "Registrar entrada"}
                  </button>

                  <div className="smallInfo">Visitas abiertas:</div>

                  <div className="stack">
                    {visits.filter((v) => !v.hora_fin).map((visit) => (
                      <button
                        key={visit.visita_id}
                        onClick={() => setSelectedVisitId(visit.visita_id)}
                        className={`listBtn ${selectedVisitId === visit.visita_id ? "listBtnGreen" : ""}`}
                      >
                        <div className="listTitle">{visit.tienda_nombre}</div>
                        <div className="listSub">Inicio: {formatHourFromIso(visit.hora_inicio)}</div>
                      </button>
                    ))}
                    {!visits.filter((v) => !v.hora_fin).length ? (
                      <div className="emptyBox">No hay visitas abiertas en este momento.</div>
                    ) : null}
                  </div>

                  <button className="secondaryBtn" onClick={closeVisit} disabled={syncing}>
                    <CheckCircle2 size={16} />
                    {syncing ? "Procesando..." : "Registrar salida"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "galeria" && (
          <div className="card">
            <div className="sectionTitle">Galería del día</div>
            <div className="sectionSub">Consulta real de evidencias disponibles con imagen.</div>

            <div className="galleryGrid">
              {gallery.map((item) => (
                <div className="galleryCard" key={item.evidencia_id}>
                  <div className="imageFrame">
                    <img src={item.url_foto} alt={item.tipo_evidencia} className="img" />
                  </div>
                  <div className="galleryTop">
                    <div className="galleryTitle">{item.tipo_evidencia || item.tipo_evento}</div>
                    <span
                      className={`riskBadge ${
                        item.riesgo === "ALTO"
                          ? "riskRed"
                          : item.riesgo === "MEDIO"
                          ? "riskAmber"
                          : "riskGreen"
                      }`}
                    >
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
        )}

        {tab === "beneficios" && (
          <div className="card">
            <div className="sectionTitle">Beneficios operativos</div>
            <div className="benefitsGrid">
              {[
                ["Datos reales", "La Mini App ya consume bootstrap, dashboard y galería desde backend."],
                ["Mejor lectura", "La interfaz usa branding REZGO y una paleta más cercana a su identidad."],
                ["Menos error operativo", "Entrada y salida ya pueden disparar acciones reales desde Telegram."],
                ["Escalabilidad", "La base puede seguir creciendo hacia supervisor, cliente y expediente."],
              ].map(([title, description]) => (
                <div className="benefitCard" key={title}>
                  <div className="benefitTitle">{title}</div>
                  <div className="benefitDesc">{description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {statusMsg ? <div className="statusBar">{statusMsg}</div> : null}

        <div className="footerActions">
          <button className="secondaryBtn footerBtn" onClick={loadRealDashboard} disabled={syncing || !!error}>
            <RefreshCw size={16} />
            {syncing ? "Sincronizando..." : "Recargar datos reales"}
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
    padding: "20px 16px 40px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
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
  border-radius: 28px;
  padding: 22px;
  box-shadow: 0 12px 30px rgba(38,50,56,0.10);
}
.heroLeft { display: flex; flex-direction: column; gap: 12px; }
.brandPlate {
  background: #ffffff;
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 18px;
  padding: 12px 16px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 6px 18px rgba(38,50,56,0.08);
}
.brandLogo { width: 230px; max-width: 100%; height: auto; display: block; }
.heroTitle { font-size: 34px; line-height: 1.1; font-weight: 800; color: #263238; }
.heroText { color: #5f6b72; font-size: 15px; max-width: 700px; }
.badgeRow { display: flex; flex-wrap: wrap; gap: 8px; }
.badge {
  display: inline-flex; align-items: center; border-radius: 999px; padding: 9px 14px;
  font-size: 13px; font-weight: 700;
}
.badgeLight { background: rgba(76,175,80,.12); color: #2e7d32; }
.badgeGreen { background: rgba(76,175,80,.18); color: #2e7d32; }
.badgeDark { background: rgba(96,125,139,.16); color: #455a64; }
.card {
  margin-top: 16px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 26px;
  padding: 18px;
  box-shadow: 0 12px 28px rgba(38,50,56,0.08);
}
.loadingCard { background: rgba(255,255,255,0.95); }
.warning { background: rgba(255,244,229,0.96); border-color: rgba(245,158,11,0.25); }
.infoCard { background: rgba(232,245,233,0.96); border-color: rgba(76,175,80,0.28); }
.warningRow, .loadingRow, .infoRow {
  display: flex; align-items: center; gap: 10px; color: #263238;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
.statsGrid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px;
}
.statCard {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 24px;
  padding: 18px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
}
.statLabel { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #607d8b; }
.statValue { margin-top: 8px; font-size: 30px; font-weight: 800; color: #263238; }
.statSub { margin-top: 6px; color: #607d8b; font-size: 14px; }
.iconWrap { border-radius: 18px; padding: 12px; }
.greenWrap { background: rgba(76,175,80,.14); color: #43a047; }
.grayWrap { background: rgba(96,125,139,.14); color: #607d8b; }
.sectionTop { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.sectionTitle { font-size: 22px; font-weight: 800; color: #263238; }
.sectionSub { margin-top: 6px; color: #607d8b; font-size: 14px; }
.progressPct { font-size: 24px; color: #43a047; font-weight: 800; }
.progressBar {
  margin-top: 14px; width: 100%; height: 12px; background: rgba(96,125,139,0.14);
  border-radius: 999px; overflow: hidden;
}
.progressFill {
  height: 100%; background: linear-gradient(90deg, #66bb6a, #43a047);
  border-radius: 999px;
}
.tabsBar {
  margin-top: 16px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 20px;
  padding: 8px;
}
.tabBtn {
  border: 0; border-radius: 14px; background: transparent; color: #546e7a;
  padding: 12px 10px; cursor: pointer; font-weight: 700;
}
.tabBtnActive { background: rgba(76,175,80,.14); color: #2e7d32; }
.twoCol {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 18px;
}
.miniTitle { font-size: 16px; font-weight: 800; margin-bottom: 12px; color: #263238; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.listBtn {
  width: 100%; text-align: left; border-radius: 18px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96); padding: 14px; color: #263238; cursor: pointer;
}
.listBtnSelected { border-color: rgba(76,175,80,.45); background: rgba(232,245,233,0.95); }
.listBtnGreen { border-color: rgba(76,175,80,.45); background: rgba(232,245,233,0.95); }
.listTitle { font-weight: 800; }
.listSub { margin-top: 5px; color: #607d8b; font-size: 13px; }
.panel {
  border-radius: 22px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(248,249,251,0.95); padding: 16px;
}
.smallInfo {
  border-radius: 14px; background: rgba(96,125,139,0.08); color: #455a64; padding: 12px; font-size: 14px;
}
.primaryBtn, .secondaryBtn {
  margin-top: 12px; width: 100%; border: 0; border-radius: 16px; padding: 14px 16px;
  display: inline-flex; justify-content: center; align-items: center; gap: 8px;
  font-weight: 800; cursor: pointer;
}
.primaryBtn { background: #4caf50; color: white; }
.secondaryBtn { background: #eceff1; color: #37474f; }
.primaryBtn:disabled, .secondaryBtn:disabled { opacity: 0.7; cursor: not-allowed; }
.emptyBox {
  padding: 14px; border-radius: 14px; background: rgba(96,125,139,0.08); color: #607d8b; font-size: 14px;
}
.galleryGrid {
  margin-top: 18px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.galleryCard {
  border-radius: 22px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96); padding: 14px;
}
.imageFrame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 16px;
  background: #dfe5e8;
}
.img { width: 100%; height: 100%; object-fit: cover; display: block; }
.galleryTop {
  margin-top: 12px; display: flex; justify-content: space-between; gap: 8px; align-items: center;
}
.galleryTitle { font-weight: 800; color: #263238; }
.gallerySub { margin-top: 4px; color: #607d8b; font-size: 14px; }
.galleryDate { margin-top: 4px; color: #78909c; font-size: 12px; }
.galleryDesc { margin-top: 10px; color: #455a64; font-size: 14px; line-height: 1.45; }
.riskBadge {
  border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 800;
}
.riskRed { background: rgba(239,68,68,.14); color: #d32f2f; }
.riskAmber { background: rgba(245,158,11,.14); color: #ed6c02; }
.riskGreen { background: rgba(76,175,80,.14); color: #2e7d32; }
.benefitsGrid {
  margin-top: 16px;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
}
.benefitCard {
  border-radius: 20px; border: 1px solid rgba(38,50,56,0.08);
  background: rgba(255,255,255,0.96); padding: 16px;
}
.benefitTitle { font-weight: 800; color: #263238; }
.benefitDesc { margin-top: 8px; color: #607d8b; font-size: 14px; line-height: 1.55; }
.statusBar {
  margin-top: 16px; border-radius: 18px; padding: 14px 16px;
  background: rgba(232,245,233,0.96); color: #2e7d32; border: 1px solid rgba(76,175,80,0.20);
  font-weight: 700;
}
.footerActions { margin-top: 16px; display: flex; justify-content: flex-end; }
.footerBtn { width: auto; min-width: 220px; }
@media (max-width: 1100px) {
  .statsGrid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 980px) {
  .galleryGrid, .twoCol, .benefitsGrid, .tabsBar, .statsGrid { grid-template-columns: 1fr; }
  .hero { flex-direction: column; }
}
`;
