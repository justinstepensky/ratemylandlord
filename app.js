           /* CASA — single-file SPA app.js (DROP-IN REPLACEMENT)
   Keeps your current aesthetic/classes — only fixes + adds:

   ✅ App loads (no syntax errors)
   ✅ Landlord badges show (assets/badge-verified.png + assets/badge-top.png)
   ✅ Landlord page: ONE "More options" button (dropdown)
      - Dropdown item: Get casa badge embed (casa in brand font)
   ✅ Embed modal: preview + HTML on SAME screen
      - "Copy embed" copies directly to clipboard (no forced textarea copy)
   ✅ Embed badge shows fractional stars (e.g., 3.4 fills 0.4 of a star)
   ✅ Recent highlights carousel (dots only, max 5)
   ✅ Mobile drawer works
   ✅ Safety net overlay if runtime error
*/

/* -----------------------------
   Global hardening + Debug
------------------------------ */
(function installSafetyNet() {
  const showOverlayError = (title, err) => {
    try {
      console.error(title, err);
      const el = document.getElementById("app");
      if (!el) return;

      el.innerHTML = `
        <section class="pageCard card">
          <div class="pad">
            <div class="kicker">CASA</div>
            <div class="pageTitle" style="margin-top:6px;">Something went wrong</div>
            <div class="pageSub" style="margin-top:8px;">
              The app hit an error and stopped rendering.
            </div>
            <div class="hr"></div>
            <div class="smallNote" style="white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
${String(title || "Error")}
${String(err && (err.stack || err.message) ? (err.stack || err.message) : err)}
            </div>
            <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
              <a class="btn btn--primary" href="#/">Go Home</a>
              <button class="btn" id="reloadBtn">Reload</button>
              <button class="btn" id="resetBtn">Reset demo data</button>
            </div>
            <div class="tiny" style="margin-top:10px;">
              Tip: open DevTools → Console to see the full error log.
            </div>
          </div>
        </section>
      `;
      document.getElementById("reloadBtn")?.addEventListener("click", () => location.reload());
      document.getElementById("resetBtn")?.addEventListener("click", () => {
        try {
          localStorage.removeItem("casa_demo_v1");
          location.reload();
        } catch {}
      });
    } catch {}
  };

  window.addEventListener("error", (e) => showOverlayError("Uncaught error", e?.error || e?.message || e));
  window.addEventListener("unhandledrejection", (e) => showOverlayError("Unhandled promise rejection", e?.reason || e));
})();

/* -----------------------------
   Storage / Demo seed
------------------------------ */
const LS_KEY = "casa_demo_v1";

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedDB();
}
function saveDB(db) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch {}
}

