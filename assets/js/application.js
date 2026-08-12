/* Simple client-side application handling.
   - Stores submissions in localStorage (key: "kj_applications")
   - Exposes CSV export and clear functions
   - Optional: set SERVER_ENDPOINT to enable server POST on submit
*/

const STORAGE_KEY = 'kj_applications';
const SERVER_ENDPOINT = ''; // e.g. 'https://example.com/api/apply' (POSTs JSON). Leave empty to keep local only.

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const viewBtn = document.getElementById('viewSubmissionsBtn');
  const submissionsPanel = document.getElementById('submissionsPanel');
  const closeBtn = document.getElementById('closeSubmissions');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');

  viewBtn.addEventListener('click', () => {
    toggleSubmissions(true);
  });
  closeBtn.addEventListener('click', () => toggleSubmissions(false));
  exportBtn.addEventListener('click', exportCSV);
  clearBtn.addEventListener('click', clearAllSubmissions);

  renderSubmissions();
});

function handleApplicationSubmit(event){
  event.preventDefault();
  const form = event.target;
  const formMessage = document.getElementById('formMessage');

  // native form validation
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    id: cryptoRandomId(),
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    position: form.position.value,
    experience: form.experience.value,
    country: form.country.value.trim(),
    portfolio: form.portfolio.value.trim(),
    coverLetter: form.coverLetter.value.trim(),
    termsAccepted: !!form.terms.checked,
    createdAt: new Date().toISOString()
  };

  // Save locally
  const all = loadSubmissions();
  all.push(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    formMessage.textContent = 'Application saved successfully.';
    formMessage.style.color = '#0f766e';
    form.reset();
    renderSubmissions();
  } catch (err) {
    console.error('Failed to save submission', err);
    formMessage.textContent = 'Could not save application locally. Check browser settings.';
    formMessage.style.color = '#b91c1c';
  }

  // Optional: send to server if endpoint configured
  if (SERVER_ENDPOINT) {
    fetch(SERVER_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).then(r => {
      if (!r.ok) throw new Error('Server returned ' + r.status);
      return r.json();
    }).then(() => {
      // optionally mark as synced; for now we do nothing
    }).catch(err => {
      console.warn('Failed to send to server', err);
    });
  }
}

function loadSubmissions(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function renderSubmissions(){
  const list = document.getElementById('submissionsList');
  if (!list) return;
  const items = loadSubmissions().slice().reverse(); // newest first
  if (items.length === 0) {
    list.innerHTML = '<p class="muted">No saved submissions yet.</p>';
    return;
  }
  list.innerHTML = items.map(it => {
    return `<div class="submission-item" data-id="${escapeHtml(it.id)}">
      <strong>${escapeHtml(it.fullName)} — ${escapeHtml(it.position)}</strong>
      <div>${escapeHtml(it.email)} • ${escapeHtml(it.phone)} • ${escapeHtml(it.country)}</div>
      <div style="margin-top:0.25rem; color:var(--muted); font-size:0.9rem">${new Date(it.createdAt).toLocaleString()}</div>
      <div style="margin-top:0.5rem; white-space:pre-wrap">${escapeHtml(it.coverLetter)}</div>
    </div>`;
  }).join('');
}

// Submissions panel visibility
function toggleSubmissions(show){
  const panel = document.getElementById('submissionsPanel');
  if (!panel) return;
  panel.hidden = !show;
  if (show) renderSubmissions();
}

// CSV export
function exportCSV(){
  const items = loadSubmissions();
  if (!items.length) {
    alert('No submissions to export.');
    return;
  }
  const headers = ['id','fullName','email','phone','position','experience','country','portfolio','coverLetter','termsAccepted','createdAt'];
  const rows = [headers.join(',')];
  for (const it of items) {
    const row = headers.map(h => `"${(it[h] ?? '').toString().replace(/"/g,'""')}"`).join(',');
    rows.push(row);
  }
  const csv = rows.join('\n');
  downloadBlob(csv, `kj_applications_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
}

function clearAllSubmissions(){
  if (!confirm('Clear ALL saved submissions from browser local storage? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderSubmissions();
  alert('All saved submissions removed from local storage.');
}

// Utilities
function downloadBlob(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(s){
  if (!s) return '';
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'", '&#39;');
}

function cryptoRandomId(){
  // small unique id for local usage
  return 'id-' + Math.random().toString(36).slice(2,9);
}
