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

