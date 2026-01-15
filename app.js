/*******************************************************
 CASA — Front-end only demo (GitHub Pages friendly)
 - No reviewer accounts (reviews + landlords editable without login)
 - Review edit via secure edit link token
 - Landlord Portal: landlord accounts only + verification workflow
 - Verified landlords can claim + respond to reviews
 - Ratings: STARS (★★★★★) ONLY
 - Safety: reporting + auto-hide when flagged
*******************************************************/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const LS_KEY = "casa_db_v4";
const AUTO_VERIFY = new URLSearchParams(location.search).get("autoVerify") === "1";

// moderation thresholds
const REPORT_HIDE_THRESHOLD = 3;
const DOXXING_KEYWORDS = [
  "ssn", "social security", "passport", "driver's license", "drivers license",
  "phone number", "email", "@gmail.com", "@yahoo.com",
  "venmo", "cashapp", "zelle",
  "my number is", "call me at", "text me at",
];

let db = loadDB();

/* ------------------------------------------------------
   ROUTES (NEW IA)
------------------------------------------------------ */
const routes = {
  "/": renderHome,

  // Search + core flows
  "/search": renderSearch,
  "/landlord": renderLandlordProfile,          // expects /landlord/:id
  "/add-landlord": renderAddLandlord,
  "/edit-landlord": renderEditLandlord,        // expects /edit-landlord/:id
  "/write-review": renderWriteReview,          // expects /write-review/:landlordId
  "/edit-review": renderEditReview,            // expects /edit-review/:token

  // Informational
  "/how-it-works": renderHowItWorks,
  "/trust-safety": renderTrustSafety,
  "/about": renderAbout,
  "/contact": renderContact,
  "/privacy": renderPrivacy,

  // Landlord Portal
  "/landlord-portal": renderLandlordPortalLanding,
  "/landlord-portal/login": renderLandlordPortalLogin,
  "/landlord-portal/signup": renderLandlordPortalSignup,
  "/landlord-portal/dashboard": renderLandlordPortalDashboard,
  "/landlord-portal/verify": renderLandlordPortalVerify,
};

initRouter();
initModal();
seedIfEmpty();
render();

/* ------------------------------------------------------
   UTIL
------------------------------------------------------ */
function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { version: 4, landlords: [], reviews: [], landlordAccounts: [], reports: [] };
    const parsed = JSON.parse(raw);
    parsed.version = 4;
    parsed.landlords ||= [];
    parsed.reviews ||= [];
    parsed.landlordAccounts ||= [];
    parsed.reports ||= [];
    return parsed;
  } catch {
    return { version: 4, landlords: [], reviews: [], landlordAccounts: [], reports: [] };
  }
}
function saveDB(next) {
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}
function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function token() {
  return (crypto?.randomUUID ? crypto.randomUUID().replaceAll("-", "") : uuid().replaceAll("-", "")) + Math.random().toString(16).slice(2);
}
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch { return ""; }
}
function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function fmtScore(x) {
  if (x === null || x === undefined) return "—";
  return (Math.round(x * 10) / 10).toFixed(1);
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (t.style.display = "none"), 2400);
}

/* ------------------------------------------------------
   MODAL
------------------------------------------------------ */
function initModal() {
  $("#modalCloseBtn").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}
function openModal(title, bodyHtml, footHtml) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modalFoot").innerHTML = footHtml || "";
  $("#modalBackdrop").classList.add("open");
  $("#modalBackdrop").setAttribute("aria-hidden", "false");
  setTimeout(() => {
    const first = $("#modalBody").querySelector("input,textarea,select,button");
    if (first) first.focus();
  }, 50);
}
function closeModal() {
  $("#modalBackdrop").classList.remove("open");
  $("#modalBackdrop").setAttribute("aria-hidden", "true");
}

