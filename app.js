/* =========================================================
   CASA — app.js (single-file SPA)
   ========================================================= */

/* ---------- Badge asset paths (SET THESE) ---------- */
const BADGE_VERIFIED_SRC = "assets/badge-verified.png"; // Blue check image
const BADGE_TOP_SRC      = "assets/badge-top.png";      // CASA logo badge

/* ---------- Utilities ---------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const nowISO = () => new Date().toISOString();
const daysBetween = (aISO, bISO) => {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((b - a) / (1000*60*60*24)));
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function safeText(s){
  return (s ?? "").toString().replace(/[<>&"]/g, (c) => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;"
  }[c]));
}

function slugify(s){
  return (s||"")
    .toLowerCase()
    .trim()
    .replace(/['"]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

function starsHTML(avg){
  const on = Math.round(clamp(avg,0,5));
  let out = `<span class="stars" aria-label="${avg.toFixed(1)} out of 5">`;
  for(let i=1;i<=5;i++){
    out += `<span class="${i<=on ? "on":"off"}">★</span>`;
  }
  out += `</span>`;
  return out;
}

/* ---------- Data ---------- */
const LS_KEY = "casa_v1";

function seed(){
  return {
    landlords: [
      {
        id: "ld_parkave",
        name: "Park Ave Management",
        entity: "Park Ave Management LLC",
        address1: "22 Park Ave",
        unit: "",
        city: "New York",
        state: "NY",
        borough: "Manhattan",
        lat: 40.7442,
        lng: -73.9836,
        verified: true,
        top: false,
        createdAt: "2025-10-01T12:00:00.000Z",
      },
      {
        id: "ld_northside",
        name: "Northside Properties",
        entity: "",
        address1: "123 Main St",
        unit: "",
        city: "Brooklyn",
        state: "NY",
        borough: "Brooklyn",
        lat: 40.7175,
        lng: -73.9566,
        verified: false,
        top: false,
        createdAt: "2025-11-10T12:00:00.000Z",
      },
      {
        id: "ld_elmhurst",
        name: "Elmhurst Holdings",
        entity: "",
        address1: "86-12 Broadway",
        unit: "",
        city: "Queens",
        state: "NY",
        borough: "Queens",
        lat: 40.7427,
        lng: -73.8919,
        verified: true,
        top: true,
        createdAt: "2025-11-20T12:00:00.000Z",
      },
    ],
    reviews: [
      {
        id: "rv_1",
        landlordId: "ld_parkave",
        stars: 3,
        text: "Great location, but communication was slow. Security deposit itemization took weeks.",
        createdAt: "2025-12-18T18:10:00.000Z",
      },
      {
        id: "rv_2",
        landlordId: "ld_northside",
        stars: 4,
        text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
        createdAt: "2026-01-05T15:15:00.000Z",
      },
      {
        id: "rv_3",
        landlordId: "ld_elmhurst",
        stars: 5,
        text: "Responsive management. Clear lease terms and quick repairs.",
        createdAt: "2025-11-30T14:30:00.000Z",
      },
      /* extra reviews to make tiers look real */
      {
        id: "rv_4",
        landlordId: "ld_elmhurst",
        stars: 5,
        text: "Very consistent, super fast maintenance responses.",
        createdAt: "2026-01-02T10:00:00.000Z",
      },
      {
        id: "rv_5",
        landlordId: "ld_elmhurst",
        stars: 4,
        text: "Overall excellent. Minor issue on move-out but resolved.",
        createdAt: "2025-09-12T10:00:00.000Z",
      },
      {
        id: "rv_6",
        landlordId: "ld_elmhurst",
        stars: 5,
        text: "Clean building and good communication.",
        createdAt: "2025-08-01T10:00:00.000Z",
      },
    ]
  };
}

function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){
      const s = seed();
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  }catch(e){
    const s = seed();
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    return s;
  }
}
function saveDB(db){
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}
let DB = loadDB();

/* ---------- Rating logic ---------- */
function reviewsFor(landlordId){
  return DB.reviews.filter(r => r.landlordId === landlordId);
}

/* Recency-weighted average (half-life 365 days) */
function recencyWeightedAverage(revs){
  if(!revs.length) return 0;
  const HALF_LIFE_DAYS = 365;
  const ln2 = Math.log(2);
  const now = new Date().toISOString();
  let wSum = 0;
  let vSum = 0;
  for(const r of revs){
    const age = daysBetween(r.createdAt, now);
    const w = Math.exp(-ln2 * (age / HALF_LIFE_DAYS));
    wSum += w;
    vSum += w * r.stars;
  }
  return vSum / Math.max(1e-9, wSum);
}

