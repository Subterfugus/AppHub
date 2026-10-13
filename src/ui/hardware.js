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

