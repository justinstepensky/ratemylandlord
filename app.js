/*******************************************************
 CASA — Front-end only demo (GitHub Pages friendly)
 - No reviewer accounts (reviews + landlords editable without login)
 - Review edit via secure edit link token
 - Landlord Portal: landlord accounts only + verification workflow
 - Verified landlords can claim + respond to reviews
 - AUTO_VERIFY toggle: add ?autoVerify=1 to URL
*******************************************************/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const LS_KEY = "casa_db_v3";
const AUTO_VERIFY = new URLSearchParams(location.search).get("autoVerify") === "1";

let db = loadDB();

const routes = {
  "/": renderHome,
  "/lookup": renderLookup,
  "/landlord": renderLandlordProfile,      // expects id
  "/add-landlord": renderAddLandlord,
  "/edit-landlord": renderEditLandlord,   // expects id
  "/review/new": renderNewReview,         // expects landlordId
  "/review/edit": renderEditReview,       // expects token
  "/landlord-portal": renderLandlordPortal,
  "/guidelines": renderGuidelines,
  "/how": renderHow,
  "/about": renderAbout,
  "/contact": renderContact,
  "/privacy": renderPrivacy,
};

initNavMenu();
initModal();
initRouter();
seedIfEmpty();
render();

function initNavMenu(){
  const btn = $("#menuBtn");
  const panel = $("#menuPanel");

  btn.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  panel.addEventListener("click", (e) => {
    const item = e.target.closest(".menu__item");
    if(!item) return;
    const r = item.getAttribute("data-route");
    panel.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    location.hash = r;
  });

  document.addEventListener("click", (e) => {
    if(panel.classList.contains("open")){
      if(!panel.contains(e.target) && !btn.contains(e.target)){
        panel.classList.remove("open");
        btn.setAttribute("aria-expanded","false");
      }
    }
  });
}

function initModal(){
  $("#modalCloseBtn").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", (e) => {
    if(e.target.id === "modalBackdrop") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeModal();
  });
}

function openModal(title, bodyHtml, footHtml){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modalFoot").innerHTML = footHtml || "";
  $("#modalBackdrop").classList.add("open");
  $("#modalBackdrop").setAttribute("aria-hidden","false");
  setTimeout(() => {
    const first = $("#modalBody").querySelector("input,textarea,select,button");
    if(first) first.focus();
  }, 50);
}
function closeModal(){
  $("#modalBackdrop").classList.remove("open");
  $("#modalBackdrop").setAttribute("aria-hidden","true");
}
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.style.display = "none", 2400);
}

