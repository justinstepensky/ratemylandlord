/* CASA — single-file SPA (GitHub Pages friendly)
   - No reviewer accounts
   - Landlord Portal demo auth
   - Leaflet map with pins (OSM)
   - Borough filter
*/

const $ = (s) => document.querySelector(s);

const STORAGE = {
  landlords: "casa_landlords_v1",
  reviews: "casa_reviews_v1",
  editTokens: "casa_edit_tokens_v1"
};

const BOROUGHS = ["All boroughs","Manhattan","Brooklyn","Queens","Bronx","Staten Island"];

const BOROUGH_CENTERS = {
  Manhattan: [40.7831, -73.9712],
  Brooklyn: [40.6782, -73.9442],
  Queens: [40.7282, -73.7949],
  Bronx: [40.8448, -73.8648],
  "Staten Island": [40.5795, -74.1502],
  NYC: [40.730610, -73.935242]
};

let homeMap = null;
let searchMap = null;

function toast(msg){
  const el = $("#toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 2400);
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

function saveJSON(key, val){
  localStorage.setItem(key, JSON.stringify(val));
}

/* ---------- Demo data bootstrap ---------- */
function seedIfEmpty(){
  const landlords = loadLandlords();
  const reviews = loadReviews();
  if (landlords.length) return;

  const seedLandlords = [
    {
      id: uid("ll"),
      name: "Northside Properties",
      entity: "Northside Properties LLC",
      address: "123 Main St",
      unit: "4B",
      city: "Brooklyn",
      state: "NY",
      borough: "Brooklyn",
      lat: 40.7146,
      lng: -73.9568,
      createdAt: "2026-01-05"
    },
    {
      id: uid("ll"),
      name: "Park Ave Management",
      entity: "Park Ave Management",
      address: "22 Park Ave",
      unit: "",
      city: "New York",
      state: "NY",
      borough: "Manhattan",
      lat: 40.7406,
      lng: -73.9846,
      createdAt: "2025-12-18"
    },
    {
      id: uid("ll"),
      name: "Elmhurst Holdings",
      entity: "Elmhurst Holdings",
      address: "86-12 Broadway",
      unit: "",
      city: "Elmhurst",
      state: "NY",
      borough: "Queens",
      lat: 40.7420,
      lng: -73.8820,
      createdAt: "2025-11-30"
    }
  ];

  const seedReviews = [
    {
      id: uid("rv"),
      landlordId: seedLandlords[0].id,
      createdAt: "2026-01-05",
      borough: "Brooklyn",
      overall: 4,
      categories: { repairs: 5, communication: 4, cleanliness: 4, noise: 3, fairness: 4 },
      text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently."
    },
    {
      id: uid("rv"),
      landlordId: seedLandlords[1].id,
      createdAt: "2025-12-18",
      borough: "Manhattan",
      overall: 3,
      categories: { repairs: 3, communication: 2, cleanliness: 4, noise: 4, fairness: 3 },
      text: "Great location, but communication was slow. Security deposit itemization took weeks."
    },
    {
      id: uid("rv"),
      landlordId: seedLandlords[2].id,
      createdAt: "2025-11-30",
      borough: "Queens",
      overall: 5,
      categories: { repairs: 5, communication: 5, cleanliness: 4, noise: 4, fairness: 5 },
      text: "Responsive management. Clear lease terms and quick repairs."
    }
  ];

  saveJSON(STORAGE.landlords, seedLandlords);
  saveJSON(STORAGE.reviews, seedReviews);
  saveJSON(STORAGE.editTokens, {});
}

function loadLandlords(){ return loadJSON(STORAGE.landlords, []); }
function saveLandlords(v){ saveJSON(STORAGE.landlords, v); }
function loadReviews(){ return loadJSON(STORAGE.reviews, []); }
function saveReviews(v){ saveJSON(STORAGE.reviews, v); }
function loadTokens(){ return loadJSON(STORAGE.editTokens, {}); }
function saveTokens(v){ saveJSON(STORAGE.editTokens, v); }

/* ---------- Ratings helpers ---------- */
function avgRatingForLandlord(landlordId){
  const reviews = loadReviews().filter(r => r.landlordId === landlordId);
  if (!reviews.length) return null;
  const sum = reviews.reduce((a,r)=>a+(Number(r.overall)||0),0);
  return sum / reviews.length;
}

function starsRow(val){
  const n = Math.round(val || 0);
  const out = [];
  for (let i=1;i<=5;i++){
    out.push(`<svg class="star" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="${i<=n ? "var(--starOn)" : "var(--starOff)"}" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
    </svg>`);
  }
  return `<div class="starStars">${out.join("")}</div>`;
}

/* ---------- URL helpers ---------- */
function parseHash(){
  const raw = location.hash || "#/";
  const [path, qs] = raw.replace(/^#/, "").split("?");
  const params = new URLSearchParams(qs || "");
  return { path: path || "/", params };
}
function nav(to){ location.hash = to; }

/* ---------- Maps ---------- */
function destroyMap(which){
  try{
    if (which === "home" && homeMap){
      homeMap.remove(); homeMap = null;
    }
    if (which === "search" && searchMap){
      searchMap.remove(); searchMap = null;
    }
  }catch{}
}

function initLeafletMap(containerId, which, opts={}){
  const el = document.getElementById(containerId);
  if (!el) return null;

  destroyMap(which);

  const center = opts.center || BOROUGH_CENTERS.NYC;
  const zoom = opts.zoom || 11;

  const map = L.map(containerId, { zoomControl: true }).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  if (which === "home") homeMap = map;
  if (which === "search") searchMap = map;

  return map;
}

function addPins(map, landlords, onClick){
  landlords.forEach(l => {
    if (typeof l.lat !== "number" || typeof l.lng !== "number") return;
    const marker = L.marker([l.lat, l.lng]).addTo(map);
    marker.on("click", () => onClick?.(l));
    const rating = avgRatingForLandlord(l.id);
    const rText = rating ? `${rating.toFixed(1)}/5` : "No ratings";
    marker.bindPopup(`<b>${esc(l.name)}</b><br/>${esc(l.borough || "")}<br/>${esc(rText)}`);
  });
}

function setMapView(map, lat, lng, zoom=14){
  if (!map) return;
  map.setView([lat, lng], zoom, { animate: true });
}

/* ---------- UI: Home ---------- */
function renderHome(){
  const app = $("#app");
  if (!app) return;

  const landlords = loadLandlords();
  const reviews = loadReviews()
    .slice()
    .sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")))
    .slice(0, 12);

  app.innerHTML = `
    <section class="section">
      <div class="wrap">

        <div class="card">
          <div class="pad hero">
            <div class="kicker">CASA</div>
            <h1>Know your landlord<br/>before you sign.</h1>
            <p class="lead">Search landlords, read tenant reviews, and add your building in minutes.</p>

            <div class="heroSearch">
              <div class="heroSearch__bar">
                <input id="homeQ" placeholder="Search landlord name, management company, or address..." />
                <div class="suggest" id="homeSuggest"></div>
              </div>
              <button class="btn btn--primary" id="homeSearchBtn">Search</button>
              <a class="btn btn--outline" href="#/add">Add a landlord</a>
            </div>

            <div class="trustLine">No account required to review. Verified landlords can respond.</div>

            <div class="cards3" style="margin-top:10px;">
              <div class="xCard" data-open="search">
                <div class="xCard__top">
                  <div class="xCard__title">
                    <span class="xCard__icon">⌕</span> Search
                  </div>
                </div>
                <div class="xCard__body">Search by name, entity or address</div>
              </div>

              <div class="xCard" data-open="review">
                <div class="xCard__top">
                  <div class="xCard__title">
                    <span class="xCard__icon">★</span> Review
                  </div>
                </div>
                <div class="xCard__body">Leave a rating based on select categories</div>
              </div>

              <div class="xCard" data-open="rent" style="opacity:.92; cursor:default;">
                <div class="xCard__top">
                  <div class="xCard__title">
                    <span class="xCard__icon">⌂</span> Rent
                  </div>
                </div>
                <div class="xCard__body"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="halfRow">
          <!-- Recent highlights frame -->
          <div class="card highlightsFrame">
            <div class="hd">
              <div>
                <div class="kicker">Featured reviews</div>
                <h2>Recent highlights</h2>
                <div class="muted">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn btn--ghost" href="#/search">Browse all</a>
            </div>
            <div class="bd" style="padding-top:8px;">
              <div class="highlightsViewport">
                <div class="highlightsTrack" id="highlightsTrack"></div>
              </div>
            </div>
          </div>

          <!-- Map frame -->
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
              <div class="mapFrame">
                <div id="homeMap" class="mapBoxTall"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer wrap">
          <div class="tiny">© ${new Date().getFullYear()} casa</div>
          <div style="display:flex; gap:14px; flex-wrap:wrap;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>

      </div>
    </section>
  `;

  // Accordion behavior for tiles
  document.querySelectorAll(".xCard").forEach(card => {
    card.addEventListener("click", () => {
      const key = card.getAttribute("data-open");
      if (key === "rent") return;
      // toggle only clicked
      document.querySelectorAll(".xCard").forEach(c => c.classList.remove("open"));
      card.classList.add("open");
    });
  });

  // Search actions
  const qEl = $("#homeQ");
  const sEl = $("#homeSuggest");
  const btn = $("#homeSearchBtn");

  function buildSuggest(q){
    const qq = (q||"").trim().toLowerCase();
    if (!qq){
      sEl.classList.remove("open");
      sEl.innerHTML = "";
      return;
    }
    const hits = landlords
      .filter(l =>
        (l.name||"").toLowerCase().includes(qq) ||
        (l.entity||"").toLowerCase().includes(qq) ||
        (fullAddress(l)||"").toLowerCase().includes(qq)
      )
      .slice(0,5);

    if (!hits.length){
      sEl.classList.remove("open");
      sEl.innerHTML = "";
      return;
    }
    sEl.innerHTML = hits.map(l => `
      <button type="button" data-id="${l.id}">
        ${esc(l.name)} <span class="tiny">• ${esc(l.borough||"")}</span>
      </button>
    `).join("");
    sEl.classList.add("open");

    sEl.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => nav(`#/landlord?id=${b.dataset.id}`));
    });
  }

  qEl?.addEventListener("input", e => buildSuggest(e.target.value));
  qEl?.addEventListener("focus", e => buildSuggest(e.target.value));
  document.addEventListener("click", (e) => {
    if (!sEl.contains(e.target) && e.target !== qEl) sEl.classList.remove("open");
  });

  btn?.addEventListener("click", () => {
    const q = (qEl?.value || "").trim();
    nav(`#/search?q=${encodeURIComponent(q)}&b=${encodeURIComponent("All boroughs")}`);
  });

  qEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      btn?.click();
    }
  });

  // Fill highlights carousel
  const track = $("#highlightsTrack");
  if (track){
    track.innerHTML = reviews.map(r => smallReviewCard(r)).join("");
  }

  // Init map + pins
  setTimeout(() => {
    const map = initLeafletMap("homeMap", "home", { center: BOROUGH_CENTERS.NYC, zoom: 11 });
    if (!map) return;

    addPins(map, landlords, (l) => nav(`#/landlord?id=${l.id}`));
  }, 0);
}

