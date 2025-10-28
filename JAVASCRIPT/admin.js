import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const db = getFirestore();

async function loadTeachers() {
  const teachersTable = document.querySelector('#teachersTable tbody');
  teachersTable.innerHTML = '';

  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach(doc => {
    const user = doc.data();
    if(user.role === 'teacher') {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone || '-'}</td>
        <td>${user.class || '-'}</td>
        <td>${new Date().toLocaleTimeString()}</td>
        <td><button onclick="assignClass('${doc.id}')">Assign</button></td>
      `;
      teachersTable.appendChild(tr);
    }
  });
}

async function loadTeacherLessons() {
  const lessonsTable = document.querySelector('#teacherLessonsTable tbody');
  lessonsTable.innerHTML = '';

  const querySnapshot = await getDocs(collection(db, "lessons"));
  let count = 1;
  querySnapshot.forEach(doc => {
    const lesson = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${count++}</td>
      <td>${lesson.date || '-'}</td>
      <td>${lesson.class || '-'}</td>
      <td>${lesson.time || '-'}</td>
      <td>${lesson.teacher || '-'}</td>
      <td>${lesson.project || '-'}</td>
    `;
    lessonsTable.appendChild(tr);
  });
}

// Call on page load
loadTeachers();
loadTeacherLessons();

// Optional assign function
function assignClass(teacherId) {
  alert(`Assigning class to teacher: ${teacherId}`);
  // Add Firestore logic here
}

// Logout button
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('loggedInUser');
  window.location.href = 'login.html';
});







// Redirect admin to dashboard
const viewBtn = document.getElementById('viewDashboardBtn');
viewBtn.addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

if (userData.role === 'admin') {
    saveUserLocally({ ...userData, uid: user.uid });
    window.location.href = "dashboard.html"; // redirect admin directly to dashboard
}


document.getElementById('viewDashboardBtn').addEventListener('click', loadLessons);