/* ------------------------------------------------------
   ROUTER
------------------------------------------------------ */
function initRouter() {
  window.addEventListener("hashchange", render);
}
function parseHash() {
  const h = location.hash.replace(/^#/, "") || "/";
  const full = h.startsWith("/") ? h : `/${h}`;

  // path normalization for dynamic routes
  const path =
    full.startsWith("/landlord/") ? "/landlord" :
    full.startsWith("/edit-landlord/") ? "/edit-landlord" :
    full.startsWith("/write-review/") ? "/write-review" :
    full.startsWith("/edit-review/") ? "/edit-review" :
    full.split("?")[0];

  const qs = full.includes("?") ? full.split("?")[1] : "";
  const params = new URLSearchParams(qs);

  const landlordId = full.startsWith("/landlord/") ? full.split("/landlord/")[1].split("?")[0] : null;
  const editLandlordId = full.startsWith("/edit-landlord/") ? full.split("/edit-landlord/")[1].split("?")[0] : null;
  const reviewNewLandlordId = full.startsWith("/write-review/") ? full.split("/write-review/")[1].split("?")[0] : null;
  const editToken = full.startsWith("/edit-review/") ? full.split("/edit-review/")[1].split("?")[0] : null;

  return { path, params, landlordId, editLandlordId, reviewNewLandlordId, editToken };
}
function render() {
  db = loadDB();
  const { path } = parseHash();
  const fn = routes[path] || renderNotFound;
  fn();
}

/* ------------------------------------------------------
   NAVBAR (REAL NAVBAR IN HTML/CSS)
   - You said you already have index/styles, so:
   - This app.js assumes those links route by hash.
------------------------------------------------------ */

/* ------------------------------------------------------
   RATINGS — STARS ONLY
------------------------------------------------------ */
function starSVG(on = true) {
  const fill = on ? "var(--starOn, #2A1B12)" : "transparent";
  const stroke = on ? "var(--starOn, #2A1B12)" : "rgba(42,27,18,.25)";
  return `
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.9 5.8 20.8l1.6-6.8L2.2 9.4l6.9-.6L12 2.5z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.6" />
    </svg>
  `;
}
function starRow(score) {
  if (score === null || score === undefined) return `<span class="tiny muted">No reviews</span>`;
  const filled = Math.round(score);
  let out = "";
  for (let i = 1; i <= 5; i++) out += starSVG(i <= filled);
  return out;
}

/* ------------------------------------------------------
   SEARCH HELPERS
------------------------------------------------------ */
function landlordHay(l) {
  return [
    l.name, l.entityName, l.address, l.neighborhood, l.city,
    ...(l.buildings || [])
  ].filter(Boolean).join(" ").toLowerCase();
}
function addressHay(l) {
  return [l.address, l.neighborhood, l.city, ...(l.buildings || [])]
    .filter(Boolean).join(" ").toLowerCase();
}

/* ------------------------------------------------------
   STATS
------------------------------------------------------ */
const RATING_KEYS = [
  ["responsiveness", "Responsiveness"],
  ["repairs", "Repairs & Maintenance"],
  ["deposits", "Deposit Fairness"],
  ["conditions", "Building Conditions"],
  ["respect", "Respect / Professionalism"],
];

function landlordStats(landlordId) {
  const rs = db.reviews.filter(r => r.landlordId === landlordId && !r.hidden);
  const stats = { count: rs.length };

  const keys = ["overall", ...RATING_KEYS.map(([k]) => k)];
  for (const k of keys) {
    stats[k] = avg(rs.map(r => Number(r.ratings?.[k] ?? null)).filter(v => Number.isFinite(v)));
  }
  return stats;
}

function tagsFromStats(stats) {
  const tags = [];
  if (!stats.count) return ["No reviews yet"];
  if ((stats.repairs ?? 0) >= 4.2) tags.push("Fast repairs");
  if ((stats.responsiveness ?? 0) >= 4.2) tags.push("Responsive");
  if ((stats.deposits ?? 99) <= 2.5) tags.push("Deposit issues");
  if ((stats.conditions ?? 99) <= 2.8) tags.push("Condition issues");
  if (!tags.length) tags.push("Mixed experiences");
  return tags.slice(0, 3);
}

/* ------------------------------------------------------
   SAFETY: REPORTING + AUTO-HIDE
------------------------------------------------------ */
function containsDoxxing(text) {
  const t = String(text || "").toLowerCase();
  return DOXXING_KEYWORDS.some(k => t.includes(k));
}
function reviewReportCount(reviewId) {
  return db.reports.filter(r => r.reviewId === reviewId).length;
}
function ensureAutoHide(review) {
  const count = reviewReportCount(review.id);
  if (count >= REPORT_HIDE_THRESHOLD || containsDoxxing(review.text) || containsDoxxing(review.timeline)) {
    review.hidden = true;
  }
}

/* ------------------------------------------------------
   SEED
------------------------------------------------------ */
function seedIfEmpty() {
  if (db.landlords.length || db.reviews.length) return;

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
    ratings: {
      overall: 4,
      responsiveness: 4,
      repairs: 5,
      deposits: 4,
      conditions: 3,
      respect: 4,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    editToken: token(),
    response: null,
    hidden: false
  };

  const next = {
    ...db,
    landlords: [l1, l2],
    reviews: [r1],
    reports: [],
  };
  saveDB(next);
  db = next;
}

/* ------------------------------------------------------
   HOME (SEARCH-FIRST)
------------------------------------------------------ */
function renderHome() {
  const app = $("#app");

  // Featured reviews (3 newest visible)
  const featured = db.reviews
    .filter(r => !r.hidden)
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt))
    .slice(0, 3)
    .map(r => ({ r, l: db.landlords.find(x => x.id === r.landlordId) }))
    .filter(x => x.l);

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="pad">
          <div class="kicker">Casa</div>

          <h1>Know your landlord<br/>before you sign.</h1>
          <p class="lead">
            Search landlords, read tenant reviews, and add your building in minutes.
          </p>

          <div class="heroSearch">
            <div class="heroSearch__bar">
              <span class="tiny">⌕</span>
              <input id="homeSearchInput" autocomplete="off"
                placeholder="Search landlord name, management company, or address…" />
              <button class="btn btn--primary" id="homeSearchBtn">Search</button>
            </div>
            <button class="btn btn--ghost" id="homeAddBtn">Add a landlord</button>
          </div>

          <div class="tiny" style="margin-top:10px;">
            No account required to review. Verified landlords can respond.
          </div>

          <!-- Instruction cards (expandable) -->
          <div class="stepsGrid" style="margin-top:18px;" aria-label="How to use Casa">
            ${expandCardHTML({
              id: "card_lookup",
              icon: "🔎",
              title: "Look Up",
              sub: `Examples: “ABC Management”, “123 Main St”, “John Doe”`,
              body: `
                <div class="tiny">Try it now:</div>
                <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                  <input class="miniInput" id="tryLookup" placeholder="Type a landlord or address…" />
                  <button class="btn btn--primary" id="tryLookupBtn">Search</button>
                </div>
              `
            })}
            ${expandCardHTML({
              id: "card_review",
              icon: "✍️",
              title: "Review",
              sub: `Write what happened — no sign-up needed.`,
              badge: "No sign-up needed",
              body: `
                <ol class="tiny" style="margin-top:8px; line-height:1.55;">
                  <li>Pick a landlord / building</li>
                  <li>Rate categories (stars)</li>
                  <li>Write what happened + timeline</li>
                  <li>Submit — save edit link</li>
                </ol>
              `
            })}
            ${expandCardHTML({
              id: "card_improve",
              icon: "🛡️",
              title: "Improve",
              sub: `Accountability + verified responses.`,
              body: `
                <div class="tiny" style="line-height:1.55;">
                  • Verified landlords can respond publicly<br/>
                  • Report abusive / fake reviews<br/>
                  • Edits welcome: add missing buildings + correct entities
                </div>
              `
            })}
          </div>

          <!-- Trust Row -->
          <div class="trustRow" style="margin-top:14px;">
            ${trustPill("🔓", "No login required for reviews")}
            ${trustPill("✅", "Verified Landlord Responses")}
            ${trustPill("🚨", "Moderation + Reporting Tools")}
          </div>

          <!-- Featured Reviews -->
          <div style="margin-top:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
              <div style="font-weight:1000;">Featured Reviews</div>
              <a class="btn btn--ghost" href="#/search">Browse all</a>
            </div>

            <div class="featuredGrid" style="margin-top:10px;">
              ${
                featured.length
                  ? featured.map(({r,l}) => featuredReviewCard(r, l)).join("")
                  : `<div class="box"><div class="tiny">No reviews yet — be the first.</div></div>`
              }
            </div>
          </div>

        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  // Wire actions
  $("#homeSearchBtn").onclick = () => {
    const q = ($("#homeSearchInput").value || "").trim();
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  };
  $("#homeSearchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#homeSearchBtn").click();
  });
  $("#homeAddBtn").onclick = () => (location.hash = "#/add-landlord");

  // Expandable cards
  $$(".expandCard").forEach(card => {
    card.addEventListener("click", (e) => {
      // avoid toggling when clicking buttons/inputs inside
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("a")) return;
      card.classList.toggle("open");
    });
  });

  // Try lookup inside card
  const tryBtn = $("#tryLookupBtn");
  if (tryBtn) {
    tryBtn.onclick = () => {
      const q = ($("#tryLookup").value || "").trim();
      location.hash = `#/search?q=${encodeURIComponent(q)}`;
    };
  }

  // featured landlord links
  $$(".viewLandlordLink").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("data-landlord");
      location.hash = `#/landlord/${id}`;
    });
  });
}

