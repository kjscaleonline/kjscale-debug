/* Client-side application handling with optional Firebase integration (Option A)
   - Local fallback: stores submissions in localStorage (key: "kj_applications")
   - If window.FIREBASE_CONFIG is provided, initializes Firebase (auth + firestore)
     * Submissions are saved to Firestore collection 'applications' in addition to localStorage
     * Viewing submissions is restricted to signed-in admin emails (KJ_ADMINS)
*/

const STORAGE_KEY = 'kj_applications';
const FIREBASE_CONFIG = (window && window.FIREBASE_CONFIG) ? window.FIREBASE_CONFIG : null;
const ADMINS = (window && Array.isArray(window.KJ_ADMINS)) ? window.KJ_ADMINS : [];

let db = null;
let auth = null;

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const viewBtn = document.getElementById('viewSubmissionsBtn');
  const closeBtn = document.getElementById('closeSubmissions');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const adminSignInBtn = document.getElementById('adminSignInBtn');
  const adminSignOutBtn = document.getElementById('adminSignOutBtn');

  viewBtn.addEventListener('click', () => {
    // require admin auth to view submissions panel
    if (db && auth) {
      const user = auth.currentUser;
      if (!user || !isAdmin(user)) {
        // prompt sign-in
        adminSignIn();
        return;
      }
    }
    toggleSubmissions(true);
  });

  closeBtn.addEventListener('click', () => toggleSubmissions(false));
  exportBtn.addEventListener('click', exportCSV);
  clearBtn.addEventListener('click', clearAllSubmissions);

  adminSignInBtn.addEventListener('click', adminSignIn);
  adminSignOutBtn.addEventListener('click', () => auth && auth.signOut());

  // initialize firebase if config provided
  if (FIREBASE_CONFIG && typeof firebase !== 'undefined') {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      auth = firebase.auth();

      auth.onAuthStateChanged(user => {
        updateAdminUI(user);
      });
    } catch (err) {
      console.warn('Firebase initialization failed', err);
    }
  }

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

  // If firebase is configured, also save to Firestore (public writes allowed)
  if (db) {
    // attempt to add a server timestamp as well
    const doc = Object.assign({}, data);
    try {
      // keep createdAtIso and also set serverTimestamp
      doc.createdAtIso = doc.createdAt;
      doc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('applications').add(doc).catch(err => {
        console.warn('Failed to save to Firestore', err);
      });
    } catch (e) {
      console.warn('Firestore save failed', e);
    }
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

async function renderSubmissions(){
  const list = document.getElementById('submissionsList');
  if (!list) return;

  // If firebase and admin signed in, prefer reading from Firestore
  if (db && auth && auth.currentUser && isAdmin(auth.currentUser)) {
    try {
      const snapshot = await db.collection('applications').get();
      if (snapshot.empty) {
        list.innerHTML = '<p class="muted">No saved submissions yet.</p>';
        return;
      }
      const items = snapshot.docs.slice().reverse().map(doc => ({ id: doc.id, ...doc.data() }));
      list.innerHTML = items.map(it => renderSubmissionHtml(it)).join('');
      return;
    } catch (err) {
      console.warn('Failed to fetch submissions from Firestore', err);
    }
  }

  // fallback: localStorage
  const items = loadSubmissions().slice().reverse(); // newest first
  if (items.length === 0) {
    list.innerHTML = '<p class="muted">No saved submissions yet.</p>';
    return;
  }
  list.innerHTML = items.map(it => renderSubmissionHtml(it)).join('');
}

function renderSubmissionHtml(it){
  const created = it.createdAtIso ? new Date(it.createdAtIso).toLocaleString() : (it.createdAt ? (it.createdAt.toDate ? it.createdAt.toDate().toLocaleString() : '') : '');
  return `<div class="submission-item" data-id="${escapeHtml(it.id)}">
      <strong>${escapeHtml(it.fullName)} — ${escapeHtml(it.position)}</strong>
      <div>${escapeHtml(it.email)} • ${escapeHtml(it.phone)} • ${escapeHtml(it.country)}</div>
      <div style="margin-top:0.25rem; color:var(--muted); font-size:0.9rem">${escapeHtml(created)}</div>
      <div style="margin-top:0.5rem; white-space:pre-wrap">${escapeHtml(it.coverLetter)}</div>
    </div>`;
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
  // If admin with Firestore, export firestore docs; otherwise localStorage
  const items = loadSubmissions();
  if ((!items || !items.length) && !(db && auth && auth.currentUser && isAdmin(auth.currentUser))) {
    alert('No submissions to export.');
    return;
  }

  const headers = ['id','fullName','email','phone','position','experience','country','portfolio','coverLetter','termsAccepted','createdAt'];

  // If Firestore and admin, fetch then export
  if (db && auth && auth.currentUser && isAdmin(auth.currentUser)) {
    db.collection('applications').get().then(snapshot => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      buildAndDownloadCSV(docs, headers);
    }).catch(err => {
      console.warn('Export failed', err);
      alert('Failed to export submissions.');
    });
    return;
  }

  buildAndDownloadCSV(items, headers);
}

function buildAndDownloadCSV(items, headers){
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

// Admin helpers
function adminSignIn(){
  if (!auth) {
    // If firebase not configured, just show a message
    alert('Firebase not configured. See assets/js/firebase-config.js in the repository.');
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    console.warn('Sign-in failed', err);
    alert('Sign-in failed: ' + (err.message || err));
  });
}

function isAdmin(user){
  if (!user || !user.email) return false;
  return ADMINS.includes(user.email.toLowerCase());
}

function updateAdminUI(user){
  const adminSignInBtn = document.getElementById('adminSignInBtn');
  const adminSignOutBtn = document.getElementById('adminSignOutBtn');
  const viewBtn = document.getElementById('viewSubmissionsBtn');

  if (user && isAdmin(user)) {
    if (adminSignInBtn) adminSignInBtn.hidden = true;
    if (adminSignOutBtn) adminSignOutBtn.hidden = false;
    if (viewBtn) viewBtn.disabled = false;
  } else {
    if (adminSignInBtn) adminSignInBtn.hidden = false;
    if (adminSignOutBtn) adminSignOutBtn.hidden = true;
    if (viewBtn) viewBtn.disabled = false; // allow clicking to prompt sign-in
  }
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
