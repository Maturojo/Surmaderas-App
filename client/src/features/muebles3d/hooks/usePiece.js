import { useMemo } from "react";
import {
  MATERIALES_POR_PIEZA_DEFAULT,
  defaultDeskSide,
  defaultSideBottom,
  defaultSideTop,
} from "../constants/defaults";
import {
  MM_TO_UNITS,
  FRONT_GAP_MM,
  DOOR_THICK_MM,
  LEG_SIZE_MM,
} from "../constants/medidas";
import { clampNum } from "../utils/clamp";
import { normalizeDimsMm } from "../utils/normalizeDimsMm";

export function usePieces(m) {
  const s = MM_TO_UNITS;

  const W = Math.max(1, Number(m.ancho || 1)) * s;
  const H = Math.max(1, Number(m.alto || 1)) * s;
  const D = Math.max(1, Number(m.profundidad || 1)) * s;
  const T = Math.max(1, Number(m.espesor || 1)) * s;

  const usableDepth = Math.max(D - T, T);
  const zUsableCenter = T / 2;

  // ✅ soporte global (nuevo) con compatibilidad
  const soporte = m.soporte || (m.patas?.activo ? "patas" : "nada");

  // patas (si soporte=patas)
  const legsOn = soporte === "patas";
  const legH = (legsOn ? Math.max(0, Number(m.patas?.altura || 0)) : 0) * s;

  return useMemo(() => {
    const list = [];
    const despiece = [];

    const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

    const addBox = (size, pos, pieza = "cuerpo", nombre = "") => {
      list.push({ size, pos, pieza, nombre });

      const materialKey = materialesPorPieza[pieza] || m.material;

      const mmX = size[0] / s;
      const mmY = size[1] / s;
      const mmZ = size[2] / s;

      const norm = normalizeDimsMm(mmX, mmY, mmZ, m.espesor);

      despiece.push({
        nombre: nombre || pieza,
        pieza,
        ancho_mm: norm.ancho_mm,
        alto_mm: norm.largo_mm,
        espesor_mm: norm.espesor_mm,
        material: materialKey,
      });
    };

    const zFront = D / 2 + (DOOR_THICK_MM * s) / 2 + FRONT_GAP_MM * s;

    // ✅ Fondo un poco más alejado
    const BACK_OFFSET_MM = 8;
    const BACK_OFFSET = BACK_OFFSET_MM * s;

    const makeCaja = () => {
      const bodyH = H;
      const yBodyCenter = 0;

      const xSide = W / 2 - T / 2;
      const innerW = Math.max(W - 2 * T, T);

      addBox([T, bodyH, D], [xSide, yBodyCenter, 0], "cuerpo", "Lateral derecho");
      addBox([T, bodyH, D], [-xSide, yBodyCenter, 0], "cuerpo", "Lateral izquierdo");

      const yBase = yBodyCenter - bodyH / 2 + T / 2;
      const yTop = yBodyCenter + bodyH / 2 - T / 2;

      addBox([innerW, T, usableDepth], [0, yBase, zUsableCenter], "cuerpo", "Base");
      addBox([innerW, T, usableDepth], [0, yTop, zUsableCenter], "tapa", "Tapa");

      const zBack = -D / 2 + T / 2 - BACK_OFFSET;
      addBox([innerW, bodyH, T], [0, yBodyCenter, zBack], "fondo", "Fondo");

      return { innerW, bodyH, yBodyCenter };
    };

    /* ====== ESTANTERÍA SIMPLE ====== */
    if (m.tipo === "estanteria") {
      const { innerW, bodyH, yBodyCenter } = makeCaja();
      const yInnerBottom = yBodyCenter - bodyH / 2 + T;
      const innerH = Math.max(bodyH - 2 * T, T);

      const n = Math.max(0, Math.floor(m.estantes || 0));
      if (n > 0) {
        const step = innerH / (n + 1);
        for (let i = 1; i <= n; i++) {
          addBox([innerW, T, usableDepth], [0, yInnerBottom + step * i, zUsableCenter], "estantes", `Estante ${i}`);
        }
      }
    }

    /* ====== ESCRITORIO ====== */
    if (m.tipo === "escritorio") {
      const faldaMm = Math.max(0, Number(m.falda || 0));
      const falda = faldaMm * s;

      // ✅ vuelo tapa
      const vueloMm = clampNum(m.escritorio?.tapaVuelo ?? 0, 0);
      const vuelo = vueloMm * s;

      const yTop = H / 2 - T / 2;
      addBox([W + 2 * vuelo, T, D + 2 * vuelo], [0, yTop, 0], "tapa", "Tapa escritorio");

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

      const xLeftEdge = -W / 2 + lW;
      const xRightEdge = W / 2 - rW;

      const panelW = Math.max(xRightEdge - xLeftEdge, 0);
      const panelX = (xLeftEdge + xRightEdge) / 2;

      const EPS = 0.0005;
      const zBack = -D / 2 + T / 2 - BACK_OFFSET - EPS;

      const traseraModo = m.escritorio?.traseraModo || "falda";

      if (traseraModo === "fondo" && panelW > 0) {
        const fondoAlturaMm = clampNum(m.escritorio?.fondoAlturaMm ?? 0, 0);
        const fondoAltura = fondoAlturaMm > 0 ? fondoAlturaMm * s : 0;

        const cortePorPatas = m.escritorio?.cortePorPatas !== false;

        const floorY = -H / 2;
        const bottomClear = cortePorPatas && legsOn ? legH : 0;

        const yTopInner = yTop - T / 2;
        const yBottomLimit = floorY + bottomClear;

        const maxFondoH = Math.max(yTopInner - yBottomLimit, T);
        const fondoH = fondoAltura > 0 ? Math.min(fondoAltura, maxFondoH) : maxFondoH;

        const yFondoCenter = yTopInner - fondoH / 2;
        addBox([panelW, fondoH, T], [panelX, yFondoCenter, zBack], "fondo", "Fondo trasero escritorio");
      }

      if (traseraModo === "falda" && falda > 0 && panelW > 0) {
        const yFalda = yTop - T / 2 - falda / 2;
        addBox([panelW, falda, T], [panelX, yFalda, zBack], "cuerpo", "Falda escritorio");
      }

      const renderDeskSide = (cfg, xCenter, sideW, isLeft) => {
        if (!cfg?.activo || sideW <= 0) return;

        const xStart = xCenter - sideW / 2;
        const xEnd = xCenter + sideW / 2;

        const yBottom = ySupportCenter - supportH / 2;
        const yTopLocal = ySupportCenter + supportH / 2;

        if (cfg.tipo === "vacio") {
          const modo = cfg.soporteVacio || "placa";

          if (modo === "placa") {
            const xPanel = isLeft ? xStart + T / 2 : xEnd - T / 2;
            addBox([T, supportH, D], [xPanel, ySupportCenter, 0], "cuerpo", "Soporte placa");
            return;
          }

          if (modo === "marco") {
            const xOuter = isLeft ? xStart + T / 2 : xEnd - T / 2;
            const xInner = isLeft ? xEnd - T / 2 : xStart + T / 2;
            addBox([T, supportH, D], [xOuter, ySupportCenter, 0], "cuerpo", "Marco exterior");
            addBox([T, supportH, D], [xInner, ySupportCenter, 0], "cuerpo", "Marco interior");
            return;
          }

          if (modo === "patas") {
            const legSize = Math.min(LEG_SIZE_MM * s, sideW / 3, D / 3);
            const x1 = xStart + legSize / 2;
            const x2 = xEnd - legSize / 2;
            const z1 = D / 2 - legSize / 2;
            const z2 = -D / 2 + legSize / 2;

            addBox([legSize, supportH, legSize], [x1, ySupportCenter, z1], "patas", "Pata (vacio) 1");
            addBox([legSize, supportH, legSize], [x2, ySupportCenter, z1], "patas", "Pata (vacio) 2");
            addBox([legSize, supportH, legSize], [x1, ySupportCenter, z2], "patas", "Pata (vacio) 3");
            addBox([legSize, supportH, legSize], [x2, ySupportCenter, z2], "patas", "Pata (vacio) 4");
            return;
          }

          return;
        }

        const innerSideW = Math.max(sideW - 2 * T, T);

        addBox([T, supportH, D], [xStart + T / 2, ySupportCenter, 0], "cuerpo", "Lateral módulo");
        addBox([T, supportH, D], [xEnd - T / 2, ySupportCenter, 0], "cuerpo", "Lateral módulo");

        addBox([innerSideW, T, usableDepth], [xCenter, yBottom + T / 2, zUsableCenter], "cuerpo", "Base módulo");
        addBox([innerSideW, T, usableDepth], [xCenter, yTopLocal - T / 2, zUsableCenter], "cuerpo", "Tapa módulo");

        const zBackSide = -D / 2 + T / 2 - BACK_OFFSET;
        addBox([Math.max(sideW - T, T), supportH, T], [xCenter, ySupportCenter, zBackSide], "fondo", "Fondo módulo");

        if (cfg.tipo === "estanteria") {
          const n = Math.max(0, Math.floor(cfg.estantes || 0));
          if (n > 0) {
            const usableH = Math.max(supportH - 2 * T, T);
            const step = usableH / (n + 1);
            const yShelfStart = yBottom + T;
            for (let i = 1; i <= n; i++) {
              const y = yShelfStart + step * i;
              addBox([innerSideW, T, usableDepth], [xCenter, y, zUsableCenter], "estantes", `Estante módulo ${i}`);
            }
          }
        }

        if (cfg.tipo === "cajonera") {
          const doorT = DOOR_THICK_MM * s;
          const yStart = yBottom + T;
          const usableH = Math.max(supportH - 2 * T, T);

          let yStack = yStart;
          const cajones = Array.isArray(cfg.cajones) ? cfg.cajones : [];

          for (let i = 0; i < cajones.length; i++) {
            const h = clampNum(cajones[i].alto, 40) * s;
            if (yStack + h > yStart + usableH) break;

            addBox([innerSideW, h, doorT], [xCenter, yStack + h / 2, zFront], "frentes", `Frente cajón ${i + 1}`);
            yStack += h;
          }
        }
      };

      const xLeftCenter = -W / 2 + lW / 2;
      const xRightCenter = W / 2 - rW / 2;

      renderDeskSide(left, xLeftCenter, lW, true);
      renderDeskSide(right, xRightCenter, rW, false);
    }

    /* ====== MÓDULO POR ZONAS ====== */
    if (m.tipo === "modulo_zonas") {
      const { innerW, bodyH, yBodyCenter } = makeCaja();

      const yInnerBottom = yBodyCenter - bodyH / 2 + T;
      const innerH = Math.max(bodyH - 2 * T, T);

      const hSupMm = clampNum(m.zonas?.altoSuperior ?? 0, 0);
      const hSup = Math.min(hSupMm * s, innerH);
      const hInf = Math.max(innerH - hSup, 0);

      const hasDivider = hSup > 0 && hInf > 0;
      if (hasDivider) addBox([innerW, T, usableDepth], [0, yInnerBottom + hInf, zUsableCenter], "cuerpo", "Divisor horizontal");

      const halfW = innerW / 2;

      const renderCfgBlock = (cfg, xCenter, yStart, zoneH, width, allowCajonera) => {
        if (!cfg || cfg.tipo === "vacio" || zoneH <= 0) return;

        if (cfg.tipo === "estanteria") {
          const n = Math.max(0, Math.floor(cfg.estantes || 0));
          if (n > 0) {
            const step = zoneH / (n + 1);
            for (let i = 1; i <= n; i++) {
              addBox([width, T, usableDepth], [xCenter, yStart + step * i, zUsableCenter], "estantes", `Estante zona ${i}`);
            }
          }
        }

        if (cfg.tipo === "puertas" && cfg.puertas?.activo) {
          const hojas = Math.max(1, Math.floor(cfg.puertas.hojas || 1));
          const doorT = DOOR_THICK_MM * s;
          const doorH = Math.max(zoneH, T);
          const yDoor = yStart + doorH / 2;
          const eachW = width / hojas;

          for (let h = 0; h < hojas; h++) {
            const x = xCenter - width / 2 + eachW * h + eachW / 2;
            addBox([eachW, doorH, doorT], [x, yDoor, zFront], "frentes", `Puerta hoja ${h + 1}`);
          }
        }

        if (allowCajonera && cfg.tipo === "cajonera") {
          const doorT = DOOR_THICK_MM * s;
          const cajones = Array.isArray(cfg.cajones) ? cfg.cajones : [];
          let yStack = yStart;

          for (let i = 0; i < cajones.length; i++) {
            const h = clampNum(cajones[i].alto, 40) * s;
            if (yStack + h > yStart + zoneH) break;
            addBox([width, h, doorT], [xCenter, yStack + h / 2, zFront], "frentes", `Frente cajón zona ${i + 1}`);
            yStack += h;
          }
        }
      };

      const yInf = yInnerBottom;
      const ySup = yInnerBottom + hInf + (hasDivider ? T : 0);

      if (m.zonas?.layoutAbajo === "single") {
        renderCfgBlock(m.zonas?.abajo?.single || defaultSideBottom(), 0, yInf, hInf, innerW, true);
      } else {
        addBox([T, hInf, D], [0, yInf + hInf / 2, 0], "cuerpo", "Divisor vertical abajo");
        renderCfgBlock(m.zonas?.abajo?.izquierda || defaultSideBottom(), -innerW / 4, yInf, hInf, halfW, true);
        renderCfgBlock(m.zonas?.abajo?.derecha || defaultSideBottom(), innerW / 4, yInf, hInf, halfW, true);
      }

      if (m.zonas?.layoutArriba === "single") {
        renderCfgBlock(m.zonas?.arriba?.single || defaultSideTop(), 0, ySup, hSup, innerW, false);
      } else {
        addBox([T, hSup, D], [0, ySup + hSup / 2, 0], "cuerpo", "Divisor vertical arriba");
        renderCfgBlock(m.zonas?.arriba?.izquierda || defaultSideTop(), -innerW / 4, ySup, hSup, halfW, false);
        renderCfgBlock(m.zonas?.arriba?.derecha || defaultSideTop(), innerW / 4, ySup, hSup, halfW, false);
      }
    }

    /* ====== ZÓCALO GLOBAL (AL RAS REAL) ====== */
    if (soporte === "zocalo") {
      const zH = clampNum(m.zocalo?.altura ?? 80, 0) * s;
      const retiro = clampNum(m.zocalo?.retiro ?? 0, 0) * s;

      if (zH > 0) {
        // ✅ usa el contorno EXTERIOR del mueble
        const zW = Math.max(W - 2 * retiro, T);
        const zD = Math.max(D - 2 * retiro, T);

        const yZ = -H / 2 - zH / 2;

        // ✅ pieza = "zocalo" para excluir del auto-ground
        addBox([zW, zH, zD], [0, yZ, 0], "zocalo", "Zócalo");
      }
    }

    /* ====== PATAS GLOBALES ====== */
    if (legsOn) {
      const sLeg = Math.min(LEG_SIZE_MM * s, W / 8, D / 6);

      // ✅ patas abajo
      const yLegCenter = -H / 2 - legH / 2;

      // ✅ escritorio: patas pueden acompañar vuelo de tapa
      const isDesk = m.tipo === "escritorio";
      const patasRas = !!m.escritorio?.patasRas;
      const vueloMm = clampNum(m.escritorio?.tapaVuelo ?? 0, 0);
      const vuelo = vueloMm * s;

      const retiroBase = patasRas ? sLeg / 2 : sLeg;
      const xEdge = W / 2 + (isDesk && patasRas ? vuelo : 0);
      const zEdge = D / 2 + (isDesk && patasRas ? vuelo : 0);

      const x1 = -xEdge + retiroBase;
      const x2 = xEdge - retiroBase;
      const z1 = zEdge - retiroBase;
      const z2 = -zEdge + retiroBase;

      addBox([sLeg, legH, sLeg], [x1, yLegCenter, z1], "patas", "Pata global 1");
      addBox([sLeg, legH, sLeg], [x2, yLegCenter, z1], "patas", "Pata global 2");
      addBox([sLeg, legH, sLeg], [x1, yLegCenter, z2], "patas", "Pata global 3");
      addBox([sLeg, legH, sLeg], [x2, yLegCenter, z2], "patas", "Pata global 4");
    }

    return { pieces: list, despiece };
  }, [
    m.tipo,
    m.ancho,
    m.alto,
    m.profundidad,
    m.espesor,
    m.estantes,
    m.falda,
    m.soporte,
    m.zocalo?.altura,
    m.zocalo?.retiro,
    m.patas?.altura,
    m.escritorio,
    m.zonas,
    m.material,
    m.materialesPorPieza,
  ]);
}