function expandCardHTML({ id, icon, title, sub, body, badge }) {
  return `
    <div class="expandCard tint1" id="${esc(id)}" tabindex="0" role="button" aria-label="${esc(title)} card">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        <div>
          <div class="tiny" style="font-weight:1000; color:rgba(35,24,16,.85);">${esc(icon)} ${esc(title)}</div>
          <div class="rowSub" style="margin-top:6px;">${esc(sub)}</div>
        </div>
        ${badge ? `<span class="badge badge--verified">${esc(badge)}</span>` : `<span class="tiny">＋</span>`}
      </div>
      <div class="expandBody" style="margin-top:10px; display:none;">
        ${body}
      </div>
    </div>
  `;
}

function trustPill(icon, text) {
  return `
    <div class="trustPill">
      <span>${esc(icon)}</span>
      <span class="tiny" style="color:rgba(35,24,16,.72);">${esc(text)}</span>
    </div>
  `;
}

function featuredReviewCard(r, l) {
  const created = fmtDate(r.createdAt);
  const overall = r.ratings?.overall ?? null;
  const excerpt = (r.text || "").slice(0, 140) + ((r.text || "").length > 140 ? "…" : "");
  return `
    <div class="rowCard" style="cursor:default;">
      <div style="flex:1; min-width:0;">
        <div class="rowTitle">${esc(l.name)}</div>
        <div class="rowSub">${esc([l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—")}</div>
        <div class="starRow" style="margin-top:10px; display:flex; align-items:center; gap:10px;">
          <div class="stars">${starRow(overall)}</div>
          <div class="scoreText">${overall ? `${overall}/5` : "—"}</div>
          <span class="tiny" style="margin-left:auto;">${esc(created)}</span>
        </div>
        <div class="tiny" style="margin-top:10px; color:rgba(35,24,16,.82); font-weight:850;">
          ${esc(excerpt)}
        </div>
        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
          <a href="#/landlord/${esc(l.id)}" class="btn btn--ghost viewLandlordLink" data-landlord="${esc(l.id)}">View Landlord</a>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="footer" style="margin-top:22px;">
      <div class="card" style="box-shadow:none;">
        <div class="bd" style="display:flex; gap:10px; justify-content:space-between; flex-wrap:wrap;">
          <div class="tiny" style="font-weight:900;">© Casa</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="tiny" href="#/about">About</a>
            <a class="tiny" href="#/trust-safety">Trust & Safety</a>
            <a class="tiny" href="#/contact">Contact</a>
            <a class="tiny" href="#/privacy">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

/* ------------------------------------------------------
   SEARCH PAGE (CONVERSION ENGINE)
------------------------------------------------------ */
function renderSearch() {
  const { params } = parseHash();
  const q = (params.get("q") || "").trim().toLowerCase();

  const type = params.get("type") || "all"; // all | landlord | building
  const minRating = Number(params.get("minRating") || 0);
  const verifiedOnly = params.get("verified") === "1";

  const app = $("#app");

  // Build results
  const results = db.landlords
    .map(l => ({ l, stats: landlordStats(l.id) }))
    .filter(({ l, stats }) => {
      if (verifiedOnly && !isLandlordVerifiedClaimed(l)) return false;
      if (minRating && (stats.overall ?? 0) < minRating) return false;

      if (!q) return true;
      const hay = (type === "building")
        ? addressHay(l)
        : landlordHay(l);

      if (type === "all") return landlordHay(l).includes(q) || addressHay(l).includes(q);
      return hay.includes(q);
    })
    .sort((a, b) => {
      const ao = a.stats.overall ?? -1;
      const bo = b.stats.overall ?? -1;
      if (bo !== ao) return bo - ao;
      return (b.stats.count || 0) - (a.stats.count || 0);
    });

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd" style="align-items:center;">
          <div style="min-width:0;">
            <div class="kicker">Search</div>
            <div style="font-weight:1000;">Search results</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/">← Home</a>
            <a class="btn btn--primary" href="#/add-landlord">Add landlord</a>
          </div>
        </div>

        <div class="bd">

          <!-- Always-visible search bar -->
          <div class="searchTop">
            <div class="searchTop__bar">
              <span class="tiny">⌕</span>
              <input id="searchInput" value="${esc(params.get("q") || "")}"
                placeholder="Search landlord name, management company, or address…" />
              <button class="btn btn--primary" id="searchBtn">Search</button>
            </div>
          </div>

          <!-- Filters -->
          <div class="filtersRow">
            <div class="field">
              <label>Type</label>
              <select id="filterType">
                <option value="all" ${type === "all" ? "selected" : ""}>Landlord or building</option>
                <option value="landlord" ${type === "landlord" ? "selected" : ""}>Landlord</option>
                <option value="building" ${type === "building" ? "selected" : ""}>Building / address</option>
              </select>
            </div>

            <div class="field">
              <label>Minimum rating</label>
              <select id="filterMin">
                ${[0, 3, 3.5, 4, 4.5].map(v => `<option value="${v}" ${v === minRating ? "selected" : ""}>${v === 0 ? "Any" : `${v}+`}</option>`).join("")}
              </select>
            </div>

            <div class="field">
              <label>Verified response</label>
              <select id="filterVerified">
                <option value="0" ${verifiedOnly ? "" : "selected"}>Any</option>
                <option value="1" ${verifiedOnly ? "selected" : ""}>Has verified landlord</option>
              </select>
            </div>
          </div>

          ${results.length ? "" : `
            <div class="box" style="margin-top:14px;">
              <div style="font-weight:1000;">No matches found — want to add this landlord/building?</div>
              <div style="margin-top:10px;">
                <a class="btn btn--primary" href="#/add-landlord">Add Landlord</a>
              </div>
            </div>
          `}

          <div style="margin-top:10px;">
            ${results.map(({l,stats}) => landlordResultCard(l, stats)).join("")}
          </div>

        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#searchBtn").onclick = () => doSearchRefresh();
  $("#searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#searchBtn").click();
  });

  // filter change
  ["filterType", "filterMin", "filterVerified"].forEach(id => {
    $("#" + id).addEventListener("change", doSearchRefresh);
  });

  function doSearchRefresh() {
    const nq = ($("#searchInput").value || "").trim();
    const nt = $("#filterType").value;
    const nm = $("#filterMin").value;
    const nv = $("#filterVerified").value;

    const p = new URLSearchParams();
    p.set("q", nq);
    p.set("type", nt);
    p.set("minRating", nm);
    p.set("verified", nv);
    location.hash = `#/search?${p.toString()}`;
  }

  $$(".rowCard[data-landlord]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-landlord");
      location.hash = `#/landlord/${id}`;
    });
  });
}

