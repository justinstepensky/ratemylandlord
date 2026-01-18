/* CASA — single-file SPA app.js (DROP-IN REPLACEMENT)
   ✅ Theme/aesthetic untouched (uses your existing CSS classes)
   ✅ Keeps ALL updates we made today:

   1) Home banner: Recent highlights + Map are TRUE 50/50 on desktop (stack on mobile)
   2) Add Landlord page: borough removed entirely
   3) Landlord Portal: Login + Sign up + Apple/Google/Microsoft buttons (demo-safe)
   4) Menu ONLY on mobile (desktop hides hamburger/drawer)
   5) Region selector: NYC / MIA / LA / CHI
      - Carries over globally to ALL maps
      - Auto-switches region when state is known (Add page + property pages)
   6) Home “Search / Review / Rent” bubbles are horizontal
   7) Mobile crash fixes:
      - No CSS.escape dependency (polyfill + safe selector strategy)
      - No async clipboard promises causing unhandled rejections
      - All render and route calls are guarded so the page won’t go blank

   NOTE: This file expects your existing index.html has:
     - <div id="app"></div>
     - (optional) drawer elements: #menuBtn, #drawer, #drawerOverlay, #drawerClose
     - (optional) modal overlay: #modalOverlay
     - Leaflet loaded if you want maps (window.L). If not, the app still works.
*/

/* -----------------------------
   Safety Net (prevents blank screen)
------------------------------ */
(function installSafetyNet() {
  function showOverlayError(title, err) {
    try {
      console.error(title, err);
      const app = document.getElementById("app");
      if (!app) return;

      const msg = String(
        err && (err.stack || err.message) ? err.stack || err.message : err
      );

      app.innerHTML = `
        <section class="pageCard card">
          <div class="pad">
            <div class="kicker">CASA</div>
            <div class="pageTitle" style="margin-top:6px;">Something went wrong</div>
            <div class="pageSub" style="margin-top:8px;">The app hit an error and stopped rendering.</div>
            <div class="hr"></div>
            <div class="smallNote"
                 style="white-space:pre-wrap;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,'Liberation Mono','Courier New', monospace;">
${String(title || "Error")}
${msg}
            </div>
            <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
              <a class="btn btn--primary" href="#/">Go Home</a>
              <button class="btn" id="reloadBtn" type="button">Reload</button>
              <button class="btn" id="resetBtn" type="button">Reset demo data</button>
            </div>
            <div class="tiny" style="margin-top:10px;">Tip: open DevTools → Console to see the full error log.</div>
          </div>
        </section>
      `;

      const rb = document.getElementById("reloadBtn");
      const xb = document.getElementById("resetBtn");
      rb && rb.addEventListener("click", () => location.reload());
      xb &&
        xb.addEventListener("click", () => {
          try {
            localStorage.removeItem("casa_demo_v2");
            localStorage.removeItem("casa_demo_v1");
          } catch {}
          location.reload();
        });
    } catch {}
  }

  window.addEventListener("error", (e) => {
    showOverlayError("Uncaught error", e && (e.error || e.message) ? e.error || e.message : e);
  });

  // IMPORTANT: we DO include this, because you were seeing this exact error.
  // If something rejects (clipboard, some browser API), this catches and shows the overlay,
  // rather than letting the app go blank.
  window.addEventListener("unhandledrejection", (e) => {
    showOverlayError("Unhandled promise rejection", e && e.reason ? e.reason : e);
  });
})();

/* -----------------------------
   CSS.escape polyfill (iOS/Safari safe)
------------------------------ */
(function ensureCSSEscape() {
  if (typeof window.CSS === "undefined") window.CSS = {};
  if (typeof window.CSS.escape !== "function") {
    window.CSS.escape = function (value) {
      return String(value).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, (ch) => "\\" + ch);
    };
  }
})();

/* -----------------------------
   DOM helpers
------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function norm(s) {
  return String(s || "").trim().toLowerCase();
}
function idRand(prefix) {
  return prefix + Math.random().toString(16).slice(2);
}
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function setPageTitle(title) {
  try {
    document.title = title ? `${title} • casa` : "casa";
  } catch {}
}

/* -----------------------------
   Runtime styles (ONLY layout fixes)
------------------------------ */
function ensureRuntimeStyles() {
  if (document.getElementById("casaRuntimeStyles")) return;
  const style = document.createElement("style");
  style.id = "casaRuntimeStyles";
  style.textContent = `
    /* ✅ Force 50/50 banner split on desktop; stack on mobile */
    .splitRow--banner{
      display:grid !important;
      grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
      gap: 16px !important;
      align-items: stretch !important;
      width: 100% !important;
    }
    .splitRow--banner > *{
      min-width: 0 !important;
      width: 100% !important;
      max-width: none !important;
    }
    .splitRow--banner .homePaneCard{
      min-height: 420px !important;
    }
    @media (max-width: 980px){
      .splitRow--banner{
        grid-template-columns: 1fr !important;
      }
      .splitRow--banner .homePaneCard{
        min-height: auto !important;
      }
    }

    /* Carousel track guard */
    #highTrack{ display:flex; transition: transform .35s ease; }
    .carouselSlide{ min-width:100%; }

    /* Map sizing guard */
    #homeMap, #searchMap, #propMap, #addMap{
      width:100%;
      min-height: 320px;
      border-radius: 18px;
      overflow:hidden;
    }

    /* ✅ Home tiles: horizontal bubble buttons */
    .tileRow{
      display:flex !important;
      flex-direction:row !important;
      gap:12px !important;
      flex-wrap:wrap !important;
      align-items:center !important;
      justify-content:flex-start !important;
      margin-top:14px !important;
    }
    .tileRow .tile{
      display:inline-flex !important;
      align-items:center !important;
      gap:10px !important;
      padding:10px 14px !important;
      border-radius:999px !important;
      border:1px solid rgba(20,16,12,.14) !important;
      background: rgba(255,255,255,.55) !important;
      box-shadow: 0 10px 26px rgba(20,16,12,.06) !important;
      cursor:pointer !important;
      user-select:none !important;
      width:auto !important;
      flex:0 0 auto !important;
      margin:0 !important;
    }
    .tileRow .tile.tile--disabled{
      opacity:.55 !important;
      cursor:not-allowed !important;
    }
    .tileRow .tile .tile__label{
      font-weight:900 !important;
      line-height:1 !important;
    }

    /* ✅ Drawer: enforce horizontal row of action bubbles if present */
    #drawer .drawerBubbleRow{
      display:flex !important;
      flex-direction:row !important;
      gap:10px !important;
      flex-wrap:wrap !important;
      align-items:center !important;
      justify-content:flex-start !important;
      padding:12px !important;
    }
    #drawer .drawerBubbleRow a,
    #drawer .drawerBubbleRow button{
      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      padding:10px 14px !important;
      border-radius:999px !important;
      border:1px solid rgba(20,16,12,.14) !important;
      background:rgba(255,255,255,.55) !important;
      text-decoration:none !important;
      font-weight:900 !important;
      font-size:13px !important;
      line-height:1 !important;
      color:rgba(21,17,14,.92) !important;
      box-shadow:0 10px 26px rgba(20,16,12,.06) !important;
      width:auto !important;
      margin:0 !important;
      flex: 0 0 auto !important;
      cursor:pointer !important;
    }
  `.trim();
  document.head.appendChild(style);
}

/* -----------------------------
   Storage / Seed / Migration
------------------------------ */
const LS_KEY = "casa_demo_v2";
const LEGACY_LS_KEY = "casa_demo_v1";

function safeParseJSON(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}
function saveDB(db) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch {}
}