function fullAddress(l){
  const parts = [
    l.address,
    l.unit ? `Unit ${l.unit}` : "",
    l.city,
    l.state
  ].filter(Boolean);
  return parts.join(", ");
}

function smallReviewCard(r){
  const l = loadLandlords().find(x => x.id === r.landlordId);
  const date = r.createdAt ? new Date(r.createdAt) : null;
  const dateStr = date && !isNaN(date) ? `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}` : "";

  return `
    <div class="smallCard">
      <div class="smallCard__top">
        <div>
          <div class="smallCard__name">${esc(l?.name || "Unknown")}</div>
          <div class="smallCard__addr">${esc(fullAddress(l || {}))}${l?.borough ? ` • ${esc(l.borough)}` : ""}</div>
          <div class="starRow">
            ${starsRow(r.overall)}
            <div class="scoreText">${esc(r.overall)}/5</div>
          </div>
        </div>
        <div class="smallCard__time">${esc(dateStr)}</div>
      </div>

      <div class="smallCard__text">${esc(r.text || "").slice(0, 140)}${(r.text||"").length>140 ? "…" : ""}</div>

      <div class="smallCard__foot">
        <div class="tiny">${esc(r.borough || l?.borough || "")}</div>
        <a class="btn btn--outline" href="#/landlord?id=${encodeURIComponent(r.landlordId)}">View</a>
      </div>
    </div>
  `;
}

