// ===== IMPORT FIREBASE MODULES =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ===== FIREBASE CONFIG (FIXED STORAGE BUCKET) =====
const firebaseConfig = {
  apiKey: "AIzaSyDe9fXCUSpTFw0VSq_ppzRqOjhkCDIHDXY",
  authDomain: "lab-management-system-9a96e.firebaseapp.com",
  projectId: "lab-management-system-9a96e",
  storageBucket: "lab-management-system-9a96e.appspot.com", // ✅ FIXED
  messagingSenderId: "460300647867",
  appId: "1:460300647867:web:2a626aced15605dd63989e",
  measurementId: "G-H66GY777NK"
};

// ===== INITIALIZE FIREBASE =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== SAVE LOGGED USER LOCALLY =====
function saveUserLocally(userData) {
  localStorage.setItem("loggedInUser", JSON.stringify(userData));
}

document.addEventListener("DOMContentLoaded", () => {

  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // ===== SIGN UP =====
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("nameSignup").value.trim();
      const email = document.getElementById("emailSignup").value.trim();
      const phone = document.getElementById("phoneSignup").value.trim();
      const password = document.getElementById("passwordSignup").value.trim();
      const role = document.getElementById("roleSignup").value.toLowerCase();

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
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("emailLogin").value.trim();
      const password = document.getElementById("passwordLogin").value.trim();

      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return alert("❌ User not found.");

        const userData = userDoc.data();
        saveUserLocally({ ...userData, uid: user.uid });

        alert(`✅ Welcome ${userData.name} (${userData.role})`);

        // Redirect by role
        if (userData.role === "admin") window.location.href = "admin.html";
        else if (userData.role === "teacher") window.location.href = "teachers.html";
        else window.location.href = "students.html";

      } catch (err) {
        alert("❌ Login failed: " + err.message);
      }
    });
  }
});

// ===== PROTECT ADMIN & TEACHER PAGES =====
export function protectPage(requiredRole) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      return window.location.href = "login.html"; // 🚧 Not logged in
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    if (userData.role !== requiredRole) {
      alert("⛔ Unauthorized Access");
      window.location.href = "login.html";
    }
  });
}

// ===== LOGOUT FUNCTION =====
export function logout() {
  signOut(auth).then(() => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  });
}
