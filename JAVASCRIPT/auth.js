// ===== IMPORT FIREBASE MODULES =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyDe9fXCUSpTFw0VSq_ppzRqOjhkCDIHDXY",
  authDomain: "lab-management-system-9a96e.firebaseapp.com",
  projectId: "lab-management-system-9a96e",
  storageBucket: "lab-management-system-9a96e.appspot.com",
  messagingSenderId: "460300647867",
  appId: "1:460300647867:web:2a626aced15605dd63989e"
};

// ===== INITIALIZE FIREBASE =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== DOM ELEMENTS =====
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');

// ===== HELPER =====
function saveUserLocally(userData) {
  localStorage.setItem('loggedInUser', JSON.stringify(userData));
}

// ===== SIGNUP =====
if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();

    const name = document.getElementById('nameSignup').value.trim();
    const email = document.getElementById('emailSignup').value.trim();
    const phone = document.getElementById('phoneSignup').value.trim();
    const password = document.getElementById('passwordSignup').value.trim();
    const role = document.getElementById('roleSignup').value.toLowerCase();

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      await setDoc(doc(db, "users", user.uid), { name, email, phone, role });
      alert(`✅ Signup successful as ${role}! Please login.`);
      window.location.href = "login.html";
    } catch (err) {
      console.error(err);
      alert("❌ Signup error: " + err.message);
    }
  });
}

// ===== LOGIN =====
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const email = document.getElementById('emailLogin').value.trim();
    const password = document.getElementById('passwordLogin').value.trim();
    const roleSelected = document.getElementById('roleLogin').value.toLowerCase();

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        alert("❌ User record not found in Firestore.");
        return;
      }

      const userData = userDoc.data();
      if (userData.role !== roleSelected) {
        alert(`❌ You must login as ${userData.role}, not ${roleSelected}.`);
        return;
      }

      saveUserLocally({ ...userData, uid: user.uid });
      alert("✅ Login successful!");

      switch (userData.role) {
        case 'admin':
          window.location.href = "admin.html";
          break;
        case 'teacher':
          window.location.href = "teachers.html";
          break;
        case 'student':
          window.location.href = "students.html";
          break;
        default:
          window.location.href = "index.html";
      }

    } catch (err) {
      console.error(err);
      alert("❌ Login failed: " + err.message);
    }
  });
}