function normalizeDB(db) {
  const out = {
    landlords: Array.isArray(db.landlords) ? db.landlords : [],
    properties: Array.isArray(db.properties) ? db.properties : [],
    reviews: Array.isArray(db.reviews) ? db.reviews : [],
    reports: Array.isArray(db.reports) ? db.reports : [],
    flags: Array.isArray(db.flags) ? db.flags : [],
    replies: Array.isArray(db.replies) ? db.replies : [],
    landlordUsers: Array.isArray(db.landlordUsers) ? db.landlordUsers : [],
  };

  out.landlords = out.landlords
    .map((l) => ({
      id: String(l && l.id ? l.id : ""),
      name: String(l && l.name ? l.name : ""),
      entity: String(l && l.entity ? l.entity : ""),
      verified: !!(l && l.verified),
      top: !!(l && l.top),
      createdAt: Number(l && l.createdAt ? l.createdAt : Date.now()),
    }))
    .filter((l) => l.id && l.name);

  out.properties = out.properties
    .map((p) => ({
      id: String(p && p.id ? p.id : ""),
      landlordId: String(p && p.landlordId ? p.landlordId : ""),
      address: {
        line1: String(p && p.address && p.address.line1 ? p.address.line1 : ""),
        unit: String(p && p.address && p.address.unit ? p.address.unit : ""),
        city: String(p && p.address && p.address.city ? p.address.city : ""),
        state: String(p && p.address && p.address.state ? p.address.state : ""),
      },
      borough: String(p && p.borough ? p.borough : ""), // kept for backward compatibility, NOT used in UI
      lat: typeof (p && p.lat) === "number" ? p.lat : null,
      lng: typeof (p && p.lng) === "number" ? p.lng : null,
      createdAt: Number(p && p.createdAt ? p.createdAt : Date.now()),
    }))
    .filter((p) => p.id && p.address && p.address.line1);

  out.reviews = out.reviews
    .map((r) => {
      if (r && r.targetType && r.targetId) return r;
      if (r && r.landlordId) return { ...r, targetType: "landlord", targetId: r.landlordId };
      if (r && r.propertyId) return { ...r, targetType: "property", targetId: r.propertyId };
      return r;
    })
    .filter(Boolean)
    .map((r) => ({
      id: String(r.id || idRand("r")),
      targetType: r.targetType === "property" ? "property" : "landlord",
      targetId: String(r.targetId || ""),
      stars: Math.max(1, Math.min(5, Number(r.stars || 5))),
      text: String(r.text || ""),
      createdAt: Number(r.createdAt || Date.now()),
    }))
    .filter((r) => r.targetId);

  return out;
}

function migrateLegacyToV2(legacy) {
  const now = Date.now();
  const landlords = (legacy.landlords || [])
    .map((l) => ({
      id: String(l && l.id ? l.id : idRand("l")),
      name: String(l && l.name ? l.name : ""),
      entity: String(l && l.entity ? l.entity : ""),
      verified: !!(l && l.verified),
      top: !!(l && l.top),
      createdAt: Number(l && l.createdAt ? l.createdAt : now),
    }))
    .filter((l) => l.id && l.name);

  const properties = landlords
    .map((l) => {
      const legacyL = (legacy.landlords || []).find((x) => String(x && x.id ? x.id : "") === l.id) || {};
      return {
        id: idRand("p"),
        landlordId: l.id,
        address: {
          line1: String(legacyL && legacyL.address && legacyL.address.line1 ? legacyL.address.line1 : ""),
          unit: String(legacyL && legacyL.address && legacyL.address.unit ? legacyL.address.unit : ""),
          city: String(legacyL && legacyL.address && legacyL.address.city ? legacyL.address.city : ""),
          state: String(legacyL && legacyL.address && legacyL.address.state ? legacyL.address.state : ""),
        },
        borough: String(legacyL && legacyL.borough ? legacyL.borough : ""),
        lat: typeof (legacyL && legacyL.lat) === "number" ? legacyL.lat : 40.73,
        lng: typeof (legacyL && legacyL.lng) === "number" ? legacyL.lng : -73.95,
        createdAt: Number(legacyL && legacyL.createdAt ? legacyL.createdAt : now),
      };
    })
    .filter((p) => p.address && p.address.line1);

  const reviews = (legacy.reviews || [])
    .map((r) => ({
      id: String(r && r.id ? r.id : idRand("r")),
      targetType: "landlord",
      targetId: String(r && r.landlordId ? r.landlordId : ""),
      stars: Math.max(1, Math.min(5, Number(r && r.stars ? r.stars : 5))),
      text: String(r && r.text ? r.text : ""),
      createdAt: Number(r && r.createdAt ? r.createdAt : now),
    }))
    .filter((r) => r.targetId);

  const reports = Array.isArray(legacy.reports) ? legacy.reports : [];
  return normalizeDB({ landlords, properties, reviews, reports, flags: [], replies: [], landlordUsers: [] });
}

function seedDB() {
  const now = Date.now();
  const landlords = [
    { id: "l1", name: "Northside Properties", entity: "", verified: true, top: false, createdAt: now - 16 * 864e5 },
    { id: "l2", name: "Park Ave Management", entity: "Park Ave Management LLC", verified: false, top: false, createdAt: now - 28 * 864e5 },
    { id: "l3", name: "Elmhurst Holdings", entity: "", verified: true, top: true, createdAt: now - 35 * 864e5 },
  ];
  const properties = [
    { id: "p1", landlordId: "l1", address: { line1: "123 Main St", unit: "", city: "Brooklyn", state: "NY" }, borough: "", lat: 40.7081, lng: -73.9571, createdAt: now - 16 * 864e5 },
    { id: "p2", landlordId: "l2", address: { line1: "22 Park Ave", unit: "", city: "New York", state: "NY" }, borough: "", lat: 40.7433, lng: -73.9822, createdAt: now - 28 * 864e5 },
    { id: "p3", landlordId: "l3", address: { line1: "86-12 Broadway", unit: "", city: "Queens", state: "NY" }, borough: "", lat: 40.7404, lng: -73.8794, createdAt: now - 35 * 864e5 },
    { id: "p4", landlordId: "l3", address: { line1: "41-12 75th St", unit: "", city: "Queens", state: "NY" }, borough: "", lat: 40.7462, lng: -73.8892, createdAt: now - 20 * 864e5 },
  ];
  const reviews = [
    { id: "r1", targetType: "landlord", targetId: "l1", stars: 4, text: "Work orders were acknowledged quickly. A leak was fixed within a week.", createdAt: now - 11 * 864e5 },
    { id: "r2", targetType: "landlord", targetId: "l2", stars: 3, text: "Great location, but communication was slow. Deposit itemization took weeks.", createdAt: now - 45 * 864e5 },
    { id: "r3", targetType: "landlord", targetId: "l3", stars: 5, text: "Responsive management. Clear lease terms and quick repairs.", createdAt: now - 6 * 864e5 },
    { id: "r4", targetType: "landlord", targetId: "l3", stars: 5, text: "Fast maintenance and respectful staff.", createdAt: now - 18 * 864e5 },
    { id: "r5", targetType: "landlord", targetId: "l3", stars: 4, text: "Solid experience overall; minor delays during holidays.", createdAt: now - 58 * 864e5 },
    { id: "r6", targetType: "property", targetId: "p3", stars: 4, text: "Building is quiet and clean. Elevator had occasional downtime.", createdAt: now - 9 * 864e5 },
    { id: "r7", targetType: "property", targetId: "p4", stars: 2, text: "Heat issues in winter and slow hallway lighting repairs.", createdAt: now - 32 * 864e5 },
  ];
  const reports = [
    { landlordId: "l1", updatedAt: now - 2 * 864e5, violations_12mo: 7, complaints_12mo: 22, bedbug_reports_12mo: 1, hp_actions: 0, permits_open: 2, eviction_filings_12mo: 1, notes: "Demo only." },
    { landlordId: "l2", updatedAt: now - 4 * 864e5, violations_12mo: 18, complaints_12mo: 49, bedbug_reports_12mo: 3, hp_actions: 1, permits_open: 4, eviction_filings_12mo: 6, notes: "Demo only." },
    { landlordId: "l3", updatedAt: now - 1 * 864e5, violations_12mo: 2, complaints_12mo: 9, bedbug_reports_12mo: 0, hp_actions: 0, permits_open: 1, eviction_filings_12mo: 0, notes: "Demo only." },
  ];
  const db = { landlords, properties, reviews, reports, flags: [], replies: [], landlordUsers: [] };
  saveDB(db);
  return db;
}

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = safeParseJSON(raw);
      if (parsed && typeof parsed === "object") return normalizeDB(parsed);
    }
  } catch {}

  const legacy = safeParseJSON(localStorage.getItem(LEGACY_LS_KEY) || "");
  if (legacy && legacy.landlords && legacy.reviews) {
    const migrated = migrateLegacyToV2(legacy);
    saveDB(migrated);
    return migrated;
  }

  return seedDB();
}

let DB = loadDB();
function persist() { saveDB(DB); }

/* -----------------------------
   Regions (NYC/MIA/LA/CHI) — global
------------------------------ */
const REGION_KEY = "casa_region_v1";
const REGIONS = {
  NYC: { label: "New York", center: [40.73, -73.95], zoom: 11, states: ["NY"] },
  MIA: { label: "Miami", center: [25.7617, -80.1918], zoom: 11, states: ["FL"] },
  LA:  { label: "Los Angeles", center: [34.0522, -118.2437], zoom: 10, states: ["CA"] },
  CHI: { label: "Chicago", center: [41.8781, -87.6298], zoom: 11, states: ["IL"] },
};

