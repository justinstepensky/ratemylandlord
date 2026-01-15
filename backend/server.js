const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 8787;

// ===== DB =====
const dbFile = path.join(__dirname, "data.sqlite");
const sql = new Database(dbFile);

sql.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tenant','landlord','admin')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    landlord_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','denied')),
    created_at TEXT NOT NULL,
    proof_text TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS review_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    landlord_id TEXT NOT NULL,
    review_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const getKV = sql.prepare("SELECT value FROM kv WHERE key=?");
const setKV = sql.prepare(
  "INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
);

function readAppDB() {
  const row = getKV.get("db");
  if (!row) {
    const empty = { version: 1, landlords: [], reports: [] };
    setKV.run("db", JSON.stringify(empty));
    return empty;
  }
  try {
    const parsed = JSON.parse(row.value);
    parsed.version = parsed.version || 1;
    parsed.landlords = parsed.landlords || [];
    parsed.reports = parsed.reports || [];
    return parsed;
  } catch {
    const empty = { version: 1, landlords: [], reports: [] };
    setKV.run("db", JSON.stringify(empty));
    return empty;
  }
}

function writeAppDB(obj) {
  setKV.run("db", JSON.stringify(obj));
}

// ===== Middleware =====
app.use(express.json({ limit: "2mb" }));

// CORS (local dev + your GitHub Pages domain)
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  // GitHub Pages:
  "https://justinstepensky.github.io"
];

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true); // curl / same-origin
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true
  })
);

// Sessions
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.sqlite", dir: __dirname }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
      // NOTE: For HTTPS deployments you’ll also set cookie.secure=true
    }
  })
);

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

// ===== DB Endpoints =====

// GET current DB + attach landlord responses into each review as review.response
app.get("/db", (req, res) => {
  const appDB = readAppDB();

  const responses = sql
    .prepare(
      `SELECT landlord_id, review_id, text, created_at
       FROM review_responses`
    )
    .all();

  const responseMap = new Map();
  for (const r of responses) {
    responseMap.set(`${r.landlord_id}:${r.review_id}`, {
      text: r.text,
      createdAt: r.created_at
    });
  }

  for (const l of appDB.landlords) {
    if (!Array.isArray(l.reviews)) l.reviews = [];
    for (const rv of l.reviews) {
      const key = `${l.id}:${rv.id}`;
      const resp = responseMap.get(key);
      if (resp) rv.response = resp;
    }
  }

  res.json(appDB);
});

// POST overwrite DB
app.post("/db", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Bad JSON" });
  if (!Array.isArray(body.landlords)) body.landlords = [];
  if (!Array.isArray(body.reports)) body.reports = [];
  body.version = body.version || 1;

  writeAppDB(body);
  res.json({ ok: true });
});

// ===== Auth =====

// Sign up (first ever user becomes admin)
app.post("/auth/signup", (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email + password required" });

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanRole = role === "landlord" ? "landlord" : "tenant";

  const existingCount = sql.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  const finalRole = existingCount === 0 ? "admin" : cleanRole;

  const pass_hash = bcrypt.hashSync(String(password), 10);
  const created_at = new Date().toISOString();

  try {
    const info = sql
      .prepare("INSERT INTO users(email, pass_hash, role, created_at) VALUES (?,?,?,?)")
      .run(cleanEmail, pass_hash, finalRole, created_at);

    req.session.user = { id: info.lastInsertRowid, email: cleanEmail, role: finalRole };
    res.json({ ok: true, user: req.session.user });
  } catch (e) {
    if (String(e).includes("UNIQUE")) return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email + password required" });

  const cleanEmail = String(email).trim().toLowerCase();
  const row = sql.prepare("SELECT id, email, pass_hash, role FROM users WHERE email=?").get(cleanEmail);
  if (!row) return res.status(401).json({ error: "Invalid login" });

  const ok = bcrypt.compareSync(String(password), row.pass_hash);
  if (!ok) return res.status(401).json({ error: "Invalid login" });

  req.session.user = { id: row.id, email: row.email, role: row.role };
  res.json({ ok: true, user: req.session.user });
});

app.get("/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ===== Claims =====

// Request a claim
app.post("/claims/request", requireLogin, (req, res) => {
  const { landlordId, proofText } = req.body || {};
  if (!landlordId) return res.status(400).json({ error: "landlordId required" });

  const created_at = new Date().toISOString();

  sql.prepare(
    "INSERT INTO claims(landlord_id, user_id, status, created_at, proof_text) VALUES (?,?,?,?,?)"
  ).run(String(landlordId), req.session.user.id, "pending", created_at, String(proofText || "").slice(0, 4000));

  res.json({ ok: true, status: "pending" });
});

// ✅ Mine (fixes your old “Cannot GET /claims/mine”)
app.get("/claims/mine", requireLogin, (req, res) => {
  const rows = sql.prepare(`
    SELECT id, landlord_id, status, created_at, proof_text
    FROM claims
    WHERE user_id=?
    ORDER BY created_at DESC
  `).all(req.session.user.id);

  res.json({ claims: rows });
});

// Admin: pending claims
app.get("/claims/pending", requireAdmin, (req, res) => {
  const rows = sql.prepare(`
    SELECT c.id, c.landlord_id, c.status, c.created_at, c.proof_text, u.email, u.id as user_id
    FROM claims c
    JOIN users u ON u.id = c.user_id
    WHERE c.status='pending'
    ORDER BY c.created_at DESC
  `).all();
  res.json({ claims: rows });
});

// Admin: approve
app.post("/claims/approve", requireAdmin, (req, res) => {
  const { claimId } = req.body || {};
  if (!claimId) return res.status(400).json({ error: "claimId required" });

  sql.prepare("UPDATE claims SET status='approved' WHERE id=?").run(Number(claimId));
  res.json({ ok: true });
});

// Admin: deny
app.post("/claims/deny", requireAdmin, (req, res) => {
  const { claimId } = req.body || {};
  if (!claimId) return res.status(400).json({ error: "claimId required" });

  sql.prepare("UPDATE claims SET status='denied' WHERE id=?").run(Number(claimId));
  res.json({ ok: true });
});

// ===== Landlord response to review =====
app.post("/reviews/respond", requireLogin, (req, res) => {
  const { landlordId, reviewId, text } = req.body || {};
  if (!landlordId || !reviewId || !text) {
    return res.status(400).json({ error: "landlordId, reviewId, text required" });
  }

  const approved = sql.prepare(`
    SELECT 1 FROM claims
    WHERE landlord_id=? AND user_id=? AND status='approved'
  `).get(String(landlordId), req.session.user.id);

  if (!approved && req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Not verified to respond for this landlord" });
  }

  const created_at = new Date().toISOString();

  const existing = sql
    .prepare("SELECT id FROM review_responses WHERE landlord_id=? AND review_id=?")
    .get(String(landlordId), String(reviewId));

  if (existing) {
    sql.prepare("UPDATE review_responses SET text=?, created_at=?, user_id=? WHERE id=?")
      .run(String(text), created_at, req.session.user.id, existing.id);
  } else {
    sql.prepare(
      "INSERT INTO review_responses(landlord_id, review_id, user_id, text, created_at) VALUES (?,?,?,?,?)"
    ).run(String(landlordId), String(reviewId), req.session.user.id, String(text), created_at);
  }

  res.json({ ok: true });
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
