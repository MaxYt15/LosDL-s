import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDJ9Ouxup0-HQn_lC3HCkj5k3HnLp2ypI",
  authDomain: "mi-pagina-80920.firebaseapp.com",
  projectId: "mi-pagina-80920",
  storageBucket: "mi-pagina-80920.firebasestorage.app",
  messagingSenderId: "478583666607",
  appId: "1:478583666607:web:0d49dd5a4a9c2e8a35615a",
  measurementId: "G-T590J8R3Z9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const contadorRef = doc(db, "stats", "visitas");

// Incrementa el contador cada vez que alguien entra
async function incrementarVisita() {
  let docSnap = await getDoc(contadorRef);
  if (!docSnap.exists()) {
    await setDoc(contadorRef, { total: 0 });
    docSnap = await getDoc(contadorRef);
  }
  await updateDoc(contadorRef, {
    total: docSnap.data().total + 1
  });
}

// Mostrar el contador en tiempo real y animar
function mostrarContador() {
  const el = document.getElementById("contador-visitas");
  let lastValue = null;
  onSnapshot(contadorRef, (doc) => {
    if (doc.exists()) {
      const value = doc.data().total;
      el.textContent = value;
      if (lastValue !== null && value !== lastValue) {
        el.classList.remove("contador-anim");
        void el.offsetWidth; // trigger reflow
        el.classList.add("contador-anim");
      }
      lastValue = value;
    } else {
      el.textContent = "0";
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await incrementarVisita();
  mostrarContador();
}); 