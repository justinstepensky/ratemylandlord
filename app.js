/* CASA — single-file SPA app.js
   - hash routing
   - premium cards
   - rating tint tiers (rounded 1 decimal)
   - badges (assets/badge-verified.png + assets/badge-top.png)
   - Recent highlights carousel w/ dots only (max 5)
   - mobile drawer works
   - review modal fixed (z-index + layout)
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

function round1(n) {
  return Math.round(n * 10) / 10;
}

function starStaticHTML(value, sizePx = 16) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return `<span class="starStatic" style="--rating:${v};--starSize:${sizePx}px"></span>`;
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
    num += Number(r.stars) * w;
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
  const dist = [0,0,0,0,0]; // 1..5
  for (const r of rs) {
    const s = Math.round(Number(r.stars) || 0);
    if (s >= 1 && s <= 5) dist[s - 1] += 1;
  }
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

/* Badges: path + fallback for GH Pages quirks */
function badgeImg(src, alt, title){
  const safeAlt = esc(alt);
  const safeTitle = esc(title);
  const safeSrc = esc(src);
  const fallback = safeSrc.startsWith("./") ? safeSrc.slice(2) : "./" + safeSrc;
  return `<img class="badgeImg" src="${safeSrc}" alt="${safeAlt}" title="${safeTitle}" onerror="this.onerror=null;this.src='${fallback}'"/>`;
}

function badgesHTML(l) {
  const parts = [];
  if (l.verified) parts.push(badgeImg("assets/badge-verified.png","Verified","Verified Landlord (ownership verified)"));
  if (l.top) parts.push(badgeImg("assets/badge-top.png","Top","Top Landlord (high rating + consistent performance)"));
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
    drawer?.classList.add("isOpen");
    overlay?.classList.add("isOpen");
    drawer?.setAttribute("aria-hidden", "false");
    overlay?.setAttribute("aria-hidden", "false");
  }
  function close() {
    drawer?.classList.remove("isOpen");
    overlay?.classList.remove("isOpen");
    drawer?.setAttribute("aria-hidden", "true");
    overlay?.setAttribute("aria-hidden", "true");
  }

  btn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);

  drawer?.addEventListener("click", (e) => {
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
  overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${innerHTML}</div>`;
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
  const path = hash.replace("#", "");
  const [base, param] = path.split("/").filter(Boolean);

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
          ${avg == null ? `<span class="muted">Unrated</span>` : starStaticHTML(avg, 16)}
          <span class="ratingNum">${avgText}</span>
          <span class="muted">(${count} review${count===1?"":"s"})</span>
          <span class="muted">Rating reflects review recency.</span>
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

/* Recent highlights */
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
    const tintClass = tier.tier === "green" ? "lc--green" : tier.tier === "yellow" ? "lc--yellow" : tier.tier === "red" ? "lc--red" : "";
    const avgText = (st.avgRounded == null) ? "—" : st.avgRounded.toFixed(1);

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
              ${st.avgRounded == null ? `<span class="muted">Unrated</span>` : starStaticHTML(st.avgRounded, 16)}
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

  const dots = items.map((_, i) => `<span class="dot ${i===0?"isActive":""}" data-dot="${i}"></span>`).join("");

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

  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.dot))));

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

        <div class="muted" style="text-align:center;margin-top:10px;">
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
      <div class="card card--highlights">
        <div class="pad">
          <div class="sectionHead">
            <div>
              <div class="kicker">Featured reviews</div>
              <h2 class="sectionTitle">Recent highlights</h2>
              <div class="sectionDesc">Browse ratings and landlord profiles.</div>
            </div>
            <a class="btn miniBtn" href="#/search">Browse all</a>
          </div>
          ${renderHighlightsCarousel()}
        </div>
      </div>

      <div class="card card--map">
        <div class="pad">
          <div class="sectionHead">
            <div>
              <div class="kicker">Map</div>
              <h2 class="sectionTitle">Browse by location</h2>
              <div class="sectionDesc">Pins reflect existing ratings.</div>
            </div>
            <a class="btn miniBtn" href="#/search">Open search</a>
          </div>

          <div class="mapBox" style="margin-top:14px;">
            <div class="map" id="homeMap"></div>
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
      tilePanel.style.display = "block";
      tilePanel.textContent = (k === "search")
        ? "Search by name, entity or address"
        : "Leave a rating based on select categories";
    });
  });

  $("#homeSearch").addEventListener("click", () => {
    const q = $("#homeQ").value.trim();
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });

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
  const params = new URLSearchParams(hash.slice(qIndex));
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

  function matches(l, query, borough) {
    const t = (query || "").toLowerCase();
    const hay = `${l.name} ${l.entity || ""} ${l.address.line1} ${l.address.city} ${l.address.state}`.toLowerCase();
    const qOk = !t || hay.includes(t);
    const bOk = !borough || (String(l.borough || "").toLowerCase() === String(borough).toLowerCase());
    return qOk && bOk;
  }

  function run() {
    const query = qEl.value.trim();
    const borough = bEl.value;
    const list = DB.landlords.filter(l => matches(l, query, borough));

    $("#results").innerHTML = list.length
      ? list.map(l => landlordCardHTML(l, { showCenter: true, showView: true })).join("")
      : `<div class="muted">No results.</div>`;

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
      borough: "",
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
          <div style="margin-top:10px"><b>Review</b><br/>Post instantly. You’ll receive an edit link (no account required).</div>
          <div style="margin-top:10px"><b>Respond</b><br/>Verified landlords can reply inline under reviews.</div>
          <div style="margin-top:10px"><b>Report issues</b><br/>Spam, harassment, and personal info can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `);
}

