import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, query, where, orderBy, writeBatch, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAE1PLVdULmXqkscQb9jK8gAkXbjIBETbk",
  authDomain: "fxmanager-c5868.firebaseapp.com",
  projectId: "fxmanager-c5868",
  storageBucket: "fxmanager-c5868.appspot.com",
  messagingSenderId: "652487009924",
  appId: "1:652487009924:web:c976804d6b48c4dda004d1",
  measurementId: "G-XK03CWHZEK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CORREO_ADMIN = "mateogonsilva@gmail.com";
const puntosSistema = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

let usuarioActual = null;
let estadoActual = "abierto";
let equiposData = {};
let pilotosData = {};
let carrerasData = {};
let editandoID = null;

// --- SEGURIDAD ---
onAuthStateChanged(auth, (user) => {
    if (user && user.email === CORREO_ADMIN) {
        usuarioActual = user;
        iniciarAdmin();
    } else {
        window.location.href = "index.html";
    }
});

async function iniciarAdmin() {
    await leerEstadoCampeonato();
    await cargarEquipos();
    await cargarPilotos();
    await cargarCarreras();
    await cargarCambiosUsuarios();
    setupTabs();
}

// --- TABS ---
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// --- ESTADO CAMPEONATO (Off-season / En curso) ---
async function leerEstadoCampeonato() {
    try {
        const docRef = doc(db, "configuracion", "campeonato");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            estadoActual = docSnap.data().estado;
        } else {
            await setDoc(docRef, { estado: "offseason" });
            estadoActual = "offseason";
        }
        actualizarTextoEstado();
    } catch (e) {
        console.error("Error al leer estado del campeonato:", e);
    }
}

function actualizarTextoEstado() {
    const texto = document.getElementById('estado-texto');
    const boton = document.getElementById('btnToggleCampeonato');
    
    if (estadoActual === "curso") {
        texto.textContent = "EN CURSO";
        texto.style.color = "var(--success)";
        boton.textContent = "Finalizar Temporada (Off-season)";
    } else {
        texto.textContent = "OFF-SEASON";
        texto.style.color = "var(--warning)";
        boton.textContent = "Iniciar Temporada (En Curso)";
    }
}

document.getElementById('btnToggleCampeonato').addEventListener('click', async () => {
    const nuevoEstado = estadoActual === "curso" ? "offseason" : "curso";
    await setDoc(doc(db, "configuracion", "campeonato"), { estado: nuevoEstado });
    estadoActual = nuevoEstado;
    actualizarTextoEstado();
});

