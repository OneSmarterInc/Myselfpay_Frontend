(() => {
  'use strict';
  const section = document.querySelector('.mailer-directory');
  const table = section?.querySelector('table');
  const body = table?.tBodies[0];
  const compose = document.getElementById('mailer-compose');
  if (!body || !compose) return;
  const all = document.getElementById('mailer-select-filtered');
  const pageBox = document.getElementById('mailer-select-page');
  const range = document.getElementById('id_selection');
  const selectionStatus = document.getElementById('mailer-selection-status');
  const expected = Number(compose.dataset.matchingCount || 0);
  const records = new Map();
  const selected = new Set();
  let view = new URL(location.href).searchParams.get('view') === 'replies' ? 'replies' : 'all';
  let page = 1, complete = false, loading = false, failed = false;
  const pageSize = 50;
  const toolbar = document.createElement('div'); toolbar.className = 'mw-toolbar';
  const tabs = document.createElement('div'); tabs.className = 'mw-tabs'; tabs.setAttribute('aria-label', 'Email views');
  const buttons = new Map();
  for (const [id, title] of [['all', 'All centers'], ['sent', 'Sent emails'], ['replies', 'Replies received'], ['other', 'Other emails']]) {
    const button = document.createElement('button'); button.type = 'button';
    button.append(document.createTextNode(title));
    const count = document.createElement('span'); count.className = 'mw-count'; button.append(count);
    button.addEventListener('click', () => {
      const audience = new URL(location.href).searchParams.get('audience');
      // A dedicated replies view must not inherit the mutually exclusive
      // “Never emailed” / “Emailed, no reply” audience from the directory.
      if ((id === 'replies' && audience && audience !== 'all') || (id === 'sent' && audience === 'never')) {
        const url = new URL(location.href); url.searchParams.set('audience', 'all'); url.searchParams.set('view', id);
        url.searchParams.delete('page'); url.searchParams.delete('all_matching'); location.assign(url); return;
      }
      view = id; page = 1;
      const url = new URL(location.href); url.searchParams.set('view', id); history.replaceState(null, '', url);
      render();
    });
    tabs.append(button); buttons.set(id, { button, count });
  }
  const help = document.createElement('p'); help.className = 'mw-help';
  help.textContent = 'Sent emails first · Latest email per center. Open a thread to read its replies.';
  toolbar.append(tabs, help);
  const status = document.createElement('div'); status.className = 'mw-status'; status.setAttribute('role', 'status');
  const original = section.querySelector('.sp-table-scroll');
  const caption = table.querySelector('caption');
  if (caption) caption.textContent = 'Center emails, sent first. Row numbers retain their original import order.';
  original.before(toolbar, status);
  const serverPager = section.querySelector('.mailer-pagination');
  if (serverPager) serverPager.classList.add('mw-hidden');
  const pager = document.createElement('nav'); pager.className = 'mw-pager'; pager.setAttribute('aria-label', 'Center email pages');
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous';
  const pageLabel = document.createElement('span');
  const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next';
  previous.onclick = () => { page--; render(); };
  next.onclick = () => { page++; render(); };
  pager.append(previous, pageLabel, next); original.after(pager);

  function ingest(doc) {
    const rows = doc.querySelectorAll('.mailer-directory tbody tr');
    for (const node of rows) {
      const checkbox = node.querySelector('.mailer-center-checkbox');
      if (!checkbox || records.has(checkbox.value)) continue;
      const row = document.importNode(node, true);
      const cells = row.cells;
      const state = cells[5]?.textContent.trim().toLowerCase() || 'not sent';
      const replies = /^\d+\s+received\b/i.test(cells[6]?.querySelector('a')?.textContent.trim() || '');
      if (checkbox.checked && !all?.checked) selected.add(checkbox.value);
      const record = { id: checkbox.value, row, state, replies, position: Number(cells[1]?.textContent.trim()) || 0 };
      records.set(record.id, record);
      row.querySelector('.mailer-center-checkbox').addEventListener('change', event => {
        if (all?.checked) {
          all.checked = false;
          selected.clear();
          visibleRows().forEach(item => { if (!item.row.querySelector('input').disabled) selected.add(item.id); });
        }
        event.target.checked ? selected.add(record.id) : selected.delete(record.id);
        updateSelection();
      });
    }
  }
  function sortedRows() {
    return [...records.values()].sort((a, b) => Number(b.state === 'sent') - Number(a.state === 'sent') || a.position - b.position);
  }
  function filteredRows() {
    return sortedRows().filter(item => view === 'all' || (view === 'sent' ? item.state === 'sent' : view === 'replies' ? item.replies : item.state !== 'sent'));
  }
  function visibleRows() { return filteredRows().slice((page - 1) * pageSize, page * pageSize); }
  function updateSelection() {
    const visible = visibleRows().filter(item => !item.row.querySelector('.mailer-center-checkbox').disabled);
    for (const item of records.values()) item.row.querySelector('.mailer-center-checkbox').checked = !!all?.checked || selected.has(item.id);
    if (pageBox) {
      pageBox.disabled = !visible.length;
      const count = visible.filter(item => all?.checked || selected.has(item.id)).length;
      pageBox.checked = !!visible.length && count === visible.length;
      pageBox.indeterminate = count > 0 && count < visible.length;
    }
    let count = all?.checked ? expected : selected.size;
    if (!all?.checked && !count && range?.value.trim()) {
      const match = range.value.trim().match(/^([1-9]\d*)(?:\s*-\s*([1-9]\d*))?$/);
      if (match) { const start = match[2] ? Number(match[1]) : 1; const end = Number(match[2] || match[1]); if (end >= start && end <= expected) count = end - start + 1; }
    }
    const label = `${count} centers selected${all?.checked ? ' across all matching results' : ''}`;
    document.querySelectorAll('.mailer-selected-count').forEach(node => { node.textContent = label; });
    if (selectionStatus) selectionStatus.textContent = `${label}. Checkboxes select centers across pages. Count/range uses the original import-order row numbers, not the sent-first display order.`;
  }
  function render() {
    const counts = { all: records.size, sent: 0, replies: 0, other: 0 };
    for (const item of records.values()) { counts[item.state === 'sent' ? 'sent' : 'other']++; if (item.replies) counts.replies++; }
    for (const [id, entry] of buttons) { entry.button.setAttribute('aria-pressed', String(view === id)); entry.count.textContent = counts[id]; }
    const total = filteredRows().length;
    page = Math.max(1, Math.min(page, Math.ceil(total / pageSize) || 1));
    body.replaceChildren(...visibleRows().map(item => item.row));
    if (!total) {
      const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 8; cell.className = 'mw-empty';
      cell.textContent = !complete ? 'Loading matching emails…' : view === 'replies' ? 'No replies found for the latest center emails. Use “Check for replies” to request a mailbox sync.' : 'No centers match this view.';
    }
    pageLabel.textContent = `Page ${page} of ${Math.ceil(total / pageSize) || 1} · ${total} centers${complete ? '' : ' loaded'}`;
    previous.disabled = page <= 1; next.disabled = page * pageSize >= total;
    updateSelection();
  }
  all?.addEventListener('change', () => { selected.clear(); updateSelection(); });
  pageBox?.addEventListener('change', () => {
    if (all) all.checked = false;
    visibleRows().forEach(item => { if (!item.row.querySelector('.mailer-center-checkbox').disabled) pageBox.checked ? selected.add(item.id) : selected.delete(item.id); });
    updateSelection();
  });
  range?.addEventListener('input', updateSelection);
  compose.addEventListener('submit', () => {
    compose.querySelectorAll('.mw-selected-id').forEach(node => node.remove());
    // Rows on other client-side pages are detached; submit their selections too.
    for (const id of selected) {
      const input = document.createElement('input'); input.type = 'hidden'; input.name = 'selected_contacts'; input.value = id; input.className = 'mw-selected-id'; compose.append(input);
    }
  });
  async function loadAll() {
    if (loading) return;
    loading = true; failed = false;
    status.setAttribute('aria-busy', 'true'); status.classList.remove('mw-error');
    const pageText = serverPager?.querySelector('span')?.textContent || '';
    const pages = Number(pageText.match(/of\s+(\d+)/)?.[1] || 1);
    let cursor = 1;
    const currentPage = Number(new URL(location.href).searchParams.get('page') || 1);
    status.textContent = `Loading email history · ${records.size} of ${expected} centers`;
    async function worker() {
      while (!failed && cursor <= pages) {
        const number = cursor++;
        if (number === currentPage) continue;
        const url = new URL(location.href); url.searchParams.set('page', String(number)); url.searchParams.set('__mailer_original', '1'); url.searchParams.delete('view'); url.searchParams.delete('all_matching');
        const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error('load');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        if (!doc.querySelector('#mailer-compose')) throw new Error('session');
        ingest(doc); render();
        status.textContent = `Loading email history · ${records.size} of ${expected} centers`;
      }
    }
    const results = await Promise.allSettled(Array.from({ length: Math.min(3, pages) }, () => worker().catch(error => { failed = true; throw error; })));
    loading = false; status.setAttribute('aria-busy', 'false');
    complete = results.every(result => result.status === 'fulfilled') && records.size >= expected;
    status.textContent = complete ? `Showing ${records.size} centers. Sent emails appear first; replies are from the last mailbox sync. Filters above apply to every tab.` : `Loaded ${records.size} of ${expected} centers. Some pages could not be loaded. Refresh your admin login if it expired, then retry.`;
    if (!complete) { status.classList.add('mw-error'); const retry = document.createElement('button'); retry.className = 'mw-retry'; retry.type = 'button'; retry.textContent = 'Retry loading'; retry.onclick = loadAll; status.append(' ', retry); }
    render();
  }
  ingest(document); render(); loadAll();
})();
