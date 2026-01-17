/* CASA — single-file SPA app.js
   - hash routing
   - premium cards
   - rating tint tiers (rounded 1 decimal)
   - badges (assets/badge-verified.png + assets/badge-top.png)
   - Recent highlights carousel w/ dots only (max 5)
   - mobile drawer works
   - review modal fixed (z-index + layout)
   - FIX: rating is now clickable stars w/ HALF-star support
   - FIX: badges paths corrected + fail-safe if missing
*/

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
  localStorage.setItem(LS_KEY, JSON.stringify(db));
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
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function findSimilarLandlords(query, borough = "") {
  const q = norm(query);
  const b = norm(borough);

  let list = DB.landlords.filter(l => {
    const bOk = !b || norm(l.borough) === b;
    if (!bOk) return false;
    if (!q) return true;
    return landlordHaystack(l).includes(q);
  });

  // if none similar, show all available landlords
  if (q && list.length === 0) {
    list = DB.landlords.filter(l => !b || norm(l.borough) === b);
  }

  return list;
}

/* Recency-weighted average:
   weight halves every 180 days (simple credibility)
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
  return DB.reviews.filter(r => r.landlordId === landlordId).sort((a,b)=>b.createdAt-a.createdAt);
}

function ratingStats(landlordId) {
  const rs = landlordReviews(landlordId);
  const count = rs.length;
  if (count === 0) return { count: 0, avg: null, avgRounded: null, dist: [0,0,0,0,0] };
  const avg = weightedAverageStars(rs);
  const avgRounded = round1(avg);
  const dist = [0,0,0,0,0]; // 1..5
  for (const r of rs) dist[r.stars - 1] += 1;
  return { count, avg, avgRounded, dist };
}

function starsVisual(avgRounded) {
  if (avgRounded == null) return "★★★★★";
  const full = Math.floor(avgRounded);
  const half = (avgRounded - full) >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "★" : "") + "☆".repeat(empty);
}

function cardTier(avgRounded, reviewCount) {
  // If 0 reviews: no special coloring
  if (!reviewCount) return { tier: "none", label: "Unrated", pillClass: "" };

  const r = avgRounded; // IMPORTANT: classification uses the rounded rating
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

  // CASA Rated = 10+ total AND 3+ last 12 months
  if (total === 0) return "Unrated";
  if (!(total >= 10 && in12 >= 3)) return "Not yet CASA Rated — needs more reviews";
  return "CASA Rated";
}

/* FIX: badge paths per your theme spec:
   assets/badge-verified.png
   assets/badge-top.png
   + if missing, remove instead of broken icon
*/
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

/* -----------------------------
   Drawer (mobile menu)
------------------------------ */
function initDrawer() {
  const btn = $("#menuBtn");
  const drawer = $("#drawer");
  const overlay = $("#drawerOverlay");
  const closeBtn = $("#drawerClose");

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

  btn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);

  drawer?.addEventListener("click", (e) => {
    const a = e.target.closest("[data-drawer-link]");
    if (a) close();
  });

  // If someone resizes to desktop, close drawer automatically
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 981) close();
  });
}

