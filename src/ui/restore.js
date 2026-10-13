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

