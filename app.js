/*******************************************************
 CASA — Front-end only demo (GitHub Pages friendly)
 - NO reviewer accounts (all tenant actions anonymous)
 - Token-based review edit links
 - Landlord Portal only: signup/login with password
 - Demo social sign-in buttons (no real OAuth)
*******************************************************/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const LS_KEY = "casa_db_v1";
const AUTO_VERIFY = new URLSearchParams(location.search).get("autoVerify") === "1";

const routes = {
  "/": renderHome,
  "/search": renderSearch,
  "/landlord": renderLandlordProfile,            // /landlord/:id
  "/add-landlord": renderAddLandlord,
  "/write-review": renderWriteReview,            // /write-review/:landlordId
  "/edit-review": renderEditReview,              // /edit-review/:editToken
  "/how-it-works": renderHowItWorks,
  "/trust-safety": renderTrustSafety,

  "/landlord-portal": renderPortalLanding,
  "/landlord-portal/login": renderPortalLogin,
  "/landlord-portal/signup": renderPortalSignup,
  "/landlord-portal/dashboard": renderPortalDashboard,
  "/landlord-portal/verify": renderPortalVerify,
};

initChrome();
seedIfEmpty();
render();

/* -------------------- Chrome -------------------- */

function initChrome(){
  const hb = $("#hamburgerBtn");
  const drawer = $("#navDrawer");
  if(hb && drawer){
    hb.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      hb.setAttribute("aria-expanded", open ? "true" : "false");
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
    });
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if(!a) return;
      drawer.classList.remove("open");
      hb.setAttribute("aria-expanded","false");
      drawer.setAttribute("aria-hidden","true");
    });
    document.addEventListener("click", (e) => {
      if(drawer.classList.contains("open")){
        if(!drawer.contains(e.target) && !hb.contains(e.target)){
          drawer.classList.remove("open");
          hb.setAttribute("aria-expanded","false");
          drawer.setAttribute("aria-hidden","true");
        }
      }
    });
  }

  // modal
  $("#modalCloseBtn").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", (e) => {
    if(e.target.id === "modalBackdrop") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeModal();
  });

  window.addEventListener("hashchange", render);
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
  }, 40);
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

/* -------------------- Router -------------------- */

