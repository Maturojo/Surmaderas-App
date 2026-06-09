const DOPPLER_API_BASE_URL = "https://restapi.fromdoppler.com";
const DOPPLER_IMPORT_TIMEOUT_MS = 7000;

function getDopplerConfig() {
  return {
    apiKey: process.env.DOPPLER_API_KEY,
    accountEmail: process.env.DOPPLER_ACCOUNT_EMAIL,
    listId: process.env.DOPPLER_LIST_ID,
  };
}

function isDopplerConfigured(config) {
  return Boolean(config.apiKey && config.accountEmail && config.listId);
}

function formatDateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function addDopplerField(fields, name, value) {
  const normalizedValue = Array.isArray(value) ? value.filter(Boolean).join(" | ") : value;
  const text = String(normalizedValue ?? "").trim();
  if (!text) return;
  fields.push({ name, value: text });
}

function splitFullName(fullName = "") {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function buildDopplerSubscriber(encuesta) {
  const fields = [];
  const { firstName, lastName } = splitFullName(encuesta.fullName);

  addDopplerField(fields, "FIRSTNAME", firstName);
  addDopplerField(fields, "LASTNAME", lastName);
  addDopplerField(fields, "CELULAR", encuesta.phone || encuesta.phoneNormalized);
  addDopplerField(fields, "SUCURSAL", encuesta.branch);
  addDopplerField(fields, "NUMERODECUPON", encuesta.couponCode);
  addDopplerField(fields, "CUPONUTILIZADO", encuesta.couponUsed ? "si" : "no");
  addDopplerField(fields, "VENCIMIENTO", formatDateOnly(encuesta.couponExpiresAt));
  addDopplerField(fields, "PRODUCTO", encuesta.purchasedProducts);
  addDopplerField(fields, "BIRTHDAY", formatDateOnly(encuesta.birthDate));

  return {
    email: encuesta.email,
    ...(fields.length ? { fields } : {}),
  };
}

export async function syncEncuestaToDoppler(encuesta) {
  const config = getDopplerConfig();

  if (!isDopplerConfigured(config)) {
    return { skipped: true, reason: "Doppler no configurado" };
  }

  const subscriber = buildDopplerSubscriber(encuesta);
  const fields = (subscriber.fields || []).map((field) => field.name);
  const accountEmail = encodeURIComponent(config.accountEmail);
  const listId = encodeURIComponent(config.listId);
  const url = `${DOPPLER_API_BASE_URL}/accounts/${accountEmail}/lists/${listId}/subscribers/import`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOPPLER_IMPORT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `token ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Doppler-Subscriber-Origin": "Formulario",
      },
      body: JSON.stringify({
        fields,
        items: [subscriber],
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `Doppler respondio con HTTP ${response.status}`);
    }

    return { skipped: false, data };
  } finally {
    clearTimeout(timeout);
  }
}