// --- EQUIPOS ---
async function cargarEquipos() {
    const tbody = document.querySelector('#tabla-equipos tbody');
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    equiposData = {};
    const snap = await getDocs(collection(db, "equipos"));
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const eq = { id: doc.id, ...doc.data() };
        equiposData[doc.id] = eq;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: ${eq.color || 'var(--accent)'};">${eq.nombre}</strong></td>
            <td>$${(eq.presupuesto || 0).toLocaleString()}</td>
            <td>${eq.owner_uid ? '✓ Asignado' : '⊘ Libre'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-sm" onclick="editarEquipo('${doc.id}')">Editar</button>
                    <button class="btn-sm btn-danger" onclick="eliminarEquipo('${doc.id}')">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    actualizarSelectEquipos();
}

window.editarEquipo = (id) => {
    const eq = equiposData[id];
    document.getElementById('eq-nombre').value = eq.nombre;
    document.getElementById('eq-color').value = eq.color || '#00d9ff';
    document.getElementById('eq-presupuesto').value = eq.presupuesto || 0;
    editandoID = id;
    abrirModal('modalEquipo');
};

document.getElementById('btnNuevoEquipo').addEventListener('click', () => {
    document.getElementById('eq-nombre').value = '';
    document.getElementById('eq-color').value = '#c0c0c0';
    document.getElementById('eq-presupuesto').value = 1000000;
    editandoID = null;
    abrirModal('modalEquipo');
});

document.getElementById('btnGuardarEquipo').addEventListener('click', async () => {
    const nombre = document.getElementById('eq-nombre').value.trim();
    const color = document.getElementById('eq-color').value;
    const presupuesto = parseFloat(document.getElementById('eq-presupuesto').value) || 0;
    if (!nombre) return;

    try {
        if (editandoID) {
            await updateDoc(doc(db, "equipos", editandoID), { nombre, color, presupuesto });
        } else {
            const nuevoId = nombre.toLowerCase().replace(/\s+/g, '-');
            await setDoc(doc(db, "equipos", nuevoId), { nombre, color, presupuesto, owner_uid: "", mejoras: { motor: 1, chasis: 1 } });
        }
        cerrarModal('modalEquipo');
        await cargarEquipos();
    } catch (e) { console.error(e); }
});

window.eliminarEquipo = async (id) => {
    if (confirm('¿Eliminar equipo?')) {
        await deleteDoc(doc(db, "equipos", id));
        await cargarEquipos();
    }
};

// --- PILOTOS ---
async function cargarPilotos() {
    const tbody = document.querySelector('#tabla-pilotos tbody');
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    pilotosData = {};
    const snap = await getDocs(query(collection(db, "pilotos"), orderBy("apellido")));
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const p = { id: doc.id, ...doc.data() };
        pilotosData[doc.id] = p;
        const eqNombre = equiposData[p.equipo_id]?.nombre || 'Sin equipo';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.numero}</strong></td>
            <td>${p.bandera || ''} ${p.apellido}, ${p.nombre}</td>
            <td>${eqNombre}</td>
            <td><strong>${p.puntos || 0}</strong></td>
            <td>
                <div class="table-actions">
                    <button class="btn-sm" onclick="editarPiloto('${p.id}')">Editar</button>
                    <button class="btn-sm btn-danger" onclick="eliminarPiloto('${p.id}')">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editarPiloto = (id) => {
    const p = pilotosData[id];
    document.getElementById('p-nombre').value = p.nombre;
    document.getElementById('p-apellido').value = p.apellido;
    document.getElementById('p-numero').value = p.numero;
    document.getElementById('p-bandera').value = p.bandera;
    document.getElementById('p-equipo').value = p.equipo_id;
    editandoID = id;
    abrirModal('modalPiloto');
};

document.getElementById('btnNuevoPiloto').addEventListener('click', () => {
    document.getElementById('p-nombre').value = '';
    document.getElementById('p-apellido').value = '';
    document.getElementById('p-numero').value = '';
    document.getElementById('p-bandera').value = '';
    document.getElementById('p-equipo').value = '';
    editandoID = null;
    abrirModal('modalPiloto');
});

document.getElementById('btnGuardarPiloto').addEventListener('click', async () => {
    const datos = {
        nombre: document.getElementById('p-nombre').value.trim(),
        apellido: document.getElementById('p-apellido').value.trim(),
        numero: parseInt(document.getElementById('p-numero').value),
        bandera: document.getElementById('p-bandera').value.trim(),
        equipo_id: document.getElementById('p-equipo').value,
        puntos: pilotosData[editandoID]?.puntos || 0
    };
    if (!datos.nombre || !datos.apellido || !datos.numero) return;

    try {
        if (editandoID) {
            await updateDoc(doc(db, "pilotos", editandoID), datos);
        } else {
            await addDoc(collection(db, "pilotos"), datos);
        }
        cerrarModal('modalPiloto');
        await cargarPilotos();
    } catch (e) { console.error(e); }
});

window.eliminarPiloto = async (id) => {
    if (confirm('¿Eliminar piloto?')) {
        await deleteDoc(doc(db, "pilotos", id));
        await cargarPilotos();
    }
};

// --- CARRERAS ---
async function cargarCarreras() {
    const tbody = document.querySelector('#tabla-carreras tbody');
    tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    carrerasData = {};
    const snap = await getDocs(query(collection(db, "carreras"), orderBy("orden")));
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const c = { id: doc.id, ...doc.data() };
        carrerasData[doc.id] = c;
        const estado = c.estado === "completada" ? '✓ Completada' : '⧗ Pendiente';
        const color = c.estado === "completada" ? 'var(--success)' : 'var(--text-secondary)';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.orden}</strong></td>
            <td>${c.bandera || ''} ${c.nombre_gp}</td>
            <td>${c.circuito}</td>
            <td>${new Date(c.fecha).toLocaleDateString()}</td>
            <td><strong style="color:${color};">${estado}</strong></td>
            <td>
                <div class="table-actions">
                    <button class="btn-sm" onclick="editarCarrera('${c.id}')">Editar</button>
                    <button class="btn-sm btn-success" onclick="gestionarResultados('${c.id}')">Resultados</button>
                    <button class="btn-sm btn-danger" onclick="eliminarCarrera('${c.id}')">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editarCarrera = (id) => {
    const c = carrerasData[id];
    document.getElementById('cr-orden').value = c.orden;
    document.getElementById('cr-nombre').value = c.nombre_gp;
    document.getElementById('cr-circuito').value = c.circuito;
    document.getElementById('cr-fecha').value = c.fecha;
    document.getElementById('cr-bandera').value = c.bandera;
    editandoID = id;
    abrirModal('modalCarrera');
};

document.getElementById('btnNuevaCarrera').addEventListener('click', () => {
    document.getElementById('cr-orden').value = Object.keys(carrerasData).length + 1;
    document.getElementById('cr-nombre').value = '';
    document.getElementById('cr-circuito').value = '';
    document.getElementById('cr-fecha').value = new Date().toISOString().slice(0, 16);
    document.getElementById('cr-bandera').value = '';
    editandoID = null;
    abrirModal('modalCarrera');
});

document.getElementById('btnGuardarCarrera').addEventListener('click', async () => {
    const datos = {
        orden: parseInt(document.getElementById('cr-orden').value),
        nombre_gp: document.getElementById('cr-nombre').value.trim(),
        circuito: document.getElementById('cr-circuito').value.trim(),
        fecha: document.getElementById('cr-fecha').value,
        bandera: document.getElementById('cr-bandera').value.trim(),
        estado: carrerasData[editandoID]?.estado || "pendiente"
    };
    if (!datos.orden || !datos.nombre_gp || !datos.circuito || !datos.fecha) return;

    try {
        if (editandoID) {
            await updateDoc(doc(db, "carreras", editandoID), datos);
        } else {
            await addDoc(collection(db, "carreras"), datos);
        }
        cerrarModal('modalCarrera');
        await cargarCarreras();
    } catch (e) { console.error(e); }
});

window.eliminarCarrera = async (id) => {
    if (confirm('¿Eliminar carrera? Se recalcularán los puntos.')) {
        await deleteDoc(doc(db, "carreras", id));
        await recalcularPuntos();
        await cargarCarreras();
        await cargarPilotos();
    }
};

// --- RESULTADOS & PUNTOS ---
window.gestionarResultados = async (id) => {
    editandoID = id;
    const carrera = carrerasData[id];
    document.getElementById('resultados-gp-nombre').textContent = carrera.nombre_gp;
    const editor = document.getElementById('resultados-editor');
    editor.innerHTML = 'Cargando...';

    const carreraDoc = await getDoc(doc(db, "carreras", id));
    const resultadosActuales = carreraDoc.data().resultados || {};

    const pilotosArray = Object.values(pilotosData).sort((a, b) => a.apellido.localeCompare(b.apellido));
    editor.innerHTML = '';
    pilotosArray.forEach(p => {
        const posActual = resultadosActuales[p.id] || '';
        editor.innerHTML += `
            <div class="resultado-row">
                <label for="res-${p.id}">${p.bandera} ${p.apellido}, ${p.nombre}</label>
                <input type="number" id="res-${p.id}" data-piloto-id="${p.id}" value="${posActual}" placeholder="Pos.">
            </div>
        `;
    });
    abrirModal('modalResultados');
};

document.getElementById('btnGuardarResultados').addEventListener('click', async () => {
    if (!editandoID) return;
    const boton = document.getElementById('btnGuardarResultados');
    boton.disabled = true;
    boton.textContent = 'Guardando...';

    const resultadosAGuardar = {};
    const inputs = document.querySelectorAll('#resultados-editor input');
    let hasResults = false;
    inputs.forEach(input => {
        if (input.value) {
            resultadosAGuardar[input.dataset.pilotoId] = parseInt(input.value);
            hasResults = true;
        }
    });

    try {
        await updateDoc(doc(db, "carreras", editandoID), {
            resultados: resultadosAGuardar,
            estado: hasResults ? "completada" : "pendiente"
        });

        await recalcularPuntos();

        alert('Resultados guardados y puntos actualizados.');
        cerrarModal('modalResultados');
        await cargarCarreras();
        await cargarPilotos();
    } catch (e) {
        alert('Error al guardar: ' + e.message);
        console.error(e);
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar Resultados';
    }
});

async function recalcularPuntos() {
    console.log("Recalculando todos los puntos...");
    try {
        await runTransaction(db, async (transaction) => {
            const pilotosSnapshot = await getDocs(collection(db, "pilotos"));
            const puntosTotales = {};
            pilotosSnapshot.forEach(p => {
                puntosTotales[p.id] = 0;
            });

            const q = query(collection(db, "carreras"), where("estado", "==", "completada"));
            const carrerasCompletadasSnap = await getDocs(q);

            carrerasCompletadasSnap.forEach(carreraDoc => {
                const resultados = carreraDoc.data().resultados;
                if (resultados) {
                    Object.entries(resultados).forEach(([pilotoId, pos]) => {
                        if (puntosTotales.hasOwnProperty(pilotoId) && pos > 0 && pos <= puntosSistema.length) {
                            puntosTotales[pilotoId] += puntosSistema[pos - 1];
                        }
                    });
                }
            });
            
            pilotosSnapshot.docs.forEach(pilotoDoc => {
                const newPuntos = puntosTotales[pilotoDoc.id];
                if (pilotoDoc.data().puntos !== newPuntos) {
                    transaction.update(pilotoDoc.ref, { puntos: newPuntos });
                }
            });
        });
        console.log("Transacción de puntos completada.");
    } catch (error) {
        console.error("Error en la transacción de puntos:", error);
        throw error;
    }
}


// --- CAMBIOS (LOG) ---
async function cargarCambiosUsuarios() {
    const tbody = document.querySelector('#tabla-cambios tbody');
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    const snap = await getDocs(query(collection(db, "registro_cambios"), orderBy("fecha", "desc")));
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const c = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.equipo_nombre}</strong></td>
            <td>${c.mejora}</td>
            <td>Nivel ${c.nuevo_nivel}</td>
            <td>${new Date(c.fecha.seconds * 1000).toLocaleString()}</td>
            <td><strong style="color:var(--success)">APLICADO</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- UTILIDADES ---
function abrirModal(id) {
    document.getElementById(id).style.display = 'flex';
}
window.cerrarModal = (id) => {
    document.getElementById(id).style.display = 'none';
};
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal(modal.id);
    });
});

function actualizarSelectEquipos() {
    const select = document.getElementById('p-equipo');
    select.innerHTML = '<option value="">-- Sin equipo --</option>';
    Object.values(equiposData).forEach(eq => {
        select.innerHTML += `<option value="${eq.id}">${eq.nombre}</option>`;
    });
}

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth);
});