/* Router */
function initRouter(){
  window.addEventListener("hashchange", render);
}
function parseHash(){
  const h = location.hash.replace(/^#/, "") || "/";
  // supports: /landlord?id=... or /review/edit/<token>
  const [pathAndMaybe, rest] = h.split("/").filter(Boolean);
  const path = h.startsWith("/review/edit/")
    ? "/review/edit"
    : h.startsWith("/landlord/")
      ? "/landlord"
      : h.startsWith("/edit-landlord/")
        ? "/edit-landlord"
        : h.startsWith("/review/new/")
          ? "/review/new"
          : (h.startsWith("/") ? h.split("?")[0] : `/${h.split("?")[0]}`);

  const full = h.startsWith("/") ? h : `/${h}`;
  const qs = full.includes("?") ? full.split("?")[1] : "";
  const params = new URLSearchParams(qs);

  const token = h.startsWith("/review/edit/") ? h.split("/review/edit/")[1] : null;
  const landlordIdFromPath = h.startsWith("/landlord/") ? h.split("/landlord/")[1] : null;
  const editLandlordIdFromPath = h.startsWith("/edit-landlord/") ? h.split("/edit-landlord/")[1] : null;
  const reviewNewLandlordIdFromPath = h.startsWith("/review/new/") ? h.split("/review/new/")[1] : null;

  return {
    path,
    params,
    token,
    landlordIdFromPath,
    editLandlordIdFromPath,
    reviewNewLandlordIdFromPath,
  };
}

function render(){
  db = loadDB(); // always refresh from storage
  const { path } = parseHash();
  const fn = routes[path] || renderNotFound;
  fn();
}

/* Data model:
db = {
  version:3,
  landlords: [
    { id, name, entityName, address, neighborhood, city, buildings:[...], createdAt, updatedAt, claimedByLandlordId? }
  ],
  reviews: [
    { id, landlordId, title, text, timeline, ratings:{overall,...}, createdAt, updatedAt, editToken, response?: { landlordAccountId, text, createdAt, verifiedAtLabel } }
  ],
  landlordAccounts: [
    { id, fullName, email, phone, relationship, entityName, propertyAddresses:[...], uploads:[{name,type,size}], verificationStatus:"pending"|"verified", createdAt }
  ]
}
*/

function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){
      return { version: 3, landlords: [], reviews: [], landlordAccounts: [] };
    }
    const parsed = JSON.parse(raw);
    parsed.version = 3;
    parsed.landlords ||= [];
    parsed.reviews ||= [];
    parsed.landlordAccounts ||= [];
    return parsed;
  }catch{
    return { version: 3, landlords: [], reviews: [], landlordAccounts: [] };
  }
}
function saveDB(next){
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}
function uuid(){
  if(crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function token(){
  // compact-ish token
  return (crypto?.randomUUID ? crypto.randomUUID().replaceAll("-","") : uuid().replaceAll("-","")) + Math.random().toString(16).slice(2);
}
function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function fmtDate(iso){
  try{ return new Date(iso).toLocaleDateString(); }catch{ return ""; }
}
function avg(nums){
  if(!nums.length) return null;
  return nums.reduce((a,b)=>a+b,0)/nums.length;
}
function fmtScore(x){
  if(x === null || x === undefined) return "—";
  return (Math.round(x*10)/10).toFixed(1);
}

/* Lobsters (minimal outline style) */
function lobsterSVG(on=true){
  const stroke = on ? "var(--lobsterOn)" : "var(--lobsterOff)";
  const fill = on ? "rgba(42,27,18,.08)" : "transparent";
  return `
    <svg class="lobster" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15 18c-6-6-12-1-11 5 1 5 6 9 11 9" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M49 18c6-6 12-1 11 5-1 5-6 9-11 9" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M20 26c-6-2-10 0-12 4" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M44 26c6-2 10 0 12 4" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M32 18c-7 0-13 6-13 15 0 7 3 12 8 15v8c0 3 2 6 5 6s5-3 5-6v-8c5-3 8-8 8-15 0-9-6-15-13-15Z"
            stroke="${stroke}" stroke-width="3.6" stroke-linejoin="round" fill="${fill}"/>
      <path d="M25 38h14" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" opacity=".95"/>
      <path d="M25 45h14" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" opacity=".85"/>
      <path d="M28 52h8" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round" opacity=".75"/>
    </svg>
  `;
}
function lobsterStars(score){
  if(score === null || score === undefined) return `<span class="tiny muted">No reviews</span>`;
  const filled = Math.round(score);
  let out = "";
  for(let i=1;i<=5;i++) out += lobsterSVG(i<=filled);
  return out;
}

/* Search helpers */
function landlordHay(l){
  return [
    l.name, l.entityName, l.address, l.neighborhood, l.city,
    ...(l.buildings || [])
  ].filter(Boolean).join(" ").toLowerCase();
}
function addressHay(l){
  return [
    l.address, l.neighborhood, l.city,
    ...(l.buildings || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

function landlordStats(landlordId){
  const rs = db.reviews.filter(r => r.landlordId === landlordId);
  const keys = ["overall","repairs","responsiveness","deposits","conditions","communication"];
  const stats = { count: rs.length };
  for(const k of keys){
    stats[k] = avg(rs.map(r => Number(r.ratings?.[k] ?? null)).filter(v => Number.isFinite(v)));
  }
  return stats;
}
function tagsFromStats(stats){
  const tags = [];
  if(!stats.count) return ["No reviews yet"];
  if(stats.repairs >= 4.2) tags.push("Fast repairs");
  if(stats.responsiveness >= 4.2) tags.push("Responsive");
  if(stats.communication >= 4.0) tags.push("Clear comms");
  if(stats.conditions <= 2.8) tags.push("Condition issues");
  if(stats.deposits <= 2.5) tags.push("Deposit issues");
  if(!tags.length) tags.push("Mixed experiences");
  return tags.slice(0,3);
}

/* Seed */
function seedIfEmpty(){
  if(db.landlords.length || db.reviews.length) return;
  const l1 = {
    id: uuid(),
    name: "Northside Properties",
    entityName: "Northside Properties LLC",
    address: "123 Main St",
    neighborhood: "Williamsburg",
    city: "Brooklyn, NY",
    buildings: ["123 Main St, Williamsburg", "125 Main St, Williamsburg"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    claimedByLandlordId: null
  };
  const l2 = {
    id: uuid(),
    name: "Seaport Management",
    entityName: "Seaport Management Co.",
    address: "88 Water St",
    neighborhood: "Financial District",
    city: "New York, NY",
    buildings: ["88 Water St, FiDi"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    claimedByLandlordId: null
  };

  const r1 = {
    id: uuid(),
    landlordId: l1.id,
    title: "Reliable repairs, decent communication",
    text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
    timeline: "3/2: reported leak • 3/4: plumber scheduled • 3/9: repair completed",
    ratings: { overall: 4, repairs: 5, responsiveness: 4, deposits: 4, conditions: 3, communication: 4 },
    createdAt: new Date(Date.now()-1000*60*60*24*10).toISOString(),
    updatedAt: new Date(Date.now()-1000*60*60*24*10).toISOString(),
    editToken: token(),
    response: null
  };

  const next = {
    ...db,
    landlords: [l1, l2],
    reviews: [r1],
  };
  saveDB(next);
  db = next;
}

/* Pages */

function renderHome(){
  const app = $("#app");
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="pad">
          <div class="kicker">Casa</div>
          <h1>Look up a landlord.<br/>Leave factual reviews.</h1>
          <p class="lead">
            Casa is designed to feel calm and usable. No reviewer accounts required.
            Verified landlords can respond after verification through the Landlord Portal.
          </p>

          <!-- Dual search module (hero) -->
          <div id="heroSearchModule" class="searchModule" aria-label="Search module">
            <div class="searchBubble" id="bubbleLandlord">
              <span class="tiny">⌕</span>
              <input id="heroLandlordInput" autocomplete="off"
                placeholder="Search by landlord (name / LLC / management company)" />
              <div class="suggest" id="heroLandlordSuggest"></div>
            </div>
            <div class="searchAction">
              <button class="btn btn--primary" id="heroLandlordBtn">Search</button>
            </div>

            <div class="searchBubble" id="bubbleAddress">
              <span class="tiny">⌕</span>
              <input id="heroAddressInput" autocomplete="off"
                placeholder="Search by address" />
              <div class="suggest" id="heroAddressSuggest"></div>
            </div>
            <div class="searchAction">
              <button class="btn btn--primary" id="heroAddressBtn">Search</button>
            </div>
          </div>

          <div class="previewRow">
            <div class="previewCard" aria-label="Example review preview">
              <div class="rowTitle">Example review preview</div>
              <div class="rowSub">Short timeline beats ranting. Specific beats vague.</div>
              <div class="lobsterRow" style="margin-top:10px;">
                <div class="lobsterStars">${lobsterStars(4)}</div>
                <div class="scoreText">4/5</div>
                <span class="pill" style="margin-left:auto;">Factual • Timeline • Specific</span>
              </div>
              <div class="tagRow">
                <span class="tag">Fast repairs</span>
                <span class="tag">Clear comms</span>
                <span class="tag">Deposit fair</span>
              </div>
            </div>
          </div>

          <!-- 1/2/3 clickable instructional cards -->
          <div class="stepsGrid" aria-label="How to use Casa">
            <div tabindex="0" class="stepCard tint1" id="step1">
              <div class="stepCard__badge">1</div>
              <div class="stepCard__title">1 — Look Up</div>
              <div class="stepCard__body">Choose a search method below to find a landlord fast.</div>
            </div>

            <div tabindex="0" class="stepCard tint2" id="step2">
              <div class="stepCard__badge">2</div>
              <div class="stepCard__title">2 — Review</div>
              <div class="stepCard__body">Write a factual review: rate 1–5 lobsters, add a timeline, and keep it specific.</div>
            </div>

            <div tabindex="0" class="stepCard tint3" id="step3">
              <div class="stepCard__badge">3</div>
              <div class="stepCard__title">3 — Improve</div>
              <div class="stepCard__body">Fix missing info: add buildings, correct names/LLCs, and update details.</div>
            </div>
          </div>

          <div class="tiny" style="margin-top:14px;">
            Tip: for demo/dev verification, open <b>Landlord Portal</b> and submit docs. Add <b>?autoVerify=1</b> to auto-verify.
          </div>
        </div>
      </div>
    </section>
  `;

  // Step card actions
  $("#step1").addEventListener("click", () => focusHeroLandlord());
  $("#step1").addEventListener("keydown", (e) => { if(e.key==="Enter") focusHeroLandlord(); });

  $("#step2").addEventListener("click", () => {
    // If no landlord selected, prompt search first
    openModal(
      "Write a review",
      `<div class="tiny">First, pick a landlord. Search on the homepage or go to results.</div>
       <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
         <button class="btn btn--primary" id="goLookup">Go to results</button>
         <button class="btn btn--ghost" id="closeM">Close</button>
       </div>`,
      ``
    );
    $("#goLookup").onclick = () => { closeModal(); location.hash = "#/lookup"; };
    $("#closeM").onclick = closeModal;
  });

  $("#step2").addEventListener("keydown", (e)=>{ if(e.key==="Enter") $("#step2").click(); });

  $("#step3").addEventListener("click", () => {
    location.hash = "#/lookup";
    toast("Search, select a landlord, then edit the profile.");
  });
  $("#step3").addEventListener("keydown", (e)=>{ if(e.key==="Enter") $("#step3").click(); });

  // Search buttons
  $("#heroLandlordBtn").addEventListener("click", () => {
    const q = $("#heroLandlordInput").value.trim();
    goLookup({ type: "landlord", q });
  });
  $("#heroAddressBtn").addEventListener("click", () => {
    const q = $("#heroAddressInput").value.trim();
    goLookup({ type: "address", q });
  });

  // Autosuggest
  attachSuggest("#heroLandlordInput", "#heroLandlordSuggest", "landlord");
  attachSuggest("#heroAddressInput", "#heroAddressSuggest", "address");

  // allow Enter key
  $("#heroLandlordInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") $("#heroLandlordBtn").click(); });
  $("#heroAddressInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") $("#heroAddressBtn").click(); });
}

function focusHeroLandlord(){
  const el = $("#heroLandlordInput");
  if(el){
    el.scrollIntoView({ behavior:"smooth", block:"center" });
    setTimeout(()=> el.focus(), 220);
  }else{
    location.hash = "#/lookup";
  }
}

function goLookup({ type, q }){
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("q", q || "");
  location.hash = `#/lookup?${params.toString()}`;
}

/* Autosuggest for landlords + addresses */
function attachSuggest(inputSel, suggestSel, mode){
  const input = $(inputSel);
  const suggest = $(suggestSel);

  function close(){
    suggest.classList.remove("open");
    suggest.innerHTML = "";
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if(!q){
      close();
      return;
    }

    let items = [];
    if(mode === "landlord"){
      items = db.landlords
        .map(l => ({
          id: l.id,
          label: l.entityName ? `${l.name} (${l.entityName})` : l.name,
          hay: landlordHay(l)
        }))
        .filter(x => x.hay.includes(q))
        .slice(0,6);
    } else {
      items = db.landlords
        .flatMap(l => {
          const addresses = [
            [l.address, l.neighborhood, l.city].filter(Boolean).join(", "),
            ...(l.buildings || [])
          ].filter(Boolean);

          return addresses.map(a => ({ landlordId: l.id, label: a, hay: a.toLowerCase() }));
        })
        .filter(x => x.hay.includes(q))
        .slice(0,6);
    }

    if(!items.length){
      close();
      return;
    }

    suggest.innerHTML = items.map((it, idx) => {
      return `<button type="button" data-idx="${idx}">${esc(it.label)}</button>`;
    }).join("");
    suggest.classList.add("open");

    suggest.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-idx"));
        const picked = items[i];
        input.value = picked.label;
        close();

        // Suggest click routes
        if(mode === "landlord"){
          goLookup({ type:"landlord", q: picked.label });
        } else {
          goLookup({ type:"address", q: picked.label });
        }
      });
    });
  });

  input.addEventListener("blur", () => {
    setTimeout(close, 120); // allow click
  });
  input.addEventListener("focus", () => {
    // if typed already, re-open
    input.dispatchEvent(new Event("input"));
  });
}

/* Lookup page */
function renderLookup(){
  const { params } = parseHash();
  const type = params.get("type") || "landlord";
  const q = (params.get("q") || "").trim().toLowerCase();

  const app = $("#app");

  const results = db.landlords
    .map(l => ({ l, stats: landlordStats(l.id) }))
    .filter(({l}) => {
      if(!q) return true;
      if(type === "address") return addressHay(l).includes(q);
      return landlordHay(l).includes(q);
    })
    .sort((a,b) => {
      const ao = a.stats.overall ?? -1;
      const bo = b.stats.overall ?? -1;
      if(bo !== ao) return bo - ao;
      return (b.stats.count || 0) - (a.stats.count || 0);
    });

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Results</div>
            <div style="font-weight:1000;">${type === "address" ? "Search by address" : "Search by landlord"}</div>
            <div class="tiny">${q ? `Query: “${esc(params.get("q"))}”` : "No query — showing top results"}</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/">← Home</a>
            <a class="btn btn--primary" href="#/add-landlord">Add landlord</a>
          </div>
        </div>

        <div class="bd">
          ${
            results.length ? "" : `
              <div class="box">
                <div style="font-weight:1000;">No results.</div>
                <div class="tiny" style="margin-top:6px;">Not found? Add landlord →</div>
                <div style="margin-top:10px;">
                  <a class="btn btn--primary" href="#/add-landlord">Add landlord</a>
                </div>
              </div>
            `
          }

          <div class="grid">
            <div>
              ${results.map(({l,stats}) => landlordRowCard(l, stats)).join("")}
            </div>

            <aside class="card side">
              <div style="font-weight:1000;">Tips</div>
              <div class="box" style="margin-top:10px;">
                <div class="tiny">
                  • No account needed to add/edit landlords or write reviews.<br/>
                  • Use timelines and dates.<br/>
                  • Landlords respond only after verification.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  `;

  // attach click handlers
  $$(".rowCard[data-landlord]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-landlord");
      location.hash = `#/landlord/${id}`;
    });
  });
}