function getRegionKey() {
  const raw = String(localStorage.getItem(REGION_KEY) || "").toUpperCase();
  return REGIONS[raw] ? raw : "NYC";
}
function setRegionKey(key) {
  const k = String(key || "").toUpperCase();
  const safe = REGIONS[k] ? k : "NYC";
  try { localStorage.setItem(REGION_KEY, safe); } catch {}
}
function regionFromState(state) {
  const s = String(state || "").trim().toUpperCase();
  if (!s) return null;
  for (const [k, cfg] of Object.entries(REGIONS)) {
    if ((cfg.states || []).includes(s)) return k;
  }
  return null;
}
function filterPropertiesByRegion(props, regionKey) {
  const cfg = REGIONS[regionKey] || REGIONS.NYC;
  const allowed = new Set((cfg.states || []).map((x) => String(x).toUpperCase()));
  return props.filter((p) => allowed.has(String((p.address && p.address.state) || "").toUpperCase()));
}
function regionSelectorHTML(activeKey) {
  const keys = Object.keys(REGIONS);
  return `
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      ${keys.map((k) => {
        const isOn = k === activeKey;
        return `
          <button type="button"
                  class="btn miniBtn ${isOn ? "btn--primary" : ""}"
                  data-region-btn="${esc(k)}"
                  aria-pressed="${isOn ? "true" : "false"}">${esc(REGIONS[k].label)}</button>
        `.trim();
      }).join("")}
    </div>
  `.trim();
}
function wireRegionSelector(rootEl, onChange) {
  if (!rootEl) return;
  $$("#" + rootEl.id + " [data-region-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.getAttribute("data-region-btn");
      if (!k) return;
      setRegionKey(k);
      if (typeof onChange === "function") onChange(k);
    });
  });
}

/* -----------------------------
   Leaflet safe init (optional)
------------------------------ */
function leafletReady() {
  return typeof window.L !== "undefined" && typeof window.L.map === "function";
}
function initLeafletMap(el, center, zoom = 12) {
  if (!el) return null;
  if (!leafletReady()) return null;

  try {
    if (el._casaMap && typeof el._casaMap.remove === "function") el._casaMap.remove();
  } catch {}

  try {
    const map = window.L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
    try { el._casaMap = map; } catch {}

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    setTimeout(() => { try { map.invalidateSize(); } catch {} }, 60);
    return map;
  } catch (e) {
    console.error("Map init failed:", e);
    return null;
  }
}