function parseHash(){
  const raw = location.hash.replace(/^#/, "") || "/";
  const base = raw.split("?")[0];
  const parts = base.split("/").filter(Boolean);

  // special dynamic routes
  const fullPath =
    raw.startsWith("/landlord/") ? "/landlord" :
    raw.startsWith("/write-review/") ? "/write-review" :
    raw.startsWith("/edit-review/") ? "/edit-review" :
    raw.startsWith("/landlord-portal/") ? "/landlord-portal/" + (parts[1] || "") :
    "/" + (parts[0] || "");

  const sub = parts.slice(1);
  const qs = raw.includes("?") ? raw.split("?")[1] : "";
  const params = new URLSearchParams(qs);

  return { raw, fullPath, sub, params };
}

function render(){
  const { fullPath } = parseHash();
  const fn = routes[fullPath] || renderNotFound;
  fn();
}

/* -------------------- DB -------------------- */

function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){
      return { landlords: [], reviews: [], landlordAccounts: [], reportEvents: [] };
    }
    const db = JSON.parse(raw);
    db.landlords ||= [];
    db.reviews ||= [];
    db.landlordAccounts ||= [];
    db.reportEvents ||= [];
    return db;
  }catch{
    return { landlords: [], reviews: [], landlordAccounts: [], reportEvents: [] };
  }
}
function saveDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function uuid(){
  if(crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function token(){
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
  if(x === null || x === undefined || !Number.isFinite(x)) return "—";
  return (Math.round(x*10)/10).toFixed(1);
}
async function sha256(s){
  const enc = new TextEncoder().encode(String(s));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function bubble(tip){
  return `<span class="bubbleIcon" data-tip="${esc(tip)}" aria-label="${esc(tip)}"></span>`;
}

function landlordHay(l){
  return [
    l.name, l.entityName, l.address, l.neighborhood, l.city,
    ...(l.buildings || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

/* -------------------- Stars -------------------- */

function starSVG(on=true){
  const fill = on ? "var(--starOn)" : "transparent";
  const stroke = on ? "var(--starOn)" : "var(--starOff)";
  return `
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5l2.9 6.1 6.7.9-4.9 4.7 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6-4.9-4.7 6.7-.9L12 2.5z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>
  `;
}
function starRow(score){
  if(score === null || score === undefined) return `<span class="tiny muted">No reviews</span>`;
  const filled = Math.round(score);
  let out = "";
  for(let i=1;i<=5;i++) out += starSVG(i<=filled);
  return out;
}

/* -------------------- Session (Landlord Portal) -------------------- */

function currentLandlordAccount(){
  const id = localStorage.getItem("casa_current_landlord_account_id");
  if(!id) return null;
  const db = loadDB();
  return db.landlordAccounts.find(a => a.id === id) || null;
}
function setLandlordSession(id){
  localStorage.setItem("casa_current_landlord_account_id", id);
}
function clearLandlordSession(){
  localStorage.removeItem("casa_current_landlord_account_id");
}

/* -------------------- Seed -------------------- */

function seedIfEmpty(){
  const db = loadDB();
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
    claimedByLandlordId: null,
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
    claimedByLandlordId: null,
  };

  const r1 = {
    id: uuid(),
    landlordId: l1.id,
    title: "Reliable repairs, mixed communication",
    text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
    timeline: "3/2: reported leak • 3/4: plumber scheduled • 3/9: repair completed",
    ratings: {
      overall: 4,
      responsiveness: 4,
      repairs: 5,
      deposits: 4,
      conditions: 3,
      professionalism: 4
    },
    createdAt: new Date(Date.now()-1000*60*60*24*10).toISOString(),
    updatedAt: new Date(Date.now()-1000*60*60*24*10).toISOString(),
    editToken: token(),
    response: null,
    reports: 0,
    hidden: false,
  };

  db.landlords = [l1, l2];
  db.reviews = [r1];
  saveDB(db);
}

/* -------------------- Stats -------------------- */

function landlordStats(landlordId){
  const db = loadDB();
  const rs = db.reviews.filter(r => r.landlordId === landlordId && !r.hidden);
  const keys = ["overall","responsiveness","repairs","deposits","conditions","professionalism"];
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
  if(stats.deposits <= 2.5) tags.push("Deposit issues");
  if(stats.conditions <= 2.8) tags.push("Condition issues");
  if(stats.professionalism >= 4.0) tags.push("Professional");
  if(!tags.length) tags.push("Mixed experiences");
  return tags.slice(0,3);
}

function verifiedBadgeForLandlord(l){
  const db = loadDB();
  if(!l.claimedByLandlordId) return "";
  const acc = db.landlordAccounts.find(a => a.id === l.claimedByLandlordId);
  if(!acc || acc.verificationStatus !== "verified") return "";
  return `<span class="badge badge--verified" style="margin-left:8px;">Verified Landlord</span>`;
}

/* -------------------- Home -------------------- */

function renderHome(){
  const db = loadDB();
  const featured = db.reviews
    .filter(r => !r.hidden)
    .slice()
    .sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""))
    .slice(0,3)
    .map(r => ({ r, l: db.landlords.find(x=>x.id===r.landlordId) }))
    .filter(x=>x.l);

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="pad">
          <div class="hero">
            <div class="kicker">casa</div>
            <h1>Know your landlord<br/>before you sign.</h1>
            <p class="lead">Search landlords, read tenant reviews, and add your building in minutes.</p>

            <div class="heroSearch" aria-label="Search">
              <div class="heroSearch__bar">
                <input id="heroQ" autocomplete="off" placeholder="Search landlord name, management company, or address…" />
                <div class="suggest" id="heroSuggest"></div>
              </div>
              <button class="btn btn--primary" id="heroSearchBtn">Search</button>
              <a class="btn btn--outline" href="#/add-landlord">Add a landlord</a>
            </div>

            <div class="trustLine">No account required to review. Verified landlords can respond.</div>

            <div class="cards3" style="margin-top:12px;">
              ${xCard("Look Up","Search by name, entity, or address.", `
                <div class="tiny">Examples: “ABC Management”, “123 Main St”, “John Doe”</div>
              `, "Look Up")}
              ${xCard("Review","Pick a landlord → rate categories → write what happened → submit.", `
                <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
                  <span class="badge">No sign-up needed</span>
                  <a class="btnLink" href="#/search">Find a landlord →</a>
                </div>
              `, "Review")}
              ${xCard("Improve","Verified landlord responses + reporting tools + edits welcome.", `
                <div class="tiny">• Verified landlords can respond publicly</div>
                <div class="tiny" style="margin-top:6px;">• Report spam, harassment, or personal info</div>
                <div class="tiny" style="margin-top:6px;">• Add missing buildings and details</div>
              `, "Improve")}
            </div>

            <div class="trustRow">
              <div class="miniTrust">
                <div class="miniTrust__t">${bubble("No login required")} No login required for reviews</div>
                <div class="miniTrust__b">Post instantly. You get an edit link to update later.</div>
              </div>
              <div class="miniTrust">
                <div class="miniTrust__t">${bubble("Verified landlords")} Verified Landlord Responses</div>
                <div class="miniTrust__b">Landlords verify documents before responding.</div>
              </div>
              <div class="miniTrust">
                <div class="miniTrust__t">${bubble("Moderation")} Moderation + Reporting Tools</div>
                <div class="miniTrust__b">Report spam, harassment, or personal info.</div>
              </div>
            </div>
          </div>

          <div style="margin-top:18px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:1000;">Featured Reviews</div>
            <a class="btn btn--outline" href="#/search">Browse all</a>
          </div>

          <div class="featuredGrid">
            ${
              featured.length
                ? featured.map(({r,l}) => featuredCard(r,l)).join("")
                : `<div class="smallCard"><div class="smallCard__name">No reviews yet</div><div class="tiny" style="margin-top:6px;">Be the first to post a review.</div></div>`
            }
          </div>

          <div class="footer">
            <div class="tiny">© ${new Date().getFullYear()} casa</div>
            <div style="display:flex; gap:14px; flex-wrap:wrap;">
              <a href="#/trust-safety">Trust & Safety</a>
              <a href="#/how-it-works">How it works</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Expand cards
  $$(".xCard").forEach(card => {
    card.addEventListener("click", (e) => {
      if(e.target.closest("input,button,a,textarea,select")) return;
      card.classList.toggle("open");
    });
  });

  $("#heroSearchBtn").addEventListener("click", () => {
    goSearch(($("#heroQ").value || "").trim());
  });
  $("#heroQ").addEventListener("keydown", (e)=>{ if(e.key==="Enter") $("#heroSearchBtn").click(); });

  attachSuggest("#heroQ", "#heroSuggest");
}

function xCard(title, subtitle, bodyHtml, tip){
  return `
    <div class="xCard" tabindex="0" aria-label="${esc(title)}">
      <div class="xCard__top">
        <div class="xCard__title">${bubble(tip)} ${esc(title)}</div>
        <div class="tiny">+</div>
      </div>
      <div class="tiny" style="margin-top:6px;">${esc(subtitle)}</div>
      <div class="xCard__body">${bodyHtml}</div>
    </div>
  `;
}

function featuredCard(r,l){
  const addr = [l.address, l.neighborhood, l.city].filter(Boolean).join(" • ");
  const snippet = (r.text || "").slice(0,120) + ((r.text||"").length>120 ? "…" : "");
  return `
    <div class="smallCard">
      <div class="smallCard__top">
        <div>
          <div class="smallCard__name">${esc(l.name)}</div>
          <div class="smallCard__addr">${esc(addr || "—")}</div>
        </div>
        <div class="tiny">${esc(fmtDate(r.createdAt))}</div>
      </div>
      <div class="starRow" style="margin-top:8px;">
        <div class="starStars">${starRow(r.ratings?.overall)}</div>
        <div class="scoreText">${fmtScore(r.ratings?.overall)}</div>
      </div>
      <div class="smallCard__text">${esc(snippet)}</div>
      <div class="smallCard__foot">
        <a class="btn btn--outline" href="#/landlord/${esc(l.id)}">View Landlord</a>
        <span class="tiny">${r.response?.text ? "Has landlord response" : ""}</span>
      </div>
    </div>
  `;
}

function goSearch(q){
  const p = new URLSearchParams();
  p.set("q", q || "");
  location.hash = `#/search?${p.toString()}`;
}

/* Autosuggest */
function attachSuggest(inputSel, suggestSel){
  const input = $(inputSel);
  const suggest = $(suggestSel);
  if(!input || !suggest) return;

  function close(){
    suggest.classList.remove("open");
    suggest.innerHTML = "";
  }

  input.addEventListener("input", () => {
    const db = loadDB();
    const q = (input.value || "").trim().toLowerCase();
    if(!q){ close(); return; }

    const items = db.landlords
      .map(l => ({
        id: l.id,
        label: [l.name, l.entityName].filter(Boolean).join(" • "),
        hay: landlordHay(l),
      }))
      .filter(x => x.hay.includes(q))
      .slice(0,6);

    if(!items.length){ close(); return; }

    suggest.innerHTML = items.map((it, idx) => `<button type="button" data-idx="${idx}">${esc(it.label)}</button>`).join("");
    suggest.classList.add("open");

    suggest.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-idx"));
        close();
        goSearch(items[i].label);
      });
    });
  });

  input.addEventListener("blur", ()=> setTimeout(close, 120));
  input.addEventListener("focus", ()=> input.dispatchEvent(new Event("input")));
}

