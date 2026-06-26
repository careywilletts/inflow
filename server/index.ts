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
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET environment variable must be set"); })(),
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        name VARCHAR NOT NULL,
        email VARCHAR,
        company VARCHAR,
        address TEXT,
        phone VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        invoice_number VARCHAR NOT NULL,
        client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
        status VARCHAR NOT NULL DEFAULT 'draft',
        issue_date TIMESTAMP,
        due_date TIMESTAMP,
        from_name VARCHAR,
        from_email VARCHAR,
        from_address TEXT,
        line_items JSONB NOT NULL DEFAULT '[]',
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        total NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR NOT NULL DEFAULT 'GBP',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        invoice_id VARCHAR REFERENCES invoices(id) ON DELETE CASCADE,
        client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
        frequency VARCHAR NOT NULL,
        next_send_date TIMESTAMP,
        last_sent_date TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR UNIQUE REFERENCES users(id),
        logo_url TEXT,
        business_name VARCHAR,
        business_email VARCHAR,
        business_address TEXT,
        cc_email1 VARCHAR,
        cc_email2 VARCHAR,
        vat_number VARCHAR,
        bank_name VARCHAR,
        account_name VARCHAR,
        sort_code VARCHAR,
        account_number VARCHAR,
        invoice_prefix VARCHAR
      );
    `);

    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
    `);
    await client.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
    `);
    await client.query(`
      ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
    `);
    await client.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) UNIQUE;
    `);

    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR;`);
    await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;`);
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS cc_email_1 VARCHAR;`);
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS cc_email_2 VARCHAR;`);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_unique
      ON invoices (user_id, invoice_number);
    `);

    log("Database migration complete", "migrate");
  } catch (err) {
    log(`Migration error: ${err}`, "migrate");
    client.release();
    process.exit(1);
  }
  client.release();
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