/* -----------------------------
   Ratings
------------------------------ */
function reviewsFor(targetType, targetId) {
  return DB.reviews
    .filter((r) => r.targetType === targetType && r.targetId === targetId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
function weightedAverageStars(reviews) {
  if (!reviews.length) return null;
  // Simple average (kept stable + predictable)
  const sum = reviews.reduce((a, r) => a + Number(r.stars || 0), 0);
  return sum / reviews.length;
}

function starsToHTML(avg) {
  if (avg == null || Number.isNaN(avg)) return `<span class="tiny">No reviews yet</span>`;
  const full = Math.round(avg); // keep simple + consistent
  const s = "★★★★★".split("").map((ch, i) => {
    const on = i < full;
    return `<span class="star ${on ? "star--on" : ""}">${ch}</span>`;
  }).join("");
  return `<div class="starsRow" aria-label="${round1(avg)} stars">${s}<span class="tiny" style="margin-left:8px;">${round1(avg)}/5</span></div>`;
}

function ratingClassFromAvg(avg) {
  // ✅ translucent outline/shade based on stars
  // 1–2.99 = red, 2.99–3.99 = yellow, 4–5 = green, null/no reviews = none
  if (avg == null || Number.isNaN(avg)) return "";
  if (avg >= 4) return "cardTint cardTint--green";
  if (avg >= 2.99) return "cardTint cardTint--yellow";
  return "cardTint cardTint--red";
}

function ensureTintStyles() {
  if (document.getElementById("casaTintStyles")) return;
  const style = document.createElement("style");
  style.id = "casaTintStyles";
  style.textContent = `
    .cardTint{ position:relative; }
    .cardTint--green{
      box-shadow: 0 16px 40px rgba(20,16,12,.06);
      outline: 2px solid rgba(46, 160, 67, .22);
      background: rgba(46, 160, 67, .06);
    }
    .cardTint--yellow{
      box-shadow: 0 16px 40px rgba(20,16,12,.06);
      outline: 2px solid rgba(230, 180, 35, .24);
      background: rgba(230, 180, 35, .07);
    }
    .cardTint--red{
      box-shadow: 0 16px 40px rgba(20,16,12,.06);
      outline: 2px solid rgba(220, 70, 70, .22);
      background: rgba(220, 70, 70, .06);
    }

    /* badge row visibility guard */
    .badgeRow{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      margin-top:8px;
    }
    .badgeIcon{
      width:18px; height:18px;
      display:inline-block;
      border-radius:6px;
      overflow:hidden;
    }
    .badgePill{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:6px 10px;
      border-radius:999px;
      border:1px solid rgba(20,16,12,.14);
      background: rgba(255,255,255,.55);
      font-weight:900;
      font-size:12px;
      color: rgba(21,17,14,.92);
      box-shadow: 0 10px 26px rgba(20,16,12,.06);
    }
  `.trim();
  document.head.appendChild(style);
}

function landlordBadgesHTML(landlord) {
  // ✅ uses your existing assets if present in /assets; gracefully degrades to text pills
  // - blue check = verified landlord
  // - casa logo = top landlord
  const verified = !!(landlord && landlord.verified);
  const top = !!(landlord && landlord.top);

  if (!verified && !top) return "";

  const parts = [];
  if (verified) {
    parts.push(`
      <span class="badgePill" title="Verified landlord">
        <img class="badgeIcon" alt="Verified" src="./assets/verified.png" onerror="this.remove()">
        Verified
      </span>
    `.trim());
  }
  if (top) {
    parts.push(`
      <span class="badgePill" title="Top landlord">
        <img class="badgeIcon" alt="Top landlord" src="./assets/top.png" onerror="this.remove()">
        Top Landlord
      </span>
    `.trim());
  }
  return `<div class="badgeRow">${parts.join("")}</div>`;
}

function landlordDisplayName(landlord) {
  if (!landlord) return "";
  return landlord.entity ? `${landlord.name} · ${landlord.entity}` : landlord.name;
}

/* -----------------------------
   Lookup helpers
------------------------------ */
function getLandlord(id) {
  return DB.landlords.find((l) => l.id === id) || null;
}
function getProperty(id) {
  return DB.properties.find((p) => p.id === id) || null;
}
function propertiesForLandlord(landlordId) {
  return DB.properties.filter((p) => p.landlordId === landlordId);
}
function formatAddress(p) {
  if (!p || !p.address) return "";
  const a = p.address;
  const unit = a.unit ? ` ${a.unit}` : "";
  const city = a.city ? `, ${a.city}` : "";
  const st = a.state ? `, ${a.state}` : "";
  return `${a.line1}${unit}${city}${st}`.trim();
}

/* -----------------------------
   Search
------------------------------ */
function searchAll(q, regionKey) {
  const query = norm(q);
  const regionProps = filterPropertiesByRegion(DB.properties, regionKey);

  const landlords = DB.landlords.filter((l) => {
    if (!query) return true;
    const p = propertiesForLandlord(l.id);
    const anyAddr = p.some((pp) => norm(formatAddress(pp)).includes(query));
    return norm(l.name).includes(query) || norm(l.entity).includes(query) || anyAddr;
  });

  const properties = regionProps.filter((p) => {
    if (!query) return true;
    const l = getLandlord(p.landlordId);
    const inLandlord = l ? (norm(l.name).includes(query) || norm(l.entity).includes(query)) : false;
    return norm(formatAddress(p)).includes(query) || inLandlord;
  });

  // Keep landlords sorted by rating desc (nulls last), properties by rating desc (nulls last)
  const landlordWithAvg = landlords.map((l) => {
    const avg = weightedAverageStars(reviewsFor("landlord", l.id));
    return { l, avg: avg == null ? -1 : avg };
  }).sort((a, b) => b.avg - a.avg || norm(a.l.name).localeCompare(norm(b.l.name)));

  const propWithAvg = properties.map((p) => {
    const avg = weightedAverageStars(reviewsFor("property", p.id));
    return { p, avg: avg == null ? -1 : avg };
  }).sort((a, b) => b.avg - a.avg || norm(formatAddress(a.p)).localeCompare(norm(formatAddress(b.p))));

  return {
    landlords: landlordWithAvg.map((x) => x.l),
    properties: propWithAvg.map((x) => x.p),
  };
}

/* -----------------------------
   Clipboard helper (no unhandled rejections)
------------------------------ */
async function safeCopy(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(String(text || ""));
      return true;
    }
  } catch {}
  // Fallback
  try {
    const ta = document.createElement("textarea");
    ta.value = String(text || "");
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch {}
  return false;
}

/* -----------------------------
   App Shell
------------------------------ */
function renderShell(innerHTML) {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="appWrap">
      ${innerHTML || ""}
    </div>
  `;
}

function topNavHTML(active) {
  return `
    <header class="topNav">
      <div class="topNav__inner">
        <a class="brand" href="#/">
          <span class="brand__mark" aria-hidden="true">〰️</span>
          <span class="brand__word">casa</span>
        </a>

        <nav class="navLinks">
          <a class="navLink ${active === "search" ? "isActive" : ""}" href="#/search">Search</a>
          <a class="navLink ${active === "add" ? "isActive" : ""}" href="#/add">Add Landlord</a>
          <a class="navLink ${active === "toolkit" ? "isActive" : ""}" href="#/toolkit">Tenant Toolkit</a>
          <a class="navLink ${active === "how" ? "isActive" : ""}" href="#/how">How It Works</a>
          <a class="navLink ${active === "trust" ? "isActive" : ""}" href="#/trust">Trust & Safety</a>
        </nav>

        <div class="navActions">
          <a class="btn btn--primary" href="#/portal">Landlord Portal</a>
          <button class="btn" id="menuBtn" type="button" aria-label="Menu">Menu</button>
        </div>
      </div>
    </header>

    <div id="drawerOverlay" class="drawerOverlay" aria-hidden="true"></div>
    <aside id="drawer" class="drawer" aria-hidden="true">
      <div class="drawer__top">
        <div class="drawer__title">Menu</div>
        <button class="btn" id="drawerClose" type="button" aria-label="Close">Close</button>
      </div>

      <div class="drawer__links">
        <a href="#/search" class="drawerLink">Search</a>
        <a href="#/add" class="drawerLink">Add Landlord</a>
        <a href="#/toolkit" class="drawerLink">Tenant Toolkit</a>
        <a href="#/how" class="drawerLink">How It Works</a>
        <a href="#/trust" class="drawerLink">Trust & Safety</a>
        <a href="#/portal" class="drawerLink"><b>Landlord Portal</b></a>
      </div>

      <div class="drawerBubbleRow">
        <a href="#/search">Search</a>
        <a href="#/add">Review</a>
        <button type="button" id="drawerReportBtn">Report</button>
      </div>

      <div class="tiny" style="padding:12px;">
        <div><b>CASA</b> — Landlords reviewed. Rentals improved.</div>
        <div style="margin-top:6px;">Demo data only. No accounts needed to review.</div>
      </div>
    </aside>
  `.trim();
}

function pageWrapHTML(title, subtitle, bodyHTML) {
  return `
    <main class="main">
      <section class="pageCard card">
        <div class="pad">
          ${title ? `<div class="pageTitle">${esc(title)}</div>` : ""}
          ${subtitle ? `<div class="pageSub">${esc(subtitle)}</div>` : ""}
          ${bodyHTML || ""}
        </div>
      </section>
    </main>
  `.trim();
}

/* -----------------------------
   Drawer init
------------------------------ */
function initDrawer() {
  const btn = $("#menuBtn");
  const drawer = $("#drawer");
  const overlay = $("#drawerOverlay");
  const close = $("#drawerClose");
  const reportBtn = $("#drawerReportBtn");

  function open() {
    if (!drawer || !overlay) return;
    drawer.classList.add("isOpen");
    overlay.classList.add("isOpen");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
  }
  function shut() {
    if (!drawer || !overlay) return;
    drawer.classList.remove("isOpen");
    overlay.classList.remove("isOpen");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
  }

  btn && btn.addEventListener("click", open);
  close && close.addEventListener("click", shut);
  overlay && overlay.addEventListener("click", shut);

  reportBtn && reportBtn.addEventListener("click", async () => {
    // demo: copies support email text without throwing
    await safeCopy("support@casa.example (demo)");
    shut();
    toast("Copied support contact (demo).");
  });
}

/* -----------------------------
   Mobile-only Menu (desktop hides)
------------------------------ */
function initMobileOnlyMenu() {
  const btn = $("#menuBtn");
  const drawer = $("#drawer");
  const overlay = $("#drawerOverlay");

  function apply() {
    const isDesktop = window.innerWidth >= 981;
    if (btn) btn.style.display = isDesktop ? "none" : "";
    if (drawer) drawer.style.display = isDesktop ? "none" : "";
    if (overlay) overlay.style.display = isDesktop ? "none" : "";

    if (isDesktop) {
      try {
        drawer && drawer.classList.remove("isOpen");
        overlay && overlay.classList.remove("isOpen");
      } catch {}
    }
  }

  apply();
  window.addEventListener("resize", apply);
}

/* -----------------------------
   Toast (lightweight)
------------------------------ */
let toastTimer = null;
function toast(msg) {
  try {
    let el = document.getElementById("casaToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "casaToast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.zIndex = "9999";
      el.style.padding = "10px 14px";
      el.style.borderRadius = "999px";
      el.style.border = "1px solid rgba(20,16,12,.14)";
      el.style.background = "rgba(255,255,255,.85)";
      el.style.boxShadow = "0 18px 44px rgba(20,16,12,.12)";
      el.style.fontWeight = "900";
      el.style.fontSize = "13px";
      el.style.color = "rgba(21,17,14,.92)";
      el.style.maxWidth = "90vw";
      el.style.whiteSpace = "nowrap";
      el.style.overflow = "hidden";
      el.style.textOverflow = "ellipsis";
      document.body.appendChild(el);
    }
    el.textContent = String(msg || "");
    el.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      try { el.style.opacity = "0"; } catch {}
    }, 2200);
  } catch {}
}

/* -----------------------------
   Router + Boot (HARDENED)
------------------------------ */
let __booted = false;

function safeRender(fn) {
  try {
    fn && fn();
  } catch (e) {
    // SafetyNet will show overlay; also log here
    console.error("Render error:", e);
    throw e;
  }
}

function route() {
  const hash = location.hash || "#/";
  const path = hash.replace("#", "");
  const cleanPath = path.split("?")[0];
  const parts = cleanPath.split("/").filter(Boolean);

  const base = parts[0] || "";
  const param = parts[1] || "";

  if (!base) return safeRender(renderHome);
  if (base === "search") return safeRender(renderSearch);
  if (base === "add") return safeRender(renderAdd);
  if (base === "how") return safeRender(renderHow);
  if (base === "trust") return safeRender(renderTrust);
  if (base === "portal") return safeRender(renderPortal);
  if (base === "toolkit") return safeRender(renderToolkit);
  if (base === "landlord" && param) return safeRender(() => renderLandlord(param));
  if (base === "property" && param) return safeRender(() => renderProperty(param));

  safeRender(renderHome);
}

function bootOnce() {
  if (__booted) return;
  __booted = true;

  ensureRuntimeStyles();
  ensureTintStyles();

  // Ensure app container exists
  if (!document.getElementById("app")) {
    const div = document.createElement("div");
    div.id = "app";
    document.body.appendChild(div);
  }

  initDrawer();
  initMobileOnlyMenu();

  route();
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", bootOnce);
window.addEventListener("load", bootOnce);

/* -----------------------------
   Home
------------------------------ */
function homeHighlightsHTML(regionKey) {
  // Most recent reviews (max 5), regardless of type
  const recent = [...DB.reviews].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const dots = recent.map((_, i) => `
    <button class="dot ${i === 0 ? "isActive" : ""}" type="button" data-dot="${i}" aria-label="Slide ${i+1}"></button>
  `).join("");

  const slides = recent.map((r) => {
    const isLandlord = r.targetType === "landlord";
    const l = isLandlord ? getLandlord(r.targetId) : getLandlord(getProperty(r.targetId)?.landlordId);
    const p = isLandlord ? null : getProperty(r.targetId);
    const title = isLandlord
      ? (l ? landlordDisplayName(l) : "Landlord")
      : (p ? formatAddress(p) : "Property");
    const sub = isLandlord
      ? (propertiesForLandlord(r.targetId)[0] ? formatAddress(propertiesForLandlord(r.targetId)[0]) : "")
      : (l ? landlordDisplayName(l) : "");

    return `
      <div class="carouselSlide">
        <div class="kicker">Recent Highlight</div>
        <div class="pageTitle" style="margin-top:8px;">${esc(title)}</div>
        ${sub ? `<div class="pageSub" style="margin-top:6px;">${esc(sub)}</div>` : ""}
        <div style="margin-top:10px;">${starsToHTML(Number(r.stars))}</div>
        <div class="smallNote" style="margin-top:10px;">${esc(r.text || "")}</div>
        <div class="tiny" style="margin-top:10px;">${fmtDate(r.createdAt)}</div>
        <div style="margin-top:12px;">
          <a class="btn btn--primary" href="${isLandlord ? `#/landlord/${esc(r.targetId)}` : `#/property/${esc(r.targetId)}`}">View</a>
        </div>
      </div>
    `.trim();
  }).join("");

  return `
    <div class="homePaneCard card">
      <div class="pad">
        <div class="carousel">
          <div id="highTrack">${slides}</div>
          <div class="dotsRow" style="margin-top:12px; display:flex; gap:8px;">${dots}</div>
        </div>
      </div>
    </div>
  `.trim();
}

function homeMapHTML(regionKey) {
  const cfg = REGIONS[regionKey] || REGIONS.NYC;
  return `
    <div class="homePaneCard card">
      <div class="pad">
        <div class="kicker">Map</div>
        <div class="pageTitle" style="margin-top:8px;">Explore nearby reviews</div>
        <div class="pageSub" style="margin-top:6px;">Showing ${esc(cfg.label)} (${esc(regionKey)})</div>
        <div style="margin-top:12px;">${regionSelectorHTML(regionKey)}</div>
        <div style="margin-top:14px;">
          <div id="homeMap"></div>
          ${!leafletReady() ? `<div class="tiny" style="margin-top:8px;">Map requires Leaflet (optional).</div>` : ""}
        </div>
      </div>
    </div>
  `.trim();
}

function wireHomeCarousel() {
  const track = $("#highTrack");
  const dots = $$(".dotsRow .dot");
  if (!track || !dots.length) return;

  let idx = 0;
  function go(i) {
    idx = Math.max(0, Math.min(dots.length - 1, i));
    track.style.transform = `translateX(${-idx * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle("isActive", di === idx));
  }
  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.getAttribute("data-dot") || "0"))));
}

