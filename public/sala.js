import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, onAuthStateChanged, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, where, getDocs, updateDoc, deleteField, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const replyPreviewBox = document.getElementById('reply-preview-box');
let escribiendoTimeout = null;
let apodoActual = null;
let currentReply = null;

const VERIFICADOS = {
  "K0PRXXhG4MeCWS9Gep5JpdxD0Nn2": true, // Sunkovv
  "Djw6e2jIFhZmMUdyNgYloYecZOL2": true  // ByGaboDL
};
const VERIFICADO_ICON = `<span class="verificado-icon" title="Verificado"> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#00f2ea"/><path d="M7 13l3 3 7-7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// --- Reproductor de Música Global ---
const musicForm = document.getElementById('music-form');
const youtubeLinkInput = document.getElementById('youtube-link-input');
const currentSongEl = document.getElementById('current-song');
const songRequesterEl = document.getElementById('song-requester');
const muteBtn = document.getElementById('mute-btn');
const syncBtn = document.getElementById('sync-btn');
let player;
let isMuted = false;
let isPlaying = false;
let timeUpdaterInterval = null;
const floatingAlert = document.getElementById('floating-alert');

function showFloatingAlert(message) {
    floatingAlert.textContent = message;
    floatingAlert.classList.add('show');
    setTimeout(() => {
        floatingAlert.classList.remove('show');
    }, 4000);
}

// Función central para sincronizar el estado del reproductor con Firestore
async function syncPlayerState() {
    if (!player || typeof player.loadVideoById !== 'function') {
        // El reproductor no está listo aún, lo reintentamos en un momento
        setTimeout(syncPlayerState, 100);
        return;
    }
    
    const musicRef = doc(db, 'sala', 'music');
    const docSnap = await getDoc(musicRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const videoId = data.videoId;
        
        isPlaying = true;
        updateMusicFormState();
        currentSongEl.textContent = data.title || videoId;
        songRequesterEl.textContent = data.requestedBy || 'Nadie';
        
        const startTime = data.startTime?.toDate();
        const elapsedTime = startTime ? (new Date().getTime() - startTime.getTime()) / 1000 : 0;
        player.loadVideoById(videoId, elapsedTime > 0 ? elapsedTime : 0);

    } else {
        isPlaying = false;
        updateMusicFormState();
        currentSongEl.textContent = 'Ninguna';
        songRequesterEl.textContent = 'Nadie';
        clearInterval(timeUpdaterInterval);
        document.getElementById('current-time').textContent = '0:00';
        document.getElementById('total-time').textContent = '0:00';
        if (player.getPlayerState() && player.getPlayerState() !== 0) {
             player.stopVideo();
        }
    }
}

// Cargar YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('youtube-player', {
    height: '0',
    width: '0',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
};

function onPlayerReady() {
  syncPlayerState();
  
  const musicRef = doc(db, 'sala', 'music');
  onSnapshot(musicRef, (docSnap) => {
    const currentVideoId = player.getVideoData() ? player.getVideoData().video_id : null;
    const firestoreVideoId = docSnap.exists() ? docSnap.data().videoId : null;

    if (currentVideoId !== firestoreVideoId) {
        syncPlayerState();
    }
  });
}

function onPlayerStateChange(event) {
  if (event.data === 1) { // PLAYING
    const duration = player.getDuration();
    if (duration > 600) {
        showFloatingAlert("La música no puede durar más de 10 minutos.");
        const musicRef = doc(db, 'sala', 'music');
        getDoc(musicRef).then(docSnap => {
          if (docSnap.exists() && docSnap.data().videoId === player.getVideoData().video_id) {
            deleteDoc(musicRef);
          }
        });
        return;
    }
    
    document.getElementById('total-time').textContent = formatTime(duration);
    clearInterval(timeUpdaterInterval);
    timeUpdaterInterval = setInterval(() => {
      const currentTime = player.getCurrentTime();
      document.getElementById('current-time').textContent = formatTime(currentTime);
    }, 1000);

  } else if (event.data === 0) { // ENDED
    clearInterval(timeUpdaterInterval);
    const musicRef = doc(db, 'sala', 'music');
    getDoc(musicRef).then(docSnap => {
      if (docSnap.exists() && docSnap.data().videoId === player.getVideoData().video_id) {
        deleteDoc(musicRef);
      }
    });
  } else if (event.data === 2) { // PAUSED
    clearInterval(timeUpdaterInterval);
  }
}

function updateMusicFormState() {
  const submitBtn = musicForm.querySelector('button[type="submit"]');
  const input = musicForm.querySelector('input');
  
  if (isPlaying) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Espera a que termine la música';
    input.placeholder = 'No puedes poner música ahora...';
    input.disabled = true;
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Poner Música';
    input.placeholder = 'Pega un link de YouTube aquí...';
    input.disabled = false;
  }
}

musicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!apodoActual || isPlaying) return;
  const url = youtubeLinkInput.value;
  const videoId = extractVideoID(url);
  if (!videoId) {
    alert('Link de YouTube no válido.');
    return;
  }
  
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    const title = data.title || videoId;
    
    const musicRef = doc(db, 'sala', 'music');
    await setDoc(musicRef, {
      videoId: videoId,
      title: title,
      requestedBy: apodoActual,
      startTime: serverTimestamp()
    });
    youtubeLinkInput.value = '';
  } catch (error) {
    console.error("Error fetching video info:", error);
    alert('Error al obtener información del video. Intenta de nuevo.');
  }
});

muteBtn.addEventListener('click', () => {
  if (isMuted) {
    player.unMute();
    muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  } else {
    player.mute();
    muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
  }
  isMuted = !isMuted;
});

syncBtn.addEventListener('click', syncPlayerState);

function extractVideoID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length == 11) {
    return match[2];
  }
  return null;
}

function formatTime(time) {
  time = Math.round(time);
  const minutes = Math.floor(time / 60);
  let seconds = time - (minutes * 60);
  seconds = seconds < 10 ? '0' + seconds : seconds;
  return minutes + ":" + seconds;
}

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

// --- Chat con respuestas y reacciones tipo WhatsApp ---
function cargarChat(apodo) {
  chatMessages.innerHTML = '';
  const mensajesQuery = query(collection(db, 'mensajes'), orderBy('timestamp', 'asc'));
  onSnapshot(mensajesQuery, async (snapshot) => {
    chatMessages.innerHTML = '';
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const mensajeId = docSnap.id;
      let apodoVerificado = data.apodo;
      let icono = '';
      let uidVerificado = null;
      if (data.apodo === 'Sunkovv') uidVerificado = 'K0PRXXhG4MeCWS9Gep5JpdxD0Nn2';
      if (data.apodo === 'ByGaboDL') uidVerificado = 'Djw6e2jIFhZmMUdyNgYloYecZOL2';
      if (uidVerificado && VERIFICADOS[uidVerificado]) icono = VERIFICADO_ICON;
      const div = document.createElement('div');
      div.className = 'chat-msg';
      div.id = mensajeId;
      div.style.position = 'relative';
      // Contenedor principal del mensaje (nombre y hora arriba, texto abajo)
      const msgMain = document.createElement('div');
      msgMain.className = 'msg-main';
      // Mensaje citado (si es una respuesta)
      if (data.replyTo) {
        const quotedReply = document.createElement('div');
        quotedReply.className = 'quoted-reply';
        quotedReply.innerHTML = `<b>${data.replyTo.author}</b><span class="reply-text">${data.replyTo.text}</span>`;
        quotedReply.onclick = () => {
          const originalMsg = document.getElementById(data.replyTo.messageId);
          if (originalMsg) originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        msgMain.appendChild(quotedReply);
      }
      // Convertir timestamp a hora local del usuario
      const fecha = data.timestamp ? data.timestamp.toDate() : new Date();
      const hora = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Header: apodo, verificado, hora
      const msgHeader = document.createElement('div');
      msgHeader.className = 'msg-header';
      msgHeader.innerHTML = `<b>${apodoVerificado}${icono}</b><span class="chat-hora">${hora}</span>`;
      // Texto del mensaje
      const msgTexto = document.createElement('div');
      msgTexto.className = 'msg-texto';
      msgTexto.textContent = data.texto;
      msgMain.appendChild(msgHeader);
      msgMain.appendChild(msgTexto);
      // Reacciones (deben ir debajo del texto)
      if (data.reacciones) {
        const reaccionesBox = document.createElement('div');
        reaccionesBox.className = 'reacciones-box';
        const resumen = {};
        Object.values(data.reacciones).forEach(r => {
          if (!resumen[r.emoji]) resumen[r.emoji] = 0;
          resumen[r.emoji]++;
        });
        Object.entries(resumen).forEach(([emoji, count]) => {
          const span = document.createElement('span');
          span.className = 'reaccion-emoji';
          span.textContent = emoji + ' ' + count;
          reaccionesBox.appendChild(span);
        });
        msgMain.appendChild(reaccionesBox);
      }
      // Botones de acción (reaccionar, responder)
      const actionButtons = document.createElement('div');
      actionButtons.className = 'action-buttons';
      // Botón de respuesta
      const btnReply = document.createElement('button');
      btnReply.className = 'reply-btn';
      btnReply.title = 'Responder';
      btnReply.innerHTML = '<i class="fas fa-reply"></i>';
      btnReply.onclick = () => {
        currentReply = {
          messageId: mensajeId,
          author: data.apodo,
          text: data.texto
        };
        replyPreviewBox.innerHTML = `<b>Respondiendo a ${data.apodo}</b><span class="reply-text">${data.texto}</span><button id="cancel-reply-btn">×</button>`;
        replyPreviewBox.style.display = 'block';
        document.getElementById('cancel-reply-btn').onclick = () => {
          currentReply = null;
          replyPreviewBox.style.display = 'none';
        };
      };
      // Botón de reacción (icono Font Awesome carita feliz +)
      const btnReaccion = document.createElement('button');
      btnReaccion.className = 'reaccion-btn';
      btnReaccion.title = 'Reaccionar';
      btnReaccion.innerHTML = '<i class="fa-regular fa-face-smile"></i><span class="plus">+</span>';
      btnReaccion.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.emoji-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'emoji-menu';
        const picker = document.createElement('emoji-picker');
        picker.addEventListener('emoji-click', async ev => {
          const emoji = ev.detail.unicode;
          const user = auth.currentUser;
          if (!user) return;
          const reaccionPath = `reacciones.${user.uid}`;
          if (data.reacciones && data.reacciones[user.uid] && data.reacciones[user.uid].emoji === emoji) {
            await updateDoc(doc(db, 'mensajes', mensajeId), {
              [reaccionPath]: deleteField()
            });
          } else {
            await updateDoc(doc(db, 'mensajes', mensajeId), {
              [reaccionPath]: { emoji, uid: user.uid }
            });
          }
          menu.remove();
        });
        menu.appendChild(picker);
        // Posicionar el menú centrado respecto al mensaje
        const rect = div.getBoundingClientRect();
        menu.style.position = 'fixed';
        const menuWidth = 340;
        let top = rect.top - 350;
        if (top < 0) top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2) - (menuWidth / 2);
        if (left < 0) left = 10;
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
        menu.style.zIndex = 99999;
        document.body.appendChild(menu);
        setTimeout(() => {
          document.addEventListener('mousedown', function handler(ev) {
            if (!menu.contains(ev.target)) {
              menu.remove();
              document.removeEventListener('mousedown', handler);
            }
          });
        }, 50);
      };
      actionButtons.appendChild(btnReply);
      actionButtons.appendChild(btnReaccion);
      div.appendChild(msgMain);
      div.appendChild(actionButtons);
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const texto = chatInput.value.trim();
    if (!texto) return;
    const nuevoMensaje = {
      apodo: apodoActual,
      texto,
      timestamp: serverTimestamp()
    };
    if (currentReply) {
      nuevoMensaje.replyTo = currentReply;
    }
    await addDoc(collection(db, 'mensajes'), nuevoMensaje);
    chatInput.value = '';
    currentReply = null;
    replyPreviewBox.style.display = 'none';
    // Limpiar escribiendo
    const escribiendoRef = doc(db, 'sala', 'escribiendo');
    setDoc(escribiendoRef, { apodo: '' }, { merge: true });
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