import { Router } from "express";
import PedidoProveedor from "../models/PedidoProveedor.js";
import Proveedor from "../models/Proveedor.js";
import { requireAuth } from "../middleware/auth.js";
import { colorProveedorPorNombre } from "../utils/proveedorColor.js";

const router = Router();

function limpiar(value = "") {
  return String(value || "").trim();
}

function normalizarItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      descripcion: limpiar(item?.descripcion),
      cantidad: Number(item?.cantidad || 0),
      unidad: limpiar(item?.unidad) || "u",
      precioEstimado: Number(item?.precioEstimado || 0),
    }))
    .filter((item) => item.descripcion && item.cantidad > 0);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const q = limpiar(req.query?.q).toLowerCase();
    const proveedorId = limpiar(req.query?.proveedorId);
    const estado = limpiar(req.query?.estado);

    const filter = {};
    if (proveedorId) filter.proveedorId = proveedorId;
    if (estado) filter.estado = estado;

    let items = await PedidoProveedor.find(filter).sort({ createdAt: -1 }).lean();

    if (q) {
      items = items.filter(
        (item) =>
          String(item?.proveedorNombre || "").toLowerCase().includes(q) ||
          String(item?.tipo || "").toLowerCase().includes(q) ||
          String(item?.estado || "").toLowerCase().includes(q) ||
          String(item?.observacion || "").toLowerCase().includes(q) ||
          (Array.isArray(item?.items)
            ? item.items.some((detalle) => String(detalle?.descripcion || "").toLowerCase().includes(q))
            : false)
      );
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo pedidos a proveedor" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const proveedorId = limpiar(req.body?.proveedorId);
    const tipo = limpiar(req.body?.tipo);
    const fechaPedido = limpiar(req.body?.fechaPedido);
    const observacion = limpiar(req.body?.observacion);
    const items = normalizarItems(req.body?.items);

    if (!proveedorId) {
      return res.status(400).json({ message: "Tenés que seleccionar un proveedor" });
    }
    if (!["Material", "Producto"].includes(tipo)) {
      return res.status(400).json({ message: "El tipo del pedido es obligatorio" });
    }
    if (!fechaPedido) {
      return res.status(400).json({ message: "La fecha del pedido es obligatoria" });
    }
    if (items.length === 0) {
      return res.status(400).json({ message: "Agregá al menos un renglón al pedido" });
    }

    const proveedor = await Proveedor.findById(proveedorId).lean();
    if (!proveedor || !proveedor.activo) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    const pedido = await PedidoProveedor.create({
      proveedorId: proveedor._id,
      proveedorNombre: proveedor.nombre,
      proveedorColor: proveedor.color || colorProveedorPorNombre(proveedor.nombre),
      tipo,
      fechaPedido,
      estado: "Pendiente",
      items,
      observacion,
      creadoPor: limpiar(req.user?.username || req.user?.name || req.user?.email),
    });

    res.status(201).json(pedido);
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error creando pedido a proveedor" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const updates = {};
    if (req.body?.estado) {
      const estado = limpiar(req.body.estado);
      if (!["Pendiente", "Pedido", "Recibido", "Cancelado"].includes(estado)) {
        return res.status(400).json({ message: "Estado inválido" });
      }
      updates.estado = estado;
    }
    if (typeof req.body?.observacion === "string") {
      updates.observacion = limpiar(req.body.observacion);
    }

    const pedido = await PedidoProveedor.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.json(pedido);
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error actualizando pedido" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const pedido = await PedidoProveedor.findByIdAndDelete(req.params.id);
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error eliminando pedido" });
  }
});

export default router;
