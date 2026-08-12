/* Admin dashboard script — loads applications, allows editing status and performance, ready for Firebase integration */
const ACCOUNT_STORAGE_KEY = 'kj_account_applications';
const FIREBASE_CONFIG_ACCOUNT = (window && window.FIREBASE_CONFIG) ? window.FIREBASE_CONFIG : null;
let dbAcc = null;
let authAcc = null;
let applications = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  // UI elements
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportBtn');
  const selectAll = document.getElementById('selectAll');
  const summaryCount = document.getElementById('summaryCount');
  const bulkHireBtn = document.getElementById('bulkHireBtn');
  const bulkRejectBtn = document.getElementById('bulkRejectBtn');

  searchInput.addEventListener('input', renderTable);
  filterStatus.addEventListener('change', renderTable);
  refreshBtn.addEventListener('click', loadApplications);
  exportBtn.addEventListener('click', exportCSV);
  selectAll.addEventListener('change', toggleSelectAll);
  bulkHireBtn.addEventListener('click', () => bulkUpdateStatus('Hired'));
  bulkRejectBtn.addEventListener('click', () => bulkUpdateStatus('Rejected'));

  // modal events
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('editForm').addEventListener('submit', saveEdit);

  // initialize firebase if config present
  if (FIREBASE_CONFIG_ACCOUNT && typeof firebase !== 'undefined') {
    try {
      firebase.initializeApp(FIREBASE_CONFIG_ACCOUNT);
      dbAcc = firebase.firestore();
      authAcc = firebase.auth();
      // optional: require admin sign-in to view
      authAcc.onAuthStateChanged(user => {
        if (user) {
          console.log('Signed in as', user.email);
        }
      });
    } catch (e) { console.warn('Firebase init failed', e); }
  }

  loadApplications();
});

function loadApplications(){
  // If firebase configured, load from Firestore
  if (dbAcc) {
    dbAcc.collection('applications').orderBy('createdAt', 'desc').get().then(snapshot => {
      applications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // normalize createdAt if needed
      applications.forEach(a => { if (a.createdAt && a.createdAt.toDate) a._createdAt = a.createdAt.toDate(); else a._createdAt = new Date(a.createdAt || Date.now()); });
      renderTable();
    }).catch(err => {
      console.warn('Failed to load from Firestore', err);
      // fallback to local
      loadFromLocal();
    });
  } else {
    loadFromLocal();
  }
}

function loadFromLocal(){
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    applications = raw ? JSON.parse(raw) : [];
    applications.forEach(a => { a._createdAt = new Date(a.createdAt || Date.now()); });
    renderTable();
  } catch { applications = []; renderTable(); }
}

function renderTable(){
  const tbody = document.querySelector('#applicationsTable tbody');
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const filtered = applications.filter(a => {
    const matchSearch = !search || (a.fullName && a.fullName.toLowerCase().includes(search)) || (a.email && a.email.toLowerCase().includes(search)) || (a.position && a.position.toLowerCase().includes(search));
    const matchStatus = !status || (a.status === status);
    return matchSearch && matchStatus;
  });

  document.getElementById('summaryCount').textContent = `${filtered.length} applicants`;

  tbody.innerHTML = filtered.map(a => `
    <tr data-id="${escapeHtml(a.id||'')}">
      <td><input type="checkbox" class="row-checkbox"></td>
      <td>${escapeHtml(a.fullName||'')}</td>
      <td>${escapeHtml(a.position||'')}</td>
      <td>${escapeHtml(a.email||'')}</td>
      <td>${escapeHtml(a.country||'')}</td>
      <td>${escapeHtml(a.experience||'')}</td>
      <td><select class="status-select">${statusOptions(a.status)}</select></td>
      <td><input class="rating-input" type="number" min="1" max="5" value="${a.rating||''}" style="width:60px"></td>
      <td>${a._createdAt ? new Date(a._createdAt).toLocaleString() : ''}</td>
      <td><button class="btn small" data-action="edit">Edit</button></td>
    </tr>
  `).join('');

  // attach listeners
  document.querySelectorAll('.status-select').forEach(s => s.addEventListener('change', onStatusChange));
  document.querySelectorAll('.rating-input').forEach(r => r.addEventListener('change', onRatingChange));
  document.querySelectorAll('[data-action="edit"]').forEach(b => b.addEventListener('click', onEditClick));
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.addEventListener('change', onRowSelect));
}

