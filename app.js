/* =========================================================
   casa — app.js (FULL FILE)
   - Hash-router SPA for GitHub Pages
   - Pages: Home, Search (filters + map), Add, How, Trust, Portal,
            Landlord profile, Write review (demo)
   - NO reviewer accounts
   - Landlord Portal is demo-only (email + password + OAuth buttons)
   ========================================================= */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setActiveNav() {
  const h = location.hash || "#/";
  document.querySelectorAll(".nav__link, .navDrawer__link").forEach((a) => {
    const href = a.getAttribute("href") || "";
    a.classList.toggle("isActive", href && h.startsWith(href));
  });
}

function toast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (t.style.display = "none"), 2200);
}

/* ---------- Stars (horizontal) ---------- */
function starSVG(on) {
  return `
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="${on ? "var(--starOn)" : "var(--starOff)"}"
        d="M12 17.3l-6.18 3.6 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.63 1.64 7.03z"/>
    </svg>
  `;
}

function starsRow(score) {
  const s = Math.max(0, Math.min(5, Number(score) || 0));
  let out = `<div class="starRow"><div class="starStars">`;
  for (let i = 1; i <= 5; i++) out += starSVG(i <= s);
  out += `</div><div class="scoreText">${s}/5</div></div>`;
  return out;
}

/* ---------- Bubble icons (no emojis) ---------- */
function bubble(tip) {
  return `<span class="bubbleIcon" data-tip="${esc(tip)}" aria-label="${esc(tip)}"></span>`;
}

/* =========================================================
   Demo dataset (in-memory)
   Each landlord needs: id, name, addr, borough, lat, lng, score, date, text
   ========================================================= */
const landlords = [
  {
    id: "northside",
    name: "Northside Properties",
    addr: "123 Main St • Williamsburg • Brooklyn, NY",
    borough: "Brooklyn",
    lat: 40.7081,
    lng: -73.9571,
    score: 4,
    date: "1/5/2026",
    text: "Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
  },
  {
    id: "parkave",
    name: "Park Ave Management",
    addr: "22 Park Ave • Manhattan • New York, NY",
    borough: "Manhattan",
    lat: 40.7402,
    lng: -73.9857,
    score: 3,
    date: "12/18/2025",
    text: "Great location, but communication was slow. Security deposit itemization took weeks.",
  },
  {
    id: "elmhurst",
    name: "Elmhurst Holdings",
    addr: "86-12 Broadway • Elmhurst • Queens, NY",
    borough: "Queens",
    lat: 40.7427,
    lng: -73.8822,
    score: 5,
    date: "11/30/2025",
    text: "Responsive management. Clear lease terms and quick repairs.",
  },
];

/* =========================================================
   HOME
   ========================================================= */
