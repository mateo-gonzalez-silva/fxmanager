import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

const CORREO_ADMIN = "mateogonsilva@gmail.com";

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

// --- ESTADO CAMPEONATO ---
async function leerEstadoCampeonato() {
    try {
        const docRef = doc(db, "configuracion", "campeonato");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            estadoActual = docSnap.data().estado;
        } else {
            await setDoc(docRef, { estado: "abierto" });
            estadoActual = "abierto";
        }
        actualizarTextoEstado();
    } catch (e) {
        console.error("Error:", e);
    }
}

function actualizarTextoEstado() {
    const texto = document.getElementById('estado-texto');
    const boton = document.getElementById('btnToggleCampeonato');
    
    if (estadoActual === "abierto") {
        texto.textContent = "🟢 MERCADO ABIERTO";
        texto.style.color = "var(--success)";
        boton.textContent = "Cerrar Mercado";
    } else {
        texto.textContent = "🔴 MERCADO CERRADO";
        texto.style.color = "var(--danger)";
        boton.textContent = "Abrir Mercado";
    }
}

document.getElementById('btnToggleCampeonato').addEventListener('click', async () => {
    const nuevoEstado = estadoActual === "abierto" ? "cerrado" : "abierto";
    await setDoc(doc(db, "configuracion", "campeonato"), { estado: nuevoEstado });
    estadoActual = nuevoEstado;
    actualizarTextoEstado();
});

// --- EQUIPOS ---
async function cargarEquipos() {
    const tbody = document.querySelector('#tabla-equipos tbody');
    tbody.innerHTML = '';
    equiposData = {};

    try {
        const snap = await getDocs(collection(db, "equipos"));
        snap.forEach(doc => {
            equiposData[doc.id] = { id: doc.id, ...doc.data() };
        });

        Object.values(equiposData).forEach(eq => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--accent);">${eq.nombre}</strong></td>
                <td>$${(eq.presupuesto || 0).toLocaleString()}</td>
                <td>${eq.owner_uid ? '✓ ASIGNADO' : '⊘ LIBRE'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-sm" onclick="editarEquipo('${doc.id}')">Editar</button>
                        <button class="btn-sm btn-danger" onclick="eliminarEquipo('${doc.id}')">×</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error:", e);
    }
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
    document.getElementById('eq-color').value = '#00d9ff';
    document.getElementById('eq-presupuesto').value = '';
    editandoID = null;
    abrirModal('modalEquipo');
});

document.getElementById('btnGuardarEquipo').addEventListener('click', async () => {
    const nombre = document.getElementById('eq-nombre').value.trim();
    const color = document.getElementById('eq-color').value;
    const presupuesto = parseFloat(document.getElementById('eq-presupuesto').value) || 0;

    if (!nombre) { alert('✗ Nombre requerido'); return; }

    try {
        if (editandoID) {
            await updateDoc(doc(db, "equipos", editandoID), { nombre, color, presupuesto });
        } else {
            const nuevoId = nombre.toLowerCase().replace(/\s+/g, '-');
            await setDoc(doc(db, "equipos", nuevoId), { nombre, color, presupuesto, owner_uid: "" });
        }
        cerrarModal('modalEquipo');
        await cargarEquipos();
    } catch (e) {
        alert('✗ Error: ' + e.message);
    }
});

window.eliminarEquipo = async (id) => {
    if (confirm('¿Eliminar equipo? Esta acción no se puede deshacer.')) {
        try {
            await deleteDoc(doc(db, "equipos", id));
            await cargarEquipos();
        } catch (e) {
            alert('✗ Error: ' + e.message);
        }
    }
};

// --- PILOTOS ---
async function cargarPilotos() {
    const tbody = document.querySelector('#tabla-pilotos tbody');
    tbody.innerHTML = '';
    pilotosData = {};

    try {
        const snap = await getDocs(collection(db, "pilotos"));
        snap.forEach(doc => {
            pilotosData[doc.id] = { id: doc.id, ...doc.data() };
        });

        Object.values(pilotosData).forEach(p => {
            const eqNombre = equiposData[p.equipo_id]?.nombre || 'N/A';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.numero}</strong></td>
                <td>${p.apellido} <span style="color: var(--text-secondary);">${p.nombre}</span></td>
                <td>${eqNombre}</td>
                <td><strong style="color: var(--success);">${p.puntos || 0}</strong></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-sm" onclick="editarPiloto('${p.id}')">Editar</button>
                        <button class="btn-sm btn-danger" onclick="eliminarPiloto('${p.id}')">×</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error:", e);
    }
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
    editandoID = null;
    abrirModal('modalPiloto');
});

document.getElementById('btnGuardarPiloto').addEventListener('click', async () => {
    const nombre = document.getElementById('p-nombre').value.trim();
    const apellido = document.getElementById('p-apellido').value.trim();
    const numero = parseInt(document.getElementById('p-numero').value);
    const bandera = document.getElementById('p-bandera').value.trim();
    const equipoId = document.getElementById('p-equipo').value;

    if (!nombre || !apellido || !numero || !equipoId) { alert('✗ Completa todos los campos'); return; }

    try {
        const datos = { nombre, apellido, numero, bandera, equipo_id: equipoId, puntos: pilotosData[editandoID]?.puntos || 0 };
        if (editandoID) {
            await updateDoc(doc(db, "pilotos", editandoID), datos);
        } else {
            await addDoc(collection(db, "pilotos"), datos);
        }
        cerrarModal('modalPiloto');
        await cargarPilotos();
    } catch (e) {
        alert('✗ Error: ' + e.message);
    }
});

