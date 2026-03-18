import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ClipboardList,
  UserCheck,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Role = "promotor" | "supervisor" | "cliente";

type BootstrapV1 = {
  ok: boolean;
  actor?: {
    role: Role;
    profile: {
      nombre?: string;
      promotor_id?: string;
      region?: string;
      cadena_principal?: string;
      externalId?: string;
    };
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

const API_BASE = "https://promobolsillo-telegram.onrender.com";

const MOCK_STORES: StoreItem[] = [
  {
    tienda_id: "TDA-001",
    nombre_tienda: "Bodega Aurrera San Mateo",
    cadena: "Bodega Aurrera",
    ciudad: "CDMX",
    cliente: "Unilever",
    zona: "Norte",
  },
  {
    tienda_id: "TDA-002",
    nombre_tienda: "Walmart Las Torres",
    cadena: "Walmart",
    ciudad: "CDMX",
    cliente: "Nestlé",
    zona: "Centro",
  },
  {
    tienda_id: "TDA-003",
    nombre_tienda: "Soriana Plaza Central",
    cadena: "Soriana",
    ciudad: "CDMX",
    cliente: "P&G",
    zona: "Oriente",
  },
];

const MOCK_VISITS: VisitItem[] = [
  {
    visita_id: "V-1001",
    tienda_id: "TDA-001",
    tienda_nombre: "Bodega Aurrera San Mateo",
    fecha: "2026-03-17",
    hora_inicio: "2026-03-17T09:10:00.000Z",
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
    fecha_hora_fmt: "2026-03-17 09:42",
    url_foto: "https://picsum.photos/seed/promo1/1200/900",
    descripcion: "Precio visible en anaquel principal.",
  },
  {
    evidencia_id: "EV-2",
    tipo_evento: "EVIDENCIA_COMPETENCIA",
    tipo_evidencia: "Competencia",
    marca_nombre: "Axe",
    riesgo: "MEDIO",
    fecha_hora_fmt: "2026-03-17 09:46",
    url_foto: "https://picsum.photos/seed/promo2/1200/900",
    descripcion: "Competencia ocupando espacio lateral.",
  },
  {
    evidencia_id: "EV-3",
    tipo_evento: "EVIDENCIA_PROMOCION",
    tipo_evidencia: "Promoción",
    marca_nombre: "Rexona",
    riesgo: "BAJO",
    fecha_hora_fmt: "2026-03-17 09:50",
    url_foto: "https://picsum.photos/seed/promo3/1200/900",
    descripcion: "Material POP colocado y visible.",
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

async function postJson<T>(path: string, payload: Record<string, any>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      initData: getInitData(),
      ...payload,
    }),
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}`);
  }

  return (await res.json()) as T;
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
  const [today, setToday] = useState("2026-03-17");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stores] = useState<StoreItem[]>(MOCK_STORES);
  const [visits, setVisits] = useState<VisitItem[]>(MOCK_VISITS);
  const [gallery, setGallery] = useState<EvidenceItem[]>(MOCK_GALLERY);

  const [tab, setTab] = useState("asistencia");
  const [selectedStoreId, setSelectedStoreId] = useState(MOCK_STORES[0]?.tienda_id || "");
  const [selectedVisitId, setSelectedVisitId] = useState(MOCK_VISITS[0]?.visita_id || "");
  const [selectedBrand, setSelectedBrand] = useState("Dove");
  const [selectedType, setSelectedType] = useState("Precio");
  const [selectedPhase, setSelectedPhase] = useState("NA");
  const [notes, setNotes] = useState("");
  const [uploadCount, setUploadCount] = useState(1);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      tg.setHeaderColor?.("#0f172a");
      tg.setBackgroundColor?.("#020617");
    }
  }, [tg]);

  async function loadBootstrap() {
    try {
      setLoading(true);
      setError("");

      const data = await postJson<BootstrapV1>("/miniapp/bootstrap", {});

      if (data?.actor?.role) setRole(data.actor.role);
      if (data?.actor?.profile?.nombre) setPromotorName(data.actor.profile.nombre);
      if (data?.today) setToday(data.today);
    } catch (_err) {
      setError("No se pudo leer /miniapp/bootstrap. Se cargó en modo demo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBootstrap();
  }, []);

  const openVisits = useMemo(() => visits.filter((v) => !v.hora_fin), [visits]);

  const summary = useMemo(() => {
    return {
      assignedStores: stores.length,
      openVisits: openVisits.length,
      evidenciasHoy: gallery.length,
    };
  }, [stores, openVisits, gallery]);

  function createEntry() {
    if (!selectedStoreId) return;
    const store = stores.find((s) => s.tienda_id === selectedStoreId);
    if (!store) return;

    const duplicated = visits.find((v) => v.tienda_id === selectedStoreId && !v.hora_fin);
    if (duplicated) {
      setStatusMsg("⚠️ Ya existe una visita abierta en esa tienda.");
      return;
    }

    const newVisit: VisitItem = {
      visita_id: `V-${Date.now()}`,
      tienda_id: store.tienda_id,
      tienda_nombre: store.nombre_tienda,
      fecha: today,
      hora_inicio: new Date().toISOString(),
      hora_fin: "",
      notas: "",
    };

    setVisits((prev) => [newVisit, ...prev]);
    setSelectedVisitId(newVisit.visita_id);
    setStatusMsg(`✅ Entrada registrada en ${store.nombre_tienda}`);
  }

  function closeVisit() {
    if (!selectedVisitId) {
      setStatusMsg("⚠️ Selecciona una visita abierta.");
      return;
    }

    setVisits((prev) =>
      prev.map((visit) =>
        visit.visita_id === selectedVisitId
          ? { ...visit, hora_fin: new Date().toISOString() }
          : visit
      )
    );

    setStatusMsg("✅ Salida registrada correctamente.");
  }

  function registerEvidence() {
    if (!selectedVisitId) {
      setStatusMsg("⚠️ Selecciona una visita.");
      return;
    }

    const newItems: EvidenceItem[] = Array.from({ length: uploadCount }).map((_, idx) => ({
      evidencia_id: `EV-${Date.now()}-${idx + 1}`,
      tipo_evento: `EVIDENCIA_${selectedType.toUpperCase()}`,
      tipo_evidencia: selectedType,
      marca_nombre: selectedBrand,
      riesgo: idx === 0 ? "BAJO" : "MEDIO",
      fecha_hora_fmt: new Date().toLocaleString("es-MX"),
      url_foto: `https://picsum.photos/seed/${Date.now()}-${idx}/1200/900`,
      descripcion: notes || `Captura registrada para ${selectedType}`,
    }));

    setGallery((prev) => [...newItems, ...prev]);
    setNotes("");
    setUploadCount(1);
    setSelectedPhase("NA");
    setStatusMsg(`✅ Se registraron ${newItems.length} evidencia(s).`);
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div className="shell">
          <div className="card">
            <div className="loadingRow">
              <RefreshCw className="spin" size={18} />
              <span>Cargando Mini App…</span>
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
          <div>
            <div className="eyebrow">PROMOBOLSILLO+ · TELEGRAM MINI APP</div>
            <div className="heroTitle">Operación del promotor mejor que WhatsApp</div>
            <div className="heroText">
              Flujo guiado, captura estructurada, menos caos en chat y base lista para crecer.
            </div>
          </div>

          <div className="badgeRow">
            <span className="badge badgeSky">{promotorName}</span>
            <span className="badge badgeGreen">Rol: {role}</span>
            <span className="badge badgeWhite">{today}</span>
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

        <div className="statsGrid">
          <div className="statCard">
            <div>
              <div className="statLabel">Tiendas asignadas</div>
              <div className="statValue">{summary.assignedStores}</div>
              <div className="statSub">Catálogo operativo activo</div>
            </div>
            <div className="iconWrap">
              <Store size={18} />
            </div>
          </div>

          <div className="statCard">
            <div>
              <div className="statLabel">Visitas abiertas</div>
              <div className="statValue">{summary.openVisits}</div>
              <div className="statSub">Seguimiento del día</div>
            </div>
            <div className="iconWrap">
              <UserCheck size={18} />
            </div>
          </div>

          <div className="statCard">
            <div>
              <div className="statLabel">Evidencias hoy</div>
              <div className="statValue">{summary.evidenciasHoy}</div>
              <div className="statSub">Registro fotográfico</div>
            </div>
            <div className="iconWrap">
              <ImageIcon size={18} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="sectionTop">
            <div>
              <div className="sectionTitle">Avance operativo del día</div>
              <div className="sectionSub">Aquí puedes ver lo que en WhatsApp se pierde entre mensajes.</div>
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
            ["evidencias", "Evidencias"],
            ["galeria", "Galería"],
            ["mejoras", "Mejoras vs WhatsApp"],
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
            <div className="sectionSub">
              La Mini App evita búsquedas confusas por texto y mezcla de tiendas activas.
            </div>

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
                <div className="miniTitle">Acciones</div>
                <div className="panel">
                  <div className="smallInfo">
                    Tienda seleccionada:{" "}
                    <strong>{stores.find((s) => s.tienda_id === selectedStoreId)?.nombre_tienda || "—"}</strong>
                  </div>

                  <button className="primaryBtn" onClick={createEntry}>
                    <MapPin size={16} />
                    Registrar entrada
                  </button>

                  <div className="smallInfo">
                    Visitas abiertas:
                  </div>

                  <div className="stack">
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
                    {!openVisits.length ? (
                      <div className="emptyBox">No hay visitas abiertas en este momento.</div>
                    ) : null}
                  </div>

                  <button className="secondaryBtn" onClick={closeVisit}>
                    <CheckCircle2 size={16} />
                    Registrar salida
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "evidencias" && (
          <div className="card">
            <div className="sectionTitle">Captura guiada de evidencias</div>
            <div className="sectionSub">
              La evidencia ya no nace como foto suelta en chat: queda ligada a visita, marca y tipo.
            </div>

            <div className="twoCol">
              <div className="panel">
                <div className="miniTitle">Configuración</div>

                <label className="fieldLabel">Visita</label>
                <select className="inputLike" value={selectedVisitId} onChange={(e) => setSelectedVisitId(e.target.value)}>
                  {openVisits.map((visit) => (
                    <option key={visit.visita_id} value={visit.visita_id}>
                      {visit.tienda_nombre}
                    </option>
                  ))}
                </select>

                <label className="fieldLabel">Marca</label>
                <select className="inputLike" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                  <option>Dove</option>
                  <option>Axe</option>
                  <option>Rexona</option>
                  <option>Sedal</option>
                </select>

                <label className="fieldLabel">Tipo de evidencia</label>
                <select className="inputLike" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option>Precio</option>
                  <option>Competencia</option>
                  <option>Promoción</option>
                  <option>Anaquel</option>
                </select>

                <label className="fieldLabel">Fase</label>
                <select className="inputLike" value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)}>
                  <option value="NA">No aplica</option>
                  <option value="ANTES">Antes</option>
                  <option value="DESPUES">Después</option>
                </select>
              </div>

              <div className="panel">
                <div className="miniTitle">Carga simulada</div>

                <div className="uploadBox">
                  <Camera size={18} />
                  <div>
                    <div className="uploadTitle">Siguiente paso real</div>
                    <div className="uploadSub">
                      Aquí conectaremos cámara, compresión y subida ordenada al backend.
                    </div>
                  </div>
                </div>

                <label className="fieldLabel">Cantidad de fotos</label>
                <input
                  className="inputLike"
                  type="number"
                  min={1}
                  value={uploadCount}
                  onChange={(e) => setUploadCount(Math.max(1, Number(e.target.value || 1)))}
                />

                <label className="fieldLabel">Observación</label>
                <input
                  className="inputLike"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Cabecera completa, competencia lateral..."
                />

                <button className="greenBtn" onClick={registerEvidence}>
                  <ClipboardList size={16} />
                  Registrar evidencia
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "galeria" && (
          <div className="card">
            <div className="sectionTitle">Galería del día</div>
            <div className="sectionSub">
              Revisión visual rápida de lo que ya quedó cargado.
            </div>

            <div className="galleryGrid">
              {gallery.map((item) => (
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
        )}

        {tab === "mejoras" && (
          <div className="card">
            <div className="sectionTitle">Por qué esto mejora WhatsApp</div>
            <div className="benefitsGrid">
              {[
                ["Selección estructurada", "Ya no dependes de recordar comandos dentro de un chat largo."],
                ["Captura guiada", "La evidencia queda ligada a visita, marca, tipo y fase."],
                ["Menos errores", "Se evita enviar texto donde iba una foto o mezclar tiendas."],
                ["Galería útil", "El promotor y luego el supervisor pueden revisar visualmente la carga."],
                ["Escalabilidad", "La misma base se puede extender a supervisor, cliente y expediente."],
                ["Control de imagen", "La Mini App puede controlar peso, compresión y orden de envío."],
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
          <button className="secondaryBtn" onClick={loadBootstrap}>
            <RefreshCw size={16} />
            Recargar datos
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "#fff",
    padding: "20px 16px 40px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
};

const globalCss = `
* { box-sizing: border-box; }
body { margin: 0; background: #020617; }
button, input, select { font: inherit; }
.shell { max-width: 1180px; margin: 0 auto; }
.hero {
  display: flex; justify-content: space-between; gap: 18px; align-items: flex-start;
  background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 28px; padding: 22px; box-shadow: 0 20px 50px rgba(0,0,0,0.35);
}
.eyebrow {
  font-size: 11px; letter-spacing: .22em; color: #38bdf8; font-weight: 700;
}
.heroTitle {
  margin-top: 10px; font-size: 30px; line-height: 1.15; font-weight: 800;
}
.heroText {
  margin-top: 10px; color: #94a3b8; font-size: 14px; max-width: 700px;
}
.badgeRow { display: flex; flex-wrap: wrap; gap: 8px; }
.badge {
  display: inline-flex; align-items: center; border-radius: 999px; padding: 8px 12px;
  font-size: 13px; font-weight: 600;
}
.badgeSky { background: rgba(14,165,233,.14); color: #7dd3fc; }
.badgeGreen { background: rgba(16,185,129,.14); color: #86efac; }
.badgeWhite { background: rgba(255,255,255,.08); color: #e2e8f0; }

.card {
  margin-top: 16px;
  background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 26px;
  padding: 18px;
  box-shadow: 0 18px 40px rgba(0,0,0,0.26);
}
.warning { background: rgba(245, 158, 11, 0.10); border-color: rgba(245, 158, 11, 0.2); }
.warningRow, .loadingRow {
  display: flex; align-items: center; gap: 10px; color: #f8fafc;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }

.statsGrid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;
}
.statCard {
  background: rgba(15,23,42,.84);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 18px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
}
.statLabel { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #94a3b8; }
.statValue { margin-top: 8px; font-size: 28px; font-weight: 800; }
.statSub { margin-top: 6px; color: #94a3b8; font-size: 14px; }
.iconWrap {
  border-radius: 18px; background: rgba(14,165,233,.12); color: #7dd3fc; padding: 12px;
}

.sectionTop { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.sectionTitle { font-size: 20px; font-weight: 700; }
.sectionSub { margin-top: 6px; color: #94a3b8; font-size: 14px; }
.progressPct { font-size: 24px; color: #7dd3fc; font-weight: 800; }
.progressBar {
  margin-top: 14px; width: 100%; height: 12px; background: rgba(255,255,255,0.08);
  border-radius: 999px; overflow: hidden;
}
.progressFill {
  height: 100%; background: linear-gradient(90deg, #0ea5e9, #38bdf8);
  border-radius: 999px;
}

.tabsBar {
  margin-top: 16px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  background: rgba(15,23,42,.84);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 8px;
}
.tabBtn {
  border: 0; border-radius: 14px; background: transparent; color: #cbd5e1;
  padding: 12px 10px; cursor: pointer; font-weight: 600;
}
.tabBtnActive {
  background: rgba(14,165,233,.16); color: white;
}

.twoCol {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 18px;
}
.miniTitle { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.listBtn {
  width: 100%; text-align: left; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(2,6,23,.55); padding: 14px; color: white; cursor: pointer;
}
.listBtnSelected { border-color: rgba(56,189,248,.45); background: rgba(14,165,233,.12); }
.listBtnGreen { border-color: rgba(16,185,129,.45); background: rgba(16,185,129,.12); }
.listTitle { font-weight: 700; }
.listSub { margin-top: 5px; color: #94a3b8; font-size: 13px; }
.panel {
  border-radius: 22px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(2,6,23,.48); padding: 16px;
}
.smallInfo {
  border-radius: 14px; background: rgba(255,255,255,.05); color: #cbd5e1; padding: 12px; font-size: 14px;
}
.primaryBtn, .secondaryBtn, .greenBtn {
  margin-top: 12px; width: 100%; border: 0; border-radius: 16px; padding: 14px 16px;
  display: inline-flex; justify-content: center; align-items: center; gap: 8px;
  font-weight: 700; cursor: pointer;
}
.primaryBtn { background: #0ea5e9; color: white; }
.secondaryBtn { background: rgba(255,255,255,.09); color: white; }
.greenBtn { background: #10b981; color: white; }

.fieldLabel {
  margin-top: 12px; margin-bottom: 6px; display: block; font-size: 13px; color: #cbd5e1;
}
.inputLike {
  width: 100%; border-radius: 14px; border: 1px solid rgba(255,255,255,.10);
  background: rgba(15,23,42,.85); color: white; padding: 12px 14px;
}
.uploadBox {
  display: flex; gap: 12px; align-items: flex-start;
  border: 1px dashed rgba(255,255,255,.14); border-radius: 18px; padding: 14px;
  background: rgba(2,6,23,.45); color: #e2e8f0;
}
.uploadTitle { font-weight: 700; }
.uploadSub { margin-top: 4px; font-size: 13px; color: #94a3b8; }
.emptyBox {
  padding: 14px; border-radius: 14px; background: rgba(255,255,255,.05); color: #94a3b8; font-size: 14px;
}

.galleryGrid {
  margin-top: 18px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.galleryCard {
  border-radius: 22px; border: 1px solid rgba(255,255,255,.08);
  background: rgba(2,6,23,.48); padding: 14px;
}
.imageFrame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 16px;
  background: #1e293b;
}
.img { width: 100%; height: 100%; object-fit: cover; display: block; }
.galleryTop {
  margin-top: 12px; display: flex; justify-content: space-between; gap: 8px; align-items: center;
}
.galleryTitle { font-weight: 700; }
.gallerySub { margin-top: 4px; color: #94a3b8; font-size: 14px; }
.galleryDate { margin-top: 4px; color: #64748b; font-size: 12px; }
.galleryDesc { margin-top: 10px; color: #cbd5e1; font-size: 14px; line-height: 1.45; }

.riskBadge {
  border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700;
}
.riskRed { background: rgba(239,68,68,.14); color: #fca5a5; }
.riskAmber { background: rgba(245,158,11,.14); color: #fcd34d; }
.riskGreen { background: rgba(16,185,129,.14); color: #86efac; }

.benefitsGrid {
  margin-top: 16px;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
}
.benefitCard {
  border-radius: 20px; border: 1px solid rgba(255,255,255,.08);
  background: rgba(2,6,23,.48); padding: 16px;
}
.benefitTitle { font-weight: 700; }
.benefitDesc { margin-top: 8px; color: #94a3b8; font-size: 14px; line-height: 1.55; }

.statusBar {
  margin-top: 16px; border-radius: 18px; padding: 14px 16px;
  background: rgba(255,255,255,.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,.08);
}
.footerActions {
  margin-top: 16px; display: flex; justify-content: flex-end;
}

@media (max-width: 980px) {
  .statsGrid, .galleryGrid, .twoCol, .benefitsGrid, .tabsBar {
    grid-template-columns: 1fr;
  }
  .hero { flex-direction: column; }
}
`;