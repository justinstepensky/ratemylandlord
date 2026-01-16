/* =========================================================
   casa — app.js (FULL FILE)
   ========================================================= */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (t.style.display = "none"), 2200);
}

/* ---------- Stars (horizontal) ---------- */
function starSVG(on) {
  return `
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="${on ? "var(--starOn)" : "var(--starOff)"}"
        d="M12 17.3l-6.18 3.6 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.63 1.64 7.03z"/>
    </svg>
  `;
}

function starsRow(score) {
  const s = Math.max(0, Math.min(5, Number(score) || 0));
  let out = `<div class="starRow"><div class="starStars">`;
  for (let i = 1; i <= 5; i++) out += starSVG(i <= s);
  out += `</div><div class="scoreText">${s}/5</div></div>`;
  return out;
}

/* =========================================================
   Demo dataset (in-memory)
   ========================================================= */
const landlords = [
  {
    id: "northside",
    name: "Northside Properties",
    addr: "123 Main St • Williamsburg • Brooklyn, NY",
    borough: "Brooklyn",
    lat: 40.7081,
    lng: -73.9571,
    score: 4,
    date: "1/5/2026",
    text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
  },
  {
    id: "parkave",
    name: "Park Ave Management",
    addr: "22 Park Ave • Manhattan • New York, NY",
    borough: "Manhattan",
    lat: 40.7402,
    lng: -73.9857,
    score: 3,
    date: "12/18/2025",
    text: "Great location, but communication was slow. Security deposit itemization took weeks.",
  },
  {
    id: "elmhurst",
    name: "Elmhurst Holdings",
    addr: "86-12 Broadway • Elmhurst • Queens, NY",
    borough: "Queens",
    lat: 40.7427,
    lng: -73.8822,
    score: 5,
    date: "11/30/2025",
    text: "Responsive management. Clear lease terms and quick repairs.",
  },
];

/* =========================================================
   MAP (Leaflet)
   ========================================================= */
let __homeMap = null;
let __homeLayer = null;

let __searchMap = null;
let __searchLayer = null;

function leafletOK() {
  return typeof window.L !== "undefined" && typeof window.L.map === "function";
}

function initMap(elId, which) {
  if (!leafletOK()) return null;

  const el = document.getElementById(elId);
  if (!el) return null;

  // If this element was used before, Leaflet can throw "Map container is already initialized"
  // Safer to reset it.
  el.innerHTML = "";

  const m = window.L.map(elId, { scrollWheelZoom: false }).setView([40.73, -73.97], 11);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(m);

  const layer = window.L.layerGroup().addTo(m);

  if (which === "home") {
    __homeMap = m;
    __homeLayer = layer;
  } else {
    __searchMap = m;
    __searchLayer = layer;
  }

  // 🔥 Critical: force Leaflet to compute correct size after DOM paint
  requestAnimationFrame(() => m.invalidateSize());
  setTimeout(() => m.invalidateSize(), 250);

  return m;
}

function setMarkers(which, list) {
  if (!leafletOK()) return;

  const map = which === "home" ? __homeMap : __searchMap;
  const layer = which === "home" ? __homeLayer : __searchLayer;

  if (!map || !layer) return;

  layer.clearLayers();
  const pts = [];

  list.forEach((x) => {
    if (typeof x.lat !== "number" || typeof x.lng !== "number") return;

    const mk = window.L.marker([x.lat, x.lng]).addTo(layer);
    mk.bindPopup(`
      <div style="min-width:220px;">
        <div style="font-weight:1000;">${esc(x.name)}</div>
        <div style="opacity:.75; font-weight:850; font-size:12.5px; margin-top:2px;">${esc(x.borough || "")}</div>
        <div style="opacity:.75; font-weight:850; font-size:12.5px; margin-top:2px;">${esc(x.addr)}</div>
        <div style="margin-top:8px;">${starsRow(x.score)}</div>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <a class="btn btn--primary" style="text-decoration:none;" href="#/landlord/${esc(x.id)}">View</a>
          <a class="btn btn--outline" style="text-decoration:none;" href="#/review/${esc(x.id)}">Review</a>
        </div>
      </div>
    `);

    pts.push([x.lat, x.lng]);
  });

  if (pts.length) {
    map.fitBounds(window.L.latLngBounds(pts).pad(0.18));
  } else {
    map.setView([40.73, -73.97], 11);
  }

  requestAnimationFrame(() => map.invalidateSize());
  setTimeout(() => map.invalidateSize(), 250);
}

