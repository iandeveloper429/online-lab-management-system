// JAVASCRIPT/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// -------------------- Auth --------------------
onAuthStateChanged(auth, user => {
  if(user){
    document.getElementById('userName').textContent = user.displayName || user.email;
  } else {
    window.location.href = "login.html";
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  signOut(auth).then(()=>window.location.href="login.html");
});

// -------------------- Sidebar Navigation --------------------
const sectionsMap = {
  overview: document.getElementById('overviewSection'),
  lessons: document.getElementById('lessonsSection'),
  teachers: document.getElementById('teachersSection'),
  messages: document.getElementById('messagesSection'),
  reports: document.getElementById('reportsSection'),
  inventory: document.getElementById('inventorySection')
};

document.querySelectorAll('.sidebar a').forEach(link=>{
  link.addEventListener('click', e=>{
    e.preventDefault();
    const section = link.dataset.section;
    Object.values(sectionsMap).forEach(sec=>sec.classList.remove('active'));
    sectionsMap[section].classList.add('active');

    document.querySelectorAll('.sidebar li').forEach(li=>li.classList.remove('active'));
    link.parentElement.classList.add('active');
  });
});

// -------------------- Overview Cards --------------------
async function loadOverview(){
  // Teachers
  const teachersSnap = await getDocs(collection(db,'users'));
  document.getElementById('cardTeachers').textContent = teachersSnap.size;

  // Lessons
  const lessonsSnap = await getDocs(collection(db,'lessons'));
  let pending = 0, approved = 0;
  lessonsSnap.forEach(d=>{
    const l = d.data();
    if(l.status === 'pending') pending++;
    else if(l.status === 'approved') approved++;
  });
  document.getElementById('cardPending').textContent = pending;
  document.getElementById('cardApproved').textContent = approved;

  // Messages
  const messagesSnap = await getDocs(collection(db,'messages'));
  document.getElementById('cardMessages').textContent = messagesSnap.size;

  // Charts
  const ctxBar = document.getElementById('barChart').getContext('2d');
  new Chart(ctxBar,{
    type:'bar',
    data:{
      labels:['Pending Lessons','Approved Lessons','Messages'],
      datasets:[{label:'Count', data:[pending, approved, messagesSnap.size], backgroundColor:['#f39c12','#27ae60','#3498db'] }]
    }
  });

  const ctxPie = document.getElementById('pieChart').getContext('2d');
  new Chart(ctxPie,{
    type:'pie',
    data:{
      labels:['Pending','Approved'],
      datasets:[{data:[pending, approved], backgroundColor:['#e74c3c','#2ecc71'] }]
    }
  });
}

// -------------------- Lessons Tables --------------------
async function loadLessons(){
  const pendingTbody = document.querySelector('#pendingTable tbody');
  const approvedTbody = document.querySelector('#approvedTable tbody');
  pendingTbody.innerHTML = '';
  approvedTbody.innerHTML = '';

  const snap = await getDocs(collection(db,'lessons'));
  snap.forEach(d=>{
    const l = d.data();
    const tr = document.createElement('tr');
    if(l.status==='pending'){
      tr.innerHTML = `
        <td>${l.submittedDate||''}</td>
        <td>${l.teacher}</td>
        <td>${l.className}</td>
        <td>${l.project}</td>
        <td>${l.lessonNumber}</td>
        <td>${l.time}</td>
        <td>
          <button class="approve" data-id="${d.id}">Approve</button>
          <button class="reject" data-id="${d.id}">Reject</button>
        </td>
      `;
      pendingTbody.appendChild(tr);
    } else if(l.status==='approved'){
      tr.innerHTML = `
        <td>${l.submittedDate||''}</td>
        <td>${l.teacher}</td>
        <td>${l.className}</td>
        <td>${l.project}</td>
        <td>${l.lessonNumber}</td>
        <td>${l.time}</td>
      `;
      approvedTbody.appendChild(tr);
    }
  });

  // Pending actions
  pendingTbody.querySelectorAll('.approve').forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      await updateDoc(doc(db,'lessons',btn.dataset.id), { status:'approved' });
      loadLessons(); loadOverview();
    });
  });
  pendingTbody.querySelectorAll('.reject').forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      await deleteDoc(doc(db,'lessons',btn.dataset.id));
      loadLessons(); loadOverview();
    });
  });
}