function renderHome() {
  setPageTitle("");
  const regionKey = getRegionKey();

  renderShell(`
    ${topNavHTML("")}
    <main class="main">
      <section class="hero card">
        <div class="pad">
          <div class="kicker">Landlords reviewed. Rentals improved.</div>
          <div class="pageTitle" style="margin-top:10px;">Find a landlord or address in seconds.</div>
          <div class="pageSub" style="margin-top:8px;">Search ratings, read reviews, and add new listings — no tenant account required.</div>

          <div style="margin-top:14px;">
            <form id="homeSearchForm" class="searchBar">
              <input id="homeSearchInput" class="input" type="text" placeholder="Search landlord name or address…" autocomplete="off" />
              <button class="btn btn--primary" type="submit">Search</button>
            </form>
          </div>

          <div class="tileRow">
            <a class="tile" href="#/search">
              <span class="tile__label">Search</span>
              <span class="tiny">Find landlords & addresses</span>
            </a>
            <a class="tile" href="#/add">
              <span class="tile__label">Review</span>
              <span class="tiny">Add & rate in minutes</span>
            </a>
            <a class="tile" href="#/toolkit">
              <span class="tile__label">Rent</span>
              <span class="tiny">Tenant Toolkit</span>
            </a>
          </div>
        </div>
      </section>

      <section class="splitRow--banner" style="margin-top:16px;">
        ${homeHighlightsHTML(regionKey)}
        ${homeMapHTML(regionKey)}
      </section>
    </main>
  `);

  // Wire search
  const form = $("#homeSearchForm");
  const input = $("#homeSearchInput");
  form && form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input ? input.value : "";
    location.hash = `#/search?q=${encodeURIComponent(q || "")}`;
  });

  // Wire region buttons (re-render home so map + selector refresh)
  const regionHost = $(".splitRow--banner .homePaneCard:nth-child(2)"); // map card
  if (regionHost) {
    regionHost.id = "homeRegionHost";
    wireRegionSelector(regionHost, () => renderHome());
  }

  wireHomeCarousel();

  // Init map + pins
  const cfg = REGIONS[regionKey] || REGIONS.NYC;
  const el = $("#homeMap");
  const map = initLeafletMap(el, cfg.center, cfg.zoom);
  if (map) {
    const props = filterPropertiesByRegion(DB.properties, regionKey);
    props.forEach((p) => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
      const addr = formatAddress(p);
      const l = getLandlord(p.landlordId);
      const lName = l ? landlordDisplayName(l) : "Landlord";
      const link = `#/property/${p.id}`;
      try {
        window.L.marker([p.lat, p.lng]).addTo(map).bindPopup(`
          <div style="font-weight:900;">${esc(addr)}</div>
          <div class="tiny">${esc(lName)}</div>
          <div style="margin-top:8px;"><a href="${link}">View</a></div>
        `);
      } catch {}
    });
  }
}

/* -----------------------------
   Search Page (split 50/50: landlords vs addresses)
------------------------------ */
function getQueryParam(name) {
  try {
    const h = location.hash || "";
    const qs = h.split("?")[1] || "";
    const params = new URLSearchParams(qs);
    return params.get(name);
  } catch {
    return null;
  }
}

function renderSearch() {
  setPageTitle("Search");
  const regionKey = getRegionKey();
  const q = getQueryParam("q") || "";

  const results = searchAll(q, regionKey);

  const landlordsHTML = results.landlords.map((l) => {
    const revs = reviewsFor("landlord", l.id);
    const avg = weightedAverageStars(revs);
    const tint = ratingClassFromAvg(avg);

    return `
      <div class="card ${tint}" style="margin-top:12px;">
        <div class="pad">
          <div class="kicker">Landlord</div>
          <div class="pageTitle" style="margin-top:6px;">${esc(l.name)}</div>
          ${l.entity ? `<div class="tiny" style="margin-top:4px;">${esc(l.entity)}</div>` : ""}
          <div style="margin-top:10px;">${starsToHTML(avg)}</div>
          ${landlordBadgesHTML(l)}
          <div class="tiny" style="margin-top:10px;">${revs.length} review${revs.length === 1 ? "" : "s"}</div>
          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/landlord/${esc(l.id)}">View</a>
            <a class="btn" href="#/add?landlord=${encodeURIComponent(l.id)}">Review</a>
          </div>
        </div>
      </div>
    `.trim();
  }).join("");

  const propertiesHTML = results.properties.map((p) => {
    const revs = reviewsFor("property", p.id);
    const avg = weightedAverageStars(revs);
    const tint = ratingClassFromAvg(avg);
    const l = getLandlord(p.landlordId);

    return `
      <div class="card ${tint}" style="margin-top:12px;">
        <div class="pad">
          <div class="kicker">Address</div>
          <div class="pageTitle" style="margin-top:6px;">${esc(formatAddress(p))}</div>
          <div class="tiny" style="margin-top:4px;">${l ? esc(landlordDisplayName(l)) : ""}</div>
          <div style="margin-top:10px;">${starsToHTML(avg)}</div>
          <div class="tiny" style="margin-top:10px;">${revs.length} review${revs.length === 1 ? "" : "s"}</div>
          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/property/${esc(p.id)}">View</a>
            <a class="btn" href="#/add?property=${encodeURIComponent(p.id)}">Review</a>
          </div>
        </div>
      </div>
    `.trim();
  }).join("");

  renderShell(`
    ${topNavHTML("search")}
    <main class="main">
      <section class="pageCard card">
        <div class="pad">
          <div class="pageTitle">Search</div>
          <div class="pageSub">Results show both landlords and addresses side-by-side.</div>

          <div style="margin-top:12px;">${regionSelectorHTML(regionKey)}</div>

          <div style="margin-top:14px;">
            <form id="searchForm" class="searchBar">
              <input id="searchInput" class="input" type="text" placeholder="Search landlord name or address…" autocomplete="off" value="${esc(q)}"/>
              <button class="btn btn--primary" type="submit">Search</button>
            </form>
          </div>

          <div class="hr"></div>

          <section class="splitRow--banner" style="margin-top:12px;">
            <div class="homePaneCard card">
              <div class="pad">
                <div class="kicker">Landlords</div>
                <div class="tiny" style="margin-top:6px;">${results.landlords.length} result${results.landlords.length === 1 ? "" : "s"}</div>
                ${landlordsHTML || `<div class="tiny" style="margin-top:12px;">No landlords found.</div>`}
              </div>
            </div>

            <div class="homePaneCard card">
              <div class="pad">
                <div class="kicker">Addresses</div>
                <div class="tiny" style="margin-top:6px;">${results.properties.length} result${results.properties.length === 1 ? "" : "s"}</div>
                ${propertiesHTML || `<div class="tiny" style="margin-top:12px;">No addresses found.</div>`}

                <div class="hr"></div>

                <div class="kicker">Map</div>
                <div class="tiny" style="margin-top:6px;">Pins reflect the selected region.</div>
                <div style="margin-top:12px;">
                  <div id="searchMap"></div>
                  ${!leafletReady() ? `<div class="tiny" style="margin-top:8px;">Map requires Leaflet (optional).</div>` : ""}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  `);

  // Region selector wiring (re-render search with same q)
  const host = $(".pageCard");
  if (host) {
    host.id = "searchRegionHost";
    wireRegionSelector(host, () => {
      const curr = $("#searchInput") ? $("#searchInput").value : q;
      location.hash = `#/search?q=${encodeURIComponent(curr || "")}`;
    });
  }

  const form = $("#searchForm");
  const input = $("#searchInput");
  form && form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = input ? input.value : "";
    location.hash = `#/search?q=${encodeURIComponent(query || "")}`;
  });

  // Map
  const cfg = REGIONS[regionKey] || REGIONS.NYC;
  const map = initLeafletMap($("#searchMap"), cfg.center, cfg.zoom);
  if (map) {
    const props = filterPropertiesByRegion(DB.properties, regionKey);
    props.forEach((p) => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
      const addr = formatAddress(p);
      const l = getLandlord(p.landlordId);
      const lName = l ? landlordDisplayName(l) : "Landlord";
      const link = `#/property/${p.id}`;
      try {
        window.L.marker([p.lat, p.lng]).addTo(map).bindPopup(`
          <div style="font-weight:900;">${esc(addr)}</div>
          <div class="tiny">${esc(lName)}</div>
          <div style="margin-top:8px;"><a href="${link}">View</a></div>
        `);
      } catch {}
    });
  }
}

