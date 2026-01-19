/* CASA — single-file SPA app.js (DROP-IN REPLACEMENT)
  Theme/aesthetic untouched (uses your existing classes).

  Fixes + Adds (repo-safe):
  ✅ App won’t go down (hard safety net + guarded rendering)
  ✅ Home banner: Recent highlights (left) + Map (right) = 50/50
  ✅ Split search results: Landlords (left) + Addresses (right)
     - Works from BOTH Home search + Search page
  ✅ Landlords can have multiple properties
  ✅ Address/Property profile pages (#/property/:id) + reviews
  ✅ Tenant Toolkit is real + usable (NYC, MIA, LA, CHI cards)
  ✅ All columns fit and collapse cleanly on mobile (via your existing layout classes)
  ✅ Map safe-init (Leaflet optional)
  ✅ Keeps badges (image-based check + CASA mark)
  ✅ Landlord page “More options” dropdown + CASA embed modal w/ fractional stars
  ✅ Sign in: landlord + user login UI with Apple/Google/Microsoft options (demo-safe)
  ✅ Menu ONLY on mobile (desktop hides hamburger + drawer)
*/

/* -----------------------------
  Global hardening + Safety net
------------------------------ */
(function installSafetyNet() {
const showOverlayError = (title, err) => {
try {
console.error(title, err);

const el = document.getElementById("app");
if (!el) return;

let msg = "";
try {
if (err && (err.stack || err.message)) msg = String(err.stack || err.message);
else if (typeof err === "string") msg = err;
else msg = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
} catch {
msg = String(err);
}
el.innerHTML = `
       <section class="pageCard card">
         <div class="pad">
           <div class="kicker">CASA</div>

           <div class="pageTitle" style="margin-top:6px;">Something went wrong</div>
           <div class="pageSub" style="margin-top:8px;">
             The app hit an error and stopped rendering.
           </div>

           <div class="hr"></div>

           <div class="smallNote"
                style="white-space:pre-wrap;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,'Liberation Mono','Courier New', monospace;">
${String(title || "Error")}
${msg}
           </div>

           <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
             <a class="btn btn--primary" href="#/">Go Home</a>
             <button class="btn" id="reloadBtn" type="button">Reload</button>
             <button class="btn" id="resetBtn" type="button">Reset demo data</button>
           </div>

           <div class="tiny" style="margin-top:10px;">
             Tip: open DevTools → Console to see the full error log.
           </div>
         </div>
       </section>
     `;

const rb = document.getElementById("reloadBtn");
const xb = document.getElementById("resetBtn");

rb && rb.addEventListener("click", () => location.reload());
xb &&
xb.addEventListener("click", () => {
try {
localStorage.removeItem("casa_demo_v2");
localStorage.removeItem("casa_demo_v1");
location.reload();
} catch {}
});
} catch {}
};

window.addEventListener("error", (e) =>
showOverlayError(
"Uncaught error",
e && (e.error || e.message) ? e.error || e.message : e
)
);

window.addEventListener("unhandledrejection", (e) => {
try {
const r = e && "reason" in e ? e.reason : e;

// iOS Safari often throws benign abort/load-failed rejections during map/tile teardown.
const name = r && r.name ? String(r.name) : "";
const msg = r && (r.message || r.stack) ? String(r.message || r.stack) : String(r || "");

const looksBenign =
name === "AbortError" ||
/aborted/i.test(msg) ||
/load failed/i.test(msg) ||
/The operation was aborted/i.test(msg);

if (looksBenign) {
console.warn("Ignored benign promise rejection:", r);
// prevent default logging noise
try { e && e.preventDefault && e.preventDefault(); } catch {}
return;
}

showOverlayError("Unhandled promise rejection", r);
} catch (err) {
// If our handler fails, fall back to the overlay
showOverlayError("Unhandled promise rejection (handler failed)", err);
}
});
})();

/* -----------------------------
  Storage / Seed / Migration
------------------------------ */
const LS_KEY = "casa_demo_v2";
const LEGACY_LS_KEY = "casa_demo_v1";
const BADGE_VER = "1";

function safeParseJSON(raw) {
try {
return JSON.parse(raw);
} catch {
return null;
}
}

function loadDB() {
// v2
try {
const raw = localStorage.getItem(LS_KEY);
if (raw) {
const parsed = safeParseJSON(raw);
if (parsed && typeof parsed === "object") return normalizeDB(parsed);
}
} catch {}

// migrate legacy v1 if present
const legacy = safeParseJSON(localStorage.getItem(LEGACY_LS_KEY) || "");
if (legacy && legacy.landlords && legacy.reviews) {
const migrated = migrateLegacyToV2(legacy);
saveDB(migrated);
return migrated;
}

return seedDB();
}

function saveDB(db) {
try {
localStorage.setItem(LS_KEY, JSON.stringify(db));
} catch {}
}

function seedDB() {
const now = Date.now();

const landlords = [
{
id: "l1",
name: "Northside Properties",
entity: "",
isVerified: true,
isTop: false,
verified: true,
top: false,
createdAt: now - 1000 * 60 * 60 * 24 * 16,
},
{
id: "l2",
name: "Park Ave Management",
entity: "Park Ave Management LLC",
isVerified: false,
isTop: false,
verified: false,
top: false,
createdAt: now - 1000 * 60 * 60 * 24 * 28,
},
{
id: "l3",
name: "Elmhurst Holdings",
entity: "",
isVerified: true,
isTop: true,
verified: true,
top: true,
createdAt: now - 1000 * 60 * 60 * 24 * 35,
},
];

const properties = [
{
id: "p1",
landlordId: "l1",
address: { line1: "123 Main St", unit: "", city: "Brooklyn", state: "NY" },
borough: "Brooklyn",
lat: 40.7081,
lng: -73.9571,
createdAt: now - 1000 * 60 * 60 * 24 * 16,
},
{
id: "p2",
landlordId: "l2",
address: { line1: "22 Park Ave", unit: "", city: "New York", state: "NY" },
borough: "Manhattan",
lat: 40.7433,
lng: -73.9822,
createdAt: now - 1000 * 60 * 60 * 24 * 28,
},
{
id: "p3",
landlordId: "l3",
address: { line1: "86-12 Broadway", unit: "", city: "Queens", state: "NY" },
borough: "Queens",
lat: 40.7404,
lng: -73.8794,
createdAt: now - 1000 * 60 * 60 * 24 * 35,
},
// demonstrate multiple properties for one landlord:
{
id: "p4",
landlordId: "l3",
address: { line1: "41-12 75th St", unit: "", city: "Queens", state: "NY" },
borough: "Queens",
lat: 40.7462,
lng: -73.8892,
createdAt: now - 1000 * 60 * 60 * 24 * 20,
},
];

const reviews = [
// landlord reviews
{
id: "r1",
targetType: "landlord",
targetId: "l1",
stars: 4,
text:
"Work orders were acknowledged quickly. A leak was fixed within a week. Noise policy was enforced inconsistently.",
createdAt: now - 1000 * 60 * 60 * 24 * 11,
},
{
id: "r2",
targetType: "landlord",
targetId: "l2",
stars: 3,
text:
"Great location, but communication was slow. Security deposit itemization took weeks.",
createdAt: now - 1000 * 60 * 60 * 24 * 45,
},
{
id: "r3",
targetType: "landlord",
targetId: "l3",
stars: 5,
text: "Responsive management. Clear lease terms and quick repairs.",
createdAt: now - 1000 * 60 * 60 * 24 * 6,
},
{
id: "r4",
targetType: "landlord",
targetId: "l3",
stars: 5,
text: "Fast maintenance and respectful staff.",
createdAt: now - 1000 * 60 * 60 * 24 * 18,
},
{
id: "r5",
targetType: "landlord",
targetId: "l3",
stars: 4,
text: "Solid experience overall; minor delays during holidays.",
createdAt: now - 1000 * 60 * 60 * 24 * 58,
},

// property reviews (separate from landlord)
{
id: "r6",
targetType: "property",
targetId: "p3",
stars: 4,
text: "Building is quiet and clean. Elevator had occasional downtime.",
createdAt: now - 1000 * 60 * 60 * 24 * 9,
},
{
id: "r7",
targetType: "property",
targetId: "p4",
stars: 2,
text: "Heat issues in winter and slow hallway lighting repairs.",
createdAt: now - 1000 * 60 * 60 * 24 * 32,
},
];

const reports = [
{
landlordId: "l1",
updatedAt: now - 1000 * 60 * 60 * 24 * 2,
violations_12mo: 7,
complaints_12mo: 22,
bedbug_reports_12mo: 1,
hp_actions: 0,
permits_open: 2,
eviction_filings_12mo: 1,
notes: "Data is demo only. Production: pull from city datasets + add sources.",
},
{
landlordId: "l2",
updatedAt: now - 1000 * 60 * 60 * 24 * 4,
violations_12mo: 18,
complaints_12mo: 49,
bedbug_reports_12mo: 3,
hp_actions: 1,
permits_open: 4,
eviction_filings_12mo: 6,
notes: "Data is demo only. Production: pull from city datasets + add sources.",
},
{
landlordId: "l3",
updatedAt: now - 1000 * 60 * 60 * 24 * 1,
violations_12mo: 2,
complaints_12mo: 9,
bedbug_reports_12mo: 0,
hp_actions: 0,
permits_open: 1,
eviction_filings_12mo: 0,
notes: "Data is demo only. Production: pull from city datasets + add sources.",
},
];

const db = {
landlords,
properties,
reviews,
reports,
flags: [],
replies: [],
landlordUsers: [],
users: [],
currentUserId: "",
currentLandlordUserId: "",
};
saveDB(db);
return db;
}

function normalizeDB(db) {
const out = {
landlords: Array.isArray(db.landlords) ? db.landlords : [],
properties: Array.isArray(db.properties) ? db.properties : [],
reviews: Array.isArray(db.reviews) ? db.reviews : [],
reports: Array.isArray(db.reports) ? db.reports : [],
flags: Array.isArray(db.flags) ? db.flags : [],
replies: Array.isArray(db.replies) ? db.replies : [],
landlordUsers: Array.isArray(db.landlordUsers) ? db.landlordUsers : [],
users: Array.isArray(db.users) ? db.users : [],
currentUserId: typeof db.currentUserId === "string" ? db.currentUserId : "",
currentLandlordUserId:
  typeof db.currentLandlordUserId === "string" ? db.currentLandlordUserId : "",
};

// ensure every review has targetType/targetId
out.reviews = out.reviews
.map((r) => {
if (r && r.targetType && r.targetId) return r;
if (r && r.landlordId) return { ...r, targetType: "landlord", targetId: r.landlordId };
if (r && r.propertyId) return { ...r, targetType: "property", targetId: r.propertyId };
return r;
})
.filter(Boolean);

// ensure every landlord has core fields
out.landlords = out.landlords
.map((l) => ({
id: String(l && l.id ? l.id : ""),
name: String(l && l.name ? l.name : ""),
entity: String(l && l.entity ? l.entity : ""),
isVerified: !!(l && (l.isVerified || l.verified)),
isTop: !!(l && (l.isTop || l.top)),
verified: !!(l && (l.isVerified || l.verified)),
top: !!(l && (l.isTop || l.top)),
createdAt: Number(l && l.createdAt ? l.createdAt : Date.now()),
}))
.filter((l) => l.id && l.name);

// ensure every property has core fields
out.properties = out.properties
.map((p) => ({
id: String(p && p.id ? p.id : ""),
landlordId: String(p && p.landlordId ? p.landlordId : ""),
address: {
line1: String(p && p.address && p.address.line1 ? p.address.line1 : ""),
unit: String(p && p.address && p.address.unit ? p.address.unit : ""),
city: String(p && p.address && p.address.city ? p.address.city : ""),
state: String(p && p.address && p.address.state ? p.address.state : ""),
},
borough: String(p && p.borough ? p.borough : ""),
lat: typeof (p && p.lat) === "number" ? p.lat : null,
lng: typeof (p && p.lng) === "number" ? p.lng : null,
createdAt: Number(p && p.createdAt ? p.createdAt : Date.now()),
}))
.filter((p) => p.id && p.address && p.address.line1);

// ensure every user has core fields
out.users = out.users
.map((u) => ({
id: String(u && u.id ? u.id : ""),
email: String(u && u.email ? u.email : ""),
createdAt: Number(u && u.createdAt ? u.createdAt : Date.now()),
}))
.filter((u) => u.id && u.email);

if (out.currentUserId && !out.users.find((u) => u.id === out.currentUserId)) {
out.currentUserId = "";
}
if (
out.currentLandlordUserId &&
!out.landlordUsers.find((u) => u.id === out.currentLandlordUserId)
) {
out.currentLandlordUserId = "";
}

return out;
}

