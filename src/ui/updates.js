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