/* -------------------- Search -------------------- */

function renderSearch(){
  const { params } = parseHash();
  const db = loadDB();
  const q = (params.get("q") || "").trim().toLowerCase();
  const minRating = Number(params.get("min") || 0);
  const onlyVerifiedResponse = params.get("vr") === "1";

  const results = db.landlords
    .map(l => ({ l, stats: landlordStats(l.id) }))
    .filter(({l,stats}) => {
      if(q && !landlordHay(l).includes(q)) return false;
      if(minRating && (stats.overall ?? 0) < minRating) return false;
      if(onlyVerifiedResponse){
        const has = db.reviews.some(r => r.landlordId===l.id && !r.hidden && r.response?.text);
        if(!has) return false;
      }
      return true;
    })
    .sort((a,b) => (b.stats.overall ?? -1) - (a.stats.overall ?? -1));

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div style="min-width:0;">
            <div class="kicker">Search</div>
            <div class="tiny">Search by landlord name, entity, or address.</div>
          </div>
          <a class="btn btn--outline" href="#/add-landlord">Add landlord</a>
        </div>

        <div class="bd">
          <div class="heroSearch" style="justify-content:flex-start;">
            <div class="heroSearch__bar" style="max-width:720px;">
              <input id="searchQ" autocomplete="off" placeholder="Search landlord name, management company, or address…" value="${esc(params.get("q")||"")}" />
              <div class="suggest" id="searchSuggest"></div>
            </div>
            <button class="btn btn--primary" id="searchBtn">Search</button>
          </div>

          <div class="split2" style="margin-top:12px;">
            <div class="box">
              <div style="font-weight:1000;">Filters</div>
              <div class="field" style="margin-top:10px;">
                <label>Minimum rating</label>
                <select id="minSel">
                  ${[0,1,2,3,4].map(v => `<option value="${v}" ${v===minRating?"selected":""}>${v===0?"Any":`${v}★+`}</option>`).join("")}
                </select>
              </div>
              <div class="field" style="margin-top:10px;">
                <label>Verified landlord response</label>
                <select id="vrSel">
                  <option value="0" ${onlyVerifiedResponse?"":"selected"}>Any</option>
                  <option value="1" ${onlyVerifiedResponse?"selected":""}>Only listings with responses</option>
                </select>
              </div>
              <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn btn--primary" id="applyFilters">Apply</button>
                <a class="btn btn--ghost" href="#/search">Reset</a>
              </div>
            </div>

            <div class="box">
              <div style="font-weight:1000;">Tips</div>
              <div class="tiny" style="margin-top:8px;">
                • Reviews don’t require accounts.<br/>
                • You get an edit link after posting.<br/>
                • Landlords respond after verification.
              </div>
            </div>
          </div>

          ${
            results.length
              ? results.map(({l,stats}) => landlordResultCard(l,stats)).join("")
              : `
                <div class="box" style="margin-top:14px;">
                  <div style="font-weight:1000;">No matches found — want to add this landlord/building?</div>
                  <div style="margin-top:10px;"><a class="btn btn--primary" href="#/add-landlord">Add Landlord</a></div>
                </div>
              `
          }
        </div>
      </div>
    </section>
  `;

  attachSuggest("#searchQ", "#searchSuggest");

  $("#searchBtn").onclick = ()=> goSearch(($("#searchQ").value||"").trim());
  $("#searchQ").addEventListener("keydown",(e)=>{ if(e.key==="Enter") $("#searchBtn").click(); });

  $("#applyFilters").onclick = () => {
    const p = new URLSearchParams();
    p.set("q", ($("#searchQ").value||"").trim());
    p.set("min", $("#minSel").value);
    p.set("vr", $("#vrSel").value);
    location.hash = `#/search?${p.toString()}`;
  };

  $$(".rowCard[data-landlord]").forEach(el=>{
    el.addEventListener("click", ()=> location.hash = `#/landlord/${el.getAttribute("data-landlord")}`);
  });
}