function landlordResultCard(l, stats) {
  const locationLine = [l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—";
  const tags = tagsFromStats(stats);
  return `
    <div class="rowCard" data-landlord="${esc(l.id)}" role="button" aria-label="Open landlord ${esc(l.name)}">
      <div style="flex:1; min-width:0;">
        <div class="rowTitle">${esc(l.name)}</div>
        <div class="starRow" style="display:flex; gap:10px; align-items:center;">
          <div class="stars">${starRow(stats.overall)}</div>
          <div class="scoreText">${stats.overall ? `${fmtScore(stats.overall)} ★` : "—"}</div>
          <span class="tiny" style="margin-left:auto;">${stats.count} review${stats.count===1?"":"s"}</span>
          ${isLandlordVerifiedClaimedBadge(l)}
        </div>
        <div class="rowSub">${esc(locationLine)}</div>
        <div class="tagRow">
          ${tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------
   LANDLORD PROFILE (COMPLETE)
------------------------------------------------------ */
function renderLandlordProfile() {
  const { landlordId } = parseHash();
  const id = landlordId;
  const l = db.landlords.find(x => x.id === id);
  const app = $("#app");

  if (!l) {
    app.innerHTML = `<section class="section"><div class="card"><div class="pad">Landlord not found.</div></div></section>`;
    return;
  }

  const stats = landlordStats(l.id);
  const sort = (new URLSearchParams(location.hash.split("?")[1] || "")).get("sort") || "recent";

  let reviews = db.reviews
    .filter(r => r.landlordId === l.id && !r.hidden)
    .slice();

  if (sort === "high") reviews.sort((a,b)=> (b.ratings?.overall ?? 0) - (a.ratings?.overall ?? 0));
  else if (sort === "low") reviews.sort((a,b)=> (a.ratings?.overall ?? 0) - (b.ratings?.overall ?? 0));
  else reviews.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt));

  const claimedAcc = l.claimedByLandlordId ? db.landlordAccounts.find(a => a.id === l.claimedByLandlordId) : null;
  const verifiedClaimed = Boolean(claimedAcc && claimedAcc.verificationStatus === "verified");

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div style="min-width:0;">
            <h2 style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              ${esc(l.name)}
              ${verifiedClaimed ? `<span class="badge badge--verified">Verified Landlord</span>` : ``}
            </h2>
            <div class="muted">${esc([l.address, l.neighborhood, l.city].filter(Boolean).join(" • ") || "—")}</div>

            <div style="display:flex; align-items:center; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <div class="stars">${starRow(stats.overall)}</div>
              <div class="scoreText">${stats.overall ? `${fmtScore(stats.overall)} ★` : "—"}</div>
              <div class="tiny">${stats.count} review${stats.count===1?"":"s"}</div>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--primary" href="#/write-review/${esc(l.id)}">Write a Review</a>
              <a class="btn btn--ghost" href="#/edit-landlord/${esc(l.id)}">Suggest an Edit</a>
              <a class="tiny" href="#/landlord-portal">Landlord? Claim this profile</a>
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/search">← Back to search</a>
          </div>
        </div>

        <div class="bd">
          <div class="grid">
            <div>

              <!-- Rating Breakdown -->
              <div class="card" style="box-shadow:none;">
                <div class="hd" style="padding:14px 14px 8px;">
                  <div>
                    <div class="kicker">Rating breakdown</div>
                    <div class="tiny">Averages from visible reviews</div>
                  </div>
                </div>
                <div class="bd" style="padding: 0 14px 14px;">
                  <div class="breakGrid">
                    ${RATING_KEYS.map(([k,label]) => `
                      <div class="box" style="border-style:solid;">
                        <div class="tiny" style="font-weight:1000; color:rgba(35,24,16,.85);">${esc(label)}</div>
                        <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
                          <div class="stars">${starRow(stats[k])}</div>
                          <div class="scoreText">${stats[k] ? `${fmtScore(stats[k])} ★` : "—"}</div>
                        </div>
                      </div>
                    `).join("")}
                  </div>

                  ${
                    verifiedClaimed
                      ? `<div class="box" style="margin-top:12px;">
                          <div style="font-weight:1000;">This profile is claimed</div>
                          <div class="tiny">Responses are from a Verified Landlord.</div>
                        </div>`
                      : `<div class="box" style="margin-top:12px;">
                          <div style="font-weight:1000;">Landlord responses require verification</div>
                          <div class="tiny">Landlords must verify in the Landlord Portal before responding.</div>
                          <div style="margin-top:10px;">
                            <a class="btn btn--primary" href="#/landlord-portal">Landlord Portal</a>
                          </div>
                        </div>`
                  }
                </div>
              </div>

              <!-- Reviews header + sort -->
              <div style="margin-top:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                  <div style="font-weight:1000;">Reviews</div>

                  <div class="field" style="min-width:220px;">
                    <label>Sort</label>
                    <select id="reviewSort">
                      <option value="recent" ${sort==="recent"?"selected":""}>Most recent</option>
                      <option value="high" ${sort==="high"?"selected":""}>Highest rating</option>
                      <option value="low" ${sort==="low"?"selected":""}>Lowest rating</option>
                    </select>
                  </div>
                </div>

                <div id="reviewsList" style="margin-top:10px;">
                  ${reviews.length ? reviews.map(r => reviewCard(r, l)).join("") : `
                    <div class="box">
                      <div class="tiny">No reviews yet — be the first.</div>
                      <div style="margin-top:10px;">
                        <a class="btn btn--primary" href="#/write-review/${esc(l.id)}">Write a Review</a>
                      </div>
                    </div>
                  `}
                </div>
              </div>
            </div>

            <aside class="card side">
              <div style="font-weight:1000;">Landlord info</div>
              <div class="box" style="margin-top:10px;">
                <div class="tiny"><b>Entity:</b> ${esc(l.entityName || "—")}</div>
                <div class="tiny" style="margin-top:6px;"><b>Properties:</b><br/>${
                  (l.buildings||[]).length
                    ? (l.buildings||[]).map(b=>`• ${esc(b)}`).join("<br/>")
                    : "—"
                }</div>
              </div>

              <div style="margin-top:12px;">
                <a class="btn btn--block btn--primary" href="#/write-review/${esc(l.id)}">Write a Review</a>
              </div>
              <div style="margin-top:10px;">
                <a class="btn btn--block btn--ghost" href="#/edit-landlord/${esc(l.id)}">Suggest an Edit</a>
              </div>

              <div class="box" style="margin-top:12px;">
                <div style="font-weight:1000;">Trust & Safety</div>
                <div class="tiny" style="margin-top:6px;">
                  Keep reviews factual. No personal info. Reporting tools are available.
                </div>
                <div style="margin-top:10px;">
                  <a class="btn btn--ghost btn--block" href="#/trust-safety">Trust & Safety</a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  // sort wiring
  $("#reviewSort").onchange = () => {
    const s = $("#reviewSort").value;
    location.hash = `#/landlord/${l.id}?sort=${encodeURIComponent(s)}`;
  };

  // landlord respond wiring (verified + claimed by current landlord session)
  const currentAccId = localStorage.getItem("casa_current_landlord_account_id");
  const currentAcc = currentAccId ? db.landlordAccounts.find(a => a.id === currentAccId) : null;
  const canRespond = Boolean(currentAcc && currentAcc.verificationStatus === "verified" && l.claimedByLandlordId === currentAcc.id);

  if (canRespond) {
    $$(".respondBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const reviewId = btn.getAttribute("data-review");
        openRespondModal({ reviewId, landlordId: l.id, landlordAccountId: currentAcc.id });
      });
    });
  }

  // report buttons
  $$(".reportBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const rid = btn.getAttribute("data-review");
      openReportModal({ reviewId: rid });
    });
  });
}

