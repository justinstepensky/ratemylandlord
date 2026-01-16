/* =========================
   casa — app.js (SPA)
   ========================= */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const LS_KEYS = {
  landlords: "casa_landlords_v1",
  reviews: "casa_reviews_v1"
};

const BOROUGHS = ["All boroughs", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function nowISO(){ return new Date().toISOString(); }

function toast(msg){
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 2200);
}

/* ---------- Seed data ---------- */
function seedIfEmpty(){
  const landlords = loadLandlords();
  const reviews = loadReviews();
  if (landlords.length || reviews.length) return;

  const L = [
    {
      id: uid("ll"),
      name: "Northside Properties",
      entity: "",
      address: "123 Main St",
      unit: "",
      city: "Brooklyn",
      state: "NY",
      borough: "Brooklyn",
      lat: 40.7163,
      lng: -73.9568,
      createdAt: nowISO()
    },
    {
      id: uid("ll"),
      name: "Park Ave Management",
      entity: "Park Ave Management LLC",
      address: "22 Park Ave",
      unit: "",
      city: "New York",
      state: "NY",
      borough: "Manhattan",
      lat: 40.7412,
      lng: -73.9862,
      createdAt: nowISO()
    },
    {
      id: uid("ll"),
      name: "Elmhurst Holdings",
      entity: "",
      address: "86-12 Broadway",
      unit: "",
      city: "Queens",
      state: "NY",
      borough: "Queens",
      lat: 40.7429,
      lng: -73.8836,
      createdAt: nowISO()
    }
  ];

  const R = [
    {
      id: uid("rv"),
      landlordId: L[0].id,
      rating: 4,
      text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
      createdAt: "2026-01-05T12:00:00.000Z"
    },
    {
      id: uid("rv"),
      landlordId: L[1].id,
      rating: 3,
      text: "Great location, but communication was slow. Security deposit itemization took weeks.",
      createdAt: "2025-12-18T12:00:00.000Z"
    },
    {
      id: uid("rv"),
      landlordId: L[2].id,
      rating: 5,
      text: "Responsive management. Clear lease terms and quick repairs.",
      createdAt: "2025-11-30T12:00:00.000Z"
    }
  ];

  saveLandlords(L);
  saveReviews(R);
}

/* ---------- Storage ---------- */
function loadLandlords(){
  try { return JSON.parse(localStorage.getItem(LS_KEYS.landlords) || "[]"); }
  catch { return []; }
}
function saveLandlords(list){
  localStorage.setItem(LS_KEYS.landlords, JSON.stringify(list));
}
function loadReviews(){
  try { return JSON.parse(localStorage.getItem(LS_KEYS.reviews) || "[]"); }
  catch { return []; }
}
function saveReviews(list){
  localStorage.setItem(LS_KEYS.reviews, JSON.stringify(list));
}

