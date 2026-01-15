/* CASA SPA (GitHub Pages friendly) */

const $ = (sel) => document.querySelector(sel);

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function toast(msg){
  // use your existing .toast styles
  let t = $("#toast");
  if(!t){
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (t.style.display = "none"), 2400);
}

/* ---------- UI helpers ---------- */

function starSVG(on){
  return `
    <svg class="star" viewBox="0 0 24 24" fill="${on ? "var(--starOn)" : "var(--starOff)"}" aria-hidden="true">
      <path d="M12 17.3l-6.18 3.6 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.63 1.64 7.03z"/>
    </svg>
  `;
}

function starsRow(score){
  const s = Math.max(0, Math.min(5, Number(score)||0));
  let out = `<div class="starRow"><div class="stars">`;
  for(let i=1;i<=5;i++) out += starSVG(i<=s);
  out += `</div><div class="scoreText">${s}/5</div></div>`;
  return out;
}

function bubble(tip){
  return `<span class="bubbleIcon" data-tip="${esc(tip)}" aria-label="${esc(tip)}"></span>`;
}

/* ---------- Demo data ---------- */

const demoFeatured = [
  {
    id:"northside",
    name:"Northside Properties",
    addr:"123 Main St • Williamsburg • Brooklyn, NY",
    score:4,
    date:"1/5/2026",
    text:"Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently."
  },
  {
    id:"parkave",
    name:"Park Ave Management",
    addr:"22 Park Ave • Manhattan • New York, NY",
    score:3,
    date:"12/18/2025",
    text:"Great location, but communication was slow. Security deposit itemization took weeks."
  },
  {
    id:"seaside",
    name:"Seaside Rentals",
    addr:"8 Ocean Dr • Miami Beach • Miami, FL",
    score:5,
    date:"11/30/2025",
    text:"Extremely responsive. Clean building. Transparent terms and fast repairs."
  }
];

/* ---------- Pages ---------- */

function renderHome(){
  const app = $("#app");
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
                <div class="suggest" id="homeSuggest"></div>
              </div>
              <button class="btn btn--primary" id="goSearch">Search</button>
              <button class="btn btn--outline" id="goAdd">Add a landlord</button>
            </div>

            <div class="trustLine">No account required to review. Verified landlords can respond.</div>

            <!-- Steps -->
            <div class="cards3" style="margin-top:14px;">
              <div class="xCard" data-acc="1">
                <div class="xCard__top">
                  <div class="xCard__title"><span class="xCard__icon">1</span> Look Up</div>
                  <span class="badge">Tap</span>
                </div>
                <div class="xCard__body">
                  Search by name, entity, or address.
                  <div class="tiny" style="margin-top:8px;">Examples: “ABC Management”, “123 Main St”, “John Doe”</div>
                </div>
              </div>

              <div class="xCard" data-acc="2">
                <div class="xCard__top">
                  <div class="xCard__title"><span class="xCard__icon">2</span> Review</div>
                  <span class="badge">No sign-up needed</span>
                </div>
                <div class="xCard__body">
                  Pick a landlord → rate categories → write what happened → submit.
                  <div class="tiny" style="margin-top:8px;">You’ll receive an edit link after posting.</div>
                </div>
              </div>

              <div class="xCard" data-acc="3">
                <div class="xCard__top">
                  <div class="xCard__title"><span class="xCard__icon">3</span> Improve</div>
                  <span class="badge badge--verified">Verified responses</span>
                </div>
                <div class="xCard__body">
                  Verified landlords can respond publicly. Reporting tools keep listings accurate.
                </div>
              </div>
            </div>

            <!-- Trust row with hover bubbles -->
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

        <!-- Featured -->
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
              <div class="tiny" style="margin-top:6px;">Landlords must verify identity before responding.</div>
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
  document.querySelectorAll(".xCard").forEach(c => c.addEventListener("click", () => c.classList.toggle("open")));

  // featured render
  const grid = $("#featuredGrid");
  grid.innerHTML = demoFeatured.map(r => `
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
        <span class="tiny">Verified responses eligible</span>
        <a class="btn btn--outline" href="#/landlord/${esc(r.id)}">View Landlord</a>
      </div>
    </div>
  `).join("");

  // buttons
  $("#goSearch").onclick = () => (location.hash = "#/search?q=" + encodeURIComponent($("#homeSearch").value.trim()));
  $("#goAdd").onclick = () => (location.hash = "#/add");

  // lightweight suggestions
  const sug = $("#homeSuggest");
  const pool = ["ABC Management","123 Main St","John Doe","Northside Properties","Park Ave Management","Seaside Rentals"];
  $("#homeSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if(!q){ sug.classList.remove("open"); sug.innerHTML=""; return; }
    const m = pool.filter(x => x.toLowerCase().includes(q)).slice(0,6);
    if(!m.length){ sug.classList.remove("open"); sug.innerHTML=""; return; }
    sug.innerHTML = m.map(x => `<button type="button" data-v="${esc(x)}">${esc(x)}</button>`).join("");
    sug.classList.add("open");
    sug.querySelectorAll("button").forEach(b => b.onclick = () => { $("#homeSearch").value = b.dataset.v; sug.classList.remove("open"); });
  });
  document.addEventListener("click", (e) => {
    if(!sug.contains(e.target) && e.target.id !== "homeSearch"){
      sug.classList.remove("open");
    }
  });
}

