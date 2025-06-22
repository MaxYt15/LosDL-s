import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const confesionForm = document.getElementById('confesion-form');
const confesionInput = document.getElementById('confesion-input');
const charCount = document.getElementById('char-count');
const floatingAlert = document.getElementById('floating-alert');
const successModal = document.getElementById('success-modal');

function showFloatingAlert(message) {
    if (!floatingAlert) return;
    floatingAlert.textContent = message;
    floatingAlert.classList.add('show');
    setTimeout(() => {
        floatingAlert.classList.remove('show');
    }, 4000);
}

if (confesionInput && charCount) {
    confesionInput.addEventListener('input', () => {
        const count = confesionInput.value.length;
        charCount.textContent = count;
    });
}

if (confesionForm) {
    confesionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const confesionText = confesionInput.value.trim();
        
        if (confesionText.length === 0) {
            showFloatingAlert("La confesión no puede estar vacía.");
            return;
        }

        const submitButton = confesionForm.querySelector('button');
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            await addDoc(collection(db, 'confesiones'), {
                texto: confesionText,
                timestamp: serverTimestamp()
            });
            
            if (successModal) {
                successModal.classList.add('show');
                setTimeout(() => {
                    successModal.classList.remove('show');
                }, 4000);
            } else {
                showFloatingAlert("¡Confesión enviada con éxito!");
            }
            
            confesionInput.value = '';
            if (charCount) charCount.textContent = 0;

        } catch (error) {
            console.error("Error al enviar la confesión: ", error);
            showFloatingAlert("Error al enviar. Inténtalo de nuevo.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Confesión';
        }
    });
} 