function landlordRowCard(l, stats){
  const locationLine = [l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—";
  const tags = tagsFromStats(stats);
  return `
    <div class="rowCard" data-landlord="${esc(l.id)}" role="button" aria-label="Open landlord ${esc(l.name)}">
      <div style="flex:1; min-width:0;">
        <div class="rowTitle">${esc(l.name)}</div>
        <div class="lobsterRow">
          <div class="lobsterStars">${lobsterStars(stats.overall)}</div>
          <div class="scoreText">${stats.overall ? `${Math.round(stats.overall)}/5` : "—"}</div>
          ${isLandlordVerifiedClaimedBadge(l)}
        </div>
        <div class="rowSub">${esc(locationLine)} • ${stats.count} review${stats.count===1?"":"s"}</div>
        <div class="tagRow">
          ${tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function isLandlordVerifiedClaimedBadge(l){
  if(!l.claimedByLandlordId) return "";
  const acc = db.landlordAccounts.find(a => a.id === l.claimedByLandlordId);
  if(!acc) return "";
  if(acc.verificationStatus !== "verified") return "";
  return `<span class="badge badge--verified" style="margin-left:auto;">Verified Landlord</span>`;
}

/* Landlord profile */
function renderLandlordProfile(){
  const { landlordIdFromPath } = parseHash();
  const id = landlordIdFromPath;
  const l = db.landlords.find(x => x.id === id);
  const app = $("#app");

  if(!l){
    app.innerHTML = `<section class="section"><div class="card"><div class="pad">Landlord not found.</div></div></section>`;
    return;
  }

  const stats = landlordStats(l.id);
  const reviews = db.reviews.filter(r => r.landlordId === l.id).slice().sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));
  const claimedAcc = l.claimedByLandlordId ? db.landlordAccounts.find(a => a.id === l.claimedByLandlordId) : null;
  const verifiedClaimed = Boolean(claimedAcc && claimedAcc.verificationStatus === "verified");

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div style="min-width:0;">
            <h2>${esc(l.name)} ${verifiedClaimed ? `<span class="badge badge--verified">Verified Landlord</span>` : ""}</h2>
            <div class="muted">${esc([l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—")}</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/lookup">← Results</a>
            <a class="btn btn--ghost" href="#/edit-landlord/${esc(l.id)}">Edit landlord</a>
            <a class="btn btn--primary" href="#/review/new/${esc(l.id)}">Write review</a>
          </div>
        </div>

        <div class="bd">
          <div class="grid">
            <div>
              <div class="card" style="box-shadow:none;">
                <div class="hd" style="padding:14px 14px 8px;">
                  <div class="kicker">Overall</div>
                  <div class="tiny">${stats.count} reviews</div>
                </div>
                <div class="bd" style="padding: 0 14px 14px;">
                  <div class="lobsterRow">
                    <div class="lobsterStars">${lobsterStars(stats.overall)}</div>
                    <div class="scoreText">${stats.overall ? `${Math.round(stats.overall)}/5` : "—"}</div>
                  </div>
                  <div class="tagRow">
                    ${tagsFromStats(stats).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}
                  </div>

                  ${
                    verifiedClaimed
                      ? `<div class="box" style="margin-top:12px;">
                          <div style="font-weight:1000;">This profile is claimed</div>
                          <div class="tiny">Responses are from a Verified Landlord.</div>
                        </div>`
                      : `<div class="box" style="margin-top:12px;">
                          <div style="font-weight:1000;">Landlord response requires verification</div>
                          <div class="tiny">Landlords must verify in the Landlord Portal before responding.</div>
                          <div style="margin-top:10px;">
                            <a class="btn btn--primary" href="#/landlord-portal">Landlord Portal</a>
                          </div>
                        </div>`
                  }
                </div>
              </div>

              <div style="margin-top:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                  <div style="font-weight:1000;">Reviews</div>
                  <div class="tiny">${reviews.length ? "" : "No reviews yet — be the first."}</div>
                </div>

                <div id="reviewsList" style="margin-top:10px;">
                  ${reviews.map(r => reviewCard(r, l)).join("")}
                </div>
              </div>
            </div>

            <aside class="card side">
              <div style="font-weight:1000;">Landlord info</div>
              <div class="box" style="margin-top:10px;">
                <div class="tiny"><b>Entity:</b> ${esc(l.entityName || "—")}</div>
                <div class="tiny" style="margin-top:6px;"><b>Buildings:</b><br/>${(l.buildings||[]).length ? (l.buildings||[]).map(b=>`• ${esc(b)}`).join("<br/>") : "—"}</div>
              </div>

              <div style="margin-top:12px;">
                <a class="btn btn--block btn--primary" href="#/review/new/${esc(l.id)}">Write review</a>
              </div>
              <div style="margin-top:10px;">
                <a class="btn btn--block btn--ghost" href="#/edit-landlord/${esc(l.id)}">Edit landlord</a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  `;

  // Attach landlord response handlers (only if verified + claimed by current landlord portal session)
  // Demo: landlord portal session stored as currentLandlordAccountId in localStorage
  const currentAccId = localStorage.getItem("casa_current_landlord_account_id");
  const currentAcc = currentAccId ? db.landlordAccounts.find(a => a.id === currentAccId) : null;
  const canRespond = Boolean(
    currentAcc &&
    currentAcc.verificationStatus === "verified" &&
    l.claimedByLandlordId === currentAcc.id
  );

  if(canRespond){
    $$(".respondBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const reviewId = btn.getAttribute("data-review");
        openRespondModal({ reviewId, landlordId: l.id, landlordAccountId: currentAcc.id });
      });
    });
  }
}

