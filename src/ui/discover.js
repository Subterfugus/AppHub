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

