/* CASA app.js (single-file SPA)
   - Hash routing
   - LocalStorage data
   - Leaflet maps
   - Recent Highlights carousel (dots only, max 5)
   - Rating tiers (green/yellow/red) based on rounded avg, only if reviewCount>0
   - Badges (verified/top) with tooltips, consistent
   - Mobile menu only (desktop hides)
*/

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const LS_KEY = "casa_db_v3";

const BADGE_VERIFIED = "./assets/badge-verified.png"; // blue check image
const BADGE_TOP = "./assets/badge-top.png";           // casa logo image

const BOROUGHS = ["All boroughs","Manhattan","Brooklyn","Queens","Bronx","Staten Island"];

function nowISO(){ return new Date().toISOString(); }
function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString(undefined,{year:"numeric",month:"numeric",day:"numeric"});
  }catch{ return ""; }
}
function slugify(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/['"]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function loadDB(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){
    try{ return JSON.parse(raw); }catch{}
  }
  // seed
  const db = {
    landlords: [
      {
        id: crypto.randomUUID(),
        name: "Park Ave Management",
        entity: "",
        address: { line1:"22 Park Ave", unit:"", city:"New York", state:"NY" },
        borough: "Manhattan",
        geo: { lat: 40.7447, lng: -73.9839 },
        verified: false,
        top: false,
        createdAt: "2025-12-18T12:00:00.000Z"
      },
      {
        id: crypto.randomUUID(),
        name: "Northside Properties",
        entity: "",
        address: { line1:"123 Main St", unit:"", city:"Brooklyn", state:"NY" },
        borough: "Brooklyn",
        geo: { lat: 40.7176, lng: -73.9566 },
        verified: true,
        top: false,
        createdAt: "2026-01-05T12:00:00.000Z"
      },
      {
        id: crypto.randomUUID(),
        name: "Elmhurst Holdings",
        entity: "",
        address: { line1:"86-12 Broadway", unit:"", city:"Queens", state:"NY" },
        borough: "Queens",
        geo: { lat: 40.7428, lng: -73.8821 },
        verified: true,
        top: true,
        createdAt: "2025-11-30T12:00:00.000Z"
      }
    ],
    reviews: [
      {
        id: crypto.randomUUID(),
        landlordId: null, // filled after seed mapping
        rating: 3,
        text: "Great location, but communication was slow. Security deposit itemization took weeks.",
        createdAt: "2025-12-18T12:00:00.000Z"
      },
      {
        id: crypto.randomUUID(),
        landlordId: null,
        rating: 4,
        text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
        createdAt: "2026-01-05T12:00:00.000Z"
      },
      {
        id: crypto.randomUUID(),
        landlordId: null,
        rating: 5,
        text: "Responsive management. Clear lease terms and quick repairs.",
        createdAt: "2025-11-30T12:00:00.000Z"
      },
      {
        id: crypto.randomUUID(),
        landlordId: null,
        rating: 5,
        text: "Fast fixes and proactive updates. Solid experience.",
        createdAt: "2026-01-10T12:00:00.000Z"
      }
    ],
    portal: { landlords: [] }, // demo only
    ui: { highlightIndex: 0 }
  };

  // map seeded reviews to seeded landlords by order
  db.reviews[0].landlordId = db.landlords[0].id;
  db.reviews[1].landlordId = db.landlords[1].id;
  db.reviews[2].landlordId = db.landlords[2].id;
  db.reviews[3].landlordId = db.landlords[2].id;

  saveDB(db);
  return db;
}
function saveDB(db){
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

let DB = loadDB();

function addrLine(l){
  const a = l.address || {};
  const parts = [a.line1, a.unit ? `#${a.unit}` : ""].filter(Boolean);
  const city = [a.city, a.state].filter(Boolean).join(", ");
  return `${parts.join(" ")}${city ? " • " + city : ""}`;
}
function locationLine(l){
  const a = l.address || {};
  const city = a.city || "";
  const state = a.state || "";
  const b = l.borough || "";
  const left = [a.line1].filter(Boolean).join("");
  const right = [city, state].filter(Boolean).join(", ");
  const mid = b ? b : "";
  return [left, right, mid].filter(Boolean).join(" • ");
}

/* ---------------- Ratings (recency-weighted) ---------------- */

function ageDays(iso){
  const t = new Date(iso).getTime();
  const ms = Date.now() - t;
  return ms / (1000*60*60*24);
}

// Recency-weighting: old reviews count less.
// half-life ~ 365 days
function weightForReview(iso){
  const d = ageDays(iso);
  const halfLife = 365;
  return Math.pow(0.5, d/halfLife);
}

function landlordReviews(landlordId){
  return DB.reviews
    .filter(r => r.landlordId === landlordId)
    .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
}

function roundedAvgForLandlord(landlordId){
  const rs = landlordReviews(landlordId);
  if(rs.length === 0) return { avg: 0, rounded: 0, count: 0 };

  let wsum = 0;
  let rsum = 0;

  for(const r of rs){
    const w = weightForReview(r.createdAt);
    wsum += w;
    rsum += w * r.rating;
  }
  const avg = rsum / (wsum || 1);
  const rounded = Math.round(avg * 10) / 10; // 1 decimal
  return { avg, rounded, count: rs.length };
}

function tierFor(rounded, count){
  if(count === 0) return { tier:"none", label:"" };

  // tier boundaries using the rounded value (as requested)
  if(rounded >= 1.0 && rounded <= 2.99) return { tier:"red", label:"Low Rating" };
  if(rounded > 2.99 && rounded <= 3.99) return { tier:"yellow", label:"Mixed Reviews" };
  if(rounded >= 4.0 && rounded <= 5.0) return { tier:"green", label:"Highly Rated" };
  return { tier:"none", label:"" };
}

/* ---------------- UI helpers ---------------- */

function starHTML(rating, outOf=5){
  const n = clamp(Math.round(rating), 0, outOf);
  const items = [];
  for(let i=1;i<=outOf;i++){
    items.push(`<span class="star ${i<=n ? "" : "off"}">★</span>`);
  }
  return `<span class="stars" aria-label="${n} out of ${outOf} stars">${items.join("")}</span>`;
}

function badgeHTML(l){
  const items = [];
  if(l.verified){
    items.push(`<img class="badgeImg" src="${BADGE_VERIFIED}" alt="Verified" title="Verified Landlord (ownership verified)" />`);
  }
  if(l.top){
    items.push(`<img class="badgeImg" src="${BADGE_TOP}" alt="Top" title="Top Landlord (high rating + consistent performance)" />`);
  }
  if(items.length === 0) return "";
  return `<span class="badges">${items.join("")}</span>`;
}

function tierClassForCard(rounded, count){
  const t = tierFor(rounded, count).tier;
  if(t === "green") return "tier-green";
  if(t === "yellow") return "tier-yellow";
  if(t === "red") return "tier-red";
  return "tier-none";
}

function tierPillHTML(rounded, count){
  const t = tierFor(rounded, count);
  if(count === 0) return "";
  const cls = t.tier === "green" ? "green" : t.tier === "yellow" ? "yellow" : "red";
  return `<span class="tierPill ${cls}">${t.label}</span>`;
}

function casaStatusLabel(landlordId){
  const { count } = roundedAvgForLandlord(landlordId);
  if(count === 0) return "Unrated";
  if(count < 10) return "Not yet CASA Rated — needs more reviews";
  return "CASA Rated";
}

/* ---------------- Router ---------------- */

function route(){
  const hash = location.hash || "#/";
  const [path, query] = hash.slice(2).split("?");
  const parts = path.split("/").filter(Boolean);

  closeMenu();

  if(parts.length === 0) return renderHome();
  if(parts[0] === "search") return renderSearch();
  if(parts[0] === "add") return renderAdd();
  if(parts[0] === "how") return renderHow();
  if(parts[0] === "trust") return renderTrust();
  if(parts[0] === "portal") return renderPortal();
  if(parts[0] === "landlord" && parts[1]) return renderLandlord(parts[1]); // slug

  return renderNotFound();
}

/* ---------------- Menu (mobile only) ---------------- */

function openMenu(){
  const o = $("#menuOverlay");
  o.classList.add("isOn");
  o.setAttribute("aria-hidden","false");
}
function closeMenu(){
  const o = $("#menuOverlay");
  o.classList.remove("isOn");
  o.setAttribute("aria-hidden","true");
}
function initMenu(){
  $("#menuBtn")?.addEventListener("click", openMenu);
  $("#menuClose")?.addEventListener("click", closeMenu);
  $("#menuScrim")?.addEventListener("click", closeMenu);
  // close after clicking a link
  $$("#menuOverlay a").forEach(a=>a.addEventListener("click", closeMenu));
}

/* ---------------- Modal ---------------- */

function openModal(html){
  const root = $("#modalRoot");
  root.innerHTML = `
    <div class="modal__scrim" id="modalScrim"></div>
    <div class="modal__panel">${html}</div>
  `;
  root.classList.add("isOn");
  root.setAttribute("aria-hidden","false");
  $("#modalScrim")?.addEventListener("click", closeModal);
}
function closeModal(){
  const root = $("#modalRoot");
  root.classList.remove("isOn");
  root.setAttribute("aria-hidden","true");
  root.innerHTML = "";
}

/* ---------------- Maps ---------------- */

function ensureLeaflet(){
  if(!window.L) throw new Error("Leaflet not loaded.");
}

function makeMap(el, center=[40.7447,-73.9839], zoom=11){
  ensureLeaflet();
  const map = L.map(el, { zoomControl:true }).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  return map;
}

function addPins(map, landlords, onClick){
  ensureLeaflet();
  const markers = [];
  for(const l of landlords){
    if(!l.geo || typeof l.geo.lat !== "number" || typeof l.geo.lng !== "number") continue;
    const m = L.marker([l.geo.lat, l.geo.lng]).addTo(map);
    m.on("click", ()=> onClick?.(l));
    markers.push(m);
  }
  return markers;
}

function fitPins(map, landlords){
  const pts = landlords
    .filter(l=>l.geo && typeof l.geo.lat==="number" && typeof l.geo.lng==="number")
    .map(l=>[l.geo.lat, l.geo.lng]);
  if(pts.length === 0) return;
  const bounds = L.latLngBounds(pts);
  map.fitBounds(bounds.pad(0.22));
}

/* ---------------- Components ---------------- */

function landlordToSlug(l){
  const base = slugify(l.name || "landlord");
  return `${base}-${l.id.slice(0,8)}`;
}
function landlordFromSlug(slug){
  const idPart = slug.split("-").slice(-1)[0];
  // idPart is 8 chars from UUID
  return DB.landlords.find(l => l.id.slice(0,8) === idPart) || null;
}

function viewBtn(slug){
  return `<a class="btn btn--primary btn--pill" href="#/landlord/${slug}">View</a>`;
}

function centerBtn(idx){
  return `<button class="btn btn--subtle btn--pill" data-center="${idx}" type="button">Center on map</button>`;
}

/* ---------------- Pages ---------------- */

function renderShell(html){
  $("#app").innerHTML = html;
}

function renderHome(){
  // Highlights: 5 most recent reviews (max)
  const recent = [...DB.reviews]
    .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))
    .slice(0,5)
    .map(r=>{
      const l = DB.landlords.find(x=>x.id===r.landlordId);
      return l ? { r, l } : null;
    })
    .filter(Boolean);

  const slides = recent.map(({r,l}, i)=>{
    const stats = roundedAvgForLandlord(l.id);
    const tierCls = tierClassForCard(stats.rounded, stats.count);
    const tierPill = tierPillHTML(stats.rounded, stats.count);
    const slug = landlordToSlug(l);

    return `
      <div class="slide ${tierCls}" data-slide="${i}" style="${i===0 ? "" : "display:none;"}">
        <div class="slide__main">
          <div class="rowTitle">
            ${escapeHTML(l.name)} ${badgeHTML(l)}
          </div>
          <div class="rowMeta">${escapeHTML(locationLine(l))} • ${fmtDate(r.createdAt)}</div>

          <div class="ratingLine">
            ${starHTML(stats.rounded)}
            <span class="ratingNum">${stats.rounded ? stats.rounded.toFixed(1) : "0.0"}</span>
            <span class="count">(${stats.count} review${stats.count===1?"":"s"})</span>
            ${tierPill}
          </div>

          <div style="margin-top:10px; font-weight:750; color:rgba(25,22,20,.78);">
            ${escapeHTML(r.text)}
          </div>
          <div class="tiny" style="margin-top:8px;">Rating reflects review recency.</div>
        </div>

        <div class="slide__cta">
          ${viewBtn(slug)}
        </div>
      </div>
    `;
  }).join("");

  const dots = recent.map((_,i)=>`<div class="dot ${i===0?"isOn":""}" data-dot="${i}" role="button" aria-label="Go to item ${i+1}"></div>`).join("");

  renderShell(`
    <section class="hero">
      <div class="kicker">CASA</div>
      <div class="h1">Know your landlord<br/>before you sign.</div>
      <p class="sub">Search landlords, read tenant reviews, and add your building in minutes.</p>

      <div class="heroRow">
        <input id="homeQ" placeholder="Search landlord name, management company, or address..." />
        <button class="btn btn--primary btn--pill" id="homeSearchBtn" type="button">Search</button>
        <a class="btn btn--ghost btn--pill" href="#/add">Add a landlord</a>
      </div>

      <div class="tiny" style="text-align:center; margin-top:10px;">
        No account required to review. Verified landlords can respond.
      </div>

      <div class="pills">
        <div class="pill" data-go="#/search">
          <div class="pillIcon">⌕</div>
          <div>Search</div>
        </div>
        <div class="pill" data-go="#/search">
          <div class="pillIcon">★</div>
          <div>Review</div>
        </div>
        <div class="pill" aria-disabled="true">
          <div class="pillIcon">⌂</div>
          <div>Rent</div>
        </div>
      </div>
    </section>

    <div style="height:16px;"></div>

    <section class="split">
      <!-- Recent Highlights (half) -->
      <div class="card card--flat">
        <div class="sectionHead">
          <div>
            <div class="kicker">Featured Reviews</div>
            <h2 class="sectionTitle">Recent highlights</h2>
            <p class="sectionSub">Browse ratings and landlord profiles.</p>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/search">Browse all</a>
        </div>

        <div class="sectionBody carousel">
          ${recent.length ? slides : `<div class="tiny">No reviews yet.</div>`}
          <div class="dotRow">
            <div class="dots" id="highlightDots">${dots}</div>
          </div>
        </div>
      </div>

      <!-- Map (half) -->
      <div class="card card--flat">
        <div class="sectionHead">
          <div>
            <div class="kicker">Map</div>
            <h2 class="sectionTitle">Browse by location</h2>
            <p class="sectionSub">Pins reflect existing ratings.</p>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/search">Open search</a>
        </div>

        <div class="sectionBody mapBox">
          <div class="map" id="homeMap"></div>
        </div>
      </div>
    </section>
  `);

  // hero actions
  $("#homeSearchBtn").addEventListener("click", ()=>{
    const q = ($("#homeQ").value || "").trim();
    location.hash = `#/search${q ? "?q="+encodeURIComponent(q) : ""}`;
  });
  $("#homeQ").addEventListener("keydown", (e)=>{
    if(e.key==="Enter") $("#homeSearchBtn").click();
  });

  $$(".pill[data-go]").forEach(p=>p.addEventListener("click", ()=> location.hash = p.dataset.go));

  // map
  setTimeout(()=>{
    const el = $("#homeMap");
    if(!el) return;
    const map = makeMap(el, [40.73,-73.95], 10.8);
    addPins(map, DB.landlords, (l)=> location.hash = `#/landlord/${landlordToSlug(l)}`);
    fitPins(map, DB.landlords);
  }, 0);

  // carousel
  setupHighlightsCarousel(recent.length);
}