function reviewCard(r, landlord){
  const created = fmtDate(r.createdAt);
  const overall = r.ratings?.overall ?? null;
  const hasResponse = Boolean(r.response && r.response.text);

  // Show respond button only if landlord verified and claimed by current account
  const currentAccId = localStorage.getItem("casa_current_landlord_account_id");
  const currentAcc = currentAccId ? db.landlordAccounts.find(a => a.id === currentAccId) : null;
  const canRespond = Boolean(
    currentAcc &&
    currentAcc.verificationStatus === "verified" &&
    landlord.claimedByLandlordId === currentAcc.id
  );

  return `
    <div class="rowCard" style="cursor:default;">
      <div style="flex:1; min-width:0;">
        <div class="rowTitle">${esc(r.title || "Review")}</div>
        <div class="lobsterRow" style="margin-top:-2px;">
          <div class="lobsterStars">${lobsterStars(overall)}</div>
          <div class="scoreText">${overall ? `${overall}/5` : "—"}</div>
          <span class="tiny" style="margin-left:auto;">${esc(created)}</span>
        </div>

        <div class="tiny" style="margin-top:8px; color:rgba(35,24,16,.82); font-weight:850; white-space:pre-wrap;">
          ${esc(r.text || "")}
        </div>

        ${r.timeline ? `<div class="box" style="margin-top:10px;"><div class="tiny"><b>Timeline:</b><br/>${esc(r.timeline)}</div></div>` : ""}

        ${
          hasResponse
            ? `<div class="box" style="margin-top:12px; border-style:solid;">
                <div class="badge badge--verified">Response from Verified Landlord</div>
                <div class="tiny" style="margin-top:10px; white-space:pre-wrap;">${esc(r.response.text)}</div>
                <div class="tiny" style="margin-top:8px;">${esc(fmtDate(r.response.createdAt))}</div>
              </div>`
            : ""
        }

        ${
          canRespond && !hasResponse
            ? `<div style="margin-top:12px; display:flex; justify-content:flex-end;">
                 <button class="btn btn--primary respondBtn" data-review="${esc(r.id)}">Respond</button>
               </div>`
            : ""
        }
      </div>
    </div>
  `;
}