function landlordResultCard(l, stats){
  const addr = [l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—";
  const tags = tagsFromStats(stats);
  const badge = verifiedBadgeForLandlord(l);
  return `
    <div class="rowCard" data-landlord="${esc(l.id)}" role="button" aria-label="Open ${esc(l.name)}" style="cursor:pointer;">
      <div style="flex:1; min-width:0;">
        <div class="rowTitle">${esc(l.name)} ${badge}</div>
        <div class="starRow">
          <div class="starStars">${starRow(stats.overall)}</div>
          <div class="scoreText">${fmtScore(stats.overall)}</div>
          <span class="tiny" style="margin-left:auto;">${stats.count} review${stats.count===1?"":"s"}</span>
        </div>
        <div class="rowSub">${esc(addr)}</div>
        <div class="tagRow">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>
      </div>
    </div>
  `;
}

/* -------------------- Landlord Profile -------------------- */

function renderLandlordProfile(){
  const { sub } = parseHash();
  const id = sub[0];
  const db = loadDB();
  const l = db.landlords.find(x=>x.id===id);

  if(!l){
    $("#app").innerHTML = notFoundCard("Landlord not found.", "Go to search", "#/search");
    return;
  }

  const stats = landlordStats(l.id);
  const reviews = db.reviews
    .filter(r=>r.landlordId===l.id && !r.hidden)
    .slice()
    .sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));

  const verified = verifiedBadgeForLandlord(l) !== "";
  const acc = currentLandlordAccount();
  const canRespond = Boolean(acc && acc.verificationStatus==="verified" && l.claimedByLandlordId===acc.id);

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div style="min-width:0;">
            <h2>${esc(l.name)} ${verified ? `<span class="badge badge--verified">Verified Landlord</span>` : ""}</h2>
            <div class="muted">${esc([l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—")}</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/search">← Search</a>
            <a class="btn btn--primary" href="#/write-review/${esc(l.id)}">Write a Review</a>
          </div>
        </div>

        <div class="bd">
          <div class="grid">
            <div>
              <div class="box">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                  <div>
                    <div class="kicker">Overall</div>
                    <div class="starRow" style="margin-top:6px;">
                      <div class="starStars">${starRow(stats.overall)}</div>
                      <div class="scoreText">${fmtScore(stats.overall)} ★</div>
                      <span class="tiny" style="margin-left:10px;">${stats.count} reviews</span>
                    </div>
                  </div>
                  ${
                    verified
                      ? `<div class="tiny">This profile is claimed by a verified landlord.</div>`
                      : `<a class="btn btn--outline" href="#/landlord-portal">Landlord? Claim this profile</a>`
                  }
                </div>
              </div>

              <div class="rowCard" style="cursor:default;">
                <div style="flex:1; min-width:0;">
                  <div style="font-weight:1000;">Rating breakdown</div>
                  ${ratingLine("Responsiveness", stats.responsiveness)}
                  ${ratingLine("Repairs & Maintenance", stats.repairs)}
                  ${ratingLine("Deposit Fairness", stats.deposits)}
                  ${ratingLine("Building Conditions", stats.conditions)}
                  ${ratingLine("Respect / Professionalism", stats.professionalism)}
                </div>
              </div>

              <div style="margin-top:14px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                <div style="font-weight:1000;">Reviews</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                  <div class="tiny">Sort</div>
                  <select id="sortSel" style="padding:10px 12px; border-radius:14px; border:1px solid rgba(35,24,16,.12); background: rgba(255,249,240,.95); font-weight:900;">
                    <option value="recent">Most recent</option>
                    <option value="high">Highest rating</option>
                    <option value="low">Lowest rating</option>
                  </select>
                </div>
              </div>

              <div id="reviewsWrap" style="margin-top:10px;">
                ${reviews.map(r=>reviewCard(r, { canRespond })).join("")}
              </div>
            </div>

            <aside class="card side">
              <div style="font-weight:1000;">Details</div>

              <div class="box" style="margin-top:10px;">
                <div class="tiny"><b>Entity:</b> ${esc(l.entityName || "—")}</div>
                <div class="tiny" style="margin-top:8px;"><b>Properties:</b><br/>
                  ${(l.buildings||[]).length ? (l.buildings||[]).map(b=>`• ${esc(b)}`).join("<br/>") : "—"}
                </div>
              </div>

              <div style="margin-top:12px;">
                <a class="btn btn--block btn--primary" href="#/write-review/${esc(l.id)}">Write a Review</a>
              </div>
              <div style="margin-top:10px;">
                <button class="btn btn--block btn--outline" id="suggestEditBtn">Suggest an Edit</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#suggestEditBtn").onclick = () => {
    openModal(
      "Suggest an Edit",
      `
        <div class="tiny">Edits are welcome. Keep changes factual.</div>
        <div class="field" style="margin-top:10px;">
          <label>What should be updated?</label>
          <textarea id="editSuggestion" placeholder="Example: add building address, correct entity name…"></textarea>
        </div>
      `,
      `
        <button class="btn btn--ghost" id="cancelSug">Cancel</button>
        <button class="btn btn--primary" id="sendSug">Submit</button>
      `
    );
    $("#cancelSug").onclick = closeModal;
    $("#sendSug").onclick = () => {
      closeModal();
      toast("Submitted. (Demo) Connect moderation queue later.");
    };
  };

  $("#sortSel").onchange = () => {
    const db2 = loadDB();
    let rs = db2.reviews.filter(r=>r.landlordId===l.id && !r.hidden);
    const v = $("#sortSel").value;
    if(v==="high") rs.sort((a,b)=> (b.ratings?.overall||0)-(a.ratings?.overall||0));
    else if(v==="low") rs.sort((a,b)=> (a.ratings?.overall||0)-(b.ratings?.overall||0));
    else rs.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));

    $("#reviewsWrap").innerHTML = rs.map(r=>reviewCard(r,{canRespond})).join("");
    wireReviewButtons(l.id);
  };

  wireReviewButtons(l.id);
}

function ratingLine(label, score){
  return `
    <div class="starRow" style="margin-top:10px;">
      <div style="min-width:180px; font-weight:950; color: rgba(35,24,16,.78);">${esc(label)}</div>
      <div class="starStars">${starRow(score)}</div>
      <div class="scoreText">${fmtScore(score)}</div>
    </div>
  `;
}

function reviewCard(r, { canRespond }){
  const overall = r.ratings?.overall ?? null;
  const hasResponse = Boolean(r.response?.text);
  return `
    <div class="rowCard" style="cursor:default;">
      <div style="flex:1; min-width:0;">
        <div class="rowTitle">${esc(r.title || "Review")}</div>

        <div class="starRow" style="margin-top:-2px;">
          <div class="starStars">${starRow(overall)}</div>
          <div class="scoreText">${fmtScore(overall)}</div>
          <span class="tiny" style="margin-left:auto;">${esc(fmtDate(r.createdAt))}</span>
        </div>

        <div class="tiny" style="margin-top:8px; color:rgba(35,24,16,.82); font-weight:850; white-space:pre-wrap;">
          ${esc(r.text || "")}
        </div>

        ${r.timeline ? `<div class="box" style="margin-top:10px;"><div class="tiny"><b>Timeline:</b><br/>${esc(r.timeline)}</div></div>` : ""}

        <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
          <button class="btn btn--ghost reportBtn" data-review="${esc(r.id)}">Report</button>
          ${canRespond && !hasResponse ? `<button class="btn btn--primary respondBtn" data-review="${esc(r.id)}">Respond</button>` : ""}
        </div>

        ${
          hasResponse
            ? `
              <div class="box" style="margin-top:12px; border-style:solid;">
                <div class="badge badge--verified">Verified Landlord Response</div>
                <div class="tiny" style="margin-top:10px; white-space:pre-wrap;">${esc(r.response.text)}</div>
                <div class="tiny" style="margin-top:8px;">${esc(fmtDate(r.response.createdAt))}</div>
              </div>
            `
            : ``
        }
      </div>
    </div>
  `;
}

