import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../services/http";
import { getEncuestas, lookupCoupon, resetEncuestas, validateCoupon } from "../services/encuestas";
import { authHeaders } from "../services/http";

const PUBLIC_FORM_URL = "https://surmaderas.com.ar/formulario/?v=13";

const LABELS = {
  consumidor_final: "Consumidor Final",
  monotributista: "Monotributista",
  responsable_inscripto: "Responsable Inscripto",
  exento: "Exento",
  madera: "Madera",
  tableros: "Tableros",
  herrajes: "Herrajes",
  servicio_corte: "Servicio de corte",
  otro: "Otro",
  cortes_placas: "Cortes a medida/placas",
  listoneria: "Listoneria",
  molduras: "Molduras",
  marcos_portarretratos: "Marcos y/o portarretratos",
  productos_muebles_estandar: "Productos/muebles estandar",
  proyecto_producto_medida: "Proyecto/producto a medida",
  productos_varios: "Productos varios (cajas, bandejas, baules)",
  artistica: "Artistica",
  lo_necesitaba_ya: "Lo necesitaba ya",
  ya_los_conozco: "Ya los conozco / recomendaron",
  me_asesoraron_bien: "Me asesoraron bien",
  precio: "El precio",
  a_medida: "A medida",
  emprendimiento: "Para mi emprendimiento/comercio",
  personal: "Para uso personal (Hobby, arreglo o renovacion personal)",
  seguro: "Seguro",
  probablemente: "Probablemente",
  no_se: "No se",
  luro: "Luro",
  independencia: "Independencia",
};

