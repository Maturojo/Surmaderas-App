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

function buildDopplerSubscriber(encuesta) {
  const fields = [];

  if (encuesta.birthDate) {
    fields.push({ name: "birthday", value: encuesta.birthDate });
  }

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

  const fields = encuesta.birthDate ? ["birthday"] : [];
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
        items: [buildDopplerSubscriber(encuesta)],
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