/* =========================================================
   HOME
   ========================================================= */
function renderHome() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="pad hero">
            <div>
              <div class="kicker">CASA</div>
              <h1>Know your landlord<br/>before you sign.</h1>
              <p class="lead">Search landlords, read tenant reviews, and add your building in minutes.</p>
            </div>

            <div class="heroSearch">
              <div class="heroSearch__bar">
                <input id="homeQ" placeholder="Search landlord name, management company, or address..." />
              </div>
              <button class="btn btn--primary" id="homeGo">Search</button>
              <a class="btn btn--outline" href="#/add">Add a landlord</a>
            </div>

            <div class="trustLine">No account required to review. Verified landlords can respond.</div>

            <!-- Tiles (NO Tap/Info labels) -->
            <div class="cards3" style="margin-top:14px;">
              <div class="xCard" role="button" tabindex="0">
                <div class="xCard__top">
                  <div class="xCard__title">
                    <span class="xCard__icon">⌕</span> Search
                  </div>
                </div>
                <div class="xCard__body">Search by name, entity or address</div>
              </div>

              <div class="xCard" role="button" tabindex="0">
                <div class="xCard__top">
                  <div class="xCard__title">
                    <span class="xCard__icon">★</span> Review
                  </div>
                </div>
                <div class="xCard__body">leave a rating based on select categories</div>
              </div>

              <div class="xCard xCard--locked" aria-disabled="true">
                <div class="xCard__top">
                  <div class="xCard__title">
                    <span class="xCard__icon">⌂</span> Rent
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 50/50 Highlights + Map -->
        <div class="grid2">
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Featured Reviews</div>
                <h2>Recent highlights</h2>
                <div class="muted">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn btn--outline" href="#/search">Browse all</a>
            </div>
            <div class="bd">
              <div class="featuredGrid" id="featuredGrid"></div>
            </div>
          </div>

          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Map</div>
                <h2>Browse by location</h2>
                <div class="muted">Pins reflect existing ratings.</div>
              </div>
              <a class="btn btn--outline" href="#/search">Open search</a>
            </div>
            <div class="bd">
              <div class="mapWrap">
                <div id="homeMap"></div>
              </div>
              <div id="homeMapFallback" class="box" style="margin-top:12px; display:none;">
                <div style="font-weight:1000;">Map not loaded</div>
                <div class="tiny" style="margin-top:6px;">Leaflet must be included in index.html.</div>
              </div>
            </div>
          </div>
        </div>

        <footer class="wrap footer">
          <div class="tiny">© ${new Date().getFullYear()} casa</div>
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </footer>
      </div>
    </section>
  `;

  // Featured cards
  const grid = $("#featuredGrid");
  if (grid) {
    grid.innerHTML = landlords.slice(0, 3).map((r) => `
      <div class="smallCard">
        <div class="smallCard__top">
          <div>
            <div class="smallCard__name">${esc(r.name)}</div>
            <div class="smallCard__addr">${esc(r.addr)}</div>
          </div>
          <div class="smallCard__time">${esc(r.date)}</div>
        </div>
        ${starsRow(r.score)}
        <div class="smallCard__text">${esc(r.text)}</div>
        <div class="smallCard__foot">
          <span class="tiny">${esc(r.borough || "")}</span>
          <a class="btn btn--outline" href="#/landlord/${esc(r.id)}">View</a>
        </div>
      </div>
    `).join("");
  }

  // Home search
  const homeQ = $("#homeQ");
  $("#homeGo")?.addEventListener("click", () => {
    const q = (homeQ?.value || "").trim();
    location.hash = "#/search?q=" + encodeURIComponent(q);
  });
  homeQ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#homeGo")?.click();
  });

  // Tiles toggle (only clickable ones)
  document.querySelectorAll(".xCard:not(.xCard--locked)").forEach((c) => {
    c.addEventListener("click", () => c.classList.toggle("open"));
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") c.classList.toggle("open");
    });
  });

  // Home map
  if (!leafletOK()) {
    $("#homeMap") && ($("#homeMap").style.display = "none");
    $("#homeMapFallback") && ($("#homeMapFallback").style.display = "block");
  } else {
    initMap("homeMap", "home");
    setMarkers("home", landlords);
  }
}

/* =========================================================
   SEARCH
   ========================================================= */
function renderSearch() {
  const app = $("#app");
  if (!app) return;

  const raw = location.hash || "#/search";
  const queryString = raw.includes("?") ? raw.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const initial = params.get("q") || "";

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Search</div>
              <h2>Find a landlord</h2>
              <div class="muted">Search by name, company, or address. Filter by borough. Browse on the map.</div>
            </div>
            <a class="btn btn--outline" href="#/add">Add landlord</a>
          </div>

          <div class="bd">
            <div class="searchHero">
              <div class="heroSearch__bar">
                <input id="q" placeholder="Type a landlord name or address..." value="${esc(initial)}" />
              </div>
              <button class="btn btn--primary" id="doSearch">Search</button>
            </div>

            <div class="filtersRow">
              <div class="field">
                <label>Borough</label>
                <select id="borough">
                  <option value="">All boroughs</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                </select>
              </div>

              <div class="field">
                <label>Min rating</label>
                <select id="minr">
                  <option value="">Any</option>
                  <option value="5">5 stars</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                </select>
              </div>
            </div>

            <div class="mapWrap" style="margin-top:12px;">
              <div id="searchMap"></div>
            </div>

            <div id="searchMapFallback" class="box" style="margin-top:12px; display:none;">
              <div style="font-weight:1000;">Map not loaded</div>
              <div class="tiny" style="margin-top:6px;">Leaflet must be included in index.html.</div>
            </div>

            <div id="results"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  function run() {
    const query = ($("#q").value || "").trim().toLowerCase();
    const borough = ($("#borough").value || "").trim();
    const minr = Number($("#minr").value || 0);

    let list = landlords.slice();

    if (query) {
      list = list.filter((x) =>
        x.name.toLowerCase().includes(query) ||
        x.addr.toLowerCase().includes(query)
      );
    }
    if (borough) list = list.filter((x) => (x.borough || "") === borough);
    if (minr) list = list.filter((x) => (Number(x.score) || 0) >= minr);

    $("#results").innerHTML = list.length
      ? list.map((x) => `
        <div class="rowCard">
          <div style="flex:1;">
            <div class="rowTitle">${esc(x.name)}</div>
            <div class="rowSub">${esc(x.addr)}</div>
            <div class="tiny" style="margin-top:6px;">${esc(x.borough || "")}</div>
            ${starsRow(x.score)}
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; justify-content:center;">
            <a class="btn btn--primary" href="#/landlord/${esc(x.id)}">View</a>
            <a class="btn btn--outline" href="#/review/${esc(x.id)}">Write review</a>
          </div>
        </div>
      `).join("")
      : `
        <div class="box" style="margin-top:12px;">
          <div style="font-weight:1000;">No results</div>
          <div class="tiny" style="margin-top:6px;">Try a different search or change filters.</div>
        </div>
      `;

    if (leafletOK()) setMarkers("search", list);
  }

  // Search map
  if (!leafletOK()) {
    $("#searchMap") && ($("#searchMap").style.display = "none");
    $("#searchMapFallback") && ($("#searchMapFallback").style.display = "block");
  } else {
    initMap("searchMap", "search");
    setMarkers("search", landlords);
  }

  $("#doSearch")?.addEventListener("click", run);
  $("#q")?.addEventListener("keydown", (e) => (e.key === "Enter" ? run() : null));
  ["borough", "minr"].forEach((id) => document.getElementById(id)?.addEventListener("change", run));

  run();
}

/* =========================================================
   ADD LANDLORD (demo)
   ========================================================= */
function renderAdd() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Add landlord</div>
              <h2>Add a missing profile</h2>
              <div class="muted">No account required. Keep it factual and specific.</div>
            </div>
            <a class="btn btn--ghost" href="#/search">Search</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="field">
                <label>Landlord / Company name</label>
                <input id="name" placeholder="e.g., Northside Properties" />
              </div>
              <div class="field">
                <label>Address</label>
                <input id="addr" placeholder="e.g., 123 Main St, Brooklyn, NY" />
              </div>
            </div>

            <div class="split2" style="margin-top:12px;">
              <div class="field">
                <label>Borough</label>
                <select id="boro">
                  <option value="">Select borough</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                </select>
              </div>
              <div class="field">
                <label>Coordinates (optional)</label>
                <input id="coords" placeholder="lat,lng (e.g., 40.7081,-73.9571)" />
              </div>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn btn--ghost" href="#/">Cancel</a>
              <button class="btn btn--primary" id="submit">Add landlord</button>
            </div>

            <div class="tiny" style="margin-top:10px;">
              Demo mode: this adds to memory only (won’t persist after refresh).
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#submit")?.addEventListener("click", () => {
    const name = ($("#name").value || "").trim();
    const addr = ($("#addr").value || "").trim();
    const borough = ($("#boro").value || "").trim();
    const coords = ($("#coords").value || "").trim();

    if (!name || !addr) return toast("Add name + address.");

    let lat, lng;
    if (coords.includes(",")) {
      const [a, b] = coords.split(",").map((x) => Number(x.trim()));
      if (!Number.isNaN(a) && !Number.isNaN(b)) { lat = a; lng = b; }
    }

    const id =
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48)
      || "landlord-" + Date.now();

    landlords.unshift({
      id,
      name,
      addr,
      borough: borough || "",
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
      score: 0,
      date: new Date().toLocaleDateString(),
      text: "New listing (no reviews yet).",
    });

    toast("Added (demo): " + name);
    location.hash = "#/search?q=" + encodeURIComponent(name);
  });
}

/* =========================================================
   LANDLORD PROFILE + REVIEW
   ========================================================= */
function renderLandlord(id) {
  const app = $("#app");
  if (!app) return;

  const l = landlords.find((x) => x.id === id);
  if (!l) {
    app.innerHTML = `
      <section class="section"><div class="wrap">
        <div class="card pad">
          <h2>Not found</h2>
          <div class="muted">That landlord profile doesn’t exist.</div>
          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/search">Search</a>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>
        </div>
      </div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Landlord</div>
              <h2>${esc(l.name)}</h2>
              <div class="muted">${esc(l.addr)}</div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--outline" href="#/search">Back</a>
              <a class="btn btn--primary" href="#/review/${esc(l.id)}">Write review</a>
            </div>
          </div>

          <div class="bd">
            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">Overall rating</div>
                ${starsRow(l.score)}
                <div class="tiny" style="margin-top:6px;">${esc(l.borough || "")}</div>
              </div>
              <div class="box" style="flex:1;">
                <div style="font-weight:1000;">Latest highlight</div>
                <div class="tiny" style="margin-top:6px;">${esc(l.date)}</div>
                <div style="margin-top:10px; font-weight:850; color:rgba(35,24,16,.78); line-height:1.35;">
                  ${esc(l.text)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderReview(id) {
  const app = $("#app");
  if (!app) return;

  const l = landlords.find((x) => x.id === id);
  if (!l) return renderLandlord(id);

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Write a review</div>
              <h2>${esc(l.name)}</h2>
              <div class="muted">${esc(l.addr)}</div>
            </div>
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Back</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="field">
                <label>Overall rating</label>
                <select id="rScore">
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Okay</option>
                  <option value="2">2 — Bad</option>
                  <option value="1">1 — Terrible</option>
                </select>
              </div>
              <div class="field">
                <label>Borough (optional)</label>
                <select id="rBoro">
                  <option value="">Use existing</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                </select>
              </div>
            </div>

            <div class="field" style="margin-top:12px;">
              <label>What happened?</label>
              <textarea id="rText" placeholder="Stick to facts: repairs, communication, safety, deposit, etc."></textarea>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Cancel</a>
              <button class="btn btn--primary" id="submitReview">Submit review</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#submitReview")?.addEventListener("click", () => {
    const score = Number($("#rScore").value || 0);
    const text = ($("#rText").value || "").trim();
    const boro = ($("#rBoro").value || "").trim();
    if (!text) return toast("Write a short description.");

    l.score = Math.max(1, Math.min(5, score || 0));
    l.text = text;
    l.date = new Date().toLocaleDateString();
    if (boro) l.borough = boro;

    toast("Posted (demo).");
    location.hash = "#/landlord/" + encodeURIComponent(l.id);
  });
}