// -------------------- Teachers Table --------------------
async function loadTeachers(){
  const tbody = document.querySelector('#teachersTable tbody');
  tbody.innerHTML='';
  const snap = await getDocs(collection(db,'users'));
  snap.forEach(d=>{
    const u = d.data();
    if(u.role==='teacher'){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone||''}</td>
        <td>${u.assignedClass||''}</td>
        <td>
          <button class="edit-btn" data-id="${d.id}">Edit</button>
          <button class="delete-btn" data-id="${d.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  });

  // Edit/Delete
  tbody.addEventListener('click', async e=>{
    const id = e.target.dataset.id;
    if(!id) return;
    const docRef = doc(db,'users',id);

    if(e.target.matches('.edit-btn')){
      const docSnap = await getDocs(docRef);
      const name = prompt('Name:');
      const phone = prompt('Phone:');
      await updateDoc(docRef,{name, phone});
      loadTeachers();
    }
    if(e.target.matches('.delete-btn')){
      if(confirm('Delete teacher?')){
        await deleteDoc(docRef);
        loadTeachers();
      }
    }
  });
}

// -------------------- Messages --------------------
const messageForm = document.getElementById('messageForm');
const sentMessagesUl = document.getElementById('sentMessages');
messageForm?.addEventListener('submit', async e=>{
  e.preventDefault();
  const to = document.getElementById('teacherSelect').value;
  const content = document.getElementById('messageContent').value.trim();
  if(!content) return alert('Type a message');

  await addDoc(collection(db,'messages'), { from: auth.currentUser.email, to, content, date: new Date().toISOString() });

  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleString()}] To ${to} — ${content}`;
  sentMessagesUl.prepend(li);

  messageForm.reset();
});

// -------------------- Inventory --------------------
async function loadInventory(tableId, collectionName){
  const tbody = document.querySelector(`#${tableId} tbody`);
  if(!tbody) return;
  tbody.innerHTML='';
  const snap = await getDocs(collection(db,collectionName));
  snap.forEach(d=>{
    const item = d.data();
    const tr = document.createElement('tr');
    let actions='';
    if(tableId==='kitsTable' || tableId==='tabletKitsTable' || tableId==='classKitsTable'){
      actions = `<button class="edit-btn" data-id="${d.id}">Edit</button> <button class="delete-btn" data-id="${d.id}">Delete</button>`;
    }
    tr.innerHTML = Object.values(item).map(v=>`<td>${v}</td>`).join('') + `<td>${actions}</td>`;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', async e=>{
    const id = e.target.dataset.id;
    if(!id) return;
    const docRef = doc(db,collectionName,id);

    if(e.target.matches('.edit-btn')){
      const docSnap = await getDocs(docRef);
      const data = docSnap.data();
      const name = prompt('Name:', data.name);
      const total = prompt('Total Quantity:', data.totalQuantity);
      const avail = prompt('Available Quantity:', data.availableQuantity);
      await updateDoc(docRef,{name,totalQuantity:total,availableQuantity:avail});
      loadInventory(tableId,collectionName);
    }
    if(e.target.matches('.delete-btn')){
      if(confirm('Delete item?')){
        await deleteDoc(docRef);
        loadInventory(tableId,collectionName);
      }
    }
  });
}

// -------------------- Refresh --------------------
document.getElementById('refreshBtn').addEventListener('click', ()=>{
  loadOverview(); loadLessons(); loadTeachers();
  loadInventory('kitsTable','kitsInventory');
  loadInventory('tabletKitsTable','tabletKitsInventory');
  loadInventory('classKitsTable','classKitsInventory');
  loadInventory('affectedTable','affectedKits');
  loadInventory('missingTable','missingComponents');
});

// Initial Load
loadOverview();
loadLessons();
loadTeachers();
loadInventory('kitsTable','kitsInventory');
loadInventory('tabletKitsTable','tabletKitsInventory');
loadInventory('classKitsTable','classKitsInventory');
loadInventory('affectedTable','affectedKits');
loadInventory('missingTable','missingComponents');


// -------------------- Populate Teacher Dropdowns --------------------
async function populateTeacherDropdowns() {
  const teacherSelect = document.getElementById('teacherSelect');
  const filterTeacher = document.getElementById('filterTeacher');

  if (!teacherSelect || !filterTeacher) return;

  teacherSelect.innerHTML = `<option value="all">All Teachers</option>`;
  filterTeacher.innerHTML = `<option value="">All</option>`;

  const snap = await getDocs(collection(db,'users'));
  snap.forEach(d=>{
    const u = d.data();
    if(u.role==='teacher'){
      const option = document.createElement('option');
      option.value = u.email;
      option.textContent = u.name;
      teacherSelect.appendChild(option);

      const fOption = document.createElement('option');
      fOption.value = u.name;
      fOption.textContent = u.name;
      filterTeacher.appendChild(fOption);
    }
  });
}

// -------------------- Assign Class to Teacher --------------------
async function assignClassToTeacher(teacherEmail, className) {
  if (!teacherEmail || !className) return alert("Teacher and Class required.");
  const snap = await getDocs(query(collection(db,'users'), where('email','==',teacherEmail)));
  if (!snap.empty) {
    const teacherDoc = snap.docs[0];
    await updateDoc(doc(db,'users',teacherDoc.id), { assignedClass: className });
    alert(`Class "${className}" assigned to ${teacherEmail}`);
    loadTeachers();
  }
}

// Example usage: Assign a class via prompt (can be replaced with a form)
document.getElementById('teachersSection').addEventListener('click', async e=>{
  if(e.target.matches('.edit-btn')) {
    const teacherEmail = e.target.closest('tr').children[1].textContent;
    const className = prompt("Enter class to assign:", "");
    if(className) await assignClassToTeacher(teacherEmail, className);
  }
});

// -------------------- Filter Lessons in Reports --------------------
document.getElementById('applyFilter').addEventListener('click', async ()=>{
  const teacherFilter = document.getElementById('filterTeacher').value;
  const statusFilter = document.getElementById('filterStatus').value;

  const pendingTbody = document.querySelector('#pendingTable tbody');
  const approvedTbody = document.querySelector('#approvedTable tbody');
  pendingTbody.innerHTML='';
  approvedTbody.innerHTML='';

  const snap = await getDocs(collection(db,'lessons'));
  snap.forEach(d=>{
    const l = d.data();
    if ((teacherFilter && l.teacher !== teacherFilter) || (statusFilter && l.status !== statusFilter)) return;

    const tr = document.createElement('tr');
    if(l.status==='pending'){
      tr.innerHTML = `
        <td>${l.submittedDate||''}</td>
        <td>${l.teacher}</td>
        <td>${l.className}</td>
        <td>${l.project}</td>
        <td>${l.lessonNumber}</td>
        <td>${l.time}</td>
        <td>
          <button class="approve" data-id="${d.id}">Approve</button>
          <button class="reject" data-id="${d.id}">Reject</button>
        </td>
      `;
      pendingTbody.appendChild(tr);
    } else if(l.status==='approved'){
      tr.innerHTML = `
        <td>${l.submittedDate||''}</td>
        <td>${l.teacher}</td>
        <td>${l.className}</td>
        <td>${l.project}</td>
        <td>${l.lessonNumber}</td>
        <td>${l.time}</td>
      `;
      approvedTbody.appendChild(tr);
    }
  });

  // Re-bind approve/reject buttons
  pendingTbody.querySelectorAll('.approve').forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      await updateDoc(doc(db,'lessons',btn.dataset.id), { status:'approved' });
      loadLessons(); loadOverview();
    });
  });
  pendingTbody.querySelectorAll('.reject').forEach(btn=>{
    btn.addEventListener('click', async ()=> {
      await deleteDoc(doc(db,'lessons',btn.dataset.id));
      loadLessons(); loadOverview();
    });
  });
});
