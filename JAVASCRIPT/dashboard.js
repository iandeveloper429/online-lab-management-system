// ====== Firebase imports ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ====== FIREBASE CONFIG ======
const firebaseConfig = {
  apiKey: "AIzaSyDe9fXCUSpTFw0VSq_ppzRqOjhkCDIHDXY",
  authDomain: "lab-management-system-9a96e.firebaseapp.com",
  projectId: "lab-management-system-9a96e",
  storageBucket: "lab-management-system-9a96e.appspot.com",
  messagingSenderId: "460300647867",
  appId: "1:460300647867:web:2a626aced15605dd63989e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ====== DOM elements ======
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const refreshAll = document.getElementById('refreshAll');

const totalLessonsEl = document.getElementById('totalLessons');
const totalClassKitsEl = document.getElementById('totalClassKits');
const totalTabletsEl = document.getElementById('totalTablets');
const totalCompKitsEl = document.getElementById('totalCompKits');

const recentMessagesDiv = document.getElementById('recentMessages');

const barCtx = document.getElementById('barChart').getContext('2d');
const pieCtx = document.getElementById('pieChart').getContext('2d');

// ====== Admin auth check ======
const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
if (!loggedInUser || loggedInUser.role !== 'admin') {
  alert('Access denied. Please log in as admin.');
  window.location.href = 'login.html';
} else {
  userName.textContent = loggedInUser.name || loggedInUser.email || 'Admin';
}

// ====== Refresh button ======
refreshAll.addEventListener('click', () => alert('Realtime listeners are active — data updates automatically.'));

// ====== Logout ======
logoutBtn.addEventListener('click', async () => {
  localStorage.removeItem('loggedInUser');
  try { await signOut(auth); } catch (e) { console.warn('signout err', e); }
  window.location.href = 'login.html';
});

// ====== Real-time counters ======
function setupCounters() {
  // Lessons
  onSnapshot(collection(db, 'lessons'), snap => {
    totalLessonsEl.textContent = snap.size;
  }, err => console.error('lessons listener err', err));

  // Class Kits
  onSnapshot(collection(db, 'kits', 'classKits', 'items'), snap => {
    totalClassKitsEl.textContent = snap.size;
  }, err => console.error('classKits listener err', err));

  // Tablets
  onSnapshot(collection(db, 'kits', 'tablets', 'items'), snap => {
    totalTabletsEl.textContent = snap.size;
  }, err => console.error('tablets listener err', err));

  // Competition Kits
  onSnapshot(collection(db, 'kits', 'competitionKits', 'items'), snap => {
    totalCompKitsEl.textContent = snap.size;
  }, err => console.error('compKits listener err', err));
}

// ====== Recent messages ======
function setupMessages() {
  const qRecent = collection(db, 'messages');
  onSnapshot(qRecent, snap => {
    recentMessagesDiv.innerHTML = '';
    snap.forEach(docSnap => {
      const m = docSnap.data();
      const el = document.createElement('div');
      el.style.padding = '6px 8px';
      el.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
      el.innerHTML = `<strong>${m.fromName || m.from || 'Admin'}</strong>
                      <div class="small">${m.content}</div>
                      <div class="small">To: ${m.to}</div>`;
      recentMessagesDiv.appendChild(el);
    });
  }, err => console.error('messages listener err', err));
}

// ====== Charts ======
let barChart, pieChart;

async function setupCharts() {
  // Bar chart: Lessons per class
  const lessonsSnap = await getDocs(collection(db, 'lessons'));
  const classCounts = {};
  lessonsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const cls = data.class || 'Unknown';
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  });

  const barLabels = Object.keys(classCounts);
  const barData = Object.values(classCounts);

  if (barChart) barChart.destroy();
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: barLabels, datasets: [{ label: 'Lessons per Class', data: barData, backgroundColor: '#1976d2' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Pie chart: Kits distribution
  const [classKitsSnap, tabletsSnap, compKitsSnap] = await Promise.all([
    getDocs(collection(db, 'kits', 'classKits', 'items')),
    getDocs(collection(db, 'kits', 'tablets', 'items')),
    getDocs(collection(db, 'kits', 'competitionKits', 'items'))
  ]);

  const pieLabels = ['Class Kits', 'Tablets', 'Competition Kits'];
  const pieData = [classKitsSnap.size, tabletsSnap.size, compKitsSnap.size];

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, {
    type: 'pie',
    data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: ['#1976d2','#ff9800','#4caf50'] }] },
    options: { responsive: true }
  });
}

// ====== Initialize dashboard ======
function initDashboard() {
  setupCounters();
  setupMessages();
  setupCharts();
}

// Run
initDashboard();
