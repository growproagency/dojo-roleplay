import { Router } from "express";
import { SCENARIOS } from "../scenarios.js";

const router = Router();

// GET /api/scenarios — list all available scenarios (public)
router.get("/", (_req, res) => {
  const list = Object.values(SCENARIOS).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
  }));
  res.json(list);
});

export default router;
