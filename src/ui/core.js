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
  power: '<path d="M12 3v9"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/>',
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
  ['', [['home', 'home', 'Home'], ['chat', 'chat', 'Chat'], ['hardware', 'chip', 'Hardware'], ['startup', 'power', 'Startup']]],
  ['Library', [['all', 'grid', 'Apps'], ['favorites', 'star', 'Favorites'], ['recent', 'clock', 'Recent'], ['settings', 'sliders', 'Windows settings']]],
  ['Packages', [['updates', 'download', 'Updates'], ['discover', 'plus', 'Install apps'], ['reproduce', 'swap', 'Export & restore'], ['activity', 'pulse', 'Activity']]]
];
const categories = ['Development', 'Creative', 'Music & audio', 'Productivity', 'Browsers', 'Communication', 'Games', 'Utilities'];
const titles = {home: 'Home', chat: 'Chat', hardware: 'Hardware', startup: 'Startup', all: 'Apps', favorites: 'Favorites', recent: 'Recent', settings: 'Windows settings', updates: 'Updates', discover: 'Install apps', reproduce: 'Export & restore', activity: 'Activity', preferences: 'Settings'};

const item = id => state.items.find(a => a.id === id);
// Warnings can be closed. A closed one stays away until AppHub restarts; a warning with different text is new, so it shows.
const dismissed = new Set();
const warningNotices = () => [...new Set(state.warnings || [])].filter(w => !dismissed.has(w)).map(w => `<div class="notice warn dismissable"><span>${esc(w)}</span><button class="icon-button" data-dismiss="${esc(w)}" aria-label="Dismiss this notice" title="Dismiss">${svg('close')}</button></div>`).join('');
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

