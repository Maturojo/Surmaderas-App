import { Router } from "express";
import fs from "fs";
import path from "path";
import Producto from "../models/Producto.js";
import Categoria from "../models/Categoria.js";
import Subcategoria from "../models/Subcategoria.js";
import HistorialAccion from "../models/HistorialAccion.js";

const router = Router();
const productosArtPath = path.resolve(process.cwd(), "src/seed/productos_art.json");

function limpiarValor(valor = "") {
  return String(valor || "").trim();
}

function normalizarProducto(p) {
  return {
    ...p,
    categoria: limpiarValor(p?.categoria) || "Sin clasificar",
    subcategoria: limpiarValor(p?.subcategoria) || "Sin subcategoria",
  };
}

function cargarProductosArtJson() {
  const raw = fs.readFileSync(productosArtPath, "utf8");
  const items = JSON.parse(raw);
  return Array.isArray(items) ? items : [];
}

router.get("/estandar", async (req, res) => {
  try {
    const q = limpiarValor(req.query.q).toLowerCase();
    const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit || "5000", 10)));

    let items = cargarProductosArtJson()
      .map((item) => ({
        _id: String(item?.codigo || ""),
        codigo: limpiarValor(item?.codigo),
        nombre: limpiarValor(item?.nombre),
        precio: Number(item?.precio || 0),
        categoria: limpiarValor(item?.categoria) || "Producto estándar",
        subcategoria: limpiarValor(item?.subcategoria) || "ART",
        unidad: limpiarValor(item?.unidad) || "u",
        activo: true,
      }))
      .filter((item) => item.codigo && item.nombre);

    if (q) {
      items = items.filter(
        (item) =>
          item.codigo.toLowerCase().includes(q) ||
          item.nombre.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      const byName = a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      if (byName !== 0) return byName;
      return a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
    });

    res.json({ items: items.slice(0, limit), total: items.length, page: 1, limit });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo productos estándar" });
  }
});

