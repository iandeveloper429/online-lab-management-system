// teacher.js

import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import { 
  getFirestore, collection, addDoc, query, where, onSnapshot, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==================== ELEMENTS ====================
const lessonForm = document.getElementById("lessonForm");
const approvedLessonsContainer = document.getElementById("approvedLessons");
const messagesContainer = document.getElementById("messagesContainer");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

let currentUser = null;

// ==================== AUTH STATE ====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("Teacher logged in:", user.email);
    loadApprovedLessons();
    loadMessages();
  } else {
    alert("Please log in first.");
    window.location.href = "login.html";
  }
});

// ==================== LESSON SUBMISSION ====================
if (lessonForm) {
  lessonForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const className = document.getElementById("className").value.trim();
    const projectName = document.getElementById("projectName").value.trim();
    const lessonNumber = document.getElementById("lessonNumber").value.trim();
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    if (!className || !projectName || !lessonNumber || !startTime || !endTime) {
      alert("Please fill in all fields before submitting.");
      return;
    }

    try {
      await addDoc(collection(db, "pending_lessons"), {
        teacherEmail: currentUser.email,
        teacherName: currentUser.displayName || currentUser.email,
        className,
        projectName,
        lessonNumber,
        startTime,
        endTime,
        createdAt: new Date(),
      });

      alert("Lesson request sent to admin!");
      lessonForm.reset();
    } catch (error) {
      console.error("Error submitting lesson:", error);
      alert("Error submitting: " + error.message);
    }
  });
}

// ==================== LOAD APPROVED LESSONS ====================
async function loadApprovedLessons() {
  if (!currentUser) return;

  const q = query(
    collection(db, "lessons"),
    where("teacherEmail", "==", currentUser.email),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    approvedLessonsContainer.innerHTML = "";
    if (snapshot.empty) {
      approvedLessonsContainer.innerHTML = "<p>No approved lessons yet.</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const lessonCard = document.createElement("div");
      lessonCard.classList.add("lesson-card");
      lessonCard.innerHTML = `
        <h3>${data.projectName}</h3>
        <p><strong>Class:</strong> ${data.className}</p>
        <p><strong>Lesson Number:</strong> ${data.lessonNumber}</p>
        <p><strong>Start Time:</strong> ${data.startTime}</p>
        <p><strong>End Time:</strong> ${data.endTime}</p>
        <p><em>Status:</em> ✅ Approved</p>
      `;
      approvedLessonsContainer.appendChild(lessonCard);
    });
  });
}

// ==================== LOAD MESSAGES ====================
function loadMessages() {
  if (!currentUser) return;

  const q = query(
    collection(db, "messages"),
    where("to", "==", currentUser.email),
    orderBy("date", "desc")
  );

  onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";
    if (snapshot.empty) {
      messagesContainer.innerHTML = "<p>No messages yet.</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const msgCard = document.createElement("div");
      msgCard.classList.add("message-card");
      msgCard.innerHTML = `
        <p><strong>${msg.from === currentUser.email ? "You" : msg.from}:</strong> ${msg.content}</p>
        <span class="time">${new Date(msg.date).toLocaleString()}</span>
      `;
      messagesContainer.appendChild(msgCard);
    });
  });
}

// ==================== SEND MESSAGE TO ADMIN ====================
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const content = messageInput.value.trim();
    if (!content) {
      alert("Please enter a message before sending.");
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        from: currentUser.email,
        to: "admin",
        content,
        date: new Date().toISOString(),
      });

      messageInput.value = "";
      alert("Message sent to admin!");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message: " + error.message);
    }
  });
}
