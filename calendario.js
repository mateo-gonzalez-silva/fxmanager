// Calendario.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAE1PLVdULmXqkscQb9jK8gAkXbjIBETbk",
    authDomain: "fxmanager-c5868.firebaseapp.com",
    projectId: "fxmanager-c5868",
    storageBucket: "fxmanager-c5868.appspot.com",
    messagingSenderId: "652487009924",
    appId: "1:652487009924:web:c976804d6b48c4dda004d1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Caché de datos
let pilotosMap = {};
let equiposMap = {};

document.addEventListener("DOMContentLoaded", async () => {
    // Nav logic
    const navDashboard = document.getElementById("nav-dashboard");
    onAuthStateChanged(auth, (user) => {
        if (user && navDashboard) navDashboard.style.display = "inline-block";
    });

    await cargarDatosBase();
    cargarCalendario();
});

async function cargarDatosBase() {
    // Cargar Pilotos
    const pSnap = await getDocs(collection(db, "pilotos"));
    pSnap.forEach(d => {
        const p = d.data();
        pilotosMap[d.id] = { nombre: p.nombre, apellido: p.apellido || '', equipoId: p.equipoId };
    });

    // Cargar Equipos
    const eSnap = await getDocs(collection(db, "equipos"));
    eSnap.forEach(d => {
        const e = d.data();
        equiposMap[d.id] = { nombre: e.nombre, color: e.color || '#fff' };
    });
}

