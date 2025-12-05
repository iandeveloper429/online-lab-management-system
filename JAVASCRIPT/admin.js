// ================== admin.js ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, where, onSnapshot,
  getDocs, orderBy, doc, deleteDoc, setDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDe9fXCUSpTFw0VSq_ppzRqOjhkCDIHDXY",
  authDomain: "lab-management-system-9a96e.firebaseapp.com",
  projectId: "lab-management-system-9a96e",
  storageBucket: "lab-management-system-9a96e.appspot.com",
  messagingSenderId: "460300647867",
  appId: "1:460300647867:web:2a626aced15605dd63989e",
  measurementId: "G-H66GY777NK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ====== DOM ELEMENTS ======
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

// Charts
const barEl = document.getElementById('barChart');
const pieEl = document.getElementById('pieChart');
const barCtx = barEl ? barEl.getContext('2d') : null;
const pieCtx = pieEl ? pieEl.getContext('2d') : null;
let barChart = null;
let pieChart = null;

// Teacher Modal
const teacherModal = document.getElementById('teacherModal');
const teacherModalContent = document.getElementById('teacherModalContent');
const teacherModalClose = document.getElementById('teacherModalClose');

// Admin user store
let loggedInUser = null;

// ====== AUTH GUARD ======
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    localStorage.removeItem('loggedInUser');
    return window.location.href = 'login.html';
  }
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('Account details missing.');
    const userData = userDoc.data();
    if (userData.role !== 'admin') {
      alert('Access denied. Please log in as admin.');
      await signOut(auth);
      return window.location.href = 'login.html';
    }

    loggedInUser = { uid: user.uid, ...userData };
    localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    if (userNameEl) userNameEl.textContent = loggedInUser.name || loggedInUser.email || 'Admin';

    // Initialize dashboard
    initSidebarNav();
    initLogout();
    setupRealtimeListeners();
    initUIActions();
    initControls();
    initExtraFeatures(); // sidebar toggle, dark mode
  } catch (err) {
    console.error('Auth guard error:', err);
    alert('Authentication error. Please login again.');
    await signOut(auth);
    window.location.href = 'login.html';
  }
});

// ===== HELPER ======
function exists(el) { return !!el; }

// ===== SIDEBAR NAV ======
function initSidebarNav() {
  const links = document.querySelectorAll('.sidebar a');
  if (!links) return;
  links.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
      a.parentElement.classList.add('active');
      const section = a.getAttribute('data-section');
      Object.values(sectionsMap).forEach(s => { if (s) s.classList.remove('active'); });
      if (sectionsMap[section]) sectionsMap[section].classList.add('active');
    });
  });
}

// ===== LOGOUT ======
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', async () => {
    try {
      localStorage.removeItem('loggedInUser');
      await signOut(auth);
    } catch (e) {}
    window.location.href = 'login.html';
  });
}

