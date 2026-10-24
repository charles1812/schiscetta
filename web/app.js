'use strict';
/* Schiscetta: menu della settimana, lista della spesa con i costi e guida serale.
   Tutto lo stato sta in localStorage (chiave KEY). Nell'app Android esiste window.Native (ponte Java). */
(() => {
const D = window.DATA;
const ING = {}, PI = {};
let ALL = [];   /* tutti i piatti: quelli di base più le ricette dell'utente (S.custom) */
const SM = {}; D.supermercati.forEach(s => { SM[s.id] = s; });
const NATIVE = window.Native || null;
const KEY = 'schiscetta.v1';
const CATS = [['primo', 'Primi'], ['secondo', 'Secondi'], ['unico', 'Piatti unici'], ['zuppa', 'Zuppe'], ['freddo', 'Freddi e insalate']];
const CATN = Object.fromEntries(CATS);
const SCN = { calda: 'Schiscetta da scaldare', fredda: 'Schiscetta fredda', entrambe: 'Schiscetta calda o fredda' };
const SCTIP = {
  calda: 'Quando è tiepida mettila nel contenitore e in frigo. Domani scaldala 1–2 minuti al microonde.',
  fredda: 'Mettila nel contenitore e in frigo: domani si mangia fredda, tirala fuori 10 minuti prima.',
  entrambe: 'Mettila nel contenitore e in frigo: domani puoi mangiarla fredda o scaldarla 1 minuto.'
};
const I = {
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M3 3h18v4H3zM10 11h4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20.5" r="1.3"/><circle cx="17" cy="20.5" r="1.3"/></svg>',
  pot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M20 12h2M2 12h2M9 7.5c0-1.5 1-2 1-3.5M14 7.5c0-1.5 1-2 1-3.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>'
};

/* ---------------- date ---------------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
const TODAY = (() => { const m = location.search.match(/today=(\d{4}-\d\d-\d\d)/); return m ? m[1] : iso(new Date()); })();
const fdate = (s, o) => parse(s).toLocaleDateString('it-IT', o);
const fday = s => fdate(s, { weekday: 'short', day: 'numeric', month: 'short' });
function nextMonday() { const d = parse(TODAY); const delta = ((8 - d.getDay()) % 7) || 7; return addDays(TODAY, delta); }
function rangeLabel(start) {
  const a = parse(start), b = parse(addDays(start, 6));
  const ma = a.toLocaleDateString('it-IT', { month: 'long' }), mb = b.toLocaleDateString('it-IT', { month: 'long' });
  return ma === mb ? `${a.getDate()}–${b.getDate()} ${mb}` : `${a.getDate()} ${ma} – ${b.getDate()} ${mb}`;
}

/* ---------------- stato ---------------- */
function newWeek(start) { return { start, uid: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slots: {}, status: 'plan', checked: {}, extras: [], spent: null, shopDate: null, done: {}, steps: {}, sfizi: {} }; }
function defaults() {
  return { v: 1, setup: false, market: 'esselunga', pc: 1, pp: 1, pantry: {}, prices: {}, favs: {},
    reminder: { on: true, t: '18:30' }, theme: 'auto', week: newWeek(nextMonday()), history: [], timers: [], custom: { piatti: [], ing: [] }, feeds: {}, apiKey: '', choice: {}, qty: {}, qmul: {} };
}
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
S = Object.assign(defaults(), S || {});
S.week = Object.assign(newWeek(S.week && S.week.start ? S.week.start : nextMonday()), S.week);
if (!SM[S.market]) S.market = 'esselunga';
/* database delle ricette scaricato dal server (tools/pubblica_ricette.py): sostituisce quello incluso nell'app se più nuovo */
const RKEY = 'schiscetta.ricette';
let RDB = null;
try { RDB = JSON.parse(localStorage.getItem(RKEY)); } catch (e) { RDB = null; }
if (RDB && !(RDB.versione > (D.versione || '') && RDB.piatti)) RDB = null;
const byId = (a, b) => { const m = new Map(a.map(x => [x.id, x])); (b || []).forEach(x => m.set(x.id, x)); return [...m.values()]; };
function reindex() {
  S.custom = Object.assign({ piatti: [], ing: [] }, S.custom);
  for (const k in ING) delete ING[k];
  for (const k in PI) delete PI[k];
  byId(D.ingredienti, RDB && RDB.ingredienti).forEach(i => { ING[i.id] = i; });
  S.custom.ing.forEach(i => { ING[i.id] = i; });
  S.custom.piatti.forEach(p => { p.ing = p.ing.filter(([iid]) => ING[iid]); });
  ALL = byId(D.piatti, RDB && RDB.piatti).filter(p => p.ing.every(([iid]) => ING[iid])).concat(S.custom.piatti);
  ALL.forEach(p => { PI[p.id] = p; });
  if (RDB && RDB.regole) D.regole = RDB.regole;
  if (RDB && RDB.reparti) D.reparti = byId(D.reparti, RDB.reparti);
}
/* a ogni apertura: c'è una versione nuova delle ricette? */
async function refreshRecipes() {
  for (const u of D.ricetteUrls || []) {
    try {
      const r = await fetch(u + '?t=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      if (!j.versione || !Array.isArray(j.piatti)) continue;
      const cur = RDB ? RDB.versione : (D.versione || '');
      if (j.versione <= cur) return;
      const before = new Set(ALL.map(p => p.id));
      RDB = j;
      try { localStorage.setItem(RKEY, JSON.stringify(j)); } catch (e) { /* spazio finito: resta in memoria */ }
      reindex(); nutVer++;
      const added = ALL.filter(p => !before.has(p.id)).length;
      render();
      if (added) toast(`📚 ${added} ricett${added > 1 ? 'e nuove' : 'a nuova'} nel ricettario`);
      return;
    } catch (e) { /* prova il prossimo indirizzo */ }
  }
}
reindex();
/* chi usava già l'app prima del profilo nel benvenuto: tiene i valori di allora (Charles: 194 cm, 80 kg, aumentare) */
['gzOn', 'gzToken', 'gzQ', 'gzLast'].forEach(k => delete S[k]);     // dati del vecchio collegamento esterno: non servono più
if (S.setup && !S.profile) S.profile = { on: true, sex: 'm', age: 30, h: 194, w: 80, act: 1.55, goal: 'gain', comp: true, colaz: 'poca', mealKcal: 0 };

function save() {
  nutVer++;
  syncCounts();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage non disponibile */ }
  syncNative();
}

const ui = { tab: 'menu', sheets: [], pf: { cat: 'all', q: '', sort: 'cost', all: false }, cf: { cat: 'all', q: '' }, eve: null, onb: 0 };
if (/stasera/.test(location.hash)) ui.tab = 'stasera';
if (/spesa/.test(location.hash)) ui.tab = 'spesa';

/* ---------------- formattazione ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => (Math.round(n * 100) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const eur3 = n => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 3, maximumFractionDigits: 3 });
const pct = (x, sign) => (sign && x > 0.0005 ? '+' : x < -0.0005 ? '−' : '') + Math.abs(x).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const sgnEur3 = n => (n > 0.0005 ? '+' : n < -0.0005 ? '−' : '±') + eur3(Math.abs(n));
/* costo di ogni ingrediente in un piatto: [{iid, q, cost, share}] e totale */
function costLines(ing, n) {
  const lines = ing.map(([iid, q]) => ({ iid, q: q * n, cost: q * n * unitCost(iid) }));
  const tot = lines.reduce((a, l) => a + l.cost, 0);
  lines.forEach(l => { l.share = tot > 0 ? l.cost / tot * 100 : 0; });
  return { lines, tot };
}
/* prezzo per unità (g, ml o pz) di un'opzione del file prezzi */
const optUnit = (iid, p) => { const i = ING[iid]; return i.conf ? p / i.conf : p / 1000; };
function fnum(x) {
  const w = Math.floor(x + 1e-9), f = x - w;
  if (f < 0.08) return String(w);
  if (f > 0.92) return String(w + 1);
  const c = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];
  let b = c[0]; for (const k of c) if (Math.abs(k[0] - f) < Math.abs(b[0] - f)) b = k;
  return (w || '') + b[1];
}
function fmass(q, u) {
  if (q >= 1000) return (Math.round(q / 100) / 10).toLocaleString('it-IT') + (u === 'g' ? ' kg' : ' l');
  return (q < 20 ? Math.max(1, Math.round(q)) : Math.round(q / 5) * 5) + ' ' + u;
}
function fq(iid, q, noPz) {
  const i = ING[iid];
  if (!q) return 'q.b.';
  if (i.u === 'pz') return `${fnum(q)} ${i.pzn[q <= 1 + 1e-9 ? 0 : 1]}`;
  let s = fmass(q, i.u);
  if (i.pz && !noPz && q >= i.pz * 0.4) { const n = Math.round(q / i.pz * 2) / 2; s += ` · ≈ ${fnum(n)} ${i.pzn[n <= 1 ? 0 : 1]}`; }
  return s;
}
const pers = n => n === 1 ? '1 persona' : `${n} persone`;
const porz = n => n === 1 ? '1 porzione' : `${n} porzioni`;
const mins = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + m % 60 + '\'' : ''}` : `${m}'`;

/* ---------------- prezzi e calcoli ---------------- */
const factor = () => SM[S.market].idx / D.baseIdx;
const isCustom = iid => S.prices[S.market] && S.prices[S.market][iid] != null;
const API = 'https://tuo-server.example/schiscetta/';
const SP_MARKETS = ['esselunga', 'carrefour'];
const tripKey = () => winKey() || 'settimana';
/* ---------- spese fatte (scheda «Spese»): S.spese, una voce per ogni giro di spesa ----------
   Le voci della settimana in corso si ricostruiscono dai giri (w.trips); quelle passate restano com'erano. */
const FONTI = { wallet: ['📲', 'Google Wallet'], scontrino: ['🧾', 'scontrino'], spesa: ['✍️', 'segnata a mano'] };
function syncSpese(w = S.week) {
  const uid = w.uid || w.start;      // solo le voci di questo menu (non quelle di un menu di prima partito lo stesso giorno)
  S.spese = (S.spese || []).filter(x => x.wid !== uid);
  for (const [giro, tr] of Object.entries(w.trips || {})) {
    S.spese.push(Object.assign({ id: uid + '_' + giro, wid: uid, week: w.start, giro, date: tr.date, spent: tr.spent || null, stima: tr.stima || null,
      store: tr.negozio || SM[tr.m || S.market].n, fonte: tr.fonte || 'spesa', items: tr.items || [], extras: tr.extras || [] }, tr.pay ? { pay: tr.pay } : {}));
  }
  S.spese.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
/* cosa si compra in questo giro: [ingrediente, confezioni, quantità, costo] e le cose fuori lista */
function tripSnapshot(w) {
  const sh = shopping(w, true);
  return { m: S.market, items: sh.items.map(it => [it.iid, it.n, Math.round(it.buy), Math.round(it.cost * 100) / 100]),
    extras: w.extras.filter(e => e.t).map(e => [e.t, e.price || 0]) };
}
/* totale della settimana: somma delle spese dei giri (per pochi giorni) o la spesa della settimana intera */
/* lotti per la settimana che inizia: quello che restava in casa e non è stato usato, più gli avanzi delle confezioni
   comprate (solo se la spesa è stata fatta); spariscono quelli già scaduti. Scadenza = giorno della spesa + durata. */
function carryOver(w, start) {
  const sh = shopping(w, false, start), out = [];
  const keep = (iid, q, exp, frozen) => {
    const i = ING[iid];
    if (!i || i.disp || exp < start || q <= (i.u === 'pz' ? 0.49 : Math.max(15, (i.conf || 0) * 0.08))) return;
    const same = out.find(l => l.iid === iid && l.exp === exp);
    if (same) same.q += q; else out.push(Object.assign({ id: 'l' + Date.now().toString(36) + out.length, iid, q: Math.round(q * 100) / 100, exp }, frozen ? { frozen: true } : {}));
  };
  for (const l of sh.lots) keep(l.iid, w.status === 'cook' ? l.left : l.q, l.exp, l.frozen);
  if (w.status === 'cook' && !(S.dispensa || []).some(l => l.wk === w.start)) {     // con lo scontrino ci sono già gli avanzi veri
    const bought = w.shopDate || addDays(w.start, -1);
    for (const it of sh.items) keep(it.iid, it.left, addDays(bought, ING[it.iid].dur || 3));
  }
  return out.sort((a, b) => a.exp.localeCompare(b.exp));
}
/* cose da colazione proposte, con la quantità di una volta */
const BF = { kefir: 200, yogurt: 170, yogurt_bianco: 125, latte: 200, caffe: 8, biscotti: 40, fette_biscottate: 30, muesli: 50, avena: 40,
  marmellata: 20, miele: 15, spalmabile: 20, burro_arachidi: 15, pane: 60, uova: 2, banane: 120, mele: 180, frutti_bosco: 80, mandorle: 20, noci: 15 };
/* colazione di ogni persona: [{i, q, n}] = ingrediente, quantità per volta, volte a settimana (per pochi giorni in proporzione) */
function breakfastNeeds(w = S.week, x = shopWin(w)) {
  const f = x.days ? x.days / 7 : 1, out = [];
  for (const per of S.people || []) for (const b of per.colaz || []) if (ING[b.i] && b.n > 0) {
    const times = Math.max(1, Math.round(b.n * f));
    out.push({ i: b.i, q: b.q * times, times, who: per.name });
  }
  return out;
}
/* per cosa serve un ingrediente in questa spesa: piatti, complementi del pasto, sfizi, colazioni */
function usesOf(iid, w = S.week) {
  const x = shopWin(w), out = [];
  for (const m of meals(w).filter(m => inWin(m.d, x))) {
    const day = fdate(addDays(w.start, m.d), { weekday: 'short', day: 'numeric' }), lbl = slotLabel(m.key).split(' di ')[0];
    const q = ingOf(m.dish).filter(([i]) => i === iid).reduce((s, [, v]) => s + v * m.n, 0);
    if (q) out.push({ e: m.t === 'p' ? '🍱' : '🌙', t: `${day} · ${lbl}`, d: m.left ? 'avanzo della cena' : m.dish.n, q, id: m.dish.id });
    for (const per of m.who) if (prof(per).on && prof(per).comp) for (const c of complements(m.dish, per)) if (c.i === iid)
      out.push({ e: '➕', t: `${day} · ${lbl} · complemento per le kcal${S.people.length > 1 ? ' di ' + per.name : ''}`, d: `insieme a ${m.dish.n}`, q: c.q, comp: true });
  }
  for (const key in (w.sfizi || {})) if (inWin(kDay(key), x)) for (const sf of w.sfizi[key]) if (sf.i === iid) out.push({ e: '🍫', t: slotLabel(key), d: 'sfizio', q: sf.q * nOf(key, w) });
  for (const b of breakfastNeeds(w, x)) if (b.i === iid) out.push({ e: '☕', t: 'colazione', d: `${b.who} · ${b.times} volte`, q: b.q });
  return out;
}
/* lista della spesa → carrello Iperal: [{id, q}] (pezzi; per gli sfusi kg, a confezioni di peso fisso) */
const nListOf = () => shopping(S.week, true).items.length;
function iperalItems() {
  const sh = shopping(S.week, true), f = feed('iperal'), items = [], miss = [];
  for (const it of sh.items) {
    const fp = f && f.prices[it.iid], o = !isCustom(it.iid) && chosenOpt(it.iid, 'iperal'), opt = fp && o && (fp.opts || []).find(x => x.c === String(o.c));
    if (!opt) { miss.push(ING[it.iid].n); continue; }
    if (opt.sf) { items.push({ id: +opt.c, q: Math.max(1, Math.ceil(it.need / opt.sf - 0.05)) * opt.sf / 1000 }); continue; }
    const per = ING[it.iid].u === 'pz' ? (+(opt.n.match(/(\d+) pz/) || [])[1] || 1) : opt.q;
    items.push({ id: +opt.c, q: per ? Math.max(1, Math.ceil(it.need / per - 0.05)) : Math.max(1, it.n || 1) });
  }
  for (const e of S.week.extras) if (!e.done) miss.push(e.t);
  return { items, miss };
}
/* ---------- scanner dei codici a barre: fotocamera e BarcodeDetector del telefono, dentro l'app ----------
   Ogni codice si abbina una volta a un ingrediente (catalogo del supermercato già letto, Open Food Facts o scelto da te) e
   resta in S.ean {codice: {iid, q, n}}: le volte dopo basta il bip. Il prodotto va «In casa» e, se è nella lista, si spunta. */
let scan = null;
const hasScanner = () => 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
async function scanStart() {
  if (scan || !hasScanner()) return;
  scan = { busy: true };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    scan = { stream, det, seen: {} };
    scanAttach();
    const loop = async () => {
      if (!scan || !scan.det) return;
      const v = $('#scan-video');
      if (v && v.readyState >= 2) { try { const r = await det.detect(v); if (r.length) onScan(r[0].rawValue); } catch (e) { /* riprovo */ } }
      if (scan) scan.timer = setTimeout(loop, 220);
    };
    loop();
  } catch (e) {
    scan = null;
    const el = $('#scan-msg'); if (el) el.textContent = 'Fotocamera non disponibile: dai il permesso a Schiscetta (' + e.message + ')';
  }
}
function scanAttach() {
  const v = $('#scan-video');
  if (v && scan && scan.stream && v.srcObject !== scan.stream) { v.srcObject = scan.stream; v.play().catch(() => {}); }
}
function scanStop() { if (scan) { clearTimeout(scan.timer); if (scan.stream) scan.stream.getTracks().forEach(t => t.stop()); scan = null; } }
/* dal codice all'ingrediente: prima quelli già visti, poi i cataloghi letti (Iperal…), poi Open Food Facts */
function eanLocal(ean) {
  if ((S.ean || {})[ean]) return Object.assign({ src: 'tuo' }, S.ean[ean]);
  for (const m in (S.cat || {})) for (const iid in S.cat[m]) if (S.cat[m][iid].ean === ean) return { iid, n: S.cat[m][iid].n, q: sizeOf(S.cat[m][iid].n) || ING[iid].conf || 0, src: SM[m] ? SM[m].n : m };
  for (const m in (S.feeds || {})) for (const iid in (S.feeds[m].prices || {})) for (const o of S.feeds[m].prices[iid].opts || []) if (o.ean === ean) return { iid, n: o.n, q: o.q || sizeOf(o.n) || ING[iid].conf || 0, src: SM[m] ? SM[m].n : m };
  return null;
}
/* ingredienti che somigliano al nome di un prodotto (per proporli quando il codice è nuovo) */
function guessIng(name) {
  const sl = slugify(name);
  return Object.values(ING).filter(i => !i.sp).map(i => {
    const w = slugify(i.n.replace(/\(.*?\)/g, '')).split('-').filter(x => x.length > 2);
    const hit = w.filter(x => sl.includes(x.slice(0, Math.max(4, x.length - 1)))).length;
    return { i, sc: hit ? hit / w.length + (sl.startsWith(w[0].slice(0, 4)) ? 1 : 0) : 0 };
  }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 4).map(x => x.i.id);
}
async function onScan(ean) {
  if (!scan || scan.seen[ean] && Date.now() - scan.seen[ean] < 3000) return;
  scan.seen[ean] = Date.now();
  try { navigator.vibrate && navigator.vibrate(60); } catch (e) { /* ignora */ }
  const row = { ean, t: Date.now() };
  (ui.scanned = ui.scanned || []).unshift(row);
  const known = eanLocal(ean);
  if (known && ING[known.iid]) { scanAdd(row, known.iid, known.q, known.n); return; }
  row.state = 'cerco'; scanListUpd();
  let name = '', qty = 0;
  try {
    const o = await (await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=product_name_it,product_name,brands,quantity`)).json();
    const pr = o && o.product;
    if (pr) { name = [pr.product_name_it || pr.product_name, pr.brands].filter(Boolean).join(' · '); qty = sizeOf(pr.quantity || ''); }
  } catch (e) { /* senza rete: lo scegli tu */ }
  Object.assign(row, { state: 'chiedi', n: name, q: qty, cands: name ? guessIng(name) : [] });
  scanListUpd();
}
function scanAdd(row, iid, q, n) {
  const i = ING[iid];
  q = q > 0 ? q : (i.conf || (i.u === 'pz' ? 1 : 100));
  Object.assign(row, { state: 'ok', iid, q, n: n || row.n || i.n });
  (S.ean = S.ean || {})[row.ean] = { iid, q, n: row.n };
  addHome(iid, q);
  if (shopping(S.week, true).items.some(it => it.iid === iid)) chk()[iid] = true;     // se è nella lista, spuntato
  save(); scanListUpd();
}
function scanListHTML() {
  const L = ui.scanned || [];
  if (!L.length) return '<p class="muted small" style="text-align:center">Inquadra il codice a barre di un prodotto: bip e va «In casa».</p>';
  return L.map((r, k) => {
    if (r.state === 'ok') return `<div class="item"><span style="font-size:22px">${ING[r.iid].e}</span><div class="grow"><div class="nm">${esc(ING[r.iid].n)}</div><div class="left">${esc(r.n || '')} · ${fq(r.iid, r.q)} in casa</div></div><span class="badge green">✓</span></div>`;
    if (r.state === 'cerco') return `<div class="item"><span style="font-size:22px">🔎</span><div class="grow"><div class="nm">Codice ${esc(r.ean)}</div><div class="left">cerco il prodotto…</div></div></div>`;
    const q = (ui.scq || '').trim().toLowerCase(), more = k === 0 && q ? Object.values(ING).filter(i => !i.sp && i.n.toLowerCase().includes(q)).slice(0, 6).map(i => i.id) : [];
    return `<div class="card"><b>${r.n ? esc(r.n) : 'Prodotto nuovo'}</b><div class="muted small">codice ${esc(r.ean)}${r.q ? ' · ' + r.q + ' g/ml' : ''} · che ingrediente è? (lo ricordo per le prossime volte)</div>
      <div class="chips wrap" style="margin-top:8px">${[...new Set([...(r.cands || []), ...more])].map(iid => `<button class="chip" data-a="scanPick" data-k="${k}" data-i="${iid}">${ING[iid].e} ${esc(ING[iid].n)}</button>`).join('')}</div>
      ${k === 0 ? `<input type="search" placeholder="Altro ingrediente: cerca…" value="${esc(ui.scq || '')}" data-in="scq" style="margin-top:8px">` : ''}
      <button class="btn-ghost small" data-a="scanSkip" data-k="${k}">Non è un ingrediente: salta</button></div>`;
  }).join('');
}
const scanListUpd = () => { const el = $('#scan-list'); if (el) el.innerHTML = scanListHTML(); };
/* ---------- scambio di due pasti del menu (es. il piatto di oggi con quello di giovedì) ----------
   Spesa, quantità, «In casa» e sera si ricalcolano da soli perché dipendono solo da S.week.slots. */
const isTodayLunch = k => kT(k) === 'p' && kDay(k) === 0 && S.week.start === TODAY;
function slotsSwapped(w, a, b) {
  const sl = JSON.parse(JSON.stringify(w.slots)), fix = k => { const r = slotDish(Object.assign({}, w, { slots: sl }), k); if (r && r.left && r.dish) sl[k] = { d: r.dish.id }; };
  for (const k of [a, b]) { fix(k); if (kT(k) === 'c') for (const nk of lunchKeys(kDay(k) + 1)) fix(nk); }   // gli avanzi diventano piatti veri
  [sl[a], sl[b]] = [sl[b], sl[a]];
  return sl;
}
function swapOk(a, b) {
  const da = slotDish(S.week, a), db = slotDish(S.week, b);
  if (!da || !da.dish || !db || !db.dish || a === b) return false;
  const fits = (k, dish) => kT(k) !== 'p' || isTodayLunch(k) || !!dish.sc;      // in schiscetta solo piatti da schiscetta
  return fits(a, db.dish) && fits(b, da.dish);
}
/* cosa cambia scambiando: cose da comprare per i due pasti e quello che scadrebbe */
function swapImpact(a, b) {
  const w = S.week, sh0 = shopping(w), old = w.slots;
  w.slots = slotsSwapped(w, a, b);
  const sh1 = shopping(w);
  w.slots = old;
  const miss = k => (sh1.short[k] ? [...sh1.short[k]] : []);
  return { miss: [...new Set([...miss(a), ...miss(b)])], waste: sh1.wasted - sh0.wasted, cost: sh1.cassa - sh0.cassa };
}
/* dosi da togliere da «In casa»: per ogni ingrediente i lotti che scadono prima (anche gli equivalenti) */
function ckPrefill(ck, list) {
  const lots = (S.dispensa || []).slice().sort((a, b) => a.exp.localeCompare(b.exp));
  for (const [iid, q] of list) {
    let need = q;
    for (const l of lots.filter(x => x.iid === iid).concat(lots.filter(x => x.iid !== iid && sameUse(x.iid, iid)))) {
      if (need <= 1e-6) break;
      const take = Math.min(l.q - (ck.sel[l.id] || 0), need);
      if (take > 0) { ck.sel[l.id] = Math.round(((ck.sel[l.id] || 0) + take) * 100) / 100; need -= take; }
    }
  }
}
/* spese sparite con le versioni di prima (un menu nuovo nello stesso giorno cancellava quelle del menu precedente):
   le ritrovo dai pagamenti di Google Wallet già registrati e dalle settimane archiviate. Una volta sola per ognuna. */
function recoverSpese() {
  S.spese = S.spese || [];
  const rec = (S.spRec = S.spRec || {}), w = S.week;
  for (const x of S.spese) if (!x.wid && x.week === w.start) x.wid = (w.trips || {})[x.giro] ? w.uid : 'old';     // voci di prima della v1.47
  const near = (date, v) => S.spese.some(x => Math.abs(diffDays(x.date, date)) <= 1 && (!x.spent || Math.abs(x.spent - v) < 0.01));
  let n = 0;
  let all = [];
  try { all = NATIVE && NATIVE.walletAll ? JSON.parse(NATIVE.walletAll() || '[]') : []; } catch (e) { all = []; }
  for (const it of all) {
    if (it.stato !== 'fatto' || !(it.totale > 0) || rec[it.pay] || S.spese.some(x => x.pay === it.pay) || near(it.date, it.totale)) continue;
    addSpesa({ date: it.date, spent: Math.round(it.totale * 100) / 100, store: it.negozio || '', fonte: 'wallet', pay: it.pay, recovered: true });
    rec[it.pay] = 1; n++;
  }
  for (const h of S.history || []) {
    const k = 'h' + h.start;
    if (!(h.spent > 0) || rec[k] || S.spese.some(x => x.week === h.start) || near(addDays(h.start, -1), h.spent)) continue;
    addSpesa({ date: addDays(h.start, -1), week: h.start, giro: 'settimana', spent: h.spent, stima: h.cassa || null, store: '', fonte: 'spesa', recovered: true });
    rec[k] = 1; n++;
  }
  if (n) { save(); setTimeout(() => toast(`🧾 Ho ritrovato ${n === 1 ? 'una spesa' : n + ' spese'}: le vedi in Spesa › Spese fatte`), 600); }
  return n;
}
/* una spesa che non appartiene a un giro del menu (scontrino, a mano): resta nello storico anche se il menu ricomincia */
function addSpesa(x) {
  S.spese = S.spese || [];
  S.spese.push(Object.assign({ id: 'x' + Date.now().toString(36), week: 'x', giro: 'spesa', items: [], extras: [], stima: null }, x));
  S.spese.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
/* «Ho cucinato altro»: tiene quantità e nome scritti prima di ridisegnare la scheda */
function ckRead() {
  const ck = ui.ck;
  if (!ck) return;
  for (const el of document.querySelectorAll('input[data-ckq]')) if (ck.sel[el.dataset.ckq] != null) ck.sel[el.dataset.ckq] = parseFloat(el.value.replace(',', '.')) || 0;
  const n = $('input[data-ckn]'); if (n) ck.name = n.value;
}
/* rifà il menu da oggi con quello che c'è «In casa»: tiene i piatti cucinati da te, i pasti saltati e il pranzo di oggi se è già passato */
function replanFromStock(o = {}) {
  if (S.week.start !== TODAY) { for (const l of S.dispensa) l.wk = l.wk || S.week.start; A.newFrom({ d: TODAY, quiet: true }); }
  const w = S.week, late = o.lunchDone || new Date().getHours() >= 15, sh0 = o.keep ? shopping(w) : null;
  for (const k in w.slots) {
    const s = w.slots[k];
    if (s && (s.own || s.skip)) continue;
    if (o.keep && !(sh0.short[k] && sh0.short[k].size) && slotDish(w, k) && slotDish(w, k).dish) continue;     // si fa ancora con quello che c'è: resta
    if (late && kDay(k) === 0 && kT(k) === 'p') continue;          // già mangiato
    delete w.slots[k];
  }
  if (late) for (const k of lunchKeys(0)) if (!w.slots[k]) w.slots[k] = { skip: true };
  w.sfizi = {};
  autofill('casa');
  const nd = shopNeededDay(), from = nd ? Math.max(0, diffDays(nd, w.start)) : 0;
  w.win = nd ? { from, days: Math.min(4, 7 - from) } : { from: 0, days: 0 };      // la prossima spesa: dai giorni in cui finiscono le scorte
  save(); ui.sheets = []; ui.tab = 'menu';
}
/* aggiunge un prodotto «In casa» (scadenza tipica da oggi) */
function addHome(iid, q) {
  const i = ING[iid];
  if (!i || !(q > 0)) return;
  (S.dispensa = S.dispensa || []).push({ id: 'h' + Date.now().toString(36) + S.dispensa.length, iid, q: Math.round(q * 100) / 100, exp: addDays(TODAY, i.dur || 3) });
}
async function readHomePhoto(file) {
  ui.ha = { state: 'loading' }; renderSheet();
  try {
    const res = await claudeReceipt(await receiptImages(file), HOME_SCHEMA, HOME_PROMPT);
    const items = (res.prodotti || []).map(x => {
      const i = ING[x.ingrediente], n = Math.max(1, +x.confezioni || 1), f = Math.min(100, Math.max(5, +x.rimasto_percento || 100)) / 100;
      const q = !i ? 0 : i.u === 'pz' ? n * (x.peso_confezione > 0 && x.peso_confezione <= 30 ? x.peso_confezione : (i.conf || 1)) * f : n * (x.peso_confezione > 0 ? x.peso_confezione : (i.conf || 100)) * f;
      return { nome: x.nome, marca: x.marca, iid: i ? i.id : '', q: Math.round(q) };
    });
    const sel = {}; items.forEach((x, k) => { if (x.iid) sel[k] = true; });
    ui.ha = { state: 'done', items, sel };
  } catch (e) { ui.ha = { state: 'error', err: String((e && e.message) || e) }; }
  renderSheet();
}
function weekSpent() {
  const tr = S.week.trips || {};
  const tot = winKey() ? Object.entries(tr).filter(([k]) => k !== 'settimana').reduce((s, [, x]) => s + (x.spent || 0), 0) : ((tr.settimana || {}).spent || 0);
  S.week.spent = tot ? Math.round(tot * 100) / 100 : null;
}
/* il totale dello scontrino diventa quello della spesa di questi giorni */
function receiptTotal(tot, dataStr) {
  tot = Math.round(tot * 100) / 100;
  const key = tripKey(), tr = (S.week.trips || {})[key];
  if (tr) {
    tr.spent = tot;
    if (tr.stima) tr.extra = Math.round((tot - tr.stima) * 100) / 100;
    tr.fonte = 'scontrino';
    weekSpent();
    syncSpese();
  } else {         // scontrino prima di «Ho fatto la spesa»: totale provvisorio, la conferma lo usa
    S.week.rcPending = { totale: tot, date: rcDate(dataStr) };
    S.week.spent = tot;
  }
}

/* ---------- aggiornamenti dell'app (tools/pubblica_apk.py pubblica versione.json e l'APK nel gist) ----------
   La nuova versione si installa sopra questa, con la stessa firma: menu, profilo, prezzi e spese restano. */
const UPD_URL = 'https://gist.githubusercontent.com/charles1812/ID_DEL_TUO_GIST/raw/versione.json';
let upd = null;
const appVer = () => { try { return JSON.parse(NATIVE.appVersion()); } catch (e) { return {}; } };
async function checkUpdate(manual) {
  if (!NATIVE || !NATIVE.update) return;
  try {
    const j = await (await fetch(UPD_URL + '?t=' + Date.now(), { cache: 'no-store' })).json();
    upd = j.code > (appVer().code || 0) && j.url ? j : null;
    render();
    if (manual) toast(upd ? `⬆️ C'è la versione ${esc(upd.name)}` : `✅ Hai già l'ultima versione (${esc(appVer().name || '')})`);
  } catch (e) { if (manual) toast('Non riesco a controllare gli aggiornamenti: sei senza rete?'); }
}
window.__updateDone = err => {
  ui.updating = false; render();
  if (err) toast(`Aggiornamento non riuscito: ${esc(err)}`);
};
/* novità della versione: si vedono una volta, dopo l'aggiornamento (tienile corte) */
const NOVITA = { ver: '1.47', testo: "🥫 Cose già pronte: scegli se compri sughi, gnocchi e pasta fresca, impanati, impasti (Impostazioni). 📝 Menu a lista: i piatti della settimana senza giorni, ogni giorno scegli cosa cucinare con quello che hai (Menu › Altro). 🧾 Spese fatte: quelle sparite si ritrovano dove possibile, e ogni spesa passata si modifica." };
function updateBanner() {
  if (!upd) {
    if (NATIVE && appVer().name === NOVITA.ver && S.novitaVista !== NOVITA.ver)
      return `<div class="tip green upd"><div class="row" style="gap:10px"><div class="grow"><b>✨ Aggiornata alla versione ${NOVITA.ver}</b><div class="small">${esc(NOVITA.testo)}</div></div>
    <button class="btn btn-soft btn-sm" data-a="novitaOk">Ok</button></div></div>`;
    return '';
  }
  return `<div class="tip green upd"><div class="row" style="gap:10px"><div class="grow"><b>⬆️ Nuova versione ${esc(upd.name)}</b><div class="small">${upd.note ? esc(upd.note) + ' · ' : ''}i tuoi dati restano</div></div>
    <button class="btn btn-green btn-sm" data-a="doUpdate"${ui.updating ? ' disabled' : ''}>${ui.updating ? 'Scarico…' : 'Aggiorna'}</button></div></div>`;
}

/* ---------- Google Wallet: i pagamenti nei supermercati letti dalle notifiche (WalletListener.java) ----------
   Il telefono li tiene anche ad app chiusa; «Sì» dalla notifica li registra alla prossima apertura, gli altri si chiedono qui.
   Diventano la spesa del giro corrente; «pay» è l'identificativo del pagamento (così non lo chiedo due volte). */
const hasWallet = () => !!(NATIVE && NATIVE.walletList);
function walletItems() {
  try { return JSON.parse(NATIVE.walletList() || '[]'); } catch (e) { return []; }
}
function walletCheck() {
  if (!hasWallet() || !S.setup) return;
  const items = walletItems().filter(x => x.stato === 'attesa' || x.stato === 'si');
  if (!items.length) return;
  const it = items[0], tr = (S.week.trips || {})[tripKey()];
  const clash = tr && tr.spent && tr.pay !== it.pay;          // c'è già una spesa per questo giro: sostituire o sommare?
  if (it.stato === 'si' && !clash) { walletApply(it, 'nuova'); return walletCheck(); }
  if (!ui.sheets.some(s => s.type === 'wallet' && s.pay === it.pay)) { ui.sheets = ui.sheets.filter(s => s.type !== 'wallet'); openSheet('wallet', { pay: it.pay }); }
}
function walletApply(it, how) {      // how: nuova | sostituisci | somma
  const w = S.week, key = tripKey(), old = (w.trips || {})[key];
  const somma = how === 'somma' && old && old.spent;
  const spent = Math.round((somma ? old.spent + it.totale : it.totale) * 100) / 100, date = somma ? old.date : it.date;
  const stima = Math.round(shopping(w, true).cassa * 100) / 100;
  w.trips = w.trips || {};
  w.trips[key] = Object.assign(somma && old.items ? { items: old.items, extras: old.extras, m: old.m } : tripSnapshot(w),
    { date, spent, stima, extra: Math.round((spent - stima) * 100) / 100, pay: it.pay, negozio: it.negozio, fonte: 'wallet' });
  weekSpent();
  syncSpese();
  w.status = 'cook'; w.shopDate = w.shopDate || it.date;
  NATIVE.walletDone(it.pay);
  save();
}
window.__wallet = () => { walletCheck(); };
/* data dello scontrino (come la scrive Claude: «14/10/2026» o «2026-10-14»), altrimenti oggi */
/* differenza tra quanto hai pagato e la lista stimata: le cose comprate fuori lista */
function spentDiff(v, stima) {
  if (!(v > 0)) return `Lista stimata ${eur(stima)}.`;
  const d = v - stima;
  return `Lista stimata ${eur(stima)} · ${Math.abs(d) < 0.5 ? 'in linea con la stima' : d > 0 ? `<b>+${eur(d)} fuori lista</b> (o prezzi più alti)` : `${eur(-d)} meno della stima`}`;
}
function rcDate(s) {
  let m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = String(s || '').match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
  return TODAY;
}
function spGuess(name) {     // reparto ed emoji per un prodotto qualunque del supermercato
  const n = name.toLowerCase();
  const R = [[/surgel/, 'surg', '🧊'], [/coca|cola|pepsi|fanta|sprite|aranciata|chinotto|t[eè] fredd|bibita|energy|red bull/, 'extra', '🥤'],
    [/birra/, 'extra', '🍺'], [/\bvino\b|prosecco/, 'extra', '🍷'], [/acqua/, 'extra', '💧'], [/succo|nettare|spremuta/, 'extra', '🧃'],
    [/cioccolat|nutella|kinder|ovetto|praline/, 'extra', '🍫'], [/caramell|gomm|chewing|liquiriz|mentin/, 'extra', '🍬'],
    [/patatin|chips|snack|crackers|taralli|salatin|pop.?corn/, 'extra', '🍿'], [/gelato|ghiacciol/, 'surg', '🍦'],
    [/biscott|merendin|wafer|crostatin|brioche|plumcake/, 'extra', '🍪'], [/yogurt|latte|formagg|mozzarell|prosciutt|salame|uova|burro|panna/, 'frigo', '🧀'],
    [/pollo|manzo|bovino|suino|salsicc|tacchino|vitello/, 'carne', '🥩'], [/salmone|tonno fresco|merluzz|orata|branzino|gamber/, 'pesce', '🐟'],
    [/pane|piadin|focacc|grissin/, 'pane', '🥖'], [/insalat|pomodor|zucchin|carot|mela|banan|arance|frutta|verdur/, 'fv', '🥬']];
  for (const [rx, r, e] of R) if (rx.test(n)) return [r, e];
  return ['secco', '🛒'];
}
async function spGet(path) {
  const r = await fetch(API + path, { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore || `errore ${r.status}`);
  return j;
}
/* crea (o aggiorna) l'ingrediente collegato a un prodotto vero del supermercato */
function spIngredient(p) {
  const id = 'sp_' + p.m + '_' + p.c.replace(/[^a-z0-9]/gi, '').slice(-24);
  const one = p.pezzi > 1 && p.pezzo ? p.pezzo : null;
  const u = p.base === 'pz' ? 'pz' : p.base, conf = one ? p.pezzi * p.pezzo : Math.max(1, Math.round(p.qty || 1));
  const [r, e] = spGuess(p.n);
  let ing = S.custom.ing.find(x => x.id === id);
  if (!ing) { ing = { id, mine: true, sp: true }; S.custom.ing.push(ing); }
  Object.assign(ing, { n: p.n, e, r: ing.r || r, u, conf, dur: r === 'fv' ? 5 : r === 'carne' || r === 'pesce' ? 2 : r === 'frigo' ? 10 : 180,
    p: Math.round(p.prezzo / (SM[p.m].idx / D.baseIdx) * 100) / 100, link: { m: p.m, c: p.c, b: p.b, one }, fetched: Date.now() });
  if (u === 'pz') ing.pzn = ['pezzo', 'pezzi'];
  (S.prices[p.m] = S.prices[p.m] || {})[id] = Math.round(p.prezzo * 100) / 100;
  reindex(); save();
  return ing;
}
/* prezzo di un prodotto del catalogo riportato all'unità dell'ingrediente (confezione o kg/l), come i prezzi veri */
function spIngPrice(iid, p) {
  const ing = ING[iid], k = (((D.regole || {}).r || {})[iid] || {}).k || 1;
  let v;
  if (ing.u === 'pz') v = p.base === 'pz' ? p.up * (ing.conf || 1) : p.prezzo;
  else if (p.up && p.base !== 'pz') v = ing.conf ? p.up * k * ing.conf : p.up * k * 1000;
  return v > 0 ? Math.round(v * 100) / 100 : null;
}
/* i prodotti del supermercato scelti si aggiornano di prezzo da soli (al massimo ogni 3 giorni) */
async function refreshSp() {
  for (const ing of S.custom.ing.filter(x => x.link)) {
    try { spIngredient(await spGet(`prodotto.php?m=${ing.link.m}&c=${encodeURIComponent(ing.link.c)}`)); } catch (e) { /* riprovo la prossima volta */ }
  }
  render();
}
/* prezzi reali del supermercato (tools/esselunga_prezzi.py): l'ultimo scaricato o la copia inclusa nell'app */
function feed(m = S.market) {
  const a = (S.feeds || {})[m], b = (D.feeds || {})[m];
  if (!a || !b) return a || b || null;
  return a.updated >= b.updated ? a : b;
}
/* stima per le catene senza prezzi veri: prezzo base ricalibrato sul prezzo vero Esselunga (stesso tipo di prodotto
   «primo prezzo» dell'indice Altroconsumo), salvo casi anomali; poi l'indice della catena */
function basePrice(iid) {
  const e = feed('esselunga'), f = e && e.prices[iid], b0 = ING[iid].p;
  if (!f || !SM.esselunga) return b0;
  const b = f.p / (SM.esselunga.idx / D.baseIdx);
  return b > b0 * 0.4 && b < b0 * 2.5 ? b : b0;
}
const estimate = iid => Math.round(basePrice(iid) * factor() * 100) / 100;
/* marche del supermercato: in automatico l'app sceglie il prodotto a marchio della catena (prima la linea base,
   poi quella economica, poi bio e premium), il più economico disponibile; se non c'è, il predefinito del file prezzi */
const STORE_BRANDS = {
  esselunga: [/^esselunga$/i, /^smart$/i, /esselunga|naturama|equilibrio/i],
  carrefour: [/^carrefour$/i, /^simpl$/i, /carrefour|terre d'italia/i],
  pam: [/^pam$/i, /^pam(\s|$)/i, /tesori dell'arca/i],
  coop: [/^coop$/i, /coop|vivi verde|bene s[iì]|fior fiore/i],
  conad: [/^conad$/i, /conad|sapori (&|e) idee|verso natura|piacersi|alimentum/i]
};
function storeOpt(fp, m) {
  const tiers = STORE_BRANDS[m];
  if (!tiers || S.storeBrand === false) return null;
  const opts = (fp.opts || []).filter(o => !o.out && !/glut|lattosio/i.test(o.n || ''));   // senza glutine/lattosio solo se scelti da te
  for (const rx of tiers) {
    const c = opts.filter(o => rx.test(o.b || '') || (!o.b && rx.test((o.n || '').split(/[\s,]/)[0])));
    if (c.length) return c.reduce((a, o) => o.p < a.p ? o : a);
  }
  return null;
}
/* prodotto automatico per un ingrediente (senza scelta tua) */
function autoOpt(iid, m = S.market) {
  const f = feed(m), fp = f && f.prices[iid];
  if (!fp) return null;
  const so = storeOpt(fp, m), d = (fp.opts || []).find(x => x.c === fp.code);
  return so ? { p: so.p, n: so.n, b: so.b, promo: so.promo, c: so.c, store: true } : { p: fp.p, n: fp.prod, b: d && d.b, promo: fp.promo, c: fp.code };
}
/* prodotto in uso per un ingrediente: quello scelto (S.choice) o quello automatico */
function chosenOpt(iid, m = S.market) {
  const f = feed(m), fp = f && f.prices[iid];
  if (!fp) return null;
  const code = ((S.choice || {})[m] || {})[iid], o = code && (fp.opts || []).find(x => x.c === code);
  return o ? { p: o.p, n: o.n, b: o.b, promo: o.promo, c: o.c, chosen: true } : Object.assign(autoOpt(iid, m), { chosen: false });
}
/* foto dei prodotti della spesa (Esselunga e Carrefour): lette una volta da prodotto.php e ricordate sul telefono in S.pimg */
const pimgQueue = new Set(), pimgFail = new Set();
let pimgBusy = false;
/* prodotto del supermercato per un ingrediente (catene lette dal telefono): quello scelto con il prezzo, se no quello del catalogo */
function catItem(iid, m = S.market) {
  const f = feed(m), fp = f && f.prices[iid], o = fp && !isCustom(iid) && chosenOpt(iid, m), opt = o && (fp.opts || []).find(x => x.c === String(o.c));
  return opt || (((S.cat || {})[m] || {})[iid]) || null;
}
function prodImg(iid) {
  if (PHONE_MARKETS[S.market]) { const c = catItem(iid); return (c && c.img) || ''; }
  const o = !isCustom(iid) && chosenOpt(iid), link = ING[iid] && ING[iid].link;
  const key = o && o.c && SP_MARKETS.includes(S.market) ? S.market + ':' + o.c : link && SP_MARKETS.includes(link.m) ? link.m + ':' + link.c : null;
  if (!key) return '';
  const v = (S.pimg = S.pimg || {})[key];
  if (v === undefined && !pimgFail.has(key)) pimgQueue.add(key);
  return v || '';
}
async function pimgLoad() {
  if (pimgBusy || !pimgQueue.size) return;
  pimgBusy = true;
  const keys = [...pimgQueue]; pimgQueue.clear();
  let i = 0, n = 0;
  const work = async () => {
    while (i < keys.length) {
      const k = keys[i++], m = k.slice(0, k.indexOf(':')), c = k.slice(k.indexOf(':') + 1);
      try { S.pimg[k] = (await spGet(`prodotto.php?m=${m}&c=${encodeURIComponent(c)}`)).img || ''; n++; } catch (e) { pimgFail.add(k); }
    }
  };
  await Promise.all([work(), work(), work()]);
  pimgBusy = false;
  if (n) { save(); ui.sheets.length ? renderSheet() : render(); }
}
/* icona dell'ingrediente nelle ricette: la foto del prodotto scelto, se c'è, altrimenti l'emoji */
function ingIcon(iid) {
  const pim = prodImg(iid);
  if (pimgQueue.size) setTimeout(pimgLoad, 0);
  return pim ? `<span class="e ipic">${photo(pim)}</span>` : `<span class="e">${ING[iid].e}</span>`;
}
const feedItem = iid => isCustom(iid) ? null : chosenOpt(iid);
const brandNote = (iid, m = S.market) => ((S.brandNote || {})[m] || {})[iid];
function price(iid) {
  if (isCustom(iid)) return S.prices[S.market][iid];
  const o = chosenOpt(iid);
  return o ? o.p : estimate(iid);
}
const feedDate = f => fdate(f.updated.slice(0, 10), { day: 'numeric', month: 'short' });
/* scarica i prezzi veri di una catena (primo indirizzo che risponde: Hostinger, poi il gist di riserva) */
async function fetchFeed(m) {
  const url = (D.feedUrls || {})[m];
  if (!url) return null;
  for (const u of [].concat(url)) {
    try {
      const r = await fetch(u + '?t=' + Date.now(), { cache: 'no-store' });
      const x = await r.json();
      if (x.market === m && x.prices) return x;
    } catch (e) { /* prova il prossimo */ }
  }
  return null;
}
/* a ogni apertura dell'app: prezzi di tutte le catene e dei prodotti scelti dal supermercato */
let lastRefresh = 0;
async function refreshAll(manual) {
  if (!manual && Date.now() - lastRefresh < 60e3) return;      // non più di una volta al minuto
  lastRefresh = Date.now();
  checkUpdate();
  walletCheck();
  await refreshRecipes();
  let ok = 0;
  for (const m of Object.keys(D.feedUrls || {})) {
    const j = await fetchFeed(m);
    if (j) { j.fetched = Date.now(); (S.feeds = S.feeds || {})[m] = j; ok++; }
  }
  if (ok) { save(); render(); }
  await refreshSp();
  if (PHONE_MARKETS[S.market] && hasNativeHttp()) { readPhoneChain(S.market, manual); return; }
  if (manual) toast(ok ? `🔄 Prezzi aggiornati${feed() ? ` (${esc(SM[S.market].n)} del ${feedDate(feed())})` : ''}` : 'Non riesco a scaricare i prezzi: uso quelli salvati');
}

/* ---------- Coop e Conad: prezzi letti dal telefono ----------
   I loro siti bloccano il server (Coop: IP del datacenter; Conad: il negozio si sceglie solo con verifica anti-bot),
   quindi li legge l'app, con la tua connessione. Coop: ricerca pubblica di EasyCoop (Coop Alleanza 3.0), pochi KB
   per ingrediente. Conad: pagina di ricerca del negozio che scegli tu nel sito Conad aperto dentro l'app.
   Una lettura ogni 20 ore al massimo; Conad (circa 0,6 MB per ricerca) solo su Wi-Fi, salvo «Aggiorna». */
const PHONE_MARKETS = { coop: 'Coop (EasyCoop, prezzi online di Coop Alleanza 3.0)', conad: 'Conad, il tuo negozio', iperal: 'Iperal spesa online, il tuo punto vendita' };
const PHONE_EVERY = 20 * 3600e3;
const PET = /purina|gourmet|felix|whiskas|friskies|sheba|cesar|monge|almo-nature|(^|-)(per-)?(cani|gatti|cane|gatto)(-|$)/;
/* per frutta e verdura fresche: niente prodotti trasformati che ne contengono il nome (passato di carote, vellutate...) */
const PROCESSED = /passat|vellutat|frullat|succo|zupp|minestr|crem[ae]|pure|sugo|salsa|cott[ei]-a-vapore|chips|estratt|centrifug|spremut|nettare|bevand|yogurt|pesto|confettur|marmellat|sott-?olio|sottacet|surgelat|biscott|torta|snack|essiccat|disidratat|patatin|plasmon|mellin|paff|merend/;
const NONFOOD = /schiuma|barba|bagnoschiuma|doccia|sapone|deodorant|crema-(viso|mani|corpo)|balsamo|maschera|dentifric|cosmetic|profum|candel|detergent|ammorbident|lettiera/;
const hasNativeHttp = () => !!(window.Native && Native.http);
let nativeSeq = 0, phoneBusy = false, phoneProg = null;
const nativeWait = {};
window.__http = (id, status, text) => { const f = nativeWait[id]; delete nativeWait[id]; if (f) f({ status, text }); };
function nhttp(method, url, headers = {}, body = '', pick = '') {
  return new Promise(res => { const id = ++nativeSeq; nativeWait[id] = res; Native.http(id, method, url, JSON.stringify(headers), body, pick); });
}
const slugify = s => (s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/* le regole sono scritte per i nomi Esselunga/Carrefour (che iniziano con il prodotto): qui la marca può stare davanti */
const relaxRx = rx => new RegExp(rx.replace(/(?<!\[)\^/g, '(?:^|-)'));
const unHtml = s => s.replace(/&#34;|&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const titleCase = s => (s || '').toLowerCase().replace(/(^|[\s'-])\p{L}/gu, x => x.toUpperCase());
/* risultati di una ricerca: [{c, n, b, price, qty (g/ml, 0 se ignota), promo, out}] */
/* formato dalla descrizione Iperal: «g 700», «g 100x2», «ml 500», «pz 6», «Confezione da circa 1,2 kg» */
function iperalSize(desc, name) {
  const U = { g: 1, gr: 1, kg: 1000, ml: 1, cl: 10, l: 1000, lt: 1000 };
  const m = String(desc || '').trim().toLowerCase().match(/^(g|gr|kg|ml|cl|lt|l|pz)\s*(\d+(?:[.,]\d+)?)(?:\s*x\s*(\d+))?/);
  if (m) { const v = parseFloat(m[2].replace(',', '.')) * (m[3] ? +m[3] : 1); return m[1] === 'pz' ? { pz: v } : { qty: v * U[m[1]], ml: /^(ml|cl|l|lt)$/.test(m[1]) }; }
  return { qty: sizeOf(desc + ' ' + name) };
}
async function phoneSearch(m, q) {
  if (m === 'iperal') {
    const r = await nhttp('GET', 'https://www.iperalspesaonline.it/ebsn/api/products?q=' + encodeURIComponent(q) + '&page_size=40', { Accept: 'application/json' }, '');
    if (r.status !== 200) throw new Error('Iperal non risponde (' + r.status + ')');
    const j = JSON.parse(r.text.slice(r.text.indexOf('{')));
    return ((j.data || {}).products || []).map(p => {
      const inf = p.productInfos || {}, sf = inf.TIPOLOGIA === 'Sfuso' ? parseFloat(inf.WEIGHT_SELLING) || 1000 : 0;
      const size = sf ? { qty: sf } : iperalSize(p.description, p.name);
      const num = v => typeof v === 'number' ? v : parseFloat(String(v || '').replace(',', '.')) || 0;
      const unit = num(p.price) || num(p.priceDisplay) || num(p.priceStandardDisplay) || num(p.priceStandard), std = num(p.priceStandardDisplay) || num(p.priceStandard);
      const price = sf ? unit * sf / 1000 : unit;          // sfuso: prezzo al kg, venduto a confezioni di peso fisso
      const n = [p.name, p.shortDescr, size.pz ? size.pz + ' pz' : size.qty ? Math.round(size.qty) + (size.ml ? ' ml' : ' g') : ''].filter(Boolean).join(' ');
      return { c: p.productId, n, b: titleCase((p.vendor && p.vendor.name) || p.shortDescr || ''), price, qty: size.qty || null, sf: sf || null,
        promo: std > unit + 0.001, out: !(p.available > 0), img: p.mediaURL || '', ean: p.barcode || '' };
    });
  }
  if (m === 'coop') {
    const gql = `{products(search:${JSON.stringify(q)},pageSize:40){items{name sku manufacturer stock_status price_range{minimum_price{final_price{value} regular_price{value}}}} aggregations{attribute_code options{label value}}}}`;
    const r = await nhttp('POST', 'https://www.easycoop.com/graphql', { 'Content-Type': 'application/json', Store: 'c_901' }, JSON.stringify({ query: gql }));
    const d = r.status === 200 && JSON.parse(r.text).data, P = d && d.products;
    if (!P) throw new Error('Coop non risponde (' + r.status + ')');
    const man = {};
    for (const a of P.aggregations || []) if (a.attribute_code === 'manufacturer') for (const o of a.options) man[o.value] = o.label;
    return P.items.map(it => {
      const pr = it.price_range.minimum_price, price = pr.final_price.value, full = pr.regular_price.value;
      return { c: it.sku, n: it.name, b: titleCase(man[it.manufacturer] || ''), price, qty: sizeOf(it.name), promo: price < full - 0.001, out: it.stock_status !== 'IN_STOCK' };
    });
  }
  const r = await nhttp('GET', 'https://spesaonline.conad.it/search?query=' + encodeURIComponent(q), {}, '', 'data-product="([^"]+)"');
  if (r.status !== 200) throw new Error('Conad non risponde (' + r.status + ')');
  const um = { GR: 1, G: 1, KG: 1000, ML: 1, CL: 10, LT: 1000, L: 1000 };
  return JSON.parse(r.text).map(s => JSON.parse(unHtml(s))).map(p => ({ c: p.code, n: p.nome, b: titleCase(p.marchio), price: p.basePrice,
    qty: um[p.netQuantityUm] ? p.netQuantity * um[p.netQuantityUm] : sizeOf(p.nome), promo: !!(p.promo && p.promo.length), out: false }));
}
/* prezzo dell'unità dell'ingrediente (confezione o kg/l), come in aggiorna.php sul server */
function phoneUnitPrice(iid, x, k) {
  const ing = ING[iid];
  if (!x.price) return 0;
  if (ing.u === 'pz') {
    const m = slugify(x.n).match(/(?:^|-)(\d+)-(?:pz|pezzi|uova|unita|fette|panini)(?:-|$)/);
    return m && ing.conf ? x.price / +m[1] * ing.conf : 0;
  }
  if (!x.qty) return 0;
  const per = x.price / x.qty * k;
  return ing.conf ? per * ing.conf : per * 1000;
}
/* prova: per un ingrediente, quali filtri scartano i risultati di una ricerca (diagnosi) */
async function phoneMatchDbg(m, iid) {
  const rule = D.regole.r[iid], never = new RegExp(D.regole.never), rx = relaxRx(rule.t), no = rule.no ? new RegExp(rule.no) : null, strict = new RegExp(rule.t), fresh = ING[iid].r === 'fv';
  const res = await phoneSearch(m, ING[iid].n.replace(/\(.*?\)/g, '').trim());
  return res.slice(0, 8).map(x => { const s = slugify(x.n); return [s, rx.test(s), !(no && no.test(s)), !never.test(s), !PET.test(s), !NONFOOD.test(s), !(fresh && (PROCESSED.test(s) || /(^|-)\d+-(ml|l|cl)(-|$)/.test(s))), strict.test(s)]; });
}
async function readPhoneChain(m, manual) {
  if (phoneBusy) return;
  const old = (S.feeds || {})[m];
  if (!manual && old && old.phone && Date.now() - (old.fetched || 0) < PHONE_EVERY) return;
  if (m === 'conad' && !S.conadStore) { if (manual) toast('Prima scegli il tuo Conad nelle impostazioni'); return; }

  if (m === 'conad' && !manual && Native.metered && Native.metered()) return;
  const never = new RegExp(D.regole.never), ess = feed('esselunga'), prices = {}, missing = [];
  let zero = 0, seen = 0, fails = 0, done = 0;
  // prima gli ingredienti della lista della spesa: dopo meno di un minuto la lista e il carrello usano già i prezzi veri
  const inList = new Set(shopping(S.week, true).items.map(it => it.iid));
  const rules = Object.entries(D.regole.r).sort(([a], [b]) => inList.has(b) - inList.has(a)), nList = rules.filter(([iid]) => inList.has(iid)).length;
  const keep = partial => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
    const prev = ((S.feeds || {})[m] || {}).prices || {};
    (S.feeds = S.feeds || {})[m] = { market: m, updated: d, fetched: partial ? 0 : Date.now(), phone: true, partial,
      fonte: PHONE_MARKETS[m] + (m === 'conad' ? ' (' + S.conadStore + ')' : ''), prices: partial ? Object.assign({}, prev, prices) : prices, missing };
    save(); render();
  };
  phoneBusy = true;
  phoneProg = { m, i: 0, n: rules.length };
  if (manual) toast(`🔄 Leggo i prezzi ${esc(SM[m].n)}: prima i ${nList} prodotti della tua lista`);
  try {
    let step = 0;
    for (const [iid, rule] of rules) {
      phoneProg.i = ++step;
      if (step === nList + 1) loadNutrition();
      if (step === nList + 1 && Object.keys(prices).length) { keep(true); if (manual) toast(`🏷️ ${esc(SM[m].n)}: la tua lista ha i prezzi veri. Continuo con gli altri ingredienti`); }
      if (step % 10 === 0 && ui.tab === 'spesa') render();
      if (!ING[iid]) continue;
      const rx = relaxRx(rule.t), no = rule.no ? new RegExp(rule.no) : null, k = rule.k || 1;
      const name = ING[iid].n.replace(/\(.*?\)/g, '').trim();
      const strict = new RegExp(rule.t), fresh = ING[iid].r === 'fv';
      const ok = x => { const s = slugify(x.n); return rx.test(s) && !(no && no.test(s)) && !never.test(s) && !PET.test(s) && !NONFOOD.test(s) && !(fresh && (PROCESSED.test(s) || /(^|-)\d+-(ml|l|cl)(-|$)/.test(s))); };
      let hits = [];
      const pool = [];
      for (const q of [name, name.split(/\s+/)[0]]) {     // se il nome intero non trova niente, solo la prima parola
        let res = [];
        try { res = await phoneSearch(m, q); done++; } catch (e) { if (++fails > 8 && fails > done) throw e; }
        pool.push(...res);
        seen += res.length; zero += res.filter(x => !x.price).length;
        hits = res.filter(ok);
        const exact = hits.filter(x => strict.test(slugify(x.n)));   // il nome inizia con il prodotto: più affidabile
        if (exact.length >= 3 || fresh) hits = exact;
        await new Promise(r => setTimeout(r, window.__phoneDelay ?? 600));
        if (hits.length || q === name.split(/\s+/)[0]) break;
      }
      if (!hits.length) {          // le regole sono scritte per i nomi Esselunga/Carrefour: qui basta che il nome inizi con l'ingrediente
        const w = slugify(name.split(/\s+/)[0]), loose = new RegExp('^' + w.slice(0, Math.max(4, w.length - 1)) + '[a-z]{0,2}(-|$)');
        hits = pool.filter(x => { const s = slugify(x.n); return loose.test(s) && !(no && no.test(s)) && !never.test(s) && !PET.test(s) && !NONFOOD.test(s) && !(fresh && (PROCESSED.test(s) || /griglia|tritat|frost|findus|sott|liofilizz|cubetti/.test(s))); });
      }
      const base = ING[iid].p;   // prezzi assurdi (formato letto male): fuori da 1/4–4 volte il prezzo tipico
      // catalogo (prodotto, foto, codice a barre) anche quando i prezzi non ci sono: per riconoscerlo sullo scaffale
      const ch = hits.filter(x => !x.out)[0] || hits[0];
      if (ch) ((S.cat = S.cat || {})[m] = S.cat[m] || {})[iid] = { c: String(ch.c), n: ch.n, b: ch.b, img: ch.img || '', ean: ch.ean || '' };
      let opts = hits.map(x => Object.assign({ c: String(x.c), n: x.n, b: x.b, p: Math.round(phoneUnitPrice(iid, x, k) * 100) / 100, promo: x.promo, out: x.out }, x.sf ? { sf: x.sf } : {}, x.qty ? { q: x.qty } : {}, x.img ? { img: x.img } : {}, x.ean ? { ean: x.ean } : {})).filter(o => o.p > 0 && o.p >= base / 4 && o.p <= base * 4);
      if (opts.length) {
        const ps = opts.map(o => o.p).sort((a, b) => a - b), med = ps[Math.floor(ps.length / 2)];
        opts = opts.filter(o => o.p >= med / 3 && o.p <= med * 3).sort((a, b) => a.p - b.p).slice(0, 30);
      }
      if (!opts.length) { missing.push(iid); continue; }
      // predefinito: il più vicino al prodotto predefinito Esselunga (stesso tipo), altrimenti il più economico
      const avail = opts.filter(o => !o.out).length ? opts.filter(o => !o.out) : opts, ref = ess && ess.prices[iid] && ess.prices[iid].p;
      const pick = ref ? avail.reduce((a, o) => Math.abs(Math.log(o.p / ref)) < Math.abs(Math.log(a.p / ref)) ? o : a) : avail[0];
      prices[iid] = { p: pick.p, per: ING[iid].conf ? 'conf' : 'kg', prod: pick.n, code: pick.c, promo: pick.promo, esaurito: pick.out, opts };
    }
    if (m === 'conad' && seen && zero / seen > 0.5) throw new Error('il sito Conad non ha un negozio scelto: sceglilo di nuovo nelle impostazioni');
    if (m === 'iperal' && seen && zero / seen > 0.5) {
      const nc = Object.keys((S.cat || {}).iperal || {}).length;
      (S.phoneLog = S.phoneLog || {})[m] = { t: Date.now(), ok: true, msg: `${nc} prodotti con foto e valori nutrizionali; per i prezzi entra con il tuo account Iperal` };
      save(); render(); loadNutrition();
      if (manual) toast(`📷 Iperal: ${nc} prodotti con la foto. Per i prezzi veri entra con il tuo account`);
      return;
    }
    const n = Object.keys(prices).length;
    if (n < 20) throw new Error(`solo ${n} prezzi trovati`);
    keep(false);
    loadNutrition();
    if (manual) toast(`🏷️ ${esc(SM[m].n)}: ${n} prezzi veri letti`);
    (S.phoneLog = S.phoneLog || {})[m] = { t: Date.now(), ok: true, msg: `${n} prezzi letti` };
  } catch (e) {
    console.warn('lettura ' + m + ': ' + e.message);
    (S.phoneLog = S.phoneLog || {})[m] = { t: Date.now(), ok: false, msg: e.message };
    save(); render();
    if (manual) toast(`Non riesco a leggere ${esc(SM[m].n)}: ${esc(e.message)}`);
  } finally { phoneBusy = false; phoneProg = null; if (ui.tab === 'spesa') render(); }
}
/* il sito Conad, aperto dall'app, è stato chiuso: etichetta del negozio scelto (vuota se non trovata) */
/* Iperal: dopo «Fatto» sul sito l'app sa se sei entrato; poi legge i prezzi del tuo punto vendita */
window.__iperalLogin = ok => {
  S.iperalOk = !!ok; save(); render();
  if (ok) { toast('✅ Entrato in Iperal: leggo i prezzi del tuo punto vendita'); if (S.market === 'iperal') readPhoneChain('iperal', true); }
  else toast('Non risulti entrato in Iperal: accedi con il tuo account sul sito e poi tocca «Fatto»');
};
window.__iperalCart = res => {
  let r = {}; try { r = JSON.parse(res); } catch (e) { /* risposta strana */ }
  if (r.ok) toast(`🛒 ${r.n} prodotti nel carrello Iperal: scegli la fascia di ritiro e paga sul sito`);
  else if (r.err === 'login') { S.iperalOk = false; save(); toast('Entra con il tuo account Iperal, poi tocca di nuovo «Metti nel carrello»'); }
  else toast('Iperal non ha accettato il carrello: ' + esc(r.err || 'errore'));
};
window.__conadStore = label => {
  S.conadStore = (label || '').trim() || S.conadStore || 'scelto sul sito Conad';
  save(); render();
  refreshAll(true);
};
function unitCost(iid) { const i = ING[iid]; return i.conf ? price(iid) / i.conf : price(iid) / 1000; }
/* quantità a persona usate davvero: quella scelta per il piatto, o quella della ricetta × il moltiplicatore dell'ingrediente */
function effQ(dish, iid, q) {
  const own = ((S.qty || {})[dish.id] || {})[iid];
  if (own != null) return own;
  return q * (((S.qmul || {})[iid]) || 1);
}
const ingOf = dish => dish.ing.map(([iid, q]) => [iid, effQ(dish, iid, q)]);
function dishCost(id, n = 1) { return ingOf(PI[id]).reduce((s, [iid, q]) => s + q * n * unitCost(iid), 0); }

/* ---------------- calorie e porzioni ----------------
   Fabbisogno: formula di Mifflin-St Jeor × livello di attività, più o meno 400 kcal secondo l'obiettivo.
   Pranzo e cena valgono ciascuno circa un terzo della giornata (il resto: colazione e spuntini).
   Per arrivarci: porzione del piatto adeguata (tra il 90% e il 135% della dose della ricetta, solo per te)
   più i complementi di un pasto normale (pane, frutta, yogurt, frutta secca), mai porzioni enormi. */
const ACTS = [[1.2, 'Sedentario'], [1.375, 'Poco attivo (1-3 allenamenti a settimana)'], [1.55, 'Attivo (3-5 allenamenti)'], [1.725, 'Molto attivo (6-7 allenamenti)']];
const GOALS = { gain: [400, 'Aumentare di peso'], keep: [0, 'Mantenere il peso'], lose: [-400, 'Dimagrire'] };
const MAIN_SHARE = 0.7, PORTION = [0.9, 1.5];
/* quota della giornata per pranzo e per cena, secondo quanto mangi a colazione e negli spuntini */
const BREAKFAST = { poca: [0.45, 'Poca'], normale: [0.35, 'Normale'], abbondante: [0.3, 'Abbondante'] };
/* valori di partenza neutri per chi installa l'app (il profilo si sceglie nel benvenuto o nelle impostazioni) */
/* profilo di una persona: la prima (p1) sei tu e usa S.profile; le altre il loro (spento finché non lo compili) */
const prof = per => Object.assign({ on: true, sex: 'f', age: 30, h: 165, w: 60, act: 1.375, goal: 'keep', comp: true, colaz: 'normale', mealKcal: 0 },
  per && per.id !== 'p1' ? Object.assign({ on: false, comp: false }, per.prof) : S.profile);
function setProf(pid, patch) {
  const o = pid && pid !== 'p1' ? personOf(pid) : null;
  if (o) o.prof = Object.assign(prof(o), patch); else S.profile = Object.assign(prof(), patch);
}
function dayTarget(per) {
  const p = prof(per), bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  return Math.round((bmr * p.act + GOALS[p.goal][0]) / 10) * 10;
}
const mealTarget = per => prof(per).mealKcal || Math.round(dayTarget(per) * BREAKFAST[prof(per).colaz][0] / 10) * 10;
const protRange = per => [Math.round(prof(per).w * 1.6), Math.round(prof(per).w * 2)];   // g al giorno, per chi si allena
function ingNut(iid, q) {
  const i = ING[iid];
  if (!i || i.kcal == null) return null;
  const f = i.u === 'pz' ? q : q / 100, r = i.u !== 'pz' && (S.nutr || {})[iid];       // valori dell'etichetta del prodotto, se letti
  return r ? [r.kcal * f, r.prot * f] : [i.kcal * f, i.prot * f];
}
/* kcal e proteine per 100 g dall'etichetta: tabella della scheda Iperal, oppure Open Food Facts con il codice a barre */
function parseNutTable(html) {
  const t = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
  const k = t.match(/(\d+(?:[.,]\d+)?)\s*kcal/i), pr = t.match(/Proteine\s+(\d+(?:[.,]\d+)?)\s*g/i);
  return k ? { kcal: parseFloat(k[1].replace(',', '.')), prot: pr ? parseFloat(pr[1].replace(',', '.')) : null } : null;
}
let nutrRun = null;
function loadNutrition() { return nutrRun || (nutrRun = loadNutrition1().finally(() => { nutrRun = null; })); }    // una lettura alla volta
async function loadNutrition1() {
  if (!PHONE_MARKETS[S.market]) return;
  const m = S.market, list = shopping(S.week, true).items.map(it => it.iid), all = [...new Set([...list, ...Object.keys(((S.cat || {})[m]) || {})])];
  S.nutr = S.nutr || {};
  let n = 0;
  try {
    for (const iid of all) {
      const c = catItem(iid, m), ing = ING[iid];
      if (!c || !ing || ing.u === 'pz' || ing.disp) continue;
      const key = m + ':' + c.c;
      if (S.nutr[iid] && S.nutr[iid].key === key) continue;
      let r = null;
      try {
        if (m === 'iperal' && hasNativeHttp()) {
          const x = await nhttp('GET', 'https://www.iperalspesaonline.it/ebsn/api/products/' + encodeURIComponent(c.c), { Accept: 'application/json' }, '');
          const j = x.status === 200 && JSON.parse(x.text.slice(x.text.indexOf('{')));
          const md = (j && j.data && j.data.metaData) || {};
          r = parseNutTable((md.product_description || {}).nutritional_values) || parseNutTable((md.product_info || {}).NUTRITIONAL_INFORMATIONS);
        }
        if (!r && c.ean) {
          const o = await (await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c.ean)}.json?fields=nutriments`)).json();
          const nu = o && o.product && o.product.nutriments;
          if (nu && nu['energy-kcal_100g'] != null) r = { kcal: +nu['energy-kcal_100g'], prot: nu.proteins_100g != null ? +nu.proteins_100g : null };
        }
      } catch (e) { /* riprovo la prossima volta */ }
      if (r && r.kcal > 0 && r.kcal < 900) { S.nutr[iid] = { kcal: r.kcal, prot: r.prot != null ? r.prot : ing.prot, n: c.n, key }; n++; }
      await new Promise(res => setTimeout(res, window.__phoneDelay ?? 400));
    }
  } finally {
    if (n) { nutVer++; save(); render(); }
  }
}
let nutVer = 0;
const nutCache = new Map();
/* kcal e proteine a persona con le quantità in uso (miss = ingredienti senza valori, es. prodotti presi dal supermercato) */
function dishNut(dish) {
  const key = dish.id + '|' + nutVer, c = nutCache.get(key);
  if (c) return c;
  let k = 0, p = 0, miss = 0;
  for (const [iid, q] of ingOf(dish)) { const n = ingNut(iid, q); if (n) { k += n[0]; p += n[1]; } else if (q > 0) miss++; }
  const r = { k, p, miss };
  nutCache.set(key, r);
  return r;
}
function portionFor(dish, per) {
  if (!prof(per).on || dish.own) return 1;
  const k = dishNut(dish).k;
  if (!k) return 1;
  return Math.min(PORTION[1], Math.max(PORTION[0], Math.round(mealTarget(per) * MAIN_SHARE / k * 20) / 20));
}
/* complementi per arrivare all'obiettivo del pasto: niente pane se il piatto ha già pane, piadina o pizza */
const HAS_BREAD = ['pane', 'piadina', 'pancarre', 'base_pizza', 'tortillas', 'sfoglia'];
const COMPS = [['pane', 80, '80 g di pane', d => !d.ing.some(([i]) => HAS_BREAD.includes(i))], ['banane', 120, '1 banana'], ['yogurt', 170, '1 yogurt greco'],
  ['mandorle', 30, '30 g di mandorle'], ['mozzarella', 125, '1 mozzarella', d => !d.ing.some(([i]) => i === 'mozzarella')], ['mele', 180, '1 mela']];
function complements(dish, per) {
  if (!prof(per).on || dish.own) return [];
  let rest = mealTarget(per) - dishNut(dish).k * portionFor(dish, per);
  const out = [];
  for (const [iid, q, label, ok] of COMPS) {
    if (rest < 90) break;
    if (!ING[iid] || (ok && !ok(dish)) || excluded().has(iid)) continue;
    if (S.week.mode === 'leggero' && (iid === 'mandorle' || iid === 'mozzarella')) continue;   // più digeribile
    if (S.week.mode === 'risparmio' && !['pane', 'banane', 'mele'].includes(iid)) continue;      // menu economico
    if (S.week.mode === 'casa' && (S.dispensa || []).length && !S.dispensa.some(l => sameUse(l.iid, iid))) continue;   // con quello che ho: niente da comprare
    const k = ingNut(iid, q)[0];
    if (out.length && k > rest * 1.5) continue;
    out.push({ i: iid, q, k, label });
    rest -= k;
  }
  return out;
}
/* il tuo pasto: piatto in porzione adeguata più i complementi */
function mealNut(dish, per) {
  const n = dishNut(dish), f = portionFor(dish, per), cs = complements(dish, per);
  return { k: n.k * f + cs.reduce((s, c) => s + c.k, 0), p: n.p * f + cs.reduce((s, c) => s + ingNut(c.i, c.q)[1], 0), f, cs, miss: n.miss };
}
/* ---------- chi mangia: le persone di casa ----------
   S.people: [{id, name, e, c: [7], p: [7], lunch: 'insieme' | 'sua', cat, prof}] da lunedì a domenica.
   c = a cena, p = schiscetta a pranzo, ogni settimana. La prima persona (p1) sei tu: il suo profilo è S.profile.
   lunch «sua»: la schiscetta è un piatto tutto suo (pasto «<giorno>p-<id>»), della categoria che preferisce (cat).
   Assenze solo per questa settimana: S.week.away["<giorno><p|c>"] = {id: true}. */
const LCATS = { legumi: ['🫘', 'Solo legumi'], carne: ['🥩', 'Carne'], pesce: ['🐟', 'Pesce'], formaggio: ['🧀', 'Formaggio'], uova: ['🥚', 'Uova'], veg: ['🥦', 'Vegetariano'], primo: ['🍝', 'Primi'], secondo: ['🍗', 'Secondi'] };
const PLAN_TAGS = { carne: ['🥩', 'Carne'], pesce: ['🐟', 'Pesce'], formaggio: ['🧀', 'Formaggio'], pasta: ['🍝', 'Pasta'], legumi: ['🫘', 'Legumi'], uova: ['🥚', 'Uova'], veg: ['🥦', 'Vegetariano'] };
const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const FACES = ['🙂', '👩', '👨', '🧑', '👧', '👦', '👵', '👴'];
function newPerson(i, din = true, lun = false) {
  return { id: i ? 'q' + Math.random().toString(36).slice(2, 8) : 'p1', name: i ? 'Persona ' + (i + 1) : 'Io', e: FACES[i % FACES.length],
    c: Array(7).fill(!!din), p: Array(7).fill(!!lun), lunch: 'insieme', cat: null, prof: { on: false } };
}
/* dalle vecchie impostazioni «persone a cena / schiscette» (o da un backup vecchio) alle persone di casa */
function ensurePeople() {
  if (S.people && S.people.length) return;
  const pc = Math.max(1, S.pc == null ? 2 : S.pc), pp = Math.max(0, S.pp == null ? 1 : S.pp), n = Math.max(pc, pp, 1);
  S.people = Array.from({ length: n }, (_, i) => newPerson(i, i < pc, i < pp));
  save();
}
const personOf = id => (S.people || []).find(x => x.id === id);
const kDay = key => parseInt(key, 10);
const kT = key => key.charAt(String(kDay(key)).length);          // 'p' pranzo (schiscetta) | 'c' cena
const kWho = key => key.split('-')[1] || null;
/* giorno della settimana (0 = lunedì) del giorno d del menu */
const wdOf = (d, w = S.week) => ((parse(w.start).getDay() + 6) % 7 + d) % 7;
function eaters(key, w = S.week) {
  const d = kDay(key), t = kT(key), who = kWho(key), away = ((w.away || {})[d + t]) || {};
  if (!(d >= 0 && d <= 6)) return [];
  return S.people.filter(x => x[t][wdOf(d, w)] && !away[x.id] && (t === 'c' || (who ? x.id === who && x.lunch === 'sua' : x.lunch !== 'sua')));
}
function lunchKeys(d, w = S.week) {
  const out = eaters(d + 'p', w).length ? [d + 'p'] : [];
  for (const x of S.people) if (x.lunch === 'sua' && eaters(d + 'p-' + x.id, w).length) out.push(d + 'p-' + x.id);
  return out;
}
const dayKeys = (d, w = S.week) => [...lunchKeys(d, w), ...(eaters(d + 'c', w).length ? [d + 'c'] : [])];
const anyLunch = () => S.people.some(x => x.p.some(Boolean));
const nOf = (key, w) => eaters(key, w).length;
/* porzioni da cucinare: ognuno la sua (più grande o più piccola se ha il profilo acceso) */
const slotN = (key, dish, w) => eaters(key, w).reduce((s, x) => s + (prof(x).on ? portionFor(dish, x) : 1), 0);
/* conteggi di comodo (benvenuto e vecchi dati): quante persone al massimo a cena e con la schiscetta */
function syncCounts() {
  if (!S.people) return;
  S.pc = Math.max(0, ...[0, 1, 2, 3, 4, 5, 6].map(d => S.people.filter(x => x.c[d]).length));
  S.pp = Math.max(0, ...[0, 1, 2, 3, 4, 5, 6].map(d => S.people.filter(x => x.p[d]).length));
}
function setCounts(pc, pp) {
  const n = Math.max(pc, pp, 1);
  while (S.people.length < n) S.people.push(newPerson(S.people.length));
  S.people = S.people.slice(0, n);
  S.people.forEach((x, i) => { x.c = Array(7).fill(i < pc); x.p = Array(7).fill(i < pp); });
}
/* che tipo di piatto è: carne, pesce, formaggio, legumi, uova, pasta, vegetariano (per le schiscette «solo…» e il piano delle cene) */
const CHEESE = new Set(['mozzarella', 'ricotta', 'stracchino', 'feta', 'gorgonzola', 'scamorza', 'fontina', 'bufala', 'burrata', 'emmental', 'provolone', 'asiago', 'taleggio', 'brie', 'primo_sale', 'caciotta', 'pecorino', 'grana', 'mascarpone']);
const MEAT_X = new Set(['cotto', 'crudo', 'bresaola', 'speck', 'mortadella', 'cotechino', 'salame', 'coppa', 'wurstel']);
const FISH_X = new Set(['tonno', 'sgombro', 'sardine', 'salmone_aff', 'bastoncini', 'merluzzo', 'gamberetti', 'calamari', 'cozze', 'platessa', 'gamberoni', 'vongole']);
const LEGUMI = new Set(['lenticchie', 'ceci', 'borlotti', 'fagioli_rossi', 'cannellini', 'lenticchie_rosse', 'hummus', 'pasta_legumi', 'tofu', 'piselli', 'burger_vegetale']);
const PASTA = new Set(['pasta_corta', 'spaghetti', 'tagliatelle', 'pasta_integrale', 'pasta_legumi', 'pizzoccheri', 'tortellini', 'ravioli', 'gnocchi', 'lasagna', 'lasagne_sfoglie', 'noodles', 'pastina']);
const tagCache = new Map();
function dishTags(p) {
  if (tagCache.has(p.id)) return tagCache.get(p.id);
  const t = new Set();
  for (const [iid, q] of p.ing) {
    const i = ING[iid];
    if (!i) continue;
    if ((i.r === 'carne' || MEAT_X.has(iid)) && q >= 50) t.add('carne');
    if ((i.r === 'pesce' || FISH_X.has(iid)) && q >= 50) t.add('pesce');
    if (CHEESE.has(iid) && q >= (iid === 'grana' || iid === 'pecorino' ? 40 : 50)) t.add('formaggio');
    if (LEGUMI.has(iid) && q >= (iid === 'piselli' ? 80 : 40)) t.add('legumi');
    if (iid === 'uova' && q >= 1.5) t.add('uova');
    if (PASTA.has(iid)) t.add('pasta');
  }
  if (p.veg) t.add('veg');
  tagCache.set(p.id, t);
  return t;
}
const fitsCat = (p, cat) => !cat ? true : cat === 'primo' || cat === 'secondo' ? p.cat === cat
  : cat === 'legumi' ? dishTags(p).has('legumi') && !dishTags(p).has('carne') && !dishTags(p).has('pesce') : dishTags(p).has(cat);
/* il formaggio principale del piatto (per non mangiare sempre lo stesso: mozzarella, poi primo sale, poi brie…) */
function mainCheese(p) {
  let best = null, bq = 0;
  for (const [iid, q] of p.ing) if (CHEESE.has(iid) && q > bq && q >= 50) { best = iid; bq = q; }
  return best;
}
const kc = x => Math.round(x).toLocaleString('it-IT');
const nutPerson = key => { const e = key ? eaters(key) : S.people; return e.find(x => x.id === 'p1' && prof(x).on) || e.find(x => prof(x).on) || null; };
function nutLine(dish, key) {
  const per = nutPerson(key);
  if (!per) { const n = dishNut(dish); return `<span>🔥 ${kc(n.k)} kcal · ${Math.round(n.p)} g proteine a persona</span>`; }
  const m = mealNut(dish, per), t = mealTarget(per), ok = Math.abs(m.k - t) <= t * 0.12;
  return `<span>${per.id !== 'p1' || S.people.length > 1 ? per.e + ' ' : ''}<span class="${ok ? 'kc-ok' : 'kc-off'}">🔥 ${kc(m.k)} / ${kc(t)} kcal</span> · ${Math.round(m.p)} g proteine${m.f !== 1 ? ` · porzione ×${m.f.toLocaleString('it-IT')}` : ''}</span>`;
}
function compHTML(dish, key) {
  const per = nutPerson(key), cs = per ? complements(dish, per) : [];
  return cs.length ? `<div class="comp">con ${cs.map(c => `${ING[c.i].e} ${c.label}`).join(' · ')}</div>` : '';
}

/* un piatto cucinato da te fuori menu («🍳 Ho cucinato altro»): gli ingredienti sono già tolti da «In casa», qui servono solo per kcal e costo */
function ownDish(o) {
  const id = 'own_' + o.id;
  if (!PI[id]) PI[id] = { id, n: o.n, e: '🍳', cat: 'unico', att: 0, cott: 0, tot: 0, sc: 'calda', veg: false, own: true, ing: o.ing,
    steps: [`L'hai cucinato tu: ${o.porz > 1 ? o.porz + ' porzioni' : 'una porzione'}, ${o.ing.map(([i, q]) => fq(i, q * o.porz) + ' di ' + ING[i].n.toLowerCase()).join(', ')}.`] };
  return PI[id];
}
function slotDish(w, key) {
  const s = w.slots[key];
  if (!s) return null;
  if (s.skip) return { skip: true };
  if (s.own) return { dish: ownDish(s.own), own: true };
  if (s.left) {
    const d = kDay(key), prev = w.slots[(d - 1) + 'c'];
    if (prev && prev.d && PI[prev.d] && PI[prev.d].sc) return { dish: PI[prev.d], left: true };
    return { broken: true };
  }
  if (s.d && PI[s.d]) return { dish: PI[s.d] };
  return null;
}
function meals(w) {
  const out = [];
  for (let d = 0; d < 7; d++) for (const key of dayKeys(d, w)) {
    const r = slotDish(w, key);
    if (r && r.dish) out.push({ d, t: kT(key), key, dish: r.dish, left: !!r.left, n: slotN(key, r.dish, w), who: eaters(key, w) });
  }
  return out;
}
/* spesa per pochi giorni (2/3/4) invece che per tutta la settimana: w.win = {days, from}; days 0 = tutta la settimana */
function shopWin(w = S.week) {
  const def = Math.min(6, Math.max(0, diffDays(TODAY, w.start)));
  return Object.assign({ days: 0, from: def }, w.win);
}
const winKey = (w = S.week) => { const x = shopWin(w); return x.days ? x.from + '-' + x.days : ''; };
const inWin = (d, x) => !x.days || (d >= x.from && d < x.from + x.days);
/* spunte del carrello: una lista per ogni spesa (settimana intera o finestra di giorni) */
function chk(w = S.week) {
  const k = winKey(w);
  if (!k) return w.checked;
  w.checkW = w.checkW || {};
  return (w.checkW[k] = w.checkW[k] || {});
}
/* ---------- in casa (anti-spreco): S.dispensa = lotti avanzati dalle settimane prima [{id, iid, q, exp}] ----------
   Restano fermi per tutta la settimana: la spesa li usa per primi (se non scadono prima del giorno in cui si cucina)
   e il menu automatico preferisce i piatti che li finiscono. A «Nuova settimana» si ricalcolano (carryOver). */
/* ingredienti equivalenti: quello che hai in casa vale anche per l'altro (fusi al posto delle cosce, penne al posto degli spaghetti…) */
const SUBS = [['cosce_pollo', 'fusi_pollo'], ['pollo', 'pollo_bocconcini', 'tacchino', 'fettine'], ['pasta_corta', 'spaghetti', 'pasta_integrale'],
  ['riso_carnaroli', 'riso_basmati', 'riso_integrale'], ['mozzarella', 'bufala'], ['macinato', 'macinato_misto', 'macinato_pollo']];
const SUBOF = {};
for (const g of SUBS) for (const i of g) SUBOF[i] = g;
/* confezione tipica di un prodotto venduto a peso: quella del prodotto scelto nel catalogo, se no una vaschetta normale */
function packOf(iid) {
  const i = ING[iid];
  if (!i || i.conf || !['carne', 'pesce'].includes(i.r)) return 0;
  const c = typeof catItem === 'function' && PHONE_MARKETS[S.market] ? catItem(iid) : null, q = c && (c.q || sizeOf(c.n));
  return q >= 150 && q <= 2000 ? q : i.r === 'carne' ? 400 : 300;
}
const sameUse = (a, b) => a === b || !!(SUBOF[a] && SUBOF[a].includes(b));
/* ingredienti di contorno: se mancano il piatto si fa lo stesso (o costano poco e si trovano ovunque) */
const MINOR = new Set(['cipolla', 'aglio', 'carote', 'sedano', 'limone', 'prezzemolo', 'basilico', 'salvia', 'rosmarino', 'cipollotti', 'scalogno', 'grana', 'pecorino', 'latte', 'burro', 'vino']);
const cookDate = (w, m) => addDays(w.start, m.t === 'p' && !(m.d === 0 && w.start === TODAY) ? m.d - 1 : m.d);   // il pranzo di oggi (menu da oggi) si cucina oggi     // la schiscetta si prepara la sera prima
function shopping(w, onlyWin, until) {
  const need = {}, have = {}, x = onlyWin ? shopWin(w) : { days: 0 }, short = {}, more = {}, topup = {}, small = {};
  const lots = (w === S.week ? S.dispensa || [] : []).filter(l => ING[l.iid]).map(l => Object.assign({}, l, { left: l.q })).sort((a, b) => a.exp.localeCompare(b.exp));
  const lotsFor = iid => lots.filter(l => l.iid === iid).concat(lots.filter(l => l.iid !== iid && sameUse(l.iid, iid)));
  for (const m of meals(w)) {
    if (m.dish.own) continue;                        // cucinato da te: già tolto da «In casa»
    const inw = inWin(m.d, x), date = cookDate(w, m);
    if (until && date >= until) continue;            // non ancora cucinato
    const add = (iid, q, comp) => {
      let take = 0;
      for (const l of lotsFor(iid)) if (l.left > 0 && l.exp >= date && (!l.from || date >= l.from) && !(l.win && l.win[0] === w.start && m.d >= l.win[1] && m.d < l.win[1] + l.win[2]) && take < q) { const t = Math.min(l.left, q - take); l.left -= t; take += t; (l.uses = l.uses || []).push(m.key); }
      // per «tutto in casa»: solo gli ingredienti principali del piatto (non i complementi, non l'aglio o due foglie di basilico)
      const manca = ING[iid].disp && ((w.pcheck || {})[iid] === 'manca' || S.pantry[iid] === false) && !take;     // segnato «manca» nella dispensa
      const pp = q / m.n, minor = !manca && (ING[iid].disp || pp < (ING[iid].u === 'pz' ? 0.5 : 20) || (ING[iid].r === 'fv' && pp < 70) || MINOR.has(iid));
      if (!comp && q - take > 1e-6 && !minor) {      // la porzione non si riduce mai: quello che manca si compra
        (short[m.key] = short[m.key] || new Set()).add(iid);
        if (take > 0) (topup[m.key] = topup[m.key] || new Set()).add(iid);   // c'è già in parte: si completa con una confezione
      }
      else if (!comp && q - take > 1e-6 && !ING[iid].disp) (small[m.key] = small[m.key] || new Set()).add(iid);   // poco, ma da comprare (cipolla, zafferano, grana finito…)
      // il fresco che avanzerebbe (meno di mezza porzione, scade a breve) va tutto in questo piatto: porzione più abbondante, niente sprechi
      if (!comp && take >= q - 1e-6) for (const l of lotsFor(iid)) if (l.left > 0 && l.left <= q * 0.7 && diffDays(l.exp, date) <= 2 && ['carne', 'pesce', 'frigo', 'fv'].includes(ING[l.iid].r)) {
        (more[m.key] = more[m.key] || []).push({ iid: l.iid, q: l.left }); take += l.left; l.left = 0;
      }
      if (!inw) return;
      need[iid] = (need[iid] || 0) + q - take;
      if (take) have[iid] = (have[iid] || 0) + take;
    };
    for (const [iid, q] of ingOf(m.dish)) add(iid, q * m.n);
    for (const x of m.who) if (prof(x).on && prof(x).comp) for (const c of complements(m.dish, x)) add(c.i, c.q, true);   // per chi ha il profilo
  }
  for (const key in (w.sfizi || {})) {      // sfizi: una bevanda, del cioccolato… per pasto
    if (!inWin(kDay(key), x)) continue;
    const n = nOf(key, w);
    for (const x of w.sfizi[key]) if (n && ING[x.i]) need[x.i] = (need[x.i] || 0) + x.q * n;
  }
  const items = [], pantry = [];
  let cassa = 0, consumo = 0;
  for (const b of breakfastNeeds(w, x)) need[b.i] = (need[b.i] || 0) + b.q;     // colazioni
  for (const iid in have) consumo += have[iid] * unitCost(iid);
  for (const iid in need) {
    const i = ING[iid], q = need[iid];
    consumo += q * unitCost(iid);
    if (q <= 1e-6) continue;          // tutto da quello che c'è in casa
    if (i.disp) {
      const st = (w.pcheck || {})[iid] || (S.pantry[iid] === false ? 'manca' : '');
      pantry.push({ iid, need: q, st });
      if (st !== 'manca') continue;                     // manca: finisce nella lista
    }
    let n = 0, buy, cost;
    if (i.conf) { n = Math.max(1, Math.ceil(q / i.conf - 1e-6)); buy = n * i.conf; cost = n * price(iid); }
    else {
      const pk = packOf(iid);
      if (pk) { n = Math.max(1, Math.ceil(q / pk - 0.05)); buy = n * pk; }     // vaschette vere: niente «175 g di pollo»
      else buy = Math.max(50, Math.ceil(q / 50 - 1e-6) * 50);
      cost = buy / 1000 * price(iid);
    }
    cassa += cost;
    items.push({ iid, need: q, n, buy, cost, left: buy - q, have: have[iid] || 0 });
  }
  const extra = w.extras.reduce((s, e) => s + (e.price || 0), 0);
  const end = addDays(w.start, 6);
  const wasted = lots.filter(l => l.left > 0 && l.exp <= end).reduce((s, l) => s + l.left * unitCost(l.iid), 0);   // valore di quello che scadrebbe
  // valore di quello di casa che si usa; quello che scade entro 3 giorni conta tre volte (carne, pesce, fresco: prima di tutto)
  const usedVal = lots.reduce((s, l) => s + (l.q - l.left) * unitCost(l.iid) * (diffDays(l.exp, w.start) <= 3 ? 3 : 1), 0);
  const home = Object.keys(have).filter(iid => !(need[iid] > 1e-6)).map(iid => ({ iid, q: have[iid] }));
  return { items, pantry, cassa: cassa + extra, food: cassa, consumo, home, lots, wasted, short, usedVal, more, topup, small };
}
/* giorni tra la spesa (il giorno prima dell'inizio) e il momento in cui si cucina: la schiscetta si prepara la sera prima */
const daysAfterShop = (d, t) => t === 'p' ? d : d + 1;
function perishables(dish, days) { return dish.ing.filter(([iid]) => !ING[iid].disp && ING[iid].dur < days).map(([iid]) => ING[iid].n.toLowerCase()); }
function emptyKeys() {
  const out = [];
  for (let d = 0; d < 7; d++) for (const key of dayKeys(d)) if (!S.week.slots[key]) out.push(key);
  return out;
}

/* Riempie gli slot vuoti: costo marginale basso (riusa le confezioni già in lista), varietà, deperibili all'inizio */
/* allergeni (i 14 dell'etichetta UE) e ingredienti che non mangi: le ricette che li contengono spariscono ovunque.
   Ingredienti confezionati: elenco indicativo, controlla sempre l'etichetta del prodotto che compri. */
const ALLERGENI = {
  glutine: ['🌾', 'Glutine', ['pasta_corta', 'spaghetti', 'tagliatelle', 'lasagne_sfoglie', 'pastina', 'pizzoccheri', 'semolino', 'noodles', 'cous_cous', 'farro', 'orzo', 'pane', 'piadina', 'tortillas', 'pancarre', 'pangrattato', 'farina', 'tortellini', 'ravioli', 'gnocchi', 'sfoglia', 'base_pizza', 'lasagna', 'besciamella', 'cotoletta', 'bastoncini', 'soia', 'dado']],
  latte: ['🥛', 'Latte e lattosio', ['latte', 'burro', 'mozzarella', 'grana', 'pecorino', 'ricotta', 'stracchino', 'feta', 'gorgonzola', 'fontina', 'scamorza', 'panna', 'yogurt', 'spalmabile', 'besciamella', 'tortellini', 'ravioli', 'lasagna', 'pesto', 'pure']],
  uova: ['🥚', 'Uova', ['uova', 'tagliatelle', 'lasagne_sfoglie', 'noodles', 'tortellini', 'ravioli', 'lasagna', 'cotoletta']],
  pesce: ['🐟', 'Pesce', ['tonno', 'salmone', 'salmone_aff', 'merluzzo', 'bastoncini', 'acciughe', 'sgombro']],
  crostacei: ['🦐', 'Crostacei', ['gamberetti']],
  molluschi: ['🦑', 'Molluschi', ['calamari', 'cozze']],
  frutta_guscio: ['🌰', 'Frutta a guscio', ['mandorle', 'pesto']],
  soia: ['🫘', 'Soia', ['tofu', 'soia']],
  sedano: ['🥬', 'Sedano', ['sedano', 'dado']],
  sesamo: ['⚪', 'Sesamo', ['hummus']],
  solfiti: ['🍷', 'Solfiti', ['vino', 'aceto']]
};
/* prodotti pronti per categoria: chi non li compra (S.pronti[k] === false) non vede le ricette che li usano.
   Sono cose diverse: il sugo pronto in Italia si compra poco, gli gnocchi sì. */
const PRONTI_CAT = {
  sughi: ['🍅', 'Sughi pronti', 'ragù, pesto, sugo fresco, besciamella', ['ragu', 'sugo_rana', 'pesto', 'condiriso', 'besciamella']],
  pasta: ['🥟', 'Pasta fresca pronta', 'gnocchi, tortellini, ravioli', ['gnocchi', 'tortellini', 'ravioli']],
  piatti: ['🍗', 'Piatti pronti e impanati', 'lasagne pronte, cotolette, bastoncini, patate surgelate', ['lasagna', 'cotoletta', 'bastoncini', 'patate_surg', 'hamburger_pollo', 'burger_vegetale', 'pure']],
  basi: ['🍕', 'Impasti pronti', 'impasto per la pizza, pasta sfoglia', ['base_pizza', 'sfoglia']]
};
const PRONTI = Object.values(PRONTI_CAT).flatMap(c => c[3]);
function excluded() {
  const out = new Set(Object.keys(S.noIng || {}));
  for (const k in PRONTI_CAT) if ((S.pronti || {})[k] === false) PRONTI_CAT[k][3].forEach(i => out.add(i));
  for (const a in (S.allergie || {})) if (ALLERGENI[a]) ALLERGENI[a][2].forEach(i => out.add(i));
  return out;
}
const blocked = p => { const ex = excluded(); return ex.size > 0 && p.ing.some(([iid]) => ex.has(iid)); };

function prontiHTML() {
  return Object.entries(PRONTI_CAT).map(([k, [e, n, d, list]]) => {
    const no = (S.pronti || {})[k] === false, nd = ALL.filter(p => p.ing.some(([i]) => list.includes(i))).length;
    return `<div class="item pcheck${no ? ' manca' : ''}"><span style="font-size:22px">${e}</span><div class="grow"><div class="nm">${n}</div><div class="left">${d} · ${nd} ricette</div></div>
      <div class="pbtn"><button class="${no ? '' : 'on ok'}" data-a="prontiSet" data-k="${k}" data-v="si">Li compro</button><button class="${no ? 'on no' : ''}" data-a="prontiSet" data-k="${k}" data-v="no">No</button></div></div>`;
  }).join('');
}
/* come si organizza il menu: calendario (piatti per giorno) o lista di piatti da scegliere giorno per giorno */
const STYLES = { giorni: ['📅', 'Piatti per giorno', 'un calendario: ogni giorno sai già cosa cucini'],
  lista: ['📝', 'Lista di piatti', 'i piatti della settimana senza giorni: ogni giorno scegli cosa farti con quello che hai in casa'] };
const styleHTML = () => Object.entries(STYLES).map(([k, [e, n, d]]) => `<div class="item" data-a="menuStyle" data-v="${k}"><span style="font-size:22px">${e}</span><div class="grow"><div class="nm">${n}</div><div class="left">${d}</div></div><span class="toggle${(S.menuStyle || 'giorni') === k ? ' on' : ''}"></span></div>`).join('');

/* tipi di menu per «Componi tu» */
const MODES = {
  equilibrato: ['⚖️', 'Equilibrato', 'varietà, poco spreco e le kcal che ti servono'],
  casa: ['🏠', 'Con quello che ho', 'usa per primo quello che hai in casa, prima quello che scade, e compra il meno possibile'],
  risparmio: ['💶', 'Economico', 'spendi il meno possibile: piatti semplici, confezioni riusate, complementi economici (pane, banane, mele)'],
  offerte: ['🏷️', 'Offerte', 'piatti con i prodotti in offerta questa settimana nel tuo supermercato'],
  proteico: ['💪', 'Proteico', 'più carne, pesce, uova, latticini e legumi'],
  leggero: ['🍵', 'Leggero', 'stomaco delicato: piatti in bianco, cotture semplici, niente fritti, piccante, pomodoro, legumi e cavoli']
};
/* piatti adatti a uno stomaco delicato: segnati «light» nelle ricette, oppure senza ingredienti pesanti o irritanti */
const HEAVY = new Set(['pancetta', 'salsiccia', 'wurstel', 'peperoncino', 'curry', 'spezie_chili', 'gorgonzola', 'panna', 'besciamella', 'pesto', 'fontina',
  'mortadella', 'speck', 'crudo', 'passata', 'pelati', 'pomodorini', 'pomodori', 'ragu', 'sugo_rana', 'vino', 'ceci', 'borlotti', 'fagioli_rossi', 'cannellini',
  'lenticchie', 'verza', 'broccoli', 'cavolfiore', 'cime_rapa', 'cavolo_nero', 'peperoni', 'cipolla', 'aglio', 'acciughe', 'olive', 'capperi', 'sfoglia',
  'base_pizza', 'cotoletta', 'bastoncini', 'patate_surg', 'hamburger', 'lasagna', 'condiriso', 'soia', 'hummus', 'aceto', 'stracchino', 'scamorza', 'salmone_aff', 'pecorino', 'mais']);
function isLight(p) {
  if (p.light) return true;
  if (p.mine) return false;
  const q = Object.fromEntries(p.ing);
  return !p.ing.some(([iid]) => HEAVY.has(iid)) && (q.olio || 0) <= 15 && (q.burro || 0) <= 10 && !/fritt|impanat|panat/i.test(p.n);
}
const promoCount = dish => dish.ing.filter(([iid]) => { const o = !isCustom(iid) && chosenOpt(iid); return o && o.promo; }).length;
/* con le scorte: questi, se mancano, si comprano al volo o se ne fa a meno (il resto no: niente risotto alla milanese senza zafferano) */
const SOFT = new Set(['aglio', 'cipolla', 'prezzemolo', 'basilico', 'limone', 'carote', 'sedano', 'rosmarino', 'salvia', 'cipollotti', 'scalogno', 'grana', 'pecorino', 'burro', 'latte']);
function autofill(mode = 'equilibrato') {
  const w = S.week;
  w.mode = mode;
  const recent = (S.eaten || []).slice(-2).flatMap(x => x.ids), recentCheese = new Set((S.eaten || []).slice(-3).flatMap(x => x.cheese || []));
  let stockEnd = mode !== 'casa';        // «con quello che ho»: finché c'è cibo, solo piatti senza niente da comprare
  for (const key of emptyKeys()) {
    const md = stockEnd && mode === 'casa' ? 'risparmio' : mode;      // finite le scorte: la prossima spesa, economica
    const t = kT(key), d = kDay(key), who = kWho(key) && personOf(kWho(key)), cat = who && who.cat;
    const per = nutPerson(key);
    const plan = t === 'c' ? S.plan || {} : {}, have = {};
    if (t === 'c') for (const m of meals(w)) if (m.t === 'c') for (const g of dishTags(m.dish)) have[g] = (have[g] || 0) + 1;
    const sh0 = shopping(w), base = sh0.cassa, waste0 = sh0.wasted, used0 = sh0.usedVal;
    const used = new Set(meals(w).map(m => m.dish.id));
    const prev = slotDish(w, t === 'c' ? d + 'p' : (d - 1) + 'c');
    const prevDish = prev && prev.dish;
    const leftCount = Object.values(w.slots).filter(s => s && s.left).length;
    const cands = ALL.filter(p => (t === 'c' || p.sc) && !(S.dislikes || {})[p.id] && !blocked(p) && fitsCat(p, cat) && (mode !== 'leggero' || isLight(p))).map(p => ({ d: p.id }));   // 👎 mai in automatico
    if (t === 'p' && d > 0) { const pd = slotDish(w, (d - 1) + 'c'); if (pd && pd.dish && pd.dish.sc && !pd.dish.own && fitsCat(pd.dish, cat)) cands.push({ left: true }); }
    let best = null, bestScore = -1e9, bestMiss = 0, best0 = null, best0Score = -1e9;
    for (const c of cands) {
      w.slots[key] = c;
      const dish = c.left ? PI[w.slots[(d - 1) + 'c'].d] : PI[c.d];
      if (!dish) continue;
      const shc = shopping(w), miss = shc.short[key] ? shc.short[key].size : 0, sm = [...(shc.small[key] || [])], smHard = sm.filter(i => !SOFT.has(i)).length;
      let sc = -(md === 'risparmio' ? 4 : md === 'casa' ? 6 : 0.8) * (shc.cassa - base) + (mode === 'casa' ? 10 : 4) * (waste0 - shc.wasted);   // in casa: non far scadere niente
      sc += (mode === 'casa' ? 4 : 1.5) * (shc.usedVal - used0);      // e che usano più cibo di casa (anche quello che dura: spinaci, piselli…)
      if (c.left) {
        // avanzo della cena solo se serve a finire ingredienti deperibili, e al massimo una volta a settimana
        const perish = dish.ing.some(([iid]) => !ING[iid].disp && ING[iid].dur <= 7);
        sc += perish ? 0.5 : -4;
        if (leftCount >= 1) sc -= 12;
      }
      else {
        if (used.has(dish.id)) sc -= md === 'casa' ? 4 : 12;      // con la spesa fatta, ripetere un piatto va bene
        if (prevDish && prevDish.cat === dish.cat) sc -= 0.8;
      }
      if (S.favs[dish.id]) sc += 3;
      if (perishables(dish, daysAfterShop(d, t)).length) sc -= 5;
      if (t === 'c' && dish.tot > 40) sc -= (dish.tot - 40) / 15;
      if (per) sc -= Math.abs(dishNut(dish).k * portionFor(dish, per) - mealTarget(per) * MAIN_SHARE) / 300;
      if (!c.left && recent.includes(dish.id)) sc -= 2.5;                 // le settimane scorse: un po' di varietà
      if (!c.left) { const ch = mainCheese(dish); if (ch && recentCheese.has(ch)) sc -= 3; }   // formaggio diverso dalle ultime volte
      for (const g in plan) if (plan[g] > 0 && dishTags(dish).has(g)) sc += (have[g] || 0) < plan[g] ? 6 : -5;   // piano delle cene
      if (mode === 'offerte') sc += 1.5 * promoCount(dish);
      if (mode === 'proteico') sc += (dishNut(dish).p - 30) / 5;
      sc += Math.random() * 2.6;
      if (sc > bestScore) { bestScore = sc; best = c; bestMiss = miss; }
      if (!stockEnd) sc -= 8 * (sm.length - smHard);
      if (!miss && !smHard && sc > best0Score) { best0Score = sc; best0 = c; }        // niente da comprare (neanche una confezione per completare, né lo zafferano)
    }
    if (!stockEnd && best0) best = best0;
    else if (!stockEnd) stockEnd = true;      // nessun piatto si fa con quello che c'è: da qui serve la prossima spesa
    w.slots[key] = best;
  }
}

/* ---------------- sera ---------------- */
function eveningPlan(e) {
  const w = S.week, out = { e, date: addDays(w.start, e), blocks: [] };
  const din = e >= 0 && eaters(e + 'c').length ? slotDish(w, e + 'c') : null;
  out.dinSkip = !!(din && din.skip);
  let dinB = null;
  if (e === 0 && w.start === TODAY) for (const lk of lunchKeys(0)) {        // il pranzo di oggi: si cucina adesso, nella stessa sessione
    const l0 = slotDish(w, lk);
    if (l0 && l0.dish) out.blocks.push({ role: 'lunch', today: true, key: lk, dish: l0.dish, n: slotN(lk, l0.dish), nc: 0, np: nOf(lk), who: eaters(lk).filter(() => kWho(lk)) });
  }
  if (din && din.dish) { dinB = { role: 'dinner', key: e + 'c', dish: din.dish, n: slotN(e + 'c', din.dish), nc: nOf(e + 'c'), np: 0, who: [] }; out.blocks.push(dinB); }
  for (const lk of e < 6 ? lunchKeys(e + 1) : []) {
    const lun = slotDish(w, lk);
    if (!lun || !lun.dish) continue;
    const n = slotN(lk, lun.dish), who = eaters(lk).filter(() => kWho(lk));
    if (dinB && (lun.left || lun.dish.id === dinB.dish.id)) { dinB.role = 'both'; dinB.n += n; dinB.np += nOf(lk); dinB.who.push(...who); continue; }
    const same = out.blocks.find(b => b.role === 'lunch' && b.dish.id === lun.dish.id);
    if (same) { same.n += n; same.np += nOf(lk); same.who.push(...who); continue; }
    out.blocks.push({ role: 'lunch', key: lk, dish: lun.dish, n, nc: 0, np: nOf(lk), who });
  }
  const passive = x => x.dish.tot - x.dish.att;
  out.blocks.sort((a, b) => passive(b) - passive(a));
  const b = out.blocks;
  out.work = b.reduce((s, x) => s + x.dish.att, 0);
  out.time = b.length ? Math.max(...b.map(x => x.dish.tot), out.work) : 0;
  if (b.length > 2) out.note = `Inizia da <b>${esc(b[0].dish.n)}</b>, che ha più cottura; mentre cuoce prepari gli altri.`;
  if (b.length === 2) {
    out.note = passive(b[0]) >= 10
      ? `Inizia da <b>${esc(b[0].dish.n)}</b>: ha ${mins(b[0].dish.cott)} di cottura. Mentre cuoce prepari <b>${esc(b[1].dish.n)}</b>.`
      : `Prepara prima <b>${esc(b[0].dish.n)}</b>, poi <b>${esc(b[1].dish.n)}</b>.`;
  }
  return out;
}
function defaultEve() {
  const k = diffDays(TODAY, S.week.start);
  const lo = anyLunch() && S.week.start !== TODAY ? -1 : 0;
  return Math.max(lo, Math.min(6, k));
}

/* ---------------- ponte Android ---------------- */
/* primo giorno in cui serve una spesa: un pasto vuoto o con ingredienti principali da comprare (solo dopo aver fatto la spesa) */
function shopNeededDay(w = S.week) {
  if (w.status !== 'cook' && !(S.dispensa || []).length) return null;
  const sh = shopping(w);
  for (let d = Math.max(0, diffDays(TODAY, w.start)); d < 7; d++) for (const key of dayKeys(d, w)) {
    const s = w.slots[key];
    if (s && s.skip) continue;
    if ((S.dispensa || []).length) {      // c'è la dispensa vera: serve la spesa dal primo pasto che chiede di comprare qualcosa (la schiscetta si cucina la sera prima)
      if (!s || sh.short[key] && sh.short[key].size) return cookDate(w, { t: kT(key), d });
      continue;
    }
    const bought = Object.keys(w.trips || {}).some(k => k === 'settimana' || (([f, n]) => d >= f && d < f + n)(k.split('-').map(Number)));   // giorni già coperti da una spesa
    if (!s || !bought) return addDays(w.start, d);
  }
  return null;
}
function syncNative() {
  if (!NATIVE || !NATIVE.setReminder) return;
  const map = {};
  for (let e = S.week.start === TODAY ? 0 : -1; e <= 6; e++) {
    const p = eveningPlan(e);
    if (!p.blocks.length) continue;
    map[p.date] = p.blocks.map(b => b.role === 'lunch' && b.today ? `🍽️ ${b.dish.n}` : b.role === 'lunch' ? `🍱 ${b.dish.n}${b.who.length ? ' (' + b.who.map(x => x.name).join(', ') + ')' : ''}` : b.role === 'both' ? `🌙 ${b.dish.n} (anche schiscetta)` : `🌙 ${b.dish.n}`).join('  ·  ');
  }
  // 2 giorni prima che finisca il cibo: avviso di fare la spesa (con la lista pronta nell'app)
  const need = shopNeededDay();
  if (need) {
    const when = addDays(need, -2) >= TODAY ? addDays(need, -2) : addDays(need, -1) >= TODAY ? addDays(need, -1) : TODAY;
    const txt = `🛒 ${diffDays(need, when) >= 2 ? 'Dopodomani' : diffDays(need, when) === 1 ? 'Domani' : 'Oggi'} finisce il cibo in casa: fai la spesa, la lista è pronta`;
    map[when] = map[when] ? map[when] + '  ·  ' + txt : txt;
  }
  const [h, m] = S.reminder.t.split(':').map(Number);
  try { NATIVE.setReminder(!!S.reminder.on && (S.week.status === 'cook' || !!need), h, m, JSON.stringify(map)); } catch (e) { /* ignora */ }
}
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme);
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  try { NATIVE && NATIVE.setDark && NATIVE.setDark(dark); } catch (e) { /* ignora */ }
}

/* ---------------- toast, timer, suoni ---------------- */
let toastT;
function toast(msg, act) {      // act = [etichetta, azione]: un bottone nel messaggio, che resta qualche secondo in più
  const t = $('#toast');
  t.innerHTML = msg + (act ? ` <button class="toast-act" data-a="${act[1]}">${act[0]}</button>` : '');
  t.classList.add('show'); t.classList.toggle('act', !!act);
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show', 'act'), act ? 6000 : 2600);
}
let actx;
function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, .35, .7].forEach(o => {
      const os = actx.createOscillator(), g = actx.createGain();
      os.frequency.value = 880; os.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(.25, actx.currentTime + o); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + o + .3);
      os.start(actx.currentTime + o); os.stop(actx.currentTime + o + .3);
    });
  } catch (e) { /* audio non disponibile */ }
}
function startTimer(min, label) {
  const id = Math.floor(Date.now() % 2e9);
  S.timers.push({ id, label, end: Date.now() + min * 60000 });
  save();
  try { NATIVE && NATIVE.startTimer && NATIVE.startTimer(id, min * 60, label); } catch (e) { /* ignora */ }
  renderTimers();
  toast(`⏱ Timer di ${min} min avviato`);
}
function renderTimers() {
  const el = $('#timers'), now = Date.now();
  el.innerHTML = S.timers.map(t => {
    const left = Math.max(0, Math.round((t.end - now) / 1000));
    const ring = left === 0;
    return `<div class="tm${ring ? ' ring' : ''}"><b>${ring ? '⏰' : `${Math.floor(left / 60)}:${pad(left % 60)}`}</b><div class="grow">${ring ? 'Tempo scaduto · ' : ''}${esc(t.label)}</div><button data-a="tmClose" data-id="${t.id}" aria-label="Chiudi">✕</button></div>`;
  }).join('');
}
setInterval(() => {
  if (!S.timers.length) return;
  const now = Date.now();
  for (const t of S.timers) if (t.end <= now && !t.rang) {
    t.rang = true; save();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 600]);
    if (!NATIVE) beep();
    toast(`⏰ ${esc(t.label)}`);
  }
  renderTimers();
}, 1000);

/* ---------------- render principale ---------------- */
const TITLES = {
  menu: () => ['Menu della settimana', rangeLabel(S.week.start)],
  spesa: () => ui.spTab === 'spese' ? ['Spese fatte', 'quando, dove e quanto'] : ui.spTab === 'mangiato' ? ['Cosa hai mangiato', 'la cronologia dei pasti'] : ['Lista della spesa', SM[S.market].n],
  dispensa: () => ['Dispensa', 'quello che hai in casa'],
  stasera: () => ['Stasera si cucina', 'cena e schiscetta di domani'],
  spese: () => ['Le tue spese', 'quando, dove e quanto'],
  piatti: () => ['Ricettario', `${ALL.length} piatti${S.custom.piatti.length ? `, ${S.custom.piatti.length} tuoi` : ' facili'}`]
};
function render() {
  applyTheme();
  const app = $('#app');
  if (!S.setup) { app.innerHTML = renderOnb(); renderSheet(); return; }
  const [t, sub] = TITLES[ui.tab]();
  const sh = shopping(S.week, true), ck = chk();
  const left = sh.items.filter(i => !ck[i.iid]).length;
  const tabs = [['menu', 'Menu', I.cal], ['spesa', 'Spesa', I.cart], ['stasera', 'Stasera', I.pot], ['dispensa', 'Dispensa', I.box], ['piatti', 'Ricette', I.book]];
  app.innerHTML = `
    <header class="top"><h1>${t}<small>${esc(sub)}</small></h1><button class="icon-btn" data-a="settings" aria-label="Impostazioni">${I.gear}</button></header>
    <main>${VIEWS[ui.tab]()}</main>
    <nav class="tabs"><div class="tabs-in">${tabs.map(([k, n, ic]) => `<button class="tab${ui.tab === k ? ' on' : ''}" data-a="tab" data-t="${k}">${ic}${n}${k === 'spesa' && left && S.week.status !== 'cook' ? `<span class="pill">${left}</span>` : ''}</button>`).join('')}</div></nav>`;
  renderSheet();
  renderTimers();
  try { NATIVE && NATIVE.keepScreenOn && NATIVE.keepScreenOn(ui.tab === 'stasera'); } catch (e) { /* ignora */ }
}

/* ---------------- vista: menu ---------------- */
function sfiziHTML(key) {
  const list = (S.week.sfizi || {})[key] || [], n = nOf(key);
  return `<div class="sfizi">${list.map((x, j) => ING[x.i] ? `<button class="sfizio-chip" data-a="sfOpen" data-k="${key}" data-j="${j}">${ING[x.i].e} ${esc(ING[x.i].link && ING[x.i].link.b ? ING[x.i].link.b : ING[x.i].n.split(' ').slice(0, 2).join(' '))} · ${fq(x.i, x.q)} <b>${eur3(x.q * n * unitCost(x.i))}</b></button>` : '').join('')}
    <button class="sfizio-chip add" data-a="spOpen" data-mode="sfizio" data-k="${key}">＋ sfizio</button></div>`;
}
function whoLine(key) {
  if (S.people.length < 2) return '';
  const e = eaters(key), d = kDay(key), t = kT(key), off = S.people.filter(x => x[t][wdOf(d)] && !e.includes(x) && (t === 'c' || (kWho(key) ? x.id === kWho(key) : x.lunch !== 'sua')));
  return `<button class="who" data-a="whoSheet" data-k="${d + t}">${e.map(x => `<span>${x.e} ${esc(x.name)}</span>`).join('')}${off.map(x => `<span class="off">${x.e} ${esc(x.name)}</span>`).join('')}</button>`;
}
let shopC = null;
const shopCache = () => shopC && shopC.v === nutVer ? shopC.sh : (shopC = { v: nutVer, sh: shopping(S.week) }).sh;
function slotHTML(key, warns) {
  const t = kT(key), d = kDay(key), s = S.week.slots[key], r = slotDish(S.week, key), who = kWho(key) && personOf(kWho(key));
  const lbl = t === 'p' && d === 0 && S.week.start === TODAY ? '🍽️ Pranzo di oggi' : t === 'p' ? `🍱 Schiscetta${who ? ' di ' + esc(who.name) + (who.cat && LCATS[who.cat] ? ' · ' + LCATS[who.cat][0] + ' ' + LCATS[who.cat][1].toLowerCase() : '') : ''}` : '🌙 Cena';
  if (!s) return `<button class="slot" data-a="pick" data-k="${key}"><div class="grow"><div class="lbl">${lbl}</div><div class="empty-slot">＋ Scegli il piatto</div></div></button>`;
  if (r && r.skip) return `<button class="slot" data-a="pick" data-k="${key}"><div class="emo sm">🚫</div><div class="grow"><div class="lbl">${lbl}</div><div class="nm muted">Niente da cucinare</div></div></button>`;
  if (!r || r.broken) return `<button class="slot" data-a="pick" data-k="${key}"><div class="emo sm">⚠️</div><div class="grow"><div class="lbl">${lbl}</div><div class="nm">Avanzo non disponibile</div><div class="warnline">La cena del giorno prima non va bene per la schiscetta: scegli un piatto</div></div></button>`;
  const dish = r.dish, n = slotN(key, dish);
  const w = warns[key];
  return `<div class="slot" role="button" tabindex="0" data-a="dish" data-id="${dish.id}" data-k="${key}">
    ${r.left ? `<div class="emo sm cat-${dish.cat}">♻️</div>` : dishEmo(dish, 'sm')}
    <div class="grow"><div class="lbl">${lbl}</div>
      <div class="nm">${r.left ? 'Avanzo di ieri: ' : ''}${esc(dish.n)}</div>
      <div class="meta">${r.left ? '<span>si cucina insieme alla cena di ieri</span>' : `<span>⏱ ${mins(dish.tot)}</span><span>👐 ${mins(dish.att)} di lavoro</span>`}</div>
      <div class="meta nut">${nutLine(dish, key)}</div>${compHTML(dish, key)}${whoLine(key)}
      ${blocked(dish) ? `<div class="warnline">🚫 Contiene ${esc(dish.ing.filter(([i]) => excluded().has(i)).map(([i]) => ING[i].n.toLowerCase()).join(', '))}: cambialo</div>` : ''}
      ${w ? `<div class="warnline">⚠️ ${esc(w)}</div>` : ''}${(m => m ? `<div class="homeline">🍗 porzione più abbondante: ${esc(m.map(x => '+' + fq(x.iid, x.q) + ' di ' + ING[x.iid].n.toLowerCase()).join(', '))}, così non avanza niente</div>` : '')((S.dispensa || []).length && shopCache().more[key])}${(S.dispensa || []).length ? (sh => { const m = sh.short[key]; const t = sh.topup[key]; const sm = sh.small[key]; return m && m.size ? `<div class="buyline">🛒 da comprare: ${esc([...m].slice(0, 4).map(i => ING[i].n.toLowerCase() + (t && t.has(i) ? ' (una confezione per completare quello che hai)' : '')).join(', '))}${m.size > 4 ? '…' : ''}</div>` : sm && sm.size ? `<div class="homeline">🏠 tutto in casa · <span class="buyline">serve anche: ${esc([...sm].slice(0, 3).map(i => ING[i].n.toLowerCase()).join(', '))}</span></div>` : '<div class="homeline">🏠 tutto in casa</div>'; })(shopCache()) : ''}
    </div>
    <div class="slot-side"><div class="price num">${eur(dishCost(dish.id, n))}</div><button class="slot-chg" data-a="pick" data-k="${key}" aria-label="Cambia piatto">🔄</button></div></div>`;
}
/* riquadro «In casa»: cosa è avanzato, quando scade e quale piatto lo usa */
function homeCard(sh, inDisp) {
  const lots = (S.dispensa || []).filter(l => ING[l.iid]);
  if (!lots.length) return `<div class="sec-title">🏠 In casa</div><div class="row" style="gap:8px;margin:0 0 10px"><button class="btn btn-soft btn-sm" data-a="scanSheet">▥ Scanner</button><button class="btn btn-soft btn-sm" data-a="homeAddSheet">📷 Foto</button><button class="btn btn-soft btn-sm" data-a="homeAddSheet" data-m="mano">＋ A mano</button></div>`;
  const w = S.week, byKey = {};
  for (const m of meals(w)) byKey[m.key] = m;
  const used = id => (sh.lots.find(l => l.id === id) || {}).uses || [];
  const rows = lots.map(l => {
    const u = [...new Set(used(l.id))].map(k => byKey[k]).filter(Boolean), sl = sh.lots.find(x => x.id === l.id), rest = sl ? sl.left : l.q;
    const days = diffDays(l.exp, TODAY), soon = days <= 2;
    const st = rest <= 1e-6 ? `<span class="badge green">✅ ${u.length ? 'in ' + esc(u.map(m => fdate(addDays(w.start, m.d), { weekday: 'short' }) + (m.t === 'p' ? ' 🍱' : ' 🌙')).join(', ')) : 'usato'}</span>`
      : u.length ? `<span class="badge">ne usi ${fq(l.iid, l.q - rest)} · avanzano ${fq(l.iid, rest)}</span>` : `<span class="badge ${soon ? 'red' : 'warn'}">⚠️ nessun piatto lo usa</span>`;
    const freeze = rest > 1e-6 && !l.frozen && ['carne', 'pesce'].includes(ING[l.iid].r) && days <= 2 ? `<div class="left">🧊 Se non lo cucini entro ${days <= 0 ? 'oggi' : days === 1 ? 'domani' : esc(fday(l.exp))}, congelalo</div>` : '';
    return `<div class="item" data-a="lotSheet" data-id="${l.id}"><span style="font-size:22px">${ING[l.iid].e}</span><div class="grow"><div class="nm">${esc(ING[l.iid].n)} · ${fq(l.iid, l.q)}</div>
      <div class="left">${l.frozen ? '🧊 congelato · ' : ''}${days < 0 ? '⛔ scaduto' : days === 0 ? '⏳ scade oggi' : days === 1 ? '⏳ scade domani' : days > 45 ? `si conserva a lungo (${esc(fdate(l.exp, { month: 'short', year: 'numeric' }))})` : `scade ${esc(fday(l.exp))}`}</div>${freeze}<div style="margin-top:4px">${st}</div></div></div>`;
  }).join('');
  const todo = lots.filter(l => { const sl = sh.lots.find(x => x.id === l.id); return sl && sl.left > 1e-6; }).length;
  return `<div class="sec-title">🏠 In casa<span class="right">${lots.length}</span></div><div class="group">${rows}</div>
    <div class="row" style="gap:8px;margin:-2px 0 10px;flex-wrap:wrap${inDisp ? ';display:none' : ''}"><button class="btn btn-soft btn-sm" data-a="scanSheet">▥ Scanner</button><button class="btn btn-soft btn-sm" data-a="homeAddSheet">📷 Foto</button><button class="btn btn-soft btn-sm" data-a="homeAddSheet" data-m="mano">＋ A mano</button><button class="btn btn-soft btn-sm" data-a="cookedSheet">🍳 Ho cucinato altro</button></div>
    <div class="muted small" style="margin:-4px 4px 12px">${todo ? 'Quello che nessun piatto usa rischia di scadere: «Componi tu il menu» lo mette nei primi giorni, oppure tocca la riga per vedere i piatti che lo usano.' : 'Tutto quello che hai in casa finisce nei piatti della settimana: niente sprechi.'}</div>`;
}
function renderMenu() {
  const w = S.week, ms = meals(w), sh = shopping(w), empty = emptyKeys().length;
  const warns = {};
  for (const m of ms) if (!m.left) { const p = perishables(m.dish, daysAfterShop(m.d, m.t)); if (p.length) warns[m.key] = `${p.join(', ')}: si conserva${p.length > 1 ? 'no' : ''} meno a lungo, spostalo a inizio settimana`; }
  const stage = w.status === 'cook' ? 2 : ms.length ? 1 : 0;
  const ended = diffDays(TODAY, addDays(w.start, 6)) > 0;
  let html = updateBanner();
  if (ended && ms.length) html += `<div class="tip green"><b>La settimana è finita.</b> Prepariamo la prossima? <div style="margin-top:10px"><button class="btn btn-green btn-sm" data-a="newWeek">Nuova settimana</button> <button class="btn btn-ghost btn-sm" data-a="newWeek" data-copy="1">Ripeti questo menu</button></div></div>`;
  const list = S.menuList || window.__TEST_LIST;
  const tips = [];
  if (w.status === 'cook') tips.push(`<div class="tip blue small">La spesa è già fatta: se cambi un piatto, controlla nella lista cosa ti manca.</div>`);
  if ((S.dispensa || []).length && ms.length) {
    const cov = ms.filter(m => !(sh.short[m.key] && sh.short[m.key].size)).length, first = ms.find(m => sh.short[m.key] && sh.short[m.key].size);
    const nd = shopNeededDay();
    if (nd) tips.push(`<div class="tip small">🛒 Prossima spesa: per <b>${esc(fdate(nd, { weekday: 'long', day: 'numeric' }))}</b>. Ti avviso con una notifica ${diffDays(nd, TODAY) >= 2 ? 'due giorni prima' : 'il giorno prima'}.</div>`);
    tips.push(`<div class="tip ${cov === ms.length ? 'green' : 'blue'} small">🏠 Con quello che hai in casa copri <b>${cov} pasti su ${ms.length}</b>${first ? `. Per ${esc(fdate(addDays(w.start, first.d), { weekday: 'long', day: 'numeric' }))} (${first.t === 'p' ? 'pranzo' : 'cena'}) serve comprare qualcosa: lo trovi nella lista.` : ': non serve comprare niente.'}</div>`);
  }
  if (!list) {
    html += `<div class="hero mini"><div class="wk">📅 ${rangeLabel(w.start)} <button data-a="weekSheet">Cambia</button></div>
      ${ms.length ? `<div class="sub"><b class="num" style="font-size:22px">${eur(sh.cassa)}</b> da comprare${sh.usedVal > 0.5 ? ` · ${eur(sh.usedVal)} già in casa` : ''} · ${ms.length} pasti</div>` : `<div class="sub">Scegli pranzo e cena, oppure lascia fare a me.</div>`}
      <div class="acts">${empty ? `<button class="btn" data-a="autoSheet">✨ ${ms.length ? 'Completa tu' : 'Componi tu il menu'}</button>` : `<button class="btn" data-a="tab" data-t="${w.status === 'cook' ? 'stasera' : 'spesa'}">${w.status === 'cook' ? '🍳 Stasera' : '🛒 Spesa'}</button>`}${(S.dispensa || []).length ? '<button class="btn alt" data-a="menuScorte">🏠 Dalle scorte</button>' : ''}<button class="btn alt" data-a="menuMore">⋯ Altro</button></div></div>`;
    html += (S.menuStyle === 'lista' ? poolHTML() : calHTML()) + tips.join('');
    html += `<button class="btn btn-soft btn-block" data-a="menuView" style="margin:4px 0 12px">📋 Vedi i pasti in dettaglio</button>`;
    if (ms.length && w.status !== 'cook') html += `<button class="btn btn-primary btn-block" data-a="tab" data-t="spesa" style="margin-top:6px">🛒 Lista della spesa · ${eur(sh.cassa)}</button>`;
    return html;
  }
  html += `<div class="hero">
    <div class="wk">📅 ${rangeLabel(w.start)} <button data-a="weekSheet">Cambia</button></div>
    ${ms.length ? `<div class="big num">${eur(sh.cassa)}</div><div class="sub">da comprare${sh.usedVal > 0.5 ? ` (più ${eur(sh.usedVal)} di cibo che hai già in casa)` : ''} · ${ms.length} pasti · circa ${eur(sh.consumo / ms.length)} a pasto${prof().on && ms.some(m => m.who.some(x => x.id === 'p1')) ? (mm => ` · 🔥 in media ${kc(mm.reduce((s, m) => s + mealNut(m.dish).k, 0) / mm.length)} kcal a pasto (obiettivo ${kc(mealTarget())})`)(ms.filter(m => m.who.some(x => x.id === 'p1'))) : ''}</div>`
      : `<div class="big">Che si mangia?</div><div class="sub">Scegli pranzo e cena, oppure lascia fare a me.</div>`}
    <div class="acts">
      ${empty ? `<button class="btn" data-a="autoSheet">✨ ${ms.length ? 'Completa tu' : 'Componi tu il menu'}</button>` : `<button class="btn" data-a="tab" data-t="${w.status === 'cook' ? 'stasera' : 'spesa'}">${w.status === 'cook' ? '🍳 Stasera' : '🛒 Vai alla spesa'}</button>`}
      ${ms.length ? '<button class="btn alt" data-a="clearAsk">Svuota</button>' : ''}
    </div>
    <div class="acts acts2">${ms.length && !empty ? '<button class="btn alt" data-a="autoSheet" data-redo="1">🔄 Rifai</button>' : ''}${ms.length ? '<button class="btn alt" data-a="saveMenuSheet">💾 Salva menu</button>' : ''}<button class="btn alt" data-a="savedSheet">📂 Menu salvati${(S.saved || []).length ? ` (${S.saved.length})` : ''}</button></div>
    ${w.mode && w.mode !== 'equilibrato' && ms.length ? `<div class="sub" style="margin-top:6px">${MODES[w.mode][0]} Menu ${MODES[w.mode][1].toLowerCase()}</div>` : ''}
    ${(S.dispensa || []).length ? '<div class="acts"><button class="btn" data-a="menuScorte" style="flex:1">🏠 Fai il menu dalle scorte (da oggi)</button></div>' : ''}
    <div class="steps3"><div class="${stage === 0 ? 'on' : 'done'}">1 · Menu</div><div class="${stage === 1 ? 'on' : stage > 1 ? 'done' : ''}">2 · Spesa</div><div class="${stage === 2 ? 'on' : ''}">3 · Cucina</div></div>
  </div>`;
  html += tips.join('');
  if (!window.__TEST_LIST) html += `<button class="btn btn-soft btn-block" data-a="menuView" style="margin-bottom:12px">${S.menuStyle === 'lista' ? '📝 Torna alla lista' : '📅 Torna al calendario'}</button>`;
  else html += homeCard(sh);
  for (let d = 0; d < 7; d++) {
    const date = addDays(w.start, d);
    html += `<div class="day"><div class="day-h"><b>${fdate(date, { weekday: 'long' })}</b><span>${fdate(date, { day: 'numeric', month: 'long' })}</span>${date === TODAY ? '<span class="badge red">oggi</span>' : ''}</div>
      ${dayKeys(d).map(k => slotHTML(k, warns) + sfiziHTML(k)).join('')}${!eaters(d + 'c').length ? `<button class="slot" data-a="whoSheet" data-k="${d}c"><div class="emo sm">🌙</div><div class="grow"><div class="lbl">🌙 Cena</div><div class="nm muted">Nessuno a casa a cena</div></div></button>` : ''}</div>`;
  }
  if (ms.length && w.status !== 'cook') html += `<button class="btn btn-primary btn-block" data-a="tab" data-t="spesa" style="margin-top:6px">🛒 Lista della spesa · ${eur(sh.cassa)}</button>`;
  return html;
}

function pantryHTML(sh) {
  if (!sh.pantry.length) return '';
  {
    const nOk = sh.pantry.filter(p => p.st).length;
    return `<div class="sec-title">🧂 Dispensa: controlla prima di uscire<span class="right">${nOk} di ${sh.pantry.length}</span></div><div class="group">
      ${sh.pantry.map(p => { const u = [...new Set(usesOf(p.iid).map(x => x.d))]; return `<div class="item pcheck ${p.st}"><span style="font-size:22px">${ING[p.iid].e}</span><div class="grow"><div class="nm">${esc(ING[p.iid].n)}</div><button class="uses" data-a="usesSheet" data-i="${p.iid}">${u.length} ${u.length === 1 ? 'piatto' : 'piatti'}: ${esc(u.slice(0, 2).join(', '))}${u.length > 2 ? '…' : ''}</button>${p.st === 'manca' ? '<div class="left">🛒 in lista</div>' : ''}</div>
        <div class="pbtn"><button class="${p.st === 'ok' ? 'on ok' : ''}" data-a="pcheck" data-i="${p.iid}" data-v="ok">✓ Ce l'ho</button><button class="${p.st === 'manca' ? 'on no' : ''}" data-a="pcheck" data-i="${p.iid}" data-v="manca">✗ Manca</button></div></div>`; }).join('')}
      </div><div class="muted small" style="margin:-4px 4px 10px">Olio, sale, spezie e simili non li metto in lista: controlla di averli. Quello che manca finisce tra le cose da comprare.</div>`;
  }
}
/* ---------------- vista: spesa ---------------- */
function fbuy(it) {
  const i = ING[it.iid];
  if (!i.conf) return fq(it.iid, it.buy);
  if (i.u === 'pz' && i.conf === 1) return fq(it.iid, it.n);
  if (i.b) return `${it.n} × ${i.b}`;
  return `${it.n} × ${i.u === 'pz' ? i.conf + ' ' + i.pzn[1] : fmass(i.conf, i.u)}`;
}
function renderSpesa() {
  const w = S.week, x = shopWin(w), ms = meals(w).filter(m => inWin(m.d, x)), sh = shopping(w, true), mk = SM[S.market], ck = chk(w);
  const trip = x.days && (w.trips || {})[winKey(w)];
  const winCard = `<div class="card shopwin"><b>🗓️ Spesa per</b><div class="seg" style="margin-top:8px;display:flex;width:100%;justify-content:space-between">${[[0, 'Settimana'], [2, '2 giorni'], [3, '3 giorni'], [4, '4 giorni']].map(([d, n]) => `<button class="${x.days === d ? 'on' : ''}" data-a="winDays" data-v="${d}">${n}</button>`).join('')}</div>
    ${x.days ? `<div class="chips" style="margin-top:10px">${[0, 1, 2, 3, 4, 5, 6].map(d => `<button class="chip${x.from === d ? ' on' : ''}" data-a="winFrom" data-v="${d}">${esc(fday(addDays(w.start, d)))}</button>`).join('')}</div>
      <div class="muted small" style="margin-top:6px">Pranzi e cene da ${esc(fday(addDays(w.start, x.from)))} a ${esc(fday(addDays(w.start, Math.min(6, x.from + x.days - 1))))}: ${ms.length} pasti. La schiscetta del primo giorno si prepara la sera prima.</div>` : ''}</div>`;
  if (!meals(w).length) return `<div class="empty"><div class="big">🛒</div><h3>La lista si fa da sola</h3><p>Scegli i piatti della settimana: qui trovi cosa comprare, quanto e quanto spendi.</p><button class="btn btn-primary" data-a="tab" data-t="menu">Scegli il menu</button></div>`;
  const total = sh.items.length + w.extras.length;
  const done = sh.items.filter(i => ck[i.iid]).length + w.extras.filter(e => e.done).length;
  let html = winCard + `<div class="total-card">
    <button class="market-btn" data-a="marketSheet"><span class="logo" style="background:${mk.c}">${esc(mk.n[0])}</span>${esc(mk.n)}<span style="opacity:.7;font-weight:600">· cambia ›</span></button>
    <div class="big num">${eur(sh.cassa)}</div>
    <div class="muted small" style="margin-top:6px">${feed() ? `prezzi ${esc(mk.n)} del ${feedDate(feed())}` : 'stima alla cassa'} per ${ms.length} pasti · ${sh.items.length} prodotti</div>
    ${sh.usedVal > 0.5 ? `<div class="muted small">Da comprare solo questo: ${ms.length} pasti valgono circa ${eur(sh.consumo)}, ma ${eur(sh.usedVal)} di cibo ce l'hai già in casa.</div>` : `<div class="muted small">Ne consumi circa ${eur(sh.consumo)}: il resto avanza in dispensa.</div>`}
    <div class="bar"><i style="width:${total ? done / total * 100 : 0}%"></i></div>
    <div class="muted small" style="margin-top:6px">${done} di ${total} nel carrello</div>
  </div>`;
  const tripTxt = tr => tr && tr.spent ? ` · hai speso <b>${eur(tr.spent)}</b>${tr.extra > 0.5 ? ` (lista ${eur(tr.stima)}, <b>+${eur(tr.extra)}</b> fuori lista)` : ` (stima ${eur(tr.stima || sh.cassa)})`}` : '';
  const tripBtns = `<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-a="confirmSheet" data-edit="1">✏️ Modifica importo</button><button class="btn btn-soft btn-sm" data-a="undoShop">↩️ Annulla: non l'ho fatta</button></div>`;
  if (trip) html += `<div class="tip green">✅ Spesa per questi giorni fatta ${fday(trip.date)}${tripTxt(trip)}.${tripBtns}<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${x.from + x.days < 7 ? `<button class="btn btn-green btn-sm" data-a="winNext">➡️ Prossima spesa: da ${esc(fday(addDays(w.start, x.from + x.days)))}</button>` : ''}<button class="btn btn-soft btn-sm" data-a="newFrom" data-d="${addDays(w.start, x.from + x.days)}">🗓️ Menu nuovo da ${esc(fday(addDays(w.start, x.from + x.days)))}</button></div></div>`;
  else if (w.status === 'cook' && !x.days) { const tr = (w.trips || {}).settimana; html += `<div class="tip green">✅ Spesa fatta${w.shopDate ? ' ' + fday(w.shopDate) : ''}${tr ? tripTxt(tr) : w.spent ? ` · hai speso <b>${eur(w.spent)}</b> (stima ${eur(sh.cassa)})` : ''}.${tripBtns}</div>`; }
  if (!ms.length) return html + '<div class="empty"><p>Nessun pasto in questi giorni: scegli altri giorni o completa il menu.</p></div>';
  if (feed()) { const nf = sh.items.filter(i => feedItem(i.iid)).length; html += `<div class="tip green small">🏷️ ${nf} prezzi su ${sh.items.length} sono quelli veri di ${esc(mk.n)} online del ${feedDate(feed())}${nf < sh.items.length ? '; gli altri sono stime o corretti da te' : ''}. Offerte già comprese.</div>`; }
  const reps = D.reparti.filter(r => sh.items.some(i => ING[i.iid].r === r.id)), allOpen = reps.every(r => (ui.openRep || {})[r.id]);
  html += `<div class="row" style="margin:14px 4px 6px"><b class="grow">Reparti</b><button class="btn-ghost small" data-a="repAll">${allOpen ? 'Chiudi tutto' : 'Apri tutto'}</button></div>`;
  for (const r of D.reparti) {
    const its = sh.items.filter(i => ING[i.iid].r === r.id);
    if (!its.length) continue;
    its.sort((a, b) => (!!ck[a.iid] - !!ck[b.iid]) || ING[a.iid].n.localeCompare(ING[b.iid].n));
    // reparti a tendina: si apre solo quello in cui sei
    const nOk = its.filter(i => ck[i.iid]).length, open = !!(ui.openRep || {})[r.id], full = nOk === its.length;
    html += `<div class="group rep${open ? ' open' : ''}${full ? ' full' : ''}"><button class="group-h rep-h" data-a="repToggle" data-r="${r.id}">${r.e} ${esc(r.n)}
        <span class="rep-n">${full ? '✓ tutto preso' : `${nOk}/${its.length}`}</span><span class="right num">${eur(its.reduce((s, i) => s + i.cost, 0))}</span><span class="chev">›</span></button>
      ${!open ? '' : its.map(it => {
        const i = ING[it.iid], lft = i.conf && it.left > i.conf * 0.05 ? ` · avanzano ${fq(it.iid, it.left, true)}` : '';
        return `<div class="item${ck[it.iid] ? ' done' : ''}" data-a="check" data-i="${it.iid}">
          <span class="check">✓</span>${(pim => pim ? `<div class="emo sm pimg">${i.e}${photo(pim)}</div>` : `<span style="font-size:22px">${i.e}</span>`)(prodImg(it.iid))}
          <div class="grow"><div class="nm">${esc(i.n)}</div><div class="q">${esc(fbuy(it))}</div>${isCustom(it.iid) && brandNote(it.iid) ? `<div class="left">🧾 ${esc(brandNote(it.iid))} · prezzo dallo scontrino</div>` : ''}${!feedItem(it.iid) && PHONE_MARKETS[S.market] && catItem(it.iid) ? `<div class="left">🛒 ${esc(catItem(it.iid).n)}</div>` : ''}${feedItem(it.iid) ? `<div class="left">${feedItem(it.iid).chosen ? '⭐' : '🏷️'} ${esc(feedItem(it.iid).n)}${feedItem(it.iid).promo ? ' · <b class="promo">in offerta</b>' : ''}</div>` : ''}
          <button class="uses" data-a="usesSheet" data-i="${it.iid}">ti servono ${fq(it.iid, it.need)}${lft} · <b>per cosa?</b></button>${it.have ? `<div class="left">🏠 più ${fq(it.iid, it.have)} che hai già in casa</div>` : ''}</div>
          <button class="pr num${isCustom(it.iid) ? ' custom' : ''}" data-a="priceSheet" data-i="${it.iid}">${eur(it.cost)}</button></div>`;
      }).join('')}</div>`;
  }
  if (pimgQueue.size) setTimeout(pimgLoad, 0);
  if (phoneProg && phoneProg.m === S.market) html += `<div class="tip small">🔄 Leggo i prezzi ${esc(SM[S.market].n)}: ${phoneProg.i} di ${phoneProg.n} ingredienti${phoneProg.i <= nListOf() ? ' (prima quelli della tua lista)' : ' · la tua lista è già aggiornata'}</div>`;
  if (S.market === 'iperal' && window.Native && window.Native.iperalCart && sh.items.length) html += `<button class="receipt-cta" data-a="iperalCart"><span class="emo" style="background:#00853f;color:#fff">🛒</span><span class="grow"><b>Metti tutto nel carrello Iperal</b><span class="muted small">${S.iperalOk ? 'poi scegli la fascia di ritiro e paghi sul sito' : 'prima entra con il tuo account Iperal'}</span></span><span class="add-btn">›</span></button>`;
  html += `<div class="sec-title">➕ Altro da comprare</div><div class="group">
    <button class="dish-row special" data-a="spOpen" data-mode="extra"><div class="emo">🧴</div><div class="grow"><div class="nm">Cerca nel catalogo del supermercato</div><div class="meta">dentifricio, deodorante, detersivi… con il prezzo vero</div></div></button>
    ${w.extras.map(e => `<div class="item${e.done ? ' done' : ''}" data-a="extraCheck" data-id="${e.id}"><span class="check">✓</span>${e.img ? `<div class="emo sm pimg">${spGuess(e.t)[1]}${photo(e.img)}</div>` : ''}<div class="grow"><div class="nm">${esc(e.t)}</div>${e.m ? `<div class="left">prezzo ${esc(SM[e.m].n)} online</div>` : ''}</div>${e.price ? `<span class="pr num">${eur(e.price)}</span>` : ''}<button class="btn-ghost" style="padding:6px" data-a="extraDel" data-id="${e.id}" aria-label="Elimina">✕</button></div>`).join('')}
    <div class="item"><input type="search" id="extra-in" placeholder="Scrivi: deodorante, dentifricio, caffè…" enterkeyhint="done" data-key="addExtra" data-in="exq" value="${esc((ui.ex && ui.ex.q) || '')}" autocomplete="off"><button class="btn btn-soft btn-sm" data-a="addExtra">Aggiungi</button></div>
    <div id="extra-sug">${exSugHTML()}</div></div>`;
  if (D.supermercati.some(m => feed(m.id))) html += `<button class="receipt-cta" data-a="productsSheet"><span class="emo cat-primo">🏷️</span><span class="grow"><b>I miei prodotti</b><span class="muted small">scegli le marche che compri: pasta, sughi, latte…</span></span><span class="add-btn">›</span></button>`;
  html += `<button class="receipt-cta" data-a="scanSheet"><span class="emo cat-unico">▥</span><span class="grow"><b>Scanner dei codici a barre</b><span class="muted small">mentre metti nel carrello: spunta la lista e mette «In casa»</span></span><span class="add-btn">›</span></button>`;
  html += `<button class="receipt-cta" data-a="receiptSheet"><span class="emo cat-freddo">📷</span><span class="grow"><b>Fotografa lo scontrino</b><span class="muted small">aggiorno da solo i prezzi di quello che hai comprato</span></span><span class="add-btn">›</span></button>`;
  if (mk.discount) html += `<div class="tip small">Nei discount i prodotti di marca (Rana, Findus…) di solito ci sono nella versione a marchio del discount: il prezzo stimato è già quello.</div>`;
  if (sh.home.length) html += `<div class="sec-title">🏠 Ce l'hai già in casa<span class="right">${sh.home.length}</span></div><div class="group">${sh.home.map(h => `<div class="item"><span style="font-size:22px">${ING[h.iid].e}</span><div class="grow"><div class="nm">${esc(ING[h.iid].n)}</div><div class="left">usi ${fq(h.iid, h.q)} di quello avanzato: non lo compri</div></div></div>`).join('')}</div>`;
  html += pantryHTML(sh);
  html += `<div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-soft" data-a="shareList">${I.share.replace('<svg', '<svg width="20" height="20"')} Condividi</button>
    ${!trip && (x.days || w.status !== 'cook') ? `<button class="btn btn-green grow" data-a="confirmSheet">✅ Ho fatto la spesa</button>` : `<button class="btn btn-soft grow" data-a="tab" data-t="stasera">🍳 Vai a stasera</button>`}</div>
    <p class="muted small" style="margin:14px 4px">${feed() ? `Prezzi letti da ${esc(mk.n)} spesa online: il prodotto più economico equivalente, con le offerte della settimana. ` : ''}Dove non c'è il prezzo vero uso una stima (ottobre 2026) adattata alla catena con l'indice di convenienza Altroconsumo 2025. Tocca un prezzo per correggerlo, o fotografa lo scontrino: lo ricordo per la prossima volta.</p>`;
  return html;
}
function listText() {
  const w = S.week, sh = shopping(w, true), ck = chk(w), x = shopWin(w);
  let t = `🛒 Spesa ${x.days ? `${fday(addDays(w.start, x.from))} + ${x.days} giorni` : rangeLabel(w.start)} · ${SM[S.market].n} · stima ${eur(sh.cassa)}\n`;
  for (const r of D.reparti) {
    const its = sh.items.filter(i => ING[i.iid].r === r.id);
    if (!its.length) continue;
    t += `\n${r.e} ${r.n}\n` + its.map(it => `${ck[it.iid] ? '☑' : '☐'} ${ING[it.iid].n} — ${fbuy(it)}`).join('\n') + '\n';
  }
  if (w.extras.length) t += `\n➕ Altro\n` + w.extras.map(e => `${e.done ? '☑' : '☐'} ${e.t}`).join('\n') + '\n';
  return t;
}

/* passaggi con le dosi vere: {riso_basmati} = tutta la dose, {olio/3} = un terzo, {cotto|prosciutto cotto in una fetta} = con un nome tuo */
const SPOON = new Set(['olio', 'olio_semi', 'aceto', 'salsa_soia']);
function qty(iid, q, label) {
  const i = ING[iid], nm = label || i.n.toLowerCase();
  if (!q) return nm;
  if (i.u === 'pz') return `${fq(iid, q, true)}${label ? ' (' + label + ')' : ''}`;
  if (SPOON.has(iid) && q <= 75) { const c = Math.max(0.5, Math.round(q / 10 * 2) / 2); return `${fnum(c)} ${c <= 1 ? 'cucchiaio' : 'cucchiai'} di ${nm}`; }
  return `${fmass(q, i.u)} di ${nm}`;
}
function stepHTML(d, s, n) {
  const q = Object.fromEntries(ingOf(d)), re = /\{([a-z0-9_]+)(?:\*(\d+))?(?:\/(\d+))?(?:\|([^}]*))?\}/g;
  let out = '', at = 0, m;
  while ((m = re.exec(s))) {
    const [all, iid, mul, div, label] = m;
    out += esc(s.slice(at, m.index));
    out += ING[iid] && iid in q ? `<b>${esc(qty(iid, q[iid] * n * (+mul || 1) / (+div || 1), label))}</b>` : esc(label || (ING[iid] ? ING[iid].n.toLowerCase() : all));
    at = m.index + all.length;
  }
  return out + esc(s.slice(at));
}
/* ---------------- vista: stasera ---------------- */
function recipeHTML(e, b) {
  const d = b.dish;
  const role = b.role === 'dinner' ? `🌙 Cena · ${pers(b.n)}` : b.role === 'lunch' ? (b.today ? `🍽️ Pranzo di oggi · ${porz(b.n)}` : `🍱 Schiscetta di domani · ${porz(b.n)}`) : `🌙 Cena + 🍱 schiscetta · ${porz(b.n)}`;
  const steps = d.steps.map((s, i) => {
    const k = `${e}|${d.id}|${i}`, m = s.match(/(\d+)\s*min\b/);
    return `<li class="${S.week.steps[k] ? 'done' : ''}" data-a="step" data-k="${k}">${stepHTML(d, s, b.n)}${m && +m[1] > 0 ? `<br><button class="timer-btn" data-a="timer" data-m="${m[1]}" data-l="${esc(d.n)} · passo ${i + 1}">⏱ ${m[1]} min</button>` : ''}</li>`;
  }).join('');
  return `<div class="recipe">
    ${b.key && (S.dispensa || []).length && shopCache().more[b.key] ? `<div class="tip green small">🍗 Usa tutto: ${esc(shopCache().more[b.key].map(x => '+' + fq(x.iid, x.q) + ' di ' + ING[x.iid].n.toLowerCase()).join(', '))} in più rispetto alla ricetta, così non avanza niente.</div>` : ''}
    <div class="role${b.role === 'lunch' ? ' lunch' : ''}">${role}${b.key && S.week.slots[b.key] && S.week.slots[b.key].d ? ` <button class="btn-ghost small" data-a="swapSheet" data-k="${b.key}" style="float:right">🔁 scambia</button>` : ''}</div>
    <div class="row">${dishEmo(d)}<div class="grow"><h3>${esc(d.n)}</h3>
      <div class="meta" style="margin-top:4px"><span>⏱ <b>${mins(d.tot)}</b> in tutto</span><span>👐 ${mins(d.att)} lavoro</span>${d.cott ? `<span>🔥 ${mins(d.cott)} cottura</span>` : '<span>senza cottura</span>'}</div></div></div>
    ${b.role === 'both' ? `<div class="tip green small">Cucina ${porz(b.n)}: ${b.nc} per stasera e ${b.np} da mettere nella schiscetta di domani.</div>` : ''}
    <h4>Ingredienti</h4><ul class="ing-list">${ingOf(d).map(([iid, q]) => `<li>${ingIcon(iid)}${esc(ING[iid].n)}<span class="q">${fq(iid, q * b.n)}</span></li>`).join('')}</ul>
    <h4>Procedimento</h4><ol class="steps tick">${steps}</ol>
    ${d.note ? `<div class="tip small">📝 ${esc(d.note)}</div>` : ''}${d.tip ? `<div class="tip small">💡 ${esc(d.tip)}</div>` : ''}
    ${b.role !== 'dinner' ? `<div class="tip blue small">🍱 ${esc(d.sctip || SCTIP[d.sc] || '')}</div>` : ''}
  </div>`;
}
function renderStasera() {
  const w = S.week;
  if (!meals(w).length) return `<div class="empty"><div class="big">🍳</div><h3>Ancora niente da cucinare</h3><p>Componi il menu e fai la spesa: ogni sera qui trovi la cena e la schiscetta per domani, passo passo.</p><button class="btn btn-primary" data-a="tab" data-t="menu">Vai al menu</button></div>`;
  if (ui.eve === null) ui.eve = defaultEve();
  const lo = anyLunch() && w.start !== TODAY ? -1 : 0;     // menu che parte oggi: il pranzo di oggi è nella sessione di oggi
  let html = '';
  if (w.status !== 'cook') html += `<div class="tip">Prima fai la spesa: quando la confermi, ogni sera ${S.reminder.on ? `alle ${S.reminder.t} ` : ''}ti ricordo cosa cucinare. Intanto puoi dare un'occhiata.</div>`;
  if ((S.dispensa || []).length) html += `<button class="receipt-cta" data-a="cookedSheet"><span class="emo cat-unico">🍳</span><span class="grow"><b>Hai cucinato altro?</b><span class="muted small">segna cosa hai usato: tolgo da «In casa» e rifaccio i prossimi giorni</span></span><span class="add-btn">›</span></button>`;
  html += '<div class="days-strip">';
  for (let e = lo; e <= 6; e++) {
    const date = addDays(w.start, e);
    html += `<button class="dchip${ui.eve === e ? ' on' : ''}${date === TODAY ? ' today' : ''}${w.done[e] ? ' done' : ''}" data-a="eve" data-e="${e}"><small>${fdate(date, { weekday: 'short' })}</small><b>${parse(date).getDate()}</b></button>`;
  }
  html += '</div>';
  const p = eveningPlan(ui.eve);
  const wd = fdate(p.date, { weekday: 'long' });
  const when = p.date === TODAY ? 'Stasera' : p.date === addDays(TODAY, 1) ? 'Domani sera' : wd[0].toUpperCase() + wd.slice(1) + ' sera';
  if (!p.blocks.length) {
    return html + `<div class="empty"><div class="big">${p.dinSkip ? '🍽️' : '🛋️'}</div><h3>${when}: niente da cucinare</h3><p>${p.dinSkip ? 'Hai segnato che mangi fuori.' : 'Nessun piatto in programma per questa sera.'}</p></div>`;
  }
  html += `<div class="tonight"><h2>${when}${ui.eve === -1 ? ' · prima della settimana' : ''}</h2>
    <div class="sub">${fdate(p.date, { day: 'numeric', month: 'long' })} · ≈ ${mins(p.time)} in cucina, ${mins(p.work)} di lavoro</div>
    ${p.note ? `<div class="plan">${p.note}</div>` : ''}</div>`;
  html += p.blocks.map(b => recipeHTML(ui.eve, b)).join('');
  const next = ui.eve < 6 ? slotDish(w, (ui.eve + 1) + 'p') : null;
  html += w.done[ui.eve]
    ? `<div class="tip green" style="text-align:center">✅ Fatto! ${next && next.dish ? `Domani a pranzo: <b>${esc(next.dish.n)}</b>` : ''}</div>`
    : `<button class="btn btn-green btn-block" data-a="eveDone">✓ Fatto per ${when.toLowerCase()}</button>`;
  return html;
}

/* ---------------- vista: ricettario ---------------- */
function dishFilter(f, slotLunch) {
  const q = f.q.trim().toLowerCase();
  return ALL.filter(p => {
    if (blocked(p)) return false;      // allergie e ingredienti che non mangi
    if (slotLunch && !f.all && !p.sc && f.cat !== 'fav') return false;   // i 👍 si vedono sempre, anche se non sono da schiscetta
    if (q && !(p.n.toLowerCase().includes(q) || p.ing.some(([iid]) => ING[iid].n.toLowerCase().includes(q)))) return false;
    if (f.cat === 'all') return true;
    if (f.cat === 'fav') return !!S.favs[p.id];
    if (f.cat === 'dis') return !!(S.dislikes || {})[p.id];
    if (f.cat === 'veg') return p.veg;
    if (f.cat === 'mine') return !!p.mine;
    if (f.cat === 'fast') return p.att <= 10 && p.tot <= 20;
    if (f.cat === 'sc') return !!p.sc;
    if (TCHIPS.some(([k]) => k === f.cat)) return fitsCat(p, f.cat);
    return p.cat === f.cat;
  });
}
const TCHIPS = [['legumi', '🫘 Legumi'], ['carne', '🥩 Carne'], ['pesce', '🐟 Pesce'], ['formaggio', '🧀 Formaggio'], ['uova', '🥚 Uova']];
const FCHIPS = [['all', 'Tutti'], ['fast', '⚡ Veloci'], ['fav', '👍 Mi piacciono'], ['mine', '✍️ Mie'], ...CATS, ...TCHIPS, ['veg', '🌱 Vegetariani'], ['dis', '👎 Scartati']];
function allergyList(list, ex) {
  return list.map(i => {
    const own = !!(S.noIng || {})[i.id], viaAll = !own && ex.has(i.id);
    return `<div class="item" data-a="noIngToggle" data-i="${i.id}"><span style="font-size:22px">${i.e}</span><div class="grow"><div class="nm">${esc(i.n)}</div>${viaAll ? '<div class="left">escluso per un\'allergia</div>' : ''}</div><span class="toggle${own || viaAll ? ' on' : ''}"></span></div>`;
  }).join('') || '<div class="item muted">Nessun ingrediente trovato</div>';
}
function hiddenNote() {
  const n = ALL.filter(blocked).length;
  return n ? `<div class="tip small">🚫 ${n} ricette nascoste per allergie o ingredienti che non mangi. <button class="btn-ghost small" data-a="allergySheet">Modifica</button></div>` : '';
}
function renderPiatti() {
  const f = ui.cf;
  const list = dishFilter(f).sort((a, b) => a.n.localeCompare(b.n));
  return `<button class="new-recipe" data-a="newRecipe"><span class="emo cat-unico">✍️</span><span class="grow"><b>Aggiungi una tua ricetta</b><span class="muted small">con ingredienti, dosi e passaggi: entra nel menu e nella spesa</span></span><span class="add-btn">＋</span></button>
    <input type="search" placeholder="Cerca un piatto o un ingrediente…" value="${esc(f.q)}" data-in="cq" style="margin-bottom:12px">
    <div class="chips">${FCHIPS.map(([k, n]) => `<button class="chip${f.cat === k ? ' on' : ''}" data-a="cf" data-c="${k}">${n}</button>`).join('')}</div>
    ${hiddenNote()}
    <div id="cat-list" style="margin-top:10px">${f.cat === 'mine' && !list.length ? '<div class="empty"><div class="big">✍️</div><h3>Nessuna ricetta tua</h3><p>Aggiungi la prima con il pulsante qui sopra.</p></div>' : catGrid(list)}</div>`;
}
function catGrid(list) {
  if (!list.length) return '<div class="empty"><div class="big">🔍</div><p>Nessun piatto trovato.</p></div>';
  return `<div class="grid2">${list.map(p => `<button class="dcard" data-a="dish" data-id="${p.id}">
    ${dishEmo(p)}${S.favs[p.id] ? '<span class="heart">👍</span>' : (S.dislikes || {})[p.id] ? '<span class="heart">👎</span>' : ''}
    <div class="nm">${esc(p.n)}</div>
    <div class="meta"><span>⏱ ${mins(p.tot)}</span><span>👐 ${mins(p.att)}</span><span>${eur(dishCost(p.id))}</span></div></button>`).join('')}</div>`;
}

/* foto dei piatti (Wikimedia Commons, data/immagini_ricette.json) e dei prodotti (sito del supermercato) */
const photo = u => u ? `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">` : '';
const dishEmo = (p, cls = '', e = p.e) => `<div class="emo ${cls} cat-${p.cat}">${e}${p.img ? photo(p.img.u) : ''}</div>`;

/* ---------------- vista: spese fatte ---------------- */
const giroLbl = x => x.giro === 'settimana' || !/^\d+-\d+$/.test(x.giro) ? `settimana ${rangeLabel(x.week)}`
  : (([f, n]) => `${n} giorni da ${fday(addDays(x.week, f))}`)(x.giro.split('-').map(Number));
const ym = d => d.slice(0, 7);
const monthLbl = m => { const s = fdate(m + '-01', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
function renderSpese() {
  const L = S.spese || [];
  if (!L.length) return `<div class="empty"><div class="big">💶</div><h3>Ancora nessuna spesa</h3><p>Quando segni «Ho fatto la spesa», paghi con Google Wallet o fotografi lo scontrino, la spesa compare qui con data, negozio e importo.</p><button class="btn btn-primary" data-a="spesaAddSheet">＋ Aggiungi una spesa</button></div>`;
  const sum = m => L.filter(x => ym(x.date) === m).reduce((s, x) => s + (x.spent || 0), 0);
  const thisM = ym(TODAY), prevM = ym(addDays(thisM + '-01', -1));
  const months = []; for (let k = 5; k >= 0; k--) { const d = parse(thisM + '-01'); d.setMonth(d.getMonth() - k); months.push(iso(d).slice(0, 7)); }
  const vals = months.map(sum), max = Math.max(...vals, 1);
  const wk8 = L.filter(x => x.spent > 0 && diffDays(TODAY, x.date) <= 56), weeks = new Set(wk8.map(x => x.week)).size;
  let html = `<div class="hero"><div class="wk">💶 ${monthLbl(thisM)}</div><div class="big num">${eur(sum(thisM))}</div>
    <div class="sub">${(n => n === 1 ? '1 spesa' : n + ' spese')(L.filter(x => ym(x.date) === thisM && x.spent > 0).length)} questo mese · ${monthLbl(prevM).split(' ')[0].toLowerCase()} ${eur(sum(prevM))}${weeks ? ` · in media ${eur(wk8.reduce((s, x) => s + x.spent, 0) / weeks)} a settimana` : ''}</div>
    <div class="bars">${months.map((m, k) => `<div class="bar${m === thisM ? ' on' : ''}"><i style="height:${Math.max(3, Math.round(vals[k] / max * 54))}px"></i><small>${fdate(m + '-01', { month: 'short' })}</small></div>`).join('')}</div></div>`;
  let cur = '';
  for (const x of L) {
    if (ym(x.date) !== cur) { if (cur) html += '</div>'; cur = ym(x.date); html += `<div class="sec-title">${monthLbl(cur)}<span class="right num">${eur(sum(cur))}</span></div><div class="group">`; }
    const f = FONTI[x.fonte] || FONTI.spesa, diff = x.spent && x.stima ? x.spent - x.stima : null;
    html += `<div class="item" data-a="spesaInfo" data-id="${esc(x.id)}"><span style="font-size:22px">${f[0]}</span><div class="grow"><div class="nm">${esc(fday(x.date))}${x.store ? ' · ' + esc(x.store) : ''}</div>
      <div class="left">${esc(giroLbl(x))}${x.items.length ? ` · ${x.items.length} prodotti` : ''}${diff != null && Math.abs(diff) >= 0.5 ? ` · ${diff > 0 ? '+' : '−'}${eur(Math.abs(diff))} sulla stima` : ''}</div></div>
      ${x.spent ? `<b class="num">${eur(x.spent)}</b>` : '<span class="badge">importo?</span>'}</div>`;
  }
  return html + '</div><button class="btn btn-soft btn-block" data-a="spesaAddSheet" style="margin-top:12px">＋ Aggiungi una spesa</button>';
}

const segHTML = (a, cur, list) => `<div class="seg subtabs">${list.map(([v, n]) => `<button class="${cur === v ? 'on' : ''}" data-a="${a}" data-v="${v}">${n}</button>`).join('')}</div>`;
/* scheda Spesa: la lista, le spese fatte e quello che hai mangiato */
function renderSpesaTab() {
  const t = ui.spTab || 'lista';
  return segHTML('spTab', t, [['lista', '🛒 Lista'], ['spese', '🧾 Spese fatte'], ['mangiato', '🍽️ Mangiato']]) + (t === 'spese' ? renderSpese() : t === 'mangiato' ? renderDiario() : renderSpesa());
}
/* cronologia di quello che hai cucinato e mangiato: si può annullare o correggere */
function renderDiario() {
  const L = S.diario || [];
  if (!L.length) return `<div class="empty"><div class="big">🍽️</div><h3>Ancora niente</h3><p>Nel calendario del menu tocca un pasto e segna «L'ho cucinato», oppure «Ho mangiato altro»: qui trovi cosa hai mangiato e quanto hai usato, e puoi annullare o correggere.</p></div>`;
  let html = '', cur = '';
  for (const e of L) {
    if (e.date !== cur) { if (cur) html += '</div>'; cur = e.date; html += `<div class="sec-title">${esc(fdate(e.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</div><div class="group">`; }
    html += `<div class="item" style="align-items:flex-start"><span style="font-size:22px">${e.t === 'p' ? '🍱' : '🌙'}</span><div class="grow"><div class="nm">${esc(e.n)}</div>
      <div class="left">${e.t === 'p' ? 'Pranzo' : 'Cena'} · ${e.plan ? 'come da ricetta' : `cucinato da te, ${porz(e.porz)}`}${e.kcal ? ` · circa ${kc(e.kcal)} kcal a porzione` : ''}</div>
      <div class="left">${esc(e.used.slice(0, 6).map(u => fq(u.iid, u.q, true) + ' ' + ING[u.iid].n.toLowerCase()).join(', '))}${e.used.length > 6 ? '…' : ''}</div>
      <div style="display:flex;gap:6px;margin-top:6px">${e.own ? `<button class="btn btn-soft btn-sm" data-a="diaryEdit" data-id="${e.id}">✏️ Correggi</button>` : ''}<button class="btn btn-ghost btn-sm" data-a="diaryUndo" data-id="${e.id}">↩️ Annulla</button></div></div></div>`;
  }
  return html + '</div>';
}
/* scheda Dispensa: quello che hai, quello da comprare, le cose di base */
function renderDispensa() {
  const w = S.week, sh = shopping(w), t = ui.dpTab || 'casa', lots = (S.dispensa || []).filter(l => ING[l.iid]), nd = lots.length ? shopNeededDay() : null;
  const val = lots.reduce((s2, l) => s2 + l.q * unitCost(l.iid), 0);
  let html = `<div class="hero"><div class="wk">🏠 In casa</div><div class="big num">${lots.length} <small style="font-size:18px">prodotti</small></div>
    <div class="sub">${lots.length ? `circa ${eur(val)} di cibo${nd ? ` · ti basta fino a ${esc(fdate(nd, { weekday: 'long', day: 'numeric' }))}` : ' · copre tutto il menu'}` : 'Aggiungi quello che hai: scontrino, scanner, foto o a mano.'}</div>
    <div class="acts">${lots.length ? '<button class="btn" data-a="menuScorte">🏠 Rifai il menu da qui (da oggi)</button>' : ''}<button class="btn alt" data-a="cookedSheet">🍳 Ho cucinato</button></div></div>`;
  html += segHTML('dpTab', t, [['casa', '🏠 In casa'], ['comprare', '🛒 Da comprare'], ['base', '🧂 Di base']]);
  if (t === 'casa') {
    html += `<div class="row" style="gap:8px;margin:4px 0 12px;flex-wrap:wrap"><button class="btn btn-soft btn-sm" data-a="receiptSheet">🧾 Scontrino</button><button class="btn btn-soft btn-sm" data-a="scanSheet">▥ Scanner</button><button class="btn btn-soft btn-sm" data-a="homeAddSheet">📷 Foto</button><button class="btn btn-soft btn-sm" data-a="homeAddSheet" data-m="mano">＋ A mano</button></div>`;
    html += lots.length ? homeCard(sh, true) : '<div class="empty"><div class="big">🏠</div><p>Niente in casa. Dopo la spesa fotografa lo scontrino: quello che hai comprato finisce qui, con le scadenze.</p></div>';
  } else if (t === 'comprare') {
    const sw = shopping(w, true), ck = chk(w);
    html += sw.items.length ? `<div class="group">${sw.items.map(it => `<div class="item${ck[it.iid] ? ' done' : ''}"><span style="font-size:22px">${ING[it.iid].e}</span><div class="grow"><div class="nm">${esc(ING[it.iid].n)}</div><div class="left">${fbuy(it)} · ${eur(it.cost)}</div></div></div>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-a="tab" data-t="spesa" style="margin-top:10px">🛒 Apri la lista della spesa · ${eur(sw.cassa)}</button>` : '<div class="empty"><div class="big">✅</div><p>Per il menu di questi giorni non devi comprare niente.</p></div>';
  } else {
    html += pantryHTML(sh);
    const all = Object.values(ING).filter(i => i.disp && !i.mine && !sh.pantry.some(p => p.iid === i.id)).sort((a, b) => a.n.localeCompare(b.n));
    html += `<div class="sec-title">🧂 Le altre cose di base</div><div class="group">${all.map(i => { const st = S.pantry[i.id] === false ? 'manca' : S.pantry[i.id] === true ? 'ok' : ''; return `<div class="item pcheck ${st}"><span style="font-size:22px">${i.e}</span><div class="grow"><div class="nm">${esc(i.n)}</div></div>
      <div class="pbtn"><button class="${st === 'ok' ? 'on ok' : ''}" data-a="pbase" data-i="${i.id}" data-v="ok">✓ Ce l'ho</button><button class="${st === 'manca' ? 'on no' : ''}" data-a="pbase" data-i="${i.id}" data-v="manca">✗ Manca</button></div></div>`; }).join('')}</div>
      <p class="muted small" style="margin:6px 4px">Sale, olio, pepe, dado, spezie: non vanno nella lista finché le hai. Se segni «Manca», i piatti che le usano non escono nel menu dalle scorte.</p>`;
  }
  return html;
}
/* menu a lista: i piatti della settimana senza giorni. Oggi scegli quale cucinare tra quelli che si fanno con quello che hai:
   il piatto scelto si scambia con quello del pasto di oggi, così spesa, dispensa e «L'ho cucinato» restano quelli di sempre. */
const todayIdx = (w = S.week) => { const d = diffDays(TODAY, w.start); return d >= 0 && d < 7 ? d : -1; };
function canMake(dish, n) {        // cosa manca in casa per farlo adesso (solo gli ingredienti principali, porzioni intere)
  const tot = {}, miss = [];
  for (const l of S.dispensa || []) if (ING[l.iid] && l.exp >= TODAY) tot[l.iid] = (tot[l.iid] || 0) + l.q;
  for (const [iid, q] of ingOf(dish)) {
    const i = ING[iid];
    if (!i) continue;
    if (i.disp) { if (S.pantry[iid] === false) miss.push(iid); continue; }
    if (SOFT.has(iid) || MINOR.has(iid)) continue;
    const have = Object.keys(tot).filter(x => sameUse(iid, x)).reduce((s2, x) => s2 + tot[x], 0);
    if (have + 1e-6 < q * n) miss.push(iid);
  }
  return miss;
}
function todayRows(w = S.week) {      // i pasti di oggi: pranzo (se non è già passato), cena, schiscetta di domani
  const d0 = todayIdx(w), out = [];
  if (d0 < 0) return out;
  if (new Date().getHours() < 15 && lunchKeys(d0, w).length) out.push([lunchKeys(d0, w)[0], '🍱 Pranzo di oggi']);
  if (eaters(d0 + 'c', w).length) out.push([d0 + 'c', '🌙 Cena di stasera']);
  if (d0 < 6 && lunchKeys(d0 + 1, w).length) out.push([lunchKeys(d0 + 1, w)[0], '🍱 Schiscetta di domani']);
  return out;
}
function poolGroups(w = S.week) {     // piatti ancora da cucinare (dopo quelli di oggi), uguali raggruppati
  const skip = new Set(todayRows(w).map(r => r[0])), g = new Map();
  for (const m of meals(w)) {
    if (m.left || m.dish.own || skip.has(m.key) || cookDate(w, m) < TODAY) continue;
    const x = g.get(m.dish.id) || { dish: m.dish, keys: [], n: 0 };
    x.keys.push(m.key); x.n += m.n; g.set(m.dish.id, x);
  }
  return [...g.values()].map(x => Object.assign(x, { miss: canMake(x.dish, slotN(x.keys[0], x.dish, w)) }));
}
const poolImg = p => p.img ? `<img src="${esc(p.img.u)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="cal-e">${p.e}</span>`;
const missTxt = miss => miss.length ? `🛒 da comprare: ${esc(miss.slice(0, 3).map(i => ING[i].n.toLowerCase()).join(', '))}${miss.length > 3 ? '…' : ''}` : '✅ si fa con quello che hai';
function poolHTML() {
  const w = S.week, done = {};
  for (const e of S.diario || []) done[e.date + e.t] = e;
  let h = '';
  const rows = todayRows(w);
  if (rows.length) {
    h += `<div class="sec-title">Oggi</div><div class="group">`;
    for (const [k, l] of rows) {
      const r = slotDish(w, k), date = addDays(w.start, kDay(k)), e = done[date + kT(k)];
      if (r && r.dish) h += `<button class="pool-i" data-a="mealSheet" data-k="${k}">${poolImg(r.dish)}<div class="grow"><div class="left">${l}</div><div class="nm">${r.left ? '♻️ ' : ''}${esc(r.dish.n)}</div>
        <div class="left">${e ? '✅ segnato' : r.dish.own ? '🍳 cucinato da te' : missTxt(canMake(r.dish, slotN(k, r.dish, w)))}</div></div><span class="add-btn">›</span></button>`;
      else h += `<button class="pool-i empty" data-a="poolPick" data-k="${k}"><span class="cal-e">${r && r.skip ? '🚫' : '＋'}</span><div class="grow"><div class="left">${l}</div><div class="nm">${r && r.skip ? 'Saltato: scegli un piatto' : 'Scegli dalla lista'}</div></div><span class="add-btn">›</span></button>`;
    }
    h += '</div>';
  }
  const G = poolGroups(w).sort((a, b) => a.miss.length - b.miss.length);
  h += `<div class="sec-title">Da cucinare nei prossimi giorni<span class="right">${G.reduce((s2, x) => s2 + x.keys.length, 0)} pasti</span></div>`;
  h += G.length ? `<div class="group">${G.map(x => `<button class="pool-i" data-a="poolSheet" data-k="${x.keys[0]}">${poolImg(x.dish)}<div class="grow"><div class="nm">${esc(x.dish.n)}${x.keys.length > 1 ? ` <span class="badge">×${x.keys.length}</span>` : ''}</div>
      <div class="left">${x.dish.sc ? '🍱 anche in schiscetta · ' : ''}⏱ ${mins(x.dish.tot)}</div><div class="left">${missTxt(x.miss)}</div></div><span class="add-btn">›</span></button>`).join('')}</div>`
    : '<div class="empty"><p>Nessun piatto in lista. Premi «Componi tu il menu» o «Dalle scorte».</p></div>';
  return h + `<p class="muted small" style="margin:4px 4px 12px">Ogni giorno tocca un piatto e scegli quando cucinarlo: prima quelli con ✅, che si fanno con quello che hai in casa.</p>`;
}
/* scambia (o sposta) il piatto del pasto k sul pasto di oggi «to» */
function poolTargets(k, w = S.week) {
  const p = (slotDish(w, k) || {}).dish;
  return p ? todayRows(w).filter(([t]) => t !== k && (kT(t) !== 'p' || isTodayLunch(t) || p.sc) && !((slotDish(w, t) || {}).own)) : [];
}

/* menu a calendario: una riga per giorno, pranzo e cena con la foto del piatto; tocca un pasto per tutte le azioni */
function calHTML() {
  const w = S.week, sh = (S.dispensa || []).length ? shopCache() : null, done = {};
  for (const e of S.diario || []) done[e.date + e.t] = e;
  const cell = (k, d, t) => {
    if (!k) return `<div class="cal-c off">${t === 'p' ? 'niente schiscetta' : 'fuori a cena'}</div>`;
    const r = slotDish(w, k), date = addDays(w.start, d);
    if (!r) return `<button class="cal-c empty" data-a="pick" data-k="${k}">＋ scegli</button>`;
    if (r.skip) return `<button class="cal-c off" data-a="mealSheet" data-k="${k}">saltato</button>`;
    if (!r.dish) return `<button class="cal-c empty" data-a="pick" data-k="${k}">＋ scegli</button>`;
    const p = r.dish, e = done[date + t], buy = sh && sh.short[k] && sh.short[k].size;
    return `<button class="cal-c" data-a="mealSheet" data-k="${k}">${p.img ? `<img src="${esc(p.img.u)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="cal-e">${p.e}</span>`}
      <span class="cal-n">${r.left ? '♻️ ' : ''}${esc(p.n)}</span><span class="cal-b">${e ? '✅' : ''}${p.own ? '🍳' : ''}${buy ? '🛒' : ''}</span></button>`;
  };
  let h = '<div class="cal"><div class="cal-r head"><span></span><span>🍱 Pranzo</span><span>🌙 Cena</span></div>';
  for (let d = 0; d < 7; d++) {
    const date = addDays(w.start, d), lk = lunchKeys(d), more = lk.length > 1 ? `<small class="cal-more">+${lk.length - 1}</small>` : '';
    h += `<div class="cal-r${date === TODAY ? ' today' : ''}${date < TODAY ? ' past' : ''}"><div class="cal-d"><b>${esc(fdate(date, { weekday: 'short' }))}</b><span>${parse(date).getDate()}</span></div>
      <div class="cal-w">${cell(lk[0], d, 'p')}${more}</div><div class="cal-w">${cell(eaters(d + 'c').length ? d + 'c' : null, d, 'c')}</div></div>`;
  }
  return h + `</div><p class="muted small" style="margin:4px 4px 12px">✅ cucinato · 🍳 fatto da te · ♻️ avanzo · 🛒 manca qualcosa. Tocca un pasto per la ricetta, segnarlo o cambiarlo.</p>`;
}
const VIEWS = { menu: renderMenu, spesa: renderSpesaTab, stasera: renderStasera, spese: renderSpese, dispensa: renderDispensa, piatti: renderPiatti };

/* ---------------- sheet ---------------- */
function slotLabel(key) {
  const d = kDay(key), t = kT(key), who = kWho(key) && personOf(kWho(key));
  return `${t === 'p' ? 'Schiscetta' + (who ? ' di ' + who.name : '') : 'Cena'} di ${fdate(addDays(S.week.start, d), { weekday: 'long' })}`;
}
function pickList(key) {
  const t = kT(key), d = kDay(key), w = S.week, f = ui.pf;
  const saved = w.slots[key];
  delete w.slots[key];
  const base = shopping(w).cassa;
  const list = dishFilter(f, t === 'p').map(p => {
    w.slots[key] = { d: p.id };
    const marg = shopping(w).cassa - base;
    return { p, marg, own: dishCost(p.id, Math.max(1, nOf(key))), warn: perishables(p, daysAfterShop(d, t)) };
  });
  if (saved) w.slots[key] = saved; else delete w.slots[key];
  if (f.sort === 'cost') list.sort((a, b) => a.marg - b.marg || a.p.tot - b.p.tot);
  if (f.cat !== 'dis') list.sort((a, b) => !!(S.dislikes || {})[a.p.id] - !!(S.dislikes || {})[b.p.id]);   // gli scartati in fondo
  else if (f.sort === 'time') list.sort((a, b) => a.p.tot - b.p.tot || a.marg - b.marg);
  else list.sort((a, b) => a.p.n.localeCompare(b.p.n));
  if (!list.length) return '<div class="empty"><div class="big">🔍</div><p>Nessun piatto con questi filtri.</p></div>';
  const cur = saved && saved.d;
  return list.map(({ p, marg, own, warn }) => {
    const reuse = marg < own * 0.35;
    return `<div class="dish-row"${cur === p.id ? ' style="outline:2px solid var(--tomato)"' : ''}>
      <button class="row grow" style="text-align:left" data-a="dish" data-id="${p.id}" data-k="${key}">${dishEmo(p)}
      <div class="grow"><div class="nm">${esc(p.n)}${S.favs[p.id] ? ' 👍' : (S.dislikes || {})[p.id] ? ' 👎' : ''}</div>
        <div class="meta" style="margin-top:3px"><span>⏱ ${mins(p.tot)}</span><span>👐 ${mins(p.att)}</span>${t === 'p' && p.sc ? `<span>${p.sc === 'fredda' ? '❄️ fredda' : p.sc === 'calda' ? '♨️ da scaldare' : '❄️♨️'}</span>` : ''}</div>
        <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap"><span class="badge ${reuse ? 'green' : ''} num">${marg < 0.005 ? 'gratis: hai già tutto' : '+' + eur(marg) + ' alla spesa'}</span>${reuse && marg >= 0.005 ? '<span class="badge green">♻️ usa avanzi</span>' : ''}${warn.length ? '<span class="badge warn">⚠️ deperibile</span>' : ''}${t === 'p' && !p.sc ? '<span class="badge warn">non è da schiscetta</span>' : ''}</div>
      </div></button>
      <button class="add-btn" data-a="setSlot" data-k="${key}" data-id="${p.id}" aria-label="Scegli">＋</button></div>`;
  }).join('');
}
const EMOJIS = ['🍝', '🍚', '🍲', '🥗', '🍗', '🥩', '🐟', '🍳', '🥙', '🌮', '🍕', '🥪', '🍜', '🥘', '🫕', '🍆', '🥦', '🧀', '🍽️'];
const SCOPTS = [[null, 'No'], ['calda', 'Da scaldare'], ['fredda', 'Fredda'], ['entrambe', 'Calda o fredda']];
const unitLbl = iid => { const i = ING[iid]; return i.u === 'pz' ? i.pzn[1] : i.u; };
function editorHTML() {
  const ed = ui.ed;
  const chip = (f, v, n) => `<button class="chip${ed[f] === v ? ' on' : ''}" data-a="edSet" data-f="${f}" data-v="${v}">${n}</button>`;
  return `<div class="sheet-h"><h2>${ed.id ? 'Modifica ricetta' : 'Nuova ricetta'}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
    <div class="card">
      <label class="lab">Nome</label><input type="text" data-ed="n" value="${esc(ed.n)}" placeholder="Es. Pasta della nonna" maxlength="70">
      <label class="lab">Icona</label>
      <div class="row"><input type="text" data-ed="e" value="${esc(ed.e)}" class="emo-in" maxlength="8" aria-label="Icona"><div class="chips" style="margin:0;padding:2px 0 6px">${EMOJIS.map(x => `<button class="chip${ed.e === x ? ' on' : ''}" data-a="edEmoji" data-v="${x}">${x}</button>`).join('')}</div></div>
      <label class="lab">Tipo di piatto</label><div class="chips wrap">${CATS.map(([k, n]) => chip('cat', k, n)).join('')}</div>
      <label class="lab">Tempi in minuti</label>
      <div class="grid3"><label><input type="text" inputmode="numeric" data-ed="att" value="${esc(ed.att)}" placeholder="15"><span>👐 di lavoro</span></label>
        <label><input type="text" inputmode="numeric" data-ed="cott" value="${esc(ed.cott)}" placeholder="0"><span>🔥 di cottura</span></label>
        <label><input type="text" inputmode="numeric" data-ed="tot" value="${esc(ed.tot)}" placeholder="auto"><span>⏱ in tutto</span></label></div>
      <p class="muted small" style="margin:6px 2px 0">«In tutto» vuoto = lavoro + cottura. Se mentre cuoce fai altro, mettilo più corto.</p>
      <label class="lab">Va bene per la schiscetta?</label><div class="chips wrap">${SCOPTS.map(([k, n]) => `<button class="chip${ed.sc === k ? ' on' : ''}" data-a="edSet" data-f="sc" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="set-row" data-a="edSet" data-f="veg" style="border:0;padding-bottom:0"><div class="grow"><b>🌱 Vegetariano</b></div><span class="toggle${ed.veg ? ' on' : ''}"></span></div>
    </div>
    <div class="sec-title">Ingredienti · dosi per 1 persona<span class="right num" id="ed-tot">${edCosts().tot ? eur3(edCosts().tot) + ' a porzione' : ''}</span></div>
    <div class="group">${ed.ing.map(([iid, q], k) => `<div class="item"><span style="font-size:22px">${ING[iid].e}</span><div class="grow"><div class="nm">${esc(ING[iid].n)}</div>
        <button class="ed-cost num" id="ed-c${k}" data-a="edBrand" data-k="${k}">${edCostTxt(k)}</button></div>
        <input type="text" inputmode="decimal" class="qty-in" data-edq="${k}" value="${esc(q)}" placeholder="q.b." aria-label="Quantità"><span class="unit">${esc(unitLbl(iid))}</span>
        <button class="btn-ghost" style="padding:6px" data-a="edDelIng" data-i="${k}" aria-label="Togli">✕</button></div>`).join('')}
      <button class="item add-ing" data-a="edAddIng"><span class="add-btn">＋</span><b>Aggiungi ingrediente</b></button></div>
    <p class="muted small" style="margin:-4px 4px 10px">Quantità vuota = q.b. (sale, pepe…). Le dosi si moltiplicano da sole per le persone.</p>
    <div class="sec-title">Procedimento</div>
    <textarea data-ed="steps" rows="7" placeholder="Un passaggio per riga.&#10;Se scrivi i minuti (es. «cuoci per 10 min») avrai il timer.">${esc(ed.steps)}</textarea>
    <label class="lab">Consiglio (facoltativo)</label><input type="text" data-ed="tip" value="${esc(ed.tip)}" placeholder="Es. si conserva 3 giorni in frigo">
    ${ed.err ? `<div class="tip warn">⚠️ ${esc(ed.err)}</div>` : ''}
    <button class="btn btn-primary btn-block" style="margin-top:16px" data-a="edSave">Salva ricetta</button>
    ${ed.id ? `<button class="btn btn-ghost btn-block" style="margin-top:6px;color:var(--tomato)" data-a="edDelete">${ed.del ? 'Tocca ancora per eliminare definitivamente' : '🗑️ Elimina la ricetta'}</button>` : ''}`;
}
/* costi della ricetta in modifica, a porzione */
function edCosts() {
  const num = v => { const x = parseFloat(String(v || '').replace(',', '.')); return isFinite(x) && x > 0 ? x : 0; };
  return costLines(ui.ed.ing.map(([iid, q]) => [iid, num(q)]), 1);
}
function edCostTxt(k) {
  const l = edCosts().lines[k], o = feedItem(l.iid);
  return l.cost ? `${eur3(l.cost)} · ${pct(l.share)}${o ? ' · 🏷️ ' + esc(o.b || o.n.split(' ')[0]) : ' · 🏷️ prezzo'}` : '🏷️ prezzo e marca';
}
function edRefreshCosts() {
  ui.ed.ing.forEach((_, k) => { const el = $('#ed-c' + k); if (el) el.innerHTML = edCostTxt(k); });
  const t = $('#ed-tot'), tot = edCosts().tot;
  if (t) t.textContent = tot ? eur3(tot) + ' a porzione' : '';
}
function ingPickList() {
  const q = (ui.ipq || '').trim().toLowerCase(), used = new Set(ui.ed.ing.map(([i]) => i));
  const list = Object.values(ING).filter(i => !used.has(i.id) && (!q || i.n.toLowerCase().includes(q))).sort((a, b) => a.n.localeCompare(b.n));
  if (!list.length) return `<div class="empty"><p>Non c'è: crealo con «Nuovo ingrediente».</p></div>`;
  const rep = Object.fromEntries(D.reparti.map(r => [r.id, r.n]));
  return list.map(i => `<button class="dish-row" data-a="edPickIng" data-i="${i.id}"><div class="emo sm">${i.e}</div><div class="grow"><div class="nm">${esc(i.n)}${i.mine ? ' <span class="badge yellow">tuo</span>' : ''}</div><div class="meta">${esc(rep[i.r])} · ${i.conf ? (i.u === 'pz' ? i.conf + ' ' + i.pzn[1] : fmass(i.conf, i.u)) + ' ' + eur(price(i.id)) : eur(price(i.id)) + '/kg'}</div></div></button>`).join('');
}
function newIngHTML() {
  const ni = ui.ni, sfuso = ni.u === 'g';
  return `<div class="sheet-h"><h2>Nuovo ingrediente</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
    <div class="card">
      <label class="lab">Nome</label><input type="text" data-ni="n" value="${esc(ni.n)}" placeholder="Es. Pesto di pistacchi" maxlength="60">
      <label class="lab">Icona</label><input type="text" data-ni="e" value="${esc(ni.e)}" class="emo-in" maxlength="8">
      <label class="lab">Reparto</label><div class="chips wrap">${D.reparti.map(r => `<button class="chip${ni.r === r.id ? ' on' : ''}" data-a="niSet" data-f="r" data-v="${r.id}">${r.e} ${esc(r.n)}</button>`).join('')}</div>
      <label class="lab">Si misura in</label><div class="seg" style="display:inline-flex">${[['g', 'grammi'], ['ml', 'millilitri'], ['pz', 'pezzi']].map(([k, n]) => `<button class="${ni.u === k ? 'on' : ''}" data-a="niSet" data-f="u" data-v="${k}">${n}</button>`).join('')}</div>
      <label class="lab">Una confezione contiene (${ni.u === 'pz' ? 'pezzi' : ni.u})</label><input type="text" inputmode="decimal" data-ni="conf" value="${esc(ni.conf)}" placeholder="${sfuso ? 'es. 500 · vuoto se lo compri sfuso al kg' : 'es. ' + (ni.u === 'ml' ? '500' : '6')}">
      <label class="lab">Prezzo da ${esc(SM[S.market].n)} (€)</label><input type="text" inputmode="decimal" data-ni="p" value="${esc(ni.p)}" placeholder="${sfuso ? 'della confezione, o al kg se sfuso' : 'della confezione'}">
      <div class="set-row" data-a="niSet" data-f="disp" style="border:0;padding-bottom:0"><div class="grow"><b>🧂 Ce l'ho sempre in dispensa</b><div class="muted small">non finisce in lista se non lo spegni</div></div><span class="toggle${ni.disp ? ' on' : ''}"></span></div>
    </div>
    ${ni.err ? `<div class="tip warn">⚠️ ${esc(ni.err)}</div>` : ''}
    <button class="btn btn-primary btn-block" data-a="niSave">Crea e aggiungi</button>`;
}
const RECEIPT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['negozio', 'data', 'totale', 'righe'],
  properties: {
    negozio: { type: 'string' }, data: { type: 'string' }, totale: { type: 'number' },
    righe: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['testo', 'marca', 'importo', 'quantita', 'unita', 'prezzo_unitario', 'peso_confezione', 'ingrediente'],
      properties: { testo: { type: 'string' }, marca: { type: 'string' }, importo: { type: 'number' }, quantita: { type: 'number' }, unita: { type: 'string', enum: ['pz', 'kg'] },
        prezzo_unitario: { type: 'number' }, peso_confezione: { type: 'number' }, ingrediente: { type: 'string' } } } }
  }
};
const RECEIPT_PROMPT = `Queste immagini sono la foto di uno scontrino di un supermercato italiano, tagliata in parti verticali in ordine, con una piccola sovrapposizione tra una parte e la successiva.
Estrai ogni riga di prodotto acquistato. Regole:
- Ignora le righe che non sono prodotti: subtotale, totale, pagamento, resto, IVA, punti e carte fedeltà, buoni, sacchetti.
- Se sotto un prodotto c'è uno sconto (importo negativo, «SCONTO», «-30%»), sottrailo da quel prodotto: importo e prezzo_unitario sono quelli pagati davvero.
- Se una riga indica più pezzi (es. «2 x 1,19») metti quantita=2, prezzo_unitario=1.19, importo=2.38.
- Per i prodotti pesati (es. «0,512 kg x 2,49 €/kg») metti unita="kg", quantita=0.512, prezzo_unitario=2.49 (prezzo al kg).
- Altrimenti unita="pz" e prezzo_unitario è il prezzo di una confezione.
- peso_confezione: grammi o millilitri di UNA confezione se si leggono nel nome (es. «PASSATA 700G» → 700, «LATTE 1L» → 1000), altrimenti 0.
- Le righe che compaiono due volte nella zona sovrapposta tra due parti vanno contate una volta sola.
- marca: la marca del prodotto se si capisce dal testo (es. «RUMMO PENNE RIG.500G» → «Rummo», «BARILLA SPAGHETTI» → «Barilla»; per i prodotti a marchio del supermercato usa il nome del marchio, es. «Esselunga», «Smart», «Carrefour»); stringa vuota per frutta e verdura sfuse o se non si capisce.
- ingrediente: l'id del catalogo qui sotto che corrisponde allo stesso tipo di prodotto (marca e formato possono essere diversi); stringa vuota se nessuno corrisponde davvero. Non forzare abbinamenti dubbi.
- data in formato AAAA-MM-GG (stringa vuota se non si legge); totale = totale dello scontrino.

Catalogo (id | nome | unità | confezione di riferimento):
`;
/* foto dei prodotti che hai in casa (uno o più): nome, marca, formato e ingrediente, per «In casa» */
const HOME_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['prodotti'],
  properties: { prodotti: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['nome', 'marca', 'ingrediente', 'confezioni', 'peso_confezione', 'rimasto_percento'],
    properties: { nome: { type: 'string' }, marca: { type: 'string' }, ingrediente: { type: 'string' }, confezioni: { type: 'number' },
      peso_confezione: { type: 'number' }, rimasto_percento: { type: 'number' } } } } }
};
const HOME_PROMPT = `Questa è la foto di uno o più prodotti alimentari che ho in casa (confezioni, frutta, verdura).
Per ogni prodotto diverso:
- nome e marca come si leggono sulla confezione (marca vuota se non c'è);
- confezioni: quante confezioni (o pezzi di frutta/verdura) uguali vedi;
- peso_confezione: grammi o millilitri di UNA confezione letti sull'etichetta (es. 250 g, 1 l → 1000); per frutta e verdura sfusa stima il peso di un pezzo; 0 se non si capisce;
- rimasto_percento: 100 se la confezione è chiusa, altrimenti quanto ne resta a occhio;
- ingrediente: l'id del catalogo qui sotto dello stesso tipo di prodotto (stringa vuota se nessuno corrisponde davvero).

Catalogo (id | nome | unità | confezione di riferimento):
`;
async function receiptImages(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const W = Math.min(1100, bmp.width), scale = W / bmp.width, H = Math.round(bmp.height * scale);
  const T = 1500, O = 120, out = [];
  for (let y = 0; y < H && out.length < 8; y += T - O) {
    const h = Math.min(T, H - y), c = document.createElement('canvas');
    c.width = W; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, y / scale, bmp.width, h / scale, 0, 0, W, h);
    out.push(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    if (y + h >= H) break;
  }
  return out;
}
async function claudeReceipt(parts, schema = RECEIPT_SCHEMA, prompt = RECEIPT_PROMPT) {
  const catalog = Object.values(ING).map(i => `${i.id} | ${i.n} | ${i.u} | ${i.conf ? i.conf + ' ' + i.u : 'sfuso, prezzo al kg'}`).join('\n');
  const body = {
    model: 'claude-opus-5-5', max_tokens: 16000, fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: [
      ...parts.map(data => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
      { type: 'text', text: prompt + catalog }] }]
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-api-key': S.apiKey.trim(), 'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01', 'anthropic-dangerous-direct-browser-access': 'true' }
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('La chiave API non è valida: controllala nelle impostazioni.');
  if (!r.ok) throw new Error((j.error && j.error.message) || `Errore ${r.status} dal servizio`);
  if (j.stop_reason === 'refusal') throw new Error('Claude non ha potuto leggere questa immagine.');
  if (j.stop_reason === 'max_tokens') throw new Error('Scontrino troppo lungo: prova a fotografarlo in due volte.');
  const t = (j.content || []).find(c => c.type === 'text');
  if (!t) throw new Error('Risposta vuota: riprova.');
  return JSON.parse(t.text);
}
/* prezzo nuovo dell'ingrediente (stessa unità dell'app: confezione o €/kg) da una riga dello scontrino */
const normTxt = x => (x || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
function sizeOf(name) {   // grammi o ml dal nome del prodotto: «500 g», «1Kg», «3 x 80 g», «1 L»
  const n = (name || '').toLowerCase().replace(',', '.');
  let m = n.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|gr|g|ml|cl|lt|l)\b/);
  const f = { kg: 1000, gr: 1, g: 1, ml: 1, cl: 10, lt: 1000, l: 1000 };
  if (m) return +m[1] * +m[2] * f[m[3]];
  m = n.match(/(\d+(?:\.\d+)?)\s*(kg|gr|g|ml|cl|lt|l)\b/);
  return m ? +m[1] * f[m[2]] : 0;
}
/* il prodotto online della stessa marca (e possibilmente stesso formato e prezzo) di una riga dello scontrino */
function matchBrandOpt(iid, r, target) {
  const f = feed(), fp = f && f.prices[iid], b = normTxt(r.marca);
  if (!fp || b.length < 3) return null;
  let c = (fp.opts || []).filter(o => { const ob = normTxt(o.b); return (ob.length >= 3 && (ob.includes(b) || b.includes(ob))) || normTxt(o.n).startsWith(b); });
  if (!c.length) return null;
  if (r.peso_confezione > 0) { const same = c.filter(o => Math.abs(sizeOf(o.n) - r.peso_confezione) < 1); if (same.length) c = same; }
  return c.slice().sort((x, y) => Math.abs(x.p - target) - Math.abs(y.p - target))[0];
}
/* quanto è stato comprato di un ingrediente (nell'unità dell'app: g, ml o pezzi) da una riga dello scontrino */
function receiptQty(r) {
  const i = ING[r.ingrediente], n = +r.quantita || 1;
  if (!i) return 0;
  if (i.u === 'pz') return r.peso_confezione > 0 && r.peso_confezione <= 30 ? n * r.peso_confezione : n * (i.conf || 1);
  if (r.unita === 'kg') return n * 1000;
  if (r.peso_confezione > 0) return n * r.peso_confezione;
  return n * (i.conf || 0);
}
/* dopo lo scontrino: quello che avanza dai piatti di questa spesa va «In casa», con la scadenza, usabile dal giorno dopo la spesa */
function receiptHome(res) {
  const w = S.week, x = shopWin(w), key = tripKey(), src = 'rc:' + w.start + ':' + key;
  const bought = {};
  for (const r of res.righe || []) { const q = receiptQty(r); if (q > 0) bought[r.ingrediente] = (bought[r.ingrediente] || 0) + q; }
  const sh = shopping(w, true), need = Object.fromEntries(sh.items.map(it => [it.iid, it.need]).concat(sh.pantry.map(p => [p.iid, p.need])));
  const day = rcDate(res.data);
  S.dispensa = (S.dispensa || []).filter(l => l.src !== src);
  let n = 0;
  for (const iid in bought) {
    const i = ING[iid], left = bought[iid] - (need[iid] || 0);
    if (!i || i.disp || left <= (i.u === 'pz' ? 0.49 : Math.max(15, (i.conf || 0) * 0.08))) continue;
    // non serve ai pasti di questa spesa (li copre già quello che hai comprato): solo agli altri, prima che scada
    S.dispensa.push({ id: 'r' + Date.now().toString(36) + n, iid, q: Math.round(left * 100) / 100, exp: addDays(day, i.dur || 3), src, wk: w.start, win: [w.start, x.days ? x.from : 0, x.days || 7] });
    n++;
  }
  return n;
}
/* «Menu nuovo da oggi con questa spesa»: chiudo il menu di prima, tutto lo scontrino va in casa e il menu nuovo lo finisce */
function receiptAll(res) {
  A.newFrom({ d: TODAY, quiet: true });
  const day = rcDate(res.data), bought = {};
  for (const r of res.righe || []) { const q = receiptQty(r); if (q > 0 && ING[r.ingrediente] && !ING[r.ingrediente].disp) bought[r.ingrediente] = (bought[r.ingrediente] || 0) + q; }
  let n = 0;
  for (const iid in bought) {
    S.dispensa.push({ id: 'r' + Date.now().toString(36) + n, iid, q: Math.round(bought[iid] * 100) / 100, exp: addDays(day, ING[iid].dur || 3), src: 'rc:' + TODAY });
    n++;
  }
  autofill('casa');
  save();
  return n;
}
function receiptPrice(r) {
  const i = ING[r.ingrediente];
  if (!i || !(r.prezzo_unitario > 0)) return null;
  let p;
  if (r.unita === 'kg') {
    if (!i.conf) p = r.prezzo_unitario;
    else if (i.u === 'g') p = r.prezzo_unitario * i.conf / 1000;
    else return null;
  } else if (!i.conf) {
    if (r.peso_confezione > 0) p = r.prezzo_unitario / r.peso_confezione * 1000;
    else {       // venduto a peso ma sullo scontrino c'è solo l'importo: stimo il peso dal prezzo al kg
      const pk = price(i.id), est = pk > 0 ? Math.round((+r.importo || r.prezzo_unitario) / pk * 1000 / 10) * 10 : 0;
      return { iid: i.id, p: null, old: pk, est: est > 0 ? est : null, odd: false, brand: (r.marca || '').trim(), opt: null };
    }
  } else if (r.peso_confezione > 0 && i.u !== 'pz') p = r.prezzo_unitario / r.peso_confezione * i.conf;
  else p = r.prezzo_unitario;
  p = Math.round(p * 100) / 100;
  if (!(p > 0 && p < 300)) return null;
  const old = price(i.id), odd = p > old * 4 || p < old / 4;
  return { iid: i.id, p, old, odd, brand: (r.marca || '').trim(), opt: matchBrandOpt(i.id, r, p) };
}
async function readReceipt(file) {
  ui.rc = { state: 'loading' }; renderSheet();
  try {
    const res = await claudeReceipt(await receiptImages(file));
    const sel = {}, ups = res.righe.map(receiptPrice);
    ups.forEach((u, k) => { if (u && !u.odd) sel[k] = true; if (u && u.est) res.righe[k].peso_confezione = u.est / (+res.righe[k].quantita || 1); });
    ui.rc = { state: 'done', res, ups, sel, total: res.totale > 0 };
  } catch (e) { ui.rc = { state: 'error', err: String((e && e.message) || e) }; }
  renderSheet();
}
function receiptHTML() {
  const rc = ui.rc || { state: 'idle' };
  const head = `<div class="sheet-h"><h2>📷 Scontrino</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>`;
  const pick = (label, cls = 'btn-primary') => `<label class="btn ${cls} btn-block">${label}<input type="file" accept="image/*" data-ch="receiptFile" hidden></label>`;
  if (!S.apiKey) return head + `<p class="muted">Leggo lo scontrino con Claude: righe, prezzi, sconti e totale, e aggiorno i prezzi della tua lista. Serve una chiave API Anthropic (la crei su console.anthropic.com); resta solo su questo telefono.</p>
    <input type="password" autocomplete="off" placeholder="sk-ant-…" id="key-in"><button class="btn btn-primary btn-block" style="margin-top:12px" data-a="saveKey">Salva la chiave</button>`;
  if (rc.state === 'loading') return head + `<div class="empty"><div class="big spin">🧾</div><h3>Leggo lo scontrino…</h3><p>Ci vogliono 20–40 secondi.</p></div>`;
  if (rc.state === 'error') return head + `<div class="tip warn">⚠️ ${esc(rc.err)}</div>${pick('📷 Riprova con un\'altra foto')}`;
  if (rc.state !== 'done') return head + `<p class="muted">Fotografa lo scontrino intero, dritto e ben illuminato (va bene anche lungo). Leggo i prodotti, li abbino agli ingredienti dell'app e ti propongo i prezzi da aggiornare per ${esc(SM[S.market].n)}.</p>
    ${pick('📷 Fotografa o scegli lo scontrino')}<p class="muted small" style="margin-top:12px">La foto va ad Anthropic solo per essere letta. Costa pochi centesimi per scontrino.</p>`;
  const { res, ups, sel } = rc;
  const rows = res.righe.map((r, k) => ({ r, u: ups[k], k }));
  const good = rows.filter(x => x.u), other = rows.filter(x => !x.u), n = Object.keys(sel).length;
  return head + `<div class="card"><div class="row"><div class="grow"><b>${esc(res.negozio || 'Supermercato')}</b><div class="muted small">${res.data ? fday(res.data) + ' · ' : ''}${res.righe.length} righe lette</div></div><b class="num" style="font-size:22px">${eur(res.totale || 0)}</b></div></div>
    <div class="sec-title">Quello che hai comprato</div>
    <div class="group">${[['tutto', 'Menu nuovo da oggi con questa spesa', 'tutto va «In casa» e rifaccio il menu dal prossimo pasto usando solo quello che hai, fino alla prossima spesa'], ['avanzi', 'Tengo il menu', 'quello in più rispetto ai piatti di questa spesa va «In casa»'], ['no', 'Solo i prezzi', '«In casa» non cambia']].map(([k, n, d]) => `<div class="set-row" data-a="rcHome" data-v="${k}"><div class="grow"><b>${n}</b><div class="muted small">${d}</div></div><span class="radio${(rc.home === false ? 'no' : rc.home || 'tutto') === k ? ' on' : ''}"></span></div>`).join('')}</div>
    ${res.totale > 0 ? `<div class="set-row" data-a="rcTotal" style="padding-top:0"><div class="grow"><b>Usa il totale come spesa della settimana</b><div class="muted small">per confrontarlo con la stima</div></div><span class="toggle${rc.total ? ' on' : ''}"></span></div>` : ''}
    <div class="sec-title">Prezzi e marche da aggiornare<span class="right">${n} di ${good.length}</span></div>
    <p class="muted small" style="margin:-4px 4px 8px">Se la marca è tra i prodotti online la scelgo in «I miei prodotti» (il prezzo poi si aggiorna da solo con le offerte); altrimenti salvo il prezzo dello scontrino con la marca.</p>
    ${good.length ? `<div class="group">${good.map(({ r, u, k }) => `<div class="item${sel[k] ? '' : ' off'}" data-a="rcSel" data-k="${k}"><span class="check">${sel[k] ? '✓' : ''}</span><span style="font-size:22px">${ING[u.iid].e}</span>
      <div class="grow"><div class="nm">${esc(ING[u.iid].n)}</div><div class="left">«${esc(r.testo)}»${r.unita === 'kg' ? ` · ${String(r.quantita).replace('.', ',')} kg` : ''}</div>${u.opt ? `<div class="left">🏷️ <b>${esc(u.opt.b || u.brand)}</b> → ${esc(u.opt.n)}</div>` : u.brand ? `<div class="left">🏷️ marca <b>${esc(u.brand)}</b></div>` : ''}${u.odd ? '<div class="warnline">⚠️ molto diverso da prima: controlla</div>' : ''}</div>
      <button class="uses" data-a="rcFix" data-k="${k}"><b>✎ non è questo? cambia</b></button>
      ${u.p == null ? `<div class="left">⚖️ peso non scritto: ≈ <input type="number" inputmode="numeric" value="${Math.round(r.peso_confezione * (+r.quantita || 1)) || ''}" data-ch="rcW" data-a="noop" data-k="${k}" style="width:76px;padding:2px 6px;display:inline-block"> g (stimato dal prezzo, correggilo)</div>` : ''}</div>
      <div class="num" style="text-align:right;white-space:nowrap">${u.p == null ? `<b>${eur(r.importo || 0)}</b>` : `<s class="muted small">${eur(u.old)}</s><br><b>${eur(u.p)}</b>`}</div></div>`).join('')}</div>` : '<p class="muted">Nessun prodotto abbinato agli ingredienti dell\'app.</p>'}
    ${other.length ? `<details class="card" style="margin-top:12px" open><summary class="muted"><b>${other.length === 1 ? '1 riga non usata' : other.length + ' righe non usate'}</b> (non sono ingredienti dell'app)</summary><ul class="ing-list">${other.map(({ r, k }) => `<li data-a="rcFix" data-k="${k}" style="cursor:pointer">${esc(r.testo)}<span class="q">${eur(r.importo)} · <b style="color:var(--tomato)">abbina ›</b></span></li>`).join('')}</ul><p class="muted small">Se una riga è cibo che hai comprato, toccala e scegli l'ingrediente.</p></details>` : ''}
    <button class="btn btn-green btn-block" style="margin-top:14px" data-a="rcApply">Conferma${n ? ` (${n} prodotti)` : ''}</button>
    ${pick('📷 Leggi un altro scontrino', 'btn-ghost')}`;
}
function nutCard(p) {
  const n = dishNut(p);
  let html = `<div class="card nutcard"><div class="row"><b class="grow">🔥 Calorie</b><span class="badge num">${kc(n.k)} kcal · ${Math.round(n.p)} g proteine</span></div>
    <p class="muted small" style="margin:4px 0 0">a persona, con le dosi della ricetta${n.miss ? ` (senza ${n.miss} ingredient${n.miss > 1 ? 'i' : 'e'} di cui non ho i valori)` : ''}</p>`;
  if (prof().on) {
    const m = mealNut(p);
    html += `<p class="small" style="margin:8px 0 0">Per te: porzione <b>×${m.f.toLocaleString('it-IT')}</b>${m.cs.length ? ' più ' + m.cs.map(c => c.label).join(', ') : ''} → <b>${kc(m.k)} kcal</b> e ${Math.round(m.p)} g di proteine (obiettivo del pasto ${kc(mealTarget())} kcal).</p>`;
  }
  return html + '</div>';
}
function dishCostCard(p, n) {
  const { lines, tot } = costLines(ingOf(p), n);
  return `<div class="card" style="margin-top:14px"><div class="row"><b class="grow">Ingredienti · ${pers(n)}</b><span class="badge num">${eur3(tot)}</span></div>
    <p class="muted small" style="margin:4px 0 2px">Costo di ogni ingrediente nel piatto e quanto pesa sul totale. Tocca un ingrediente per cambiare marca (vedi quanto cambia il prezzo), ✏️ per cambiare la quantità.${Object.keys((S.qty || {})[p.id] || {}).length ? ' <b>Quantità personalizzate in questa ricetta.</b>' : ''}</p>
    <ul class="ing-list cost-list" style="margin-top:6px">${lines.map(l => {
      const o = feedItem(l.iid);
      return `<li data-a="priceSheet" data-i="${l.iid}" data-dq="${l.q}" data-dt="${tot}" data-dn="${esc(p.n)}">${ingIcon(l.iid)}
        <span class="grow"><span class="nm-s">${esc(ING[l.iid].n)}</span><span class="muted small">${fq(l.iid, l.q)}${o && l.cost ? ' · ' + (o.chosen ? '⭐ ' : '') + esc(o.b || o.n.split(' ')[0]) : ''}</span></span>
        <span class="cost num">${l.cost ? eur3(l.cost) : 'q.b.'}${l.cost ? `<small>${pct(l.share)}</small>` : ''}</span>
        ${l.cost ? `<button class="qty-btn" data-a="qtySheet" data-d="${p.id}" data-i="${l.iid}" aria-label="Cambia quantità">✏️</button>` : ''}</li>`;
    }).join('')}</ul></div>`;
}
function productsMarket() {
  const withFeed = D.supermercati.filter(m => feed(m.id));
  if (ui.prodM && feed(ui.prodM)) return ui.prodM;
  return feed(S.market) ? S.market : (withFeed[0] || {}).id;
}
function productsList() {
  const mk = productsMarket(), f = feed(mk), q = (ui.prodQ || '').trim().toLowerCase();
  if (!f) return '';
  let html = '', n = 0;
  for (const r of D.reparti) {
    const ids = Object.keys(f.prices).filter(iid => ING[iid] && ING[iid].r === r.id && (!q
      || ING[iid].n.toLowerCase().includes(q) || (f.prices[iid].opts || []).some(o => (o.n + ' ' + o.b).toLowerCase().includes(q))))
      .sort((a, b) => ING[a].n.localeCompare(ING[b].n));
    if (!ids.length) continue;
    n += ids.length;
    html += `<div class="group"><div class="group-h">${r.e} ${esc(r.n)}</div>${ids.map(iid => {
      const own = mk === S.market && isCustom(iid), bn = brandNote(iid, mk);
      const o = own ? { p: price(iid), n: (bn ? bn + ' · ' : '') + 'prezzo scritto o dallo scontrino', chosen: true } : chosenOpt(iid, mk), cnt = (f.prices[iid].opts || []).length;
      return `<div class="item" data-a="priceSheet" data-i="${iid}" data-m="${mk}"><span style="font-size:22px">${ING[iid].e}</span>
        <div class="grow"><div class="nm">${esc(ING[iid].n)}</div><div class="left">${o.chosen ? '⭐' : 'Auto ·'} ${esc(o.n)}${o.promo ? ' · <b class="promo">in offerta</b>' : ''}</div><div class="left">${cnt} ${cnt === 1 ? 'prodotto' : 'prodotti'} tra cui scegliere</div></div>
        <b class="num">${eur(o.p)}</b></div>`;
    }).join('')}</div>`;
  }
  return n ? html : '<div class="empty"><div class="big">🔍</div><p>Nessun ingrediente o marca trovato.</p></div>';
}
function productsHTML() {
  const head = `<div class="sticky-top"><div class="sheet-h"><h2>🏷️ I miei prodotti</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>`;
  const mk = productsMarket();
  if (!mk) return head + `</div><div class="empty"><div class="big">🏷️</div><p>Non ci sono ancora prezzi veri scaricati. Controlla la connessione e riprova più tardi.</p></div>`;
  const markets = D.supermercati.filter(m => feed(m.id)), f = feed(mk);
  const chosen = Object.keys((S.choice || {})[mk] || {}).length;
  return head + `<div class="chips">${markets.map(m => `<button class="chip${m.id === mk ? ' on' : ''}" data-a="prodM" data-m="${m.id}">${esc(m.n)}</button>`).join('')}</div>
    <input type="search" placeholder="Cerca ingrediente o marca (es. Rummo)…" value="${esc(ui.prodQ || '')}" data-in="prodq" style="margin:8px 0 10px"></div>
    <p class="muted small" style="margin:0 4px 10px">Scegli la marca e il formato che compri davvero da ${esc(SM[mk].n)}: il prezzo vale per tutte le ricette e per la lista della spesa. ⭐ = scelto da te, «Auto» = il predefinito. Prezzi online del ${feedDate(f)}.</p>
    ${chosen ? `<div class="row" style="margin:0 4px 10px"><span class="badge yellow">⭐ ${chosen} scelt${chosen === 1 ? 'o' : 'i'} da te</span><button class="btn-ghost small" style="margin-left:auto" data-a="prodReset" data-m="${mk}">Torna tutto in automatico</button></div>` : ''}
    <div id="prod-list">${productsList()}</div>`;
}
function qtyHTML(s) {
  const p = PI[s.d], i = ING[s.i], base = (p.ing.find(([x]) => x === s.i) || [])[1] || 0;
  const cur = effQ(p, s.i, base), own = ((S.qty || {})[p.id] || {})[s.i] != null, mul = (S.qmul || {})[s.i];
  const u = i.u === 'pz' ? i.pzn[1] : i.u, step = i.u === 'pz' ? 0.5 : base >= 50 ? 10 : base >= 10 ? 5 : 1;
  const v = ui.qv != null ? ui.qv : cur, n = Math.max(1, s.k ? nOf(s.k) : S.pc);
  const dCost = (v - cur) * n * unitCost(s.i), tot = dishCost(p.id, n);
  return `<div class="sheet-h"><h2>${i.e} ${esc(i.n)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
    <p class="muted">Quantità <b>a persona</b> in «${esc(p.n)}». La ricetta prevede ${fq(s.i, base)}${own ? `, tu usi ${fq(s.i, cur)}` : mul ? `, con le tue proporzioni ${fq(s.i, cur)}` : ''}.</p>
    <div class="qty-row"><button class="btn btn-soft" data-a="qtyStep" data-v="${-step}">−</button>
      <input type="text" inputmode="decimal" id="qty-in" value="${String(Math.round(v * 100) / 100).replace('.', ',')}" data-in="qtyv"><span class="unit">${esc(u)}</span>
      <button class="btn btn-soft" data-a="qtyStep" data-v="${step}">＋</button></div>
    <p class="muted small" id="qty-impact">${qtyImpactTxt(v, cur, n, s.i, tot)}</p>
    <button class="btn btn-primary btn-block" data-a="qtySave" data-d="${p.id}" data-i="${s.i}" data-all="">Solo in questa ricetta</button>
    <button class="btn btn-soft btn-block" style="margin-top:8px" data-a="qtySave" data-d="${p.id}" data-i="${s.i}" data-all="1" id="qty-all">In tutte le ricette (in proporzione, ${pct((v / (base || 1) - 1) * 100, true)})</button>
    ${own || mul ? `<button class="btn btn-ghost btn-block" style="margin-top:6px" data-a="qtyReset" data-d="${p.id}" data-i="${s.i}">Torna alle dosi della ricetta</button>` : ''}`;
}
function qtyImpactTxt(v, cur, n, iid, tot) {
  const d = (v - cur) * n * unitCost(iid);
  if (Math.abs(d) < 0.0005) return `Costo del piatto per ${pers(n)}: ${eur3(tot)}.`;
  return `Il piatto per ${pers(n)} passa da ${eur3(tot)} a ${eur3(tot + d)}: <b class="${d > 0 ? 'promo' : ''}">${sgnEur3(d)} · ${pct(d / tot * 100, true)}</b>.`;
}
const CASA_RAPIDI = [['🪥', 'dentifricio'], ['🧴', 'deodorante'], ['🧴', 'shampoo'], ['🧼', 'bagnoschiuma'], ['🍽️', 'detersivo piatti'],
  ['🧻', 'carta igienica'], ['🗑️', 'sacchi spazzatura'], ['🧺', 'detersivo lavatrice'], ['☕', 'caffè macinato'], ['🪒', 'lamette']];
const SFIZI_RAPIDI = [['🥤', 'Coca-Cola lattina'], ['💧', 'acqua naturale'], ['🧃', 'succo di frutta'], ['🍫', 'cioccolato fondente'],
  ['🍬', 'caramelle'], ['🍿', 'patatine'], ['🍪', 'biscotti'], ['🍺', 'birra'], ['🍦', 'gelato'], ['🍎', 'mele']];
function spSearchHTML(s) {
  const st = ui.sp || {}, mk = st.m || (SP_MARKETS.includes(S.market) ? S.market : 'esselunga');
  const title = s.mode === 'sfizio' ? `🍫 Sfizio per ${slotLabel(s.k).toLowerCase()}` : s.mode === 'brand' ? `🔎 ${esc(ING[s.k].n)}` : s.mode === 'extra' ? '🧴 Aggiungi alla spesa' : '🔎 Tutto il supermercato';
  return `<div class="sticky-top"><div class="sheet-h"><h2>${title}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
    <div class="chips">${SP_MARKETS.map(m => `<button class="chip${m === mk ? ' on' : ''}" data-a="spM" data-m="${m}">${esc(SM[m].n)}</button>`).join('')}</div>
    <input type="search" placeholder="Cerca tra tutti i prodotti: marca, nome…" value="${esc(st.q || '')}" data-in="spq" style="margin:8px 0 6px"></div>
    ${s.mode === 'sfizio' || s.mode === 'extra' ? `<div class="chips wrap" style="margin-bottom:8px">${(s.mode === 'extra' ? CASA_RAPIDI : SFIZI_RAPIDI).map(([e, q]) => `<button class="chip" data-a="spQuick" data-q="${esc(q)}">${e} ${esc(q)}</button>`).join('')}</div>` : ''}
    ${s.mode === 'brand' && !SP_MARKETS.includes(S.market) ? `<p class="muted small">Il catalogo completo c'è per Esselunga e Carrefour: il prezzo che scegli lo salvo per ${esc(SM[S.market].n)}.</p>` : ''}
    <div id="sp-list">${spListHTML(s)}</div>`;
}
function spListHTML(s) {
  const st = ui.sp || {};
  if (st.busy) return `<div class="empty"><div class="big spin">🔎</div><p>${esc(st.busy)}</p></div>`;
  if (st.err) return `<div class="tip warn">⚠️ ${esc(st.err)}</div>`;
  if (!st.res) return `<p class="muted small" style="margin:8px 4px">Cerco in tutto il catalogo online di ${esc(SM[st.m || 'esselunga'].n)} (migliaia di prodotti), con marca e prezzo.</p>`;
  return spResHTML(st, 'spPick', 'spMore');
}
/* risultati del catalogo: marca, prezzo e prezzo al kg/l, letti pochi alla volta (prodotto.php li tiene 24 ore) */
const SP_PAGE = 15;
const spUnit = pr => !pr.up || !pr.base ? '' : pr.base === 'pz' ? `${eur(pr.up)}/pz` : `${eur(pr.up * 1000)}/${pr.base === 'g' ? 'kg' : 'l'}`;
function spSorted(st) {
  const rows = st.res.slice(0, st.shown || SP_PAGE).map((r, k) => ({ r, k }));
  if (st.sort === 'prezzo') rows.sort((a, b) => ((a.r.pr && a.r.pr.prezzo) || 1e9) - ((b.r.pr && b.r.pr.prezzo) || 1e9));
  return rows;
}
function spResHTML(st, pick, more) {
  if (!st.res.length) return '<div class="empty"><div class="big">🤷</div><p>Nessun prodotto trovato: prova con un\'altra parola o con la marca.</p></div>';
  const shown = Math.min(st.shown || SP_PAGE, st.res.length);
  return `<div class="row" style="margin:4px;gap:6px"><span class="muted small grow">${st.tot} prodotti da ${esc(SM[st.m].n)}${st.tot > shown ? `, ecco i primi ${shown}` : ''}</span>
      <button class="chip${st.sort !== 'prezzo' ? ' on' : ''}" data-a="spSort" data-s="" data-p="${pick}">Pertinenti</button><button class="chip${st.sort === 'prezzo' ? ' on' : ''}" data-a="spSort" data-s="prezzo" data-p="${pick}">€ più bassi</button></div>` +
    spSorted(st).map(({ r, k }) => {
      const pr = r.pr && !r.pr.err ? r.pr : null;
      const meta = pr ? [pr.b, spUnit(pr), pr.promo ? '<b class="promo">in offerta</b>' : '', pr.out ? 'esaurito online' : ''].filter(Boolean).map(x => x.startsWith('<') ? x : esc(x)).join(' · ')
        : r.pr ? 'prezzo non disponibile' : 'leggo il prezzo…';
      return `<button class="dish-row${pr && pr.out ? ' out' : ''}" data-a="${pick}" data-k="${k}"><div class="emo sm${pr && pr.img ? ' pimg' : ''}">${spGuess(r.n)[1]}${pr ? photo(pr.img) : ''}</div><div class="grow"><div class="nm">${esc(pr ? pr.n : r.n)}</div><div class="meta">${meta}</div></div>${pr ? `<b class="num">${eur(pr.prezzo)}</b>` : ''}<span class="add-btn">＋</span></button>`;
    }).join('') +
    (st.res.length > shown ? `<button class="btn btn-soft btn-block" data-a="${more}">Mostra altri prodotti</button>` : '');
}
async function spLoadPrices(st, upd) {
  const todo = st.res.slice(0, st.shown || SP_PAGE).filter(r => !r.pr && !r.load);
  let i = 0;
  const work = async () => {
    while (i < todo.length) {
      const r = todo[i++]; r.load = true;
      try { r.pr = await spGet(`prodotto.php?m=${st.m}&c=${encodeURIComponent(r.c)}`); } catch (e) { r.pr = { err: e.message }; }
      upd();
    }
  };
  await Promise.all([work(), work(), work()]);
}
const spListUpd = () => { const el = $('#sp-list'); if (el && ui.sp && !ui.sp.busy) el.innerHTML = spListHTML(); };
/* campo «Altro da comprare» nella spesa: mentre scrivi propone i prodotti del supermercato */
let exTimer = null;
const exSugUpd = () => { const el = $('#extra-sug'); if (el) el.innerHTML = exSugHTML(); };
function exSugHTML() {
  const st = ui.ex;
  if (!st || !st.q) return '';
  if (st.busy) return '<p class="muted small" style="margin:6px 4px">🔎 Cerco nel catalogo…</p>';
  if (st.err) return `<p class="muted small" style="margin:6px 4px">⚠️ ${esc(st.err)} · con «Aggiungi» lo metti in lista senza prezzo</p>`;
  if (!st.res) return '';
  return `<div class="ex-sug">${SP_MARKETS.map(m => `<button class="chip${m === st.m ? ' on' : ''}" data-a="exM" data-m="${m}">${esc(SM[m].n)}</button>`).join('')}${spResHTML(st, 'exPick', 'exMore')}</div>`;
}
async function exSearch(q) {
  const st = ui.ex = { q: q.trim(), m: (ui.ex && ui.ex.m) || (SP_MARKETS.includes(S.market) ? S.market : 'esselunga'), sort: ui.ex && ui.ex.sort };
  if (st.q.length < 3) { st.q = ''; exSugUpd(); return; }
  st.busy = true; exSugUpd();
  try {
    const j = await spGet(`cerca.php?m=${st.m}&q=${encodeURIComponent(st.q)}`);
    if (ui.ex !== st) return;
    st.res = j.risultati || []; st.tot = j.totale || 0;
  } catch (e) { st.err = 'Catalogo non raggiungibile'; }
  st.busy = false; exSugUpd();
  if (st.res) spLoadPrices(st, () => { if (ui.ex === st) exSugUpd(); });
}
function exAddProduct(st, pr) {
  S.week.extras.push({ id: Date.now(), t: pr.n, price: Math.round(pr.prezzo * 100) / 100, done: false, m: st.m, c: pr.c, b: pr.b, img: pr.img || '' });
  ui.ex = null; save(); render();
  toast(`${spGuess(pr.n)[1]} ${esc(pr.n)} in lista: ${eur(pr.prezzo)}`);
}
let spTimer = null;
async function spSearch(q) {
  const st = ui.sp = ui.sp || {};
  st.q = q; st.err = ''; st.res = null;
  if (q.trim().length < 2) { $('#sp-list').innerHTML = spListHTML(); return; }
  st.busy = 'Cerco…'; $('#sp-list').innerHTML = spListHTML();
  try {
    const j = await spGet(`cerca.php?m=${st.m || 'esselunga'}&q=${encodeURIComponent(q)}`);
    if (st.q !== q) return;
    st.res = j.risultati || []; st.tot = j.totale || 0; st.shown = SP_PAGE;
  } catch (e) { st.err = 'Ricerca non riuscita: controlla la connessione. (' + e.message + ')'; }
  st.busy = '';
  spListUpd();
  if (st.res) { const res = st.res; spLoadPrices(st, () => { if (ui.sp === st && st.res === res) spListUpd(); }); }
}
function sfizioHTML(s) {
  const x = (S.week.sfizi[s.k] || [])[+s.j], i = x && ING[x.i];
  if (!i) return '';
  const one = i.link && i.link.one, v = ui.sv != null ? ui.sv : x.q, u = i.u === 'pz' ? i.pzn[1] : i.u;
  const n = nOf(s.k);
  return `<div class="sheet-h"><h2>${i.e} Sfizio</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
    <p><b>${esc(i.n)}</b></p><p class="muted small">${slotLabel(s.k)} · ${pers(n)}${one ? ` · un pezzo = ${fmass(one, i.u)}` : ''}</p>
    <label class="lab">Quantità a persona</label>
    <div class="qty-row"><button class="btn btn-soft" data-a="sfStep" data-v="${-(one || (i.u === 'pz' ? 1 : 10))}">−</button>
      <input type="text" inputmode="decimal" value="${String(v).replace('.', ',')}" data-in="sfv"><span class="unit">${esc(u)}</span>
      <button class="btn btn-soft" data-a="sfStep" data-v="${one || (i.u === 'pz' ? 1 : 10)}">＋</button></div>
    <p class="muted small" id="sf-cost">Costo per questo pasto: <b>${eur3(v * n * unitCost(i.id))}</b> (${fq(i.id, v * n)})</p>
    <button class="btn btn-primary btn-block" data-a="sfSave" data-k="${s.k}" data-j="${s.j}">Salva</button>
    <button class="btn btn-ghost btn-block" style="margin-top:6px;color:var(--tomato)" data-a="sfDel" data-k="${s.k}" data-j="${s.j}">Togli lo sfizio</button>`;
}
const SHEETS = {
  poolSheet(s) {
    const w = S.week, r = slotDish(w, s.k) || {}, p = r.dish;
    if (!p) return '';
    const n = slotN(s.k, p, w), miss = canMake(p, n), T = poolTargets(s.k, w);
    return `<div class="sheet-h"><h2>${esc(p.n)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <button class="dish-row" data-a="dish" data-id="${p.id}" data-k="${s.k}">${dishEmo(p, 'sm')}<div class="grow"><div class="nm">📖 Apri la ricetta</div><div class="meta"><span>${porz(Math.round(n * 10) / 10)}</span><span>⏱ ${mins(p.tot)}</span></div></div><span class="add-btn">›</span></button>
      <div class="tip ${miss.length ? 'blue' : 'green'} small">${missTxt(miss)}</div>
      ${T.map(([t, l]) => `<button class="btn ${miss.length ? 'btn-soft' : 'btn-primary'} btn-block" style="margin-top:8px" data-a="poolUse" data-k="${s.k}" data-to="${t}">Lo cucino: ${l.replace(/^\S+ /, '').toLowerCase()}</button>`).join('')}
      <button class="btn btn-soft btn-block" style="margin-top:8px" data-a="pick" data-k="${s.k}">🔄 Cambia piatto</button>`;
  },
  poolPick(s) {
    const w = S.week, G = poolGroups(w).filter(x => poolTargets(x.keys[0], w).some(([t]) => t === s.k)).sort((a, b) => a.miss.length - b.miss.length);
    return `<div class="sheet-h"><h2>${esc(slotLabel(s.k))}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Dai piatti della settimana: prima quelli che si fanno con quello che hai.</p>
      ${G.length ? `<div class="group">${G.map(x => `<button class="pool-i" data-a="poolUse" data-k="${x.keys[0]}" data-to="${s.k}">${poolImg(x.dish)}<div class="grow"><div class="nm">${esc(x.dish.n)}</div><div class="left">${missTxt(x.miss)}</div></div></button>`).join('')}</div>` : '<p class="muted">Nessun piatto della lista va bene qui.</p>'}
      <button class="btn btn-soft btn-block" style="margin-top:10px" data-a="pick" data-k="${s.k}">Un altro piatto (dalle ricette)</button>`;
  },
  menuMore() {
    const w = S.week, ms = meals(w), b = (a, txt, extra = '') => `<button class="btn btn-soft btn-block" style="margin-top:8px" data-a="${a}"${extra}>${txt}</button>`;
    return `<div class="sheet-h"><h2>Menu</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      ${(S.dispensa || []).length ? b('menuScorte', '🏠 Fai il menu dalle scorte (da oggi)') : ''}
      ${ms.length ? b('autoSheet', '🔄 Rifai il menu', ' data-redo="1"') : b('autoSheet', '✨ Componi tu il menu')}
      ${b('menuStyle', S.menuStyle === 'lista' ? '📅 Menu a calendario (piatti per giorno)' : '📝 Menu a lista (scegli ogni giorno cosa cucinare)', ` data-v="${S.menuStyle === 'lista' ? 'giorni' : 'lista'}"`)}
      ${b('menuView', S.menuList ? '↩️ Vista semplice' : '📋 Vista con i pasti in dettaglio')}
      ${ms.length ? b('saveMenuSheet', '💾 Salva questo menu') : ''}${b('savedSheet', `📂 Menu salvati${(S.saved || []).length ? ` (${S.saved.length})` : ''}`)}
      ${b('weekSheet', '📅 Cambia settimana')}${ms.length ? b('clearAsk', '🗑️ Svuota il menu') : ''}`;
  },
  meal(s) {
    const w = S.week, k = s.k, r = slotDish(w, k) || {}, date = addDays(w.start, kDay(k)), t = kT(k), p = r.dish;
    const e = (S.diario || []).find(x => x.date === date && x.t === t), soon = date <= addDays(TODAY, 1), future = date >= TODAY;
    const b = (a, txt, extra = '', cls = 'btn-soft') => `<button class="btn ${cls} btn-block" style="margin-top:8px" data-a="${a}" data-k="${k}"${extra}>${txt}</button>`;
    let h = `<div class="sheet-h"><h2>${esc(slotLabel(k))}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">${esc(fdate(date, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>`;
    if (p) h += `<button class="dish-row" data-a="dish" data-id="${p.id}" data-k="${k}">${dishEmo(p, 'sm')}<div class="grow"><div class="nm">${r.left ? 'Avanzo: ' : ''}${esc(p.n)}</div><div class="meta"><span>${p.own ? 'cucinato da te' : '📖 apri la ricetta'}</span></div></div><span class="add-btn">›</span></button>`;
    else if (r.skip) h += `<p>Hai segnato che questo pasto lo salti.</p>`;
    if (e) h += `<div class="tip green small">✅ Segnato: ${esc(e.n)}${e.plan ? ' (come da ricetta)' : ''}.</div>
      <div style="display:flex;gap:8px">${e.own ? `<button class="btn btn-soft grow" data-a="diaryEdit" data-id="${e.id}">✏️ Correggi</button>` : ''}<button class="btn btn-ghost grow" data-a="diaryUndo" data-id="${e.id}">↩️ Annulla</button></div>`;
    else if (soon && future) {
      if (p && !p.own) h += b('cookedAsIs', '✅ L\'ho cucinato così', '', 'btn-primary') + b('cookedSheet', '✏️ L\'ho cucinato con altre dosi', ' data-pre="1"');
      h += b('cookedSheet', '🍳 Ho mangiato altro');
    }
    if (future || date === TODAY) {
      h += b('pick', '🔄 Cambia piatto');
      if (p && !p.own) h += b('swapSheet', '🔁 Scambia con un altro pasto');
      h += b('mealSkip', r.skip ? '↩️ Non lo salto più' : '🚫 Salto questo pasto', '', 'btn-ghost');
    }
    return h;
  },
  spesaAdd(s) {
    const x = s.id && (S.spese || []).find(y => y.id === s.id);
    return `<div class="sheet-h"><h2>🧾 ${x ? 'Modifica la spesa' : 'Aggiungi una spesa'}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">${x ? 'Anche per le spese dei giorni passati.' : 'Per una spesa che non hai segnato (o di cui non hai lo scontrino), anche di giorni fa.'}</p>
      <label class="small muted">Giorno</label><input type="date" data-sa="date" value="${x ? x.date : TODAY}" max="${TODAY}" style="margin:4px 0 10px">
      <label class="small muted">Negozio</label><input type="text" data-sa="store" value="${esc(x ? x.store || '' : SM[S.market].n)}" style="margin:4px 0 10px">
      <label class="small muted">Quanto hai speso (€)</label><input type="text" inputmode="decimal" data-sa="eur" placeholder="es. 52,30" value="${x && x.spent ? String(x.spent).replace('.', ',') : ''}" style="margin:4px 0 14px">
      <button class="btn btn-primary btn-block" data-a="spesaAdd"${x ? ` data-id="${esc(x.id)}"` : ''}>${x ? 'Salva' : 'Aggiungi'}</button>`;
  },
  cooked() {
    const ck = ui.ck, lots = (S.dispensa || []).slice().sort((a, b) => a.exp.localeCompare(b.exp));
    const n = Object.keys(ck.sel).length;
    return `<div class="sheet-h"><h2>🍳 ${ck.name ? 'Cosa hai usato davvero' : 'Ho cucinato'}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Segna cosa hai usato davvero: lo tolgo da «In casa», metto il piatto nel menu (gli avanzi nei prossimi pasti) e rifaccio il resto con quello che ti rimane.</p>
      ${ck.k ? `<p style="margin:0 0 12px"><b>${esc(slotLabel(ck.k))}</b> · ${esc(fday(ck.date))}</p>` : `<div class="seg" style="display:flex;margin-bottom:12px">${[['p', 'Pranzo di oggi'], ['c', 'Cena di oggi']].map(([v, l]) => `<button class="${ck.t === v ? 'on' : ''}" style="flex:1" data-a="ckT" data-v="${v}">${l}</button>`).join('')}</div>`}
      <b>Cosa hai usato?</b>
      <div style="margin:6px 0 12px">${lots.map(l => { const on = ck.sel[l.id] != null; return `<div class="item" style="gap:10px"><button class="check${on ? ' on' : ''}" data-a="ckLot" data-id="${l.id}" aria-label="Usato">${on ? '✓' : ''}</button><span style="font-size:20px">${ING[l.iid].e}</span><div class="grow"><div class="nm">${esc(ING[l.iid].n)}</div><div class="left">in casa ${fq(l.iid, l.q)}</div></div>
        ${on ? `<input type="text" inputmode="decimal" data-ckq="${l.id}" value="${String(Math.round(ck.sel[l.id] * 100) / 100).replace('.', ',')}" style="width:76px;text-align:right"><span class="small muted">${ING[l.iid].u === 'pz' ? ING[l.iid].pzn[1] : ING[l.iid].u}</span>` : ''}</div>`; }).join('') || '<p class="muted small">«In casa» è vuoto.</p>'}</div>
      <b>Quante porzioni ne sono uscite in tutto?</b>
      <div class="row" style="gap:10px;align-items:center;margin:6px 0 4px"><button class="btn btn-soft btn-sm" data-a="ckPorz" data-v="-1">−</button><b style="font-size:22px;min-width:30px;text-align:center">${ck.porz}</b><button class="btn btn-soft btn-sm" data-a="ckPorz" data-v="1">＋</button></div>
      <p class="muted small" style="margin-top:0">${ck.porz > 1 ? `Una la mangi ora, le altre ${ck.porz - 1} le metto nei prossimi pasti (schiscetta di domani…).` : 'Tutto in questo pasto.'}</p>
      <input type="text" data-ckn placeholder="Nome del piatto (es. teglia di pollo e patate)" value="${esc(ck.name)}" style="margin:6px 0 12px">
      <p class="muted small" style="margin:-6px 0 10px">Le quantità le puoi cambiare: scrivi quello che hai usato davvero. Se sbagli, in Spesa › Mangiato puoi annullare o correggere.</p>
      <button class="btn btn-primary btn-block" data-a="cookedSave"${n ? '' : ' disabled'}>Segna e rifai il resto del menu</button>`;
  },
  swap(s) {
    const w = S.week, a = s.k, da = slotDish(w, a).dish, home = (S.dispensa || []).length;
    const from = Math.max(0, diffDays(TODAY, w.start)), rows = [];
    for (let d = from; d < 7; d++) for (const k of dayKeys(d)) {
      const r = slotDish(w, k);
      if (k === a || !r || !r.dish || r.dish.id === da.id) continue;      // stesso piatto: scambiarlo non cambia niente
      const ok = swapOk(a, k), im = ok ? swapImpact(a, k) : null;
      rows.push(`<button class="dish-row"${ok ? ` data-a="swapDo" data-a2="${k}"` : ' disabled style="opacity:.5"'} data-k="${a}">${dishEmo(r.dish, 'sm')}<div class="grow"><div class="lbl small muted">${esc(slotLabel(k))}</div><div class="nm">${esc(r.left ? 'Avanzo: ' + r.dish.n : r.dish.n)}</div>
        <div class="meta">${!ok ? '<span>non va in schiscetta</span>' : home ? (im.miss.length ? `<span class="buyline">🛒 dopo lo scambio manca: ${esc(im.miss.slice(0, 3).map(i => ING[i].n.toLowerCase()).join(', '))}</span>` : '<span class="homeline">🏠 tutto in casa</span>') : ''}${ok && im.waste > 0.3 ? ' <span class="buyline">⚠️ qualcosa rischia di scadere</span>' : ok && im.waste < -0.3 ? ' <span class="homeline">♻️ usa prima quello che scade</span>' : ''}${ok && Math.abs(im.cost) >= 0.5 ? ` <span>${im.cost > 0 ? '+' : '−'}${eur(Math.abs(im.cost))} di spesa</span>` : ''}</div></div><span class="add-btn">🔁</span></button>`);
    }
    return `<div class="sheet-h"><h2>🔁 Scambia ${esc(slotLabel(a).toLowerCase())}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">${esc(da.n)} va al posto del pasto che scegli, e quello viene qui. Dosi, spesa e «In casa» si ricalcolano da soli.</p>
      ${rows.join('') || '<p class="muted">Nessun altro pasto nel menu.</p>'}`;
  },
  rcFix(s) {
    const r = ui.rc.res.righe[s.k], q = (ui.rfq || '').trim().toLowerCase();
    const sug = guessIng(r.testo), list = q ? Object.values(ING).filter(i => !i.sp && i.n.toLowerCase().includes(q)).slice(0, 15).map(i => i.id) : sug;
    return `<div class="sheet-h"><h2>«${esc(r.testo)}»</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Che ingrediente è? ${eur(r.importo || 0)}${r.unita === 'kg' ? ` · ${String(r.quantita).replace('.', ',')} kg` : ''}</p>
      <input type="search" placeholder="Cerca: pollo, banane, pane…" value="${esc(ui.rfq || '')}" data-in="rfq" style="margin-bottom:10px">
      <div id="rf-list">${list.map(iid => `<button class="dish-row" data-a="rcSet" data-k="${s.k}" data-i="${iid}"><div class="emo sm">${ING[iid].e}</div><div class="grow"><div class="nm">${esc(ING[iid].n)}</div></div><span class="add-btn">＋</span></button>`).join('') || '<p class="muted small">Scrivi per cercare.</p>'}</div>
      <button class="btn btn-ghost btn-block" data-a="rcSet" data-k="${s.k}" data-i="">Non è un ingrediente (detersivo, sacchetto…)</button>`;
  },
  scan() {
    return `<div class="sheet-h"><h2>📷 Scanner</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      ${hasScanner() ? `<div class="scanbox"><video id="scan-video" playsinline muted autoplay></video><i></i></div><p class="muted small" id="scan-msg" style="text-align:center">Tieni il codice dentro il riquadro, ben illuminato.</p>`
        : '<div class="tip warn">Questo telefono non legge i codici a barre dall\'app: aggiungi i prodotti con una foto o a mano.</div>'}
      <div id="scan-list">${scanListHTML()}</div>
      <button class="btn btn-primary btn-block" style="margin-top:12px" data-a="scanDone">Fatto</button>`;
  },
  uses(s) {
    const i = ING[s.i], U = usesOf(s.i), comp = U.filter(u => u.comp), tot = U.reduce((a, u) => a + u.q, 0);
    return `<div class="sheet-h"><h2>${i.e} ${esc(i.n)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">In tutto ti servono <b>${fq(s.i, tot)}</b> in questa spesa.${i.u !== 'pz' && i.kcal != null ? `<br>🔥 ${(S.nutr || {})[s.i] ? `${kc(S.nutr[s.i].kcal)} kcal e ${String(S.nutr[s.i].prot).replace('.', ',')} g di proteine per 100 g, dall'etichetta di ${esc(S.nutr[s.i].n)}` : `${kc(i.kcal)} kcal per 100 g (valore medio)`}` : ''}</p>
      ${U.length ? `<div class="group">${U.map(u => `<div class="item"${u.id ? ` data-a="dish" data-id="${u.id}"` : ''}><span style="font-size:22px">${u.e}</span><div class="grow"><div class="nm">${esc(u.d)}</div><div class="left">${esc(u.t)}</div></div><span class="num small">${fq(s.i, u.q)}</span></div>`).join('')}</div>` : '<p class="muted">Nessun piatto lo usa: forse l\'hai aggiunto tu.</p>'}
      ${comp.length ? `<div class="tip small">➕ I complementi aggiungono pane, frutta, yogurt o frutta secca ai pasti per arrivare alle kcal del profilo. Si spengono in Impostazioni → «Complementi nella spesa», oppure scegli il menu 💶 Economico, che usa solo pane, banane e mele.</div>` : ''}`;
  },
  people() {
    const grid = x => `<div class="pgrid"><span></span>${DOW.map((d, i) => `<b class="${i > 4 ? 'we' : ''}">${d}</b>`).join('')}
      ${[['p', '🍱'], ['c', '🌙']].map(([t, e]) => `<span>${e}</span>${x[t].map((on, d) => `<button class="pday${on ? ' on' : ''}" data-a="presT" data-p="${x.id}" data-t="${t}" data-d="${d}" aria-label="${t === 'p' ? 'Pranzo' : 'Cena'} ${DOW[d]}">${on ? '✓' : ''}</button>`).join('')}`).join('')}</div>`;
    const card = x => `<div class="card person">
      <div class="row" style="gap:8px"><button class="pface" data-a="pFace" data-p="${x.id}">${x.e}</button><input type="text" value="${esc(x.name)}" data-ch="pName" data-p="${x.id}" maxlength="20" style="flex:1">
        ${x.id !== 'p1' ? `<button class="icon-btn" data-a="pDel" data-p="${x.id}" aria-label="Togli">🗑️</button>` : ''}</div>
      <div class="muted small" style="margin:10px 0 4px">Quando mangia a casa (🍱 schiscetta a pranzo, 🌙 cena), ogni settimana</div>${grid(x)}
      ${x.p.some(Boolean) ? `<div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>Schiscetta</b></div><div class="seg">${[['insieme', 'Come gli altri'], ['sua', 'Tutta sua']].map(([k, n]) => `<button class="${(x.lunch || 'insieme') === k ? 'on' : ''}" data-a="pLunch" data-p="${x.id}" data-v="${k}">${n}</button>`).join('')}</div></div>
        ${x.lunch === 'sua' ? `<div class="chips wrap">${[[null, 'Di tutto'], ...Object.entries(LCATS).map(([k, [e, n]]) => [k, e + ' ' + n])].map(([k, n]) => `<button class="chip${(x.cat || null) === k ? ' on' : ''}" data-a="pCat" data-p="${x.id}" data-v="${k || ''}">${n}</button>`).join('')}</div>` : ''}` : ''}
      <div class="set-row" data-a="bfSheet" data-p="${x.id}"><div class="grow"><b>☕ Colazione</b><div class="muted small">${(x.colaz || []).filter(b => ING[b.i]).length ? esc(x.colaz.filter(b => ING[b.i]).map(b => `${ING[b.i].n.toLowerCase()} ${b.n === 7 ? 'ogni giorno' : b.n + ' volte'}`).join(', ')) : 'cosa mangi a colazione: finisce nella spesa'}</div></div><span class="add-btn">›</span></div>
      <div class="set-row" data-a="pProf" data-p="${x.id}"><div class="grow"><b>🔥 Porzioni e kcal</b><div class="muted small">${prof(x).on ? `${kc(mealTarget(x))} kcal a pasto · ${prof(x).sex === 'm' ? 'uomo' : 'donna'}, ${prof(x).age} anni, ${prof(x).h} cm, ${prof(x).w} kg` : 'porzione normale della ricetta: tocca per adattarla (età, altezza, peso…)'}</div></div><span class="add-btn">›</span></div>
    </div>`;
    const plan = S.plan || {};
    return `<div class="sheet-h"><h2>👨‍👩‍👧 Chi mangia</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Ognuno con i suoi giorni e le sue porzioni: la spesa e le dosi seguono chi c'è davvero. Le assenze di una sola settimana le segni dal menu, toccando i nomi sotto il pasto.</p>
      ${S.people.map(card).join('')}
      <button class="btn btn-soft btn-block" data-a="pAdd">＋ Aggiungi una persona</button>
      <div class="sec-title" style="margin-top:18px">🍽️ Piano delle cene</div>
      <div class="card"><div class="muted small" style="margin-bottom:6px">Quante cene a settimana per tipo: «Componi tu il menu» le rispetta (0 = come capita).</div>
        ${Object.entries(PLAN_TAGS).map(([k, [e, n]]) => `<div class="set-row"><div class="grow"><b>${e} ${n}</b></div><div class="stepper"><button data-a="planStep" data-k="${k}" data-d="-1" ${!(plan[k] > 0) ? 'disabled style="opacity:.4"' : ''}>−</button><b>${plan[k] || 0}</b><button data-a="planStep" data-k="${k}" data-d="1" ${(plan[k] || 0) >= 7 ? 'disabled style="opacity:.4"' : ''}>+</button></div></div>`).join('')}</div>`;
  },
  colaz(s) {
    const x = personOf(s.p), L = x.colaz || [];
    const row = (b, j) => `<div class="card"><div class="row" style="gap:10px"><span style="font-size:24px">${ING[b.i].e}</span><div class="grow"><b>${esc(ING[b.i].n)}</b></div><button class="icon-btn" data-a="bfDel" data-p="${x.id}" data-j="${j}" aria-label="Togli">🗑️</button></div>
      <div class="set-row"><div class="grow">Ogni volta</div><input type="number" inputmode="decimal" min="0" value="${b.q}" data-ch="bfQ" data-p="${x.id}" data-j="${j}" style="width:80px;text-align:right"> <span class="muted small" style="width:40px">${esc(unitLbl(b.i))}</span></div>
      <div class="set-row"><div class="grow">Volte a settimana</div><div class="stepper"><button data-a="bfTimes" data-p="${x.id}" data-j="${j}" data-d="-1" ${b.n <= 1 ? 'disabled style="opacity:.4"' : ''}>−</button><b>${b.n}</b><button data-a="bfTimes" data-p="${x.id}" data-j="${j}" data-d="1" ${b.n >= 7 ? 'disabled style="opacity:.4"' : ''}>+</button></div></div></div>`;
    const have = new Set(L.map(b => b.i)), q = (ui.bfq || '').trim().toLowerCase();
    const more = q ? Object.values(ING).filter(i => !i.sp && !have.has(i.id) && i.n.toLowerCase().includes(q)).slice(0, 12) : [];
    return `<div class="sheet-h"><h2>☕ Colazione di ${esc(x.name)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Quello che mangi a colazione: lo metto nella spesa della settimana (per pochi giorni, in proporzione).</p>
      ${L.map((b, j) => ING[b.i] ? row(b, j) : '').join('')}
      <div class="sec-title">Aggiungi</div>
      <div class="chips wrap">${Object.keys(BF).filter(i => ING[i] && !have.has(i)).map(i => `<button class="chip" data-a="bfAdd" data-p="${x.id}" data-i="${i}">${ING[i].e} ${esc(ING[i].n)}</button>`).join('')}</div>
      <input type="search" placeholder="Altro: cerca un ingrediente…" value="${esc(ui.bfq || '')}" data-in="bfq" style="margin:10px 0">
      <div id="bf-more">${more.map(i => `<button class="dish-row" data-a="bfAdd" data-p="${x.id}" data-i="${i.id}"><div class="emo sm">${i.e}</div><div class="grow"><div class="nm">${esc(i.n)}</div></div><span class="add-btn">＋</span></button>`).join('')}</div>`;
  },
  personProf(s) {
    const x = personOf(s.p);
    return `<div class="sheet-h"><h2>${x.e} ${esc(x.name)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>${profileCard(x.id)}`;
  },
  who(s) {
    const d = kDay(s.k), t = kT(s.k), date = addDays(S.week.start, d), away = ((S.week.away || {})[d + t]) || {};
    const rows = S.people.map(x => {
      const usual = x[t][wdOf(d)], here = usual && !away[x.id];
      return `<div class="set-row" data-a="whoToggle" data-k="${d + t}" data-p="${x.id}"><div class="grow"><b>${x.e} ${esc(x.name)}</b><div class="muted small">${usual ? 'di solito c\'è' : 'di solito non c\'è (cambialo in «Chi mangia»)'}</div></div><span class="toggle${here ? ' on' : ''}"${usual ? '' : ' style="opacity:.4"'}></span></div>`;
    }).join('');
    return `<div class="sheet-h"><h2>${t === 'p' ? '🍱 Pranzo' : '🌙 Cena'} di ${esc(fdate(date, { weekday: 'long', day: 'numeric' }))}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Chi c'è solo per questa settimana: la spesa e le porzioni si aggiornano.</p><div class="card">${rows}</div>
      <button class="btn btn-soft btn-block" data-a="peopleSheet">👨‍👩‍👧 Giorni di ogni settimana</button>`;
  },
  homeAdd(s) {
    const h = ui.ha || {};
    const head = `<div class="sheet-h"><h2>🏠 Aggiungi in casa</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>`;
    if (s.m === 'mano') {
      const q = (ui.haq || '').trim().toLowerCase(), list = q ? Object.values(ING).filter(i => !i.sp && !i.disp && i.n.toLowerCase().includes(q)).slice(0, 15) : [];
      return head + `<input type="search" placeholder="Cosa hai? ricotta, zucchine, pasta…" value="${esc(ui.haq || '')}" data-in="haq" style="margin-bottom:10px">
        <div id="ha-list">${list.map(i => `<div class="dish-row"><div class="emo sm">${i.e}</div><div class="grow"><div class="nm">${esc(i.n)}</div><div class="meta">quanto ne hai (${esc(unitLbl(i.id))})</div></div><input type="number" inputmode="decimal" placeholder="${i.conf || ''}" id="ha-${i.id}" style="width:80px;text-align:right"><button class="add-btn" data-a="haManual" data-i="${i.id}">＋</button></div>`).join('')}</div>`;
    }
    if (!S.apiKey) return head + `<p>Per riconoscere i prodotti dalla foto serve la chiave API Anthropic (come per lo scontrino): mettila nelle impostazioni. Intanto puoi aggiungerli <button class="btn-ghost" data-a="homeAddSheet" data-m="mano">a mano</button>.</p>`;
    const pick = label => `<label class="btn btn-primary btn-block">${label}<input type="file" accept="image/*" capture="environment" data-ch="homeFile" hidden></label>`;
    if (h.state === 'loading') return head + '<div class="empty"><div class="big spin">📷</div><p>Riconosco i prodotti…</p></div>';
    if (h.state === 'error') return head + `<div class="tip warn">⚠️ ${esc(h.err)}</div>${pick('📷 Riprova')}`;
    if (h.state === 'done') {
      const rows = h.items.map((x, k) => { const i = ING[x.iid]; return `<div class="item" data-a="haSel" data-k="${k}"><span class="check${h.sel[k] ? ' on' : ''}">✓</span><span style="font-size:22px">${i ? i.e : '❓'}</span><div class="grow"><div class="nm">${esc(x.nome)}${x.marca ? ' · ' + esc(x.marca) : ''}</div><div class="left">${i ? `${esc(i.n)} · ${fq(x.iid, x.q)}` : 'non è un ingrediente delle ricette'}</div></div></div>`; }).join('');
      return head + `<div class="group">${rows || '<p class="muted">Nessun prodotto riconosciuto.</p>'}</div>
        <button class="btn btn-primary btn-block" data-a="haApply">Aggiungi in casa (${Object.keys(h.sel).length})</button>${pick('📷 Un\'altra foto')}`;
    }
    return head + `<p class="muted">Fotografa uno o più prodotti (anche tutti insieme sul tavolo): leggo nome, marca e formato e li metto «In casa», con la scadenza tipica. Per le confezioni aperte stimo quanto ne resta.</p>${pick('📷 Fotografa i prodotti')}
      <button class="btn btn-ghost btn-block" data-a="homeAddSheet" data-m="mano">＋ Oppure aggiungi a mano</button>`;
  },
  lot(s) {
    const l = (S.dispensa || []).find(x => x.id === s.id);
    if (!l || !ING[l.iid]) return '';
    const dishes = ALL.filter(p => p.ing.some(([i]) => i === l.iid) && !blocked(p) && !(S.dislikes || {})[p.id])
      .map(p => ({ p, q: (p.ing.find(([i]) => i === l.iid) || [])[1] || 0 })).sort((a, b) => !!S.favs[b.p.id] - !!S.favs[a.p.id] || b.q - a.q).slice(0, 12);
    return `<div class="sheet-h"><h2>${ING[l.iid].e} ${esc(ING[l.iid].n)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <div class="card"><div class="set-row"><div class="grow"><b>Ne hai ${fq(l.iid, l.q)}</b><div class="muted small">scade ${esc(fday(l.exp))}</div></div></div>
        <label class="lab">Quanto ne è rimasto (${esc(unitLbl(l.iid))})</label>
        <div class="row" style="gap:8px"><input type="text" inputmode="decimal" id="lot-q" value="${String(Math.round(l.q * 100) / 100).replace('.', ',')}"><button class="btn btn-soft" data-a="lotSave" data-id="${l.id}">Salva</button></div>
        ${l.frozen ? '' : `<button class="btn btn-soft btn-block" style="margin-top:8px" data-a="lotFreeze" data-id="${l.id}">🧊 L'ho congelato (dura altri 3 mesi)</button>`}
        <button class="btn btn-ghost btn-block" style="margin-top:8px;color:var(--tomato)" data-a="lotDel" data-id="${l.id}">Finito o buttato: toglilo</button></div>
      <div class="sec-title">Piatti che lo usano</div>
      ${dishes.length ? dishes.map(({ p, q }) => `<button class="dish-row" data-a="dish" data-id="${p.id}">${dishEmo(p)}<div class="grow"><div class="nm">${esc(p.n)}${S.favs[p.id] ? ' 👍' : ''}</div><div class="meta"><span>${fq(l.iid, q)} a persona</span><span>⏱ ${mins(p.tot)}</span></div></div></button>`).join('') : '<p class="muted small">Nessuna ricetta lo usa.</p>'}`;
  },
  spesaInfo(s) {
    const x = (S.spese || []).find(y => y.id === s.id);
    if (!x) return '';
    const f = FONTI[x.fonte] || FONTI.spesa, cur = x.wid && x.wid === S.week.uid && (S.week.trips || {})[x.giro];
    return `<div class="sheet-h"><h2>${f[0]} ${esc(fday(x.date))}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <div class="card"><div class="row"><div class="grow"><b>${esc(x.store || 'Supermercato')}</b><div class="muted small">${esc(giroLbl(x))} · ${f[1]}</div></div><b class="num" style="font-size:22px">${x.spent ? eur(x.spent) : '—'}</b></div>
        ${x.stima ? `<div class="muted small" style="margin-top:6px">Stima della lista: ${eur(x.stima)}${x.spent ? ` · ${x.spent >= x.stima ? 'hai speso ' + eur(x.spent - x.stima) + ' in più (cose fuori lista o prezzi diversi)' : 'hai risparmiato ' + eur(x.stima - x.spent)}` : ''}</div>` : ''}</div>
      ${x.items.length ? `<div class="sec-title">Cosa hai comprato<span class="right">${x.items.length}</span></div><div class="group">${x.items.map(([iid, n, q, c]) => ING[iid] ? `<div class="item"><span style="font-size:22px">${ING[iid].e}</span><div class="grow"><div class="nm">${esc(ING[iid].n)}</div><div class="left">${ING[iid].conf && n ? `${n} × ${ING[iid].u === 'pz' ? ING[iid].conf + ' ' + ING[iid].pzn[1] : fmass(ING[iid].conf, ING[iid].u)}` : fq(iid, q)}</div></div><span class="num">${eur(c)}</span></div>` : '').join('')}
        ${x.extras.map(([t, pr]) => `<div class="item"><span style="font-size:22px">🛍️</span><div class="grow"><div class="nm">${esc(t)}</div></div><span class="num">${pr ? eur(pr) : ''}</span></div>`).join('')}</div>` : '<p class="muted small">Per questa spesa non ho l\'elenco dei prodotti.</p>'}
      ${x.recovered ? '<p class="muted small">Ritrovata dopo l\'aggiornamento: controlla data e importo.</p>' : ''}
      ${cur ? `<p class="muted small">È una spesa di questa settimana: l'importo lo correggi dalla scheda Spesa («Modifica»).</p>` : `<button class="btn btn-soft btn-block" data-a="spesaAddSheet" data-id="${esc(x.id)}">✏️ Modifica data, negozio e importo</button>
        <button class="btn btn-ghost btn-block" style="color:var(--tomato);margin-top:8px" data-a="spesaDel" data-id="${esc(x.id)}">Togli dallo storico</button>`}`;
  },
  spSearch(s) { return spSearchHTML(s); },
  sfizio(s) { return sfizioHTML(s); },
  qty(s) { return qtyHTML(s); },
  products() { return productsHTML(); },
  receipt() { return receiptHTML(); },
  pick(s) {
    const key = s.k, t = kT(key), d = kDay(key), f = ui.pf, w = S.week;
    let special = '';
    if (t === 'p' && d > 0) {
      const pd = slotDish(w, (d - 1) + 'c');
      if (pd && pd.dish && pd.dish.sc && eaters((d - 1) + 'c').length) special += `<button class="dish-row special" data-a="setLeft" data-k="${key}"><div class="emo">♻️</div><div class="grow"><div class="nm">Avanzo della cena di ieri</div><div class="meta">${esc(pd.dish.n)} · cucini una porzione in più, zero lavoro extra</div></div></button>`;
    }
    special += `<button class="dish-row special" data-a="setSkip" data-k="${key}"><div class="emo">🚫</div><div class="grow"><div class="nm">Niente</div><div class="meta">${t === 'p' ? 'mensa, pranzo fuori o salto' : 'cena fuori o avanzi in frigo'}</div></div></button>`;
    if (w.slots[key]) special += `<button class="dish-row special" data-a="clearSlot" data-k="${key}"><div class="emo">🗑️</div><div class="grow"><div class="nm">Svuota questo pasto</div></div></button>`;
    return `<div class="sticky-top"><div class="sheet-h"><h2>${slotLabel(key)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <input type="search" placeholder="Cerca piatto o ingrediente…" value="${esc(f.q)}" data-in="pq" data-k="${key}">
      <div class="chips" style="margin-top:10px">${FCHIPS.map(([k, n]) => `<button class="chip${f.cat === k ? ' on' : ''}" data-a="pf" data-c="${k}">${n}</button>`).join('')}</div>
      <div class="row" style="margin:6px 0 10px"><div class="seg">${[['cost', '€ Convenienti'], ['time', '⏱ Veloci'], ['az', 'A–Z']].map(([k, n]) => `<button class="${f.sort === k ? 'on' : ''}" data-a="psort" data-s="${k}">${n}</button>`).join('')}</div>
      ${t === 'p' ? `<button class="btn-ghost small" style="margin-left:auto" data-a="pall">${f.all ? '✓ ' : ''}Anche non da schiscetta</button>` : ''}</div></div>
      ${special}<div class="sec-title">Proposte${f.sort === 'cost' ? ' · prima quelle che costano meno in più' : ''}</div><div id="pick-list">${pickList(key)}</div>`;
  },
  dish(s) {
    const p = PI[s.id], n = Math.max(1, s.k ? nOf(s.k) : S.pc), nn = s.k && nOf(s.k) ? slotN(s.k, p) : n;
    return `<div class="sheet-h"><button class="fav${S.favs[p.id] ? ' on' : ''}" data-a="fav" data-id="${p.id}" aria-label="Mi piace">👍</button><button class="fav${(S.dislikes || {})[p.id] ? ' on' : ''}" data-a="dislike" data-id="${p.id}" aria-label="Non mi piace">👎</button><div class="grow"></div><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <div class="dhead">${p.img ? `<div class="dhero"><img src="${esc(p.img.u)}" alt="${esc(p.n)}" onerror="this.parentNode.remove()"></div>` : `<div class="emo lg cat-${p.cat}">${p.e}</div>`}<h2>${esc(p.n)}</h2>
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${p.mine ? '<span class="badge yellow">✍️ tua ricetta</span>' : ''}<span class="badge">${CATN[p.cat]}</span>${p.sc ? `<span class="badge blue">🍱 ${SCN[p.sc]}</span>` : '<span class="badge">non da schiscetta</span>'}${p.veg ? '<span class="badge green">🌱 vegetariano</span>' : ''}</div></div>
      <div class="times"><div><b>${mins(p.tot)}</b><span>in tutto</span></div><div><b>${mins(p.att)}</b><span>di lavoro</span></div><div><b>${mins(p.cott)}</b><span>di cottura</span></div></div>
      ${s.k && (S.week.slots[s.k] || {}).d === p.id || s.k && (S.week.slots[s.k] || {}).left ? `<button class="btn btn-soft btn-block" data-a="pick" data-k="${s.k}">🔄 Cambia il piatto di ${slotLabel(s.k).toLowerCase()}</button><button class="btn btn-soft btn-block" style="margin-top:8px" data-a="swapSheet" data-k="${s.k}">🔁 Scambia con un altro pasto del menu</button>`
        : s.k ? `<button class="btn btn-primary btn-block" data-a="setSlot" data-k="${s.k}" data-id="${p.id}">Scegli per ${slotLabel(s.k).toLowerCase()}</button>`
        : `<button class="btn btn-primary btn-block" data-a="addTo" data-id="${p.id}">Aggiungi al menu</button>`}
      ${nutCard(p)}
      ${dishCostCard(p, n)}
      <div class="card"><b>Procedimento</b>${p.steps.some(x => x.includes('{')) ? `<span class="muted small"> · dosi per ${nn === n ? pers(n) : porz(nn)}</span>` : ''}<ol class="steps" style="margin-top:6px">${p.steps.map(x => `<li>${stepHTML(p, x, nn)}</li>`).join('')}</ol></div>
      ${p.note ? `<div class="card"><b>📝 Note</b><p style="margin:6px 0 0">${esc(p.note)}</p></div>` : ''}
      ${p.tip ? `<div class="tip">💡 ${esc(p.tip)}</div>` : ''}${p.sc ? `<div class="tip blue">🍱 ${esc(p.sctip || SCTIP[p.sc])}</div>` : ''}
      ${p.mine ? `<button class="btn btn-soft btn-block" data-a="editRecipe" data-id="${p.id}">✏️ Modifica la ricetta</button>` : ''}
      ${p.img ? `<p class="muted small credit">Foto: ${esc(p.img.a)} · ${esc(p.img.l)} · Wikimedia Commons</p>` : ''}`;
  },
  editor() { return editorHTML(); },
  ingPick() {
    return `<div class="sticky-top"><div class="sheet-h"><h2>Scegli l'ingrediente</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <input type="search" placeholder="Cerca: pasta, pollo, pesto…" value="${esc(ui.ipq || '')}" data-in="ipq" style="margin-bottom:10px"></div>
      <button class="dish-row special" data-a="spOpen" data-mode="ed"><div class="emo">🔎</div><div class="grow"><div class="nm">Tutti i prodotti del supermercato</div><div class="meta">cerca nel catalogo completo di Esselunga o Carrefour, con prezzo e marca veri</div></div></button>
      <button class="dish-row special" data-a="newIngSheet"><div class="emo">🆕</div><div class="grow"><div class="nm">Nuovo ingrediente</div><div class="meta">non c'è nell'elenco? Crealo tu con confezione e prezzo</div></div></button>
      <div id="ip-list">${ingPickList()}</div>`;
  },
  newIng() { return newIngHTML(); },
  addTo(s) {
    const p = PI[s.id];
    let rows = '';
    for (let d = 0; d < 7; d++) for (const key of dayKeys(d)) {
      const t = kT(key);
      if (t === 'p' && !p.sc) continue;
      const r = slotDish(S.week, key);
      rows += `<button class="dish-row" data-a="setSlot" data-k="${key}" data-id="${p.id}"><div class="emo sm">${t === 'p' ? '🍱' : '🌙'}</div><div class="grow"><div class="nm" style="text-transform:capitalize">${slotLabel(key).replace(/^(\w+) di /, '$1 · ')}</div><div class="meta">${r && r.dish ? 'sostituisce ' + esc(r.dish.n) : r && r.skip ? 'segnato come niente' : 'libero'}</div></div>${!r ? '<span class="badge green">libero</span>' : ''}</button>`;
    }
    return `<div class="sheet-h"><h2>Quando lo mangi?</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div><p class="muted small" style="margin-top:0">${esc(p.n)}</p>${rows}`;
  },
  market() {
    return `<div class="sheet-h"><h2>Dove fai la spesa?</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>${marketGrid('setMarket')}
      <p class="muted small">Le percentuali vengono dall'${esc(D.fonte)} (carrello «primo prezzo», 100 = la catena più economica) e sono applicate ai prezzi medi stimati. Sono una stima: correggi i prezzi veri toccandoli nella lista.</p>`;
  },
  price(s) {
    const mk = s.m || S.market, other = mk !== S.market;
    const i = ING[s.i], f = feed(mk), fp = f && f.prices[s.i], opts = (fp && fp.opts) || [];
    const custom = !other && isCustom(s.i);
    const cur = ((S.choice || {})[mk] || {})[s.i], unit = i.conf ? `confezione da ${i.u === 'pz' ? i.conf + ' ' + i.pzn[i.conf === 1 ? 0 : 1] : fmass(i.conf, i.u)}` : 'kg';
    const dq = +s.dq || 0, dt = +s.dt || 0, u0 = unitCost(s.i);
    // fuori da un piatto: impatto sul menu della settimana (quanto si consuma e cosa si paga alla cassa)
    const sh = !dq && !other ? shopping(S.week, true) : null, it = sh && sh.items.find(x => x.iid === s.i);
    const wq = sh ? (it ? it.need : ((sh.pantry.find(x => x.iid === s.i) || {}).need || 0)) : 0;
    const impact = p => {      // quanto cambia il costo scegliendo questo prodotto, rispetto a quello in uso
      const du = optUnit(s.i, p) - u0;
      if (dq && dt) {
        const d = dq * du;
        return `<span class="impact ${d > 0.0005 ? 'up' : d < -0.0005 ? 'down' : ''}">${sgnEur3(d)} · ${pct(d / dt * 100, true)} sul piatto</span>`;
      }
      if (wq && sh.cassa) {
        const d = it ? (i.conf ? it.n * (p - price(s.i)) : it.buy / 1000 * (p - price(s.i))) : wq * du;
        return `<span class="impact ${d > 0.0005 ? 'up' : d < -0.0005 ? 'down' : ''}">${sgnEur3(d)} · ${pct(d / sh.cassa * 100, true)} sul menu</span>`;
      }
      return '';
    };
    const ctx = dq && dt ? `<div class="tip small">🍽️ In «${esc(s.dn || '')}» ne usi ${fq(s.i, dq)}: costa <b>${eur3(dq * u0)}</b> su <b>${eur3(dt)}</b> (${pct(dq * u0 / dt * 100)}). Accanto a ogni prodotto: quanto cambia il piatto rispetto a quello che hai scelto ora.</div>`
      : wq ? `<div class="tip small">🛒 Nel menu della settimana ne usi ${fq(s.i, wq)}. Accanto a ogni prodotto: quanto cambia la spesa della settimana (${eur(sh.cassa)}) rispetto a quello che hai scelto ora.</div>` : '';
    const choose = opts.length ? `${ctx}<div class="sec-title">Scegli il prodotto che compri<span class="right">${opts.length}</span></div>
      <p class="muted small" style="margin:-4px 4px 8px">Prezzi ${esc(SM[mk].n)} online del ${feedDate(f)}, riportati alla ${unit} della ricetta. La scelta vale per tutte le ricette e per la spesa.</p>
      <div class="group">
        <div class="item" data-a="pickOpt" data-i="${s.i}" data-m="${mk}" data-c=""><span class="check">${!cur && !custom ? '✓' : ''}</span><div class="grow"><div class="nm">Automatico${autoOpt(s.i, mk).store ? ' · marca del supermercato' : ''}</div><div class="left">${esc(autoOpt(s.i, mk).n)}</div>${impact(autoOpt(s.i, mk).p)}</div><b class="num">${eur(autoOpt(s.i, mk).p)}</b></div>
        ${opts.map(o => `<div class="item" data-a="pickOpt" data-i="${s.i}" data-m="${mk}" data-c="${esc(o.c)}"><span class="check">${cur === o.c && !custom ? '✓' : ''}</span>
          <div class="grow"><div class="nm">${esc(o.b || o.n.split(' ')[0])}</div><div class="left">${esc(o.n)}${o.promo ? ' · <b class="promo">in offerta</b>' : ''}${o.out ? ' · esaurito online' : ''}</div>${impact(o.p)}</div><b class="num">${eur(o.p)}</b></div>`).join('')}
      </div>${other ? '' : '<div class="sec-title">Oppure scrivi il prezzo</div>'}` : '';
    const head = `<div class="sheet-h"><h2>${i.e} ${esc(i.n)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>`;
    const note = brandNote(s.i, mk);
    const find = i.sp ? '' : `<button class="dish-row special" data-a="spOpen" data-mode="brand" data-k="${s.i}"><div class="emo">🔎</div><div class="grow"><div class="nm">${opts.length ? 'Cerca un\'altra marca' : 'Cerca la marca'} nel catalogo</div><div class="meta">${note ? `ora: ${esc(note)}` : `tutti i prodotti di ${esc(SM[SP_MARKETS.includes(mk) ? mk : 'esselunga'].n)}, con il prezzo vero`}</div></div></button>`;
    if (other) return head + choose + find;
    return `${head}${choose}${find}
      <p class="muted">Prezzo ${i.conf ? `di una confezione da ${i.u === 'pz' ? i.conf + ' ' + i.pzn[i.conf === 1 ? 0 : 1] : fmass(i.conf, i.u)}` : 'al kg'} da ${esc(SM[S.market].n)}${i.b ? ` (${esc(i.b)})` : ''}.</p>
      <input type="text" id="price-in" inputmode="decimal" value="${price(s.i).toFixed(2).replace(".", ",")}">
      <p class="muted small">${feed() && feed().prices[s.i] ? `Prezzo ${esc(SM[S.market].n)} del ${feedDate(feed())}: ${eur(feed().prices[s.i].p)} (${esc(feed().prices[s.i].prod)})` : `Stima: ${eur(estimate(s.i))}`}</p>
      <div style="display:flex;gap:10px"><button class="btn btn-soft" data-a="resetPrice" data-i="${s.i}">${feed() && feed().prices[s.i] ? 'Usa il prezzo online' : 'Usa la stima'}</button><button class="btn btn-primary grow" data-a="savePrice" data-i="${s.i}">Salva</button></div>`;
  },
  wallet(s) {
    const it = walletItems().find(x => x.pay === s.pay);
    if (!it) return '<div class="sheet-h"><h2>Fatto</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>';
    const tr = (S.week.trips || {})[tripKey()], clash = tr && tr.spent && tr.pay !== it.pay, x = shopWin();
    const giro = x.days ? `dei giorni da ${fday(addDays(S.week.start, x.from))}` : 'della settimana';
    const when = new Date(it.ts).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="sheet-h"><h2>📲 Spesa da Google Wallet</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <div class="card"><div class="row"><b class="grow">${esc(it.negozio)}</b><b class="num">${eur(it.totale)}</b></div><div class="muted small">${esc(when)}</div></div>
      ${clash ? `<p>Per questo giro hai già segnato <b>${eur(tr.spent)}</b>${tr.negozio ? ` (${esc(tr.negozio)})` : ''}. Che faccio?</p>
        <button class="btn btn-green btn-block" data-a="walletYes" data-pay="${esc(it.pay)}" data-how="sostituisci">Sostituisci: la spesa è ${eur(it.totale)}</button>
        <button class="btn btn-soft btn-block" style="margin-top:8px" data-a="walletYes" data-pay="${esc(it.pay)}" data-how="somma">Somma: ${eur(tr.spent)} + ${eur(it.totale)} = ${eur(tr.spent + it.totale)}</button>`
      : `<p>È la spesa ${giro}?</p><button class="btn btn-green btn-block" data-a="walletYes" data-pay="${esc(it.pay)}" data-how="nuova">Sì, è la spesa</button>`}
      <button class="btn btn-soft btn-block" style="margin-top:8px" data-a="walletNo" data-pay="${esc(it.pay)}">No, altro</button>`;
  },
  confirm(s) {
    const sh = shopping(S.week, true), tr = (S.week.trips || {})[tripKey()], edit = !!s.edit && tr;
    const cur = edit ? tr.spent : S.week.rcPending ? S.week.rcPending.totale : null;
    return `<div class="sheet-h"><h2>${edit ? 'Quanto hai speso?' : 'Spesa fatta? 🎉'}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      ${edit ? '' : `<p class="muted">Da ora ogni sera ti dico cosa cucinare per cena e per la schiscetta di domani${S.reminder.on ? `, con un promemoria alle ${S.reminder.t}` : ''}.</p>`}
      <label class="small muted">Totale pagato alla cassa, con tutto: anche shampoo, detersivi e cose fuori lista (facoltativo)</label>
      <input type="text" id="spent-in" inputmode="decimal" placeholder="Es. ${sh.cassa.toFixed(2).replace(".", ",")}" value="${cur ? cur.toFixed(2).replace('.', ',') : ''}" data-in="spentIn" data-stima="${sh.cassa}" style="margin:6px 0 6px">
      <div class="muted small" id="spent-diff" style="margin-bottom:14px">${spentDiff(cur, sh.cassa)}</div>
      ${edit ? `<label class="small muted">Giorno della spesa</label><input type="date" id="spent-date" value="${tr.date}" max="${TODAY}" style="margin:6px 0 14px">` : ''}
      <button class="btn btn-green btn-block" data-a="doConfirm"${edit ? ' data-edit="1"' : ''}>${edit ? 'Salva' : 'Conferma e inizia'}</button>
      <button class="btn btn-soft btn-block" style="margin-top:8px" data-a="receiptSheet">📷 Ho lo scontrino: leggilo tu</button>`;
  },
  week() {
    return `<div class="sheet-h"><h2>Quando inizia il menu?</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted">Il primo giorno del menu. La spesa la fai il giorno prima, che è anche la sera in cui prepari la prima schiscetta.</p>
      <input type="date" id="week-in" value="${S.week.start}">
      <button class="btn btn-primary btn-block" style="margin-top:14px" data-a="setWeek">Salva</button>`;
  },
  allergy() {
    const ex = excluded(), q = (ui.alq || '').trim().toLowerCase();
    const list = Object.values(ING).filter(i => !i.sp && (!q || i.n.toLowerCase().includes(q))).sort((a, b) => a.n.localeCompare(b.n));
    return `<div class="sticky-top"><div class="sheet-h"><h2>Allergie ed esclusi</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div></div>
      <div class="sec-title">Allergie e intolleranze</div>
      <div class="chips wrap">${Object.entries(ALLERGENI).map(([k, [e, n]]) => `<button class="chip${(S.allergie || {})[k] ? ' on' : ''}" data-a="allergyToggle" data-k="${k}">${e} ${n}</button>`).join('')}</div>
      <p class="muted small">Escludo le ricette con gli ingredienti che di solito contengono l'allergene (es. glutine: pasta, pane, farina, dado…). Controlla sempre l'etichetta dei prodotti.</p>
      <div class="sec-title">Cose già pronte: le compri?</div>
      <div class="group">${prontiHTML()}</div>
      <div class="sec-title">Ingredienti che non mangi<span class="right">${Object.keys(S.noIng || {}).length}</span></div>
      <input type="search" placeholder="Cerca: cipolla, funghi, peperoni…" value="${esc(ui.alq || '')}" data-in="alq" style="margin-bottom:10px">
      <div class="group" id="al-list">${allergyList(list, ex)}</div>
      <p class="muted small" style="text-align:center">${ALL.filter(blocked).length} ricette escluse su ${ALL.length}</p>`;
  },
  auto(s) {
    const redo = !!s.redo, n = redo ? Object.keys(S.week.slots).length : 0;
    return `<div class="sheet-h"><h2>Che menu vuoi?</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small">${redo ? `Rifaccio da capo tutti i ${n} pasti della settimana.` : 'Riempio i pasti ancora vuoti.'} I piatti con 👎 non li metto mai, quelli con 👍 più spesso.</p>
      <div class="group">${Object.entries(MODES).map(([k, [e, n, d]]) => `<button class="item" style="width:100%;text-align:left" data-a="autofill" data-m="${k}"${redo ? ' data-redo="1"' : ''}><span style="font-size:26px">${e}</span><div class="grow"><div class="nm">${n}</div><div class="left">${d}</div></div><span class="add-btn">›</span></button>`).join('')}</div>
      ${S.week.status === 'cook' && redo ? '<p class="muted small">La spesa è già fatta: dopo controlla nella lista cosa ti manca.</p>' : ''}
      <p class="muted small">Il menu leggero è pensato per i giorni di stomaco in disordine; se il mal di stomaco dura più di qualche giorno, senti il medico.</p>`;
  },
  saveMenu() {
    const cur = (S.saved || []).find(x => x.id === S.week.from);
    return `<div class="sheet-h"><h2>Salva il menu</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted">Lo ritrovi in «Menu salvati» e lo puoi riusare in un'altra settimana.</p>
      <input type="text" id="menu-name" maxlength="60" placeholder="Es. Settimana proteica, Menu autunno…" value="${esc(cur ? cur.name : '')}">
      ${cur ? `<button class="btn btn-soft btn-block" style="margin-top:12px" data-a="saveMenu" data-id="${cur.id}">Aggiorna «${esc(cur.name)}»</button>` : ''}
      <button class="btn btn-primary btn-block" style="margin-top:12px" data-a="saveMenu">Salva come nuovo</button>`;
  },
  saved() {
    const L = (S.saved || []).slice().sort((a, b) => (b.used || b.created).localeCompare(a.used || a.created));
    return `<div class="sheet-h"><h2>Menu salvati</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      ${L.length ? `<p class="muted small">«Usa» lo mette nella settimana del ${fdate(S.week.start, { day: 'numeric', month: 'long' })} al posto del menu attuale.</p>
      <div class="group">${L.map(x => {
        const w = Object.assign(newWeek(S.week.start), { slots: x.slots, sfizi: x.sfizi || {} }), n = Object.values(x.slots).filter(s => s && (s.d || s.left)).length;
        return `<div class="item"><div class="grow"><div class="nm">${esc(x.name)}</div>
          <div class="left">${n} pasti · ${eur(shopping(w).cassa)} oggi · ${x.used ? `usato l'ultima volta per la settimana del ${fdate(x.used, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'mai usato'}</div></div>
          <button class="btn btn-primary btn-sm" data-a="useMenu" data-id="${x.id}">Usa</button><button class="icon-btn" data-a="delMenu" data-id="${x.id}" aria-label="Elimina">🗑️</button></div>`;
      }).join('')}</div>` : '<p class="muted">Non hai ancora salvato nessun menu. Componi una settimana e tocca «💾 Salva menu».</p>'}`;
  },
  clear() {
    return `<div class="sheet-h"><h2>Svuotare il menu?</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted">Tolgo tutti i piatti di questa settimana. Prezzi, preferiti e impostazioni restano.</p>
      <button class="btn btn-primary btn-block" data-a="clear">Svuota il menu</button>`;
  },
  settings() {
    const staples = Object.values(ING).filter(i => i.disp);
    return `<div class="sheet-h"><h2>Impostazioni</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <div class="card">
        <div class="set-row"><div class="grow"><b>Supermercato</b><div class="muted small">${esc(SM[S.market].n)}</div></div><button class="btn btn-soft btn-sm" data-a="marketSheet">Cambia</button></div>
        <div class="set-row" data-a="peopleSheet"><div class="grow"><b>👨‍👩‍👧 Chi mangia</b><div class="muted small">${esc(S.people.map(x => x.e + ' ' + x.name).join(', '))} · giorni, schiscette e piano delle cene</div></div><span class="add-btn">›</span></div>
        <div class="set-row" data-a="bfSheet" data-p="p1"><div class="grow"><b>☕ La tua colazione</b><div class="muted small">${(personOf('p1').colaz || []).length ? esc(personOf('p1').colaz.filter(b => ING[b.i]).map(b => ING[b.i].n.toLowerCase()).join(', ')) : 'kefir, yogurt, biscotti…: finisce nella spesa'}</div></div><span class="add-btn">›</span></div>
      </div>
      ${profileCard()}
      ${hasWallet() ? `<div class="card"><div class="set-row"><div class="grow"><b>📲 Leggi la spesa da Google Wallet</b><div class="muted small">${NATIVE.walletEnabled() ? '✅ Attivo: quando paghi in un supermercato ti chiedo se è la spesa' : '⚪ Da attivare: dai a Schiscetta l\'accesso alle notifiche (legge solo quelle di Google Wallet)'}</div></div><button class="btn btn-soft btn-sm" data-a="walletSettings">${NATIVE.walletEnabled() ? 'Impostazioni' : 'Attiva'}</button></div></div>` : ''}
      <div class="card"><div class="set-row" data-a="prontiSheet"><div class="grow"><b>🥫 Cose già pronte</b><div class="muted small">${(n => n.length ? 'non compri: ' + esc(n.join(', ').toLowerCase()) : 'le compri tutte: sughi, gnocchi, cotolette, impasti…')(Object.keys(PRONTI_CAT).filter(k => (S.pronti || {})[k] === false).map(k => PRONTI_CAT[k][1]))}</div></div><span class="add-btn">›</span></div>
        <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>🍽️ Il menu</b><div class="muted small">${STYLES[S.menuStyle || 'giorni'][2]}</div></div><div class="seg">${Object.entries(STYLES).map(([k, [e, n]]) => `<button class="${(S.menuStyle || 'giorni') === k ? 'on' : ''}" data-a="menuStyle" data-v="${k}">${e} ${k === 'giorni' ? 'Per giorno' : 'Lista'}</button>`).join('')}</div></div></div>
      <div class="card"><div class="set-row" data-a="allergySheet"><div class="grow"><b>🚫 Allergie e ingredienti che non mangi</b><div class="muted small">${(() => { const a = Object.keys(S.allergie || {}).map(k => ALLERGENI[k] && ALLERGENI[k][1]).filter(Boolean), i = Object.keys(S.noIng || {}).filter(k => ING[k]).map(k => ING[k].n); return a.length || i.length ? esc([...a, ...i].join(', ')) + ` · ${ALL.filter(blocked).length} ricette escluse` : 'nessuno: tutte le ricette sono disponibili'; })()}</div></div><span class="add-btn">›</span></div></div>
      <div class="card">
        <div class="set-row" data-a="remToggle"><div class="grow"><b>Promemoria serale</b><div class="muted small">Notifica con cena e schiscetta, dopo la spesa</div></div><span class="toggle${S.reminder.on ? ' on' : ''}"></span></div>
        <div class="set-row"><div class="grow"><b>Orario</b></div><input type="time" value="${S.reminder.t}" data-ch="remTime" style="width:130px"></div>
        <div class="set-row"><div class="grow"><b>Tema</b></div><div class="seg">${[['auto', 'Auto'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([k, n]) => `<button class="${S.theme === k ? 'on' : ''}" data-a="theme" data-v="${k}">${n}</button>`).join('')}</div></div>
      </div>
      <div class="sec-title">🧂 Di solito in dispensa</div>
      <div class="group">${staples.map(i => `<div class="item" data-a="pantry" data-i="${i.id}"><span style="font-size:22px">${i.e}</span><div class="grow"><div class="nm">${esc(i.n)}</div></div><span class="toggle${S.pantry[i.id] !== false ? ' on' : ''}"></span></div>`).join('')}</div>
      <div class="card">
        <div class="set-row" data-a="storeBrand"><div class="grow"><b>🏪 Marca del supermercato di default</b><div class="muted small">in automatico prendo i prodotti a marchio della catena (es. pasta Esselunga invece di Barilla), se ci sono</div></div><span class="toggle${S.storeBrand !== false ? ' on' : ''}"></span></div>
        <div class="set-row" data-a="productsSheet"><div class="grow"><b>🏷️ I miei prodotti</b><div class="muted small">scegli marca e formato per ogni ingrediente (es. pasta Rummo)</div></div><span class="add-btn">›</span></div>
        <div class="set-row"><div class="grow"><b>🔄 Prezzi veri da internet</b><div class="muted small">${feed() ? `${esc(SM[S.market].n)}: ${Object.keys(feed().prices).length} prezzi del ${feedDate(feed())}` : `non disponibili per ${esc(SM[S.market].n)}: uso le stime`}</div></div>${(D.feedUrls || {})[S.market] || (PHONE_MARKETS[S.market] && hasNativeHttp()) ? '<button class="btn btn-soft btn-sm" data-a="feedNow">Aggiorna</button>' : ''}</div>
        ${S.market === 'iperal' && window.Native && window.Native.iperalOpen ? `<div class="set-row"><div class="grow"><b>🔑 Il tuo account Iperal</b><div class="muted small">${S.iperalOk ? '✅ entrato: prezzi del tuo punto vendita e carrello dalla lista' : 'entra con il tuo account sul sito Iperal (la password la scrivi tu sul sito, l\'app non la vede)'}${(S.phoneLog || {}).iperal ? `<br>${S.phoneLog.iperal.ok ? '🏷️' : '⚠️'} Ultima lettura prezzi ${new Date(S.phoneLog.iperal.t).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}: ${esc(S.phoneLog.iperal.msg)}` : ''}</div></div><button class="btn btn-soft btn-sm" data-a="iperalOpen">${S.iperalOk ? 'Apri' : 'Entra'}</button></div>
        <div class="set-row"><div class="grow"><b>🔎 Diagnosi Iperal</b><div class="muted small">se i prezzi non arrivano: prova una ricerca e manda il risultato (nessun dato personale)</div></div><button class="btn btn-soft btn-sm" data-a="iperalDiag">Prova</button></div>` : ''}
        ${S.market === 'conad' ? `<div class="set-row"><div class="grow"><b>🏪 Il tuo Conad</b><div class="muted small">${hasNativeHttp() ? (S.conadStore ? esc(S.conadStore) : 'scegli il negozio nel sito Conad: i prezzi cambiano da negozio a negozio') : 'disponibile nell’app Android'}</div></div>${hasNativeHttp() ? `<button class="btn btn-soft btn-sm" data-a="conadStore">${S.conadStore ? 'Cambia' : 'Scegli'}</button>` : ''}</div>` : ''}
        <div class="set-row" style="flex-wrap:wrap"><div class="grow"><b>📷 Lettura scontrini con Claude</b><div class="muted small">Serve una chiave API Anthropic (console.anthropic.com). Resta solo su questo telefono; ogni scontrino costa pochi centesimi.</div></div>
          <input type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(S.apiKey || '')}" data-ch="apiKey" style="margin-top:8px"></div>
        <div class="set-row"><div class="grow"><b>Prezzi corretti da te</b><div class="muted small">${Object.values(S.prices).reduce((s, m) => s + Object.keys(m).length, 0)} prezzi personalizzati</div></div><button class="btn btn-soft btn-sm" data-a="resetPrices">Azzera</button></div>
        <div class="set-row"><div class="grow"><b>Nuova settimana</b><div class="muted small">Archivia questa e ricomincia</div></div><button class="btn btn-soft btn-sm" data-a="newWeek">Inizia</button></div>
        <div class="set-row"><div class="grow"><b>Backup</b><div class="muted small">Salva o ripristina tutti i dati</div></div><button class="btn btn-soft btn-sm" data-a="export">Esporta</button><button class="btn btn-soft btn-sm" data-a="importSheet">Importa</button></div>
      </div>
      ${S.history.length ? `<div class="sec-title">📒 Settimane passate</div><div class="group">${S.history.slice(-8).reverse().map(h => `<div class="item"><div class="grow"><div class="nm">${rangeLabel(h.start)}</div><div class="left">${h.meals} pasti · stima ${eur(h.cassa)}</div></div><b class="num">${h.spent ? eur(h.spent) : '—'}</b></div>`).join('')}</div>` : ''}
      ${NATIVE && NATIVE.appVersion ? `<div class="card"><div class="set-row"><div class="grow"><b>📦 Versione ${esc(appVer().name || '')}</b><div class="muted small">${upd ? `disponibile la ${esc(upd.name)}` : 'gli aggiornamenti arrivano da soli: ti avviso quando esce una versione nuova'}</div></div>${upd ? '<button class="btn btn-green btn-sm" data-a="doUpdate">Aggiorna</button>' : '<button class="btn btn-soft btn-sm" data-a="checkUpd">Controlla</button>'}</div></div>` : ''}
      <p class="muted small" style="text-align:center">Schiscetta · ${ALL.length} piatti · ${Object.keys(ING).length} ingredienti · dati del ${esc(D.built)}</p>`;
  },
  pronti() {
    return `<div class="sheet-h"><h2>🥫 Cose già pronte</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted small" style="margin-top:0">Se una cosa pronta non la compri, non ti propongo le ricette che la usano. Le altre restano.</p>
      <div class="group">${prontiHTML()}</div>`;
  },
  importSheet() {
    return `<div class="sheet-h"><h2>Importa backup</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="muted">Incolla qui il testo del backup esportato. Sostituisce i dati attuali.</p>
      <textarea id="imp-in" rows="8" placeholder='{"v":1,…}'></textarea>
      <button class="btn btn-primary btn-block" style="margin-top:12px" data-a="doImport">Importa</button>`;
  }
};
function profileCard(pid) {
  const per = pid && pid !== 'p1' ? personOf(pid) : null, P = pid ? ` data-p="${pid}"` : '';
  const p = prof(per), [p1, p2] = protRange(per);
  const num = (f, v, min, max, u) => `<div class="set-row"><div class="grow"><b>${{ age: 'Età', h: 'Altezza', w: 'Peso' }[f]}</b></div><input type="number" inputmode="numeric" min="${min}" max="${max}" value="${v}" data-ch="prof" data-f="${f}"${P} style="width:90px;text-align:right"> <span class="muted small" style="width:24px">${u}</span></div>`;
  return `<div class="card">
    <div class="set-row" data-a="profOn"${P}><div class="grow"><b>🔥 Calorie e porzioni</b><div class="muted small">porzioni adatte ${per ? 'a ' + esc(per.name) : 'a te'} e kcal di ogni pasto</div></div><span class="toggle${p.on ? ' on' : ''}"></span></div>
    ${p.on ? `<div class="set-row"><div class="seg" style="width:100%;justify-content:space-between">${Object.entries(GOALS).map(([k, [, n]]) => `<button class="${p.goal === k ? 'on' : ''}" data-a="profSet" data-f="goal" data-v="${k}"${P}>${n.split(' ')[0]}</button>`).join('')}</div></div>
      <div class="set-row"><div class="grow"><b>Sesso</b></div><div class="seg">${[['m', 'Uomo'], ['f', 'Donna']].map(([k, n]) => `<button class="${p.sex === k ? 'on' : ''}" data-a="profSet" data-f="sex" data-v="${k}"${P}>${n}</button>`).join('')}</div></div>
      ${num('age', p.age, 14, 99, 'anni')}${num('h', p.h, 120, 230, 'cm')}${num('w', p.w, 35, 250, 'kg')}
      <div class="set-row"><div class="grow"><b>Colazione e spuntini</b><div class="muted small">quanto mangi fuori da pranzo e cena</div></div><div class="seg">${Object.entries(BREAKFAST).map(([k, [, n]]) => `<button class="${p.colaz === k ? 'on' : ''}" data-a="profSet" data-f="colaz" data-v="${k}"${P}>${n}</button>`).join('')}</div></div>
      <div class="set-row"><div class="grow"><b>Kcal a pasto</b><div class="muted small">vuoto = calcolo automatico (${kc(Math.round(dayTarget(per) * BREAKFAST[p.colaz][0] / 10) * 10)})</div></div><input type="number" inputmode="numeric" min="0" max="3000" step="50" placeholder="auto" value="${p.mealKcal || ''}" data-ch="profKcal"${P} style="width:90px;text-align:right"> <span class="muted small" style="width:24px">kcal</span></div>
      <div class="set-row"><div class="grow"><b>Attività</b></div><select data-ch="prof" data-f="act"${P} style="max-width:190px">${ACTS.map(([v, n]) => `<option value="${v}"${p.act === v ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="set-row" data-a="profComp"${P}><div class="grow"><b>Complementi nella spesa</b><div class="muted small">pane, frutta, yogurt, frutta secca per arrivare alle kcal del pasto</div></div><span class="toggle${p.comp ? ' on' : ''}"></span></div>
      <p class="muted small" style="margin:8px 2px 2px">${per ? esc(per.name) + ': servono' : 'Ti servono'} circa <b>${kc(dayTarget(per))} kcal al giorno</b> (${GOALS[p.goal][1].toLowerCase()}${p.goal === 'gain' ? ': +400 kcal, circa 0,3–0,5 kg al mese' : p.goal === 'lose' ? ': −400 kcal' : ''}). Pranzo e cena: circa <b>${kc(mealTarget(per))} kcal</b> l'uno${p.mealKcal ? ' (scelto da te)' : ''}; il resto a colazione e negli spuntini. Proteine: ${p1}–${p2} g al giorno se ti alleni. La porzione del piatto va dal 90% al 150% della dose della ricetta (es. pasta fino a 150 g), poi aggiungo i complementi: pane, frutta, yogurt, frutta secca, mozzarella. Valori indicativi, non sostituiscono un nutrizionista.</p>` : ''}
  </div>`;
}
function stepper(f, v, min) {
  return `<div class="stepper"><button data-a="stp" data-f="${f}" data-d="-1" ${v <= min ? 'disabled style="opacity:.4"' : ''}>−</button><b>${v}</b><button data-a="stp" data-f="${f}" data-d="1" ${v >= 8 ? 'disabled style="opacity:.4"' : ''}>+</button></div>`;
}
function marketGrid(action) {
  return `<div class="mk-grid">${D.supermercati.map(m => {
    const pc = Math.round((m.idx / D.baseIdx - 1) * 100);
    return `<button class="tile${S.market === m.id ? ' on' : ''}" data-a="${action}" data-id="${m.id}"><span class="logo" style="background:${m.c}">${esc(m.n[0])}</span><div class="grow"><div class="nm">${esc(m.n)}</div><div class="muted small">${m.id === 'altro' ? 'prezzi medi' : pc === 0 ? 'nella media' : (pc > 0 ? '+' : '−') + Math.abs(pc) + '% sui prezzi'}${m.discount ? ' · discount' : ''}</div>${(D.feedUrls && D.feedUrls[m.id]) || (PHONE_MARKETS[m.id] && hasNativeHttp()) ? '<span class="badge green" style="margin-top:4px">🏷️ prezzi veri</span>' : ''}</div></button>`;
  }).join('')}</div>`;
}
function renderSheet() {
  let el = $('#sheet');
  const top = ui.sheets[ui.sheets.length - 1];
  if (!top) { scanStop(); if (el) el.remove(); document.body.style.overflow = ''; return; }
  const fresh = !el;
  if (fresh) {
    el = document.createElement('div'); el.id = 'sheet'; el.className = 'sheet';
    el.innerHTML = '<div class="sheet-bg" data-a="close"></div><div class="sheet-panel"></div>';
    document.body.appendChild(el);
  }
  const panel = el.querySelector('.sheet-panel');
  const same = panel.dataset.sig === top.sig, sc = panel.scrollTop;
  panel.className = 'sheet-panel' + (top.full ? ' full' : '');
  panel.innerHTML = '<div class="grab"></div>' + SHEETS[top.type](top);
  if (!same && !fresh) { panel.style.animation = 'none'; void panel.offsetHeight; panel.style.animation = ''; }
  panel.dataset.sig = top.sig;
  panel.scrollTop = same ? sc : 0;
  document.body.style.overflow = 'hidden';
  if (top.type === 'scan') { if (scan) scanAttach(); else scanStart(); } else scanStop();     // fotocamera accesa solo nello scanner
}
let sheetSeq = 0;
function openSheet(type, args = {}) {
  ui.sheets.push({ type, ...args, sig: type + ':' + (++sheetSeq), full: ['pick', 'settings', 'editor', 'ingPick', 'products', 'spSearch', 'allergy'].includes(type) });
  renderSheet();
}
function closeSheet() { ui.sheets.pop(); renderSheet(); }

/* ---------------- onboarding ---------------- */
function renderOnb() {
  const s = ui.onb, dots = `<div class="dots">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i === s ? 'on' : ''}"></i>`).join('')}</div>`;
  if (s === 0) return `<div class="onb"><div class="art">🍱</div><h1>Ciao! Questa è Schiscetta.</h1><p class="lead">Il menu della settimana, la spesa giusta e cosa cucinare ogni sera.</p>
    <div class="feat"><div class="emo cat-primo">📅</div><div><b>Scegli pranzo e cena</b><span class="muted">tra ${D.piatti.length} piatti facili, o lascia che il menu lo componga io</span></div></div>
    <div class="feat"><div class="emo cat-secondo">🛒</div><div><b>Lista della spesa con i costi</b><span class="muted">quantità da comprare, confezioni e prezzi del tuo supermercato</span></div></div>
    <div class="feat"><div class="emo cat-unico">🌙</div><div><b>Ogni sera, passo passo</b><span class="muted">la cena di oggi e la schiscetta per domani, con i timer</span></div></div>
    <div class="foot">${dots}<button class="btn btn-primary btn-block" data-a="onb" data-d="1">Iniziamo</button></div></div>`;
  if (s === 1) return `<div class="onb"><h1>Dove fai la spesa?</h1><p class="lead">Adatto i prezzi alla catena. Puoi cambiarla quando vuoi.</p>${marketGrid('onbMarket')}
    <div class="foot">${dots}<button class="btn btn-primary btn-block" data-a="onb" data-d="1">Avanti</button><button class="btn btn-ghost" data-a="onb" data-d="-1">Indietro</button></div></div>`;
  if (s === 2) return `<div class="onb"><h1>Per quanti cucini?</h1><p class="lead">Le dosi e la lista si adattano da sole.</p>
    <div class="card"><div class="set-row"><div class="grow"><b>🌙 Persone a cena</b></div>${stepper('pc', S.pc, 1)}</div>
    <div class="set-row"><div class="grow"><b>🍱 Schiscette a pranzo</b><div class="muted small">quante ne prepari ogni sera per il giorno dopo</div></div>${stepper('pp', S.pp, 0)}</div></div>
    <div class="foot">${dots}<button class="btn btn-primary btn-block" data-a="onb" data-d="1">Avanti</button><button class="btn btn-ghost" data-a="onb" data-d="-1">Indietro</button></div></div>`;
  if (s === 3) return `<div class="onb"><h1>Il tuo profilo</h1><p class="lead">Per porzioni e calorie adatte a te. Se non ti interessa, spegnilo: puoi sempre cambiarlo nelle impostazioni.</p>
    ${profileCard()}
    <div class="foot">${dots}<button class="btn btn-primary btn-block" data-a="onb" data-d="1">Avanti</button><button class="btn btn-ghost" data-a="onb" data-d="-1">Indietro</button></div></div>`;
  if (s === 4) return `<div class="onb"><h1>Come ti organizzi?</h1><p class="lead">Due domande veloci. Puoi cambiare tutto nelle impostazioni.</p>
    <div class="sec-title">Il menu</div><div class="group">${styleHTML()}</div>
    <div class="sec-title">Cose già pronte: le compri?</div><div class="group">${prontiHTML()}</div>
    <p class="muted small">Se dici «No», non ti propongo le ricette che le usano (niente gnocchi pronti, per esempio).</p>
    <div class="foot">${dots}<button class="btn btn-primary btn-block" data-a="onb" data-d="1">Avanti</button><button class="btn btn-ghost" data-a="onb" data-d="-1">Indietro</button></div></div>`;
  return `<div class="onb"><h1>Da quando parte il menu?</h1><p class="lead">Fai la spesa il giorno prima: quella sera prepari anche la prima schiscetta.</p>
    <input type="date" id="onb-date" value="${S.week.start}">
    <div class="foot">${dots}<button class="btn btn-primary btn-block" data-a="onbDone" data-auto="1">✨ Componi tu il menu</button><button class="btn btn-soft btn-block" data-a="onbDone">Scelgo io i piatti</button><button class="btn btn-ghost" data-a="onb" data-d="-1">Indietro</button></div></div>`;
}

/* ---------------- azioni ---------------- */
function rerender() { render(); }
function readDate(id) { const v = $('#' + id) && $('#' + id).value; return /^\d{4}-\d\d-\d\d$/.test(v || '') ? v : null; }
const A = {
  tab(d) { if (d.t === 'spese') { d.t = 'spesa'; ui.spTab = 'spese'; } else if (d.t === 'spesa') ui.spTab = 'lista'; if (d.t === 'dispensa' && ui.tab !== 'dispensa') ui.dpTab = 'casa'; ui.tab = d.t; ui.sheets = []; if (d.t === 'stasera') ui.eve = null; window.scrollTo(0, 0); render(); },
  close() { closeSheet(); },
  settings() { openSheet('settings'); },
  pick(d) {
    ui.pf.q = '';
    const who = kWho(d.k) && personOf(kWho(d.k));
    if (who && who.cat) ui.pf.cat = who.cat === 'veg' || FCHIPS.some(([k]) => k === who.cat) ? who.cat : 'all';
    openSheet('pick', { k: d.k });
  },
  dish(d) { openSheet('dish', { id: d.id, k: d.k }); },
  addTo(d) { openSheet('addTo', { id: d.id }); },
  setSlot(d) {
    S.week.slots[d.k] = { d: d.id }; save(); ui.sheets = [];
    toast(`${PI[d.id].e} ${esc(PI[d.id].n)} → ${slotLabel(d.k).toLowerCase()}`);
    if (ui.tab !== 'menu') ui.tab = 'menu';
    render();
  },
  setLeft(d) { S.week.slots[d.k] = { left: true }; save(); ui.sheets = []; render(); },
  setSkip(d) { S.week.slots[d.k] = { skip: true }; save(); ui.sheets = []; render(); },
  clearSlot(d) { delete S.week.slots[d.k]; save(); ui.sheets = []; render(); },
  fav(d) {
    if (S.favs[d.id]) delete S.favs[d.id]; else { S.favs[d.id] = true; delete (S.dislikes || {})[d.id]; toast('👍 Lo propongo più spesso nel menu automatico'); }
    save(); render();
  },
  dislike(d) {
    S.dislikes = S.dislikes || {};
    if (S.dislikes[d.id]) delete S.dislikes[d.id]; else { S.dislikes[d.id] = true; delete S.favs[d.id]; toast('👎 Non lo metto più nel menu automatico'); }
    save(); render();
  },
  allergySheet() { openSheet('allergy'); },
  allergyToggle(d) { S.allergie = S.allergie || {}; if (S.allergie[d.k]) delete S.allergie[d.k]; else S.allergie[d.k] = true; save(); render(); },
  noIngToggle(d) { S.noIng = S.noIng || {}; if (S.noIng[d.i]) delete S.noIng[d.i]; else S.noIng[d.i] = true; save(); render(); },
  autoSheet(d) { openSheet('auto', { redo: d.redo }); },
  menuScorte() { replanFromStock(); render();
    const nd = shopNeededDay();
    toast(nd ? `🏠 Con le tue scorte arrivi fino a ${fday(nd)}: lì serve la prossima spesa` : '🏠 Con le tue scorte fai tutta la settimana');
  },
  cookedSheet(d = {}) {
    const w = S.week, k = d.k || null, t = k ? kT(k) : (new Date().getHours() < 15 ? 'p' : 'c');
    ui.ck = { k, date: k ? addDays(w.start, kDay(k)) : TODAY, t, sel: {}, porz: 1, name: '' };
    const r = k && slotDish(w, k);
    if (d.pre && r && r.dish && !r.dish.own) {      // «l'ho cucinato con altre dosi»: parto dalle dosi del piatto, prese da «In casa»
      ckPrefill(ui.ck, ingOf(r.dish).map(([i, q]) => [i, q * slotN(k, r.dish)]));
      const nk = kT(k) === 'c' && kDay(k) < 6 ? lunchKeys(kDay(k) + 1).filter(x => (w.slots[x] || {}).left) : [];
      ui.ck.porz = Math.max(1, nOf(k) + nk.reduce((s2, x) => s2 + nOf(x), 0));
      ui.ck.name = r.dish.n;
    }
    openSheet('cooked');
  },
  ckT(d) { ckRead(); ui.ck.t = d.v; renderSheet(); },
  ckLot(d) { ckRead(); const ck = ui.ck; if (ck.sel[d.id] != null) delete ck.sel[d.id]; else { const l = S.dispensa.find(x => x.id === d.id); ck.sel[d.id] = l ? l.q : 0; } renderSheet(); },
  ckPorz(d) { ckRead(); ui.ck.porz = Math.max(1, Math.min(12, ui.ck.porz + +d.v)); renderSheet(); },
  cookedSave() {
    ckRead();
    const ck = ui.ck, tot = {}, used = [];
    for (const id in ck.sel) {
      const l = S.dispensa.find(x => x.id === id), q = Math.min(Math.max(0, +ck.sel[id] || 0), l ? l.q : 0);
      if (!l || !q) continue;
      tot[l.iid] = (tot[l.iid] || 0) + q;
      used.push({ iid: l.iid, q: Math.round(q * 100) / 100, exp: l.exp, frozen: !!l.frozen });
      l.q = Math.round((l.q - q) * 100) / 100;
    }
    if (!used.length) { toast('Scegli cosa hai usato'); return; }
    S.dispensa = S.dispensa.filter(l => l.q > (ING[l.iid].u === 'pz' ? 0.2 : 5));
    const names = Object.keys(tot).sort((a, b) => tot[b] - tot[a]).slice(0, 3).map(i => ING[i].n.toLowerCase());
    const porz = ck.porz, own = { id: Date.now().toString(36), n: (ck.name || '').trim() || names.join(', ').replace(/^./, c => c.toUpperCase()), porz,
      ing: Object.entries(tot).map(([i, q]) => [i, Math.round(q / porz * 100) / 100]) };
    if (S.week.start !== TODAY) { for (const l of S.dispensa) l.wk = l.wk || S.week.start; A.newFrom({ d: TODAY, quiet: true }); }
    const w = S.week, d0 = Math.max(0, diffDays(ck.date, w.start)), keys = [];
    for (let d = 0; d < 7; d++) for (const k of dayKeys(d)) keys.push(k);
    const at = ck.t === 'p' ? (lunchKeys(d0)[0] || d0 + 'p') : d0 + 'c';
    if (d0 === 0 && ck.t === 'c') for (const k of lunchKeys(0)) if (!(w.slots[k] && w.slots[k].own)) w.slots[k] = { skip: true };     // il pranzo di oggi è già passato: non conta più per la spesa
    w.slots[at] = { own };
    let left = porz - Math.max(1, nOf(at));
    for (const k of keys.slice(keys.indexOf(at) + 1)) {                 // le porzioni avanzate: nei prossimi pasti
      if (left < 0.75) break;
      if (w.slots[k] && (w.slots[k].skip || w.slots[k].own)) continue;
      w.slots[k] = { own }; left -= Math.max(1, nOf(k));
    }
    (S.diario = S.diario || []).unshift({ id: own.id, date: ck.date, t: ck.t, n: own.n, porz, used, own: own.id,
      kcal: Math.round(own.ing.reduce((s2, [i, q]) => s2 + ((ingNut(i, q) || [0])[0]), 0)) });
    replanFromStock({ keep: true }); ui.sheets = []; render();
    toast(`🍳 Segnato: ${esc(own.n)}${porz > 1 ? ` (${porz} porzioni)` : ''}. I prossimi giorni li ho adattati a quello che ti resta`);
  },
  cookedAsIs(d) {        // cucinato come da ricetta: il menu lo prevedeva già, va solo nella cronologia
    const w = S.week, r = slotDish(w, d.k);
    if (!r || !r.dish) return;
    const n = slotN(d.k, r.dish);
    (S.diario = S.diario || []).unshift({ id: Date.now().toString(36), date: addDays(w.start, kDay(d.k)), t: kT(d.k), n: r.dish.n, porz: nOf(d.k), dish: r.dish.id, plan: true,
      used: ingOf(r.dish).filter(([, q]) => q > 0).map(([i, q]) => ({ iid: i, q: Math.round(q * n * 100) / 100 })), kcal: Math.round(mealNut(r.dish, S.people[0]).k) });
    save(); ui.sheets = []; render(); toast(`✅ ${esc(r.dish.n)}: segnato nella cronologia`);
  },
  diaryUndo(d) {
    const e = (S.diario || []).find(x => x.id === d.id);
    if (!e) return;
    S.diario = S.diario.filter(x => x !== e);
    if (e.own) {
      for (const u of e.used) {           // torna «In casa» quello che avevi segnato come usato
        const l = (S.dispensa || []).find(x => x.iid === u.iid && x.exp === u.exp);
        if (l) l.q = Math.round((l.q + u.q) * 100) / 100;
        else (S.dispensa = S.dispensa || []).push(Object.assign({ id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), iid: u.iid, q: u.q, exp: u.exp, wk: S.week.start }, u.frozen ? { frozen: true } : {}));
      }
      for (const k in S.week.slots) if ((S.week.slots[k] || {}).own && S.week.slots[k].own.id === e.own) delete S.week.slots[k];
      replanFromStock({ keep: true });
    }
    save();
    if (!d.quiet) { ui.sheets = []; render(); toast('↩️ Annullato: è tutto come prima'); }
  },
  diaryEdit(d) {        // correggi: rimetto tutto com'era e riapro la scheda con le dosi di prima
    const e = (S.diario || []).find(x => x.id === d.id);
    if (!e) return;
    A.diaryUndo({ id: e.id, quiet: true });
    const dd = diffDays(e.date, S.week.start), k = dd >= 0 && dd < 7 ? (e.t === 'p' ? (lunchKeys(dd)[0] || dd + 'p') : dd + 'c') : null;
    ui.sheets = []; render();
    A.cookedSheet({ k });
    ui.ck.date = e.date >= TODAY ? e.date : TODAY; ui.ck.t = e.t;
    ckPrefill(ui.ck, e.used.map(u => [u.iid, u.q])); ui.ck.porz = e.porz; ui.ck.name = e.n;
    renderSheet();
  },
  mealSheet(d) { openSheet('meal', { k: d.k }); },
  mealSkip(d) { const s2 = S.week.slots[d.k]; if (s2 && s2.skip) delete S.week.slots[d.k]; else S.week.slots[d.k] = { skip: true }; save(); ui.sheets = []; render(); },
  menuMore() { openSheet('menuMore'); },
  poolSheet(d) { openSheet('poolSheet', { k: d.k }); },
  poolPick(d) { openSheet('poolPick', { k: d.k }); },
  poolUse(d) {
    const w = S.week, rb = slotDish(w, d.to), p = (slotDish(w, d.k) || {}).dish;
    if (!p) return;
    w.slots = slotsSwapped(w, d.k, d.to);
    if (!rb || !rb.dish) delete w.slots[d.k];       // il pasto di oggi era vuoto o saltato: il piatto si sposta e basta
    for (const k in w.slots) if (w.slots[k] === undefined) delete w.slots[k];
    save(); ui.sheets = []; render();
    toast(`👍 ${esc(slotLabel(d.to))}: ${esc(p.n)}`);
  },
  menuView() { S.menuList = !S.menuList; save(); render(); },
  spTab(d) { ui.spTab = d.v; window.scrollTo(0, 0); render(); },
  dpTab(d) { ui.dpTab = d.v; window.scrollTo(0, 0); render(); },
  pbase(d, el, ev) {
    if (ev) ev.stopPropagation();
    S.pantry = S.pantry || {};
    const v = d.v === 'ok';
    if (S.pantry[d.i] === v) delete S.pantry[d.i]; else S.pantry[d.i] = v;
    save(); render();
  },
  spesaAddSheet(d) { openSheet('spesaAdd', { id: d && d.id }); },
  spesaAdd(d) {
    const v = n => ($(`[data-sa=${n}]`) || {}).value || '', spent = parseFloat(v('eur').replace(',', '.'));
    if (!(spent > 0)) { toast('Scrivi quanto hai speso'); return; }
    const x = d && d.id && (S.spese || []).find(y => y.id === d.id);
    if (x) {
      Object.assign(x, { date: v('date') || x.date, spent: Math.round(spent * 100) / 100, store: v('store').trim() || x.store, recovered: false });
      S.spese.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      save(); ui.sheets = []; render(); toast(`🧾 Spesa aggiornata: ${eur(spent)}`); return;
    }
    addSpesa({ date: v('date') || TODAY, spent: Math.round(spent * 100) / 100, store: v('store').trim() || SM[S.market].n, fonte: 'spesa' });
    save(); ui.sheets = []; render(); toast(`🧾 Spesa aggiunta: ${eur(spent)}`);
  },
  autofill(d) {
    const mode = (d && d.m) || 'equilibrato';
    if (d && d.redo) { for (const k in S.week.slots) delete S.week.slots[k]; S.week.sfizi = {}; }
    const n = emptyKeys().length; autofill(mode); save(); ui.sheets = []; render();
    toast(`${MODES[mode][0]} Ho scelto ${n} pasti: menu ${MODES[mode][1].toLowerCase()}`);
  },
  clearAsk() { openSheet('clear'); },
  saveMenuSheet() { openSheet('saveMenu'); },
  savedSheet() { openSheet('saved'); },
  saveMenu(d) {
    const name = ($('#menu-name').value || '').trim();
    if (!d.id && !name) { toast('Dai un nome al menu'); return; }
    S.saved = S.saved || [];
    let x = d.id && S.saved.find(m => m.id === d.id);
    if (!x) { x = { id: 'm' + Date.now().toString(36), created: TODAY }; S.saved.push(x); }
    Object.assign(x, { name: name || x.name, slots: JSON.parse(JSON.stringify(S.week.slots)), sfizi: JSON.parse(JSON.stringify(S.week.sfizi || {})), used: S.week.start });
    S.week.from = x.id;
    save(); ui.sheets = []; render(); toast(`💾 Salvato: ${esc(x.name)}`);
  },
  useMenu(d) {
    const x = (S.saved || []).find(m => m.id === d.id);
    if (!x) return;
    const start = S.week.start;
    S.week = newWeek(start);
    Object.assign(S.week, { slots: JSON.parse(JSON.stringify(x.slots)), sfizi: JSON.parse(JSON.stringify(x.sfizi || {})), from: x.id });
    x.used = start;
    save(); ui.sheets = []; ui.tab = 'menu'; render(); toast(`📂 ${esc(x.name)}: menu della settimana del ${fdate(start, { day: 'numeric', month: 'long' })}`);
  },
  delMenu(d) { S.saved = (S.saved || []).filter(m => m.id !== d.id); save(); render(); },
  clear() { S.week = newWeek(S.week.start); save(); ui.sheets = []; render(); },
  weekSheet() { openSheet('week'); },
  setWeek() { const v = readDate('week-in'); if (v) { S.week.start = v; save(); } ui.sheets = []; render(); },
  pf(d) { ui.pf.cat = d.c; render(); },
  psort(d) { ui.pf.sort = d.s; render(); },
  pall() { ui.pf.all = !ui.pf.all; render(); },
  cf(d) { ui.cf.cat = d.c; render(); },
  check(d) { const ck = chk(); if (ck[d.i]) delete ck[d.i]; else ck[d.i] = true; save(); render(); },
  repAll() {
    const reps = D.reparti.map(r => r.id), all = reps.every(r => (ui.openRep || {})[r]);
    ui.openRep = Object.fromEntries(reps.map(r => [r, !all])); render();
  },
  repToggle(d) { ui.openRep = ui.openRep || {}; ui.openRep[d.r] = !ui.openRep[d.r]; render(); },
  winDays(d) { S.week.win = Object.assign(shopWin(), { days: +d.v }); save(); render(); },
  winFrom(d) { S.week.win = Object.assign(shopWin(), { from: +d.v }); save(); render(); },
  winNext() { const x = shopWin(); S.week.win = Object.assign(x, { from: Math.min(6, x.from + x.days) }); save(); render(); window.scrollTo(0, 0); },
  pantry(d) { S.pantry[d.i] = S.pantry[d.i] === false; save(); render(); },
  priceSheet(d) { openSheet('price', { i: d.i, m: d.m, dq: d.dq, dt: d.dt, dn: d.dn }); },
  spOpen(d) {
    ui.sp = { m: SP_MARKETS.includes(S.market) ? S.market : 'esselunga' };
    openSheet('spSearch', { mode: d.mode, k: d.k });
    if (d.mode === 'brand') {          // parto già cercando l'ingrediente
      const q = ING[d.k].n.replace(/\(.*?\)/g, '').trim();
      const el = $('input[data-in=spq]'); if (el) el.value = q;
      spSearch(q);
    }
  },
  spM(d) { ui.sp.m = d.m; renderSheet(); if (ui.sp.q) spSearch(ui.sp.q); },
  spQuick(d) { const el = $('input[data-in=spq]'); if (el) el.value = d.q; spSearch(d.q); },
  spSort(d) { const st = d.p === 'exPick' ? ui.ex : ui.sp; st.sort = d.s; d.p === 'exPick' ? exSugUpd() : spListUpd(); },
  spMore() { const st = ui.sp; st.shown = (st.shown || SP_PAGE) + SP_PAGE; spListUpd(); spLoadPrices(st, () => { if (ui.sp === st) spListUpd(); }); },
  exMore() { const st = ui.ex; st.shown = (st.shown || SP_PAGE) + SP_PAGE; exSugUpd(); spLoadPrices(st, () => { if (ui.ex === st) exSugUpd(); }); },
  exM(d) { ui.ex.m = d.m; exSearch(ui.ex.q); },
  async exPick(d) {
    const st = ui.ex, r = st.res[+d.k];
    try {
      const pr = r.pr && !r.pr.err ? r.pr : (r.pr = await spGet(`prodotto.php?m=${st.m}&c=${encodeURIComponent(r.c)}`));
      exAddProduct(st, pr);
    } catch (e) { toast('Prezzo non disponibile per questo prodotto: scegline un altro'); }
  },
  async spPick(d) {
    const st = ui.sp, r = st.res[+d.k], top = ui.sheets[ui.sheets.length - 1];
    try {
      let pr = r.pr && !r.pr.err ? r.pr : null;
      if (!pr) { st.busy = 'Leggo il prezzo…'; $('#sp-list').innerHTML = spListHTML(); pr = r.pr = await spGet(`prodotto.php?m=${st.m}&c=${encodeURIComponent(r.c)}`); }
      st.busy = '';
      if (top.mode === 'brand') {        // la marca scelta diventa il prezzo di questo ingrediente nel tuo supermercato
        const iid = top.k, v = spIngPrice(iid, pr), m = S.market;
        if (!v) throw new Error('formato non confrontabile con l\'ingrediente');
        (S.prices[m] = S.prices[m] || {})[iid] = v;
        ((S.brandNote = S.brandNote || {})[m] = S.brandNote[m] || {})[iid] = pr.n + (st.m !== m ? ` (prezzo ${SM[st.m].n})` : '');
        save(); ui.sheets.pop(); render();
        toast(`${ING[iid].e} ${esc(pr.n)}: ${eur(v)}`);
        return;
      }
      if (top.mode === 'extra') {        // prodotto per la casa o per te: va nella lista con il suo prezzo
        ui.sheets = []; exAddProduct(st, pr);
        return;
      }
      const ing = spIngredient(pr);
      if (top.mode === 'sfizio') {
        const q = ing.link.one || (ing.u === 'pz' ? 1 : ing.conf);
        (S.week.sfizi[top.k] = S.week.sfizi[top.k] || []).push({ i: ing.id, q });
        save(); ui.sheets = []; render();
        toast(`${ing.e} ${esc(ing.n)} aggiunto · ${eur3(q * unitCost(ing.id))} a persona`);
      } else {
        ui.sheets.pop();                         // chiude la ricerca
        A.edPickIng({ i: ing.id });              // lo aggiunge alla ricetta e chiude la scelta ingredienti
        toast(`${ing.e} ${esc(ing.n)}: ${eur(price(ing.id))}`);
      }
    } catch (e) { st.busy = ''; st.err = 'Prezzo non disponibile: ' + e.message; $('#sp-list').innerHTML = spListHTML(); }
  },
  sfOpen(d) { ui.sv = null; openSheet('sfizio', { k: d.k, j: d.j }); },
  sfStep(d) {
    const top = ui.sheets[ui.sheets.length - 1], x = S.week.sfizi[top.k][+top.j];
    ui.sv = Math.max(0, Math.round(((ui.sv != null ? ui.sv : x.q) + +d.v) * 100) / 100); renderSheet();
  },
  sfSave(d) { const x = S.week.sfizi[d.k][+d.j]; if (ui.sv != null) x.q = ui.sv; ui.sv = null; save(); ui.sheets = []; render(); },
  sfDel(d) { S.week.sfizi[d.k].splice(+d.j, 1); ui.sv = null; save(); ui.sheets = []; render(); toast('Sfizio tolto'); },
  qtySheet(d, el, ev) { ev.stopPropagation(); ui.qv = null; openSheet('qty', { d: d.d, i: d.i }); },
  qtyStep(d) {
    const top = ui.sheets[ui.sheets.length - 1], p = PI[top.d], base = (p.ing.find(([i]) => i === top.i) || [])[1] || 0;
    const cur = ui.qv != null ? ui.qv : effQ(p, top.i, base);
    ui.qv = Math.max(0, Math.round((cur + +d.v) * 100) / 100); renderSheet();
  },
  qtySave(d) {
    const p = PI[d.d], base = (p.ing.find(([i]) => i === d.i) || [])[1] || 0;
    const v = ui.qv != null ? ui.qv : effQ(p, d.i, base);
    if (d.all) { S.qmul[d.i] = base ? v / base : 1; for (const k in S.qty) delete S.qty[k][d.i]; }
    else (S.qty[d.d] = S.qty[d.d] || {})[d.i] = v;
    ui.qv = null; save(); closeSheet(); render();
    toast(d.all ? `${ING[d.i].e} ${esc(ING[d.i].n)}: nuove dosi in tutte le ricette` : `${ING[d.i].e} ${fq(d.i, v)} a persona in questa ricetta`);
  },
  qtyReset(d) {
    if (S.qty[d.d]) delete S.qty[d.d][d.i];
    delete S.qmul[d.i];
    ui.qv = null; save(); closeSheet(); render(); toast('Dosi della ricetta ripristinate');
  },
  storeBrand() { S.storeBrand = S.storeBrand === false; save(); render(); },
  productsSheet() { ui.prodQ = ''; openSheet('products'); },
  prodM(d) { ui.prodM = d.m; renderSheet(); },
  prodReset(d) { if (S.choice[d.m]) delete S.choice[d.m]; save(); renderSheet(); render(); toast('Tutti i prodotti tornano in automatico'); },
  savePrice(d) {
    const v = parseFloat(String($('#price-in').value).replace(',', '.'));
    if (isFinite(v) && v >= 0) { (S.prices[S.market] = S.prices[S.market] || {})[d.i] = Math.round(v * 100) / 100; save(); toast('Prezzo salvato'); }
    closeSheet(); render();
  },
  pickOpt(d) {
    const mk = d.m || S.market, m = (S.choice[mk] = S.choice[mk] || {});
    if (d.c) m[d.i] = d.c; else delete m[d.i];
    if (S.prices[mk]) delete S.prices[mk][d.i];      // il prodotto scelto vince sul prezzo scritto a mano
    save(); closeSheet(); render();
    const o = chosenOpt(d.i, mk);
    toast(d.c && o ? `⭐ ${esc(o.n)}: ${eur(o.p)}` : 'Prodotto automatico');
  },
  resetPrice(d) { if (S.prices[S.market]) delete S.prices[S.market][d.i]; save(); closeSheet(); render(); },
  resetPrices() { S.prices = {}; save(); render(); toast('Prezzi tornati alle stime'); },
  marketSheet() { openSheet('market'); },
  setMarket(d) { S.market = d.id; save(); closeSheet(); render(); toast(`Prezzi di ${esc(SM[d.id].n)}`); },
  feedNow() { refreshAll(true); },
  conadStore() { toast('Scegli «Ordina e ritira», poi il negozio, poi «Conferma il negozio». Infine tocca «Fatto».'); Native.conadStore(); },
  receiptSheet() { ui.rc = { state: 'idle' }; openSheet('receipt'); },
  saveKey() { const v = ($('#key-in').value || '').trim(); if (v) { S.apiKey = v; save(); } renderSheet(); },
  rcSel(d) { const s = ui.rc.sel; if (s[d.k]) delete s[d.k]; else s[d.k] = true; renderSheet(); },
  rcTotal() { ui.rc.total = !ui.rc.total; renderSheet(); },
  noop() {},
  swapSheet(d) { openSheet('swap', { k: d.k }); },
  swapDo(d) {
    if (!swapOk(d.k, d.a2)) return;
    const a = slotDish(S.week, d.k).dish.n, b = slotDish(S.week, d.a2).dish.n;
    S.week.slots = slotsSwapped(S.week, d.k, d.a2);
    save(); ui.sheets = []; render();
    toast(`🔁 ${esc(b)} ↔ ${esc(a)}`);
  },
  rcFix(d, el, ev) { ev && ev.stopPropagation(); ui.rfq = ''; openSheet('rcFix', { k: +d.k }); },
  rcSet(d) {
    const rc = ui.rc, k = +d.k, r = rc.res.righe[k];
    r.ingrediente = d.i || '';
    if (!r.peso_confezione || rc.ups[k] && rc.ups[k].est) r.peso_confezione = 0;
    const u = d.i ? receiptPrice(r) : null;
    rc.ups[k] = u;
    if (u && u.est) r.peso_confezione = u.est / (+r.quantita || 1);
    if (u) rc.sel[k] = true; else delete rc.sel[k];
    ui.sheets.pop(); renderSheet();
  },
  rcHome(d) { ui.rc.home = d.v === 'no' ? false : d.v; renderSheet(); },
  rcApply() {
    const rc = ui.rc, mk = S.market, m = (S.prices[mk] = S.prices[mk] || {});
    const ch = (S.choice[mk] = S.choice[mk] || {}), notes = ((S.brandNote = S.brandNote || {})[mk] = (S.brandNote || {})[mk] || {});
    let n = 0, nb = 0;
    for (const k in rc.sel) {
      const u = rc.ups[k];
      if (!u) continue;
      n++;
      if (u.p == null) { n--; continue; }       // solo quantità (peso stimato), niente prezzo
      if (u.opt) { ch[u.iid] = u.opt.c; delete m[u.iid]; delete notes[u.iid]; nb++; }
      else { m[u.iid] = u.p; if (u.brand) { notes[u.iid] = u.brand; nb++; } }
    }
    const trNow = (S.week.trips || {})[tripKey()];
    if (rc.total && rc.res.totale > 0 && trNow) receiptTotal(rc.res.totale, rc.res.data);
    else if (rc.res.totale > 0) {        // senza «Ho fatto la spesa» lo scontrino entra lo stesso nelle spese fatte
      const rows = rc.res.righe || [];
      addSpesa({ date: rcDate(rc.res.data), spent: Math.round(rc.res.totale * 100) / 100, store: rc.res.negozio || SM[mk].n, fonte: 'scontrino',
        items: rows.filter(r => ING[r.ingrediente]).map(r => [r.ingrediente, r.quantita || 1, Math.round(receiptQty(r) || 0), r.importo || 0]),
        extras: rows.filter(r => !ING[r.ingrediente]).map(r => [r.testo, r.importo || 0]) });
    }
    const mode = rc.home === false ? 'no' : rc.home || 'tutto';
    let nh = 0;
    if (mode === 'tutto') { nh = receiptAll(rc.res); ui.sheets = []; ui.tab = 'menu'; save(); render(); toast(`🏠 ${nh} prodotti in casa: menu nuovo da oggi con quello che hai comprato`); return; }
    if (mode === 'avanzi') nh = receiptHome(rc.res);
    save(); ui.sheets = []; render();
    toast((n ? `🧾 Aggiornati ${n} prezzi${nb ? ` e ${nb} ${nb === 1 ? 'marca' : 'marche'}` : ''} di ${esc(SM[mk].n)}` : 'Scontrino letto') + (nh ? ` · 🏠 ${nh} avanzi in casa per i giorni dopo` : ''));
  },
  onbMarket(d) { S.market = d.id; render(); },
  walletYes(d) {
    const it = walletItems().find(x => x.pay === d.pay);
    ui.sheets = ui.sheets.filter(s => s.type !== 'wallet');
    if (it) { walletApply(it, d.how); render(); toast(`🛒 Spesa segnata: ${eur((S.week.trips[tripKey()] || {}).spent || it.totale)}`, ['Annulla', 'undoShop']); }
    walletCheck();
  },
  walletNo(d) {
    NATIVE.walletNo(d.pay);
    ui.sheets = ui.sheets.filter(s => s.type !== 'wallet'); render();
    walletCheck();
  },
  walletSettings() { NATIVE.walletSettings(); },
  doUpdate() {
    if (!upd) return;
    if (!NATIVE.canInstall()) {      // la prima volta Android chiede il permesso di installare aggiornamenti
      toast('Permetti a Schiscetta di installare app, poi torna qui e tocca di nuovo «Aggiorna»');
      NATIVE.allowInstall();
      return;
    }
    ui.updating = true; render();
    NATIVE.update(upd.url);
  },
  checkUpd() { checkUpdate(true); },
  spesaInfo(d) { openSheet('spesaInfo', { id: d.id }); },
  prontiSet(d, el, ev) {
    if (ev) ev.stopPropagation();
    S.pronti = S.pronti || {};
    if (d.v === 'no') S.pronti[d.k] = false; else delete S.pronti[d.k];
    save(); render();
    if (S.setup) toast(d.v === 'no' ? `${PRONTI_CAT[d.k][0]} Niente ${PRONTI_CAT[d.k][1].toLowerCase()}: ${ALL.filter(blocked).length} ricette escluse` : `${PRONTI_CAT[d.k][0]} ${PRONTI_CAT[d.k][1]} di nuovo nel menu`);
  },
  prontiSheet() { openSheet('pronti'); },
  menuStyle(d) { S.menuStyle = d.v; S.menuList = false; save(); if (S.setup) { ui.sheets = []; ui.tab = 'menu'; } render(); },
  usesSheet(d, el, ev) { ev.stopPropagation(); openSheet('uses', { i: d.i }); },
  pcheck(d, el, ev) {
    ev.stopPropagation();
    const pc = (S.week.pcheck = S.week.pcheck || {});
    if (pc[d.i] === d.v) delete pc[d.i]; else pc[d.i] = d.v;
    if (d.v === 'ok' && S.pantry[d.i] === false) delete S.pantry[d.i];
    save(); render();
  },
  async iperalDiag() {
    if (!hasNativeHttp()) return;
    toast('🔎 Provo una ricerca su Iperal…');
    const r = await nhttp('GET', 'https://www.iperalspesaonline.it/ebsn/api/products?q=passata&page_size=3', { Accept: 'application/json' }, '');
    let info;
    try {
      const j = JSON.parse(r.text.slice(r.text.indexOf('{'))), p = ((j.data || {}).products || [])[0] || {};
      const keep = Object.fromEntries(Object.entries(p).filter(([k, v]) => /price|promo|warehouse|avail|name|descr|tipolog|weight/i.test(k) || k === 'productInfos').map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v).slice(0, 300) : v]));
      info = { http: r.status, entrato: !!(j.user && j.user.userId > -1), prodotti: ((j.data || {}).products || []).length, campi: Object.keys(p).join(','), esempio: keep };
    } catch (e) { info = { http: r.status, errore: String(e.message), inizio: String(r.text).slice(0, 300) }; }
    const t = 'Diagnosi Iperal (Schiscetta ' + (appVer().name || '') + ')\n' + JSON.stringify(info, null, 1);
    S.iperalDiag = t; save(); render();
    if (window.Native && window.Native.share) window.Native.share(t, 'Diagnosi Iperal');
  },
  iperalOpen() { toast('Entra con il tuo account Iperal, scegli il punto vendita se te lo chiede, poi tocca «Fatto»'); window.Native.iperalOpen(); },
  iperalCart() {
    if (!S.iperalOk) { A.iperalOpen(); return; }
    const out = iperalItems();
    if (!feed('iperal')) { toast('Prima leggo i prezzi Iperal del tuo punto vendita (qualche minuto), poi riprova'); readPhoneChain('iperal', true); return; }
    if (!out.items.length) { toast('Nessun prodotto della lista trovato su Iperal: guarda «Diagnosi Iperal» nelle impostazioni'); return; }
    window.Native.iperalCart(JSON.stringify(out.items));
    if (out.miss.length) setTimeout(() => toast(`Da aggiungere a mano: ${esc(out.miss.slice(0, 6).join(', '))}${out.miss.length > 6 ? '…' : ''}`), 4000);
  },
  peopleSheet() { openSheet('people'); },
  whoSheet(d) { openSheet('who', { k: d.k }); },
  whoToggle(d) {
    const x = personOf(d.p), dd = kDay(d.k), t = kT(d.k);
    if (!x || !x[t][wdOf(dd)]) return;
    const a = ((S.week.away = S.week.away || {})[d.k] = S.week.away[d.k] || {});
    if (a[x.id]) delete a[x.id]; else a[x.id] = true;
    save(); render();
  },
  presT(d) { const x = personOf(d.p); if (!x) return; x[d.t][+d.d] = !x[d.t][+d.d]; save(); render(); },
  pLunch(d) { const x = personOf(d.p); if (!x) return; x.lunch = d.v; if (d.v !== 'sua') x.cat = null; save(); render(); },
  pCat(d) { const x = personOf(d.p); if (!x) return; x.cat = d.v || null; save(); render(); },
  pFace(d) { const x = personOf(d.p); if (!x) return; x.e = FACES[(FACES.indexOf(x.e) + 1) % FACES.length]; save(); render(); },
  pAdd() { const x = newPerson(S.people.length, true, false); S.people.push(x); save(); render(); toast(`${x.e} ${esc(x.name)}: scegli i giorni e il nome`); },
  pDel(d) {
    if (d.p === 'p1') return;
    S.people = S.people.filter(x => x.id !== d.p);
    for (const k in S.week.slots) if (kWho(k) === d.p) delete S.week.slots[k];
    save(); render();
  },
  pProf(d) { openSheet('personProf', { p: d.p }); },
  bfSheet(d) { ui.bfq = ''; openSheet('colaz', { p: d.p }); },
  bfAdd(d) {
    const x = personOf(d.p), i = ING[d.i];
    if (!x || !i) return;
    (x.colaz = x.colaz || []).push({ i: d.i, q: BF[d.i] || (i.u === 'pz' ? 1 : 50), n: 7 });
    ui.bfq = ''; save(); render(); toast(`${i.e} ${esc(i.n)} a colazione: nella spesa`);
  },
  bfDel(d) { const x = personOf(d.p); if (!x) return; x.colaz.splice(+d.j, 1); save(); render(); },
  bfTimes(d) { const x = personOf(d.p), b = x && x.colaz[+d.j]; if (!b) return; b.n = Math.max(1, Math.min(7, b.n + +d.d)); save(); render(); },
  planStep(d) { S.plan = S.plan || {}; S.plan[d.k] = Math.max(0, Math.min(7, (S.plan[d.k] || 0) + +d.d)); save(); render(); },
  lotSheet(d) { openSheet('lot', { id: d.id }); },
  scanSheet() { ui.scanned = []; ui.scq = ''; openSheet('scan'); },
  scanPick(d) { const r = (ui.scanned || [])[+d.k]; if (r) { ui.scq = ''; scanAdd(r, d.i, r.q); } },
  scanSkip(d) { (ui.scanned || []).splice(+d.k, 1); scanListUpd(); },
  scanDone() {
    const n = (ui.scanned || []).filter(r => r.state === 'ok').length;
    ui.sheets = ui.sheets.filter(x => x.type !== 'scan'); render();
    if (n) toast(`🏠 ${n} prodotti in casa`, ['Rifai il menu', 'autoSheet']);
  },
  homeAddSheet(d) { ui.ha = {}; ui.haq = ''; ui.sheets = ui.sheets.filter(x => x.type !== 'homeAdd'); openSheet('homeAdd', { m: d.m }); },
  haManual(d) {
    const v = parseFloat(String(($('#ha-' + d.i) || {}).value || '').replace(',', '.')) || ING[d.i].conf || (ING[d.i].u === 'pz' ? 1 : 100);
    addHome(d.i, v); save(); render(); toast(`🏠 ${esc(ING[d.i].n)}: ${fq(d.i, v)} in casa`);
  },
  haSel(d) { const h = ui.ha; if (h.sel[d.k]) delete h.sel[d.k]; else if (h.items[+d.k].iid) h.sel[d.k] = true; renderSheet(); },
  haApply() {
    const h = ui.ha; let n = 0;
    for (const k in h.sel) { const x = h.items[+k]; if (x.iid && x.q > 0) { addHome(x.iid, x.q); n++; } }
    ui.ha = {}; ui.sheets = []; save(); render(); toast(`🏠 ${n} prodotti in casa`);
  },
  lotSave(d) {
    const l = (S.dispensa || []).find(x => x.id === d.id), v = parseFloat(String($('#lot-q').value).replace(',', '.'));
    if (!l || !isFinite(v)) return;
    if (v <= 0) S.dispensa = S.dispensa.filter(x => x.id !== d.id); else l.q = v;
    save(); ui.sheets = []; render();
  },
  lotFreeze(d) {
    const l = (S.dispensa || []).find(x => x.id === d.id);
    if (!l) return;
    l.frozen = true; l.exp = addDays(TODAY, 90);
    save(); ui.sheets = []; render(); toast(`🧊 ${esc(ING[l.iid].n)} congelato: lo uso nei prossimi menu`);
  },
  lotDel(d) { S.dispensa = (S.dispensa || []).filter(x => x.id !== d.id); save(); ui.sheets = []; render(); toast('Tolto da «In casa»'); },
  spesaDel(d) { S.spese = (S.spese || []).filter(x => x.id !== d.id); save(); ui.sheets = []; render(); toast('Spesa tolta dallo storico'); },
  novitaOk() { S.novitaVista = NOVITA.ver; save(); render(); },
  confirmSheet(d) { openSheet('confirm', { edit: d && d.edit }); },
  undoShop() {
    const key = tripKey(), w = S.week;
    if (w.trips) delete w.trips[key];
    weekSpent();
    syncSpese();
    if (!winKey() || !Object.keys(w.trips || {}).length) { w.status = 'plan'; w.shopDate = null; }
    $('#toast').classList.remove('show', 'act');
    save(); ui.tab = 'spesa'; render(); toast('↩️ Spesa annullata: torna da fare');
  },
  doConfirm(d) {
    const v = parseFloat(String($('#spent-in').value).replace(',', '.'));
    const stima = Math.round(shopping(S.week, true).cassa * 100) / 100, old = (S.week.trips || {})[tripKey()];
    const spent = isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
    // scontrino letto prima di confermare: il suo totale (e la data) diventano quelli di questa spesa
    const pend = S.week.rcPending, fromRc = pend && spent === pend.totale;
    delete S.week.rcPending;
    S.week.trips = S.week.trips || {};
    const dIn = d && d.edit && $('#spent-date') && $('#spent-date').value;
    const key = tripKey(), date = fromRc ? pend.date : d && d.edit && old ? (/^\d{4}-\d\d-\d\d$/.test(dIn) ? dIn : old.date) : TODAY;
    const keep = d && d.edit && old && old.pay ? { pay: old.pay, negozio: old.negozio } : {};   // correzione di una spesa da Wallet
    S.week.trips[key] = Object.assign(d && d.edit && old && old.items ? { items: old.items, extras: old.extras, m: old.m } : tripSnapshot(S.week),
      { date, spent, stima, extra: spent ? Math.round((spent - stima) * 100) / 100 : null }, keep);
    weekSpent();        // con la spesa per pochi giorni sommo i giri della settimana
    if (fromRc) S.week.trips[key].fonte = 'scontrino';
    else if (d && d.edit && old && old.fonte) S.week.trips[key].fonte = old.fonte;
    syncSpese();
    S.week.status = 'cook'; S.week.shopDate = TODAY;
    try { NATIVE && NATIVE.askNotifications && NATIVE.askNotifications(); } catch (e) { /* ignora */ }
    if (d && d.edit) { save(); ui.sheets = []; render(); toast(spent ? `Importo aggiornato: ${eur(spent)}` : 'Importo tolto'); return; }
    save(); ui.sheets = []; ui.tab = 'stasera'; ui.eve = null; render();
    toast('🎉 Spesa fatta! Ecco cosa si cucina', ['Annulla', 'undoShop']);
  },
  eve(d) { ui.eve = +d.e; render(); },
  step(d, el, ev) { if (ev.target.closest('.timer-btn')) return; if (S.week.steps[d.k]) delete S.week.steps[d.k]; else S.week.steps[d.k] = true; save(); render(); },
  timer(d) { startTimer(+d.m, d.l); },
  tmClose(d) {
    const id = +d.id;
    S.timers = S.timers.filter(t => t.id !== id); save();
    try { NATIVE && NATIVE.cancelTimer && NATIVE.cancelTimer(id); } catch (e) { /* ignora */ }
    renderTimers();
  },
  eveDone() {
    S.week.done[ui.eve] = true; save(); render();
    toast('👏 Ottimo lavoro, buon appetito!');
  },
  stp(d) {
    const f = d.f, min = f === 'pc' ? 1 : 0, v = Math.max(min, Math.min(8, S[f] + +d.d));
    setCounts(f === 'pc' ? v : S.pc, f === 'pp' ? v : S.pp); save(); render();
  },
  remToggle() {
    S.reminder.on = !S.reminder.on;
    if (S.reminder.on) try { NATIVE && NATIVE.askNotifications && NATIVE.askNotifications(); } catch (e) { /* ignora */ }
    save(); render();
  },
  theme(d) { S.theme = d.v; save(); render(); },
  profOn(d) { setProf(d.p, { on: !prof(personOf(d.p)).on }); save(); render(); },
  profComp(d) { setProf(d.p, { comp: !prof(personOf(d.p)).comp }); save(); render(); },
  profSet(d) { setProf(d.p, { [d.f]: d.v }); save(); render(); },
  shareList() {
    const t = listText();
    if (NATIVE && NATIVE.share) NATIVE.share(t, 'Lista della spesa');
    else if (navigator.share) navigator.share({ text: t }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Lista copiata'));
  },
  export() {
    // solo i tuoi dati: listini, cataloghi e foto si riscaricano (con loro il testo diventava troppo lungo per «Condividi»)
    const SKIP = new Set(['feeds', 'cat', 'pimg', 'nutr', 'phoneLog', 'iperalDiag']);
    const t = JSON.stringify(Object.fromEntries(Object.entries(S).filter(([k]) => !SKIP.has(k))));
    if (NATIVE && NATIVE.share) NATIVE.share(t, 'Backup Schiscetta');
    else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Backup copiato negli appunti'));
  },
  importSheet() { openSheet('importSheet'); },
  doImport() {
    try {
      const o = JSON.parse($('#imp-in').value);
      if (!o || !o.week || !o.week.start) throw new Error('formato');
      S = Object.assign(defaults(), o); S.week = Object.assign(newWeek(o.week.start), o.week); reindex(); ensurePeople();
      save(); ui.sheets = []; render(); toast('Backup importato');
    } catch (e) { toast('Testo non valido: incolla tutto il backup'); }
  },
  newFrom(d) {          // menu nuovo dal giorno dopo l'ultima spesa (anche a metà settimana)
    const w = S.week, start = d.d, ms = meals(w).filter(m => cookDate(w, m) < start);
    S.dispensa = carryOver(w, start);
    if (ms.length) {
      S.history.push({ start: w.start, cassa: Math.round(shopping(w).cassa * 100) / 100, spent: w.spent, meals: ms.length });
      S.eaten = (S.eaten || []).concat([{ start: w.start, ids: [...new Set(ms.filter(m => !m.left).map(m => m.dish.id))], cheese: [...new Set(ms.map(m => mainCheese(m.dish)).filter(Boolean))] }]).slice(-6);
    }
    syncSpese(w);
    S.week = newWeek(start);
    save(); ui.sheets = []; ui.tab = 'menu'; render();
    if (!d.quiet) toast(`Menu nuovo da ${esc(fday(start))}: «Componi tu» usa per primo quello che hai in casa`);
  },
  newWeek(d) {
    const w = S.week, ms = meals(w);
    S.dispensa = carryOver(w, addDays(w.start, 7) < TODAY ? nextMonday() : addDays(w.start, 7));
    if (ms.length) S.history.push({ start: w.start, cassa: Math.round(shopping(w).cassa * 100) / 100, spent: w.spent, meals: ms.length });
    if (ms.length) S.eaten = (S.eaten || []).concat([{ start: w.start, ids: [...new Set(ms.filter(m => !m.left).map(m => m.dish.id))],
      cheese: [...new Set(ms.map(m => mainCheese(m.dish)).filter(Boolean))] }]).slice(-6);     // varietà e rotazione dei formaggi
    let start = addDays(w.start, 7);
    if (diffDays(start, TODAY) < 0) start = nextMonday();
    const slots = d.copy ? JSON.parse(JSON.stringify(w.slots)) : {};
    S.week = newWeek(start); S.week.slots = slots;
    save(); ui.sheets = []; ui.tab = 'menu'; render();
    toast(d.copy ? 'Menu copiato sulla nuova settimana' : 'Nuova settimana: scegli i piatti');
  },
  addExtra() {
    clearTimeout(exTimer);
    const inp = $('#extra-in'), t = inp && inp.value.trim();
    if (!t) return;
    const m = t.match(/^(.*?)\s+(\d+(?:[.,]\d{1,2})?)\s*€?$/);
    S.week.extras.push({ id: Date.now(), t: m ? m[1] : t, price: m ? parseFloat(m[2].replace(',', '.')) : 0, done: false });
    ui.ex = null; save(); render(); const n = $('#extra-in'); if (n) n.focus();
  },
  extraCheck(d, el, ev) { if (ev.target.closest('[data-a="extraDel"]')) return; const e = S.week.extras.find(x => x.id === +d.id); if (e) { e.done = !e.done; save(); render(); } },
  extraDel(d) { S.week.extras = S.week.extras.filter(x => x.id !== +d.id); save(); render(); },
  onb(d) {
    if (ui.onb === 5) { const v = readDate('onb-date'); if (v) S.week.start = v; }
    if (ui.onb === 3 && d.d > 0 && !S.profile) S.profile = prof();     // il profilo scelto (o quello di partenza) resta salvato
    ui.onb = Math.max(0, Math.min(5, ui.onb + +d.d)); render(); window.scrollTo(0, 0);
  },
  onbDone(d) {
    const v = readDate('onb-date'); if (v) S.week.start = v;
    S.setup = true;
    if (d.auto) autofill();
    save(); ui.tab = 'menu'; render();
    if (d.auto) toast('✨ Ecco un menu per iniziare: tocca un pasto per cambiarlo');
  },
  /* ---- editor ricette ---- */
  newRecipe() {
    ui.ed = { id: null, n: '', e: '🍽️', cat: 'primo', att: '', cott: '', tot: '', sc: 'calda', veg: false, ing: [], steps: '', tip: '', err: '', del: false };
    openSheet('editor');
  },
  editRecipe(d) {
    const p = PI[d.id];
    ui.ed = { id: p.id, n: p.n, e: p.e, cat: p.cat, att: String(p.att), cott: String(p.cott), tot: String(p.tot), sc: p.sc, veg: !!p.veg,
      ing: p.ing.map(([i, q]) => [i, String(q).replace('.', ',')]), steps: p.steps.join('\n'), tip: p.tip || '', err: '', del: false };
    openSheet('editor');
  },
  edSet(d) {
    ui.ed.err = '';
    const v = d.v === 'null' ? null : d.v;
    if (d.f === 'veg') ui.ed.veg = !ui.ed.veg; else ui.ed[d.f] = v;
    renderSheet();
  },
  edEmoji(d) { ui.ed.e = d.v; ui.ed.err = ''; renderSheet(); },
  edAddIng() { ui.ipq = ''; openSheet('ingPick'); },
  edPickIng(d) {
    const i = ING[d.i];
    ui.ed.ing.push([d.i, i.u === 'pz' ? '1' : i.u === 'ml' ? '20' : '100']);
    closeSheet();
  },
  edBrand(d) {
    const c = edCosts(), l = c.lines[+d.k];
    openSheet('price', { i: l.iid, dq: l.q, dt: c.tot, dn: ui.ed.n || 'la tua ricetta' });
  },
  edDelIng(d) { ui.ed.ing.splice(+d.i, 1); renderSheet(); },
  edSave() {
    const ed = ui.ed, num = v => { const x = parseFloat(String(v || '').replace(',', '.')); return isFinite(x) && x >= 0 ? x : NaN; };
    const att = num(ed.att), cott = ed.cott === '' ? 0 : num(ed.cott);
    let tot = ed.tot === '' ? att + cott : num(ed.tot);
    const steps = ed.steps.split('\n').map(x => x.trim()).filter(Boolean);
    const ing = ed.ing.map(([i, q]) => [i, String(q).trim() === '' ? 0 : num(q)]);
    let err = '';
    if (!ed.n.trim()) err = 'Dai un nome alla ricetta.';
    else if (!(att > 0) || isNaN(cott) || isNaN(tot)) err = 'Scrivi i minuti di lavoro (e di cottura, se c\'è).';
    else if (tot < Math.max(att, cott)) err = 'Il tempo totale non può essere più corto del lavoro o della cottura.';
    else if (!ing.some(([, q]) => q > 0)) err = 'Aggiungi almeno un ingrediente con la sua quantità.';
    else if (ing.some(([, q]) => isNaN(q))) err = 'Controlla le quantità: solo numeri (vuoto = q.b.).';
    else if (!steps.length) err = 'Scrivi almeno un passaggio del procedimento.';
    if (err) { ed.err = err; renderSheet(); return; }
    const dish = { id: ed.id || 'u_' + Date.now().toString(36), n: ed.n.trim(), e: ed.e.trim() || '🍽️', cat: ed.cat, att: Math.round(att), cott: Math.round(cott), tot: Math.round(tot),
      sc: ed.sc, veg: ed.veg, ing, steps, mine: true };
    if (ed.tip.trim()) dish.tip = ed.tip.trim();
    const k = S.custom.piatti.findIndex(p => p.id === dish.id);
    if (k >= 0) S.custom.piatti[k] = dish; else S.custom.piatti.push(dish);
    reindex(); save(); closeSheet(); render();
    toast(`${esc(dish.e)} «${esc(dish.n)}» ${k >= 0 ? 'aggiornata' : 'aggiunta al ricettario'}`);
  },
  edDelete() {
    if (!ui.ed.del) { ui.ed.del = true; renderSheet(); return; }
    const id = ui.ed.id;
    S.custom.piatti = S.custom.piatti.filter(p => p.id !== id);
    for (const k in S.week.slots) if (S.week.slots[k] && S.week.slots[k].d === id) delete S.week.slots[k];
    delete S.favs[id];
    reindex(); save(); ui.sheets = []; render(); toast('Ricetta eliminata');
  },
  newIngSheet() {
    ui.ni = { n: ui.ipq || '', e: '🛒', r: 'frigo', u: 'g', conf: '', p: '', disp: false, err: '' };
    openSheet('newIng');
  },
  niSet(d) { ui.ni.err = ''; if (d.f === 'disp') ui.ni.disp = !ui.ni.disp; else ui.ni[d.f] = d.v; renderSheet(); },
  niSave() {
    const ni = ui.ni, conf = parseFloat(String(ni.conf).replace(',', '.')), pr = parseFloat(String(ni.p).replace(',', '.'));
    let err = '';
    if (!ni.n.trim()) err = 'Scrivi il nome.';
    else if (ni.u !== 'g' && !(conf > 0)) err = 'Scrivi quanto contiene una confezione.';
    else if (!(pr > 0)) err = 'Scrivi il prezzo (anche indicativo).';
    if (err) { ni.err = err; renderSheet(); return; }
    const sfuso = ni.u === 'g' && !(conf > 0);
    const dur = { fv: 5, pane: 3, frigo: 10, carne: 2, pesce: 2, secco: 365, condimenti: 365, surg: 180 }[ni.r] || 30;
    const ing = { id: 'ui_' + Date.now().toString(36), n: ni.n.trim(), e: ni.e.trim() || '🛒', r: ni.r, u: ni.u, conf: sfuso ? 0 : conf,
      p: Math.round(pr / factor() * 100) / 100, dur, mine: true };
    if (ni.u === 'pz') ing.pzn = ['pezzo', 'pezzi'];
    if (ni.disp) ing.disp = true;
    S.custom.ing.push(ing);
    (S.prices[S.market] = S.prices[S.market] || {})[ing.id] = Math.round(pr * 100) / 100;
    reindex(); save();
    ui.sheets.pop();                      // chiude «nuovo ingrediente»
    A.edPickIng({ i: ing.id });           // lo aggiunge alla ricetta e chiude la scelta
  }
};
/* l'avviso di errore sparisce appena si corregge qualcosa */
function clearErr(o) { if (o.err) { o.err = ''; const w = $('.sheet-panel .tip.warn'); if (w) w.remove(); } }
const IN = {
  ed(el) { ui.ed[el.dataset.ed] = el.value; clearErr(ui.ed); },
  edq(el) { ui.ed.ing[+el.dataset.edq][1] = el.value; clearErr(ui.ed); edRefreshCosts(); },
  ni(el) { ui.ni[el.dataset.ni] = el.value; clearErr(ui.ni); },
  qtyv(el) {
    const x = parseFloat(String(el.value).replace(',', '.')); if (!(x >= 0)) return;
    ui.qv = x;
    const top = ui.sheets[ui.sheets.length - 1], p = PI[top.d], base = (p.ing.find(([i]) => i === top.i) || [])[1] || 0, n = S.pc;
    $('#qty-impact').innerHTML = qtyImpactTxt(x, effQ(p, top.i, base), n, top.i, dishCost(p.id, n));
    $('#qty-all').textContent = `In tutte le ricette (in proporzione, ${pct((x / (base || 1) - 1) * 100, true)})`;
  },
  rfq(el) { ui.rfq = el.value; const top = ui.sheets[ui.sheets.length - 1]; const box = $('#rf-list'); if (box) { renderSheet(); const n = $('input[data-in=rfq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } },
  scq(el) { ui.scq = el.value; scanListUpd(); const n = $('input[data-in=scq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } },
  haq(el) { ui.haq = el.value; renderSheet(); const n = $('input[data-in=haq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } },
  bfq(el) { ui.bfq = el.value; const top = ui.sheets[ui.sheets.length - 1]; renderSheet(); const n = $('input[data-in=bfq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } },
  spq(el) { clearTimeout(spTimer); const q = el.value; spTimer = setTimeout(() => spSearch(q), 450); },
  exq(el) { clearTimeout(exTimer); const q = el.value; exTimer = setTimeout(() => exSearch(q), 450); },
  sfv(el) {
    const x = parseFloat(String(el.value).replace(',', '.')); if (!(x >= 0)) return;
    ui.sv = x;
    const top = ui.sheets[ui.sheets.length - 1], it = S.week.sfizi[top.k][+top.j], n = nOf(top.k);
    $('#sf-cost').innerHTML = `Costo per questo pasto: <b>${eur3(x * n * unitCost(it.i))}</b> (${fq(it.i, x * n)})`;
  },
  prodq(el) { ui.prodQ = el.value; $('#prod-list').innerHTML = productsList(); },
  alq(el) { ui.alq = el.value; const q = el.value.trim().toLowerCase(); $('#al-list').innerHTML = allergyList(Object.values(ING).filter(i => !i.sp && (!q || i.n.toLowerCase().includes(q))).sort((a, b) => a.n.localeCompare(b.n)), excluded()); },
  spentIn(el) { const v = parseFloat(String(el.value).replace(',', '.')); $('#spent-diff').innerHTML = spentDiff(isFinite(v) ? v : null, +el.dataset.stima); },
  ipq(el) { ui.ipq = el.value; $('#ip-list').innerHTML = ingPickList(); },
  cq(el) { ui.cf.q = el.value; $('#cat-list').innerHTML = catGrid(dishFilter(ui.cf).sort((a, b) => a.n.localeCompare(b.n))); },
  pq(el) { ui.pf.q = el.value; $('#pick-list').innerHTML = pickList(el.dataset.k); }
};
const CH = {
  bfQ(el) { const x = personOf(el.dataset.p), b = x && x.colaz[+el.dataset.j], v = parseFloat(String(el.value).replace(',', '.')); if (b && v > 0) { b.q = v; save(); render(); } },
  pName(el) { const x = personOf(el.dataset.p); if (x) { x.name = el.value.trim().slice(0, 20) || 'Senza nome'; save(); render(); } },
  rcW(el) { const r = ui.rc && ui.rc.res.righe[+el.dataset.k], v = parseFloat(String(el.value).replace(',', '.')); if (r && v > 0) r.peso_confezione = v / (+r.quantita || 1); },
  homeFile(el) { const f = el.files && el.files[0]; if (f) readHomePhoto(f); },
  receiptFile(el) { const f = el.files && el.files[0]; if (f) readReceipt(f); },
  apiKey(el) { S.apiKey = el.value.trim(); save(); },
  profKcal(el) {
    const v = +el.value || 0;
    if (v && (v < 300 || v > 3000)) return;
    setProf(el.dataset.p, { mealKcal: v }); save(); render();
  },
  prof(el) {
    const v = +el.value, lim = { age: [14, 99], h: [120, 230], w: [35, 250] }[el.dataset.f];
    if (!v || (lim && (v < lim[0] || v > lim[1]))) return;
    setProf(el.dataset.p, { [el.dataset.f]: v }); save(); render();
  },
  remTime(el) { if (/^\d\d:\d\d$/.test(el.value)) { S.reminder.t = el.value; save(); } }
};
/* l'ordine conta: un'azione su un elemento interno (prezzo, timer) non deve attivare quella della riga */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('input', e => {
  const el = e.target, k = el.dataset || {};
  if (k.in && IN[k.in]) IN[k.in](el);
  else if (k.ed != null) IN.ed(el);
  else if (k.edq != null) IN.edq(el);
  else if (k.ni != null) IN.ni(el);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && CH[el.dataset.ch]) CH[el.dataset.ch](el); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.key === 'addExtra') A.addExtra(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());

/* tasto indietro di Android: chiude il foglio aperto, poi torna al menu; dal menu esce */
window.__back = () => {
  if (ui.sheets.length) { closeSheet(); return true; }
  if (S.setup && ui.tab !== 'menu') { A.tab({ t: 'menu' }); return true; }
  if (!S.setup && ui.onb > 0) { ui.onb--; render(); return true; }
  return false;
};
window.__openTab = t => { if (VIEWS[t]) A.tab({ t }); };
window.__S = () => S;
window.__test = { blockedIds: () => ALL.filter(blocked).map(p => p.id), recoverSpese, syncSpese, canMake: (id, n) => canMake(PI[id], n), poolGroups: () => poolGroups().map(x => [x.dish.id, x.keys, x.miss]), todayRows: () => todayRows(), swapImpact, slotsSwapped, shopNeededDay, scanFake: () => { scan = { seen: {} }; }, onScan, eanLocal, guessIng, receiptAll, today: () => TODAY, receiptHome, receiptQty, phoneMatchDbg, loadNutrition, parseNutTable, catItem, usesOf, iperalItems, phoneSearch, eveningPlan, eaters: k => eaters(k).map(x => x.id), tags: id => [...dishTags(PI[id])], fits: (id, c) => fitsCat(PI[id], c), slotN: (k, id) => slotN(k, PI[id]), shopping: (w, o) => shopping(w || S.week, o), carryOver: (start) => carryOver(S.week, start), checkUpdate, novita: NOVITA.ver, receiptTotal, walletCheck, chosenOpt, readPhoneChain, price, save, refreshRecipes, allCount: () => ALL.length, isLight, prot: id => dishNut(PI[id]).p, light: id => isLight(PI[id]), dish: id => PI[id] };   // per tools/test_app.py

ensurePeople();
render();
syncNative();
if (!S.spese) {
  S.spese = (S.history || []).filter(h => h.spent > 0).map(h => ({ id: h.start + '_settimana', week: h.start, giro: 'settimana', date: addDays(h.start, -1),
    spent: h.spent, stima: h.cassa || null, store: '', fonte: 'spesa', items: [], extras: [] }));
  syncSpese();
}
recoverSpese();
refreshAll();
/* quando si torna nell'app (dal multitasking o dallo sblocco) i prezzi si riscaricano */
window.__onResume = () => refreshAll();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAll(); });
})();