/* -----------------------------
   Add Page (NO borough; state auto-switches region)
------------------------------ */
function autoSwitchRegionFromState(state) {
  const k = regionFromState(state);
  if (k) setRegionKey(k);
}

function renderAdd() {
  setPageTitle("Add & Review");
  const regionKey = getRegionKey();

  const qpLandlord = getQueryParam("landlord");
  const qpProperty = getQueryParam("property");

  const prefillLandlord = qpLandlord ? getLandlord(qpLandlord) : null;
  const prefillProperty = qpProperty ? getProperty(qpProperty) : null;

  const lFromProperty = prefillProperty ? getLandlord(prefillProperty.landlordId) : null;
  const selectedLandlordId = prefillLandlord ? prefillLandlord.id : (lFromProperty ? lFromProperty.id : "");

  const landlordOptions = DB.landlords
    .slice()
    .sort((a, b) => norm(a.name).localeCompare(norm(b.name)))
    .map((l) => `<option value="${esc(l.id)}" ${l.id === selectedLandlordId ? "selected" : ""}>${esc(l.name)}</option>`)
    .join("");

  renderShell(`
    ${topNavHTML("add")}
    ${pageWrapHTML(
      "Add & Review",
      "No tenant account required. Add a landlord, add an address, and leave a review in minutes.",
      `
        <div style="margin-top:12px;">${regionSelectorHTML(regionKey)}</div>

        <div class="hr"></div>

        <div class="kicker">1) Choose landlord</div>
        <div style="margin-top:10px;">
          <label class="tiny">Existing landlord</label>
          <select id="addLandlordSelect" class="input" style="margin-top:6px;">
            <option value="">Select…</option>
            ${landlordOptions}
          </select>
        </div>

        <div style="margin-top:14px;" class="card">
          <div class="pad">
            <div class="kicker">Or add a new landlord</div>
            <div style="margin-top:10px; display:grid; gap:10px;">
              <input id="newLandlordName" class="input" type="text" placeholder="Landlord / Management company name" />
              <input id="newLandlordEntity" class="input" type="text" placeholder="Entity (optional)" />
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <label class="tiny" style="display:flex; align-items:center; gap:8px;">
                  <input id="newLandlordVerified" type="checkbox" /> Verified (demo)
                </label>
                <label class="tiny" style="display:flex; align-items:center; gap:8px;">
                  <input id="newLandlordTop" type="checkbox" /> Top landlord (demo)
                </label>
                <button id="addLandlordBtn" type="button" class="btn btn--primary">Add landlord</button>
              </div>
              <div class="tiny">Verification is landlord-portal controlled in production; this is demo-safe.</div>
            </div>
          </div>
        </div>

        <div class="hr"></div>

        <div class="kicker">2) Add an address</div>
        <div class="tiny" style="margin-top:6px;">Borough is removed. Use city + state.</div>

        <div style="margin-top:10px; display:grid; gap:10px;">
          <input id="addrLine1" class="input" type="text" placeholder="Street address (e.g., 123 Main St)" value="${prefillProperty ? esc(prefillProperty.address.line1) : ""}" />
          <input id="addrUnit" class="input" type="text" placeholder="Unit (optional)" value="${prefillProperty ? esc(prefillProperty.address.unit) : ""}" />
          <div style="display:grid; grid-template-columns: 1fr 120px; gap:10px;">
            <input id="addrCity" class="input" type="text" placeholder="City" value="${prefillProperty ? esc(prefillProperty.address.city) : ""}" />
            <input id="addrState" class="input" type="text" placeholder="State (NY/FL/CA/IL)" value="${prefillProperty ? esc(prefillProperty.address.state) : ""}" />
          </div>

          <div class="card" style="margin-top:6px;">
            <div class="pad">
              <div class="kicker">Map (optional)</div>
              <div class="tiny" style="margin-top:6px;">If Leaflet is present, we’ll pin the region center by default.</div>
              <div style="margin-top:12px;"><div id="addMap"></div></div>
              <div class="tiny" style="margin-top:8px;">(Lat/Lng saved automatically for demo properties.)</div>
            </div>
          </div>

          <button id="addPropertyBtn" type="button" class="btn btn--primary">Add address</button>
          <div id="addPropStatus" class="tiny"></div>
        </div>

        <div class="hr"></div>

        <div class="kicker">3) Leave a review</div>
        <div class="tiny" style="margin-top:6px;">Choose to review the landlord or the address.</div>

        <div style="margin-top:10px; display:grid; gap:10px;">
          <select id="reviewTargetType" class="input">
            <option value="landlord">Review landlord</option>
            <option value="property">Review address</option>
          </select>

          <select id="reviewTargetId" class="input"></select>

          <select id="reviewStars" class="input">
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★☆ (4)</option>
            <option value="3">★★★☆☆ (3)</option>
            <option value="2">★★☆☆☆ (2)</option>
            <option value="1">★☆☆☆☆ (1)</option>
          </select>

          <textarea id="reviewText" class="input" rows="4" placeholder="Write your review…"></textarea>

          <button id="submitReviewBtn" type="button" class="btn btn--primary">Submit review</button>
          <div id="reviewStatus" class="tiny"></div>
        </div>
      `
    )}
  `);

  // Region selector wiring
  const host = $(".pageCard");
  host && (host.id = "addRegionHost");
  wireRegionSelector(host, () => renderAdd());

  // Landlord select
  const sel = $("#addLandlordSelect");
  const btnAddL = $("#addLandlordBtn");
  const nlName = $("#newLandlordName");
  const nlEnt = $("#newLandlordEntity");
  const nlVer = $("#newLandlordVerified");
  const nlTop = $("#newLandlordTop");

  btnAddL && btnAddL.addEventListener("click", () => {
    const name = (nlName && nlName.value) ? nlName.value.trim() : "";
    if (!name) return toast("Enter a landlord name.");
    const entity = (nlEnt && nlEnt.value) ? nlEnt.value.trim() : "";

    const l = {
      id: idRand("l"),
      name,
      entity,
      verified: !!(nlVer && nlVer.checked),
      top: !!(nlTop && nlTop.checked),
      createdAt: Date.now(),
    };
    DB.landlords.push(l);
    persist();
    toast("Landlord added.");

    renderAdd(); // re-render to refresh selects
    location.hash = `#/add?landlord=${encodeURIComponent(l.id)}`;
  });

  // Address add
  const addPropBtn = $("#addPropertyBtn");
  addPropBtn && addPropBtn.addEventListener("click", () => {
    const landlordId = sel ? sel.value : selectedLandlordId;
    if (!landlordId) return toast("Select (or add) a landlord first.");

    const line1 = ($("#addrLine1") && $("#addrLine1").value) ? $("#addrLine1").value.trim() : "";
    const unit = ($("#addrUnit") && $("#addrUnit").value) ? $("#addrUnit").value.trim() : "";
    const city = ($("#addrCity") && $("#addrCity").value) ? $("#addrCity").value.trim() : "";
    const state = ($("#addrState") && $("#addrState").value) ? $("#addrState").value.trim().toUpperCase() : "";

    if (!line1 || !city || !state) return toast("Address, city, and state are required.");

    autoSwitchRegionFromState(state);

    const region = getRegionKey();
    const cfg = REGIONS[region] || REGIONS.NYC;

    const p = {
      id: idRand("p"),
      landlordId,
      address: { line1, unit, city, state },
      borough: "", // removed in UI; kept for backward compat
      lat: cfg.center[0],
      lng: cfg.center[1],
      createdAt: Date.now(),
    };
    DB.properties.push(p);
    persist();

    const st = $("#addPropStatus");
    if (st) st.textContent = "Address added.";
    toast("Address added.");

    renderAdd();
    location.hash = `#/add?property=${encodeURIComponent(p.id)}`;
  });

  // Review target selects
  const typeSel = $("#reviewTargetType");
  const targetSel = $("#reviewTargetId");

  function rebuildTargets() {
    if (!targetSel) return;

    const landlordId = (sel && sel.value) ? sel.value : selectedLandlordId;
    const type = typeSel ? typeSel.value : "landlord";

    if (type === "landlord") {
      const opts = DB.landlords
        .slice()
        .sort((a, b) => norm(a.name).localeCompare(norm(b.name)))
        .map((l) => `<option value="${esc(l.id)}" ${l.id === landlordId ? "selected" : ""}>${esc(l.name)}</option>`)
        .join("");
      targetSel.innerHTML = `<option value="">Select…</option>${opts}`;
      if (landlordId) targetSel.value = landlordId;
    } else {
      // property
      const props = landlordId ? propertiesForLandlord(landlordId) : filterPropertiesByRegion(DB.properties, getRegionKey());
      const opts = props
        .slice()
        .sort((a, b) => norm(formatAddress(a)).localeCompare(norm(formatAddress(b))))
        .map((p) => `<option value="${esc(p.id)}">${esc(formatAddress(p))}</option>`)
        .join("");
      targetSel.innerHTML = `<option value="">Select…</option>${opts}`;
      if (prefillProperty) targetSel.value = prefillProperty.id;
    }
  }

  typeSel && typeSel.addEventListener("change", rebuildTargets);
  sel && sel.addEventListener("change", rebuildTargets);
  rebuildTargets();

  // Submit review
  const submitBtn = $("#submitReviewBtn");
  submitBtn && submitBtn.addEventListener("click", () => {
    const type = typeSel ? typeSel.value : "landlord";
    const targetId = targetSel ? targetSel.value : "";
    const stars = Number($("#reviewStars") ? $("#reviewStars").value : 5);
    const text = ($("#reviewText") && $("#reviewText").value) ? $("#reviewText").value.trim() : "";

    if (!targetId) return toast("Select what you’re reviewing.");
    if (!text) return toast("Write a short review.");

    const r = {
      id: idRand("r"),
      targetType: type === "property" ? "property" : "landlord",
      targetId,
      stars: Math.max(1, Math.min(5, stars)),
      text,
      createdAt: Date.now(),
    };
    DB.reviews.push(r);
    persist();

    const st = $("#reviewStatus");
    if (st) st.textContent = "Review submitted.";
    toast("Review submitted.");

    // Navigate to the reviewed page
    location.hash = type === "property" ? `#/property/${encodeURIComponent(targetId)}` : `#/landlord/${encodeURIComponent(targetId)}`;
  });

  // Map
  const cfg = REGIONS[getRegionKey()] || REGIONS.NYC;
  const map = initLeafletMap($("#addMap"), cfg.center, cfg.zoom);
  if (map) {
    try {
      window.L.circleMarker(cfg.center, { radius: 8 }).addTo(map).bindPopup("Region center (demo).");
    } catch {}
  }

  // Auto-switch region if prefill property has a state
  if (prefillProperty && prefillProperty.address && prefillProperty.address.state) {
    autoSwitchRegionFromState(prefillProperty.address.state);
  }
}