/* =========================================================
   HOW / TRUST
   ========================================================= */
function renderHow() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">How it works</div>
              <h2>Simple, fast, and public</h2>
              <div class="muted">No reviewer accounts. Landlords verify to respond.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Search</div>
              <div class="rowSub">Find a landlord by name, company, address, borough, or map.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Review</div>
              <div class="rowSub">Post instantly (no account). Keep it factual and specific.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Verified responses</div>
              <div class="rowSub">Landlords verify documents before responding publicly.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Reporting</div>
              <div class="rowSub">Report spam, harassment, or personal information.</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTrust() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Trust & Safety</div>
              <h2>Built for accuracy and accountability</h2>
              <div class="muted">Clear rules + verified landlord responses.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">No reviewer accounts</div>
              <div class="rowSub">Tenants can post without accounts. Reviews should be factual and specific.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Verified landlord responses</div>
              <div class="rowSub">Landlords verify documents before responding publicly.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">No personal info</div>
              <div class="rowSub">Do not post phone numbers, emails, or private details.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Reporting</div>
              <div class="rowSub">Report spam, harassment, or inaccurate listings for moderation.</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* =========================================================
   LANDLORD PORTAL (inline SVG logos; no CSS dependency)
   ========================================================= */
function googleIcon() {
  return `
    <svg class="oauthSvg" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.18 3.22l6.82-6.82C35.86 2.36 30.28 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.93 6.16C12.36 13.02 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.43-4.74H24v9.01h12.7c-.55 2.96-2.2 5.47-4.67 7.16l7.16 5.55C43.88 36.52 46.5 30.78 46.5 24z"/>
      <path fill="#FBBC05" d="M10.49 28.38A14.5 14.5 0 0 1 9.5 24c0-1.52.26-2.99.74-4.38l-7.93-6.16A23.9 23.9 0 0 0 0 24c0 3.85.92 7.49 2.56 10.78l7.93-6.4z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.9-5.78l-7.16-5.55c-1.99 1.34-4.54 2.13-8.74 2.13-6.26 0-11.64-3.52-13.51-8.62l-7.93 6.4C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  `;
}