function seedDB() {
  const db = {
    landlords: [
      {
        id: "l1",
        name: "Northside Properties",
        entity: "",
        address: { line1: "123 Main St", unit: "", city: "Brooklyn", state: "NY" },
        borough: "Brooklyn",
        lat: 40.7081,
        lng: -73.9571,
        verified: true,
        top: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 16,
      },
      {
        id: "l2",
        name: "Park Ave Management",
        entity: "Park Ave Management LLC",
        address: { line1: "22 Park Ave", unit: "", city: "New York", state: "NY" },
        borough: "Manhattan",
        lat: 40.7433,
        lng: -73.9822,
        verified: false,
        top: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 28,
      },
      {
        id: "l3",
        name: "Elmhurst Holdings",
        entity: "",
        address: { line1: "86-12 Broadway", unit: "", city: "Queens", state: "NY" },
        borough: "Queens",
        lat: 40.7404,
        lng: -73.8794,
        verified: true,
        top: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 35,
      }
    ],
    reviews: [
      { id: "r1", landlordId: "l1", stars: 4, text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 11 },
      { id: "r2", landlordId: "l2", stars: 3, text: "Great location, but communication was slow. Security deposit itemization took weeks.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45 },
      { id: "r3", landlordId: "l3", stars: 5, text: "Responsive management. Clear lease terms and quick repairs.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6 },
      { id: "r4", landlordId: "l3", stars: 5, text: "Fast maintenance and respectful staff.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18 },
      { id: "r5", landlordId: "l3", stars: 4, text: "Solid experience overall; minor delays during holidays.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 58 }
    ],
    reports: [
      { landlordId: "l1", updatedAt: Date.now() - 1000*60*60*24*2, violations_12mo: 7, complaints_12mo: 22, bedbug_reports_12mo: 1, hp_actions: 0, permits_open: 2, eviction_filings_12mo: 1, notes: "Data is demo only. Production: pull from city datasets + add sources." },
      { landlordId: "l2", updatedAt: Date.now() - 1000*60*60*24*4, violations_12mo: 18, complaints_12mo: 49, bedbug_reports_12mo: 3, hp_actions: 1, permits_open: 4, eviction_filings_12mo: 6, notes: "Data is demo only. Production: pull from city datasets + add sources." },
      { landlordId: "l3", updatedAt: Date.now() - 1000*60*60*24*1, violations_12mo: 2, complaints_12mo: 9, bedbug_reports_12mo: 0, hp_actions: 0, permits_open: 1, eviction_filings_12mo: 0, notes: "Data is demo only. Production: pull from city datasets + add sources." }
    ],
    flags: [],
    replies: []
  };
  saveDB(db);
  return db;
}

let DB = loadDB();

/* -----------------------------
   Helpers
------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}
function round1(n) { return Math.round(n * 10) / 10; }
function norm(s) { return String(s || "").trim().toLowerCase(); }

function landlordHaystack(l) {
  return norm(`${l.name} ${l.entity || ""} ${l.address?.line1 || ""} ${l.address?.city || ""} ${l.address?.state || ""}`);
}
function findExactLandlord(query) {
  const q = norm(query);
  if (!q) return null;
  const exact = DB.landlords.filter(l => norm(l.name) === q || norm(l.entity) === q);
  if (exact.length === 1) return exact[0];
  return null;
}

/* Recency-weighted average (half-life 180 days) */
function weightedAverageStars(reviews) {
  if (!reviews.length) return null;
  const now = Date.now();
  const halfLifeDays = 180;
  let num = 0, den = 0;
  for (const r of reviews) {
    const ageDays = Math.max(0, (now - r.createdAt) / (1000*60*60*24));
    const w = Math.pow(0.5, ageDays / halfLifeDays);
    num += r.stars * w;
    den += w;
  }
  if (!den) return null;
  return num / den;
}

function landlordReviews(landlordId) {
  return DB.reviews.filter(r => r.landlordId === landlordId).sort((a,b)=>b.createdAt-a.createdAt);
}
function ratingStats(landlordId) {
  const rs = landlordReviews(landlordId);
  const count = rs.length;
  if (count === 0) return { count: 0, avg: null, avgRounded: null, dist: [0,0,0,0,0] };
  const avg = weightedAverageStars(rs);
  const avgRounded = round1(avg);
  const dist = [0,0,0,0,0];
  for (const r of rs) dist[r.stars - 1] += 1;
  return { count, avg, avgRounded, dist };
}
function cardTier(avgRounded, reviewCount) {
  if (!reviewCount) return { tier: "none", label: "Unrated", pillClass: "" };
  const r = avgRounded;
  if (r >= 1.0 && r <= 2.99) return { tier: "red", label: "Low Rating", pillClass: "pill--red" };
  if (r > 2.99 && r <= 3.99) return { tier: "yellow", label: "Mixed Reviews", pillClass: "pill--yellow" };
  if (r >= 4.0 && r <= 5.0) return { tier: "green", label: "Highly Rated", pillClass: "pill--green" };
  return { tier: "none", label: "Unrated", pillClass: "" };
}
function casaCredential(landlordId) {
  const rs = landlordReviews(landlordId);
  const now = Date.now();
  const last12mo = rs.filter(r => (now - r.createdAt) <= 365*24*60*60*1000);
  const total = rs.length;
  const in12 = last12mo.length;
  if (total === 0) return "Unrated";
  if (!(total >= 10 && in12 >= 3)) return "Not yet CASA Rated — needs more reviews";
  return "CASA Rated";
}

/* Badges */
function badgesHTML(l) {
  const parts = [];
  if (l.verified) parts.push(`<img class="badgeImg" src="assets/badge-verified.png" alt="Verified" title="Verified Landlord (ownership verified)"/>`);
  if (l.top) parts.push(`<img class="badgeImg" src="assets/badge-top.png" alt="Top" title="Top Landlord (high rating + consistent performance)"/>`);
  if (!parts.length) return "";
  return `<span class="badges">${parts.join("")}</span>`;
}

/* Brand font (matches header) */
function casaBrandFontInlineCSS() {
  return [
    "font-family: ui-serif, Georgia, 'Times New Roman', Times, serif",
    "font-style: italic",
    "font-weight: 650",
    "letter-spacing: -0.02em",
    "text-transform: lowercase"
  ].join("; ");
}

/* -----------------------------
   Embed snippet (with fractional stars)
------------------------------ */
function casaEmbedSnippetForLandlord(l) {
  const st = ratingStats(l.id);
  const avg = st.count ? Number(st.avg || 0) : 0;
  const avgClamped = Math.max(0, Math.min(5, avg));
  const avgText = st.count ? avgClamped.toFixed(1) : "0.0";

  const siteBase = "https://justinstepensky.github.io/ratemylandlord/";
  const profileURL = `${siteBase}#/landlord/${encodeURIComponent(l.id)}`;

  const brandCSS = casaBrandFontInlineCSS();

  function starRowSVG(value, px = 16, gap = 4) {
    const v = Math.max(0, Math.min(5, Number(value) || 0));
    const full = Math.floor(v);
    const frac = v - full;

    const starPath = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
    const scale = px / 24;
    const step = px + gap;
    const width = (px * 5) + (gap * 4);

    const stars = [];
    for (let i = 0; i < 5; i++) {
      let fillPct = 0;
      if (i < full) fillPct = 1;
      else if (i === full) fillPct = frac;

      const gid = `casaStarGrad_${Math.random().toString(16).slice(2)}_${i}`;
      const x = i * step;

      stars.push(`
        <g transform="translate(${x},0) scale(${scale})">
          <defs>
            <linearGradient id="${gid}" x1="0" y1="0" x2="24" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="${(fillPct * 100).toFixed(2)}%" stop-color="#b88900" stop-opacity="1"/>
              <stop offset="${(fillPct * 100).toFixed(2)}%" stop-color="#15110e" stop-opacity="0.22"/>
            </linearGradient>
          </defs>
          <path d="${starPath}" fill="url(#${gid})"></path>
        </g>
      `.trim());
    }

    return `
      <svg width="${width}" height="${px}"
           viewBox="0 0 ${width} ${px}"
           xmlns="http://www.w3.org/2000/svg"
           aria-hidden="true"
           style="display:inline-block; vertical-align:middle;">
        ${stars.join("")}
      </svg>
    `.trim();
  }

  const starsSVG = starRowSVG(avgClamped, 16, 4);

  return `
<a href="${profileURL}" target="_blank" rel="noopener noreferrer"
   style="
     display:inline-flex;
     align-items:center;
     gap:10px;
     padding:10px 14px;
     border-radius:999px;
     border:1px solid rgba(20,16,12,.14);
     background: rgba(255,255,255,.65);
     text-decoration:none;
     color: rgba(21,17,14,.9);
     box-shadow: 0 10px 26px rgba(20,16,12,.06);
     line-height:1;
     white-space:nowrap;
   ">
  <span style="${brandCSS}; font-size:14px; display:inline-flex; align-items:baseline; white-space:nowrap;">
    <span>Rated on&nbsp;</span><span style="${brandCSS};">casa</span>
  </span>

  <span style="
     font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
     font-weight: 900;
     font-size:13px;
     color: rgba(21,17,14,.72);
     display:inline-flex;
     align-items:center;
     white-space:nowrap;
   ">
    <span style="margin-right:8px;">•</span>
    ${starsSVG}
    <span style="margin-left:8px;">${avgText}/5</span>
  </span>
</a>`.trim();
}

/* Reports */
function reportFor(landlordId) {
  return (DB.reports || []).find(r => r.landlordId === landlordId) || null;
}

/* SEO title */
function setPageTitle(title) {
  try { document.title = title ? `${title} • casa` : "casa"; } catch {}
}

/* -----------------------------
   Dropdown helpers
------------------------------ */
function closeInlineDropdown() {
  const dd = document.getElementById("moreDropdown");
  const btn = document.getElementById("moreBtn");
  if (!dd || !btn) return;
  dd.style.display = "none";
  btn.setAttribute("aria-expanded", "false");
}
function toggleInlineDropdown() {
  const dd = document.getElementById("moreDropdown");
  const btn = document.getElementById("moreBtn");
  if (!dd || !btn) return;
  const isOpen = dd.style.display === "block";
  if (isOpen) closeInlineDropdown();
  else {
    dd.style.display = "block";
    btn.setAttribute("aria-expanded", "true");
  }
}

/* -----------------------------
   Drawer (mobile)
------------------------------ */
function initDrawer() {
  const btn = $("#menuBtn");
  const drawer = $("#drawer");
  const overlay = $("#drawerOverlay");
  const closeBtn = $("#drawerClose");

  if (!btn || !drawer || !overlay || !closeBtn) return;

  function open() {
    drawer.classList.add("isOpen");
    overlay.classList.add("isOpen");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
  }
  function close() {
    drawer.classList.remove("isOpen");
    overlay.classList.remove("isOpen");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
  }

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  drawer.addEventListener("click", (e) => {
    const a = e.target.closest("[data-drawer-link]");
    if (a) close();
  });
  window.addEventListener("resize", () => { if (window.innerWidth >= 981) close(); });
}

/* -----------------------------
   Modal
------------------------------ */
function openModal(innerHTML) {
  const overlay = $("#modalOverlay");
  if (!overlay) return;

  overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${innerHTML}</div>`;
  overlay.classList.add("isOpen");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const handler = (e) => { if (e.target === overlay) closeModal(); };
  overlay.addEventListener("click", handler, { once: true });
}
function closeModal() {
  const overlay = $("#modalOverlay");
  if (!overlay) return;
  overlay.classList.remove("isOpen");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = "";
  document.body.style.overflow = "";
}

/* Embed modal (ONE screen) */
function openBadgeEmbedModal(landlordId) {
  const l = DB.landlords.find(x => x.id === landlordId);
  if (!l) return;

  const snippet = casaEmbedSnippetForLandlord(l);

  openModal(`
    <div class="modalHead">
      <div class="modalTitle">CASA badge embed</div>
      <button class="iconBtn" id="mClose" aria-label="Close">×</button>
    </div>

    <div class="modalBody">
      <div class="tiny" style="margin-bottom:12px;">
        Copy/paste this into a website or listing description. It links to your CASA profile.
      </div>

      <div class="field">
        <label>Preview</label>
        <div class="card" style="box-shadow:none;">
          <div class="pad" id="embedPreview"></div>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
        <button class="btn btn--primary" id="copyEmbed">Copy embed</button>
        <button class="btn" id="toggleHTML">Show HTML</button>
      </div>

      <div class="field" id="htmlWrap" style="display:none;">
        <label>HTML snippet</label>
        <textarea class="textarea" id="embedBox" spellcheck="false" readonly></textarea>
      </div>
    </div>

    <div class="modalFoot">
      <button class="btn" id="mDone">Close</button>
    </div>
  `);

  $("#mClose")?.addEventListener("click", closeModal);
  $("#mDone")?.addEventListener("click", closeModal);

  const prev = $("#embedPreview");
  if (prev) prev.innerHTML = snippet;

  const box = $("#embedBox");
  if (box) box.value = snippet;

  $("#copyEmbed")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      alert("Copied embed HTML!");
    } catch {
      try {
        box?.focus?.();
        box?.select?.();
        document.execCommand("copy");
        alert("Copied embed HTML!");
      } catch {
        alert("Copy failed.");
      }
    }
  });

  $("#toggleHTML")?.addEventListener("click", () => {
    const wrap = $("#htmlWrap");
    const btn = $("#toggleHTML");
    if (!wrap || !btn) return;
    const shown = wrap.style.display !== "none";
    wrap.style.display = shown ? "none" : "block";
    btn.textContent = shown ? "Show HTML" : "Hide HTML";
  });
}

/* -----------------------------
   Leaflet safe init
------------------------------ */
function leafletReady() {
  return typeof window.L !== "undefined" && typeof window.L.map === "function";
}
function initLeafletMap(el, center, zoom = 12) {
  if (!el) return null;
  if (!leafletReady()) { console.warn("Leaflet not ready; skipping map init."); return null; }

  try { if (el._leaflet_id) el._leaflet_id = null; } catch {}
  let map = null;

  try {
    map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    setTimeout(() => { try { map.invalidateSize(); } catch {} }, 60);
    return map;
  } catch (e) {
    console.error("Map init failed:", e);
    return null;
  }
}

/* -----------------------------
   Router
------------------------------ */
function route() {
  const hash = location.hash || "#/";
  const path = hash.replace("#", "");
  const cleanPath = path.split("?")[0];
  const parts = cleanPath.split("/").filter(Boolean);
  const base = parts[0] || "";
  const param = parts[1] || "";

  if (!base) return renderHome();
  if (base === "search") return renderSearch();
  if (base === "add") return renderAdd();
  if (base === "how") return renderHow();
  if (base === "trust") return renderTrust();
  if (base === "portal") return renderPortal();
  if (base === "toolkit") return renderToolkit();
  if (base === "landlord" && param) return renderLandlord(param);

  renderHome();
}

window.addEventListener("hashchange", route);
window.addEventListener("load", () => {
  initDrawer();
  route();
});

/* -----------------------------
   Components
------------------------------ */
function landlordCardHTML(l, { showCenter = false, showView = true } = {}) {
  const st = ratingStats(l.id);
  const avg = st.avgRounded;
  const count = st.count;

  const tier = cardTier(avg ?? 0, count);
  const tintClass =
    tier.tier === "green" ? "lc--green" :
    tier.tier === "yellow" ? "lc--yellow" :
    tier.tier === "red" ? "lc--red" : "";

  const avgText = (avg == null) ? "—" : avg.toFixed(1);
  const starVis =
    (avg == null) ? "☆☆☆☆☆" :
    (avg >= 4 ? "★★★★☆" : avg >= 3 ? "★★★☆☆" : avg >= 2 ? "★★☆☆☆" : "★☆☆☆☆");

  const addr = `${esc(l.address?.line1 || "")} • ${esc(l.address?.city || "")} • ${esc(l.address?.state || "")} • ${esc(l.borough || "")}`.replace(/\s•\s$/,"");

  return `
    <div class="lc ${tintClass}">
      <div class="lcLeft">
        <div class="lcName">
          <span>${esc(l.name)}</span>
          ${badgesHTML(l)}
        </div>
        <div class="lcMeta">${esc(addr)}</div>

        <div class="lcRow">
          <span class="stars">${starVis}</span>
          <span class="ratingNum">${avgText}</span>
          <span class="muted">(${count} review${count===1?"":"s"})</span>
        </div>
      </div>

      <div class="lcRight">
        ${count ? `<span class="pill ${tier.pillClass}">${tier.label}</span>` : `<span class="pill">Unrated</span>`}
        ${showView ? `<a class="btn btn--primary miniBtn" href="#/landlord/${esc(l.id)}">View</a>` : ``}
        ${showCenter ? `<button class="btn miniBtn" data-center="${esc(l.id)}">Center on map</button>` : ``}
      </div>
    </div>
  `;
}

/* -----------------------------
   Highlights carousel
------------------------------ */
let carouselTimer = null;

function highlightsData() {
  return DB.reviews
    .slice()
    .sort((a,b)=>b.createdAt-a.createdAt)
    .slice(0, 5)
    .map(r => ({ r, l: DB.landlords.find(x => x.id === r.landlordId) }))
    .filter(x => x.l);
}
function renderHighlightsCarousel() {
  const items = highlightsData();
  if (items.length === 0) {
    return `<div class="carousel"><div class="carouselSlide"><div class="muted">No highlights yet.</div></div></div>`;
  }

  const slides = items.map(({r,l}) => {
    const st = ratingStats(l.id);
    const tier = cardTier(st.avgRounded ?? 0, st.count);
    const tintClass =
      tier.tier === "green" ? "lc--green" :
      tier.tier === "yellow" ? "lc--yellow" :
      tier.tier === "red" ? "lc--red" : "";

    const avgText = (st.avgRounded == null) ? "—" : st.avgRounded.toFixed(1);
    const starVis =
      (st.avgRounded == null) ? "☆☆☆☆☆" :
      (st.avgRounded >= 4 ? "★★★★☆" : st.avgRounded >= 3 ? "★★★☆☆" : st.avgRounded >= 2 ? "★★☆☆☆" : "★☆☆☆☆");

    return `
      <div class="carouselSlide">
        <div class="lc ${tintClass}">
          <div class="lcLeft">
            <div class="lcName">
              <span>${esc(l.name)}</span>
              ${badgesHTML(l)}
            </div>
            <div class="lcMeta">${fmtDate(r.createdAt)}</div>

            <div class="lcRow">
              <span class="stars">${starVis}</span>
              <span class="ratingNum">${avgText}</span>
              <span class="muted">(${st.count} review${st.count===1?"":"s"})</span>
            </div>

            <div class="smallNote">${esc(r.text)}</div>
          </div>
          <div class="lcRight">
            ${st.count ? `<span class="pill ${tier.pillClass}">${tier.label}</span>` : `<span class="pill">Unrated</span>`}
            <a class="btn btn--primary miniBtn" href="#/landlord/${esc(l.id)}">View</a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const dots = items.map((_, i) =>
    `<span class="dot ${i===0?"isActive":""}" data-dot="${i}" aria-label="Go to slide ${i+1}"></span>`
  ).join("");

  return `
    <div class="carousel" id="highCarousel">
      <div class="carouselTrack" id="highTrack">${slides}</div>
      <div class="dots" id="highDots">${dots}</div>
    </div>
  `;
}
function setupCarousel() {
  const wrap = $("#highCarousel");
  if (!wrap) return;

  const items = highlightsData();
  const track = $("#highTrack");
  const dots = Array.from(document.querySelectorAll("#highDots .dot"));

  if (!track || dots.length === 0 || items.length <= 1) {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = null;
    return;
  }

  let idx = 0;
  function go(n) {
    idx = (n + items.length) % items.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("isActive", i === idx));
  }

  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.dot))));
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => go(idx + 1), 4500);
}

