import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);

const CORREO_ADMIN = "mateogonsilva@gmail.com";

let usuarioActual = null;
let estadoActual = "abierto";
let equiposData = {};
let carrerasData = {};

// --- SEGURIDAD ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.email !== CORREO_ADMIN) {
            alert("Acceso denegado");
            window.location.href = "index.html";
        } else {
            usuarioActual = user;
            iniciarAdmin();
        }
    } else {
        window.location.href = "index.html";
    }
});

async function iniciarAdmin() {
    leerEstadoCampeonato();
    cargarEquipos();
    cargarPilotos();
    cargarCarreras();
    cargarCambiosUsuarios();
    setupTabs();
}

// --- TABS ---
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            document.getElementById(`tab-${tabName}`).style.display = 'block';
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// --- ESTADO DEL CAMPEONATO ---
async function leerEstadoCampeonato() {
    const docRef = doc(db, "configuracion", "campeonato");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        estadoActual = docSnap.data().estado;
        actualizarTextoEstado();
    }
}

function actualizarTextoEstado() {
    const texto = document.getElementById('estado-texto');
    const boton = document.getElementById('btnToggleCampeonato');
    
    if (estadoActual === "abierto") {
        texto.innerText = "MERCADO ABIERTO";
        texto.style.color = "#059669";
        boton.innerText = "Cerrar Mercado";
    } else {
        texto.innerText = "MERCADO CERRADO";
        texto.style.color = "#dc2626";
        boton.innerText = "Abrir Mercado";
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

    const snap = await getDocs(collection(db, "equipos"));
    snap.forEach(doc => {
        equiposData[doc.id] = { id: doc.id, ...doc.data() };
        const eq = equiposData[doc.id];
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${eq.nombre}</strong></td>
            <td>$${(eq.presupuesto || 0).toLocaleString()}</td>
            <td>${eq.owner_uid ? '✓ Asignado' : 'Libre'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-sm" onclick="editarEquipo('${doc.id}')">Editar</button>
                    <button class="btn-sm btn-danger" onclick="eliminarEquipo('${doc.id}')">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editarEquipo = (id) => {
    const eq = equiposData[id];
    document.getElementById('eq-nombre').value = eq.nombre;
    document.getElementById('eq-color').value = eq.color || '#000000';
    document.getElementById('eq-presupuesto').value = eq.presupuesto || 0;
    document.getElementById('btnGuardarEquipo').dataset.id = id;
    abrirModal('modalEquipo');
};

document.getElementById('btnNuevoEquipo').addEventListener('click', () => {
    document.getElementById('eq-nombre').value = '';
    document.getElementById('eq-color').value = '#000000';
    document.getElementById('eq-presupuesto').value = '';
    document.getElementById('btnGuardarEquipo').dataset.id = 'nuevo';
    abrirModal('modalEquipo');
});

document.getElementById('btnGuardarEquipo').addEventListener('click', async () => {
    const id = document.getElementById('btnGuardarEquipo').dataset.id;
    const nombre = document.getElementById('eq-nombre').value;
    const color = document.getElementById('eq-color').value;
    const presupuesto = parseFloat(document.getElementById('eq-presupuesto').value);

    if (!nombre) { alert('Nombre requerido'); return; }

    try {
        if (id === 'nuevo') {
            const nuevoId = nombre.toLowerCase().replace(/\s+/g, '');
            await setDoc(doc(db, "equipos", nuevoId), {
                nombre, color, presupuesto, owner_uid: ""
            });
        } else {
            await updateDoc(doc(db, "equipos", id), { nombre, color, presupuesto });
        }
        cerrarModal('modalEquipo');
        cargarEquipos();
    } catch (e) {
        alert('Error: ' + e.message);
    }
});

window.eliminarEquipo = async (id) => {
    if (confirm('¿Eliminar equipo?')) {
        await deleteDoc(doc(db, "equipos", id));
        cargarEquipos();
    }
};

// --- PILOTOS ---
async function cargarPilotos() {
    const tbody = document.querySelector('#tabla-pilotos tbody');
    tbody.innerHTML = '';

    const snap = await getDocs(collection(db, "pilotos"));
    snap.forEach(doc => {
        const p = doc.data();
        const eqNombre = equiposData[p.equipo_id]?.nombre || 'N/A';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.numero}</strong></td>
            <td>${p.apellido} ${p.nombre}</td>
            <td>${eqNombre}</td>
            <td>${p.puntos || 0}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-sm" onclick="editarPiloto('${doc.id}')">Editar</button>
                    <button class="btn-sm btn-danger" onclick="eliminarPiloto('${doc.id}')">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CERRAR SESIÓN ---
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// Funciones auxiliares
function abrirModal(id) {
    document.getElementById(id).classList.add('active');
}

window.cerrarModal = (id) => {
    document.getElementById(id).classList.remove('active');
};