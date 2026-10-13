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
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
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
  {id: 'claret', name: 'Claret', colors: ['#1d0b0e', '#a3263a', '#f8ece6'], accent: '#a3263a'},
  {id: 'crimson', name: 'Crimson', colors: ['#5b101b', '#7d1f2e', '#fdf1ea'], accent: '#f6d3c8'},
  {id: 'light', name: 'Light', colors: ['#ffffff', '#ebebee', '#1b1c1f']},
  {id: 'paper', name: 'Paper', colors: ['#fbf8f1', '#e9e2d3', '#2b2620']},
  {id: 'sand', name: 'Sand', colors: ['#f6efe4', '#e3d7c4', '#2e261c']},
  {id: 'sage', name: 'Sage', colors: ['#f2f5ef', '#dbe3d5', '#1f2a22']},
  {id: 'blossom', name: 'Blossom', colors: ['#fbf3f4', '#ecdcdf', '#2d2023']},
  {id: 'sky', name: 'Sky', colors: ['#f2f6fb', '#d9e4f1', '#1b2530']},
  {id: 'vellum', name: 'Vellum', colors: ['#efe4da', '#a4202f', '#2a1719'], accent: '#a4202f'}
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
let systemTimer = null, homeHistory = [], homeLoading = false, homeRead = 0;
let hardwareInfo = null, hardwareTimer = null, hardwareLoading = false, hardwareError = '';
let hardwareHistory = [], hardwareTab = stored('hardwareTab') || 'cpu', hardwareSort = {key: 'memoryBytes', down: true}, hardwareAll = false, hardwarePainted = '';
let heldOpen = false;
const sourceOpen = new Map();
const policyPending = new Set(), chatOpening = new Set();
const recentlyActivated = new Set();

const nav = [
  ['', [['home', 'home', 'Home'], ['chat', 'chat', 'Chat'], ['hardware', 'chip', 'Hardware']]],
  ['Library', [['all', 'grid', 'Apps'], ['favorites', 'star', 'Favorites'], ['recent', 'clock', 'Recent'], ['settings', 'sliders', 'Windows settings']]],
  ['Packages', [['updates', 'download', 'Updates'], ['discover', 'plus', 'Install apps'], ['reproduce', 'swap', 'Export & restore'], ['activity', 'pulse', 'Activity']]]
];
const categories = ['Development', 'Creative', 'Music & audio', 'Productivity', 'Browsers', 'Communication', 'Games', 'Utilities'];
const titles = {home: 'Home', chat: 'Chat', hardware: 'Hardware', all: 'Apps', favorites: 'Favorites', recent: 'Recent', settings: 'Windows settings', updates: 'Updates', discover: 'Install apps', reproduce: 'Export & restore', activity: 'Activity', preferences: 'Settings'};

const item = id => state.items.find(a => a.id === id);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const cleanError = e => (e?.message || String(e)).replace(/^Error invoking remote method '[^']+': Error: /, '');
const modelName = role => role === 'reasoning' && state.models?.active?.reasoning === 'off'
  ? 'Interpretation off'
  : String((role === 'embedding' ? state.ai : state.reasoner)?.model || state.models?.profiles?.find(p => p.id === state.models?.active?.[role])?.name || (role === 'embedding' ? 'Local retrieval' : 'Local interpretation'));
const modelDescription = () => `${modelName('embedding')} finds apps and Windows settings by meaning. `
  + (state.models?.active?.reasoning === 'off' ? 'Search interpretation is off. ' : `${modelName('reasoning')} reads each search and lists the entries that fit. `)
  + (state.models?.active?.reasoning === 'off' && !state.models?.active?.chat ? 'Chat has no selected model. ' : `${state.models?.profiles?.find(p => p.id === state.models?.active?.chat)?.name || modelName('reasoning')} answers in Chat. `)
  + 'One AI model runs at a time and unloads after 60 seconds idle.'
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
  const ai = state.ai || {}, reasoner = state.reasoner || {}, chatEngine = state.chatEngine || {};
  const reasoning = reasoner.pid || ['loading', 'starting', 'thinking'].includes(reasoner.status);
  const chatting = chatEngine.pid || ['loading', 'starting', 'thinking', 'ready'].includes(chatEngine.status);
  const retrieving = ai.pid || ['loading', 'starting', 'running', 'ready', 'searching'].includes(ai.status);
  const off = state.prefs.aiEnabled === false;
  $('#ai-status span').textContent = off ? 'Local AI off'
    : chatting ? chatEngine.message || 'Local AI ready'
    : reasoning ? reasoner.message || modelName('reasoning') + ' interpreting…'
    : retrieving ? ai.message || 'Local search ready'
    : 'Local AI asleep';
  $('#ai-status').classList.toggle('active', !off && !!(reasoning || retrieving || chatting));
  $('#ai-status').title = `${modelName('embedding')} finds matches; ${modelName('reasoning')} interprets requests. Click for settings.`;
}

// Preserve keyboard position and unfinished input during background updates.
function retainFocus(renderView) {
  const active = document.activeElement;
  const scrolls = ['content', 'chat-log', 'details'].map(id => { const el = document.getElementById(id); return el && {id, top: el.scrollTop, pinned: id === 'chat-log' && el.scrollHeight - el.scrollTop - el.clientHeight < 80}; }).filter(Boolean);
  const marker = active && active !== document.body && active !== document.documentElement ? {
    id: active.id, tag: active.tagName, data: {...active.dataset}, card: active.closest('.app-card')?.dataset.id,
    value: active.matches('input:not([type=checkbox]):not([type=radio]),textarea') ? active.value : undefined,
    start: active.selectionStart, end: active.selectionEnd
  } : null;
  renderView();
  for (const scroll of scrolls) { const el = document.getElementById(scroll.id); if (el) el.scrollTop = scroll.pinned ? el.scrollHeight : scroll.top; }
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
  const updates = state.items.filter(a => a.available && !a.updateBlocked).length;
  const counts = {all: state.items.filter(a => a.kind === 'app' && !a.hidden).length, updates};
  $('#navigation').innerHTML = nav.map(([group, entries]) => `<div class="nav-group">${group ? `<span class="nav-label">${group}</span>` : ''}${entries.map(([id, symbol, label]) =>
    `<button class="nav-item${view === id && !isSearch ? ' active' : ''}" data-view="${id}">${svg(symbol)}<span class="nav-text">${label}</span>${counts[id] ? `<span class="count${id === 'updates' ? ' attention' : ''}">${counts[id]}</span>` : ''}</button>`).join('')}</div>`).join('');
  $('#preferences').classList.toggle('active', view === 'preferences' && !isSearch);
}