/* -----------------------------
   Pages base shell
------------------------------ */
function renderShell(content) {
  const app = $("#app");
  if (!app) return;
  app.innerHTML = `
    ${content}
    <div class="footer">
      <div>© ${new Date().getFullYear()} casa</div>
      <div style="display:flex;gap:14px;align-items:center">
        <a href="#/trust">Trust &amp; Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;
}

/* -----------------------------
   HOME
------------------------------ */
function renderHome() {
  setPageTitle("Know your landlord");

  const content = `
    <section class="pageCard card">
      <div class="pad">
        <div class="kicker">CASA</div>
        <div class="h1">Know your landlord<br/>before you sign.</div>
        <p class="sub">Search landlords, read tenant reviews, and add your building in minutes.</p>

        <div class="heroSearch">
          <input class="input" id="homeQ" placeholder="Search landlord name, management company, or address..." />
          <button class="btn btn--primary" id="homeSearch">Search</button>
          <a class="btn" href="#/add">Add a landlord</a>
        </div>

        <div class="muted" style="text-align:center;margin-top:10px;font-size:13px;">
          No account required to review. Verified landlords can respond.
        </div>

        <div class="tileRow">
          <div class="tile" data-home-tile="search">
            <div class="tile__icon">⌕</div>
            <div><div class="tile__label">Search</div></div>
          </div>
          <div class="tile" data-home-tile="review">
            <div class="tile__icon">★</div>
            <div><div class="tile__label">Review</div></div>
          </div>
          <div class="tile tile--disabled">
            <div class="tile__icon">⌂</div>
            <div><div class="tile__label">Rent</div></div>
          </div>
        </div>
        <div class="tilePanel" id="tilePanel" style="display:none"></div>
      </div>
    </section>

    <section class="splitRow">
      <div class="card homePaneCard">
        <div class="pad">
          <div class="sectionHead">
            <div>
              <div class="kicker">Featured reviews</div>
              <h2 class="sectionTitle">Recent highlights</h2>
              <div class="sectionDesc">Browse ratings and landlord profiles.</div>
            </div>
            <a class="btn miniBtn" href="#/search">Browse all</a>
          </div>

          <div class="homePaneBody">
            ${renderHighlightsCarousel()}
          </div>
        </div>
      </div>

      <div class="card homePaneCard">
        <div class="pad">
          <div class="sectionHead">
            <div>
              <div class="kicker">Map</div>
              <h2 class="sectionTitle">Browse by location</h2>
              <div class="sectionDesc">Pins reflect existing ratings.</div>
            </div>
            <a class="btn miniBtn" href="#/search">Open search</a>
          </div>

          <div class="homePaneBody">
            <div class="mapBox" style="margin-top:14px;">
              <div class="map" id="homeMap"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  renderShell(content);

  const tilePanel = $("#tilePanel");
  document.querySelectorAll("[data-home-tile]").forEach(el => {
    el.addEventListener("click", () => {
      const k = el.dataset.homeTile;
      if (!tilePanel) return;
      tilePanel.style.display = "block";
      if (k === "search") tilePanel.textContent = "Search by name, entity or address";
      if (k === "review") tilePanel.textContent = "Leave a rating based on your experience";
    });
  });

  $("#homeSearch")?.addEventListener("click", () => {
    const q = $("#homeQ")?.value?.trim?.() || "";
    const exact = findExactLandlord(q);
    if (exact) { location.hash = `#/landlord/${exact.id}`; return; }
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
  $("#homeQ")?.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#homeSearch")?.click(); });

  setTimeout(() => {
    const mapEl = $("#homeMap");
    if (!mapEl) return;
    const map = initLeafletMap(mapEl, [40.73, -73.95], 11);
    if (!map) return;

    for (const l of DB.landlords) {
      if (typeof l.lat === "number" && typeof l.lng === "number") {
        const st = ratingStats(l.id);
        const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
        try { L.marker([l.lat, l.lng]).addTo(map).bindPopup(`<b>${esc(l.name)}</b><br/>${esc(label)}`); } catch {}
      }
    }
  }, 0);

  setupCarousel();
}

/* Query params */
function getQueryParam(name) {
  const hash = location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return "";
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  return params.get(name) || "";
}

/* -----------------------------
   SEARCH
------------------------------ */
function renderSearch() {
  setPageTitle("Search");
  const q = getQueryParam("q");

  const content = `
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Search</div>
            <div class="pageTitle">Find a landlord</div>
            <div class="pageSub">Search by name, entity or address. Filter by borough.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>

        <div class="heroSearch" style="margin-top:16px;">
          <input class="input" id="searchQ" placeholder="Search landlord name, management company, or address..." value="${esc(q)}"/>
          <select class="input" id="searchB" style="max-width:220px;">
            <option value="">All boroughs</option>
            <option>Manhattan</option>
            <option>Brooklyn</option>
            <option>Queens</option>
            <option>Bronx</option>
            <option>Staten Island</option>
          </select>
          <button class="btn btn--primary" id="doSearch">Search</button>
        </div>

        <div class="mapBox" style="margin-top:14px;">
          <div class="map" id="searchMap" style="height:320px;"></div>
        </div>

        <div class="hr"></div>
        <div class="list" id="results"></div>
      </div>
    </section>
  `;
  renderShell(content);

  const qEl = $("#searchQ");
  const bEl = $("#searchB");
  const resultsEl = $("#results");
  if (!qEl || !bEl || !resultsEl) return;

  qEl.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#doSearch")?.click(); });

  function matches(l, query, borough) {
    const t = (query || "").toLowerCase();
    const hay = landlordHaystack(l);
    const qOk = !t || hay.includes(t);
    const bOk = !borough || (String(l.borough || "").toLowerCase() === String(borough).toLowerCase());
    return qOk && bOk;
  }

  function normalizeName(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[\s\-_.]+/g, " ")
      .replace(/[^\w\s]/g, "");
  }

  function run() {
    const query = qEl.value.trim();
    const borough = bEl.value;

    const normalList = DB.landlords.filter(l => matches(l, query, borough));

    const nq = normalizeName(query);
    const exactMatches = !nq ? [] : DB.landlords.filter(l => {
      const nameOk = normalizeName(l.name) === nq;
      const boroughOk = !borough || (String(l.borough || "").toLowerCase() === String(borough).toLowerCase());
      return nameOk && boroughOk;
    });

    if (exactMatches.length === 1) {
      location.hash = `#/landlord/${encodeURIComponent(exactMatches[0].id)}`;
      return;
    }

    const listToShow = exactMatches.length >= 2 ? exactMatches : normalList;

    resultsEl.innerHTML = listToShow.length
      ? listToShow.map(l => landlordCardHTML(l, { showCenter: true, showView: true })).join("")
      : `<div class="muted">No results.</div>`;

    const mapEl = $("#searchMap");
    if (mapEl) mapEl.innerHTML = "";

    const map = initLeafletMap(mapEl, [40.73, -73.95], 10);
    if (!map) return;

    const markers = new Map();
    for (const l of listToShow) {
      if (typeof l.lat === "number" && typeof l.lng === "number") {
        const st = ratingStats(l.id);
        const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
        try {
          const m = L.marker([l.lat, l.lng]).addTo(map).bindPopup(`<b>${esc(l.name)}</b><br/>${esc(label)}`);
          markers.set(l.id, m);
        } catch {}
      }
    }

    document.querySelectorAll("[data-center]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.center;
        const l = DB.landlords.find(x => x.id === id);
        if (!l || typeof l.lat !== "number" || typeof l.lng !== "number")        return;
        try {
          map.setView([l.lat, l.lng], 14, { animate: true });
          markers.get(id)?.openPopup();
        } catch {}
      });
    });
  }

  $("#doSearch")?.addEventListener("click", () => {
    const query = qEl.value.trim();
    location.hash = `#/search?q=${encodeURIComponent(query)}`;
    run();
  });

  run();
}

