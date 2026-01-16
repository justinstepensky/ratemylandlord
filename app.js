/* =========================================================
   CASA — Single-file SPA (GitHub Pages friendly)
   - No reviewer accounts
   - Landlord Portal (demo auth)
   - Home: Search/Review/Rent tiles (no tap/info), highlights autoplay, map visible
   - Search: matches aesthetic + borough filter + map
   ========================================================= */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

/* ---------- Demo data ---------- */
const BOROUGHS = ["Brooklyn","Manhattan","Queens","Bronx","Staten Island"];

const DEMO_LANDLORDS = [
  {
    id: "northside",
    name: "Northside Properties",
    addr: "123 Main St • Williamsburg • Brooklyn, NY",
    borough: "Brooklyn",
    lat: 40.7128,
    lng: -73.9654,
    score: 4,
    date: "1/5/2026",
    text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently."
  },
  {
    id: "parkave",
    name: "Park Ave Management",
    addr: "22 Park Ave • Manhattan • New York, NY",
    borough: "Manhattan",
    lat: 40.7412,
    lng: -73.9857,
    score: 3,
    date: "12/18/2025",
    text: "Great location, but communication was slow. Security deposit itemization took weeks."
  },
  {
    id: "elmhurst",
    name: "Elmhurst Holdings",
    addr: "86-12 Broadway • Elmhurst • Queens, NY",
    borough: "Queens",
    lat: 40.7433,
    lng: -73.8840,
    score: 5,
    date: "11/30/2025",
    text: "Responsive management. Clear lease terms and quick repairs."
  },
];

function loadLandlords(){
  const key = "casa_landlords_v1";
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  localStorage.setItem(key, JSON.stringify(DEMO_LANDLORDS));
  return [...DEMO_LANDLORDS];
}
function saveLandlords(list){
  localStorage.setItem("casa_landlords_v1", JSON.stringify(list));
}

/* ---------- Stars (horizontal) ---------- */
function starSVG(on){
  const fill = on ? "var(--starOn)" : "var(--starOff)";
  return `
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="${fill}" d="M12 2.6l2.95 6.15 6.78.98-4.9 4.77 1.16 6.74L12 18.9 6.01 21.24l1.16-6.74-4.9-4.77 6.78-.98L12 2.6z"/>
    </svg>
  `;
}
function starsRow(score){
  const s = Math.max(0, Math.min(5, Number(score)||0));
  const stars = Array.from({length:5}, (_,i)=> starSVG(i < s)).join("");
  return `
    <div class="starRow">
      <div class="starStars" aria-label="${s} out of 5">${stars}</div>
      <div class="scoreText">${s}/5</div>
    </div>
  `;
}

/* ---------- Toast (minimal) ---------- */
function toast(msg){
  alert(msg);
}

/* ---------- Autoplay horizontal carousel ---------- */
function setupAutoCarousel(trackEl, opts = {}) {
  const intervalMs = opts.intervalMs ?? 3200;
  const stepPx = opts.stepPx ?? 380;

  if (!trackEl) return;
  let timer = null;
  let paused = false;

  const start = () => {
    stop();
    timer = setInterval(() => {
      if (paused) return;

      const max = trackEl.scrollWidth - trackEl.clientWidth;
      const next = Math.min(trackEl.scrollLeft + stepPx, max);

      if (trackEl.scrollLeft >= max - 2) {
        trackEl.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        trackEl.scrollTo({ left: next, behavior: "smooth" });
      }
    }, intervalMs);
  };

  const stop = () => { if (timer) clearInterval(timer); timer = null; };

  trackEl.addEventListener("mouseenter", () => (paused = true));
  trackEl.addEventListener("mouseleave", () => (paused = false));

  let resumeT = null;
  const userPause = () => {
    paused = true;
    if (resumeT) clearTimeout(resumeT);
    resumeT = setTimeout(() => (paused = false), 900);
  };
  trackEl.addEventListener("scroll", userPause, { passive: true });
  trackEl.addEventListener("touchstart", () => (paused = true), { passive: true });
  trackEl.addEventListener("touchend", userPause, { passive: true });
  trackEl.addEventListener("pointerdown", () => (paused = true));
  trackEl.addEventListener("pointerup", userPause);

  trackEl.addEventListener("wheel", (e) => {
    if (e.shiftKey) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    trackEl.scrollLeft += delta;
    e.preventDefault();
    userPause();
  }, { passive: false });

  start();
  return { start, stop };
}

