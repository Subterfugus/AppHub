// Chat: the model answers from the library, a system snapshot and the lookups it asked for. Every action is a button under its reply, and each one asks before it runs.
const CHAT_EXAMPLES = ['What is using the most memory right now?', 'Has anything crashed this week?', 'What is taking up space on my disk?', 'What starts with Windows?'];
function chatSuggestions(m, index) {
  const rows = (m.suggestions || []).map((s, i) => {
    const act = (verb, label, style = 'subtle') => s.done ? '' : `<button class="button ${style}" data-chat-act="${index}:${i}:${verb}">${label}</button>`;
    const row = (subject, title, detail, buttons) => `<div class="suggestion" ${tintAttrs(subject)}>${icon(subject)}<div class="suggestion-text"><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>${s.done ? `<span class="pill">${esc(s.done)}</span>` : ''}${buttons}</div>`;
    if (!s.type || s.type === 'entry') {
      const a = item(s.id);
      if (!a || a.hidden) return '';
      const id = esc(a.id), detail = a.available ? `${a.version || ''} → ${a.available}` : a.kind === 'setting' ? 'Windows setting' : a.publisher || a.category || '';
      return row(a, a.name, detail, (s.uninstall && a.kind === 'app' ? act('uninstall', 'Uninstall…') : '')
        + (a.available && !a.updateBlocked ? `<button class="button subtle" data-chat-update="${id}">Update…</button>` : '')
        + (a.launch && !s.uninstall ? `<button class="button primary" data-chat-open="${id}" ${a.unavailable ? 'disabled' : ''} ${chatOpening.has(a.id) ? 'aria-disabled="true" aria-busy="true"' : ''}>${chatOpening.has(a.id) ? 'Opening…' : 'Open'}</button>` : '')
        + `<button class="icon-button" data-chat-info="${id}" aria-label="Details for ${esc(a.name)}" title="Details">${svg('dots')}</button>`);
    }
    const subject = {id: s.type + ':' + s.name, name: String(s.name || '?')};
    if (s.type === 'process') return row(subject, s.name, `Running${s.count > 1 ? ` · ${s.count} processes` : ''}${s.memoryGb ? ` · ${s.memoryGb} GB of memory` : ''}`, act('end', 'End…'));
    if (s.type === 'startup') return row(subject, s.name, 'Starts with Windows', act('startup', 'Disable…'));
    if (s.type === 'package') return row(subject, s.name, `${s.id} · ${s.version || 'latest'} · WinGet catalog`, act('install', 'Install…', 'primary'));
    if (s.type === 'updates') {
      const ready = (s.ids || []).filter(id => item(id)?.available && !item(id)?.updateBlocked).length;
      return ready > 1 ? row({id: 'updates', name: 'Updates'}, plural(ready, 'app update'), 'You choose which ones install', act('updates', 'Review all…', 'primary')) : '';
    }
    return '';
  }).join('');
  return rows ? `<div class="suggestions">${rows}</div>` : '';
}
function chatAct(index, i, verb) {
  const s = chat[index]?.suggestions?.[i];
  if (!s) return;
  const done = label => () => { s.done = label; if (view === 'chat' && !query) render(); };
  if (verb === 'uninstall') { const a = item(s.id); if (a) confirmUninstall(a, done('Queued')); }
  else if (verb === 'end') confirmEnd(s, done('Ended'));
  else if (verb === 'startup') confirmStartup(s, done('Disabled'));
  else if (verb === 'install') inspectCatalog(s);
  else if (verb === 'updates') { const apps = (s.ids || []).map(item).filter(a => a?.available && !a.updateBlocked); if (apps.length) reviewUpdates(apps); }
}
function chatMessage(m, index) {
  if (m.role === 'user') return `<div class="msg user"><div class="bubble">${esc(m.content)}</div></div>`;
  return `<div class="msg bot"><span class="avatar">${svg('mark')}</span><div class="bubble${m.error ? ' error' : ''}">${esc(m.error || m.content)}${m.stopped ? '<small class="stopped">Stopped</small>' : ''}${m.truncated ? '<small class="stopped">Reached the length limit for one reply. Ask it to continue.</small>' : ''}`
    + `${chatSources(m, index)}${chatSuggestions(m, index)}</div></div>`;
}
// What a reply was based on: one chip per source, and a click shows the text the model was given.
const ago = value => {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return '';
  const seconds = (Date.now() - t) / 1000;
  return seconds < 90 ? 'just now' : seconds < 3600 ? Math.round(seconds / 60) + ' min ago' : 'at ' + new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
};
const sourceName = s => ({pc: 'This PC', library: 'Your library'})[s.id] || String(s.title || s.id).replace(/^the /, '').replace(/^./, c => c.toUpperCase());
function chatSources(m, index) {
  const list = m.evidence || [];
  if (!list.length) return m.looked?.length ? `<small class="looked">Checked ${esc(m.looked.join(', '))}</small>` : '';
  const open = sourceOpen.get(index), shown = list[open], last = index === chat.length - 1 && !m.stopped && !m.error;
  return `<div class="sources"><span>Checked</span>${list.map((s, i) => `<button class="source${s.available ? '' : ' missing'}" data-chat-source="${index}:${i}" aria-expanded="${open === i}" title="${s.available ? 'Show what was read' : 'This could not be read'}">${esc(sourceName(s))}</button>`).join('')}`
    + (last ? `<button class="icon-button" data-chat-refresh="${index}" title="Check again and answer again" aria-label="Check again and answer again" ${chatBusy ? 'disabled' : ''}>${svg('sync')}</button>` : '') + '</div>'
    + (shown ? `<div class="source-detail"><small>${shown.available ? `Read ${esc(ago(shown.collectedAt))}${shown.cached ? ' · reused from an earlier reading' : ''}${shown.partial ? ' · some readings were unavailable' : ''}${shown.truncated ? ' · shortened to fit the model' : ''}` : 'Could not be read'}</small>`
      + `<div class="source-text">${esc(shown.available ? shown.text : shown.error || 'Windows did not return this information.')}</div></div>` : '');
}
function renderChat() {
  const log = $('#chat-log'), oldTop = log?.scrollTop || 0, pinned = !log || log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const chatProfile = state.models?.profiles?.find(p => p.id === state.models?.active?.chat), engine = chatProfile ? state.chatEngine : state.reasoner;
  const off = state.prefs.aiEnabled === false ? 'Local AI is turned off.' : state.models?.active?.reasoning === 'off' && !chatProfile ? 'No chat model is selected.' : '';
  const pending = chatBusy ? `<div class="msg bot"><span class="avatar working">${svg('mark')}</span><div class="bubble"><span id="chat-stream">${esc(chatStream)}</span>${chatStream ? '<i class="caret"></i>' : `<span class="typing" id="chat-status">${esc(chatStatus || 'Thinking…')}</span>`}</div></div>` : '';
  const empty = '<div class="chat-empty"><h2>Ask about this PC</h2>'
    + '<p>Chat runs on this PC. It reads your app library and system information, and looks things up when a question needs them: running programs, services, folder sizes, network status, recent crashes, Windows Update history, battery health, startup programs, hardware and the WinGet catalog. It never opens your files, and it cannot change anything itself. It offers buttons, and each one asks before it runs.</p>'
    + (off ? `<div class="notice warn">${off} <button class="text-button" data-view="preferences">Open Settings</button></div>` : `<div class="examples">${CHAT_EXAMPLES.map(q => `<button class="example" data-ask="${esc(q)}">${esc(q)}${svg('arrow')}</button>`).join('')}</div>`) + '</div>';
  $('#body').innerHTML = `<div class="chat"><div class="chat-log" id="chat-log">${chat.length || chatBusy ? chat.map(chatMessage).join('') + pending : empty}</div>`
    + `<form id="chat-form" class="composer"><textarea id="chat-input" rows="1" maxlength="2000" placeholder="Ask about your apps or this PC" aria-label="Message" ${off ? 'disabled' : ''}>${esc(chatDraft)}</textarea>`
    + (chatBusy ? `<button type="button" id="chat-stop" class="send stop" aria-label="Stop" title="Stop">${svg('stop')}</button>` : `<button class="send" aria-label="Send" title="Send" ${off ? 'disabled' : ''}>${svg('send')}</button>`) + '</form>'
    + `<small class="chat-note">${esc(chatProfile?.name || modelName('reasoning'))} · ${engine?.device ? 'running on the ' + esc(engine.device) : 'on this PC'} · answers can be wrong, so check anything important</small></div>`;
  const next = $('#chat-log');
  if (pinned) next.scrollTop = next.scrollHeight;
  else next.scrollTop = oldTop;
  const input = $('#chat-input');
  const fit = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  fit();
  input.oninput = () => { chatDraft = input.value; fit(); };
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chat-form').requestSubmit(); } };
  $('#chat-form').onsubmit = e => { e.preventDefault(); if (!chatBusy) sendChat(chatDraft); };
  $('#chat-stop')?.addEventListener('click', () => api.stopChat().catch(() => {}));
  $('#body').onclick = e => {
    const pick = name => e.target.closest(`[data-chat-${name}]`)?.dataset['chat' + name[0].toUpperCase() + name.slice(1)];
    const ask = e.target.closest('[data-ask]'), go = e.target.closest('[data-view]');
    if (pick('act')) { const [index, i, verb] = pick('act').split(':'); chatAct(+index, +i, verb); }
    else if (pick('source')) { const [message, source] = pick('source').split(':').map(Number); if (sourceOpen.get(message) === source) sourceOpen.delete(message); else sourceOpen.set(message, source); render(); }
    else if (pick('refresh')) refreshChatEvidence(+pick('refresh'));
    else if (pick('open')) openFromChat(pick('open'));
    else if (pick('update')) { const a = item(pick('update')); if (a?.available) reviewUpdates([a]); }
    else if (pick('info')) openDetails(pick('info'));
    else if (ask) sendChat(ask.dataset.ask);
    else if (go) navigate(go.dataset.view);
  };
}
async function openFromChat(id) {
  if (chatOpening.has(id)) return;
  chatOpening.add(id); render();
  try { await launch(id); } finally { chatOpening.delete(id); if (view === 'chat') render(); }
}
async function refreshChatEvidence(index) {
  if (chatBusy || index !== chat.length - 1 || chat[index]?.role !== 'assistant') return;
  const epoch = chatEpoch;
  chatBusy = true; chatStream = ''; chatStatus = 'Checking again…'; sourceOpen.delete(index); render();
  try {
    const messages = chat.slice(0, index).filter(m => !m.error).map(({role, content}) => ({role, content}));
    const r = await api.chat(messages, {refreshEvidence: true});
    if (epoch === chatEpoch) chat[index] = chatReply(r);
  } catch (error) { if (epoch === chatEpoch) toast(cleanError(error), true); }
  finally { if (epoch === chatEpoch) { chatBusy = false; chatStream = ''; if (view === 'chat' && !query) render(); } }
}
function chatReply(r) {
  return {role: 'assistant', content: String(r.reply || ''), truncated: !!r.truncated, looked: Array.isArray(r.looked) ? r.looked : [], evidence: Array.isArray(r.evidence) ? r.evidence : [], suggestions: Array.isArray(r.suggestions) ? r.suggestions : []};
}
function updateChatStream() {
  const el = $('#chat-stream');
  if (!el) return;
  const log = $('#chat-log'), pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  if (!el.nextElementSibling?.classList.contains('caret')) { el.nextElementSibling?.remove(); el.insertAdjacentHTML('afterend', '<i class="caret"></i>'); }
  el.textContent = chatStream;
  if (pinned) log.scrollTop = log.scrollHeight;
}
function updateChatStatus() {
  const el = $('#chat-status');
  if (el) el.textContent = chatStatus || 'Thinking…';
}
function newChat() {
  if (chatBusy) api.stopChat().catch(() => {});
  chatEpoch++; chat = []; chatBusy = false; chatStream = ''; sourceOpen.clear();
  render();
  $('#chat-input')?.focus();
}
async function sendChat(text, options = {}) {
  text = String(text || '').trim();
  if (!text || chatBusy) return;
  const epoch = chatEpoch;
  chat.push({role: 'user', content: text});
  chatBusy = true; chatStream = ''; chatStatus = ''; chatDraft = '';
  if ($('#chat-input')) $('#chat-input').value = ''; // otherwise focus retention restores the sent text
  if (view !== 'chat' || query) navigate('chat'); else render();
  const log = $('#chat-log');
  if (log) log.scrollTop = log.scrollHeight;
  try {
    const r = await api.chat(chat.filter(m => !m.error).map(({role, content}) => ({role, content})), options);
    if (epoch === chatEpoch) chat.push(chatReply(r));
  } catch (e) {
    if (epoch !== chatEpoch) return;
    const message = cleanError(e);
    if (message !== 'Stopped') chat.push({role: 'assistant', content: '', error: message});
    else if (chatStream) chat.push({role: 'assistant', content: chatStream, stopped: true});
    else chat.pop();
  } finally {
    if (epoch === chatEpoch) {
      chatBusy = false; chatStream = '';
      if (view === 'chat' && !query) { render(); $('#chat-input')?.focus(); }
    }
  }
}

