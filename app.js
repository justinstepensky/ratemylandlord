/* CASA — single-file SPA app.js
   - hash routing
   - premium cards
   - rating tint tiers (rounded 1 decimal)
   - badges (assets/badge-verified.png + assets/badge-top.png)
   - Recent highlights carousel w/ dots only (max 5)
   - mobile drawer works
   - review modal fixed (z-index + layout)
   - rating is clickable stars
   - HARDENED: prevents blank app if any piece fails

   NEW (added, no redesign):
   - Building/landlord public report layer (demo city-data style)
   - Tenant Toolkit page (multi-market strategy)
   - CASA badge embed generator for landlords (Trustpilot-style credential)
   - Page titles update by route for SEO shareability
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
              The app hit a runtime error and stopped rendering.
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

  window.addEventListener("error", (e) => {
    showOverlayError("Uncaught error", e?.error || e?.message || e);
  });

  window.addEventListener("unhandledrejection", (e) => {
    showOverlayError("Unhandled promise rejection", e?.reason || e);
  });
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
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {}
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

    /* NEW: public-report layer (demo “city data”) */
    reports: [
      {
        landlordId: "l1",
        updatedAt: Date.now() - 1000*60*60*24*2,
        violations_12mo: 7,
        complaints_12mo: 22,
        bedbug_reports_12mo: 1,
        hp_actions: 0,
        permits_open: 2,
        eviction_filings_12mo: 1,
        notes: "Data is demo only. Production: pull from city datasets + add sources."
      },
      {
        landlordId: "l2",
        updatedAt: Date.now() - 1000*60*60*24*4,
        violations_12mo: 18,
        complaints_12mo: 49,
        bedbug_reports_12mo: 3,
        hp_actions: 1,
        permits_open: 4,
        eviction_filings_12mo: 6,
        notes: "Data is demo only. Production: pull from city datasets + add sources."
      },
      {
        landlordId: "l3",
        updatedAt: Date.now() - 1000*60*60*24*1,
        violations_12mo: 2,
        complaints_12mo: 9,
        bedbug_reports_12mo: 0,
        hp_actions: 0,
        permits_open: 1,
        eviction_filings_12mo: 0,
        notes: "Data is demo only. Production: pull from city datasets + add sources."
      }
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

function round1(n) {
  return Math.round(n * 10) / 10;
}

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

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

/* Recency-weighted average:
   weight halves every 180 days
*/
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
  return DB.reviews
    .filter(r => r.landlordId === landlordId)
    .sort((a,b)=>b.createdAt-a.createdAt);
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

/* badges */
function badgesHTML(l) {
  const parts = [];
  if (l.verified) {
    parts.push(
      `<img class="badgeImg" src="assets/badge-verified.png" alt="Verified" title="Verified Landlord (ownership verified)" onerror="this.remove()"/>`
    );
  }
  if (l.top) {
    parts.push(
      `<img class="badgeImg" src="assets/badge-top.png" alt="Top" title="Top Landlord (high rating + consistent performance)" onerror="this.remove()"/>`
    );
  }
  if (!parts.length) return "";
  return `<span class="badges">${parts.join("")}</span>`;
}

/* NEW: report helper */
function reportFor(landlordId) {
  return (DB.reports || []).find(r => r.landlordId === landlordId) || null;
}

/* NEW: soft SEO title update */
function setPageTitle(title) {
  try {
    document.title = title ? `${title} • casa` : "casa";
  } catch {}
}

/* -----------------------------
   Drawer (mobile menu)
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

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 981) close();
  });
}

/* -----------------------------
   Modal
------------------------------ */
function openModal(innerHTML) {
  const overlay = $("#modalOverlay");
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      ${innerHTML}
    </div>
  `;
  overlay.classList.add("isOpen");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const handler = (e) => {
    if (e.target === overlay) closeModal();
  };
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

/* -----------------------------
   Leaflet safe init
------------------------------ */
function leafletReady() {
  return typeof window.L !== "undefined" && typeof window.L.map === "function";
}

function initLeafletMap(el, center, zoom = 12) {
  if (!el) return null;
  if (!leafletReady()) {
    console.warn("Leaflet not ready; skipping map init.");
    return null;
  }

  try {
    if (el._leaflet_id) el._leaflet_id = null;
  } catch {}

  let map = null;
  try {
    map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 60);

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
  try {
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
  } catch (e) {
    console.error("Route error:", e);
    renderHome();
  }
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

        <div class="smallNote"></div>
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
    .map(r => {
      const l = DB.landlords.find(x => x.id === r.landlordId);
      return { r, l };
    })
    .filter(x => x.l);
}

function renderHighlightsCarousel() {
  const items = highlightsData();

  if (items.length === 0) {
    return `
      <div class="carousel">
        <div class="carouselSlide">
          <div class="muted">No highlights yet.</div>
        </div>
      </div>
    `;
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
            <div class="smallNote"></div>
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
            <div>
              <div class="tile__label">Search</div>
            </div>
          </div>
          <div class="tile" data-home-tile="review">
            <div class="tile__icon">★</div>
            <div>
              <div class="tile__label">Review</div>
            </div>
          </div>
          <div class="tile tile--disabled">
            <div class="tile__icon">⌂</div>
            <div>
              <div class="tile__label">Rent</div>
            </div>
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
      if (k === "review") tilePanel.textContent = "Leave a rating based on select categories";
    });
  });

  $("#homeSearch")?.addEventListener("click", () => {
    const q = $("#homeQ")?.value?.trim?.() || "";

    const exact = findExactLandlord(q);
    if (exact) {
      location.hash = `#/landlord/${exact.id}`;
      return;
    }
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });

  $("#homeQ")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#homeSearch")?.click();
  });

  setTimeout(() => {
    const mapEl = $("#homeMap");
    if (!mapEl) return;
    const map = initLeafletMap(mapEl, [40.73, -73.95], 11);
    if (!map) return;

    for (const l of DB.landlords) {
      if (typeof l.lat === "number" && typeof l.lng === "number") {
        const st = ratingStats(l.id);
        const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
        try {
          L.marker([l.lat, l.lng]).addTo(map).bindPopup(`<b>${esc(l.name)}</b><br/>${esc(label)}`);
        } catch {}
      }
    }
  }, 0);

  setupCarousel();
}

