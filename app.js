/* =========================
   CASA — SPA (Hash Router)
   ========================= */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ---------- Badge assets (YOU MUST ADD THESE FILES) ----------
   /assets/badges/verified.png  (Blue check badge image)
   /assets/badges/top.png       (CASA logo badge image)
-------------------------------------------------------------- */
const BADGE_VERIFIED_SRC = "assets/badges/verified.png";
const BADGE_TOP_SRC = "assets/badges/top.png";

/* ---------- Local Storage ---------- */
const LS = {
  landlords: "casa_landlords_v1",
  reviews: "casa_reviews_v1",
  replies: "casa_replies_v1",
};

function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function save(key, val){
  localStorage.setItem(key, JSON.stringify(val));
}

/* ---------- Seed Data (safe) ---------- */
function ensureSeed(){
  const landlords = load(LS.landlords, null);
  const reviews = load(LS.reviews, null);

  if (!landlords || !Array.isArray(landlords) || landlords.length === 0){
    const seeded = [
      {
        id: uid(),
        name: "Northside Properties",
        entity: "Northside Properties LLC",
        address: { address:"123 Main St", unit:"", city:"Brooklyn", state:"NY" },
        borough: "Brooklyn",
        lat: 40.717, lng: -73.956,
        verified: true,
        topLandlord: false,
        claimed: true,
      },
      {
        id: uid(),
        name: "Park Ave Management",
        entity: "Park Ave Management LLC",
        address: { address:"22 Park Ave", unit:"", city:"New York", state:"NY" },
        borough: "Manhattan",
        lat: 40.743, lng: -73.983,
        verified: true,
        topLandlord: true,
        claimed: true,
      },
      {
        id: uid(),
        name: "Elmhurst Holdings",
        entity: "Elmhurst Holdings",
        address: { address:"86-12 Broadway", unit:"", city:"Queens", state:"NY" },
        borough: "Queens",
        lat: 40.742, lng: -73.877,
        verified: false,
        topLandlord: false,
        claimed: false,
      }
    ];
    save(LS.landlords, seeded);
  }

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0){
    const lls = load(LS.landlords, []);
    const byName = (n)=> lls.find(x => x.name === n)?.id;

    const seededReviews = [
      {
        id: uid(),
        landlordId: byName("Northside Properties"),
        rating: 4,
        text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
        createdAt: "2026-01-05T12:00:00.000Z",
      },
      {
        id: uid(),
        landlordId: byName("Park Ave Management"),
        rating: 3,
        text: "Great location, but communication was slow. Security deposit itemization took weeks.",
        createdAt: "2025-12-18T12:00:00.000Z",
      },
      {
        id: uid(),
        landlordId: byName("Elmhurst Holdings"),
        rating: 5,
        text: "Responsive management. Clear lease terms and quick repairs.",
        createdAt: "2025-11-30T12:00:00.000Z",
      }
    ].filter(r => r.landlordId);

    save(LS.reviews, seededReviews);
  }
}

