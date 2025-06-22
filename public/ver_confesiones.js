import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, where, Timestamp, doc, updateDoc, getDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

const confesionesList = document.getElementById('confesiones-list');
let activePicker = null;
let confesionDocs = [];
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    renderConfesiones();
});

function timeAgo(timestamp) {
    if (!timestamp) return 'Ahora mismo';
    const now = new Date();
    const seconds = Math.floor((now - timestamp.toDate()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `hace ${Math.floor(interval)} años`;
    interval = seconds / 2592000;
    if (interval > 1) return `hace ${Math.floor(interval)} meses`;
    interval = seconds / 86400;
    if (interval > 1) return `hace ${Math.floor(interval)} días`;
    interval = seconds / 3600;
    if (interval > 1) return `hace ${Math.floor(interval)} horas`;
    interval = seconds / 60;
    if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
    return 'hace unos segundos';
}

function renderConfesiones() {
    if (confesionDocs.length === 0) {
        confesionesList.innerHTML = '<p class="no-confesiones">Aún no hay confesiones. ¡Sé el primero!</p>';
        return;
    }

    let html = '';
    confesionDocs.forEach(doc => {
        const confesion = doc.data();
        const confesionId = doc.id;

        const userReactions = confesion.userReactions || {};
        const reactionCounts = {};
        for (const uid in userReactions) {
            const emoji = userReactions[uid];
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        }

        const currentUserReaction = currentUser ? userReactions[currentUser.uid] : null;

        let reactionsHtml = Object.entries(reactionCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([emoji, count]) => {
                const isUserReaction = emoji === currentUserReaction;
                return `<div class="reaction-bubble ${isUserReaction ? 'user-reacted' : ''}">${emoji} ${count}</div>`;
            })
            .join('');

        html += `
            <div class="confesion-card" data-id="${confesionId}">
                <div class="card-header">
                    <h3>ANONIMO(A)</h3>
                    <button class="react-btn" title="Reaccionar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                    </button>
                </div>
                <p class="confesion-texto">${confesion.texto}</p>
                <div class="reactions-container">${reactionsHtml}</div>
                <span class="confesion-fecha">Publicado ${timeAgo(confesion.timestamp)}</span>
            </div>
        `;
    });
    confesionesList.innerHTML = html;
}

confesionesList.addEventListener('click', async (e) => {
    const button = e.target.closest('.react-btn');
    if (!button) return;

    e.stopPropagation();

    if (activePicker) {
        activePicker.remove();
        activePicker = null;
    }
    
    if (!currentUser) {
        alert("Debes iniciar sesión en la sala para poder reaccionar.");
        return;
    }

    const confesionCard = e.target.closest('.confesion-card');
    const confesionId = confesionCard.dataset.id;
    
    const picker = document.createElement('emoji-picker');
    picker.classList.add('emoji-picker-popup');
    document.body.appendChild(picker);
    activePicker = picker;

    const rect = button.getBoundingClientRect();
    const pickerHeight = 450; // Approximate height of the emoji picker
    const pickerWidth = 320;  // Approximate width
    const margin = 10;        // Margin from screen edges

    let top = rect.bottom + margin;
    let left = rect.right - pickerWidth;

    // 1. Check if it fits below the button
    if (top + pickerHeight > window.innerHeight) {
        // If not, place it above
        top = rect.top - pickerHeight - margin;
    }

    // 2. Check if it fits on the left of the button
    if (left < margin) {
        left = margin;
    }
    
    // 3. Final check: If it's still going off-screen vertically, pin it to the top
    if (top < margin) {
        top = margin;
    }

    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;

    picker.addEventListener('emoji-click', async (event) => {
        const emoji = event.detail.unicode;
        const docRef = doc(db, 'confesiones', confesionId);
        
        try {
            const docSnap = await getDoc(docRef);
            const userReactions = docSnap.data().userReactions || {};
            const existingReaction = userReactions[currentUser.uid];

            if (existingReaction === emoji) {
                await updateDoc(docRef, { [`userReactions.${currentUser.uid}`]: deleteField() });
            } else {
                await updateDoc(docRef, { [`userReactions.${currentUser.uid}`]: emoji });
            }
        } catch (error) {
            console.error("Error al reaccionar:", error);
        } finally {
            if (activePicker) {
                activePicker.remove();
                activePicker = null;
            }
        }
    });
});

document.addEventListener('click', () => {
    if (activePicker) {
        activePicker.remove();
        activePicker = null;
    }
});

const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const q = query(
    collection(db, 'confesiones'), 
    where("timestamp", ">", Timestamp.fromDate(twentyFourHoursAgo)),
    orderBy('timestamp', 'desc')
);

onSnapshot(q, (querySnapshot) => {
    confesionDocs = querySnapshot.docs;
    renderConfesiones();
}, (error) => {
    console.error("Error al obtener confesiones: ", error);
    confesionesList.innerHTML = '<p class="no-confesiones">Error al cargar las confesiones. Intenta recargar la página.</p>';
}); 