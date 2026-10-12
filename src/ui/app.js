const api = window.apphub;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  star: '<polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  sync: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  dots: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  chat: '<path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.3A7.5 7.5 0 1 1 20 12.5z"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/>',
  mark: '<path d="M6.8 16.1 12 6.9l5.2 9.2" stroke-width="2.6"/><circle cx="12" cy="15.2" r="1.8" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const svg = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// Layout choices are a per-device convenience; the app works without storage.
const stored = key => { try { return localStorage.getItem('apphub.' + key); } catch { return null; } };
const store = (key, value) => { try { localStorage.setItem('apphub.' + key, value); } catch {} };

// Each theme lists the preview colours shown in Settings: background, surface, text.
const THEMES = [
  {id: 'system', name: 'System'},
  {id: 'graphite', name: 'Graphite', colors: ['#191817', '#2e2c2a', '#f3f1ee']},
  {id: 'midnight', name: 'Midnight', colors: ['#000000', '#1c1c1e', '#f2f2f3']},
  {id: 'ocean', name: 'Ocean', colors: ['#0b0e14', '#1f2633', '#eef1f6']},
  {id: 'nord', name: 'Nord', colors: ['#2e3440', '#434c5e', '#eceff4']},
  {id: 'mocha', name: 'Mocha', colors: ['#1e1e2e', '#313244', '#cdd6f4']},
  {id: 'forest', name: 'Forest', colors: ['#121a16', '#22302a', '#e8f0ea']},
  {id: 'dusk', name: 'Dusk', colors: ['#1a1625', '#2f2942', '#ece8f5']},
  {id: 'rosewood', name: 'Rosewood', colors: ['#1d1517', '#35272b', '#f5ecec']},
  {id: 'slate', name: 'Slate', colors: ['#1c2126', '#303841', '#e9edf1']},
  {id: 'espresso', name: 'Espresso', colors: ['#1c1713', '#342b24', '#f3ebe2']},
  {id: 'light', name: 'Light', colors: ['#ffffff', '#ebebee', '#1b1c1f']},
  {id: 'paper', name: 'Paper', colors: ['#fbf8f1', '#e9e2d3', '#2b2620']},
  {id: 'sand', name: 'Sand', colors: ['#f6efe4', '#e3d7c4', '#2e261c']},
  {id: 'sage', name: 'Sage', colors: ['#f2f5ef', '#dbe3d5', '#1f2a22']},
  {id: 'blossom', name: 'Blossom', colors: ['#fbf3f4', '#ecdcdf', '#2d2023']},
  {id: 'sky', name: 'Sky', colors: ['#f2f6fb', '#d9e4f1', '#1b2530']}
];
const ACCENTS = [['peach', 'Peach', '#f3c4a3'], ['butter', 'Butter', '#f1dc9e'], ['rose', 'Rose', '#f2b5c0'], ['violet', 'Violet', '#c9b8f3'], ['blue', 'Blue', '#abc8f5'], ['teal', 'Teal', '#a5dccf'], ['lime', 'Lime', '#d2e7a4']];
let theme = THEMES.some(t => t.id === stored('theme')) ? stored('theme') : 'system';
let accent = ACCENTS.some(([id]) => id === stored('accent')) ? stored('accent') : 'peach';
function applyAppearance() {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = theme;
  if (accent === 'peach') root.removeAttribute('data-accent'); else root.dataset.accent = accent;
}
applyAppearance();

let state = {items: [], prefs: {}, jobs: []};
let view = 'home', category = '', selected = null, results = null, query = '', generation = 0;
let mode = stored('mode') === 'list' ? 'list' : 'grid';
let sort = ['name', 'source', 'recent'].includes(stored('sort')) ? stored('sort') : 'name';
let searching = false, searchWarning = '', searchAnswer = '', searchRecommendations = [], searchReasons = new Map(), reasoningWarning = '';
let showHidden = false, toastTimer, modalGeneration = 0, libraryPlan = null;
let catalogQuery = '', catalogPackages = null, catalogLoading = false, catalogGeneration = 0;
let modelDraft = null, modelPending = false, modelError = '';
const answerOpening = new Set();
let chat = [], chatBusy = false, chatDraft = '', chatStream = '', chatStatus = '', chatEpoch = 0, askDraft = '';
let systemInfo = null, systemTimer = null, systemLoading = false;
const recentlyActivated = new Set();

const nav = [
  ['', [['home', 'home', 'Home'], ['chat', 'chat', 'Chat']]],
  ['Library', [['all', 'grid', 'Apps'], ['favorites', 'star', 'Favorites'], ['recent', 'clock', 'Recent'], ['settings', 'sliders', 'Windows settings']]],
  ['Packages', [['updates', 'download', 'Updates'], ['discover', 'plus', 'Install apps'], ['reproduce', 'swap', 'Export & restore'], ['activity', 'pulse', 'Activity']]]
];
const categories = ['Development', 'Creative', 'Music & audio', 'Productivity', 'Browsers', 'Communication', 'Games', 'Utilities'];
const titles = {home: 'Home', chat: 'Chat', all: 'Apps', favorites: 'Favorites', recent: 'Recent', settings: 'Windows settings', updates: 'Updates', discover: 'Install apps', reproduce: 'Export & restore', activity: 'Activity', preferences: 'Settings'};

const item = id => state.items.find(a => a.id === id);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const cleanError = e => (e?.message || String(e)).replace(/^Error invoking remote method '[^']+': Error: /, '');
const modelName = role => role === 'reasoning' && state.models?.active?.reasoning === 'off'
  ? 'Interpretation off'
  : String((role === 'embedding' ? state.ai : state.reasoner)?.model || state.models?.profiles?.find(p => p.id === state.models?.active?.[role])?.name || (role === 'embedding' ? 'Local retrieval' : 'Local interpretation'));
const modelDescription = () => `${modelName('embedding')} finds apps and Windows settings by meaning. `
  + (state.models?.active?.reasoning === 'off' ? 'Interpretation is off.' : `${modelName('reasoning')} reads each search and lists the entries that fit. ${state.models?.profiles?.find(p => p.id === state.models?.active?.chat)?.name || 'It also'} answers in Chat.`)
  + ' Names, partial names and typos work either way. Queries and your software list stay on this PC.';

function toast(text, error = false) {
  clearTimeout(toastTimer);
  $('#toast').textContent = text;
  $('#toast').className = 'toast' + (error ? ' error' : '');
  toastTimer = setTimeout(() => $('#toast').classList.add('hidden'), error ? 9000 : 4000);
}
async function attempt(fn) {
  try { return await fn(); } catch (e) { toast(cleanError(e), true); return null; }
}

const iconSource = a => typeof a.iconData === 'string' && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(a.iconData) ? a.iconData : null;
// Each entry carries a hue, taken from its icon once that has been sampled and from its name until then.
const tints = new Map();
const nameHue = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.codePointAt(0)) % 360; return h; };
function tint(a) {
  if (tints.has(a.id)) return tints.get(a.id);
  const fallback = nameHue(a.name), source = iconSource(a);
  tints.set(a.id, fallback);
  if (source) {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 16;
        const g = canvas.getContext('2d', {willReadFrequently: true});
        g.drawImage(img, 0, 0, 16, 16);
        const d = g.getImageData(0, 0, 16, 16).data;
        let x = 0, y = 0, weight = 0;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], gr = d[i + 1], b = d[i + 2], max = Math.max(r, gr, b), spread = max - Math.min(r, gr, b);
          if (d[i + 3] < 128 || spread < 40) continue;
          const hue = (max === r ? ((gr - b) / spread) % 6 : max === gr ? (b - r) / spread + 2 : (r - gr) / spread + 4) * Math.PI / 3;
          x += Math.cos(hue) * spread; y += Math.sin(hue) * spread; weight += spread;
        }
        if (!weight) return;
        const hue = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
        tints.set(a.id, hue);
        document.querySelectorAll('[data-tint]').forEach(el => { if (el.dataset.tint === a.id) el.style.setProperty('--h', hue); });
      } catch {}
    };
    img.src = source;
  }
  return fallback;
}
const tintAttrs = a => `data-tint="${esc(a.id)}" style="--h:${tint(a)}"`;

function icon(a) {
  const imageData = iconSource(a);
  if (imageData) return `<span class="app-icon"><img src="${esc(imageData)}" alt=""></span>`;
  return `<span class="app-icon fallback">${a.kind === 'setting' ? svg('sliders') : esc((a.name.match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase())}</span>`;
}

const packageName = p => state.items.find(a => a.packageId && a.packageId === p?.id)?.name || p?.id || '';
// Where a running job is: packages finished, the one in flight, and its WinGet stage.
function jobProgress(j) {
  const done = (j.results || []).length, total = j.packages.length;
  const log = j.log || '', tail = log.slice(Math.max(0, log.lastIndexOf('\n> winget')));
  const stage = /Starting package (install|uninstall)/.test(tail) ? 'Installing' : /Downloading/.test(tail) ? 'Downloading' : 'Preparing';
  return {done, total, stage, position: Math.min(done + 1, total), name: packageName(j.packages[Math.min(done, total - 1)])};
}
function updateJobStatus() {
  const running = state.jobs.find(j => j.status === 'running'), queued = state.jobs.filter(j => j.status === 'queued').length;
  const el = $('#job-status');
  el.classList.toggle('hidden', !running && !queued);
  if (running) {
    const p = jobProgress(running);
    el.querySelector('span').textContent = `${{upgrade: 'Updating', uninstall: 'Uninstalling'}[running.action] || 'Installing'} ${p.position} of ${p.total} · ${p.name}${queued ? ` · ${queued} queued` : ''}`;
  } else if (queued) el.querySelector('span').textContent = plural(queued, 'operation') + ' queued';
}

function updateFooter() {
  updateJobStatus();
  const apps = state.items.filter(a => a.kind === 'app');
  const synced = state.lastScan ? 'Synced ' + new Date(state.lastScan).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) : 'Not synced yet';
  $('#sync-status').textContent = state.scanning ? 'Syncing…' : `${plural(apps.length, 'app')} · ${synced}`;
  $('#refresh').disabled = !!state.scanning;
  const ai = state.ai || {}, reasoner = state.reasoner || {};
  const reasoning = reasoner.pid || ['loading', 'starting', 'thinking'].includes(reasoner.status);
  const retrieving = ai.pid || ['loading', 'starting', 'running', 'ready', 'searching'].includes(ai.status);
  const off = state.prefs.aiEnabled === false;
  $('#ai-status span').textContent = off ? 'Local AI off'
    : reasoning ? reasoner.message || modelName('reasoning') + ' interpreting…'
    : retrieving ? ai.message || 'Local search ready'
    : 'Local AI asleep';
  $('#ai-status').classList.toggle('active', !off && !!(reasoning || retrieving));
  $('#ai-status').title = `${modelName('embedding')} finds matches; ${modelName('reasoning')} interprets requests. Click for settings.`;
}