function migrateLegacyToV2(legacy) {
const now = Date.now();

const landlords = (legacy.landlords || [])
.map((l) => ({
id: String(l && l.id ? l.id : "l" + Math.random().toString(16).slice(2)),
name: String(l && l.name ? l.name : ""),
entity: String(l && l.entity ? l.entity : ""),
isVerified: !!(l && (l.isVerified || l.verified)),
isTop: !!(l && (l.isTop || l.top)),
verified: !!(l && (l.isVerified || l.verified)),
top: !!(l && (l.isTop || l.top)),
createdAt: Number(l && l.createdAt ? l.createdAt : now),
}))
.filter((l) => l.id && l.name);

// create 1 property per legacy landlord (from legacy address/lat/lng)
const properties = landlords
.map((l) => {
const legacyL =
(legacy.landlords || []).find((x) => String(x && x.id ? x.id : "") === l.id) || {};
return {
id: "p" + Math.random().toString(16).slice(2),
landlordId: l.id,
address: {
line1: String(legacyL && legacyL.address && legacyL.address.line1 ? legacyL.address.line1 : ""),
unit: String(legacyL && legacyL.address && legacyL.address.unit ? legacyL.address.unit : ""),
city: String(legacyL && legacyL.address && legacyL.address.city ? legacyL.address.city : ""),
state: String(legacyL && legacyL.address && legacyL.address.state ? legacyL.address.state : ""),
},
borough: String(legacyL && legacyL.borough ? legacyL.borough : ""),
lat: typeof (legacyL && legacyL.lat) === "number" ? legacyL.lat : 40.73,
lng: typeof (legacyL && legacyL.lng) === "number" ? legacyL.lng : -73.95,
createdAt: Number(legacyL && legacyL.createdAt ? legacyL.createdAt : now),
};
})
.filter((p) => p.address && p.address.line1);

// migrate reviews -> landlord reviews
const reviews = (legacy.reviews || [])
.map((r) => ({
id: String(r && r.id ? r.id : "r" + Math.random().toString(16).slice(2)),
targetType: "landlord",
targetId: String(r && r.landlordId ? r.landlordId : ""),
stars: Math.max(1, Math.min(5, Number(r && r.stars ? r.stars : 5))),
text: String(r && r.text ? r.text : ""),
createdAt: Number(r && r.createdAt ? r.createdAt : now),
}))
.filter((r) => r.targetId);

const reports = Array.isArray(legacy.reports) ? legacy.reports : [];
return normalizeDB({
landlords,
properties,
reviews,
reports,
flags: [],
replies: [],
landlordUsers: [],
users: [],
currentUserId: "",
});
}

let DB = loadDB();
// iOS/Safari safe: CSS.escape polyfill (prevents crashes in querySelector)
if (typeof window.CSS === "undefined") window.CSS = {};
if (typeof window.CSS.escape !== "function") {
window.CSS.escape = function (value) {
return String(value).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, (ch) => "\\" + ch);
};
}


/* -----------------------------
  Helpers
------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);

function esc(s) {
return String(s ?? "").replace(/[&<>"']/g, (c) => {
return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
});
}

function fmtDate(ts) {
const d = new Date(ts);
return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function round1(n) {
return Math.round(n * 10) / 10;
}

function norm(s) {
return String(s || "").trim().toLowerCase();
}

function landlordForCompany(company) {
const c = norm(company);
if (!c) return null;
return (
DB.landlords.find((l) => l && (norm(l.name) === c || norm(l.entity) === c)) || null
);
}

function canLandlordRespond(landlordId) {
if (!landlordId) return false;
const user = currentLandlordUser();
if (!user || !user.verified) return false;
const l = DB.landlords.find((x) => x && x.id === landlordId);
if (!l) return false;
const match = landlordForCompany(user.company);
return !!(match && match.id === l.id);
}

function idRand(prefix) {
return prefix + Math.random().toString(16).slice(2);
}

function persist() {
saveDB(DB);
}

function currentUser() {
const id = DB.currentUserId || "";
if (!id) return null;
return (DB.users || []).find((u) => u && u.id === id) || null;
}

function isUserSignedIn() {
return !!currentUser();
}

function currentLandlordUser() {
const id = DB.currentLandlordUserId || "";
if (!id) return null;
return (DB.landlordUsers || []).find((u) => u && u.id === id) || null;
}

function isLandlordSignedIn() {
return !!currentLandlordUser();
}

function parseId(id) {
try {
return decodeURIComponent(String(id || ""));
} catch {
return String(id || "");
}
}

/* -----------------------------
  Search haystacks
------------------------------ */
function landlordHaystack(l) {
return norm(`${l.name} ${l.entity || ""}`);
}

function propertyHaystack(p) {
const a = p.address || {};
return norm(`${a.line1 || ""} ${a.unit || ""} ${a.city || ""} ${a.state || ""} ${p.borough || ""}`);
}

function findExactLandlord(query) {
const q = norm(query);
if (!q) return null;
const exact = DB.landlords.filter((l) => norm(l.name) === q || norm(l.entity) === q);
return exact.length === 1 ? exact[0] : null;
}

function findExactProperty(query) {
const q = norm(query);
if (!q) return null;
const exact = DB.properties.filter((p) => norm((p.address && p.address.line1) || "") === q);
return exact.length === 1 ? exact[0] : null;
}

/* -----------------------------
  Ratings
------------------------------ */
/* Recency-weighted average (half-life 180 days) */
function weightedAverageStars(reviews) {
if (!reviews.length) return null;
const now = Date.now();
const halfLifeDays = 180;

let num = 0;
let den = 0;

for (const r of reviews) {
const ageDays = Math.max(0, (now - r.createdAt) / (1000 * 60 * 60 * 24));
const w = Math.pow(0.5, ageDays / halfLifeDays);
num += r.stars * w;
den += w;
}
if (!den) return null;
return num / den;
}

function reviewsFor(targetType, targetId) {
return DB.reviews
.filter((r) => r.targetType === targetType && r.targetId === targetId)
.sort((a, b) => b.createdAt - a.createdAt);
}

function ratingStats(targetType, targetId) {
const rs = reviewsFor(targetType, targetId);
const count = rs.length;

if (count === 0) return { count: 0, avg: null, avgRounded: null, dist: [0, 0, 0, 0, 0] };

const avg = weightedAverageStars(rs);
const avgRounded = round1(avg);
const dist = [0, 0, 0, 0, 0];
for (const r of rs) dist[r.stars - 1] += 1;

return { count, avg, avgRounded, dist };
}

/* -----------------------------
  Property media (Google Maps embed)
------------------------------ */
function buildFullAddress(p) {
const line =
p?.addressLine ||
(typeof p?.address === "string" ? p.address : "") ||
p?.street ||
p?.line1 ||
p?.propertyAddress ||
"";

const addrObj = p && typeof p.address === "object" ? p.address : null;
const addrLine1 = addrObj && addrObj.line1 ? String(addrObj.line1) : "";
const addrUnit = addrObj && addrObj.unit ? String(addrObj.unit) : "";
const addrLine = addrLine1 && addrUnit ? `${addrLine1}, ${addrUnit}` : addrLine1 || "";

const city = p?.city || (addrObj && addrObj.city) || "";
const state = p?.state || p?.st || (addrObj && addrObj.state) || "";
const zip = p?.zip || p?.postal || p?.postalCode || (addrObj && addrObj.zip) || "";

const parts = [addrLine || line, city, state, zip]
.map((v) => String(v || "").trim())
.filter(Boolean);

return parts.join(", ");
}

function googleMapsEmbedSrc(address) {
const q = encodeURIComponent(String(address || "").trim());
return `https://www.google.com/maps?q=${q}&output=embed`;
}

