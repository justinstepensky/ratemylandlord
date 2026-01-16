/* =========================================================
   casa — app.js (FULL FILE)
   Hash-router SPA, GitHub Pages friendly
   - Home (hero + tiles + featured carousel + home map)
   - Search (filters + map)
   - Add / How / Trust / Portal
   - Featured carousel autoplay
   - Leaflet map supported (fallback if Leaflet missing)
   ========================================================= */

(() => {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (sel) => document.querySelector(sel);

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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

  /* ---------- stars ---------- */
  function starSVG(on) {
    return `
      <svg class="star" viewBox="0 0 24 24" fill="${on ? "var(--starOn)" : "var(--starOff)"}" aria-hidden="true">
        <path d="M12 17.3l-6.18 3.6 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.63 1.64 7.03z"/>
      </svg>
    `;
  }

  function starsRow(score) {
    const s = Math.max(0, Math.min(5, Number(score) || 0));
    let out = `<div class="starRow"><div class="stars">`;
    for (let i = 1; i <= 5; i++) out += starSVG(i <= s);
    out += `</div><div class="scoreText">${s}/5</div></div>`;
    return out;
  }

  /* ---------- autoplay carousel ---------- */
  function setupAutoCarousel(trackEl, opts = {}) {
    const intervalMs = opts.intervalMs ?? 3200;
    const stepPx = opts.stepPx ?? 380;

    if (!trackEl) return;
    let timer = null;
    let paused = false;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      timer = setInterval(() => {
        if (paused) return;

        const max = trackEl.scrollWidth - trackEl.clientWidth;
        const next = Math.min(trackEl.scrollLeft + stepPx, max);

        if (trackEl.scrollLeft >= max - 2) {
          trackEl.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          trackEl.scrollTo({ left: next, behavior: "smooth" });
        }
      }, intervalMs);
    };

    trackEl.addEventListener("mouseenter", () => (paused = true));
    trackEl.addEventListener("mouseleave", () => (paused = false));

    let resumeT = null;
    const userPause = () => {
      paused = true;
      if (resumeT) clearTimeout(resumeT);
      resumeT = setTimeout(() => (paused = false), 900);
    };

    trackEl.addEventListener("scroll", userPause, { passive: true });
    trackEl.addEventListener("touchstart", () => (paused = true), { passive: true });
    trackEl.addEventListener("touchend", userPause, { passive: true });
    trackEl.addEventListener("pointerdown", () => (paused = true));
    trackEl.addEventListener("pointerup", userPause);

    // mouse wheel scroll becomes horizontal "wheel"
    trackEl.addEventListener(
      "wheel",
      (e) => {
        if (e.shiftKey) return;
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        trackEl.scrollLeft += delta;
        e.preventDefault();
        userPause();
      },
      { passive: false }
    );

    start();
    return { start, stop };
  }

  /* ---------- data (demo) ---------- */
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
    {
      id: "bronxgroup",
      name: "Bronx Group LLC",
      addr: "401 Grand Concourse • Bronx, NY",
      borough: "Bronx",
      lat: 40.8270,
      lng: -73.9229,
      score: 2,
      date: "10/02/2025",
      text: "Maintenance took too long. Common areas were not consistently cleaned.",
    },
    {
      id: "statenmanage",
      name: "Staten Management",
      addr: "12 Bay St • Staten Island, NY",
      borough: "Staten Island",
      lat: 40.6437,
      lng: -74.0736,
      score: 4,
      date: "9/14/2025",
      text: "Solid communication. Repairs completed within reasonable time.",
    },
  ];

  /* ---------- Leaflet helpers ---------- */
  function leafletAvailable() {
    return typeof window.L !== "undefined" && typeof window.L.map === "function";
  }

  function initLeafletMap(containerId, center, zoom) {
    if (!leafletAvailable()) return null;

    const map = window.L.map(containerId, { scrollWheelZoom: false }).setView(center, zoom);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const group = window.L.layerGroup().addTo(map);
    return { map, group };
  }

  function setMarkers(mapObj, list) {
    if (!mapObj) return;
    const { map, group } = mapObj;
    group.clearLayers();

    const points = [];

    list.forEach((x) => {
      if (typeof x.lat !== "number" || typeof x.lng !== "number") return;

      const marker = window.L.marker([x.lat, x.lng]).addTo(group);
      marker.bindPopup(`
        <div style="min-width:220px;">
          <div style="font-weight:1000;">${esc(x.name)}</div>
          <div style="opacity:.75; font-weight:850; font-size:12.5px; margin-top:2px;">${esc(x.addr)}</div>
          <div style="opacity:.75; font-weight:850; font-size:12.5px; margin-top:2px;">${esc(x.borough || "")}</div>
          <div style="margin-top:8px;">${starsRow(x.score)}</div>
          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <a class="btn btn--primary" style="text-decoration:none;" href="#/landlord/${esc(x.id)}">View</a>
          </div>
        </div>
      `);

      points.push([x.lat, x.lng]);
    });

    if (points.length) {
      const bounds = window.L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.18));
    }
  }

  /* =========================================================
     PAGES
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
                  <input id="homeSearch" placeholder="Search landlord name, management company, or address..." />
                </div>
                <button class="btn btn--primary" id="goSearch">Search</button>
                <button class="btn btn--outline" id="goAdd">Add a landlord</button>
              </div>

              <div class="trustLine">No account required to review. Verified landlords can respond.</div>

              <div class="cards3" style="margin-top:14px;">
                <div class="xCard" data-acc="search">
                  <div class="xCard__top">
                    <div class="xCard__title"><span class="xCard__icon">⌕</span> Search</div>
                  </div>
                  <div class="xCard__body">Search by name, entity or address</div>
                </div>

                <div class="xCard" data-acc="review">
                  <div class="xCard__top">
                    <div class="xCard__title"><span class="xCard__icon">★</span> Review</div>
                  </div>
                  <div class="xCard__body">leave a rating based on select categories</div>
                </div>

                <div class="xCard xCard--static" aria-disabled="true">
                  <div class="xCard__top">
                    <div class="xCard__title"><span class="xCard__icon">⌂</span> Rent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="gridHalf" style="margin-top:14px;">
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
                <div class="carousel" aria-label="Recent highlights carousel">
                  <div class="carousel__track" id="featuredGrid"></div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="hd">
                <div>
                  <div class="kicker">Map</div>
                  <h2>Browse by location</h2>
                  <div class="muted">Pins reflect existing ratings.</div>
                </div>
                <a class="btn btn--outline" href="#/search">Open search</a>
              </div>

              <div class="bd">
                <div class="mapWrap" id="homeMapWrap">
                  <div id="homeMap"></div>
                </div>
                <div class="tiny" style="margin-top:10px;">
                  ${leafletAvailable() ? "" : "Map requires Leaflet. Add it in index.html to enable pins."}
                </div>
              </div>
            </div>
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

    // tiles
    document.querySelectorAll(".xCard[data-acc]").forEach((c) => {
      c.addEventListener("click", () => c.classList.toggle("open"));
    });

    // home buttons
    const goSearch = $("#goSearch");
    const goAdd = $("#goAdd");
    const input = $("#homeSearch");
    if (goSearch && input) {
      goSearch.onclick = () =>
        (location.hash = "#/search?q=" + encodeURIComponent(input.value.trim()));
    }
    if (goAdd) goAdd.onclick = () => (location.hash = "#/add");

    // featured cards
    const grid = $("#featuredGrid");
    if (grid) {
      grid.innerHTML = landlords.map((r) => `
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
            <a class="btn btn--outline" href="#/landlord/${esc(r.id)}">View</a>
          </div>
        </div>
      `).join("");

      setupAutoCarousel(grid, { intervalMs: 3000, stepPx: 420 });
    }

    // home map
    const wrap = $("#homeMapWrap");
    if (wrap && leafletAvailable()) {
      const mapObj = initLeafletMap("homeMap", [40.73, -73.97], 11);
      setMarkers(mapObj, landlords);
      // allow map to layout correctly after render
      setTimeout(() => mapObj.map.invalidateSize(), 60);
    }
  }

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
                <div class="muted">Search by name, company, address, or borough. Browse on the map.</div>
              </div>
              <a class="btn btn--outline" href="#/add">Add landlord</a>
            </div>

            <div class="bd">

              <div class="heroSearch" style="justify-content:flex-start;">
                <div class="heroSearch__bar" style="max-width:760px;">
                  <input id="q" placeholder="Search landlord name, management company, or address..." value="${esc(initial)}" />
                </div>
                <button class="btn btn--primary" id="doSearch">Search</button>
              </div>

              <div class="filtersRow" style="margin-top:12px;">
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

              <div class="mapWrap" id="mapWrap" style="margin-top:14px;">
                <div id="map"></div>
              </div>

              <div id="results"></div>

            </div>
          </div>
        </div>
      </section>
    `;

    // map init (if leaflet)
    const mapWrap = $("#mapWrap");
    let mapObj = null;
    if (mapWrap && leafletAvailable()) {
      mapObj = initLeafletMap("map", [40.73, -73.97], 11);
      setTimeout(() => mapObj.map.invalidateSize(), 60);
    } else if (mapWrap) {
      mapWrap.style.display = "none";
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
        list = list.filter(
          (x) =>
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
                </div>
              </div>
            `).join("")
          : `
            <div class="box" style="margin-top:12px;">
              <div style="font-weight:1000;">No results</div>
              <div class="tiny" style="margin-top:6px;">Try a different search or change filters.</div>
            </div>
          `;
      }

      if (mapObj) setMarkers(mapObj, list);
    }

    $("#doSearch")?.addEventListener("click", run);
    $("#q")?.addEventListener("keydown", (e) => e.key === "Enter" && run());
    ["borough", "minr", "sort"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", run);
    });

    run();
  }

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
                Demo mode: adds to in-memory list (won’t persist after refresh).
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
        if (!Number.isNaN(a) && !Number.isNaN(b)) { lat = a; lng = b; }
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || ("landlord-" + Date.now());

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

      toast("Added: " + name);
      location.hash = "#/search?q=" + encodeURIComponent(name);
    });
  }

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
                <div class="rowTitle">Search</div>
                <div class="rowSub">Find a landlord by name, company, address, or borough.</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Review</div>
                <div class="rowSub">Post instantly (no account required).</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Verified responses</div>
                <div class="rowSub">Landlords verify documents before responding publicly.</div>
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
                <div class="rowSub">Tenants can post without accounts.</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">No personal info</div>
                <div class="rowSub">Do not post phone numbers, emails, or private details.</div>
              </div></div>

              <div class="rowCard"><div style="flex:1;">
                <div class="rowTitle">Reporting</div>
                <div class="rowSub">Spam, harassment, and inaccurate listings can be reported.</div>
              </div></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function iconGoogle() {
    return `
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.4H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.6z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.7 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.3 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.4H42V20H24v8h11.3c-.8 2.1-2.2 3.9-4 5.1l.0 0 6.3 5.2C36.9 40.8 44 36 44 24c0-1.2-.1-2.4-.4-3.6z"/>
      </svg>
    `;
  }
  function iconApple() {
    return `
      <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true">
        <path fill="currentColor" d="M318.7 268.6c-.2-38.4 17.1-67.4 53.1-89.3-20.1-28.9-50.5-44.8-90.7-47.9-38.3-3-80 22.3-95.3 22.3-16.2 0-53-21.2-82.2-20.6C44.5 134.2 0 181.5 0 277.7 0 305.7 5.1 334 15.4 362.7c13.7 37.8 63.1 130.3 114.7 128.8 27.1-.6 46.2-19.2 81.5-19.2 34.2 0 51.7 19.2 82.2 18.6 56.2-.9 101-85 114-122.9-67.2-31.7-89-84-89.1-99.4zM250.5 80.3c29.5-35.1 26.9-67 26-78.3-26.1 1.5-56.4 17.7-73.6 37.8-19 21.6-30.2 48.4-27.8 77 28.3 2.2 53.8-12.1 75.4-36.5z"/>
      </svg>
    `;
  }
  function iconMicrosoft() {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    `;
  }

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

                    <button class="btn btn--outline btn--block socialBtn" id="g">
                      <span class="socialBtn__ic">${iconGoogle()}</span>
                      <span>Continue with Google</span>
                    </button>

                    <div style="height:8px;"></div>

                    <button class="btn btn--outline btn--block socialBtn" id="a">
                      <span class="socialBtn__ic">${iconApple()}</span>
                      <span>Continue with Apple</span>
                    </button>

                    <div style="height:8px;"></div>

                    <button class="btn btn--outline btn--block socialBtn" id="m">
                      <span class="socialBtn__ic">${iconMicrosoft()}</span>
                      <span>Continue with Microsoft</span>
                    </button>
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
      if (!e || !p) return toast("Enter email + password.");
      toast("Account created (demo).");
    });

    $("#g")?.addEventListener("click", () => toast("Google sign-in (demo)"));
    $("#a")?.addEventListener("click", () => toast("Apple sign-in (demo)"));
    $("#m")?.addEventListener("click", () => toast("Microsoft sign-in (demo)"));
  }

  function renderNotFound() {
    const app = $("#app");
    if (!app) return;
    app.innerHTML = `
      <section class="section">
        <div class="wrap">
          <div class="card pad">
            <h2>Page not found</h2>
            <p class="muted">That route doesn’t exist.</p>
            <a class="btn btn--primary" href="#/">Go home</a>
          </div>
        </div>
      </section>
    `;
  }

  /* ---------- router ---------- */
  function route() {
    const h = location.hash || "#/";
    const path = h.split("?")[0];

    if (path === "#/" || path === "#") return renderHome();
    if (path === "#/search") return renderSearch();
    if (path === "#/add") return renderAdd();
    if (path === "#/how") return renderHow();
    if (path === "#/trust") return renderTrust();
    if (path === "#/portal") return renderPortal();

    // placeholder for future landlord detail
    if (path.startsWith("#/landlord/")) {
      const id = path.split("/")[2] || "";
      const x = landlords.find((z) => z.id === id);
      const app = $("#app");
      if (!app) return;
      app.innerHTML = `
        <section class="section">
          <div class="wrap">
            <div class="card">
              <div class="hd">
                <div>
                  <div class="kicker">Landlord</div>
                  <h2>${esc(x ? x.name : "Unknown")}</h2>
                  <div class="muted">${esc(x ? x.addr : "")}</div>
                </div>
                <a class="btn btn--ghost" href="#/search">Back</a>
              </div>
              <div class="bd">
                ${x ? starsRow(x.score) : ""}
                <div class="rowSub" style="margin-top:10px;">${esc(x ? x.text : "No data.")}</div>
              </div>
            </div>
          </div>
        </section>
      `;
      return;
    }

    renderNotFound();
  }

  /* ---------- boot ---------- */
  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", () => {
    // quick sanity check
    if (!document.getElementById("app")) {
      console.error("Missing #app in index.html");
      return;
    }
    route();
  });
})();