function ratingSummary(landlordId){
  const revs = reviewsFor(landlordId);
  const count = revs.length;
  if(count === 0){
    return { avg: 0, avgRounded: 0, count: 0, dist: [0,0,0,0,0], recent12: 0 };
  }
  const avg = recencyWeightedAverage(revs);
  const avgRounded = Math.round(avg * 10) / 10;

  const dist = [0,0,0,0,0]; // index 0 => 1★ ... index 4 => 5★
  for(const r of revs){
    dist[r.stars - 1] = (dist[r.stars - 1] || 0) + 1;
  }

  const now = new Date().toISOString();
  const recent12 = revs.filter(r => daysBetween(r.createdAt, now) <= 365).length;

  return { avg, avgRounded, count, dist, recent12 };
}

function tierClass(avgRounded, count){
  if(count === 0) return "";
  // Use the rounded rating for tier classification (required)
  if(avgRounded >= 1.0 && avgRounded <= 2.99) return "card--tierRed";
  if(avgRounded > 2.99 && avgRounded <= 3.99) return "card--tierYellow";
  if(avgRounded >= 4.0 && avgRounded <= 5.0) return "card--tierGreen";
  return "";
}
function tierLabel(avgRounded, count){
  if(count === 0) return "";
  if(avgRounded >= 1.0 && avgRounded <= 2.99) return "Low Rating";
  if(avgRounded > 2.99 && avgRounded <= 3.99) return "Mixed Reviews";
  if(avgRounded >= 4.0) return "Highly Rated";
  return "";
}

function casaCredential(summary){
  // Criteria from your spec (second version): CASA Rated = 10+ total AND 3+ in last 12 months
  if(summary.count === 0) return { label: "Unrated", detail: "No reviews yet." };
  if(summary.count < 10 || summary.recent12 < 3){
    return { label: "Not yet CASA Rated", detail: "Needs more recent reviews." };
  }
  return { label: "CASA Rated", detail: "Meets the CASA rating standard." };
}

/* ---------- Badges ---------- */
function badgesHTML(landlord){
  const parts = [];
  if(landlord.verified){
    parts.push(`<img class="badge" src="${BADGE_VERIFIED_SRC}" alt="Verified" title="Verified Landlord (ownership verified)"/>`);
  }
  if(landlord.top){
    parts.push(`<img class="badge" src="${BADGE_TOP_SRC}" alt="Top" title="Top Landlord (high rating + consistent performance)"/>`);
  }
  if(!parts.length) return "";
  return `<span class="badges">${parts.join("")}</span>`;
}

/* ---------- Maps ---------- */
let maps = {
  home: null,
  search: null,
  add: null,
  profile: null,
};
let mapMarkers = {
  home: [],
  search: [],
  addPin: null,
  profilePin: null
};

function destroyMap(key){
  try{
    if(maps[key]){
      maps[key].remove();
      maps[key] = null;
    }
    mapMarkers[key] = [];
  }catch(e){}
}