function openRespondModal({ reviewId, landlordId, landlordAccountId }){
  openModal(
    "Post a response",
    `
      <div class="tiny">This will appear as “Response from Verified Landlord”.</div>
      <div class="field" style="margin-top:10px;">
        <label>Response</label>
        <textarea id="respText" placeholder="Keep it calm and specific…"></textarea>
      </div>
    `,
    `
      <button class="btn btn--ghost" id="cancelResp">Cancel</button>
      <button class="btn btn--primary" id="saveResp">Post response</button>
    `
  );
  $("#cancelResp").onclick = closeModal;
  $("#saveResp").onclick = () => {
    const text = ($("#respText").value || "").trim();
    if(text.length < 3) return toast("Write a little more.");

    const next = loadDB();
    const rev = next.reviews.find(x => x.id === reviewId);
    if(!rev) return toast("Review not found.");
    if(rev.response?.text) return toast("Response already exists.");

    // verify that current landlord session matches and is verified
    const acc = next.landlordAccounts.find(a => a.id === landlordAccountId);
    const l = next.landlords.find(x => x.id === landlordId);
    if(!acc || !l) return toast("Not permitted.");
    if(acc.verificationStatus !== "verified") return toast("Not verified.");
    if(l.claimedByLandlordId !== acc.id) return toast("You must claim this profile.");

    rev.response = {
      landlordAccountId: acc.id,
      text,
      createdAt: new Date().toISOString(),
      verifiedAtLabel: "Verified Landlord"
    };
    rev.updatedAt = new Date().toISOString();

    saveDB(next);
    closeModal();
    toast("Response posted.");
    render();
  };
}

/* Add landlord (no login required) */
function renderAddLandlord(){
  const app = $("#app");
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Add landlord</div>
            <div class="tiny">No account needed.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/lookup">← Results</a>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>
        </div>

        <div class="bd">
          <div class="field">
            <label>Landlord / company name</label>
            <input id="lname" placeholder="e.g., Northside Properties" />
          </div>
          <div class="field" style="margin-top:10px;">
            <label>Entity name (LLC / management company)</label>
            <input id="lentity" placeholder="e.g., Northside Properties LLC" />
          </div>
          <div class="field" style="margin-top:10px;">
            <label>Primary address (optional)</label>
            <input id="laddr" placeholder="e.g., 123 Main St" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div class="field">
              <label>Neighborhood (optional)</label>
              <input id="lhood" placeholder="e.g., Williamsburg" />
            </div>
            <div class="field">
              <label>City (optional)</label>
              <input id="lcity" placeholder="e.g., New York, NY" />
            </div>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Buildings (optional, one per line)</label>
            <textarea id="lbuildings" placeholder="123 Main St, Williamsburg&#10;125 Main St, Williamsburg"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/lookup">Cancel</a>
            <button class="btn btn--primary" id="saveLandlord">Save landlord</button>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#saveLandlord").onclick = () => {
    const name = ($("#lname").value || "").trim();
    if(name.length < 2) return toast("Enter a name.");

    const entityName = ($("#lentity").value || "").trim() || null;
    const address = ($("#laddr").value || "").trim() || null;
    const neighborhood = ($("#lhood").value || "").trim() || null;
    const city = ($("#lcity").value || "").trim() || null;
    const buildings = ($("#lbuildings").value || "").split("\n").map(s=>s.trim()).filter(Boolean);

    const next = loadDB();
    const newL = {
      id: uuid(),
      name,
      entityName,
      address,
      neighborhood,
      city,
      buildings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      claimedByLandlordId: null
    };
    next.landlords.unshift(newL);
    saveDB(next);
    toast("Landlord added.");
    location.hash = `#/landlord/${newL.id}`;
  };
}

/* Edit landlord (no login required) */
function renderEditLandlord(){
  const { editLandlordIdFromPath } = parseHash();
  const id = editLandlordIdFromPath;
  const next = loadDB();
  const l = next.landlords.find(x => x.id === id);

  const app = $("#app");
  if(!l){
    app.innerHTML = `<section class="section"><div class="card"><div class="pad">Landlord not found.</div></div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Edit landlord</div>
            <div style="font-weight:1000;">${esc(l.name)}</div>
            <div class="tiny">No account needed.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">← Back</a>
          </div>
        </div>

        <div class="bd">
          <div class="field">
            <label>Name</label>
            <input id="ename" value="${esc(l.name)}" />
          </div>
          <div class="field" style="margin-top:10px;">
            <label>Entity name</label>
            <input id="eentity" value="${esc(l.entityName || "")}" />
          </div>
          <div class="field" style="margin-top:10px;">
            <label>Primary address</label>
            <input id="eaddr" value="${esc(l.address || "")}" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div class="field">
              <label>Neighborhood</label>
              <input id="ehood" value="${esc(l.neighborhood || "")}" />
            </div>
            <div class="field">
              <label>City</label>
              <input id="ecity" value="${esc(l.city || "")}" />
            </div>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Buildings (one per line)</label>
            <textarea id="ebuildings">${esc((l.buildings||[]).join("\n"))}</textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Cancel</a>
            <button class="btn btn--primary" id="saveEdit">Save changes</button>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#saveEdit").onclick = () => {
    const name = ($("#ename").value || "").trim();
    if(name.length < 2) return toast("Name too short.");

    l.name = name;
    l.entityName = ($("#eentity").value || "").trim() || null;
    l.address = ($("#eaddr").value || "").trim() || null;
    l.neighborhood = ($("#ehood").value || "").trim() || null;
    l.city = ($("#ecity").value || "").trim() || null;
    l.buildings = ($("#ebuildings").value || "").split("\n").map(s=>s.trim()).filter(Boolean);
    l.updatedAt = new Date().toISOString();

    saveDB(next);
    toast("Saved.");
    location.hash = `#/landlord/${l.id}`;
  };
}

