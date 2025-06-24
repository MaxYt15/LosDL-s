// ChatVoz.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, addDoc, getDocs, updateDoc, getDoc, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
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
const auth = getAuth(app);

// --- Variables globales ---
let localStream = null;
let peerConnections = {};
let userId = null;
let userName = null;
let isMuted = true;
const roomId = "voz";
const usersCol = collection(db, "voz-users");
const signalsCol = collection(db, "voz-signals");
const mensajesCol = collection(db, "voz-mensajes");

// --- UI Elements ---
const usersList = document.getElementById("voz-users-list");
const micBtn = document.getElementById("voz-mic-btn");
const statusDiv = document.getElementById("voz-status");
const chatMensajesDiv = document.getElementById("voz-chat-mensajes");
const chatForm = document.getElementById("voz-chat-form");
const chatInput = document.getElementById("voz-chat-input");

// --- Utilidades ---
function randomId() {
  return Math.random().toString(36).substr(2, 9);
}

// Generar color único por usuario (estilo Discord)
function colorPorUID(uid) {
  // Paleta de colores vibrantes
  const colores = [
    '#bfff00', // verde limón
    '#00f2ea', // celeste
    '#ffb300', // naranja
    '#ff3b3b', // rojo
    '#a259ff', // violeta
    '#00ff99', // verde neón
    '#ff61a6', // rosa
    '#ffd600', // amarillo
    '#1de9b6', // turquesa
    '#f50057', // magenta
    '#2979ff', // azul
    '#76ff03'  // verde claro
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colores.length;
  return colores[idx];
}

// Verificados
const VERIFICADOS = {
  "K0PRXXhG4MeCWS9Gep5JpdxD0Nn2": true, // Sunkovv
  "Djw6e2jIFhZmMUdyNgYloYecZOL2": true  // ByGaboDL
};
const VERIFICADO_ICON = `<span class="verificado-icon" title="Verificado"> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#00f2ea"/><path d="M7 13l3 3 7-7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

// --- Inicialización ---
async function joinRoom(apodo, uid) {
  userName = apodo;
  userId = uid;
  await setDoc(doc(usersCol, userId), {
    name: userName,
    joined: Date.now(),
    talking: false,
    mute: true
  });
  statusDiv.textContent = "Conectado";
  listenUsers();
  listenSignals();
  await startMic(false); // No activar micrófono al entrar
  mostrarMensajes();
  borrarMensajesSiNoUsuarios();
  detectarHablaLocal();
}

// --- Usuarios conectados ---
function mostrarNotificacionUsuario(nombre, tipo = 'join') {
  let toast = document.createElement('div');
  toast.className = 'voz-toast';
  toast.textContent = tipo === 'join'
    ? `${nombre} se ha unido a la sala de voz`
    : `${nombre} ha salido de la sala de voz`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(()=>toast.remove(), 500);
  }, 3000);
}

let usuariosPrevios = new Set();
function listenUsers() {
  onSnapshot(usersCol, (snapshot) => {
    const nuevos = new Set();
    snapshot.forEach(docu => {
      nuevos.add(docu.id);
    });
    // Detectar nuevos usuarios (excepto tú mismo)
    if (usuariosPrevios.size > 0) {
      // Usuarios que entran
      snapshot.forEach(docu => {
        if (!usuariosPrevios.has(docu.id) && docu.id !== userId) {
          mostrarNotificacionUsuario(docu.data().name, 'join');
        }
      });
      // Usuarios que salen
      usuariosPrevios.forEach(prevId => {
        if (!nuevos.has(prevId) && prevId !== userId) {
          mostrarNotificacionUsuario(prevId, 'leave');
        }
      });
    }
    usuariosPrevios = nuevos;
    usersList.innerHTML = "";
    snapshot.forEach(docu => {
      const data = docu.data();
      const div = document.createElement("div");
      div.className = "voz-user" + (data.talking && !data.mute ? " hablando" : "");
      let icono = VERIFICADOS[docu.id] ? VERIFICADO_ICON : "";
      let micIcon = "<i class='fas fa-microphone-slash voz-mic-mute'></i>";
      if (!data.mute && data.talking) {
        micIcon = "<i class='fas fa-microphone voz-mic-on'></i>";
      } else if (!data.mute && !data.talking) {
        micIcon = "<i class='fas fa-microphone voz-mic-idle'></i>";
      }
      // Color único para el nombre
      const colorNombre = colorPorUID(docu.id);
      div.innerHTML = `
        <span class=\"voz-vol-icon\" id=\"voz-vol-${docu.id}\">${micIcon}</span>
        <i class='fas fa-user'></i> <span class=\"voz-nombre\" style=\"color:${colorNombre}\">${data.name}</span>${icono}${docu.id === userId ? ` <span class=\"voz-tu\" style=\"color:${colorNombre};font-weight:bold;z-index:30;\">(Tú)</span>` : ""}`;
      div.setAttribute('data-uid', docu.id);
      usersList.appendChild(div);
    });
    if (localStream && !isMuted) {
      detectarHablaLocal();
    }
  });
}

