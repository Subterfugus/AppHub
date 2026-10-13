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
  const warnings = !query ? warningNotices() : '';
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

