// Startup: what starts with Windows. Entries registered for this user have a switch, which sets the same flag Task Manager does.
// Entries registered for all users are listed but can only be changed in Windows Settings.
let startupItems = null, startupLoading = false, startupError = '';
const startupPending = new Set();
async function loadStartup(force = false) {
  if (startupLoading || !api.startup) return;
  startupLoading = true;
  try { startupItems = (await api.startup(force)).items || []; startupError = ''; }
  catch (error) { startupError = cleanError(error); }
  startupLoading = false;
  if (view === 'startup' && !query) renderStartup();
}
async function toggleStartup(key, enabled) {
  const entry = startupItems?.find(i => i.key === key);
  if (!entry || startupPending.has(key)) return;
  startupPending.add(key);
  try {
    await api.setStartup(key, enabled);
    entry.enabled = enabled;
    toast(enabled ? `${entry.name} will start with Windows` : `${entry.name} will no longer start with Windows`);
  } catch (error) { toast(cleanError(error), true); }
  startupPending.delete(key);
  if (view === 'startup' && !query) renderStartup();
}
function startupRow(s) {
  const app = state.items.find(a => a.kind === 'app' && a.name.toLowerCase() === s.name.toLowerCase()) || {id: 'startup:' + s.key, name: s.name, kind: 'app'};
  const where = [s.program, s.kind === 'folder' ? 'Startup folder' : '', s.scope === 'user' ? '' : 'All users'].filter(Boolean).join(' · ');
  return `<div class="startup-row${s.enabled ? '' : ' off'}" ${tintAttrs(app)}>${icon(app)}<div><strong>${esc(s.name)}</strong><small>${esc(where)}</small></div>`
    + (s.scope === 'user' ? `<input class="switch" type="checkbox" data-startup="${esc(s.key)}" aria-label="${esc(s.name)} starts with Windows" ${s.enabled ? 'checked' : ''} ${startupPending.has(s.key) ? 'disabled' : ''}>`
      : `<span class="startup-fixed">${s.enabled ? 'On' : 'Off'} · set in Windows</span>`) + '</div>';
}
function renderStartupContent() {
  const items = [...(startupItems || [])].sort((a, b) => a.name.localeCompare(b.name)), on = items.filter(i => i.enabled).length;
  $('#body').innerHTML = '<div class="startup">'
    + `<div class="startup-head"><p>${startupItems ? items.length ? `${on} of ${plural(items.length, 'entry').replace('entrys', 'entries')} start with Windows` : 'Nothing is registered to start with Windows.' : startupError ? '' : 'Reading startup entries…'}</p>`
    + `<button id="startup-refresh" class="button subtle" ${startupLoading ? 'disabled' : ''}>${svg('sync')}Refresh</button></div>`
    + (startupError ? `<div class="notice warn">${esc(startupError)}</div>` : '')
    + (items.length ? `<div class="panel startup-list">${items.map(startupRow).join('')}</div>` : '')
    + '<p class="footnote">Switching an entry off does not close or remove the program. Entries for all users, services and scheduled tasks are not changed here. <button class="text-button" id="startup-settings">Open Windows startup settings</button></p></div>';
  $('#startup-refresh').onclick = () => { loadStartup(true); renderStartup(); };
  $('#startup-settings').onclick = () => attempt(() => api.openSettings('startupapps'));
  $('#body').onchange = e => { const box = e.target.closest('[data-startup]'); if (box) { toggleStartup(box.dataset.startup, box.checked); renderStartup(); } };
}
function renderStartup() { retainFocus(renderStartupContent); }