function googleMapsLink(address) {
const q = encodeURIComponent(String(address || "").trim());
return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function renderPropertyMediaCard(p) {
const addr = buildFullAddress(p);
if (!addr) {
return `
       <section class="pageCard card">
         <div class="pad">
           <div class="sectionLabel">PROPERTY LOCATION</div>
           <div class="muted">No address available for map preview.</div>
         </div>
       </section>
     `.trim();
}

const src = googleMapsEmbedSrc(addr);
const link = googleMapsLink(addr);

return `
     <section class="pageCard card">
       <div class="pad">
         <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
           <div class="sectionLabel">PROPERTY LOCATION</div>
           <a class="btn miniBtn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">
             Open in Google Maps
           </a>
         </div>

         <div class="mapEmbedWrap" style="margin-top:12px;">
           <div class="mediaPlaceholder" id="mapEmbedFallback" style="display:none;">
             <div class="muted">Map preview unavailable.</div>
           </div>
           <iframe
             class="mapEmbedFrame"
             id="mapEmbedFrame"
             src="${esc(src)}"
             loading="lazy"
             referrerpolicy="no-referrer-when-downgrade"
             style="border:0; width:100%; height:420px; border-radius:16px;"
             allowfullscreen
           ></iframe>
         </div>

         <div class="muted mini" style="margin-top:8px;">Map preview (Google Maps)</div>
       </div>
     </section>
   `.trim();
}

function initPropertyMediaEmbed() {
const frame = document.getElementById("mapEmbedFrame");
const fallback = document.getElementById("mapEmbedFallback");
if (!frame || !fallback) return;

const showFallback = () => {
fallback.style.display = "flex";
frame.style.display = "none";
};

let loaded = false;
const timer = setTimeout(() => {
if (!loaded) showFallback();
}, 5000);

frame.addEventListener("error", () => {
clearTimeout(timer);
showFallback();
});
frame.addEventListener("load", () => {
loaded = true;
clearTimeout(timer);
fallback.style.display = "none";
frame.style.display = "block";
});
}

function cardTier(avgRounded, reviewCount) {
if (!reviewCount) return { tier: "none", label: "Unrated", pillClass: "" };
const r = avgRounded;

if (r >= 1.0 && r <= 2.99) return { tier: "red", label: "Low Rating", pillClass: "pill--red" };
if (r > 2.99 && r <= 3.99) return { tier: "yellow", label: "Mixed Reviews", pillClass: "pill--yellow" };
if (r >= 4.0 && r <= 5.0) return { tier: "green", label: "Highly Rated", pillClass: "pill--green" };

return { tier: "none", label: "Unrated", pillClass: "" };
}

function casaCredentialForLandlord(landlordId) {
const rs = reviewsFor("landlord", landlordId);
const now = Date.now();
const last12mo = rs.filter((r) => now - r.createdAt <= 365 * 24 * 60 * 60 * 1000);
const total = rs.length;
const in12 = last12mo.length;

if (total === 0) return "Unrated";
if (!(total >= 10 && in12 >= 3)) return "Not yet CASA Rated — needs more reviews";
return "CASA Rated";
}

/* -----------------------------
  Badges
------------------------------ */
const badgeWarned = new Set();

function badgeImg(src, alt, title, fallbackText, landlordId, kind) {
const srcWithVer = `${src}?v=${BADGE_VER}`;
const altSrcWithVer = `./${src}?v=${BADGE_VER}`;
return `
   <img
     class="badgeIcon"
     src="${esc(srcWithVer)}"
     alt="${esc(alt)}"
     title="${esc(title)}"
     data-badge-step="0"
     data-badge-alt-src="${esc(altSrcWithVer)}"
     data-badge-fallback="${esc(fallbackText)}"
     data-badge-kind="${esc(kind)}"
     data-badge-landlord="${esc(landlordId)}"
     onerror="handleBadgeImgError(this)"
   />
   <span class="badgeFallback" style="display:none;">${esc(fallbackText)}</span>
 `.trim();
}

function handleBadgeImgError(img) {
try {
if (!img) return;
const step = img.getAttribute("data-badge-step") || "0";
if (step === "0") {
img.setAttribute("data-badge-step", "1");
const altSrc = img.getAttribute("data-badge-alt-src");
if (altSrc) img.src = altSrc;
return;
}

img.style.display = "none";
const fallback = img.nextElementSibling;
if (fallback && fallback.classList.contains("badgeFallback")) {
fallback.style.display = "inline-flex";
}

const landlordId = img.getAttribute("data-badge-landlord") || "unknown";
const kind = img.getAttribute("data-badge-kind") || "unknown";
const warnKey = `${landlordId}:${kind}`;
if (!badgeWarned.has(warnKey)) {
badgeWarned.add(warnKey);
console.warn(`[badge] failed to load for landlord ${landlordId}: ${kind}`);
}
} catch {}
}

function renderBadges(landlord) {
if (!landlord) return "";
const parts = [];
const landlordId = landlord.id || "";
if (landlord.isVerified) {
parts.push(
badgeImg(
"assets/badge-verified.png",
"Verified",
"Verified landlord",
"Verified",
landlordId,
"verified"
)
);
}
if (landlord.isTop) {
parts.push(
badgeImg(
"assets/badge-top.png",
"Top landlord",
"Top landlord",
"Top",
landlordId,
"top"
)
);
}
if (!parts.length) return "";
return `<span class="badgeRow">${parts.join("")}</span>`;
}

/* Brand font (matches header) */
function casaBrandFontInlineCSS() {
return [
"font-family: ui-serif, Georgia, 'Times New Roman', Times, serif",
"font-style: italic",
"font-weight: 650",
"letter-spacing: -0.02em",
"text-transform: lowercase",
].join("; ");
}

/* -----------------------------
  Embed snippet (fractional stars)
------------------------------ */
function casaEmbedSnippetForLandlord(l) {
const st = ratingStats("landlord", l.id);
const avg = st.count ? Number(st.avg || 0) : 0;
const avgClamped = Math.max(0, Math.min(5, avg));
const avgText = st.count ? avgClamped.toFixed(1) : "0.0";

const siteBase = "https://justinstepensky.github.io/ratemylandlord/";
const profileURL = `${siteBase}#/landlord/${encodeURIComponent(l.id)}`;
const brandCSS = casaBrandFontInlineCSS();

function starRowSVG(value, px = 16, gap = 4) {
const v = Math.max(0, Math.min(5, Number(value) || 0));
const full = Math.floor(v);
const frac = v - full;

const starPath =
"M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

const scale = px / 24;
const step = px + gap;
const width = px * 5 + gap * 4;

const stars = [];
for (let i = 0; i < 5; i++) {
let fillPct = 0;
if (i < full) fillPct = 1;
else if (i === full) fillPct = frac;

const gid = `casaStarGrad_${Math.random().toString(16).slice(2)}_${i}`;
const x = i * step;

stars.push(`
       <g transform="translate(${x},0) scale(${scale})">
         <defs>
           <linearGradient id="${gid}" x1="0" y1="0" x2="24" y2="0" gradientUnits="userSpaceOnUse">
             <stop offset="${(fillPct * 100).toFixed(2)}%" stop-color="#b88900" stop-opacity="1"></stop>
             <stop offset="${(fillPct * 100).toFixed(2)}%" stop-color="#15110e" stop-opacity="0.22"></stop>
           </linearGradient>
         </defs>
         <path d="${starPath}" fill="url(#${gid})"></path>
       </g>
     `);
}

return `
     <svg width="${width}" height="${px}"
          viewBox="0 0 ${width} ${px}"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style="display:inline-block; vertical-align:middle;">
       ${stars.join("")}
     </svg>
   `.trim();
}

const starsSVG = starRowSVG(avgClamped, 16, 4);

return `
   <a href="${profileURL}" target="_blank" rel="noopener noreferrer"
      style="
        display:inline-flex;
        align-items:center;
        gap:10px;
        padding:10px 14px;
        border-radius:999px;
        border:1px solid rgba(20,16,12,.14);
        background: rgba(255,255,255,.65);
        text-decoration:none;
        color: rgba(21,17,14,.9);
        box-shadow: 0 10px 26px rgba(20,16,12,.06);
        line-height:1;
        white-space:nowrap;
      ">
     <span style="${brandCSS}; font-size:14px; display:inline-flex; align-items:baseline; white-space:nowrap;">
       <span>Rated on&nbsp;</span><span style="${brandCSS};">casa</span>
     </span>

     <span style="
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        font-weight: 900;
        font-size:13px;
        color: rgba(21,17,14,.72);
        display:inline-flex;
        align-items:center;
        white-space:nowrap;
      ">
       <span style="margin-right:8px;">•</span>
       ${starsSVG}
       <span style="margin-left:8px;">${avgText}/5</span>
     </span>
   </a>
 `.trim();
}

/* -----------------------------
  Reports + SEO title
------------------------------ */
function reportFor(landlordId) {
return (DB.reports || []).find((r) => r.landlordId === landlordId) || null;
}

function setPageTitle(title) {
try {
document.title = title ? `${title} • casa` : "casa";
} catch {}
}

/* -----------------------------
  Dropdown helpers
------------------------------ */
function closeInlineDropdown() {
const dd = document.getElementById("moreDropdown");
const btn = document.getElementById("moreBtn");
if (!dd || !btn) return;
dd.style.display = "none";
btn.setAttribute("aria-expanded", "false");
}
function toggleInlineDropdown() {
const dd = document.getElementById("moreDropdown");
const btn = document.getElementById("moreBtn");
if (!dd || !btn) return;
const isOpen = dd.style.display === "block";
if (isOpen) closeInlineDropdown();
else {
dd.style.display = "block";
btn.setAttribute("aria-expanded", "true");
}
}

/* -----------------------------
  Drawer (mobile) — safe if not present
------------------------------ */
function fixDrawerBubbles() {
const drawer = document.getElementById("drawer");
if (!drawer) return;

// Find the 3 primary action links/buttons in the drawer:
// (We match common patterns: data-drawer-link, hrefs, or visible text.)
const candidates = Array.from(drawer.querySelectorAll("a, button")).filter((el) => {
const t = (el.textContent || "").trim().toLowerCase();
const href = (el.getAttribute && el.getAttribute("href")) || "";
const isActionText =
t === "search" || t === "review" || t === "rent";
const isActionHref =
href.includes("#/search") || href.includes("#/add") || href.includes("#/rent");
const isDrawerLinkAttr =
el.hasAttribute && (el.hasAttribute("data-drawer-link") || el.hasAttribute("data-drawerlink"));

return isActionText || isActionHref || isDrawerLinkAttr;
});

// Keep only first 3 unique (Search/Review/Rent)
const picked = [];
const seen = new Set();
for (const el of candidates) {
const key = ((el.textContent || "").trim().toLowerCase()) || (el.getAttribute("href") || "");
if (!key || seen.has(key)) continue;
seen.add(key);
picked.push(el);
if (picked.length >= 3) break;
}

if (picked.length < 2) return; // nothing to fix

// Create (or reuse) a dedicated row wrapper
let row = drawer.querySelector(".drawerBubbleRow");
if (!row) {
row = document.createElement("div");
row.className = "drawerBubbleRow";
// Put it near the top of the drawer content
drawer.prepend(row);
} else {
row.innerHTML = "";
}

// Move the picked elements into the row
picked.forEach((el) => row.appendChild(el));
}

function initDrawer() {
const btn = $("#menuBtn");
const drawer = $("#drawer");
const overlay = $("#drawerOverlay");
const closeBtn = $("#drawerClose");
if (!btn || !drawer || !overlay || !closeBtn) return;
fixDrawerBubbles();

function open() {
drawer.classList.add("isOpen");
overlay.classList.add("isOpen");
drawer.setAttribute("aria-hidden", "false");
overlay.setAttribute("aria-hidden", "false");
}
function close() {
drawer.classList.remove("isOpen");
overlay.classList.remove("isOpen");
drawer.setAttribute("aria-hidden", "true");
overlay.setAttribute("aria-hidden", "true");
}

btn.addEventListener("click", open);
closeBtn.addEventListener("click", close);
overlay.addEventListener("click", close);
drawer.addEventListener("click", (e) => {
const a = e.target.closest("[data-drawer-link]");
if (a) close();
});

window.addEventListener("resize", () => {
if (window.innerWidth >= 981) close();
});
}

/* -----------------------------
  Modal — requires #modalOverlay (safe if absent)
------------------------------ */
function openModal(innerHTML) {
const overlay = $("#modalOverlay");
if (!overlay) return;

overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${innerHTML}</div>`;
overlay.classList.add("isOpen");
overlay.setAttribute("aria-hidden", "false");
document.body.style.overflow = "hidden";

const handler = (e) => {
if (e.target === overlay) closeModal();
};
overlay.addEventListener("click", handler, { once: true });
}
function closeModal() {
const overlay = $("#modalOverlay");
if (!overlay) return;
overlay.classList.remove("isOpen");
overlay.setAttribute("aria-hidden", "true");
overlay.innerHTML = "";
document.body.style.overflow = "";
}

/* Embed modal */
function openBadgeEmbedModal(landlordId) {
const l = DB.landlords.find((x) => x.id === landlordId);
if (!l) return;

const snippet = casaEmbedSnippetForLandlord(l);

openModal(`
   <div class="modalHead">
     <div class="modalTitle">CASA badge embed</div>
     <button class="iconBtn" id="mClose" aria-label="Close" type="button">×</button>
   </div>

   <div class="modalBody">
     <div class="tiny" style="margin-bottom:12px;">
       Copy/paste this into a website or listing description. It links to your CASA profile.
     </div>

     <div class="field">
       <label>Preview</label>
       <div class="card" style="box-shadow:none;">
         <div class="pad" id="embedPreview"></div>
       </div>
     </div>

     <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
       <button class="btn btn--primary" id="copyEmbed" type="button">Copy embed</button>
       <button class="btn" id="toggleHTML" type="button">Show HTML</button>
     </div>

     <div class="field" id="htmlWrap" style="display:none;">
       <label>HTML snippet</label>
       <textarea class="textarea" id="embedBox" spellcheck="false" readonly></textarea>
     </div>
   </div>

   <div class="modalFoot">
     <button class="btn" id="mDone" type="button">Close</button>
   </div>
 `);

$("#mClose")?.addEventListener("click", closeModal);
$("#mDone")?.addEventListener("click", closeModal);

const prev = $("#embedPreview");
if (prev) prev.innerHTML = snippet;

const box = $("#embedBox");
if (box) box.value = snippet;

$("#copyEmbed")?.addEventListener("click", async () => {
const tryExecCommand = () => {
try {
if (box && box.focus) box.focus();
if (box && box.select) box.select();
const ok = document.execCommand && document.execCommand("copy");
return !!ok;
} catch {
return false;
}
};

try {
// iOS Safari often blocks clipboard API; only attempt if available
if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
await navigator.clipboard.writeText(snippet);
alert("Copied embed HTML!");
return;
}
} catch {
// fall through to execCommand
}

const ok = tryExecCommand();
if (ok) alert("Copied embed HTML!");
else {
// last-resort: show HTML box so user can long-press copy
const wrap = $("#htmlWrap");
const toggle = $("#toggleHTML");
if (wrap) wrap.style.display = "block";
if (toggle) toggle.textContent = "Hide HTML";
alert("Tap & hold to copy from the HTML box.");
}
});

$("#toggleHTML")?.addEventListener("click", () => {
const wrap = $("#htmlWrap");
const btn = $("#toggleHTML");
if (!wrap || !btn) return;
const shown = wrap.style.display !== "none";
wrap.style.display = shown ? "none" : "block";
btn.textContent = shown ? "Show HTML" : "Hide HTML";
});
}

/* -----------------------------
  Leaflet safe init
------------------------------ */
function leafletReady() {
return typeof window.L !== "undefined" && typeof window.L.map === "function";
}
/* -----------------------------
  Map Regions (NYC/MIA/LA/CHI)
------------------------------ */
const REGION_KEY = "casa_region_v1";

const REGIONS = {
NYC: { label: "NYC", center: [40.73, -73.95], zoom: 11, states: ["NY"] },
MIA: { label: "Miami", center: [25.7617, -80.1918], zoom: 11, states: ["FL"] },
LA:  { label: "Los Angeles",  center: [34.0522, -118.2437], zoom: 10, states: ["CA"] },
CHI: { label: "Chicago", center: [41.8781, -87.6298], zoom: 11, states: ["IL"] },
BOS: { label: "Boston", center: [42.3601, -71.0589], zoom: 11, states: ["MA"] },
};

function getRegionKey() {
const raw = (localStorage.getItem(REGION_KEY) || "").toUpperCase();
return REGIONS[raw] ? raw : "NYC";
}

function setRegionKey(key) {
const k = String(key || "").toUpperCase();
const safe = REGIONS[k] ? k : "NYC";
try { localStorage.setItem(REGION_KEY, safe); } catch {}
}

function regionFromState(state) {
const s = String(state || "").trim().toUpperCase();
if (!s) return null;
for (const [k, cfg] of Object.entries(REGIONS)) {
if ((cfg.states || []).includes(s)) return k;
}
return null;
}

function filterPropertiesByRegion(props, regionKey) {
const cfg = REGIONS[regionKey] || REGIONS.NYC;
const allowed = new Set((cfg.states || []).map((x) => String(x).toUpperCase()));
return props.filter((p) => {
const st = String((p.address && p.address.state) || "").toUpperCase();
return allowed.has(st);
});
}

function regionSelectorHTML(activeKey) {
const keys = Object.keys(REGIONS);
return `
   <div style="display:flex; gap:10px; flex-wrap:wrap;">
     ${keys
       .map((k) => {
         const isOn = k === activeKey;
         return `
           <button
             type="button"
             class="btn miniBtn ${isOn ? "btn--primary" : ""}"
             data-region-btn="${esc(k)}"
             aria-pressed="${isOn ? "true" : "false"}"
           >${esc(REGIONS[k].label)}</button>
         `.trim();
       })
       .join("")}
   </div>
 `.trim();
}

function wireRegionSelector(rootEl, onChange) {
if (!rootEl) return;
rootEl.querySelectorAll("[data-region-btn]").forEach((btn) => {
btn.addEventListener("click", () => {
const k = btn.getAttribute("data-region-btn");
if (!k) return;
setRegionKey(k);
onChange && onChange(k);
});
});
}

function initLeafletMap(el, center, zoom = 12) {
if (!el) return null;
if (!leafletReady()) {
console.warn("Leaflet not ready; skipping map init.");
return null;
}

// Cleanly remove any previous map instance attached to this element
try {
if (el._casaMap && typeof el._casaMap.remove === "function") {
el._casaMap.remove();
}
} catch {}

try {
const map = window.L
.map(el, { zoomControl: true, scrollWheelZoom: false })
.setView(center, zoom);

// keep reference so we can safely remove on re-render
try {
el._casaMap = map;
} catch {}

window.L
.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
maxZoom: 19,
attribution: "&copy; OpenStreetMap",
})
.addTo(map);

setTimeout(() => {
try {
map.invalidateSize();
} catch {}
}, 60);

return map;
} catch (e) {
console.error("Map init failed:", e);
return null;
}
}

/* -----------------------------
   Router
   Router (Hardened for mobile/iOS)
------------------------------ */
function route() {
const hash = location.hash || "#/";
const path = hash.replace("#", "");
const cleanPath = path.split("?")[0];
const parts = cleanPath.split("/").filter(Boolean);

const base = parts[0] || "";
const param = parts[1] || "";

if (!base) return renderHome();
if (base === "search") return renderSearch();
if (base === "add") return renderAdd();
if (base === "how") return renderHow();
if (base === "trust") return renderTrust();
if (base === "portal") return renderPortal();
if (base === "toolkit") return renderToolkit();
if (base === "landlord" && param) return renderLandlord(param);
if (base === "property" && param) return renderProperty(param);

renderHome();
}

/* Mobile-safe wrapper: NEVER let one crash kill rendering */
function safeRoute() {
  try {
    route();
  } catch (err) {
    try {
      console.error("Route crash:", err);

      // Try fallback render instead of dying
      try {
        renderHome();
        return;
      } catch (e2) {
        console.error("Fallback renderHome failed:", e2);
      }

      // If even fallback fails, show a minimal inline message (no recursion)
      const app = document.getElementById("app");
      if (app) {
        const msg = String(err && (err.stack || err.message) ? err.stack || err.message : err);
        app.innerHTML = `
          <section class="pageCard card">
            <div class="pad">
              <div class="kicker">CASA</div>
              <div class="pageTitle" style="margin-top:6px;">Something went wrong</div>
              <div class="pageSub" style="margin-top:8px;">
                The app hit an error and stopped rendering.
              </div>
              <div class="hr"></div>
              <div class="smallNote"
                   style="white-space:pre-wrap;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,'Liberation Mono','Courier New', monospace;">
Route error
${msg}
              </div>
              <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
                <a class="btn btn--primary" href="#/">Go Home</a>
                <button class="btn" type="button" onclick="location.reload()">Reload</button>
              </div>
            </div>
          </section>
        `;
      }
    } catch {}
  }
}

window.addEventListener("hashchange", safeRoute);
window.addEventListener("load", () => {
  initDrawer();
  initMobileOnlyMenu(); // ✅ new: hide hamburger/drawer on desktop
  safeRoute();
});

/* -----------------------------
  Mobile-only Menu (desktop hides)
------------------------------ */
function initMobileOnlyMenu() {
const btn = $("#menuBtn");
const drawer = $("#drawer");
const overlay = $("#drawerOverlay");

function apply() {
const isDesktop = window.innerWidth >= 981;
    // Hide hamburger + drawer + overlay on desktop (even if present in HTML)

    // Hide hamburger + drawer + overlay on desktop
if (btn) btn.style.display = isDesktop ? "none" : "";
if (drawer) drawer.style.display = isDesktop ? "none" : "";
if (overlay) overlay.style.display = isDesktop ? "none" : "";

    // Also ensure drawer isn't open on desktop
    // Ensure drawer isn't open on desktop
if (isDesktop) {
try {
drawer && drawer.classList.remove("isOpen");
overlay && overlay.classList.remove("isOpen");
        drawer && drawer.setAttribute("aria-hidden", "true");
        overlay && overlay.setAttribute("aria-hidden", "true");
} catch {}
}
}

apply();
window.addEventListener("resize", apply);
}

/* -----------------------------
  Components: Stars / cards
------------------------------ */
function starVisFromAvg(avgRounded) {
if (avgRounded == null) return "☆☆☆☆☆";
return avgRounded >= 4 ? "★★★★☆" : avgRounded >= 3 ? "★★★☆☆" : avgRounded >= 2 ? "★★☆☆☆" : "★☆☆☆☆";
}

function clampStars(n) {
const x = Number(n);
if (!Number.isFinite(x)) return 5;
return Math.max(1, Math.min(5, Math.round(x)));
}

function landlordCardHTML(l, opts = {}) {
const showView = opts && opts.showView === false ? false : true;

const st = ratingStats("landlord", l.id);
const avg = st.avgRounded;
const count = st.count;

const tier = cardTier(avg ?? 0, count);
const tintClass =
tier.tier === "green"
? "lc--green"
: tier.tier === "yellow"
? "lc--yellow"
: tier.tier === "red"
? "lc--red"
: "";

const avgText = avg == null ? "—" : avg.toFixed(1);
const stars = starVisFromAvg(avg);

const props = DB.properties.filter((p) => p.landlordId === l.id);
const propNote = props.length ? `${props.length} propert${props.length === 1 ? "y" : "ies"}` : "No properties yet";

return `
   <div class="lc ${tintClass}">
     <div class="lcLeft">
       <div class="lcName">
         <span>${esc(l.name)}</span>
         ${renderBadges(l)}
       </div>

       <div class="lcMeta">${esc(l.entity || propNote)}</div>

       <div class="lcRow">
         <span class="stars">${stars}</span>
         <span class="ratingNum">${esc(avgText)}</span>
         <span class="muted">(${count} review${count === 1 ? "" : "s"})</span>
       </div>
     </div>

     <div class="lcRight">
       ${count ? `<span class="pill ${esc(tier.pillClass)}">${esc(tier.label)}</span>` : `<span class="pill">Unrated</span>`}
       ${showView ? `<a class="btn btn--primary miniBtn" href="#/landlord/${esc(l.id)}">View</a>` : ``}
     </div>
   </div>
 `.trim();
}

function propertyCardHTML(p, opts = {}) {
const showView = opts && opts.showView === false ? false : true;

const st = ratingStats("property", p.id);
const avg = st.avgRounded;
const count = st.count;

const tier = cardTier(avg ?? 0, count);
const tintClass =
tier.tier === "green"
? "lc--green"
: tier.tier === "yellow"
? "lc--yellow"
: tier.tier === "red"
? "lc--red"
: "";

const avgText = avg == null ? "—" : avg.toFixed(1);
const stars = starVisFromAvg(avg);

const a = p.address || {};
const addr = `${a.line1 || ""}${a.unit ? `, ${a.unit}` : ""} • ${a.city || ""} • ${a.state || ""}`.replace(/\s•\s$/, "");

const ll = DB.landlords.find((l) => l.id === p.landlordId);

return `
   <div class="lc ${tintClass}">
     <div class="lcLeft">
       <div class="lcName">
         <span>${esc(a.line1 || "Address")}${a.unit ? `, ${esc(a.unit)}` : ""}</span>
       </div>

       <div class="lcMeta">${esc(addr)}</div>

       <div class="lcRow">
         <span class="stars">${stars}</span>
         <span class="ratingNum">${esc(avgText)}</span>
         <span class="muted">(${count} review${count === 1 ? "" : "s"})</span>
       </div>

       <div class="tiny" style="margin-top:8px;">
         Landlord: ${ll ? esc(ll.name) : "—"}
       </div>
     </div>

     <div class="lcRight">
       ${count ? `<span class="pill ${esc(tier.pillClass)}">${esc(tier.label)}</span>` : `<span class="pill">Unrated</span>`}
       ${showView ? `<a class="btn btn--primary miniBtn" href="#/property/${esc(p.id)}">View</a>` : ``}
     </div>
   </div>
 `.trim();
}

/* -----------------------------
  Highlights carousel (latest 5 across landlord+property)
------------------------------ */
let carouselTimer = null;

function highlightsData() {
return DB.reviews
.slice()
.sort((a, b) => b.createdAt - a.createdAt)
.slice(0, 5)
.map((r) => {
if (r.targetType === "landlord") {
const l = DB.landlords.find((x) => x.id === r.targetId);
return l
? {
r,
kind: "landlord",
title: l.name,
href: `#/landlord/${l.id}`,
badgeHTML: renderBadges(l),
}
: null;
}
if (r.targetType === "property") {
const p = DB.properties.find((x) => x.id === r.targetId);
if (!p) return null;
const a = p.address || {};
const title = `${a.line1 || "Address"}${a.unit ? `, ${a.unit}` : ""}`;
return { r, kind: "property", title, href: `#/property/${p.id}`, badgeHTML: "" };
}
return null;
})
.filter(Boolean);
}

