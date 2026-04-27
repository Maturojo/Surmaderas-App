import { useEffect, useState } from "react";
import { listarProductosEstandar } from "../../../services/productosService";

export function useProductos() {
  const [productos, setProductos] = useState([]);
  const [productosMap, setProductosMap] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const productosArray = await listarProductosEstandar({ limit: 5000 });
        setProductos(productosArray);

        const map = {};
        for (const p of productosArray) map[p._id || p.codigo] = p;
        setProductosMap(map);
      } catch (e) {
        console.error(e);
        alert(e.message || "No se pudieron cargar productos");
        setProductos([]);
        setProductosMap({});
      }
    })();
  }, []);

  return { productos, productosMap };
}
