import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const auth = getAuth(app);

// Botón para ir al dashboard
document.getElementById('btnIrAlDashboard').addEventListener('click', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "dashboard.html";
        } else {
            window.location.href = "index.html";
        }
    });
});

// --- FUNCIÓN: Cargar próxima carrera y actualizar contador ---
async function cargarProximaCarrera() {
    try {
        const carrerasSnap = await getDocs(collection(db, "carreras"));
        let carreras = [];
        
        carrerasSnap.forEach(doc => {
            carreras.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar por orden (ronda)
        carreras.sort((a, b) => a.orden - b.orden);

        // Buscar la próxima carrera que NO esté completada
        let proximaCarrera = carreras.find(c => c.estado !== "completada");
        
        if (!proximaCarrera) {
            // Si todas están completadas, mostrar la última
            proximaCarrera = carreras[carreras.length - 1];
        }

        if (proximaCarrera) {
            // Mostrar info del GP
            const nomGP = document.getElementById('nombre-gp');
            nomGP.innerText = `${proximaCarrera.nombre_gp} (${proximaCarrera.bandera}) - ${proximaCarrera.circuito}`;

            // Iniciar contador si NO está completada
            if (proximaCarrera.estado !== "completada") {
                iniciarContador(proximaCarrera.fecha);
            } else {
                // Si es completada, mostrar resultado
                document.getElementById('carrera-titulo').innerText = "Última Carrera";
                document.getElementById('contador-container').innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center;">
                        <p style="color: #10b981; font-weight: 900; font-size: 18px;">✓ CARRERA COMPLETADA</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Error cargando próxima carrera: ", error);
    }
}

// --- FUNCIÓN: Contador regresivo ---
function iniciarContador(fechaCarrera) {
    function actualizar() {
        const ahora = new Date().getTime();
        const target = new Date(fechaCarrera).getTime();
        const distancia = target - ahora;

        if (distancia > 0) {
            const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
            const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

            document.getElementById('dias').innerText = String(dias).padStart(2, '0');
            document.getElementById('horas').innerText = String(horas).padStart(2, '0');
            document.getElementById('minutos').innerText = String(minutos).padStart(2, '0');
            document.getElementById('segundos').innerText = String(segundos).padStart(2, '0');
        } else {
            document.getElementById('carrera-titulo').innerText = "🚩 ¡Carrera en Marcha!";
            document.getElementById('contador-container').innerHTML = `
                <div style="grid-column: 1/-1; text-align: center;">
                    <p style="color: #ef4444; font-weight: 900; font-size: 20px; animation: pulse 1s infinite;">● EN DIRECTO</p>
                </div>
            `;
        }
    }

    actualizar();
    setInterval(actualizar, 1000);
}

// --- FUNCIÓN: Cargar Top 5 Pilotos y Top 3 Equipos ---
async function cargarClasificacion() {
    try {
        // 1. Cargar equipos con colores
        const equiposSnap = await getDocs(collection(db, "equipos"));
        const coloresEquipos = {};
        equiposSnap.forEach(doc => {
            coloresEquipos[doc.id] = doc.data().color || "#ffffff";
        });

        // 2. Cargar pilotos
        const pilotosSnap = await getDocs(collection(db, "pilotos"));
        let pilotosArray = [];
        pilotosSnap.forEach(doc => {
            let p = doc.data();
            p.puntos = p.puntos || 0;
            p.equipo_id = p.equipo_id || "sin-equipo";
            pilotosArray.push(p);
        });

        // Ordenar y obtener TOP 5
        pilotosArray.sort((a, b) => b.puntos - a.puntos);
        const top5 = pilotosArray.slice(0, 5);

        // Renderizar TOP 5
        const topPilotosDiv = document.getElementById('top-pilotos');
        topPilotosDiv.innerHTML = "";
        top5.forEach((p, index) => {
            const colorEquipo = coloresEquipos[p.equipo_id] || "#fff";
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255,255,255,0.02);
                border-left: 4px solid ${colorEquipo};
                border: 1px solid var(--border);
                border-left: 4px solid ${colorEquipo};
                border-radius: 8px;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            card.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-weight: 900; color: var(--accent); min-width: 24px;">${index + 1}.</span>
                    <div>
                        <div style="font-weight: 700; color: var(--text);">${p.apellido}</div>
                        <div style="font-size: 12px; color: #9ca3af;">${p.nombre}</div>
                    </div>
                </div>
                <div style="font-weight: 900; color: #10b981; font-size: 14px;">${p.puntos} pts</div>
            `;
            topPilotosDiv.appendChild(card);
        });

        // --- TOP 3 EQUIPOS ---
        // Calcular puntos por equipo
        const equiposPuntos = {};
        pilotosArray.forEach(p => {
            if (!equiposPuntos[p.equipo_id]) {
                equiposPuntos[p.equipo_id] = 0;
            }
            equiposPuntos[p.equipo_id] += p.puntos;
        });

        let equiposArray = Object.keys(equiposPuntos).map(id => ({
            id: id,
            puntos: equiposPuntos[id]
        }));
        equiposArray.sort((a, b) => b.puntos - a.puntos);
        const top3 = equiposArray.slice(0, 3);

        // Renderizar TOP 3
        const topEquiposDiv = document.getElementById('top-equipos');
        topEquiposDiv.innerHTML = "";
        top3.forEach(async (eq, index) => {
            // Obtener nombre del equipo
            const equipoRef = await getDocs(collection(db, "equipos"));
            let nombreEquipo = "Sin equipo";
            equipoRef.forEach(doc => {
                if (doc.id === eq.id) {
                    nombreEquipo = doc.data().nombre;
                }
            });

            const colorEquipo = coloresEquipos[eq.id] || "#fff";
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255,255,255,0.02);
                border-left: 4px solid ${colorEquipo};
                border: 1px solid var(--border);
                border-left: 4px solid ${colorEquipo};
                border-radius: 8px;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            card.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-weight: 900; color: var(--accent); min-width: 24px;">${index + 1}.</span>
                    <div style="font-weight: 700; color: var(--text);">${nombreEquipo}</div>
                </div>
                <div style="font-weight: 900; color: #10b981; font-size: 14px;">${eq.puntos} pts</div>
            `;
            topEquiposDiv.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando clasificación: ", error);
    }
}

// --- INICIAR TODO AL CARGAR ---
cargarProximaCarrera();
cargarClasificacion();