function wireReviewButtons(landlordId){
  // report
  $$(".reportBtn").forEach(btn=>{
    btn.onclick = () => {
      const reviewId = btn.getAttribute("data-review");
      openModal(
        "Report review",
        `
          <div class="tiny">Select a reason.</div>
          <div class="field" style="margin-top:10px;">
            <label>Reason</label>
            <select id="repReason">
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="personal_info">Personal info / doxxing</option>
              <option value="fake">Fake review</option>
              <option value="irrelevant">Irrelevant</option>
            </select>
          </div>
        `,
        `
          <button class="btn btn--ghost" id="repCancel">Cancel</button>
          <button class="btn btn--primary" id="repSend">Submit</button>
        `
      );
      $("#repCancel").onclick = closeModal;
      $("#repSend").onclick = () => {
        const reason = $("#repReason").value;
        const db = loadDB();
        const r = db.reviews.find(x=>x.id===reviewId);
        if(!r) return toast("Not found.");
        r.reports = (r.reports||0) + 1;
        db.reportEvents.push({ reviewId, reason, createdAt: new Date().toISOString() });

        // basic moderation: hide if personal_info or 3+ reports
        if(reason === "personal_info") r.hidden = true;
        if((r.reports||0) >= 3) r.hidden = true;

        saveDB(db);
        closeModal();
        toast(r.hidden ? "Reported. Review hidden pending moderation." : "Reported. Thank you.");
        render();
      };
    };
  });

  // respond
  $$(".respondBtn").forEach(btn=>{
    btn.onclick = () => {
      const reviewId = btn.getAttribute("data-review");
      openRespondModal({ reviewId, landlordId });
    };
  });
}

function openRespondModal({ reviewId, landlordId }){
  const db = loadDB();
  const acc = currentLandlordAccount();
  const landlord = db.landlords.find(l=>l.id===landlordId);
  const rev = db.reviews.find(r=>r.id===reviewId);

  if(!acc) return toast("Please log in to the Landlord Portal.");
  if(!landlord || !rev) return toast("Not found.");
  if(acc.verificationStatus !== "verified") return toast("Verification required to respond.");
  if(landlord.claimedByLandlordId !== acc.id) return toast("You must claim this profile.");

  openModal(
    "Post a response",
    `
      <div class="tiny">This will appear as “Verified Landlord Response”. Keep it specific.</div>
      <div class="field" style="margin-top:10px;">
        <label>Response</label>
        <textarea id="respText" placeholder="Write a factual response…"></textarea>
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
    const db2 = loadDB();
    const rev2 = db2.reviews.find(x=>x.id===reviewId);
    if(!rev2) return toast("Not found.");
    if(rev2.response?.text) return toast("Response already exists.");

    rev2.response = { landlordAccountId: acc.id, text, createdAt: new Date().toISOString() };
    rev2.updatedAt = new Date().toISOString();
    saveDB(db2);

    closeModal();
    toast("Response posted.");
    render();
  };
}

/* -------------------- Add Landlord -------------------- */

function renderAddLandlord(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Add landlord</div>
            <div class="tiny">No account required.</div>
          </div>
          <a class="btn btn--ghost" href="#/search">← Search</a>
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

          <div class="split2" style="margin-top:10px;">
            <div class="field">
              <label>Neighborhood (optional)</label>
              <input id="lhood" placeholder="e.g., Williamsburg" />
            </div>
            <div class="field">
              <label>City (optional)</label>
              <input id="lcity" placeholder="e.g., Brooklyn, NY" />
            </div>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Properties / buildings (optional, one per line)</label>
            <textarea id="lbuildings" placeholder="123 Main St, Williamsburg&#10;125 Main St, Williamsburg"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/search">Cancel</a>
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

    const db = loadDB();
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
    db.landlords.unshift(newL);
    saveDB(db);

    toast("Landlord added.");
    location.hash = `#/landlord/${newL.id}`;
  };
}

/* -------------------- Write Review -------------------- */

function renderWriteReview(){
  const { sub } = parseHash();
  const landlordId = sub[0];
  const db = loadDB();
  const l = db.landlords.find(x=>x.id===landlordId);

  if(!l){
    $("#app").innerHTML = notFoundCard("Choose a landlord first.", "Go to search", "#/search");
    return;
  }

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Write review</div>
            <div style="font-weight:1000;">${esc(l.name)}</div>
            <div class="tiny">No account required. You’ll get an edit link after posting.</div>
          </div>
          <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">← Back</a>
        </div>

        <div class="bd">
          <div class="field">
            <label>Title (optional)</label>
            <input id="rtTitle" placeholder="e.g., Fast repairs, mixed communication" />
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Review (factual)</label>
            <textarea id="rtText" placeholder="What happened? Dates and specifics help. Avoid personal info."></textarea>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Timeline (recommended)</label>
            <textarea id="rtTimeline" placeholder="Example: 3/2 reported leak • 3/4 plumber scheduled • 3/9 repair completed"></textarea>
          </div>

          <div class="field" style="margin-top:12px;">
            <label>Overall rating</label>
            <div id="overallPick" class="starStars" style="margin-top:8px;"></div>
            <div class="tiny" style="margin-top:6px;">Select 1–5 stars.</div>
          </div>

          <div class="split2" style="margin-top:12px;">
            ${selectField("Responsiveness","responsiveness")}
            ${selectField("Repairs & Maintenance","repairs")}
            ${selectField("Deposit Fairness","deposits")}
            ${selectField("Building Conditions","conditions")}
            ${selectField("Respect / Professionalism","professionalism")}
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
  renderStarPicker();

  function renderStarPicker(){
    const wrap = $("#overallPick");
    wrap.innerHTML = "";
    for(let i=1;i<=5;i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--ghost";
      btn.style.minHeight = "40px";
      btn.style.padding = "8px 10px";
      btn.innerHTML = `<span class="starStars">${starRow(i)}</span><span class="tiny">${i}/5</span>`;
      btn.style.opacity = (i===overall ? "1" : ".65");
      btn.addEventListener("click", () => { overall = i; renderStarPicker(); });
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
      responsiveness: Number($("#rk_responsiveness").value),
      repairs: Number($("#rk_repairs").value),
      deposits: Number($("#rk_deposits").value),
      conditions: Number($("#rk_conditions").value),
      professionalism: Number($("#rk_professionalism").value),
    };

    const editToken = token();
    const reviewId = uuid();

    const db2 = loadDB();
    db2.reviews.push({
      id: reviewId,
      landlordId,
      title,
      text,
      timeline,
      ratings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editToken,
      response: null,
      reports: 0,
      hidden: false
    });
    saveDB(db2);

    const editLink = `${location.origin}${location.pathname}#/edit-review/${editToken}`;

    openModal(
      "Edit Link Created",
      `
        <div class="box">
          <div style="font-weight:1000;">Save this link to edit your review later.</div>
          <div class="tiny" style="margin-top:6px;">Anyone with the link can edit.</div>
          <div class="field" style="margin-top:10px;">
            <label>Edit link</label>
            <input id="editLinkField" value="${esc(editLink)}" readonly />
          </div>
          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn--primary" id="copyLink">Copy Link</button>
            <button class="btn btn--ghost" id="doneLink">Done</button>
          </div>
        </div>
      `,
      ``
    );

    $("#copyLink").onclick = async () => {
      try{ await navigator.clipboard.writeText(editLink); toast("Copied."); }
      catch{ toast("Copy failed — select and copy manually."); }
    };
    $("#doneLink").onclick = () => {
      closeModal();
      toast("Review posted.");
      location.hash = `#/landlord/${landlordId}`;
    };
  };
}