/* New review (no login) + edit link token */
function renderNewReview(){
  const { reviewNewLandlordIdFromPath } = parseHash();
  const landlordId = reviewNewLandlordIdFromPath;
  const l = db.landlords.find(x => x.id === landlordId);
  const app = $("#app");

  if(!l){
    app.innerHTML = `<section class="section"><div class="card"><div class="pad">Choose a landlord first.</div></div></section>`;
    return;
  }

  const ratingKeys = [
    ["repairs","Repairs"],
    ["responsiveness","Responsiveness"],
    ["deposits","Deposits"],
    ["conditions","Conditions"],
    ["communication","Communication"]
  ];

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Write review</div>
            <div style="font-weight:1000;">${esc(l.name)}</div>
            <div class="tiny">No account needed. You’ll get an edit link after posting.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">← Back</a>
          </div>
        </div>

        <div class="bd">
          <div class="field">
            <label>Title (optional)</label>
            <input id="rtTitle" placeholder="e.g., Fast repairs, mixed communication" />
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Review (factual)</label>
            <textarea id="rtText" placeholder="Keep it specific. Avoid personal info."></textarea>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Timeline (recommended)</label>
            <textarea id="rtTimeline" placeholder="Example: 3/2 reported leak • 3/4 plumber scheduled • 3/9 repair completed"></textarea>
          </div>

          <div class="field" style="margin-top:12px;">
            <label>Overall rating</label>
            <div class="ratingPick" id="overallPick"></div>
            <div class="tiny" style="margin-top:6px;">Shows lobsters + numeric value (e.g., 4/5).</div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
            ${ratingKeys.map(([k,label]) => `
              <div class="field">
                <label>${label}</label>
                <select id="rk_${k}">
                  ${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===5?"selected":""}>${v}</option>`).join("")}
                </select>
              </div>
            `).join("")}
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Cancel</a>
            <button class="btn btn--primary" id="postReview">Post review</button>
          </div>
        </div>
      </div>
    </section>
  `;

  let overall = 5;
  renderOverallPicker();

  function renderOverallPicker(){
    const wrap = $("#overallPick");
    wrap.innerHTML = "";
    for(let i=1;i<=5;i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lobsterBtn" + (i===overall ? " selected" : "");
      btn.innerHTML = `${lobsterSVG(true)} <span class="ratingValue">${i}/5</span>`;
      btn.addEventListener("click", () => {
        overall = i;
        renderOverallPicker();
      });
      wrap.appendChild(btn);
    }
  }

  $("#postReview").onclick = () => {
    const text = ($("#rtText").value || "").trim();
    if(text.length < 10) return toast("Write a bit more detail (10+ chars).");

    const title = ($("#rtTitle").value || "").trim() || null;
    const timeline = ($("#rtTimeline").value || "").trim() || null;

    const ratings = {
      overall,
      repairs: Number($("#rk_repairs").value),
      responsiveness: Number($("#rk_responsiveness").value),
      deposits: Number($("#rk_deposits").value),
      conditions: Number($("#rk_conditions").value),
      communication: Number($("#rk_communication").value),
    };

    const editToken = token();
    const reviewId = uuid();

    const next = loadDB();
    next.reviews.push({
      id: reviewId,
      landlordId,
      title,
      text,
      timeline,
      ratings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editToken,
      response: null
    });
    saveDB(next);

    // Show edit link
    const editLink = `${location.origin}${location.pathname}#/review/edit/${editToken}`;
    openModal(
      "Review posted",
      `
        <div class="box">
          <div style="font-weight:1000;">Save this edit link</div>
          <div class="tiny" style="margin-top:6px;">You’ll need it to edit later.</div>
          <div class="field" style="margin-top:10px;">
            <label>Edit link</label>
            <input id="editLinkField" value="${esc(editLink)}" readonly />
          </div>
          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn--primary" id="copyLink">Copy link</button>
            <button class="btn btn--ghost" id="goBack">Back to landlord</button>
          </div>
        </div>
      `,
      ``
    );
    $("#copyLink").onclick = async () => {
      try{
        await navigator.clipboard.writeText(editLink);
        toast("Copied.");
      }catch{
        toast("Copy failed — select and copy manually.");
      }
    };
    $("#goBack").onclick = () => {
      closeModal();
      location.hash = `#/landlord/${landlordId}`;
      toast("Review saved.");
    };
  };
}

/* Edit review via token link */
function renderEditReview(){
  const { token: tok } = parseHash();
  const next = loadDB();
  const r = next.reviews.find(x => x.editToken === tok);
  const app = $("#app");

  if(!r){
    app.innerHTML = `
      <section class="section">
        <div class="card">
          <div class="pad">
            <div style="font-weight:1000;">Edit link not found.</div>
            <div class="tiny" style="margin-top:6px;">This link may be incorrect or expired.</div>
            <div style="margin-top:10px;"><a class="btn btn--primary" href="#/">Go home</a></div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const l = next.landlords.find(x => x.id === r.landlordId);

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Edit review</div>
            <div style="font-weight:1000;">${esc(l?.name || "Landlord")}</div>
            <div class="tiny">This page works without any account.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(r.landlordId)}">← Back</a>
          </div>
        </div>

        <div class="bd">
          <div class="field">
            <label>Title</label>
            <input id="etTitle" value="${esc(r.title || "")}" />
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Review</label>
            <textarea id="etText">${esc(r.text || "")}</textarea>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Timeline</label>
            <textarea id="etTimeline">${esc(r.timeline || "")}</textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(r.landlordId)}">Cancel</a>
            <button class="btn btn--primary" id="saveReviewEdit">Save changes</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div class="tiny"><b>Reminder:</b> keep it factual, avoid personal info.</div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#saveReviewEdit").onclick = () => {
    const text = ($("#etText").value || "").trim();
    if(text.length < 10) return toast("Write a bit more detail (10+ chars).");

    r.title = ($("#etTitle").value || "").trim() || null;
    r.text = text;
    r.timeline = ($("#etTimeline").value || "").trim() || null;
    r.updatedAt = new Date().toISOString();

    saveDB(next);
    toast("Saved.");
    location.hash = `#/landlord/${r.landlordId}`;
  };
}

