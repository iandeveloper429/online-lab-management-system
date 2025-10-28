// ===== IMPORT FIREBASE MODULES =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
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

// ===== WRAP EVERYTHING IN DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', () => {

  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');

  // ===== HELPER: SAVE USER LOCALLY =====
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
        alert(`✅ Signup successful as ${role}!`);
        window.location.href = "login.html";
      } catch (err) {
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

      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return alert("❌ User not found.");

        const userData = userDoc.data();
        saveUserLocally({ ...userData, uid: user.uid });
        alert(`✅ Login successful as ${userData.role}!`);

        // Redirect based on role
        if (userData.role === 'admin') window.location.href = "admin.html";
        else if (userData.role === 'teacher') window.location.href = "teachers.html";
        else window.location.href = "students.html";

      } catch (err) {
        alert("❌ Login failed: " + err.message);
      }
    });
  }

});







//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

document.getElementById('viewDashboardBtn').addEventListener('click', loadLessons);


// Toggle add lesson form
document.getElementById('toggleAddLesson').addEventListener('click', ()=>{
  const form = document.getElementById('addLessonForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