/* ---------- Stars ---------- */
function starSVG(on=true){
  const fill = on ? "var(--starOn)" : "var(--starOff)";
  return `
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="${fill}" d="M12 17.27l-5.18 3.05 1.39-5.81L3.5 9.24l6-.51L12 3.25l2.5 5.48 6 .51-4.71 5.27 1.39 5.81z"/>
    </svg>
  `;
}
function starsRow(rating){
  const n = Math.max(0, Math.min(5, Number(rating || 0)));
  return `
    <div class="starRow">
      <div class="starStars">
        ${[1,2,3,4,5].map(i => starSVG(i <= n)).join("")}
      </div>
      <div class="scoreText">${n ? `${n}/5` : "No ratings"}</div>
    </div>
  `;
}
function avgRatingFor(landlordId){
  const reviews = loadReviews().filter(r => r.landlordId === landlordId);
  if (!reviews.length) return 0;
  const sum = reviews.reduce((a,r)=>a + Number(r.rating||0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/* ---------- Routing ---------- */
function parseHash(){
  const raw = (location.hash || "#/").slice(1);
  const [path, queryString] = raw.split("?");
  const params = new URLSearchParams(queryString || "");
  return { path: path || "/", params };
}

function route(){
  seedIfEmpty();
  const { path, params } = parseHash();

  // close menu on route
  closeDrawer();

  if (path === "/") return renderHome();
  if (path === "/search") return renderSearch(params);
  if (path === "/add") return renderAdd();
  if (path === "/how") return renderHow();
  if (path === "/trust") return renderTrust();
  if (path === "/portal") return renderPortal();
  if (path === "/landlord") return renderLandlord(params.get("id"));
  return renderHome();
}

/* ---------- Mobile menu ---------- */
function openDrawer(){
  const drawer = $("#navDrawer");
  const btn = $("#menuBtn");
  if (!drawer || !btn) return;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden","false");
  btn.setAttribute("aria-expanded","true");
}
function closeDrawer(){
  const drawer = $("#navDrawer");
  const btn = $("#menuBtn");
  if (!drawer || !btn) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden","true");
  btn.setAttribute("aria-expanded","false");
}
function toggleDrawer(){
  const drawer = $("#navDrawer");
  if (!drawer) return;
  drawer.classList.contains("open") ? closeDrawer() : openDrawer();
}

function wireMenu(){
  const btn = $("#menuBtn");
  const drawer = $("#navDrawer");
  if (!btn || !drawer) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer();
  });

  // close on link click
  drawer.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) closeDrawer();
  });

  // close on outside click
  document.addEventListener("click", (e) => {
    const isOpen = drawer.classList.contains("open");
    if (!isOpen) return;
    const withinNav = e.target.closest(".nav");
    if (!withinNav) closeDrawer();
  });

  // escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

/* ---------- Modal ---------- */
function modalOpen(title, bodyHTML, footHTML){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHTML || "";
  $("#modalFoot").innerHTML = footHTML || "";
  $("#modalBackdrop").classList.add("open");
  $("#modalBackdrop").setAttribute("aria-hidden","false");
}
function modalClose(){
  $("#modalBackdrop").classList.remove("open");
  $("#modalBackdrop").setAttribute("aria-hidden","true");
}
function wireModal(){
  $("#modalClose")?.addEventListener("click", modalClose);
$("#modalBackdrop")?.addEventListener("click", (e) => {
  // close only when clicking the dim backdrop, not the modal
  if (e.target === $("#modalBackdrop")) modalClose();
});
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modalClose();
  });
}

/* ---------- Maps (Leaflet) ---------- */
let _leaflet = { home: null, search: null, add: null, profile: null };

function initMap(el, { center=[40.73, -73.98], zoom=11 } = {}){
  const map = L.map(el, { zoomControl: true, scrollWheelZoom: true }).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  return map;
}

function setMarkers(map, landlords, onClick){
  const group = L.layerGroup().addTo(map);
  landlords.forEach(l => {
    if (typeof l.lat !== "number" || typeof l.lng !== "number") return;
    const m = L.marker([l.lat, l.lng]).addTo(group);
    m.on("click", () => onClick?.(l));
  });
  return group;
}

