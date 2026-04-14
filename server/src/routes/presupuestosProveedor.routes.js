import { Router } from "express";
import PresupuestoProveedorEspecial from "../models/PresupuestoProveedorEspecial.js";
import Proveedor from "../models/Proveedor.js";
import { requireAuth } from "../middleware/auth.js";
import { colorProveedorPorNombre } from "../utils/proveedorColor.js";

const router = Router();

function limpiar(value = "") {
  return String(value || "").trim();
}

function parsePrecioOpcional(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function limpiarFoto(foto) {
  if (!foto || typeof foto !== "object") return null;

  const dataUrl = limpiar(foto.dataUrl);
  if (!dataUrl) return null;

  return {
    dataUrl,
    name: limpiar(foto.name),
    type: limpiar(foto.type),
    size: Number(foto.size || 0),
    updatedAt: limpiar(foto.updatedAt),
  };
}

function ordenarPorFecha(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.fechaPresupuesto || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.fechaPresupuesto || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const q = limpiar(req.query?.q).toLowerCase();
    const proveedorId = limpiar(req.query?.proveedorId);

    const filter = {};
    if (proveedorId) filter.proveedorId = proveedorId;

    let items = await PresupuestoProveedorEspecial.find(filter).sort({ createdAt: -1 }).lean();

    if (q) {
      items = items.filter((item) => {
        const montoTexto = Number(item?.monto || 0).toLocaleString("es-AR");
        const precioClienteTexto = Number(item?.precioCliente || 0).toLocaleString("es-AR");
        return (
          String(item?.proveedorNombre || "").toLowerCase().includes(q) ||
          String(item?.descripcionPedido || "").toLowerCase().includes(q) ||
          String(item?.observacion || "").toLowerCase().includes(q) ||
          String(item?.fechaPresupuesto || "").toLowerCase().includes(q) ||
          montoTexto.toLowerCase().includes(q) ||
          precioClienteTexto.toLowerCase().includes(q)
        );
      });
    }

    res.json(ordenarPorFecha(items));
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo presupuestos de proveedor" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const proveedorId = limpiar(req.body?.proveedorId);
    const descripcionPedido = limpiar(req.body?.descripcionPedido);
    const materiales = limpiar(req.body?.materiales);
    const medidas = limpiar(req.body?.medidas);
    const terminacion = limpiar(req.body?.terminacion);
    const fechaPresupuesto = limpiar(req.body?.fechaPresupuesto);
    const observacion = limpiar(req.body?.observacion);
    const monto = parsePrecioOpcional(req.body?.monto);
    const precioCliente = Number(req.body?.precioCliente || 0);
    const foto = limpiarFoto(req.body?.foto);

    if (!proveedorId) {
      return res.status(400).json({ message: "Tenes que seleccionar un proveedor" });
    }
    if (!descripcionPedido) {
      return res.status(400).json({ message: "La descripcion del pedido especial es obligatoria" });
    }
    if (!fechaPresupuesto) {
      return res.status(400).json({ message: "La fecha del presupuesto es obligatoria" });
    }
    if (Number.isNaN(monto) || (monto !== null && monto < 0)) {
      return res.status(400).json({ message: "El precio del proveedor no es valido" });
    }
    if (!Number.isFinite(precioCliente) || precioCliente < 0) {
      return res.status(400).json({ message: "El precio del cliente no es valido" });
    }

    const proveedor = await Proveedor.findById(proveedorId).lean();
    if (!proveedor || !proveedor.activo) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    const presupuesto = await PresupuestoProveedorEspecial.create({
      proveedorId: proveedor._id,
      proveedorNombre: proveedor.nombre,
      proveedorColor: proveedor.color || colorProveedorPorNombre(proveedor.nombre),
      descripcionPedido,
      materiales,
      medidas,
      terminacion,
      monto,
      precioCliente,
      fechaPresupuesto,
      foto,
      observacion,
      creadoPor: limpiar(req.user?.username || req.user?.name || req.user?.email),
    });

    res.status(201).json(presupuesto);
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error guardando presupuesto de proveedor" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const proveedorId = limpiar(req.body?.proveedorId);
    const descripcionPedido = limpiar(req.body?.descripcionPedido);
    const materiales = limpiar(req.body?.materiales);
    const medidas = limpiar(req.body?.medidas);
    const terminacion = limpiar(req.body?.terminacion);
    const fechaPresupuesto = limpiar(req.body?.fechaPresupuesto);
    const observacion = limpiar(req.body?.observacion);
    const monto = parsePrecioOpcional(req.body?.monto);
    const precioCliente = Number(req.body?.precioCliente || 0);
    const foto = limpiarFoto(req.body?.foto);

    if (!proveedorId) {
      return res.status(400).json({ message: "Tenes que seleccionar un proveedor" });
    }
    if (!descripcionPedido) {
      return res.status(400).json({ message: "La descripcion del pedido especial es obligatoria" });
    }
    if (!fechaPresupuesto) {
      return res.status(400).json({ message: "La fecha del presupuesto es obligatoria" });
    }
    if (Number.isNaN(monto) || (monto !== null && monto < 0)) {
      return res.status(400).json({ message: "El precio del proveedor no es valido" });
    }
    if (!Number.isFinite(precioCliente) || precioCliente < 0) {
      return res.status(400).json({ message: "El precio del cliente no es valido" });
    }

    const proveedor = await Proveedor.findById(proveedorId).lean();
    if (!proveedor || !proveedor.activo) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    const presupuesto = await PresupuestoProveedorEspecial.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          proveedorId: proveedor._id,
          proveedorNombre: proveedor.nombre,
          proveedorColor: proveedor.color || colorProveedorPorNombre(proveedor.nombre),
          descripcionPedido,
          materiales,
          medidas,
          terminacion,
          monto,
          precioCliente,
          fechaPresupuesto,
          foto,
          observacion,
        },
      },
      { new: true, runValidators: true }
    );

    if (!presupuesto) {
      return res.status(404).json({ message: "Presupuesto no encontrado" });
    }

    res.json(presupuesto);
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error actualizando presupuesto de proveedor" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const presupuesto = await PresupuestoProveedorEspecial.findByIdAndDelete(req.params.id);
    if (!presupuesto) {
      return res.status(404).json({ message: "Presupuesto no encontrado" });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error eliminando presupuesto de proveedor" });
  }
});

export default router;
