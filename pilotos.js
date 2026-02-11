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

async function cargarPilotos() {
    const contenedor = document.getElementById('contenedor-pilotos');
    contenedor.innerHTML = "";

    try {
        // 1. Descargamos los equipos para saber sus colores
        const equiposSnap = await getDocs(collection(db, "equipos"));
        const coloresEquipos = {}; // Guardaremos { 'ferrari': '#e10600' }
        equiposSnap.forEach(doc => {
            // Si el equipo no tiene color asignado, le ponemos blanco por defecto
            coloresEquipos[doc.id] = doc.data().color || "#ffffff"; 
        });

        // 2. Descargamos los pilotos
        const pilotosSnap = await getDocs(collection(db, "pilotos"));
        
        pilotosSnap.forEach(doc => {
            const p = doc.data();
            const colorEquipo = coloresEquipos[p.equipo_id] || "#ffffff";
            // Foto por defecto si el admin aún no ha subido una
            const fotoUrl = p.foto_url || "https://media.formula1.com/d_default_fallback_profile.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/2col/image.png"; 

            const card = document.createElement('div');
            card.className = 'piloto-card';
            card.style.borderLeftColor = colorEquipo; // Línea del color del equipo

            card.innerHTML = `
                <div class="foto-box">
                    <img src="${fotoUrl}" alt="${p.apellido}">
                </div>
                <div class="info-box">
                    <div class="numero-bandera">
                        <span class="numero">${p.numero}</span>
                        <span class="bandera">${p.bandera}</span>
                    </div>
                    <div class="nombre-box">
                        <span class="nombre">${p.nombre}</span>
                        <span class="apellido" style="color: ${colorEquipo};">${p.apellido}</span>
                    </div>
                </div>
            `;
            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando la parrilla: ", error);
        contenedor.innerHTML = "<p>Error al conectar con la FIA.</p>";
    }
}

cargarPilotos();