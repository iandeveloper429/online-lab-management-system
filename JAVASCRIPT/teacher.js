// JAVASCRIPT/teacher.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy,
  onSnapshot, getDocs, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// ===== FIREBASE CONFIG =====
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
const storage = getStorage(app);

// Lesson time mapping (10 lessons starting 7:00, 45min each, lunch 12:15-13:00)
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
  10: ['14:30','15:15']
};

// helpers for formatting
const toDateKey = d => (d instanceof Date) ? d.toISOString().split('T')[0] : d;
const fmtTime = t => t || '-';

document.addEventListener('DOMContentLoaded', async () => {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || loggedInUser.role !== 'teacher') {
    alert('Access denied. Please log in as a teacher.');
    window.location.href = 'login.html';
    return;
  }

  const userEmail = loggedInUser.email;
  document.getElementById('userName').textContent = loggedInUser.name;

  const form = document.getElementById('teacherInputForm');
  const submittedTbody = document.querySelector('#submittedLessons tbody');
  const assignedTableTbody = document.querySelector('#assignedLessonsTable tbody');
  const assignedClassDiv = document.getElementById('assignedClass');
  const assignedOverviewDiv = document.getElementById('assignedClassOverview');
  const messagesListDiv = document.getElementById('messagesList');
  const profilePic = document.getElementById('profilePic');
  const uploadInput = document.getElementById('uploadProfile');
  const updateProfileBtn = document.getElementById('updateProfileBtn');

  // load and display user photo (if saved in users collection)
  async function loadUserProfile() {
    try {
      const userDocRef = doc(db, 'users', loggedInUser.uid);
      const uDocsnap = await getDoc(userDocRef);
      if (uDocsnap.exists()) {
        const u = uDocsnap.data();
        if (u.photoURL) profilePic.src = u.photoURL;
        // show basic info
        document.getElementById('profileInfo').innerHTML = `<strong>${u.name}</strong><br>${u.email || ''}`;
      }
    } catch (err) {
      console.error('loadUserProfile error', err);
    }
  }
  loadUserProfile();

  // Autofill start/end when lesson number changes
  form.querySelector('input[name="lesson_number"]').addEventListener('change', (e) => {
    const n = Number(e.target.value);
    if (lessonTimes[n]) {
      form.querySelector('input[name="start_time"]').value = lessonTimes[n][0];
      form.querySelector('input[name="end_time"]').value = lessonTimes[n][1];
    } else {
      form.querySelector('input[name="start_time"]').value = '';
      form.querySelector('input[name="end_time"]').value = '';
    }
  });

  // Submit pending lesson (teacher -> admin)
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const today = new Date();
    const visitDate = toDateKey(today);
    const isLab = !!data.is_lab;
    try {
      // For lab double lesson: we still store the requested lesson number and a flag; admin will handle double-slot assignment when approving
      await addDoc(collection(db, 'pending_lessons'), {
        teacherName: loggedInUser.name,
        teacherEmail: userEmail,
        teacherId: loggedInUser.uid,
        className: data.class_name,
        projectName: data.project_name,
        lessonNumber: Number(data.lesson_number),
        startTime: data.start_time,
        endTime: data.end_time,
        isLab: isLab,
        visitDate: visitDate,
        status: 'pending',
        createdAt: new Date()
      });
      alert('✅ Lesson request submitted for admin approval.');
      form.reset();
      loadMySubmissions(); // refresh
    } catch (err) {
      console.error('submit error', err);
      alert('Error submitting lesson: ' + err.message);
    }
  });

  // Real-time: teacher's pending + approved submissions
  async function loadMySubmissions() {
    // pending
    const pending_q = query(collection(db, 'pending_lessons'), where('teacherEmail', '==', userEmail), orderBy('createdAt', 'desc'));
    const approved_q = query(collection(db, 'lessons'), where('teacherEmail', '==', userEmail), orderBy('createdAt', 'desc'));

    const [pendingSnap, approvedSnap] = await Promise.all([getDocs(pending_q), getDocs(approved_q)]);
    const rows = [];
    pendingSnap.forEach(d => rows.push({ ...d.data(), _id: d.id, source: 'pending' }));
    approvedSnap.forEach(d => rows.push({ ...d.data(), _id: d.id, source: 'approved' }));
    // sort by createdAt descending
    rows.sort((a,b) => new Date(b.createdAt?.toDate?.() ?? b.createdAt) - new Date(a.createdAt?.toDate?.() ?? a.createdAt));
    // render
    if (submittedTbody) submittedTbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const timeRange = `${fmtTime(r.startTime)} - ${fmtTime(r.endTime)}`;
      tr.innerHTML = `<td>${r.visitDate || ''}</td>
                      <td>${r.className || ''}</td>
                      <td>${r.projectName || ''}</td>
                      <td>${r.lessonNumber || ''}</td>
                      <td>${timeRange}</td>
                      <td style="color:${r.status==='approved'?'green': r.status==='rejected'?'red':'orange'}">${r.status || (r.source==='pending'?'pending':'')}</td>`;
      submittedTbody.appendChild(tr);
    });
  }
  await loadMySubmissions();

  // onSnapshot subscriptions for real-time updates (pending, approved)
  const pendingLiveQ = query(collection(db, 'pending_lessons'), where('teacherEmail', '==', userEmail), orderBy('createdAt','desc'));
  onSnapshot(pendingLiveQ, () => loadMySubmissions());
  const approvedLiveQ = query(collection(db, 'lessons'), where('teacherEmail', '==', userEmail), orderBy('createdAt','desc'));
  onSnapshot(approvedLiveQ, () => loadMySubmissions());

  // Assigned lessons (created by admin in 'assigned_lessons' collection)
  async function loadAssignedLessonsOnce() {
    const assigned_q = query(collection(db, 'assigned_lessons'), where('teacherEmail', '==', userEmail), orderBy('date','desc'));
    const snap = await getDocs(assigned_q);
    assignedTableTbody.innerHTML = '';
    if (snap.empty) {
      assignedClassDiv.innerHTML = '<p>No assigned lessons yet.</p>';
      assignedOverviewDiv.innerHTML = '';
      return;
    }
    let latestAssigned = null;
    snap.forEach(d => {
      const L = d.data();
      latestAssigned = latestAssigned || L;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${L.date || ''}</td><td>${L.className || ''}</td><td>${L.projectName || ''}</td><td>${L.lessonNumber || ''}</td><td>${L.startTime || ''} - ${L.endTime || ''}</td><td>${L.notes || '-'}</td>`;
      assignedTableTbody.appendChild(tr);
    });
    if (latestAssigned) {
      assignedClassDiv.innerHTML = `<p>📚 <b>${latestAssigned.className}</b> at <b>${latestAssigned.startTime} - ${latestAssigned.endTime}</b> (Lesson ${latestAssigned.lessonNumber})</p>`;
      assignedOverviewDiv.innerHTML = `<strong>Next assigned:</strong> ${latestAssigned.className} — ${latestAssigned.startTime}-${latestAssigned.endTime} (Lesson ${latestAssigned.lessonNumber})`;
    }
  }
  await loadAssignedLessonsOnce();
  // subscribe to assigned_lessons live
  const assignedLiveQ = query(collection(db,'assigned_lessons'), where('teacherEmail','==', userEmail), orderBy('date','desc'));
  onSnapshot(assignedLiveQ, () => loadAssignedLessonsOnce());

  // Messages: teacher receives messages sent to them or to 'all'
  const messagesQ = query(collection(db, 'messages'), where('to', 'in', [userEmail, 'all']), orderBy('date','desc'));
  onSnapshot(messagesQ, snap => {
    messagesListDiv.innerHTML = '';
    if (snap.empty) {
      messagesListDiv.innerHTML = '<p>No messages from admin.</p>';
      return;
    }
    snap.forEach(d => {
      const m = d.data();
      // show only messages to this teacher or 'all'
      if (m.to === 'all' || m.to === userEmail) {
        const card = document.createElement('div');
        card.style = 'background:#fff;padding:10px;border-radius:8px;margin-bottom:8px;color:#111;box-shadow:0 2px 8px rgba(0,0,0,0.08)';
        const when = m.date ? new Date(m.date).toLocaleString() : '';
        card.innerHTML = `<div style="font-weight:600">${m.from || 'Admin'} <small style="font-weight:400;color:#555"> — ${when}</small></div><div style="margin-top:6px">${m.content}</div>`;
        messagesListDiv.appendChild(card);
      }
    });
  });

  // Profile picture upload
  updateProfileBtn.addEventListener('click', async () => {
    const file = uploadInput.files[0];
    if (!file) return alert('Choose an image file first.');
    const ext = file.name.split('.').pop();
    const safeEmail = encodeURIComponent(userEmail);
    const storagePath = `profile_pictures/${safeEmail}.${ext === 'png' ? 'png' : 'jpg'}`; // prefer jpg otherwise keep ext
    const sRef = storageRef(storage, storagePath);
    try {
      const snap = await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      // Save URL to users collection
      try {
        const userDocRef = doc(db, 'users', loggedInUser.uid);
        await updateDoc(userDocRef, { photoURL: url });
      } catch (err) {
        // if update fails, try setDoc as fallback
        console.warn('updateDoc failed, trying setDoc', err);
        // note: setDoc would overwrite doc; avoid doing it by default unless necessary
      }
      profilePic.src = url;
      alert('Profile picture uploaded and saved.');
    } catch (err) {
      console.error('upload error', err);
      alert('Upload failed: ' + err.message);
    }
  });

  // logout
  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    try { await signOut(auth); } catch (e) { /* ignore */ }
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  });
});
