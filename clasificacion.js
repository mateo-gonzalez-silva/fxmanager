// clasificacion.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ==========================================
// 1. CONFIGURACIÓN FIREBASE
// ==========================================
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

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 2. GESTIÓN DEL MENÚ SUPERIOR
    // ==========================================
    const navDashboard = document.getElementById("nav-dashboard");
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (btnLogin) btnLogin.style.display = "none";
            if (btnLogout) btnLogout.style.display = "block";

            try {
                const userRef = doc(db, "usuarios", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.equipo && userData.equipo !== "" && navDashboard) navDashboard.style.display = "inline-block";
                }
            } catch (error) {
                console.error("Error cargando permisos:", error);
            }
        } else {
            if (btnLogin) btnLogin.style.display = "inline-block";
            if (btnLogout) btnLogout.style.display = "none";
        }
        
        // Cargar las clasificaciones (público)
        cargarClasificaciones();
    });

    if (btnLogin) btnLogin.addEventListener("click", () => window.location.href = "login.html");
    if (btnLogout) btnLogout.addEventListener("click", async () => {
        await signOut(auth);
        window.location.reload();
    });
});

// ==========================================
// 3. DESCARGAR Y RENDERIZAR CLASIFICACIONES
// ==========================================
async function cargarClasificaciones() {
    const listaPilotos = document.getElementById("lista-pilotos");
    const listaEquipos = document.getElementById("lista-equipos");

    try {
        // 1. Obtener Equipos
        const equiposSnap = await getDocs(collection(db, "equipos"));
        const equiposData = [];
        const equiposMap = {}; // Diccionario para buscar el color/nombre del equipo del piloto rápido

        equiposSnap.forEach(docSnap => {
            const data = docSnap.data();
            const equipo = { id: docSnap.id, ...data, puntos: data.puntos || 0 };
            equiposData.push(equipo);
            // Aseguramos un color por defecto en caso de que no lo tenga
            equiposMap[docSnap.id] = { nombre: equipo.nombre, color: equipo.color || "#8a8b98" };
        });

        // 2. Obtener Pilotos
        const pilotosSnap = await getDocs(collection(db, "pilotos"));
        const pilotosData = [];

        pilotosSnap.forEach(docSnap => {
            const data = docSnap.data();
            pilotosData.push({ id: docSnap.id, ...data, puntos: data.puntos || 0 });
        });

        // 3. Ordenar de mayor a menor puntuación
        equiposData.sort((a, b) => b.puntos - a.puntos);
        pilotosData.sort((a, b) => b.puntos - a.puntos);

        // ==========================================
        // 4. TABLA DE CONSTRUCTORES (EQUIPOS)
        // ==========================================
        let htmlTablaEquipos = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <thead>
                <tr>
                    <th style="text-align:left; color:var(--text-sec); padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; width:40px;">Pos</th>
                    <th style="text-align:left; color:var(--text-sec); padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Equipo</th>
                    <th style="text-align:right; color:var(--text-sec); padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Pts</th>
                </tr>
            </thead>
            <tbody>`;

        const equiposTop20 = equiposData.slice(0, 20);

        equiposTop20.forEach((equipo, index) => {
            const posicion = index + 1;
            // Colores para el Top 3
            let posColor = "#555";
            if (posicion === 1) posColor = "#ffd700"; // Oro
            if (posicion === 2) posColor = "#c0c0c0"; // Plata
            if (posicion === 3) posColor = "#cd7f32"; // Bronce

            htmlTablaEquipos += `
                <tr style="transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle; font-weight:800; font-size:1.1rem; color:${posColor};">${posicion}</td>
                    <td style="padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle;">
                        <span style="color:${equipo.color || '#fff'}; font-weight:800; font-size:1.15rem; text-transform:uppercase; letter-spacing:0.5px;">
                            ${equipo.nombre}
                        </span>
                    </td>
                    <td style="padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle; text-align:right; font-size:1.2rem; font-weight:700;">${equipo.puntos}</td>
                </tr>`;
        });

        htmlTablaEquipos += `</tbody></table>`;
        listaEquipos.innerHTML = htmlTablaEquipos;


        // ==========================================
        // 5. TABLA DE PILOTOS
        // ==========================================
        let htmlTablaPilotos = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <thead>
                <tr>
                    <th style="text-align:left; color:var(--text-sec); padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; width:40px;">Pos</th>
                    <th style="text-align:left; color:var(--text-sec); padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Piloto</th>
                    <th style="text-align:right; color:var(--text-sec); padding:10px 15px; border-bottom:1px solid var(--border); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Pts</th>
                </tr>
            </thead>
            <tbody>`;

        const pilotosTop20 = pilotosData.slice(0, 20);

        pilotosTop20.forEach((piloto, index) => {
            const posicion = index + 1;
            const infoEquipo = equiposMap[piloto.equipoId] || { nombre: "Agente Libre", color: "#8a8b98" };
            
            // Colores para el Top 3
            let posColor = "#555";
            if (posicion === 1) posColor = "#ffd700";
            if (posicion === 2) posColor = "#c0c0c0";
            if (posicion === 3) posColor = "#cd7f32";

            // Lógica para nombre en blanco y apellido en color del equipo
            // Si el campo apellido existe explícitamente, lo usamos. Si no, intentamos extraerlo del campo nombre.
            let firstName = "";
            let lastName = "";
            
            if (piloto.apellido && piloto.apellido.trim() !== "") {
                firstName = piloto.nombre;
                lastName = piloto.apellido;
            } else {
                const nameParts = piloto.nombre.trim().split(' ');
                lastName = nameParts.length > 1 ? nameParts.pop() : piloto.nombre;
                firstName = nameParts.length > 0 ? nameParts.join(' ') : '';
            }

            htmlTablaPilotos += `
                <tr style="transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle; font-weight:800; font-size:1.1rem; color:${posColor};">${posicion}</td>
                    <td style="padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle;">
                        <div>
                            <div style="font-size:1.05rem; letter-spacing:0.5px;">
                                <span style="color:#ffffff; font-weight:400;">${firstName}</span> 
                                <span style="color:${infoEquipo.color}; font-weight:800; text-transform:uppercase;">${lastName}</span>
                            </div>
                            <div style="color:var(--text-sec); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; margin-top:3px; font-weight:600;">
                                ${infoEquipo.nombre}
                            </div>
                        </div>
                    </td>
                    <td style="padding:12px 15px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle; text-align:right; font-size:1.2rem; font-weight:700;">${piloto.puntos}</td>
                </tr>`;
        });

        htmlTablaPilotos += `</tbody></table>`;
        listaPilotos.innerHTML = htmlTablaPilotos;

        if (pilotosData.length === 0) listaPilotos.innerHTML = "<p class='text-muted'>No hay datos de pilotos.</p>";
        if (equiposData.length === 0) listaEquipos.innerHTML = "<p class='text-muted'>No hay datos de equipos.</p>";

    } catch (error) {
        console.error("Error cargando clasificaciones:", error);
        listaPilotos.innerHTML = "<p style='color: var(--danger);'>Error al cargar los datos.</p>";
        listaEquipos.innerHTML = "<p style='color: var(--danger);'>Error al cargar los datos.</p>";
    }
}