function navigate(v, c = '') {
  if (v !== 'hardware') { clearInterval(hardwareTimer); hardwareTimer = null; }
  menuClose?.();
  if (v !== 'home') { clearInterval(systemTimer); systemTimer = null; }
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
  else if (view === 'hardware') renderHardware();
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
    + (a.available ? `<div class="notice info">Update available: ${esc(a.available)} ${a.updateBlocked ? `<span>· ${esc(holdReason(a))}</span><button class="text-button" id="detail-allow">Allow again</button>` : '<button class="text-button" id="detail-update">Review update</button>'}</div>` : a.updatePolicy?.excluded ? '<div class="notice">Updates are held back for this app. <button class="text-button" id="detail-allow">Allow again</button></div>' : '')
    + `<dl class="detail-list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    + `<div class="detail-links">${a.location || a.executable ? '<button class="text-button" id="reveal">Show in File Explorer</button>' : ''}${a.packageId ? `<button class="text-button" id="package-info">Package info</button>${a.updatePolicy?.excluded ? '' : '<button class="text-button" id="detail-hold" aria-haspopup="menu" aria-expanded="false">Hold updates…</button>'}<button class="text-button" id="detail-uninstall">Uninstall…</button>` : ''}</div>`
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
  $('#detail-hold')?.addEventListener('click', e => updateMenu(e.currentTarget, a));
  $('#detail-allow')?.addEventListener('click', () => setUpdatePolicy(a.id, {excluded: false, skipVersion: null}));
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
    run: () => api.endProcess(p.processName ?? p.name), done: () => { done?.(); toast(`${p.name} ended`); }
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

// A small pop-up menu anchored to its button. Only one is open at a time; a choice, Escape or a click elsewhere closes it.
let menuClose = null;
function openMenu(anchor, items) {
  menuClose?.();
  if (!items.length) return;
  const menu = document.createElement('div');
  menu.className = 'menu'; menu.setAttribute('role', 'menu');
  menu.innerHTML = items.map((it, i) => `<button role="menuitem" data-menu="${i}">${esc(it.label)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</button>`).join('');
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = Math.max(8, Math.min(r.bottom + 4, innerHeight - menu.offsetHeight - 8)) + 'px';
  menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8)) + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  const outside = e => { if (!menu.contains(e.target)) close(false); };
  const close = refocus => {
    if (menuClose !== close) return;
    menuClose = null; menu.remove(); document.removeEventListener('pointerdown', outside, true);
    if (anchor.isConnected) { anchor.setAttribute('aria-expanded', 'false'); if (refocus) anchor.focus(); }
  };
  menuClose = close;
  document.addEventListener('pointerdown', outside, true);
  menu.onclick = e => { const b = e.target.closest('[data-menu]'); if (b) { close(true); items[+b.dataset.menu].run(); } };
  menu.onkeydown = e => {
    const all = [...menu.querySelectorAll('button')], index = all.indexOf(document.activeElement);
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); all[(index + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length].focus(); }
  };
  menu.querySelector('button').focus();
}

// Holding an update back: skip one version, or never update the app until it is allowed again.
const holdReason = a => a.updatePolicy?.excluded ? 'Never updated' : a.updatePolicy?.skipVersion ? `Skipping ${a.updatePolicy.skipVersion}` : '';
function updateMenu(anchor, a) {
  const p = a.updatePolicy || {}, items = [];
  if (a.available && !p.excluded && p.skipVersion !== a.available) items.push({label: `Skip version ${a.available}`, note: 'The next version is offered as usual', run: () => setUpdatePolicy(a.id, {skipVersion: a.available})});
  if (!p.excluded) items.push({label: 'Never update this app', note: 'Until you allow it again', run: () => setUpdatePolicy(a.id, {excluded: true})});
  if (p.excluded || p.skipVersion) items.push({label: 'Allow updates again', run: () => setUpdatePolicy(a.id, {excluded: false, skipVersion: null})});
  openMenu(anchor, items);
}
async function setUpdatePolicy(id, change) {
  const a = item(id);
  if (!a || policyPending.has(id)) return;
  policyPending.add(id);
  try {
    const snapshot = await api.setUpdatePolicy(id, {excluded: !!a.updatePolicy?.excluded, skipVersion: a.updatePolicy?.skipVersion || null, ...change});
    if (snapshot) state = {...state, ...snapshot};
    toast(change.excluded ? `${a.name} will not be updated` : change.skipVersion ? `Skipping ${a.name} ${change.skipVersion}` : `Updates allowed for ${a.name}`);
  } catch (error) { toast(cleanError(error), true); }
  finally { policyPending.delete(id); render(); renderNav(); }
}

function renderUpdates() {
  const waiting = state.items.filter(a => a.available && !a.updateBlocked);
  const held = state.items.filter(a => a.packageId && (a.updateBlocked || a.updatePolicy?.excluded || !a.available && a.updatePolicy?.skipVersion));
  const checked = state.packageChecked ? 'Checked ' + new Date(state.packageChecked).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'}) : 'Not checked yet';
  $('#body').innerHTML = `<div class="section-controls narrow"><span class="meta">${[waiting.length ? plural(waiting.length, 'update') : '', held.length ? held.length + ' held back' : '', checked].filter(Boolean).join(' · ')}</span><span class="spacer"></span>`
    + `<button id="check-updates" class="button subtle">${svg('sync')}Check for updates</button>${waiting.length ? `<button id="update-all" class="button primary">Update ${waiting.length === 1 ? '' : 'all'}…</button>` : ''}</div>`
    + `<div id="update-list" class="rows">${waiting.map(a => `<div class="update-row">${icon(a)}<div class="plan-entry"><strong>${esc(a.name)}</strong><small>${esc(a.version)} → <span class="new-version">${esc(a.available)}</span> · ${esc(a.packageId)}</small></div>`
      + `<button class="button subtle" data-update="${esc(a.id)}">Update…</button><button class="icon-button" data-update-menu="${esc(a.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Update options for ${esc(a.name)}" title="Skip or hold back" ${policyPending.has(a.id) ? 'disabled' : ''}>${svg('dots')}</button></div>`).join('')}</div>`
    + (waiting.length ? '' : `<div class="empty"><h3>${state.packageChecked ? held.some(a => a.available) ? 'Nothing else to update' : 'Everything is up to date' : 'Not checked yet'}</h3><p>${state.packageChecked ? held.some(a => a.available) ? 'The remaining updates are held back below.' : 'No WinGet updates were found.' : 'Check WinGet for available updates.'}</p></div>`)
    + (held.length ? `<details id="held-updates" class="held" ${heldOpen ? 'open' : ''}><summary>Held back<span>${held.length}</span></summary><div class="rows">${held.map(a => `<div class="update-row">${icon(a)}<div class="plan-entry"><strong>${esc(a.name)}</strong><small>${esc(holdReason(a))}${a.available ? ` · ${esc(a.version)} → ${esc(a.available)} is available` : ''}</small></div>`
      + `<button class="button subtle" data-update-allow="${esc(a.id)}" ${policyPending.has(a.id) ? 'disabled' : ''}>Allow again</button></div>`).join('')}</div></details>` : '')
    + '<p class="footnote">Updates run through WinGet. Apps it doesn’t manage update themselves, and installers may ask for administrator access.</p>';
  $('#check-updates').onclick = checkUpdates;
  $('#update-all')?.addEventListener('click', () => reviewUpdates(waiting));
  const held$ = $('#held-updates');
  if (held$) held$.ontoggle = () => { if (held$.isConnected) heldOpen = held$.open; };
  $('#body').onclick = e => {
    const update = e.target.closest('[data-update]'), menu = e.target.closest('[data-update-menu]'), allow = e.target.closest('[data-update-allow]');
    if (update) reviewUpdates(waiting.filter(a => a.id === update.dataset.update));
    else if (menu) { const a = item(menu.dataset.updateMenu); if (a) updateMenu(menu, a); }
    else if (allow) setUpdatePolicy(allow.dataset.updateAllow, {excluded: false, skipVersion: null});
  };
}
async function checkUpdates() {
  const button = $('#check-updates');
  if (button) { button.disabled = true; button.textContent = 'Checking…'; }
  await attempt(async () => { const next = await api.packages(); state = {...state, ...next}; render(); toast('Package information refreshed'); });
  if (button?.isConnected) { button.disabled = false; button.innerHTML = svg('sync') + 'Check for updates'; }
}
function reviewUpdates(apps) {
  apps = apps.filter(a => a.available && !a.updateBlocked);
  if (!apps.length) { toast('Allow this update in its update preferences first.'); return; }
  modal(`<h2>Update ${apps.length === 1 ? esc(apps[0].name) : plural(apps.length, 'app')}?</h2><p>WinGet will run the installers for the selected packages. Save your work in these apps first.${apps.length > 1 ? ' Packages install one at a time, and most ask for administrator approval, so stay nearby. You can stop the queue from Activity.' : ''}</p>`
    + `<div class="plan-list">${apps.map(a => `<label class="plan-row"><input type="checkbox" checked data-update-select="${esc(a.id)}"><div class="plan-entry"><strong>${esc(a.name)}</strong><small>${esc(a.version)} → ${esc(a.available)}</small></div></label>`).join('')}</div>`
    + '<div class="modal-actions"><button id="cancel-modal" class="button subtle">Cancel</button><button id="confirm-updates" class="button primary">Start updates</button></div>');
  const button = $('#confirm-updates');
  const selection = () => [...$('#modal-content').querySelectorAll('[data-update-select]:checked')].map(x => x.dataset.updateSelect);
  $('#modal-content').querySelectorAll('[data-update-select]').forEach(e => e.onchange = () => { button.disabled = !selection().length; });
  button.onclick = () => { const ids = selection(); if (ids.length) queueFromModal(button, () => api.upgrade(ids), 'Updates added to the queue'); };
}

function renderReproduce() {
  $('#body').innerHTML = '<div class="panel"><h2>Export</h2><p>Saves a manifest of your package IDs, versions, app locations and library preferences: favorites, hidden entries, tags and update preferences. Keep it with your backups, or use it to set up another Windows PC.</p><button id="export" class="button primary">Export library…</button></div>'
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
    + '<div class="restore-preferences"><h3>Library preferences</h3><p>Applies saved favorites, hidden entries, tags and update preferences to matching apps on this PC. Run it again after installing to cover the new apps.</p><button id="restore-preferences" class="button subtle">Restore preferences</button><span id="restore-result" role="status"></span></div>'
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
      if (modalIsCurrent(token)) $('#restore-result').textContent = `Library preferences restored for ${plural(count, 'matching app')}.`;
      toast(`Library preferences restored for ${plural(count, 'matching app')}`);
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
      `<button class="swatch${theme === t.id ? ' active' : ''}" role="radio" aria-checked="${theme === t.id}" tabindex="${theme === t.id ? '0' : '-1'}" data-theme-choice="${t.id}"><span class="swatch-preview${t.colors ? '' : ' system'}" style="${t.colors ? `background:${t.colors[0]};color:${t.colors[2]}` : ''}"><i style="${t.colors ? `background:${t.colors[1]}` : ''}"></i>Aa</span>${t.name}</button>`).join('')}</div>`
    + `<div class="accents" role="radiogroup" aria-label="Accent colour"><span>Accent</span>${ACCENTS.map(([id, label, color], i) => i ? [id, label, color] : [id, THEMES.find(t => t.id === theme)?.accent ? 'Theme colour' : label, THEMES.find(t => t.id === theme)?.accent || color]).map(([id, label, color]) =>
      `<button class="accent-dot${accent === id ? ' active' : ''}" role="radio" aria-checked="${accent === id}" tabindex="${accent === id ? '0' : '-1'}" data-accent-choice="${id}" title="${label}" aria-label="${label}" style="background:${color}"></button>`).join('')}</div></div>`
    + `<div class="panel"><h2>Local AI</h2><p id="model-description">${esc(modelDescription())}</p>`
    + `<label class="setting-row"><div><strong>Use local AI</strong><small>AI helps find apps and answers in Chat. One model runs at a time, and unloads after 60 seconds idle.</small></div><input id="ai-toggle" class="switch" type="checkbox" ${state.prefs.aiEnabled !== false ? 'checked' : ''}></label>`
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
  $('#body').querySelectorAll('[role=radiogroup]').forEach(group => group.onkeydown = e => {
    const choices = [...group.querySelectorAll('[role=radio]')], index = choices.indexOf(e.target);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? choices.length - 1 : (index + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length;
    choices[next].focus({preventScroll: true}); choices[next].click();
  });
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
  if (modelDraft.chat && !profiles.some(p => p.id === modelDraft.chat)) modelDraft.chat = m.active.chat || null;
  const busy = modelPending || m.busy, open = host.querySelector('details')?.open, off = busy ? 'disabled' : '';
  const size = n => n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : Math.round(n / 1048576) + ' MB';
  const about = p => {
    if (!p) return '';
    const test = p.lastTest, checked = !test ? 'Not checked yet' : (test.ok ? 'Check passed' : 'Check failed') + (test.elapsedMs ? ' in ' + (test.elapsedMs / 1000).toFixed(1) + ' s' : '') + (!test.ok && test.message ? ' · ' + esc(test.message) : '');
    return [p.builtin ? 'Bundled with AppHub' : esc(p.location || 'Added by you'), p.bytes ? size(p.bytes) : '', checked].filter(Boolean).join(' · ');
  };
  const option = (p, role) => `<option value="${esc(p.id)}" ${modelDraft[role] === p.id ? 'selected' : ''}>${esc(p.name)}${m.active[role] === p.id ? ' · In use' : ''}</option>`;
  const removable = p => p && !p.builtin && !Object.values(m.active).includes(p.id) ? `<button class="text-button" data-model-remove="${esc(p.id)}" ${off}>Remove from list</button>` : '';
  const row = (role, title, text, select, info, actions, extra = '') => `<div class="model-row"><div class="model-what"><label for="model-${role}">${title}</label><small>${text}</small></div>`
    + `<div class="model-pick"><select id="model-${role}" ${off}>${select}</select>${info ? `<small class="model-info">${info}</small>` : ''}<div class="model-actions">${actions}</div>${extra}</div></div>`;

  const embedding = profiles.find(p => p.id === modelDraft.embedding), reasoning = profiles.find(p => p.id === modelDraft.reasoning), chatModel = profiles.find(p => p.id === modelDraft.chat);
  const searchName = m.active.reasoning === 'off' ? '' : profiles.find(p => p.id === m.active.reasoning)?.name || '';
  const chatSame = (modelDraft.chat || null) === (m.active.chat || null);
  // The larger chat model is offered where it is used. Once downloaded it is an ordinary entry in the list above it.
  const offers = (m.downloads || []).map(d => {
    const now = m.downloading?.id === d.id ? m.downloading : null;
    if (now) return `<div class="model-offer"><div><strong>${esc(d.name)}</strong><small>${esc(now.stage)} · ${size(now.received)} of ${size(now.total)}</small><div class="bar"><i style="width:${Math.round(now.received / now.total * 100)}%"></i></div></div><button class="button subtle" data-download-cancel>Pause</button></div>`;
    if (d.profile) return m.active.chat === d.profile ? '' : `<button class="text-button" data-download-remove="${esc(d.id)}" ${off}>Delete the ${esc(d.name)} download</button>`;
    return `<div class="model-offer"><div><strong>${esc(d.name)}</strong><small>${d.fits ? `Fuller answers, and better with long questions. Replies take about twice as long and it uses about 6 GB of memory while loaded. ${size(d.bytes)} download.` : `Needs a PC with ${d.memoryGb} GB of memory.`}</small></div><button class="button subtle" data-download="${esc(d.id)}" ${busy || !d.fits ? 'disabled' : ''}>Download</button></div>`;
  }).join('');
  const tuning = [['threads', 'CPU threads', [1, 2, 4, 6, 8]], ['context', 'Context size', [2048, 4096, 8192]]]
    .map(([key, label, values]) => `<label>${label} <select id="model-${key}" ${off}>${values.map(n => `<option ${+modelDraft[key] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('');
  const prefixes = ['queryPrefix', 'documentPrefix']
    .map(key => `<label class="model-prefix">${key === 'queryPrefix' ? 'Search prefix' : 'Document prefix'} <input id="model-${key}" class="text-input" maxlength="100" value="${esc(modelDraft[key])}" ${off}></label>`).join('');

  host.innerHTML = '<section class="panel models-panel"><h2>Local models</h2><p>Each job has its own model. A replacement is tested first, and the current one stays in use if the test fails.</p>'
    + row('embedding', 'Finding apps', 'Matches what you type to apps and settings by meaning.', profiles.filter(p => p.role === 'embedding').map(p => option(p, 'embedding')).join(''), about(embedding),
      `<button class="button subtle" data-model-use="embedding" ${off}>Test &amp; use</button><button class="text-button" data-model-add="embedding" ${off}>Add a model folder…</button>${removable(embedding)}`)
    + row('reasoning', 'Understanding searches', 'Reads a described task and lists the entries that fit.', `<option value="off" ${modelDraft.reasoning === 'off' ? 'selected' : ''}>Off</option>` + profiles.filter(p => p.role === 'reasoning').map(p => option(p, 'reasoning')).join(''),
      reasoning ? about(reasoning) : 'Matching by meaning still works with this off.',
      `<button class="button subtle" data-model-use="reasoning" ${off}>${modelDraft.reasoning === 'off' ? 'Turn off' : 'Test &amp; use'}</button><button class="text-button" data-model-add="reasoning" ${off}>Add a GGUF file…</button>${removable(reasoning)}`)
    + row('chat', 'Chat', 'Answers questions about your apps and this PC.', `<option value="" ${!modelDraft.chat ? 'selected' : ''}>Same as search${searchName ? ' (' + esc(searchName) + ')' : ''}${!m.active.chat ? ' · In use' : ''}</option>` + profiles.filter(p => p.role === 'reasoning').map(p => option(p, 'chat')).join(''),
      chatModel ? about(chatModel) : 'Chat shares the model that understands searches.',
      `<button id="chat-model-use" class="button subtle" ${busy || chatSame ? 'disabled' : ''}>${modelDraft.chat ? 'Test &amp; use' : 'Use the search model'}</button><button id="chat-model-add" class="text-button" ${off}>Add a GGUF file…</button>`, offers)
    + `<div class="notice ${modelError || m.warning ? 'warn' : ''}" role="status" aria-live="polite" ${modelError || m.warning || m.message || busy ? '' : 'hidden'}>${esc(modelError || m.warning || m.message || (busy ? 'Checking compatibility…' : ''))}</div>`
    + `<details ${open ? 'open' : ''}><summary>Advanced</summary><div class="model-tuning">${tuning}<small>Applied the next time a search or chat model is tested.</small></div>`
    + `<p>A model for finding apps is a local Transformers.js folder with config, tokenizer and ONNX files that supports feature extraction with mean pooling. The other two take a GGUF file with a chat template that fits this PC’s memory. Larger context sizes need more memory. Removing an entry leaves its files on your PC.</p>${prefixes}<p>Leave prefixes empty unless the model for finding apps requires them, such as E5’s query: and passage: prefixes.</p>`
    + `<button id="models-reset" class="button subtle" ${off}>Reset to bundled models</button></details></section>`;

  for (const role of ['embedding', 'reasoning']) $('#model-' + role).onchange = e => { modelDraft[role] = e.target.value; modelError = ''; renderModels(); };
  $('#model-chat').onchange = e => { modelDraft.chat = e.target.value || null; modelError = ''; renderModels(); };
  $('#chat-model-use').onclick = () => runModelAction(async () => { const r = await api.chatModel(modelDraft.chat || null); modelDraft = null; return r; });
  $('#chat-model-add').onclick = () => runModelAction(async () => {
    const before = new Set(profiles.map(p => p.id)), result = await api.addModel('reasoning');
    if (result) { const p = result.profiles?.find(p => !before.has(p.id)); if (p) modelDraft.chat = p.id; }
    return result;
  });
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

// Home: an ask box, favorites and recently opened apps, and a glance at this PC from the hardware monitor.
// Processor and memory are read every second while the window is in use; the slower Windows counters every fifteen.
const HOME_POINTS = 60;
function homeVisible() { return view === 'home' && !query && !document.hidden; }
async function refreshHome() {
  if (homeLoading || !homeVisible() || !api.hardware) return;
  homeLoading = true; homeRead = Date.now();
  try {
    const next = await api.hardware('glance');
    if (next?.capturedAt) {
      hardwareInfo = next;
      const m = next.memory || {};
      homeHistory.push({cpu: next.cpu?.utilizationPercent, memory: m.totalBytes > 0 && known(m.usedBytes) ? m.usedBytes / m.totalBytes * 100 : null});
      if (homeHistory.length > HOME_POINTS) homeHistory.shift();
    }
  } catch {}
  homeLoading = false;
  if (homeVisible()) paintHome();
}
function homeReadings() {
  const h = hardwareInfo;
  if (!h) return [];
  const m = h.memory || {}, now = homeHistory.at(-1) || {}, gpus = h.gpus || [], volume = (h.disks?.logical || []).find(v => v.totalBytes > 0 && known(v.freeBytes)), b = h.battery;
  const live = (h.network || []).filter(n => n.status === 'connected'), sum = key => live.reduce((total, n) => total + (n[key] || 0), 0);
  const memory = known(now.memory) ? now.memory : m.totalBytes > 0 && known(m.usedBytes) ? m.usedBytes / m.totalBytes * 100 : null;
  const loads = gpus.map(g => g.utilizationPercent).filter(known), gpu = loads.length ? Math.max(...loads) : null;
  const rows = [
    {id: 'cpu', label: 'Processor', value: pct(known(now.cpu) ? now.cpu : h.cpu?.utilizationPercent), detail: hardwareName(h.cpu?.model), spark: 'cpu'},
    {id: 'memory', label: 'Memory', value: pct(memory), detail: known(m.usedBytes) ? `${bytes(m.usedBytes)} of ${bytes(m.totalBytes)}` : '', spark: 'memory'}
  ];
  if (gpus.length) rows.push({id: 'gpu', label: 'Graphics', value: pct(gpu), detail: hardwareName(gpus[0].name), bar: known(gpu) ? gpu / 100 : 0});
  if (volume) rows.push({id: 'disk', label: 'Storage ' + volume.name, value: bytes(volume.freeBytes) + ' free', detail: 'of ' + bytes(volume.totalBytes), bar: 1 - volume.freeBytes / volume.totalBytes});
  if (live.length) rows.push({id: 'network', label: live[0].kind || 'Network', value: rate(sum('receiveBytesPerSecond')), detail: rate(sum('sendBytesPerSecond')) + ' up'});
  if (b?.present) rows.push({id: 'battery', label: 'Battery', value: pct(b.chargePercent), detail: BATTERY_STATES[b.status] || '', bar: known(b.chargePercent) ? b.chargePercent / 100 : 0});
  return rows;
}
function homeSpark(key) {
  const x = i => ((HOME_POINTS - homeHistory.length + i) / (HOME_POINTS - 1) * 240).toFixed(1), y = v => (27 - Math.min(Math.max(v, 0), 100) / 100 * 25).toFixed(1);
  const points = homeHistory.map((p, i) => known(p[key]) ? `${x(i)} ${y(p[key])}` : null).filter(Boolean);
  const base = '<path class="hw-grid" d="M0 27.5H240"/>';
  if (points.length < 2) return base;
  const line = 'M' + points.join('L');
  return `${base}<path class="hw-area" d="${line}L${points.at(-1).split(' ')[0]} 28L${points[0].split(' ')[0]} 28Z"/><path class="hw-line" d="${line}"/>`;
}
const homeRow = r => `<button class="pc-row" data-hw="${r.id}" title="Open ${esc(r.label)} in Hardware"><small class="pc-label">${esc(r.label)}</small><strong>${esc(r.value)}</strong><small class="pc-detail">${esc(r.detail)}</small>`
  + (r.spark ? `<svg class="pc-graph" viewBox="0 0 240 28" preserveAspectRatio="none" aria-hidden="true">${homeSpark(r.spark)}</svg>` : 'bar' in r ? `<span class="pc-graph">${hardwareMeter(r.bar, r.id === 'disk' && r.bar > .9 ? 'high' : '')}</span>` : '') + '</button>';
// Readings are patched in place, so the rows keep their hover and focus between ticks.
function paintHome() {
  const host = $('#home-pc');
  if (!host) return;
  const rows = homeReadings(), shape = rows.map(r => r.id).join();
  if (!rows.length) return;
  if (host.dataset.shape !== shape) { host.dataset.shape = shape; host.innerHTML = rows.map(homeRow).join(''); }
  else for (const r of rows) {
    const el = host.querySelector(`[data-hw="${r.id}"]`), graph = el.querySelector('.pc-graph');
    el.querySelector('strong').textContent = r.value;
    el.querySelector('.pc-detail').textContent = r.detail;
    if (r.spark) graph.innerHTML = homeSpark(r.spark);
    else if (graph) { const fill = graph.querySelector('i'); fill.style.width = Math.max(0, Math.min(100, r.bar * 100)).toFixed(1) + '%'; fill.parentElement.classList.toggle('high', r.id === 'disk' && r.bar > .9); }
  }
  const inv = hardwareInfo?.inventory || {}, device = $('#home-device');
  if (device) device.textContent = [inv.manufacturer, inv.model].filter(Boolean).join(' ');
}
const since = value => {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return '';
  const minutes = (Date.now() - t) / 60000, days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
  return minutes < 2 ? 'Just now' : minutes < 60 ? Math.round(minutes) + ' min ago' : days < 1 ? Math.round(minutes / 60) + ' h ago' : days === 1 ? 'Yesterday' : days < 7 ? days + ' days ago' : new Date(t).toLocaleDateString([], {month: 'short', day: 'numeric'});
};
function recentCard(a) {
  const name = esc(a.name), canOpen = a.launch && !a.unavailable;
  return `<div class="app-card recent-card${a.unavailable ? ' unavailable' : ''}" data-id="${esc(a.id)}" ${tintAttrs(a)} tabindex="0" role="button" aria-label="${canOpen ? 'Open' : 'Details for'} ${name}">${icon(a)}<span class="recent-text"><h3>${name}</h3><small>${since(a.lastLaunch)}</small></span></div>`;
}
function renderHome() {
  const live = state.items.filter(a => !a.hidden);
  const favorites = live.filter(a => a.favorite).sort((a, b) => a.name.localeCompare(b.name));
  const recent = live.filter(a => a.lastLaunch).sort((a, b) => b.lastLaunch.localeCompare(a.lastLaunch)).slice(0, 8);
  const updates = live.filter(a => a.available && !a.updateBlocked), held = live.filter(a => a.available && a.updateBlocked), apps = live.filter(a => a.kind === 'app');
  const aiOff = state.prefs.aiEnabled === false || (state.models?.active?.reasoning === 'off' && !state.models?.active?.chat);
  const today = new Date(), hour = today.getHours(), rows = homeReadings();
  const asks = ['What is using the most memory?', updates.length ? 'Which updates matter most?' : 'What starts with Windows?', hardwareInfo?.battery?.present ? 'How healthy is my battery?' : 'How much disk space is free?', 'Is anything slowing this PC down?'];
  const head = (title, items, link) => `<div class="section-head"><h2>${title}</h2>${link && items.length ? `<button class="text-button" data-view="${link}">See all</button>` : ''}</div>`;
  $('#body').innerHTML = [...new Set(state.warnings || [])].map(w => `<div class="notice warn">${esc(w)}</div>`).join('')
    + `<div class="home"><section class="home-hero" data-day="${today.getDate()}"><p class="eyebrow">${esc(today.toLocaleDateString([], {weekday: 'long'}))} · ${esc(today.toLocaleDateString([], {month: 'long', day: 'numeric'}))}</p>`
    + `<h1>${hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'}</h1>`
    + `<form id="ask-form" class="ask">${svg('chat')}<input id="ask-input" maxlength="2000" autocomplete="off" placeholder="${aiOff ? 'Chat is off — turn on local AI in Settings' : 'Ask about your apps or this PC'}" aria-label="Ask the local assistant" value="${esc(askDraft)}" ${aiOff ? 'disabled' : ''}><button class="send" aria-label="Ask" ${aiOff ? 'disabled' : ''}>${svg('arrow')}</button></form>`
    + (aiOff ? '' : `<div class="ask-chips">${asks.map(text => `<button class="ask-chip" data-ask="${esc(text)}">${esc(text)}</button>`).join('')}</div>`) + '</section>'
    + '<div class="home-grid"><div class="home-main">'
    + `<section class="home-section">${head('Favorites', favorites, 'favorites')}${favorites.length ? `<div class="grid card-host">${favorites.map(a => card(a, 'grid')).join('')}</div>` : '<p class="section-empty">Star an app to keep it here. Hover a tile and click the star.</p>'}</section>`
    + `<section class="home-section">${head('Recently opened', recent, 'recent')}${recent.length ? `<div class="recent-list card-host">${recent.map(recentCard).join('')}</div>` : '<p class="section-empty">Apps you open from AppHub show up here.</p>'}</section>`
    + '</div><aside class="home-rail">'
    + `<div class="glance"><button class="glance-tile${updates.length ? ' attention' : ''}" data-view="updates"><strong>${updates.length}</strong><span>${updates.length === 1 ? 'Update' : 'Updates'}</span><small>${updates.length ? 'Ready to review' : held.length ? held.length + ' held back' : state.packageChecked ? 'All up to date' : 'Not checked yet'}</small></button>`
    + `<button class="glance-tile" data-view="all"><strong>${apps.length}</strong><span>Apps</span><small>${state.scanning ? 'Syncing…' : state.lastScan ? 'Synced ' + since(state.lastScan).toLowerCase() : 'Browse the library'}</small></button></div>`
    + `<section class="pc"><div class="pc-head"><p class="eyebrow">This PC</p><small id="home-device"></small></div><div id="home-pc" data-shape="${rows.map(r => r.id).join()}">${rows.length ? rows.map(homeRow).join('') : ['Processor', 'Memory', 'Storage'].map(label => `<div class="pc-row loading"><small class="pc-label">${label}</small><strong>…</strong><small class="pc-detail">Reading</small></div>`).join('')}</div>`
    + `<button class="text-button pc-more" data-view="hardware">Hardware monitor ${svg('arrow')}</button></section>`
    + '</aside></div></div>';
  document.querySelectorAll('#body .card-host').forEach(bindCards);
  $('#ask-input').oninput = e => { askDraft = e.target.value; };
  $('#ask-form').onsubmit = e => { e.preventDefault(); const text = askDraft; askDraft = ''; sendChat(text); };
  $('#body').onclick = e => {
    const ask = e.target.closest('[data-ask]'), go = e.target.closest('[data-view]'), reading = e.target.closest('[data-hw]');
    if (ask && !ask.closest('.chat')) sendChat(ask.dataset.ask);
    else if (reading) { hardwareTab = reading.dataset.hw; store('hardwareTab', hardwareTab); navigate('hardware'); }
    else if (go) navigate(go.dataset.view);
  };
  paintHome();
  refreshHome();
  clearInterval(systemTimer);
  // An unfocused window keeps its readings roughly current without sampling every second.
  systemTimer = setInterval(() => {
    if (view !== 'home') { clearInterval(systemTimer); systemTimer = null; }
    else if (document.hasFocus() || Date.now() - homeRead >= 10000) refreshHome();
  }, 1000);
}

// Hardware: a live view of this PC. Processor and memory refresh every second; the Windows counters behind the other readings
// arrive every few seconds. It only collects while this view is on screen, and the history lasts for this session.
const HW_POINTS = 120;
const known = n => typeof n === 'number' && Number.isFinite(n);
const pct = n => known(n) ? Math.round(n) + '%' : '—';
function bytes(n) {
  if (!known(n)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(i > 1 && n < 100 ? 1 : 0) + ' ' + units[i];
}
const rate = n => known(n) ? bytes(n) + '/s' : '—';
const ghz = n => known(n) && n > 0 ? (n / 1000).toFixed(2) + ' GHz' : '';
const span = seconds => seconds >= 172800 ? Math.round(seconds / 86400) + ' days' : seconds >= 3600 ? Math.round(seconds / 360) / 10 + ' hours' : Math.max(1, Math.round(seconds / 60)) + ' min';
const hardwareName = name => String(name || '').replace(/\((R|TM|C)\)/gi, '').replace(/\b(CPU|Processor)\b/g, '').replace(/\s+/g, ' ').trim();
const BATTERY_STATES = {1: 'On battery', 2: 'Plugged in', 3: 'Fully charged', 4: 'Low', 5: 'Critical', 6: 'Charging', 7: 'Charging', 8: 'Charging', 9: 'Charging', 11: 'Partially charged'};
// A rounded ceiling for a throughput axis, so the scale does not jump with every sample.
function ceiling(n) {
  let unit = 1024;
  while (n > unit * 1000) unit *= 1024;
  return unit * ([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(step => step * unit >= n) || 1000);
}
function hardwareVisible() { return view === 'hardware' && !query && !document.hidden; }
function hardwareSample(h) {
  const loads = (h.gpus || []).map(g => g.utilizationPercent).filter(known), busy = (h.disks?.physical || []).map(d => d.activityPercent).filter(known);
  const live = (h.network || []).filter(n => n.status === 'connected'), sum = key => live.some(n => known(n[key])) ? live.reduce((total, n) => total + (n[key] || 0), 0) : null;
  const disks = h.disks?.physical || [], total = key => disks.some(d => known(d[key])) ? disks.reduce((t, d) => t + (d[key] || 0), 0) : null;
  return {cpu: h.cpu?.utilizationPercent, memory: h.memory?.totalBytes > 0 && known(h.memory.usedBytes) ? h.memory.usedBytes / h.memory.totalBytes * 100 : null,
    gpu: loads.length ? Math.max(...loads) : null, disk: busy.length ? Math.max(...busy) : null, read: total('readBytesPerSecond'), write: total('writeBytesPerSecond'),
    down: sum('receiveBytesPerSecond'), up: sum('sendBytesPerSecond'), battery: h.battery?.present ? h.battery.chargePercent : null};
}
async function refreshHardware() {
  if (hardwareLoading || !hardwareVisible() || !api.hardware) return;
  hardwareLoading = true;
  const shape = hardwareShape();
  try {
    const next = await api.hardware();
    if (!next || !next.capturedAt) throw new Error('Hardware readings are unavailable.');
    hardwareInfo = next; hardwareError = '';
    hardwareHistory.push(hardwareSample(next));
    if (hardwareHistory.length > HW_POINTS) hardwareHistory = hardwareHistory.slice(-HW_POINTS);
  } catch (error) { hardwareError = cleanError(error); }
  hardwareLoading = false;
  if (view !== 'hardware' || query) return;
  if (shape !== hardwareShape() || !$('#hw-detail')) retainFocus(renderHardware); else paintHardware();
}
// The tabs depend on what this PC has; the page is rebuilt only when that changes.
function hardwareTabs(h = hardwareInfo) {
  if (!h) return [];
  const m = h.memory || {}, gpus = h.gpus || [], disks = h.disks?.physical || [], volumes = h.disks?.logical || [], live = (h.network || []).filter(n => n.status === 'connected'), now = hardwareHistory.at(-1) || hardwareSample(h);
  const tabs = [
    {id: 'cpu', label: 'Processor', value: pct(now.cpu), detail: ghz(h.cpu?.frequencyMHz) || `${h.cpu?.logicalCores || ''} threads`, series: ['cpu']},
    {id: 'memory', label: 'Memory', value: pct(now.memory), detail: `${bytes(m.usedBytes)} of ${bytes(m.totalBytes)}`, series: ['memory']}
  ];
  if (gpus.length) tabs.push({id: 'gpu', label: 'Graphics', value: pct(now.gpu), detail: hardwareName(gpus[0].name) || 'Graphics', series: ['gpu']});
  if (disks.length || volumes.length) tabs.push({id: 'disk', label: 'Disk', value: pct(now.disk), detail: known(now.read) ? `${rate(now.read)} read · ${rate(now.write)} write` : volumes[0] ? `${bytes(volumes[0].freeBytes)} free` : '', series: ['disk']});
  if ((h.network || []).length) tabs.push({id: 'network', label: 'Network', value: live.length ? rate(now.down) : 'Offline', detail: live.length ? `${rate(now.up)} up` : 'Not connected', series: ['down', 'up'], scale: true});
  if (h.battery?.present) tabs.push({id: 'battery', label: 'Battery', value: pct(h.battery.chargePercent), detail: h.battery.chargeRateWatts ? `Charging at ${h.battery.chargeRateWatts} W` : h.battery.dischargeRateWatts ? `Using ${h.battery.dischargeRateWatts} W` : BATTERY_STATES[h.battery.status] || '', series: ['battery']});
  return tabs;
}
function hardwareShape() { return hardwareInfo ? hardwareTabs().map(t => t.id).join() + '|' + (hardwareInfo.inventory?.model || '') + '|' + (hardwareInfo.sensors?.length || 0) : ''; }
// Lines for one or two series over the last two minutes. The newest sample sits at the right edge.
function hardwareLines(series, width, height, top) {
  const data = hardwareHistory.slice(-HW_POINTS), x = i => ((HW_POINTS - data.length + i) / (HW_POINTS - 1) * width).toFixed(1), y = v => (height - 1 - Math.min(Math.max(v, 0) / top, 1) * (height - 3)).toFixed(1);
  return series.map((key, order) => {
    const points = data.map((p, i) => known(p[key]) ? `${x(i)} ${y(p[key])}` : null).filter(Boolean);
    if (!points.length) return '';
    const line = 'M' + points.join('L'), first = points[0].split(' ')[0], last = points.at(-1).split(' ')[0];
    return (order ? '' : `<path class="hw-area" d="${line}L${last} ${height}L${first} ${height}Z"/>`) + `<path class="hw-line${order ? ' second' : ''}" d="${line}"/>`;
  }).join('');
}
function hardwareScale(tab) {
  if (!tab.scale) return 100;
  return ceiling(Math.max(1024, ...hardwareHistory.flatMap(p => tab.series.map(key => known(p[key]) ? p[key] : 0))));
}
function hardwareChart(tab, legend) {
  const top = hardwareScale(tab), mark = v => tab.scale ? rate(v) : Math.round(v) + '%';
  return `<div class="hw-chart"><div class="hw-axis" aria-hidden="true"><span>${mark(top)}</span><span>${mark(top / 2)}</span><span>${mark(0)}</span></div>`
    + `<div class="hw-plot"><svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img" aria-label="${esc(tab.label)} over the last two minutes"><path class="hw-grid" d="M0 1H600M0 40.5H600M0 80H600M0 119.5H600M0 159H600"/>${hardwareLines(tab.series, 600, 160, top)}</svg>`
    + `<div class="hw-chart-foot"><span>2 minutes ago</span>${legend ? `<span class="hw-legend">${legend.map((name, i) => `<i class="${i ? 'second' : ''}"></i>${name}`).join('')}</span>` : ''}<span>Now</span></div></div></div>`;
}
const hardwareFacts = rows => { const shown = rows.filter(r => r && r[1] !== '' && r[1] != null && r[1] !== '—'); return shown.length ? `<dl class="hw-facts">${shown.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''; };
const hardwareMeter = (fraction, cls = '') => `<div class="bar ${cls}"><i style="width:${known(fraction) ? Math.max(0, Math.min(100, fraction * 100)).toFixed(1) : 0}%"></i></div>`;
function hardwareDetail(h, tab) {
  const head = (title, sub) => `<div class="hw-detail-head"><h2>${esc(title)}</h2>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  const inv = h.inventory || {}, c = h.cpu || {}, m = h.memory || {};
  if (tab.id === 'cpu') {
    return head('Processor', hardwareName(c.model)) + hardwareChart(tab)
      + `<div class="hw-cores" aria-label="Use of each thread">${(c.cores || []).map(core => `<div class="hw-core" title="Thread ${core.index + 1}${core.frequencyMHz ? ' · ' + ghz(core.frequencyMHz) : ''}"><i style="height:${known(core.utilizationPercent) ? Math.max(2, Math.min(100, core.utilizationPercent)).toFixed(0) : 2}%"></i><span>${known(core.utilizationPercent) ? Math.round(core.utilizationPercent) : '—'}</span></div>`).join('')}</div>`
      + hardwareFacts([['In use', pct(c.utilizationPercent)], ['Speed', ghz(c.frequencyMHz)], ['Base speed', ghz(c.maxClockMHz)], ['Cores', c.physicalCores], ['Threads', c.logicalCores],
        ['Cache', [c.l2CacheKB && `L2 ${Math.round(c.l2CacheKB / 1024)} MB`, c.l3CacheKB && `L3 ${Math.round(c.l3CacheKB / 1024)} MB`].filter(Boolean).join(' · ')],
        ['Running', known(c.processes) ? `${c.processes} processes · ${c.threads.toLocaleString()} threads` : ''], ['Waiting for a core', known(c.queueLength) ? plural(c.queueLength, 'thread') : ''], ['Up time', known(c.uptimeSeconds) ? span(c.uptimeSeconds) : '']]);
  }
  if (tab.id === 'memory') {
    const modules = inv.memoryModules || [], groups = new Map();
    for (const x of modules) if (x.capacityBytes) { const key = bytes(x.capacityBytes) + (x.speedMHz ? ` at ${x.speedMHz.toLocaleString()} MHz` : ''); groups.set(key, (groups.get(key) || 0) + 1); }
    const type = modules.find(x => x.type)?.type || '', soldered = type.startsWith('LP');
    const used = m.usedBytes, cached = known(m.cachedBytes) && known(m.freeBytes) ? Math.min(m.cachedBytes, m.freeBytes) : null, total = m.totalBytes;
    return head('Memory', [bytes(total), type].filter(Boolean).join(' ')) + hardwareChart(tab)
      + (total > 0 && known(used) ? `<div class="hw-stack" role="img" aria-label="Memory in use, cached and free"><i style="width:${(used / total * 100).toFixed(1)}%"></i>${known(cached) ? `<i class="cached" style="width:${(cached / total * 100).toFixed(1)}%"></i>` : ''}</div><div class="hw-legend below"><i></i>In use ${bytes(used)}${known(cached) ? `<i class="cached"></i>Cached, free when needed ${bytes(cached)}` : ''}<i class="free"></i>Free ${bytes(known(cached) ? m.freeBytes - cached : m.freeBytes)}</div>` : '')
      + hardwareFacts([['In use', bytes(used)], ['Available', bytes(m.freeBytes)], ['Committed', known(m.commitUsedBytes) ? `${bytes(m.commitUsedBytes)} of ${bytes(m.commitLimitBytes)}` : ''],
        ['Page file', m.pageFileAllocatedBytes ? `${bytes(m.pageFileUsedBytes)} of ${bytes(m.pageFileAllocatedBytes)}` : ''], ['Paged pool', bytes(m.pagedPoolBytes)], ['Non-paged pool', bytes(m.nonPagedPoolBytes)],
        ['Hard faults', known(m.hardFaultsPerSecond) ? Math.round(m.hardFaultsPerSecond) + ' per second' : ''],
        ['Modules', [...groups].map(([key, count]) => `${count} × ${key}`).join(', ')], ['Slots', soldered ? 'Soldered to the board' : inv.memorySlots ? `${modules.length} of ${inv.memorySlots} used` : '']]);
  }
  if (tab.id === 'gpu') {
    return head('Graphics', (h.gpus || []).length > 1 ? plural(h.gpus.length, 'adapter') : hardwareName(h.gpus?.[0]?.name)) + hardwareChart(tab)
      + (h.gpus || []).map(g => {
        const about = (inv.graphics || []).find(x => x.name === g.name) || {};
        return `<div class="hw-block">${h.gpus.length > 1 ? `<h3>${esc(hardwareName(g.name))}</h3>` : ''}` + hardwareFacts([['In use', pct(g.utilizationPercent)], ['Busiest work', (g.engines || []).map(e => `${e.type} ${pct(e.utilizationPercent)}`).join(' · ')],
          ['Kind', g.sharesSystemMemory ? 'Integrated · shares system memory' : g.sharesSystemMemory === false ? 'Dedicated card' : ''],
          g.sharesSystemMemory ? ['Memory in use', bytes(g.sharedUsedBytes)] : ['Video memory', known(g.dedicatedUsedBytes) ? `${bytes(g.dedicatedUsedBytes)}${g.dedicatedTotalBytes ? ' of ' + bytes(g.dedicatedTotalBytes) : ''}` : ''],
          g.sharesSystemMemory ? null : ['Shared memory', bytes(g.sharedUsedBytes)],
          ['Driver', [g.driverVersion, about.driverDate].filter(Boolean).join(' · ')], ['Display', about.width && about.height ? `${about.width} × ${about.height}${about.refreshRateHz ? ' at ' + about.refreshRateHz + ' Hz' : ''}` : '']]) + '</div>';
      }).join('');
  }
  if (tab.id === 'disk') {
    const disks = h.disks?.physical || [], volumes = h.disks?.logical || [];
    return head('Disk', disks.length === 1 ? disks[0].name : plural(disks.length, 'disk')) + hardwareChart(tab)
      + disks.map(d => `<div class="hw-block">${disks.length > 1 ? `<h3>${esc(d.name)}</h3>` : ''}` + hardwareFacts([['Active', pct(d.activityPercent)], ['Reading', rate(d.readBytesPerSecond)], ['Writing', rate(d.writeBytesPerSecond)],
        ['Kind', [d.kind, d.interface && !String(d.kind).includes(d.interface) ? d.interface : ''].filter(Boolean).join(' · ')], ['Capacity', bytes(d.sizeBytes)], ['Health', d.health],
        ['Life used', known(d.wearPercent) ? d.wearPercent + '%' : ''], ['Temperature', d.temperatureC ? d.temperatureC + ' °C' : ''], ['Powered on', d.powerOnHours ? d.powerOnHours.toLocaleString() + ' hours' : '']]) + '</div>').join('')
      + (volumes.length ? `<div class="hw-volumes">${volumes.map(v => `<div class="hw-volume"><div><strong>${esc(v.name)}</strong><span>${known(v.freeBytes) ? bytes(v.freeBytes) + ' free of ' + bytes(v.totalBytes) : ''}${v.fileSystem ? ' · ' + esc(v.fileSystem) : ''}</span></div>${hardwareMeter(v.totalBytes > 0 && known(v.freeBytes) ? 1 - v.freeBytes / v.totalBytes : null, v.totalBytes > 0 && v.freeBytes / v.totalBytes < .1 ? 'high' : '')}</div>`).join('')}</div>` : '');
  }
  if (tab.id === 'network') {
    const live = (h.network || []).filter(n => n.status === 'connected'), idle = (h.network || []).filter(n => n.status !== 'connected');
    return head('Network', live.length === 1 ? live[0].name : live.length ? plural(live.length, 'connection') : 'Not connected') + hardwareChart(tab, ['Download', 'Upload'])
      + live.map(n => `<div class="hw-block">${live.length > 1 ? `<h3>${esc(n.name)}</h3>` : ''}` + hardwareFacts([['Download', rate(n.receiveBytesPerSecond)], ['Upload', rate(n.sendBytesPerSecond)], ['Connection', n.kind],
        ['Link speed', known(n.linkSpeedBitsPerSecond) && n.linkSpeedBitsPerSecond > 0 ? Math.round(n.linkSpeedBitsPerSecond / 1e6).toLocaleString() + ' Mbps' : ''],
        ['Wi-Fi', n.wifi ? [n.wifi.standard, n.wifi.band, known(n.wifi.channel) && 'channel ' + n.wifi.channel].filter(Boolean).join(' · ') : ''], ['Signal', n.wifi && known(n.wifi.signalPercent) ? Math.round(n.wifi.signalPercent) + '%' : ''], ['Security', n.wifi?.security]]) + '</div>').join('')
      + (idle.length ? `<p class="hw-quiet">Not connected: ${esc(idle.map(n => n.name).join(', '))}</p>` : '');
  }
  const b = h.battery || {};
  return head('Battery', BATTERY_STATES[b.status] || '') + hardwareChart(tab)
    + hardwareFacts([['Charge', pct(b.chargePercent)], ['Power', b.chargeRateWatts ? `Charging at ${b.chargeRateWatts} W` : b.dischargeRateWatts ? `Using ${b.dischargeRateWatts} W` : ''],
      ['Time left', b.remainingMinutes ? `${Math.floor(b.remainingMinutes / 60)} h ${b.remainingMinutes % 60} min` : ''], ['Holds', b.fullWattHours ? `${b.fullWattHours} Wh${b.designWattHours ? ' of ' + b.designWattHours + ' Wh when new' : ''}` : ''],
      ['Health', known(b.healthPercent) ? b.healthPercent + '%' : ''], ['Charge cycles', b.cycles], ['Voltage', b.voltage ? b.voltage + ' V' : ''], ['Chemistry', b.chemistry]]);
}
function hardwarePrograms(h) {
  const {key, down} = hardwareSort, value = p => key === 'name' ? p.name.toLowerCase() : p[key] ?? -1;
  const rows = [...(h.processes || [])].sort((a, b) => { const x = value(a), y = value(b); return (x < y ? -1 : x > y ? 1 : 0) * (down ? -1 : 1) || b.memoryBytes - a.memoryBytes; });
  return rows.slice(0, hardwareAll ? 80 : 10).map(p => `<tr><td><strong>${esc(p.name)}</strong>${p.count > 1 ? `<span>${p.count}</span>` : ''}</td><td>${known(p.cpuPercent) ? p.cpuPercent < 0.05 ? '0%' : p.cpuPercent.toFixed(1) + '%' : '—'}</td><td>${bytes(p.memoryBytes)}</td>`
    + `<td>${p.endable ? `<button class="text-button" data-hw-end="${esc(p.name)}" data-count="${p.count || 1}">End…</button>` : ''}</td></tr>`).join('');
}
function hardwareDevice(h) {
  const inv = h.inventory || {}, temps = (h.sensors || []).filter(s => s.type === 'Temperature'), fans = (h.sensors || []).filter(s => s.type === 'Fan');
  return hardwareFacts([['Model', [inv.manufacturer, inv.model].filter(Boolean).join(' ')], ['Kind', inv.formFactor], ['Windows', inv.os?.name ? `${inv.os.name.replace(/^Microsoft /, '')} · build ${inv.os.build}` : ''], ['Installed', inv.os?.installed],
    ['BIOS', [inv.biosVersion, inv.biosDate].filter(Boolean).join(' · ')], ['Board', [inv.board?.manufacturer, inv.board?.product].filter(Boolean).join(' ')], ['Power plan', inv.powerPlan], ['Secure Boot', inv.secureBoot == null ? '' : inv.secureBoot ? 'On' : 'Off'],
    ['Screen', (inv.displays || []).filter(d => d.diagonalInches).map(d => `${d.name ? d.name + ' · ' : ''}${d.diagonalInches}″`).join(', ')],
    ['Temperatures', temps.slice(0, 6).map(s => `${s.name} ${Math.round(s.value)} °C`).join(' · ')], ['Fans', fans.slice(0, 4).map(s => `${s.name} ${Math.round(s.value)} RPM`).join(' · ')]])
    + (temps.length ? '' : '<p class="hw-quiet">This PC does not report temperatures or fan speeds to Windows.</p>');
}
function renderHardware() {
  const h = hardwareInfo;
  if (!hardwareTimer) hardwareTimer = setInterval(() => { if (hardwareVisible()) refreshHardware(); }, 1000);
  if (!h) {
    $('#body').innerHTML = `<div class="empty"><h3>${hardwareError ? 'Hardware readings are unavailable' : 'Reading this PC…'}</h3><p>${esc(hardwareError || 'The first reading takes a few seconds.')}</p></div>`;
    if (!hardwareLoading) refreshHardware();
    return;
  }
  const tabs = hardwareTabs(h), tab = tabs.find(t => t.id === hardwareTab) || tabs[0], inv = h.inventory || {};
  const aiOff = state.prefs.aiEnabled === false || state.models?.active?.reasoning === 'off' && !state.models?.active?.chat;
  const summary = [[inv.manufacturer, inv.model].filter(Boolean).join(' '), hardwareName(h.cpu?.model), h.memory?.totalBytes ? Math.round(h.memory.totalBytes / 1073741824) + ' GB memory' : '', hardwareName(h.gpus?.[0]?.name)].filter(Boolean).join(' · ');
  const column = (key, label) => `<th scope="col" aria-sort="${hardwareSort.key === key ? hardwareSort.down ? 'descending' : 'ascending' : 'none'}"><button data-hw-sort="${key}">${label}${hardwareSort.key === key ? `<i>${hardwareSort.down ? '↓' : '↑'}</i>` : ''}</button></th>`;
  $('#body').innerHTML = `<div class="hw"><div class="hw-head"><p>${esc(summary)}</p><span class="spacer"></span><small id="hw-status" role="status"></small><button id="hardware-ask" class="button subtle" ${aiOff ? 'disabled' : ''}>${svg('chat')}Ask about this PC</button></div>`
    + `<div class="hw-tiles" role="tablist" aria-label="Readings">${tabs.map(t => `<button class="hw-tile${t.id === tab.id ? ' active' : ''}" role="tab" aria-selected="${t.id === tab.id}" tabindex="${t.id === tab.id ? 0 : -1}" data-hw-tab="${t.id}"><small>${t.label}</small><strong></strong><span></span><svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"></svg></button>`).join('')}</div>`
    + '<section class="panel hw-panel" id="hw-detail" role="tabpanel"></section>'
    + `<section class="panel hw-panel"><div class="hw-detail-head"><h2>Programs</h2><span id="hw-program-count"></span></div><div class="hw-table-wrap"><table class="hw-table"><thead><tr>${column('name', 'Program')}${column('cpuPercent', 'Processor')}${column('memoryBytes', 'Memory')}<th></th></tr></thead><tbody id="hw-programs"></tbody></table></div>`
    + `<button class="text-button" id="hw-all">${hardwareAll ? 'Show fewer' : 'Show more'}</button></section>`
    + `<section class="panel hw-panel"><div class="hw-detail-head"><h2>This device</h2></div>${hardwareDevice(h)}</section></div>`;
  paintHardware(true);
  const tiles = $('.hw-tiles');
  tiles.onclick = e => { const b = e.target.closest('[data-hw-tab]'); if (b && b.dataset.hwTab !== hardwareTab) { hardwareTab = b.dataset.hwTab; store('hardwareTab', hardwareTab); retainFocus(renderHardware); } };
  tiles.onkeydown = e => {
    const all = [...tiles.querySelectorAll('[data-hw-tab]')], index = all.indexOf(e.target);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const id = all[e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (index + (e.key === 'ArrowLeft' ? -1 : 1) + all.length) % all.length].dataset.hwTab;
    $(`[data-hw-tab="${id}"]`).click(); $(`[data-hw-tab="${id}"]`).focus();
  };
  $('#hardware-ask').onclick = () => sendChat('Look at this PC’s hardware and how it is being used right now. What stands out, is anything under strain, and what would you change?', {hardware: true, hardwareCapturedAt: hardwareInfo?.capturedAt});
  $('#hw-all').onclick = () => { hardwareAll = !hardwareAll; retainFocus(renderHardware); };
  $('.hw-table').onclick = e => {
    const sort = e.target.closest('[data-hw-sort]'), end = e.target.closest('[data-hw-end]');
    if (sort) { const key = sort.dataset.hwSort; hardwareSort = {key, down: hardwareSort.key === key ? !hardwareSort.down : key !== 'name'}; retainFocus(renderHardware); }
    else if (end) confirmEnd({name: end.dataset.hwEnd, count: +end.dataset.count || 1}, () => { hardwarePainted = ''; });
  };
}
// Runs every second: only values, charts and rows change, so focus, hover and scroll are left alone.
function paintHardware(all = false) {
  const h = hardwareInfo, tabs = hardwareTabs(h), tab = tabs.find(t => t.id === hardwareTab) || tabs[0], detail = $('#hw-detail');
  if (!h || !detail) return;
  for (const t of tabs) {
    const tile = $(`[data-hw-tab="${t.id}"]`);
    if (!tile) continue;
    tile.querySelector('strong').textContent = t.value; tile.querySelector('span').textContent = t.detail;
    tile.querySelector('svg').innerHTML = hardwareLines(t.series, 100, 26, hardwareScale(t));
  }
  detail.innerHTML = hardwareDetail(h, tab);
  $('#hw-status').textContent = hardwareError ? 'Last reading failed. Trying again…' : '';
  // Program rows carry buttons, so they change only with a new reading and never under the pointer.
  const table = $('#hw-programs'), stamp = (h.countersCapturedAt || h.capturedAt) + hardwareSort.key + hardwareSort.down + hardwareAll;
  if (all || stamp !== hardwarePainted && !table.matches(':hover') && !table.contains(document.activeElement)) {
    hardwarePainted = stamp; table.innerHTML = hardwarePrograms(h) || '<tr><td colspan="4">Program readings are unavailable.</td></tr>';
    $('#hw-program-count').textContent = known(h.cpu?.processes) ? `${h.cpu.processes} processes running` : '';
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && view === 'hardware' && !query) refreshHardware(); });

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
        + (a.available && !a.updateBlocked ? `<button class="button subtle" data-chat-update="${id}">Update…</button>` : '')
        + (a.launch && !s.uninstall ? `<button class="button primary" data-chat-open="${id}" ${a.unavailable ? 'disabled' : ''} ${chatOpening.has(a.id) ? 'aria-disabled="true" aria-busy="true"' : ''}>${chatOpening.has(a.id) ? 'Opening…' : 'Open'}</button>` : '')
        + `<button class="icon-button" data-chat-info="${id}" aria-label="Details for ${esc(a.name)}" title="Details">${svg('dots')}</button>`);
    }
    const subject = {id: s.type + ':' + s.name, name: String(s.name || '?')};
    if (s.type === 'process') return row(subject, s.name, `Running${s.count > 1 ? ` · ${s.count} processes` : ''}${s.memoryGb ? ` · ${s.memoryGb} GB of memory` : ''}`, act('end', 'End…'));
    if (s.type === 'startup') return row(subject, s.name, 'Starts with Windows', act('startup', 'Disable…'));
    if (s.type === 'package') return row(subject, s.name, `${s.id} · ${s.version || 'latest'} · WinGet catalog`, act('install', 'Install…', 'primary'));
    if (s.type === 'updates') {
      const ready = (s.ids || []).filter(id => item(id)?.available && !item(id)?.updateBlocked).length;
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
  else if (verb === 'updates') { const apps = (s.ids || []).map(item).filter(a => a?.available && !a.updateBlocked); if (apps.length) reviewUpdates(apps); }
}
function chatMessage(m, index) {
  if (m.role === 'user') return `<div class="msg user"><div class="bubble">${esc(m.content)}</div></div>`;
  return `<div class="msg bot"><span class="avatar">${svg('mark')}</span><div class="bubble${m.error ? ' error' : ''}">${esc(m.error || m.content)}${m.stopped ? '<small class="stopped">Stopped</small>' : ''}${m.truncated ? '<small class="stopped">Reached the length limit for one reply. Ask it to continue.</small>' : ''}`
    + `${chatSources(m, index)}${chatSuggestions(m, index)}</div></div>`;
}
// What a reply was based on: one chip per source, and a click shows the text the model was given.
const ago = value => {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return '';
  const seconds = (Date.now() - t) / 1000;
  return seconds < 90 ? 'just now' : seconds < 3600 ? Math.round(seconds / 60) + ' min ago' : 'at ' + new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
};
const sourceName = s => ({pc: 'This PC', library: 'Your library'})[s.id] || String(s.title || s.id).replace(/^the /, '').replace(/^./, c => c.toUpperCase());
function chatSources(m, index) {
  const list = m.evidence || [];
  if (!list.length) return m.looked?.length ? `<small class="looked">Checked ${esc(m.looked.join(', '))}</small>` : '';
  const open = sourceOpen.get(index), shown = list[open], last = index === chat.length - 1 && !m.stopped && !m.error;
  return `<div class="sources"><span>Checked</span>${list.map((s, i) => `<button class="source${s.available ? '' : ' missing'}" data-chat-source="${index}:${i}" aria-expanded="${open === i}" title="${s.available ? 'Show what was read' : 'This could not be read'}">${esc(sourceName(s))}</button>`).join('')}`
    + (last ? `<button class="icon-button" data-chat-refresh="${index}" title="Check again and answer again" aria-label="Check again and answer again" ${chatBusy ? 'disabled' : ''}>${svg('sync')}</button>` : '') + '</div>'
    + (shown ? `<div class="source-detail"><small>${shown.available ? `Read ${esc(ago(shown.collectedAt))}${shown.cached ? ' · reused from an earlier reading' : ''}${shown.partial ? ' · some readings were unavailable' : ''}${shown.truncated ? ' · shortened to fit the model' : ''}` : 'Could not be read'}</small>`
      + `<div class="source-text">${esc(shown.available ? shown.text : shown.error || 'Windows did not return this information.')}</div></div>` : '');
}
function renderChat() {
  const log = $('#chat-log'), oldTop = log?.scrollTop || 0, pinned = !log || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
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
  else next.scrollTop = oldTop;
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
    else if (pick('source')) { const [message, source] = pick('source').split(':').map(Number); if (sourceOpen.get(message) === source) sourceOpen.delete(message); else sourceOpen.set(message, source); render(); }
    else if (pick('refresh')) refreshChatEvidence(+pick('refresh'));
    else if (pick('open')) openFromChat(pick('open'));
    else if (pick('update')) { const a = item(pick('update')); if (a?.available) reviewUpdates([a]); }
    else if (pick('info')) openDetails(pick('info'));
    else if (ask) sendChat(ask.dataset.ask);
    else if (go) navigate(go.dataset.view);
  };
}
async function openFromChat(id) {
  if (chatOpening.has(id)) return;
  chatOpening.add(id); render();
  try { await launch(id); } finally { chatOpening.delete(id); if (view === 'chat') render(); }
}
async function refreshChatEvidence(index) {
  if (chatBusy || index !== chat.length - 1 || chat[index]?.role !== 'assistant') return;
  const epoch = chatEpoch;
  chatBusy = true; chatStream = ''; chatStatus = 'Checking again…'; sourceOpen.delete(index); render();
  try {
    const messages = chat.slice(0, index).filter(m => !m.error).map(({role, content}) => ({role, content}));
    const r = await api.chat(messages, {refreshEvidence: true});
    if (epoch === chatEpoch) chat[index] = chatReply(r);
  } catch (error) { if (epoch === chatEpoch) toast(cleanError(error), true); }
  finally { if (epoch === chatEpoch) { chatBusy = false; chatStream = ''; if (view === 'chat' && !query) render(); } }
}
function chatReply(r) {
  return {role: 'assistant', content: String(r.reply || ''), truncated: !!r.truncated, looked: Array.isArray(r.looked) ? r.looked : [], evidence: Array.isArray(r.evidence) ? r.evidence : [], suggestions: Array.isArray(r.suggestions) ? r.suggestions : []};
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
  chatEpoch++; chat = []; chatBusy = false; chatStream = ''; sourceOpen.clear();
  render();
  $('#chat-input')?.focus();
}
async function sendChat(text, options = {}) {
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
    const r = await api.chat(chat.filter(m => !m.error).map(({role, content}) => ({role, content})), options);
    if (epoch === chatEpoch) chat.push(chatReply(r));
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
  if ('chatEngine' in data) { state.chatEngine = data.chatEngine; updateFooter(); if (!data.ai && !data.reasoner && !data.models && !data.items) return; }
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