/* ---------- Map helpers (Leaflet) ---------- */
function initLeafletMap(containerId, points, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el) return null;

  if (!window.L) {
    el.innerHTML = `<div class="pad muted">Map library didn’t load. Refresh or check internet.</div>`;
    return null;
  }

  // wipe previous map instance DOM safely
  el.innerHTML = "";

  const center = opts.center || [40.735, -73.98];
  const zoom = opts.zoom || 11;

  const map = L.map(el, { zoomControl: true }).setView(center, zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  points.forEach(p => {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
    const popup = `
      <div style="font-weight:900; margin-bottom:4px;">${esc(p.name)}</div>
      <div style="color: rgba(35,24,16,.70); font-weight:850; font-size:12px;">${esc(p.borough || "")}</div>
      <div style="margin-top:6px;">${starsRow(p.score)}</div>
      <div style="margin-top:8px;">
        <a href="#/search?q=${encodeURIComponent(p.name)}" style="font-weight:950; text-decoration:underline; text-underline-offset:3px;">
          View in Search
        </a>
      </div>
    `;
    L.marker([p.lat, p.lng]).addTo(map).bindPopup(popup);
  });

  return map;
}

/* ---------- Routing ---------- */
function getRoute(){
  const hash = location.hash || "#/";
  const [path, qs] = hash.slice(1).split("?");
  const params = new URLSearchParams(qs || "");
  return { path: path || "/", params };
}

