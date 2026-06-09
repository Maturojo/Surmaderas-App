import { useMemo, useState } from "react";
import { submitEncuesta } from "../services/encuestas";
import logoSurMaderas from "../assets/logo-sur-maderas.png";

const IVA_OPTIONS = [
  { value: "consumidor_final", label: "Consumidor Final", taxIdType: "DNI" },
  { value: "monotributista", label: "Monotributista", taxIdType: "CUIT" },
  { value: "responsable_inscripto", label: "Responsable Inscripto", taxIdType: "CUIT" },
  { value: "exento", label: "Exento", taxIdType: "CUIL" },
];

const PRODUCT_OPTIONS = [
  { value: "cortes_placas", label: "Cortes a medida/placas" },
  { value: "listoneria", label: "Listoneria" },
  { value: "molduras", label: "Molduras" },
  { value: "marcos_portarretratos", label: "Marcos y/o portarretratos" },
  { value: "productos_muebles_estandar", label: "Productos/muebles estandar" },
  { value: "proyecto_producto_medida", label: "Proyecto/producto a medida" },
  { value: "productos_varios", label: "Productos varios (cajas, bandejas, baules)" },
  { value: "artistica", label: "Artistica" },
];

const REASON_OPTIONS = [
  { value: "lo_necesitaba_ya", label: "Lo necesitaba ya" },
  { value: "ya_los_conozco", label: "Ya los conozco / me recomendaron" },
  { value: "me_asesoraron_bien", label: "Me asesoraron bien" },
  { value: "precio", label: "El precio" },
  { value: "a_medida", label: "Pueden hacerlo a medida" },
];

const BRANCH_OPTIONS = [
  { value: "luro", label: "Luro" },
  { value: "independencia", label: "Independencia" },
];

const GOOGLE_REVIEW_URL =
  "https://g.page/r/CRuUqXT17ylgEAE/review";

const GOOGLE_REVIEW_TEXT =
  "\u00a1Gracias por tu tiempo! Como ultimo, tu opinion en Google nos seria de gran ayuda. Es un solo Click\ud83d\udc47\ud83c\udffc";

const FORM_BUILD_VERSION = "donweb-v15";
const STAR_SYMBOL = "\u2605";

const LOGO_URL = logoSurMaderas;

const INITIAL_FORM = {
  fullName: "",
  branch: "",
  phone: "",
  email: "",
  ivaCondition: "consumidor_final",
  taxId: "",
  address: "",
  birthDate: "",
  rating: 0,
  purchasedProducts: [],
  choiceReasons: [],
  purchaseDriver: "",
  npsChoice: "",
  improvement: "",
};

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) digits = digits.slice(2);
  while (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.startsWith("15")) {
    digits = `911${digits.slice(2)}`;
  } else if (digits.length >= 5 && digits.slice(2, 4) === "15") {
    digits = `9${digits.slice(0, 2)}${digits.slice(4)}`;
  } else if (digits.length >= 6 && digits.slice(3, 5) === "15") {
    digits = `9${digits.slice(0, 3)}${digits.slice(5)}`;
  } else if (digits.length === 10 && !digits.startsWith("9")) {
    digits = `9${digits}`;
  }

  return digits.slice(0, 11);
}

function formatPhone(value) {
  const digits = normalizePhone(value);
  if (digits.startsWith("911")) {
    return [digits.slice(0, 1), digits.slice(1, 3), digits.slice(3, 7), digits.slice(7)]
      .filter(Boolean)
      .join(" ");
  }
  return [digits.slice(0, 1), digits.slice(1, 4), digits.slice(4, 7), digits.slice(7)]
    .filter(Boolean)
    .join(" ");
}

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isTaxIdValid(type, value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (type === "DNI") return digits.length >= 7 && digits.length <= 8;
  return digits.length === 11;
}

function isBirthDateValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const oldest = new Date();
  oldest.setFullYear(today.getFullYear() - 120);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date <= today &&
    date >= oldest
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(value));
}

function toggleValue(list, value, maxItems = Infinity) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }

  if (list.length >= maxItems) {
    return list;
  }

  return [...list, value];
}