window.eliminarPiloto = async (id) => {
    if (confirm('¿Eliminar piloto?')) {
        try {
            await deleteDoc(doc(db, "pilotos", id));
            await cargarPilotos();
        } catch (e) {
            alert('✗ Error: ' + e.message);
        }
    }
};

// --- CARRERAS ---
async function cargarCarreras() {
    const tbody = document.querySelector('#tabla-carreras tbody');
    tbody.innerHTML = '';
    carrerasData = {};

    try {
        const q = query(collection(db, "carreras"), orderBy("orden"));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            carrerasData[doc.id] = { id: doc.id, ...doc.data() };
        });

        Object.values(carrerasData).forEach(c => {
            const estado = c.estado === "completada" ? '✓ COMPLETADA' : '⧗ PENDIENTE';
            const color = c.estado === "completada" ? 'var(--success)' : 'var(--warning)';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.orden || 'N/A'}</strong></td>
                <td>${c.nombre_gp || 'N/A'}</td>
                <td>${c.circuito || 'N/A'}</td>
                <td>${new Date(c.fecha).toLocaleDateString('es-ES')}</td>
                <td><span class="badge" style="color: ${color}; border-color: ${color};">${estado}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-sm" onclick="editarCarrera('${c.id}')">Editar</button>
                        <button class="btn-sm btn-danger" onclick="eliminarCarrera('${c.id}')">×</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error:", e);
    }
};

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
    document.getElementById('cr-orden').value = '';
    document.getElementById('cr-nombre').value = '';
    document.getElementById('cr-circuito').value = '';
    document.getElementById('cr-fecha').value = '';
    document.getElementById('cr-bandera').value = '';
    editandoID = null;
    abrirModal('modalCarrera');
});

document.getElementById('btnGuardarCarrera').addEventListener('click', async () => {
    const orden = parseInt(document.getElementById('cr-orden').value);
    const nombre_gp = document.getElementById('cr-nombre').value.trim();
    const circuito = document.getElementById('cr-circuito').value.trim();
    const fecha = document.getElementById('cr-fecha').value;
    const bandera = document.getElementById('cr-bandera').value;

    if (!orden || !nombre_gp || !circuito || !fecha) { alert('✗ Completa todos los campos'); return; }

    try {
        const datos = { orden, nombre_gp, circuito, fecha, bandera, estado: "pendiente" };
        if (editandoID) {
            await updateDoc(doc(db, "carreras", editandoID), datos);
        } else {
            await addDoc(collection(db, "carreras"), datos);
        }
        cerrarModal('modalCarrera');
        await cargarCarreras();
    } catch (e) {
        alert('✗ Error: ' + e.message);
    }
});

window.eliminarCarrera = async (id) => {
    if (confirm('¿Eliminar carrera?')) {
        try {
            await deleteDoc(doc(db, "carreras", id));
            await cargarCarreras();
        } catch (e) {
            alert('✗ Error: ' + e.message);
        }
    }
};

// --- CAMBIOS USUARIOS ---
async function cargarCambiosUsuarios() {
    const tbody = document.querySelector('#tabla-cambios tbody');
    tbody.innerHTML = '';

    try {
        const snap = await getDocs(collection(db, "registro_cambios"));
        const cambios = [];
        snap.forEach(doc => cambios.push(doc.data()));
        cambios.reverse();

        cambios.slice(0, 50).forEach(cambio => {
            const estado = cambio.aplicado_en_ac ? '✓ APLICADO' : '⧗ PENDIENTE';
            const color = cambio.aplicado_en_ac ? 'var(--success)' : 'var(--warning)';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cambio.equipo_nombre}</strong></td>
                <td>${cambio.mejora}</td>
                <td>Nivel ${cambio.nuevo_nivel}</td>
                <td>${new Date(cambio.fecha).toLocaleDateString('es-ES')}</td>
                <td><span class="badge" style="color: ${color}; border-color: ${color};">${estado}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

// Funciones auxiliares
function abrirModal(id) {
    document.getElementById(id).classList.add('active');
}

window.cerrarModal = (id) => {
    document.getElementById(id).classList.remove('active');
};

// Cerrar modal al hacer clic fuera
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal(modal.id);
    });
});

// --- CERRAR SESIÓN ---
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// Actualizar modales con select de equipos
async function actualizarSelectEquipos() {
    const selects = [document.getElementById('p-equipo')];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecciona equipo...</option>';
        Object.values(equiposData).forEach(eq => {
            const option = document.createElement('option');
            option.value = eq.id;
            option.textContent = eq.nombre;
            select.appendChild(option);
        });
    });
}

// Llamar cuando se cargan equipos
const originalCargarEquipos = cargarEquipos;
window.cargarEquipos = async () => {
    await originalCargarEquipos();
    await actualizarSelectEquipos();
};