function isLandlordVerifiedClaimed(l) {
  if (!l.claimedByLandlordId) return false;
  const acc = db.landlordAccounts.find(a => a.id === l.claimedByLandlordId);
  return Boolean(acc && acc.verificationStatus === "verified");
}
function isLandlordVerifiedClaimedBadge(l) {
  if (!isLandlordVerifiedClaimed(l)) return "";
  return `<span class="badge badge--verified" style="margin-left:auto;">Verified Landlord</span>`;
}

function reviewCard(r, landlord) {
  const created = fmtDate(r.createdAt);
  const overall = r.ratings?.overall ?? null;
  const hasResponse = Boolean(r.response && r.response.text);

  const currentAccId = localStorage.getItem("casa_current_landlord_account_id");
  const currentAcc = currentAccId ? db.landlordAccounts.find(a => a.id === currentAccId) : null;
  const canRespond = Boolean(currentAcc && currentAcc.verificationStatus === "verified" && landlord.claimedByLandlordId === currentAcc.id);

  return `
    <div class="rowCard" style="cursor:default;">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div class="rowTitle">${esc(r.title || "Review")}</div>
          <span class="tiny">${esc(created)}</span>
        </div>

        <div class="starRow" style="margin-top:6px; display:flex; align-items:center; gap:10px;">
          <div class="stars">${starRow(overall)}</div>
          <div class="scoreText">${overall ? `${overall}/5` : "—"}</div>
          <div style="margin-left:auto; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn--ghost reportBtn" data-review="${esc(r.id)}">Report</button>
          </div>
        </div>

        <div class="tiny" style="margin-top:10px; color:rgba(35,24,16,.82); font-weight:850; white-space:pre-wrap;">
          ${esc(r.text || "")}
        </div>

        ${r.timeline ? `<div class="box" style="margin-top:10px;"><div class="tiny"><b>Timeline:</b><br/>${esc(r.timeline)}</div></div>` : ""}

        ${
          hasResponse
            ? `<div class="box" style="margin-top:12px; border-style:solid;">
                <div class="badge badge--verified">Verified Landlord Response</div>
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

function openReportModal({ reviewId }) {
  openModal(
    "Report review",
    `
      <div class="tiny">Help keep Casa factual and safe. Reports may hide content pending review.</div>
      <div class="field" style="margin-top:12px;">
        <label>Reason</label>
        <select id="reportReason">
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="doxxing">Personal info / doxxing</option>
          <option value="fake">Fake review</option>
          <option value="irrelevant">Irrelevant</option>
        </select>
      </div>
      <div class="field" style="margin-top:10px;">
        <label>Notes (optional)</label>
        <textarea id="reportNotes" placeholder="Optional detail…"></textarea>
      </div>
    `,
    `
      <button class="btn btn--ghost" id="cancelReport">Cancel</button>
      <button class="btn btn--primary" id="submitReport">Submit report</button>
    `
  );
  $("#cancelReport").onclick = closeModal;
  $("#submitReport").onclick = () => {
    const reason = $("#reportReason").value;
    const notes = ($("#reportNotes").value || "").trim() || null;

    const next = loadDB();
    next.reports.push({
      id: uuid(),
      reviewId,
      reason,
      notes,
      createdAt: new Date().toISOString()
    });

    const review = next.reviews.find(x => x.id === reviewId);
    if (review) {
      // auto hide logic
      review.hidden ||= false;
      ensureAutoHide(review);
      saveDB(next);
      closeModal();
      toast(review.hidden ? "Reported. Review hidden pending moderation." : "Reported. Thank you.");
      render();
    } else {
      saveDB(next);
      closeModal();
      toast("Reported. Thank you.");
    }
  };
}

function openRespondModal({ reviewId, landlordId, landlordAccountId }) {
  openModal(
    "Post a response",
    `
      <div class="tiny">This will appear as “Verified Landlord Response”. Keep it calm and specific.</div>
      <div class="field" style="margin-top:10px;">
        <label>Response</label>
        <textarea id="respText" placeholder="Example: We’re sorry this happened. Here’s what we changed…"></textarea>
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
    if (text.length < 3) return toast("Write a little more.");

    const next = loadDB();
    const rev = next.reviews.find(x => x.id === reviewId);
    if (!rev) return toast("Review not found.");
    if (rev.response?.text) return toast("Response already exists.");

    const acc = next.landlordAccounts.find(a => a.id === landlordAccountId);
    const l = next.landlords.find(x => x.id === landlordId);
    if (!acc || !l) return toast("Not permitted.");
    if (acc.verificationStatus !== "verified") return toast("Not verified.");
    if (l.claimedByLandlordId !== acc.id) return toast("You must claim this profile.");

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

/* ------------------------------------------------------
   ADD / EDIT LANDLORD (NO LOGIN)
------------------------------------------------------ */
function renderAddLandlord() {
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
            <a class="btn btn--ghost" href="#/search">← Search</a>
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
            <label>Properties / buildings (optional, one per line)</label>
            <textarea id="lbuildings" placeholder="123 Main St, Williamsburg&#10;125 Main St, Williamsburg"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/search">Cancel</a>
            <button class="btn btn--primary" id="saveLandlord">Save landlord</button>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#saveLandlord").onclick = () => {
    const name = ($("#lname").value || "").trim();
    if (name.length < 2) return toast("Enter a name.");

    const entityName = ($("#lentity").value || "").trim() || null;
    const address = ($("#laddr").value || "").trim() || null;
    const neighborhood = ($("#lhood").value || "").trim() || null;
    const city = ($("#lcity").value || "").trim() || null;
    const buildings = ($("#lbuildings").value || "").split("\n").map(s => s.trim()).filter(Boolean);

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

function renderEditLandlord() {
  const { editLandlordId } = parseHash();
  const next = loadDB();
  const l = next.landlords.find(x => x.id === editLandlordId);
  const app = $("#app");

  if (!l) {
    app.innerHTML = `<section class="section"><div class="card"><div class="pad">Landlord not found.</div></div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Suggest an edit</div>
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
            <label>Properties (one per line)</label>
            <textarea id="ebuildings">${esc((l.buildings || []).join("\n"))}</textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Cancel</a>
            <button class="btn btn--primary" id="saveEdit">Save changes</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div class="tiny"><b>Note:</b> In a real app, edits should show an audit trail + moderation. This demo writes directly.</div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#saveEdit").onclick = () => {
    const name = ($("#ename").value || "").trim();
    if (name.length < 2) return toast("Name too short.");

    l.name = name;
    l.entityName = ($("#eentity").value || "").trim() || null;
    l.address = ($("#eaddr").value || "").trim() || null;
    l.neighborhood = ($("#ehood").value || "").trim() || null;
    l.city = ($("#ecity").value || "").trim() || null;
    l.buildings = ($("#ebuildings").value || "").split("\n").map(s => s.trim()).filter(Boolean);
    l.updatedAt = new Date().toISOString();

    saveDB(next);
    toast("Saved.");
    location.hash = `#/landlord/${l.id}`;
  };
}

/* ------------------------------------------------------
   WRITE REVIEW (NO LOGIN) + TOKEN EDIT LINK
------------------------------------------------------ */
function renderWriteReview() {
  const { reviewNewLandlordId } = parseHash();
  const landlordId = reviewNewLandlordId;
  const l = db.landlords.find(x => x.id === landlordId);
  const app = $("#app");

  if (!l) {
    app.innerHTML = `<section class="section"><div class="card"><div class="pad">Choose a landlord first.</div></div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Write a review</div>
            <div style="font-weight:1000;">${esc(l.name)}</div>
            <div class="tiny">No account needed. You’ll get a private edit link after posting.</div>
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

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Ratings</div>
            <div class="tiny" style="margin-top:6px;">Use stars. Leave categories if unsure.</div>
          </div>

          <div class="field" style="margin-top:12px;">
            <label>Overall rating</label>
            <div class="ratingPick" id="overallPick"></div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
            ${RATING_KEYS.map(([k,label]) => `
              <div class="field">
                <label>${esc(label)}</label>
                <select id="rk_${esc(k)}">
                  ${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===4?"selected":""}>${v}</option>`).join("")}
                </select>
              </div>
            `).join("")}
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Cancel</a>
            <button class="btn btn--primary" id="postReview">Post review</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div class="tiny"><b>Reminder:</b> No personal info. Dates & specifics only.</div>
          </div>

        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  let overall = 5;
  renderOverallPicker();

  function renderOverallPicker() {
    const wrap = $("#overallPick");
    wrap.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "starBtn" + (i === overall ? " selected" : "");
      btn.innerHTML = `${starSVG(true)} <span class="ratingValue">${i}/5</span>`;
      btn.addEventListener("click", () => { overall = i; renderOverallPicker(); });
      wrap.appendChild(btn);
    }
  }

  $("#postReview").onclick = () => {
    const text = ($("#rtText").value || "").trim();
    if (text.length < 10) return toast("Write a bit more detail (10+ chars).");

    const title = ($("#rtTitle").value || "").trim() || null;
    const timeline = ($("#rtTimeline").value || "").trim() || null;

    // doxxing prevention
    if (containsDoxxing(text) || containsDoxxing(timeline)) {
      openModal(
        "Review blocked",
        `<div class="box"><div style="font-weight:1000;">Personal info detected</div><div class="tiny" style="margin-top:6px;">Please remove contact info or identifying personal details.</div></div>`,
        `<button class="btn btn--primary" id="okBlocked">OK</button>`
      );
      $("#okBlocked").onclick = closeModal;
      return;
    }

    const ratings = {
      overall,
      responsiveness: Number($("#rk_responsiveness").value),
      repairs: Number($("#rk_repairs").value),
      deposits: Number($("#rk_deposits").value),
      conditions: Number($("#rk_conditions").value),
      respect: Number($("#rk_respect").value),
    };

    const editToken = token();
    const reviewId = uuid();

    const next = loadDB();
    const newReview = {
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
      hidden: false
    };

    next.reviews.push(newReview);
    saveDB(next);

    // REQUIRED modal format
    const editLink = `${location.origin}${location.pathname}#/edit-review/${editToken}`;

    openModal(
      "Edit Link Created 🔒",
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
      try { await navigator.clipboard.writeText(editLink); toast("Copied."); }
      catch { toast("Copy failed — select and copy manually."); }
    };
    $("#doneLink").onclick = () => {
      closeModal();
      toast("Review posted.");
      location.hash = `#/landlord/${landlordId}`;
    };
  };
}

