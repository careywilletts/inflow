import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startScheduler } from "./scheduler";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

app.set("trust proxy", 1);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "inflow-secret-key",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function runMigrations() {
  const client = await pgPool.connect();
  try {
    // Create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        verification_token VARCHAR,
        reset_token VARCHAR,
        reset_token_expiry TIMESTAMP,
        business_name VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add user_id to clients if missing
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
    `);

    // Add user_id to invoices if missing
    await client.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
    `);

    // Add user_id to schedules if missing
    await client.query(`
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
    `);

    // Add user_id to settings if missing
    await client.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) UNIQUE;
    `);

    log("Database migration complete", "migrate");
  } catch (err) {
    log(`Migration error: ${err}`, "migrate");
  } finally {
    client.release();
  }
}

(async () => {
  await runMigrations();
  await registerRoutes(httpServer, app);
  startScheduler();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