function renderError(err){
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card pad">
          <div class="kicker">Error</div>
          <h2>Something broke</h2>
          <div class="muted" style="margin-top:8px;">${esc(err?.message || String(err))}</div>
          <div style="height:12px;"></div>
          <a class="btn btn--primary" href="#/">Go home</a>
        </div>
      </div>
    </section>
  `;
}

function router(){
  try{
    const { path, params } = getRoute();
    if (path === "/" || path === "") return renderHome();
    if (path === "/search") return renderSearch(params);
    if (path === "/add") return renderAdd();
    if (path === "/how") return renderHow();
    if (path === "/trust") return renderTrust();
    if (path === "/portal") return renderPortal();
    return renderHome();
  } catch (e) {
    console.error(e);
    renderError(e);
  }
}

/* ---------- Pages ---------- */
function renderHome(){
  const app = document.getElementById("app");
  if (!app) return;

  const landlords = loadLandlords();

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">casa</div>
              <h1>Know your landlord<br/>before you sign.</h1>
              <div class="lead">Search landlords, read tenant reviews, and add your building in minutes.</div>
            </div>
          </div>

          <div class="bd">
            <div class="hero">
              <div class="heroSearch">
                <div class="heroSearch__bar">
                  <input id="homeQ" placeholder="Search landlord name, management company, or address..." />
                </div>
                <a class="btn btn--primary" id="homeGo" href="#/search">Search</a>
                <a class="btn btn--outline" href="#/add">Add a landlord</a>
              </div>

              <!-- tiles: Search / Review / Rent (no numbers, no tap/info) -->
              <div class="cards3" style="margin-top:10px;">
                <div class="xCard" id="tSearch" role="button" tabindex="0">
                  <div class="xCard__top">
                    <div class="xCard__title"><span class="xCard__icon">⌕</span>Search</div>
                  </div>
                  <div class="xCard__body">Search by name, entity or address</div>
                </div>

                <div class="xCard" id="tReview" role="button" tabindex="0">
                  <div class="xCard__top">
                    <div class="xCard__title"><span class="xCard__icon">★</span>Review</div>
                  </div>
                  <div class="xCard__body">Leave a rating based on select categories</div>
                </div>

                <div class="xCard disabled" aria-disabled="true">
                  <div class="xCard__top">
                    <div class="xCard__title"><span class="xCard__icon">⌂</span>Rent</div>
                  </div>
                  <div class="xCard__body"></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- highlights + map (half / half) -->
        <div class="grid2">
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Featured reviews</div>
                <h2>Recent highlights</h2>
                <div class="muted">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn btn--ghost" href="#/search">Browse all</a>
            </div>
            <div class="bd">
              <div class="carousel" aria-label="Recent highlights carousel">
                <div class="carousel__track" id="featuredGrid"></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Map</div>
                <h2>Browse by location</h2>
                <div class="muted">Pins reflect existing ratings.</div>
              </div>
              <a class="btn btn--ghost" href="#/search">Open search</a>
            </div>
            <div class="bd">
              <div class="mapBox">
                <div id="homeMap"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer wrap" style="padding-left:0; padding-right:0;">
          <div class="tiny">© ${new Date().getFullYear()} casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust &amp; Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>

      </div>
    </section>
  `;

  // tiles: open/close only for Search & Review
  const toggle = (el) => el.classList.toggle("open");
  $("#tSearch")?.addEventListener("click", () => toggle($("#tSearch")));
  $("#tReview")?.addEventListener("click", () => toggle($("#tReview")));
  $("#tSearch")?.addEventListener("keydown", (e) => { if(e.key==="Enter"||e.key===" ") toggle($("#tSearch")); });
  $("#tReview")?.addEventListener("keydown", (e) => { if(e.key==="Enter"||e.key===" ") toggle($("#tReview")); });

  // home search button -> keep query
  $("#homeGo")?.addEventListener("click", (e) => {
    const q = ($("#homeQ")?.value || "").trim();
    if (q) {
      e.preventDefault();
      location.hash = `#/search?q=${encodeURIComponent(q)}`;
    }
  });
  $("#homeQ")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = ($("#homeQ")?.value || "").trim();
      location.hash = `#/search?q=${encodeURIComponent(q)}`;
    }
  });

  // featured carousel
  const grid = document.getElementById("featuredGrid");
  if (grid) {
    const items = [...landlords].sort((a,b)=> (new Date(b.date) - new Date(a.date))).slice(0, 10);
    grid.innerHTML = items.map((r) => `
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
          <a class="btn btn--outline" href="#/search?q=${encodeURIComponent(r.name)}">View</a>
        </div>
      </div>
    `).join("");

    setupAutoCarousel(grid, { intervalMs: 3000, stepPx: 380 });
  }

  // map
  initLeafletMap("homeMap", landlords, { center: [40.735, -73.98], zoom: 11 });
}

