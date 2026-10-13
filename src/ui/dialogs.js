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

