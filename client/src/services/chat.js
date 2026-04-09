import { API_URL, apiFetch, authHeaders } from "./http";

async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

export async function getChatOverview() {
  const response = await apiFetch(`${API_URL}/api/chat/overview`, {
    headers: authHeaders(),
  });

  return parseResponse(response, "No se pudo cargar el chat interno");
}

export async function getConversationMessages(conversationId) {
  const response = await apiFetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
    headers: authHeaders(),
  });

  return parseResponse(response, "No se pudieron cargar los mensajes");
}

export async function createDirectConversation(participantId) {
  const response = await apiFetch(`${API_URL}/api/chat/conversations/direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ participantId }),
  });

  return parseResponse(response, "No se pudo iniciar el chat directo");
}

export async function sendConversationMessage(conversationId, text) {
  const response = await apiFetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ text }),
  });

  return parseResponse(response, "No se pudo enviar el mensaje");
}