/* -----------------------------
   Modal
------------------------------ */
function openModal(innerHTML) {
  const overlay = $("#modalOverlay");
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      ${innerHTML}
    </div>
  `;
  overlay.classList.add("isOpen");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}
function closeModal() {
  const overlay = $("#modalOverlay");
  overlay.classList.remove("isOpen");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = "";
  document.body.style.overflow = "";
}

/* -----------------------------
   Maps
------------------------------ */
function initLeafletMap(el, center, zoom = 12) {
  const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  return map;
}

/* -----------------------------
   Router
------------------------------ */
function route() {
  const hash = location.hash || "#/";
   const path = hash.replace("#", "").split("?")[0];
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
  const tintClass = tier.tier === "green" ? "lc--green" : tier.tier === "yellow" ? "lc--yellow" : tier.tier === "red" ? "lc--red" : "";

  const avgText = (avg == null) ? "—" : avg.toFixed(1);
  const starVis = (avg == null) ? "☆☆☆☆☆" : (avg >= 4 ? "★★★★☆" : avg >= 3 ? "★★★☆☆" : avg >= 2 ? "★★☆☆☆" : "★☆☆☆☆");

  const addr = `${esc(l.address.line1)} • ${esc(l.address.city)} • ${esc(l.address.state)} • ${esc(l.borough || "")}`.replace(/\s•\s$/,"");

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
          <span class="muted">Rating reflects review recency.</span>
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

/* Recent highlights:
   - up to 5 most recent reviews (across all landlords)
   - dots count matches slides
   - auto-advance
*/
let carouselTimer = null;

function highlightsData() {
  const items = DB.reviews
    .slice()
    .sort((a,b)=>b.createdAt-a.createdAt)
    .slice(0, 5)
    .map(r => {
      const l = DB.landlords.find(x => x.id === r.landlordId);
      return { r, l };
    })
    .filter(x => x.l);
  return items;
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
    const tintClass = tier.tier === "green" ? "lc--green" : tier.tier === "yellow" ? "lc--yellow" : tier.tier === "red" ? "lc--red" : "";

    const avgText = (st.avgRounded == null) ? "—" : st.avgRounded.toFixed(1);
    const starVis = (st.avgRounded == null) ? "☆☆☆☆☆" : (st.avgRounded >= 4 ? "★★★★☆" : st.avgRounded >= 3 ? "★★★☆☆" : st.avgRounded >= 2 ? "★★☆☆☆" : "★☆☆☆☆");

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
            <div class="smallNote">Rating reflects review recency.</div>
          </div>
          <div class="lcRight">
            ${st.count ? `<span class="pill ${tier.pillClass}">${tier.label}</span>` : `<span class="pill">Unrated</span>`}
            <a class="btn btn--primary miniBtn" href="#/landlord/${esc(l.id)}">View</a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const dots = items.map((_, i) => `<span class="dot ${i===0?"isActive":""}" data-dot="${i}" aria-label="Go to slide ${i+1}"></span>`).join("");

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
  let idx = 0;

  function go(n) {
    idx = (n + items.length) % items.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("isActive", i === idx));
  }

  dots.forEach((d) => {
    d.addEventListener("click", () => go(Number(d.dataset.dot)));
  });

  // auto-advance
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => go(idx + 1), 4500);
}

/* -----------------------------
   Pages
------------------------------ */
function renderShell(content) {
  const app = $("#app");
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
function renderHome() {
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

  // tile copy
  const tilePanel = $("#tilePanel");
  document.querySelectorAll("[data-home-tile]").forEach(el => {
    el.addEventListener("click", () => {
      const k = el.dataset.homeTile;
      tilePanel.style.display = "block";
      if (k === "search") tilePanel.textContent = "Search by name, entity or address";
      if (k === "review") tilePanel.textContent = "Leave a rating based on select categories";
    });
  });

  $("#homeSearch").addEventListener("click", () => {
  const q = $("#homeQ").value.trim();

  const exact = findExactLandlord(q);
  if (exact) {
    location.hash = `#/landlord/${exact.id}`;
    return;
  }

  location.hash = `#/search?q=${encodeURIComponent(q)}`;
});

$("#homeQ").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#homeSearch").click();
});

  // Map
  setTimeout(() => {
    const mapEl = $("#homeMap");
    if (!mapEl) return;
    const map = initLeafletMap(mapEl, [40.73, -73.95], 11);

    for (const l of DB.landlords) {
      if (typeof l.lat === "number" && typeof l.lng === "number") {
        const st = ratingStats(l.id);
        const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
        L.marker([l.lat, l.lng]).addTo(map).bindPopup(`<b>${esc(l.name)}</b><br/>${esc(label)}`);
      }
    }
  }, 0);

  setupCarousel();
}

function getQueryParam(name) {
  const hash = location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return "";
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  return params.get(name) || "";
}

function renderSearch() {
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

        <!-- MAP ON TOP (like before) -->
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

   // Press Enter in the search box = click Search
  qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#doSearch").click();
  });

  function matches(l, query, borough) {
    const t = (query || "").toLowerCase();
    const hay = `${l.name} ${l.entity || ""} ${l.address.line1} ${l.address.city} ${l.address.state}`.toLowerCase();
    const qOk = !t || hay.includes(t);
    const bOk = !borough || (String(l.borough || "").toLowerCase() === String(borough).toLowerCase());
    return qOk && bOk;
  }