// Preserve keyboard position and unfinished input during background updates.
function retainFocus(renderView) {
  const active = document.activeElement;
  const marker = active && active !== document.body && active !== document.documentElement ? {
    id: active.id, tag: active.tagName, data: {...active.dataset}, card: active.closest('.app-card')?.dataset.id,
    value: active.matches('input:not([type=checkbox]):not([type=radio]),textarea') ? active.value : undefined,
    start: active.selectionStart, end: active.selectionEnd
  } : null;
  renderView();
  if (!marker || active.isConnected) return;
  let replacement = marker.id ? document.getElementById(marker.id) : null;
  if (!replacement) {
    const candidates = [...document.querySelectorAll(marker.card ? '.app-card,[data-star],[data-info]' : 'button,input,select,textarea,[tabindex]')];
    replacement = candidates.find(el => el.tagName === marker.tag && Object.entries(marker.data).every(([key, value]) => el.dataset[key] === value) && Object.keys(marker.data).length > 0);
  }
  if (!replacement && marker.card) replacement = $('#app-list .app-card') || $('#search');
  if (marker.data.answerOpen && replacement?.disabled) replacement = [...document.querySelectorAll('[data-answer-inspect]')].find(el => el.dataset.answerInspect === marker.data.answerOpen) || $('#search');
  if (!replacement && (marker.data.answerOpen || marker.data.answerInspect)) replacement = $('#search');
  if (!replacement || replacement.disabled) return;
  if (marker.value !== undefined && replacement.matches('input,textarea')) replacement.value = marker.value;
  replacement.focus({preventScroll: true});
  if (marker.start != null && replacement.setSelectionRange) try { replacement.setSelectionRange(marker.start, marker.end); } catch {}
}
function render() { retainFocus(renderContent); }
function renderLibrary() { retainFocus(renderLibraryContent); }
function renderActivity() { retainFocus(renderActivityContent); }
function renderModels() { retainFocus(renderModelsContent); }
function focusDetails() { ($('#launch:not(:disabled)') || $('#close-detail'))?.focus(); }

function renderNav() {
  const isSearch = !!query.trim();
  const updates = state.items.filter(a => a.available).length;
  const counts = {all: state.items.filter(a => a.kind === 'app' && !a.hidden).length, updates};
  $('#navigation').innerHTML = nav.map(([group, entries]) => `<div class="nav-group">${group ? `<span class="nav-label">${group}</span>` : ''}${entries.map(([id, symbol, label]) =>
    `<button class="nav-item${view === id && !isSearch ? ' active' : ''}" data-view="${id}">${svg(symbol)}<span class="nav-text">${label}</span>${counts[id] ? `<span class="count${id === 'updates' ? ' attention' : ''}">${counts[id]}</span>` : ''}</button>`).join('')}</div>`).join('');
  $('#preferences').classList.toggle('active', view === 'preferences' && !isSearch);
}

function navigate(v, c = '') {
  if (searching) api.cancelSearch?.().catch(() => {});
  clearTimeout(debounce);
  view = v; category = c; query = ''; $('#search').value = '';
  results = null; selected = null; generation++;
  searching = false; searchWarning = ''; searchAnswer = ''; searchRecommendations = []; searchReasons = new Map(); reasoningWarning = '';
  render();
  $('#content').scrollTop = 0;
  const body = $('#body');
  body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
  if (v === 'chat') $('#chat-input')?.focus();
}

function renderContent() {
  updateFooter();
  renderNav();
  const isSearch = !!query.trim();
  const title = isSearch ? `Results for “${query}”` : titles[view] || titles.all;
  $('#body').onclick = null;
  const plain = !isSearch && (view === 'home' || view === 'chat');
  $('#content').classList.toggle('chat-mode', !isSearch && view === 'chat');
  $('#page-header').classList.toggle('hidden', !isSearch && view === 'home');
  $('#page-header').innerHTML = `<h1 title="${esc(title)}">${esc(title)}</h1>${view === 'all' && !isSearch ? `<button id="add-app" class="button subtle">${svg('plus')}Add app</button>` : ''}${view === 'chat' && !isSearch && chat.length ? `<button id="new-chat" class="button subtle">${svg('plus')}New chat</button>` : ''}`;
  if (plain && view === 'home') renderHome();
  else if (plain) renderChat();
  else if (isSearch || ['all', 'favorites', 'recent', 'settings'].includes(view)) renderLibrary();
  else if (view === 'updates') renderUpdates();
  else if (view === 'reproduce') renderReproduce();
  else if (view === 'activity') renderActivity();
  else if (view === 'preferences') renderPreferences();
  else if (view === 'discover') renderDiscover();
  renderDetails();
  $('#add-app')?.addEventListener('click', () => attempt(() => api.addApp()));
  $('#new-chat')?.addEventListener('click', newChat);
}

function visibleItems() {
  let items = results || state.items;
  if (!query.trim()) {
    if (category) items = items.filter(a => a.category === category);
    else if (view === 'all') items = items.filter(a => a.kind === 'app');
    else if (view === 'settings') items = items.filter(a => a.kind === 'setting');
    else if (view === 'favorites') items = items.filter(a => a.favorite);
    else if (view === 'recent') items = items.filter(a => a.lastLaunch);
  }
  if (!showHidden) items = items.filter(a => !a.hidden);
  if (!query.trim()) {
    const byName = (a, b) => a.name.localeCompare(b.name);
    items = [...items].sort(sort === 'recent' || view === 'recent' ? (a, b) => (b.lastLaunch || '').localeCompare(a.lastLaunch || '')
      : sort === 'source' ? (a, b) => (a.source || '').localeCompare(b.source || '') || byName(a, b)
      : byName);
  }
  return items;
}

function answerEntries() {
  return searchRecommendations.map(item).filter(a => a && !a.hidden && (results || []).some(r => r.id === a.id));
}
function renderAnswer() {
  if (!query || searching || !searchAnswer || state.prefs.aiEnabled === false) return '';
  const entries = answerEntries();
  // With a reason for every entry, each recommendation gets its own row; otherwise show the answer text.
  const listed = entries.length > 0 && entries.every(a => searchReasons.has(a.id));
  const actions = entries.map(a => {
    const busy = answerOpening.has(a.id);
    const open = a.launch ? `<button class="button primary" data-answer-open="${esc(a.id)}" ${a.unavailable ? 'disabled title="Reconnect the app’s folder, then sync your library"' : ''} ${busy ? 'aria-disabled="true" aria-busy="true"' : ''}>${busy ? 'Opening…' : 'Open ' + esc(a.name)}</button>` : '';
    const buttons = `<div class="answer-actions">${open}<button class="button subtle" data-answer-inspect="${esc(a.id)}">${a.launch ? 'Details' : esc(a.name) + ' details'}</button></div>${a.unavailable ? '<small class="answer-unavailable">Folder unavailable · reconnect and sync to open.</small>' : ''}`;
    return listed ? `<div class="answer-row"><div class="answer-text"><strong>${esc(a.name)}</strong><span>${esc(searchReasons.get(a.id))}</span></div>${buttons}</div>` : buttons;
  }).join('');
  const stale = searchRecommendations.length && !entries.length ? '<small>This recommendation is no longer in your library. Search again.</small>' : '';
  return `<section class="local-answer" aria-label="On-device answer"><div class="answer-label">${listed && entries.length > 1 ? 'Local AI found ' + entries.length + ' options' : 'Local AI answer'}</div>${listed ? '' : `<p>${esc(searchAnswer)}</p>`}${actions}${stale}</section>`;
}
async function openAnswer(id) {
  const entry = answerEntries().find(a => a.id === id);
  if (!entry?.launch || entry.unavailable || answerOpening.has(id)) return;
  const seq = generation;
  answerOpening.add(id);
  renderLibrary();
  try { await launch(id); } finally {
    answerOpening.delete(id);
    if (seq === generation && query && searchAnswer) renderLibrary();
  }
}
function inspectAnswer(id) {
  if (answerEntries().some(a => a.id === id)) openDetails(id);
}

