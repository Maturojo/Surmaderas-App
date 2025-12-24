// client/src/pages/GeneradorMueble3D.jsx
import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";

const TIPOS = [
  { id: "estanteria", label: "Estantería (simple)" },
  { id: "escritorio", label: "Escritorio (con lados configurables)" },
  { id: "modulo_zonas", label: "Módulo (arriba/abajo configurable)" },
];

const MM_TO_UNITS = 0.01;
const FRONT_GAP_MM = 2;
const DOOR_THICK_MM = 18;
const LEG_SIZE_MM = 40;

function clampNum(v, min = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}

function Piece({ size, position }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#e9e9e9" />
      <Edges color="#111" />
    </mesh>
  );
}

/** Defaults */
function defaultSideTop() {
  return {
    tipo: "puertas", // puertas | estanteria | vacio
    estantes: 1,
    puertas: { activo: true, hojas: 1 },
  };
}
function defaultSideBottom() {
  return {
    tipo: "cajonera", // estanteria | cajonera | puertas | vacio
    estantes: 1,
    puertas: { activo: false, hojas: 1 },
    cajones: [{ alto: 160 }, { alto: 160 }, { alto: 220 }],
  };
}
function defaultDeskSide() {
  return {
    activo: true,
    ancho: 350, // mm
    tipo: "cajonera", // cajonera | estanteria | vacio
    estantes: 1,
    cajones: [{ alto: 140 }, { alto: 140 }, { alto: 180 }],

    // NUEVO: soporte cuando tipo === "vacio"
    soporteVacio: "placa", // "placa" | "marco" | "patas"
  };
}

/**
 * Panel UI
 */