function ensureMap(key, elId, opts){
  destroyMap(key);
  const el = document.getElementById(elId);
  if(!el) return null;

  const map = L.map(elId, { zoomControl:true, scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  map.setView(opts.center, opts.zoom);
  maps[key] = map;
  return map;
}

function addLandlordMarkers(map, key, landlords){
  // clear old
  for(const m of (mapMarkers[key] || [])){
    try{ m.remove(); }catch(e){}
  }
  mapMarkers[key] = [];

  landlords.forEach(ld => {
    if(typeof ld.lat !== "number" || typeof ld.lng !== "number") return;
    const s = ratingSummary(ld.id);
    const label = s.count ? `${s.avgRounded.toFixed(1)} ★ (${s.count})` : "No ratings";
    const marker = L.marker([ld.lat, ld.lng]).addTo(map);
    marker.bindPopup(`<b>${safeText(ld.name)}</b><br/>${safeText(label)}`);
    mapMarkers[key].push(marker);
  });
}

/* ---------- Router ---------- */
function route(){
  const hash = location.hash || "#/";
  const [path, queryStr] = hash.slice(2).split("?");
  const parts = (path || "").split("/").filter(Boolean);

  // close modals when navigating
  closeModal();

  if(parts.length === 0) return renderHome();
  if(parts[0] === "search") return renderSearch();
  if(parts[0] === "add") return renderAdd();
  if(parts[0] === "how") return renderHow();
  if(parts[0] === "trust") return renderTrust();
  if(parts[0] === "portal") return renderPortal();
  if(parts[0] === "landlord" && parts[1]) return renderProfile(parts[1]);

  // fallback
  renderHome();
}

window.addEventListener("hashchange", route);
window.addEventListener("load", () => {
  setupNavMenu();
  route();
});

/* ---------- Nav Menu (mobile) ---------- */
function setupNavMenu(){
  const btn = $("#menuBtn");
  if(!btn) return;

  btn.addEventListener("click", () => {
    openMenuModal();
  });
}

function openMenuModal(){
  openModal({
    title: "Menu",
    body: `
      <div class="list">
        <a class="btn btn--block btn--outline" href="#/search">Search</a>
        <a class="btn btn--block btn--outline" href="#/add">Add Landlord</a>
        <a class="btn btn--block btn--outline" href="#/how">How It Works</a>
        <a class="btn btn--block btn--outline" href="#/trust">Trust & Safety</a>
        <a class="btn btn--block btn--primary" href="#/portal">Landlord Portal</a>
      </div>
    `,
    footer: ``
  });
}

/* ---------- Modal helpers ---------- */
function openModal({ title, body, footer }){
  const root = $("#modalRoot");
  if(!root) return;
  root.classList.add("isOpen");
  root.setAttribute("aria-hidden","false");

  root.innerHTML = `
    <div class="modalBackdrop" data-close="1"></div>
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__hd">
        <div class="modal__title">${safeText(title || "")}</div>
        <button class="modalClose" type="button" data-close="1" aria-label="Close">✕</button>
      </div>
      <div class="modal__bd">${body || ""}</div>
      ${footer !== undefined ? `<div class="modal__ft">${footer}</div>` : ""}
    </div>
  `;

  root.addEventListener("click", (e) => {
    const t = e.target;
    if(t && t.getAttribute && t.getAttribute("data-close") === "1"){
      closeModal();
    }
  }, { once:false });
}
function closeModal(){
  const root = $("#modalRoot");
  if(!root) return;
  root.classList.remove("isOpen");
  root.setAttribute("aria-hidden","true");
  root.innerHTML = "";
}

/* ---------- Shared: landlord card ---------- */
function landlordCardHTML(ld, { compact=false, showCenterBtn=false } = {}){
  const s = ratingSummary(ld.id);
  const tier = tierClass(s.avgRounded, s.count);
  const tierTxt = tierLabel(s.avgRounded, s.count);

  const locLine = [ld.address1, ld.city, ld.state].filter(Boolean).join(" • ");
  const borough = ld.borough || "Other";

  const avgTxt = s.count ? `${s.avgRounded.toFixed(1)}` : "—";
  const countTxt = s.count ? `(${s.count} review${s.count===1?"":"s"})` : "(0 reviews)";

  return `
    <div class="rowCard card--inner ${tier}" style="align-items:stretch;">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="rowTitle" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${safeText(ld.name)}
            ${badgesHTML(ld)}
          </div>
          ${tierTxt ? `<span class="tierPill">${safeText(tierTxt)}</span>` : ``}
        </div>

        <div class="tiny" style="margin-top:3px;">
          ${safeText(locLine)}${locLine ? " • " : ""}${safeText(borough)}
        </div>

        <div style="margin-top:10px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          ${s.count ? starsHTML(s.avgRounded) : `<span class="tiny">No ratings yet</span>`}
          <div style="font-weight:800;">${safeText(avgTxt)}</div>
          <div class="tiny">${safeText(countTxt)}</div>
          <div class="tiny">Rating reflects review recency.</div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; justify-content:flex-end;">
        <a class="btn btn--primary" href="#/landlord/${encodeURIComponent(ld.id)}">View</a>
        ${showCenterBtn ? `<button class="btn btn--outline" data-center="${safeText(ld.id)}">Center on map</button>` : ``}
      </div>
    </div>
  `;
}

/* ---------- HOME ---------- */
function renderHome(){
  const app = $("#app");
  if(!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">

        <div class="hero">
          <div class="kicker">CASA</div>
          <h1>Know your landlord<br/>before you sign.</h1>
          <div class="muted">Search landlords, read tenant reviews, and add your building in minutes.</div>

          <div class="hero__row">
            <input class="input" id="homeQ" placeholder="Search landlord name, management company, or address..." />
            <a class="btn btn--primary" id="homeSearchBtn" href="#/search">Search</a>
            <a class="btn btn--outline" href="#/add">Add a landlord</a>
          </div>

          <div class="hero__sub">No account required to review. Verified landlords can respond.</div>

          <div class="triple" style="margin-top:18px;">
            <div>
              <div class="stepCard" data-step="search">
                <div class="stepIcon">⌕</div>
                <div>
                  <div class="stepTitle">Search</div>
                </div>
              </div>
              <div class="stepBody" id="step-search">Search by name, entity or address</div>
            </div>

            <div>
              <div class="stepCard" data-step="review">
                <div class="stepIcon">★</div>
                <div>
                  <div class="stepTitle">Review</div>
                </div>
              </div>
              <div class="stepBody" id="step-review">Leave a rating based on select categories</div>
            </div>

            <div>
              <div class="stepCard" data-step="rent" style="cursor:default;">
                <div class="stepIcon">⌂</div>
                <div>
                  <div class="stepTitle">Rent</div>
                </div>
              </div>
              <!-- intentionally no body + not clickable -->
            </div>
          </div>
        </div>

        <div class="grid2">
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Featured reviews</div>
                <h2 style="margin-top:6px;">Recent highlights</h2>
                <div class="muted">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn btn--outline" href="#/search">Browse all</a>
            </div>
            <div class="bd">
              <div class="carousel">
                <div class="carousel__viewport" id="highlightsViewport" aria-label="Highlighted landlords"></div>

                <div class="carousel__controls">
                  <input id="highlightsRange" class="carousel__range" type="range" min="0" max="100" value="0" />
                  <div class="dots" id="highlightsDots" aria-hidden="true"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Map</div>
                <h2 style="margin-top:6px;">Browse by location</h2>
                <div class="muted">Pins reflect existing ratings.</div>
              </div>
              <a class="btn btn--outline" href="#/search">Open search</a>
            </div>
            <div class="bd">
              <div class="mapBox">
                <div id="homeMap"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;

  // step toggles
  $$(".stepCard").forEach(card => {
    card.addEventListener("click", () => {
      const k = card.getAttribute("data-step");
      if(k === "rent") return;

      const el = document.getElementById(`step-${k}`);
      if(!el) return;

      // close others
      ["search","review"].forEach(x => {
        const e2 = document.getElementById(`step-${x}`);
        if(e2 && e2 !== el) e2.classList.remove("isOpen");
      });

      el.classList.toggle("isOpen");
    });
  });

  // search pass-through
  $("#homeSearchBtn")?.addEventListener("click", () => {
    const q = ($("#homeQ")?.value || "").trim();
    if(q){
      sessionStorage.setItem("casa_last_query", q);
    }
  });

  // render highlights + map
  renderHighlightsCarousel();
  renderHomeMap();
}

function highlightedLandlords(){
  // pick the top 8 by review recency and rating
  const scored = DB.landlords.map(ld => {
    const s = ratingSummary(ld.id);
    // score: rating + recent activity
    const recencyBoost = clamp(s.recent12, 0, 10) / 10;
    const base = s.count ? (s.avgRounded / 5) : 0;
    return { ld, score: (base * 0.75) + (recencyBoost * 0.25), count: s.count };
  });

  // keep some unrated too if needed
  scored.sort((a,b) => b.score - a.score);
  const top = scored.slice(0, 8).map(x => x.ld);

  // ensure at least 4 items
  if(top.length < 4){
    return DB.landlords.slice(0, 4);
  }
  return top;
}

let highlightsAutoTimer = null;

function renderHighlightsCarousel(){
  const viewport = $("#highlightsViewport");
  const dots = $("#highlightsDots");
  const range = $("#highlightsRange");
  if(!viewport || !dots || !range) return;

  const items = highlightedLandlords();
  viewport.innerHTML = items.map(ld => {
    const s = ratingSummary(ld.id);
    const tier = tierClass(s.avgRounded, s.count);
    const tierTxt = tierLabel(s.avgRounded, s.count);

    const date = (() => {
      // show most recent review date if exists
      const revs = reviewsFor(ld.id).slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
      if(!revs.length) return "";
      const d = new Date(revs[0].createdAt);
      return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
    })();

    const short = (() => {
      const revs = reviewsFor(ld.id).slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
      if(!revs.length) return "No reviews yet.";
      return revs[0].text;
    })();

    return `
      <div class="card card--inner highlightCard ${tier}" style="padding:16px;">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="rowTitle" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${safeText(ld.name)}
                ${badgesHTML(ld)}
              </div>
              ${tierTxt ? `<span class="tierPill">${safeText(tierTxt)}</span>` : ``}
            </div>
            <div class="tiny" style="margin-top:4px;">
              ${safeText([ld.address1, ld.city, ld.state].filter(Boolean).join(" • "))}${ld.borough ? ` • ${safeText(ld.borough)}` : ""}
              ${date ? ` • ${safeText(date)}` : ""}
            </div>

            <div style="margin-top:10px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              ${s.count ? starsHTML(s.avgRounded) : `<span class="tiny">No ratings</span>`}
              ${s.count ? `<div style="font-weight:850;">${s.avgRounded.toFixed(1)}</div>` : ``}
              <div class="tiny">${s.count ? `(${s.count} review${s.count===1?"":"s"})` : ""}</div>
            </div>

            <div style="margin-top:10px; color:rgba(32,21,15,.72); font-weight:600;">
              ${safeText(short)}
            </div>

            <div class="tiny" style="margin-top:10px;">Rating reflects review recency.</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; justify-content:flex-start;">
            <a class="btn btn--primary" href="#/landlord/${encodeURIComponent(ld.id)}">View</a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // dots
  dots.innerHTML = items.map((_,i)=> `<div class="dot ${i===0?"isOn":""}"></div>`).join("");

  const dotEls = $$(".dot", dots);

  function setDot(idx){
    dotEls.forEach((d,i)=> d.classList.toggle("isOn", i===idx));
  }

  function indexFromScroll(){
    const w = viewport.clientWidth;
    const idx = Math.round(viewport.scrollLeft / Math.max(1, w));
    return clamp(idx, 0, items.length-1);
  }

  function syncRange(){
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const v = maxScroll <= 0 ? 0 : Math.round((viewport.scrollLeft / maxScroll) * 100);
    range.value = `${v}`;
    setDot(indexFromScroll());
  }

  viewport.addEventListener("scroll", () => {
    syncRange();
  }, { passive:true });

  range.addEventListener("input", () => {
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const target = maxScroll * (parseInt(range.value,10)/100);
    viewport.scrollTo({ left: target, behavior: "smooth" });
  });

  // autoplay
  if(highlightsAutoTimer) clearInterval(highlightsAutoTimer);
  let idx = 0;
  highlightsAutoTimer = setInterval(() => {
    idx = (idx + 1) % items.length;
    viewport.scrollTo({ left: idx * viewport.clientWidth, behavior: "smooth" });
    setDot(idx);
  }, 3500);

  // pause on hover / touch
  viewport.addEventListener("pointerdown", ()=> { if(highlightsAutoTimer){ clearInterval(highlightsAutoTimer); highlightsAutoTimer=null; } }, { once:true });

  // initial sync
  syncRange();
}

function renderHomeMap(){
  const map = ensureMap("home", "homeMap", { center: [40.73, -73.98], zoom: 11 });
  if(!map) return;
  addLandlordMarkers(map, "home", DB.landlords);
}

/* ---------- SEARCH ---------- */
function renderSearch(){
  const app = $("#app");
  if(!app) return;

  const lastQ = sessionStorage.getItem("casa_last_query") || "";

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
            <a class="btn btn--outline" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="searchTop">
              <input class="input" id="q" placeholder="Search landlord name, management company, or address..." value="${safeText(lastQ)}" />
              <div class="field" style="min-width:240px;">
                <label>Borough</label>
                <select id="borough">
                  <option value="">All boroughs</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                  <option>Other</option>
                </select>
              </div>
              <button class="btn btn--primary" id="doSearch" type="button">Search</button>
            </div>

            <div style="margin-top:14px;">
              <div class="mapBox">
                <div id="searchMap"></div>
              </div>
            </div>

            <div class="divider"></div>

            <div class="list" id="results"></div>
          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;

  const map = ensureMap("search", "searchMap", { center: [40.73, -73.98], zoom: 10 });
  if(map) addLandlordMarkers(map, "search", DB.landlords);

  function run(){
    const q = ($("#q").value || "").trim().toLowerCase();
    const b = ($("#borough").value || "").trim();

    const filtered = DB.landlords.filter(ld => {
      const hay = [
        ld.name, ld.entity, ld.address1, ld.unit, ld.city, ld.state, ld.borough
      ].filter(Boolean).join(" ").toLowerCase();

      const qOk = !q || hay.includes(q);
      const bOk = !b || ((ld.borough || "Other") === b) || (!ld.borough && b === "Other");
      return qOk && bOk;
    });

    const results = $("#results");
    results.innerHTML = filtered.length
      ? filtered.map(ld => landlordCardHTML(ld, { showCenterBtn:true })).join("")
      : `<div class="muted">No results yet. Try a different search.</div>`;

    // bind center buttons
    $$("[data-center]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-center");
        const ld = DB.landlords.find(x => x.id === id);
        if(!ld || !map || typeof ld.lat !== "number") return;
        map.setView([ld.lat, ld.lng], 14, { animate:true });
      });
    });

    // update map markers to filtered set
    if(map) addLandlordMarkers(map, "search", filtered);
  }

  $("#doSearch").addEventListener("click", run);
  $("#q").addEventListener("keydown", (e) => { if(e.key === "Enter") run(); });

  run();
}

/* ---------- ADD LANDLORD ---------- */
function renderAdd(){
  const app = $("#app");
  if(!app) return;

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
            <a class="btn btn--outline" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="card--inner" style="padding:16px;">
                <div class="field">
                  <label>Landlord / Company name <span style="color:#b43;">*</span></label>
                  <input class="input" id="name" placeholder="e.g., Park Ave Management" />
                </div>

                <div class="field" style="margin-top:12px;">
                  <label>Entity (optional)</label>
                  <input class="input" id="entity" placeholder="e.g., Park Ave Management LLC" />
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
                  <div class="field">
                    <label>Address <span style="color:#b43;">*</span></label>
                    <input class="input" id="address1" placeholder="Street address" />
                  </div>
                  <div class="field">
                    <label>Unit (optional)</label>
                    <input class="input" id="unit" placeholder="Apt / Unit" />
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
                  <div class="field">
                    <label>City <span style="color:#b43;">*</span></label>
                    <input class="input" id="city" placeholder="City" />
                  </div>
                  <div class="field">
                    <label>State <span style="color:#b43;">*</span></label>
                    <input class="input" id="state" placeholder="NY" />
                  </div>
                </div>

                <button class="btn btn--primary btn--block" style="margin-top:14px;" id="addBtn" type="button">Add landlord</button>
                <div class="tiny" style="margin-top:10px;">After adding, you’ll be taken to the landlord page where you can rate them.</div>
              </div>

              <div class="card--inner" style="padding:16px;">
                <div class="kicker">Place the pin (optional)</div>
                <div class="muted" style="margin-top:6px;">Click the map to set a location. You won’t enter coordinates.</div>

                <div style="margin-top:12px;" class="mapBox">
                  <div id="addMap"></div>
                </div>
                <div class="tiny" style="margin-top:10px;">Tip: If you don’t pick a pin, we’ll place it near NYC.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;

  const map = ensureMap("add", "addMap", { center: [40.73, -73.98], zoom: 10 });
  let picked = null;

  if(map){
    map.on("click", (e) => {
      picked = { lat: e.latlng.lat, lng: e.latlng.lng };
      if(mapMarkers.addPin){ try{ mapMarkers.addPin.remove(); }catch(err){} }
      mapMarkers.addPin = L.marker([picked.lat, picked.lng]).addTo(map);
      map.setView([picked.lat, picked.lng], 13, { animate:true });
    });
  }

  $("#addBtn").addEventListener("click", () => {
    const name = ($("#name").value || "").trim();
    const entity = ($("#entity").value || "").trim();
    const address1 = ($("#address1").value || "").trim();
    const unit = ($("#unit").value || "").trim();
    const city = ($("#city").value || "").trim();
    const state = ($("#state").value || "").trim();

    if(!name || !address1 || !city || !state){
      openModal({
        title: "Missing required fields",
        body: `<div class="muted">Please fill out <b>Name</b>, <b>Address</b>, <b>City</b>, and <b>State</b>.</div>`,
        footer: `<button class="btn btn--primary" data-close="1" type="button">OK</button>`
      });
      return;
    }

    const id = `ld_${Date.now().toString(36)}`;
    const ld = {
      id,
      name,
      entity,
      address1,
      unit,
      city,
      state,
      borough: "",        // intentionally not collected; search filter will treat as "Other"
      lat: picked?.lat ?? 40.73,
      lng: picked?.lng ?? -73.98,
      verified: false,
      top: false,
      createdAt: nowISO()
    };

    DB.landlords.unshift(ld);
    saveDB(DB);

    location.hash = `#/landlord/${encodeURIComponent(id)}`;
  });
}

/* ---------- PROFILE ---------- */
function renderProfile(id){
  const app = $("#app");
  if(!app) return;

  const ld = DB.landlords.find(x => x.id === id);
  if(!ld){
    location.hash = "#/";
    return;
  }

  const sum = ratingSummary(ld.id);
  const cred = casaCredential(sum);

  const avgTxt = sum.count ? sum.avgRounded.toFixed(1) : "—";
  const countTxt = `${sum.count} review${sum.count===1?"":"s"}`;

  const fullAddr = [
    ld.address1,
    ld.unit ? `Unit ${ld.unit}` : "",
    ld.city,
    ld.state
  ].filter(Boolean).join(", ");

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="bd">

            <div class="profileHeader">
              <div>
                <div class="kicker">Landlord</div>
                <div class="profileName">
                  ${safeText(ld.name)}
                  ${badgesHTML(ld)}
                </div>

                <div class="profileMeta">
                  ${sum.count ? starsHTML(sum.avgRounded) : `<span class="tiny">No ratings yet</span>`}
                  <div style="font-weight:900;">${safeText(avgTxt)}</div>
                  <div class="muted">${safeText(countTxt)}</div>
                  <div class="tiny">Rating reflects review recency.</div>
                  <span class="tierPill">${safeText(cred.label)}</span>
                </div>

                <div class="tiny" style="margin-top:10px;">${safeText(fullAddr)}</div>
              </div>

              <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
                <a class="btn btn--outline" href="#/search">Back</a>
                <button class="btn btn--primary" id="rateBtn" type="button">Rate this landlord</button>
              </div>
            </div>

            <div class="divider"></div>

            <div class="split2">
              <div>
                <div class="kicker">Location</div>
                <div class="mapBox" style="margin-top:10px;">
                  <div id="profileMap"></div>
                </div>
                <button class="btn btn--outline" style="margin-top:12px;" id="centerProfile" type="button">Center on map</button>

                <div class="divider"></div>

                <div class="kicker">Rating distribution</div>
                <div class="hist" id="hist"></div>
              </div>

              <div>
                <div class="kicker">Reviews</div>
                <div class="list" id="reviews" style="margin-top:10px;"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;

  // map
  const map = ensureMap("profile", "profileMap", { center: [ld.lat, ld.lng], zoom: 12 });
  if(map){
    if(mapMarkers.profilePin){ try{ mapMarkers.profilePin.remove(); }catch(e){} }
    mapMarkers.profilePin = L.marker([ld.lat, ld.lng]).addTo(map);
  }
  $("#centerProfile")?.addEventListener("click", () => {
    if(map) map.setView([ld.lat, ld.lng], 14, { animate:true });
  });

  // histogram
  const hist = $("#hist");
  if(hist){
    const dist = sum.dist; // [1..5]
    const total = Math.max(1, sum.count);
    hist.innerHTML = [5,4,3,2,1].map(st => {
      const c = dist[st-1] || 0;
      const pct = Math.round((c/total) * 100);
      return `
        <div class="histRow">
          <div class="tiny" style="font-weight:800;">${st}★</div>
          <div class="bar"><span style="width:${pct}%;"></span></div>
          <div class="tiny" style="text-align:right;">${c}</div>
        </div>
      `;
    }).join("");
  }

  // reviews list
  renderReviewList(ld.id);

  // rate modal
  $("#rateBtn")?.addEventListener("click", () => openReviewModal(ld.id));
}

function renderReviewList(landlordId){
  const container = $("#reviews");
  if(!container) return;

  const revs = reviewsFor(landlordId)
    .slice()
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  if(!revs.length){
    container.innerHTML = `<div class="muted">No reviews yet. Be the first.</div>`;
    return;
  }

  container.innerHTML = revs.map(r => {
    const d = new Date(r.createdAt);
    const date = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
    return `
      <div class="rowCard card--inner" style="flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${starsHTML(r.stars)}
            <div style="font-weight:900;">${r.stars}/5</div>
          </div>
          <div class="tiny">${safeText(date)}</div>
        </div>
        <div style="margin-top:10px; color:rgba(32,21,15,.72); font-weight:600;">${safeText(r.text)}</div>

        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
          <button class="btn btn--outline" data-report="${safeText(r.id)}" type="button">Report</button>
        </div>
      </div>
    `;
  }).join("");

  $$("[data-report]").forEach(btn => {
    btn.addEventListener("click", () => {
      openModal({
        title: "Report review",
        body: `
          <div class="muted">Thanks — reporting helps keep reviews useful and safe.</div>
          <div class="field" style="margin-top:12px;">
            <label>Reason</label>
            <select id="reportReason">
              <option>Spam</option>
              <option>Harassment</option>
              <option>Doxxing / personal info</option>
              <option>False claim</option>
              <option>Other</option>
            </select>
          </div>
        `,
        footer: `
          <button class="btn btn--outline" data-close="1" type="button">Cancel</button>
          <button class="btn btn--primary" data-close="1" type="button">Submit</button>
        `
      });
    });
  });
}

function openReviewModal(landlordId){
  openModal({
    title: "Leave a review",
    body: `
      <div class="field">
        <label>Rating</label>
        <select id="rvStars">
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Good</option>
          <option value="3">3 — Okay</option>
          <option value="2">2 — Poor</option>
          <option value="1">1 — Bad</option>
        </select>
      </div>

      <div class="field" style="margin-top:12px;">
        <label>What happened?</label>
        <textarea id="rvText" placeholder="Keep it factual and specific."></textarea>
        <div class="tiny" style="margin-top:6px;">Minimum 20 characters.</div>
      </div>
    `,
    footer: `
      <button class="btn btn--outline" data-close="1" type="button">Cancel</button>
      <button class="btn btn--primary" id="rvSubmit" type="button">Submit</button>
    `
  });

  $("#rvSubmit")?.addEventListener("click", () => {
    const stars = parseInt($("#rvStars").value, 10);
    const text = ($("#rvText").value || "").trim();
    if(text.length < 20){
      openModal({
        title: "Add a bit more detail",
        body: `<div class="muted">Please write at least 20 characters so the review is useful.</div>`,
        footer: `<button class="btn btn--primary" data-close="1" type="button">OK</button>`
      });
      return;
    }

    DB.reviews.unshift({
      id: `rv_${Date.now().toString(36)}`,
      landlordId,
      stars,
      text,
      createdAt: nowISO()
    });
    saveDB(DB);

    closeModal();
    // re-render profile (so stars, histogram, tiers update)
    route();
  });
}

/* ---------- HOW + TRUST ---------- */
function renderHow(){
  const app = $("#app");
  if(!app) return;

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
            <a class="btn btn--outline" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="list">
              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Search</div>
                <div class="rowSub">Find a landlord by name, entity, address, or borough.</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Review</div>
                <div class="rowSub">Post instantly (no account required). Reviews are shown publicly.</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Respond (verified landlords)</div>
                <div class="rowSub">Landlords create accounts only in the Landlord Portal and verify documents before responding publicly.</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Report issues</div>
                <div class="rowSub">Spam, harassment, and personal info can be reported for review.</div>
              </div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;
}

function renderTrust(){
  const app = $("#app");
  if(!app) return;

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
            <a class="btn btn--outline" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="list">
              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">No reviewer accounts</div>
                <div class="rowSub">Tenants can post without accounts; edits can be added later if you choose to implement edit links.</div>
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
                <div class="rowSub">Every review can be reported for spam, harassment, or false claims.</div>
              </div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;
}

/* ---------- PORTAL ---------- */
function renderPortal(){
  const app = $("#app");
  if(!app) return;

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
            <a class="btn btn--outline" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="card--inner" style="padding:16px;">
                <div class="kicker">Sign in</div>

                <div class="field" style="margin-top:12px;">
                  <label>Email</label>
                  <input class="input" id="le" placeholder="you@company.com"/>
                </div>
                <div class="field" style="margin-top:12px;">
                  <label>Password</label>
                  <input class="input" id="lp" type="password" placeholder="Password"/>
                </div>

                <button class="btn btn--primary btn--block" style="margin-top:12px;" id="login" type="button">Sign in</button>

                <div class="tiny" style="margin:14px 0 10px; text-align:center;">or continue with</div>

                <button class="btn btn--outline btn--block" id="g" type="button">${providerIcon("google")} Continue with Google</button>
                <div style="height:8px;"></div>
                <button class="btn btn--outline btn--block" id="a" type="button">${providerIcon("apple")} Continue with Apple</button>
                <div style="height:8px;"></div>
                <button class="btn btn--outline btn--block" id="m" type="button">${providerIcon("microsoft")} Continue with Microsoft</button>
              </div>

              <div class="card--inner" style="padding:16px;">
                <div class="kicker">Create account</div>

                <div class="field" style="margin-top:12px;">
                  <label>Email</label>
                  <input class="input" id="se" placeholder="you@company.com"/>
                </div>
                <div class="field" style="margin-top:12px;">
                  <label>Password</label>
                  <input class="input" id="sp" type="password" placeholder="Create a password"/>
                </div>

                <div class="field" style="margin-top:12px;">
                  <label>Verification document (demo)</label>
                  <div class="file">
                    <input id="doc" type="file"/>
                  </div>
                  <div class="tiny" style="margin-top:8px;">Deed, property tax bill, management agreement, utility statement, etc.</div>
                </div>

                <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup" type="button">Create account</button>
                <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted. (Production: Stripe subscription required to claim/verify.)</div>
              </div>
            </div>

            <div class="card--inner" style="padding:14px; margin-top:14px;">
              <div style="font-weight:850;">Plans (demo copy)</div>
              <div class="muted" style="margin-top:6px;">Claimed — $39/mo • Verified — $99/mo • Certified/Pro — $299/mo</div>
              <div class="tiny" style="margin-top:6px;">Landlords must subscribe to claim or verify.</div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div>© 2026 casa</div>
      <div style="display:flex; gap:14px;">
        <a href="#/trust">Trust & Safety</a>
        <a href="#/how">How it works</a>
        <a href="#/search">Search</a>
      </div>
    </div>
  `;

  $("#login")?.addEventListener("click", () => {
    openModal({
      title: "Demo",
      body: `<div class="muted">Sign-in is demo-only right now.</div>`,
      footer: `<button class="btn btn--primary" data-close="1" type="button">OK</button>`
    });
  });

  $("#signup")?.addEventListener("click", () => {
    openModal({
      title: "Demo",
      body: `<div class="muted">Account creation + verification is demo-only right now.</div>`,
      footer: `<button class="btn btn--primary" data-close="1" type="button">OK</button>`
    });
  });

  ["g","a","m"].forEach(id => {
    $(`#${id}`)?.addEventListener("click", () => {
      openModal({
        title: "Demo",
        body: `<div class="muted">OAuth is demo-only right now.</div>`,
        footer: `<button class="btn btn--primary" data-close="1" type="button">OK</button>`
      });
    });
  });
}

function providerIcon(which){
  const common = `style="width:16px;height:16px;display:inline-block" aria-hidden="true"`;
  if(which === "google"){
    return `
      <svg ${common} viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.9 0-.7-.1-1.2-.2-1.7H12z"/>
      </svg>
    `;
  }
  if(which === "apple"){
    return `
      <svg ${common} viewBox="0 0 24 24">
        <path fill="#111" d="M16.7 13.3c0-2 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 2-.9 2.7-1.9.8-1.1 1.1-2.2 1.1-2.2-.1 0-2.8-1.1-2.8-4.0zM14.6 6.9c.6-.8 1-1.8.9-2.9-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.7-1.3z"/>
      </svg>
    `;
  }
  // microsoft
  return `
    <svg ${common} viewBox="0 0 24 24">
      <path fill="#F25022" d="M3 3h8v8H3z"/>
      <path fill="#7FBA00" d="M13 3h8v8h-8z"/>
      <path fill="#00A4EF" d="M3 13h8v8H3z"/>
      <path fill="#FFB900" d="M13 13h8v8h-8z"/>
    </svg>
  `;
}