function renderSearch(params){
  const app = document.getElementById("app");
  if (!app) return;

  const landlords = loadLandlords();
  const q = (params.get("q") || "").trim();
  const b = (params.get("b") || "").trim();

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Search</div>
              <h2>Find a landlord</h2>
              <div class="muted">Search by name, entity or address. Filter by borough.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="heroSearch" style="justify-content:flex-start;">
              <div class="heroSearch__bar" style="max-width:720px;">
                <input id="sq" value="${esc(q)}" placeholder="Search landlord name, management company, or address..." />
              </div>

              <div class="field" style="min-width:220px; margin:0;">
                <select id="sb">
                  <option value="">All boroughs</option>
                  ${BOROUGHS.map(x => `<option value="${esc(x)}" ${x===b?"selected":""}>${esc(x)}</option>`).join("")}
                </select>
              </div>

              <button class="btn btn--primary" id="sGo">Search</button>
            </div>

            <div class="grid2" style="margin-top:14px;">
              <div>
                <div id="results"></div>
              </div>

              <div>
                <div class="mapBox">
                  <div id="searchMap"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  `;

  function apply(){
    const qq = ($("#sq")?.value || "").trim().toLowerCase();
    const bb = ($("#sb")?.value || "").trim();

    const filtered = landlords.filter(x => {
      const text = `${x.name} ${x.addr} ${x.borough}`.toLowerCase();
      const okQ = !qq || text.includes(qq);
      const okB = !bb || x.borough === bb;
      return okQ && okB;
    });

    const res = document.getElementById("results");
    if (res) {
      if (!filtered.length) {
        res.innerHTML = `
          <div class="card pad" style="box-shadow:none;">
            <div class="kicker">No matches</div>
            <div class="muted" style="margin-top:8px;">Try a different name/address or remove the borough filter.</div>
            <div style="height:10px;"></div>
            <a class="btn btn--outline" href="#/add">Add a landlord</a>
          </div>
        `;
      } else {
        res.innerHTML = filtered.map(r => `
          <div class="smallCard" style="margin-bottom:12px;">
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
              <button class="btn btn--outline" data-jump="${esc(r.id)}">Center on map</button>
            </div>
          </div>
        `).join("");
      }
    }

    // map
    const map = initLeafletMap("searchMap", filtered.length ? filtered : landlords, { center: [40.735, -73.98], zoom: 11 });

    // center buttons
    $$("[data-jump]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-jump");
        const found = landlords.find(x => x.id === id);
        if (!found || !map || !window.L) return;
        map.setView([found.lat, found.lng], 14);
      });
    });
  }

  $("#sGo")?.addEventListener("click", () => apply());
  $("#sq")?.addEventListener("keydown", (e) => { if (e.key==="Enter") apply(); });
  $("#sb")?.addEventListener("change", () => apply());

  // initial render
  apply();
}

function renderAdd(){
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Add landlord</div>
              <h2>Add a landlord / building</h2>
              <div class="muted">Demo mode: this saves locally in your browser.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div>
                <div class="field">
                  <label>Landlord / Company Name</label>
                  <input id="an" placeholder="e.g., Northside Properties"/>
                </div>
                <div class="field" style="margin-top:10px;">
                  <label>Address (display)</label>
                  <input id="aa" placeholder="e.g., 123 Main St • Williamsburg • Brooklyn, NY"/>
                </div>
                <div class="field" style="margin-top:10px;">
                  <label>Borough</label>
                  <select id="ab">
                    ${BOROUGHS.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("")}
                  </select>
                </div>
              </div>

              <div>
                <div class="field">
                  <label>Pin location (lat)</label>
                  <input id="alat" placeholder="40.7128"/>
                </div>
                <div class="field" style="margin-top:10px;">
                  <label>Pin location (lng)</label>
                  <input id="alng" placeholder="-73.9654"/>
                </div>
                <div class="field" style="margin-top:10px;">
                  <label>Starter rating (1–5)</label>
                  <select id="as">
                    <option>5</option><option>4</option><option>3</option><option>2</option><option>1</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="field" style="margin-top:10px;">
              <label>Starter review text</label>
              <textarea id="at" placeholder="Short summary..."></textarea>
            </div>

            <button class="btn btn--primary" style="margin-top:12px;" id="addBtn">Add landlord</button>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#addBtn")?.addEventListener("click", () => {
    const landlords = loadLandlords();

    const name = ($("#an")?.value || "").trim();
    const addr = ($("#aa")?.value || "").trim();
    const borough = ($("#ab")?.value || "").trim();
    const lat = Number(($("#alat")?.value || "").trim());
    const lng = Number(($("#alng")?.value || "").trim());
    const score = Number(($("#as")?.value || "5").trim());
    const text = ($("#at")?.value || "").trim();

    if (!name || !addr || !borough || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return toast("Please fill name, address, borough, lat, and lng.");
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,40) + "-" + Math.random().toString(16).slice(2,6);

    landlords.unshift({
      id, name, addr, borough, lat, lng,
      score: Math.max(1, Math.min(5, score || 5)),
      date: new Date().toLocaleDateString(),
      text: text || "New listing added."
    });

    saveLandlords(landlords);
    location.hash = `#/search?q=${encodeURIComponent(name)}`;
  });
}