function renderHighlightsCarousel() {
const items = highlightsData();
if (items.length === 0) {
return `
     <div class="carousel">
       <div class="carouselSlide">
         <div class="muted">No highlights yet.</div>
       </div>
     </div>
   `.trim();
}

const slides = items
.map((it) => {
const r = it.r;
const st = ratingStats(r.targetType, r.targetId);
const tier = cardTier(st.avgRounded ?? 0, st.count);
const tintClass =
tier.tier === "green"
? "lc--green"
: tier.tier === "yellow"
? "lc--yellow"
: tier.tier === "red"
? "lc--red"
: "";

const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
const starVis = starVisFromAvg(st.avgRounded);

return `
       <div class="carouselSlide">
         <div class="lc ${tintClass}">
           <div class="lcLeft">
             <div class="lcName">
               <span>${esc(it.title)}</span>
               ${it.badgeHTML || ""}
             </div>
             <div class="lcMeta">${esc(fmtDate(r.createdAt))}</div>

             <div class="lcRow">
               <span class="stars">${starVis}</span>
               <span class="ratingNum">${esc(avgText)}</span>
               <span class="muted">(${st.count} review${st.count === 1 ? "" : "s"})</span>
             </div>

             <div class="smallNote">${esc(r.text)}</div>
           </div>

           <div class="lcRight">
             ${st.count ? `<span class="pill ${esc(tier.pillClass)}">${esc(tier.label)}</span>` : `<span class="pill">Unrated</span>`}
             <a class="btn btn--primary miniBtn" href="${esc(it.href)}">View</a>
           </div>
         </div>
       </div>
     `.trim();
})
.join("");

const dots = items
.map(
(_, i) =>
`<span class="dot ${i === 0 ? "isActive" : ""}" data-dot="${i}" aria-label="Go to slide ${i + 1}"></span>`
)
.join("");

return `
   <div class="carousel" id="highCarousel">
     <div class="carouselTrack" id="highTrack">${slides}</div>
     <div class="dots" id="highDots">${dots}</div>
   </div>
 `.trim();
}

function setupCarousel() {
const wrap = $("#highCarousel");
if (!wrap) return;

const items = highlightsData();
const track = $("#highTrack");
const dots = Array.from(document.querySelectorAll("#highDots .dot"));

if (!track || dots.length === 0 || items.length <= 1) {
if (carouselTimer) clearInterval(carouselTimer);
carouselTimer = null;
return;
}

let idx = 0;

function go(n) {
idx = (n + items.length) % items.length;
track.style.transform = `translateX(${-idx * 100}%)`;
dots.forEach((d, i) => d.classList.toggle("isActive", i === idx));
}

dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.dot))));
if (carouselTimer) clearInterval(carouselTimer);
carouselTimer = setInterval(() => go(idx + 1), 4500);
}

/* -----------------------------
  Shell
------------------------------ */
function renderShell(content) {
const app = $("#app");
if (!app) return;

app.innerHTML = `
   ${content}
   <div class="footer">
     <div>© ${new Date().getFullYear()} casa</div>
     <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
       <a href="#/trust">Trust &amp; Safety</a>
       <a href="#/how">How it works</a>
       <a href="#/toolkit">Tenant Toolkit</a>
       <a href="#/search">Search</a>
       <a href="#/portal">Sign in</a>
     </div>
   </div>
 `;
}

/* -----------------------------
  Query params
------------------------------ */
function getQueryParam(name) {
const hash = location.hash || "";
const qIndex = hash.indexOf("?");
if (qIndex === -1) return "";
const params = new URLSearchParams(hash.slice(qIndex + 1));
return params.get(name) || "";
}