function setupHighlightsCarousel(count){
  if(count <= 1) return;

  let idx = 0;
  let timer = null;

  const show = (n)=>{
    idx = (n + count) % count;
    $$("[data-slide]").forEach(el=>{
      el.style.display = (Number(el.dataset.slide) === idx) ? "" : "none";
    });
    $$("[data-dot]").forEach(d=>{
      d.classList.toggle("isOn", Number(d.dataset.dot) === idx);
    });
    DB.ui.highlightIndex = idx;
    saveDB(DB);
  };

  // dots click
  $$("[data-dot]").forEach(d=>{
    d.addEventListener("click", ()=>{
      const n = Number(d.dataset.dot);
      show(n);
      restart();
    });
  });

  const restart = ()=>{
    if(timer) clearInterval(timer);
    timer = setInterval(()=> show(idx+1), 4500);
  };

  // restore prior index if exists
  if(typeof DB.ui.highlightIndex === "number"){
    idx = clamp(DB.ui.highlightIndex, 0, count-1);
    show(idx);
  }
  restart();
}

function renderSearch(){
  // parse query
  const hash = location.hash || "#/search";
  const q = (hash.includes("?q=") ? decodeURIComponent(hash.split("?q=")[1].split("&")[0]) : "").trim();

  renderShell(`
    <section class="card card--flat">
      <div class="pad">
        <div class="profileHead">
          <div>
            <div class="kicker">Search</div>
            <div class="h1" style="font-size:44px;">Find a landlord</div>
            <div class="sub">Search by name, entity or address. Filter by borough.</div>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/">Home</a>
        </div>

        <div class="hr"></div>

        <div class="grid" style="grid-template-columns: 1fr 260px auto; align-items:end;">
          <div class="field">
            <label>Search</label>
            <input id="q" placeholder="Search landlord name, management company, or address..." value="${escapeAttr(q)}" />
          </div>
          <div class="field">
            <label>Borough</label>
            <select id="borough">
              ${BOROUGHS.map(b=>`<option value="${escapeAttr(b)}">${escapeHTML(b)}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn--primary btn--pill" id="go" type="button">Search</button>
        </div>

        <div style="height:14px;"></div>

        <!-- MAP ON TOP (like before) -->
        <div class="searchTopMap" id="searchMap"></div>

        <div style="height:14px;"></div>

        <div class="list" id="results"></div>
      </div>
    </section>
  `);

  const map = makeMap($("#searchMap"), [40.73,-73.95], 10.8);
  let markers = [];
  let current = DB.landlords.slice();

  function renderResults(list){
    const wrap = $("#results");
    if(list.length === 0){
      wrap.innerHTML = `<div class="tiny">No results.</div>`;
      return;
    }

    wrap.innerHTML = list.map((l, idx)=>{
      const stats = roundedAvgForLandlord(l.id);
      const tierCls = tierClassForCard(stats.rounded, stats.count);
      const slug = landlordToSlug(l);

      return `
        <div class="rowCard ${tierCls}">
          <div class="rowLeft">
            <div class="rowTitle">
              ${escapeHTML(l.name)} ${badgeHTML(l)}
              ${tierPillHTML(stats.rounded, stats.count)}
            </div>
            <div class="rowMeta">${escapeHTML(locationLine(l))}</div>

            <div class="ratingLine">
              ${stats.count ? starHTML(stats.rounded) : starHTML(0)}
              <span class="ratingNum">${stats.count ? stats.rounded.toFixed(1) : "—"}</span>
              <span class="count">${stats.count ? `(${stats.count} review${stats.count===1?"":"s"})` : "No ratings"}</span>
              <span class="tiny">Rating reflects review recency.</span>
            </div>
          </div>

          <div class="rowRight">
            <a class="btn btn--primary btn--pill" href="#/landlord/${slug}">View</a>
            <button class="btn btn--subtle btn--pill" data-center="${idx}" type="button">Center on map</button>
          </div>
        </div>
      `;
    }).join("");

    // center buttons
    $$("[data-center]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = Number(btn.dataset.center);
        const l = list[i];
        if(!l?.geo) return;
        map.setView([l.geo.lat, l.geo.lng], 14);
      });
    });
  }

  function updatePins(list){
    // remove old markers
    for(const m of markers){ try{ m.remove(); }catch{} }
    markers = addPins(map, list, (l)=> location.hash = `#/landlord/${landlordToSlug(l)}`);
    fitPins(map, list);
  }

  function run(){
    const query = ($("#q").value || "").trim().toLowerCase();
    const b = $("#borough").value;

    let list = DB.landlords.slice();

    if(b && b !== "All boroughs"){
      list = list.filter(l => (l.borough||"") === b);
    }
    if(query){
      list = list.filter(l=>{
        const hay = [
          l.name, l.entity,
          l.address?.line1, l.address?.unit, l.address?.city, l.address?.state,
          l.borough
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(query);
      });
    }

    current = list;
    renderResults(list);
    updatePins(list);
  }

  $("#go").addEventListener("click", run);
  $("#q").addEventListener("keydown", (e)=>{ if(e.key==="Enter") run(); });
  $("#borough").addEventListener("change", run);

  // initial
  renderResults(DB.landlords);
  updatePins(DB.landlords);
  if(q) { $("#q").value = q; run(); }
}

function renderAdd(){
  renderShell(`
    <section class="card card--flat">
      <div class="pad">
        <div class="profileHead">
          <div>
            <div class="kicker">Add</div>
            <div class="h1" style="font-size:44px;">Add a landlord</div>
            <div class="sub">Add the landlord first. You can rate them immediately after.</div>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/">Home</a>
        </div>

        <div class="hr"></div>

        <div class="cols">
          <div>
            <div class="field">
              <label class="req">Landlord / Company name</label>
              <input id="name" placeholder="e.g., Park Ave Management" />
            </div>

            <div class="field" style="margin-top:12px;">
              <label>Entity (optional)</label>
              <input id="entity" placeholder="e.g., Park Ave Management LLC" />
            </div>

            <div class="grid" style="grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
              <div class="field">
                <label class="req">Address</label>
                <input id="addr" placeholder="Street address" />
              </div>
              <div class="field">
                <label>Unit (optional)</label>
                <input id="unit" placeholder="Apt / Unit" />
              </div>
            </div>

            <div class="grid" style="grid-template-columns: 1fr 180px; gap:12px; margin-top:12px;">
              <div class="field">
                <label class="req">City</label>
                <input id="city" placeholder="City" />
              </div>
              <div class="field">
                <label class="req">State</label>
                <input id="state" placeholder="NY" />
              </div>
            </div>

            <div class="tiny" style="margin-top:10px;">
              Tip: place the pin (optional). You won’t enter coordinates.
            </div>

            <button class="btn btn--primary btn--block" id="addBtn" type="button" style="margin-top:12px;">
              Add landlord
            </button>

            <div class="tiny" style="margin-top:10px;">
              After adding, you’ll be taken to the landlord page where you can rate them.
            </div>
          </div>

          <div>
            <div class="kicker">Place the pin (optional)</div>
            <div class="tiny" style="margin-top:6px;">Click the map to set a location.</div>
            <div style="height:10px;"></div>
            <div class="map" id="addMap" style="height:260px;"></div>
            <div class="tiny" style="margin-top:10px;">If you don’t pick a pin, we’ll place it near NYC.</div>
          </div>
        </div>
      </div>
    </section>
  `);

  // map (optional pin)
  const map = makeMap($("#addMap"), [40.73,-73.95], 10.8);
  let pin = null;
  let picked = null;

  map.on("click", (e)=>{
    picked = e.latlng;
    if(pin) pin.remove();
    pin = L.marker([picked.lat, picked.lng]).addTo(map);
  });

  $("#addBtn").addEventListener("click", ()=>{
    const name = ($("#name").value||"").trim();
    const entity = ($("#entity").value||"").trim();
    const addr = ($("#addr").value||"").trim();
    const unit = ($("#unit").value||"").trim();
    const city = ($("#city").value||"").trim();
    const state = ($("#state").value||"").trim();

    if(!name || !addr || !city || !state){
      alert("Please fill in required fields: name, address, city, state.");
      return;
    }

    const l = {
      id: crypto.randomUUID(),
      name,
      entity,
      address: { line1: addr, unit, city, state },
      borough: "", // removed from form; you can derive later if you want
      geo: picked ? { lat: picked.lat, lng: picked.lng } : { lat: 40.73, lng: -73.95 },
      verified: false,
      top: false,
      createdAt: nowISO()
    };

    DB.landlords.unshift(l);
    saveDB(DB);

    // go to profile page
    location.hash = `#/landlord/${landlordToSlug(l)}`;
  });
}

function renderLandlord(slug){
  const l = landlordFromSlug(slug);
  if(!l) return renderNotFound();

  const stats = roundedAvgForLandlord(l.id);
  const tierCls = tierClassForCard(stats.rounded, stats.count);
  const tierPill = tierPillHTML(stats.rounded, stats.count);
  const status = casaStatusLabel(l.id);

  const rs = landlordReviews(l.id);

  renderShell(`
    <section class="card card--flat ${tierCls}">
      <div class="pad">
        <div class="profileHead">
          <div style="min-width:0;">
            <div class="kicker">Landlord</div>
            <div class="profileName">
              ${escapeHTML(l.name)} ${badgeHTML(l)}
            </div>

            <div class="ratingLine">
              ${stats.count ? starHTML(stats.rounded) : starHTML(0)}
              <span class="ratingNum">${stats.count ? stats.rounded.toFixed(1) : "—"}</span>
              <span class="count">${stats.count ? `${stats.count} review${stats.count===1?"":"s"}` : "No ratings"}</span>
              <span class="tiny">Rating reflects review recency.</span>
              ${tierPill}
              <span class="tierPill" style="margin-left:6px;">${escapeHTML(status)}</span>
            </div>

            <div class="rowMeta" style="margin-top:10px;">${escapeHTML(locationLine(l))}</div>
          </div>

          <div style="display:flex; gap:10px; align-items:center;">
            <a class="btn btn--ghost btn--pill" href="#/search">Back</a>
            <button class="btn btn--primary btn--pill" id="rateBtn" type="button">Rate this landlord</button>
          </div>
        </div>

        <div class="hr"></div>

        <div class="cols">
          <div>
            <div class="kicker">Location</div>
            <div style="height:10px;"></div>
            <div class="map" id="profileMap" style="height:290px;"></div>
            <div style="height:10px;"></div>
            <button class="btn btn--subtle btn--pill" id="centerProfile" type="button">Center on map</button>

            <div class="hr"></div>

            <div class="kicker">Rating distribution</div>
            ${distributionHTML(l.id)}
          </div>

          <div>
            <div class="kicker">Reviews</div>
            <div style="height:10px;"></div>
            <div class="list">
              ${rs.length ? rs.map(r=>reviewCardHTML(r)).join("") : `<div class="tiny">No reviews yet. Be the first.</div>`}
            </div>
          </div>
        </div>
      </div>
    </section>
  `);

  // profile map
  setTimeout(()=>{
    const m = makeMap($("#profileMap"), [l.geo.lat, l.geo.lng], 12.5);
    let mk = null;
    if(l.geo) mk = L.marker([l.geo.lat, l.geo.lng]).addTo(m);
    $("#centerProfile").addEventListener("click", ()=>{
      if(l.geo) m.setView([l.geo.lat, l.geo.lng], 14);
    });
  }, 0);

  // rate modal
  $("#rateBtn").addEventListener("click", ()=> openReviewModal(l.id));
}

function reviewCardHTML(r){
  const d = fmtDate(r.createdAt);
  return `
    <div class="rowCard">
      <div class="rowLeft">
        <div class="rowTitle">Rating</div>
        <div class="ratingLine">
          ${starHTML(r.rating)}
          <span class="ratingNum">${r.rating}/5</span>
        </div>
        <div style="margin-top:10px; font-weight:750; color:rgba(25,22,20,.78);">
          ${escapeHTML(r.text)}
        </div>
        <div style="margin-top:10px;">
          <button class="btn btn--subtle btn--pill" type="button" data-report="${r.id}">Report</button>
        </div>
      </div>
      <div class="rowRight">
        <div class="tiny">${d}</div>
      </div>
    </div>
  `;
}

function distributionHTML(landlordId){
  const rs = landlordReviews(landlordId);
  const counts = [0,0,0,0,0,0]; // 1..5
  for(const r of rs){ counts[r.rating]++; }
  const total = rs.length || 1;
  const rows = [5,4,3,2,1].map(star=>{
    const pct = (counts[star] / total) * 100;
    return `
      <div class="distRow">
        <div class="tiny">${star}★</div>
        <div class="bar"><div style="width:${pct.toFixed(1)}%"></div></div>
        <div class="tiny">${counts[star]}</div>
      </div>
    `;
  }).join("");

  return `<div class="dist">${rows}</div>`;
}

function openReviewModal(landlordId){
  openModal(`
    <div class="modal__head">
      <div class="modal__title">Leave a review</div>
      <button class="iconBtn" id="xClose" aria-label="Close">×</button>
    </div>

    <div class="modal__body">
      <div class="field">
        <label>Rating</label>
        <select id="mr">
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Good</option>
          <option value="3">3 — OK</option>
          <option value="2">2 — Poor</option>
          <option value="1">1 — Bad</option>
        </select>
      </div>

      <div class="field" style="margin-top:12px;">
        <label>What happened?</label>
        <textarea id="mt" placeholder="Keep it factual and specific."></textarea>
      </div>

      <div class="tiny" style="margin-top:10px;">
        Minimum length required. Don’t include phone numbers/emails/private info.
      </div>
    </div>

    <div class="modal__foot">
      <button class="btn btn--ghost btn--pill" id="cancel" type="button">Cancel</button>
      <button class="btn btn--primary btn--pill" id="submit" type="button">Submit</button>
    </div>
  `);

  $("#xClose").addEventListener("click", closeModal);
  $("#cancel").addEventListener("click", closeModal);
  $("#submit").addEventListener("click", ()=>{
    const rating = Number($("#mr").value);
    const text = ($("#mt").value||"").trim();

    if(text.length < 20){
      alert("Please write at least 20 characters.");
      return;
    }

    DB.reviews.unshift({
      id: crypto.randomUUID(),
      landlordId,
      rating,
      text,
      createdAt: nowISO()
    });
    saveDB(DB);
    closeModal();
    // re-render current page
    route();
  });
}

function renderPortal(){
  renderShell(`
    <section class="card card--flat">
      <div class="pad">
        <div class="profileHead">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div class="h1" style="font-size:44px;">Sign in</div>
            <div class="sub">Landlords verify documents before responding publicly.</div>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/">Home</a>
        </div>

        <div class="hr"></div>

        <div class="grid grid-2">
          <!-- SIGN IN -->
          <div class="card card--flat" style="box-shadow:none;">
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

              <button class="btn btn--primary btn--block" style="margin-top:12px;" id="login" type="button">Sign in</button>

              <div class="tiny" style="text-align:center; margin-top:12px;">or continue with</div>

              <button class="btn btn--ghost btn--block" style="margin-top:10px;" type="button">
                <span style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="font-weight:950; color:#DB4437;">G</span> Continue with Google
                </span>
              </button>

              <button class="btn btn--ghost btn--block" style="margin-top:10px;" type="button">
                <span style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="font-weight:950;"></span> Continue with Apple
                </span>
              </button>

              <button class="btn btn--ghost btn--block" style="margin-top:10px;" type="button">
                <span style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="font-weight:950; color:#2F6FED;">▦</span> Continue with Microsoft
                </span>
              </button>
            </div>
          </div>

          <!-- CREATE ACCOUNT -->
          <div class="card card--flat" style="box-shadow:none;">
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
                  <input id="doc" type="file" style="display:none;" />
                  <button class="fileBtn" id="filePick" type="button">Choose file</button>
                  <div class="fileName" id="fileName">No file chosen</div>
                </div>

                <div class="tiny" style="margin-top:6px;">Deed, property tax bill, management agreement, utility statement, etc.</div>
              </div>

              <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup" type="button">Create account</button>

              <div class="tiny" style="margin-top:10px;">
                Demo mode: accounts are not persisted. (Production: Stripe subscription required to claim/verify.)
              </div>

              <div class="tiny" style="text-align:center; margin-top:12px;">or continue with</div>

              <!-- MUST ALSO APPEAR UNDER CREATE ACCOUNT (you requested this) -->
              <button class="btn btn--ghost btn--block" style="margin-top:10px;" type="button">
                <span style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="font-weight:950; color:#DB4437;">G</span> Continue with Google
                </span>
              </button>

              <button class="btn btn--ghost btn--block" style="margin-top:10px;" type="button">
                <span style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="font-weight:950;"></span> Continue with Apple
                </span>
              </button>

              <button class="btn btn--ghost btn--block" style="margin-top:10px;" type="button">
                <span style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="font-weight:950; color:#2F6FED;">▦</span> Continue with Microsoft
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="card card--flat" style="box-shadow:none; margin-top:16px;">
          <div class="pad">
            <div style="font-weight:900;">Plans (demo copy)</div>
            <div class="muted">Claimed — $39/mo • Verified — $99/mo • Certified/Pro — $299/mo</div>
            <div class="tiny" style="margin-top:6px;">Landlords must subscribe to claim or verify.</div>
          </div>
        </div>
      </div>
    </section>
  `);

  // file input styling
  $("#filePick").addEventListener("click", ()=> $("#doc").click());
  $("#doc").addEventListener("change", ()=>{
    const f = $("#doc").files?.[0];
    $("#fileName").textContent = f ? f.name : "No file chosen";
  });

  // demo actions
  $("#login").addEventListener("click", ()=> alert("Demo: sign-in not wired yet."));
  $("#signup").addEventListener("click", ()=> alert("Demo: account creation not persisted yet."));
}

function renderHow(){
  renderShell(`
    <section class="card card--flat">
      <div class="pad">
        <div class="profileHead">
          <div>
            <div class="kicker">How it works</div>
            <div class="h1" style="font-size:44px;">Simple, fast, and public.</div>
            <div class="sub">No reviewer accounts. Landlords verify to respond.</div>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/">Home</a>
        </div>

        <div class="hr"></div>

        <div class="muted" style="line-height:1.55;">
          <div><b>Search</b><br/>Find a landlord by name, entity, address, or borough.</div>
          <div style="height:10px;"></div>
          <div><b>Review</b><br/>Post instantly. You’ll receive an edit link (no account required).</div>
          <div style="height:10px;"></div>
          <div><b>Respond (verified landlords)</b><br/>Landlords use the Landlord Portal and verify documents before responding publicly.</div>
          <div style="height:10px;"></div>
          <div><b>Report issues</b><br/>Spam, harassment, and personal info can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `);
}

function renderTrust(){
  renderShell(`
    <section class="card card--flat">
      <div class="pad">
        <div class="profileHead">
          <div>
            <div class="kicker">Trust & Safety</div>
            <div class="h1" style="font-size:44px;">Built for accuracy and accountability</div>
            <div class="sub">Clear rules + verified landlord responses.</div>
          </div>
          <a class="btn btn--ghost btn--pill" href="#/">Home</a>
        </div>

        <div class="hr"></div>

        <div class="muted" style="line-height:1.55;">
          <div><b>No reviewer accounts</b><br/>Tenants can post without accounts; edits use an edit link.</div>
          <div style="height:10px;"></div>
          <div><b>Verified landlord responses</b><br/>Landlords upload documentation and are reviewed before responding publicly.</div>
          <div style="height:10px;"></div>
          <div><b>No doxxing / personal info</b><br/>Do not post phone numbers, emails, or private details.</div>
          <div style="height:10px;"></div>
          <div><b>Reporting</b><br/>Spam, harassment, and inaccurate listings can be reported for moderation.</div>
        </div>
      </div>
    </section>
  `);
}

function renderNotFound(){
  renderShell(`
    <section class="card card--flat">
      <div class="pad">
        <div class="h1" style="font-size:44px;">Not found</div>
        <p class="sub">That page doesn’t exist.</p>
        <div style="height:10px;"></div>
        <a class="btn btn--primary btn--pill" href="#/">Go home</a>
      </div>
    </section>
  `);
}

/* ---------------- Escaping ---------------- */

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHTML(s); }

/* ---------------- Boot ---------------- */

function init(){
  $("#year").textContent = new Date().getFullYear();

  initMenu();

  window.addEventListener("hashchange", route);

  // close modal on escape
  window.addEventListener("keydown", (e)=>{
    if(e.key === "Escape"){
      closeModal();
      closeMenu();
    }
  });

  route();
}

init();