function renderHome() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="pad hero">
            <div>
              <div class="kicker">CASA</div>
              <h1>Know your landlord<br/>before you sign.</h1>
              <p class="lead">Search landlords, read tenant reviews, and add your building in minutes.</p>
            </div>

            <div class="heroSearch">
              <div class="heroSearch__bar">
                <input id="homeQ" placeholder="Search landlord name, management company, or address..." />
                <div class="suggest" id="homeSuggest"></div>
              </div>
              <button class="btn btn--primary" id="homeGo">Search</button>
              <a class="btn btn--outline" href="#/add">Add a landlord</a>
            </div>

            <div class="trustLine">No account required to review. Verified landlords can respond.</div>

            <div class="cards3" style="margin-top:14px;">
              <div class="xCard">
                <div class="xCard__top">
                  <div class="xCard__title"><span class="xCard__icon">1</span> Look Up</div>
                  <span class="badge">Tap</span>
                </div>
                <div class="xCard__body">
                  Search by name, entity, or address.
                  <div class="tiny" style="margin-top:8px;">Examples: “ABC Management”, “123 Main St”, “John Doe”</div>
                </div>
              </div>

              <div class="xCard">
                <div class="xCard__top">
                  <div class="xCard__title"><span class="xCard__icon">2</span> Review</div>
                  <span class="badge">No sign-up needed</span>
                </div>
                <div class="xCard__body">
                  Pick a landlord → rate categories → write what happened → submit.
                  <div class="tiny" style="margin-top:8px;">You’ll receive an edit link after posting.</div>
                </div>
              </div>

              <div class="xCard">
                <div class="xCard__top">
                  <div class="xCard__title"><span class="xCard__icon">3</span> Improve</div>
                  <span class="badge badge--verified">Verified responses</span>
                </div>
                <div class="xCard__body">
                  Verified landlords can respond publicly. Reporting tools keep listings accurate.
                </div>
              </div>
            </div>

            <div class="trustRow">
              <div class="miniTrust">
                <div class="miniTrust__t">${bubble("Tenants can post and edit without accounts.")} No login required for reviews</div>
                <div class="miniTrust__b">Post instantly — you’ll get an edit link.</div>
              </div>
              <div class="miniTrust">
                <div class="miniTrust__t">${bubble("Landlords must verify documents before responding.")} Verified Landlord Responses</div>
                <div class="miniTrust__b">Accountability + verified responses.</div>
              </div>
              <div class="miniTrust">
                <div class="miniTrust__t">${bubble("Report spam, harassment, or personal info.")} Moderation + Reporting Tools</div>
                <div class="miniTrust__b">Keep reviews useful and safe.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="hd">
              <div>
                <div class="kicker">Featured Reviews</div>
                <h2>Recent highlights</h2>
                <div class="muted">Browse ratings and landlord profiles.</div>
              </div>
              <a class="btn btn--outline" href="#/search">Browse all</a>
            </div>

            <div class="bd">
              <div class="featuredGrid" id="featuredGrid"></div>
            </div>
          </div>

          <aside class="card side">
            <div class="kicker">Quick Actions</div>
            <h2 style="margin-top:6px;">Start here</h2>
            <div class="box" style="margin-top:10px;">
              <div class="tiny" style="margin-bottom:10px;">Search a landlord or add a missing profile.</div>
              <a class="btn btn--primary btn--block" href="#/search">Find a landlord</a>
              <div style="height:10px;"></div>
              <a class="btn btn--outline btn--block" href="#/add">Add a landlord</a>
            </div>

            <div style="margin-top:14px;">
              <div class="kicker">Landlord Portal</div>
              <div class="tiny" style="margin-top:6px;">Landlords verify documents before responding.</div>
              <a class="btn btn--ghost btn--block" href="#/portal" style="margin-top:10px;">Open portal</a>
            </div>
          </aside>
        </div>

        <footer class="wrap footer">
          <div class="tiny">© ${new Date().getFullYear()} casa</div>
          <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
            <a href="#/trust">Trust & Safety</a>
            <a href="#/how">How it works</a>
            <a href="#/search">Search</a>
          </div>
        </footer>
      </div>
    </section>
  `;

  // accordion toggle
  document.querySelectorAll(".xCard").forEach((c) => {
    c.addEventListener("click", () => c.classList.toggle("open"));
  });

  // featured
  const grid = $("#featuredGrid");
  if (grid) {
    grid.innerHTML = landlords.slice(0, 3).map((r) => `
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
          <a class="btn btn--outline" href="#/landlord/${esc(r.id)}">View Landlord</a>
        </div>
      </div>
    `).join("");
  }

  // search action
  const homeQ = $("#homeQ");
  const homeGo = $("#homeGo");
  homeGo?.addEventListener("click", () => {
    const q = (homeQ?.value || "").trim();
    location.hash = "#/search?q=" + encodeURIComponent(q);
  });
  homeQ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") homeGo?.click();
  });

  // suggestions
  const sug = $("#homeSuggest");
  const pool = landlords.map(l => l.name).concat(["ABC Management", "123 Main St", "John Doe"]);
  if (homeQ && sug) {
    homeQ.addEventListener("input", () => {
      const q = homeQ.value.trim().toLowerCase();
      if (!q) { sug.classList.remove("open"); sug.innerHTML = ""; return; }
      const hits = pool.filter(x => x.toLowerCase().includes(q)).slice(0, 6);
      if (!hits.length) { sug.classList.remove("open"); sug.innerHTML = ""; return; }
      sug.innerHTML = hits.map(x => `<button type="button" data-v="${esc(x)}">${esc(x)}</button>`).join("");
      sug.classList.add("open");
      sug.querySelectorAll("button").forEach(b => {
        b.onclick = () => { homeQ.value = b.dataset.v; sug.classList.remove("open"); };
      });
    });
    document.addEventListener("click", (e) => {
      if (!sug.contains(e.target) && e.target !== homeQ) sug.classList.remove("open");
    });
  }
}

/* =========================================================
   SEARCH (filters + map)
   ========================================================= */
function renderSearch() {
  const app = $("#app");
  if (!app) return;

  const hash = location.hash || "#/search";
  const queryString = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const initial = params.get("q") || "";

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Search</div>
              <h2>Find a landlord</h2>
              <div class="muted">Search by name, company, or address. Filter by borough. Browse on the map.</div>
            </div>
            <a class="btn btn--outline" href="#/add">Add landlord</a>
          </div>

          <div class="bd">
            <div class="searchTop">
              <div class="searchTop__bar">
                <input id="q" placeholder="Type a landlord name or address..." value="${esc(initial)}" />
                <button class="btn btn--primary" id="doSearch">Search</button>
              </div>
            </div>

            <div class="filtersRow">
              <div class="field">
                <label>Borough</label>
                <select id="borough">
                  <option value="">All boroughs</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                </select>
              </div>

              <div class="field">
                <label>Min rating</label>
                <select id="minr">
                  <option value="">Any</option>
                  <option value="5">5 stars</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                </select>
              </div>

              <div class="field">
                <label>Sort</label>
                <select id="sort">
                  <option value="relevance">Relevance</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            <div class="mapWrap">
              <div id="map"></div>
            </div>

            <div id="mapFallback" class="box" style="margin-top:12px; display:none;">
              <div style="font-weight:1000;">Map library not loaded</div>
              <div class="tiny" style="margin-top:6px;">
                Add Leaflet includes to <b>index.html</b> (2 lines) to enable the map.
              </div>
            </div>

            <div id="results"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  let map = null;
  let layerGroup = null;

  function leafletAvailable() {
    return typeof window.L !== "undefined" && typeof window.L.map === "function";
  }

  function ensureMap() {
    const fb = $("#mapFallback");
    if (!leafletAvailable()) {
      // hide the empty map div so it doesn't look broken
      const mapDiv = $("#map");
      if (mapDiv) mapDiv.style.display = "none";
      if (fb) fb.style.display = "block";
      return;
    }
    if (fb) fb.style.display = "none";
    if (map) return;

    map = window.L.map("map", { scrollWheelZoom: false }).setView([40.73, -73.97], 11);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    layerGroup = window.L.layerGroup().addTo(map);
  }

  function setMarkers(list) {
    ensureMap();
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const pts = [];

    list.forEach((x) => {
      if (typeof x.lat !== "number" || typeof x.lng !== "number") return;

      const m = window.L.marker([x.lat, x.lng]).addTo(layerGroup);
      m.bindPopup(`
        <div style="min-width:220px;">
          <div style="font-weight:1000;">${esc(x.name)}</div>
          <div style="opacity:.75; font-weight:850; font-size:12.5px; margin-top:2px;">${esc(x.borough || "")}</div>
          <div style="opacity:.75; font-weight:850; font-size:12.5px; margin-top:2px;">${esc(x.addr)}</div>
          <div style="margin-top:8px;">${starsRow(x.score)}</div>
          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <a class="btn btn--primary" style="text-decoration:none;" href="#/landlord/${esc(x.id)}">View</a>
            <a class="btn btn--outline" style="text-decoration:none;" href="#/review/${esc(x.id)}">Review</a>
          </div>
        </div>
      `);

      pts.push([x.lat, x.lng]);
    });

    if (pts.length) {
      const bounds = window.L.latLngBounds(pts);
      map.fitBounds(bounds.pad(0.18));
    } else {
      map.setView([40.73, -73.97], 11);
    }
  }

  function parseDate(d) {
    const parts = String(d || "").split("/");
    if (parts.length !== 3) return new Date(0);
    const mm = Number(parts[0]) - 1;
    const dd = Number(parts[1]);
    const yy = Number(parts[2]);
    return new Date(yy, mm, dd);
  }

  function run() {
    const query = ($("#q").value || "").trim().toLowerCase();
    const borough = ($("#borough").value || "").trim();
    const minr = Number($("#minr").value || 0);
    const sort = ($("#sort").value || "relevance");

    let list = landlords.slice();

    if (query) {
      list = list.filter((x) =>
        x.name.toLowerCase().includes(query) ||
        x.addr.toLowerCase().includes(query)
      );
    }

    if (borough) list = list.filter((x) => (x.borough || "") === borough);
    if (minr) list = list.filter((x) => (Number(x.score) || 0) >= minr);

    if (sort === "rating") list.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sort === "newest") list.sort((a, b) => parseDate(b.date) - parseDate(a.date));

    const results = $("#results");
    if (results) {
      results.innerHTML = list.length
        ? list.map((x) => `
            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">${esc(x.name)}</div>
                <div class="rowSub">${esc(x.addr)}</div>
                <div class="tiny" style="margin-top:6px;">${esc(x.borough || "")}</div>
                ${starsRow(x.score)}
              </div>
              <div style="display:flex; flex-direction:column; gap:10px; justify-content:center;">
                <a class="btn btn--primary" href="#/landlord/${esc(x.id)}">View</a>
                <a class="btn btn--outline" href="#/review/${esc(x.id)}">Write review</a>
              </div>
            </div>
          `).join("")
        : `
            <div class="box" style="margin-top:12px;">
              <div style="font-weight:1000;">No results</div>
              <div class="tiny" style="margin-top:6px;">Try a different search or change filters.</div>
              <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <a class="btn btn--primary" href="#/add">Add a landlord</a>
                <a class="btn btn--ghost" href="#/">Back to home</a>
              </div>
            </div>
          `;
    }

    setMarkers(list);
  }

  $("#doSearch")?.addEventListener("click", run);
  $("#q")?.addEventListener("keydown", (e) => (e.key === "Enter" ? run() : null));
  ["borough", "minr", "sort"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", run);
  });

  run();
}

/* =========================================================
   ADD LANDLORD (demo adds to memory)
   ========================================================= */
function renderAdd() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Add landlord</div>
              <h2>Add a missing profile</h2>
              <div class="muted">No account required. Keep it factual and specific.</div>
            </div>
            <a class="btn btn--ghost" href="#/search">Search</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="field">
                <label>Landlord / Company name</label>
                <input id="name" placeholder="e.g., Northside Properties" />
              </div>
              <div class="field">
                <label>Address</label>
                <input id="addr" placeholder="e.g., 123 Main St, Brooklyn, NY" />
              </div>
            </div>

            <div class="split2" style="margin-top:12px;">
              <div class="field">
                <label>Borough</label>
                <select id="boro">
                  <option value="">Select borough</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                </select>
              </div>
              <div class="field">
                <label>Coordinates (optional for map)</label>
                <input id="coords" placeholder="lat,lng (e.g., 40.7081,-73.9571)" />
              </div>
            </div>

            <div class="field" style="margin-top:12px;">
              <label>Notes (optional)</label>
              <textarea id="notes" placeholder="Any helpful context (management company, building name, etc.)"></textarea>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn btn--ghost" href="#/">Cancel</a>
              <button class="btn btn--primary" id="submit">Add landlord</button>
            </div>

            <div class="tiny" style="margin-top:10px;">
              Demo mode: this adds to memory only (won’t persist after refresh).
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#submit")?.addEventListener("click", () => {
    const name = ($("#name").value || "").trim();
    const addr = ($("#addr").value || "").trim();
    const borough = ($("#boro").value || "").trim();
    const coords = ($("#coords").value || "").trim();
    const notes = ($("#notes").value || "").trim();

    if (!name || !addr) return toast("Add name + address.");

    let lat, lng;
    if (coords.includes(",")) {
      const [a, b] = coords.split(",").map((x) => Number(x.trim()));
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        lat = a;
        lng = b;
      }
    }

    const id =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 48) || "landlord-" + Date.now();

    landlords.unshift({
      id,
      name,
      addr,
      borough: borough || "",
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
      score: 0,
      date: new Date().toLocaleDateString(),
      text: notes || "New listing (no reviews yet).",
    });

    toast("Added (demo): " + name);
    location.hash = "#/search?q=" + encodeURIComponent(name);
  });
}

/* =========================================================
   LANDLORD PROFILE
   ========================================================= */
function renderLandlord(id) {
  const app = $("#app");
  if (!app) return;

  const l = landlords.find((x) => x.id === id);
  if (!l) {
    app.innerHTML = `
      <section class="section"><div class="wrap">
        <div class="card pad">
          <h2>Not found</h2>
          <div class="muted">That landlord profile doesn’t exist.</div>
          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/search">Search</a>
            <a class="btn btn--ghost" href="#/">Home</a>
          </div>
        </div>
      </div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Landlord</div>
              <h2>${esc(l.name)}</h2>
              <div class="muted">${esc(l.addr)}</div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--outline" href="#/search">Back</a>
              <a class="btn btn--primary" href="#/review/${esc(l.id)}">Write review</a>
            </div>
          </div>

          <div class="bd">
            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">Overall rating</div>
                ${starsRow(l.score)}
                <div class="tiny" style="margin-top:6px;">${esc(l.borough || "")}</div>
              </div>
              <div class="box" style="flex:1;">
                <div style="font-weight:1000;">Latest highlight</div>
                <div class="tiny" style="margin-top:6px;">${esc(l.date)}</div>
                <div style="margin-top:10px; font-weight:850; color:rgba(35,24,16,.78); line-height:1.35;">
                  ${esc(l.text)}
                </div>
              </div>
            </div>

            <div class="box" style="margin-top:12px;">
              <div style="font-weight:1000;">Reviews (demo)</div>
              <div class="tiny" style="margin-top:6px;">
                This demo stores one highlight per landlord. Next step is adding a reviews array per landlord.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* =========================================================
   WRITE REVIEW (demo)
   ========================================================= */