// ===== REALTIME LISTENERS ======
function setupRealtimeListeners() {
  // Pending Lessons
  if (exists(pendingTableBody) && exists(cardPending)) {
    const pendingQ = query(collection(db, 'pending_lessons'), orderBy('createdAt','desc'));
    onSnapshot(pendingQ, snapshot => {
      pendingTableBody.innerHTML = '';
      const docs = [];
      snapshot.forEach(d => { const data = d.data(); data._id = d.id; docs.push(data); });
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
      updatePieChart();
    }, err => console.error('pending listener error:', err));
  }

  // Approved Lessons
  if (exists(approvedTableBody) && exists(cardApproved)) {
    const approvedQ = query(collection(db, 'lessons'), orderBy('createdAt','desc'));
    onSnapshot(approvedQ, snapshot => {
      approvedTableBody.innerHTML = '';
      const docs = [];
      snapshot.forEach(d => { const data = d.data(); data._id = d.id; docs.push(data); });
      cardApproved.textContent = docs.length;
      docs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${l.visitDate || ''}</td>
          <td>${l.teacherName}</td>
          <td>${l.className}</td>
          <td>${l.projectName}</td>
          <td>${l.lessonNumber}</td>
          <td>${l.startTime} - ${l.endTime}</td>`;
        approvedTableBody.appendChild(tr);
      });

      // Bar chart: lessons per teacher
      try {
        const counts = {};
        docs.forEach(d => counts[d.teacherName] = (counts[d.teacherName]||0)+1);
        const labels = Object.keys(counts).slice(0,6);
        const values = labels.map(l => counts[l]);
        if (barCtx) {
          if (barChart) barChart.destroy();
          barChart = new Chart(barCtx, {
            type: 'bar',
            data: { labels, datasets:[{ label:'Approved lessons', data: values, backgroundColor:'#ffd700' }]},
            options:{ responsive:true }
          });
        }
      } catch (e) { console.warn('Chart error:', e); }

      updatePieChart();
    }, err => console.error('approved listener error:', err));
  }

  // Teachers
  if (exists(teachersTableBody) && exists(teacherSelect) && exists(teacherFilterSelect) && exists(cardTeachers)) {
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
    }, err => console.error('users listener error:', err));
  }

  // Messages
  if (exists(sentMessagesUl) && exists(cardMessages)) {
    const messagesQ = query(collection(db, 'messages'), orderBy('date','desc'));
    onSnapshot(messagesQ, snapshot => {
      sentMessagesUl.innerHTML = '';
      const msgs = [];
      snapshot.forEach(d => { const m = d.data(); m._id = d.id; msgs.push(m); });
      cardMessages.textContent = msgs.length;

      // Sidebar badge
      const dashLi = document.querySelector('.sidebar li:nth-child(4) a');
      if(dashLi){
        let badge = dashLi.querySelector('.badge');
        if(!badge){
          badge = document.createElement('span');
          badge.className = 'badge';
          badge.style.background = '#f44336';
          badge.style.color = '#fff';
          badge.style.borderRadius = '50%';
          badge.style.padding = '2px 6px';
          badge.style.marginLeft = '6px';
          dashLi.appendChild(badge);
        }
        badge.textContent = msgs.length;
      }

      msgs.slice(0,20).forEach(m => {
        const li = document.createElement('li');
        li.textContent = `[${new Date(m.date).toLocaleString()}] To ${m.to || 'All'} — ${m.content}`;
        sentMessagesUl.appendChild(li);
      });
    }, err => console.error('messages listener error:', err));
  }

  // Load Inventory
  loadInventory();
}

// ===== UI ACTIONS ======
function initUIActions() {
  document.addEventListener('click', async (e) => {
    try {
      // Approve
      if (e.target.matches('.approve')) {
        const id = e.target.dataset.id;
        if (!confirm('Approve this lesson?')) return;
        const pendingRef = doc(db, 'pending_lessons', id);
        const p = await getDoc(pendingRef);
        if (!p.exists()) return alert('Request not found');
        const data = p.data();
        await addDoc(collection(db, 'lessons'), {
          ...data,
          status: 'approved',
          approvedBy: loggedInUser.email,
          approvedAt: new Date(),
          createdAt: data.createdAt || new Date()
        });
        await deleteDoc(pendingRef);
        await sendNotification(data.teacherEmail, `Your lesson for ${data.className} (lesson ${data.lessonNumber}) has been APPROVED.`);
        alert('Lesson approved and teacher notified.');
      }

      // Reject
      if (e.target.matches('.reject')) {
        const id = e.target.dataset.id;
        const reason = prompt('Optional reason for rejection:');
        if (!confirm('Reject this lesson request?')) return;
        const pendingRef = doc(db, 'pending_lessons', id);
        const p = await getDoc(pendingRef);
        if (!p.exists()) return alert('Request not found');
        const data = p.data();
        await sendNotification(data.teacherEmail, `Your lesson request for ${data.className} (lesson ${data.lessonNumber}) was REJECTED. ${reason ? 'Reason: ' + reason : ''}`);
        await deleteDoc(pendingRef);
        alert('Lesson rejected and teacher notified.');
      }

      // View teacher dashboard (read-only)
      if (e.target.matches('button[data-view]')) {
        const teacherId = e.target.dataset.view;
        openTeacherModal(teacherId);
      }

      // View teacher from pending row
      if (e.target.matches('.view-btn')) {
        const email = e.target.dataset.teacher;
        openTeacherModalByEmail(email);
      }
    } catch (err) {
      console.error('UI action error:', err);
      alert('Error: ' + (err.message || err));
    }
  });
}

// ===== TEACHER MODAL ======
if (teacherModalClose) teacherModalClose.addEventListener('click', ()=> { if (teacherModal) teacherModal.style.display='none'; });

async function openTeacherModal(teacherId){
  const userDoc = await getDoc(doc(db, 'users', teacherId));
  if (!userDoc.exists()) return alert('Teacher not found');
  const u = userDoc.data();
  openTeacherModalByEmail(u.email, u.name);
}

async function openTeacherModalByEmail(email, nameFallback){
  if (!teacherModal || !teacherModalContent) return alert('Modal not available in DOM');
  teacherModalContent.innerHTML = '<h3>Loading...</h3>';
  teacherModal.style.display='block';
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

// ===== CONTROLS: send message, export, print, filters ======
function initControls() {
  const messageForm = document.getElementById('messageForm');
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const to = (document.getElementById('teacherSelect') || {}).value;
      const content = (document.getElementById('messageContent') || {}).value?.trim();
      if (!content) return alert('Enter message');
      try {
        await addDoc(collection(db,'messages'), { from: loggedInUser.email, to, content, date: new Date().toISOString() });
        alert('Message sent');
        if (document.getElementById('messageContent')) document.getElementById('messageContent').value = '';
      } catch (err) { console.error(err); alert('Error sending: '+err.message); }
    });
  }

  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
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
      } catch (err) { console.error('Export error:', err); alert('Export failed: ' + err.message); }
    });
  }

  const printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', ()=> window.print());

  const teacherFilter = document.getElementById('filterTeacher');
  if (teacherFilter) teacherFilter.addEventListener('change', async () => {
    const val = teacherFilter.value;
    const tbody = approvedTableBody;
    if (!tbody) return;
    const q = val ? query(collection(db,'lessons'), where('teacherEmail','==',val), orderBy('createdAt','desc')) : query(collection(db,'lessons'), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    snap.forEach(d => { const v = d.data(); const tr = document.createElement('tr'); tr.innerHTML = `<td>${v.visitDate||''}</td><td>${v.teacherName}</td><td>${v.className}</td><td>${v.projectName}</td><td>${v.lessonNumber}</td><td>${v.startTime}-${v.endTime}</td>`; tbody.appendChild(tr); });
  });
}

// ===== EXTRA FEATURES ======
function initExtraFeatures() {
  // sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  if (sidebarToggle && sidebar) sidebarToggle.addEventListener('click', ()=> sidebar.classList.toggle('collapsed'));

  // dark mode
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) darkModeToggle.addEventListener('click', ()=>{
    document.body.classList.toggle('dark-mode');
  });
}

// ===== INVENTORY ======
async function loadInventory() {
  const invTableBody = document.querySelector('#inventoryTable tbody');
  if (!invTableBody) return;
  const snap = await getDocs(collection(db,'inventory'));
  invTableBody.innerHTML = '';
  snap.forEach(d => {
    const item = d.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.name}</td><td>${item.quantity}</td><td>${item.location}</td>`;
    invTableBody.appendChild(tr);
  });
}

// ===== PIE CHART ======
async function updatePieChart() {
  if (!pieCtx) return;
  const snap = await getDocs(collection(db,'lessons'));
  const counts = {};
  snap.forEach(d => { const l = d.data(); counts[l.className] = (counts[l.className]||0)+1; });
  const labels = Object.keys(counts).slice(0,6);
  const values = labels.map(l => counts[l]);
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, { type:'pie', data:{labels, datasets:[{data:values, backgroundColor:['#f44336','#2196f3','#ff9800','#4caf50','#9c27b0','#00bcd4']}]}, options:{responsive:true} });
}

// ===== SEND NOTIFICATION ======
export async function sendNotification(toEmail, content) {
  try {
    await addDoc(collection(db,'messages'), { from: loggedInUser.email, to: toEmail, content, date: new Date().toISOString() });
    console.log('Notification sent to', toEmail);
  } catch(err){ console.error('sendNotification error:', err);}
}