/* -----------------------------
   ADD
------------------------------ */
function renderAdd() {
  setPageTitle("Add a landlord");
  const content = `
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Add</div>
            <div class="pageTitle">Add a landlord</div>
            <div class="pageSub">Add the landlord first. You can rate them immediately after.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>

        <div class="twoCol">
          <div class="card" style="box-shadow:none;">
            <div class="pad">
              <div class="field">
                <label>Landlord / Company name <span style="color:#b91c1c">*</span></label>
                <input class="input" id="ln" placeholder="e.g., Park Ave Management" />
              </div>

              <div class="field">
                <label>Entity (optional)</label>
                <input class="input" id="le" placeholder="e.g., Park Ave Management LLC" />
              </div>

              <div class="field">
                <label>Address <span style="color:#b91c1c">*</span></label>
                <input class="input" id="a1" placeholder="Street address" />
              </div>

              <div class="field">
                <label>Unit (optional)</label>
                <input class="input" id="unit" placeholder="Apt / Unit" />
              </div>

              <div class="field">
                <label>City <span style="color:#b91c1c">*</span></label>
                <input class="input" id="city" placeholder="City" />
              </div>

              <div class="field">
                <label>State <span style="color:#b91c1c">*</span></label>
                <input class="input" id="state" placeholder="NY" />
              </div>

              <button class="btn btn--primary btn--block" style="margin-top:12px;" id="addBtn">Add landlord</button>
              <div class="tiny" style="margin-top:10px;">After adding, you’ll be taken to the landlord page where you can rate them.</div>
            </div>
          </div>

          <div>
            <div class="kicker">Place the pin (optional)</div>
            <div class="muted" style="margin-top:8px;font-size:13px;font-weight:700;">
              Click the map to set a location. You won’t enter coordinates.
            </div>
            <div class="mapBox" style="margin-top:10px;">
              <div class="map" id="addMap" style="height:320px;"></div>
            </div>
            <div class="tiny" style="margin-top:10px;">Tip: If you don’t pick a pin, we’ll place it near NYC.</div>
          </div>
        </div>
      </div>
    </section>
  `;
  renderShell(content);

  let picked = null;

  setTimeout(() => {
    const map = initLeafletMap($("#addMap"), [40.73, -73.95], 10);
    if (!map) return;

    let marker = null;
    map.on("click", (e) => {
      picked = { lat: e.latlng.lat, lng: e.latlng.lng };
      try {
        if (marker) marker.remove();
        marker = L.marker([picked.lat, picked.lng]).addTo(map);
      } catch {}
    });
  }, 0);

  $("#addBtn")?.addEventListener("click", () => {
    const name = $("#ln")?.value?.trim?.() || "";
    const entity = $("#le")?.value?.trim?.() || "";
    const line1 = $("#a1")?.value?.trim?.() || "";
    const unit = $("#unit")?.value?.trim?.() || "";
    const city = $("#city")?.value?.trim?.() || "";
    const state = $("#state")?.value?.trim?.() || "";

    if (!name || !line1 || !city || !state) {
      alert("Please fill required fields: Name, Address, City, State.");
      return;
    }

    const id = "l" + Math.random().toString(16).slice(2);
    const l = {
      id,
      name,
      entity,
      address: { line1, unit, city, state },
      borough: "",
      lat: picked?.lat ?? 40.73,
      lng: picked?.lng ?? -73.95,
      verified: false,
      top: false,
      createdAt: Date.now()
    };

    DB.landlords.unshift(l);

    DB.reports = DB.reports || [];
    DB.reports.push({
      landlordId: id,
      updatedAt: Date.now(),
      violations_12mo: 0,
      complaints_12mo: 0,
      bedbug_reports_12mo: 0,
      hp_actions: 0,
      permits_open: 0,
      eviction_filings_12mo: 0,
      notes: "Demo report. Production: public datasets + sources."
    });

    saveDB(DB);
    location.hash = `#/landlord/${id}`;
  });
}

