import { protectPage } from "./login.js";
protectPage("teacher");



// JAVASCRIPT/teachers.js
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

// ====== FIREBASE CONFIG (your project) ======
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

let currentUser = null;
let currentEmail = null;

// ====== NAV (already in your html) ======
// (sidebar nav event listeners are in your page's script — no change needed here)

// ====== AUTH & INITIAL LOAD ======
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  currentEmail = user.email;
  userNameEl.textContent = user.displayName || user.email;

  // load profile from users collection (doc id assumed to be uid)
  try {
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
      // ensure minimal user doc exists
      await setDoc(userDocRef, {
        name: user.displayName || "",
        email: user.email,
        role: "teacher"
      }, { merge: true });
      profileInfoEl.innerHTML = `<p><strong>Name:</strong> ${user.displayName || "N/A"}</p><p><strong>Email:</strong> ${user.email}</p>`;
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }

  // start realtime listeners
  loadAssignedLessons();
  loadMessages();
  loadSubmittedLessons();
});

// ====== SUBMIT LESSON REQUEST => pending_lessons ======
if (teacherInputForm) {
  teacherInputForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const class_name = form.elements["class_name"].value.trim();
    const project_name = form.elements["project_name"].value.trim();
    const lesson_number = form.elements["lesson_number"].value;
    const start_time = form.elements["start_time"].value;
    const end_time = form.elements["end_time"].value;
    const is_lab = form.elements["is_lab"]?.checked ? true : false;

    if (!class_name || !project_name || !lesson_number || !start_time || !end_time) {
      return alert("Please fill in all required fields.");
    }

    try {
      await addDoc(collection(db, "pending_lessons"), {
        teacherEmail: currentEmail,
        teacherName: currentUser.displayName || currentEmail,
        className: class_name,
        projectName: project_name,
        lessonNumber: lesson_number,
        startTime: start_time,
        endTime: end_time,
        is_lab: !!is_lab,
        createdAt: new Date().toISOString()
      });
      alert("Lesson request submitted to admin.");
      form.reset();
    } catch (err) {
      console.error("Submit lesson error:", err);
      alert("Error submitting lesson: " + err.message);
    }
  });
}

// ====== LOAD ASSIGNED / APPROVED LESSONS (lessons collection) ======
function loadAssignedLessons() {
  if (!currentEmail) return;
  const q = query(collection(db, "lessons"), where("teacherEmail", "==", currentEmail), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    let classHTML = "";
    let tableHTML = "";
    if (snapshot.empty) {
      assignedClassEl.innerHTML = "<p>No lessons assigned yet.</p>";
      assignedClassOverviewEl.innerHTML = "<p>No lessons available.</p>";
      document.querySelector("#assignedLessonsTable tbody").innerHTML = "<tr><td colspan='6'>No assigned lessons.</td></tr>";
      return;
    }
    snapshot.forEach(docSnap => {
      const lesson = docSnap.data();
      const labTag = lesson.is_lab ? "<span class='lab-tag'>LAB</span>" : "";
      classHTML += `
        <div class="lesson-card">
          <strong>${lesson.className}</strong> - ${lesson.projectName} ${labTag}
          <p>Lesson ${lesson.lessonNumber} | ${lesson.startTime} - ${lesson.endTime}</p>
        </div>
      `;
      tableHTML += `
        <tr>
          <td>${lesson.date || lesson.visitDate || (lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString() : '')}</td>
          <td>${lesson.className}</td>
          <td>${lesson.projectName}</td>
          <td>${lesson.lessonNumber}</td>
          <td>${lesson.startTime} - ${lesson.endTime}</td>
          <td>${lesson.notes || ''}</td>
        </tr>
      `;
    });
    assignedClassEl.innerHTML = classHTML;
    assignedClassOverviewEl.innerHTML = classHTML;
    document.querySelector("#assignedLessonsTable tbody").innerHTML = tableHTML || "<tr><td colspan='6'>No assigned lessons.</td></tr>";
  }, err => console.error("Assigned lessons listener error:", err));
}