function flyTo(map, l){
  if (!map || !l || typeof l.lat !== "number" || typeof l.lng !== "number") return;
  map.flyTo([l.lat, l.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
}

/* ---------- Home ---------- */
function renderHome(){
  const app = $("#app");
  if (!app) return;

  const landlords = loadLandlords();
  const reviews = loadReviews()
    .slice()
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const highlights = reviews
    .slice(0, 8)
    .map(r => {
      const l = landlords.find(x => x.id === r.landlordId);
      if (!l) return null;
      const when = new Date(r.createdAt);
      const date = `${when.getMonth()+1}/${when.getDate()}/${when.getFullYear()}`;
      return { l, r, date };
    })
    .filter(Boolean);

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
              </div>
              <button class="btn btn--primary" id="homeSearch">Search</button>
              <a class="btn btn--outline" href="#/add">Add a landlord</a>
            </div>

            <div class="trustLine">No account required to review. Verified landlords can respond.</div>

            <div class="tiles" style="margin-top:10px;">
              <div class="tile" id="tileSearch" role="button" tabindex="0">
                <div class="tile__top">
                  <div class="tile__icon">⌕</div>
                  <div>Search</div>
                </div>
              </div>

              <div class="tile" id="tileReview" role="button" tabindex="0">
                <div class="tile__top">
                  <div class="tile__icon">★</div>
                  <div>Review</div>
                </div>
              </div>

              <div class="tile" aria-disabled="true">
                <div class="tile__top">
                  <div class="tile__icon">⌂</div>
                  <div>Rent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="height:14px;"></div>

        <div class="split">
          <!-- Highlights -->
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Featured Reviews</div>
                <h2>Recent highlights</h2>
                <div class="muted">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn btn--ghost" href="#/search">Browse all</a>
            </div>

            <div class="bd">
              <div class="frame">
                <div class="frame__fill">
                  ${highlights.length ? `
                    <div class="carousel" id="hlCarousel">
                      <div class="carousel__track" id="hlTrack">
                        ${highlights.map((h) => `
                          <div class="carousel__item">
                            <div>
                              <div style="display:flex; justify-content:space-between; gap:10px;">
                                <div>
                                  <div class="rowTitle" style="margin:0;">${escapeHTML(h.l.name)}</div>
                                  <div class="rowSub">${escapeHTML(h.l.address)} • ${escapeHTML(h.l.city)}, ${escapeHTML(h.l.state)}</div>
                                </div>
                                <div class="tiny">${h.date}</div>
                              </div>
                              ${starsRow(h.r.rating)}
                              <div class="rowSub" style="margin-top:8px;">${escapeHTML(h.r.text)}</div>
                              <div class="tiny" style="margin-top:10px;">${escapeHTML(h.l.borough || "")}</div>
                            </div>

                            <div style="display:flex; justify-content:flex-end;">
                              <a class="btn btn--outline" href="#/landlord?id=${encodeURIComponent(h.l.id)}">View</a>
                            </div>
                          </div>
                        `).join("")}
                      </div>

                      <div class="carouselDots" id="hlDots">
                        ${highlights.map((_, i) => `<button class="dot ${i===0?"active":""}" data-i="${i}" aria-label="Go to ${i+1}"></button>`).join("")}
                      </div>
                    </div>
                  ` : `
                    <div class="rowCard" style="height:100%; align-items:center; justify-content:center;">
                      <div style="text-align:center;">
                        <div class="rowTitle">No highlights yet</div>
                        <div class="rowSub">Be the first to post a review.</div>
                      </div>
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>

          <!-- Map -->
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
              <div class="frame">
                <div class="frame__fill">
                  <div class="mapBox" id="homeMap"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tiny" style="margin-top:18px;">© 2026 casa</div>
      </div>
    </section>
  `;

  // hero search
  $("#homeSearch")?.addEventListener("click", () => {
    const q = ($("#homeQ")?.value || "").trim();
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
  $("#homeQ")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#homeSearch")?.click();
  });

  // tiles
  $("#tileSearch")?.addEventListener("click", () => location.hash = "#/search");
  $("#tileReview")?.addEventListener("click", () => {
    // take them to search so they can pick landlord to review
    location.hash = "#/search";
    toast("Pick a landlord to leave a review.");
  });

  // map
  setTimeout(() => {
    const el = $("#homeMap");
    if (!el) return;

    // destroy old
    if (_leaflet.home) { try { _leaflet.home.remove(); } catch {} _leaflet.home = null; }

    _leaflet.home = initMap(el, { center:[40.73,-73.98], zoom:11 });
    setMarkers(_leaflet.home, loadLandlords(), (l) => {
      location.hash = `#/landlord?id=${encodeURIComponent(l.id)}`;
    });
  }, 0);

  // carousel autoplay + dots
  setupHighlightsCarousel();
}

function setupHighlightsCarousel(){
  const track = $("#hlTrack");
  const dots = $("#hlDots");
  if (!track || !dots) return;

  const items = $$(".carousel__item", track);
  if (!items.length) return;

  let idx = 0;
  let timer = null;

  function setActive(i){
    idx = Math.max(0, Math.min(items.length-1, i));
    const left = items[idx].offsetLeft;
    track.scrollTo({ left, behavior: "smooth" });
    $$(".dot", dots).forEach(d => d.classList.remove("active"));
    $(`.dot[data-i="${idx}"]`, dots)?.classList.add("active");
  }

  dots.addEventListener("click", (e) => {
    const btn = e.target.closest(".dot");
    if (!btn) return;
    const i = Number(btn.dataset.i || 0);
    setActive(i);
    restart();
  });

  // update active on manual scroll
  track.addEventListener("scroll", () => {
    const s = track.scrollLeft;
    // pick nearest
    let best = 0;
    let bestDist = Infinity;
    items.forEach((it, i) => {
      const dist = Math.abs(it.offsetLeft - s);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    idx = best;
    $$(".dot", dots).forEach(d => d.classList.remove("active"));
    $(`.dot[data-i="${idx}"]`, dots)?.classList.add("active");
  }, { passive:true });

  function start(){
    stop();
    timer = setInterval(() => {
      const next = (idx + 1) % items.length;
      setActive(next);
    }, 4200);
  }
  function stop(){
    if (timer) clearInterval(timer);
    timer = null;
  }
  function restart(){
    start();
  }

  // pause on hover/touch
  track.addEventListener("mouseenter", stop);
  track.addEventListener("mouseleave", start);
  track.addEventListener("touchstart", stop, { passive:true });
  track.addEventListener("touchend", start);

  start();
}

/* ---------- Search (map on top) ---------- */
function renderSearch(params){
  const app = $("#app");
  if (!app) return;

  const landlords = loadLandlords();
  const q = (params.get("q") || "").trim();
  const b = (params.get("b") || "All boroughs").trim();

  const filtered = landlords.filter(l => {
    const hay = `${l.name} ${l.entity||""} ${l.address||""} ${l.city||""} ${l.state||""}`.toLowerCase();
    const matchQ = q ? hay.includes(q.toLowerCase()) : true;
    const matchB = (b === "All boroughs") ? true : ((l.borough || "") === b);
    return matchQ && matchB;
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
            <div class="heroSearch" style="justify-content:flex-start;">
              <div class="heroSearch__bar" style="flex: 1.2;">
                <input id="sq" value="${escapeAttr(q)}" placeholder="Search landlord name, management company, or address..." />
              </div>

              <div class="field" style="margin:0; min-width:240px;">
                <label style="margin:0 0 6px; display:block;">Borough</label>
                <select id="sb">
                  ${BOROUGHS.map(x => `<option ${x===b?"selected":""}>${x}</option>`).join("")}
                </select>
              </div>

              <button class="btn btn--primary" id="sGo">Search</button>
            </div>

            <div style="height:12px;"></div>

            <!-- MAP ON TOP -->
            <div class="mapBox" id="searchMap" style="height:340px;"></div>

            <div style="height:12px;"></div>

            ${filtered.length ? filtered.map(l => {
              const avg = avgRatingFor(l.id);
              const boro = l.borough || "";
              return `
                <div class="rowCard">
                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; gap:10px;">
                      <div>
                        <div class="rowTitle">${escapeHTML(l.name)}</div>
                        <div class="rowSub">${escapeHTML(l.address)} • ${escapeHTML(l.city)}, ${escapeHTML(l.state)}</div>
                      </div>
                      <div class="tiny">${boro ? escapeHTML(boro) : ""}</div>
                    </div>
                    ${starsRow(avg)}
                  </div>

                  <div style="display:flex; flex-direction:column; gap:10px; justify-content:center;">
                    <a class="btn btn--outline" href="#/landlord?id=${encodeURIComponent(l.id)}">View</a>
                    <button class="btn btn--ghost" data-center="${escapeAttr(l.id)}">Center on map</button>
                  </div>
                </div>
              `;
            }).join("") : `
              <div class="rowCard" style="justify-content:center;">
                <div style="text-align:center;">
                  <div class="rowTitle">No matches</div>
                  <div class="rowSub">Try a different search or borough.</div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
    </section>
  `;

  $("#sGo")?.addEventListener("click", () => {
    const nq = ($("#sq")?.value || "").trim();
    const nb = ($("#sb")?.value || "All boroughs").trim();
    location.hash = `#/search?q=${encodeURIComponent(nq)}&b=${encodeURIComponent(nb)}`;
  });
  $("#sq")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#sGo")?.click();
  });

  // map init
  setTimeout(() => {
    const el = $("#searchMap");
    if (!el) return;
    if (_leaflet.search) { try { _leaflet.search.remove(); } catch {} _leaflet.search = null; }

    _leaflet.search = initMap(el, { center:[40.73,-73.98], zoom:10 });
    setMarkers(_leaflet.search, filtered, (l) => {
      location.hash = `#/landlord?id=${encodeURIComponent(l.id)}`;
    });
  }, 0);

  // center buttons
  $$(".btn[data-center]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-center");
      const l = loadLandlords().find(x => x.id === id);
      flyTo(_leaflet.search, l);
    });
  });
}

/* ---------- Add landlord (no borough field, no lat/lng inputs) ---------- */
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
                  <input id="an" placeholder="e.g., Park Ave Management" />
                </div>

                <div class="field" style="margin-top:10px;">
                  <label>Entity (optional)</label>
                  <input id="ae" placeholder="e.g., Park Ave Management LLC" />
                </div>

                <div class="split2" style="margin-top:10px;">
                  <div class="field">
                    <label>Address <span class="tiny">*</span></label>
                    <input id="aa" placeholder="Street address" />
                  </div>
                  <div class="field">
                    <label>Unit (optional)</label>
                    <input id="au" placeholder="Apt / Unit" />
                  </div>
                </div>

                <div class="split2" style="margin-top:10px;">
                  <div class="field">
                    <label>City <span class="tiny">*</span></label>
                    <input id="ac" placeholder="City" />
                  </div>
                  <div class="field">
                    <label>State <span class="tiny">*</span></label>
                    <input id="as" placeholder="NY" />
                  </div>
                </div>

                <button class="btn btn--primary btn--block" id="addBtn" style="margin-top:12px;">Add landlord</button>
                <div class="tiny" style="margin-top:10px;">
                  Tip: Click the map to drop a pin (optional). We won’t show coordinates in the form.
                </div>
              </div>

              <div>
                <div class="kicker">Place the pin (optional)</div>
                <div class="muted" style="margin-bottom:10px;">Click the map to set a location.</div>
                <div class="mapBox" id="addMap" style="height:320px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // map for pin
  let pin = { lat: null, lng: null };
  setTimeout(() => {
    const el = $("#addMap");
    if (!el) return;

    if (_leaflet.add) { try { _leaflet.add.remove(); } catch {} _leaflet.add = null; }
    _leaflet.add = initMap(el, { center:[40.73,-73.98], zoom:10 });

    let marker = null;
    _leaflet.add.on("click", (e) => {
      pin.lat = e.latlng.lat;
      pin.lng = e.latlng.lng;
      if (marker) marker.remove();
      marker = L.marker([pin.lat, pin.lng]).addTo(_leaflet.add);
      toast("Pin added.");
    });
  }, 0);

  $("#addBtn")?.addEventListener("click", () => {
    const name = ($("#an")?.value || "").trim();
    const entity = ($("#ae")?.value || "").trim();
    const address = ($("#aa")?.value || "").trim();
    const unit = ($("#au")?.value || "").trim();
    const city = ($("#ac")?.value || "").trim();
    const state = ($("#as")?.value || "").trim();

    if (!name || !address || !city || !state){
      toast("Please fill the required fields (name, address, city, state).");
      return;
    }

    const l = {
      id: uid("ll"),
      name,
      entity,
      address,
      unit,
      city,
      state,
      borough: "",               // no borough field on add page
      lat: (typeof pin.lat === "number") ? pin.lat : null,
      lng: (typeof pin.lng === "number") ? pin.lng : null,
      createdAt: nowISO()
    };

    const list = loadLandlords();
    list.unshift(l);
    saveLandlords(list);

    toast("Landlord added.");
    location.hash = `#/landlord?id=${encodeURIComponent(l.id)}&new=1`;
  });
}

/* ---------- Landlord profile ---------- */
function renderLandlord(id){
  const app = $("#app");
  if (!app) return;

  const landlords = loadLandlords();
  const l = landlords.find(x => x.id === id);
  if (!l){
    app.innerHTML = `
      <section class="section">
        <div class="wrap">
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Landlord</div>
                <h2>Not found</h2>
              </div>
              <a class="btn btn--ghost" href="#/search">Back</a>
            </div>
            <div class="bd">
              <div class="rowSub">This landlord doesn’t exist yet.</div>
            </div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const reviews = loadReviews()
    .filter(r => r.landlordId === l.id)
    .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  const avg = avgRatingFor(l.id);

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Landlord</div>
              <h2>${escapeHTML(l.name)}</h2>
              <div class="muted">${escapeHTML(l.address)}${l.unit ? `, ${escapeHTML(l.unit)}` : ""} • ${escapeHTML(l.city)}, ${escapeHTML(l.state)}</div>
              ${starsRow(avg)}
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--ghost" href="#/search">Back</a>
              <button class="btn btn--primary" id="rateNow">Rate this landlord</button>
            </div>
          </div>

          <div class="bd">
            <div class="split2">
              <div>
                <div class="kicker">Location</div>
                <div class="mapBox" id="profileMap" style="height:320px; margin-top:10px;"></div>
                <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                  <button class="btn btn--outline" id="centerProfile">Center on map</button>
                </div>
              </div>

              <div>
                <div class="kicker">Reviews</div>
                ${reviews.length ? reviews.map(r => {
                  const d = new Date(r.createdAt);
                  const date = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
                  return `
                    <div class="rowCard">
                      <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; gap:10px;">
                          <div class="rowTitle" style="margin:0;">Rating</div>
                          <div class="tiny">${date}</div>
                        </div>
                        ${starsRow(r.rating)}
                        <div class="rowSub" style="margin-top:8px;">${escapeHTML(r.text)}</div>
                      </div>
                    </div>
                  `;
                }).join("") : `
                  <div class="rowCard" style="justify-content:center;">
                    <div style="text-align:center;">
                      <div class="rowTitle">No reviews yet</div>
                      <div class="rowSub">Be the first to post a review.</div>
                    </div>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // map
  setTimeout(() => {
    const el = $("#profileMap");
    if (!el) return;

    if (_leaflet.profile) { try { _leaflet.profile.remove(); } catch {} _leaflet.profile = null; }

    const center = (typeof l.lat === "number" && typeof l.lng === "number")
      ? [l.lat, l.lng]
      : [40.73, -73.98];

    _leaflet.profile = initMap(el, { center, zoom: (typeof l.lat === "number" ? 13 : 11) });
    if (typeof l.lat === "number" && typeof l.lng === "number"){
      L.marker([l.lat, l.lng]).addTo(_leaflet.profile);
    }
  }, 0);

  $("#centerProfile")?.addEventListener("click", () => flyTo(_leaflet.profile, l));
  $("#rateNow")?.addEventListener("click", () => openRateModal(l));
}

function openRateModal(l){
  modalOpen(
    "Leave a review",
    `
      <div class="field">
        <label>Rating</label>
        <select id="rStars">
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Good</option>
          <option value="3">3 — Okay</option>
          <option value="2">2 — Poor</option>
          <option value="1">1 — Bad</option>
        </select>
      </div>
      <div class="field" style="margin-top:10px;">
        <label>What happened?</label>
        <textarea id="rText" placeholder="Keep it factual and specific."></textarea>
      </div>
    `,
    `
      <button class="btn btn--ghost" type="button" id="cancelRate">Cancel</button>
      <button class="btn btn--primary" type="button" id="submitRate">Submit</button>
    `
  );

  $("#cancelRate")?.addEventListener("click", modalClose);
  $("#submitRate")?.addEventListener("click", () => {
    const rating = Number($("#rStars")?.value || 0);
    const text = ($("#rText")?.value || "").trim();
    if (!rating || !text){
      toast("Please add a rating and a short description.");
      return;
    }
    const list = loadReviews();
    list.unshift({
      id: uid("rv"),
      landlordId: l.id,
      rating,
      text,
      createdAt: nowISO()
    });
    saveReviews(list);
    modalClose();
    toast("Review posted.");
    // refresh view
    location.hash = `#/landlord?id=${encodeURIComponent(l.id)}`;
  });
}

/* ---------- How / Trust (simple, styled) ---------- */
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
              <div class="rowSub">Find a landlord by name, entity, or address.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Review</div>
              <div class="rowSub">Leave a rating and write what happened.</div>
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
              <div class="rowSub">Tenants can post without accounts; edits can be added later via the landlord page.</div>
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

/* ---------- Landlord Portal (logos + styled file input) ---------- */
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
                  ${providerButton("Google")}
                  <div style="height:8px;"></div>
                  ${providerButton("Apple")}
                  <div style="height:8px;"></div>
                  ${providerButton("Microsoft")}
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
                    <div class="fileWrap">
                      <input id="doc" type="file"/>
                    </div>
                    <div class="tiny fileHint">Lease header, LLC registration, management agreement, etc.</div>
                  </div>

                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">Create account</button>

                  <div class="tiny" style="margin:12px 0 10px; text-align:center;">or continue with</div>
                  ${providerButton("Google","signup")}
                  <div style="height:8px;"></div>
                  ${providerButton("Apple","signup")}
                  <div style="height:8px;"></div>
                  ${providerButton("Microsoft","signup")}

                  <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // wire buttons (demo)
  $("#login")?.addEventListener("click", () => {
    const e = ($("#le")?.value || "").trim();
    const p = ($("#lp")?.value || "").trim();
    if (!e || !p) return toast("Enter email and password.");
    toast("Signed in (demo).");
  });

  $("#signup")?.addEventListener("click", () => {
    const e = ($("#se")?.value || "").trim();
    const p = ($("#sp")?.value || "").trim();
    if (!e || !p) return toast("Enter email and password.");
    toast("Account created (demo).");
  });

  $$("#g, #a, #m, #g2, #a2, #m2").forEach(btn => {
    btn.addEventListener("click", () => toast("SSO coming soon (demo)."));
  });
}

function providerButton(name, variant="signin"){
  const id = (name === "Google" ? (variant==="signup"?"g2":"g")
    : name === "Apple" ? (variant==="signup"?"a2":"a")
    : (variant==="signup"?"m2":"m"));

  const logo = providerLogo(name);

  return `
    <button class="btn btn--outline btn--block providerBtn" id="${id}" type="button">
      <span class="providerLogo" aria-hidden="true">${logo}</span>
      <span>Continue with ${name}</span>
    </button>
  `;
}

function providerLogo(name){
  if (name === "Google"){
    return `
      <svg viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 3l5.5-5.5C34.2 3.7 29.4 1.8 24 1.8 14.7 1.8 6.7 7.1 2.9 14.8l6.6 5.1C11.3 13.6 17.1 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.7h12.6c-.3 2-1.6 5-4.5 7.1l6.9 5.4c4-3.7 6.1-9.2 6.1-16.1z"/>
        <path fill="#FBBC05" d="M9.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.7-4.6l-6.6-5.1C1.4 17.3.6 20.6.6 24s.8 6.7 2.2 9.6l6.7-5z"/>
        <path fill="#34A853" d="M24 46.2c5.4 0 10-1.8 13.4-4.9l-6.9-5.4c-1.9 1.3-4.5 2.2-6.5 2.2-6.9 0-12.7-4.1-14.9-10l-6.7 5C6.7 40.9 14.7 46.2 24 46.2z"/>
      </svg>
    `;
  }
  if (name === "Apple"){
    return `
      <svg viewBox="0 0 24 24">
        <path fill="#111" d="M16.7 13.2c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2-1.4 2.4-.4 6 1 8  .7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.2s-2.1-.8-2.1-3.1zM14.9 7c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7 1 .1 1.9-.5 2.5-1.3z"/>
      </svg>
    `;
  }
  // Microsoft
  return `
    <svg viewBox="0 0 24 24">
      <path fill="#F25022" d="M2 2h9v9H2z"/><path fill="#7FBA00" d="M13 2h9v9h-9z"/>
      <path fill="#00A4EF" d="M2 13h9v9H2z"/><path fill="#FFB900" d="M13 13h9v9h-9z"/>
    </svg>
  `;
}

/* ---------- helpers ---------- */
function escapeHTML(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str=""){ return escapeHTML(str).replaceAll("\n"," "); }

/* ---------- boot ---------- */
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  wireMenu();
  wireModal();
  route();
});