/* -----------------------------
   Landlord Page (supports multiple properties)
------------------------------ */
function renderLandlord(landlordId) {
  const l = getLandlord(landlordId);
  if (!l) {
    setPageTitle("Landlord");
    renderShell(`${topNavHTML("")}${pageWrapHTML("Not found", "That landlord doesn’t exist.", `<a class="btn btn--primary" href="#/search">Back to search</a>`)}`);
    return;
  }

  setPageTitle(l.name);

  const revs = reviewsFor("landlord", l.id);
  const avg = weightedAverageStars(revs);
  const tint = ratingClassFromAvg(avg);

  const props = propertiesForLandlord(l.id);
  const propsHTML = props.length
    ? props.map((p) => {
        const pr = reviewsFor("property", p.id);
        const pav = weightedAverageStars(pr);
        const ptint = ratingClassFromAvg(pav);
        return `
          <div class="card ${ptint}" style="margin-top:12px;">
            <div class="pad">
              <div class="kicker">Address</div>
              <div class="pageTitle" style="margin-top:6px;">${esc(formatAddress(p))}</div>
              <div style="margin-top:10px;">${starsToHTML(pav)}</div>
              <div class="tiny" style="margin-top:10px;">${pr.length} review${pr.length === 1 ? "" : "s"}</div>
              <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <a class="btn btn--primary" href="#/property/${esc(p.id)}">View</a>
                <a class="btn" href="#/add?property=${encodeURIComponent(p.id)}">Review</a>
              </div>
            </div>
          </div>
        `.trim();
      }).join("")
    : `<div class="tiny" style="margin-top:10px;">No addresses have been added for this landlord yet.</div>`;

  const reviewsHTML = revs.length
    ? revs.map((r) => `
        <div class="card" style="margin-top:12px;">
          <div class="pad">
            <div>${starsToHTML(Number(r.stars))}</div>
            <div class="smallNote" style="margin-top:10px;">${esc(r.text)}</div>
            <div class="tiny" style="margin-top:10px;">${fmtDate(r.createdAt)}</div>
          </div>
        </div>
      `.trim()).join("")
    : `<div class="tiny" style="margin-top:10px;">No reviews yet. Be the first.</div>`;

  renderShell(`
    ${topNavHTML("")}
    <main class="main">
      <section class="pageCard card ${tint}">
        <div class="pad">
          <div class="kicker">Landlord</div>
          <div class="pageTitle" style="margin-top:6px;">${esc(landlordDisplayName(l) || l.name)}</div>
          <div style="margin-top:10px;">${starsToHTML(avg)}</div>
          ${landlordBadgesHTML(l)}
          <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/add?landlord=${encodeURIComponent(l.id)}">Review landlord</a>
            <a class="btn" href="#/add?landlord=${encodeURIComponent(l.id)}">Add address</a>
            <button class="btn" id="copyLandlordBtn" type="button">Copy link</button>
          </div>
        </div>
      </section>

      <section class="splitRow--banner" style="margin-top:16px;">
        <div class="homePaneCard card">
          <div class="pad">
            <div class="kicker">Addresses</div>
            <div class="tiny" style="margin-top:6px;">This landlord can have multiple properties.</div>
            ${propsHTML}
          </div>
        </div>

        <div class="homePaneCard card">
          <div class="pad">
            <div class="kicker">Reviews</div>
            <div class="tiny" style="margin-top:6px;">${revs.length} review${revs.length === 1 ? "" : "s"}</div>
            ${reviewsHTML}
          </div>
        </div>
      </section>
    </main>
  `);

  const copyBtn = $("#copyLandlordBtn");
  copyBtn && copyBtn.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#/landlord/${l.id}`;
    const ok = await safeCopy(url);
    toast(ok ? "Link copied." : "Could not copy.");
  });
}

/* -----------------------------
   Property Page (address-focused)
------------------------------ */
function renderProperty(propertyId) {
  const p = getProperty(propertyId);
  if (!p) {
    setPageTitle("Property");
    renderShell(`${topNavHTML("")}${pageWrapHTML("Not found", "That address doesn’t exist.", `<a class="btn btn--primary" href="#/search">Back to search</a>`)}`);
    return;
  }

  // Auto switch region based on state so ALL maps follow it
  if (p.address && p.address.state) autoSwitchRegionFromState(p.address.state);

  const l = getLandlord(p.landlordId);
  setPageTitle("Address");

  const revs = reviewsFor("property", p.id);
  const avg = weightedAverageStars(revs);
  const tint = ratingClassFromAvg(avg);

  renderShell(`
    ${topNavHTML("")}
    <main class="main">
      <section class="pageCard card ${tint}">
        <div class="pad">
          <div class="kicker">Address</div>
          <div class="pageTitle" style="margin-top:6px;">${esc(formatAddress(p))}</div>
          <div class="tiny" style="margin-top:6px;">${l ? esc(landlordDisplayName(l)) : ""}</div>
          <div style="margin-top:10px;">${starsToHTML(avg)}</div>

          <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/add?property=${encodeURIComponent(p.id)}">Review address</a>
            ${l ? `<a class="btn" href="#/landlord/${encodeURIComponent(l.id)}">View landlord</a>` : ""}
            <button class="btn" id="copyPropBtn" type="button">Copy link</button>
          </div>
        </div>
      </section>

      <section class="splitRow--banner" style="margin-top:16px;">
        <div class="homePaneCard card">
          <div class="pad">
            <div class="kicker">Map</div>
            <div class="tiny" style="margin-top:6px;">Region follows the address state.</div>
            <div style="margin-top:12px;">
              <div id="propMap"></div>
              ${!leafletReady() ? `<div class="tiny" style="margin-top:8px;">Map requires Leaflet (optional).</div>` : ""}
            </div>
          </div>
        </div>

        <div class="homePaneCard card">
          <div class="pad">
            <div class="kicker">Reviews</div>
            <div class="tiny" style="margin-top:6px;">${revs.length} review${revs.length === 1 ? "" : "s"}</div>

            ${revs.length ? revs.map((r) => `
              <div class="card" style="margin-top:12px;">
                <div class="pad">
                  <div>${starsToHTML(Number(r.stars))}</div>
                  <div class="smallNote" style="margin-top:10px;">${esc(r.text)}</div>
                  <div class="tiny" style="margin-top:10px;">${fmtDate(r.createdAt)}</div>
                </div>
              </div>
            `.trim()).join("") : `<div class="tiny" style="margin-top:10px;">No reviews yet. Be the first.</div>`}
          </div>
        </div>
      </section>
    </main>
  `);

  const copyBtn = $("#copyPropBtn");
  copyBtn && copyBtn.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#/property/${p.id}`;
    const ok = await safeCopy(url);
    toast(ok ? "Link copied." : "Could not copy.");
  });

  // Map
  const regionKey = getRegionKey();
  const cfg = REGIONS[regionKey] || REGIONS.NYC;

  const center = (typeof p.lat === "number" && typeof p.lng === "number") ? [p.lat, p.lng] : cfg.center;
  const map = initLeafletMap($("#propMap"), center, cfg.zoom);
  if (map && typeof p.lat === "number" && typeof p.lng === "number") {
    try {
      window.L.marker([p.lat, p.lng]).addTo(map).bindPopup(esc(formatAddress(p)));
      setTimeout(() => { try { map.setView([p.lat, p.lng], Math.max(cfg.zoom, 13)); } catch {} }, 50);
    } catch {}
  }
}