function statusOptions(current){
  const opts = ['New','Phone Screen','Interview','Offer','Hired','Rejected'];
  return opts.map(o => `<option ${o===current ? 'selected' : ''}>${o}</option>`).join('');
}

function onStatusChange(e){
  const row = e.target.closest('tr');
  const id = row.getAttribute('data-id');
  const status = e.target.value;
  updateApplicationField(id, { status });
}

function onRatingChange(e){
  const row = e.target.closest('tr');
  const id = row.getAttribute('data-id');
  const rating = parseInt(e.target.value) || null;
  updateApplicationField(id, { rating });
}

function onEditClick(e){
  const row = e.target.closest('tr');
  const id = row.getAttribute('data-id');
  const app = applications.find(a => (a.id||a.id===id) && (a.id==id || a.id===id));
  if (!app) return;
  openModalWith(app);
}

function openModalWith(app){
  document.getElementById('editId').value = app.id||'';
  document.getElementById('editName').value = app.fullName||'';
  document.getElementById('editPosition').value = app.position||'';
  document.getElementById('editEmail').value = app.email||'';
  document.getElementById('editCountry').value = app.country||'';
  document.getElementById('editExperience').value = app.experience||'';
  document.getElementById('editStatus').value = app.status||'New';
  document.getElementById('editRating').value = app.rating||'';
  document.getElementById('editNotes').value = app.notes||'';
  document.getElementById('editModal').hidden = false;
}

function closeModal(){ document.getElementById('editModal').hidden = true; }

function saveEdit(e){
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const updates = {
    fullName: document.getElementById('editName').value,
    position: document.getElementById('editPosition').value,
    email: document.getElementById('editEmail').value,
    country: document.getElementById('editCountry').value,
    experience: document.getElementById('editExperience').value,
    status: document.getElementById('editStatus').value,
    rating: parseInt(document.getElementById('editRating').value) || null,
    notes: document.getElementById('editNotes').value
  };
  updateApplicationField(id, updates, true);
  closeModal();
}

function updateApplicationField(id, updates, replaceLocal=false){
  // update in memory
  const idx = applications.findIndex(a => a.id==id || a.id===id);
  if (idx>=0) {
    applications[idx] = Object.assign({}, applications[idx], updates);
  }
  // save to firestore if available
  if (dbAcc) {
    dbAcc.collection('applications').doc(id).set(Object.assign({}, applications[idx]), { merge: true }).catch(err => console.warn('update failed', err));
  }
  // save to local
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(applications));
  } catch {}
  renderTable();
}

function exportCSV(){
  const headers = ['id','fullName','email','phone','position','experience','country','status','rating','notes','createdAt'];
  const rows = [headers.join(',')];
  const docs = applications;
  for (const it of docs) {
    const row = headers.map(h => `"${(it[h] ?? '').toString().replace(/"/g,'""')}"`).join(',');
    rows.push(row);
  }
  const csv = rows.join('\n');
  downloadBlob(csv, `applications_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
}

function downloadBlob(content, filename, type){
  const blob = new Blob([content], { type: type || 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function toggleSelectAll(e){
  const checked = e.target.checked;
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = checked);
}

function onRowSelect(){ /* placeholder for future */ }

function bulkUpdateStatus(newStatus){
  const ids = Array.from(document.querySelectorAll('.row-checkbox')).filter(cb => cb.checked).map(cb => cb.closest('tr').getAttribute('data-id'));
  if (!ids.length) return alert('No rows selected');
  ids.forEach(id => updateApplicationField(id, { status: newStatus }));
  alert(`Updated ${ids.length} applicants to ${newStatus}`);
}

function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"); }