// --- Señalización WebRTC ---
function listenSignals() {
  onSnapshot(signalsCol, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const data = change.doc.data();
      if (data.to !== userId) return;
      if (data.type === "offer") {
        await handleOffer(data);
      } else if (data.type === "answer") {
        await handleAnswer(data);
      } else if (data.type === "ice") {
        await handleIce(data);
      }
      // Borra la señal después de procesarla
      await deleteDoc(doc(signalsCol, change.doc.id));
    });
  });
}

async function sendSignal(to, type, payload) {
  await addDoc(signalsCol, {
    from: userId,
    to,
    type,
    payload
  });
}

// --- WebRTC ---
async function startMic(active) {
  if (active) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micBtn.classList.remove("off");
      micBtn.classList.add("on");
      micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      statusDiv.textContent = "Conectado";
      isMuted = false;
      await updateDoc(doc(usersCol, userId), { talking: true, mute: false });
      callAllPeers();
      detectarHablaLocal();
    } catch (e) {
      statusDiv.textContent = "Error al acceder al micrófono.";
      micBtn.classList.add("off");
      micBtn.classList.remove("on");
      micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
      isMuted = true;
      await updateDoc(doc(usersCol, userId), { talking: false, mute: true });
    }
  } else {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    micBtn.classList.add("off");
    micBtn.classList.remove("on");
    micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    statusDiv.textContent = "Micrófono desactivado.";
    isMuted = true;
    await updateDoc(doc(usersCol, userId), { talking: false, mute: true });
    closeAllPeers();
  }
}

micBtn.addEventListener("click", () => {
  startMic(isMuted);
});

window.addEventListener("beforeunload", async () => {
  await deleteDoc(doc(usersCol, userId));
  closeAllPeers();
});

// --- Peer Connections ---
async function callAllPeers() {
  const users = await getDocs(usersCol);
  users.forEach(async (docu) => {
    const peerId = docu.id;
    if (peerId === userId) return;
    if (peerConnections[peerId]) return;
    await createPeer(peerId, true);
  });
}

async function createPeer(peerId, isInitiator) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });
  peerConnections[peerId] = pc;

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal(peerId, "ice", event.candidate);
    }
  };

  pc.ontrack = (event) => {
    let audio = document.getElementById("audio-" + peerId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "audio-" + peerId;
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = event.streams[0];
    detectarHablaRemoto(peerId, event.streams[0]);
  };

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(peerId, "offer", offer);
  }
}

async function handleOffer(data) {
  const from = data.from;
  if (peerConnections[from]) return;
  const pc = await createPeer(from, false);
  await peerConnections[from].setRemoteDescription(new RTCSessionDescription(data.payload));
  const answer = await peerConnections[from].createAnswer();
  await peerConnections[from].setLocalDescription(answer);
  sendSignal(from, "answer", answer);
}

async function handleAnswer(data) {
  const from = data.from;
  if (!peerConnections[from]) return;
  await peerConnections[from].setRemoteDescription(new RTCSessionDescription(data.payload));
}

async function handleIce(data) {
  const from = data.from;
  if (!peerConnections[from]) return;
  try {
    await peerConnections[from].addIceCandidate(new RTCIceCandidate(data.payload));
  } catch (e) {}
}

function closeAllPeers() {
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  // Elimina todos los audios remotos
  document.querySelectorAll("audio[id^='audio-']").forEach(a => a.remove());
}

// --- Iniciar: obtener apodo del usuario autenticado ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const apodoDoc = await getDoc(doc(db, 'apodos', user.uid));
    if (apodoDoc.exists()) {
      joinRoom(apodoDoc.data().apodo, user.uid);
    } else {
      statusDiv.textContent = "No tienes apodo registrado. Vuelve a la sala principal.";
      setTimeout(() => window.location.href = 'sala.html', 2500);
    }
  } else {
    statusDiv.textContent = "Debes iniciar sesión para usar el chat de voz.";
    setTimeout(() => window.location.href = 'sala.html', 2500);
  }
});