function renderHow(){
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">How it works</div>
              <h2>Simple, fast, and public</h2>
              <div class="muted">Search and review without creating an account. Landlords verify to respond.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="card pad" style="box-shadow:none; background: rgba(255,249,240,.75);">
              <div style="font-weight:1000; color: var(--ink);">1) Search</div>
              <div class="muted" style="margin-top:6px;">Find a landlord by name, entity, address, or borough.</div>
            </div>

            <div style="height:10px;"></div>

            <div class="card pad" style="box-shadow:none; background: rgba(255,249,240,.75);">
              <div style="font-weight:1000; color: var(--ink);">2) Review</div>
              <div class="muted" style="margin-top:6px;">Post instantly (demo). Ratings appear on the map.</div>
            </div>

            <div style="height:10px;"></div>

            <div class="card pad" style="box-shadow:none; background: rgba(255,249,240,.75);">
              <div style="font-weight:1000; color: var(--ink);">3) Landlord responses</div>
              <div class="muted" style="margin-top:6px;">Landlords use the Landlord Portal and verify documents before responding publicly (demo UI).</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTrust(){
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Trust & Safety</div>
              <h2>Built for accuracy and accountability</h2>
              <div class="muted">Clear rules + verified landlord responses (demo).</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="card pad" style="box-shadow:none; background: rgba(255,249,240,.75);">
              <div style="font-weight:1000; color: var(--ink);">No personal info</div>
              <div class="muted" style="margin-top:6px;">Do not post phone numbers, emails, or sensitive details.</div>
            </div>

            <div style="height:10px;"></div>

            <div class="card pad" style="box-shadow:none; background: rgba(255,249,240,.75);">
              <div style="font-weight:1000; color: var(--ink);">Report issues</div>
              <div class="muted" style="margin-top:6px;">Spam, harassment, and inaccuracies can be flagged (demo copy).</div>
            </div>

            <div style="height:10px;"></div>

            <div class="card pad" style="box-shadow:none; background: rgba(255,249,240,.75);">
              <div style="font-weight:1000; color: var(--ink);">Verified landlord responses</div>
              <div class="muted" style="margin-top:6px;">Landlords upload documentation before responding publicly (demo UI).</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ---------- OAuth Icons (inline SVG) ---------- */
function iconGoogle(){
  return `
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.02 1.53 7.4 2.81l5.41-5.41C33.69 4.06 29.28 2 24 2 14.73 2 6.98 7.39 3.36 15.21l6.64 5.16C11.61 14.25 17.31 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.57-.14-3.08-.4-4.5H24v9h12.4c-.54 2.9-2.18 5.36-4.62 7.02l7.06 5.48C42.96 37.36 46.1 31.45 46.1 24.5z"/>
      <path fill="#FBBC05" d="M10 28.37c-.49-1.46-.77-3.02-.77-4.62 0-1.6.28-3.16.77-4.62l-6.64-5.16C1.98 17.39 1.2 20.11 1.2 23.75c0 3.64.78 6.36 2.16 9.78L10 28.37z"/>
      <path fill="#34A853" d="M24 46c5.28 0 9.72-1.74 12.96-4.72l-7.06-5.48c-1.96 1.32-4.47 2.1-5.9 2.1-6.69 0-12.39-4.75-14-10.87l-6.64 5.16C6.98 40.61 14.73 46 24 46z"/>
    </svg>
  `;
}
function iconApple(){
  return `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M16.365 1.43c0 1.14-.41 2.2-1.19 3.07-.77.87-2.05 1.54-3.17 1.44-.14-1.1.45-2.26 1.16-3.07.79-.91 2.14-1.58 3.2-1.44z"/>
      <path fill="currentColor" d="M20.8 17.02c-.55 1.27-.82 1.84-1.53 2.97-.99 1.55-2.39 3.48-4.12 3.5-1.54.01-1.94-1-4.03-1-2.09 0-2.53.98-4.06 1.02-1.72.06-3.04-1.72-4.03-3.27C1.2 17.7.0 13.03 1.85 9.82c.99-1.72 2.71-2.73 4.53-2.73 1.78 0 2.89 1 4.35 1 1.42 0 2.28-1 4.33-1 1.62 0 3.34.89 4.31 2.43-3.76 2.06-3.15 7.43.43 8.5z"/>
    </svg>
  `;
}
function iconMicrosoft(){
  return `
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#F35325" d="M6 6h17v17H6z"/>
      <path fill="#81BC06" d="M25 6h17v17H25z"/>
      <path fill="#05A6F0" d="M6 25h17v17H6z"/>
      <path fill="#FFBA08" d="M25 25h17v17H25z"/>
    </svg>
  `;
}

function renderPortal(){
  const app = document.getElementById("app");
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

              <!-- Sign in -->
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

                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="login">
                    Sign in
                  </button>

                  <div class="tiny" style="margin:12px 0 10px; text-align:center;">or continue with</div>

                  <button class="btn btn--outline btn--block socialBtn" id="g">
                    <span class="socialBtn__ic">${iconGoogle()}</span>
                    <span>Continue with Google</span>
                  </button>

                  <div style="height:8px;"></div>

                  <button class="btn btn--outline btn--block socialBtn" id="a">
                    <span class="socialBtn__ic">${iconApple()}</span>
                    <span>Continue with Apple</span>
                  </button>

                  <div style="height:8px;"></div>

                  <button class="btn btn--outline btn--block socialBtn" id="m">
                    <span class="socialBtn__ic">${iconMicrosoft()}</span>
                    <span>Continue with Microsoft</span>
                  </button>
                </div>
              </div>

              <!-- Create account (premium file input + oauth) -->
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

                    <input id="doc" class="fileNative" type="file"/>

                    <div class="fileRow" style="margin-top:8px;">
                      <button type="button" class="btn btn--outline" id="pickDoc">
                        Choose file
                      </button>

                      <div class="fileName" id="docName">No file selected</div>
                    </div>

                    <div class="tiny" style="margin-top:8px;">
                      Lease header, LLC registration, management agreement, etc.
                    </div>
                  </div>

                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">
                    Create account
                  </button>

                  <div class="tiny" style="margin:12px 0 10px; text-align:center;">or continue with</div>

                  <button class="btn btn--outline btn--block socialBtn" id="sg">
                    <span class="socialBtn__ic">${iconGoogle()}</span>
                    <span>Continue with Google</span>
                  </button>

                  <div style="height:8px;"></div>

                  <button class="btn btn--outline btn--block socialBtn" id="sa">
                    <span class="socialBtn__ic">${iconApple()}</span>
                    <span>Continue with Apple</span>
                  </button>

                  <div style="height:8px;"></div>

                  <button class="btn btn--outline btn--block socialBtn" id="sm">
                    <span class="socialBtn__ic">${iconMicrosoft()}</span>
                    <span>Continue with Microsoft</span>
                  </button>

                  <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted.</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // sign in
  $("#login")?.addEventListener("click", () => {
    const e = ($("#le")?.value || "").trim();
    const p = ($("#lp")?.value || "").trim();
    if (!e || !p) return toast("Enter email + password.");
    toast("Signed in (demo).");
  });

  // oauth (sign-in column)
  $("#g")?.addEventListener("click", () => toast("Google sign-in (demo)."));
  $("#a")?.addEventListener("click", () => toast("Apple sign-in (demo)."));
  $("#m")?.addEventListener("click", () => toast("Microsoft sign-in (demo)."));

  // create account
  $("#signup")?.addEventListener("click", () => {
    const e = ($("#se")?.value || "").trim();
    const p = ($("#sp")?.value || "").trim();
    const f = $("#doc")?.files?.[0];
    if (!e || !p) return toast("Enter email + password.");
    if (!f) return toast("Upload a verification document (demo).");
    toast("Account created (demo).");
  });

  // styled file picker
  $("#pickDoc")?.addEventListener("click", () => $("#doc")?.click());
  $("#doc")?.addEventListener("change", (ev) => {
    const f = ev.target.files && ev.target.files[0];
    const name = f ? f.name : "No file selected";
    const el = $("#docName");
    if (el) el.textContent = name;
  });

  // oauth (create column)
  $("#sg")?.addEventListener("click", () => toast("Google sign-up (demo)."));
  $("#sa")?.addEventListener("click", () => toast("Apple sign-up (demo)."));
  $("#sm")?.addEventListener("click", () => toast("Microsoft sign-up (demo)."));
}

/* ---------- Boot ---------- */
window.addEventListener("hashchange", router);
document.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/";
  router();
});