/* ---------- Search (MAP ON TOP) ---------- */
function renderSearch(params){
  const app = $("#app");
  if (!app) return;

  const landlords = loadLandlords();
  const q = (params.get("q") || "").trim();
  const b = (params.get("b") || "All boroughs").trim();

  const filtered = landlords.filter(l => {
    const matchB = (b === "All boroughs") ? true : (l.borough === b);
    const hay = `${l.name||""} ${l.entity||""} ${fullAddress(l)||""}`.toLowerCase();
    const matchQ = q ? hay.includes(q.toLowerCase()) : true;
    return matchB && matchQ;
  });

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

            <div class="heroSearch" style="justify-content:flex-start; margin-top:2px;">
              <div class="heroSearch__bar" style="max-width: 720px;">
                <input id="sq" value="${esc(q)}" placeholder="Search landlord name, management company, or address..." />
              </div>

              <div class="field" style="min-width: 220px; margin:0;">
                <label class="tiny" style="display:block; margin-left:6px;">Borough</label>
                <select id="sb">
                  ${BOROUGHS.map(x => `<option ${x===b ? "selected":""}>${esc(x)}</option>`).join("")}
                </select>
              </div>

              <button class="btn btn--primary" id="sgo">Search</button>
            </div>

            <!-- MAP ON TOP -->
            <div style="margin-top:14px;">
              <div class="mapFrame">
                <div id="searchMap" class="mapBoxTall"></div>
              </div>
            </div>

            <!-- RESULTS BELOW -->
            <div id="results" style="margin-top:14px;">
              ${filtered.length ? filtered.map(l => landlordRow(l, true)).join("") : `
                <div class="box">No matches. Try a different name or borough.</div>
              `}
            </div>

          </div>
        </div>
      </div>
    </section>
  `;

  // Search handlers
  $("#sgo")?.addEventListener("click", () => {
    const nq = ($("#sq").value || "").trim();
    const nb = ($("#sb").value || "All boroughs").trim();
    nav(`#/search?q=${encodeURIComponent(nq)}&b=${encodeURIComponent(nb)}`);
  });
  $("#sq")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ e.preventDefault(); $("#sgo")?.click(); }
  });
  $("#sb")?.addEventListener("change", () => $("#sgo")?.click());

  // Init map + pins
  setTimeout(() => {
    const center = (b !== "All boroughs" && BOROUGH_CENTERS[b]) ? BOROUGH_CENTERS[b] : BOROUGH_CENTERS.NYC;
    const map = initLeafletMap("searchMap", "search", { center, zoom: b==="All boroughs" ? 11 : 12 });
    if (!map) return;

    addPins(map, filtered, (l) => nav(`#/landlord?id=${l.id}`));

    // Expose for center buttons
    window.__searchCenter = (landlordId) => {
      const l = loadLandlords().find(x => x.id === landlordId);
      if (!l || typeof l.lat !== "number" || typeof l.lng !== "number") return;
      setMapView(map, l.lat, l.lng, 14);
    };
  }, 0);
}