function renderSearch(){
  const app = $("#app");
  const url = new URL(location.href);
  const q = (url.hash.split("?")[1] || "");
  const params = new URLSearchParams(q);
  const initial = params.get("q") || "";

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Search</div>
              <h2>Find a landlord</h2>
              <div class="muted">Search by name, company, or address.</div>
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
                <label>City</label>
                <input id="city" placeholder="e.g., Brooklyn" />
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

            <div id="results"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  function run(){
    const query = ($("#q").value || "").trim().toLowerCase();
    const list = demoFeatured
      .filter(x => !query || x.name.toLowerCase().includes(query) || x.addr.toLowerCase().includes(query));

    $("#results").innerHTML = list.length ? list.map(x => `
      <div class="rowCard">
        <div style="flex:1;">
          <div class="rowTitle">${esc(x.name)}</div>
          <div class="rowSub">${esc(x.addr)}</div>
          ${starsRow(x.score)}
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; justify-content:center;">
          <a class="btn btn--primary" href="#/landlord/${esc(x.id)}">View</a>
          <a class="btn btn--outline" href="#/review/${esc(x.id)}">Write review</a>
        </div>
      </div>
    `).join("") : `
      <div class="box" style="margin-top:12px;">
        <div style="font-weight:1000;">No results yet</div>
        <div class="tiny" style="margin-top:6px;">Try a different name or add a missing landlord.</div>
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn--primary" href="#/add">Add a landlord</a>
          <a class="btn btn--ghost" href="#/">Back to home</a>
        </div>
      </div>
    `;
  }

  $("#doSearch").onclick = run;
  $("#q").addEventListener("keydown", (e) => { if(e.key === "Enter") run(); });
  run();
}

function renderAdd(){
  const app = $("#app");
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

            <div class="field" style="margin-top:12px;">
              <label>Notes (optional)</label>
              <textarea id="notes" placeholder="Any helpful context (management company, building name, etc.)"></textarea>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
              <a class="btn btn--ghost" href="#/">Cancel</a>
              <button class="btn btn--primary" id="submit">Add landlord</button>
            </div>

            <div class="tiny" style="margin-top:10px;">
              Demo mode: this will not persist on refresh unless you add storage.
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#submit").onclick = () => {
    const name = ($("#name").value||"").trim();
    const addr = ($("#addr").value||"").trim();
    if(!name || !addr) return toast("Add name + address.");
    toast("Added (demo): " + name);
    location.hash = "#/search?q=" + encodeURIComponent(name);
  };
}

