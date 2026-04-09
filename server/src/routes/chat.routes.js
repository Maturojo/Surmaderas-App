import { Router } from "express";
import mongoose from "mongoose";

import ChatConversation from "../models/ChatConversation.js";
import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function getConversationReadAt(conversation, userId) {
  const readEntry = (conversation.lastReadBy || []).find(
    (entry) => String(entry.user) === String(userId)
  );

  return readEntry?.readAt || null;
}

function setConversationReadAt(conversation, userId, readAt = new Date()) {
  const existingEntry = (conversation.lastReadBy || []).find(
    (entry) => String(entry.user) === String(userId)
  );

  if (existingEntry) {
    existingEntry.readAt = readAt;
    return;
  }

  conversation.lastReadBy.push({ user: userId, readAt });
}

async function ensureGeneralConversation() {
  let conversation = await ChatConversation.findOne({ type: "general" });

  if (!conversation) {
    conversation = await ChatConversation.create({
      type: "general",
      title: "Canal general",
      participants: [],
      lastMessageAt: new Date(),
    });
  }

  return conversation;
}

function normalizeConversation(conversation, currentUserId) {
  const id = String(currentUserId);
  const participants = (conversation.participants || []).map((participant) => ({
    id: String(participant._id || participant.id),
    name: participant.name,
    username: participant.username,
    role: participant.role,
    isActive: participant.isActive !== false,
  }));

  const otherParticipants = participants.filter((participant) => participant.id !== id);
  const directTitle = otherParticipants.map((participant) => participant.name || participant.username).join(", ");

  return {
    id: String(conversation._id),
    type: conversation.type,
    title: conversation.type === "general" ? conversation.title || "Canal general" : directTitle || "Chat directo",
    participants,
    unreadCount: conversation.unreadCount || 0,
    lastMessageText: conversation.lastMessageText || "",
    lastMessageAt: conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt,
  };
}

async function assertConversationAccess(conversationId, userId) {
  const conversation = await ChatConversation.findById(conversationId).populate(
    "participants",
    "name username role isActive"
  );

  if (!conversation) {
    return { error: { status: 404, message: "Conversacion no encontrada" } };
  }

  const canAccess =
    conversation.type === "general" ||
    conversation.participants.some((participant) => String(participant._id) === String(userId));

  if (!canAccess) {
    return { error: { status: 403, message: "No tenes acceso a esta conversacion" } };
  }

  return { conversation };
}

router.get("/overview", async (req, res) => {
  try {
    await ensureGeneralConversation();

    const currentUserId = String(req.user.id);
    const [conversations, users] = await Promise.all([
      ChatConversation.find({
        $or: [{ type: "general" }, { participants: req.user.id }],
      })
        .populate("participants", "name username role isActive")
        .sort({ lastMessageAt: -1, updatedAt: -1 }),
      User.find(
        { _id: { $ne: req.user.id }, isActive: true },
        { name: 1, username: 1, role: 1, isActive: 1 }
      ).sort({ name: 1, username: 1 }),
    ]);

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const readAt = getConversationReadAt(conversation, req.user.id);
        const unreadCount = await ChatMessage.countDocuments({
          conversation: conversation._id,
          "sender.id": { $ne: req.user.id },
          ...(readAt ? { createdAt: { $gt: readAt } } : {}),
        });

        const normalizedConversation = conversation.toObject
          ? conversation.toObject()
          : conversation;

        return {
          ...normalizedConversation,
          unreadCount,
        };
      })
    );

    const totalUnread = conversationsWithUnread.reduce(
      (accumulator, conversation) => accumulator + (conversation.unreadCount || 0),
      0
    );

    return res.json({
      conversations: conversationsWithUnread.map((conversation) =>
        normalizeConversation(conversation, currentUserId)
      ),
      totalUnread,
      users: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive !== false,
      })),
    });
  } catch (error) {
    console.error("Error cargando overview del chat:", error?.message || error);
    return res.status(500).json({ message: "No se pudo cargar el chat interno" });
  }
});

