/* Simple client-side application handling.
   - Stores submissions in localStorage (key: "kj_applications")
   - Exposes CSV export and clear functions
   - Optional: set SERVER_ENDPOINT to enable server POST on submit
*/

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjqeY8k2x6666w9m4WzpWZ2yJ504XRp4I",
  authDomain: "kjscale.firebaseapp.com",
  projectId: "kjscale",
  storageBucket: "kjscale.firebasestorage.app",
  messagingSenderId: "203858987896",
  appId: "1:203858987896:web:a46cd063cd8385b9f1968d",
  measurementId: "G-LV9C4MPTM8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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

  // Save to Cloud Firestore
  addDoc(collection(db, "submissions"), data)
    .then(() => {
      formMessage.textContent = 'Application submitted successfully!';
      formMessage.style.color = '#0f766e';
      form.reset();
    })
    .catch((err) => {
      console.error('Failed to save submission to Firestore:', err);
      formMessage.textContent = 'Could not submit application. Please try again.';
      formMessage.style.color = '#b91c1c';
    });


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