function landlordRow(l, showCenter){
  const rating = avgRatingForLandlord(l.id);
  const rText = rating ? `${rating.toFixed(1)}/5` : "No ratings";
  const date = l.createdAt ? new Date(l.createdAt) : null;
  const dateStr = date && !isNaN(date) ? `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}` : "";

  return `
    <div class="rowCard">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <div>
            <div class="rowTitle">${esc(l.name)}</div>
            <div class="rowSub">${esc(fullAddress(l))}${l.borough ? ` • ${esc(l.borough)}` : ""}</div>
          </div>
          <div class="tiny">${esc(dateStr)}</div>
        </div>

        <div class="starRow">
          ${starsRow(rating || 0)}
          <div class="scoreText">${esc(rText)}</div>
        </div>

        <div class="tagRow">
          ${l.borough ? `<span class="tag">${esc(l.borough)}</span>` : ""}
          ${l.entity ? `<span class="tag">${esc(l.entity)}</span>` : ""}
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; justify-content:flex-end;">
        <a class="btn btn--outline" href="#/landlord?id=${encodeURIComponent(l.id)}">View</a>
        ${showCenter ? `<button class="btn btn--ghost" data-center="${esc(l.id)}">Center on map</button>` : ""}
      </div>
    </div>
  `;
}

/* attach center buttons after any renderSearch */
document.addEventListener("click", (e) => {
  const btn = e.target?.closest?.("button[data-center]");
  if (!btn) return;
  const id = btn.getAttribute("data-center");
  window.__searchCenter?.(id);
});