function renderTrust() {
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
          <div><b>No reviewer accounts</b><br/>Tenants can post without accounts; edits use an edit link.</div>
          <div style="margin-top:10px"><b>Verified landlord responses</b><br/>Landlords upload documentation and are reviewed before responding publicly.</div>
          <div style="margin-top:10px"><b>No doxxing</b><br/>Do not post phone numbers, emails, or private details.</div>
          <div style="margin-top:10px"><b>Reporting</b><br/>Spam, harassment, and inaccurate listings can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `);
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

        <div class="twoCol">
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

              <div class="field" style="margin-top:10px;">
                <button class="btn btn--block" id="oauthGoogle">Continue with Google</button>
                <div style="height:10px"></div>
                <button class="btn btn--block" id="oauthApple">Continue with Apple</button>
                <div style="height:10px"></div>
                <button class="btn btn--block" id="oauthMicrosoft">Continue with Microsoft</button>
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
                <input class="input" id="doc" type="file" />
                <div class="tiny" style="margin-top:8px;">Deed, tax bill, management agreement, utility statement, etc.</div>
              </div>

              <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">Create account</button>
              <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted.</div>
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

  const demo = (label) => alert(`${label} (demo)`);
  ["oauthGoogle","oauthApple","oauthMicrosoft","psignin","signup"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => demo(id));
  });
}

/* -----------------------------
   Landlord page
------------------------------ */
function renderLandlord(id) {
  const l = DB.landlords.find(x => x.id === id);
  if (!l) {
    renderShell(`
      <section class="pageCard card">
        <div class="pad">
          <div class="kicker">Not found</div>
          <div class="pageTitle">Landlord not found</div>
          <div class="pageSub">This landlord may have been removed.</div>
          <div style="margin-top:14px;">
            <a class="btn btn--primary" href="#/search">Back to search</a>
          </div>
        </div>
      </section>
    `);
    return;
  }

  const st = ratingStats(l.id);
  const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
  const tier = cardTier(st.avgRounded ?? 0, st.count);

  const addr = `${esc(l.address.line1)}${l.address.unit ? " • " + esc(l.address.unit) : ""} • ${esc(l.address.city)} • ${esc(l.address.state)}${l.borough ? " • " + esc(l.borough) : ""}`;
  const credential = casaCredential(l.id);
  const rs = landlordReviews(l.id);

  const content = `
    <section class="pageCard card">
      <div class="pad">
        <div class="topRow">
          <div>
            <div class="kicker">Landlord</div>
            <div>
              <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <div class="pageTitle" style="margin:0">${esc(l.name)}</div>
                ${badgesHTML(l)}
              </div>

              <div class="lcRow" style="margin-top:10px">
                ${st.avgRounded == null ? `<span class="muted">Unrated</span>` : starStaticHTML(st.avgRounded, 18)}
                <span class="ratingNum" style="font-size:18px;">${avgText}</span>
                <span class="muted">(${st.count} review${st.count===1?"":"s"})</span>
                ${st.count ? `<span class="pill ${tier.pillClass}">${tier.label}</span>` : `<span class="pill">Unrated</span>`}
              </div>

              <div class="muted" style="margin-top:10px">${esc(addr)}</div>
              <div class="muted" style="margin-top:10px;">
                <b>${esc(credential)}</b> • Rating reflects review recency.
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <a class="btn" href="#/search">Back</a>
            <button class="btn btn--primary" id="leaveReview">Leave a review</button>
          </div>
        </div>

        <div class="twoCol" style="margin-top:14px;">
          <div>
            <div class="kicker">Rating distribution</div>
            ${renderHistogram(st)}
            <div class="hr"></div>

            <div class="kicker">Reviews</div>
            <div class="list" id="reviewList">
              ${rs.length ? rs.map(r => reviewCardHTML(r)).join("") : `<div class="muted">No reviews yet.</div>`}
            </div>
          </div>

          <div>
            <div class="kicker">Map</div>
            <div class="mapBox" style="margin-top:10px;">
              <div class="map" id="landlordMap" style="height:320px;"></div>
            </div>

            <div class="hr"></div>

            <div class="kicker">Trust & Safety</div>
            <div class="muted" style="font-weight:700;line-height:1.55;margin-top:8px;">
              Keep reviews factual. No phone numbers, emails, or private info.
            </div>

            <button class="btn" style="margin-top:12px;" id="reportBtn">Report this listing</button>
          </div>
        </div>
      </div>
    </section>
  `;
  renderShell(content);

  setTimeout(() => {
    const mapEl = $("#landlordMap");
    if (!mapEl) return;
    const lat = typeof l.lat === "number" ? l.lat : 40.73;
    const lng = typeof l.lng === "number" ? l.lng : -73.95;
    const map = initLeafletMap(mapEl, [lat, lng], 13);
    L.marker([lat, lng]).addTo(map).bindPopup(`<b>${esc(l.name)}</b>`);
  }, 0);

  $("#leaveReview").addEventListener("click", () => openReviewModal(l.id));
  $("#reportBtn").addEventListener("click", () => openReportModal(l.id));

  document.querySelectorAll("[data-report-review]").forEach(btn => {
    btn.addEventListener("click", () => openReportModal(l.id, btn.dataset.reportReview));
  });
}

function renderHistogram(st) {
  const total = st.count || 0;
  const dist = st.dist || [0,0,0,0,0]; // 1..5
  const rows = [5,4,3,2,1].map((star) => {
    const n = dist[star - 1] || 0;
    const pct = total ? Math.round((n / total) * 100) : 0;
    return `
      <div class="hRow">
        <div style="font-weight:900;">${star}</div>
        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
        <div style="font-weight:900;text-align:right;">${n}</div>
      </div>
    `;
  }).join("");
  return `<div class="histo">${rows}</div>`;
}

function reviewCardHTML(r) {
  const v = Number(r.stars) || 0;
  return `
    <div class="lc" style="align-items:flex-start;">
      <div class="lcLeft">
        <div class="lcRow">
          ${starStaticHTML(v, 16)}
          <span class="ratingNum">${v.toFixed(1)}/5</span>
          <span class="muted">${fmtDate(r.createdAt)}</span>
        </div>
        <div class="smallNote">${esc(r.text)}</div>
      </div>
      <div class="lcRight">
        <button class="btn miniBtn" data-report-review="${esc(r.id)}">Report</button>
      </div>
    </div>
  `;
}

/* -----------------------------
   Review Modal (stars with half-star)
------------------------------ */
function openReviewModal(landlordId) {
  let rating = 5.0;

  openModal(`
    <div class="modalHead">
      <div class="modalTitle">Leave a review</div>
      <button class="iconBtn" id="mClose" aria-label="Close">×</button>
    </div>

    <div class="modalBody">
      <div class="field">
        <label>Rating</label>

        <div class="starPicker" id="starPicker" aria-label="Star rating">
          ${[1,2,3,4,5].map(i => `
            <button class="starBtn isFull" type="button" data-star="${i}" aria-label="${i} stars">
              <span class="hit hitL" data-value="${i - 0.5}"></span>
              <span class="hit hitR" data-value="${i}"></span>
            </button>
          `).join("")}
          <div class="tiny" id="starLabel" style="margin-left:10px;font-weight:900;">5.0 / 5</div>
        </div>

        <div class="tiny" style="margin-top:8px;">Tip: click the left half for half-stars.</div>
      </div>

      <div class="field">
        <label>What happened?</label>
        <textarea class="input" id="mText" placeholder="Keep it factual and specific."></textarea>
        <div class="tiny">Minimum length required. Don’t include phone numbers/emails/private info.</div>
      </div>
    </div>

    <div class="modalFoot">
      <button class="btn" id="mCancel">Cancel</button>
      <button class="btn btn--primary" id="mSubmit">Submit</button>
    </div>
  `);

  const close = () => closeModal();
  $("#mClose").addEventListener("click", close);
  $("#mCancel").addEventListener("click", close);

  const picker = $("#starPicker");
  const label = $("#starLabel");

  function paintStars(val) {
    rating = Math.max(0.5, Math.min(5, Number(val) || 5));
    label.textContent = `${rating.toFixed(1)} / 5`;

    const stars = Array.from(picker.querySelectorAll(".starBtn"));
    stars.forEach((btn, idx) => {
      const starNum = idx + 1;
      btn.classList.remove("isFull", "isHalf");
      if (rating >= starNum) btn.classList.add("isFull");
      else if (rating >= starNum - 0.5) btn.classList.add("isHalf");
    });
  }

  picker.addEventListener("click", (e) => {
    const v = e.target?.dataset?.value;
    if (!v) return;
    paintStars(Number(v));
  });

  paintStars(5);

  $("#mSubmit").addEventListener("click", () => {
    const text = $("#mText").value.trim();
    if (!text || text.length < 20) {
      alert("Please write at least 20 characters.");
      return;
    }

    DB.reviews.push({
      id: "r" + Math.random().toString(16).slice(2),
      landlordId,
      stars: rating,
      text,
      createdAt: Date.now()
    });
    saveDB(DB);

    closeModal();
    route();
  });
}

/* -----------------------------
   Report Modal (listing or review)
------------------------------ */
function openReportModal(landlordId, reviewId = null) {
  openModal(`
    <div class="modalHead">
      <div class="modalTitle">Report</div>
      <button class="iconBtn" id="rClose" aria-label="Close">×</button>
    </div>

    <div class="modalBody">
      <div class="field">
        <label>Reason</label>
        <select class="input" id="rReason">
          <option value="spam">Spam / promotion</option>
          <option value="harassment">Harassment / hate</option>
          <option value="privacy">Personal info / doxxing</option>
          <option value="inaccurate">Inaccurate listing</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="field">
        <label>Details (optional)</label>
        <textarea class="input" id="rText" placeholder="Briefly explain what’s wrong."></textarea>
      </div>

      <div class="tiny">Reports are reviewed. Do not include private information.</div>
    </div>

    <div class="modalFoot">
      <button class="btn" id="rCancel">Cancel</button>
      <button class="btn btn--primary" id="rSubmit">Submit report</button>
    </div>
  `);

  const close = () => closeModal();
  $("#rClose").addEventListener("click", close);
  $("#rCancel").addEventListener("click", close);

  $("#rSubmit").addEventListener("click", () => {
    const reason = $("#rReason").value;
    const details = $("#rText").value.trim();

    DB.flags.push({
      id: "f" + Math.random().toString(16).slice(2),
      landlordId,
      reviewId,
      reason,
      details,
      createdAt: Date.now()
    });
    saveDB(DB);

    closeModal();
    alert("Report submitted. Thank you.");
  });
}