function selectCard(id) {
  selected = id;
  renderDetails();
  document.querySelectorAll('.app-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
}
function openDetails(id) { selectCard(id); focusDetails(); }
// A card opens its app. Entries that cannot launch show their details instead.
function activate(id) {
  const a = item(id);
  if (!a) return;
  if (!a.launch || a.unavailable) { openDetails(id); return; }
  if (recentlyActivated.has(id)) return; // absorbs the second half of a double-click
  recentlyActivated.add(id);
  setTimeout(() => recentlyActivated.delete(id), 1200);
  launch(id);
}

function libraryToolbar(items) {
  if (query) return `<div class="section-controls"><span class="meta">${plural(items.length, 'result')}</span><span class="spacer"></span>${items.length ? '<span class="meta"><kbd>Enter</kbd> opens the top result</span>' : ''}</div>`;
  const apps = state.items.filter(a => a.kind === 'app' && !a.hidden);
  const chips = view !== 'all' ? '' : `<div class="chips" id="categories"><button class="chip${category ? '' : ' active'}" data-category="">All</button>${categories.map(c => {
    const n = apps.filter(a => a.category === c).length;
    return n ? `<button class="chip${category === c ? ' active' : ''}" data-category="${esc(c)}">${esc(c)} <span>${n}</span></button>` : '';
  }).join('')}</div>`;
  const noun = view === 'settings' ? 'setting' : 'item';
  const hiddenToggle = showHidden || state.items.some(a => a.hidden) ? `<label class="filter-label"><input id="show-hidden" type="checkbox" ${showHidden ? 'checked' : ''}>Show hidden</label>` : '';
  const sorter = view === 'recent' ? '' : `<select id="sort" aria-label="Sort"><option value="name" ${sort === 'name' ? 'selected' : ''}>Name</option><option value="recent" ${sort === 'recent' ? 'selected' : ''}>Recently opened</option><option value="source" ${sort === 'source' ? 'selected' : ''}>Source</option></select>`;
  return `<div class="section-controls">${chips}<span class="meta">${plural(items.length, view === 'all' ? 'app' : noun)}</span><span class="spacer"></span>${hiddenToggle}${sorter}<div class="view-toggle"><button id="grid-view" class="${mode === 'grid' ? 'active' : ''}" aria-label="Grid view" title="Grid">${svg('grid')}</button><button id="list-view" class="${mode === 'list' ? 'active' : ''}" aria-label="List view" title="List">${svg('list')}</button></div></div>`;
}

function libraryEmpty() {
  const [heading, text] = state.scanning ? ['Scanning this PC…', 'Apps appear here as they are found.']
    : query ? ['No matches', 'Try a shorter name, a task such as “edit pictures”, or a Windows setting such as “Bluetooth”.']
    : view === 'favorites' ? ['No favorites yet', 'Star an app or setting to keep it here.']
    : view === 'recent' ? ['Nothing opened yet', 'Apps and settings you open from AppHub are listed here.']
    : ['No apps found', 'Sync the library, or add an app or folder in Settings.'];
  return `<div class="empty"><h3>${heading}</h3><p>${text}</p></div>`;
}

function renderLibraryContent() {
  const items = visibleItems();
  const layout = query ? 'list' : mode;
  const warnings = !query ? [...new Set(state.warnings || [])].map(w => `<div class="notice warn">${esc(w)}</div>`).join('') : '';
  $('#body').innerHTML = warnings
    + (searching ? '<div class="loading-line"></div>' : '')
    + (searchWarning ? `<div class="notice warn">${esc(searchWarning)}. Name and keyword results are available.</div>` : '')
    + (reasoningWarning ? `<div class="notice warn">${esc(reasoningWarning)}</div>` : '')
    + renderAnswer()
    + libraryToolbar(items)
    + `<div class="${layout}${query ? ' results' : ''}" id="app-list">${items.map(a => card(a, layout)).join('')}</div>`
    + (items.length ? '' : libraryEmpty());

  $('.local-answer')?.addEventListener('click', e => {
    const open = e.target.closest('[data-answer-open]'), inspect = e.target.closest('[data-answer-inspect]');
    if (open) void openAnswer(open.dataset.answerOpen);
    else if (inspect) inspectAnswer(inspect.dataset.answerInspect);
  });
  $('#categories')?.addEventListener('click', e => { const b = e.target.closest('[data-category]'); if (b) navigate('all', b.dataset.category); });
  $('#grid-view')?.addEventListener('click', () => { mode = 'grid'; store('mode', mode); renderLibrary(); });
  $('#list-view')?.addEventListener('click', () => { mode = 'list'; store('mode', mode); renderLibrary(); });
  $('#sort')?.addEventListener('change', e => { sort = e.target.value; store('sort', sort); renderLibrary(); });
  $('#show-hidden')?.addEventListener('change', e => { showHidden = e.target.checked; renderLibrary(); });

  bindCards($('#app-list'));
}

// Click, right-click and keyboard behaviour shared by every group of app cards.
function bindCards(list) {
  list.onclick = e => {
    const star = e.target.closest('[data-star]'), info = e.target.closest('[data-info]'), entry = e.target.closest('[data-id]');
    if (star) toggleStar(star.dataset.star);
    else if (info) selectCard(info.dataset.info);
    else if (entry) activate(entry.dataset.id);
  };
  list.oncontextmenu = e => {
    const entry = e.target.closest('[data-id]');
    if (entry) { e.preventDefault(); selectCard(entry.dataset.id); }
  };
  list.onkeydown = e => {
    const entry = e.target.closest('[data-id]');
    if (!entry || e.target !== entry) return;
    if (e.key === 'Enter') { e.preventDefault(); activate(entry.dataset.id); }
    else if (e.key === ' ') { e.preventDefault(); openDetails(entry.dataset.id); }
    else if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const cards = [...list.querySelectorAll('.app-card')], index = cards.indexOf(entry);
      const columns = Math.max(1, cards.filter(c => c.offsetTop === cards[0].offsetTop).length);
      const step = e.key === 'ArrowDown' ? columns : e.key === 'ArrowUp' ? -columns : e.key === 'ArrowLeft' ? -1 : 1;
      const next = cards[index + step];
      if (next) { e.preventDefault(); next.focus(); }
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const cards = list.querySelectorAll('.app-card');
      cards[e.key === 'Home' ? 0 : cards.length - 1]?.focus();
    }
  };
}

function card(a, layout) {
  const id = esc(a.id), name = esc(a.name), canOpen = a.launch && !a.unavailable;
  const classes = ['app-card', layout === 'list' ? 'row' : 'tile', selected === a.id && 'selected', a.unavailable && 'unavailable', a.hidden && 'is-hidden'].filter(Boolean).join(' ');
  const attrs = `class="${classes}" data-id="${id}" ${tintAttrs(a)} tabindex="0" role="button" aria-label="${canOpen ? 'Open' : 'Details for'} ${name}"`;
  const star = `<button class="icon-button star${a.favorite ? ' is-favorite' : ''}" data-star="${id}" aria-label="${a.favorite ? 'Unfavorite' : 'Favorite'} ${name}" title="${a.favorite ? 'Remove from favorites' : 'Add to favorites'}">${svg('star')}</button>`;
  const info = `<button class="icon-button info" data-info="${id}" aria-label="Details for ${name}" title="Details">${svg('dots')}</button>`;
  if (layout !== 'list') {
    return `<div ${attrs} title="${name}${a.unavailable ? ' · folder unavailable' : ''}">${icon(a)}<h3>${name}</h3>${a.available ? '<i class="update-dot" title="Update available"></i>' : ''}${star}${info}</div>`;
  }
  const note = a.unavailable ? 'Folder unavailable · reconnect and sync' : query && a.match ? a.match : '';
  const source = a.kind === 'setting' ? 'Windows' : a.packageId ? 'WinGet' : a.source;
  return `<div ${attrs}>${icon(a)}<div class="card-label"><h3 title="${name}">${name}</h3>${note ? `<div class="match-note">${esc(note)}</div>` : ''}</div>`
    + `<span class="cell publisher">${esc(a.kind === 'setting' ? a.group || 'Windows settings' : a.publisher || a.category || '')}</span>`
    + `<span class="cell version">${esc(a.version || '')}</span><span class="cell source">${esc(source || '')}</span>`
    + `<span class="cell flag">${a.available ? '<span class="pill info" title="Update available">Update</span>' : ''}</span>${star}${info}</div>`;
}