/* ---------- Landlord Profile ---------- */
function renderLandlord(params){
  const app = $("#app");
  if (!app) return;

  const id = params.get("id");
  const landlords = loadLandlords();
  const l = landlords.find(x => x.id === id);

  if (!l){
    app.innerHTML = `
      <section class="section">
        <div class="wrap">
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Not found</div>
                <h2>Landlord not found</h2>
                <div class="muted">Try searching again.</div>
              </div>
              <a class="btn btn--ghost" href="#/search">Search</a>
            </div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const reviews = loadReviews().filter(r => r.landlordId === l.id)
    .slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));

  const rating = avgRatingForLandlord(l.id);

  app.innerHTML = `
    <section class="section">
      <div class="wrap">

        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Landlord</div>
              <h2>${esc(l.name)}</h2>
              <div class="muted">${esc(fullAddress(l))}${l.borough ? ` • ${esc(l.borough)}` : ""}</div>
              <div class="starRow" style="margin-top:10px;">
                ${starsRow(rating || 0)}
                <div class="scoreText">${rating ? `${rating.toFixed(1)}/5` : "No ratings yet"}</div>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn btn--ghost" href="#/search">Back</a>
              <a class="btn btn--primary" href="#/review?landlordId=${encodeURIComponent(l.id)}">Rate this landlord</a>
            </div>
          </div>

          <div class="bd">
            <div class="mapFrame">
              <div id="landlordMap" class="mapBox"></div>
            </div>

            <div style="margin-top:14px;">
              <h2 style="font-size:22px; margin-bottom:8px;">Reviews</h2>
              ${reviews.length ? reviews.map(r => reviewCard(r)).join("") : `
                <div class="box">No reviews yet. Be the first to post a rating.</div>
              `}
            </div>
          </div>
        </div>

      </div>
    </section>
  `;

  setTimeout(() => {
    const center = (typeof l.lat==="number" && typeof l.lng==="number") ? [l.lat, l.lng] : BOROUGH_CENTERS.NYC;
    const map = initLeafletMap("landlordMap", "search", { center, zoom: 14 }); // reuse slot safely
    if (!map) return;
    if (typeof l.lat==="number" && typeof l.lng==="number"){
      L.marker([l.lat, l.lng]).addTo(map);
      setMapView(map, l.lat, l.lng, 14);
    }
  }, 0);
}

function reviewCard(r){
  const date = r.createdAt ? new Date(r.createdAt) : null;
  const dateStr = date && !isNaN(date) ? `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}` : "";

  return `
    <div class="smallCard" style="margin-top:12px;">
      <div class="smallCard__top">
        <div>
          <div class="starRow">
            ${starsRow(r.overall)}
            <div class="scoreText">${esc(r.overall)}/5</div>
          </div>
        </div>
        <div class="smallCard__time">${esc(dateStr)}</div>
      </div>

      <div class="tagRow">
        ${Object.entries(r.categories || {}).map(([k,v]) => `<span class="tag">${esc(cap(k))}: ${esc(v)}/5</span>`).join("")}
      </div>

      <div class="smallCard__text">${esc(r.text || "")}</div>
    </div>
  `;
}

function cap(s){ return (s||"").slice(0,1).toUpperCase() + (s||"").slice(1); }

/* ---------- Add Landlord (NO LAT/LNG, ADD FIRST, THEN RATE BUTTON ON PROFILE) ---------- */
function renderAdd(){
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Add</div>
              <h2>Add a landlord</h2>
              <div class="muted">Add the landlord first. You can rate them immediately after.</div>
            </div>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="split2">

              <div>
                <div class="field">
                  <label>Landlord / Company name <span class="tiny">*</span></label>
                  <input id="aname" placeholder="e.g., Park Ave Management"/>
                </div>

                <div class="field" style="margin-top:10px;">
                  <label>Entity (optional)</label>
                  <input id="aentity" placeholder="e.g., Park Ave Management LLC"/>
                </div>

                <div class="split2" style="margin-top:10px;">
                  <div class="field">
                    <label>Address <span class="tiny">*</span></label>
                    <input id="aaddr" placeholder="Street address"/>
                  </div>
                  <div class="field">
                    <label>Unit (optional)</label>
                    <input id="aunit" placeholder="Apt / Unit"/>
                  </div>
                </div>

                <div class="split2" style="margin-top:10px;">
                  <div class="field">
                    <label>City <span class="tiny">*</span></label>
                    <input id="acity" placeholder="City"/>
                  </div>
                  <div class="field">
                    <label>State <span class="tiny">*</span></label>
                    <input id="astate" placeholder="NY"/>
                  </div>
                </div>

                <div class="field" style="margin-top:10px;">
                  <label>Borough</label>
                  <select id="aboro">
                    ${BOROUGHS.filter(x=>x!=="All boroughs").map(x=>`<option>${esc(x)}</option>`).join("")}
                  </select>
                  <div class="tiny" style="margin-top:6px;">Optional, but helps map placement.</div>
                </div>

                <button class="btn btn--primary btn--block" style="margin-top:12px;" id="addBtn">
                  Add landlord
                </button>

                <div class="tiny" style="margin-top:10px;">After adding, you’ll be taken to the landlord page where you can rate them.</div>
              </div>

              <div>
                <div class="kicker">Place the pin (optional)</div>
                <div class="muted">Click the map to set a location. You won’t enter coordinates.</div>

                <div class="mapFrame" style="margin-top:10px;">
                  <div id="addMap" class="mapBox"></div>
                </div>

                <div class="tiny" style="margin-top:8px;">
                  Tip: If you don’t pick a pin, we’ll place it near the borough center.
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // map picker
  let picked = null;

  setTimeout(() => {
    const b = ($("#aboro")?.value || "Manhattan");
    const center = BOROUGH_CENTERS[b] || BOROUGH_CENTERS.NYC;
    const map = initLeafletMap("addMap", "search", { center, zoom: 12 });
    if (!map) return;

    let marker = null;
    map.on("click", (e) => {
      picked = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (marker) marker.remove();
      marker = L.marker([picked.lat, picked.lng]).addTo(map);
    });

    $("#aboro")?.addEventListener("change", () => {
      const nb = $("#aboro").value;
      const c = BOROUGH_CENTERS[nb] || BOROUGH_CENTERS.NYC;
      setMapView(map, c[0], c[1], 12);
    });
  }, 0);

  $("#addBtn")?.addEventListener("click", () => {
    const name = ($("#aname").value || "").trim();
    const entity = ($("#aentity").value || "").trim();
    const address = ($("#aaddr").value || "").trim();
    const unit = ($("#aunit").value || "").trim();
    const city = ($("#acity").value || "").trim();
    const state = ($("#astate").value || "").trim();
    const borough = ($("#aboro").value || "").trim();

    // required: address, city, state
    if (!name) return toast("Please enter a landlord/company name.");
    if (!address) return toast("Address is required.");
    if (!city) return toast("City is required.");
    if (!state) return toast("State is required.");

    const id = uid("ll");
    let latlng = picked;

    // if not picked, place near borough center with small offset
    if (!latlng){
      const c = BOROUGH_CENTERS[borough] || BOROUGH_CENTERS.NYC;
      const jitter = () => (Math.random() - 0.5) * 0.03; // ~ small NYC shift
      latlng = { lat: c[0] + jitter(), lng: c[1] + jitter() };
    }

    const landlords = loadLandlords();
    landlords.unshift({
      id, name, entity, address, unit, city, state, borough,
      lat: latlng.lat,
      lng: latlng.lng,
      createdAt: new Date().toISOString().slice(0,10)
    });
    saveLandlords(landlords);

    toast("Added. Nice.");
    nav(`#/landlord?id=${encodeURIComponent(id)}`);
  });
}

