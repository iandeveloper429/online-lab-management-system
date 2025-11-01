// JAVASCRIPT/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, where, onSnapshot,
  getDocs, orderBy, doc, deleteDoc, setDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ===== FIREBASE CONFIG (your config) =====
const firebaseConfig = {
  apiKey: "AIzaSyDe9fXCUSpTFw0VSq_ppzRqOjhkCDIHDXY",
  authDomain: "lab-management-system-9a96e.firebaseapp.com",
  projectId: "lab-management-system-9a96e",
  storageBucket: "lab-management-system-9a96e.firebasestorage.app",
  messagingSenderId: "460300647867",
  appId: "1:460300647867:web:2a626aced15605dd63989e",
  measurementId: "G-H66GY777NK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== UI refs =====
const userNameEl = document.getElementById('userName');
const cardTeachers = document.getElementById('cardTeachers');
const cardPending = document.getElementById('cardPending');
const cardApproved = document.getElementById('cardApproved');
const cardMessages = document.getElementById('cardMessages');

const pendingTableBody = document.querySelector('#pendingTable tbody');
const approvedTableBody = document.querySelector('#approvedTable tbody');
const teachersTableBody = document.querySelector('#teachersTable tbody');

const teacherSelect = document.getElementById('teacherSelect');
const teacherFilterSelect = document.getElementById('filterTeacher');
const sentMessagesUl = document.getElementById('sentMessages');

const overviewSection = document.getElementById('overviewSection');
const lessonsSection = document.getElementById('lessonsSection');
const teachersSection = document.getElementById('teachersSection');
const messagesSection = document.getElementById('messagesSection');
const reportsSection = document.getElementById('reportsSection');

const sectionsMap = {
  overview: overviewSection,
  lessons: lessonsSection,
  teachers: teachersSection,
  messages: messagesSection,
  reports: reportsSection
};

const barCtx = document.getElementById('barChart').getContext('2d');
const pieCtx = document.getElementById('pieChart').getContext('2d');

let barChart, pieChart;

// ===== auth guard & display name =====
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
if (!loggedInUser || loggedInUser.role !== 'admin') {
  alert('Access denied. Please log in as admin.');
  window.location.href = 'login.html';
} else {
  userNameEl.textContent = loggedInUser.name;
}

// ===== sidebar nav =====
document.querySelectorAll('.sidebar a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    a.parentElement.classList.add('active');
    const section = a.getAttribute('data-section');
    Object.values(sectionsMap).forEach(s => s.classList.remove('active'));
    if (sectionsMap[section]) sectionsMap[section].classList.add('active');
  });
});

// ===== logout =====
document.getElementById('logoutBtn').addEventListener('click', async () => {
  localStorage.removeItem('loggedInUser');
  try { await signOut(auth); } catch(e){ /* ignore if not signed in via firebase */ }
  window.location.href = 'login.html';
});

// ===== realtime listeners =====
// Pending lesson requests
const pendingQ = query(collection(db, 'pending_lessons'), orderBy('createdAt','desc'));
onSnapshot(pendingQ, snapshot => {
  pendingTableBody.innerHTML = '';
  const docs = [];
  snapshot.forEach(d => {
    const data = d.data(); data._id = d.id; docs.push(data);
  });
  cardPending.textContent = docs.length;
  docs.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(l.createdAt?.toDate?.() ?? l.createdAt).toLocaleString()}</td>
      <td>${l.teacherName}</td>
      <td>${l.className}</td>
      <td>${l.projectName}</td>
      <td>${l.lessonNumber}</td>
      <td>${l.startTime} - ${l.endTime}</td>
      <td>
        <button class="small-btn approve" data-id="${l._id}">Approve</button>
        <button class="small-btn reject" data-id="${l._id}">Reject</button>
        <button class="small-btn view-btn" data-teacher="${l.teacherEmail}">View</button>
      </td>`;
    pendingTableBody.appendChild(tr);
  });
});

// Approved lessons
const approvedQ = query(collection(db, 'lessons'), orderBy('createdAt','desc'));
onSnapshot(approvedQ, snapshot => {
  approvedTableBody.innerHTML = '';
  const docs = [];
  snapshot.forEach(d => {
    const data = d.data(); data._id = d.id; docs.push(data);
  });
  cardApproved.textContent = docs.length;
  docs.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.visitDate || ''}</td>
      <td>${l.teacherName}</td>
      <td>${l.className}</td>
      <td>${l.projectName}</td>
      <td>${l.lessonNumber}</td>
      <td>${l.startTime} - ${l.endTime}</td>
    `;
    approvedTableBody.appendChild(tr);
  });

  // refresh charts with simple breakdown: lessons per teacher
  const counts = {};
  docs.forEach(d => counts[d.teacherName] = (counts[d.teacherName]||0)+1);
  const labels = Object.keys(counts).slice(0,6);
  const values = labels.map(l => counts[l]);
  if (barChart) barChart.destroy();
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels, datasets:[{ label:'Approved lessons', data: values }]},
    options:{ responsive:true }
  });
});