/* -----------------------------
   HOW / TRUST / PORTAL / TOOLKIT
   (kept lean — same structure you already had)
------------------------------ */
function renderHow() {
  setPageTitle("How it works");
  renderShell(`
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">How it works</div>
            <div class="pageTitle">Simple, fast, and public</div>
            <div class="pageSub">No reviewer accounts. Landlords verify to respond.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>
        <div class="hr"></div>
        <div class="muted" style="font-weight:700;line-height:1.5">
          <div><b>Search</b><br/>Find a landlord by name, entity, address, or borough.</div>
          <div style="margin-top:10px"><b>Review</b><br/>Post instantly. (No account required.)</div>
          <div style="margin-top:10px"><b>Respond</b><br/>Verified landlords can reply inline under reviews (coming soon).</div>
          <div style="margin-top:10px"><b>Report issues</b><br/>Spam, harassment, and personal info can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `);
}
function renderTrust() {
  setPageTitle("Trust & Safety");
  renderShell(`
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Trust & Safety</div>
            <div class="pageTitle">Built for accuracy and accountability</div>
            <div class="pageSub">Clear rules + verified landlord responses.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>
        <div class="hr"></div>
        <div class="muted" style="font-weight:700;line-height:1.55">
          <div><b>No reviewer accounts</b><br/>Tenants can post without accounts.</div>
          <div style="margin-top:10px"><b>Verified landlord responses</b><br/>Landlords upload documentation and are reviewed before responding publicly.</div>
          <div style="margin-top:10px"><b>No doxxing</b><br/>Do not post phone numbers, emails, or private details.</div>
          <div style="margin-top:10px"><b>Reporting</b><br/>Spam, harassment, and inaccurate listings can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `);
}
function renderPortal() {
  setPageTitle("Landlord Portal");
  renderShell(`
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div class="pageTitle">Sign in</div>
            <div class="pageSub">Landlords verify documents before responding publicly.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>
        <div class="hr"></div>
        <div class="muted" style="font-weight:800;line-height:1.55">
          Demo portal UI only (your existing portal UI can be pasted here unchanged).
        </div>
      </div>
    </section>
  `);
}
function renderToolkit() {
  setPageTitle("Tenant Toolkit");
  renderShell(`
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Tenant Toolkit</div>
            <div class="pageTitle">Resources by city</div>
            <div class="pageSub">Practical links for renters. Helps CASA expand into new markets.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>
        <div class="hr"></div>
        <div class="muted" style="font-weight:800;line-height:1.55">
          Add your city cards here (you already had these — keep yours if preferred).
        </div>
      </div>
    </section>
  `);
}