/* Landlord Portal (only landlord accounts exist) */
function renderLandlordPortal(){
  const app = $("#app");
  const next = loadDB();

  const currentId = localStorage.getItem("casa_current_landlord_account_id");
  const current = currentId ? next.landlordAccounts.find(a => a.id === currentId) : null;

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div class="tiny">Only landlords can create accounts. Reviewers never need accounts.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/">← Home</a>
          </div>
        </div>

        <div class="bd">
          ${
            current
              ? landlordPortalDashboard(current, next)
              : landlordPortalSignupForm()
          }
        </div>
      </div>
    </section>
  `;

  // If no session, wire up create
  if(!current){
    $("#lpSubmit").onclick = () => {
      const fullName = ($("#lpName").value || "").trim();
      const email = ($("#lpEmail").value || "").trim();
      const phone = ($("#lpPhone").value || "").trim() || null;
      const relationship = ($("#lpRel").value || "").trim();
      const entityName = ($("#lpEntity").value || "").trim() || null;

      const props = ($("#lpProps").value || "").split("\n").map(s=>s.trim()).filter(Boolean);
      const uploads = $("#lpUploads").files ? Array.from($("#lpUploads").files) : [];

      if(fullName.length < 2) return toast("Enter full name.");
      if(!email.includes("@")) return toast("Enter a valid email.");
      if(!relationship) return toast("Pick a relationship.");
      if(!entityName && !props.length) return toast("Enter an entity name or at least one property address.");
      if(uploads.length < 2) return toast("Upload at least 2 documents.");

      const account = {
        id: uuid(),
        fullName,
        email,
        phone,
        relationship,
        entityName,
        propertyAddresses: props,
        uploads: uploads.map(f => ({ name: f.name, type: f.type, size: f.size })),
        verificationStatus: AUTO_VERIFY ? "verified" : "pending",
        createdAt: new Date().toISOString(),
      };

      const fresh = loadDB();
      fresh.landlordAccounts.push(account);
      saveDB(fresh);

      localStorage.setItem("casa_current_landlord_account_id", account.id);

      toast(AUTO_VERIFY ? "Verified (AUTO_VERIFY)" : "Submitted for verification");
      render();
    };
  } else {
    // dashboard actions
    const logoutBtn = $("#lpLogout");
    if(logoutBtn){
      logoutBtn.onclick = () => {
        localStorage.removeItem("casa_current_landlord_account_id");
        toast("Logged out.");
        render();
      };
    }

    const claimBtn = $("#lpClaimBtn");
    if(claimBtn){
      claimBtn.onclick = () => {
        openModal(
          "Claim a landlord profile",
          `
            <div class="tiny">Search and claim a profile. Only verified landlords can claim.</div>
            <div class="field" style="margin-top:10px;">
              <label>Search by landlord name / entity</label>
              <input id="claimSearch" placeholder="Type to search…" autocomplete="off" />
            </div>
            <div class="box" style="margin-top:10px;" id="claimResults">
              <div class="tiny">Type to see matches…</div>
            </div>
          `,
          `
            <button class="btn btn--ghost" id="cancelClaim">Close</button>
          `
        );
        $("#cancelClaim").onclick = closeModal;

        const input = $("#claimSearch");
        const resultsBox = $("#claimResults");

        input.addEventListener("input", () => {
          const q = (input.value || "").trim().toLowerCase();
          if(!q){
            resultsBox.innerHTML = `<div class="tiny">Type to see matches…</div>`;
            return;
          }

          const matches = loadDB().landlords
            .filter(l => landlordHay(l).includes(q))
            .slice(0,8);

          if(!matches.length){
            resultsBox.innerHTML = `<div class="tiny">No matches.</div>`;
            return;
          }

          resultsBox.innerHTML = matches.map(l => `
            <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(35,24,16,.08);">
              <div style="min-width:0;">
                <div style="font-weight:1000;">${esc(l.name)}</div>
                <div class="tiny">${esc(l.entityName || "")}</div>
              </div>
              <button class="btn btn--primary" data-claim="${esc(l.id)}">Claim</button>
            </div>
          `).join("");

          resultsBox.querySelectorAll("button[data-claim]").forEach(btn => {
            btn.onclick = () => {
              const lid = btn.getAttribute("data-claim");
              const fresh = loadDB();
              const acc = fresh.landlordAccounts.find(a => a.id === current.id);
              if(!acc) return toast("Session expired.");
              if(acc.verificationStatus !== "verified") return toast("Verification pending. Cannot claim yet.");

              const landlord = fresh.landlords.find(x => x.id === lid);
              if(!landlord) return toast("Not found.");

              landlord.claimedByLandlordId = acc.id;
              landlord.updatedAt = new Date().toISOString();
              saveDB(fresh);

              closeModal();
              toast("Profile claimed.");
              location.hash = `#/landlord/${lid}`;
            };
          });
        });
      };
    }

    const verifyBtn = $("#lpAutoVerifyBtn");
    if(verifyBtn){
      verifyBtn.onclick = () => {
        const fresh = loadDB();
        const acc = fresh.landlordAccounts.find(a => a.id === current.id);
        if(!acc) return;
        acc.verificationStatus = "verified";
        saveDB(fresh);
        toast("Marked verified (demo).");
        render();
      };
    }
  }
}

function landlordPortalSignupForm(){
  return `
    <div class="box">
      <div style="font-weight:1000;">Create a Landlord Portal account</div>
      <div class="tiny" style="margin-top:6px;">
        Verification requires document uploads (at least 2). Redacted docs are allowed.
      </div>
    </div>

    <div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="field">
        <label>Full name</label>
        <input id="lpName" placeholder="Full name" />
      </div>
      <div class="field">
        <label>Email</label>
        <input id="lpEmail" placeholder="name@email.com" />
      </div>
    </div>

    <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div class="field">
        <label>Phone (optional)</label>
        <input id="lpPhone" placeholder="(optional)" />
      </div>
      <div class="field">
        <label>Relationship</label>
        <select id="lpRel">
          <option value="">Select…</option>
          <option>Owner</option>
          <option>Property Manager</option>
          <option>Agent</option>
        </select>
      </div>
    </div>

    <div class="field" style="margin-top:10px;">
      <label>Property address(es) (one per line) OR landlord entity name</label>
      <textarea id="lpProps" placeholder="123 Main St, Brooklyn&#10;88 Water St, New York"></textarea>
    </div>

    <div class="field" style="margin-top:10px;">
      <label>Entity name (LLC / management company) (optional)</label>
      <input id="lpEntity" placeholder="Example: Northside Properties LLC" />
    </div>

    <div class="box" style="margin-top:12px;">
      <div style="font-weight:1000;">Accepted proof documents</div>
      <div class="tiny" style="margin-top:6px;">
        • Deed / property tax bill<br/>
        • Utility bill tied to property/entity<br/>
        • Lease agreement showing landlord/entity (redaction OK)<br/>
        • Management agreement<br/>
        • Business registration showing entity + address<br/>
        • City registration / licensing screenshots (where applicable)
      </div>
    </div>

    <div class="field" style="margin-top:12px;">
      <label>Upload documents (required, 2+). PDF/JPG/PNG.</label>
      <input id="lpUploads" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
    </div>

    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
      <button class="btn btn--primary" id="lpSubmit">Submit for verification</button>
    </div>

    <div class="tiny" style="margin-top:10px;">
      Demo toggle: add <b>?autoVerify=1</b> to the URL to auto-verify.
    </div>
  `;
}