// --- Chat de texto ---
function mostrarMensajes() {
  const q = query(mensajesCol, orderBy("timestamp"));
  onSnapshot(q, async (snapshot) => {
    chatMensajesDiv.innerHTML = "";
    const now = Date.now();
    let mensajesViejos = [];
    snapshot.forEach(docu => {
      const data = docu.data();
      // Borrar mensajes de más de 24h
      if (data.timestamp && now - data.timestamp.toMillis() > 24*60*60*1000) {
        mensajesViejos.push(docu.id);
        return;
      }
      const div = document.createElement("div");
      div.style.marginBottom = "0.5em";
      let icono = VERIFICADOS[data.uid] ? VERIFICADO_ICON : "";
      div.innerHTML = `<b style='color:#00ff99'>${data.name}${icono}:</b> <span style='color:#fff'>${data.text}</span> <span style='font-size:0.8em;color:#888'>${timeAgo(data.timestamp)}</span>`;
      chatMensajesDiv.appendChild(div);
    });
    // Borrar mensajes viejos
    for (const id of mensajesViejos) {
      await deleteDoc(doc(mensajesCol, id));
    }
    // Scroll al final
    chatMensajesDiv.scrollTop = chatMensajesDiv.scrollHeight;
  });
}

// Enviar mensaje
if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    await addDoc(mensajesCol, {
      name: userName,
      uid: userId,
      text,
      timestamp: serverTimestamp()
    });
    chatInput.value = "";
  });
}

// Borrar mensajes si no hay usuarios conectados
function borrarMensajesSiNoUsuarios() {
  onSnapshot(usersCol, async (snapshot) => {
    if (snapshot.size === 0) {
      const mensajes = await getDocs(mensajesCol);
      mensajes.forEach(async (docu) => {
        await deleteDoc(doc(mensajesCol, docu.id));
      });
    }
  });
}

function timeAgo(ts) {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts.toMillis();
  if (diff < 60*1000) return "hace unos segundos";
  if (diff < 60*60*1000) return `hace ${Math.floor(diff/60000)} min`;
  if (diff < 24*60*60*1000) return `hace ${Math.floor(diff/3600000)} h`;
  return "hace más de un día";
}

// --- Simulador visual de quién está hablando ---
let analyser, micSource, audioContext;
function detectarHablaLocal() {
  if (!localStream || isMuted) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  micSource = audioContext.createMediaStreamSource(localStream);
  analyser = audioContext.createAnalyser();
  micSource.connect(analyser);
  analyser.fftSize = 512;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  function checkVolume() {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a,b) => a+b, 0) / dataArray.length;
    const icon = document.getElementById(`voz-vol-${userId}`);
    if (icon) {
      let iconClass = "voz-mic-silencio";
      let iconHtml = "<i class='fas fa-microphone-slash'></i>";
      if (avg < 10) {
        iconClass = "voz-mic-silencio";
        iconHtml = "<i class='fas fa-microphone-slash'></i>";
      } else if (avg < 30) {
        iconClass = "voz-mic-bajo";
        iconHtml = "<i class='fas fa-microphone'></i>";
      } else if (avg < 60) {
        iconClass = "voz-mic-normal";
        iconHtml = "<i class='fas fa-microphone'></i>";
      } else {
        iconClass = "voz-mic-fuerte";
        iconHtml = "<i class='fas fa-microphone'></i>";
      }
      icon.innerHTML = iconHtml;
      const iTag = icon.querySelector('i');
      iTag.classList.remove('voz-mic-silencio', 'voz-mic-bajo', 'voz-mic-normal', 'voz-mic-fuerte');
      iTag.classList.add(iconClass);
    }
    requestAnimationFrame(checkVolume);
  }
  checkVolume();
}

// Para remotos
function detectarHablaRemoto(peerId, stream) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyserR = audioCtx.createAnalyser();
  source.connect(analyserR);
  analyserR.fftSize = 512;
  const dataArray = new Uint8Array(analyserR.frequencyBinCount);
  function checkVolume() {
    analyserR.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a,b) => a+b, 0) / dataArray.length;
    const icon = document.getElementById(`voz-vol-${peerId}`);
    if (icon) {
      let iconClass = "voz-mic-silencio";
      let iconHtml = "<i class='fas fa-microphone-slash'></i>";
      if (avg < 10) {
        iconClass = "voz-mic-silencio";
        iconHtml = "<i class='fas fa-microphone-slash'></i>";
      } else if (avg < 30) {
        iconClass = "voz-mic-bajo";
        iconHtml = "<i class='fas fa-microphone'></i>";
      } else if (avg < 60) {
        iconClass = "voz-mic-normal";
        iconHtml = "<i class='fas fa-microphone'></i>";
      } else {
        iconClass = "voz-mic-fuerte";
        iconHtml = "<i class='fas fa-microphone'></i>";
      }
      icon.innerHTML = iconHtml;
      icon.querySelector('i').classList.add(iconClass);
    }
    requestAnimationFrame(checkVolume);
  }
  checkVolume();
}
 