/* Edit review via token */
function renderEditReview() {
  const { editToken } = parseHash();
  const next = loadDB();
  const r = next.reviews.find(x => x.editToken === editToken);
  const app = $("#app");

  if (!r) {
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
            <div class="tiny">No account required. Anyone with this link can edit.</div>
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

      ${renderFooter()}
    </section>
  `;

  $("#saveReviewEdit").onclick = () => {
    const text = ($("#etText").value || "").trim();
    if (text.length < 10) return toast("Write a bit more detail (10+ chars).");

    const timeline = ($("#etTimeline").value || "").trim() || null;
    if (containsDoxxing(text) || containsDoxxing(timeline)) {
      toast("Remove personal info before saving.");
      return;
    }

    r.title = ($("#etTitle").value || "").trim() || null;
    r.text = text;
    r.timeline = timeline;
    r.updatedAt = new Date().toISOString();

    saveDB(next);
    toast("Saved.");
    location.hash = `#/landlord/${r.landlordId}`;
  };
}

/* ------------------------------------------------------
   LANDLORD PORTAL — ROUTES
   Accounts exist ONLY for landlords.
------------------------------------------------------ */
function renderLandlordPortalLanding() {
  const app = $("#app");
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Manage claims, verification, and responses</div>
            <div class="tiny">Tenants never need accounts. Landlords must verify to respond publicly.</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Get started</div>
            <div class="tiny" style="margin-top:6px;">
              Create an account, upload verification documents, then claim your profile to respond.
            </div>
            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--primary" href="#/landlord-portal/signup">Create account</a>
              <a class="btn btn--ghost" href="#/landlord-portal/login">Log in</a>
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Verification required</div>
            <div class="tiny" style="margin-top:6px;">
              Upload proof (deed / tax bill / management agreement / utility / business registration).
              Status: Not submitted → Pending → Verified (or Rejected).
            </div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;
}

