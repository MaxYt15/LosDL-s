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

// --- Chat flotante IA DLS ---
window.addEventListener('DOMContentLoaded', () => {
  const chatBtn = document.getElementById('dls-chat-btn');
  const chatWindow = document.getElementById('dls-chat-window');
  const chatMessages = document.getElementById('dls-chat-messages');
  const chatForm = document.getElementById('dls-chat-form');
  const chatInput = document.getElementById('dls-chat-input');

  if (!chatBtn) return;

  let chatOpen = false;
  let history = [
    { role: 'model', text: 'Hola, soy DLS, ¿en qué te puedo ayudar?' }
  ];
  let estadoMensaje = '';
  let iaEscribiendo = false;

  function parseMarkdown(text) {
    // Negrita: **texto** o __texto__
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    text = text.replace(/__(.*?)__/g, '<b>$1</b>');
    // Cursiva: *texto* o _texto_
    text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
    text = text.replace(/_(.*?)_/g, '<i>$1</i>');
    // Saltos de línea
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  function renderMessages() {
    chatMessages.innerHTML = '';
    history.forEach((msg, i) => {
      const bubble = document.createElement('div');
      bubble.className = 'dls-msg-bubble ' + (msg.role === 'user' ? 'user' : 'ia');
      // Icono avatar
      const avatar = document.createElement('div');
      avatar.className = 'dls-avatar';
      avatar.innerHTML = msg.role === 'user' ? '<i class="fa fa-user"></i>' : '<i class="fa fa-robot"></i>';
      // Mensaje
      const msgDiv = document.createElement('div');
      msgDiv.className = 'dls-msg';
      msgDiv.innerHTML = parseMarkdown(msg.text);
      bubble.appendChild(avatar);
      bubble.appendChild(msgDiv);
      chatMessages.appendChild(bubble);
      // Estado debajo del último mensaje
      if (i === history.length - 1 && estadoMensaje) {
        const estadoDiv = document.createElement('div');
        estadoDiv.className = 'dls-msg-estado' + (msg.role === 'user' ? ' user' : '');
        estadoDiv.textContent = estadoMensaje;
        chatMessages.appendChild(estadoDiv);
      }
    });
    // Simulación de escribiendo...
    if (iaEscribiendo) {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'dls-typing';
      typingDiv.innerHTML = '<div class="dls-avatar"><i class="fa fa-robot"></i></div>' +
        '<div class="dls-typing-dots"><span></span><span></span><span></span></div>';
      chatMessages.appendChild(typingDiv);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Construye el historial para el prompt
  function construirHistorialParaPrompt() {
    // Solo los últimos 6 mensajes (3 pares pregunta-respuesta) para no saturar el prompt
    const ultimos = history.slice(-6);
    let historial = '';
    ultimos.forEach(msg => {
      if (msg.role === 'user') {
        historial += `Usuario: ${msg.text}\n`;
      } else {
        historial += `DLS: ${msg.text}\n`;
      }
    });
    return historial;
  }

  chatBtn.onclick = () => {
    chatOpen = !chatOpen;
    chatWindow.style.display = chatOpen ? 'flex' : 'none';
    if (chatOpen) {
      // Si la IA ya respondió, mostrar "Visto"
      if (history.length > 1 && history[history.length-1].role === 'model') {
        estadoMensaje = 'Visto';
        renderMessages();
      } else {
        renderMessages();
      }
    } else {
      // Al cerrar el chat, borra la memoria temporal
      history = [
        { role: 'model', text: 'Hola, soy DLS, ¿en qué te puedo ayudar?' }
      ];
      estadoMensaje = '';
      iaEscribiendo = false;
    }
  };

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const question = chatInput.value.trim();
    if (!question) return;
    history.push({ role: 'user', text: question });
    estadoMensaje = 'Enviando...';
    renderMessages();
    chatInput.value = '';
    iaEscribiendo = true;
    renderMessages();
    // Prompt personalizado con memoria temporal
    const historial = construirHistorialParaPrompt();
    const prompt = `Eres una IA llamada DLS, responde de forma breve y clara dudas sobre esta página web llamada LosDL's. La página trata sobre charlar con miembros de la comunidad, poner música o video para todos, hacer confesiones anónimas y divertirse chateando. La página está en desarrollo, el dueño es GaboDL y el creador es Sunkovv. Cuando respondas, NO antepongas tu nombre ni "DLS:" al inicio, solo responde directamente y de forma natural. Si el usuario pregunta explícitamente quién te creó, quién es tu creador, quién te programó o algo similar, responde: "Fui creada por TEAM DLS". En cualquier otro caso, no menciones a tu creador ni a TEAM DLS.\n\nHistorial reciente:\n${historial}\nUsuario: ${question}`;
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAUtav2IgZWsZIi6u2tqjJyDfTxnuDBfSs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await res.json();
      let answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no pude responder en este momento.';
      iaEscribiendo = false;
      history.push({ role: 'model', text: answer });
      estadoMensaje = 'Visto';
      renderMessages();
    } catch (err) {
      iaEscribiendo = false;
      history.push({ role: 'model', text: 'Ocurrió un error al conectar con la IA.' });
      estadoMensaje = '';
      renderMessages();
    }
  };
});

// --- Animación fondo dark waves y partículas ---
window.addEventListener('DOMContentLoaded', () => {
  // Animar el fondo SVG
  const ell1 = document.getElementById('dls-ell1');
  const ell2 = document.getElementById('dls-ell2');
  let t = 0;
  function animateWaves() {
    t += 0.016;
    if (ell1 && ell2) {
      ell1.setAttribute('cy', 200 + Math.sin(t) * 30);
      ell1.setAttribute('rx', 320 + Math.cos(t/2) * 40);
      ell2.setAttribute('cy', 700 + Math.cos(t/1.5) * 40);
      ell2.setAttribute('rx', 400 + Math.sin(t/2) * 50);
    }
    requestAnimationFrame(animateWaves);
  }
  animateWaves();

  // Partículas sutiles
  const bgAnim = document.getElementById('dls-bg-anim');
  if (bgAnim) {
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'dls-bg-particle';
      p.style.left = Math.random()*100 + 'vw';
      p.style.top = Math.random()*100 + 'vh';
      p.style.width = p.style.height = (8 + Math.random()*18) + 'px';
      p.style.opacity = 0.12 + Math.random()*0.18;
      p.style.animationDuration = (8 + Math.random()*10) + 's';
      bgAnim.appendChild(p);
    }
  }
}); 