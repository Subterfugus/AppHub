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
  $('#body').innerHTML = warningNotices()
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