function selectField(label, key){
  return `
    <div class="field">
      <label>${esc(label)}</label>
      <select id="rk_${esc(key)}">
        ${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===5?"selected":""}>${v}</option>`).join("")}
      </select>
    </div>
  `;
}

/* -------------------- Edit Review -------------------- */

function renderEditReview(){
  const { sub } = parseHash();
  const editToken = sub[0];
  const db = loadDB();
  const r = db.reviews.find(x=>x.editToken===editToken);

  if(!r){
    $("#app").innerHTML = notFoundCard("Edit link not found.", "Go home", "#/");
    return;
  }
  const l = db.landlords.find(x=>x.id===r.landlordId);

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Edit review</div>
            <div style="font-weight:1000;">${esc(l?.name || "Landlord")}</div>
            <div class="tiny">Anyone with this link can edit.</div>
          </div>
          <a class="btn btn--ghost" href="#/landlord/${esc(r.landlordId)}">← Back</a>
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
            <div class="tiny"><b>Reminder:</b> Keep it factual. Avoid personal information.</div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#saveReviewEdit").onclick = () => {
    const text = ($("#etText").value || "").trim();
    if(text.length < 10) return toast("Write a bit more detail (10+ chars).");

    const db2 = loadDB();
    const r2 = db2.reviews.find(x=>x.editToken===editToken);
    if(!r2) return toast("Not found.");

    r2.title = ($("#etTitle").value || "").trim() || null;
    r2.text = text;
    r2.timeline = ($("#etTimeline").value || "").trim() || null;
    r2.updatedAt = new Date().toISOString();

    saveDB(db2);
    toast("Saved.");
    location.hash = `#/landlord/${r2.landlordId}`;
  };
}

/* -------------------- How It Works -------------------- */

