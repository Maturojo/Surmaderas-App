import { useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "../../../services/auth";
import {
  createDirectConversation,
  getChatOverview,
  getConversationMessages,
  markConversationAsRead,
  sendConversationMessage,
} from "../../../services/chat";

function formatRelativeDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default function ChatInternoWidget({ unreadCount = 0, onUnreadChange = () => {} }) {
  const auth = getAuth();
  const currentUserId = auth?.user?.id || "";
  const [isOpen, setIsOpen] = useState(false);
  const [overview, setOverview] = useState({ conversations: [], users: [], totalUnread: 0 });
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const previousUnreadRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const messagesEndRef = useRef(null);
  const readSyncTimeoutRef = useRef(null);

  const selectedConversation = useMemo(
    () =>
      overview.conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [overview.conversations, selectedConversationId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOverview({ silent = false } = {}) {
      try {
        if (!silent) {
          setIsLoadingOverview(true);
        }

        const data = await getChatOverview();
        if (cancelled) return;

        setOverview((current) => ({
          ...current,
          ...data,
        }));
        onUnreadChange(data?.totalUnread || 0);
        setSelectedConversationId((currentId) => {
          if (currentId && data.conversations.some((conversation) => conversation.id === currentId)) {
            return currentId;
          }

          return data.conversations[0]?.id || "";
        });
        setError("");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "No se pudo cargar el chat interno");
          onUnreadChange(0);
        }
      } finally {
        if (!cancelled && !silent) {
          setIsLoadingOverview(false);
        }
      }
    }

    loadOverview();
    const intervalId = window.setInterval(() => loadOverview({ silent: true }), 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [onUnreadChange]);

  useEffect(() => {
    if (previousUnreadRef.current === null) {
      previousUnreadRef.current = unreadCount;
      return;
    }

    if (unreadCount > previousUnreadRef.current) {
      setIsOpen(true);
    }

    previousUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (!isOpen || !selectedConversationId) {
      return undefined;
    }

    let cancelled = false;

    async function loadMessages({ silent = false } = {}) {
      try {
        if (!silent) {
          setIsLoadingMessages(true);
        }

        const data = await getConversationMessages(selectedConversationId);
        if (cancelled) return;

        setMessages(data.messages || []);
        if (data.conversation) {
          setOverview((current) => {
            const previousUnread =
              current.conversations.find((conversation) => conversation.id === data.conversation.id)
                ?.unreadCount || 0;

            return {
              ...current,
              conversations: current.conversations.map((conversation) =>
                conversation.id === data.conversation.id
                  ? { ...conversation, ...data.conversation, unreadCount: 0 }
                  : conversation
              ),
              totalUnread: Math.max(0, (current.totalUnread || 0) - previousUnread),
            };
          });
        }
        setMessageError("");
      } catch (loadError) {
        if (!cancelled) {
          setMessageError(loadError.message || "No se pudieron cargar los mensajes");
        }
      } finally {
        if (!cancelled && !silent) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();
    const intervalId = window.setInterval(() => loadMessages({ silent: true }), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isOpen, selectedConversationId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (messages.length > previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedConversationId) {
      return undefined;
    }

    window.clearTimeout(readSyncTimeoutRef.current);
    readSyncTimeoutRef.current = window.setTimeout(async () => {
      try {
        const data = await markConversationAsRead(selectedConversationId);
        if (!data?.conversation) {
          return;
        }

        setOverview((current) => {
          const previousUnread =
            current.conversations.find((conversation) => conversation.id === data.conversation.id)
              ?.unreadCount || 0;

          const nextTotalUnread = Math.max(0, (current.totalUnread || 0) - previousUnread);
          onUnreadChange(nextTotalUnread);

          return {
            ...current,
            conversations: current.conversations.map((conversation) =>
              conversation.id === data.conversation.id
                ? { ...conversation, ...data.conversation, unreadCount: 0 }
                : conversation
            ),
            totalUnread: nextTotalUnread,
          };
        });
      } catch {
        return;
      }
    }, 350);

    return () => {
      window.clearTimeout(readSyncTimeoutRef.current);
    };
  }, [isOpen, selectedConversationId, messages.length, onUnreadChange]);

  async function handleStartDirectConversation(userId) {
    try {
      const data = await createDirectConversation(userId);
      setOverview((current) => {
        const existing = current.conversations.filter(
          (conversation) => conversation.id !== data.conversation.id
        );

        return {
          ...current,
          conversations: [data.conversation, ...existing],
        };
      });
      setSelectedConversationId(data.conversation.id);
      setIsOpen(true);
      setError("");
    } catch (createError) {
      setError(createError.message || "No se pudo iniciar el chat directo");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !selectedConversationId) {
      return;
    }

    try {
      setIsSending(true);
      const data = await sendConversationMessage(selectedConversationId, text);
      setMessages((current) => [...current, data.message]);
      setOverview((current) => {
        const currentConversation = current.conversations.find(
          (conversation) => conversation.id === selectedConversationId
        );

        const currentUnread =
          current.conversations.find((conversation) => conversation.id === selectedConversationId)
            ?.unreadCount || 0;

        const updatedConversation = {
          ...(currentConversation || {}),
          ...(data.conversation || {}),
          lastMessageText: data.message.text,
          lastMessageAt: data.message.createdAt,
          unreadCount: 0,
        };

        const nextTotalUnread = Math.max(0, (current.totalUnread || 0) - currentUnread);
        onUnreadChange(nextTotalUnread);

        return {
          ...current,
          totalUnread: nextTotalUnread,
          conversations: [
            updatedConversation,
            ...current.conversations.filter((conversation) => conversation.id !== selectedConversationId),
          ],
        };
      });
      setDraft("");
      setMessageError("");
    } catch (sendError) {
      setMessageError(sendError.message || "No se pudo enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={`chat-widget${isOpen ? " is-open" : ""}`}>
      {isOpen ? (
        <section className="chat-widgetPanel">
          <header className="chat-widgetHeader">
            <div>
              <div className="chat-widgetTitle">Chat interno</div>
              <div className="chat-widgetCopy">Mensajes del equipo sin salir del sistema</div>
            </div>
            <button type="button" className="chat-widgetMinimize" onClick={() => setIsOpen(false)}>
              Cerrar
            </button>
          </header>

          {error ? <div className="chat-messageBanner error">{error}</div> : null}

          <div className="chat-widgetBody">
            <aside className="chat-widgetSidebar">
              {isLoadingOverview ? <div className="chat-empty">Cargando conversaciones...</div> : null}

              <div className="chat-list">
                {overview.conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`chat-conversationItem${conversation.id === selectedConversationId ? " active" : ""}`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <div className="chat-conversationTop">
                      <span className="chat-conversationName">
                        {conversation.title}
                        {conversation.unreadCount ? (
                          <span className="chat-unreadBadge">{conversation.unreadCount}</span>
                        ) : null}
                      </span>
                      <span className="chat-conversationTime">
                        {formatRelativeDate(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="chat-conversationSnippet">
                      {conversation.lastMessageText || "Todavia no hay mensajes en esta conversacion."}
                    </div>
                  </button>
                ))}
              </div>

              <div className="chat-userSection">
                <div className="chat-sectionTitle">Equipo</div>
                <div className="chat-userList">
                  {overview.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="chat-userItem"
                      onClick={() => handleStartDirectConversation(user.id)}
                    >
                      <span>
                        {user.name}
                        <small>@{user.username}</small>
                      </span>
                      <strong>{user.role}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="chat-widgetConversation">
              {selectedConversation ? (
                <>
                  <div className="chat-widgetConversationHead">
                    <div className="chat-sectionTitle">{selectedConversation.title}</div>
                    <div className="chat-sectionCopy">
                      {selectedConversation.type === "general"
                        ? "Visible para todo el equipo."
                        : "Chat directo privado."}
                    </div>
                  </div>

                  <div className="chat-messages chat-messages--widget">
                    {isLoadingMessages ? <div className="chat-empty">Cargando mensajes...</div> : null}
                    {messageError ? <div className="chat-messageBanner error">{messageError}</div> : null}

                    {!isLoadingMessages && !messageError && messages.length === 0 ? (
                      <div className="chat-empty">
                        Aca van a aparecer los mensajes. Escribi el primero para abrir la conversacion.
                      </div>
                    ) : null}

                    {messages.map((message) => {
                      const isOwn = message.sender.id === currentUserId;

                      return (
                        <article key={message.id} className={`chat-bubbleRow${isOwn ? " own" : ""}`}>
                          <div className={`chat-bubble${isOwn ? " own" : ""}`}>
                            <div className="chat-bubbleMeta">
                              <span>{isOwn ? "Vos" : message.sender.name}</span>
                              <span>{formatRelativeDate(message.createdAt)}</span>
                            </div>
                            <p>{message.text}</p>
                          </div>
                        </article>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>

                  <form className="chat-composer chat-composer--widget" onSubmit={handleSubmit}>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Escribi un mensaje..."
                      rows={2}
                    />
                    <button type="submit" disabled={isSending || !draft.trim()}>
                      {isSending ? "Enviando..." : "Enviar"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="chat-empty chat-empty--center">
                  Cuando haya conversaciones disponibles, las vas a ver aca.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <button type="button" className="chat-widgetFab" onClick={() => setIsOpen((prev) => !prev)}>
        <span className="chat-widgetFabIcon" aria-hidden="true">+</span>
        <span>Chat</span>
        {unreadCount > 0 ? <span className="chat-widgetFabBadge">{unreadCount}</span> : null}
      </button>
    </div>
  );
}
