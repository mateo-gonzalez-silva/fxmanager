import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Tu configuración
const firebaseConfig = {
  apiKey: "AIzaSyAE1PLVdULmXqkscQb9jK8gAkXbjIBETbk",
  authDomain: "fxmanager-c5868.firebaseapp.com",
  projectId: "fxmanager-c5868",
  storageBucket: "fxmanager-c5868.firebasestorage.app",
  messagingSenderId: "652487009924",
  appId: "1:652487009924:web:c976804d6b48c4dda004d1",
  measurementId: "G-XK03CWHZEK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const btnRegistro = document.getElementById('btnRegistro');
const mensaje = document.getElementById('mensaje');

btnRegistro.addEventListener('click', async () => {
    const nombre = document.getElementById('nombreManager').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validaciones básicas
    if (!nombre || !email || !password) {
        mostrarError("Por favor, rellena todos los campos de la solicitud.");
        return;
    }
    if (password.length < 6) {
        mostrarError("La contraseña es muy débil (mínimo 6 caracteres).");
        return;
    }

    mensaje.style.color = "#e6b800";
    mensaje.innerText = "Procesando solicitud en la FIA...";

    try {
        // 1. Crear el usuario en Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Guardar el nombre del manager (Display Name)
        // Esto es genial porque no necesitamos base de datos para saber su nombre
        await updateProfile(user, {
            displayName: nombre
        });

        mensaje.style.color = "#00C851";
        mensaje.innerText = "¡Licencia aprobada! Redirigiendo...";

        // 3. Enviar a elegir equipo inmediatamente
        setTimeout(() => {
            window.location.href = "seleccion.html";
        }, 1500);

    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            mostrarError("Este correo ya tiene una licencia activa.");
        } else if (error.code === 'auth/invalid-email') {
            mostrarError("El formato del correo no es válido.");
        } else {
            mostrarError("Error: " + error.message);
        }
    }
});

function mostrarError(texto) {
    mensaje.style.color = "#ff4444";
    mensaje.innerText = texto;
}