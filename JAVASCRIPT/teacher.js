// JAVASCRIPT/teacher.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// Lesson time mapping (10 lessons starting 7:00, 45min each, 45min lunch at 12:15-1:00)
const lessonTimes = {
  1: ['07:00','07:45'],
  2: ['07:45','08:30'],
  3: ['08:30','09:15'],
  4: ['09:15','10:00'],
  5: ['10:00','10:45'],
  6: ['10:45','11:30'],
  7: ['11:30','12:15'],
  // lunch 12:15-13:00
  8: ['13:00','13:45'],
  9: ['13:45','14:30'],
  10: ['14:30','15:15'] // ends before 3:25 for dismissal
};

document.addEventListener('DOMContentLoaded', async () => {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || loggedInUser.role !== 'teacher') {
    alert('Access denied. Please log in as a teacher.');
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('userName').textContent = loggedInUser.name;

  // Replace teacherInputForm fields: ensure form exists in your HTML as per earlier
  const form = document.getElementById('teacherInputForm');

  // Add dynamic fields if not present
  if (!form.querySelector('input[name="lesson_number"]')) {
    const lessonInput = document.createElement('input');
    lessonInput.name = 'lesson_number';
    lessonInput.type = 'number';
    lessonInput.placeholder = 'Lesson Number (1-10)';
    lessonInput.required = true;
    form.insertBefore(lessonInput, form.querySelector('button[type="submit"]'));
  }
  if (!form.querySelector('input[name="start_time"]')) {
    const startInput = document.createElement('input'); startInput.name='start_time'; startInput.type='time'; startInput.required=true;
    form.insertBefore(startInput, form.querySelector('button[type="submit"]'));
  }
  if (!form.querySelector('input[name="end_time"]')) {
    const endInput = document.createElement('input'); endInput.name='end_time'; endInput.type='time'; endInput.required=true;
    form.insertBefore(endInput, form.querySelector('button[type="submit"]'));
  }
  // auto fill on lesson number change
  form.querySelector('input[name="lesson_number"]').addEventListener('change', (e)=>{
    const n = Number(e.target.value);
    if (lessonTimes[n]) {
      form.querySelector('input[name="start_time"]').value = lessonTimes[n][0];
      form.querySelector('input[name="end_time"]').value = lessonTimes[n][1];
    } else {
      form.querySelector('input[name="start_time"]').value = '';
      form.querySelector('input[name="end_time"]').value = '';
    }
  });

  // Submit -> add to pending_lessons
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const today = new Date().toISOString().split('T')[0];

    try {
      await addDoc(collection(db,'pending_lessons'), {
        teacherName: loggedInUser.name,
        teacherEmail: loggedInUser.email,
        className: data.class_name,
        projectName: data.project_name,
        lessonNumber: Number(data.lesson_number),
        startTime: data.start_time,
        endTime: data.end_time,
        visitDate: today,
        status: 'pending',
        createdAt: new Date()
      });
      alert('✅ Submitted for approval.');
      form.reset();
      loadMySubmissions();
    } catch (err) {
      console.error(err); alert('Error submitting: '+err.message);
    }
  });

  // show teacher's submitted lessons (pending + approved)
  async function loadMySubmissions() {
    const submittedTable = document.querySelector('#submittedLessons tbody') || (function(){ 
      const tb = document.createElement('tbody'); document.querySelector('#submittedLessons')?.appendChild(tb); return tb;
    })();
    // clear
    const pendingSnap = await getDocs(query(collection(db,'pending_lessons'), where('teacherEmail','==', loggedInUser.email), orderBy('createdAt','desc')));
    const approvedSnap = await getDocs(query(collection(db,'lessons'), where('teacherEmail','==', loggedInUser.email), orderBy('createdAt','desc')));
    const rows = [];
    pendingSnap.forEach(d => { const L = d.data(); rows.push({ ...L, status: 'pending' }); });
    approvedSnap.forEach(d => { const L = d.data(); rows.push({ ...L, status: 'approved' }); });
    // render
    const tbody = document.querySelector('#submittedLessons tbody');
    if (tbody) tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.visitDate || ''}</td><td>${r.className}</td><td>${r.projectName}</td><td>${r.lessonNumber}</td><td style="color:${r.status==='approved'?'green':r.status==='pending'?'orange':'red'}">${r.status}</td>`;
      if (tbody) tbody.appendChild(tr);
    });
  }

  // initial load and subscribe to real-time changes (messages + pending/approved updates)
  loadMySubmissions();

  // Live update for messages to this teacher
  const messagesQ = query(collection(db,'messages'), where('to','in',[loggedInUser.email,'all']), orderBy('date','desc'));
  onSnapshot(messagesQ, snap => {
    const listBoxId = 'teacherMessagesList';
    let listEl = document.getElementById(listBoxId);
    if (!listEl) {
      const heading = document.createElement('h3');
      heading.textContent = 'Messages from Admin';
      document.querySelector('#dashboardSection').appendChild(heading);
      listEl = document.createElement('ul'); listEl.id = listBoxId;
      document.querySelector('#dashboardSection').appendChild(listEl);
    }
    listEl.innerHTML = '';
    snap.forEach(d => {
      const m = d.data();
      // show only messages to this teacher or "all"
      if (m.to === 'all' || m.to === loggedInUser.email) {
        const li = document.createElement('li');
        li.textContent = `[${new Date(m.date).toLocaleString()}] ${m.from}: ${m.content}`;
        listEl.appendChild(li);
      }
    });
  });

  // logout
  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    try { await signOut(auth); } catch(e) {}
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  });
});