function landlordPortalDashboard(acc, snapshot){
  const statusBadge = acc.verificationStatus === "verified"
    ? `<span class="badge badge--verified">Verified Landlord</span>`
    : `<span class="badge">Verification pending</span>`;

  return `
    <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
      <div>
        <div style="font-weight:1000;">${esc(acc.fullName)} ${statusBadge}</div>
        <div class="tiny">${esc(acc.email)} • ${esc(acc.relationship)}</div>
      </div>
      <button class="btn btn--ghost" id="lpLogout">Log out</button>
    </div>

    <div class="box" style="margin-top:12px;">
      <div style="font-weight:1000;">Verification status</div>
      ${
        acc.verificationStatus === "verified"
          ? `<div class="tiny" style="margin-top:6px;">You can claim profiles and respond to reviews.</div>`
          : `<div class="tiny" style="margin-top:6px;">
              Verification pending. For now, responses are disabled until verified.
              ${AUTO_VERIFY ? "" : " (Demo: you can mark verified below.)"}
            </div>`
      }
    </div>

    <div class="box" style="margin-top:12px;">
      <div style="font-weight:1000;">Documents uploaded</div>
      <div class="tiny" style="margin-top:6px;">
        ${(acc.uploads||[]).map(u=>`• ${esc(u.name)}`).join("<br/>") || "—"}
      </div>
    </div>

    <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn btn--primary" id="lpClaimBtn" ${acc.verificationStatus !== "verified" ? "disabled" : ""}>
        Claim a landlord profile
      </button>
      ${
        acc.verificationStatus !== "verified"
          ? `<button class="btn btn--ghost" id="lpAutoVerifyBtn">Demo: mark verified</button>`
          : ``
      }
    </div>

    <div class="tiny" style="margin-top:10px;">
      Once claimed + verified, you’ll see “Respond” buttons under reviews on that profile page.
    </div>
  `;
}

/* Static pages */
function renderGuidelines(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Posting Guidelines</div>
            <div class="tiny">Keep it factual. Timelines > ranting.</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Rules</div>
            <div class="tiny" style="margin-top:8px;">
              • Factual statements only (dates, work orders, outcomes).<br/>
              • No threats, harassment, or discriminatory content.<br/>
              • Timelines beat venting: “3/2 reported, 3/9 fixed.”<br/>
              • Optional evidence is fine (don’t dox anyone).<br/>
              • Avoid personal info: phone numbers, emails, full names of private individuals.<br/>
              • If mentioning an address, keep it general where possible.
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
function renderHow(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div><div class="kicker">How it works</div></div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">1) Look up</div>
            <div class="tiny" style="margin-top:6px;">Search by landlord/entity or by address.</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">2) Review</div>
            <div class="tiny" style="margin-top:6px;">No account. You get an edit link token after posting.</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">3) Improve</div>
            <div class="tiny" style="margin-top:6px;">Anyone can correct landlord profiles (names/LLCs/buildings).</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">Landlord responses</div>
            <div class="tiny" style="margin-top:6px;">Only verified landlords can claim and respond.</div>
          </div>
        </div>
      </div>
    </section>
  `;
}
function renderAbout(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd"><div class="kicker">About</div><a class="btn btn--ghost" href="#/">← Home</a></div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Casa</div>
            <div class="tiny" style="margin-top:8px;">
              A calm, premium landlord lookup + review layer. Designed for clarity and usefulness.
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
function renderContact(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd"><div class="kicker">Contact</div><a class="btn btn--ghost" href="#/">← Home</a></div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Contact</div>
            <div class="tiny" style="margin-top:8px;">Add your email/form later.</div>
          </div>
        </div>
      </div>
    </section>
  `;
}
function renderPrivacy(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd"><div class="kicker">Privacy / Terms</div><a class="btn btn--ghost" href="#/">← Home</a></div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Privacy</div>
            <div class="tiny" style="margin-top:8px;">
              Demo version stores data locally in your browser. Add hosted backend later for shared data.
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
function renderNotFound(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card"><div class="pad">
        <div style="font-weight:1000;">Not found</div>
        <div class="tiny" style="margin-top:6px;">Try going home.</div>
        <div style="margin-top:10px;"><a class="btn btn--primary" href="#/">Home</a></div>
      </div></div>
    </section>
  `;
}

/* Helpers */
function parseHash(){
  const h = location.hash.replace(/^#/, "") || "/";
  const path = h.startsWith("/review/edit/") ? "/review/edit"
    : h.startsWith("/landlord/") ? "/landlord"
    : h.startsWith("/edit-landlord/") ? "/edit-landlord"
    : h.startsWith("/review/new/") ? "/review/new"
    : (h.startsWith("/") ? h.split("?")[0] : `/${h.split("?")[0]}`);

  const full = h.startsWith("/") ? h : `/${h}`;
  const qs = full.includes("?") ? full.split("?")[1] : "";
  const params = new URLSearchParams(qs);

  const token = h.startsWith("/review/edit/") ? h.split("/review/edit/")[1] : null;
  const landlordIdFromPath = h.startsWith("/landlord/") ? h.split("/landlord/")[1] : null;
  const editLandlordIdFromPath = h.startsWith("/edit-landlord/") ? h.split("/edit-landlord/")[1] : null;
  const reviewNewLandlordIdFromPath = h.startsWith("/review/new/") ? h.split("/review/new/")[1] : null;

  return { path, params, token, landlordIdFromPath, editLandlordIdFromPath, reviewNewLandlordIdFromPath };
}

/* --- Acceptance checklist mapping ---
✅ create review no login -> yes
✅ edit via edit link -> yes (#/review/edit/<token>)
✅ add/edit landlords no login -> yes
✅ no reviewer login -> yes (menu has no login)
✅ navbar Landlord Portal -> yes
✅ landlord verification docs + status -> yes (2 uploads required + pending/verified)
✅ only verified landlords respond -> yes (verified + claimed + session)
✅ homepage no 3 pills -> yes
✅ dual search -> yes
✅ 1/2/3 clickable instructional -> yes
✅ example preview card -> yes
✅ grain/noise -> yes
✅ autosuggest -> yes
------------------------------------ */
