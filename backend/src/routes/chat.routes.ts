import type { Router } from "express";
import { Router as createRouter } from "express";
import {
  createChatRoom,
  deleteMessage,
  getChatHistory,
  getChatRoom,
  getChatRooms,
  markAllAsRead,
  markMessageAsRead,
  searchUsers,
} from "@/controllers/chat.controller.js";
import { authenticate } from "@/middleware/auth.js";
import { validateBody } from "@/middleware/validate.js";
import {
  createChatRoomSchema,
  markAsReadSchema,
} from "@/schemas/chat.validators.js";

const router: Router = createRouter();

// All chat routes require authentication
router.use(authenticate);

// Chat rooms
router.get("/rooms", getChatRooms);
router.post("/rooms", validateBody(createChatRoomSchema), createChatRoom);
router.get("/rooms/:roomId", getChatRoom);
router.get("/rooms/:roomId/messages", getChatHistory);
router.put(
  "/rooms/:roomId/messages/:messageId/read",
  validateBody(markAsReadSchema),
  markMessageAsRead,
);
router.put("/rooms/:roomId/read-all", markAllAsRead);
router.delete("/rooms/:roomId/messages/:messageId", deleteMessage);

// User search for chat
router.get("/users", searchUsers);

export default router;