/* -----------------------------
  HOME (✅ banner 50/50)
------------------------------ */
function renderHome() {
setPageTitle("Know your landlord");

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="kicker">CASA</div>
       <div class="h1">Know your landlord<br/>before you sign.</div>
       <p class="sub">Search landlords, read tenant reviews, and add your building in minutes.</p>

       <div class="heroSearch">
         <input class="input" id="homeQ" placeholder="Search landlord name, management company, or address..." />
         <button class="btn btn--primary" id="homeSearch" type="button">Search</button>
         <a class="btn" href="#/add">Add a landlord</a>
       </div>

       <div class="muted" style="text-align:center;margin-top:10px;font-size:13px;">
         Create an account to rate. Verified landlords can respond.
       </div>

       <div class="tileRow">
         <div class="tile" data-home-tile="search">
           <div class="tile__icon">⌕</div>
           <div><div class="tile__label">Search</div></div>
         </div>
         <div class="tile" data-home-tile="review">
           <div class="tile__icon">★</div>
           <div><div class="tile__label">Review</div></div>
         </div>
         <div class="tile tile--disabled">
           <div class="tile__icon">⌂</div>
           <div><div class="tile__label">Rent</div></div>
         </div>
       </div>

       <div class="tilePanel" id="tilePanel" style="display:none"></div>
     </div>
   </section>

   <!-- ✅ Banner is a single row with 2 equal halves -->
   <section class="splitRow splitRow--banner">
     <div class="card homePaneCard">
       <div class="pad">
         <div class="sectionHead">
           <div>
             <div class="kicker">Featured reviews</div>
             <h2 class="sectionTitle">Recent highlights</h2>
             <div class="sectionDesc">Browse ratings and profiles.</div>
           </div>
           <a class="btn miniBtn" href="#/search">Browse all</a>
         </div>

         <div class="homePaneBody">
           ${renderHighlightsCarousel()}
         </div>
       </div>
     </div>

     <div class="card homePaneCard">
       <div class="pad">
         <div class="sectionHead">
           <div>
             <div class="kicker">Map</div>
             <h2 class="sectionTitle">Browse by location</h2>
             <div class="sectionDesc"></div>
           </div>
           <a class="btn miniBtn" href="#/search">Open search</a>
         </div>

         <div class="homePaneBody">
                     <div id="homeRegion" style="margin-top:12px;">
             ${regionSelectorHTML(getRegionKey())}
           </div>
           <div class="mapBox" style="margin-top:14px;">
             <div class="map" id="homeMap"></div>
           </div>
         </div>
       </div>
     </div>
   </section>
 `;

renderShell(content);

// Minimal CSS injection to FORCE 50/50 banner without touching theme files
ensureRuntimeStyles();

const tilePanel = $("#tilePanel");
document.querySelectorAll("[data-home-tile]").forEach((el) => {
el.addEventListener("click", () => {
const k = el.dataset.homeTile;
if (!tilePanel) return;
tilePanel.style.display = "block";
if (k === "search") {
location.hash = "#/search";
return;
}
if (k === "review") tilePanel.textContent = "Sign in to leave a public star rating.";
});
});

const homeSearch = $("#homeSearch");
const homeQ = $("#homeQ");

homeSearch?.addEventListener("click", () => {
const q = homeQ && homeQ.value ? String(homeQ.value).trim() : "";
const exactL = findExactLandlord(q);
if (exactL) return (location.hash = `#/landlord/${exactL.id}`);
const exactP = findExactProperty(q);
if (exactP) return (location.hash = `#/property/${exactP.id}`);
location.hash = `#/search?q=${encodeURIComponent(q)}`;
});

homeQ?.addEventListener("keydown", (e) => {
if (e.key === "Enter") homeSearch?.click();
});

// Map pins (properties)
setTimeout(() => {
const mapEl = $("#homeMap");
if (!mapEl) return;

const regionKey = getRegionKey();
const cfg = REGIONS[regionKey] || REGIONS.NYC;

const map = initLeafletMap(mapEl, cfg.center, cfg.zoom);
if (!map) return;

const propsInRegion = filterPropertiesByRegion(DB.properties, regionKey);

for (const p of propsInRegion) {
if (typeof p.lat === "number" && typeof p.lng === "number") {
const a = p.address || {};
const st = ratingStats("property", p.id);
const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
const title = `${a.line1 || "Address"}${a.unit ? `, ${a.unit}` : ""}`;

try {
window.L.marker([p.lat, p.lng])
.addTo(map)
.bindPopup(
`<b>${esc(title)}</b><br/>${esc(label)}<br/><a href="#/property/${esc(p.id)}">View</a>`
);
} catch {}
}
}
}, 0);

// Region selector rerender (simple + reliable)
wireRegionSelector(document.getElementById("homeRegion"), () => renderHome());
setupCarousel();
}

/* -----------------------------
  Runtime styles (ONLY layout fixes)
------------------------------ */
function ensureRuntimeStyles() {
if (document.getElementById("casaRuntimeStyles")) return;
const style = document.createElement("style");
style.id = "casaRuntimeStyles";
style.textContent = `
   /* Force 50/50 banner split on desktop; stack on mobile */
   .splitRow--banner{
     display:grid !important;
     grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
     gap: 16px !important;
     align-items: stretch !important;
     width: 100% !important;
   }
   .splitRow--banner > *{
     min-width: 0 !important;
     width: 100% !important;
     max-width: none !important;
   }

   .splitRow--banner .homePaneCard{
     min-height: 420px;
   }

   @media (max-width: 980px){
     .splitRow--banner{
       grid-template-columns: 1fr !important;
     }
   }

   /* Make carousel slides not overflow */
   #highTrack{ display:flex; transition: transform .35s ease; }
   /* -----------------------------
      Home tiles: make horizontal bubble buttons
      (Search / Review / Rent)
   ------------------------------ */
   .tileRow{
     display:flex !important;
     flex-direction:row !important;
     gap:12px !important;
     flex-wrap:wrap !important;
     align-items:center !important;
     justify-content:flex-start !important;
     margin-top:14px !important;
   }

   .tileRow .tile{
     display:inline-flex !important;
     align-items:center !important;
     gap:10px !important;

     padding:10px 14px !important;
     border-radius:999px !important;

     border:1px solid rgba(20,16,12,.14) !important;
     background: rgba(255,255,255,.55) !important;
     box-shadow: 0 10px 26px rgba(20,16,12,.06) !important;

     cursor:pointer !important;
     user-select:none !important;

     /* prevent “full-width blocks” */
     width:auto !important;
     flex:0 0 auto !important;
     margin:0 !important;
   }

   .tileRow .tile .tile__icon{
     /* keep your icon vibe, just align it */
     display:inline-flex !important;
     width:auto !important;
     min-width:0 !important;
     margin:0 !important;
   }

   .tileRow .tile .tile__label{
     font-weight:900 !important;
     line-height:1 !important;
   }

   /* Disabled tile still looks disabled but stays horizontal */
   .tileRow .tile.tile--disabled{
     opacity:.55 !important;
     cursor:not-allowed !important;
   }

   /* Map sizing guard */
   #homeMap, #searchMap, #propMap, #addMap{
     width:100%;
     min-height: 320px;
     border-radius: 18px;
     overflow:hidden;
   }

   /* Property media */
   .sectionLabel{
     font-weight: 950;
     letter-spacing: .14em;
     font-size: 11px;
     color: rgba(21,17,14,.60);
     text-transform: uppercase;
   }
   .mediaPlaceholder{
     border:1px solid rgba(0,0,0,0.06);
     border-radius:16px;
     padding:18px;
     background:rgba(0,0,0,0.02);
     min-height:220px;
     display:flex;
     align-items:center;
     justify-content:center;
     text-align:center;
   }
   .mini{ font-size:12px; opacity:0.8; }

   /* -----------------------------
      Drawer bubbles: horizontal row (guaranteed)
   ------------------------------ */
   #drawer .drawerBubbleRow{
     display:flex !important;
     flex-direction:row !important;
     gap:10px !important;
     flex-wrap:wrap !important;
     align-items:center !important;
     justify-content:flex-start !important;
     padding:12px !important;
   }

   #drawer .drawerBubbleRow a,
   #drawer .drawerBubbleRow button{
     display:inline-flex !important;
     align-items:center !important;
     justify-content:center !important;
     padding:10px 14px !important;
     border-radius:999px !important;
     border:1px solid rgba(20,16,12,.14) !important;
     background:rgba(255,255,255,.55) !important;
     text-decoration:none !important;
     font-weight:900 !important;
     font-size:13px !important;
     line-height:1 !important;
     color:rgba(21,17,14,.92) !important;
     box-shadow:0 10px 26px rgba(20,16,12,.06) !important;
     width:auto !important;
     margin:0 !important;
     flex: 0 0 auto !important;
     cursor:pointer !important;
   }

   #drawer .drawerBubbleRow a:hover,
   #drawer .drawerBubbleRow button:hover{
     background:rgba(255,255,255,.72) !important;
   }
 `.trim();
document.head.appendChild(style);
}

/* -----------------------------
  SEARCH (Split columns)
------------------------------ */
function renderSearch() {
setPageTitle("Search");
const q = getQueryParam("q");

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Search</div>
           <div class="pageTitle">Find a landlord or address</div>
           <div class="pageSub">Results are split: Landlords (left) and Addresses (right).</div>
         </div>
         <a class="btn" href="#/">Home</a>
       </div>

       <div class="heroSearch" style="margin-top:16px;">
         <input class="input" id="searchQ" placeholder="Search landlord name, management company, or address..." value="${esc(q)}"/>
         <button class="btn btn--primary" id="doSearch" type="button">Search</button>
       </div>
       
              <div id="searchRegion" style="margin-top:12px;">
         ${regionSelectorHTML(getRegionKey())}
       </div>
       <div class="mapBox" style="margin-top:14px;">
         <div class="map" id="searchMap" style="height:320px;"></div>
       </div>

       <div class="hr"></div>

       <div class="splitRow" style="margin-top:0;">
         <div>
           <div class="kicker">Landlords</div>
           <div class="list" id="landlordResults" style="margin-top:10px;"></div>
         </div>
         <div>
           <div class="kicker">Addresses</div>
           <div class="list" id="propertyResults" style="margin-top:10px;"></div>
         </div>
       </div>

       <div class="hr"></div>
       <div class="tiny">
         Tip: If you don’t see an address, add it from <a href="#/add">Add Landlord</a>.
       </div>
     </div>
   </section>
 `;

renderShell(content);
ensureRuntimeStyles();

// Region selector wiring for Search page (wired only through refresh to avoid stacking)
// (do nothing here)
const qEl = $("#searchQ");
const lResEl = $("#landlordResults");
const pResEl = $("#propertyResults");
const doBtn = $("#doSearch");

qEl?.addEventListener("keydown", (e) => {
if (e.key === "Enter") doBtn?.click();
});

  // ✅ NEW: live region auto-switch while typing (e.g., "FL" -> Miami)
let lastAutoRegion = getRegionKey();

qEl?.addEventListener("input", () => {
  const query = qEl ? String(qEl.value || "") : "";
  const hit = query.toUpperCase().match(/\b(NY|FL|CA|IL|MA)\b/);
  if (!hit) return;

  const rk = regionFromState(hit[1]);
  if (!rk) return;

  // Avoid re-render loops while user keeps typing
  if (rk === lastAutoRegion) return;

  lastAutoRegion = rk;
  setRegionKey(rk);

  // Update buttons + rerun map/results immediately
  refreshSearchRegionUI();
  runSearchAndRender();
});

function matchesLandlord(l, query) {
const t = (query || "").toLowerCase();
const hay = landlordHaystack(l);
return !t || hay.includes(t);
}
function matchesProperty(p, query) {
const t = (query || "").toLowerCase();
const hay = propertyHaystack(p);
return !t || hay.includes(t);
}

function normalizeName(s) {
return String(s || "")
.toLowerCase()
.trim()
.replace(/[\s\-_.]+/g, " ")
.replace(/[^\w\s]/g, "");
}

function refreshSearchRegionUI() {
const wrap = document.getElementById("searchRegion");
if (!wrap) return;

// Re-render selector buttons with correct active state
wrap.innerHTML = regionSelectorHTML(getRegionKey());

// Re-wire click handlers for the newly-rendered buttons
wireRegionSelector(wrap, () => {
// update active button styling + rerun results/map
refreshSearchRegionUI();
runSearchAndRender();
});
}
function runSearchAndRender() {
const query = qEl ? qEl.value.trim() : "";

const nq = normalizeName(query);
const exactLandlords = !nq
? []
: DB.landlords.filter((l) => normalizeName(l.name) === nq || (l.entity && normalizeName(l.entity) === nq));
if (exactLandlords.length === 1) return (location.hash = `#/landlord/${encodeURIComponent(exactLandlords[0].id)}`);

const exactProps = !nq
? []
: DB.properties.filter((p) => normalizeName((p.address && p.address.line1) || "") === nq);
if (exactProps.length === 1) return (location.hash = `#/property/${encodeURIComponent(exactProps[0].id)}`);

// Auto-switch region if user typed a recognized state code (NY/FL/CA/IL/MA)
const typed = String(query || "").toUpperCase();
const stateHit = typed.match(/\b(NY|FL|CA|IL|MA)\b/);
if (stateHit) {
const rk = regionFromState(stateHit[1]);
if (rk) {
setRegionKey(rk);
refreshSearchRegionUI();
}
}

const regionKey = getRegionKey();
const landlords = DB.landlords.filter((l) => matchesLandlord(l, query));
const props = filterPropertiesByRegion(DB.properties, regionKey).filter((p) => matchesProperty(p, query));

if (lResEl) lResEl.innerHTML = landlords.length ? landlords.map((l) => landlordCardHTML(l)).join("") : `<div class="muted">No landlords found.</div>`;
if (pResEl) pResEl.innerHTML = props.length ? props.map((p) => propertyCardHTML(p)).join("") : `<div class="muted">No addresses found.</div>`;

const mapEl = $("#searchMap");
if (mapEl) mapEl.innerHTML = "";
const cfg = REGIONS[regionKey] || REGIONS.NYC;
const map = initLeafletMap(mapEl, cfg.center, cfg.zoom);
if (!map) return;

for (const p of props) {
if (typeof p.lat === "number" && typeof p.lng === "number") {
const a = p.address || {};
const st = ratingStats("property", p.id);
const label = st.avgRounded == null ? "Unrated" : `${st.avgRounded.toFixed(1)} (${st.count})`;
const title = `${a.line1 || "Address"}${a.unit ? `, ${a.unit}` : ""}`;
try {
window.L.marker([p.lat, p.lng])
.addTo(map)
.bindPopup(`<b>${esc(title)}</b><br/>${esc(label)}<br/><a href="#/property/${esc(p.id)}">View</a>`);
} catch {}
}
}
}