/* -----------------------------
   How It Works
------------------------------ */
function renderHow() {
  setPageTitle("How It Works");
  renderShell(`
    ${topNavHTML("how")}
    ${pageWrapHTML(
      "How It Works",
      "CASA helps renters make better decisions—fast.",
      `
        <div class="hr"></div>
        <div class="kicker">Step 1</div>
        <div class="pageTitle" style="margin-top:6px;">Search</div>
        <div class="pageSub" style="margin-top:8px;">Look up a landlord or address and see reviews and ratings.</div>

        <div class="hr"></div>
        <div class="kicker">Step 2</div>
        <div class="pageTitle" style="margin-top:6px;">Review</div>
        <div class="pageSub" style="margin-top:8px;">Add a landlord or address and leave a review—no tenant login required.</div>

        <div class="hr"></div>
        <div class="kicker">Step 3</div>
        <div class="pageTitle" style="margin-top:6px;">Improve</div>
        <div class="pageSub" style="margin-top:8px;">Reward good behavior and flag patterns. Landlords can respond via the Landlord Portal.</div>

        <div class="hr"></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn--primary" href="#/search">Search</a>
          <a class="btn" href="#/add">Add & Review</a>
          <a class="btn" href="#/portal">Landlord Portal</a>
        </div>
      `
    )}
  `);
}

/* -----------------------------
   Trust & Safety
------------------------------ */
function renderTrust() {
  setPageTitle("Trust & Safety");
  renderShell(`
    ${topNavHTML("trust")}
    ${pageWrapHTML(
      "Trust & Safety",
      "Premium, calm, and trustworthy—by design.",
      `
        <div class="hr"></div>

        <div class="kicker">Verified Landlords</div>
        <div class="pageSub" style="margin-top:8px;">
          Only landlords can create accounts in the Landlord Portal, and verification requires documentation.
          (Demo shows badges without enforcing uploads.)
        </div>

        <div class="hr"></div>

        <div class="kicker">No Tenant Accounts Required</div>
        <div class="pageSub" style="margin-top:8px;">
          Tenants can search, add, and review without creating an account.
        </div>

        <div class="hr"></div>

        <div class="kicker">Anti-Abuse</div>
        <div class="pageSub" style="margin-top:8px;">
          In production: rate-limits, suspicious-pattern detection, and moderation tools.
        </div>

        <div class="hr"></div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn--primary" href="#/add">Leave a review</a>
          <a class="btn" href="#/search">Search</a>
        </div>
      `
    )}
  `);
}

/* -----------------------------
   Tenant Toolkit
------------------------------ */
function renderToolkit() {
  setPageTitle("Tenant Toolkit");
  renderShell(`
    ${topNavHTML("toolkit")}
    ${pageWrapHTML(
      "Tenant Toolkit",
      "Quick resources to help you rent smarter.",
      `
        <div class="hr"></div>

        <div class="card">
          <div class="pad">
            <div class="kicker">Before you sign</div>
            <ul class="list">
              <li>Ask how maintenance requests are handled (time + method).</li>
              <li>Confirm heat/hot water policies and who pays utilities.</li>
              <li>Document unit condition with photos on move-in day.</li>
            </ul>
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <div class="pad">
            <div class="kicker">During the lease</div>
            <ul class="list">
              <li>Keep a paper trail for requests (email/text).</li>
              <li>Save receipts for self-funded repairs (if any).</li>
              <li>Know your local reporting channels (311 / city portals).</li>
            </ul>
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <div class="pad">
            <div class="kicker">Move-out</div>
            <ul class="list">
              <li>Take timestamped photos and do a final walk-through.</li>
              <li>Request a written itemization for any deposit deductions.</li>
              <li>Leave a review to help the next renter.</li>
            </ul>
          </div>
        </div>

        <div class="hr"></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn--primary" href="#/search">Search</a>
          <a class="btn" href="#/add">Review</a>
        </div>
      `
    )}
  `);
}

/* -----------------------------
   Landlord Portal (login + sign up + SSO buttons)
------------------------------ */
function renderPortal() {
  setPageTitle("Landlord Portal");
  renderShell(`
    ${topNavHTML("portal")}
    ${pageWrapHTML(
      "Landlord Portal",
      "Landlords only. Verification required (demo-safe).",
      `
        <div class="hr"></div>

        <section class="splitRow--banner" style="margin-top:12px;">
          <div class="homePaneCard card">
            <div class="pad">
              <div class="kicker">Login</div>
              <div style="margin-top:10px; display:grid; gap:10px;">
                <input id="portalEmail" class="input" type="email" placeholder="Email" autocomplete="email" />
                <input id="portalPass" class="input" type="password" placeholder="Password" autocomplete="current-password" />
                <button id="portalLoginBtn" class="btn btn--primary" type="button">Login</button>
                <div class="tiny" id="portalLoginStatus"></div>
              </div>

              <div class="hr"></div>

              <div class="kicker">Continue with</div>
              <div style="margin-top:10px; display:grid; gap:10px;">
                <button class="btn" type="button" data-sso="apple">Continue with Apple</button>
                <button class="btn" type="button" data-sso="google">Continue with Google</button>
                <button class="btn" type="button" data-sso="microsoft">Continue with Microsoft</button>
              </div>

              <div class="tiny" style="margin-top:10px;">SSO buttons are demo-safe placeholders.</div>
            </div>
          </div>

          <div class="homePaneCard card">
            <div class="pad">
              <div class="kicker">Sign up</div>
              <div class="pageSub" style="margin-top:6px;">Create a landlord account and submit verification documents.</div>

              <div style="margin-top:10px; display:grid; gap:10px;">
                <input id="portalSignupName" class="input" type="text" placeholder="Legal name / entity" />
                <input id="portalSignupEmail" class="input" type="email" placeholder="Email" autocomplete="email" />
                <input id="portalSignupPass" class="input" type="password" placeholder="Password" autocomplete="new-password" />

                <div class="card">
                  <div class="pad">
                    <div class="kicker">Verification (demo)</div>
                    <div class="tiny" style="margin-top:6px;">Upload is not enforced in the demo. In production: deed/management agreement, ID, etc.</div>
                    <input id="portalDocs" class="input" type="file" multiple style="margin-top:10px;" />
                  </div>
                </div>

                <button id="portalSignupBtn" class="btn btn--primary" type="button">Create account</button>
                <div class="tiny" id="portalSignupStatus"></div>
              </div>
            </div>
          </div>
        </section>
      `
    )}
  `);

  // Demo handlers (no promises thrown)
  const loginBtn = $("#portalLoginBtn");
  const loginStatus = $("#portalLoginStatus");
  loginBtn && loginBtn.addEventListener("click", () => {
    if (loginStatus) loginStatus.textContent = "Demo: logged in (no backend).";
    toast("Demo login.");
  });

  const signupBtn = $("#portalSignupBtn");
  const signupStatus = $("#portalSignupStatus");
  signupBtn && signupBtn.addEventListener("click", () => {
    if (signupStatus) signupStatus.textContent = "Demo: account created (verification pending).";
    toast("Demo sign up.");
  });

  $$("[data-sso]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const provider = btn.getAttribute("data-sso");
      toast(`Demo SSO: ${provider}`);
    });
  });
}

/* -----------------------------
   End
------------------------------ */