function normalizeName(s){
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-_.]+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function scoreMatch(landlord, q){
  // simple similarity: counts how many query tokens appear in landlord haystack
  const query = normalizeName(q);
  if (!query) return 0;

  const tokens = query.split(" ").filter(Boolean);
  const hay = normalizeName(
    `${landlord.name} ${landlord.entity || ""} ${landlord.address.line1} ${landlord.address.city} ${landlord.address.state}`
  );

  let score = 0;
  for (const t of tokens){
    if (hay.includes(t)) score += 1;
  }

  // tiny bonus if name starts with query
  if (normalizeName(landlord.name).startsWith(query)) score += 2;

  return score;
}

function run() {
  const query = qEl.value.trim();
  const borough = bEl.value;

  // If empty query: show all (optionally filtered by borough)
  if (!query) {
    const listAll = DB.landlords.filter(l => matches(l, "", borough));
    renderListAndMap(listAll);
    return;
  }

  // 1) EXACT MATCH BY NAME (case-insensitive, normalized) -> go to landlord page
  const qNorm = normalizeName(query);
  const exact = DB.landlords.find(l => normalizeName(l.name) === qNorm);

  if (exact && matches(exact, query, borough)) {
    location.hash = `#/landlord/${exact.id}`;
    return;
  }

  // 2) SIMILAR MATCHES (ranked)
  const scored = DB.landlords
    .filter(l => matches(l, "", borough)) // borough filter still applies
    .map(l => ({ l, s: scoreMatch(l, query) }))
    .filter(x => x.s > 0)
    .sort((a,b) => b.s - a.s)
    .map(x => x.l);

  // 3) If no similar matches, fallback to showing ALL available (borough-filtered)
  const list = scored.length ? scored : DB.landlords.filter(l => matches(l, "", borough));

  renderListAndMap(list);

  // Show a helpful note if we didn't have an exact match
  if (!scored.length) {
    $("#results").insertAdjacentHTML("afterbegin", `
      <div class="muted" style="margin-bottom:10px;">
        No close matches found for <b>${esc(query)}</b>. Showing all landlords.
      </div>
    `);
  } else {
    $("#results").insertAdjacentHTML("afterbegin", `
      <div class="muted" style="margin-bottom:10px;">
        No exact match for <b>${esc(query)}</b>. Showing similar results.
      </div>
    `);
  }
}

function renderListAndMap(list){
  $("#results").innerHTML = list.length
    ? list.map(l => landlordCardHTML(l, { showCenter: true, showView: true })).join("")
    : `<div class="muted">No results.</div>`;

  // map + markers
  const mapEl = $("#searchMap");
  mapEl.innerHTML = "";
  const map = initLeafletMap(mapEl, [40.73, -73.95], 10);

  const markers = new Map();
  for (const l of list) {
    if (typeof l.lat === "number" && typeof l.lng === "number") {
      const st = ratingStats(l.id);
      const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
      const m = L.marker([l.lat, l.lng]).addTo(map).bindPopup(`<b>${esc(l.name)}</b><br/>${esc(label)}`);
      markers.set(l.id, m);
    }
  }

  // center on map buttons
  document.querySelectorAll("[data-center]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.center;
      const l = DB.landlords.find(x => x.id === id);
      if (!l || typeof l.lat !== "number" || typeof l.lng !== "number") return;
      map.setView([l.lat, l.lng], 14, { animate: true });
      markers.get(id)?.openPopup();
    });
  });
}

  $("#doSearch").addEventListener("click", () => {
    const query = qEl.value.trim();
    location.hash = `#/search?q=${encodeURIComponent(query)}`;
    // keep borough selection without putting in URL (simple)
    run();
  });

  run();
}

function renderAdd() {
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
    let marker = null;

    map.on("click", (e) => {
      picked = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (marker) marker.remove();
      marker = L.marker([picked.lat, picked.lng]).addTo(map);
    });
  }, 0);

  $("#addBtn").addEventListener("click", () => {
    const name = $("#ln").value.trim();
    const entity = $("#le").value.trim();
    const line1 = $("#a1").value.trim();
    const unit = $("#unit").value.trim();
    const city = $("#city").value.trim();
    const state = $("#state").value.trim();

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
      borough: "", // no borough field on add page
      lat: picked?.lat ?? 40.73,
      lng: picked?.lng ?? -73.95,
      verified: false,
      top: false,
      createdAt: Date.now()
    };

    DB.landlords.unshift(l);
    saveDB(DB);

    location.hash = `#/landlord/${id}`;
  });
}

