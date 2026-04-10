import { ENV } from "./config/env.js";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { softAuth } from "./middleware/auth.js";
import vapiRouter from "./routes/vapi.js";
import vapiConfigRouter from "./routes/vapi-config.js";
import authRouter from "./routes/auth.js";
import scenariosRouter from "./routes/scenarios.js";
import callsRouter from "./routes/calls.js";
import settingsRouter from "./routes/settings.js";
import leaderboardRouter from "./routes/leaderboard.js";
import adminRouter from "./routes/admin.js";
import schoolRouter from "./routes/school.js";
import invitesRouter from "./routes/invites.js";
import systemRouter from "./routes/system.js";

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(cors({
    origin: ENV.corsOrigin.split(",").map(s => s.trim()),
    credentials: true,
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Vapi webhook routes (public — Vapi sends events here)
  app.use("/api/vapi", vapiRouter);

  // Apply soft auth to all other /api routes
  app.use("/api", softAuth);

  // REST API routes
  app.use("/api/auth", authRouter);
  app.use("/api/scenarios", scenariosRouter);
  app.use("/api/calls", callsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/school", schoolRouter);
  app.use("/api/invites", invitesRouter);
  app.use("/api/system", systemRouter);
  app.use("/api/vapi-config", vapiConfigRouter);

  const port = await findAvailablePort(ENV.port);

  if (port !== ENV.port) {
    console.log(`Port ${ENV.port} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