function renderDetails() {
  const a = item(selected);
  const el = $('#details'), oldTags = $('#tags');
  const draft = oldTags && oldTags === document.activeElement && oldTags.dataset.itemId === a?.id ? {value: oldTags.value, start: oldTags.selectionStart, end: oldTags.selectionEnd} : null;
  el.classList.toggle('hidden', !a);
  if (!a) return;
  el.style.setProperty('--h', tint(a));
  const isCustom = a.source === 'Portable' && state.prefs.custom?.some(p => p.id === a.id);
  const rows = [
    ['Version', a.version], ['Publisher', a.publisher], ['Category', a.category],
    ['Source', a.packageId ? 'WinGet' + (a.packageSource && a.packageSource !== 'winget' ? ' · ' + a.packageSource : '') : a.source],
    ['Package ID', a.packageId], ['Size', a.sizeKB ? Math.round(a.sizeKB / 1024) + ' MB' : ''],
    ['Folder', a.location], ['Target', a.launch?.target],
    ['Last opened', a.lastLaunch ? new Date(a.lastLaunch).toLocaleString() : '']
  ].filter(([, v]) => v);
  el.innerHTML = `<button class="icon-button close-detail" id="close-detail" aria-label="Close details" title="Close">${svg('close')}</button>`
    + `<div class="details-head">${icon(a)}<div><h2>${esc(a.name)}</h2><div class="subtext">${esc(a.description || (a.kind === 'setting' ? 'Windows setting' : a.publisher || a.category || ''))}</div></div></div>`
    + `<div class="detail-actions"><button id="launch" class="button primary" ${!a.launch || a.unavailable ? 'disabled' : ''}>Open</button>`
    + `<button id="detail-star" class="button subtle${a.favorite ? ' is-favorite' : ''}" aria-pressed="${a.favorite ? 'true' : 'false'}">${svg('star')}${a.favorite ? 'Favorited' : 'Favorite'}</button></div>`
    + (a.unavailable ? `<div class="notice warn">${esc(a.unavailableReason || 'This app’s folder is unavailable. Reconnect it, then sync your library.')}<br>Use Sync to retry.</div>` : '')
    + (!a.launch ? '<div class="notice">Nothing to open. This is probably a runtime, driver, plugin or background component.</div>' : '')
    + (a.available ? `<div class="notice info">Update available: ${esc(a.available)} <button class="text-button" id="detail-update">Review update</button></div>` : '')
    + `<dl class="detail-list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    + `<div class="detail-links">${a.location || a.executable ? '<button class="text-button" id="reveal">Show in File Explorer</button>' : ''}${a.packageId ? '<button class="text-button" id="package-info">Package info</button><button class="text-button" id="detail-uninstall">Uninstall…</button>' : ''}</div>`
    + `<div class="detail-section"><label for="tags">Tags</label><input class="text-input" id="tags" data-item-id="${esc(a.id)}" placeholder="work, daily, audio" value="${esc((a.tags || []).join(', '))}"><small>Comma-separated. Tags are searchable.</small></div>`
    + `<div class="detail-section"><button class="text-button" id="hide-app">${a.hidden ? 'Show in library' : 'Hide from library'}</button>${isCustom ? '<button class="text-button" id="remove-custom">Remove from library</button><small>Removing keeps the file on your PC.</small>' : ''}</div>`;

  $('#detail-uninstall')?.addEventListener('click', () => confirmUninstall(a));
  $('#close-detail').onclick = () => {
    const id = selected;
    selected = null;
    renderDetails();
    let returned = false;
    document.querySelectorAll('.app-card').forEach(c => { c.classList.remove('selected'); if (c.dataset.id === id && !returned) { returned = true; c.focus(); } });
  };
  $('#launch').onclick = () => launch(a.id);
  $('#detail-star').onclick = () => toggleStar(a.id);
  $('#hide-app').onclick = () => attempt(() => api.modify(a.id, 'hidden', !a.hidden));
  $('#tags').onchange = e => attempt(() => api.modify(a.id, 'tags', e.target.value.split(',').map(x => x.trim()).filter(Boolean)));
  $('#remove-custom')?.addEventListener('click', () => attempt(() => api.removeApp(a.id)));
  $('#reveal')?.addEventListener('click', () => attempt(() => api.reveal(a.id)));
  $('#detail-update')?.addEventListener('click', () => reviewUpdates([a]));
  $('#package-info')?.addEventListener('click', () => packageInfo(a));
  if (draft) { const tags = $('#tags'); tags.value = draft.value; tags.focus(); tags.setSelectionRange(draft.start, draft.end); }
}

async function launch(id) {
  if (item(id)?.unavailable) { toast('Reconnect the app’s folder, then sync your library.', true); return; }
  await attempt(async () => { await api.launch(id); toast('Opened ' + item(id)?.name); });
}
function toggleStar(id) {
  const a = item(id);
  if (a) attempt(() => api.modify(id, 'favorite', !a.favorite));
}

function closeModal() { modalGeneration++; $('#modal').close(); }
function modal(html) {
  const token = ++modalGeneration;
  $('#modal-content').innerHTML = html;
  const heading = $('#modal-content h2');
  if (heading) { heading.id = 'modal-title'; $('#modal').setAttribute('aria-labelledby', 'modal-title'); $('#modal').removeAttribute('aria-label'); }
  else { $('#modal').removeAttribute('aria-labelledby'); $('#modal').setAttribute('aria-label', 'AppHub'); }
  if (!$('#modal').open) $('#modal').showModal();
  $('#cancel-modal')?.addEventListener('click', closeModal);
  return token;
}
function modalIsCurrent(token) { return token === modalGeneration && $('#modal').open; }
function queueFromModal(button, action, message) {
  const token = modalGeneration;
  button.disabled = true;
  attempt(async () => {
    await action();
    if (modalIsCurrent(token)) { closeModal(); navigate('activity'); }
    toast(message);
  }).finally(() => { if (button.isConnected) button.disabled = false; });
}

// One confirmation dialog for the actions chat and the details panel can start. Nothing runs until its button is clicked.
function confirmAction({title, body, label, danger, run, done}) {
  modal(`<h2>${esc(title)}</h2><p>${body}</p><div class="modal-actions"><button id="cancel-modal" class="button subtle">Cancel</button><button id="confirm-action" class="button ${danger ? 'danger' : 'primary'}">${esc(label)}</button></div>`);
  $('#confirm-action').onclick = async e => {
    const button = e.currentTarget, token = modalGeneration;
    button.disabled = true;
    try {
      const result = await run();
      if (modalIsCurrent(token)) closeModal();
      done?.(result);
    } catch (error) {
      toast(cleanError(error), true);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  };
}
function confirmUninstall(a, done) {
  if (!a.packageId) {
    confirmAction({title: `Uninstall ${a.name}?`, body: 'AppHub uninstalls apps that WinGet manages. This one is not, so remove it from the Installed apps page in Windows Settings.', label: 'Open Installed apps', run: () => api.openSettings('appsfeatures')});
    return;
  }
  confirmAction({
    title: `Uninstall ${a.name}?`, label: 'Uninstall', danger: true,
    body: `WinGet runs the uninstaller for ${esc(a.packageId)}. Whether your settings and data for the app are kept depends on that uninstaller, and it may ask for administrator approval.`,
    run: () => api.uninstall(a.id), done: () => { done?.(); navigate('activity'); toast('Uninstall added to the queue'); }
  });
}
function confirmEnd(p, done) {
  confirmAction({
    title: `End ${p.name}?`, label: 'End program', danger: true,
    body: `${p.count > 1 ? `All ${p.count} ${esc(p.name)} processes close` : esc(p.name) + ' closes'} immediately, and anything unsaved in it is lost.`,
    run: () => api.endProcess(p.name), done: () => { done?.(); toast(`${p.name} ended`); }
  });
}
function confirmStartup(s, done) {
  confirmAction({
    title: `Stop ${s.name} starting with Windows?`, label: 'Disable',
    body: 'The program is not closed or removed. You can switch it back on in Windows Settings › Apps › Startup, or in Task Manager.',
    run: () => api.setStartup(s.key, false), done: () => { done?.(); toast(`${s.name} will no longer start with Windows`); }
  });
}

async function exportLibrary() {
  await attempt(async () => {
    const f = await api.exportLibrary();
    if (f) toast(`Library exported · ${plural(state.items.filter(a => a.packageId).length, 'WinGet package')}`);
  });
}

function renderUpdates() {
  const apps = state.items.filter(a => a.available);
  const checked = state.packageChecked ? 'Checked ' + new Date(state.packageChecked).toLocaleString() : 'Not checked yet';
  $('#body').innerHTML = `<div class="section-controls narrow"><span class="meta">${apps.length ? plural(apps.length, 'update') + ' · ' : ''}${checked}</span><span class="spacer"></span>`
    + `<button id="check-updates" class="button subtle">${svg('sync')}Check for updates</button>${apps.length ? '<button id="update-all" class="button primary">Update all…</button>' : ''}</div>`
    + `<div id="update-list" class="rows">${apps.map(a => `<div class="update-row">${icon(a)}<div class="plan-entry"><strong>${esc(a.name)}</strong><small>${esc(a.version)} → <span class="new-version">${esc(a.available)}</span> · ${esc(a.packageId)}</small></div><button class="button subtle" data-update="${esc(a.id)}">Update…</button></div>`).join('')}</div>`
    + (apps.length ? '' : `<div class="empty"><h3>${state.packageChecked ? 'Everything is up to date' : 'Not checked yet'}</h3><p>${state.packageChecked ? 'No WinGet updates were found.' : 'Check WinGet for available updates.'}</p></div>`)
    + '<p class="footnote">Updates run through WinGet. Apps it doesn’t manage update themselves, and installers may ask for administrator access.</p>';
  $('#check-updates').onclick = checkUpdates;
  $('#update-all')?.addEventListener('click', () => reviewUpdates(apps));
  $('#update-list').onclick = e => { const b = e.target.closest('[data-update]'); if (b) reviewUpdates(apps.filter(a => a.id === b.dataset.update)); };
}
async function checkUpdates() {
  const button = $('#check-updates');
  if (button) { button.disabled = true; button.textContent = 'Checking…'; }
  await attempt(async () => { const next = await api.packages(); state = {...state, ...next}; render(); toast('Package information refreshed'); });
  if (button?.isConnected) { button.disabled = false; button.innerHTML = svg('sync') + 'Check for updates'; }
}
function reviewUpdates(apps) {
  modal(`<h2>Update ${apps.length === 1 ? esc(apps[0].name) : plural(apps.length, 'app')}?</h2><p>WinGet will run the installers for the selected packages. Save your work in these apps first.${apps.length > 1 ? ' Packages install one at a time, and most ask for administrator approval, so stay nearby. You can stop the queue from Activity.' : ''}</p>`
    + `<div class="plan-list">${apps.map(a => `<label class="plan-row"><input type="checkbox" checked data-update-select="${esc(a.id)}"><div class="plan-entry"><strong>${esc(a.name)}</strong><small>${esc(a.version)} → ${esc(a.available)}</small></div></label>`).join('')}</div>`
    + '<div class="modal-actions"><button id="cancel-modal" class="button subtle">Cancel</button><button id="confirm-updates" class="button primary">Start updates</button></div>');
  const button = $('#confirm-updates');
  const selection = () => [...$('#modal-content').querySelectorAll('[data-update-select]:checked')].map(x => x.dataset.updateSelect);
  $('#modal-content').querySelectorAll('[data-update-select]').forEach(e => e.onchange = () => { button.disabled = !selection().length; });
  button.onclick = () => { const ids = selection(); if (ids.length) queueFromModal(button, () => api.upgrade(ids), 'Updates added to the queue'); };
}

function renderReproduce() {
  $('#body').innerHTML = '<div class="panel"><h2>Export</h2><p>Saves a manifest of your package IDs, versions, app locations, favorites and tags. Keep it with your backups, or use it to set up another Windows PC.</p><button id="export" class="button primary">Export library…</button></div>'
    + `<div class="panel"><h2>Restore</h2><p>Open a manifest to compare it with this PC, then choose which missing packages to install.</p><button id="import" class="button subtle">Open manifest…</button>${libraryPlan ? '<button id="review-plan" class="button subtle">Review imported library</button>' : ''}</div>`
    + '<p class="footnote">A manifest is a list of software, not a backup. App data, licences, game files and Windows settings are not included. Apps outside WinGet are listed for manual reinstall.</p>';
  $('#export').onclick = exportLibrary;
  $('#review-plan')?.addEventListener('click', () => showPlan(libraryPlan));
  $('#import').onclick = () => attempt(async () => { const plan = await api.importLibrary(); if (plan) showPlan(plan); });
}
function showPlan(plan) {
  libraryPlan = plan;
  const installed = new Set(state.items.filter(a => a.packageId).map(a => (a.packageSource || 'winget') + ':' + a.packageId.toLowerCase()));
  const packages = plan.packages.map(p => ({...p, installed: installed.has(p.key || ((p.source || 'winget') + ':' + p.id.toLowerCase()))}));
  const references = Array.isArray(plan.references) ? plan.references : [];
  const packageList = packages.length
    ? `<div class="plan-list">${packages.map(p => `<label class="plan-row"><input type="checkbox" data-plan-id="${esc(p.key || p.id)}" ${p.installed ? 'disabled' : 'checked'}><div class="plan-entry"><strong>${esc(p.name)}</strong><small>${esc(p.id)} · Saved version ${esc(p.version || 'unspecified')}</small></div><span class="pill ${p.installed ? '' : 'info'}">${p.installed ? 'Installed' : 'Missing'}</span></label>`).join('')}</div>`
      + '<label class="check"><input type="checkbox" id="exact-versions">Install the saved versions where specified</label><p>Otherwise the latest release is installed. A saved version that is no longer available fails and is reported in Activity. Apps already installed are left alone.</p>'
    : '<p>No WinGet packages were recorded in this manifest.</p>';
  const referenceList = references.length
    ? `<details class="reference-checklist"><summary>Apps to reinstall manually · ${references.length}</summary><p>Use each app’s own installer, store or backup. Saved paths are from the original PC.</p><div class="plan-list">${references.map(a => `<label class="plan-row"><input type="checkbox" aria-label="Mark ${esc(a.name)} reviewed"><div class="plan-entry"><strong>${esc(a.name)}</strong><small>${esc([a.source, a.version].filter(Boolean).join(' · '))}</small>${a.location ? `<small>${esc(a.location)}</small>` : ''}</div></label>`).join('')}</div></details>`
    : '';
  modal('<h2>Recreate your library</h2>'
    + `<p>${packages.filter(p => !p.installed).length} packages missing · ${packages.filter(p => p.installed).length} already installed · ${plan.referenceCount || references.length} other apps listed for reference.</p>`
    + packageList + referenceList
    + '<div class="restore-preferences"><h3>Favorites and tags</h3><p>Applies the saved favorites and tags to matching apps on this PC. Run it again after installing to cover the new apps.</p><button id="restore-preferences" class="button subtle">Restore favorites and tags</button><span id="restore-result" role="status"></span></div>'
    + `<div class="modal-actions"><button id="cancel-modal" class="button subtle">Close</button><button id="confirm-plan" class="button primary" ${packages.every(p => p.installed) ? 'disabled' : ''}>Install selected</button></div>`);
  const button = $('#confirm-plan');
  const selection = () => [...$('#modal-content').querySelectorAll('[data-plan-id]:checked')].map(e => e.dataset.planId);
  $('#modal-content').querySelectorAll('[data-plan-id]').forEach(e => e.onchange = () => { button.disabled = !selection().length; });
  button.onclick = () => { const ids = selection(), exact = !!$('#exact-versions')?.checked; if (ids.length) queueFromModal(button, () => api.runPlan(ids, exact), 'Library recreation queued'); };
  $('#restore-preferences').onclick = e => {
    const restore = e.currentTarget, token = modalGeneration;
    restore.disabled = true;
    attempt(async () => {
      const count = await api.restorePreferences();
      if (modalIsCurrent(token)) $('#restore-result').textContent = `Restored for ${plural(count, 'matching app')}.`;
      toast(`Favorites and tags restored for ${plural(count, 'matching app')}`);
    }).finally(() => { if (restore.isConnected) restore.disabled = false; });
  };
}

function renderActivityContent() {
  const previous = new Map([...document.querySelectorAll('.activity-card[data-job]')].map(el => [el.dataset.job, {open: el.querySelector('details')?.open, scroll: el.querySelector('pre')?.scrollTop || 0}]));
  const tone = status => status === 'completed' ? 'ok' : ['failed', 'interrupted'].includes(status) ? 'danger' : status === 'canceled' ? '' : 'info';
  const summary = j => {
    const r = j.results || [], ok = r.filter(x => x.success).length, skipped = r.filter(x => x.notRun).length, failed = r.length - ok - skipped;
    return r.length > 1 ? [ok && `${ok} succeeded`, failed && `${failed} failed`, skipped && `${skipped} not run`].filter(Boolean).join(' · ') : '';
  };
  const progress = j => {
    if (j.status !== 'running') return '';
    const p = jobProgress(j);
    const hint = p.stage === 'Installing' ? 'If nothing seems to be happening, Windows may be waiting for your permission. Look for a shield icon in the taskbar.' : 'Packages install one at a time.';
    return `<div class="job-progress"><div><strong>${p.position} of ${p.total}</strong> · ${esc(p.name)} · ${p.stage}…</div><div class="bar"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></div><small>${hint}</small>`
      + (j.stopRequested ? '<small>Stopping after this package.</small>' : `<button class="text-button" data-stop-job="${esc(j.id)}">Stop after this package</button>`) + '</div>';
  };
  const outcome = r => `${esc(r.id)} · ${r.uncertain ? 'Outcome uncertain' : r.notRun ? 'Not run' : r.success ? 'Succeeded' : 'Failed'}${r.code !== undefined ? ' · Exit code ' + r.code : ''}`;
  $('#body').innerHTML = state.jobs.length
    ? state.jobs.map(j => `<article class="activity-card" data-job="${esc(j.id)}"><div class="activity-header"><span class="activity-icon ${tone(j.status)}">${svg(j.status === 'completed' ? 'check' : tone(j.status) === 'danger' ? 'alert' : 'download')}</span>`
      + `<div class="plan-entry"><strong>${{upgrade: 'Update', uninstall: 'Uninstall'}[j.action] || 'Install'} · ${plural(j.packages.length, 'package')}</strong><small>${new Date(j.created).toLocaleString()}${summary(j) ? ' · ' + summary(j) : ''}</small><small class="package-ids">${esc(j.packages.map(p => p.id).join(', '))}</small></div><span class="pill ${tone(j.status)}">${esc(statusLabel(j.status))}</span></div>`
      + progress(j)
      + (j.status === 'queued' ? `<button class="text-button" data-cancel-job="${esc(j.id)}">Cancel</button>` : '')
      + `<details><summary>Installer output</summary><pre>${esc(j.log || 'Waiting in queue…')}</pre>${(j.results || []).map(r => `<small>${outcome(r)}</small><br>`).join('')}</details></article>`).join('')
    : '<div class="empty"><h3>No activity yet</h3><p>Installs, updates and uninstalls are logged here with their installer output.</p><button id="activity-updates" class="button subtle">Go to Updates</button></div>';
  document.querySelectorAll('.activity-card[data-job]').forEach(el => {
    const old = previous.get(el.dataset.job);
    if (old) { el.querySelector('details').open = old.open; el.querySelector('pre').scrollTop = old.scroll; }
  });
  document.querySelectorAll('[data-cancel-job]').forEach(b => b.onclick = () => attempt(() => api.cancelJob(b.dataset.cancelJob)));
  document.querySelectorAll('[data-stop-job]').forEach(b => b.onclick = () => attempt(() => api.stopJob(b.dataset.stopJob)));
  $('#activity-updates')?.addEventListener('click', () => navigate('updates'));
}

const statusLabel = status => { const s = String(status || 'sleeping'); return s[0].toUpperCase() + s.slice(1); };
function runtimeRow(role) {
  const runtime = (role === 'embedding' ? state.ai : state.reasoner) || {};
  return `<div class="setting-row"><div><strong id="${role}-title">${esc(modelName(role))}</strong><small id="${role}-runtime">${esc(runtime.message || 'Sleeping')}${runtime.pid ? ' · Process ' + runtime.pid : ''}</small></div><span id="${role}-runtime-status" class="pill">${esc(statusLabel(runtime.status))}</span></div>`;
}
function renderPreferences() {
  const folders = state.prefs.folders || [];
  const unavailable = folder => state.sourceHealth?.find(h => h.type === 'portable-folder' && h.path === folder)?.status === 'unavailable';
  $('#body').innerHTML = [...new Set(state.warnings || [])].map(w => `<div class="notice warn">${esc(w)}</div>`).join('')
    + `<div class="panel"><h2>Appearance</h2><div class="swatches" role="radiogroup" aria-label="Theme">${THEMES.map(t =>
      `<button class="swatch${theme === t.id ? ' active' : ''}" role="radio" aria-checked="${theme === t.id}" data-theme-choice="${t.id}"><span class="swatch-preview${t.colors ? '' : ' system'}" style="${t.colors ? `background:${t.colors[0]};color:${t.colors[2]}` : ''}"><i style="${t.colors ? `background:${t.colors[1]}` : ''}"></i>Aa</span>${t.name}</button>`).join('')}</div>`
    + `<div class="accents" role="radiogroup" aria-label="Accent colour"><span>Accent</span>${ACCENTS.map(([id, label, color]) =>
      `<button class="accent-dot${accent === id ? ' active' : ''}" role="radio" aria-checked="${accent === id}" data-accent-choice="${id}" title="${label}" aria-label="${label}" style="background:${color}"></button>`).join('')}</div></div>`
    + `<div class="panel"><h2>Local AI</h2><p id="model-description">${esc(modelDescription())}</p>`
    + `<label class="setting-row"><div><strong>Use local AI search</strong><small>The chat model reads every search except an exact app name, and powers Chat. Both models unload 60 seconds after use.</small></div><input id="ai-toggle" class="switch" type="checkbox" ${state.prefs.aiEnabled !== false ? 'checked' : ''}></label>`
    + `<label class="setting-row"><div><strong>Use the graphics card</strong><small>Runs the chat model on the GPU through Vulkan, which is usually several times faster. If the GPU cannot load it, AppHub uses the CPU instead.</small></div><input id="gpu-toggle" class="switch" type="checkbox" ${state.prefs.gpu !== false ? 'checked' : ''}></label>`
    + runtimeRow('embedding') + runtimeRow('reasoning') + '</div>'
    + '<div id="local-models"></div>'
    + '<div class="panel"><h2>Library sources</h2><p>AppHub reads the Windows registry, Start menu, shortcuts, Store entries, WinGet and Steam. Add anything those miss.</p>'
    + `<button id="prefs-add" class="button subtle">${svg('plus')}Add an app…</button><button id="prefs-folder" class="button subtle">${svg('folder')}Add a folder…</button>`
    + (folders.length ? `<div class="folder-list"><small>Folders scanned on sync (top level only)</small>${folders.map(folder => `<div class="watched-folder"><span>${esc(folder)}${unavailable(folder) ? '<small> · Unavailable — reconnect and sync to retry</small>' : ''}</span><button class="text-button" data-remove-folder="${esc(folder)}">Stop scanning</button></div>`).join('')}</div>` : '')
    + '</div>'
    + `<div class="panel"><h2>Data</h2><p>Your library, preferences, search index and package history are stored on this PC. There is no account and no telemetry.</p><button id="open-data" class="button subtle">${svg('folder')}Open data folder</button><small class="path">${esc(state.dataDirectory || '')}</small></div>`
    + `<p class="footnote">AppHub ${esc(state.appVersion || '1.0.0')}</p>`;
  renderModels();
  document.querySelectorAll('[data-remove-folder]').forEach(b => b.onclick = () => attempt(() => api.removeFolder(b.dataset.removeFolder)));
  document.querySelectorAll('[data-theme-choice]').forEach(b => b.onclick = () => { theme = b.dataset.themeChoice; store('theme', theme); applyAppearance(); render(); });
  document.querySelectorAll('[data-accent-choice]').forEach(b => b.onclick = () => { accent = b.dataset.accentChoice; store('accent', accent); applyAppearance(); render(); });
  $('#ai-toggle').onchange = e => attempt(() => api.setAI(e.target.checked));
  $('#gpu-toggle').onchange = e => attempt(() => api.setGpu(e.target.checked));
  $('#prefs-add').onclick = () => attempt(() => api.addApp());
  $('#prefs-folder').onclick = () => attempt(() => api.addFolder());
  $('#open-data').onclick = () => attempt(() => api.openData());
}

function renderDiscover() {
  const rows = catalogPackages === null ? ''
    : catalogPackages.map(p => `<div class="update-row"><div class="plan-entry"><strong>${esc(p.name)}</strong><small>${esc(p.id)} · ${esc(p.version)}</small></div><button class="button subtle" data-catalog="${esc(p.id)}">View…</button></div>`).join('')
      || '<div class="empty"><h3>No packages found</h3><p>Try the app’s name or its publisher.</p></div>';
  $('#body').innerHTML = `<form id="catalog-form" class="large-search"><input id="catalog-query" class="text-input" value="${esc(catalogQuery)}" placeholder="Package name, such as VLC, Blender or PowerToys" aria-label="Search WinGet catalog" minlength="2" maxlength="100" required><button id="catalog-submit" class="button primary" ${catalogLoading ? 'disabled' : ''}>${catalogLoading ? 'Searching…' : 'Search WinGet'}</button></form>`
    + `<div id="catalog-results" class="rows" aria-live="polite">${rows}</div>`
    + '<p class="footnote">Results come from the WinGet community repository. You see the package details before anything is installed.</p>';
  $('#catalog-query').oninput = e => { catalogQuery = e.target.value; };
  $('#catalog-results').onclick = e => { const button = e.target.closest('[data-catalog]'); if (button) inspectCatalog(catalogPackages?.find(p => p.id === button.dataset.catalog)); };
  $('#catalog-form').onsubmit = async e => {
    e.preventDefault();
    const q = $('#catalog-query').value.trim();
    if (q.length < 2) { toast('Enter at least two characters', true); return; }
    catalogQuery = q;
    const seq = ++catalogGeneration;
    catalogLoading = true;
    renderDiscover();
    try {
      const packages = await api.catalog(q);
      if (seq === catalogGeneration) catalogPackages = packages;
    } catch (error) {
      if (seq === catalogGeneration) toast(cleanError(error), true);
    } finally {
      if (seq === catalogGeneration) { catalogLoading = false; if (view === 'discover' && !query.trim()) renderDiscover(); }
    }
  };
}
async function packageInfo(a) {
  const close = '<div class="modal-actions"><button id="cancel-modal" class="button subtle">Close</button></div>';
  const token = modal(`<h2>${esc(a.name)}</h2><p>Reading ${esc(a.packageId)} from WinGet…</p>${close}`);
  try {
    const text = await api.packageInfo({id: a.packageId, source: a.packageSource});
    if (modalIsCurrent(token)) modal(`<h2>${esc(a.name)}</h2><pre>${esc(text)}</pre>${close}`);
  } catch (e) {
    if (modalIsCurrent(token)) { closeModal(); toast(cleanError(e), true); }
  }
}
async function inspectCatalog(p) {
  if (!p) return;
  const token = modal(`<h2>${esc(p.name)}</h2><p>Loading package details…</p><div class="modal-actions"><button id="cancel-modal" class="button subtle">Close</button></div>`);
  try {
    const info = await api.packageInfo(p);
    if (!modalIsCurrent(token)) return;
    modal(`<h2>${esc(p.name)}</h2><p>Check the publisher, licence and installer. WinGet installs the latest release.</p><pre>${esc(info)}</pre><div class="modal-actions"><button id="cancel-modal" class="button subtle">Cancel</button><button id="catalog-install" class="button primary">Install</button></div>`);
    $('#catalog-install').onclick = e => queueFromModal(e.currentTarget, () => api.install(p), 'Installation queued');
  } catch (e) {
    if (modalIsCurrent(token)) { closeModal(); toast(cleanError(e), true); }
  }
}

function renderModelsContent() {
  const host = $('#local-models'), m = state.models;
  if (!host) return;
  if (!m) { host.innerHTML = '<section class="panel"><h2>Local models</h2><p>Loading model settings…</p></section>'; return; }
  const profiles = m.profiles || [];
  if (!modelDraft) modelDraft = {...m.active, threads: m.settings?.threads || 4, context: m.settings?.context || 8192, queryPrefix: m.settings?.queryPrefix || '', documentPrefix: m.settings?.documentPrefix || ''};
  for (const role of ['embedding', 'reasoning']) if (modelDraft[role] !== 'off' && !profiles.some(p => p.id === modelDraft[role])) modelDraft[role] = m.active[role];
  const busy = modelPending || m.busy, open = host.querySelector('details')?.open, off = busy ? 'disabled' : '';

  const choice = role => {
    const p = profiles.find(p => p.id === modelDraft[role]), test = p?.lastTest;
    const options = (role === 'reasoning' ? `<option value="off" ${modelDraft[role] === 'off' ? 'selected' : ''}>Off — embeddings only</option>` : '')
      + profiles.filter(p => p.role === role).map(p => `<option value="${esc(p.id)}" ${modelDraft[role] === p.id ? 'selected' : ''}>${esc(p.name)}${m.active[role] === p.id ? ' · Active' : ''}${p.builtin ? ' · Bundled' : ''}</option>`).join('');
    const tested = test
      ? (test.ok ? 'Check passed' : 'Check failed') + ' · ' + esc(test.message || '') + (test.dimensions ? ' · ' + esc(test.dimensions) + ' dimensions' : '') + (test.elapsedMs ? ' · ' + (test.elapsedMs / 1000).toFixed(1) + 's' : '') + (p.validatedAt ? ' · ' + esc(new Date(p.validatedAt).toLocaleString()) : '')
      : 'Not checked yet';
    const info = p
      ? `<strong>${p.builtin ? 'Bundled' : 'Local'}${p.bytes ? ' · ' + (p.bytes / 1048576).toFixed(1) + ' MB' : ''}${p.dtype ? ' · ' + esc(p.dtype) : ''}</strong><span>${esc(p.location || 'Bundled with AppHub')}</span><span>${tested}</span>`
      : 'Matching by meaning still works with interpretation off.';
    return `<div class="model-choice"><label for="model-${role}">${role === 'embedding' ? 'Matching model' : 'Interpretation model'}</label><select id="model-${role}" ${off}>${options}</select><div class="model-info">${info}</div>`
      + `<div class="model-actions"><button class="button subtle" data-model-add="${role}" ${off}>${svg('plus')}Add local model…</button><button class="button primary" data-model-use="${role}" ${off}>${modelDraft[role] === 'off' ? 'Use embeddings only' : 'Test & use'}</button>`
      + (p && !p.builtin && m.active[role] !== p.id ? `<button class="text-button" data-model-remove="${esc(p.id)}" ${off}>Remove from list</button>` : '') + '</div></div>';
  };
  const tuning = [['threads', 'CPU threads', [1, 2, 4, 6, 8]], ['context', 'Context size', [2048, 4096, 8192]]]
    .map(([key, label, values]) => `<label>${label} <select id="model-${key}" ${off}>${values.map(n => `<option ${+modelDraft[key] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('');
  const prefixes = ['queryPrefix', 'documentPrefix']
    .map(key => `<label class="model-prefix">${key === 'queryPrefix' ? 'Search prefix' : 'Document prefix'} <input id="model-${key}" class="text-input" maxlength="100" value="${esc(modelDraft[key])}" ${off}></label>`).join('');

  const gbs = n => (n / 1073741824).toFixed(1) + ' GB';
  const downloads = (m.downloads || []).map(d => {
    const now = m.downloading?.id === d.id ? m.downloading : null, active = !!d.profile && m.active.chat === d.profile;
    const status = now ? `${now.stage} · ${gbs(now.received)} of ${gbs(now.total)}`
      : active ? 'Now answering in Chat.' : d.profile ? 'Downloaded, not in use.' : d.fits ? `${gbs(d.bytes)} download, kept in your AppHub data folder.` : `Needs a PC with ${d.memoryGb} GB of memory.`;
    const action = now ? '<button class="button subtle" data-download-cancel>Pause</button>'
      : active ? `<span class="pill ok">In use</span><button class="text-button" data-download-use="" ${off}>Stop using</button>`
      : d.profile ? `<button class="button primary" data-download-use="${esc(d.profile)}" ${off}>Use for Chat</button><button class="text-button" data-download-remove="${esc(d.id)}" ${off}>Delete</button>`
      : `<button class="button primary" data-download="${esc(d.id)}" ${busy || !d.fits ? 'disabled' : ''}>Download</button>`;
    return `<div class="setting-row download-row"><div><strong>${esc(d.name)} · optional</strong><small>A larger model for Chat only; search keeps the faster one. Its answers are fuller and it follows longer questions better, but replies take about twice as long and it uses about 6 GB of memory while loaded. A graphics card is strongly recommended. ${status}</small>`
      + (now ? `<div class="bar"><i style="width:${Math.round(now.received / now.total * 100)}%"></i></div>` : '') + `</div><div class="download-actions">${action}</div></div>`;
  }).join('');

  host.innerHTML = '<section class="panel models-panel"><h2>Local models</h2><p>Pick the models used for matching and interpretation. The current model stays active until the replacement passes its compatibility check.</p>'
    + downloads
    + `<div class="model-grid">${['embedding', 'reasoning'].map(choice).join('')}</div>`
    + `<div class="model-tuning">${tuning}<small>Applied when you test and use an interpretation model.</small></div>`
    + `<div class="notice ${modelError || m.warning ? 'warn' : ''}" role="status" aria-live="polite">${esc(modelError || m.warning || m.message || (busy ? 'Checking compatibility…' : 'Ready.'))}</div>`
    + `<details ${open ? 'open' : ''}><summary>Compatibility details</summary><p>For matching, choose a local Transformers.js folder with config, tokenizer and ONNX files. It must support feature extraction with mean pooling. For interpretation, choose a GGUF file with a chat template that fits this PC’s CPU and memory. Larger context sizes need more memory.</p><p>Removing an entry leaves its files on your PC.</p>${prefixes}<p>Leave prefixes empty unless the matching model requires them, such as E5’s query: and passage: prefixes.</p></details>`
    + `<button id="models-reset" class="button subtle" ${off}>Reset to bundled models</button></section>`;

  for (const role of ['embedding', 'reasoning']) $('#model-' + role).onchange = e => { modelDraft[role] = e.target.value; modelError = ''; renderModels(); };
  for (const key of ['threads', 'context']) $('#model-' + key).onchange = e => modelDraft[key] = +e.target.value;
  for (const key of ['queryPrefix', 'documentPrefix']) $('#model-' + key).oninput = e => modelDraft[key] = e.target.value;
  host.querySelectorAll('[data-model-add]').forEach(b => b.onclick = () => runModelAction(async () => {
    const before = new Set((state.models?.profiles || []).map(p => p.id)), result = await api.addModel(b.dataset.modelAdd);
    if (result) { const p = result.profiles?.find(p => !before.has(p.id)); if (p) modelDraft[p.role] = p.id; }
    return result;
  }));
  host.querySelectorAll('[data-model-use]').forEach(b => b.onclick = () => runModelAction(() => api.activateModel(b.dataset.modelUse, modelDraft[b.dataset.modelUse], {threads: +modelDraft.threads, context: +modelDraft.context, queryPrefix: modelDraft.queryPrefix, documentPrefix: modelDraft.documentPrefix})));
  host.querySelectorAll('[data-model-remove]').forEach(b => b.onclick = () => runModelAction(() => api.removeModel(b.dataset.modelRemove)));
  $('#models-reset').onclick = () => runModelAction(async () => { const r = await api.resetModels(); modelDraft = null; return r; });
  // A download runs in the background, so it does not lock the rest of this panel the way a compatibility check does.
  host.querySelectorAll('[data-download]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const result = await attempt(() => api.downloadModel(b.dataset.download));
    if (result) { state.models = result; modelDraft = null; toast('The larger model now answers in Chat'); }
    if (view === 'preferences' && !query) renderModels();
  });
  host.querySelector('[data-download-cancel]')?.addEventListener('click', () => api.cancelDownload().catch(() => {}));
  host.querySelectorAll('[data-download-use]').forEach(b => b.onclick = () => runModelAction(async () => { const r = await api.chatModel(b.dataset.downloadUse || null); modelDraft = null; return r; }));
  host.querySelectorAll('[data-download-remove]').forEach(b => b.onclick = () => runModelAction(async () => { const r = await api.removeDownload(b.dataset.downloadRemove); modelDraft = null; return r; }));
}
async function runModelAction(action) {
  if (modelPending || state.models?.busy) return;
  modelPending = true; modelError = '';
  renderModels();
  try {
    const result = await action();
    if (result) state.models = result.models || result;
  } catch (e) {
    modelError = cleanError(e);
  } finally {
    modelPending = false;
    if (view === 'preferences' && !query) renderModels();
    updateFooter();
  }
}
function updateModelRuntime() {
  const description = $('#model-description');
  if (description) description.textContent = modelDescription();
  for (const role of ['embedding', 'reasoning']) {
    const runtime = (role === 'embedding' ? state.ai : state.reasoner) || {};
    const title = $(`#${role}-title`), detail = $(`#${role}-runtime`), status = $(`#${role}-runtime-status`);
    if (title) title.textContent = modelName(role);
    if (detail) detail.textContent = (runtime.message || 'Sleeping') + (runtime.pid ? ' · Process ' + runtime.pid : '');
    if (status) status.textContent = statusLabel(runtime.status);
  }
}

// Home: ask box, live system gauges, favorites and recently opened apps.
function refreshSystem() {
  if (systemLoading || !api.system) return;
  systemLoading = true;
  api.system().then(info => { systemInfo = info; if (view === 'home' && !query) updateGauges(); }).catch(() => {}).finally(() => { systemLoading = false; });
}
function gauge(id, label, fraction, value, detail, ask) {
  const known = Number.isFinite(fraction), p = known ? Math.max(0, Math.min(1, fraction)) : 0;
  return `<button class="stat" data-gauge="${id}" data-ask="${esc(ask)}" title="Ask about this"><svg class="ring${p > .9 ? ' high' : ''}" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="24"/><circle class="ring-value" cx="30" cy="30" r="24" stroke-dasharray="${(p * 150.8).toFixed(1)} 150.8"/></svg>`
    + `<span class="stat-text"><small>${label}</small><strong>${esc(value)}</strong><small>${esc(detail)}</small></span></button>`;
}
function gauges() {
  const s = systemInfo;
  if (!s) return ['Memory', 'Storage', 'Processor'].map(label => `<div class="stat loading"><svg class="ring" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="24"/></svg><span class="stat-text"><small>${label}</small><strong>…</strong><small>Reading</small></span></div>`).join('');
  const used = s.memoryTotalGb - s.memoryFreeGb, disk = s.disks?.[0];
  return gauge('memory', 'Memory', used / s.memoryTotalGb, Math.round(used / s.memoryTotalGb * 100) + '%', `${used.toFixed(1)} of ${Math.round(s.memoryTotalGb)} GB`, 'What is using the most memory right now?')
    + (disk ? gauge('disk', 'Storage ' + disk.drive, 1 - disk.freeGb / disk.sizeGb, Math.round(disk.freeGb) + ' GB free', `of ${Math.round(disk.sizeGb)} GB`, 'How much disk space is free?') : '')
    + gauge('cpu', 'Processor', s.cpuLoad == null ? NaN : s.cpuLoad / 100, s.cpuLoad == null ? '—' : s.cpuLoad + '%', s.byCpu?.[0] ? 'Top: ' + s.byCpu[0].name : 'Mostly idle', 'What is using the most CPU right now?');
}
function updateGauges() {
  const host = $('#gauges');
  if (!host) return;
  // Update rings in place so they animate instead of being replaced.
  if (!systemInfo || !host.querySelector('[data-gauge]')) { host.innerHTML = gauges(); return; }
  const next = document.createElement('div');
  next.innerHTML = gauges();
  next.querySelectorAll('[data-gauge]').forEach(fresh => {
    const old = host.querySelector(`[data-gauge="${fresh.dataset.gauge}"]`);
    if (!old) return;
    old.querySelector('.ring-value').setAttribute('stroke-dasharray', fresh.querySelector('.ring-value').getAttribute('stroke-dasharray'));
    old.querySelector('.ring').setAttribute('class', fresh.querySelector('.ring').getAttribute('class'));
    old.querySelector('.stat-text').innerHTML = fresh.querySelector('.stat-text').innerHTML;
  });
}
function renderHome() {
  const live = state.items.filter(a => !a.hidden);
  const favorites = live.filter(a => a.favorite).sort((a, b) => a.name.localeCompare(b.name));
  const recent = live.filter(a => a.lastLaunch).sort((a, b) => b.lastLaunch.localeCompare(a.lastLaunch)).slice(0, 12);
  const updates = live.filter(a => a.available), apps = live.filter(a => a.kind === 'app');
  const section = (title, items, link, emptyText) => `<section class="home-section"><div class="section-head"><h2>${title}</h2>${link && items.length ? `<button class="text-button" data-view="${link}">See all</button>` : ''}</div>`
    + (items.length ? `<div class="grid card-host">${items.map(a => card(a, 'grid')).join('')}</div>` : `<p class="section-empty">${emptyText}</p>`) + '</section>';
  const aiOff = state.prefs.aiEnabled === false || state.models?.active?.reasoning === 'off';
  $('#body').innerHTML = [...new Set(state.warnings || [])].map(w => `<div class="notice warn">${esc(w)}</div>`).join('')
    + `<div class="home"><h1>${new Date().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</h1>`
    + `<form id="ask-form" class="ask">${svg('chat')}<input id="ask-input" maxlength="2000" autocomplete="off" placeholder="${aiOff ? 'Chat is off — turn on local AI in Settings' : 'Ask about your apps or this PC'}" aria-label="Ask the local assistant" value="${esc(askDraft)}" ${aiOff ? 'disabled' : ''}><button class="send" aria-label="Ask" ${aiOff ? 'disabled' : ''}>${svg('arrow')}</button></form>`
    + `<section class="stats"><div id="gauges" class="gauge-row">${gauges()}</div>`
    + `<button class="stat count-stat${updates.length ? ' attention' : ''}" data-view="updates"><strong>${updates.length}</strong><span class="stat-text"><small>Updates</small><small>${updates.length ? 'Review and install' : state.packageChecked ? 'All up to date' : 'Not checked yet'}</small></span></button>`
    + `<button class="stat count-stat" data-view="all"><strong>${apps.length}</strong><span class="stat-text"><small>Apps</small><small>${state.scanning ? 'Syncing…' : 'Browse the library'}</small></span></button></section>`
    + section('Favorites', favorites, 'favorites', 'Star an app to pin it here. Hover a tile and click the star.')
    + section('Recently opened', recent, 'recent', 'Apps you open from AppHub show up here.') + '</div>';
  document.querySelectorAll('#body .card-host').forEach(bindCards);
  $('#ask-input').oninput = e => { askDraft = e.target.value; };
  $('#ask-form').onsubmit = e => { e.preventDefault(); const text = askDraft; askDraft = ''; sendChat(text); };
  $('#body').onclick = e => {
    const ask = e.target.closest('[data-ask]'), go = e.target.closest('[data-view]');
    if (ask && !ask.closest('.chat')) sendChat(ask.dataset.ask);
    else if (go) navigate(go.dataset.view);
  };
  refreshSystem();
  clearInterval(systemTimer);
  systemTimer = setInterval(() => { if (view === 'home' && !query && !document.hidden) refreshSystem(); else if (view !== 'home') { clearInterval(systemTimer); systemTimer = null; } }, 20000);
}

// Chat: the model answers from the library, a system snapshot and the lookups it asked for. Every action is a button under its reply, and each one asks before it runs.
const CHAT_EXAMPLES = ['What is using the most memory right now?', 'Has anything crashed this week?', 'What is taking up space on my disk?', 'What starts with Windows?'];
function chatSuggestions(m, index) {
  const rows = (m.suggestions || []).map((s, i) => {
    const act = (verb, label, style = 'subtle') => s.done ? '' : `<button class="button ${style}" data-chat-act="${index}:${i}:${verb}">${label}</button>`;
    const row = (subject, title, detail, buttons) => `<div class="suggestion" ${tintAttrs(subject)}>${icon(subject)}<div class="suggestion-text"><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>${s.done ? `<span class="pill">${esc(s.done)}</span>` : ''}${buttons}</div>`;
    if (!s.type || s.type === 'entry') {
      const a = item(s.id);
      if (!a || a.hidden) return '';
      const id = esc(a.id), detail = a.available ? `${a.version || ''} → ${a.available}` : a.kind === 'setting' ? 'Windows setting' : a.publisher || a.category || '';
      return row(a, a.name, detail, (s.uninstall && a.kind === 'app' ? act('uninstall', 'Uninstall…') : '')
        + (a.available ? `<button class="button subtle" data-chat-update="${id}">Update…</button>` : '')
        + (a.launch && !s.uninstall ? `<button class="button primary" data-chat-open="${id}" ${a.unavailable ? 'disabled' : ''}>Open</button>` : '')
        + `<button class="icon-button" data-chat-info="${id}" aria-label="Details for ${esc(a.name)}" title="Details">${svg('dots')}</button>`);
    }
    const subject = {id: s.type + ':' + s.name, name: String(s.name || '?')};
    if (s.type === 'process') return row(subject, s.name, `Running${s.count > 1 ? ` · ${s.count} processes` : ''}${s.memoryGb ? ` · ${s.memoryGb} GB of memory` : ''}`, act('end', 'End…'));
    if (s.type === 'startup') return row(subject, s.name, 'Starts with Windows', act('startup', 'Disable…'));
    if (s.type === 'package') return row(subject, s.name, `${s.id} · ${s.version || 'latest'} · WinGet catalog`, act('install', 'Install…', 'primary'));
    if (s.type === 'updates') {
      const ready = (s.ids || []).filter(id => item(id)?.available).length;
      return ready > 1 ? row({id: 'updates', name: 'Updates'}, plural(ready, 'app update'), 'You choose which ones install', act('updates', 'Review all…', 'primary')) : '';
    }
    return '';
  }).join('');
  return rows ? `<div class="suggestions">${rows}</div>` : '';
}
function chatAct(index, i, verb) {
  const s = chat[index]?.suggestions?.[i];
  if (!s) return;
  const done = label => () => { s.done = label; if (view === 'chat' && !query) render(); };
  if (verb === 'uninstall') { const a = item(s.id); if (a) confirmUninstall(a, done('Queued')); }
  else if (verb === 'end') confirmEnd(s, done('Ended'));
  else if (verb === 'startup') confirmStartup(s, done('Disabled'));
  else if (verb === 'install') inspectCatalog(s);
  else if (verb === 'updates') { const apps = (s.ids || []).map(item).filter(a => a?.available); if (apps.length) reviewUpdates(apps); }
}
function chatMessage(m, index) {
  if (m.role === 'user') return `<div class="msg user"><div class="bubble">${esc(m.content)}</div></div>`;
  return `<div class="msg bot"><span class="avatar">${svg('mark')}</span><div class="bubble${m.error ? ' error' : ''}">${esc(m.error || m.content)}${m.stopped ? '<small class="stopped">Stopped</small>' : ''}${m.truncated ? '<small class="stopped">Reached the length limit for one reply. Ask it to continue.</small>' : ''}`
    + `${m.looked?.length ? `<small class="looked">Checked ${esc(m.looked.join(', '))}</small>` : ''}${chatSuggestions(m, index)}</div></div>`;
}
function renderChat() {
  const log = $('#chat-log'), pinned = !log || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const chatProfile = state.models?.profiles?.find(p => p.id === state.models?.active?.chat), engine = chatProfile ? state.chatEngine : state.reasoner;
  const off = state.prefs.aiEnabled === false ? 'Local AI is turned off.' : state.models?.active?.reasoning === 'off' && !chatProfile ? 'No chat model is selected.' : '';
  const pending = chatBusy ? `<div class="msg bot"><span class="avatar working">${svg('mark')}</span><div class="bubble"><span id="chat-stream">${esc(chatStream)}</span>${chatStream ? '<i class="caret"></i>' : `<span class="typing" id="chat-status">${esc(chatStatus || 'Thinking…')}</span>`}</div></div>` : '';
  const empty = '<div class="chat-empty"><h2>Ask about this PC</h2>'
    + '<p>Chat runs on this PC. It reads your app library and system information, and looks things up when a question needs them: running programs, services, folder sizes, network status, recent crashes, Windows Update history, battery health, startup programs, hardware and the WinGet catalog. It never opens your files, and it cannot change anything itself. It offers buttons, and each one asks before it runs.</p>'
    + (off ? `<div class="notice warn">${off} <button class="text-button" data-view="preferences">Open Settings</button></div>` : `<div class="examples">${CHAT_EXAMPLES.map(q => `<button class="example" data-ask="${esc(q)}">${esc(q)}${svg('arrow')}</button>`).join('')}</div>`) + '</div>';
  $('#body').innerHTML = `<div class="chat"><div class="chat-log" id="chat-log">${chat.length || chatBusy ? chat.map(chatMessage).join('') + pending : empty}</div>`
    + `<form id="chat-form" class="composer"><textarea id="chat-input" rows="1" maxlength="2000" placeholder="Ask about your apps or this PC" aria-label="Message" ${off ? 'disabled' : ''}>${esc(chatDraft)}</textarea>`
    + (chatBusy ? `<button type="button" id="chat-stop" class="send stop" aria-label="Stop" title="Stop">${svg('stop')}</button>` : `<button class="send" aria-label="Send" title="Send" ${off ? 'disabled' : ''}>${svg('send')}</button>`) + '</form>'
    + `<small class="chat-note">${esc(chatProfile?.name || modelName('reasoning'))} · ${engine?.device ? 'running on the ' + esc(engine.device) : 'on this PC'} · answers can be wrong, so check anything important</small></div>`;
  const next = $('#chat-log');
  if (pinned) next.scrollTop = next.scrollHeight;
  const input = $('#chat-input');
  const fit = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  fit();
  input.oninput = () => { chatDraft = input.value; fit(); };
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chat-form').requestSubmit(); } };
  $('#chat-form').onsubmit = e => { e.preventDefault(); if (!chatBusy) sendChat(chatDraft); };
  $('#chat-stop')?.addEventListener('click', () => api.stopChat().catch(() => {}));
  $('#body').onclick = e => {
    const pick = name => e.target.closest(`[data-chat-${name}]`)?.dataset['chat' + name[0].toUpperCase() + name.slice(1)];
    const ask = e.target.closest('[data-ask]'), go = e.target.closest('[data-view]');
    if (pick('act')) { const [index, i, verb] = pick('act').split(':'); chatAct(+index, +i, verb); }
    else if (pick('open')) launch(pick('open'));
    else if (pick('update')) { const a = item(pick('update')); if (a?.available) reviewUpdates([a]); }
    else if (pick('info')) openDetails(pick('info'));
    else if (ask) sendChat(ask.dataset.ask);
    else if (go) navigate(go.dataset.view);
  };
}
function updateChatStream() {
  const el = $('#chat-stream');
  if (!el) return;
  const log = $('#chat-log'), pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  if (!el.nextElementSibling?.classList.contains('caret')) { el.nextElementSibling?.remove(); el.insertAdjacentHTML('afterend', '<i class="caret"></i>'); }
  el.textContent = chatStream;
  if (pinned) log.scrollTop = log.scrollHeight;
}
function updateChatStatus() {
  const el = $('#chat-status');
  if (el) el.textContent = chatStatus || 'Thinking…';
}
function newChat() {
  if (chatBusy) api.stopChat().catch(() => {});
  chatEpoch++; chat = []; chatBusy = false; chatStream = '';
  render();
  $('#chat-input')?.focus();
}
async function sendChat(text) {
  text = String(text || '').trim();
  if (!text || chatBusy) return;
  const epoch = chatEpoch;
  chat.push({role: 'user', content: text});
  chatBusy = true; chatStream = ''; chatStatus = ''; chatDraft = '';
  if ($('#chat-input')) $('#chat-input').value = ''; // otherwise focus retention restores the sent text
  if (view !== 'chat' || query) navigate('chat'); else render();
  const log = $('#chat-log');
  if (log) log.scrollTop = log.scrollHeight;
  try {
    const r = await api.chat(chat.filter(m => !m.error).map(({role, content}) => ({role, content})));
    if (epoch === chatEpoch) chat.push({role: 'assistant', content: String(r.reply || ''), truncated: !!r.truncated, looked: Array.isArray(r.looked) ? r.looked : [], suggestions: Array.isArray(r.suggestions) ? r.suggestions : []});
  } catch (e) {
    if (epoch !== chatEpoch) return;
    const message = cleanError(e);
    if (message !== 'Stopped') chat.push({role: 'assistant', content: '', error: message});
    else if (chatStream) chat.push({role: 'assistant', content: chatStream, stopped: true});
    else chat.pop();
  } finally {
    if (epoch === chatEpoch) {
      chatBusy = false; chatStream = '';
      if (view === 'chat' && !query) { render(); $('#chat-input')?.focus(); }
    }
  }
}

$('#modal').addEventListener('cancel', () => { modalGeneration++; });

let debounce;
$('#search').oninput = () => {
  if (searching) api.cancelSearch?.().catch(() => {});
  clearTimeout(debounce);
  query = $('#search').value.trim();
  const seq = ++generation;
  searching = !!query.trim();
  searchWarning = ''; searchAnswer = ''; searchRecommendations = []; searchReasons = new Map(); reasoningWarning = '';
  results = searching ? [] : null;
  selected = null;
  render();
  if (!searching) return;
  const q = query;
  let semanticFinished = false;
  api.search(q, false)
    .then(r => { if (seq === generation && !semanticFinished) { results = r.items; renderLibrary(); } })
    .catch(e => { if (seq === generation && !semanticFinished) toast(cleanError(e), true); });
  debounce = setTimeout(async () => {
    try {
      const r = await api.search(q, true);
      if (seq !== generation) return;
      semanticFinished = true; searching = false;
      results = r.items;
      searchWarning = r.warning || '';
      searchAnswer = typeof r.answer === 'string' ? r.answer : '';
      searchRecommendations = Array.isArray(r.recommendations) ? [...new Set(r.recommendations.filter(id => typeof id === 'string'))].slice(0, 4) : [];
      searchReasons = new Map((Array.isArray(r.matches) ? r.matches : []).filter(m => m && typeof m.id === 'string' && typeof m.reason === 'string').map(m => [m.id, m.reason]));
      reasoningWarning = r.reasoningWarning || '';
      if (r.ai) state.ai = r.ai;
      if (r.reasoner) state.reasoner = r.reasoner;
      renderLibrary();
      updateFooter();
    } catch (e) {
      if (seq !== generation) return;
      searching = false;
      searchWarning = 'Local AI search is unavailable';
      renderLibrary();
      toast(cleanError(e), true);
    }
  }, 300);
};
$('#search').onkeydown = e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); $('#app-list .app-card')?.focus(); }
  if (e.key === 'Enter') { e.preventDefault(); const a = query && visibleItems()[0]; if (a) activate(a.id); }
};