/* -----------------------------
   LANDLORD PROFILE
------------------------------ */
function reportRow(k, v) {
  return `
    <div class="reportRow">
      <div class="reportKey">${esc(k)}</div>
      <div class="reportVal">${esc(String(v ?? "—"))}</div>
    </div>
  `;
}

function renderLandlord(id) {
  const l = DB.landlords.find(x => x.id === id);
  if (!l) return renderHome();

  setPageTitle(l.name);

  const st = ratingStats(l.id);
  const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
  const starVis = st.avgRounded == null ? "☆☆☆☆☆" : (
    st.avgRounded >= 4 ? "★★★★☆" :
    st.avgRounded >= 3 ? "★★★☆☆" :
    st.avgRounded >= 2 ? "★★☆☆☆" : "★☆☆☆☆"
  );

  const cred = casaCredential(l.id);
  const badgeRow = badgesHTML(l);
  const distTotal = st.dist.reduce((a,b)=>a+b,0);
  const rep = reportFor(l.id);

  const reportHTML = rep ? `
    <div class="kicker" style="margin-top:18px;">Public report (demo)</div>
    <div class="muted" style="margin-top:6px;font-weight:800">
      Updated: ${fmtDate(rep.updatedAt)}.
    </div>
    <div class="reportGrid">
      <div class="reportCard">
        ${reportRow("Violations (12mo)", rep.violations_12mo)}
        ${reportRow("Complaints (12mo)", rep.complaints_12mo)}
        ${reportRow("Bedbug reports (12mo)", rep.bedbug_reports_12mo)}
      </div>
      <div class="reportCard">
        ${reportRow("HP Actions", rep.hp_actions)}
        ${reportRow("Open permits", rep.permits_open)}
        ${reportRow("Eviction filings (12mo)", rep.eviction_filings_12mo)}
      </div>
    </div>
    <div class="smallNote">${esc(rep.notes || "")}</div>
  ` : `
    <div class="kicker" style="margin-top:18px;">Public report</div>
    <div class="muted" style="margin-top:8px;font-weight:800">No report data yet for this landlord.</div>
  `;

  const content = `
    <section class="pageCard card">
      <div class="pad">
        <div class="profileHead">
          <div>
            <div class="kicker">Landlord</div>
            <div class="profileNameRow">
              <h1 class="profileName">${esc(l.name)}</h1>
              ${badgeRow}
            </div>

            <div class="profileStats">
              <span class="stars">${starVis}</span>
              <span class="ratingNum">${avgText}</span>
              <span class="muted">${st.count ? `${st.count} review${st.count===1?"":"s"}` : "No ratings"}</span>
              <span class="pill">${esc(cred === "CASA Rated" ? "CASA Rated" : (st.count ? "Not yet CASA Rated" : "Unrated"))}</span>
            </div>

            <div class="addrLine">
              ${esc(l.address?.line1 || "")}${l.address?.unit ? `, ${esc(l.address.unit)}` : ""} • ${esc(l.address?.city || "")}, ${esc(l.address?.state || "")}
            </div>
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <a class="btn" href="#/search">Back</a>

            <div style="position:relative;">
              <button class="btn" id="moreBtn" type="button" aria-haspopup="true" aria-expanded="false">More options</button>

              <div id="moreDropdown"
                   style="
                     display:none;
                     position:absolute;
                     right:0;
                     top:calc(100% + 8px);
                     min-width:260px;
                     background: rgba(255,255,255,.92);
                     border:1px solid rgba(20,16,12,.14);
                     border-radius: 14px;
                     box-shadow: 0 30px 80px rgba(0,0,0,.18);
                     padding:10px;
                     z-index:95;
                   ">
                <button class="btn" id="embedBtn" style="width:100%; justify-content:flex-start; border-radius:12px;">
                  Get <span style="${casaBrandFontInlineCSS()};">casa</span> badge embed
                </button>
              </div>
            </div>

            <button class="btn btn--primary" id="rateBtn">Rate this landlord</button>
          </div>
        </div>

        <div class="hr"></div>

        <div class="twoCol">
          <div>
            <div class="kicker">Location</div>
            <div class="mapBox" style="margin-top:10px;">
              <div class="map" id="profileMap" style="height:280px;"></div>
            </div>
            <button class="btn" style="margin-top:10px;" id="centerProfile">Center on map</button>

            <div class="histo">
              <div class="kicker" style="margin-top:18px;">Rating distribution</div>
              ${[5,4,3,2,1].map(star=>{
                const c = st.dist[star-1] || 0;
                const pct = distTotal ? Math.round((c/distTotal)*100) : 0;
                return `
                  <div class="hRow">
                    <div class="muted">${star}★</div>
                    <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
                    <div class="muted">${c}</div>
                  </div>
                `;
              }).join("")}
            </div>

            ${reportHTML}
          </div>

          <div>
            <div class="kicker">Reviews</div>
            <div class="list" style="margin-top:10px;">
              ${
                landlordReviews(l.id).length
                ? landlordReviews(l.id).map(r => `
                  <div class="lc" style="background:rgba(255,255,255,.72)">
                    <div class="lcLeft">
                      <div class="lcRow">
                        <span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span>
                        <span class="ratingNum">${r.stars}/5</span>
                      </div>
                      <div class="smallNote" style="margin-top:10px;font-size:14px;font-weight:700;color:rgba(21,17,14,.78)">
                        ${esc(r.text)}
                      </div>
                      <button class="btn miniBtn" style="margin-top:10px;" data-report="${esc(r.id)}">Report</button>
                    </div>
                    <div class="muted">${fmtDate(r.createdAt)}</div>
                  </div>
                `).join("")
                : `<div class="muted">No reviews yet. Be the first.</div>`
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  renderShell(content);

  // Map
  setTimeout(() => {
    const map = initLeafletMap($("#profileMap"), [l.lat ?? 40.73, l.lng ?? -73.95], 12);
    if (!map) return;

    let marker = null;
    if (typeof l.lat === "number" && typeof l.lng === "number") {
      try { marker = L.marker([l.lat, l.lng]).addTo(map); } catch {}
    }
    $("#centerProfile")?.addEventListener("click", () => {
      try {
        map.setView([l.lat ?? 40.73, l.lng ?? -73.95], 14, { animate: true });
        marker?.openPopup?.();
      } catch {}
    });
  }, 0);

  // Report review buttons
  document.querySelectorAll("[data-report]").forEach(btn => {
    btn.addEventListener("click", () => alert("Report submitted (demo)."));
  });

  // Review modal
  $("#rateBtn")?.addEventListener("click", () => openReviewModal(l.id));

  // More options dropdown
  $("#moreBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleInlineDropdown();
  });

  $("#embedBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeInlineDropdown();
    openBadgeEmbedModal(l.id);
  });

  // cleanup previous listeners
  window.__casaMoreOutsideClick?.();
  window.__casaMoreEsc?.();

  const outsideClick = (e) => {
    const dd = document.getElementById("moreDropdown");
    const btn = document.getElementById("moreBtn");
    if (!dd || !btn) return;
    const within = dd.contains(e.target) || btn.contains(e.target);
    if (!within) closeInlineDropdown();
  };
  const onEsc = (e) => { if (e.key === "Escape") closeInlineDropdown(); };

  document.addEventListener("click", outsideClick);
  document.addEventListener("keydown", onEsc);

  window.__casaMoreOutsideClick = () => document.removeEventListener("click", outsideClick);
  window.__casaMoreEsc = () => document.removeEventListener("keydown", onEsc);
}

/* -----------------------------
   Star picker + Review modal
------------------------------ */
function starPickerHTML(defaultValue = 5) {
  const v = Math.max(1, Math.min(5, Number(defaultValue) || 5));
  return `
    <div class="starPicker" id="starPicker" role="radiogroup" aria-label="Rating">
      ${[1,2,3,4,5].map(i => `
        <button type="button" class="starBtn" data-star="${i}" aria-label="${i} star${i===1?"":"s"}" aria-pressed="false">
          <span class="starChar" aria-hidden="true">★</span>
        </button>
      `).join("")}
      <span class="starValue" id="starValue">${v}/5</span>
      <input type="hidden" id="mStars" value="${v}">
    </div>
    <div class="tiny" style="margin-top:6px;">Click a star to rate.</div>
  `;
}
function applyStarPickerVisual(value) {
  const v = Math.max(1, Math.min(5, Number(value) || 1));
  const btns = Array.from(document.querySelectorAll("#starPicker .starBtn"));
  btns.forEach(btn => {
    const s = Number(btn.dataset.star);
    const on = s <= v;
    btn.classList.toggle("isOn", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  $("#starValue") && ($("#starValue").textContent = `${v}/5`);
  $("#mStars") && ($("#mStars").value = String(v));
}
function bindStarPicker(defaultValue = 5) {
  let current = Math.max(1, Math.min(5, Number(defaultValue) || 5));
  applyStarPickerVisual(current);

  document.querySelectorAll("#starPicker .starBtn").forEach(btn => {
    btn.addEventListener("mouseenter", () => applyStarPickerVisual(btn.dataset.star));
    btn.addEventListener("click", () => {
      current = Number(btn.dataset.star);
      applyStarPickerVisual(current);
    });
  });
  $("#starPicker")?.addEventListener("mouseleave", () => applyStarPickerVisual(current));
}
function openReviewModal(landlordId) {
  openModal(`
    <div class="modalHead">
      <div class="modalTitle">Leave a review</div>
      <button class="iconBtn" id="mClose" aria-label="Close">×</button>
    </div>

    <div class="modalBody">
      <div class="field">
        <label>Rating</label>
        ${starPickerHTML(5)}
      </div>

      <div class="field">
        <label>What happened?</label>
        <textarea class="textarea" id="mText" placeholder="Keep it factual and specific."></textarea>
        <div class="tiny">Please write at least 20 characters. Don’t include phone numbers/emails/private info.</div>
      </div>
    </div>

    <div class="modalFoot">
      <button class="btn" id="mCancel">Cancel</button>
      <button class="btn btn--primary" id="mSubmit">Submit</button>
    </div>
  `);

  $("#mClose")?.addEventListener("click", closeModal);
  $("#mCancel")?.addEventListener("click", closeModal);

  bindStarPicker(5);

  $("#mSubmit")?.addEventListener("click", () => {
    const starsInt = Math.max(1, Math.min(5, Number($("#mStars")?.value) || 5));
    const text = $("#mText")?.value?.trim?.() || "";

    if (!text || text.length < 20) {
      alert("Please write at least 20 characters.");
      return;
    }

    DB.reviews.push({
      id: "r" + Math.random().toString(16).slice(2),
      landlordId,
      stars: starsInt,
      text,
      createdAt: Date.now()
    });

    saveDB(DB);
    closeModal();
    route();
  });
}