router.post("/conversations/direct", async (req, res) => {
  try {
    const { participantId } = req.body || {};

    if (!participantId || !mongoose.isValidObjectId(participantId)) {
      return res.status(400).json({ message: "Participante invalido" });
    }

    if (String(participantId) === String(req.user.id)) {
      return res.status(400).json({ message: "No podes crear un chat con vos mismo" });
    }

    const participant = await User.findById(participantId, "name username role isActive");
    if (!participant || participant.isActive === false) {
      return res.status(404).json({ message: "Usuario no disponible para chatear" });
    }

    let conversation = await ChatConversation.findOne({
      type: "direct",
      participants: { $all: [req.user.id, participantId], $size: 2 },
    }).populate("participants", "name username role isActive");

    if (!conversation) {
      conversation = await ChatConversation.create({
        type: "direct",
        participants: [req.user.id, participantId],
        lastMessageAt: new Date(),
      });

      conversation = await ChatConversation.findById(conversation._id).populate(
        "participants",
        "name username role isActive"
      );
    }

    return res.status(201).json({
      conversation: normalizeConversation(conversation, req.user.id),
    });
  } catch (error) {
    console.error("Error creando chat directo:", error?.message || error);
    return res.status(500).json({ message: "No se pudo iniciar el chat directo" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { conversation, error } = await assertConversationAccess(req.params.id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const messages = await ChatMessage.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(150);

    setConversationReadAt(conversation, req.user.id, new Date());
    await conversation.save();

    return res.json({
      conversation: normalizeConversation(
        {
          ...(conversation.toObject ? conversation.toObject() : conversation),
          unreadCount: 0,
        },
        req.user.id
      ),
      messages: messages.map((message) => ({
        id: String(message._id),
        text: message.text,
        createdAt: message.createdAt,
        sender: {
          id: String(message.sender.id),
          name: message.sender.name,
          username: message.sender.username,
          role: message.sender.role,
        },
      })),
    });
  } catch (error) {
    console.error("Error cargando mensajes del chat:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron cargar los mensajes" });
  }
});

router.post("/conversations/:id/read", async (req, res) => {
  try {
    const { conversation, error } = await assertConversationAccess(req.params.id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    setConversationReadAt(conversation, req.user.id, new Date());
    await conversation.save();

    return res.json({
      conversation: normalizeConversation(
        {
          ...(conversation.toObject ? conversation.toObject() : conversation),
          unreadCount: 0,
        },
        req.user.id
      ),
    });
  } catch (error) {
    console.error("Error marcando conversacion como leida:", error?.message || error);
    return res.status(500).json({ message: "No se pudo actualizar la lectura del chat" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { conversation, error } = await assertConversationAccess(req.params.id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ message: "El mensaje no puede estar vacio" });
    }

    const senderUser = await User.findById(req.user.id, "name username role isActive");
    if (!senderUser || senderUser.isActive === false) {
      return res.status(401).json({ message: "Usuario no autorizado para enviar mensajes" });
    }

    const message = await ChatMessage.create({
      conversation: conversation._id,
      sender: {
        id: senderUser._id,
        name: senderUser.name || senderUser.username,
        username: senderUser.username,
        role: senderUser.role,
      },
      text,
    });

    conversation.lastMessageText = text;
    conversation.lastMessageAt = message.createdAt;
    setConversationReadAt(conversation, req.user.id, message.createdAt);
    await conversation.save();

    return res.status(201).json({
      message: {
        id: String(message._id),
        text: message.text,
        createdAt: message.createdAt,
        sender: {
          id: String(message.sender.id),
          name: message.sender.name,
          username: message.sender.username,
          role: message.sender.role,
        },
      },
      conversation: normalizeConversation(
        {
          ...(conversation.toObject ? conversation.toObject() : conversation),
          unreadCount: 0,
        },
        req.user.id
      ),
    });
  } catch (error) {
    console.error("Error enviando mensaje interno:", error?.message || error);
    return res.status(500).json({ message: "No se pudo enviar el mensaje" });
  }
});

export default router;