function renderHow() {
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
          <div style="margin-top:10px"><b>Review</b><br/>Post instantly. You’ll receive an edit link (no account required).</div>
          <div style="margin-top:10px"><b>Respond</b><br/>Verified landlords can reply inline under reviews.</div>
          <div style="margin-top:10px"><b>Report issues</b><br/>Spam, harassment, and personal info can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `;
  renderShell(content);
}

function renderTrust() {
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
          <div><b>No reviewer accounts</b><br/>Tenants can post without accounts; edits use an edit link.</div>
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

              <div class="tiny" style="text-align:center;margin-top:10px;">or continue with</div>
              <div class="oauth" style="margin-top:10px;">
                <button class="oauthBtn" id="oauthGoogle2">
                  <img alt="" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 48 48'><path fill='%23EA4335' d='M24 9.5c3.54 0 6.72 1.22 9.23 3.23l6.9-6.9C35.9 2.33 30.3 0 24 0 14.6 0 6.5 5.38 2.57 13.22l8.02 6.23C12.54 13.04 17.8 9.5 24 9.5z'/><path fill='%234285F4' d='M46.5 24c0-1.57-.14-3.08-.4-4.55H24v9.1h12.7c-.55 2.96-2.2 5.47-4.7 7.16l7.2 5.6C43.6 38.3 46.5 31.7 46.5 24z'/><path fill='%2334A853' d='M10.6 28.45a14.9 14.9 0 0 1 0-8.9l-8.02-6.23A23.98 23.98 0 0 0 0 24c0 3.88.93 7.55 2.57 10.78l8.03-6.33z'/><path fill='%23FBBC05' d='M24 48c6.3 0 11.6-2.08 15.47-5.64l-7.2-5.6c-2 1.35-4.6 2.15-8.27 2.15-6.2 0-11.46-3.54-13.4-8.46l-8.03 6.33C6.5 42.62 14.6 48 24 48z'/></svg>"/>
                  Continue with Google
                </button>
                <button class="oauthBtn" id="oauthApple2">
                  <img alt="" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path fill='%23000' d='M16.365 1.43c0 1.14-.414 2.208-1.243 3.105-.997 1.072-2.61 1.9-4.01 1.785-.174-1.156.33-2.326 1.19-3.26.93-1.01 2.55-1.76 4.063-1.63zM20.5 17.38c-.49 1.13-1.08 2.16-1.78 3.09-.95 1.27-1.73 2.15-2.92 2.17-1.14.02-1.51-.75-2.98-.75-1.47 0-1.89.73-2.96.77-1.15.04-2.03-1.05-2.98-2.32C1.9 19.02 0 15.7 0 12.5c0-3.13 1.99-4.8 3.93-4.8 1.23 0 2.25.83 2.98.83.7 0 2.02-1.03 3.4-.88.58.03 2.22.24 3.27 1.8-.08.05-1.95 1.14-1.93 3.4.03 2.7 2.35 3.6 2.38 3.62z'/></svg>"/>
                  Continue with Apple
                </button>
                <button class="oauthBtn" id="oauthMicrosoft2">
                  <img alt="" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 48 48'><path fill='%23F25022' d='M6 6h17v17H6z'/><path fill='%237FBA00' d='M25 6h17v17H25z'/><path fill='%2300A4EF' d='M6 25h17v17H6z'/><path fill='%23FFB900' d='M25 25h17v17H25z'/></svg>"/>
                  Continue with Microsoft
                </button>
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

  // file name
  const doc = $("#doc");
  const fileName = $("#fileName");
  doc.addEventListener("change", () => {
    fileName.textContent = doc.files?.[0]?.name || "No file chosen";
  });

  // demo auth
  const demo = (label) => alert(`${label} (demo)`);
  ["oauthGoogle","oauthApple","oauthMicrosoft","oauthGoogle2","oauthApple2","oauthMicrosoft2"].forEach(id=>{
    $("#"+id)?.addEventListener("click", ()=>demo("OAuth sign-in"));
  });
  $("#psignin").addEventListener("click", ()=>demo("Sign in"));
  $("#signup").addEventListener("click", ()=>demo("Create account"));
}

function renderLandlord(id) {
  const l = DB.landlords.find(x => x.id === id);
  if (!l) return renderHome();

  const st = ratingStats(l.id);
  const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
  const starVis = st.avgRounded == null ? "☆☆☆☆☆" : (st.avgRounded >= 4 ? "★★★★☆" : st.avgRounded >= 3 ? "★★★☆☆" : st.avgRounded >= 2 ? "★★☆☆☆" : "★☆☆☆☆");

  const cred = casaCredential(l.id);
  const badgeRow = badgesHTML(l);

  const distTotal = st.dist.reduce((a,b)=>a+b,0);
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
              <span class="muted">Rating reflects review recency.</span>
              <span class="pill">${esc(cred === "CASA Rated" ? "CASA Rated" : (st.count ? "Not yet CASA Rated" : "Unrated"))}</span>
            </div>

            <div class="addrLine">
              ${esc(l.address.line1)}${l.address.unit ? `, ${esc(l.address.unit)}` : ""} • ${esc(l.address.city)}, ${esc(l.address.state)}
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
    let marker = null;
    if (typeof l.lat === "number" && typeof l.lng === "number") {
      marker = L.marker([l.lat, l.lng]).addTo(map);
    }
    $("#centerProfile").addEventListener("click", () => {
      map.setView([l.lat ?? 40.73, l.lng ?? -73.95], 14, { animate: true });
      marker?.openPopup?.();
    });
  }, 0);

  // Report
  document.querySelectorAll("[data-report]").forEach(btn => {
    btn.addEventListener("click", () => {
      alert("Report submitted (demo).");
    });
  });

  // Review modal (fixed so map never blocks it)
  $("#rateBtn").addEventListener("click", () => openReviewModal(l.id));
}

/* -----------------------------
   Star picker (WHOLE stars ONLY)
------------------------------ */
function starPickerHTML(defaultValue = 5) {
  const v = Math.max(1, Math.min(5, Number(defaultValue) || 5));

  return `
    <div class="starPicker" id="starPicker" role="radiogroup" aria-label="Rating">
      ${[1,2,3,4,5].map(i => `
        <button type="button" class="starBtn" data-star="${i}" aria-label="${i} stars">
          <span class="starBase">★</span>
          <span class="starFill">★</span>
        </button>
      `).join("")}
      <span class="starValue" id="starValue">${v}/5</span>
      <input type="hidden" id="mStars" value="${v}">
    </div>
  `;
}

function applyStarPickerVisual(value) {
  const v = Math.max(1, Math.min(5, Number(value) || 1));
  const btns = Array.from(document.querySelectorAll("#starPicker .starBtn"));

  btns.forEach(btn => {
    const s = Number(btn.dataset.star);
    // set percent fill (0 or 100)
    btn.style.setProperty("--fill", v >= s ? "100%" : "0%");
  });

  const out = $("#starValue");
  if (out) out.textContent = `${v}/5`;

  const hidden = $("#mStars");
  if (hidden) hidden.value = String(v);
}

function bindStarPicker(defaultValue = 5) {
  let current = Math.max(1, Math.min(5, Number(defaultValue) || 5));
  applyStarPickerVisual(current);

  // hover preview
  document.querySelectorAll("#starPicker .starBtn").forEach(btn => {
    btn.addEventListener("mouseenter", () => {
      applyStarPickerVisual(btn.dataset.star);
    });
  });

  // restore
  $("#starPicker").addEventListener("mouseleave", () => applyStarPickerVisual(current));

  // click set
  document.querySelectorAll("#starPicker .starBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      current = Number(btn.dataset.star);
      applyStarPickerVisual(current);
    });
  });
}

/* Review modal (Interactive stars + halves UI, stores 1..5 int) */
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
        <div class="tiny" style="margin-top:8px;">
        </div>
      </div>

      <div class="field">
        <label>What happened?</label>
        <textarea class="textarea" id="mText" placeholder="Keep it factual and specific."></textarea>
       <div class="tinyNote">Minimum length required...</div>
      </div>
    </div>

    <div class="modalFoot">
      <button class="btn" id="mCancel">Cancel</button>
      <button class="btn btn--primary" id="mSubmit">Submit</button>
    </div>
  `);

  // close
  $("#mClose").addEventListener("click", closeModal);
  $("#mCancel").addEventListener("click", closeModal);

  // init star picker
  bindStarPicker(5);

  $("#mSubmit").addEventListener("click", () => {
    // picker stores 0.5 increments; DB stores integer 1..5
   const starsInt = Math.max(1, Math.min(5, Number($("#mStars").value) || 5));
    const text = $("#mText").value.trim();

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

