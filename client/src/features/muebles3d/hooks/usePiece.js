import { useMemo } from "react";
import { MATERIALES_POR_PIEZA_DEFAULT, defaultCell, makeGridKey } from "../constants/defaults";
import { DOOR_THICK_MM, FRONT_GAP_MM, LEG_SIZE_MM, MM_TO_UNITS } from "../constants/medidas";
import { clampNum } from "../utils/clamp";
import { normalizeDimsMm } from "../utils/normalizeDimsMm";

function normalizedWeights(items, fallbackCount = 1) {
  const source = Array.isArray(items) && items.length ? items : Array.from({ length: fallbackCount }, () => ({ pct: 100 / fallbackCount }));
  const nums = source.map((item) => Math.max(0.1, Number(item?.pct || 0)));
  const total = nums.reduce((acc, n) => acc + n, 0) || 1;
  return nums.map((n) => n / total);
}

function getCell(m, row, col) {
  return m.grid?.celdas?.[makeGridKey(row, col)] || defaultCell();
}

export function usePieces(m) {
  return useMemo(() => {
    const s = MM_TO_UNITS;
    const W = Math.max(1, Number(m.ancho || 1)) * s;
    const H = Math.max(1, Number(m.alto || 1)) * s;
    const D = Math.max(1, Number(m.profundidad || 1)) * s;
    const T = Math.max(1, Number(m.espesor || 1)) * s;
    const doorT = DOOR_THICK_MM * s;
    const zFront = D / 2 + doorT / 2 + FRONT_GAP_MM * s;
    const zInside = T / 2;
    const usableDepth = Math.max(D - T, T);
    const backOffset = 8 * s;

    const pieces = [];
    const despiece = [];
    const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

    const addBox = (size, pos, pieza = "cuerpo", nombre = "", options = {}) => {
      if (size.some((n) => !Number.isFinite(n) || n <= 0)) return;
      pieces.push({ size, pos, pieza, nombre });
      if (options.despiece === false) return;

      const materialKey = materialesPorPieza[pieza] || m.material;
      const norm = normalizeDimsMm(size[0] / s, size[1] / s, size[2] / s, m.espesor);
      despiece.push({
        nombre: nombre || pieza,
        pieza,
        ancho_mm: norm.ancho_mm,
        alto_mm: norm.largo_mm,
        espesor_mm: norm.espesor_mm,
        material: materialKey,
      });
    };

    const addCarcass = (bodyH = H, yCenter = 0) => {
      const innerW = Math.max(W - 2 * T, T);
      const innerH = Math.max(bodyH - 2 * T, T);
      const xSide = W / 2 - T / 2;
      const yBase = yCenter - bodyH / 2 + T / 2;
      const yTop = yCenter + bodyH / 2 - T / 2;

      addBox([T, bodyH, D], [-xSide, yCenter, 0], "cuerpo", "Lateral izquierdo");
      addBox([T, bodyH, D], [xSide, yCenter, 0], "cuerpo", "Lateral derecho");
      addBox([innerW, T, usableDepth], [0, yBase, zInside], "cuerpo", "Base");
      addBox([innerW, T, usableDepth], [0, yTop, zInside], "tapa", "Tapa");

      if (m.fondoActivo !== false) {
        addBox([innerW, bodyH, T], [0, yCenter, -D / 2 + T / 2 - backOffset], "fondo", "Fondo");
      }

      return { innerW, innerH, yBottom: yCenter - bodyH / 2 + T, yTop: yCenter + bodyH / 2 - T };
    };

    const addCellContent = ({ cfg, x, y, width, height, label }) => {
      const type = cfg?.tipo || "estantes";
      const innerW = Math.max(width - 2 * T, T);
      const contentW = Math.max(width, T);
      const yBottom = y;

      if (type === "estantes") {
        const n = Math.max(0, Math.floor(cfg?.estantes ?? 1));
        const step = height / (n + 1);
        for (let i = 1; i <= n; i += 1) {
          addBox([contentW, T, usableDepth], [x, yBottom + step * i, zInside], "estantes", `${label} estante ${i}`);
        }
      }

      if (type === "puertas") {
        const hojas = Math.max(1, Math.floor(cfg?.puertas?.hojas || 1));
        const eachW = contentW / hojas;
        for (let i = 0; i < hojas; i += 1) {
          addBox(
            [eachW, Math.max(height, T), doorT],
            [x - contentW / 2 + eachW * i + eachW / 2, yBottom + height / 2, zFront],
            "frentes",
            `${label} puerta ${i + 1}`
          );
        }
      }

      if (type === "cajones") {
        const cajones = Array.isArray(cfg?.cajones) && cfg.cajones.length ? cfg.cajones : [{ alto: 160 }, { alto: 160 }];
        const drawerGap = Math.min(4 * s, Math.max(height * 0.035, 2 * s));
        const frontInset = Math.min(6 * s, Math.max(innerW * 0.025, 2 * s));
        const handleW = Math.max(Math.min(innerW * 0.42, 180 * s), Math.min(innerW * 0.64, 80 * s));
        const handleH = Math.max(10 * s, T * 0.45);
        const handleD = Math.max(10 * s, doorT * 0.7);
        let yStack = yBottom;
        cajones.forEach((drawer, i) => {
          const h = Math.min(clampNum(drawer?.alto, 40) * s, Math.max(yBottom + height - yStack, 0));
          if (h <= T) return;
          const visibleH = Math.max(h - drawerGap, T);
          const frontW = Math.max(innerW - frontInset * 2, T);
          const frontY = yStack + drawerGap / 2 + visibleH / 2;
          addBox([frontW, visibleH, doorT], [x, frontY, zFront], "frentes", `${label} frente cajon ${i + 1}`);

          addBox(
            [Math.min(handleW, frontW * 0.72), handleH, handleD],
            [x, frontY + Math.max(visibleH * 0.22, handleH * 1.7), zFront + doorT * 0.68],
            "tiradores",
            `${label} tirador cajon ${i + 1}`,
            { despiece: false }
          );

          if (i > 0) {
            addBox(
              [frontW, Math.max(2 * s, T * 0.12), Math.max(2 * s, doorT * 0.16)],
              [x, yStack + drawerGap * 0.45, zFront + doorT * 0.58],
              "tiradores",
              `${label} sombra entre cajones ${i}`,
              { despiece: false }
            );
          }
          yStack += h;
        });
      }

      if (type === "perchero") {
        const barH = Math.max(T, 22 * s);
        addBox([Math.max(contentW - T, T), barH, barH], [x, yBottom + height * 0.72, zInside], "barral", `${label} barral`);
        const shelfY = yBottom + height * 0.88;
        addBox([contentW, T, usableDepth], [x, shelfY, zInside], "estantes", `${label} estante superior`);
      }
    };

    const addGridFurniture = () => {
      const { innerW, innerH, yBottom } = addCarcass();
      const colWeights = normalizedWeights(m.grid?.columnas, 1);
      const rowWeights = normalizedWeights(m.grid?.filas, 1);
      const colWidths = colWeights.map((w) => innerW * w);
      const rowHeights = rowWeights.map((w) => innerH * w);

      let xCursor = -innerW / 2;
      for (let col = 0; col < colWidths.length - 1; col += 1) {
        xCursor += colWidths[col];
        addBox([T, innerH, usableDepth], [xCursor, yBottom + innerH / 2, zInside], "cuerpo", `Divisor vertical ${col + 1}`);
      }

      let yCursor = yBottom;
      for (let row = rowHeights.length - 1; row > 0; row -= 1) {
        yCursor += rowHeights[row];
        addBox([innerW, T, usableDepth], [0, yCursor, zInside], "cuerpo", `Divisor horizontal ${row}`);
      }

      let topCursor = yBottom + innerH;
      rowHeights.forEach((rowH, rowIndex) => {
        const cellY = topCursor - rowH;
        let cellX = -innerW / 2;
        colWidths.forEach((colW, colIndex) => {
          const cfg = getCell(m, rowIndex, colIndex);
          addCellContent({
            cfg,
            x: cellX + colW / 2,
            y: cellY,
            width: Math.max(colW - T, T),
            height: Math.max(rowH - T, T),
            label: `Celda ${rowIndex + 1}.${colIndex + 1}`,
          });
          cellX += colW;
        });
        topCursor -= rowH;
      });
    };

    const addDesk = () => {
      const desk = m.escritorio || {};
      const vuelo = clampNum(desk.tapaVuelo ?? 0, 0) * s;
      const topY = H - T / 2;
      addBox([W + 2 * vuelo, T, D + 2 * vuelo], [0, topY, 0], "tapa", "Tapa escritorio");

      const usableH = Math.max(H - T, T);
      const sideBottom = 0;
      const sideCenterY = sideBottom + usableH / 2;
      const left = desk.ladoIzq || {};
      const right = desk.ladoDer || {};
      const leftW = left.activo === false ? 0 : Math.min(clampNum(left.ancho ?? 350, 0) * s, W / 2);
      const rightW = right.activo === false ? 0 : Math.min(clampNum(right.ancho ?? 350, 0) * s, W / 2);

      const renderSide = (cfg, xCenter, width, label) => {
        if (width <= 0) return;
        addBox([T, usableH, D], [xCenter - width / 2 + T / 2, sideCenterY, 0], "cuerpo", `${label} lateral exterior`);
        addBox([T, usableH, D], [xCenter + width / 2 - T / 2, sideCenterY, 0], "cuerpo", `${label} lateral interior`);
        addBox([Math.max(width - 2 * T, T), T, usableDepth], [xCenter, sideBottom + T / 2, zInside], "cuerpo", `${label} base`);
        addBox([Math.max(width - 2 * T, T), T, usableDepth], [xCenter, H - T * 1.5, zInside], "cuerpo", `${label} tapa interna`);
        if (m.fondoActivo !== false) {
          addBox([Math.max(width - T, T), usableH, T], [xCenter, sideCenterY, -D / 2 + T / 2 - backOffset], "fondo", `${label} fondo`);
        }
        addCellContent({ cfg, x: xCenter, y: sideBottom + T, width: Math.max(width - 2 * T, T), height: Math.max(usableH - 2 * T, T), label });
      };

      renderSide(left, -W / 2 + leftW / 2, leftW, "Modulo izquierdo");
      renderSide(right, W / 2 - rightW / 2, rightW, "Modulo derecho");

      const openW = Math.max(W - leftW - rightW, 0);
      if ((desk.traseraModo || "falda") === "falda" && openW > 0) {
        const falda = clampNum(desk.falda ?? m.falda ?? 80, 0) * s;
        if (falda > 0) {
          addBox([openW, falda, T], [(-W / 2 + leftW + W / 2 - rightW) / 2, H - T - falda / 2, -D / 2 + T / 2 - backOffset], "cuerpo", "Falda escritorio");
        }
      }
    };

    if (m.tipo === "escritorio") addDesk();
    else addGridFurniture();

    const soporte = m.soporte || (m.patas?.activo ? "patas" : "nada");
    if (soporte === "zocalo") {
      const h = clampNum(m.zocalo?.altura ?? 80, 0) * s;
      const retiro = clampNum(m.zocalo?.retiro ?? 20, 0) * s;
      if (h > 0) {
        addBox([Math.max(W - 2 * retiro, T), h, Math.max(D - 2 * retiro, T)], [0, -h / 2, 0], "zocalo", "Zocalo");
      }
    }

    if (soporte === "patas") {
      const h = Math.max(clampNum(m.patas?.altura ?? 100, 0) * s, T);
      const size = Math.min(LEG_SIZE_MM * s, W / 8, D / 6);
      const y = -h / 2;
      const x = W / 2 - size;
      const z = D / 2 - size;
      addBox([size, h, size], [-x, y, z], "patas", "Pata delantera izquierda");
      addBox([size, h, size], [x, y, z], "patas", "Pata delantera derecha");
      addBox([size, h, size], [-x, y, -z], "patas", "Pata trasera izquierda");
      addBox([size, h, size], [x, y, -z], "patas", "Pata trasera derecha");
    }

    const minY = pieces.reduce((acc, p) => Math.min(acc, p.pos[1] - p.size[1] / 2), Infinity);
    if (Number.isFinite(minY) && minY !== 0) {
      pieces.forEach((p) => {
        p.pos = [p.pos[0], p.pos[1] - minY, p.pos[2]];
      });
    }

    return { pieces, despiece };
  }, [m]);
}