function renderReview(id) {
  const app = $("#app");
  if (!app) return;

  const l = landlords.find((x) => x.id === id);
  if (!l) return renderLandlord(id);

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Write a review</div>
              <h2>${esc(l.name)}</h2>
              <div class="muted">${esc(l.addr)}</div>
            </div>
            <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Back</a>
          </div>

          <div class="bd">
            <div class="split2">
              <div class="field">
                <label>Overall rating</label>
                <select id="rScore">
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Okay</option>
                  <option value="2">2 — Bad</option>
                  <option value="1">1 — Terrible</option>
                </select>
              </div>
              <div class="field">
                <label>Borough (for filtering)</label>
                <select id="rBoro">
                  <option value="">Use existing</option>
                  <option>Manhattan</option>
                  <option>Brooklyn</option>
                  <option>Queens</option>
                  <option>Bronx</option>
                  <option>Staten Island</option>
                </select>
              </div>
            </div>

            <div class="field" style="margin-top:12px;">
              <label>What happened?</label>
              <textarea id="rText" placeholder="Stick to facts: repairs, communication, safety, deposit, etc."></textarea>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn btn--ghost" href="#/landlord/${esc(l.id)}">Cancel</a>
              <button class="btn btn--primary" id="submitReview">Submit review</button>
            </div>

            <div class="tiny" style="margin-top:10px;">
              Demo mode: this replaces the landlord’s highlight + score.
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#submitReview")?.addEventListener("click", () => {
    const score = Number($("#rScore").value || 0);
    const text = ($("#rText").value || "").trim();
    const boro = ($("#rBoro").value || "").trim();

    if (!text) return toast("Write a short description.");

    l.score = Math.max(1, Math.min(5, score || 0));
    l.text = text;
    l.date = new Date().toLocaleDateString();
    if (boro) l.borough = boro;

    toast("Posted (demo).");
    location.hash = "#/landlord/" + encodeURIComponent(l.id);
  });
}

