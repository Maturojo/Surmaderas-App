import { useMemo } from "react";
import {
  TIPOS,
  MATERIALES_POR_PIEZA_DEFAULT,
  defaultDeskSide,
  defaultSideBottom,
  defaultSideTop,
} from "../constants/defaults";
import { MATERIALES } from "../constants/materiales";
import { clampNum } from "../utils/clamp";
import {
  downloadDataUrl,
  exportDespieceCSV,
  exportDespiecePDFPrint,
} from "../utils/exportDespiece";

export function Panel({ m, setM, despiece }) {
  const materialOptions = useMemo(() => {
    return Object.entries(MATERIALES).map(([key, cfg]) => ({
      key,
      label: cfg?.label || key,
    }));
  }, []);

  const setField = (key, value) => {
    setM((prev) => ({ ...prev, [key]: value }));
  };

  const setNested = (path, value) => {
    const keys = path.split(".");
    setM((prev) => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        cur[k] = cur[k] ? { ...cur[k] } : {};
        cur = cur[k];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  // ✅ Soporte efectivo (compatibilidad retro con m.patas.activo)
  const soporteEffective = m.soporte || (m.patas?.activo ? "patas" : "nada");

  const ensureTipoState = (tipo) => {
    setM((prev) => {
      const next = { ...prev, tipo };

      next.materialesPorPieza =
        next.materialesPorPieza || { ...MATERIALES_POR_PIEZA_DEFAULT };
      next.patas = next.patas || { activo: false, altura: 120 };

      // ✅ nuevo campo soporte (sin romper lo anterior)
      next.soporte = next.soporte || (next.patas?.activo ? "patas" : "nada");

      if (tipo === "escritorio") {
        next.escritorio = next.escritorio || {};
        next.escritorio.traseraModo = next.escritorio.traseraModo || "falda";
        next.escritorio.fondoAlturaMm = next.escritorio.fondoAlturaMm ?? 0;
        next.escritorio.cortePorPatas = next.escritorio.cortePorPatas ?? true;
        next.escritorio.ladoIzq = next.escritorio.ladoIzq || defaultDeskSide();
        next.escritorio.ladoDer = next.escritorio.ladoDer || defaultDeskSide();

        // escritorio suele ir con patas por defecto
        if (!next.soporte) next.soporte = "patas";
      }

      if (tipo === "modulo_zonas") {
        next.zonas = next.zonas || {};
        next.zonas.altoSuperior = next.zonas.altoSuperior ?? 900;
        next.zonas.layoutArriba = next.zonas.layoutArriba || "split";
        next.zonas.layoutAbajo = next.zonas.layoutAbajo || "split";

        next.zonas.arriba = next.zonas.arriba || {};
        next.zonas.arriba.single = next.zonas.arriba.single || defaultSideTop();
        next.zonas.arriba.izquierda =
          next.zonas.arriba.izquierda || defaultSideTop();
        next.zonas.arriba.derecha =
          next.zonas.arriba.derecha || defaultSideTop();

        next.zonas.abajo = next.zonas.abajo || {};
        next.zonas.abajo.single =
          next.zonas.abajo.single || defaultSideBottom();
        next.zonas.abajo.izquierda =
          next.zonas.abajo.izquierda || defaultSideBottom();
        next.zonas.abajo.derecha =
          next.zonas.abajo.derecha || defaultSideBottom();
      }

      return next;
    });
  };

  const onExportCSV = () => {
    exportDespieceCSV({
      despiece,
      filenameBase: `despiece_${m.tipo || "mueble"}`,
    });
  };

  const onExportPDF = () => {
    exportDespiecePDFPrint({
      despiece,
      titulo: `Despiece - ${m.tipo || "mueble"}`,
      meta: {
        Tipo: m.tipo,
        Material: m.material,
        Ancho: `${m.ancho} mm`,
        Alto: `${m.alto} mm`,
        Profundidad: `${m.profundidad} mm`,
        Espesor: `${m.espesor} mm`,
      },
    });
  };

  const canShot = !!m.__shotApi;

  const downloadOne = () => {
    if (!m.__shotApi) return;
    const dataUrl = m.__shotApi.captureOne?.();
    if (dataUrl) downloadDataUrl(`mueble_${m.tipo || "vista"}.png`, dataUrl);
  };

  const downloadViews = () => {
    if (!m.__shotApi) return;
    const shots = m.__shotApi.captureViews?.();
    if (!shots) return;
    if (shots.front) downloadDataUrl(`mueble_front.png`, shots.front);
    if (shots.back) downloadDataUrl(`mueble_back.png`, shots.back);
    if (shots.left) downloadDataUrl(`mueble_left.png`, shots.left);
    if (shots.right) downloadDataUrl(`mueble_right.png`, shots.right);
  };

  const sectionStyle = {
    padding: 12,
    border: "1px solid #e6e6e6",
    borderRadius: 12,
    background: "#fff",
    marginBottom: 12,
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    color: "#444",
    marginBottom: 6,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  };

  const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };

  const renderSelectMaterial = (value, onChange) => (
    <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {materialOptions.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const mp = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

  const setMatPieza = (pieza, matKey) => {
    setM((prev) => ({
      ...prev,
      materialesPorPieza: {
        ...(prev.materialesPorPieza || { ...MATERIALES_POR_PIEZA_DEFAULT }),
        [pieza]: matKey,
      },
    }));
  };

  const renderSideConfig = (sidePath, sideLabel) => {
    const side = sidePath.split(".").reduce((acc, k) => acc?.[k], m) || defaultDeskSide();

    return (
      <div style={{ ...sectionStyle, marginBottom: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{sideLabel}</div>

        <div style={row2}>
          <div>
            <label style={labelStyle}>Activo</label>
            <select
              style={inputStyle}
              value={side.activo ? "si" : "no"}
              onChange={(e) => setNested(`${sidePath}.activo`, e.target.value === "si")}
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Ancho (mm)</label>
            <input
              style={inputStyle}
              type="number"
              value={side.ancho ?? 350}
              onChange={(e) => setNested(`${sidePath}.ancho`, clampNum(e.target.value, 0))}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={labelStyle}>Tipo</label>
          <select
            style={inputStyle}
            value={side.tipo || "cajonera"}
            onChange={(e) => setNested(`${sidePath}.tipo`, e.target.value)}
          >
            <option value="cajonera">Cajonera</option>
            <option value="estanteria">Estantería</option>
            <option value="vacio">Vacío</option>
          </select>
        </div>

        {side.tipo === "estanteria" && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Cantidad de estantes</label>
            <input
              style={inputStyle}
              type="number"
              value={side.estantes ?? 2}
              onChange={(e) => setNested(`${sidePath}.estantes`, clampNum(e.target.value, 0))}
            />
          </div>
        )}

        {side.tipo === "vacio" && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Soporte vacío</label>
            <select
              style={inputStyle}
              value={side.soporteVacio || "placa"}
              onChange={(e) => setNested(`${sidePath}.soporteVacio`, e.target.value)}
            >
              <option value="placa">Placa</option>
              <option value="marco">Marco (2 placas)</option>
              <option value="patas">Patas</option>
            </select>
          </div>
        )}
      </div>
    );
  };

  const renderCfgBlock = (cfg, onChangeCfg, allowCajonera) => {
    const tipo = cfg?.tipo || "estanteria";
    return (
      <div style={{ ...sectionStyle, marginBottom: 0 }}>
        <div style={row2}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              style={inputStyle}
              value={tipo}
              onChange={(e) => onChangeCfg({ ...(cfg || {}), tipo: e.target.value })}
            >
              <option value="vacio">Vacío</option>
              <option value="estanteria">Estantería</option>
              <option value="puertas">Puertas</option>
              {allowCajonera && <option value="cajonera">Cajonera</option>}
            </select>
          </div>

          {tipo === "estanteria" ? (
            <div>
              <label style={labelStyle}>Estantes</label>
              <input
                style={inputStyle}
                type="number"
                value={cfg?.estantes ?? 1}
                onChange={(e) =>
                  onChangeCfg({ ...(cfg || {}), estantes: clampNum(e.target.value, 0) })
                }
              />
            </div>
          ) : (
            <div />
          )}
        </div>

        {tipo === "puertas" && (
          <div style={{ marginTop: 10, ...row2 }}>
            <div>
              <label style={labelStyle}>Activo</label>
              <select
                style={inputStyle}
                value={cfg?.puertas?.activo ? "si" : "no"}
                onChange={(e) =>
                  onChangeCfg({
                    ...(cfg || {}),
                    puertas: { ...(cfg?.puertas || {}), activo: e.target.value === "si" },
                  })
                }
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Hojas</label>
              <input
                style={inputStyle}
                type="number"
                value={cfg?.puertas?.hojas ?? 2}
                onChange={(e) =>
                  onChangeCfg({
                    ...(cfg || {}),
                    puertas: { ...(cfg?.puertas || {}), hojas: clampNum(e.target.value, 1) },
                  })
                }
              />
            </div>
          </div>
        )}

        {allowCajonera && tipo === "cajonera" && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
              Cajones (altos mm)
            </div>

            {Array.isArray(cfg?.cajones) &&
              cfg.cajones.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    style={inputStyle}
                    type="number"
                    value={c.alto ?? 160}
                    onChange={(e) => {
                      const cajones = [...cfg.cajones];
                      cajones[i] = { ...cajones[i], alto: clampNum(e.target.value, 40) };
                      onChangeCfg({ ...(cfg || {}), cajones });
                    }}
                  />
                  <button
                    style={{
                      padding: "10px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fafafa",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const cajones = (cfg?.cajones || []).filter((_, idx) => idx !== i);
                      onChangeCfg({ ...(cfg || {}), cajones });
                    }}
                    type="button"
                  >
                    Quitar
                  </button>
                </div>
              ))}

            <button
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fafafa",
                cursor: "pointer",
              }}
              onClick={() => {
                const cajones = [...(cfg?.cajones || [{ alto: 160 }, { alto: 160 }, { alto: 220 }])];
                cajones.push({ alto: 160 });
                onChangeCfg({ ...(cfg || {}), cajones });
              }}
              type="button"
            >
              + Agregar cajón
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 380,
        height: "100vh",
        overflow: "auto",
        padding: 14,
        background: "#f7f7f7",
        borderRight: "1px solid #e6e6e6",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>
        Generador Mueble 3D
      </div>

      {/* ===== Tipo + Visual ===== */}
      <div style={sectionStyle}>
        <div style={row2}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              style={inputStyle}
              value={m.tipo || "modulo_zonas"}
              onChange={(e) => ensureTipoState(e.target.value)}
            >
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Material (global)</label>
            {renderSelectMaterial(m.material || "melamina_blanca", (v) => setField("material", v))}
          </div>
        </div>

        <div style={{ marginTop: 10, ...row2 }}>
          <div>
            <label style={labelStyle}>Fondo</label>
            <select
              style={inputStyle}
              value={m.fondoModo || "habitacion"}
              onChange={(e) => setField("fondoModo", e.target.value)}
            >
              <option value="habitacion">Habitación</option>
              <option value="gris">Gris</option>
              <option value="hdri">HDRI</option>
            </select>
          </div>
          <div />
        </div>
      </div>

      {/* ===== Medidas ===== */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Medidas (mm)</div>
        <div style={row2}>
          <div>
            <label style={labelStyle}>Ancho</label>
            <input
              style={inputStyle}
              type="number"
              value={m.ancho ?? 800}
              onChange={(e) => setField("ancho", clampNum(e.target.value, 1))}
            />
          </div>
          <div>
            <label style={labelStyle}>Alto</label>
            <input
              style={inputStyle}
              type="number"
              value={m.alto ?? 1800}
              onChange={(e) => setField("alto", clampNum(e.target.value, 1))}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, ...row2 }}>
          <div>
            <label style={labelStyle}>Profundidad</label>
            <input
              style={inputStyle}
              type="number"
              value={m.profundidad ?? 350}
              onChange={(e) => setField("profundidad", clampNum(e.target.value, 1))}
            />
          </div>
          <div>
            <label style={labelStyle}>Espesor</label>
            <input
              style={inputStyle}
              type="number"
              value={m.espesor ?? 18}
              onChange={(e) => setField("espesor", clampNum(e.target.value, 1))}
            />
          </div>
        </div>
      </div>

      {/* ===== Soporte global ===== */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Soporte</div>
        <div style={row2}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              style={inputStyle}
              value={soporteEffective}
              onChange={(e) => {
                const v = e.target.value;
                setField("soporte", v);

                // compatibilidad con patas anteriores
                if (v === "patas") setNested("patas.activo", true);
                if (v !== "patas") setNested("patas.activo", false);
              }}
            >
              <option value="patas">Patas</option>
              <option value="zocalo">Zócalo</option>
              <option value="nada">Nada</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Altura patas (mm)</label>
            <input
              style={inputStyle}
              type="number"
              value={m.patas?.altura ?? 120}
              onChange={(e) => setNested("patas.altura", clampNum(e.target.value, 0))}
              disabled={soporteEffective !== "patas"}
            />
          </div>
        </div>
      </div>

      {/* ===== Materiales por pieza ===== */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Materiales por pieza</div>

        <div style={row2}>
          <div>
            <label style={labelStyle}>Cuerpo</label>
            {renderSelectMaterial(mp.cuerpo || m.material, (v) => setMatPieza("cuerpo", v))}
          </div>
          <div>
            <label style={labelStyle}>Tapa</label>
            {renderSelectMaterial(mp.tapa || m.material, (v) => setMatPieza("tapa", v))}
          </div>
        </div>

        <div style={{ marginTop: 10, ...row2 }}>
          <div>
            <label style={labelStyle}>Estantes</label>
            {renderSelectMaterial(mp.estantes || m.material, (v) => setMatPieza("estantes", v))}
          </div>
          <div>
            <label style={labelStyle}>Frentes</label>
            {renderSelectMaterial(mp.frentes || m.material, (v) => setMatPieza("frentes", v))}
          </div>
        </div>

        <div style={{ marginTop: 10, ...row2 }}>
          <div>
            <label style={labelStyle}>Fondo</label>
            {renderSelectMaterial(mp.fondo || m.material, (v) => setMatPieza("fondo", v))}
          </div>
          <div>
            <label style={labelStyle}>Patas</label>
            {renderSelectMaterial(mp.patas || "pino", (v) => setMatPieza("patas", v))}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setField("materialesPorPieza", { ...MATERIALES_POR_PIEZA_DEFAULT })}
            style={{
              width: "100%",
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fafafa",
              cursor: "pointer",
            }}
          >
            Reset materiales por pieza
          </button>
        </div>
      </div>

      {/* ===== Config por tipo ===== */}
      {m.tipo === "estanteria" && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Estantería</div>
          <label style={labelStyle}>Cantidad de estantes</label>
          <input
            style={inputStyle}
            type="number"
            value={m.estantes ?? 4}
            onChange={(e) => setField("estantes", clampNum(e.target.value, 0))}
          />
        </div>
      )}

      {m.tipo === "escritorio" && (
        <>
          <div style={sectionStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Escritorio</div>

            <div style={row2}>
              <div>
                <label style={labelStyle}>Trasera</label>
                <select
                  style={inputStyle}
                  value={m.escritorio?.traseraModo || "falda"}
                  onChange={(e) => setNested("escritorio.traseraModo", e.target.value)}
                >
                  <option value="falda">Falda</option>
                  <option value="fondo">Fondo</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Falda (mm)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={m.falda ?? 80}
                  onChange={(e) => setField("falda", clampNum(e.target.value, 0))}
                  disabled={(m.escritorio?.traseraModo || "falda") !== "falda"}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, ...row2 }}>
              <div>
                <label style={labelStyle}>Fondo altura (mm)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={m.escritorio?.fondoAlturaMm ?? 0}
                  onChange={(e) =>
                    setNested("escritorio.fondoAlturaMm", clampNum(e.target.value, 0))
                  }
                  disabled={(m.escritorio?.traseraModo || "falda") !== "fondo"}
                />
              </div>

              <div>
                <label style={labelStyle}>Cortar fondo por patas</label>
                <select
                  style={inputStyle}
                  value={m.escritorio?.cortePorPatas === false ? "no" : "si"}
                  onChange={(e) =>
                    setNested("escritorio.cortePorPatas", e.target.value === "si")
                  }
                  disabled={(m.escritorio?.traseraModo || "falda") !== "fondo"}
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {renderSideConfig("escritorio.ladoIzq", "Lado izquierdo")}
            {renderSideConfig("escritorio.ladoDer", "Lado derecho")}
          </div>
        </>
      )}

      {/* Zonas: dejo tu versión original en tu archivo si querés,
          porque esto es largo; no cambia por el soporte */}
      {/* Export / capturas */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Producción</div>

        <div style={row2}>
          <button
            type="button"
            onClick={onExportCSV}
            disabled={!Array.isArray(despiece) || despiece.length === 0}
            style={{
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fafafa",
              cursor: "pointer",
              opacity: !Array.isArray(despiece) || despiece.length === 0 ? 0.5 : 1,
            }}
          >
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={onExportPDF}
            disabled={!Array.isArray(despiece) || despiece.length === 0}
            style={{
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fafafa",
              cursor: "pointer",
              opacity: !Array.isArray(despiece) || despiece.length === 0 ? 0.5 : 1,
            }}
          >
            Exportar PDF
          </button>
        </div>

        <div style={{ marginTop: 10, ...row2 }}>
          <button
            type="button"
            onClick={downloadOne}
            disabled={!canShot}
            style={{
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fafafa",
              cursor: "pointer",
              opacity: !canShot ? 0.5 : 1,
            }}
          >
            Descargar PNG
          </button>

          <button
            type="button"
            onClick={downloadViews}
            disabled={!canShot}
            style={{
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fafafa",
              cursor: "pointer",
              opacity: !canShot ? 0.5 : 1,
            }}
          >
            PNG 4 vistas
          </button>
        </div>

        {!canShot && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Nota: la captura se habilita cuando el Canvas termina de inicializar.
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#777", padding: "6px 4px" }}>
        Consejo: para “despiece” real, exportá CSV y lo usás para producción/corte. El espesor se toma como la dimensión
        más chica y el largo como la más grande.
      </div>
    </div>
  );
}
