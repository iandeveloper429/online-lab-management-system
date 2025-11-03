// ===== IMPORT FIREBASE MODULES =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// ====== FIREBASE CONFIG ======
const firebaseConfig = {
  apiKey: "AIzaSyDe9fXCUSpTFw0VSq_ppzRqOjhkCDIHDXY",
  authDomain: "lab-management-system-9a96e.firebaseapp.com",
  projectId: "lab-management-system-9a96e",
  storageBucket: "lab-management-system-9a96e.firebasestorage.app",
  messagingSenderId: "460300647867",
  appId: "1:460300647867:web:2a626aced15605dd63989e",
  measurementId: "G-H66GY777NK"
};

// ====== INITIALIZE FIREBASE ======
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ====== DOM ELEMENTS ======
const userNameEl = document.getElementById("userName");
const assignedClassEl = document.getElementById("assignedClass");
const assignedClassOverviewEl = document.getElementById("assignedClassOverview");
const messagesListEl = document.getElementById("messagesList");
const submittedLessonsTbody = document.querySelector("#submittedLessons tbody");
const profileInfoEl = document.getElementById("profileInfo");
const profilePicEl = document.getElementById("profilePic");
const uploadProfileEl = document.getElementById("uploadProfile");
const updateProfileBtn = document.getElementById("updateProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ====== NAVIGATION ======
document.querySelectorAll(".sidebar a[data-section]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));
    e.target.parentElement.classList.add("active");

    const section = e.target.dataset.section;
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(`${section}Section`).classList.add("active");
  });
});

// ====== AUTHENTICATION STATE ======
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // redirect to login if not logged in
    return;
  }

  userNameEl.textContent = user.displayName || user.email;

  // Fetch teacher profile info
  const teacherRef = doc(db, "teachers", user.uid);
  const teacherSnap = await getDoc(teacherRef);
  if (teacherSnap.exists()) {
    const data = teacherSnap.data();
    profileInfoEl.innerHTML = `
      <p><strong>Name:</strong> ${data.name || user.displayName || "N/A"}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Department:</strong> ${data.department || "N/A"}</p>
    `;
    if (data.photoURL) profilePicEl.src = data.photoURL;
  }

  // Fetch assigned lessons
  await loadAssignedLessons(user.uid);

  // Fetch messages from admin
  await loadMessages(user.uid);

  // Load submitted lessons
  await loadSubmittedLessons(user.uid);
});

// ====== LOAD ASSIGNED LESSONS ======
async function loadAssignedLessons(teacherId) {
  const q = query(collection(db, "lessons"), where("teacherId", "==", teacherId));
  const querySnap = await getDocs(q);

  let classHTML = "";
  let tableHTML = "";

  querySnap.forEach(docSnap => {
    const lesson = docSnap.data();
    const labTag = lesson.is_lab ? "<span class='lab-tag'>LAB</span>" : "";
    classHTML += `
      <div class="lesson-card">
        <strong>${lesson.class_name}</strong> - ${lesson.project_name} ${labTag}
        <p>Lesson ${lesson.lesson_number} | ${lesson.start_time} - ${lesson.end_time}</p>
      </div>
    `;
    tableHTML += `
      <tr>
        <td>${lesson.date || "N/A"}</td>
        <td>${lesson.class_name}</td>
        <td>${lesson.project_name}</td>
        <td>${lesson.lesson_number}</td>
        <td>${lesson.start_time} - ${lesson.end_time}</td>
        <td>${lesson.is_lab ? "LAB" : "Normal"}</td>
      </tr>
    `;
  });

  assignedClassEl.innerHTML = classHTML || "<p>No lessons assigned yet.</p>";
  assignedClassOverviewEl.innerHTML = classHTML || "<p>No lessons available.</p>";

  document.querySelector("#assignedLessonsTable tbody").innerHTML = tableHTML;
}

// ====== LOAD MESSAGES ======
async function loadMessages(teacherId) {
  const q = query(collection(db, "messages"), where("to", "==", teacherId));
  const querySnap = await getDocs(q);
  let html = "";
  querySnap.forEach(docSnap => {
    const msg = docSnap.data();
    html += `<div class="message-card">
      <p><strong>${msg.fromName || "Admin"}:</strong> ${msg.text}</p>
      <span class="time">${new Date(msg.timestamp?.toDate()).toLocaleString()}</span>
    </div>`;
  });
  messagesListEl.innerHTML = html || "<p>No new messages.</p>";
}

// ====== LOAD SUBMITTED LESSONS ======
async function loadSubmittedLessons(teacherId) {
  const q = query(collection(db, "submittedLessons"), where("teacherId", "==", teacherId));
  const querySnap = await getDocs(q);
  let rows = "";
  querySnap.forEach(docSnap => {
    const lesson = docSnap.data();
    rows += `
      <tr>
        <td>${lesson.date || new Date().toLocaleDateString()}</td>
        <td>${lesson.class_name}</td>
        <td>${lesson.project_name}</td>
        <td>${lesson.lesson_number}</td>
        <td>${lesson.start_time} - ${lesson.end_time}</td>
        <td>${lesson.is_lab ? "LAB" : "Normal"}</td>
      </tr>
    `;
  });
  submittedLessonsTbody.innerHTML = rows || "<tr><td colspan='6'>No lessons submitted yet.</td></tr>";
}

// ====== UPLOAD PROFILE PICTURE ======
updateProfileBtn.addEventListener("click", async () => {
  const file = uploadProfileEl.files[0];
  if (!file) return alert("Please select a picture first.");
  const user = auth.currentUser;
  const storageRef = ref(storage, `teacher_profiles/${user.uid}.jpg`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  await addDoc(collection(db, "teachers"), {
    uid: user.uid,
    photoURL: downloadURL,
    updatedAt: serverTimestamp()
  });

  profilePicEl.src = downloadURL;
  alert("Profile picture updated successfully!");
});

// ====== LOGOUT ======
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