/* ---------- Helpers ---------- */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function slugify(s){
  return (s || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function fmtDate(iso){
  try{
    const d = new Date(iso);
    return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  }catch(e){ return ""; }
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function starsVis(rating){
  const r = clamp(Math.round(rating), 0, 5);
  return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5-r);
}

/* ---------- Recency-weighted rating (simple, credibility-minded) ----------
   Weight decreases with age:
   w = exp(-ageDays / 365)
   Returns { avg, count, dist, note }
-------------------------------------------------------------------------- */
function ratingStats(landlordId){
  const reviews = load(LS.reviews, []).filter(r => r.landlordId === landlordId);
  const count = reviews.length;

  const dist = {1:0,2:0,3:0,4:0,5:0};
  if (count === 0){
    return { avg: 0, rounded: 0, count: 0, dist, note: "" };
  }

  const now = Date.now();
  let wsum = 0;
  let rsum = 0;

  for (const rv of reviews){
    const ageDays = Math.max(0, (now - new Date(rv.createdAt).getTime()) / (1000*60*60*24));
    const w = Math.exp(-ageDays / 365);
    wsum += w;
    rsum += (rv.rating * w);
    dist[rv.rating] = (dist[rv.rating] || 0) + 1;
  }

  const avg = rsum / (wsum || 1);
  const rounded = Math.round(avg * 10) / 10; // 1 decimal

  return {
    avg,
    rounded,
    count,
    dist,
    note: "Rating reflects review recency."
  };
}

/* ---------- Tier coloring (Implement EXACT boundaries using rounded rating) ----------
   If reviewCount===0 -> no tier.
   red:    1.00 <= rounded <= 2.99
   yellow: 2.99 <  rounded <= 3.99   (i.e., 3.0–3.99)
   green:  4.00 <= rounded <= 5.00
------------------------------------------------------------------------- */
function ratingTierClass(rounded, count){
  if (!count || count === 0) return "";
  if (rounded >= 1.0 && rounded <= 2.99) return "tierRed";
  if (rounded > 2.99 && rounded <= 3.99) return "tierYellow";
  if (rounded >= 4.0 && rounded <= 5.0) return "tierGreen";
  return "";
}
function ratingTierLabel(rounded, count){
  if (!count || count === 0) return "";
  if (rounded >= 1.0 && rounded <= 2.99) return "Low Rating";
  if (rounded > 2.99 && rounded <= 3.99) return "Mixed Reviews";
  if (rounded >= 4.0 && rounded <= 5.0) return "Highly Rated";
  return "";
}

/* ---------- Credentials (public states) ----------
   Unrated: 0 reviews
   Not yet CASA Rated — needs more reviews: <10 total OR <3 in last 12 months
   CASA Rated: 10+ total AND 3+ in last 12 months
   Verified: landlord.verified
   Top: landlord.topLandlord
----------------------------------------------- */
function credentialText(landlord){
  const reviews = load(LS.reviews, []).filter(r => r.landlordId === landlord.id);
  const total = reviews.length;
  if (total === 0) return "Unrated";

  const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
  const recent = reviews.filter(r => new Date(r.createdAt).getTime() >= twelveMonthsAgo).length;

  if (total < 10 || recent < 3) return "Not yet CASA Rated — needs more reviews";
  return "CASA Rated";
}

/* ---------- Badges UI ---------- */
function badgeHTML(landlord){
  const parts = [];
  if (landlord.verified){
    parts.push(`<img class="badgeImg" src="${BADGE_VERIFIED_SRC}" alt="Verified Landlord"
      title="Verified Landlord (ownership verified)"/>`);
  }
  if (landlord.topLandlord){
    parts.push(`<img class="badgeImg" src="${BADGE_TOP_SRC}" alt="Top Landlord"
      title="Top Landlord (high rating + consistent performance)"/>`);
  }
  if (!parts.length) return "";
  return `<span class="badges">${parts.join("")}</span>`;
}

/* ---------- Map globals ---------- */
let homeMap = null;
let searchMap = null;
let addMap = null;
let activeMarkers = [];
let addPinMarker = null;
let addPinLatLng = null;

/* ---------- Router ---------- */
function route(){
  closeMenu(); // if mobile menu open, close on nav
  const hash = (location.hash || "#/").replace("#", "");
  const [path, qs] = hash.split("?");
  const params = new URLSearchParams(qs || "");

  // cleanup any modal
  closeModal();

  // Render route
  if (path === "/" || path === "") return renderHome();
  if (path === "/search") return renderSearch(params);
  if (path === "/add") return renderAdd();
  if (path === "/how") return renderHow();
  if (path === "/trust") return renderTrust();
  if (path === "/portal") return renderPortal();
  if (path.startsWith("/landlord/")){
    const id = path.split("/landlord/")[1];
    return renderLandlord(id);
  }
  // fallback
  return renderHome();
}

/* ---------- MENU (mobile drawer) ---------- */
function openMenu(){
  const drawer = $("#mobileDrawer");
  const btn = $("#menuBtn");
  drawer?.classList.add("isOpen");
  drawer?.setAttribute("aria-hidden","false");
  btn?.setAttribute("aria-expanded","true");
}
function closeMenu(){
  const drawer = $("#mobileDrawer");
  const btn = $("#menuBtn");
  drawer?.classList.remove("isOpen");
  drawer?.setAttribute("aria-hidden","true");
  btn?.setAttribute("aria-expanded","false");
}
function initMenu(){
  $("#menuBtn")?.addEventListener("click", ()=>{
    const drawer = $("#mobileDrawer");
    if (drawer?.classList.contains("isOpen")) closeMenu();
    else openMenu();
  });
  $("#menuClose")?.addEventListener("click", closeMenu);
  $("#menuBackdrop")?.addEventListener("click", closeMenu);

  // Close drawer when tapping any drawer link
  $("#mobileDrawer")?.addEventListener("click",(e)=>{
    const a = e.target?.closest?.("a");
    if (a) closeMenu();
  });
}

/* ---------- Render shell helpers ---------- */
function setApp(html){
  const app = $("#app");
  if (app) app.innerHTML = html;
}
function safeInitMap(kind){
  // invalidate after paint
  setTimeout(()=>{
    try{
      if (kind === "home" && homeMap) homeMap.invalidateSize();
      if (kind === "search" && searchMap) searchMap.invalidateSize();
      if (kind === "add" && addMap) addMap.invalidateSize();
    }catch(e){}
  }, 80);
}
function clearMarkers(){
  for (const m of activeMarkers){
    try{ m.remove(); }catch(e){}
  }
  activeMarkers = [];
}

/* ---------- Home ---------- */
function renderHome(){
  const landlords = load(LS.landlords, []);
  const reviews = load(LS.reviews, []);

  const highlights = computeHighlights(landlords, reviews);

  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card heroCard soft">
          <div class="heroTop">
            <div>
              <div class="kicker">CASA</div>
              <h1>Know your landlord<br/>before you sign.</h1>
              <div class="muted">Search landlords, read tenant reviews, and add your building in minutes.</div>
            </div>
            <div class="heroActions">
              <a class="btn btn--primary" href="#/search">Search</a>
              <a class="btn" href="#/add">Add a landlord</a>
            </div>
          </div>

          <div class="searchRow">
            <input class="input" id="homeQ" placeholder="Search landlord name, management company, or address..." />
            <button class="btn btn--primary" id="homeGo">Search</button>
          </div>

          <div class="inlineNote">No account required to review. Verified landlords can respond.</div>

          <!-- Search / Review / Rent tiles (no Tap/Info) -->
          <div class="triplets">
            <div class="tile" data-tile="search">
              <div class="tileLeft">
                <div class="tileIcon">⌕</div>
                <div class="tileStack">
                  <div class="tileTitle">Search</div>
                  <div class="tileBody">Search by name, entity or address</div>
                </div>
              </div>
            </div>

            <div class="tile" data-tile="review">
              <div class="tileLeft">
                <div class="tileIcon">★</div>
                <div class="tileStack">
                  <div class="tileTitle">Review</div>
                  <div class="tileBody">Leave a rating based on select categories</div>
                </div>
              </div>
            </div>

            <div class="tile isDisabled">
              <div class="tileLeft">
                <div class="tileIcon">⌂</div>
                <div class="tileStack">
                  <div class="tileTitle">Rent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom 2-up: Recent highlights + Map (half/half) -->
        <div class="grid2">
          <div class="card soft">
            <div class="hd">
              <div>
                <div class="kicker">FEATURED REVIEWS</div>
                <h2 class="panelTitle">Recent highlights</h2>
                <div class="panelSub">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn" href="#/search">Browse all</a>
            </div>
            <div class="bd">
              <div class="carousel" aria-label="Recent highlights carousel">
                <div class="carouselTrack" id="hiTrack">
                  ${highlights.map(h => highlightSlideHTML(h)).join("")}
                </div>
                <div class="carouselDots" id="hiDots"></div>
              </div>
            </div>
          </div>

          <div class="card soft">
            <div class="hd">
              <div>
                <div class="kicker">MAP</div>
                <h2 class="panelTitle">Browse by location</h2>
                <div class="panelSub">Pins reflect existing ratings.</div>
              </div>
              <a class="btn" href="#/search">Open search</a>
            </div>
            <div class="bd">
              <div class="mapFrame">
                <div class="map" id="homeMap"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);

  // Hero search
  $("#homeGo")?.addEventListener("click", ()=>{
    const q = ($("#homeQ")?.value || "").trim();
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
  $("#homeQ")?.addEventListener("keydown",(e)=>{
    if (e.key === "Enter") $("#homeGo")?.click();
  });

  // Tile expand
  $$(".tile[data-tile]").forEach(t=>{
    t.addEventListener("click", ()=>{
      // toggle open, but only one at a time
      $$(".tile[data-tile]").forEach(x=> x.classList.remove("isOpen"));
      t.classList.add("isOpen");
    });
  });

  // Highlights carousel (scroll wheel + autoplay + dots)
  initCarousel("#hiTrack", "#hiDots");

  // Map
  initHomeMap();

  safeInitMap("home");
}

function computeHighlights(landlords, reviews){
  // pick the most recent review per landlord, then sort by recency (desc)
  const byLandlord = new Map();
  for (const r of reviews){
    const cur = byLandlord.get(r.landlordId);
    if (!cur || new Date(r.createdAt) > new Date(cur.createdAt)){
      byLandlord.set(r.landlordId, r);
    }
  }
  const items = [];
  for (const l of landlords){
    const last = byLandlord.get(l.id);
    const stats = ratingStats(l.id);
    items.push({
      landlord: l,
      lastReview: last || null,
      stats
    });
  }
  items.sort((a,b)=>{
    const ad = a.lastReview ? new Date(a.lastReview.createdAt).getTime() : 0;
    const bd = b.lastReview ? new Date(b.lastReview.createdAt).getTime() : 0;
    return bd - ad;
  });
  // keep up to 8 slides
  return items.slice(0, 8);
}

function highlightSlideHTML(item){
  const l = item.landlord;
  const s = item.stats;
  const tierClass = ratingTierClass(s.rounded, s.count);
  const tierLabel = ratingTierLabel(s.rounded, s.count);
  const locationLine = compactLocation(l);

  const reviewText = item.lastReview?.text
    ? escapeHTML(item.lastReview.text)
    : "Be the first to post a review.";

  const reviewDate = item.lastReview?.createdAt ? fmtDate(item.lastReview.createdAt) : "";

  return `
    <div class="carouselItem">
      <div class="landCard ${tierClass}">
        <div class="landTop">
          <div style="min-width:0">
            <div class="landNameRow">
              <div class="landName">${escapeHTML(l.name)}</div>
              ${badgeHTML(l)}
            </div>
            <div class="landMeta">${escapeHTML(locationLine)} ${reviewDate ? "• " + reviewDate : ""}</div>
          </div>
          ${tierLabel ? `<span class="tierLabel">${tierLabel}</span>` : ""}
        </div>

        <div class="stars">
          <span class="starsVis">${starsVis(s.rounded || 0)}</span>
          <span class="score">${s.count ? `${s.rounded.toFixed(1)}` : "—"}</span>
          <span class="landMeta">${s.count ? `(${s.count} reviews)` : "(0 reviews)"}</span>
        </div>

        <div class="landMeta" style="flex:1; line-height:1.45;">
          ${reviewText}
        </div>

        <div class="row">
          <div class="tiny">${s.count ? s.note : ""}</div>
          <a class="btn btn--primary" href="#/landlord/${encodeURIComponent(l.id)}">View</a>
        </div>
      </div>
    </div>
  `;
}

function initCarousel(trackSel, dotsSel){
  const track = $(trackSel);
  const dots = $(dotsSel);
  if (!track || !dots) return;

  const slides = $$(".carouselItem", track);
  dots.innerHTML = slides.map((_,i)=> `<div class="dot ${i===0?"isActive":""}"></div>`).join("");

  let idx = 0;
  let timer = null;

  function setActiveDot(i){
    $$(".dot", dots).forEach((d,di)=> d.classList.toggle("isActive", di===i));
  }

  function snapTo(i){
    idx = (i + slides.length) % slides.length;
    const el = slides[idx];
    if (el) el.scrollIntoView({behavior:"smooth", inline:"start", block:"nearest"});
    setActiveDot(idx);
  }

  function start(){
    stop();
    timer = setInterval(()=> snapTo(idx + 1), 3200);
  }
  function stop(){
    if (timer) clearInterval(timer);
    timer = null;
  }

  // update dot based on scroll position (best-effort)
  track.addEventListener("scroll", ()=>{
    const w = track.clientWidth;
    const x = track.scrollLeft;
    const i = Math.round(x / Math.max(1, w));
    if (i !== idx){
      idx = clamp(i, 0, slides.length-1);
      setActiveDot(idx);
    }
  }, {passive:true});

  // pause on hover/touch
  track.addEventListener("mouseenter", stop);
  track.addEventListener("mouseleave", start);
  track.addEventListener("touchstart", stop, {passive:true});
  track.addEventListener("touchend", start, {passive:true});

  start();
}

/* ---------- Map init (Home) ---------- */
function initHomeMap(){
  const el = $("#homeMap");
  if (!el) return;

  // if already exists, just refresh markers
  if (!homeMap){
    homeMap = L.map(el, { zoomControl:true }).setView([40.73, -73.98], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(homeMap);
  }

  clearMarkers();
  const landlords = load(LS.landlords, []);
  for (const l of landlords){
    if (typeof l.lat !== "number" || typeof l.lng !== "number") continue;
    const stats = ratingStats(l.id);
    const popup = `
      <div style="font-weight:900; margin-bottom:6px;">${escapeHTML(l.name)}</div>
      <div style="opacity:.75; font-weight:700; margin-bottom:6px;">${escapeHTML(compactLocation(l))}</div>
      <div style="font-weight:900;">${stats.count ? `${starsVis(stats.rounded)} ${stats.rounded.toFixed(1)} (${stats.count})` : "No ratings yet"}</div>
      <div style="margin-top:10px;"><a href="#/landlord/${encodeURIComponent(l.id)}">View profile →</a></div>
    `;
    const m = L.marker([l.lat, l.lng]).addTo(homeMap).bindPopup(popup);
    activeMarkers.push(m);
  }
}

/* ---------- Search ---------- */
function renderSearch(params){
  const q = (params.get("q") || "").trim();
  const borough = (params.get("b") || "all").trim();

  const landlords = load(LS.landlords, []);
  const boroughs = ["All boroughs", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

  const filtered = landlords.filter(l=>{
    const hay = `${l.name} ${l.entity || ""} ${fullAddress(l)} ${l.borough || ""}`.toLowerCase();
    const okQ = !q || hay.includes(q.toLowerCase());
    const okB = (borough === "all") || ((l.borough || "").toLowerCase() === borough);
    return okQ && okB;
  });

  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card soft">
          <div class="hd">
            <div>
              <div class="kicker">SEARCH</div>
              <h2>Find a landlord</h2>
              <div class="muted">Search by name, entity or address. Filter by borough.</div>
            </div>
            <a class="btn" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="searchRow" style="margin-top:0;">
              <input class="input" id="sq" value="${escapeAttr(q)}" placeholder="Search landlord name, management company, or address..." />
              <select class="select" id="sb">
                ${boroughs.map(b=> {
                  const val = b === "All boroughs" ? "all" : b.toLowerCase();
                  const sel = (val === (borough || "all")) ? "selected" : "";
                  return `<option value="${val}" ${sel}>${b}</option>`;
                }).join("")}
              </select>
              <button class="btn btn--primary" id="sgo">Search</button>
            </div>

            <!-- MAP ON TOP (like before) -->
            <div class="mapFrame" style="margin-top:14px;">
              <div class="map" id="searchMap"></div>
            </div>

            <div class="stack" style="margin-top:14px;">
              ${filtered.map(l => searchCardHTML(l)).join("") || `<div class="tiny">No results found.</div>`}
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);

  $("#sgo")?.addEventListener("click", ()=>{
    const nq = ($("#sq")?.value || "").trim();
    const nb = ($("#sb")?.value || "all").trim();
    location.hash = `#/search?q=${encodeURIComponent(nq)}&b=${encodeURIComponent(nb)}`;
  });
  $("#sq")?.addEventListener("keydown", (e)=>{ if (e.key==="Enter") $("#sgo")?.click(); });

  initSearchMap(filtered);
  safeInitMap("search");
}

function searchCardHTML(l){
  const stats = ratingStats(l.id);
  const tierClass = ratingTierClass(stats.rounded, stats.count);
  const tierLabel = ratingTierLabel(stats.rounded, stats.count);
  const cred = credentialText(l);

  return `
    <div class="resultCard ${tierClass}">
      <div class="resultLeft">
        <div class="landNameRow">
          <div class="landName">${escapeHTML(l.name)}</div>
          ${badgeHTML(l)}
          ${tierLabel ? `<span class="tierLabel">${tierLabel}</span>` : ""}
        </div>
        <div class="landMeta">${escapeHTML(compactLocation(l))}</div>

        <div class="stars">
          <span class="starsVis">${stats.count ? starsVis(stats.rounded) : "☆☆☆☆☆"}</span>
          <span class="score">${stats.count ? stats.rounded.toFixed(1) : "—"}</span>
          <span class="landMeta">${stats.count ? `(${stats.count} reviews)` : "(0 reviews)"}</span>
        </div>

        <div class="tiny">${cred}${stats.count ? ` • ${stats.note}` : ""}</div>
      </div>

      <div class="resultRight">
        <a class="btn btn--primary" href="#/landlord/${encodeURIComponent(l.id)}">View profile</a>
        <button class="btn" data-center="${escapeAttr(l.id)}" type="button">Center on map</button>
      </div>
    </div>
  `;
}

function initSearchMap(list){
  const el = $("#searchMap");
  if (!el) return;

  if (!searchMap){
    searchMap = L.map(el, { zoomControl:true }).setView([40.73, -73.98], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(searchMap);
  }

  clearMarkers();
  for (const l of list){
    if (typeof l.lat !== "number" || typeof l.lng !== "number") continue;
    const stats = ratingStats(l.id);
    const popup = `
      <div style="font-weight:900; margin-bottom:6px;">${escapeHTML(l.name)} ${badgeHTML(l)}</div>
      <div style="opacity:.75; font-weight:700; margin-bottom:6px;">${escapeHTML(compactLocation(l))}</div>
      <div style="font-weight:900;">${stats.count ? `${starsVis(stats.rounded)} ${stats.rounded.toFixed(1)} (${stats.count})` : "No ratings yet"}</div>
      <div style="margin-top:10px;"><a href="#/landlord/${encodeURIComponent(l.id)}">View profile →</a></div>
    `;
    const m = L.marker([l.lat, l.lng]).addTo(searchMap).bindPopup(popup);
    activeMarkers.push(m);
  }

  // center buttons
  $$("button[data-center]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-center");
      const l = load(LS.landlords, []).find(x => x.id === id);
      if (!l || typeof l.lat !== "number" || typeof l.lng !== "number") return;
      searchMap.setView([l.lat, l.lng], 13, {animate:true});
    });
  });

  // Fit bounds if results have markers
  const pts = list.filter(l => typeof l.lat==="number" && typeof l.lng==="number").map(l => [l.lat,l.lng]);
  if (pts.length >= 2){
    try{
      const b = L.latLngBounds(pts);
      searchMap.fitBounds(b.pad(0.18));
    }catch(e){}
  } else if (pts.length === 1){
    searchMap.setView(pts[0], 13);
  }
}

/* ---------- Add Landlord ---------- */
function renderAdd(){
  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card soft">
          <div class="hd">
            <div>
              <div class="kicker">ADD</div>
              <h2>Add a landlord</h2>
              <div class="muted">Add the landlord first. You can rate them immediately after.</div>
            </div>
            <a class="btn" href="#/">Home</a>
          </div>

          <div class="bd">
            <div style="display:grid; grid-template-columns: 1.1fr .9fr; gap:14px;">
              <div class="card" style="box-shadow:none; background:transparent;">
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <div class="field">
                    <label class="req">Landlord / Company name</label>
                    <input class="input" id="aname" placeholder="e.g., Park Ave Management" />
                  </div>

                  <div class="field">
                    <label>Entity (optional)</label>
                    <input class="input" id="aentity" placeholder="e.g., Park Ave Management LLC" />
                  </div>

                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="field">
                      <label class="req">Address</label>
                      <input class="input" id="aaddr" placeholder="Street address" />
                    </div>
                    <div class="field">
                      <label>Unit (optional)</label>
                      <input class="input" id="aunit" placeholder="Apt / Unit" />
                    </div>
                  </div>

                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="field">
                      <label class="req">City</label>
                      <input class="input" id="acity" placeholder="City" />
                    </div>
                    <div class="field">
                      <label class="req">State</label>
                      <input class="input" id="astate" placeholder="NY" />
                    </div>
                  </div>

                  <button class="btn btn--primary btn--block" id="addBtn">Add landlord</button>
                  <div class="tiny">After adding, you’ll be taken to the landlord page where you can rate them.</div>
                </div>
              </div>

              <div class="card" style="box-shadow:none; background:transparent;">
                <div class="kicker" style="margin-bottom:8px;">PLACE THE PIN (OPTIONAL)</div>
                <div class="muted" style="margin-top:0;">Click the map to set a location. You won’t enter coordinates.</div>
                <div class="mapFrame" style="margin-top:10px;">
                  <div class="map" id="addMap"></div>
                </div>
                <div class="tiny" style="margin-top:10px;">Tip: If you don’t pick a pin, we’ll place it near NYC.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);

  initAddMap();
  safeInitMap("add");

  $("#addBtn")?.addEventListener("click", ()=>{
    const name = ($("#aname")?.value || "").trim();
    const entity = ($("#aentity")?.value || "").trim();
    const address = ($("#aaddr")?.value || "").trim();
    const unit = ($("#aunit")?.value || "").trim();
    const city = ($("#acity")?.value || "").trim();
    const state = ($("#astate")?.value || "").trim();

    if (!name || !address || !city || !state){
      alert("Please fill out all required fields: Name, Address, City, State.");
      return;
    }

    const landlords = load(LS.landlords, []);
    const id = uid();

    const fallback = { lat: 40.73, lng: -73.98 };
    const lat = addPinLatLng?.lat ?? fallback.lat;
    const lng = addPinLatLng?.lng ?? fallback.lng;

    const newL = {
      id,
      name,
      entity,
      address: { address, unit, city, state },
      borough: "", // removed from Add flow
      lat, lng,
      verified: false,
      topLandlord: false,
      claimed: false
    };

    landlords.unshift(newL);
    save(LS.landlords, landlords);

    location.hash = `#/landlord/${encodeURIComponent(id)}&new=1`;
  });
}