/* ---------- Review flow ---------- */
function renderReview(params){
  const app = $("#app");
  if (!app) return;

  const landlordId = params.get("landlordId");
  const l = loadLandlords().find(x => x.id === landlordId);
  if (!l){
    toast("Landlord not found.");
    nav("#/search");
    return;
  }

  const categories = [
    ["repairs","Repairs"],
    ["communication","Communication"],
    ["cleanliness","Cleanliness"],
    ["noise","Noise"],
    ["fairness","Fairness"]
  ];

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Review</div>
              <h2>Rate ${esc(l.name)}</h2>
              <div class="muted">${esc(fullAddress(l))}${l.borough ? ` • ${esc(l.borough)}` : ""}</div>
            </div>
            <a class="btn btn--ghost" href="#/landlord?id=${encodeURIComponent(l.id)}">Back</a>
          </div>

          <div class="bd">
            <div class="card" style="box-shadow:none;">
              <div class="pad">

                <div class="field">
                  <label>Overall rating</label>
                  <select id="overall">
                    ${[5,4,3,2,1].map(n=>`<option value="${n}">${n}</option>`).join("")}
                  </select>
                </div>

                <div class="split2" style="margin-top:12px;">
                  ${categories.map(([k,label]) => `
                    <div class="field">
                      <label>${esc(label)}</label>
                      <select id="c_${esc(k)}">
                        ${[5,4,3,2,1].map(n=>`<option value="${n}">${n}</option>`).join("")}
                      </select>
                    </div>
                  `).join("")}
                </div>

                <div class="field" style="margin-top:12px;">
                  <label>What happened?</label>
                  <textarea id="text" placeholder="Keep it specific and useful. Avoid personal info."></textarea>
                </div>

                <button class="btn btn--primary btn--block" style="margin-top:12px;" id="post">
                  Post review
                </button>

                <div class="tiny" style="margin-top:10px;">
                  No account required. After posting, you’ll get an edit link (demo).
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#post")?.addEventListener("click", () => {
    const overall = Number($("#overall").value || 0);
    const text = ($("#text").value || "").trim();

    if (!overall) return toast("Select an overall rating.");
    if (!text) return toast("Please write a short review.");

    const cats = {};
    ["repairs","communication","cleanliness","noise","fairness"].forEach(k => {
      cats[k] = Number($(`#c_${k}`).value || 0);
    });

    const reviews = loadReviews();
    const id = uid("rv");
    const createdAt = new Date().toISOString().slice(0,10);
    reviews.unshift({
      id, landlordId: l.id, createdAt,
      borough: l.borough,
      overall,
      categories: cats,
      text
    });
    saveReviews(reviews);

    // demo edit token
    const token = uid("edit");
    const tokens = loadTokens();
    tokens[token] = id;
    saveTokens(tokens);

    toast("Posted. Edit link copied (demo).");
    try{
      navigator.clipboard.writeText(`${location.origin}${location.pathname}#/edit?token=${encodeURIComponent(token)}`);
    }catch{}

    nav(`#/landlord?id=${encodeURIComponent(l.id)}`);
  });
}