export default function FormularioClientes({ defaultBranch = "", defaultOrigin = "" }) {
  const queryOrigin =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("origin") : "";
  const isWebOrigin = queryOrigin === "web" || defaultOrigin === "web";
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...INITIAL_FORM, branch: defaultBranch });
  const [coupon, setCoupon] = useState(null);
  const [submittedRating, setSubmittedRating] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedIva = useMemo(
    () => IVA_OPTIONS.find((item) => item.value === form.ivaCondition) || IVA_OPTIONS[0],
    [form.ivaCondition]
  );
  const phoneIsValid = normalizePhone(form.phone).length === 11;
  const emailIsValid = !form.email || isEmailValid(form.email);
  const taxIdIsValid = !form.taxId || isTaxIdValid(selectedIva.taxIdType, form.taxId);
  const birthDateIsValid = !form.birthDate || isBirthDateValid(form.birthDate);
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? formatPhone(value) : value;
    setForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === "ivaCondition" ? { taxId: "" } : {}),
    }));
  }

  function validateStepOne() {
    const missingRequiredWeb = isWebOrigin && (!form.fullName || !form.phone || !form.email || !form.birthDate);
    const missingRequiredFull =
      !isWebOrigin &&
      (!form.fullName || !form.branch || !form.phone || !form.email || !form.taxId || !form.address || !form.birthDate);

    if (missingRequiredWeb || missingRequiredFull) {
      setError("Completa tus datos para activar el descuento.");
      return false;
    }

    if (!phoneIsValid) {
      setError("Ingresa un celular argentino valido de 11 digitos, sin 0 ni 15.");
      return false;
    }

    if (!isEmailValid(form.email)) {
      setError("Ingresa un mail valido.");
      return false;
    }

    if (!isWebOrigin && !isTaxIdValid(selectedIva.taxIdType, form.taxId)) {
      setError(`Ingresa un ${selectedIva.taxIdType} valido.`);
      return false;
    }

    if (!isBirthDateValid(form.birthDate)) {
      setError("Ingresa una fecha de nacimiento valida.");
      return false;
    }

    setError("");
    return true;
  }

  function goToStepTwo(event) {
    event.preventDefault();
    if (!validateStepOne()) return;
    if (isWebOrigin) {
      handleSubmit(event);
      return;
    }
    setStep(2);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      const data = await submitEncuesta({
        ...form,
        origin: isWebOrigin ? "web" : "local",
        rating: form.rating || null,
      });
      setSubmittedRating(form.rating || 0);
      setCoupon(data.coupon);
      setStep(isWebOrigin ? 4 : 3);
    } catch (submitError) {
      setError(submitError.message || "No se pudo enviar el formulario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetFormulario() {
    setStep(1);
    setForm({ ...INITIAL_FORM, branch: defaultBranch });
    setCoupon(null);
    setSubmittedRating(0);
    setError("");
    setIsSubmitting(false);
  }

  function downloadCoupon() {
    if (!coupon?.code) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f8f1e7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070614";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sur Maderas", 540, 170);
    ctx.font = "bold 132px Arial";
    ctx.fillText("15% OFF", 540, 390);
    ctx.font = "34px Arial";
    ctx.fillText("Activo para tu proxima compra", 540, 470);
    if (coupon.expiresAt) {
      ctx.font = "30px Arial";
      ctx.fillText(`Valido hasta el ${formatDate(coupon.expiresAt)}`, 540, 520);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(190, 570, 700, 170);
    ctx.strokeStyle = "#c8b69e";
    ctx.lineWidth = 8;
    ctx.strokeRect(190, 570, 700, 170);
    ctx.fillStyle = "#070614";
    ctx.font = "bold 48px Arial";
    ctx.fillText(coupon.code, 540, 675);
    ctx.font = "28px Arial";
    ctx.fillText("Mostra este cupon en caja para validarlo", 540, 820);

    const link = document.createElement("a");
    link.download = `${coupon.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (coupon && step === 3) {
    return (
      <main className="survey-public" data-build-version={FORM_BUILD_VERSION}>
        <section className="survey-card survey-done">
          <img className="survey-logo" src={LOGO_URL} alt="Sur Maderas" />
          <div className="survey-progress" aria-label="Paso 3 de 4">
            <span className="active" />
            <span className="active" />
            <span className="active" />
            <span />
          </div>
          <div className="survey-kicker">Paso 3 de 4</div>
          <h1>Un ultimo paso</h1>
          <p>{GOOGLE_REVIEW_TEXT}</p>

          {submittedRating ? (
            <div className="survey-googleReview">
              <span>Tu experiencia de hoy</span>
              <div className="survey-googleStars" aria-label={`${submittedRating} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <span key={value} className={submittedRating >= value ? "active" : ""}>
                    {STAR_SYMBOL}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="survey-actions">
            <a
              className="survey-primary"
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setStep(4)}
            >
              Publicar en Google
            </a>
          </div>
        </section>
      </main>
    );
  }

  if (coupon && step === 4) {
    return (
      <main className="survey-public" data-build-version={FORM_BUILD_VERSION}>
        <section className="survey-card survey-done">
          <img className="survey-logo" src={LOGO_URL} alt="Sur Maderas" />
          <div className="survey-progress" aria-label="Paso 4 de 4">
            <span className="active" />
            <span className="active" />
            <span className="active" />
            <span className="active" />
          </div>
          <div className="survey-kicker">Paso 4 de 4</div>
          <h1>Listo, tu 15% ya esta activo.</h1>

          <div className="survey-coupon">
            <span>Numero de cupon</span>
            <strong>{coupon.code}</strong>
            {coupon.expiresAt ? <small>Valido hasta el {formatDate(coupon.expiresAt)}</small> : null}
          </div>

          {submittedRating ? (
            <div className="survey-googleReview">
              <span>Tu experiencia de hoy</span>
              <div className="survey-googleStars" aria-label={`${submittedRating} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <span key={value} className={submittedRating >= value ? "active" : ""}>
                    {STAR_SYMBOL}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="survey-actions">
            <button type="button" className="survey-secondary" onClick={downloadCoupon}>
              Descargar cupon
            </button>
            <button type="button" className="survey-secondary" onClick={resetFormulario}>
              Cargar otro cliente
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="survey-public" data-build-version={FORM_BUILD_VERSION}>
      <section className="survey-card">
        <img className="survey-logo" src={LOGO_URL} alt="Sur Maderas" />
        <div className="survey-progress" aria-label={`Paso ${step} de 4`}>
          <span className={step >= 1 ? "active" : ""} />
          <span className={step >= 2 ? "active" : ""} />
          <span className={step >= 3 ? "active" : ""} />
          <span className={step >= 4 ? "active" : ""} />
        </div>

        {step === 1 ? (
          <form onSubmit={goToStepTwo}>
            <div className="survey-kicker">Paso 1 de 4</div>
            <h1>{isWebOrigin ? "Activa tu 15% OFF" : "Completa tus datos y activa tu 15% OFF"}</h1>

            <label className="survey-field">
              <span>Nombre completo</span>
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </label>

            {!isWebOrigin ? (
              <label className="survey-field">
                <span>Sucursal</span>
                <select name="branch" value={form.branch} onChange={handleChange} required>
                  <option value="">Selecciona una sucursal</option>
                  {BRANCH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="survey-field">
              <span>Celular</span>
              <input
                className={form.phone ? (phoneIsValid ? "is-valid" : "is-invalid") : ""}
                name="phone"
                value={form.phone}
                onChange={handleChange}
                inputMode="tel"
                placeholder="Ej: 9 223 555 1234"
                required
              />
              {form.phone && !phoneIsValid ? (
                <small className="survey-fieldHint error">Usa 11 digitos, sin 0 ni 15.</small>
              ) : null}
            </label>

            <label className="survey-field">
              <span>Mail</span>
              <input
                className={form.email ? (emailIsValid ? "is-valid" : "is-invalid") : ""}
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
              {form.email && !emailIsValid ? (
                <small className="survey-fieldHint error">Ingresa un mail valido.</small>
              ) : null}
            </label>

            {!isWebOrigin ? (
              <>
                <label className="survey-field">
                  <span>Condicion frente al IVA</span>
                  <select name="ivaCondition" value={form.ivaCondition} onChange={handleChange}>
                    {IVA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="survey-field">
                  <span>{selectedIva.taxIdType}</span>
                  <input
                    className={form.taxId ? (taxIdIsValid ? "is-valid" : "is-invalid") : ""}
                    name="taxId"
                    value={form.taxId}
                    onChange={handleChange}
                    inputMode="numeric"
                    required
                  />
                  {form.taxId && !taxIdIsValid ? (
                    <small className="survey-fieldHint error">Revisa la cantidad de digitos.</small>
                  ) : null}
                </label>

                <label className="survey-field">
                  <span>Direccion</span>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Calle y altura"
                    required
                  />
                </label>
              </>
            ) : null}

            <label className="survey-field">
              <span>Fecha de nacimiento</span>
              <input
                className={form.birthDate ? (birthDateIsValid ? "is-valid" : "is-invalid") : ""}
                name="birthDate"
                type="date"
                value={form.birthDate}
                onChange={handleChange}
                max={maxBirthDate}
                required
              />
              {form.birthDate && !birthDateIsValid ? (
                <small className="survey-fieldHint error">Ingresa una fecha valida.</small>
              ) : null}
            </label>

            {error ? <div className="survey-message error">{error}</div> : null}

            <button type="submit" className="survey-primary">
              {isWebOrigin ? (isSubmitting ? "Activando..." : "Activar mi 15%") : "Continuar - Casi listo"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="survey-kicker">Paso 2 de 4</div>
            <h1>Solo 4 preguntas rapidas</h1>

            <div className="survey-block">
              <span className="survey-label">Como calificarias tu experiencia de hoy?</span>
              <div className="survey-stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={form.rating >= value ? "active" : ""}
                    onClick={() => setForm((current) => ({ ...current, rating: value }))}
                    aria-label={`${value} estrellas`}
                  >
                    {STAR_SYMBOL}
                  </button>
                ))}
              </div>
            </div>

            <div className="survey-block">
              <span className="survey-label">¿Que compraste hoy?</span>
              <div className="survey-chips">
                {PRODUCT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={form.purchasedProducts.includes(option.value) ? "active" : ""}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        purchasedProducts: toggleValue(current.purchasedProducts, option.value),
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="survey-block">
              <span className="survey-label">¿Que te hizo decidirte por Sur Maderas? Selecciona hasta 3.</span>
              <div className="survey-checks">
                {REASON_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      checked={form.choiceReasons.includes(option.value)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          choiceReasons: toggleValue(current.choiceReasons, option.value, 3),
                        }))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="survey-block">
              <span className="survey-label">¿Cual es el motor principal de tu compra hoy?</span>
              <div className="survey-chips">
                <button
                  type="button"
                  className={form.purchaseDriver === "emprendimiento" ? "active" : ""}
                  onClick={() => setForm((current) => ({ ...current, purchaseDriver: "emprendimiento" }))}
                >
                  Para mi emprendimiento/comercio
                </button>
                <button
                  type="button"
                  className={form.purchaseDriver === "personal" ? "active" : ""}
                  onClick={() => setForm((current) => ({ ...current, purchaseDriver: "personal" }))}
                >
                  Para uso personal (Hobby, arreglo o renovacion personal)
                </button>
              </div>
            </div>

            <div className="survey-block">
              <span className="survey-label">¿Volves a elegirnos para tu proximo proyecto?</span>
              <div className="survey-chips">
                {[
                  ["seguro", "Seguro"],
                  ["probablemente", "Probablemente"],
                  ["no_se", "No se"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={form.npsChoice === value ? "active" : ""}
                    onClick={() => setForm((current) => ({ ...current, npsChoice: value }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="survey-field">
              <span>¿Algo que podriamos mejorar? Opcional</span>
              <textarea name="improvement" value={form.improvement} onChange={handleChange} rows="4" />
            </label>

            {error ? <div className="survey-message error">{error}</div> : null}

            <div className="survey-actions">
              <button type="button" className="survey-secondary" onClick={() => setStep(1)}>
                Volver
              </button>
              <button type="submit" className="survey-primary" disabled={isSubmitting}>
                {isSubmitting ? "Activando..." : "Activar mi 15%"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