function label(value) {
  return LABELS[value] || value || "-";
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isExpired(item) {
  return item?.couponExpiresAt && new Date(item.couponExpiresAt).getTime() < Date.now();
}

function getCouponStatus(item) {
  if (item?.couponUsed) return { label: "Usado", className: "survey-used" };
  if (isExpired(item)) return { label: "Vencido", className: "survey-used" };
  return { label: "Activo", className: "survey-active" };
}

export default function EncuestasCupones() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [validation, setValidation] = useState(null);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const publicUrl = PUBLIC_FORM_URL;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const data = await getEncuestas();
      setItems(data.items || []);
      setSummary(data.summary || null);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los datos");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLookupCoupon(event) {
    event.preventDefault();

    try {
      setIsValidating(true);
      setValidation(null);
      setSelectedCoupon(null);
      const data = await lookupCoupon(couponCode.trim().toUpperCase());
      setSelectedCoupon(data.coupon);
      setValidation({
        type: data.coupon?.couponUsed ? "warning" : "success",
        message: data.message,
        coupon: data.coupon,
      });
    } catch (lookupError) {
      setValidation({
        type: "error",
        message: lookupError.message || "No se pudo consultar el cupon",
        coupon: null,
      });
    } finally {
      setIsValidating(false);
    }
  }

  async function handleUseCoupon() {
    if (!selectedCoupon?.couponCode) return;

    try {
      setIsValidating(true);
      const data = await validateCoupon(selectedCoupon.couponCode);
      setSelectedCoupon(data.coupon);
      setValidation({ type: "success", message: data.message, coupon: data.coupon });
      setCouponCode("");
      await loadData();
    } catch (validateError) {
      setValidation({
        type: validateError.status === 409 ? "warning" : "error",
        message: validateError.message || "No se pudo marcar el cupon como usado",
        coupon: validateError.coupon,
      });
      if (validateError.coupon) setSelectedCoupon(validateError.coupon);
    } finally {
      setIsValidating(false);
    }
  }

  async function downloadCsv() {
    const response = await fetch(`${API_URL}/api/encuestas/export`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      setError("No se pudo descargar el Excel.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "encuestas-sur-maderas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadExcel() {
    const response = await fetch(`${API_URL}/api/encuestas/export/excel`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      setError("No se pudo descargar el Excel.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "encuestas-sur-maderas.xls";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleResetEncuestas() {
    const confirmed = window.confirm(
      "Esto borra todos los datos cargados y cupones del formulario. ¿Seguro que queres reiniciarlo?"
    );

    if (!confirmed) return;

    try {
      setIsResetting(true);
      setError("");
      await resetEncuestas();
      setItems([]);
      setSummary({
        total: 0,
        activeCoupons: 0,
        usedCoupons: 0,
        expiredCoupons: 0,
        averageRating: null,
      });
      setSelectedCoupon(null);
      setValidation(null);
      setCouponCode("");
    } catch (resetError) {
      setError(resetError.message || "No se pudieron reiniciar los datos");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <section className="config-usersShell survey-admin">
      <div className="config-usersHero">
        <div className="dashboard-kicker">Encuestas</div>
        <h1 className="dashboard-title">Datos y cupones</h1>
        <p className="dashboard-copy">
          El formulario del cliente queda fuera de la app. Aca se ven las respuestas, el Excel y la baja de cupones.
        </p>
      </div>

      <div className="survey-adminStats">
        <article>
          <span>Formularios</span>
          <strong>{summary?.total ?? 0}</strong>
        </article>
        <article>
          <span>Cupones activos</span>
          <strong>{summary?.activeCoupons ?? 0}</strong>
        </article>
        <article>
          <span>Cupones usados</span>
          <strong>{summary?.usedCoupons ?? 0}</strong>
        </article>
        <article>
          <span>Cupones vencidos</span>
          <strong>{summary?.expiredCoupons ?? 0}</strong>
        </article>
        <article>
          <span>Promedio</span>
          <strong>{summary?.averageRating ?? "-"}</strong>
        </article>
      </div>

      <div className="survey-adminGrid">
        <form className="config-usersCard" onSubmit={handleLookupCoupon}>
          <div className="config-usersCardTitle">Validacion de cupones</div>
          <label className="config-usersField">
            <span>Numero de cupon</span>
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="AAA111"
              required
            />
          </label>

          <button className="config-usersSubmit" disabled={isValidating} type="submit">
            {isValidating ? "Consultando..." : "Buscar cupon"}
          </button>

          {validation ? (
            <div className={`config-usersMessage ${validation.type === "success" ? "success" : "error"}`}>
              <strong>{validation.message}</strong>
            </div>
          ) : null}

          {selectedCoupon ? (
            <div className="survey-couponLookup">
              <div className={selectedCoupon.couponUsed || isExpired(selectedCoupon) ? "survey-couponState used" : "survey-couponState active"}>
                {getCouponStatus(selectedCoupon).label === "Activo"
                  ? "Disponible para usar"
                  : getCouponStatus(selectedCoupon).label}
              </div>

              <div className="survey-couponDetails">
                <div>
                  <span>Cliente</span>
                  <strong>{selectedCoupon.fullName}</strong>
                </div>
                <div>
                  <span>Cupon</span>
                  <strong>{selectedCoupon.couponCode}</strong>
                </div>
                <div>
                  <span>Contacto</span>
                  <strong>{selectedCoupon.phone}</strong>
                  <small>{selectedCoupon.email}</small>
                </div>
                <div>
                  <span>Sucursal</span>
                  <strong>{label(selectedCoupon.branch)}</strong>
                </div>
                <div>
                  <span>Documento</span>
                  <strong>
                    {selectedCoupon.taxIdType} {selectedCoupon.taxId}
                  </strong>
                </div>
                <div>
                  <span>Direccion</span>
                  <strong>{selectedCoupon.address}</strong>
                </div>
                <div>
                  <span>Experiencia</span>
                  <strong>{selectedCoupon.rating ? `${selectedCoupon.rating}/5` : "-"}</strong>
                </div>
                <div>
                  <span>Vencimiento</span>
                  <strong>{formatDate(selectedCoupon.couponExpiresAt)}</strong>
                </div>
                {selectedCoupon.couponUsed ? (
                  <div>
                    <span>Uso</span>
                    <strong>{formatDate(selectedCoupon.couponUsedAt)}</strong>
                    <small>{selectedCoupon.couponUsedBy || "-"}</small>
                  </div>
                ) : null}
              </div>

              {!selectedCoupon.couponUsed && !isExpired(selectedCoupon) ? (
                <button
                  className="config-usersSubmit"
                  disabled={isValidating}
                  type="button"
                  onClick={handleUseCoupon}
                >
                  {isValidating ? "Marcando..." : "Marcar como usado"}
                </button>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="config-usersCard">
          <div className="config-usersCardTitle">Formulario publico</div>
          <div className="survey-publicLink">{publicUrl}</div>
          <div className="survey-adminActions">
            <button className="config-usersSecondaryButton" type="button" onClick={() => navigator.clipboard?.writeText(publicUrl)}>
              Copiar link
            </button>
            <a className="config-usersSecondaryButton" href={PUBLIC_FORM_URL} target="_blank" rel="noreferrer">
              Abrir formulario
            </a>
            <button className="config-usersSecondaryButton" type="button" onClick={downloadCsv}>
              Descargar CSV
            </button>
            <button className="config-usersSecondaryButton" type="button" onClick={downloadExcel}>
              Descargar Excel
            </button>
            <button
              className="config-usersSecondaryButton"
              type="button"
              onClick={handleResetEncuestas}
              disabled={isResetting || isLoading || items.length === 0}
            >
              {isResetting ? "Reiniciando..." : "Reiniciar datos"}
            </button>
          </div>
        </div>
      </div>

      <div className="config-usersCard survey-tableCard">
        <div className="config-usersCardTitle">Datos cargados</div>
        {error ? <div className="config-usersMessage error">{error}</div> : null}
        {isLoading ? <div className="config-usersEmpty">Cargando encuestas...</div> : null}
        {!isLoading && items.length === 0 ? (
          <div className="config-usersEmpty">Todavia no hay formularios cargados.</div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className="survey-tableWrap">
            <table className="survey-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Sucursal</th>
                  <th>IVA</th>
                  <th>Experiencia</th>
                  <th>Compra</th>
                  <th>Cupon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = getCouponStatus(item);
                  return (
                  <tr key={item._id}>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <strong>{item.fullName}</strong>
                      <span>{item.taxIdType} {item.taxId}</span>
                    </td>
                    <td>
                      <strong>{item.phone}</strong>
                      <span>{item.email}</span>
                    </td>
                    <td>{label(item.branch)}</td>
                    <td>{label(item.ivaCondition)}</td>
                    <td>{item.rating ? `${item.rating}/5` : "-"}</td>
                    <td>
                      <strong>{(item.purchasedProducts || []).map(label).join(", ") || "-"}</strong>
                      <span>{(item.choiceReasons || []).map(label).join(", ")}</span>
                    </td>
                    <td>
                      <strong>{item.couponCode}</strong>
                      <span className={status.className}>{status.label}</span>
                      <span>Vence: {formatDate(item.couponExpiresAt)}</span>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