/* ---------- Edit review (demo) ---------- */
function renderEdit(params){
  const app = $("#app");
  if (!app) return;

  const token = params.get("token");
  const tokens = loadTokens();
  const reviewId = tokens[token];
  const reviews = loadReviews();
  const r = reviews.find(x => x.id === reviewId);
  if (!r){
    app.innerHTML = `
      <section class="section">
        <div class="wrap">
          <div class="card">
            <div class="hd">
              <div><div class="kicker">Edit</div><h2>Invalid edit link</h2></div>
              <a class="btn btn--ghost" href="#/">Home</a>
            </div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const l = loadLandlords().find(x => x.id === r.landlordId);

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Edit review</div>
              <h2>${esc(l?.name || "Landlord")}</h2>
              <div class="muted">Update your review (demo).</div>
            </div>
            <a class="btn btn--ghost" href="#/landlord?id=${encodeURIComponent(r.landlordId)}">Back</a>
          </div>

          <div class="bd">
            <div class="field">
              <label>Overall rating</label>
              <select id="overall">
                ${[5,4,3,2,1].map(n=>`<option value="${n}" ${n===r.overall?"selected":""}>${n}</option>`).join("")}
              </select>
            </div>

            <div class="field" style="margin-top:12px;">
              <label>Review</label>
              <textarea id="text">${esc(r.text || "")}</textarea>
            </div>

            <button class="btn btn--primary" style="margin-top:12px;" id="save">Save</button>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#save")?.addEventListener("click", () => {
    r.overall = Number($("#overall").value || r.overall);
    r.text = ($("#text").value || "").trim();
    saveReviews(reviews);
    toast("Saved.");
    nav(`#/landlord?id=${encodeURIComponent(r.landlordId)}`);
  });
}

/* ---------- How + Trust ---------- */
function renderHow(){
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
              <div class="rowSub">Find a landlord by name, entity, address, or borough.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Review</div>
              <div class="rowSub">Post instantly. You’ll receive an edit link (no account required).</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Respond (verified landlords)</div>
              <div class="rowSub">Landlords use the Landlord Portal and verify documents before responding publicly.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Report issues</div>
              <div class="rowSub">Spam, harassment, and personal info can be reported for moderation.</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTrust(){
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
              <div class="rowSub">Tenants can post without accounts; edits use an edit link.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Verified landlord responses</div>
              <div class="rowSub">Landlords upload documentation and are reviewed before responding publicly.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">No doxxing / personal info</div>
              <div class="rowSub">Do not post phone numbers, emails, or private details.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Reporting</div>
              <div class="rowSub">Spam, harassment, and inaccurate listings can be reported for moderation.</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ---------- Landlord Portal ---------- */
function renderPortal(){
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

                  ${oauthButtons("g","a","m")}
                </div>
              </div>

              <!-- Create account -->
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

                    <div class="fileRow" style="margin-top:6px;">
                      <input id="doc" type="file" class="fileInput" />
                      <div class="fileFake">
                        <span class="fileBtn">Choose file</span>
                        <span class="fileName" id="docName">No file chosen</span>
                      </div>
                    </div>

                    <div class="tiny" style="margin-top:6px;">Lease header, LLC registration, management agreement, etc.</div>
                  </div>

                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">
                    Create account
                  </button>

                  <div class="tiny" style="margin:12px 0 10px; text-align:center;">or continue with</div>

                  ${oauthButtons("sg","sa","sm")}

                  <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted.</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // file name display
  $("#doc")?.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    const name = f ? f.name : "No file chosen";
    const el = $("#docName");
    if (el) el.textContent = name;
  });

  $("#login")?.addEventListener("click", () => {
    const e = ($("#le").value || "").trim();
    const p = ($("#lp").value || "").trim();
    if (!e || !p) return toast("Enter email + password.");
    toast("Signed in (demo).");
  });

  $("#signup")?.addEventListener("click", () => {
    const e = ($("#se").value || "").trim();
    const p = ($("#sp").value || "").trim();
    if (!e || !p) return toast("Enter email + password.");
    toast("Account created (demo).");
  });

  ["g","a","m","sg","sa","sm"].forEach(id => {
    $(`#${id}`)?.addEventListener("click", () => toast("Demo: OAuth not configured."));
  });
}