function renderHowItWorks(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">How it works</div>
            <div class="tiny">Search → Review → Verified landlord responses</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">1) Search</div>
            <div class="tiny" style="margin-top:6px;">Search by landlord name, entity, management company, or address.</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">2) Review</div>
            <div class="tiny" style="margin-top:6px;">No account required. After posting, you get an edit link.</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">3) Landlord responses</div>
            <div class="tiny" style="margin-top:6px;">Only verified landlords can claim profiles and respond publicly.</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* -------------------- Trust & Safety -------------------- */

function renderTrustSafety(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Trust & Safety</div>
            <div class="tiny">Posting rules, moderation, and landlord verification</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">What can’t be posted</div>
            <div class="tiny" style="margin-top:8px;">
              • Personal info (phone numbers, emails, private individuals’ full names)<br/>
              • Threats, harassment, discriminatory content<br/>
              • Doxxing / identifying information intended to harm
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">What should be posted</div>
            <div class="tiny" style="margin-top:8px;">
              • Dates, timelines, work orders, outcomes<br/>
              • Clear descriptions of what happened (specific > vague)<br/>
              • Opinion is allowed — keep it grounded and non-personal
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Reporting + moderation</div>
            <div class="tiny" style="margin-top:8px;">
              Reviews can be reported for spam, harassment, personal info, fake reviews, or irrelevance.<br/>
              If a review is flagged for personal info or receives enough reports, it is hidden pending review.
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Landlord verification</div>
            <div class="tiny" style="margin-top:8px;">
              Landlords can create accounts in the Landlord Portal. To respond publicly, they must verify documents.
            </div>
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--outline" href="#/landlord-portal">Landlord Portal</a>
            <a class="btn btn--outline" href="#/search">Search</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* -------------------- Landlord Portal -------------------- */

function renderPortalLanding(){
  const acc = currentLandlordAccount();
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Claim profiles and respond to reviews</div>
            <div class="tiny">Verification required to respond publicly.</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          ${
            acc
              ? `
                <div class="box">
                  <div style="font-weight:1000;">Signed in as ${esc(acc.email)}</div>
                  <div class="tiny" style="margin-top:6px;">Go to your dashboard.</div>
                  <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                    <a class="btn btn--primary" href="#/landlord-portal/dashboard">Dashboard</a>
                    <button class="btn btn--ghost" id="portalLogout">Log out</button>
                  </div>
                </div>
              `
              : `
                <div class="box">
                  <div style="font-weight:1000;">Sign in or create an account</div>
                  <div class="tiny" style="margin-top:6px;">Accounts are for landlords only.</div>
                  <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                    <a class="btn btn--primary" href="#/landlord-portal/login">Log in</a>
                    <a class="btn btn--outline" href="#/landlord-portal/signup">Create account</a>
                  </div>
                </div>
              `
          }
        </div>
      </div>
    </section>
  `;

  const btn = $("#portalLogout");
  if(btn){
    btn.onclick = () => {
      clearLandlordSession();
      toast("Logged out.");
      render();
    };
  }
}

function renderPortalLogin(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Log in</div>
            <div class="tiny">Email + password</div>
          </div>
          <a class="btn btn--ghost" href="#/landlord-portal">← Back</a>
        </div>
        <div class="bd">
          <div class="field">
            <label>Email</label>
            <input id="loginEmail" placeholder="name@email.com" />
          </div>
          <div class="field" style="margin-top:10px;">
            <label>Password</label>
            <input id="loginPass" type="password" placeholder="Password" />
          </div>

          <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord-portal/signup">Create account</a>
            <button class="btn btn--primary" id="loginBtn">Log in</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Or sign in with</div>
            <div class="tiny" style="margin-top:6px;">Demo buttons (no real OAuth on GitHub Pages)</div>
            <div class="socialRow">
              <button class="socialBtn" id="socialGoogle">Google</button>
              <button class="socialBtn" id="socialApple">Apple</button>
              <button class="socialBtn" id="socialMicrosoft">Microsoft</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#loginBtn").onclick = async () => {
    const email = ($("#loginEmail").value||"").trim().toLowerCase();
    const pass = ($("#loginPass").value||"").trim();
    if(!email.includes("@")) return toast("Enter a valid email.");
    if(pass.length < 6) return toast("Password must be 6+ characters.");

    const db = loadDB();
    const acc = db.landlordAccounts.find(a => (a.email||"").toLowerCase() === email);
    if(!acc) return toast("Account not found.");

    const hash = await sha256(pass);
    if(acc.passwordHash !== hash) return toast("Incorrect password.");

    setLandlordSession(acc.id);
    toast("Logged in.");
    location.hash = "#/landlord-portal/dashboard";
  };

  $("#socialGoogle").onclick = () => demoSocialSignin("Google");
  $("#socialApple").onclick = () => demoSocialSignin("Apple");
  $("#socialMicrosoft").onclick = () => demoSocialSignin("Microsoft");
}

async function demoSocialSignin(provider){
  openModal(
    `${provider} sign-in (demo)`,
    `
      <div class="tiny">Enter an email. If no account exists, one is created.</div>
      <div class="field" style="margin-top:10px;">
        <label>Email</label>
        <input id="demoEmail" placeholder="name@email.com" />
      </div>
    `,
    `
      <button class="btn btn--ghost" id="demoCancel">Cancel</button>
      <button class="btn btn--primary" id="demoGo">Continue</button>
    `
  );
  $("#demoCancel").onclick = closeModal;
  $("#demoGo").onclick = async () => {
    const email = ($("#demoEmail").value||"").trim().toLowerCase();
    if(!email.includes("@")) return toast("Enter a valid email.");

    const db = loadDB();
    let acc = db.landlordAccounts.find(a => (a.email||"").toLowerCase() === email);
    if(!acc){
      acc = {
        id: uuid(),
        fullName: "Landlord",
        email,
        relationship: "Owner",
        entityName: null,
        propertyAddresses: [],
        uploads: [],
        verificationStatus: AUTO_VERIFY ? "verified" : "not_submitted",
        passwordHash: await sha256(token().slice(0,12)),
        createdAt: new Date().toISOString(),
        lastProvider: provider
      };
      db.landlordAccounts.push(acc);
      saveDB(db);
    }
    setLandlordSession(acc.id);
    closeModal();
    toast(`Signed in with ${provider}.`);
    location.hash = "#/landlord-portal/dashboard";
  };
}

function renderPortalSignup(){
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Create account</div>
            <div class="tiny">Accounts are for landlords only.</div>
          </div>
          <a class="btn btn--ghost" href="#/landlord-portal">← Back</a>
        </div>
        <div class="bd">
          <div class="split2">
            <div class="field">
              <label>Full name</label>
              <input id="suName" placeholder="Full name" />
            </div>
            <div class="field">
              <label>Email</label>
              <input id="suEmail" placeholder="name@email.com" />
            </div>
          </div>

          <div class="split2" style="margin-top:10px;">
            <div class="field">
              <label>Password</label>
              <input id="suPass" type="password" placeholder="6+ characters" />
            </div>
            <div class="field">
              <label>Relationship</label>
              <select id="suRel">
                <option value="">Select…</option>
                <option>Owner</option>
                <option>Property Manager</option>
                <option>Agent</option>
              </select>
            </div>
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Entity name (LLC / management company)</label>
            <input id="suEntity" placeholder="Example: Northside Properties LLC" />
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Property address(es) (one per line)</label>
            <textarea id="suProps" placeholder="123 Main St, Brooklyn&#10;88 Water St, New York"></textarea>
          </div>

          <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord-portal/login">Already have an account?</a>
            <button class="btn btn--primary" id="suBtn">Create account</button>
          </div>

          <div class="tiny" style="margin-top:10px;">
            Tip: add <b>?autoVerify=1</b> in the URL to auto-verify accounts (demo).
          </div>
        </div>
      </div>
    </section>
  `;

  $("#suBtn").onclick = async () => {
    const fullName = ($("#suName").value||"").trim();
    const email = ($("#suEmail").value||"").trim().toLowerCase();
    const pass = ($("#suPass").value||"").trim();
    const relationship = ($("#suRel").value||"").trim();
    const entityName = ($("#suEntity").value||"").trim() || null;
    const props = ($("#suProps").value||"").split("\n").map(s=>s.trim()).filter(Boolean);

    if(fullName.length < 2) return toast("Enter full name.");
    if(!email.includes("@")) return toast("Enter a valid email.");
    if(pass.length < 6) return toast("Password must be 6+ characters.");
    if(!relationship) return toast("Pick a relationship.");
    if(!entityName && !props.length) return toast("Enter entity name or at least one property address.");

    const db = loadDB();
    const exists = db.landlordAccounts.some(a => (a.email||"").toLowerCase() === email);
    if(exists) return toast("An account with that email already exists.");

    const account = {
      id: uuid(),
      fullName,
      email,
      relationship,
      entityName,
      propertyAddresses: props,
      uploads: [],
      verificationStatus: AUTO_VERIFY ? "verified" : "not_submitted",
      passwordHash: await sha256(pass),
      createdAt: new Date().toISOString(),
    };

    db.landlordAccounts.push(account);
    saveDB(db);
    setLandlordSession(account.id);

    toast("Account created.");
    location.hash = "#/landlord-portal/dashboard";
  };
}

function renderPortalDashboard(){
  const db = loadDB();
  const acc = currentLandlordAccount();
  if(!acc){
    location.hash = "#/landlord-portal/login";
    return;
  }

  const statusLabel =
    acc.verificationStatus === "verified" ? "Verified" :
    acc.verificationStatus === "pending" ? "Pending" :
    acc.verificationStatus === "rejected" ? "Rejected" :
    "Not submitted";

  const claimed = db.landlords.filter(l => l.claimedByLandlordId === acc.id);

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Dashboard</div>
            <div class="tiny">${esc(acc.email)} • Status: <b>${esc(statusLabel)}</b></div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--outline" href="#/landlord-portal/verify">Verification</a>
            <button class="btn btn--ghost" id="dashLogout">Log out</button>
          </div>
        </div>

        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Claim a landlord profile</div>
            <div class="tiny" style="margin-top:6px;">You must be verified to claim and respond.</div>
            <div class="heroSearch" style="justify-content:flex-start; margin-top:10px;">
              <div class="heroSearch__bar" style="max-width:520px;">
                <input id="claimQ" placeholder="Search landlord name/entity…" />
              </div>
              <button class="btn btn--primary" id="claimSearchBtn">Search</button>
            </div>
            <div class="box" style="margin-top:10px;" id="claimResults">
              <div class="tiny">Type a search to see matches.</div>
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Your claimed profiles</div>
            <div class="tiny" style="margin-top:6px;">${claimed.length ? "" : "None yet."}</div>
            <div style="margin-top:10px;">
              ${claimed.map(l=>`
                <div class="rowCard" style="cursor:default;">
                  <div style="flex:1;">
                    <div class="rowTitle">${esc(l.name)}</div>
                    <div class="tiny">${esc(l.entityName||"")}</div>
                    <div style="margin-top:10px;"><a class="btn btn--outline" href="#/landlord/${esc(l.id)}">Open</a></div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          ${
            acc.verificationStatus !== "verified"
              ? `<div class="box" style="margin-top:12px;">
                   <div style="font-weight:1000;">Verification required</div>
                   <div class="tiny" style="margin-top:6px;">Upload documents to enable responses.</div>
                   <div style="margin-top:10px;"><a class="btn btn--primary" href="#/landlord-portal/verify">Go to verification</a></div>
                 </div>`
              : ``
          }
        </div>
      </div>
    </section>
  `;

  $("#dashLogout").onclick = () => {
    clearLandlordSession();
    toast("Logged out.");
    location.hash = "#/landlord-portal";
  };

  $("#claimSearchBtn").onclick = () => {
    const q = ($("#claimQ").value||"").trim().toLowerCase();
    const db2 = loadDB();
    const matches = db2.landlords.filter(l => landlordHay(l).includes(q)).slice(0,8);

    const box = $("#claimResults");
    if(!q) return box.innerHTML = `<div class="tiny">Type a search to see matches.</div>`;
    if(!matches.length) return box.innerHTML = `<div class="tiny">No matches.</div>`;

    box.innerHTML = matches.map(l => `
      <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(35,24,16,.08);">
        <div style="min-width:0;">
          <div style="font-weight:1000;">${esc(l.name)}</div>
          <div class="tiny">${esc(l.entityName || "")}</div>
        </div>
        <button class="btn btn--primary" data-claim="${esc(l.id)}">Claim</button>
      </div>
    `).join("");

    box.querySelectorAll("button[data-claim]").forEach(btn=>{
      btn.onclick = () => {
        const lid = btn.getAttribute("data-claim");
        const db3 = loadDB();
        const acc3 = currentLandlordAccount();
        if(!acc3) return toast("Session expired.");
        if(acc3.verificationStatus !== "verified") return toast("Verification required to claim.");

        const land = db3.landlords.find(x=>x.id===lid);
        if(!land) return toast("Not found.");
        land.claimedByLandlordId = acc3.id;
        land.updatedAt = new Date().toISOString();
        saveDB(db3);

        toast("Profile claimed.");
        location.hash = `#/landlord/${lid}`;
      };
    });
  };
}

function renderPortalVerify(){
  const acc = currentLandlordAccount();
  if(!acc){
    location.hash = "#/landlord-portal/login";
    return;
  }

  const statusLabel =
    acc.verificationStatus === "verified" ? "Verified" :
    acc.verificationStatus === "pending" ? "Pending" :
    acc.verificationStatus === "rejected" ? "Rejected" :
    "Not submitted";

  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Verification</div>
            <div style="font-weight:1000;">Document upload</div>
            <div class="tiny">Status: <b>${esc(statusLabel)}</b></div>
          </div>
          <a class="btn btn--ghost" href="#/landlord-portal/dashboard">← Dashboard</a>
        </div>

        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Accepted proof documents</div>
            <div class="tiny" style="margin-top:8px;">
              • Deed / property tax record<br/>
              • Management agreement<br/>
              • Utility bill matching entity<br/>
              • Business registration matching entity
            </div>
          </div>

          <div class="field" style="margin-top:12px;">
            <label>Upload documents (2+ recommended)</label>
            <input id="verFiles" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
          </div>

          <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
            <button class="btn btn--outline" id="markPending">Submit for review</button>
            <button class="btn btn--primary" id="markVerified">Demo: mark verified</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Your uploads (demo)</div>
            <div class="tiny" style="margin-top:6px;">Files are not actually uploaded on GitHub Pages. We store filenames only.</div>
            <div id="uploadList" class="tiny" style="margin-top:10px;">—</div>
          </div>
        </div>
      </div>
    </section>
  `;

  const list = $("#uploadList");

  function refreshUploads(){
    const db = loadDB();
    const a = db.landlordAccounts.find(x=>x.id===acc.id);
    if(!a) return;
    const uploads = a.uploads || [];
    list.innerHTML = uploads.length
      ? uploads.map(u => `• ${esc(u.name)} <span style="color:rgba(35,24,16,.5);">(${esc(fmtDate(u.createdAt))})</span>`).join("<br/>")
      : "—";
  }
  refreshUploads();

  $("#verFiles").addEventListener("change", () => {
    const files = Array.from($("#verFiles").files || []);
    if(!files.length) return;

    const db = loadDB();
    const a = db.landlordAccounts.find(x=>x.id===acc.id);
    if(!a) return;

    a.uploads ||= [];
    for(const f of files){
      a.uploads.push({ name: f.name, createdAt: new Date().toISOString() });
    }
    a.verificationStatus = "not_submitted";
    saveDB(db);
    toast("Added filenames (demo).");
    refreshUploads();
  });

  $("#markPending").onclick = () => {
    const db = loadDB();
    const a = db.landlordAccounts.find(x=>x.id===acc.id);
    if(!a) return;
    if(!(a.uploads||[]).length) return toast("Add at least one document first.");
    a.verificationStatus = "pending";
    saveDB(db);
    toast("Submitted for review (demo).");
    render();
  };

  $("#markVerified").onclick = () => {
    const db = loadDB();
    const a = db.landlordAccounts.find(x=>x.id===acc.id);
    if(!a) return;
    a.verificationStatus = "verified";
    saveDB(db);
    toast("Marked verified (demo).");
    render();
  };
}

/* -------------------- Not Found -------------------- */

function renderNotFound(){
  $("#app").innerHTML = notFoundCard("Page not found.", "Go home", "#/");
}

function notFoundCard(msg, cta, href){
  return `
    <section class="section">
      <div class="card">
        <div class="pad">
          <div style="font-weight:1000;">${esc(msg)}</div>
          <div style="margin-top:12px;"><a class="btn btn--primary" href="${esc(href)}">${esc(cta)}</a></div>
        </div>
      </div>
    </section>
  `;
}