/* =========================================================
   HOW / TRUST
   ========================================================= */
function renderHow() {
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
              <div class="rowTitle">1) Search</div>
              <div class="rowSub">Find a landlord by name, company, address, borough, or the map.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">2) Review</div>
              <div class="rowSub">Post instantly (no account). Keep it factual and specific.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">3) Verified landlord responses</div>
              <div class="rowSub">Landlords create accounts only in the Landlord Portal and verify documents before responding publicly.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">4) Reporting</div>
              <div class="rowSub">Report spam, harassment, or personal information.</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTrust() {
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
              <div class="rowSub">Tenants can post without accounts. Reviews should be factual and specific.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Verified landlord responses</div>
              <div class="rowSub">Landlords verify documents before responding publicly.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">No personal info</div>
              <div class="rowSub">Do not post phone numbers, emails, or private details.</div>
            </div></div>

            <div class="rowCard"><div style="flex:1;">
              <div class="rowTitle">Reporting</div>
              <div class="rowSub">Report spam, harassment, or inaccurate listings for moderation.</div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* =========================================================
   LANDLORD PORTAL (demo)
   ========================================================= */
function renderPortal() {
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
                  <button class="btn btn--outline btn--block" id="g">Continue with Google</button>
                  <div style="height:8px;"></div>
                  <button class="btn btn--outline btn--block" id="a">Continue with Apple</button>
                  <div style="height:8px;"></div>
                  <button class="btn btn--outline btn--block" id="m">Continue with Microsoft</button>
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
                    <input id="doc" type="file"/>
                    <div class="tiny" style="margin-top:6px;">Lease header, LLC registration, management agreement, etc.</div>
                  </div>
                  <button class="btn btn--primary btn--block" style="margin-top:12px;" id="signup">Create account</button>
                  <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#login")?.addEventListener("click", () => {
    const e = ($("#le").value || "").trim();
    const p = ($("#lp").value || "").trim();
    if (!e || !p) return toast("Enter email + password.");
    toast("Signed in (demo).");
  });

  $("#signup")?.addEventListener("click", () => {
    const e = ($("#se").value || "").trim();
    const p = ($("#sp").value || "").trim();
    const f = $("#doc")?.files?.[0];
    if (!e || !p) return toast("Enter email + password.");
    if (!f) return toast("Upload a verification document.");
    toast("Submitted for verification (demo).");
  });

  ["g", "a", "m"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => toast("OAuth (demo only)."));
  });
}

/* =========================================================
   ROUTER
   ========================================================= */
function route() {
  setActiveNav();

  const raw = location.hash || "#/";
  const [pathPart] = raw.replace(/^#/, "").split("?");
  const parts = pathPart.split("/").filter(Boolean);

  // close mobile drawer if open
  const drawer = document.getElementById("navDrawer");
  if (drawer?.classList.contains("open")) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  if (parts.length === 0) return renderHome();

  const page = parts[0];

  if (page === "search") return renderSearch();
  if (page === "add") return renderAdd();
  if (page === "how") return renderHow();
  if (page === "trust") return renderTrust();
  if (page === "portal") return renderPortal();

  if (page === "landlord" && parts[1]) return renderLandlord(parts[1]);
  if (page === "review" && parts[1]) return renderReview(parts[1]);

  // fallback
  renderHome();
}

/* =========================================================
   Boot
   ========================================================= */
function boot() {
  window.addEventListener("hashchange", route);

  // if someone loads without hash
  if (!location.hash) location.hash = "#/";
  route();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