function getCurrentLandlordAccount(snapshot) {
  const currentId = localStorage.getItem("casa_current_landlord_account_id");
  if (!currentId) return null;
  return snapshot.landlordAccounts.find(a => a.id === currentId) || null;
}

function renderLandlordPortalLogin() {
  const app = $("#app");
  const next = loadDB();

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Log in</div>
            <div class="tiny">Demo login uses email only (front-end demo).</div>
          </div>
          <a class="btn btn--ghost" href="#/landlord-portal">← Back</a>
        </div>

        <div class="bd">
          <div class="field">
            <label>Email</label>
            <input id="lpEmail" placeholder="name@email.com" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
            <button class="btn btn--primary" id="lpLoginBtn">Log in</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div class="tiny">No account? <a href="#/landlord-portal/signup"><b>Create one</b></a></div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#lpLoginBtn").onclick = () => {
    const email = ($("#lpEmail").value || "").trim().toLowerCase();
    if (!email.includes("@")) return toast("Enter a valid email.");

    const acc = next.landlordAccounts.find(a => (a.email || "").toLowerCase() === email);
    if (!acc) return toast("No account found. Create one.");

    localStorage.setItem("casa_current_landlord_account_id", acc.id);
    toast("Logged in.");
    location.hash = "#/landlord-portal/dashboard";
  };
}

function renderLandlordPortalSignup() {
  const app = $("#app");
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Create account</div>
            <div class="tiny">Verification required to respond publicly.</div>
          </div>
          <a class="btn btn--ghost" href="#/landlord-portal">← Back</a>
        </div>

        <div class="bd">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
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
            <label>Entity name (LLC / management company)</label>
            <input id="lpEntity" placeholder="Example: Northside Properties LLC" />
          </div>

          <div class="field" style="margin-top:10px;">
            <label>Properties managed (one per line)</label>
            <textarea id="lpProps" placeholder="123 Main St, Brooklyn&#10;88 Water St, New York"></textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <button class="btn btn--primary" id="lpCreateBtn">Create account</button>
          </div>

          <div class="tiny" style="margin-top:10px;">
            Next: upload verification documents in the dashboard.
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#lpCreateBtn").onclick = () => {
    const fullName = ($("#lpName").value || "").trim();
    const email = ($("#lpEmail").value || "").trim();
    const phone = ($("#lpPhone").value || "").trim() || null;
    const relationship = ($("#lpRel").value || "").trim();
    const entityName = ($("#lpEntity").value || "").trim() || null;
    const props = ($("#lpProps").value || "").split("\n").map(s => s.trim()).filter(Boolean);

    if (fullName.length < 2) return toast("Enter full name.");
    if (!email.includes("@")) return toast("Enter a valid email.");
    if (!relationship) return toast("Pick a relationship.");
    if (!entityName && !props.length) return toast("Enter an entity or at least 1 property.");

    const next = loadDB();
    if (next.landlordAccounts.some(a => (a.email || "").toLowerCase() === email.toLowerCase())) {
      return toast("Account already exists. Log in instead.");
    }

    const account = {
      id: uuid(),
      fullName,
      email,
      phone,
      relationship,
      entityName,
      propertyAddresses: props,
      uploads: [],
      verificationStatus: "not_submitted", // Not Submitted / Pending / Verified / Rejected
      verificationReason: null,
      createdAt: new Date().toISOString(),
    };

    next.landlordAccounts.push(account);
    saveDB(next);
    localStorage.setItem("casa_current_landlord_account_id", account.id);

    toast("Account created.");
    location.hash = "#/landlord-portal/dashboard";
  };
}

function renderLandlordPortalDashboard() {
  const app = $("#app");
  const next = loadDB();
  const current = getCurrentLandlordAccount(next);

  if (!current) {
    location.hash = "#/landlord-portal/login";
    return;
  }

  const statusBadge = current.verificationStatus === "verified"
    ? `<span class="badge badge--verified">Verified Landlord</span>`
    : `<span class="badge">${esc(statusLabel(current.verificationStatus))}</span>`;

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Dashboard</div>
            <div class="tiny">${esc(current.email)} • ${esc(current.relationship)}</div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/">Home</a>
            <button class="btn btn--ghost" id="lpLogout">Log out</button>
          </div>
        </div>

        <div class="bd">

          <div class="box">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
              <div style="font-weight:1000;">${esc(current.fullName)} ${statusBadge}</div>
              <a class="btn btn--ghost" href="#/landlord-portal/verify">Verification</a>
            </div>

            <div class="tiny" style="margin-top:6px;">
              Entity: ${esc(current.entityName || "—")}
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Claim a profile</div>
            <div class="tiny" style="margin-top:6px;">
              Only verified landlords can claim profiles. Claiming lets you respond to reviews.
            </div>
            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn--primary" id="lpClaimBtn" ${current.verificationStatus !== "verified" ? "disabled" : ""}>Claim a landlord profile</button>
              ${
                current.verificationStatus !== "verified" && AUTO_VERIFY
                  ? `<button class="btn btn--ghost" id="lpAutoVerifyBtn">Demo: mark verified</button>`
                  : ``
              }
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Your claimed profiles</div>
            <div class="tiny" style="margin-top:6px;">
              ${(next.landlords.filter(l => l.claimedByLandlordId === current.id)).length
                ? next.landlords.filter(l => l.claimedByLandlordId === current.id).map(l => `• <a href="#/landlord/${esc(l.id)}"><b>${esc(l.name)}</b></a>`).join("<br/>")
                : "None yet."
              }
            </div>
          </div>

        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#lpLogout").onclick = () => {
    localStorage.removeItem("casa_current_landlord_account_id");
    toast("Logged out.");
    location.hash = "#/landlord-portal";
  };

  const autoVerifyBtn = $("#lpAutoVerifyBtn");
  if (autoVerifyBtn) {
    autoVerifyBtn.onclick = () => {
      const fresh = loadDB();
      const acc = fresh.landlordAccounts.find(a => a.id === current.id);
      if (!acc) return;
      acc.verificationStatus = "verified";
      acc.verificationReason = null;
      saveDB(fresh);
      toast("Marked verified (demo).");
      render();
    };
  }

  const claimBtn = $("#lpClaimBtn");
  if (claimBtn) {
    claimBtn.onclick = () => openClaimModal(current);
  }
}

