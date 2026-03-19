import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Camera,
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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [stores, setStores] = useState<StoreItem[]>(MOCK_STORES);
  const [visits, setVisits] = useState<VisitItem[]>(MOCK_VISITS);
  const [gallery, setGallery] = useState<EvidenceItem[]>(MOCK_GALLERY);

  const [tab, setTab] = useState<"asistencia" | "evidencias" | "galeria">("asistencia");
  const [selectedStoreId, setSelectedStoreId] = useState(MOCK_STORES[0]?.tienda_id || "");
  const [selectedVisitId, setSelectedVisitId] = useState(MOCK_VISITS[0]?.visita_id || "");
  const [statusMsg, setStatusMsg] = useState("");
  const [logoMissing, setLogoMissing] = useState(false);

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
        fecha: new Date().toISOString().slice(0, 10),
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hero compactHero">
          <div className="heroLeft compactHeroLeft">
            <div className="brandRow compactBrandRow">
              {!logoMissing ? (
                <div className="brandPlate brandPlateSquare compactBrandPlate">
                  <img
                    src="/rezgo-square.jpeg"
                    alt="REZGO"
                    className="brandIcon"
                    onError={() => setLogoMissing(true)}
                  />
                </div>
              ) : null}
              <div>
                <div className="brandWord compactBrandWord">REZGO</div>
                <div className="heroText">Pasión por la movilidad</div>
              </div>
            </div>
            <div className="heroTitle compactTitle">Operación del promotor</div>
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

        <div className="statsGrid compactStatsGrid">
          <div className="statCard compactStatCard">
            <div>
              <div className="statLabel">Tiendas asignadas</div>
              <div className="statValue">{summary.assignedStores}</div>
            </div>
            <div className="iconWrap greenWrap compactIconWrap">
              <Store size={16} />
            </div>
          </div>

          <div className="statCard compactStatCard">
            <div>
              <div className="statLabel">Visitas abiertas</div>
              <div className="statValue">{summary.openVisits}</div>
            </div>
            <div className="iconWrap grayWrap compactIconWrap">
              <UserCheck size={16} />
            </div>
          </div>

          <div className="statCard compactStatCard">
            <div>
              <div className="statLabel">Evidencias hoy</div>
              <div className="statValue">{summary.evidenciasHoy}</div>
            </div>
            <div className="iconWrap greenWrap compactIconWrap">
              <ImageIcon size={16} />
            </div>
          </div>

          <div className="statCard compactStatCard">
            <div>
              <div className="statLabel">Alertas</div>
              <div className="statValue">{summary.alertas}</div>
            </div>
            <div className="iconWrap grayWrap compactIconWrap">
              <ShieldAlert size={16} />
            </div>
          </div>
        </div>

        <div className="tabsBar compactTabsBar">
          {[
            ["asistencia", "Asistencia"],
            ["evidencias", "Evidencias"],
            ["galeria", "Galería"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tabBtn ${tab === key ? "tabBtnActive" : ""}`}
              onClick={() => setTab(key as "asistencia" | "evidencias" | "galeria")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "asistencia" && (
          <div className="card compactCard">
            <div className="sectionTitle">Asistencia</div>
            <div className="sectionSub">La siguiente etapa es portar foto + ubicación como en WhatsApp.</div>

            <div className="twoCol compactTwoCol">
              <div className="panel compactPanel">
                <label className="fieldLabel">Tienda</label>
                <select className="inputLike" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                  {stores.map((store) => (
                    <option key={store.tienda_id} value={store.tienda_id}>
                      {store.nombre_tienda} · {store.cadena}
                    </option>
                  ))}
                </select>

                <div className="smallInfo compactInfo" style={{ marginTop: 12 }}>
                  Cliente: <strong>{stores.find((s) => s.tienda_id === selectedStoreId)?.cliente || "—"}</strong>
                  <br />
                  Ciudad: <strong>{stores.find((s) => s.tienda_id === selectedStoreId)?.ciudad || "—"}</strong>
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

              <div className="panel compactPanel">
                <div className="miniTitle">Visitas abiertas</div>
                <div className="stack compactStack">
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
                    <div className="emptyBox">No hay visitas abiertas.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "evidencias" && (
          <div className="card compactCard">
            <div className="sectionTitle">Evidencias</div>
            <div className="sectionSub">Ya se consumen evidencias reales del backend. Falta portar captura completa de fotos.</div>

            <div className="evidenceSummary">
              <div className="summaryMiniCard">
                <Camera size={16} />
                <div>
                  <div className="summaryMiniTitle">Próximo bloque</div>
                  <div className="summaryMiniText">Captura real con cámara, compresión, orden y validación.</div>
                </div>
              </div>
              <div className="summaryMiniCard">
                <ImageIcon size={16} />
                <div>
                  <div className="summaryMiniTitle">Hoy visibles</div>
                  <div className="summaryMiniText">{summary.evidenciasHoy} evidencia(s) ya consultables.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "galeria" && (
          <div className="card compactCard">
            <div className="sectionTitle">Galería</div>
            <div className="galleryGrid compactGalleryGrid">
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

        {statusMsg ? <div className="statusBar">{statusMsg}</div> : null}

        <div className="footerActions compactFooter">
          <button className="secondaryBtn footerBtn" onClick={loadRealDashboard} disabled={syncing || !!error}>
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
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 10px 24px rgba(38,50,56,0.08);
}
.compactHero { padding: 14px 16px; }
.heroLeft { display: flex; flex-direction: column; gap: 8px; }
.compactHeroLeft { gap: 6px; }
.brandRow {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.compactBrandRow { gap: 10px; }
.brandPlate {
  background: #ffffff;
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 16px;
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 5px 14px rgba(38,50,56,0.07);
}
.brandPlateSquare {
  width: 64px;
  height: 64px;
  justify-content: center;
  padding: 6px;
}
.compactBrandPlate { width: 58px; height: 58px; }
.brandIcon { width: 46px; height: 46px; object-fit: contain; display: block; }
.brandWord {
  font-size: 30px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #43a047;
}
.compactBrandWord { font-size: 28px; }
.heroTitle {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
  color: #263238;
  margin-top: 2px;
}
.compactTitle {
  font-size: 18px;
  line-height: 1.1;
  white-space: nowrap;
}
.heroText { color: #5f6b72; font-size: 14px; max-width: 700px; }
.badgeRow { display: none; }
.card {
  margin-top: 12px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 10px 22px rgba(38,50,56,0.07);
}
.compactCard { padding: 14px; }
.loadingCard { background: rgba(255,255,255,0.95); }
.warning { background: rgba(255,244,229,0.96); border-color: rgba(245,158,11,0.25); }
.compactNotice { padding: 14px 16px; }
.warningRow, .loadingRow {
  display: flex; align-items: center; gap: 10px; color: #263238;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
.statsGrid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;
}
.compactStatsGrid { gap: 10px; }
.statCard {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 20px;
  padding: 14px;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  min-height: 86px;
}
.compactStatCard { min-height: 76px; padding: 12px 14px; }
.statLabel { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #607d8b; }
.statValue { margin-top: 4px; font-size: 26px; font-weight: 800; color: #263238; }
.iconWrap { border-radius: 16px; padding: 10px; }
.compactIconWrap { padding: 9px; }
.greenWrap { background: rgba(76,175,80,.14); color: #43a047; }
.grayWrap { background: rgba(96,125,139,.14); color: #607d8b; }
.sectionTitle { font-size: 18px; font-weight: 800; color: #263238; }
.sectionSub { margin-top: 4px; color: #607d8b; font-size: 13px; }
.tabsBar {
  margin-top: 12px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(38,50,56,0.08);
  border-radius: 18px;
  padding: 6px;
}
.compactTabsBar { margin-top: 12px; }
.tabBtn {
  border: 0; border-radius: 12px; background: transparent; color: #546e7a;
  padding: 11px 8px; cursor: pointer; font-weight: 700;
}
.tabBtnActive { background: rgba(76,175,80,.14); color: #2e7d32; }
.twoCol {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px;
}
.compactTwoCol { gap: 12px; }
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
.compactPanel { padding: 14px; }
.smallInfo {
  border-radius: 12px; background: rgba(96,125,139,0.08); color: #455a64; padding: 10px 12px; font-size: 13px;
}
.compactInfo { font-size: 12px; }
.fieldLabel {
  margin-bottom: 6px; display: block; font-size: 13px; color: #546e7a;
}
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
.evidenceSummary {
  margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.summaryMiniCard {
  display: flex; gap: 10px; align-items: flex-start; border-radius: 16px;
  padding: 14px; background: rgba(248,249,251,0.95); border: 1px solid rgba(38,50,56,0.08);
}
.summaryMiniTitle { font-weight: 800; color: #263238; }
.summaryMiniText { margin-top: 4px; color: #607d8b; font-size: 13px; }
.galleryGrid {
  margin-top: 14px;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
}
.compactGalleryGrid { gap: 12px; }
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
.compactFooter { margin-top: 10px; }
.footerBtn { width: auto; min-width: 160px; }
@media (max-width: 900px) {
  .twoCol, .galleryGrid, .evidenceSummary { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .statsGrid, .tabsBar { grid-template-columns: 1fr; }
  .hero { flex-direction: column; }
  .compactTitle { white-space: normal; }
  .brandWord { font-size: 24px; }
}
`;