function initAddMap(){
  const el = $("#addMap");
  if (!el) return;

  if (!addMap){
    addMap = L.map(el, { zoomControl:true }).setView([40.73, -73.98], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(addMap);

    addMap.on("click", (e)=>{
      addPinLatLng = e.latlng;
      if (addPinMarker){
        try{ addPinMarker.setLatLng(e.latlng); }catch(_){}
      } else {
        addPinMarker = L.marker(e.latlng).addTo(addMap);
      }
    });
  }
}

/* ---------- Landlord Profile (Trust page core) ---------- */
function renderLandlord(id){
  const landlords = load(LS.landlords, []);
  const l = landlords.find(x => x.id === id);
  if (!l){
    setApp(`<section class="section"><div class="wrap"><div class="card soft"><div class="bd">Not found.</div></div></div></section>`);
    return;
  }

  const stats = ratingStats(l.id);
  const tierClass = ratingTierClass(stats.rounded, stats.count);
  const cred = credentialText(l);

  const reviews = load(LS.reviews, []).filter(r => r.landlordId === l.id)
    .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  const dist = stats.dist;

  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card soft">
          <div class="hd">
            <div style="min-width:0;">
              <div class="kicker">LANDLORD</div>
              <div class="landNameRow" style="margin-top:6px;">
                <h2 style="margin:0;">${escapeHTML(l.name)}</h2>
                ${badgeHTML(l)}
              </div>
              <div class="muted" style="margin-top:8px;">${escapeHTML(fullAddress(l))}</div>

              <div class="stars" style="margin-top:10px;">
                <span class="starsVis">${stats.count ? starsVis(stats.rounded) : "☆☆☆☆☆"}</span>
                <span class="score">${stats.count ? stats.rounded.toFixed(1) : "—"}</span>
                <span class="landMeta">${stats.count ? `(${stats.count} reviews)` : "(0 reviews)"}</span>
              </div>
              <div class="tiny" style="margin-top:8px;">
                ${cred}${stats.count ? ` • ${stats.note}` : ""}
              </div>
            </div>

            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn" href="#/search">Back</a>
              <button class="btn btn--primary" id="rateNow">Rate this landlord</button>
              ${!l.claimed ? `<button class="btn" id="claimBtn" type="button">Claim this profile</button>` : ``}
            </div>
          </div>

          <div class="bd">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              <div>
                <div class="kicker">LOCATION</div>
                <div class="mapFrame" style="margin-top:10px; height:280px;">
                  <div class="map" id="landMap"></div>
                </div>
                <button class="btn" style="margin-top:10px;" id="centerLand">Center on map</button>
              </div>

              <div>
                <div class="kicker">RATING DISTRIBUTION</div>
                <div class="card ${tierClass}" style="box-shadow:none; margin-top:10px; border-radius:18px; padding:14px;">
                  ${histRow(5, dist[5] || 0, stats.count)}
                  ${histRow(4, dist[4] || 0, stats.count)}
                  ${histRow(3, dist[3] || 0, stats.count)}
                  ${histRow(2, dist[2] || 0, stats.count)}
                  ${histRow(1, dist[1] || 0, stats.count)}
                  <div class="tiny" style="margin-top:10px;">${stats.count ? stats.note : ""}</div>
                </div>

                <div class="kicker" style="margin-top:14px;">REVIEWS</div>
                <div class="card" style="box-shadow:none; margin-top:10px; border-radius:18px; padding:14px;">
                  ${reviews.length ? reviews.map(r => reviewCardHTML(r)).join("") : `<div class="tiny">No reviews yet. Be the first.</div>`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);

  // Map
  initLandMap(l);

  $("#centerLand")?.addEventListener("click", ()=>{
    if (homeMap) {} // ignore
    if (searchMap) {} // ignore
    if (!window.__landMap) return;
    window.__landMap.setView([l.lat, l.lng], 13, {animate:true});
  });

  $("#rateNow")?.addEventListener("click", ()=> openReviewModal(l.id));

  $("#claimBtn")?.addEventListener("click", ()=>{
    alert("Demo: claiming would require a subscription (Stripe) in production.\n\nPlan examples:\nClaimed — $39/mo\nVerified — $99/mo\nCertified/Pro — $299/mo");
  });
}

function initLandMap(l){
  const el = $("#landMap");
  if (!el) return;

  // Create a per-page map instance
  if (window.__landMap){
    try{ window.__landMap.remove(); }catch(e){}
  }
  window.__landMap = L.map(el, { zoomControl:true }).setView([l.lat, l.lng], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(window.__landMap);

  L.marker([l.lat, l.lng]).addTo(window.__landMap);

  setTimeout(()=> {
    try{ window.__landMap.invalidateSize(); }catch(e){}
  }, 80);
}

function histRow(star, count, total){
  const pct = total ? Math.round((count/total)*100) : 0;
  return `
    <div style="display:flex; align-items:center; gap:10px; margin:8px 0;">
      <div style="width:40px; font-weight:900;">${star}★</div>
      <div style="flex:1; height:10px; border-radius:999px; border:1px solid var(--line); background: rgba(255,255,255,.35); overflow:hidden;">
        <div style="width:${pct}%; height:100%; background: rgba(0,0,0,.18);"></div>
      </div>
      <div style="width:46px; text-align:right; font-weight:900;">${count}</div>
    </div>
  `;
}

function reviewCardHTML(r){
  return `
    <div style="border-top:1px solid var(--soft); padding-top:12px; margin-top:12px;">
      <div class="row">
        <div class="stars">
          <span class="starsVis">${starsVis(r.rating)}</span>
          <span class="score">${r.rating}/5</span>
        </div>
        <div class="tiny">${fmtDate(r.createdAt)}</div>
      </div>
      <div style="margin-top:8px; font-weight:650; color: rgba(23,18,15,.70); line-height:1.5;">
        ${escapeHTML(r.text)}
      </div>
      <div style="margin-top:10px;">
        <button class="btn btn--ghost" type="button" onclick="alert('Demo: report flow would open here (spam/harassment/doxxing/etc).')">Report review</button>
      </div>
    </div>
  `;
}

/* ---------- Review Modal (fixed/centered, not broken) ---------- */
function openReviewModal(landlordId){
  const root = $("#modalRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="modalOverlay" role="dialog" aria-modal="true" aria-label="Leave a review">
      <div class="modal">
        <div class="modal__hd">
          <div class="modal__title">Leave a review</div>
          <button class="iconBtn" id="mClose" type="button" aria-label="Close">✕</button>
        </div>

        <div class="modal__bd">
          <div class="field">
            <label>Rating</label>
            <select class="select" id="mrating" style="width:100%;">
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Good</option>
              <option value="3">3 — Okay</option>
              <option value="2">2 — Poor</option>
              <option value="1">1 — Bad</option>
            </select>
          </div>

          <div class="field" style="margin-top:12px;">
            <label>What happened?</label>
            <textarea id="mtext" placeholder="Keep it factual and specific."></textarea>
            <div class="tiny">Minimum 20 characters. Reviews are public.</div>
          </div>
        </div>

        <div class="modal__ft">
          <button class="btn" id="mCancel" type="button">Cancel</button>
          <button class="btn btn--primary" id="mSubmit" type="button">Submit</button>
        </div>
      </div>
    </div>
  `;

  $("#mClose")?.addEventListener("click", closeModal);
  $("#mCancel")?.addEventListener("click", closeModal);
  $(".modalOverlay")?.addEventListener("click", (e)=>{
    if (e.target?.classList?.contains("modalOverlay")) closeModal();
  });

  $("#mSubmit")?.addEventListener("click", ()=>{
    const rating = parseInt($("#mrating")?.value || "5", 10);
    const text = ($("#mtext")?.value || "").trim();

    if (text.length < 20){
      alert("Please write at least 20 characters.");
      return;
    }

    const reviews = load(LS.reviews, []);
    reviews.unshift({
      id: uid(),
      landlordId,
      rating: clamp(rating,1,5),
      text,
      createdAt: new Date().toISOString()
    });
    save(LS.reviews, reviews);

    closeModal();
    // re-render current landlord page
    const cur = location.hash;
    location.hash = "#/"; // force refresh trick
    setTimeout(()=> { location.hash = cur; }, 0);
  });
}

function closeModal(){
  const root = $("#modalRoot");
  if (root) root.innerHTML = "";
}

/* ---------- How It Works ---------- */
function renderHow(){
  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card soft">
          <div class="hd">
            <div>
              <div class="kicker">HOW IT WORKS</div>
              <h2>Simple, fast, and public</h2>
              <div class="muted">No reviewer accounts. Landlords verify to respond.</div>
            </div>
            <a class="btn" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px;">
              <div style="font-weight:900; margin-bottom:10px;">1) Look up</div>
              <div class="muted" style="margin-top:0;">Search a building or landlord, read reviews, then add yours.</div>
            </div>

            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px; margin-top:10px;">
              <div style="font-weight:900; margin-bottom:10px;">2) Review</div>
              <div class="muted" style="margin-top:0;">Post instantly (no account). Keep it factual, specific, and helpful.</div>
            </div>

            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px; margin-top:10px;">
              <div style="font-weight:900; margin-bottom:10px;">3) Improve</div>
              <div class="muted" style="margin-top:0;">Verified landlords can reply publicly and resolve issues transparently.</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);
}

/* ---------- Trust & Safety ---------- */
function renderTrust(){
  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card soft">
          <div class="hd">
            <div>
              <div class="kicker">TRUST & SAFETY</div>
              <h2>Built for accuracy and accountability</h2>
              <div class="muted">Clear rules + verified landlord responses.</div>
            </div>
            <a class="btn" href="#/">Home</a>
          </div>

          <div class="bd">
            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px;">
              <div style="font-weight:900;">No reviewer accounts</div>
              <div class="muted" style="margin-top:8px;">Tenants can post without accounts.</div>
            </div>

            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px; margin-top:10px;">
              <div style="font-weight:900;">Verified landlord responses</div>
              <div class="muted" style="margin-top:8px;">Landlords verify ownership/management before responding publicly.</div>
            </div>

            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px; margin-top:10px;">
              <div style="font-weight:900;">No doxxing / personal info</div>
              <div class="muted" style="margin-top:8px;">Don’t post phone numbers, emails, or private details.</div>
            </div>

            <div class="card" style="box-shadow:none; border-radius:18px; padding:14px; margin-top:10px;">
              <div style="font-weight:900;">Reporting</div>
              <div class="muted" style="margin-top:8px;">Spam, harassment, and false claims can be reported for moderation.</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);
}

/* ---------- Landlord Portal ---------- */
function renderPortal(){
  setApp(`
    <section class="section">
      <div class="wrap">
        <div class="card soft">
          <div class="hd">
            <div>
              <div class="kicker">LANDLORD PORTAL</div>
              <h2>Sign in</h2>
              <div class="muted">Landlords verify documents before responding publicly.</div>
            </div>
            <a class="btn" href="#/">Home</a>
          </div>

          <div class="bd">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
              <div class="card" style="box-shadow:none;">
                <div style="padding:16px;">
                  <div class="kicker">Sign in</div>

                  <div class="field" style="margin-top:10px;">
                    <label>Email</label>
                    <input class="input" id="le" placeholder="you@company.com"/>
                  </div>

                  <div class="field" style="margin-top:10px;">
                    <label>Password</label>
                    <input class="input" id="lp" type="password" placeholder="Password"/>
                  </div>

                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="login">Sign in</button>

                  <div class="tiny" style="margin:12px 0 10px; text-align:center;">or continue with</div>

                  <button class="btn btn--block ssoBtn" id="g">
                    <span class="ssoIcon">${googleIcon()}</span>
                    Continue with Google
                  </button>

                  <div style="height:8px;"></div>

                  <button class="btn btn--block ssoBtn" id="a">
                    <span class="ssoIcon">${appleIcon()}</span>
                    Continue with Apple
                  </button>

                  <div style="height:8px;"></div>

                  <button class="btn btn--block ssoBtn" id="m">
                    <span class="ssoIcon">${msIcon()}</span>
                    Continue with Microsoft
                  </button>
                </div>
              </div>

              <div class="card" style="box-shadow:none;">
                <div style="padding:16px;">
                  <div class="kicker">Create account</div>

                  <div class="field" style="margin-top:10px;">
                    <label>Email</label>
                    <input class="input" id="se" placeholder="you@company.com"/>
                  </div>

                  <div class="field" style="margin-top:10px;">
                    <label>Password</label>
                    <input class="input" id="sp" type="password" placeholder="Create a password"/>
                  </div>

                  <div class="field" style="margin-top:10px;">
                    <label>Verification document (demo)</label>
                    <input id="doc" type="file"/>
                    <div class="tiny" style="margin-top:6px;">Deed, property tax bill, management agreement, utility statement, etc.</div>
                  </div>

                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">Create account</button>

                  <div class="tiny" style="margin-top:10px;">
                    Demo mode: accounts are not persisted. (Production: Stripe subscription required to claim/verify.)
                  </div>
                </div>
              </div>
            </div>

            <div class="card" style="box-shadow:none; margin-top:14px; border-radius:18px; padding:14px;">
              <div style="font-weight:900;">Plans (demo copy)</div>
              <div class="muted" style="margin-top:8px;">
                Claimed — $39/mo • Verified — $99/mo • Certified/Pro — $299/mo
              </div>
              <div class="tiny" style="margin-top:8px;">Landlords must subscribe to claim or verify.</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>© 2026 casa</div>
          <div style="display:flex; gap:14px;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `);

  $("#login")?.addEventListener("click", ()=>{
    alert("Demo: landlord auth would run here.");
  });
  $("#signup")?.addEventListener("click", ()=>{
    alert("Demo: landlord signup + verification wizard would run here.");
  });

  $("#g")?.addEventListener("click", ()=> alert("Demo: Google OAuth would run here."));
  $("#a")?.addEventListener("click", ()=> alert("Demo: Apple OAuth would run here."));
  $("#m")?.addEventListener("click", ()=> alert("Demo: Microsoft OAuth would run here."));
}

/* ---------- Icons (inline SVG) ---------- */
function googleIcon(){
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8A6.2 6.2 0 1 1 12 5.8c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 3.4 14.6 2.4 12 2.4A9.6 9.6 0 1 0 12 21.6c5.5 0 9.1-3.9 9.1-9.4 0-.6-.1-1-.1-1.5H12z"/>
    </svg>`;
}
function appleIcon(){
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#111" d="M16.6 13.2c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.6-.8-1.3 0-2.6.8-3.3 1.9-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.6 2 .9 0 1.3-.6 2.5-.6s1.6.6 2.6.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2-.8-2-3.2zM14.4 6.9c.6-.8 1-1.8.9-2.9-.9.1-2 .6-2.6 1.4-.6.7-1 1.8-.9 2.8 1 .1 2-.5 2.6-1.3z"/>
    </svg>`;
}
function msIcon(){
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#F25022" d="M2 2h9v9H2z"/>
      <path fill="#7FBA00" d="M13 2h9v9h-9z"/>
      <path fill="#00A4EF" d="M2 13h9v9H2z"/>
      <path fill="#FFB900" d="M13 13h9v9h-9z"/>
    </svg>`;
}

/* ---------- Utils ---------- */
function fullAddress(l){
  const a = l.address || {};
  const parts = [
    a.address || "",
    a.unit ? `Unit ${a.unit}` : "",
    a.city || "",
    a.state || ""
  ].filter(Boolean);
  return parts.join(", ");
}
function compactLocation(l){
  const a = l.address || {};
  const cityState = [a.city, a.state].filter(Boolean).join(", ");
  const addr = a.address ? a.address : "";
  const parts = [addr, cityState].filter(Boolean);
  return parts.join(" • ");
}

function escapeHTML(s){
  return (s||"").replace(/[&<>"']/g, (c)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(s){ return escapeHTML(s); }

/* ---------- Boot ---------- */
function boot(){
  ensureSeed();
  initMenu();
  window.addEventListener("hashchange", route);
  route();
}

boot();