async function cargarCalendario() {
    const grid = document.getElementById("grid-calendario");
    try {
        const q = query(collection(db, "carreras"), orderBy("ronda", "asc"));
        const snapshot = await getDocs(q);

        grid.innerHTML = "";
        
        if(snapshot.empty) {
            grid.innerHTML = "<p class='text-muted' style='text-align:center;'>No hay carreras programadas.</p>";
            return;
        }

        snapshot.forEach(docSnap => {
            const c = docSnap.data();
            const fecha = new Date(c.fecha).toLocaleDateString("es-ES", { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' });
            
            let estadoHTML = `<span class="race-status status-pending">📅 Pendiente</span>`;
            let botonHTML = `<button class="btn-outline" disabled style="opacity:0.5; cursor:not-allowed;">Esperando resultados</button>`;

            if (c.completada || c.test) {
                if (c.test) {
                    estadoHTML = `<span class="race-status status-done">Terminado</span>`;
                } else {
                    // Información de primer puesto
                    let nombreGanador = "Desconocido";
                    let colorGanador = "var(--border-color)";
                    let infoExtra = "";

                    const ganadorId = c.resultados_20 ? c.resultados_20[0] : null;
                    if (ganadorId && pilotosMap[ganadorId]) {
                        const p = pilotosMap[ganadorId];
                        nombreGanador = `${p.nombre} ${p.apellido}`;
                        const eq = equiposMap[p.equipoId];
                        if(eq) colorGanador = eq.color;
                        const idx = c.resultados_20.indexOf(ganadorId);
                        const t = c.resultados_tiempo && c.resultados_tiempo[idx];
                        const v = c.resultados_vueltas && c.resultados_vueltas[idx];
                        if (t) infoExtra += `${t}`;
                        if (v) infoExtra += (infoExtra? ' / ' : '') + `${v}v`;
                    }

                    estadoHTML = `
                        <div style="text-align:right;">
                            <span style="display:block; font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase;">
                                Terminado
                            </span>
                            <strong style="color:${colorGanador}; font-size:1.1rem;">
                                🏆 ${nombreGanador}
                            </strong>
                            ${infoExtra ? `<div style="font-size:0.7rem; color:var(--text-secondary);">${infoExtra}</div>` : ''}
                        </div>
                    `;
                }

                const dataString = encodeURIComponent(JSON.stringify(c));
                botonHTML = `<button class="btn-solid" onclick="abrirDetalles('${dataString}')">Ver Resultados</button>`;
            }

            grid.innerHTML += `
                <div class="race-card">
                    <div class="race-info">
                        <div class="race-round">${c.ronda}</div>
                        <div class="race-details">
                            <h2>${c.nombre}</h2>
                            <p>${c.circuito} • ${fecha}</p>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:20px;">
                        ${estadoHTML}
                        ${botonHTML}
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error(error);
        grid.innerHTML = "<p>Error al cargar el calendario.</p>";
    }
}

// Función global para abrir el modal (se llama desde el HTML generado)
window.abrirDetalles = (dataEncoded) => {
    const data = JSON.parse(decodeURIComponent(dataEncoded));
    
    document.getElementById("modal-titulo").textContent = `${data.nombre} - Resultados`;
    // banner test
    const banner = document.getElementById("modal-test-banner");
    banner.textContent = data.test ? '🔧 Carrera de prueba (no puntúa)' : '';
    // si es test ocultar tabs de qualy/carrera aquí también
    if (data.test) {
        document.querySelectorAll('#modal-detalles .btn-outline').forEach((b, idx) => {
            if (idx > 0) b.style.display = 'none';
        });
        document.getElementById('view-qual').style.display = 'none';
        document.getElementById('view-race').style.display = 'none';
        document.getElementById('view-prac').style.display = 'block';
        // saltar la llamada posterior a verPestana
        window._skipTabSwitch = true;
    } else {
        document.querySelectorAll('#modal-detalles .btn-outline').forEach((b) => b.style.display = 'inline-block');
        window._skipTabSwitch = false;
    }
    
    // Info Pole y VR
    const divPole = document.getElementById("info-pole");
    const divVr = document.getElementById("info-vr");
    
    const getPilotoHTML = (pid) => {
        if(!pid || !pilotosMap[pid]) return "N/A";
        const p = pilotosMap[pid];
        const e = equiposMap[p.equipoId] || {color:'#fff'};
        return `<span style="font-weight:bold; color:${e.color}">${p.nombre} ${p.apellido}</span>`;
    };

    divPole.innerHTML = `<span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase;">Pole Position</span><br>${getPilotoHTML(data.pole)}`;
    divVr.innerHTML = `<span style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase;">Vuelta Rápida</span><br>${getPilotoHTML(data.vr)}`;

    // Rellenar Tablas
    llenarTabla("table-race-body", data.resultados_20, data.resultados_tiempo || [], data.resultados_vueltas || []);
    llenarTabla("table-qual-body", data.clasificacion, data.clasificacion_tiempo || [], data.clasificacion_vueltas || []);
    llenarTabla("table-prac-body", data.entrenamientos, data.entrenamientos_tiempo || [], data.entrenamientos_vueltas || []);

    // Resetear pestañas y mostrar modal
    if (!window._skipTabSwitch) window.verPestana('race'); // Función definida en el HTML
    document.getElementById("modal-detalles").style.display = "flex";
};

function llenarTabla(elementId, idList) {
    const tbody = document.getElementById(elementId);
    tbody.innerHTML = "";
    
    if (!idList || idList.length === 0 || (idList.length === 1 && idList[0] === "")) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:var(--text-secondary);'>Sin datos registrados.</td></tr>";
        return;
    }

    idList.forEach((pid, index) => {
        if (!pid) return;
        const p = pilotosMap[pid];
        const e = p ? equiposMap[p.equipoId] : null;
        
        const nombre = p ? `${p.nombre} <strong>${p.apellido}</strong>` : "Desconocido";
        const equipoNombre = e ? e.nombre : "N/A";
        const equipoColor = e ? e.color : "#fff";

        tbody.innerHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:10px; font-weight:bold;">${index + 1}</td>
                <td style="padding:10px;">${nombre}</td>
                <td style="padding:10px; color:${equipoColor}; font-weight:600;">${equipoNombre}</td>
            </tr>
        `;
    });
}