function renderHow(){
  const app = $("#app");
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
            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">1) Search</div>
                <div class="rowSub">Find a landlord by name, company, or address.</div>
              </div>
            </div>

            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">2) Review</div>
                <div class="rowSub">Post a review instantly. You’ll receive an edit link (no account required).</div>
              </div>
            </div>

            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">3) Respond (verified landlords)</div>
                <div class="rowSub">Landlords create accounts only in the Landlord Portal and verify documents before responding.</div>
              </div>
            </div>

            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">4) Keep it clean</div>
                <div class="rowSub">Report spam, harassment, or personal info for moderation review.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTrust(){
  const app = $("#app");
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
            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">No reviewer accounts</div>
                <div class="rowSub">Tenants can post without accounts; edits use an edit link.</div>
              </div>
            </div>

            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">Verified landlord responses</div>
                <div class="rowSub">Landlords upload documentation and are reviewed before responding publicly.</div>
              </div>
            </div>

            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">No doxxing or personal info</div>
                <div class="rowSub">Do not post phone numbers, emails, or private details.</div>
              </div>
            </div>

            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">Reporting</div>
                <div class="rowSub">Spam, harassment, and inaccurate listings can be reported for review.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPortal(){
  const app = $("#app");
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
                  <div class="tiny" style="margin-top:10px;">Demo mode: accounts are not persisted here yet.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  $("#login").onclick = () => {
    const e = ($("#le").value||"").trim();
    const p = ($("#lp").value||"").trim();
    if(!e || !p) return toast("Enter email + password.");
    toast("Signed in (demo): " + e);
  };
  $("#signup").onclick = () => {
    const e = ($("#se").value||"").trim();
    const p = ($("#sp").value||"").trim();
    const d = $("#doc").files?.[0];
    if(!e || !p) return toast("Enter email + password.");
    if(!d) return toast("Upload a verification document.");
    toast("Created (demo). Pending verification.");
  };
  $("#g").onclick = () => toast("Google sign-in (connect OAuth later)");
  $("#a").onclick = () => toast("Apple sign-in (connect OAuth later)");
  $("#m").onclick = () => toast("Microsoft sign-in (connect OAuth later)");
}

function renderLandlord(id){
  const item = demoFeatured.find(x => x.id === id);
  const app = $("#app");
  if(!item){
    app.innerHTML = `
      <section class="section"><div class="wrap">
        <div class="card"><div class="pad">
          <h2>Landlord not found</h2>
          <div class="tiny">Demo dataset only.</div>
          <div style="margin-top:12px;"><a class="btn btn--ghost" href="#/search">Back to search</a></div>
        </div></div>
      </div></section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Landlord profile</div>
              <h2>${esc(item.name)}</h2>
              <div class="muted">${esc(item.addr)}</div>
              ${starsRow(item.score)}
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--primary" href="#/review/${esc(item.id)}">Write review</a>
              <a class="btn btn--ghost" href="#/search">Back</a>
            </div>
          </div>
          <div class="bd">
            <div class="rowCard">
              <div style="flex:1;">
                <div class="rowTitle">Recent highlight</div>
                <div class="rowSub">${esc(item.text)}</div>
              </div>
            </div>

            <div class="box" style="margin-top:12px;">
              <div style="font-weight:1000;">Verified landlord responses</div>
              <div class="tiny" style="margin-top:6px;">Landlords must verify documents before responding publicly.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderReview(id){
  const item = demoFeatured.find(x => x.id === id);
  const app = $("#app");
  if(!item){
    app.innerHTML = `<section class="section"><div class="wrap"><div class="card"><div class="pad">
      <h2>Landlord not found</h2><a class="btn btn--ghost" href="#/search">Back</a>
    </div></div></div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="card">
          <div class="hd">
            <div>
              <div class="kicker">Write a review</div>
              <h2>${esc(item.name)}</h2>
              <div class="muted">${esc(item.addr)}</div>
            </div>
            <a class="btn btn--ghost" href="#/landlord/${esc(id)}">Back</a>
          </div>
          <div class="bd">
            <div class="field">
              <label>Overall rating</label>
              <div class="ratingPick" style="margin-top:8px;">
                ${[5,4,3,2,1].map(v => `
                  <button class="starBtn" data-v="${v}">
                    <div class="stars">${[1,2,3,4,5].map(i => starSVG(i<=v)).join("")}</div>
                    <div class="ratingValue">${v}/5</div>
                  </button>
                `).join("")}
              </div>
            </div>

            <div class="field" style="margin-top:12px;">
              <label>What happened?</label>
              <textarea id="txt" placeholder="Be specific: repairs, communication, deposits, safety, noise, cleanliness, etc."></textarea>
            </div>

            <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
              <a class="btn btn--ghost" href="#/landlord/${esc(id)}">Cancel</a>
              <button class="btn btn--primary" id="post">Post review</button>
            </div>

            <div class="tiny" style="margin-top:10px;">
              No account required. After posting, you’ll get an edit link (demo: toast only).
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  let chosen = 0;
  document.querySelectorAll(".starBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      chosen = Number(btn.dataset.v);
      document.querySelectorAll(".starBtn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  $("#post").onclick = () => {
    const text = ($("#txt").value||"").trim();
    if(!chosen) return toast("Pick a rating.");
    if(text.length < 10) return toast("Write at least a couple sentences.");
    toast("Posted (demo). Edit link would appear here.");
    location.hash = "#/landlord/" + encodeURIComponent(id);
  };
}

/* ---------- Router ---------- */

function route(){
  const hash = (location.hash || "#/").slice(1);
  const [path] = hash.split("?");
  const parts = path.split("/").filter(Boolean);

  if(parts.length === 0) return renderHome();
  if(parts[0] === "search") return renderSearch();
  if(parts[0] === "add") return renderAdd();
  if(parts[0] === "how") return renderHow();
  if(parts[0] === "trust") return renderTrust();
  if(parts[0] === "portal") return renderPortal();
  if(parts[0] === "landlord" && parts[1]) return renderLandlord(parts[1]);
  if(parts[0] === "review" && parts[1]) return renderReview(parts[1]);

  // fallback
  $("#app").innerHTML = `
    <section class="section"><div class="wrap">
      <div class="card"><div class="pad">
        <h2>Page not found</h2>
        <div style="margin-top:12px;"><a class="btn btn--ghost" href="#/">Go home</a></div>
      </div></div>
    </div></section>
  `;
}

window.addEventListener("hashchange", route);
window.addEventListener("load", route);
route();