$('#refresh').innerHTML = svg('sync') + '<span>Sync</span>';
$('#preferences').innerHTML = svg('gear') + '<span class="nav-text">Settings</span>';
$('#navigation').onclick = e => { const b = e.target.closest('[data-view]'); if (b) navigate(b.dataset.view); };
$('#preferences').onclick = () => navigate('preferences');
$('#ai-status').onclick = () => navigate('preferences');
$('#job-status').onclick = () => navigate('activity');
$('#refresh').onclick = () => attempt(async () => { await api.scan(); toast('Library synced'); });
for (const a of ['minimize', 'maximize', 'close']) $('#' + a).onclick = () => api.windowAction(a);

document.addEventListener('keydown', e => {
  if (!$('#modal').open && (e.ctrlKey || e.metaKey) && ['k', 'f'].includes(e.key.toLowerCase())) { e.preventDefault(); $('#search').focus(); $('#search').select(); }
  if (e.key === 'Escape') {
    if ($('#modal').open) { e.preventDefault(); closeModal(); }
    else if (selected) $('#close-detail').click();
    else if (query) { $('#search').value = ''; $('#search').dispatchEvent(new Event('input')); }
  }
});

api.onChange(data => {
  if (data.searchPreview) {
    if (data.searchPreview.query === query && searching) { results = data.searchPreview.items; renderLibrary(); }
    return;
  }
  if (data.chatDelta) {
    if (chatBusy && typeof data.chatDelta.text === 'string') { chatStream = data.chatDelta.text; updateChatStream(); }
    return;
  }
  if (data.chatStatus) {
    if (chatBusy && typeof data.chatStatus.text === 'string') { chatStatus = data.chatStatus.text; updateChatStatus(); }
    return;
  }
  if ('chatEngine' in data) { state.chatEngine = data.chatEngine; if (!data.ai && !data.reasoner && !data.models && !data.items) return; }
  if (data.focusSearch) { $('#search').focus(); return; }
  if (data.error) { toast(data.error, true); return; }
  if (data.models) state.models = data.models;
  if (data.ai || data.reasoner) {
    if (data.ai) state.ai = data.ai;
    if (data.reasoner) state.reasoner = data.reasoner;
    updateFooter();
    if (view === 'preferences' && !query) { updateModelRuntime(); if (data.models) renderModels(); }
    return;
  }
  if (data.models) {
    if (view === 'preferences' && !query) renderModels();
    updateFooter();
    return;
  }
  if (data.jobUpdate) {
    const j = state.jobs.find(j => j.id === data.jobUpdate.id);
    if (j) Object.assign(j, data.jobUpdate);
    updateJobStatus();
    if (view === 'activity' && !query) renderActivity();
    return;
  }
  state = {...state, ...data};
  if (results) {
    const lookup = new Map(state.items.map(a => [a.id, a]));
    results = results.filter(a => lookup.has(a.id)).map(a => ({...a, ...lookup.get(a.id)}));
  }
  render();
});
attempt(async () => { state = await api.snapshot(); render(); });