doBtn?.addEventListener("click", () => {
const query = qEl ? qEl.value.trim() : "";
location.hash = `#/search?q=${encodeURIComponent(query)}`;
});

refreshSearchRegionUI();
runSearchAndRender();
}

/* -----------------------------
  ADD (✅ borough removed entirely)
------------------------------ */
function renderAdd() {
setPageTitle("Add a landlord");

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Add</div>
           <div class="pageTitle">Add a landlord + address</div>
           <div class="pageSub"></div>
         </div>
         <a class="btn" href="#/">Home</a>
       </div>

       <div class="twoCol">
         <div class="card" style="box-shadow:none;">
           <div class="pad">
             <div class="field">
               <label>Landlord / Company name <span style="color:#b91c1c">*</span></label>
               <input class="input" id="ln" placeholder="e.g., Park Ave Management" />
             </div>

             <div class="field">
               <label>Entity (optional)</label>
               <input class="input" id="le" placeholder="e.g., Park Ave Management LLC" />
             </div>

             <div class="hr"></div>

             <div class="field">
               <label>Address <span style="color:#b91c1c">*</span></label>
               <input class="input" id="a1" placeholder="Street address" />
             </div>

             <div class="field">
               <label>Unit (optional)</label>
               <input class="input" id="unit" placeholder="Apt / Unit" />
             </div>

             <div class="field">
               <label>City <span style="color:#b91c1c">*</span></label>
               <input class="input" id="city" placeholder="City" />
             </div>

             <div class="field">
               <label>State <span style="color:#b91c1c">*</span></label>
               <input class="input" id="state" placeholder="NY" />
             </div>

             <button class="btn btn--primary btn--block" style="margin-top:12px;" id="addBtn" type="button">Add</button>
             <div class="tiny" style="margin-top:10px;">
               After adding, you’ll land on the Address page so you can review the building.
             </div>
           </div>
         </div>

         <div>
           <div class="kicker">Place the pin (optional)</div>
           <div class="muted" style="margin-top:8px;font-size:13px;font-weight:700;">
             Click the map to set a location. You won’t enter coordinates.
           </div>
           <div class="mapBox" style="margin-top:10px;">
             <div class="map" id="addMap" style="height:320px;"></div>
           </div>
           <div class="tiny" style="margin-top:10px;"></div>
         </div>
       </div>
     </div>
   </section>
 `;

renderShell(content);
ensureRuntimeStyles();

let picked = null;
let addMap = null;
let addMarker = null;

const stateEl = $("#state");
const syncAddMapToState = () => {
const raw = stateEl && stateEl.value ? String(stateEl.value).trim() : "";
if (!raw) return;
const hit = raw.toUpperCase().match(/\b(NY|FL|CA|IL|MA)\b/);
if (!hit) return;
const rk = regionFromState(hit[1]);
if (!rk) return;
setRegionKey(rk);
const cfg = REGIONS[rk] || REGIONS.NYC;
if (addMap && typeof addMap.setView === "function") {
try {
addMap.setView(cfg.center, cfg.zoom);
} catch {}
}
};

stateEl?.addEventListener("input", syncAddMapToState);
stateEl?.addEventListener("change", syncAddMapToState);

setTimeout(() => {
const rk = getRegionKey();
const cfg = REGIONS[rk] || REGIONS.NYC;
addMap = initLeafletMap($("#addMap"), cfg.center, cfg.zoom);
if (!addMap) return;

addMap.on("click", (e) => {
picked = { lat: e.latlng.lat, lng: e.latlng.lng };
try {
if (addMarker) addMarker.remove();
addMarker = window.L.marker([picked.lat, picked.lng]).addTo(addMap);
} catch {}
});
}, 0);

$("#addBtn")?.addEventListener("click", () => {
const name = $("#ln")?.value ? $("#ln").value.trim() : "";
const entity = $("#le")?.value ? $("#le").value.trim() : "";

const line1 = $("#a1")?.value ? $("#a1").value.trim() : "";
const unit = $("#unit")?.value ? $("#unit").value.trim() : "";
const city = $("#city")?.value ? $("#city").value.trim() : "";
const state = $("#state")?.value ? $("#state").value.trim() : "";
const rk = regionFromState(state);
if (rk) setRegionKey(rk);

if (!name || !line1 || !city || !state) {
alert("Please fill required fields: Name, Address, City, State.");
return;
}

const existing = findExactLandlord(name) || null;
const landlordId = existing ? existing.id : idRand("l");

if (!existing) {
DB.landlords.unshift({
id: landlordId,
name,
entity,
isVerified: false,
isTop: false,
verified: false,
top: false,
createdAt: Date.now(),
});

DB.reports = DB.reports || [];
DB.reports.push({
landlordId,
updatedAt: Date.now(),
violations_12mo: 0,
complaints_12mo: 0,
bedbug_reports_12mo: 0,
hp_actions: 0,
permits_open: 0,
eviction_filings_12mo: 0,
notes: "Demo report. Production: public datasets + sources.",
});
}

const propertyId = idRand("p");
DB.properties.unshift({
id: propertyId,
landlordId,
address: { line1, unit, city, state },
borough: "", // ✅ removed from form entirely (kept field for backward compatibility)
lat: picked && typeof picked.lat === "number" ? picked.lat : 40.73,
lng: picked && typeof picked.lng === "number" ? picked.lng : -73.95,
createdAt: Date.now(),
});

persist();
location.hash = `#/property/${propertyId}`;
});
}

/* -----------------------------
  HOW / TRUST
------------------------------ */
function renderHow() {
setPageTitle("How it works");
renderShell(`
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">How it works</div>
           <div class="pageTitle">Simple, fast, and public</div>
           <div class="pageSub">Reviews require accounts. Landlords verify to respond (coming soon).</div>
         </div>
         <a class="btn" href="#/">Home</a>
       </div>
       <div class="hr"></div>
       <div class="muted" style="font-weight:700;line-height:1.5">
         <div><b>Search</b><br/>Look up a landlord or an address.</div>
         <div style="margin-top:10px"><b>Review</b><br/>Post after creating a quick account.</div>
         <div style="margin-top:10px"><b>Choose target</b><br/>Rate the <b>landlord</b> or the <b>building</b> separately.</div>
         <div style="margin-top:10px"><b>Report</b><br/>Spam, harassment, and personal info can be reported for moderation.</div>
       </div>
     </div>
   </section>
 `);
}

function renderTrust() {
setPageTitle("Trust & Safety");
renderShell(`
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Trust & Safety</div>
           <div class="pageTitle">Built for accuracy and accountability</div>
           <div class="pageSub">Clear rules + verified landlord responses (coming soon).</div>
         </div>
         <a class="btn" href="#/">Home</a>
       </div>
       <div class="hr"></div>
       <div class="muted" style="font-weight:800;line-height:1.55">
         <div><b>Reviewer accounts</b><br/>Tenants sign in to post ratings.</div>
         <div style="margin-top:10px"><b>No doxxing</b><br/>Do not post phone numbers, emails, or private details.</div>
         <div style="margin-top:10px"><b>Reporting</b><br/>Spam, harassment, and inaccurate listings can be reported.</div>
       </div>
     </div>
   </section>
 `);
}