/* -----------------------------
   Query params
------------------------------ */
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

  qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#doSearch")?.click();
  });

  function matches(l, query, borough) {
    const t = (query || "").toLowerCase();
    const hay = `${l.name} ${l.entity || ""} ${l.address?.line1 || ""} ${l.address?.city || ""} ${l.address?.state || ""}`.toLowerCase();
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
        if (!l || typeof l.lat !== "number" || typeof l.lng !== "number") return;
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

    /* auto create a default report object so profile never looks empty */
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
   HOW + TRUST + PORTAL
------------------------------ */
function renderHow() {
  setPageTitle("How it works");
  const content = `
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
  `;
  renderShell(content);
}

function renderTrust() {
  setPageTitle("Trust & Safety");
  const content = `
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
  `;
  renderShell(content);
}

function renderPortal() {
  setPageTitle("Landlord Portal");
  const content = `
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

        <div class="portalGrid">
          <div class="card" style="box-shadow:none;">
            <div class="pad">
              <div class="kicker">Sign in</div>

              <div class="field">
                <label>Email</label>
                <input class="input" id="pe" placeholder="you@company.com" />
              </div>
              <div class="field">
                <label>Password</label>
                <input class="input" id="pp" type="password" placeholder="Password" />
              </div>

              <button class="btn btn--primary btn--block" style="margin-top:12px;" id="psignin">Sign in</button>

              <div class="tiny" style="text-align:center;margin-top:12px;">or continue with</div>

              <div class="oauth">
                <button class="oauthBtn" id="oauthGoogle">
                  <img alt="" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 48 48'><path fill='%23EA4335' d='M24 9.5c3.54 0 6.72 1.22 9.23 3.23l6.9-6.9C35.9 2.33 30.3 0 24 0 14.6 0 6.5 5.38 2.57 13.22l8.02 6.23C12.54 13.04 17.8 9.5 24 9.5z'/><path fill='%234285F4' d='M46.5 24c0-1.57-.14-3.08-.4-4.55H24v9.1h12.7c-.55 2.96-2.2 5.47-4.7 7.16l7.2 5.6C43.6 38.3 46.5 31.7 46.5 24z'/><path fill='%2334A853' d='M10.6 28.45a14.9 14.9 0 0 1 0-8.9l-8.02-6.23A23.98 23.98 0 0 0 0 24c0 3.88.93 7.55 2.57 10.78l8.03-6.33z'/><path fill='%23FBBC05' d='M24 48c6.3 0 11.6-2.08 15.47-5.64l-7.2-5.6c-2 1.35-4.6 2.15-8.27 2.15-6.2 0-11.46-3.54-13.4-8.46l-8.03 6.33C6.5 42.62 14.6 48 24 48z'/></svg>"/>
                  Continue with Google
                </button>
                <button class="oauthBtn" id="oauthApple">
                  <img alt="" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path fill='%23000' d='M16.365 1.43c0 1.14-.414 2.208-1.243 3.105-.997 1.072-2.61 1.9-4.01 1.785-.174-1.156.33-2.326 1.19-3.26.93-1.01 2.55-1.76 4.063-1.63zM20.5 17.38c-.49 1.13-1.08 2.16-1.78 3.09-.95 1.27-1.73 2.15-2.92 2.17-1.14.02-1.51-.75-2.98-.75-1.47 0-1.89.73-2.96.77-1.15.04-2.03-1.05-2.98-2.32C1.9 19.02 0 15.7 0 12.5c0-3.13 1.99-4.8 3.93-4.8 1.23 0 2.25.83 2.98.83.7 0 2.02-1.03 3.4-.88.58.03 2.22.24 3.27 1.8-.08.05-1.95 1.14-1.93 3.4.03 2.7 2.35 3.6 2.38 3.62z'/></svg>"/>
                  Continue with Apple
                </button>
                <button class="oauthBtn" id="oauthMicrosoft">
                  <img alt="" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 48 48'><path fill='%23F25022' d='M6 6h17v17H6z'/><path fill='%237FBA00' d='M25 6h17v17H25z'/><path fill='%2300A4EF' d='M6 25h17v17H6z'/><path fill='%23FFB900' d='M25 25h17v17H25z'/></svg>"/>
                  Continue with Microsoft
                </button>
              </div>
            </div>
          </div>

          <div class="card" style="box-shadow:none;">
            <div class="pad">
              <div class="kicker">Create account</div>

              <div class="field">
                <label>Email</label>
                <input class="input" id="se" placeholder="you@company.com" />
              </div>
              <div class="field">
                <label>Password</label>
                <input class="input" id="sp" type="password" placeholder="Create a password" />
              </div>

              <div class="field">
                <label>Verification document (demo)</label>

                <div class="fileRow">
                  <div class="fileName" id="fileName">No file chosen</div>
                  <label class="filePick" for="doc">Choose file</label>
                  <input id="doc" type="file" />
                </div>

                <div class="tiny" style="margin-top:8px;">Deed, property tax bill, management agreement, utility statement, etc.</div>
              </div>

              <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">Create account</button>
              <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted. (Production: Stripe subscription required to claim/verify.)</div>
            </div>
          </div>
        </div>

        <div class="card" style="box-shadow:none;margin-top:14px;">
          <div class="pad">
            <div style="font-weight:900">Plans (demo copy)</div>
            <div class="muted" style="margin-top:4px;font-weight:800">
              Claimed — $39/mo • Verified — $99/mo • Certified/Pro — $299/mo
            </div>
            <div class="tiny" style="margin-top:6px;">Landlords must subscribe to claim or verify.</div>
          </div>
        </div>
      </div>
    </section>
  `;
  renderShell(content);

  const doc = $("#doc");
  const fileName = $("#fileName");
  doc?.addEventListener("change", () => {
    if (!fileName) return;
    fileName.textContent = doc.files?.[0]?.name || "No file chosen";
  });

  const demo = (label) => alert(`${label} (demo)`);
  ["oauthGoogle","oauthApple","oauthMicrosoft"].forEach(id=>{
    $("#"+id)?.addEventListener("click", ()=>demo("OAuth sign-in"));
  });
  $("#psignin")?.addEventListener("click", ()=>demo("Sign in"));
  $("#signup")?.addEventListener("click", ()=>demo("Create account"));
}

/* -----------------------------
   NEW: Tenant Toolkit (market expansion wedge)
------------------------------ */
function renderToolkit() {
  setPageTitle("Tenant Toolkit");
  const content = `
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Tenant Toolkit</div>
            <div class="pageTitle">Resources by city</div>
            <div class="pageSub">Practical links for renters. This helps CASA expand into new markets.</div>
          </div>
          <a class="btn" href="#/">Home</a>
        </div>

        <div class="hr"></div>

        <div class="muted" style="font-weight:800;line-height:1.55">
          Choose a city and access essential services: tenant rights, reporting issues, housing court basics.
        </div>

        <div class="toolkitGrid">
          ${toolkitCityCard("New York City", [
            ["NYC 311 (complaints & services)", "https://portal.311.nyc.gov/"],
            ["HPD (housing preservation)", "https://www.nyc.gov/site/hpd/index.page"],
            ["NYC Housing Court info", "https://ww2.nycourts.gov/courts/nyc/housing/index.shtml"],
          ])}
          ${toolkitCityCard("Boston", [
            ["City of Boston 311", "https://www.boston.gov/departments/boston-311"],
            ["Boston tenant rights", "https://www.boston.gov/departments/neighborhood-development/tenant-rights"],
          ])}
          ${toolkitCityCard("Miami", [
            ["Miami-Dade 311", "https://www.miamidade.gov/global/service.page?Mduid_service=ser1577816385742078"],
            ["Florida tenant rights overview", "https://www.myfloridalegal.com/"],
          ])}
          ${toolkitCityCard("Chicago", [
            ["Chicago 311", "https://311.chicago.gov/"],
            ["Chicago renters rights info", "https://www.chicago.gov/city/en/depts/doh.html"],
          ])}
        </div>

        <div class="hr"></div>

        <div class="smallNote" style="margin-top:0">
          <b>Expansion strategy:</b> Start with reviews everywhere, then add city datasets per market.
          The toolkit page gives value even before your “report” data is available in that city.
        </div>
      </div>
    </section>
  `;
  renderShell(content);
}
function toolkitCityCard(name, links) {
  return `
    <div class="toolkitItem">
      <div class="kicker">${esc(name)}</div>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;">
        ${links.map(([label,url]) => `
          <a class="btn miniBtn" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${esc(label)}</a>
        `).join("")}
      </div>
    </div>
  `;
}

/* -----------------------------
   LANDLORD PROFILE
------------------------------ */
function renderLandlord(id) {
  const l = DB.landlords.find(x => x.id === id);
  if (!l) return renderHome();

  setPageTitle(l.name);

  const st = ratingStats(l.id);
  const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
  const starVis = st.avgRounded == null ? "☆☆☆☆☆" : (st.avgRounded >= 4 ? "★★★★☆" : st.avgRounded >= 3 ? "★★★☆☆" : st.avgRounded >= 2 ? "★★☆☆☆" : "★☆☆☆☆");

  const cred = casaCredential(l.id);
  const badgeRow = badgesHTML(l);
  const distTotal = st.dist.reduce((a,b)=>a+b,0);

  const rep = reportFor(l.id);

  const reportHTML = rep ? `
    <div class="kicker" style="margin-top:18px;">Public report (demo)</div>
    <div class="muted" style="margin-top:6px;font-weight:800">
      This is where CASA adds “receipts” (city datasets). Updated: ${fmtDate(rep.updatedAt)}.
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

    <div class="smallNote">
      ${esc(rep.notes || "Demo report. Production: public datasets + sources.")}
    </div>
  ` : `
    <div class="kicker" style="margin-top:18px;">Public report</div>
    <div class="muted" style="margin-top:8px;font-weight:800">
      No report data yet for this landlord.
    </div>
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

            <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn miniBtn" id="embedBtn">Get CASA badge embed</button>
            </div>
          </div>

          <div style="display:flex;gap:10px;align-items:center">
            <a class="btn" href="#/search">Back</a>
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
                const count = st.dist[star-1] || 0;
                const pct = distTotal ? Math.round((count/distTotal)*100) : 0;
                return `
                  <div class="hRow">
                    <div class="muted">${star}★</div>
                    <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
                    <div class="muted">${count}</div>
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

  document.querySelectorAll("[data-report]").forEach(btn => {
    btn.addEventListener("click", () => alert("Report submitted (demo)."));
  });

  $("#rateBtn")?.addEventListener("click", () => openReviewModal(l.id));

  /* NEW: CASA embed badge modal */
  $("#embedBtn")?.addEventListener("click", () => openEmbedModal(l));
}

function reportRow(k, v) {
  return `
    <div class="reportRow">
      <div class="reportKey">${esc(k)}</div>
      <div class="reportVal">${esc(String(v ?? "—"))}</div>
    </div>
  `;
}

function openEmbedModal(landlord) {
  const st = ratingStats(landlord.id);
  const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);

  const pageUrl = `${location.origin}${location.pathname}#/landlord/${encodeURIComponent(landlord.id)}`;
  const html = `<a href="${pageUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;border:1px solid rgba(20,16,12,.14);background:rgba(255,255,255,.75);padding:10px 12px;border-radius:999px;color:rgba(21,17,14,.92);font-weight:800;">
  <img src="${location.origin}${location.pathname}assets/badge-casa.png" alt="CASA" style="width:18px;height:18px;border-radius:5px;"/>
  Rated on CASA • ${avgText}/5
</a>`;

  openModal(`
    <div class="modalHead">
      <div class="modalTitle">CASA badge embed</div>
      <button class="iconBtn" id="mClose" aria-label="Close">×</button>
    </div>

    <div class="modalBody">
      <div class="kicker">Landlord credential</div>
      <div class="muted" style="margin-top:6px;font-weight:800;line-height:1.55">
        Landlords can embed this on their website or listing pages — like a Trustpilot rating.
      </div>

      <div class="embedBox">
        <div class="kicker" style="margin-bottom:8px;">HTML snippet</div>
        <textarea class="codeField" id="embedCode" rows="5">${esc(html)}</textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
          <button class="btn btn--primary miniBtn" id="copyEmbed">Copy embed</button>
          <button class="btn miniBtn" id="previewEmbed">Preview</button>
        </div>
      </div>
    </div>

    <div class="modalFoot">
      <button class="btn" id="mCancel">Close</button>
    </div>
  `);

  $("#mClose")?.addEventListener("click", closeModal);
  $("#mCancel")?.addEventListener("click", closeModal);

  $("#copyEmbed")?.addEventListener("click", async () => {
    try {
      const val = $("#embedCode")?.value || "";
      await navigator.clipboard.writeText(val);
      alert("Copied.");
    } catch {
      alert("Copy failed. Select text and copy manually.");
    }
  });

  $("#previewEmbed")?.addEventListener("click", () => {
    openModal(`
      <div class="modalHead">
        <div class="modalTitle">Preview</div>
        <button class="iconBtn" id="mClose2" aria-label="Close">×</button>
      </div>
      <div class="modalBody">
        <div class="kicker">Preview</div>
        <div style="margin-top:12px;">${html}</div>
      </div>
      <div class="modalFoot">
        <button class="btn" id="mCancel2">Close</button>
      </div>
    `);
    $("#mClose2")?.addEventListener("click", closeModal);
    $("#mCancel2")?.addEventListener("click", closeModal);
  });
}

/* -----------------------------
   Star picker
------------------------------ */
function starPickerHTML(defaultValue = 5) {
  const v = Math.max(1, Math.min(5, Number(defaultValue) || 5));
  return `
    <div class="starPicker" id="starPicker" role="radiogroup" aria-label="Rating">
      ${[1,2,3,4,5].map(i => `
        <button type="button"
          class="starBtn"
          data-star="${i}"
          aria-label="${i} star${i===1?"":"s"}"
          aria-pressed="false">
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

  const out = $("#starValue");
  if (out) out.textContent = `${v}/5`;

  const hidden = $("#mStars");
  if (hidden) hidden.value = String(v);
}

function bindStarPicker(defaultValue = 5) {
  let current = Math.max(1, Math.min(5, Number(defaultValue) || 5));
  applyStarPickerVisual(current);

  document.querySelectorAll("#starPicker .starBtn").forEach(btn => {
    btn.addEventListener("mouseenter", () => applyStarPickerVisual(btn.dataset.star));
  });
  $("#starPicker")?.addEventListener("mouseleave", () => applyStarPickerVisual(current));

  document.querySelectorAll("#starPicker .starBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      current = Number(btn.dataset.star);
      applyStarPickerVisual(current);
    });
  });
}

/* Review modal */
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