function oauthButtons(gId, aId, mId){
  // inline SVG logos, no external assets
  return `
    <button class="btn btn--outline btn--block oauthBtn" id="${esc(gId)}">
      <span class="oauthIcon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.02 1.53 7.4 2.81l5.41-5.41C33.69 4.06 29.28 2 24 2 14.73 2 6.98 7.39 3.36 15.21l6.64 5.16C11.61 14.25 17.31 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.57-.14-3.08-.4-4.5H24v9h12.4c-.54 2.9-2.18 5.36-4.62 7.02l7.06 5.48C42.96 37.36 46.1 31.45 46.1 24.5z"/>
          <path fill="#FBBC05" d="M10 28.37c-.49-1.46-.77-3.02-.77-4.62 0-1.6.28-3.16.77-4.62l-6.64-5.16C1.98 17.39 1.2 20.11 1.2 23.75c0 3.64.78 6.36 2.16 9.78L10 28.37z"/>
          <path fill="#34A853" d="M24 46c5.28 0 9.72-1.74 12.96-4.72l-7.06-5.48c-1.96 1.32-4.47 2.1-5.9 2.1-6.69 0-12.39-4.75-14-10.87l-6.64 5.16C6.98 40.61 14.73 46 24 46z"/>
        </svg>
      </span>
      Continue with Google
    </button>

    <div style="height:8px;"></div>

    <button class="btn btn--outline btn--block oauthBtn" id="${esc(aId)}">
      <span class="oauthIcon" aria-hidden="true" style="color: var(--ink);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M16.365 1.43c0 1.14-.41 2.2-1.19 3.07-.77.87-2.05 1.54-3.17 1.44-.14-1.1.45-2.26 1.16-3.07.79-.91 2.14-1.58 3.2-1.44z"/>
          <path fill="currentColor" d="M20.8 17.02c-.55 1.27-.82 1.84-1.53 2.97-.99 1.55-2.39 3.48-4.12 3.5-1.54.01-1.94-1-4.03-1-2.09 0-2.53.98-4.06 1.02-1.72.06-3.04-1.72-4.03-3.27C1.2 17.7.0 13.03 1.85 9.82c.99-1.72 2.71-2.73 4.53-2.73 1.78 0 2.89 1 4.35 1 1.42 0 2.28-1 4.33-1 1.62 0 3.34.89 4.31 2.43-3.76 2.06-3.15 7.43.43 8.5z"/>
        </svg>
      </span>
      Continue with Apple
    </button>

    <div style="height:8px;"></div>

    <button class="btn btn--outline btn--block oauthBtn" id="${esc(mId)}">
      <span class="oauthIcon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#F35325" d="M6 6h17v17H6z"/>
          <path fill="#81BC06" d="M25 6h17v17H25z"/>
          <path fill="#05A6F0" d="M6 25h17v17H6z"/>
          <path fill="#FFBA08" d="M25 25h17v17H25z"/>
        </svg>
      </span>
      Continue with Microsoft
    </button>
  `;
}

/* ---------- Router ---------- */
function route(){
  const { path, params } = parseHash();

  // close drawer on nav
  $("#navDrawer")?.classList.remove("open");

  if (path === "/" || path === "") return renderHome();
  if (path === "/search") return renderSearch(params);
  if (path === "/add") return renderAdd();
  if (path === "/landlord") return renderLandlord(params);
  if (path === "/review") return renderReview(params);
  if (path === "/edit") return renderEdit(params);
  if (path === "/how") return renderHow();
  if (path === "/trust") return renderTrust();
  if (path === "/portal") return renderPortal();

  // fallback
  renderHome();
}

function wireNav(){
  $("#hamburger")?.addEventListener("click", () => {
    $("#navDrawer")?.classList.toggle("open");
  });
}

seedIfEmpty();
wireNav();
window.addEventListener("hashchange", route);
route();
