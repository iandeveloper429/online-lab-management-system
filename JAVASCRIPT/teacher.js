import { protectPage } from "./login.js";
protectPage("teacher");

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
  onSnapshot,
  addDoc,
  setDoc,
  orderBy
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
  storageBucket: "lab-management-system-9a96e.appspot.com",
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
const teacherInputForm = document.getElementById("teacherInputForm");
const myClassesSection = document.getElementById("myClassesSection");

let currentUser = null;
let currentEmail = null;

// ====== AUTH & INITIAL LOAD ======
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  currentUser = user;
  currentEmail = user.email;
  userNameEl.textContent = user.displayName || user.email;

  // Load profile
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    profileInfoEl.innerHTML = `
      <p><strong>Name:</strong> ${data.name || user.displayName || "N/A"}</p>
      <p><strong>Email:</strong> ${data.email || user.email}</p>
      <p><strong>Department:</strong> ${data.department || "N/A"}</p>
    `;
    if (data.photoURL) profilePicEl.src = data.photoURL;
  } else {
    await setDoc(userDocRef, { name: user.displayName || "", email: user.email, role: "teacher" }, { merge: true });
  }

  // Start real-time listeners
  loadAssignedClasses();
  loadMessages();
  loadSubmittedLessons();
});

// ====== SUBMIT LESSON REQUEST ======
if (teacherInputForm) {
  teacherInputForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const class_name = form.elements["class_name"].value.trim();
    const project_name = form.elements["project_name"].value.trim();
    const lesson_number = form.elements["lesson_number"].value;
    const start_time = form.elements["start_time"].value;
    const end_time = form.elements["end_time"].value;
    const is_lab = form.elements["is_lab"]?.checked || false;

    if (!class_name || !project_name || !lesson_number || !start_time || !end_time)
      return alert("Please fill in all required fields.");

    try {
      await addDoc(collection(db, "pending_lessons"), {
        teacherEmail: currentEmail,
        teacherName: currentUser.displayName || currentEmail,
        className: class_name,
        projectName: project_name,
        lessonNumber: lesson_number,
        startTime: start_time,
        endTime: end_time,
        is_lab,
        createdAt: new Date().toISOString()
      });
      alert("Lesson request submitted.");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Error submitting lesson: " + err.message);
    }
  });
}

// ====== LOAD ASSIGNED CLASSES ======
function loadAssignedClasses() {
  if (!currentEmail) return;

  const docRef = doc(db, "classesAssigned", currentEmail);
  onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      assignedClassEl.innerHTML = "<p>No class assigned yet.</p>";
      assignedClassOverviewEl.innerHTML = "<p>No class assigned yet.</p>";
      myClassesSection.querySelectorAll(".lessons-container").forEach(c => c.remove());
      return;
    }

    const data = docSnap.data();
    // Handle multiple assigned classes
    const classes = Array.isArray(data.classes) ? data.classes : [data.className || data.name];
    assignedClassEl.innerHTML = classes.map(c => `<strong>${c}</strong>`).join(", ");
    assignedClassOverviewEl.innerHTML = classes.map(c => `<strong>${c}</strong>`).join(", ");

    // Load lessons per class
    classes.forEach(c => loadLessonsForClass(c));
  });
}

// ====== LOAD LESSONS FOR CLASS ======
function loadLessonsForClass(className) {
  if (!className) return;

  // Create container for each class in My Classes section
  let container = document.getElementById(`lessons_${className.replace(/\s+/g,'_')}`);
  if (!container) {
    container = document.createElement("div");
    container.id = `lessons_${className.replace(/\s+/g,'_')}`;
    container.className = "lessons-container card";
    container.innerHTML = `<h4>${className}</h4>`;
    myClassesSection.appendChild(container);
  }
  container.innerHTML = `<h4>${className}</h4>`;

  const q = query(collection(db, "lessons"), where("className", "==", className), orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML += "<p>No lessons for this class yet.</p>";
      return;
    }
    snapshot.forEach(docSnap => {
      const l = docSnap.data();
      const card = document.createElement("div");
      card.className = "lesson-card";
      card.innerHTML = `
        <p><strong>${l.projectName || l.title}</strong></p>
        <p>Lesson #: ${l.lessonNumber || ''} ${l.is_lab ? '<span class="lab-tag">LAB</span>' : ''}</p>
        <p>${l.startTime || ''} - ${l.endTime || ''}</p>
        <p><small>${l.notes || l.description || ''}</small></p>
      `;
      container.appendChild(card);
    });
  });
}