/* -----------------------------
  SIGN IN (✅ login + signup + SSO buttons)
------------------------------ */
function renderPortal() {
setPageTitle("Sign in");

const landlordMode = getQueryParam("mode") === "signup" ? "signup" : "login";
const userMode = getQueryParam("umode") === "login" ? "login" : "signup";

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Sign in</div>
           <div class="pageTitle">Sign in to rate or respond</div>
           <div class="pageSub">Demo-safe UI. Plug in real auth later.</div>
         </div>
         <a class="btn" href="#/">Home</a>
       </div>

       <div class="hr"></div>

       <div class="twoCol">
         <div class="card" style="box-shadow:none;">
           <div class="pad">
             <div class="kicker">Landlord access</div>
             <div class="tiny" style="margin-top:6px;">Verify to respond to reviews.</div>
             <div class="hr" style="margin:12px 0;"></div>
             <div style="display:flex; gap:10px; flex-wrap:wrap;">
               <a class="btn ${landlordMode === "login" ? "btn--primary" : ""}" href="#/portal?mode=login&umode=${userMode}">Log In</a>
               <a class="btn ${landlordMode === "signup" ? "btn--primary" : ""}" href="#/portal?mode=signup&umode=${userMode}">Sign Up</a>
             </div>

             <div class="hr"></div>

             <div class="kicker">Continue with</div>
             <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
               <button class="btn" type="button" data-sso="apple">Continue with Apple</button>
               <button class="btn" type="button" data-sso="google">Continue with Google</button>
               <button class="btn" type="button" data-sso="microsoft">Continue with Microsoft</button>
             </div>

             <div class="hr"></div>

             <div class="field">
               <label>Email</label>
               <input class="input" id="lpEmail" placeholder="you@company.com" />
             </div>

             <div class="field">
               <label>Password</label>
               <input class="input" id="lpPass" type="password" placeholder="••••••••" />
             </div>

             ${
               landlordMode === "signup"
                 ? `
                   <div class="field">
                     <label>Company / Landlord name</label>
                     <input class="input" id="lpCompany" placeholder="Exact name as shown on CASA" />
                   </div>
                   <div class="field">
                     <label>Verification document (demo)</label>
                     <input class="input" id="lpDoc" type="file" />
                   </div>
                 `
                 : ""
             }

             <button class="btn btn--primary btn--block" id="lpSubmit" type="button" style="margin-top:12px;">
               ${landlordMode === "signup" ? "Create account" : "Sign in"}
             </button>

             <div class="tiny" style="margin-top:10px; line-height:1.45;">
               ${
                 landlordMode === "signup"
                   ? "After sign up, you’ll be verified before responding to reviews."
                   : "Landlords can respond to reviews after verification."
               }
             </div>
           </div>
         </div>

         <div class="card" style="box-shadow:none;">
           <div class="pad">
             <div class="kicker">User access</div>
             <div class="tiny" style="margin-top:6px;">Create an account to rate landlords or buildings.</div>
             <div class="hr" style="margin:12px 0;"></div>
             <div style="display:flex; gap:10px; flex-wrap:wrap;">
               <a class="btn ${userMode === "login" ? "btn--primary" : ""}" href="#/portal?mode=${landlordMode}&umode=login">Login</a>
               <a class="btn ${userMode === "signup" ? "btn--primary" : ""}" href="#/portal?mode=${landlordMode}&umode=signup">Sign up</a>
             </div>

             <div class="hr"></div>

             <div class="kicker">Continue with</div>
             <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
               <button class="btn" type="button" data-user-sso="apple">Continue with Apple</button>
               <button class="btn" type="button" data-user-sso="google">Continue with Google</button>
               <button class="btn" type="button" data-user-sso="microsoft">Continue with Microsoft</button>
             </div>

             <div class="hr"></div>

             <div class="field">
               <label>Email</label>
               <input class="input" id="userEmail" placeholder="you@email.com" />
             </div>

             <div class="field">
               <label>Password</label>
               <input class="input" id="userPass" type="password" placeholder="••••••••" />
             </div>

             <button class="btn btn--primary btn--block" id="userSubmit" type="button" style="margin-top:12px;">
               ${userMode === "signup" ? "Create account" : "Sign in"}
             </button>

             <div class="tiny" style="margin-top:10px; line-height:1.45;">
               ${userMode === "signup" ? "Sign up to post ratings and reviews." : "Welcome back. Continue to rate."}
             </div>
           </div>
         </div>
       </div>

     </div>
   </section>
 `;

renderShell(content);
ensureRuntimeStyles();

// SSO buttons demo
document.querySelectorAll("[data-sso]").forEach((btn) => {
btn.addEventListener("click", () => {
alert(`Demo: ${btn.getAttribute("data-sso")} SSO would start here.`);
});
});

document.querySelectorAll("[data-user-sso]").forEach((btn) => {
btn.addEventListener("click", () => {
alert(`Demo: ${btn.getAttribute("data-user-sso")} SSO would start here.`);
});
});

// demo submit
$("#lpSubmit")?.addEventListener("click", () => {
const email = $("#lpEmail")?.value ? $("#lpEmail").value.trim() : "";
const pass = $("#lpPass")?.value ? $("#lpPass").value.trim() : "";
if (!email || !pass) {
alert("Enter email + password.");
return;
}

if (landlordMode === "signup") {
const company = $("#lpCompany")?.value ? $("#lpCompany").value.trim() : "";
if (!company) {
alert("Enter your company/landlord name.");
return;
}
DB.landlordUsers = DB.landlordUsers || [];
DB.landlordUsers.push({
id: idRand("u"),
email,
company,
verified: false,
createdAt: Date.now(),
});
persist();
alert("Demo: account created. Verification pending.");
location.hash = "#/";
} else {
const match = DB.landlordUsers.find((u) => u && u.email && norm(u.email) === norm(email));
if (!match) {
alert("No landlord account found for that email. Create one first.");
return;
}
const linked = landlordForCompany(match.company);
if (linked && linked.isVerified) {
match.verified = true;
}
DB.currentLandlordUserId = match.id;
persist();
alert("Demo: signed in (no real auth wired).");
location.hash = "#/";
}
});

// demo submit (user)
$("#userSubmit")?.addEventListener("click", () => {
const email = $("#userEmail")?.value ? $("#userEmail").value.trim() : "";
const pass = $("#userPass")?.value ? $("#userPass").value.trim() : "";
if (!email || !pass) {
alert("Enter email + password.");
return;
}

DB.users = DB.users || [];

if (userMode === "signup") {
const existing = DB.users.find((u) => u && u.email && norm(u.email) === norm(email));
if (existing) {
DB.currentUserId = existing.id;
persist();
alert("Demo: account already exists. Signed you in.");
location.hash = "#/";
return;
}
const user = { id: idRand("u"), email, createdAt: Date.now() };
DB.users.push(user);
DB.currentUserId = user.id;
persist();
alert("Demo: account created. You can now rate.");
location.hash = "#/";
return;
}

const match = DB.users.find((u) => u && u.email && norm(u.email) === norm(email));
if (!match) {
alert("No account found for that email. Create one first.");
return;
}
DB.currentUserId = match.id;
persist();
alert("Demo: signed in (no real auth wired).");
location.hash = "#/";
});
}

/* -----------------------------
  TENANT TOOLKIT
------------------------------ */
function renderToolkit() {
setPageTitle("Tenant Toolkit");

const card = (city, subtitle, rows) => `
   <div class="toolkitItem">
     <div class="kicker">${esc(city)}</div>
     <div style="margin-top:6px;font-weight:950;letter-spacing:-.02em">${esc(subtitle)}</div>
     <div class="hr" style="margin:12px 0"></div>
     <div style="display:flex;flex-direction:column;gap:10px;">
       ${rows
         .map(
           (r) => `
         <a class="btn" href="${esc(r.href)}" target="_blank" rel="noopener noreferrer"
            style="justify-content:space-between; box-shadow:none; background: rgba(255,255,255,.60);">
           <span>${esc(r.label)}</span>
           <span class="muted" style="font-weight:850">↗</span>
         </a>
       `
         )
         .join("")}
     </div>
     <div class="tiny" style="margin-top:12px; line-height:1.45;">
       These are quick links. (Demo-safe: replace with your preferred city resources anytime.)
     </div>
   </div>
 `;

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Tenant Toolkit</div>
           <div class="pageTitle">Tools tenants actually use</div>
           <div class="pageSub">Four-city starter kit. Keep it simple, fast, and reliable.</div>
         </div>
         <a class="btn" href="#/">Home</a>
       </div>

       <div class="hr"></div>

       <div class="toolkitGrid">
         ${card("NYC", "Repairs, rent, rights", [
           { label: "311 — Report housing issues", href: "https://portal.311.nyc.gov/" },
           { label: "NYC HPD — Housing complaints", href: "https://www.nyc.gov/site/hpd/index.page" },
           { label: "NY Courts — Housing Court basics", href: "https://ww2.nycourts.gov/courts/nyc/housing/index.shtml" },
           { label: "Rent Guidelines Board (RGB)", href: "https://rentguidelinesboard.cityofnewyork.us/" },
         ])}

         ${card("MIA", "Miami-Dade starter links", [
           { label: "Miami-Dade — Service requests", href: "https://www.miamidade.gov/global/home.page" },
           { label: "Florida AG — Tenant resources", href: "https://www.myfloridalegal.com/" },
         ])}

         ${card("LA", "Los Angeles basics", [
           { label: "LAHD — Housing department", href: "https://housing.lacity.org/" },
           { label: "Rent Stabilization (RSO)", href: "https://housing2.lacity.org/residents/rso-overview" },
         ])}

         ${card("CHI", "Chicago basics", [
           { label: "Chicago 311", href: "https://311.chicago.gov/" },
           { label: "Chicago Dept. of Housing", href: "https://www.chicago.gov/city/en/depts/doh.html" },
         ])}
       </div>
     </div>
   </section>
 `;

renderShell(content);
ensureRuntimeStyles();
}

/* -----------------------------
  REVIEW UI helpers (forms/lists)
------------------------------ */
function renderStarsPicker(idPrefix, defaultVal = 5) {
const opts = [5, 4, 3, 2, 1]
.map((v) => `<option value="${v}" ${v === defaultVal ? "selected" : ""}>${"★".repeat(v)}${"☆".repeat(5 - v)}</option>`)
.join("");
return `
   <select class="input" id="${esc(idPrefix)}Stars" style="max-width:260px;">
     ${opts}
   </select>
 `.trim();
}

function reviewFormHTML(targetType, targetId) {
const formId = `${targetType}_${targetId}`;
if (!isUserSignedIn()) {
return `
   <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
     <div class="pad">
       <div class="kicker">Leave a review</div>
       <div class="muted" style="margin-top:8px; font-weight:800;">
         Sign in to post a rating and review.
       </div>
       <div class="hr" style="margin:12px 0;"></div>
       <div style="display:flex; gap:10px; flex-wrap:wrap;">
         <a class="btn btn--primary" href="#/portal?umode=signup">Create account</a>
         <a class="btn" href="#/portal?umode=login">Sign in</a>
       </div>
     </div>
   </div>
 `.trim();
}
return `
   <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
     <div class="pad">
       <div class="kicker">Leave a review</div>

       <div class="field" style="margin-top:10px;">
         <label>Rating</label>
         ${renderStarsPicker(`rev_${formId}`, 5)}
       </div>

       <div class="field">
         <label>Review</label>
         <textarea class="textarea" id="rev_${esc(formId)}Text" placeholder="What was good? What was bad? (No personal info.)"></textarea>
       </div>

       <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
         <button class="btn btn--primary" id="rev_${esc(formId)}Submit" type="button">Post review</button>
         <button class="btn" id="rev_${esc(formId)}Report" type="button">Report an issue</button>
       </div>

       <div class="tiny" style="margin-top:10px; line-height:1.45;">
         Keep it factual. Don’t include phone numbers, emails, or private details.
       </div>
     </div>
   </div>
 `.trim();
}

function openReportModal(targetType, targetId) {
openModal(`
   <div class="modalHead">
     <div class="modalTitle">Report</div>
     <button class="iconBtn" id="repClose" type="button" aria-label="Close">×</button>
   </div>

   <div class="modalBody">
     <div class="field">
       <label>What’s wrong?</label>
       <select class="input" id="repReason">
         <option value="spam">Spam / fake</option>
         <option value="harassment">Harassment / hate</option>
         <option value="doxxing">Personal info / doxxing</option>
         <option value="wrong_target">Wrong landlord/address</option>
         <option value="other">Other</option>
       </select>
     </div>

     <div class="field">
       <label>Notes (optional)</label>
       <textarea class="textarea" id="repNotes" placeholder="Short explanation..."></textarea>
     </div>
   </div>

   <div class="modalFoot">
     <button class="btn btn--primary" id="repSubmit" type="button">Submit</button>
     <button class="btn" id="repCancel" type="button">Cancel</button>
   </div>
 `);

$("#repClose")?.addEventListener("click", closeModal);
$("#repCancel")?.addEventListener("click", closeModal);

$("#repSubmit")?.addEventListener("click", () => {
const reason = $("#repReason")?.value || "other";
const notes = $("#repNotes")?.value ? String($("#repNotes").value).trim() : "";
DB.flags = DB.flags || [];
DB.flags.unshift({
id: idRand("f"),
targetType,
targetId,
reason,
notes,
createdAt: Date.now(),
});
persist();
closeModal();
alert("Report submitted. Thank you.");
});
}

/* -----------------------------
  Replies
------------------------------ */
function addReply(landlordId, reviewId, text) {
DB.replies = DB.replies || [];
DB.replies.unshift({
id: idRand("rep"),
landlordId,
reviewId,
text: String(text || "").trim(),
createdAt: Date.now(),
});
persist();
}

function renderReviewList(targetType, targetId, landlordContextIdForReply) {
const rs = reviewsFor(targetType, targetId);
if (!rs.length) return `<div class="muted">No reviews yet.</div>`;

const replyArr = DB.replies || [];

return rs
.map((r) => {
const stars = "★".repeat(r.stars) + "☆".repeat(5 - r.stars);
const date = fmtDate(r.createdAt);

const reply = replyArr.find((x) => x && x.reviewId === r.id);
const replyHTML = reply
? `
         <div class="replyBox">
           <div class="kicker">Landlord response</div>
           <div class="smallNote" style="margin-top:8px;">${esc(reply.text)}</div>
           <div class="tiny" style="margin-top:8px;">${esc(fmtDate(reply.createdAt))}</div>
         </div>
       `
: "";

const canReply =
!!landlordContextIdForReply &&
targetType === "landlord" &&
canLandlordRespond(landlordContextIdForReply);

const respondHTML = canReply
? `
         <div style="margin-top:10px;">
           <button class="btn miniBtn" type="button" data-reply-open="${esc(r.id)}">Respond (demo)</button>
         </div>
         <div class="field" data-reply-box="${esc(r.id)}" style="display:none; margin-top:10px;">
           <label>Response</label>
           <textarea class="textarea" data-reply-text="${esc(r.id)}" placeholder="Short, professional response..."></textarea>
           <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
             <button class="btn btn--primary miniBtn" type="button" data-reply-send="${esc(r.id)}">Post response</button>
             <button class="btn miniBtn" type="button" data-reply-cancel="${esc(r.id)}">Cancel</button>
           </div>
         </div>
       `
: "";

return `
       <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
         <div class="pad">
           <div class="lcRow" style="justify-content:space-between;">
             <div style="display:flex; gap:10px; align-items:center;">
               <span class="stars">${esc(stars)}</span>
               <span class="muted" style="font-weight:900;">${esc(date)}</span>
             </div>
             <button class="btn miniBtn" type="button" data-flag="${esc(r.id)}">Report</button>
           </div>

           <div class="smallNote" style="margin-top:10px;">${esc(r.text)}</div>
           ${replyHTML}
           ${respondHTML}
         </div>
       </div>
     `.trim();
})
.join("\n");
}

function wireReviewListInteractions(container, landlordContextIdForReply) {
if (!container) return;

// iOS/Safari-safe selector escaping
const escSel = (v) => {
const s = String(v ?? "");
if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(s);
return s.replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, (ch) => "\\" + ch);
};

