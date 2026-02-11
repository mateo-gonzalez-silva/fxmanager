import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

async function cargarEquipos() {
    const contenedor = document.getElementById('contenedor-equipos');
    contenedor.innerHTML = "";

    try {
        const equiposSnap = await getDocs(collection(db, "equipos"));
        
        equiposSnap.forEach(doc => {
            const eq = doc.data();
            const colorEquipo = eq.color || "#ffffff";
            // Foto de un F1 en negro por defecto si no hay url
            const cocheUrl = eq.coche_url || "https://media.formula1.com/d_default_fallback_car.png/content/dam/fom-website/teams/2024/mercedes.png.transform/4col/image.png"; 

            const card = document.createElement('div');
            card.className = 'equipo-card';
            card.style.borderTopColor = colorEquipo; 

            card.innerHTML = `
                <div class="equipo-header">
                    <h2 class="equipo-nombre" style="color: ${colorEquipo};">${eq.nombre}</h2>
                </div>
                <div class="coche-box">
                    <img src="${cocheUrl}" alt="Coche ${eq.nombre}">
                </div>
            `;
            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando equipos: ", error);
        contenedor.innerHTML = "<p>Error al abrir los boxes.</p>";
    }
}

cargarEquipos();