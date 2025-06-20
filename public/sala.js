import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, onAuthStateChanged, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDJ9Ouxup0-HQn_lC3HCkj5k3HnLp2ypI",
  authDomain: "mi-pagina-80920.firebaseapp.com",
  projectId: "mi-pagina-80920",
  storageBucket: "mi-pagina-80920.appspot.com",
  messagingSenderId: "478583666607",
  appId: "1:478583666607:web:0d49dd5a4a9c2e8a35615a",
  measurementId: "G-T590J8R3Z9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Referencias a elementos
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const registerMsg = document.getElementById('register-msg');
const loginMsg = document.getElementById('login-msg');
const authSection = document.getElementById('auth-section');
const verifySection = document.getElementById('verify-section');
const resendVerification = document.getElementById('resend-verification');
const logoutBtn = document.getElementById('logout-btn');
const chatSection = document.getElementById('chat-section');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const userApodo = document.getElementById('user-apodo');
const logoutBtnChat = document.getElementById('logout-btn-chat');
const escribiendoBox = document.getElementById('escribiendo-box');
const usuariosRegistradosCantidad = document.getElementById('usuarios-registrados-cantidad');
const usuariosRegistradosLista = document.getElementById('usuarios-registrados-lista');
let escribiendoTimeout = null;
let apodoActual = null;

const VERIFICADOS = {
  "K0PRXXhG4MeCWS9Gep5JpdxD0Nn2": true, // Sunkovv
  "Djw6e2jIFhZmMUdyNgYloYecZOL2": true  // ByGaboDL
};
const VERIFICADO_ICON = `<span class="verificado-icon" title="Verificado"> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#00f2ea"/><path d="M7 13l3 3 7-7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

// --- Registro ---
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerMsg.textContent = '';
  const apodo = document.getElementById('register-apodo').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  // Validar apodo único
  const apodoQuery = query(collection(db, 'apodos'), where('apodo', '==', apodo));
  const apodoSnap = await getDocs(apodoQuery);
  if (!apodo || apodoSnap.size > 0) {
    registerMsg.textContent = 'El apodo ya está en uso o es inválido.';
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Guardar apodo en Firestore
    await setDoc(doc(db, 'apodos', userCredential.user.uid), { apodo, uid: userCredential.user.uid });
    await sendEmailVerification(userCredential.user);
    registerMsg.textContent = 'Registro exitoso. Revisa tu correo para verificar tu cuenta.';
    registerForm.reset();
  } catch (error) {
    registerMsg.textContent = error.message;
  }
});

// --- Login ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    loginMsg.textContent = error.message;
  }
});

// --- Estado de autenticación ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await user.reload();
    if (!user.emailVerified) {
      authSection.style.display = 'none';
      verifySection.style.display = 'block';
      chatSection.style.display = 'none';
    } else {
      // Obtener apodo
      const apodoDoc = await getDoc(doc(db, 'apodos', user.uid));
      if (!apodoDoc.exists()) {
        await signOut(auth);
        return;
      }
      apodoActual = apodoDoc.data().apodo;
      // Mostrar verificado en cabecera si corresponde
      userApodo.innerHTML = 'Apodo: ' + apodoActual + (VERIFICADOS[user.uid] ? VERIFICADO_ICON : '');
      authSection.style.display = 'none';
      verifySection.style.display = 'none';
      chatSection.style.display = 'block';
      cargarChat(apodoActual);
      escucharEscribiendo(apodoActual);
    }
  } else {
    authSection.style.display = 'flex';
    verifySection.style.display = 'none';
    chatSection.style.display = 'none';
    apodoActual = null;
  }
});

// --- Reenviar verificación ---
if (resendVerification) {
  resendVerification.addEventListener('click', async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      alert('Correo de verificación reenviado.');
    }
  });
}

// --- Logout ---
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => signOut(auth));
}
if (logoutBtnChat) {
  logoutBtnChat.addEventListener('click', () => signOut(auth));
}

// --- Chat ---
function cargarChat(apodo) {
  chatMessages.innerHTML = '';
  const mensajesQuery = query(collection(db, 'mensajes'), orderBy('timestamp', 'asc'));
  onSnapshot(mensajesQuery, async (snapshot) => {
    chatMessages.innerHTML = '';
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      // Buscar UID del apodo
      let apodoVerificado = data.apodo;
      let icono = '';
      // Buscar UID por apodo
      let uidVerificado = null;
      // Consulta inversa: buscar UID por apodo
      if (data.apodo === 'Sunkovv') uidVerificado = 'K0PRXXhG4MeCWS9Gep5JpdxD0Nn2';
      if (data.apodo === 'ByGaboDL') uidVerificado = 'Djw6e2jIFhZmMUdyNgYloYecZOL2';
      if (uidVerificado && VERIFICADOS[uidVerificado]) icono = VERIFICADO_ICON;
      const div = document.createElement('div');
      div.className = 'chat-msg';
      div.innerHTML = `<b>${apodoVerificado}${icono}</b>: ${data.texto} <span class="chat-hora">${data.hora || ''}</span>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const texto = chatInput.value.trim();
    if (!texto) return;
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await addDoc(collection(db, 'mensajes'), {
      apodo,
      texto,
      hora,
      timestamp: serverTimestamp()
    });
    chatInput.value = '';
  };
}

// --- Escribiendo en tiempo real ---
function escucharEscribiendo(miApodo) {
  const escribiendoRef = doc(db, 'sala', 'escribiendo');
  onSnapshot(escribiendoRef, (docSnap) => {
    const data = docSnap.data();
    if (data && data.apodo && data.apodo !== miApodo) {
      escribiendoBox.textContent = `${data.apodo} está escribiendo...`;
      escribiendoBox.style.opacity = 1;
    } else {
      escribiendoBox.textContent = '';
      escribiendoBox.style.opacity = 0;
    }
  });
}

chatInput.addEventListener('input', () => {
  if (!apodoActual) return;
  const escribiendoRef = doc(db, 'sala', 'escribiendo');
  setDoc(escribiendoRef, { apodo: apodoActual }, { merge: true });
  if (escribiendoTimeout) clearTimeout(escribiendoTimeout);
  escribiendoTimeout = setTimeout(() => {
    setDoc(escribiendoRef, { apodo: '' }, { merge: true });
  }, 1500);
});

chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const texto = chatInput.value.trim();
  if (!texto) return;
  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  await addDoc(collection(db, 'mensajes'), {
    apodo: apodoActual,
    texto,
    hora,
    timestamp: serverTimestamp()
  });
  chatInput.value = '';
  // Limpiar escribiendo
  const escribiendoRef = doc(db, 'sala', 'escribiendo');
  setDoc(escribiendoRef, { apodo: '' }, { merge: true });
};

// Mostrar usuarios registrados y apodos en tiempo real
const apodosRef = collection(db, 'apodos');
onSnapshot(apodosRef, (snapshot) => {
  const apodos = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    apodos.push({ apodo: data.apodo, uid: data.uid });
  });
  usuariosRegistradosCantidad.textContent = apodos.length;
  usuariosRegistradosLista.innerHTML = apodos.map(u => `<span class="apodo-lista">${u.apodo}${VERIFICADOS[u.uid] ? VERIFICADO_ICON : ''}</span>`).join(' ');
}); 