container.querySelectorAll("[data-flag]").forEach((btn) => {
btn.addEventListener("click", () =>
openReportModal("review", btn.getAttribute("data-flag") || "")
);
});

container.querySelectorAll("[data-reply-open]").forEach((btn) => {
btn.addEventListener("click", () => {
const rid = btn.getAttribute("data-reply-open") || "";
const box = container.querySelector(
`[data-reply-box="${escSel(rid)}"]`
);
if (box) box.style.display = "block";
});
});

container.querySelectorAll("[data-reply-cancel]").forEach((btn) => {
btn.addEventListener("click", () => {
const rid = btn.getAttribute("data-reply-cancel") || "";
const box = container.querySelector(
`[data-reply-box="${escSel(rid)}"]`
);
if (box) box.style.display = "none";
});
});

container.querySelectorAll("[data-reply-send]").forEach((btn) => {
btn.addEventListener("click", () => {
const rid = btn.getAttribute("data-reply-send") || "";
if (!canLandlordRespond(landlordContextIdForReply)) {
alert("Only verified landlords can respond.");
return;
}
const ta = container.querySelector(
`[data-reply-text="${escSel(rid)}"]`
);
const text = ta && ta.value ? String(ta.value).trim() : "";
if (!text) return alert("Write a short response first.");
addReply(landlordContextIdForReply, rid, text);
route();
});
});
}

/* -----------------------------
  LANDLORD PAGE
------------------------------ */
function renderLandlord(id) {
const landlordId = parseId(id);
const l = DB.landlords.find((x) => x.id === landlordId);
if (!l) {
setPageTitle("Not found");
renderShell(`
     <section class="pageCard card">
       <div class="pad">
         <div class="topRow">
           <div>
             <div class="kicker">Landlord</div>
             <div class="pageTitle">Not found</div>
             <div class="pageSub">That landlord doesn’t exist yet.</div>
           </div>
           <a class="btn" href="#/search">Search</a>
         </div>
       </div>
     </section>
   `);
return;
}

setPageTitle(l.name);

const st = ratingStats("landlord", l.id);
const tier = cardTier(st.avgRounded ?? 0, st.count);
const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
const starVis = starVisFromAvg(st.avgRounded);

const props = DB.properties.filter((p) => p.landlordId === l.id);
const rep = reportFor(l.id);
const credential = casaCredentialForLandlord(l.id);

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Landlord</div>
           <div class="pageTitle">${esc(l.name)} ${renderBadges(l)}</div>
           <div class="pageSub">${esc(l.entity || "—")}</div>
         </div>
         <a class="btn" href="#/search">Back</a>
       </div>

       <div class="hr"></div>

       <div class="splitRow" style="margin-top:0;">
         <div>
           <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
             <div class="pad">
               <div class="kicker">Rating</div>

               <!-- ✅ FIXED: single lcRow, removed corrupted/truncated line -->
               <div class="lcRow" style="margin-top:10px;">
                 <div style="display:flex; gap:12px; align-items:center;">
                   <span class="stars" style="font-size:16px;">${esc(starVis)}</span>
                   <span class="ratingNum" style="font-weight:950;">${esc(avgText)}</span>
                   <span class="muted">(${st.count} review${st.count === 1 ? "" : "s"})</span>
                 </div>

                 <div style="display:flex; gap:10px; align-items:center;">
                   ${
                     st.count
                       ? `<span class="pill ${esc(tier.pillClass)}">${esc(tier.label)}</span>`
                       : `<span class="pill">Unrated</span>`
                   }

                   <!-- More options dropdown (keeps your vibe) -->
                   <div style="position:relative;">
                     <button class="btn miniBtn" id="moreBtn" type="button" aria-expanded="false">More options</button>

                     <div class="card" id="moreDropdown"
                          style="display:none; position:absolute; right:0; top:44px; z-index:12; min-width:260px; box-shadow: 0 22px 45px rgba(20,16,12,.12);">
                       <div class="pad" style="padding:12px;">
                         <div class="tiny" style="margin-bottom:10px;">Actions</div>
                         <div style="display:flex; flex-direction:column; gap:10px;">
                           <button class="btn" type="button" id="embedBtn">Get CASA badge embed</button>
                           <a class="btn" href="#/add">Add another address</a>
                           <a class="btn" href="#/trust">Trust &amp; Safety</a>
                         </div>
                       </div>
                     </div>
                   </div>

                 </div>
               </div>

               <div class="hr" style="margin:14px 0;"></div>

               <div class="kicker">CASA rating status</div>
               <div class="muted" style="margin-top:6px; font-weight:900;">${esc(credential)}</div>

               <div class="hr" style="margin:14px 0;"></div>

               <div class="kicker">Report card (demo)</div>
               ${
                 rep
                   ? `
                     <div class="smallNote" style="margin-top:10px; line-height:1.6;">
                       <div><b>${esc(String(rep.violations_12mo))}</b> violations (12 mo)</div>
                       <div><b>${esc(String(rep.complaints_12mo))}</b> complaints (12 mo)</div>
                       <div><b>${esc(String(rep.bedbug_reports_12mo))}</b> bedbug reports (12 mo)</div>
                       <div><b>${esc(String(rep.permits_open))}</b> open permits</div>
                       <div><b>${esc(String(rep.eviction_filings_12mo))}</b> eviction filings (12 mo)</div>
                     </div>
                     <div class="tiny" style="margin-top:10px;">${esc(rep.notes || "")}</div>
                   `
                   : `<div class="muted" style="margin-top:10px;">No report data.</div>`
               }
             </div>
           </div>

           <div style="margin-top:14px;">
             ${reviewFormHTML("landlord", l.id)}
           </div>

           <div style="margin-top:14px;">
             <div class="kicker">Reviews</div>
             <div class="list" id="landlordReviews" style="margin-top:10px;"></div>
           </div>
         </div>

         <div>
           <div class="kicker">Addresses</div>
           <div class="list" style="margin-top:10px;">
             ${
               props.length
                 ? props.map((p) => propertyCardHTML(p)).join("")
                 : `<div class="muted">No addresses listed yet.</div>`
             }
           </div>

           <div class="hr"></div>

           <div class="kicker">Sign in</div>
           <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
             <div class="pad">
               <div class="muted" style="font-weight:900; line-height:1.55;">
                 Landlords can verify to respond to reviews.
               </div>
               <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
                 <a class="btn btn--primary" href="#/portal?mode=login&umode=signup">Login</a>
                 <a class="btn" href="#/portal?mode=signup&umode=signup">Landlord sign up</a>
               </div>
             </div>
           </div>

         </div>
       </div>

     </div>
   </section>
 `;

renderShell(content);
ensureRuntimeStyles();

// Wire dropdown
$("#moreBtn")?.addEventListener("click", (e) => {
e.preventDefault();
e.stopPropagation();
toggleInlineDropdown();
});

document.addEventListener(
"click",
() => {
closeInlineDropdown();
},
{ once: true }
);

$("#embedBtn")?.addEventListener("click", (e) => {
e.preventDefault();
closeInlineDropdown();
openBadgeEmbedModal(l.id);
});

// Review list render + interactions
const listEl = $("#landlordReviews");
if (listEl) {
listEl.innerHTML = renderReviewList("landlord", l.id, l.id);
wireReviewListInteractions(listEl, l.id);
}

// Review form wiring
const formId = `landlord_${l.id}`;
$(`#rev_${formId}Submit`)?.addEventListener("click", () => {
if (!isUserSignedIn()) {
alert("Sign in to post a review.");
location.hash = "#/portal?umode=signup";
return;
}
const stars = clampStars($(`#rev_${formId}Stars`)?.value || 5);
const text = $(`#rev_${formId}Text`)?.value ? String($(`#rev_${formId}Text`).value).trim() : "";
if (!text) return alert("Write a review first.");

DB.reviews.unshift({
id: idRand("r"),
targetType: "landlord",
targetId: l.id,
userId: DB.currentUserId || "",
stars,
text,
createdAt: Date.now(),
});
persist();
route();
});

$(`#rev_${formId}Report`)?.addEventListener("click", () => openReportModal("landlord", l.id));
}

/* -----------------------------
  PROPERTY PAGE
------------------------------ */
function renderProperty(id) {
const propertyId = parseId(id);
const p = DB.properties.find((x) => x.id === propertyId);

if (!p) {
setPageTitle("Not found");
renderShell(`
     <section class="pageCard card">
       <div class="pad">
         <div class="topRow">
           <div>
             <div class="kicker">Address</div>
             <div class="pageTitle">Not found</div>
             <div class="pageSub">That address doesn’t exist yet.</div>
           </div>
           <a class="btn" href="#/search">Search</a>
         </div>
       </div>
     </section>
   `);
return;
}

const a = p.address || {};
const rk = regionFromState(a.state);
if (rk) setRegionKey(rk);
const title = `${a.line1 || "Address"}${a.unit ? `, ${a.unit}` : ""}`;
setPageTitle(title);

const l = DB.landlords.find((x) => x.id === p.landlordId);
const st = ratingStats("property", p.id);
const tier = cardTier(st.avgRounded ?? 0, st.count);
const avgText = st.avgRounded == null ? "—" : st.avgRounded.toFixed(1);
const starVis = starVisFromAvg(st.avgRounded);

const content = `
   <section class="pageCard card">
     <div class="pad">
       <div class="topRow">
         <div>
           <div class="kicker">Address</div>
           <div class="pageTitle">${esc(title)}</div>
           <div class="pageSub">
             ${esc(`${a.city || ""} • ${a.state || ""}`)} ${l ? `• Landlord: <a href="#/landlord/${esc(l.id)}">${esc(l.name)}</a>` : ""}
           </div>
         </div>
         <a class="btn" href="#/search">Back</a>
       </div>

       <div class="hr"></div>

       <div class="splitRow" style="margin-top:0;">
         <div>
           <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
             <div class="pad">
               <div class="kicker">Rating</div>
               <div class="lcRow" style="margin-top:10px;">
                 <div style="display:flex; gap:12px; align-items:center;">
                   <span class="stars" style="font-size:16px;">${esc(starVis)}</span>
                   <span class="ratingNum" style="font-weight:950;">${esc(avgText)}</span>
                   <span class="muted">(${st.count} review${st.count === 1 ? "" : "s"})</span>
                 </div>
                 ${st.count ? `<span class="pill ${esc(tier.pillClass)}">${esc(tier.label)}</span>` : `<span class="pill">Unrated</span>`}
               </div>

             </div>
           </div>

           <div style="margin-top:14px;">
             ${reviewFormHTML("property", p.id)}
           </div>

           <div style="margin-top:14px;">
             <div class="kicker">Reviews</div>
             <div class="list" id="propertyReviews" style="margin-top:10px;"></div>
           </div>
         </div>

         <div>
           ${renderPropertyMediaCard(p)}

           <div class="hr"></div>

           <div class="kicker">Landlord</div>
           <div class="list" style="margin-top:10px;">
             ${l ? landlordCardHTML(l) : `<div class="muted">No landlord listed.</div>`}
           </div>

           <div class="hr"></div>

           <div class="kicker">Tip</div>
           <div class="card" style="box-shadow:none; background: rgba(255,255,255,.60);">
             <div class="pad">
               <div class="muted" style="font-weight:900; line-height:1.55;">
                 Rate the building for conditions. Rate the landlord for management behavior.
               </div>
             </div>
           </div>
         </div>
       </div>

     </div>
   </section>
 `;

renderShell(content);
ensureRuntimeStyles();
initPropertyMediaEmbed();

// Reviews
const listEl = $("#propertyReviews");
if (listEl) {
listEl.innerHTML = renderReviewList("property", p.id, null);
wireReviewListInteractions(listEl, null);
}

// Review form
const formId = `property_${p.id}`;
$(`#rev_${formId}Submit`)?.addEventListener("click", () => {
if (!isUserSignedIn()) {
alert("Sign in to post a review.");
location.hash = "#/portal?umode=signup";
return;
}
const stars = clampStars($(`#rev_${formId}Stars`)?.value || 5);
const text = $(`#rev_${formId}Text`)?.value ? String($(`#rev_${formId}Text`).value).trim() : "";
if (!text) return alert("Write a review first.");

DB.reviews.unshift({
id: idRand("r"),
targetType: "property",
targetId: p.id,
userId: DB.currentUserId || "",
stars,
text,
createdAt: Date.now(),
});
persist();
route();
});

$(`#rev_${formId}Report`)?.addEventListener("click", () => openReportModal("property", p.id));
}

/* -----------------------------
  FINAL: Router guard + default
------------------------------ */
// If you have any leftover routes/pages in your repo that call renderX,
// keep them below or remove them. This file is repo-safe and won’t crash if unused.