function Panel({ m, setM }) {
  const inputStyle = { width: "100%", marginBottom: 10, padding: 8 };
  const labelStyle = { display: "block", marginBottom: 4 };

  const setField = (key, min = 0) => (e) => setM((p) => ({ ...p, [key]: clampNum(e.target.value, min) }));

  const toggle = (path) => {
    setM((prev) => {
      const next = structuredClone(prev);
      let ref = next;
      for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
      const last = path[path.length - 1];
      ref[last] = !ref[last];
      return next;
    });
  };

  const setTipo = (e) => {
    const tipo = e.target.value;

    setM((p) => {
      if (tipo === "escritorio") {
        return {
          ...p,
          tipo,
          ancho: 1400,
          alto: 750,
          profundidad: 650,
          espesor: p.espesor ?? 18,

          falda: 80,
          patas: { ...p.patas, activo: false },

          escritorio: {
            altoSoportes: 720,
            ladoIzq: defaultDeskSide(),
            ladoDer: { ...defaultDeskSide(), tipo: "estanteria", estantes: 2, ancho: 300 },
          },
        };
      }

      if (tipo === "modulo_zonas") {
        return {
          ...p,
          tipo,
          ancho: 800,
          alto: 1800,
          profundidad: 350,
          espesor: p.espesor ?? 18,
          patas: { activo: true, altura: 120 },

          zonas: {
            altoSuperior: 900,

            layoutArriba: "split", // split | single
            layoutAbajo: "split",  // split | single

            arriba: {
              single: defaultSideTop(),
              izquierda: defaultSideTop(),
              derecha: { tipo: "estanteria", estantes: 2, puertas: { activo: false, hojas: 1 } },
            },

            abajo: {
              single: defaultSideBottom(),
              izquierda: { ...defaultSideBottom(), tipo: "estanteria", estantes: 2 },
              derecha: defaultSideBottom(),
            },
          },
        };
      }

      // estantería simple
      return {
        ...p,
        tipo,
        ancho: 800,
        alto: 1800,
        profundidad: 350,
        espesor: p.espesor ?? 18,
        estantes: 4,
        patas: { ...p.patas, activo: false },
      };
    });
  };

  // ===== Reutilizables =====
  const SideEditor = ({ title, cfg, onChangeCfg, allowCajonera }) => {
    return (
      <div style={{ border: "1px solid #eee", padding: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>

        <label style={labelStyle}>Tipo</label>
        <select
          value={cfg.tipo}
          onChange={(e) => onChangeCfg((draft) => (draft.tipo = e.target.value))}
          style={{ ...inputStyle, padding: 10 }}
        >
          <option value="estanteria">Estantería</option>
          <option value="puertas">Puertas</option>
          {allowCajonera && <option value="cajonera">Cajonera</option>}
          <option value="vacio">Vacío</option>
        </select>

        {cfg.tipo === "estanteria" && (
          <>
            <label style={labelStyle}>Estantes</label>
            <input
              type="number"
              min={0}
              value={cfg.estantes ?? 0}
              onChange={(e) => onChangeCfg((draft) => (draft.estantes = clampNum(e.target.value, 0)))}
              style={inputStyle}
            />
          </>
        )}

        {cfg.tipo === "puertas" && (
          <>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={!!cfg.puertas?.activo}
                onChange={() => onChangeCfg((draft) => (draft.puertas.activo = !draft.puertas.activo))}
              />
              Activar puertas
            </label>

            {cfg.puertas?.activo && (
              <>
                <label style={labelStyle}>Hojas</label>
                <input
                  type="number"
                  min={1}
                  value={cfg.puertas?.hojas ?? 1}
                  onChange={(e) => onChangeCfg((draft) => (draft.puertas.hojas = clampNum(e.target.value, 1)))}
                  style={inputStyle}
                />
              </>
            )}
          </>
        )}

        {allowCajonera && cfg.tipo === "cajonera" && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Cajones (alto de frente)</div>
            {(cfg.cajones ?? []).map((c, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="number"
                  value={c.alto}
                  onChange={(e) => onChangeCfg((draft) => (draft.cajones[idx].alto = clampNum(e.target.value, 40)))}
                  style={{ flex: 1, padding: 8 }}
                />
                <button
                  type="button"
                  onClick={() => onChangeCfg((draft) => draft.cajones.splice(idx, 1))}
                  style={{ padding: "8px 10px" }}
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChangeCfg((draft) => draft.cajones.push({ alto: 160 }))}
              style={{ padding: 8, width: "100%" }}
            >
              + Agregar cajón
            </button>
          </>
        )}
      </div>
    );
  };

  const updateZonasCfg = (path, mutator) => {
    setM((p) => {
      const next = structuredClone(p);
      let ref = next.zonas;
      for (const key of path) ref = ref[key];
      mutator(ref);
      return next;
    });
  };

  // Escritorio: editor lado
  const DeskSideEditor = ({ ladoKey, title }) => {
    const cfg = m.escritorio?.[ladoKey];
    if (!cfg) return null;

    return (
      <div style={{ border: "1px solid #eee", padding: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={!!cfg.activo}
            onChange={() =>
              setM((p) => {
                const next = structuredClone(p);
                next.escritorio[ladoKey].activo = !next.escritorio[ladoKey].activo;
                return next;
              })
            }
          />
          Activar lado
        </label>

        {cfg.activo && (
          <>
            <label style={labelStyle}>Ancho lado (mm)</label>
            <input
              type="number"
              value={cfg.ancho}
              onChange={(e) =>
                setM((p) => {
                  const next = structuredClone(p);
                  next.escritorio[ladoKey].ancho = clampNum(e.target.value, 0);
                  return next;
                })
              }
              style={inputStyle}
            />

            <label style={labelStyle}>Tipo</label>
            <select
              value={cfg.tipo}
              onChange={(e) =>
                setM((p) => {
                  const next = structuredClone(p);
                  next.escritorio[ladoKey].tipo = e.target.value;
                  return next;
                })
              }
              style={{ ...inputStyle, padding: 10 }}
            >
              <option value="cajonera">Cajonera</option>
              <option value="estanteria">Estantería</option>
              <option value="vacio">Vacío</option>
            </select>

            {cfg.tipo === "vacio" && (
              <>
                <label style={labelStyle}>Soporte (cuando está vacío)</label>
                <select
                  value={cfg.soporteVacio || "placa"}
                  onChange={(e) =>
                    setM((p) => {
                      const next = structuredClone(p);
                      next.escritorio[ladoKey].soporteVacio = e.target.value;
                      return next;
                    })
                  }
                  style={{ ...inputStyle, padding: 10 }}
                >
                  <option value="placa">Placa exterior</option>
                  <option value="marco">Marco (2 placas)</option>
                  <option value="patas">Patas (4)</option>
                </select>
              </>
            )}

            {cfg.tipo === "estanteria" && (
              <>
                <label style={labelStyle}>Estantes</label>
                <input
                  type="number"
                  min={0}
                  value={cfg.estantes ?? 0}
                  onChange={(e) =>
                    setM((p) => {
                      const next = structuredClone(p);
                      next.escritorio[ladoKey].estantes = clampNum(e.target.value, 0);
                      return next;
                    })
                  }
                  style={inputStyle}
                />
              </>
            )}

            {cfg.tipo === "cajonera" && (
              <>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Cajones (alto de frente)</div>
                {(cfg.cajones ?? []).map((c, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      type="number"
                      value={c.alto}
                      onChange={(e) =>
                        setM((p) => {
                          const next = structuredClone(p);
                          next.escritorio[ladoKey].cajones[idx].alto = clampNum(e.target.value, 40);
                          return next;
                        })
                      }
                      style={{ flex: 1, padding: 8 }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setM((p) => {
                          const next = structuredClone(p);
                          next.escritorio[ladoKey].cajones.splice(idx, 1);
                          return next;
                        })
                      }
                      style={{ padding: "8px 10px" }}
                    >
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setM((p) => {
                      const next = structuredClone(p);
                      next.escritorio[ladoKey].cajones.push({ alto: 140 });
                      return next;
                    })
                  }
                  style={{ padding: 8, width: "100%" }}
                >
                  + Agregar cajón
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 16, width: 420, borderRight: "1px solid #ddd", overflowY: "auto", height: "100vh" }}>
      <h2 style={{ margin: "0 0 12px" }}>Generador 3D</h2>

      <label style={labelStyle}>Tipo de mueble</label>
      <select value={m.tipo} onChange={setTipo} style={{ width: "100%", marginBottom: 10, padding: 10 }}>
        {TIPOS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>

      <label style={labelStyle}>Ancho (mm)</label>
      <input type="number" value={m.ancho} onChange={setField("ancho", 1)} style={inputStyle} />

      <label style={labelStyle}>Alto (mm)</label>
      <input type="number" value={m.alto} onChange={setField("alto", 1)} style={inputStyle} />

      <label style={labelStyle}>Profundidad (mm)</label>
      <input type="number" value={m.profundidad} onChange={setField("profundidad", 1)} style={inputStyle} />

      <label style={labelStyle}>Espesor (mm)</label>
      <input type="number" value={m.espesor} onChange={setField("espesor", 1)} style={inputStyle} />

      <hr style={{ margin: "12px 0" }} />

      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input type="checkbox" checked={!!m.patas?.activo} onChange={() => toggle(["patas", "activo"])} />
        Patas
      </label>

      {m.patas?.activo && (
        <>
          <label style={labelStyle}>Altura patas (mm)</label>
          <input
            type="number"
            value={m.patas.altura}
            onChange={(e) => setM((p) => ({ ...p, patas: { ...p.patas, altura: clampNum(e.target.value, 0) } }))}
            style={inputStyle}
          />
        </>
      )}

      {m.tipo === "estanteria" && (
        <>
          <hr style={{ margin: "12px 0" }} />
          <label style={labelStyle}>Estantes</label>
          <input type="number" min={0} value={m.estantes} onChange={setField("estantes", 0)} style={inputStyle} />
        </>
      )}

      {m.tipo === "escritorio" && (
        <>
          <hr style={{ margin: "12px 0" }} />
          <label style={labelStyle}>Falda (mm) (opcional)</label>
          <input type="number" min={0} value={m.falda} onChange={setField("falda", 0)} style={inputStyle} />

          <div style={{ fontWeight: 700, margin: "10px 0 6px" }}>Lados del escritorio</div>
          <p style={{ fontSize: 12, color: "#555", marginTop: 0 }}>
            Ajustá anchos izquierdo/derecho para dejar hueco central (W - izq - der).
          </p>

          <DeskSideEditor ladoKey="ladoIzq" title="Izquierda" />
          <DeskSideEditor ladoKey="ladoDer" title="Derecha" />
        </>
      )}

      {m.tipo === "modulo_zonas" && (
        <>
          <hr style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Zonas</div>

          <label style={labelStyle}>Alto zona superior (mm)</label>
          <input
            type="number"
            value={m.zonas.altoSuperior}
            onChange={(e) => setM((p) => ({ ...p, zonas: { ...p.zonas, altoSuperior: clampNum(e.target.value, 0) } }))}
            style={inputStyle}
          />

          <hr style={{ margin: "12px 0" }} />

          <div style={{ fontWeight: 700, marginBottom: 6 }}>Arriba</div>
          <label style={labelStyle}>Modo</label>
          <select
            value={m.zonas.layoutArriba}
            onChange={(e) => setM((p) => ({ ...p, zonas: { ...p.zonas, layoutArriba: e.target.value } }))}
            style={{ ...inputStyle, padding: 10 }}
          >
            <option value="split">Izquierda / Derecha</option>
            <option value="single">Bloque único</option>
          </select>

          {m.zonas.layoutArriba === "single" ? (
            <SideEditor
              title="Arriba - Bloque único"
              cfg={m.zonas.arriba.single}
              allowCajonera={false}
              onChangeCfg={(mutator) => updateZonasCfg(["arriba", "single"], mutator)}
            />
          ) : (
            <>
              <SideEditor
                title="Arriba - Izquierda"
                cfg={m.zonas.arriba.izquierda}
                allowCajonera={false}
                onChangeCfg={(mutator) => updateZonasCfg(["arriba", "izquierda"], mutator)}
              />
              <SideEditor
                title="Arriba - Derecha"
                cfg={m.zonas.arriba.derecha}
                allowCajonera={false}
                onChangeCfg={(mutator) => updateZonasCfg(["arriba", "derecha"], mutator)}
              />
            </>
          )}

          <div style={{ fontWeight: 700, marginBottom: 6 }}>Abajo</div>
          <label style={labelStyle}>Modo</label>
          <select
            value={m.zonas.layoutAbajo}
            onChange={(e) => setM((p) => ({ ...p, zonas: { ...p.zonas, layoutAbajo: e.target.value } }))}
            style={{ ...inputStyle, padding: 10 }}
          >
            <option value="split">Izquierda / Derecha</option>
            <option value="single">Bloque único</option>
          </select>

          {m.zonas.layoutAbajo === "single" ? (
            <SideEditor
              title="Abajo - Bloque único"
              cfg={m.zonas.abajo.single}
              allowCajonera={true}
              onChangeCfg={(mutator) => updateZonasCfg(["abajo", "single"], mutator)}
            />
          ) : (
            <>
              <SideEditor
                title="Abajo - Izquierda"
                cfg={m.zonas.abajo.izquierda}
                allowCajonera={true}
                onChangeCfg={(mutator) => updateZonasCfg(["abajo", "izquierda"], mutator)}
              />
              <SideEditor
                title="Abajo - Derecha"
                cfg={m.zonas.abajo.derecha}
                allowCajonera={true}
                onChangeCfg={(mutator) => updateZonasCfg(["abajo", "derecha"], mutator)}
              />
            </>
          )}
        </>
      )}

      <p style={{ fontSize: 12, color: "#555", marginTop: 10 }}>
        Panel scrollea solo. Mueble y piso quedan fijos.
      </p>
    </div>
  );
}

/**
 * Piezas 3D
 */
function usePieces(m) {
  const s = MM_TO_UNITS;

  const W = Math.max(1, m.ancho) * s;
  const H = Math.max(1, m.alto) * s;
  const D = Math.max(1, m.profundidad) * s;
  const T = Math.max(1, m.espesor) * s;

  const legsOn = !!m.patas?.activo;
  const legH = (legsOn ? Math.max(0, Number(m.patas.altura || 0)) : 0) * s;
  const bodyH = Math.max(H - legH, T);
  const yBodyCenter = legsOn ? legH / 2 : 0;

  return useMemo(() => {
    const list = [];
    const addBox = (size, pos) => list.push({ size, pos });

    const zFront = (D / 2) + (DOOR_THICK_MM * s) / 2 + (FRONT_GAP_MM * s);

    const makeCaja = () => {
      const xSide = (W / 2) - (T / 2);
      const innerW = Math.max(W - 2 * T, T);

      // laterales
      addBox([T, bodyH, D], [xSide, yBodyCenter, 0]);
      addBox([T, bodyH, D], [-xSide, yBodyCenter, 0]);

      // base/tapa
      const yBase = (yBodyCenter - bodyH / 2) + (T / 2);
      const yTop = (yBodyCenter + bodyH / 2) - (T / 2);
      addBox([innerW, T, D], [0, yBase, 0]);
      addBox([innerW, T, D], [0, yTop, 0]);

      // fondo (para que se vean estantes con respaldo)
      const zBack = (-D / 2) + (T / 2);
      addBox([innerW, bodyH, T], [0, yBodyCenter, zBack]);

      // patas
      if (legsOn && legH > 0) {
        const legSize = LEG_SIZE_MM * s;
        const inset = T / 2;
        const xL = (W / 2) - inset - (legSize / 2);
        const zL = (D / 2) - inset - (legSize / 2);
        const y = (yBodyCenter - bodyH / 2) - (legH / 2);
        addBox([legSize, legH, legSize], [xL, y, zL]);
        addBox([legSize, legH, legSize], [-xL, y, zL]);
        addBox([legSize, legH, legSize], [xL, y, -zL]);
        addBox([legSize, legH, legSize], [-xL, y, -zL]);
      }

      return { innerW };
    };

    // Estantería simple
    if (m.tipo === "estanteria") {
      const { innerW } = makeCaja();
      const yInnerBottom = (yBodyCenter - bodyH / 2) + T;
      const innerH = Math.max(bodyH - 2 * T, T);

      const n = Math.max(0, Math.floor(m.estantes || 0));
      if (n > 0) {
        const step = innerH / (n + 1);
        for (let i = 1; i <= n; i++) addBox([innerW, T, D], [0, yInnerBottom + step * i, 0]);
      }
    }

    // Escritorio
    if (m.tipo === "escritorio") {
      const faldaMm = Math.max(0, Number(m.falda || 0));
      const falda = faldaMm * s;

      // tapa
      const yTop = (H / 2) - (T / 2);
      addBox([W, T, D], [0, yTop, 0]);

      // falda frontal (opcional)
      if (falda > 0) {
        const z = (D / 2) - (T / 2);
        const yFalda = yTop - (T / 2) - (falda / 2);
        addBox([W - 2 * T, falda, T], [0, yFalda, z]);
      }

      const left = m.escritorio?.ladoIzq ?? defaultDeskSide();
      const right = m.escritorio?.ladoDer ?? defaultDeskSide();

      const leftW = (left.activo ? clampNum(left.ancho, 0) : 0) * s;
      const rightW = (right.activo ? clampNum(right.ancho, 0) : 0) * s;

      const maxSide = Math.max((W - T) / 2, 0);
      const lW = Math.min(leftW, maxSide);
      const rW = Math.min(rightW, maxSide);

      const innerTopY = yTop - T;
      const supportH = Math.max(H - T, T);
      const ySupportCenter = innerTopY - supportH / 2;

      const renderDeskSide = (cfg, xCenter, sideW, isLeft) => {
        if (!cfg?.activo || sideW <= 0) return;

        const xStart = xCenter - sideW / 2;
        const xEnd = xCenter + sideW / 2;

        const yBottom = ySupportCenter - supportH / 2;
        const yTopLocal = ySupportCenter + supportH / 2;

        const zBack = (-D / 2) + (T / 2);

        // VACIO: soporte configurable (placa | marco | patas)
        if (cfg.tipo === "vacio") {
          const modo = cfg.soporteVacio || "placa";

          if (modo === "placa") {
            const xPanel = isLeft ? (xStart + T / 2) : (xEnd - T / 2);
            addBox([T, supportH, D], [xPanel, ySupportCenter, 0]);
            return;
          }

          if (modo === "marco") {
            const xOuter = isLeft ? (xStart + T / 2) : (xEnd - T / 2);
            const xInner = isLeft ? (xEnd - T / 2) : (xStart + T / 2);
            addBox([T, supportH, D], [xOuter, ySupportCenter, 0]);
            addBox([T, supportH, D], [xInner, ySupportCenter, 0]);
            return;
          }

          if (modo === "patas") {
            const legSize = Math.min(LEG_SIZE_MM * s, sideW / 3, D / 3);
            const x1 = xStart + legSize / 2;
            const x2 = xEnd - legSize / 2;
            const z1 = (D / 2) - legSize / 2;
            const z2 = (-D / 2) + legSize / 2;

            addBox([legSize, supportH, legSize], [x1, ySupportCenter, z1]);
            addBox([legSize, supportH, legSize], [x2, ySupportCenter, z1]);
            addBox([legSize, supportH, legSize], [x1, ySupportCenter, z2]);
            addBox([legSize, supportH, legSize], [x2, ySupportCenter, z2]);
            return;
          }

          return;
        }

        // carcasa (caja) para estantería/cajonera, con fondo
        const innerSideW = Math.max(sideW - 2 * T, T);

        // laterales
        addBox([T, supportH, D], [xStart + T / 2, ySupportCenter, 0]);
        addBox([T, supportH, D], [xEnd - T / 2, ySupportCenter, 0]);

        // base/tapa del módulo
        addBox([innerSideW, T, D], [xCenter, yBottom + T / 2, 0]);
        addBox([innerSideW, T, D], [xCenter, yTopLocal - T / 2, 0]);

        // fondo
        addBox([sideW, supportH, T], [xCenter, ySupportCenter, zBack]);

        // Estantería
        if (cfg.tipo === "estanteria") {
          const n = Math.max(0, Math.floor(cfg.estantes || 0));
          if (n > 0) {
            const usableH = Math.max(supportH - 2 * T, T);
            const step = usableH / (n + 1);
            const yShelfStart = yBottom + T;

            for (let i = 1; i <= n; i++) {
              const y = yShelfStart + step * i;
              addBox([innerSideW, T, D], [xCenter, y, 0]);
            }
          }
        }

        // Cajonera (frentes)
        if (cfg.tipo === "cajonera") {
          const doorT = DOOR_THICK_MM * s;
          const yStart = yBottom + T;
          const usableH = Math.max(supportH - 2 * T, T);

          let yStack = yStart;
          const cajones = Array.isArray(cfg.cajones) ? cfg.cajones : [];

          for (let i = 0; i < cajones.length; i++) {
            const h = clampNum(cajones[i].alto, 40) * s;
            if (yStack + h > yStart + usableH) break;

            addBox([innerSideW, h, doorT], [xCenter, yStack + h / 2, zFront]);
            yStack += h;
          }
        }
      };

      const xLeftCenter = -W / 2 + lW / 2;
      const xRightCenter = W / 2 - rW / 2;

      renderDeskSide(left, xLeftCenter, lW, true);
      renderDeskSide(right, xRightCenter, rW, false);
    }

    // Módulo por zonas
    if (m.tipo === "modulo_zonas") {
      const { innerW } = makeCaja();

      const yInnerBottom = (yBodyCenter - bodyH / 2) + T;
      const innerH = Math.max(bodyH - 2 * T, T);

      const hSupMm = clampNum(m.zonas?.altoSuperior ?? 0, 0);
      const hSup = Math.min(hSupMm * s, innerH);
      const hInf = Math.max(innerH - hSup, 0);

      const hasDivider = hSup > 0 && hInf > 0;
      if (hasDivider) addBox([innerW, T, D], [0, yInnerBottom + hInf, 0]);

      const halfW = innerW / 2;

      const renderCfgBlock = (cfg, xCenter, yStart, zoneH, width, allowCajonera) => {
        if (!cfg || cfg.tipo === "vacio" || zoneH <= 0) return;

        if (cfg.tipo === "estanteria") {
          const n = Math.max(0, Math.floor(cfg.estantes || 0));
          if (n > 0) {
            const step = zoneH / (n + 1);
            for (let i = 1; i <= n; i++) addBox([width, T, D], [xCenter, yStart + step * i, 0]);
          }
        }

        if (cfg.tipo === "puertas" && cfg.puertas?.activo) {
          const hojas = Math.max(1, Math.floor(cfg.puertas.hojas || 1));
          const doorT = DOOR_THICK_MM * s;
          const doorH = Math.max(zoneH, T);
          const yDoor = yStart + doorH / 2;
          const eachW = width / hojas;

          for (let h = 0; h < hojas; h++) {
            const x = (xCenter - width / 2) + eachW * h + eachW / 2;
            addBox([eachW, doorH, doorT], [x, yDoor, zFront]);
          }
        }

        if (allowCajonera && cfg.tipo === "cajonera") {
          const doorT = DOOR_THICK_MM * s;
          const cajones = Array.isArray(cfg.cajones) ? cfg.cajones : [];
          let yStack = yStart;

          for (let i = 0; i < cajones.length; i++) {
            const h = clampNum(cajones[i].alto, 40) * s;
            if (yStack + h > yStart + zoneH) break;
            addBox([width, h, doorT], [xCenter, yStack + h / 2, zFront]);
            yStack += h;
          }
        }
      };

      const yInf = yInnerBottom;
      const ySup = yInnerBottom + hInf + (hasDivider ? T : 0);

      // ABAJO
      if (m.zonas.layoutAbajo === "single") {
        renderCfgBlock(m.zonas.abajo.single, 0, yInf, hInf, innerW, true);
      } else {
        addBox([T, hInf, D], [0, yInf + hInf / 2, 0]);
        renderCfgBlock(m.zonas.abajo.izquierda, -innerW / 4, yInf, hInf, halfW, true);
        renderCfgBlock(m.zonas.abajo.derecha, innerW / 4, yInf, hInf, halfW, true);
      }

      // ARRIBA
      if (m.zonas.layoutArriba === "single") {
        renderCfgBlock(m.zonas.arriba.single, 0, ySup, hSup, innerW, false);
      } else {
        addBox([T, hSup, D], [0, ySup + hSup / 2, 0]);
        renderCfgBlock(m.zonas.arriba.izquierda, -innerW / 4, ySup, hSup, halfW, false);
        renderCfgBlock(m.zonas.arriba.derecha, innerW / 4, ySup, hSup, halfW, false);
      }
    }

    return list;
  }, [
    m.tipo,
    m.ancho,
    m.alto,
    m.profundidad,
    m.espesor,
    m.estantes,
    m.falda,
    m.patas?.activo,
    m.patas?.altura,
    m.zonas,
    m.escritorio,
  ]);
}

function Mueble3D({ m }) {
  const pieces = usePieces(m);
  const H = Math.max(1, m.alto) * MM_TO_UNITS;

  return (
    <group position={[0, H / 2, 0]}>
      {pieces.map((p, idx) => (
        <Piece key={idx} size={p.size} position={p.pos} />
      ))}
    </group>
  );
}

export default function GeneradorMueble3D() {
  const [m, setM] = useState({
    tipo: "modulo_zonas",
    ancho: 800,
    alto: 1800,
    profundidad: 350,
    espesor: 18,

    estantes: 4,
    falda: 80,

    patas: { activo: true, altura: 120 },

    escritorio: {
      altoSoportes: 720,
      ladoIzq: defaultDeskSide(),
      ladoDer: { ...defaultDeskSide(), tipo: "estanteria", estantes: 2, ancho: 300 },
    },

    zonas: {
      altoSuperior: 900,

      layoutArriba: "split",
      layoutAbajo: "split",

      arriba: {
        single: defaultSideTop(),
        izquierda: defaultSideTop(),
        derecha: { tipo: "estanteria", estantes: 2, puertas: { activo: false, hojas: 1 } },
      },

      abajo: {
        single: defaultSideBottom(),
        izquierda: { ...defaultSideBottom(), tipo: "estanteria", estantes: 2 },
        derecha: defaultSideBottom(),
      },
    },
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Panel m={m} setM={setM} />

      <div style={{ flex: 1, height: "100vh" }}>
        <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[6, 8, 6]} intensity={1.2} />

          <group position={[0, -0.4, 0]}>
            <gridHelper args={[20, 20]} />
            <Mueble3D m={m} />
          </group>

          <OrbitControls enableDamping />
        </Canvas>
      </div>
    </div>
  );
}