function renderLandlordPortalVerify() {
  const app = $("#app");
  const next = loadDB();
  const current = getCurrentLandlordAccount(next);

  if (!current) {
    location.hash = "#/landlord-portal/login";
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Landlord Portal</div>
            <div style="font-weight:1000;">Verification</div>
            <div class="tiny">Upload proof to respond publicly.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--ghost" href="#/landlord-portal/dashboard">← Dashboard</a>
          </div>
        </div>

        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Status: ${esc(statusLabel(current.verificationStatus))}</div>
            ${current.verificationStatus === "rejected" ? `<div class="tiny" style="margin-top:6px;">Reason: ${esc(current.verificationReason || "—")}</div>` : ""}
            <div class="tiny" style="margin-top:6px;">
              Acceptable docs: deed, property tax, management agreement, utility bill, business registration.
            </div>
          </div>

          <div class="field" style="margin-top:12px;">
            <label>Upload documents (PDF/JPG/PNG)</label>
            <input id="lpUploads" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <button class="btn btn--primary" id="lpSubmitVerify">Submit verification</button>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Uploaded files</div>
            <div class="tiny" style="margin-top:6px;">
              ${(current.uploads||[]).length ? (current.uploads||[]).map(u=>`• ${esc(u.name)}`).join("<br/>") : "None yet."}
            </div>
          </div>

          <div class="tiny" style="margin-top:10px;">
            Demo tip: add <b>?autoVerify=1</b> to auto-verify during signup.
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;

  $("#lpSubmitVerify").onclick = () => {
    const uploads = $("#lpUploads").files ? Array.from($("#lpUploads").files) : [];
    if (uploads.length < 1) return toast("Upload at least 1 document.");

    const fresh = loadDB();
    const acc = fresh.landlordAccounts.find(a => a.id === current.id);
    if (!acc) return toast("Session expired.");

    acc.uploads = uploads.map(f => ({ name: f.name, type: f.type, size: f.size }));
    acc.verificationStatus = AUTO_VERIFY ? "verified" : "pending";
    acc.verificationReason = null;

    saveDB(fresh);
    toast(AUTO_VERIFY ? "Verified (AUTO_VERIFY)" : "Submitted — pending review.");
    location.hash = "#/landlord-portal/dashboard";
  };
}

function statusLabel(status) {
  if (status === "not_submitted") return "Not Submitted";
  if (status === "pending") return "Pending";
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  return status || "—";
}

function openClaimModal(current) {
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
    `<button class="btn btn--ghost" id="cancelClaim">Close</button>`
  );

  $("#cancelClaim").onclick = closeModal;

  const input = $("#claimSearch");
  const resultsBox = $("#claimResults");

  input.addEventListener("input", () => {
    const q = (input.value || "").trim().toLowerCase();
    if (!q) {
      resultsBox.innerHTML = `<div class="tiny">Type to see matches…</div>`;
      return;
    }

    const matches = loadDB().landlords
      .filter(l => landlordHay(l).includes(q))
      .slice(0, 8);

    if (!matches.length) {
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
        if (!acc) return toast("Session expired.");
        if (acc.verificationStatus !== "verified") return toast("Verification pending. Cannot claim yet.");

        const landlord = fresh.landlords.find(x => x.id === lid);
        if (!landlord) return toast("Not found.");

        landlord.claimedByLandlordId = acc.id;
        landlord.updatedAt = new Date().toISOString();
        saveDB(fresh);

        closeModal();
        toast("Profile claimed.");
        location.hash = `#/landlord/${lid}`;
      };
    });
  });
}

/* ------------------------------------------------------
   STATIC PAGES
------------------------------------------------------ */
function renderHowItWorks() {
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">How it works</div>
            <div class="tiny">Search → Review → Improve</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">1) Search</div>
            <div class="tiny" style="margin-top:6px;">Search landlord, management company, or address.</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">2) Review</div>
            <div class="tiny" style="margin-top:6px;">No account required. You receive a private edit link after posting.</div>
          </div>
          <div class="box" style="margin-top:10px;">
            <div style="font-weight:1000;">3) Improve</div>
            <div class="tiny" style="margin-top:6px;">Anyone can improve landlord profiles. Verified landlords can respond publicly.</div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;
}

function renderTrustSafety() {
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd">
          <div>
            <div class="kicker">Trust & Safety</div>
            <div class="tiny">Moderation, reporting, and verification</div>
          </div>
          <a class="btn btn--ghost" href="#/">← Home</a>
        </div>

        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">What you can post</div>
            <div class="tiny" style="margin-top:8px; line-height:1.55;">
              • Factual statements (dates, work orders, outcomes)<br/>
              • Your experience as a tenant<br/>
              • General building/management behavior
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">What you can’t post</div>
            <div class="tiny" style="margin-top:8px; line-height:1.55;">
              • Personal info (phone, email, SSN, etc.)<br/>
              • Threats, harassment, discriminatory content<br/>
              • Doxxing or targeted intimidation
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Reporting & moderation</div>
            <div class="tiny" style="margin-top:8px; line-height:1.55;">
              Reviews can be reported for spam/harassment/personal info/fake/irrelevant.<br/>
              If a review reaches <b>${REPORT_HIDE_THRESHOLD}</b> reports or matches doxxing keywords, it is hidden pending moderation.
            </div>
          </div>

          <div class="box" style="margin-top:12px;">
            <div style="font-weight:1000;">Landlord verification</div>
            <div class="tiny" style="margin-top:8px; line-height:1.55;">
              Landlords can create accounts in the Landlord Portal only.<br/>
              Verification requires proof docs. Verified landlords can claim profiles and respond publicly.
            </div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;
}

function renderAbout() {
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

      ${renderFooter()}
    </section>
  `;
}

function renderContact() {
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

      ${renderFooter()}
    </section>
  `;
}

function renderPrivacy() {
  $("#app").innerHTML = `
    <section class="section">
      <div class="card">
        <div class="hd"><div class="kicker">Privacy / Terms</div><a class="btn btn--ghost" href="#/">← Home</a></div>
        <div class="bd">
          <div class="box">
            <div style="font-weight:1000;">Privacy</div>
            <div class="tiny" style="margin-top:8px;">
              Demo version stores data locally in your browser. Add a hosted backend later for shared data.
            </div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    </section>
  `;
}

function renderNotFound() {
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
