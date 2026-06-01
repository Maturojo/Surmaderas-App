import { useMemo, useState } from "react";
import {
  CELL_TYPES,
  MATERIALES_POR_PIEZA_DEFAULT,
  TIPOS,
  createPreset,
  defaultCell,
  makeGridKey,
} from "../constants/defaults";
import { MATERIALES } from "../constants/materiales";
import { clampNum } from "../utils/clamp";
import { downloadDataUrl, exportDespieceCSV, exportDespiecePDFPrint } from "../utils/exportDespiece";

const panel = {
  width: 420,
  height: "100vh",
  overflow: "auto",
  padding: 14,
  background: "#f8f7f5",
  borderRight: "1px solid #e8e5e0",
};

const section = {
  padding: 14,
  border: "1px solid #e8e5e0",
  borderRadius: 8,
  background: "#fff",
  marginBottom: 12,
};

const label = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  color: "#8b6a4a",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

const input = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 4,
  border: "1px solid #ded8cf",
  background: "#fff",
  color: "#2d241c",
  outline: "none",
};

const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };

function Button({ children, onClick, disabled, tone = "light", title }) {
  const isDark = tone === "dark";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 38,
        padding: "0 12px",
        borderRadius: 4,
        border: isDark ? "1px solid #c8603a" : "1px solid #ded8cf",
        background: isDark ? "#c8603a" : "#fff",
        color: isDark ? "#fff" : "#2d241c",
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Panel({ m, setM, despiece }) {
  const [selectedCell, setSelectedCell] = useState("0-0");

  const materialOptions = useMemo(() => (
    Object.entries(MATERIALES).map(([key, cfg]) => ({ key, label: cfg?.label || key }))
  ), []);

  const columnas = m.grid?.columnas?.length ? m.grid.columnas : [{ pct: 100 }];
  const filas = m.grid?.filas?.length ? m.grid.filas : [{ pct: 100 }];
  const [selRow, selCol] = selectedCell.split("-").map((n) => Number(n) || 0);
  const currentCellKey = makeGridKey(Math.min(selRow, filas.length - 1), Math.min(selCol, columnas.length - 1));
  const currentCell = m.grid?.celdas?.[currentCellKey] || defaultCell();

  const setField = (key, value) => setM((prev) => ({ ...prev, [key]: value }));

  const setNested = (path, value) => {
    const keys = path.split(".");
    setM((prev) => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        cur[keys[i]] = cur[keys[i]] ? { ...cur[keys[i]] } : {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const setGrid = (grid) => setField("grid", grid);

  const setCell = (key, patch) => {
    setM((prev) => ({
      ...prev,
      grid: {
        ...(prev.grid || {}),
        celdas: {
          ...(prev.grid?.celdas || {}),
          [key]: { ...(prev.grid?.celdas?.[key] || defaultCell()), ...patch },
        },
      },
    }));
  };

  const selectMaterial = (value, onChange) => (
    <select style={input} value={value} onChange={(e) => onChange(e.target.value)}>
      {materialOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
    </select>
  );

  const setPieceMaterial = (pieza, matKey) => {
    setM((prev) => ({
      ...prev,
      materialesPorPieza: {
        ...(prev.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT),
        [pieza]: matKey,
      },
    }));
  };

  const changeTipo = (tipo) => {
    const preset = createPreset(tipo);
    setSelectedCell("0-0");
    setM((prev) => ({
      ...preset,
      fondoModo: prev.fondoModo || preset.fondoModo,
      material: prev.material || preset.material,
      materialesPorPieza: prev.materialesPorPieza || preset.materialesPorPieza,
      __shotApi: prev.__shotApi,
    }));
  };

  const updateAxis = (axis, index, patch) => {
    const grid = m.grid || createPreset("modulo_libre").grid;
    const nextAxis = [...(grid[axis] || [])];
    nextAxis[index] = { ...nextAxis[index], ...patch };
    setGrid({ ...grid, [axis]: nextAxis });
  };

  const addColumn = () => {
    const grid = m.grid || createPreset("modulo_libre").grid;
    const next = [...(grid.columnas || []), { pct: 100 }];
    setGrid({ ...grid, columnas: next });
  };

  const addRow = () => {
    const grid = m.grid || createPreset("modulo_libre").grid;
    const next = [...(grid.filas || []), { pct: 100 }];
    setGrid({ ...grid, filas: next });
  };

  const removeColumn = () => {
    if (columnas.length <= 1) return;
    const grid = m.grid || {};
    setSelectedCell("0-0");
    setGrid({ ...grid, columnas: columnas.slice(0, -1) });
  };

  const removeRow = () => {
    if (filas.length <= 1) return;
    const grid = m.grid || {};
    setSelectedCell("0-0");
    setGrid({ ...grid, filas: filas.slice(0, -1) });
  };

  const exportCSV = () => exportDespieceCSV({ despiece, filenameBase: `despiece_${m.tipo || "mueble"}` });
  const exportPDF = () => exportDespiecePDFPrint({
    despiece,
    titulo: `Despiece - ${m.tipo || "mueble"}`,
    meta: {
      Tipo: m.tipo,
      Material: m.material,
      Medidas: `${m.ancho} x ${m.alto} x ${m.profundidad} mm`,
      Espesor: `${m.espesor} mm`,
    },
  });
  const downloadOne = () => {
    const dataUrl = m.__shotApi?.captureOne?.();
    if (dataUrl) downloadDataUrl(`mueble_${m.tipo || "vista"}.png`, dataUrl);
  };

  const mp = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;
  const canExport = Array.isArray(despiece) && despiece.length > 0;

  return (
    <div style={panel}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, lineHeight: 1, fontWeight: 900, color: "#2d241c" }}>Generador 3D</div>
        <div style={{ marginTop: 5, fontSize: 12, color: "#766a5c" }}>{despiece.length} piezas calculadas</div>
      </div>

      <div style={section}>
        <div style={row2}>
          <div>
            <label style={label}>Tipo de mueble</label>
            <select style={input} value={m.tipo || "biblioteca"} onChange={(e) => changeTipo(e.target.value)}>
              {TIPOS.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Material global</label>
            {selectMaterial(m.material || "melamina_blanca", (value) => setField("material", value))}
          </div>
        </div>
        <div style={{ marginTop: 10, ...row2 }}>
          <div>
            <label style={label}>Fondo visual</label>
            <select style={input} value={m.fondoModo || "habitacion"} onChange={(e) => setField("fondoModo", e.target.value)}>
              <option value="habitacion">Habitacion</option>
              <option value="gris">Gris</option>
              <option value="hdri">HDRI</option>
            </select>
          </div>
          <div>
            <label style={label}>Fondo del mueble</label>
            <select style={input} value={m.fondoActivo === false ? "no" : "si"} onChange={(e) => setField("fondoActivo", e.target.value === "si")}>
              <option value="si">Con fondo</option>
              <option value="no">Sin fondo</option>
            </select>
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={{ fontWeight: 900, marginBottom: 10, color: "#2d241c" }}>Medidas generales</div>
        <div style={row2}>
          <div>
            <label style={label}>Ancho mm</label>
            <input style={input} type="number" value={m.ancho ?? 1000} onChange={(e) => setField("ancho", clampNum(e.target.value, 1))} />
          </div>
          <div>
            <label style={label}>Alto mm</label>
            <input style={input} type="number" value={m.alto ?? 1800} onChange={(e) => setField("alto", clampNum(e.target.value, 1))} />
          </div>
        </div>
        <div style={{ marginTop: 10, ...row2 }}>
          <div>
            <label style={label}>Profundidad mm</label>
            <input style={input} type="number" value={m.profundidad ?? 350} onChange={(e) => setField("profundidad", clampNum(e.target.value, 1))} />
          </div>
          <div>
            <label style={label}>Espesor mm</label>
            <input style={input} type="number" value={m.espesor ?? 18} onChange={(e) => setField("espesor", clampNum(e.target.value, 1))} />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={{ fontWeight: 900, marginBottom: 10, color: "#2d241c" }}>Materiales por pieza</div>
        <div style={row2}>
          <div><label style={label}>Cuerpo</label>{selectMaterial(mp.cuerpo || m.material, (v) => setPieceMaterial("cuerpo", v))}</div>
          <div><label style={label}>Tapa</label>{selectMaterial(mp.tapa || m.material, (v) => setPieceMaterial("tapa", v))}</div>
        </div>
        <div style={{ marginTop: 10, ...row2 }}>
          <div><label style={label}>Estantes</label>{selectMaterial(mp.estantes || m.material, (v) => setPieceMaterial("estantes", v))}</div>
          <div><label style={label}>Frentes</label>{selectMaterial(mp.frentes || m.material, (v) => setPieceMaterial("frentes", v))}</div>
        </div>
        <div style={{ marginTop: 10, ...row2 }}>
          <div><label style={label}>Fondo</label>{selectMaterial(mp.fondo || m.material, (v) => setPieceMaterial("fondo", v))}</div>
          <div><label style={label}>Patas / barral</label>{selectMaterial(mp.patas || "pino", (v) => { setPieceMaterial("patas", v); setPieceMaterial("barral", v); })}</div>
        </div>
      </div>

      {m.tipo !== "escritorio" ? (
        <>
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, color: "#2d241c" }}>Estructura editable</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Button onClick={addColumn}>+ Col</Button>
                <Button onClick={removeColumn} disabled={columnas.length <= 1}>- Col</Button>
                <Button onClick={addRow}>+ Fila</Button>
                <Button onClick={removeRow} disabled={filas.length <= 1}>- Fila</Button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <label style={label}>Columnas, proporcion visual</label>
                <div style={{ display: "grid", gap: 6 }}>
                  {columnas.map((col, index) => (
                    <div key={`col-${index}`} style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>Col {index + 1}</span>
                      <input style={input} type="number" value={col.pct ?? 100} onChange={(e) => updateAxis("columnas", index, { pct: clampNum(e.target.value, 1) })} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={label}>Filas, de arriba hacia abajo</label>
                <div style={{ display: "grid", gap: 6 }}>
                  {filas.map((fila, index) => (
                    <div key={`row-${index}`} style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>Fila {index + 1}</span>
                      <input style={input} type="number" value={fila.pct ?? 100} onChange={(e) => updateAxis("filas", index, { pct: clampNum(e.target.value, 1) })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={label}>Seleccionar celda</label>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnas.length}, minmax(0, 1fr))`, gap: 6 }}>
                {filas.map((_, row) => columnas.map((__, col) => {
                  const key = makeGridKey(row, col);
                  const cfg = m.grid?.celdas?.[key] || defaultCell();
                  const active = key === currentCellKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedCell(key)}
                      style={{
                        minHeight: 42,
                        borderRadius: 4,
                        border: active ? "2px solid #c8603a" : "1px solid #ded8cf",
                        background: active ? "#fff4ef" : "#fff",
                        color: "#2d241c",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {row + 1}.{col + 1}<br />{CELL_TYPES.find((t) => t.id === cfg.tipo)?.label || cfg.tipo}
                    </button>
                  );
                }))}
              </div>
            </div>
          </div>

          <div style={section}>
            <div style={{ fontWeight: 900, marginBottom: 10, color: "#2d241c" }}>Celda {currentCellKey.replace("-", ".")}</div>
            <div style={row2}>
              <div>
                <label style={label}>Tipo</label>
                <select style={input} value={currentCell.tipo || "estantes"} onChange={(e) => setCell(currentCellKey, { ...defaultCell(), ...currentCell, tipo: e.target.value })}>
                  {CELL_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
              </div>
              {currentCell.tipo === "estantes" ? (
                <div>
                  <label style={label}>Estantes internos</label>
                  <input style={input} type="number" value={currentCell.estantes ?? 1} onChange={(e) => setCell(currentCellKey, { estantes: clampNum(e.target.value, 0) })} />
                </div>
              ) : currentCell.tipo === "puertas" ? (
                <div>
                  <label style={label}>Hojas</label>
                  <input style={input} type="number" value={currentCell.puertas?.hojas ?? 2} onChange={(e) => setCell(currentCellKey, { puertas: { ...(currentCell.puertas || {}), activo: true, hojas: clampNum(e.target.value, 1) } })} />
                </div>
              ) : <div />}
            </div>

            {currentCell.tipo === "cajones" && (
              <div style={{ marginTop: 10 }}>
                <label style={label}>Cajones</label>
                {(currentCell.cajones || []).map((drawer, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                    <input
                      style={input}
                      type="number"
                      value={drawer.alto ?? 160}
                      onChange={(e) => {
                        const cajones = [...(currentCell.cajones || [])];
                        cajones[index] = { ...drawer, alto: clampNum(e.target.value, 40) };
                        setCell(currentCellKey, { cajones });
                      }}
                    />
                    <Button onClick={() => setCell(currentCellKey, { cajones: (currentCell.cajones || []).filter((_, i) => i !== index) })}>Quitar</Button>
                  </div>
                ))}
                <Button tone="dark" onClick={() => setCell(currentCellKey, { tipo: "cajones", cajones: [...(currentCell.cajones || []), { alto: 160 }] })}>Agregar cajon</Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={section}>
          <div style={{ fontWeight: 900, marginBottom: 10, color: "#2d241c" }}>Escritorio editable</div>
          <div style={row2}>
            <div>
              <label style={label}>Vuelo tapa mm</label>
              <input style={input} type="number" value={m.escritorio?.tapaVuelo ?? 0} onChange={(e) => setNested("escritorio.tapaVuelo", clampNum(e.target.value, 0))} />
            </div>
            <div>
              <label style={label}>Falda mm</label>
              <input style={input} type="number" value={m.escritorio?.falda ?? m.falda ?? 80} onChange={(e) => setNested("escritorio.falda", clampNum(e.target.value, 0))} />
            </div>
          </div>
          {["ladoIzq", "ladoDer"].map((sideKey) => {
            const side = m.escritorio?.[sideKey] || {};
            return (
              <div key={sideKey} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>{sideKey === "ladoIzq" ? "Modulo izquierdo" : "Modulo derecho"}</div>
                <div style={row2}>
                  <div>
                    <label style={label}>Activo</label>
                    <select style={input} value={side.activo === false ? "no" : "si"} onChange={(e) => setNested(`escritorio.${sideKey}.activo`, e.target.value === "si")}>
                      <option value="si">Si</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>Ancho mm</label>
                    <input style={input} type="number" value={side.ancho ?? 340} onChange={(e) => setNested(`escritorio.${sideKey}.ancho`, clampNum(e.target.value, 0))} />
                  </div>
                </div>
                <div style={{ marginTop: 10, ...row2 }}>
                  <div>
                    <label style={label}>Tipo</label>
                    <select style={input} value={side.tipo || "cajones"} onChange={(e) => setNested(`escritorio.${sideKey}.tipo`, e.target.value)}>
                      <option value="cajones">Cajones</option>
                      <option value="estantes">Estantes</option>
                      <option value="puertas">Puertas</option>
                      <option value="vacio">Vacio</option>
                    </select>
                  </div>
                  {side.tipo === "estantes" ? (
                    <div>
                      <label style={label}>Estantes</label>
                      <input style={input} type="number" value={side.estantes ?? 2} onChange={(e) => setNested(`escritorio.${sideKey}.estantes`, clampNum(e.target.value, 0))} />
                    </div>
                  ) : <div />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={section}>
        <div style={{ fontWeight: 900, marginBottom: 10, color: "#2d241c" }}>Soporte</div>
        <div style={row2}>
          <div>
            <label style={label}>Tipo</label>
            <select style={input} value={m.soporte || "nada"} onChange={(e) => setField("soporte", e.target.value)}>
              <option value="nada">Nada</option>
              <option value="patas">Patas</option>
              <option value="zocalo">Zocalo</option>
            </select>
          </div>
          <div>
            <label style={label}>{m.soporte === "zocalo" ? "Altura zocalo" : "Altura patas"} mm</label>
            <input
              style={input}
              type="number"
              value={m.soporte === "zocalo" ? m.zocalo?.altura ?? 80 : m.patas?.altura ?? 100}
              onChange={(e) => {
                if (m.soporte === "zocalo") setNested("zocalo.altura", clampNum(e.target.value, 0));
                else setNested("patas.altura", clampNum(e.target.value, 0));
              }}
              disabled={(m.soporte || "nada") === "nada"}
            />
          </div>
        </div>
        {m.soporte === "zocalo" && (
          <div style={{ marginTop: 10 }}>
            <label style={label}>Retiro zocalo mm</label>
            <input style={input} type="number" value={m.zocalo?.retiro ?? 20} onChange={(e) => setNested("zocalo.retiro", clampNum(e.target.value, 0))} />
          </div>
        )}
      </div>

      <div style={section}>
        <div style={{ fontWeight: 900, marginBottom: 10, color: "#2d241c" }}>Produccion</div>
        <div style={row2}>
          <Button onClick={exportCSV} disabled={!canExport}>Exportar CSV</Button>
          <Button onClick={exportPDF} disabled={!canExport}>Exportar PDF</Button>
        </div>
        <div style={{ marginTop: 10, ...row2 }}>
          <Button onClick={downloadOne} disabled={!m.__shotApi}>PNG vista</Button>
          <Button onClick={() => setM(createPreset(m.tipo || "biblioteca"))}>Reset tipo</Button>
        </div>
      </div>
    </div>
  );
}