// Load teachers list
const usersQ = collection(db, 'users');
onSnapshot(usersQ, snapshot => {
  teachersTableBody.innerHTML = '';
  teacherSelect.innerHTML = '<option value="all">All Teachers</option>';
  teacherFilterSelect.innerHTML = '<option value="">All</option>';
  let teacherCount = 0;
  snapshot.forEach(d => {
    const u = d.data();
    if (u.role === 'teacher') {
      teacherCount++;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || '-'}</td>
        <td>${u.assignedClass || '-'}</td>
        <td>
          <button class="small-btn" data-view="${d.id}" data-email="${u.email}">View Dashboard</button>
        </td>`;
      teachersTableBody.appendChild(tr);
      teacherSelect.innerHTML += `<option value="${u.email}">${u.name}</option>`;
      teacherFilterSelect.innerHTML += `<option value="${u.email}">${u.name}</option>`;
    }
  });
  cardTeachers.textContent = teacherCount;
  cardMessages.textContent = ''; // will be set when messages load
});

// Messages listener (all)
const messagesQ = query(collection(db, 'messages'), orderBy('date','desc'));
onSnapshot(messagesQ, snapshot => {
  sentMessagesUl.innerHTML = '';
  const msgs = [];
  snapshot.forEach(d => {
    const m = d.data(); m._id = d.id; msgs.push(m);
  });
  cardMessages.textContent = msgs.length;
  msgs.slice(0,20).forEach(m => {
    const li = document.createElement('li');
    li.textContent = `[${new Date(m.date).toLocaleString()}] To ${m.to || 'All'} — ${m.content}`;
    sentMessagesUl.appendChild(li);
  });
});

// ===== UI actions (approve / reject / view teacher) =====
document.addEventListener('click', async (e) => {
  // Approve
  if (e.target.matches('.approve')) {
    const id = e.target.dataset.id;
    if (!confirm('Approve this lesson?')) return;
    try {
      const pendingRef = doc(db, 'pending_lessons', id);
      const p = await getDoc(pendingRef);
      if (!p.exists()) return alert('Request not found');

      const data = p.data();
      // create approved lesson in 'lessons'
      await addDoc(collection(db, 'lessons'), {
        ...data,
        status: 'approved',
        approvedBy: loggedInUser.email,
        approvedAt: new Date(),
        createdAt: data.createdAt || new Date()
      });
      // delete pending
      await deleteDoc(pendingRef);
      // notify teacher (message)
      await addDoc(collection(db,'messages'), {
        from: loggedInUser.email,
        to: data.teacherEmail,
        content: `Your lesson for ${data.className} (lesson ${data.lessonNumber}) has been APPROVED.`,
        date: new Date().toISOString()
      });
      alert('Lesson approved and teacher notified.');
    } catch (err) {
      console.error(err); alert('Error approving: '+err.message);
    }
  }

  // Reject
  if (e.target.matches('.reject')) {
    const id = e.target.dataset.id;
    const reason = prompt('Optional reason for rejection:');
    if (!confirm('Reject this lesson request?')) return;
    try {
      const pendingRef = doc(db, 'pending_lessons', id);
      const p = await getDoc(pendingRef);
      if (!p.exists()) return alert('Request not found');
      const data = p.data();
      // add a message to teacher
      await addDoc(collection(db,'messages'), {
        from: loggedInUser.email,
        to: data.teacherEmail,
        content: `Your lesson request for ${data.className} (lesson ${data.lessonNumber}) was REJECTED. ${reason ? 'Reason: ' + reason : ''}`,
        date: new Date().toISOString()
      });
      // delete pending
      await deleteDoc(pendingRef);
      alert('Lesson rejected and teacher notified.');
    } catch (err) {
      console.error(err); alert('Error rejecting: '+err.message);
    }
  }

  // View teacher dashboard (read-only)
  if (e.target.matches('button[data-view]')) {
    const teacherId = e.target.dataset.view;
    openTeacherModal(teacherId);
  }

  // View teacher from pending row
  if (e.target.matches('.view-btn')) {
    const email = e.target.dataset.teacher;
    // open modal showing teacher submissions
    openTeacherModalByEmail(email);
  }
});

// ===== teacher modal functions =====
const teacherModal = document.getElementById('teacherModal');
const teacherModalContent = document.getElementById('teacherModalContent');
document.getElementById('teacherModalClose').addEventListener('click', ()=> teacherModal.style.display='none');

async function openTeacherModal(teacherId){
  // fetch teacher info & their submissions (both pending_lessons + lessons)
  const userDoc = await getDoc(doc(db, 'users', teacherId));
  if (!userDoc.exists()) return alert('Teacher not found');
  const u = userDoc.data();
  openTeacherModalByEmail(u.email, u.name);
}

async function openTeacherModalByEmail(email, nameFallback){
  teacherModalContent.innerHTML = '<h3>Loading...</h3>'; teacherModal.style.display='block';
  // fetch teacher info
  const students = []; // placeholder
  // fetch pending
  const pendingSnap = await getDocs(query(collection(db,'pending_lessons'), where('teacherEmail','==',email), orderBy('createdAt','desc')));
  const approvedSnap = await getDocs(query(collection(db,'lessons'), where('teacherEmail','==',email), orderBy('createdAt','desc')));
  let html = `<h2>Teacher: ${nameFallback || email}</h2>`;
  html += '<h3>Pending Requests</h3>';
  if (pendingSnap.empty) html += '<p>No pending requests</p>'; else {
    html += '<table><thead><tr><th>Date</th><th>Class</th><th>Lesson#</th><th>Time</th></tr></thead><tbody>';
    pendingSnap.forEach(d => { const L = d.data(); html += `<tr><td>${new Date(L.createdAt?.toDate?.() ?? L.createdAt).toLocaleString()}</td><td>${L.className}</td><td>${L.lessonNumber}</td><td>${L.startTime}-${L.endTime}</td></tr>`});
    html += '</tbody></table>';
  }
  html += '<h3>Approved</h3>';
  if (approvedSnap.empty) html += '<p>No approved lessons</p>'; else {
    html += '<table><thead><tr><th>Date</th><th>Class</th><th>Lesson#</th><th>Time</th></tr></thead><tbody>';
    approvedSnap.forEach(d => { const L = d.data(); html += `<tr><td>${L.visitDate || ''}</td><td>${L.className}</td><td>${L.lessonNumber}</td><td>${L.startTime}-${L.endTime}</td></tr>`});
    html += '</tbody></table>';
  }
  teacherModalContent.innerHTML = html;
}

// ===== send message form =====
document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const to = document.getElementById('teacherSelect').value;
  const content = document.getElementById('messageContent').value.trim();
  if (!content) return alert('Enter message');
  try {
    await addDoc(collection(db,'messages'), { from: loggedInUser.email, to, content, date: new Date().toISOString() });
    alert('Message sent');
    document.getElementById('messageContent').value = '';
  } catch (err) { console.error(err); alert('Error sending: '+err.message); }
});

// ===== export CSV & print =====
document.getElementById('exportCsvBtn').addEventListener('click', async () => {
  const snap = await getDocs(collection(db,'lessons'));
  const rows = [['Date','Teacher','Class','Project','Lesson#','StartTime','EndTime']];
  snap.forEach(d => {
    const v = d.data();
    rows.push([v.visitDate||'', v.teacherName||'', v.className||'', v.projectName||'', v.lessonNumber||'', v.startTime||'', v.endTime||'']);
  });
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `lessons_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
});

// print current visible section
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

// refresh button reloads listeners (we already have realtime listeners) but a quick load
document.getElementById('refreshBtn').addEventListener('click', () => {
  // no-op since onSnapshot keeps data live. But we can show an alert
  alert('Dashboard refreshed (real-time listeners active).');
});

// ===== filters (reports) =====
document.getElementById('applyFilter').addEventListener('click', async () => {
  const teacher = document.getElementById('filterTeacher').value;
  const status = document.getElementById('filterStatus').value;
  // naive filter: simply re-query lessons/pending as needed and update tables
  // For brevity we'll fetch approved lessons and filter client-side
  const approvedSnap = await getDocs(collection(db,'lessons'));
  approvedTableBody.innerHTML = '';
  approvedSnap.forEach(d => {
    const l = d.data();
    if (teacher && l.teacherEmail !== teacher) return;
    if (status && status !== 'approved') return; // approved table only has approved
    approvedTableBody.innerHTML += `<tr><td>${l.visitDate||''}</td><td>${l.teacherName}</td><td>${l.className}</td><td>${l.projectName}</td><td>${l.lessonNumber}</td><td>${l.startTime} - ${l.endTime}</td></tr>`;
  });
});

// Clean-up: when page unload
window.addEventListener('beforeunload', ()=>{ /* nothing to do; onSnapshot handles */});