// ====== LOAD MESSAGES (where to == teacher email OR 'all') ======
// ====== LOAD MESSAGES (Admin → Teacher or Everyone) ======
// ====== LOAD MESSAGES (Admin → Teacher or Everyone) ======
function loadMessages() {
  if (!currentEmail) return;

  // teacher should receive:
  // 1) Direct messages (to = teacherEmail)
  // 2) Group messages (to = "teachers")
  // 3) Broadcast messages (to = "all")
  const q = query(
    collection(db, "messages"),
    where("to", "in", [currentEmail, "teachers", "all"]),
    orderBy("date", "desc")
  );

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
      const messageText = m.content || m.message || "";
      const messageDate = m.date ? new Date(m.date).toLocaleString() : "";

      const card = document.createElement("div");
      card.className = "message-card";
      card.innerHTML = `
        <p><strong>${from}</strong></p>
        <p>${messageText}</p>
        <small>${messageDate}</small>
      `;
      messagesListEl.appendChild(card);
    });

    appendReplyForm();
  }, err => {
    console.error("Messages listener error:", err);
  });
}



  // Firestore 'in' query: to in [currentEmail, 'all']
  const recipients = [currentEmail, "all"];
  const q = query(collection(db, "messages"), where("to", "in", recipients), orderBy("date", "desc"));

  onSnapshot(q, (snapshot) => {
    messagesListEl.innerHTML = "";
    if (snapshot.empty) {
      messagesListEl.innerHTML = "<p>No new messages.</p>";
    } else {
      snapshot.forEach(docSnap => {
        const m = docSnap.data();
        const fromLabel = m.fromName || m.from || "Admin";
        const when = m.date ? new Date(m.date).toLocaleString() : "";
        const card = document.createElement("div");
        card.className = "message-card";
        card.innerHTML = `
          <p><strong>${fromLabel}:</strong> ${m.content || m.message || ""}</p>
          <div class="message-meta"><small>To: ${m.to || 'All'} • ${when}</small></div>
        `;
        messagesListEl.appendChild(card);
      });
    }

    // append a simple reply form under messages so teacher can message admin
    appendReplyForm();
  }, err => {
    // If 'in' queries are not enabled or fail, fallback to listen for personal messages only
    console.warn("Messages 'in' listener error:", err);
    // fallback single query
    const q2 = query(collection(db, "messages"), where("to", "==", currentEmail), orderBy("date", "desc"));
    onSnapshot(q2, (snapshot2) => {
      messagesListEl.innerHTML = "";
      if (snapshot2.empty) messagesListEl.innerHTML = "<p>No new messages.</p>";
      else {
        snapshot2.forEach(docSnap => {
          const m = docSnap.data();
          const fromLabel = m.fromName || m.from || "Admin";
          const when = m.date ? new Date(m.date).toLocaleString() : "";
          const card = document.createElement("div");
          card.className = "message-card";
          card.innerHTML = `<p><strong>${fromLabel}:</strong> ${m.content || m.message || ""}</p><div class="message-meta"><small>${when}</small></div>`;
          messagesListEl.appendChild(card);
        });
      }
      appendReplyForm();
    }, e => console.error("Fallback messages listener error:", e));
  });


// helper to add reply form under messages (only once)
function appendReplyForm() {
  if (document.getElementById("teacherReplyForm")) return;
  const form = document.createElement("form");
  form.id = "teacherReplyForm";
  form.className = "message-reply-form";
  form.innerHTML = `
    <textarea id="teacherReplyInput" rows="3" placeholder="Write message to admin..."></textarea>
    <div><button type="submit" class="btn-primary">Send to Admin</button></div>
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
        to: "admin",               // admin will see it in his messages list
        content,
        date: new Date().toISOString()
      });
      document.getElementById("teacherReplyInput").value = "";
      alert("Message sent to admin.");
    } catch (err) {
      console.error("Send message error:", err);
      alert("Error sending message: " + err.message);
    }
  });
}

// ====== LOAD SUBMITTED LESSONS (combine pending + approved) ======
function loadSubmittedLessons() {
  if (!currentEmail) return;

  // Listen pending requests
  const qPending = query(collection(db, "pending_lessons"), where("teacherEmail", "==", currentEmail), orderBy("createdAt", "desc"));
  onSnapshot(qPending, (snapPending) => {
    const pendingItems = [];
    snapPending.forEach(d => {
      const v = d.data();
      pendingItems.push({
        date: v.createdAt || v.createdAt,
        className: v.className,
        projectName: v.projectName,
        lessonNumber: v.lessonNumber,
        time: `${v.startTime || ''} - ${v.endTime || ''}`,
        status: "Pending"
      });
    });

    // After fetching pending, fetch approved (lessons)
    const qApproved = query(collection(db, "lessons"), where("teacherEmail", "==", currentEmail), orderBy("createdAt", "desc"));
    onSnapshot(qApproved, (snapApproved) => {
      const approvedItems = [];
      snapApproved.forEach(d => {
        const v = d.data();
        approvedItems.push({
          date: v.visitDate || v.date || v.createdAt || "",
          className: v.className,
          projectName: v.projectName,
          lessonNumber: v.lessonNumber,
          time: `${v.startTime || ''} - ${v.endTime || ''}`,
          status: "Approved"
        });
      });

      // combine approved first, then pending (you can change order)
      const rows = [...approvedItems, ...pendingItems];
      let html = "";
      if (rows.length === 0) {
        submittedLessonsTbody.innerHTML = `<tr><td colspan="8">No lessons submitted yet.</td></tr>`;
        return;
      }
      rows.forEach(r => {
        html += `
          <tr>
            <td>${r.date ? (typeof r.date === 'string' ? new Date(r.date).toLocaleDateString() : new Date(r.date).toLocaleDateString()) : ''}</td>
            <td>${r.className || ''}</td>
            <td>${r.projectName || ''}</td>
            <td>${r.lessonNumber || ''}</td>
            <td>${r.time || ''}</td>
            <td>${r.status}</td>
            <td></td>
            <td></td>
          </tr>
        `;
      });
      submittedLessonsTbody.innerHTML = html;
    }, err => console.error("Approved lessons listener error:", err));
  }, err => console.error("Pending lessons listener error:", err));
}

// ====== UPLOAD PROFILE PICTURE ======
if (updateProfileBtn) {
  updateProfileBtn.addEventListener("click", async () => {
    const file = uploadProfileEl.files[0];
    if (!file) return alert("Please select a picture first.");
    if (!currentUser) return alert("Not signed in.");

    try {
      const storageRef = ref(storage, `teacher_profiles/${currentUser.uid}.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // save to users collection using uid as doc id
      await setDoc(doc(db, "users", currentUser.uid), {
        photoURL: downloadURL,
        name: currentUser.displayName || "",
        email: currentUser.email,
        role: "teacher",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      profilePicEl.src = downloadURL;
      alert("Profile picture updated successfully!");
    } catch (err) {
      console.error("Profile upload error:", err);
      alert("Error uploading profile: " + err.message);
    }
  });
}

// ====== LOGOUT ======
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "index.html";
    }
  });
}