router.get("/", async (req, res) => {
  try {
    const q = limpiarValor(req.query.q);
    const categoria = limpiarValor(req.query.categoria);
    const subcategoria = limpiarValor(req.query.subcategoria);
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || "25", 10)));
    const skip = (page - 1) * limit;

    const and = [];
    if (q) {
      and.push({
        $or: [
          { nombre: { $regex: q, $options: "i" } },
          { codigo: { $regex: q, $options: "i" } },
        ],
      });
    }

    if (categoria) {
      if (categoria === "Sin clasificar") {
        and.push({
          $or: [{ categoria: { $exists: false } }, { categoria: null }, { categoria: "" }],
        });
      } else {
        and.push({ categoria });
      }
    }

    if (subcategoria) {
      if (subcategoria === "Sin subcategoria") {
        and.push({
          $or: [{ subcategoria: { $exists: false } }, { subcategoria: null }, { subcategoria: "" }],
        });
      } else {
        and.push({ subcategoria });
      }
    }

    const filter = and.length ? { $and: and } : {};

    const [items, total] = await Promise.all([
      Producto.find(filter).sort({ nombre: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      Producto.countDocuments(filter),
    ]);

    res.json({ items: items.map(normalizarProducto), total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo productos" });
  }
});

router.get("/filtros", async (_req, res) => {
  try {
    const [categoriasDb, subcategoriasDb, productos] = await Promise.all([
      Categoria.find({}).lean(),
      Subcategoria.find({}).lean(),
      Producto.find({}, "categoria subcategoria").lean(),
    ]);

    const categoriasSet = new Set();
    const subcategoriasPorCategoria = {};

    categoriasDb.forEach((c) => {
      const nombre = limpiarValor(c.nombre);
      if (!nombre) return;
      categoriasSet.add(nombre);
      if (!subcategoriasPorCategoria[nombre]) subcategoriasPorCategoria[nombre] = new Set();
    });

    subcategoriasDb.forEach((s) => {
      const categoria = limpiarValor(s.categoria);
      const nombre = limpiarValor(s.nombre);
      if (!categoria || !nombre) return;
      categoriasSet.add(categoria);
      if (!subcategoriasPorCategoria[categoria]) subcategoriasPorCategoria[categoria] = new Set();
      subcategoriasPorCategoria[categoria].add(nombre);
    });

    productos.forEach((p) => {
      const categoria = limpiarValor(p.categoria) || "Sin clasificar";
      const subcategoria = limpiarValor(p.subcategoria) || "Sin subcategoria";
      categoriasSet.add(categoria);
      if (!subcategoriasPorCategoria[categoria]) subcategoriasPorCategoria[categoria] = new Set();
      subcategoriasPorCategoria[categoria].add(subcategoria);
    });

    categoriasSet.add("Sin clasificar");
    if (!subcategoriasPorCategoria["Sin clasificar"]) subcategoriasPorCategoria["Sin clasificar"] = new Set();
    subcategoriasPorCategoria["Sin clasificar"].add("Sin subcategoria");

    const categorias = Array.from(categoriasSet).sort((a, b) => a.localeCompare(b, "es"));
    const subcategorias = {};
    Object.keys(subcategoriasPorCategoria).forEach((cat) => {
      subcategorias[cat] = Array.from(subcategoriasPorCategoria[cat]).sort((a, b) => a.localeCompare(b, "es"));
    });

    res.json({ categorias, subcategorias });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo filtros" });
  }
});

router.post("/categorias", async (req, res) => {
  try {
    const categoria = limpiarValor(req.body?.categoria);
    const subcategoria = limpiarValor(req.body?.subcategoria);

    if (!categoria) {
      return res.status(400).json({ message: "La categoria es obligatoria" });
    }

    const categoriaDoc = await Categoria.findOneAndUpdate(
      { nombre: categoria },
      { $setOnInsert: { nombre: categoria } },
      { new: true, upsert: true }
    );

    if (subcategoria) {
      await Subcategoria.findOneAndUpdate(
        { nombre: subcategoria, categoria },
        { $setOnInsert: { nombre: subcategoria, categoria } },
        { new: true, upsert: true }
      );
    }

    res.status(201).json({ ok: true, categoria: categoriaDoc.nombre, subcategoria });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error creando categoria o subcategoria" });
  }
});

router.get("/historial", async (_req, res) => {
  try {
    const historial = await HistorialAccion.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json(
      historial.map((item) => ({
        id: item._id,
        tipo: item.tipo,
        descripcion: item.descripcion,
        cantidad: item.cantidad || 0,
        categoria: item.categoria || "",
        subcategoria: item.subcategoria || "",
        fecha: item.createdAt,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo historial" });
  }
});

router.post("/historial", async (req, res) => {
  try {
    const tipo = limpiarValor(req.body?.tipo);
    const descripcion = limpiarValor(req.body?.descripcion);
    const cantidad = Number(req.body?.cantidad || 0);
    const categoria = limpiarValor(req.body?.categoria);
    const subcategoria = limpiarValor(req.body?.subcategoria);

    if (!tipo || !descripcion) {
      return res.status(400).json({ message: "Tipo y descripcion son obligatorios" });
    }

    const item = await HistorialAccion.create({ tipo, descripcion, cantidad, categoria, subcategoria });
    res.status(201).json({
      id: item._id,
      tipo: item.tipo,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      categoria: item.categoria,
      subcategoria: item.subcategoria,
      fecha: item.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error guardando historial" });
  }
});

router.delete("/historial", async (_req, res) => {
  try {
    const result = await HistorialAccion.deleteMany({});
    res.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error limpiando historial" });
  }
});

router.patch("/clasificacion-multiple", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ message: "No se enviaron productos" });

    const categoria = limpiarValor(req.body?.categoria);
    const subcategoria = limpiarValor(req.body?.subcategoria);

    const result = await Producto.updateMany(
      { _id: { $in: ids } },
      { $set: { categoria, subcategoria } }
    );

    res.json({
      ok: true,
      modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
      matchedCount: result.matchedCount ?? result.n ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error actualizando clasificacion multiple" });
  }
});

router.patch("/:id/clasificacion", async (req, res) => {
  try {
    const categoria = limpiarValor(req.body?.categoria);
    const subcategoria = limpiarValor(req.body?.subcategoria);

    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { $set: { categoria, subcategoria } },
      { new: true, lean: true }
    );

    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
    res.json(normalizarProducto(producto));
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error actualizando clasificacion" });
  }
});

router.delete("/categorias/:nombre", async (req, res) => {
  try {
    const nombre = limpiarValor(decodeURIComponent(req.params.nombre || ""));
    if (!nombre || nombre.toLowerCase() === "sin clasificar") {
      return res.status(400).json({ message: "No se puede eliminar esa categoria" });
    }

    await Categoria.deleteOne({ nombre });
    await Subcategoria.deleteMany({ categoria: nombre });
    const result = await Producto.updateMany({ categoria: nombre }, { $set: { categoria: "", subcategoria: "" } });

    res.json({
      ok: true,
      categoriaEliminada: nombre,
      productosActualizados: result.modifiedCount ?? result.nModified ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error eliminando categoria" });
  }
});

router.delete("/subcategorias", async (req, res) => {
  try {
    const categoria = limpiarValor(req.body?.categoria);
    const subcategoria = limpiarValor(req.body?.subcategoria);

    if (!categoria || !subcategoria || subcategoria.toLowerCase() === "sin subcategoria") {
      return res.status(400).json({ message: "Categoria y subcategoria son obligatorias" });
    }

    await Subcategoria.deleteOne({ categoria, nombre: subcategoria });
    const result = await Producto.updateMany(
      { categoria, subcategoria },
      { $set: { subcategoria: "" } }
    );

    res.json({
      ok: true,
      categoria,
      subcategoriaEliminada: subcategoria,
      productosActualizados: result.modifiedCount ?? result.nModified ?? 0,
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error eliminando subcategoria" });
  }
});

export default router;
