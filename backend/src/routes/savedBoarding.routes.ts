import type { Router } from "express";
import { Router as createRouter } from "express";
import {
  getSavedBoardings,
  saveBoarding,
  unsaveBoarding,
} from "@/controllers/savedBoarding.controller.js";
import { authenticate, requireRole } from "@/middleware/auth.js";

const router: Router = createRouter();

router.use(authenticate, requireRole("STUDENT"));

router.get("/", getSavedBoardings);
router.post("/:boardingId", saveBoarding);
router.delete("/:boardingId", unsaveBoarding);

export default router;