function appleIcon() {
  return `
    <svg class="oauthSvg" viewBox="0 0 384 512" aria-hidden="true">
      <path fill="#111" d="M318.7 268.6c-.3-52.6 43.1-77.8 45.1-79.1-24.6-35.9-62.9-40.8-76.4-41.4-32.6-3.3-63.7 19.2-80.2 19.2-16.5 0-42-18.7-69-18.2-35.5.5-68.2 20.6-86.5 52.4-36.9 64-9.4 158.7 26.5 210.6 17.6 25.4 38.6 54 66.2 52.9 26.6-1.1 36.7-17.2 68.8-17.2 32.1 0 41.2 17.2 69.1 16.6 28.5-.5 46.6-25.9 64.1-51.4 20.2-29.5 28.6-58 28.9-59.5-.6-.3-55.4-21.3-55.6-84.9zM259.5 78.7c14.6-17.7 24.4-42.2 21.7-66.7-21.1.8-46.6 14.1-61.7 31.8-13.6 15.7-25.5 40.8-22.3 64.8 23.5 1.8 47.7-12 62.3-29.9z"/>
    </svg>
  `;
}

function microsoftIcon() {
  return `
    <svg class="oauthSvg" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  `;
}

function renderPortal() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Landlord Portal</div>
              <h2>Sign in</h2>
              <div class="muted">Landlords verify documents before responding publicly.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="card" style="box-shadow:none;">
                <div class="pad">
                  <div class="kicker">Sign in</div>
                  <div class="field" style="margin-top:10px;">
                    <label>Email</label>
                    <input id="le" placeholder="you@company.com"/>
                  </div>
                  <div class="field" style="margin-top:10px;">
                    <label>Password</label>
                    <input id="lp" type="password" placeholder="Password"/>
                  </div>
                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="login">Sign in</button>

                  <div class="tiny" style="margin:12px 0 10px; text-align:center;">or continue with</div>

                  <button class="btn btn--outline btn--block oauthBtn" id="g">
                    ${googleIcon()} <span>Continue with Google</span>
                  </button>
                  <div style="height:8px;"></div>
                  <button class="btn btn--outline btn--block oauthBtn" id="a">
                    ${appleIcon()} <span>Continue with Apple</span>
                  </button>
                  <div style="height:8px;"></div>
                  <button class="btn btn--outline btn--block oauthBtn" id="m">
                    ${microsoftIcon()} <span>Continue with Microsoft</span>
                  </button>
                </div>
              </div>

              <div class="card" style="box-shadow:none;">
                <div class="pad">
                  <div class="kicker">Create account</div>
                  <div class="field" style="margin-top:10px;">
                    <label>Email</label>
                    <input id="se" placeholder="you@company.com"/>
                  </div>
                  <div class="field" style="margin-top:10px;">
                    <label>Password</label>
                    <input id="sp" type="password" placeholder="Create a password"/>
                  </div>
                  <div class="field" style="margin-top:10px;">
                    <label>Verification document (demo)</label>
                    <input id="doc" type="file"/>
                    <div class="tiny" style="margin-top:6px;">Lease header, LLC registration, management agreement, etc.</div>
                  </div>
                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">Create account</button>
                  <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#login")?.addEventListener("click", () => {
    const e = ($("#le").value || "").trim();
    const p = ($("#lp").value || "").trim();
    if (!e || !p) return toast("Enter email + password.");
    toast("Signed in (demo).");
  });

  $("#signup")?.addEventListener("click", () => {
    const e = ($("#se").value || "").trim();
    const p = ($("#sp").value || "").trim();
    const f = $("#doc")?.files?.[0];
    if (!e || !p) return toast("Enter email + password.");
    if (!f) return toast("Upload a verification document.");
    toast("Submitted for verification (demo).");
  });

  ["g", "a", "m"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => toast("OAuth (demo only)."));
  });
}

/* =========================================================
   ROUTER
   ========================================================= */
function route() {
  const raw = location.hash || "#/";
  const [pathPart] = raw.replace(/^#/, "").split("?");
  const parts = pathPart.split("/").filter(Boolean);

  if (parts.length === 0) return renderHome();

  const page = parts[0];

  if (page === "search") return renderSearch();
  if (page === "add") return renderAdd();
  if (page === "how") return renderHow();
  if (page === "trust") return renderTrust();
  if (page === "portal") return renderPortal();
  if (page === "landlord" && parts[1]) return renderLandlord(parts[1]);
  if (page === "review" && parts[1]) return renderReview(parts[1]);

  renderHome();
}

function boot() {
  window.addEventListener("hashchange", route);
  if (!location.hash) location.hash = "#/";
  route();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