// ====== LOAD MESSAGES ======
function loadMessages() {
  if (!currentEmail) return;
  const recipients = [currentEmail, "teachers", "all"];
  const q = query(collection(db, "messages"), where("to", "in", recipients), orderBy("date", "desc"));
  onSnapshot(q, (snapshot) => {
    messagesListEl.innerHTML = "";
    if (snapshot.empty) {
      messagesListEl.innerHTML = "<p>No messages yet.</p>";
      appendReplyForm();
      return;
    }
    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      const from = m.fromName || m.from || "Admin";
      const messageDate = m.date ? new Date(m.date).toLocaleString() : "";
      const card = document.createElement("div");
      card.className = "message-card";
      card.innerHTML = `
        <p><strong>${from}</strong></p>
        <p>${m.content || m.message || ''}</p>
        <small>${messageDate}</small>
      `;
      messagesListEl.appendChild(card);
    });
    appendReplyForm();
  });
}

function appendReplyForm() {
  if (document.getElementById("teacherReplyForm")) return;
  const form = document.createElement("form");
  form.id = "teacherReplyForm";
  form.className = "message-reply-form";
  form.innerHTML = `
    <textarea id="teacherReplyInput" rows="3" placeholder="Write message to admin..."></textarea>
    <div><button type="submit" class="btn-primary">Send</button></div>
  `;
  messagesListEl.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = document.getElementById("teacherReplyInput").value.trim();
    if (!content) return alert("Enter a message.");
    try {
      await addDoc(collection(db, "messages"), {
        from: currentEmail,
        fromName: currentUser.displayName || currentEmail,
        to: "admin",
        content,
        date: new Date().toISOString()
      });
      document.getElementById("teacherReplyInput").value = "";
      alert("Message sent to admin.");
    } catch (err) {
      console.error(err);
      alert("Error sending message: " + err.message);
    }
  });
}

// ====== SUBMITTED LESSONS ======
function loadSubmittedLessons() {
  if (!currentEmail) return;
  const qPending = query(collection(db, "pending_lessons"), where("teacherEmail", "==", currentEmail), orderBy("createdAt", "desc"));
  onSnapshot(qPending, snapPending => {
    const pendingItems = snapPending.docs.map(d => ({...d.data(), status: "Pending"}));

    const qApproved = query(collection(db, "lessons"), where("teacherEmail", "==", currentEmail), orderBy("createdAt", "desc"));
    onSnapshot(qApproved, snapApproved => {
      const approvedItems = snapApproved.docs.map(d => ({...d.data(), status: "Approved"}));
      const allLessons = [...approvedItems, ...pendingItems];

      submittedLessonsTbody.innerHTML = "";
      if (!allLessons.length) {
        submittedLessonsTbody.innerHTML = `<tr><td colspan="8">No lessons submitted yet.</td></tr>`;
        return;
      }
      allLessons.forEach(r => {
        const lessonDate = r.date?.toDate ? r.date.toDate().toLocaleDateString() : new Date(r.date || r.createdAt).toLocaleDateString();
        submittedLessonsTbody.innerHTML += `
          <tr>
            <td>${lessonDate}</td>
            <td>${r.className || ''}</td>
            <td>${r.projectName || ''}</td>
            <td>${r.lessonNumber || ''}</td>
            <td>${r.startTime || ''} - ${r.endTime || ''}</td>
            <td>${r.status}</td>
            <td></td>
            <td></td>
          </tr>
        `;
      });
    });
  });
}

// ====== PROFILE PICTURE UPLOAD ======
if (updateProfileBtn) {
  updateProfileBtn.addEventListener("click", async () => {
    const file = uploadProfileEl.files[0];
    if (!file) return alert("Select a picture first.");
    if (!currentUser) return alert("Not signed in.");

    try {
      const storageRef = ref(storage, `teacher_profiles/${currentUser.uid}.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await setDoc(doc(db, "users", currentUser.uid), { photoURL: downloadURL }, { merge: true });
      profilePicEl.src = downloadURL;
      alert("Profile updated!");
    } catch (err) {
      console.error(err);
      alert("Error uploading profile: " + err.message);
    }
  });
}

// ====== LOGOUT ======
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      localStorage.clear();
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      window.location.href = "index.html";
    }
  });
}
