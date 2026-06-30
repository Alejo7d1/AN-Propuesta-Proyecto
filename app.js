/**
 * ACEUCA Loans — Sistema Cooperativo de Créditos
 * Lógica de Negocio, Motor SPA y Sistema de Notificaciones (CU-07)
 * ================================================================
 */

// ================================================================
// DATOS INICIALES (Mock Data estructural)
// ================================================================
const MOCK_DATA = {
    users: [
        { id: "U01", name: "Asociado Ejemplo A", username: "asociado1", role: "Asociado",      status: "Activo", salary: 1500, riskScore: "Bajo" },
        { id: "U02", name: "Contador General",    username: "contador",  role: "Contador",      status: "Activo", salary: 2000, riskScore: "Bajo" },
        { id: "U03", name: "Rep. del Consejo",    username: "consejo",   role: "Consejo",       status: "Activo", salary: 2500, riskScore: "Bajo" },
        { id: "U04", name: "Administrador Gral.", username: "admin",     role: "Administrador", status: "Activo", salary: 3000, riskScore: "Bajo" },
        { id: "U05", name: "Asociado Ejemplo B",  username: "asociado2", role: "Asociado",      status: "Activo", salary: 800,  riskScore: "Alto" }
    ],
    loans: [
        {
            id: "PRE-001", type: "Micro préstamo", amount: 900, term: 24, rate: 10,
            associate: "Asociado Ejemplo A", status: "Desembolsada",
            date: "2026-05-10", balance: 680, monthlyFee: 41.48,
            payments: [
                { id: "PAG-101", date: "2026-06-10", amount: 41.48, type: "Planilla", balance: 638.52, status: "Hacienda OK" }
            ],
            riskStatus: "Bajo", freezeMonths: 0, hasAppeal: false,
            technicalReport: "Capacidad de pago óptima verificada por planilla."
        },
        {
            id: "PRE-002", type: "Préstamo por caja", amount: 1500, term: 12, rate: 18,
            associate: "Asociado Ejemplo B", status: "Pendiente",
            date: "2026-06-28", balance: 1500, monthlyFee: 137.50,
            payments: [], riskStatus: "Pendiente", technicalReport: "", freezeMonths: 0, hasAppeal: false
        }
    ],
    notifications: [
        {
            id: "N01", role: "Asociado", unread: false,
            text: "Su préstamo PRE-001 ha sido desembolsado exitosamente.",
            date: "2026-05-11", type: "success"
        },
        {
            id: "N02", role: "Contador", unread: true,
            text: "Nueva solicitud PRE-002 pendiente de análisis técnico.",
            date: "2026-06-28", type: "info"
        }
    ],
    logs: [
        { id: "L01", user: "Contador General", action: "Aprobación inicial de políticas para PRE-001", type: "Financiero", date: "2026-05-09 10:14:02" },
        { id: "L02", user: "Sistema", action: "Validación automática de riesgo para PRE-002", type: "Seguridad", date: "2026-06-28 11:22:45" }
    ]
};

// ================================================================
// REGLAS DE NEGOCIO POR LÍNEA DE CRÉDITO
// ================================================================
const LOAN_RULES = {
    "Micro préstamo":    { min: 800,  max: 1000,   maxTerm: 36,  rate: 10, requiresDocs: false },
    "Préstamo por caja": { min: 100,  max: 20000,  maxTerm: 60,  rate: 18, requiresDocs: false },
    "Traslado de deuda": { min: 500,  max: 50000,  maxTerm: 72,  rate: 12, requiresDocs: true  },
    "Préstamo personal": { min: 500,  max: 100000, maxTerm: 120, rate: 15, requiresDocs: true, salaryLimit: 0.20 }
};

// ================================================================
// ESTADO GLOBAL PERSISTENTE
// ================================================================
let state = {
    currentUser: null,
    activeRole:  null,
    activeView:  "dashboard",
    loans:         [...MOCK_DATA.loans],
    notifications: [...MOCK_DATA.notifications],
    logs:          [...MOCK_DATA.logs],
    users:         [...MOCK_DATA.users],
    tempFiles:     [],
    notifPanelOpen: false
};

// ================================================================
// PERSISTENCIA: LocalStorage
// ================================================================
function saveState() {
    try {
        const s = { ...state, tempFiles: [], notifPanelOpen: false };
        localStorage.setItem("aceuca_v2_state", JSON.stringify(s));
    } catch(e) { /* quota exceeded */ }
}

function loadState() {
    try {
        const saved = localStorage.getItem("aceuca_v2_state");
        if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed, tempFiles: [], notifPanelOpen: false };
        }
    } catch(e) { console.warn("Estado local inválido, iniciando fresco."); }
}

// ================================================================
// CÁLCULO FINANCIERO (Amortización Francesa)
// ================================================================
function calculateAmortization(principal, annualRate, months) {
    if (!principal || !months) return "0.00";
    const r = (annualRate / 100) / 12;
    if (r === 0) return (principal / months).toFixed(2);
    const payment = (principal * r) / (1 - Math.pow(1 + r, -months));
    return payment.toFixed(2);
}

// ================================================================
// AUDITORÍA (CU-08)
// ================================================================
function addAuditLog(action, type = "Financiero") {
    const user = state.currentUser ? state.currentUser.name : "Sistema";
    const date = new Date().toISOString().replace("T", " ").substring(0, 19);
    state.logs.unshift({ id: `L-${Date.now().toString().slice(-5)}`, user, action, type, date });
    saveState();
    // Si la vista activa es audit-logs, re-renderizar
    if (state.activeView === "audit-logs") renderAuditLogs();
}

// ================================================================
// SISTEMA DE NOTIFICACIONES (CU-07)
// ================================================================

/**
 * Crea y almacena una notificación para un rol específico.
 * Según CU-07: el sistema identifica destinatarios, personaliza
 * el mensaje y lo entrega al panel del receptor.
 */
function addNotification(text, targetRole, type = "info") {
    const notif = {
        id: `N-${Date.now().toString().slice(-6)}`,
        role:   targetRole,
        text,
        date:   new Date().toLocaleDateString("es-CR", { day:"2-digit", month:"short", year:"numeric" }),
        unread: true,
        type    // "info" | "success" | "warning" | "danger"
    };
    state.notifications.unshift(notif);
    saveState();
    updateNotificationBadge();
    // Si el panel está abierto, re-renderizar
    if (state.notifPanelOpen) renderNotifPanel();
}

/** Actualiza el badge de cantidad de no leídas */
function updateNotificationBadge() {
    const count = state.notifications.filter(n => n.unread && n.role === state.activeRole).length;
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    if (count > 0) {
        badge.style.display = "flex";
        badge.textContent = count > 9 ? "9+" : count;
    } else {
        badge.style.display = "none";
    }
}

/** Abre/cierra el panel de notificaciones */
function toggleNotifPanel() {
    state.notifPanelOpen = !state.notifPanelOpen;
    const panel   = document.getElementById("notif-panel");
    const overlay = document.getElementById("notif-overlay");
    if (!panel) return;

    if (state.notifPanelOpen) {
        panel.classList.add("open");
        overlay.classList.add("open");
        renderNotifPanel();
    } else {
        panel.classList.remove("open");
        overlay.classList.remove("open");
    }
}

function closeNotifPanel() {
    state.notifPanelOpen = false;
    document.getElementById("notif-panel")?.classList.remove("open");
    document.getElementById("notif-overlay")?.classList.remove("open");
}

/** Renderiza las notificaciones del rol activo */
function renderNotifPanel() {
    const body = document.getElementById("notif-panel-body");
    if (!body) return;

    const myNotifs = state.notifications.filter(n => n.role === state.activeRole);

    if (myNotifs.length === 0) {
        body.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No hay notificaciones para este rol.</p>
            </div>`;
        return;
    }

    const iconMap = {
        info:    { icon: "fa-info-circle",    cls: "info"    },
        success: { icon: "fa-check-circle",   cls: "success" },
        warning: { icon: "fa-exclamation-circle", cls: "warning" },
        danger:  { icon: "fa-times-circle",   cls: "danger"  }
    };

    body.innerHTML = myNotifs.map(n => {
        const ic = iconMap[n.type] || iconMap.info;
        return `
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="markNotifRead('${n.id}')">
            <div class="notif-icon ${ic.cls}"><i class="fas ${ic.icon}"></i></div>
            <div class="notif-content">
                <div class="notif-text">${n.text}</div>
                <div class="notif-date"><i class="fas fa-clock" style="margin-right:4px;opacity:0.6;"></i>${n.date}</div>
            </div>
            ${n.unread ? '<div class="notif-dot"></div>' : ''}
        </div>`;
    }).join("");
}

/** Marca una notificación como leída */
function markNotifRead(notifId) {
    const n = state.notifications.find(x => x.id === notifId);
    if (n && n.unread) {
        n.unread = false;
        saveState();
        updateNotificationBadge();
        renderNotifPanel();
    }
}

/** Marca todas las notificaciones del rol como leídas */
function markAllNotificationsRead() {
    state.notifications
        .filter(n => n.role === state.activeRole && n.unread)
        .forEach(n => { n.unread = false; });
    saveState();
    updateNotificationBadge();
    renderNotifPanel();
    showToast("Todas las notificaciones marcadas como leídas.", "success");
}

// ================================================================
// TOAST NOTIFICATIONS
// ================================================================
function showToast(msg, type = "info") {
    const area = document.getElementById("toast-area");
    if (!area) return;

    const colorMap = {
        success: "linear-gradient(135deg, #10b981, #059669)",
        danger:  "linear-gradient(135deg, #ef4444, #dc2626)",
        warning: "linear-gradient(135deg, #f59e0b, #d97706)",
        info:    "linear-gradient(135deg, #3b82f6, #2563eb)"
    };
    const iconMap = {
        success: "fa-check-circle",
        danger:  "fa-times-circle",
        warning: "fa-exclamation-circle",
        info:    "fa-info-circle"
    };

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.style.background = colorMap[type] || colorMap.info;
    toast.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${msg}</span>
        <button class="toast-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    area.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(110%)"; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ================================================================
// NAVEGACIÓN SPA
// ================================================================
function navigateTo(viewName) {
    closeNotifPanel();
    state.activeView = viewName;
    saveState();

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("data-view") === viewName);
    });

    document.querySelectorAll(".view-section").forEach(sec => {
        sec.classList.toggle("active", sec.id === `view-${viewName}`);
    });

    // Asegurar que la sección exista (creación dinámica de respaldo)
    let target = document.getElementById(`view-${viewName}`);
    if (!target) {
        const main = document.getElementById("main-content");
        if (main) {
            target = document.createElement("div");
            target.id = `view-${viewName}`;
            target.className = "view-section active";
            main.appendChild(target);
        }
    }

    renderViewContent(viewName, target);
}

// ================================================================
// SELECTOR DE ROL (Entorno Sandbox)
// ================================================================
function setRole(roleName) {
    state.activeRole   = roleName;
    state.currentUser  = state.users.find(u => u.role === roleName) || null;
    closeNotifPanel();
    saveState();

    // Botones del proto-bar
    document.querySelectorAll(".role-switcher-btn").forEach(btn =>
        btn.classList.toggle("active", btn.dataset.role === roleName)
    );

    // Visibilidad de nav items según rol
    document.querySelectorAll(".sidebar-nav .role-scoped").forEach(el => {
        el.style.display = el.classList.contains(`role-${roleName.toLowerCase()}`) ? "flex" : "none";
    });

    // Actualizar header con datos de usuario
    if (state.currentUser) {
        const initials = state.currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        document.getElementById("avatar-box").textContent     = initials;
        document.querySelector(".user-name").textContent      = state.currentUser.name;
        document.querySelector(".user-role").textContent      = state.currentUser.role;
    }

    updateNotificationBadge();

    // Redirigir inteligentemente según el rol
    const invalidViews = {
        "Contador":      ["loan-apply", "payments-asociado"],
        "Consejo":       ["loan-apply", "payments-asociado", "evaluate-loans"],
        "Administrador": ["loan-apply", "evaluate-loans", "consejo-decisions", "payments-asociado"]
    };

    const restricted = invalidViews[roleName] || [];
    if (restricted.includes(state.activeView)) {
        navigateTo("dashboard");
    } else {
        navigateTo(state.activeView);
    }
}

// ================================================================
// BADGES DE ESTADO
// ================================================================
function getStatusBadgeClass(status) {
    const map = {
        "Pendiente":            "badge-pending",
        "Evaluado por Contador":"badge-review",
        "Aprobada":             "badge-approved",
        "Rechazada":            "badge-rejected",
        "Desembolsada":         "badge-disbursed"
    };
    return map[status] || "";
}

// ================================================================
// ENRUTADOR DE VISTAS
// ================================================================
function renderViewContent(view, container) {
    switch (view) {
        case "dashboard":        renderDashboard(container);       break;
        case "loan-apply":       initLoanForm();                   break;
        case "evaluate-loans":   renderEvaluateLoans(container);   break;
        case "consejo-decisions":renderConsejoDecisions(container);break;
        case "payments-asociado":renderPaymentsAsociado(container);break;
        case "payments-admin":   renderPaymentsAdmin(container);   break;
        case "reports":          renderReports(container);         break;
        case "users-admin":      renderUsersAdmin();               break;
        case "audit-logs":       renderAuditLogs();                break;
    }
}

// ================================================================
// VISTA: DASHBOARD (dinámico por rol)
// ================================================================
function renderDashboard(container) {
    if (!container) container = document.getElementById("view-dashboard");
    if (!container) return;

    if (state.activeRole === "Asociado") {
        renderDashboardAsociado(container);
    } else if (state.activeRole === "Contador") {
        renderDashboardContador(container);
    } else if (state.activeRole === "Consejo") {
        renderDashboardConsejo(container);
    } else {
        renderDashboardAdmin(container);
    }
}

function renderDashboardAsociado(container) {
    const myLoans  = state.loans.filter(l => l.associate === state.currentUser?.name);
    const active   = myLoans.filter(l => l.status === "Desembolsada");
    const pending  = myLoans.filter(l => l.status === "Pendiente");
    const debt     = active.reduce((s, l) => s + (parseFloat(l.balance) || 0), 0).toFixed(2);
    const nextFee  = active.length ? active[0].monthlyFee : 0;
    const unread   = state.notifications.filter(n => n.role === "Asociado" && n.unread).length;

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2>¡Bienvenido, ${state.currentUser?.name?.split(" ")[0] || "Asociado"}!</h2>
                <p>Aquí encontrás un resumen de tus créditos y estados pendientes.</p>
            </div>
            <button class="btn btn-primary" onclick="navigateTo('loan-apply')">
                <i class="fas fa-plus"></i> Nueva Solicitud
            </button>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info">
                        <h3>Créditos Vigentes</h3>
                        <p>${active.length}</p>
                    </div>
                    <div class="stat-icon primary"><i class="fas fa-hand-holding-usd"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-circle-check" style="color:var(--success);"></i> ${pending.length} solicitud(es) en revisión</div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info">
                        <h3>Saldo Adeudado Total</h3>
                        <p>$${debt}</p>
                    </div>
                    <div class="stat-icon warning"><i class="fas fa-file-invoice-dollar"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-calendar-day" style="color:var(--warning);"></i> Próxima cuota: $${nextFee || "—"}</div>
            </div>
            <div class="card" style="cursor:pointer;" onclick="toggleNotifPanel()">
                <div class="card-stat">
                    <div class="stat-info">
                        <h3>Notificaciones</h3>
                        <p>${unread}</p>
                    </div>
                    <div class="stat-icon accent"><i class="fas fa-bell"></i></div>
                </div>
                <div class="stat-footer">Sin leer en tu bandeja</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Historial de Solicitudes y Estados</h3>
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('payments-asociado')">
                    <i class="fas fa-wallet"></i> Ir a Pagos
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th><th>Tipo de Crédito</th><th>Monto</th>
                            <th>Cuota/Mes</th><th>Saldo</th><th>Estado</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${myLoans.length === 0
                            ? `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-folder-open"></i><p>No registras solicitudes de crédito aún.</p></div></td></tr>`
                            : myLoans.map(l => `
                            <tr>
                                <td><b>${l.id}</b></td>
                                <td>${l.type}</td>
                                <td>$${l.amount.toLocaleString()}</td>
                                <td>$${l.monthlyFee}</td>
                                <td>$${typeof l.balance === 'number' ? l.balance.toFixed(2) : l.balance}</td>
                                <td><span class="badge ${getStatusBadgeClass(l.status)}">${l.status}</span></td>
                                <td>
                                    ${l.status === 'Rechazada' && !l.hasAppeal
                                        ? `<button class="btn btn-danger btn-sm" onclick="executeAppeal('${l.id}')"><i class="fas fa-balance-scale"></i> Apelar</button>`
                                        : ''}
                                    ${l.status === 'Rechazada' && l.hasAppeal
                                        ? `<span class="badge badge-review"><i class="fas fa-hourglass-half"></i> Apelación enviada</span>`
                                        : ''}
                                    ${l.status === 'Desembolsada'
                                        ? `<button class="btn btn-success btn-sm" onclick="navigateTo('payments-asociado')"><i class="fas fa-wallet"></i> Pagar</button>`
                                        : ''}
                                    ${l.status === 'Pendiente'
                                        ? `<span class="text-muted" style="font-size:12px;"><i class="fas fa-clock"></i> En análisis</span>`
                                        : ''}
                                    ${l.status === 'Evaluado por Contador'
                                        ? `<span class="badge badge-review"><i class="fas fa-search"></i> En Consejo</span>`
                                        : ''}
                                </td>
                            </tr>`).join("")
                        }
                    </tbody>
                </table>
            </div>
        </div>`;
}

function renderDashboardContador(container) {
    const pending   = state.loans.filter(l => l.status === "Pendiente").length;
    const evaluated = state.loans.filter(l => l.status === "Evaluado por Contador").length;
    const total     = state.loans.length;
    const unread    = state.notifications.filter(n => n.role === "Contador" && n.unread).length;

    container.innerHTML = `
        <div class="page-header">
            <div><h2>Panel del Contador</h2><p>Revisión financiera de solicitudes de crédito y gestión de pagos.</p></div>
        </div>
        <div class="dashboard-grid">
            <div class="card" style="cursor:pointer;" onclick="navigateTo('evaluate-loans')">
                <div class="card-stat">
                    <div class="stat-info"><h3>Solicitudes Pendientes</h3><p>${pending}</p></div>
                    <div class="stat-icon warning"><i class="fas fa-file-circle-exclamation"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-arrow-right" style="color:var(--primary-light);"></i> Ir a evaluar créditos</div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Evaluados (En Consejo)</h3><p>${evaluated}</p></div>
                    <div class="stat-icon accent"><i class="fas fa-gavel"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-check"></i> Dictamen emitido</div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Total Créditos</h3><p>${total}</p></div>
                    <div class="stat-icon primary"><i class="fas fa-landmark"></i></div>
                </div>
                <div class="stat-footer">En todo el portafolio</div>
            </div>
            <div class="card" style="cursor:pointer;" onclick="toggleNotifPanel()">
                <div class="card-stat">
                    <div class="stat-info"><h3>Notificaciones</h3><p>${unread}</p></div>
                    <div class="stat-icon danger"><i class="fas fa-bell"></i></div>
                </div>
                <div class="stat-footer">Sin leer en bandeja</div>
            </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="navigateTo('evaluate-loans')"><i class="fas fa-check-double"></i> Evaluar Créditos</button>
            <button class="btn btn-secondary" onclick="navigateTo('payments-admin')"><i class="fas fa-coins"></i> Gestionar Pagos</button>
            <button class="btn btn-secondary" onclick="navigateTo('reports')"><i class="fas fa-chart-line"></i> Ver Reportes</button>
            <button class="btn btn-warning" onclick="simulateMoraTrigger()"><i class="fas fa-exclamation-triangle"></i> Simular Mora</button>
        </div>`;
}

function renderDashboardConsejo(container) {
    const toReview = state.loans.filter(l => l.status === "Evaluado por Contador" || l.hasAppeal).length;
    const approved = state.loans.filter(l => l.status === "Desembolsada").length;
    const unread   = state.notifications.filter(n => n.role === "Consejo" && n.unread).length;

    container.innerHTML = `
        <div class="page-header">
            <div><h2>Panel del Consejo de Administración</h2><p>Aprobación definitiva y control estratégico de créditos.</p></div>
        </div>
        <div class="dashboard-grid">
            <div class="card" style="cursor:pointer;" onclick="navigateTo('consejo-decisions')">
                <div class="card-stat">
                    <div class="stat-info"><h3>Pendientes de Ratificación</h3><p>${toReview}</p></div>
                    <div class="stat-icon danger"><i class="fas fa-balance-scale"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-arrow-right" style="color:var(--primary-light);"></i> Revisar ahora</div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Créditos Aprobados</h3><p>${approved}</p></div>
                    <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
                </div>
                <div class="stat-footer">Desembolsados exitosamente</div>
            </div>
            <div class="card" style="cursor:pointer;" onclick="toggleNotifPanel()">
                <div class="card-stat">
                    <div class="stat-info"><h3>Notificaciones</h3><p>${unread}</p></div>
                    <div class="stat-icon accent"><i class="fas fa-bell"></i></div>
                </div>
                <div class="stat-footer">Sin leer en bandeja</div>
            </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="navigateTo('consejo-decisions')"><i class="fas fa-gavel"></i> Ir a Resoluciones</button>
            <button class="btn btn-secondary" onclick="navigateTo('reports')"><i class="fas fa-chart-line"></i> Reportes Ejecutivos</button>
        </div>`;
}

function renderDashboardAdmin(container) {
    const totalUsers = state.users.length;
    const totalLoans = state.loans.length;
    const totalLogs  = state.logs.length;

    container.innerHTML = `
        <div class="page-header">
            <div><h2>Panel de Administración del Sistema</h2><p>Visión completa del sistema, usuarios y bitácora de auditoría.</p></div>
        </div>
        <div class="dashboard-grid">
            <div class="card" style="cursor:pointer;" onclick="navigateTo('users-admin')">
                <div class="card-stat">
                    <div class="stat-info"><h3>Usuarios Registrados</h3><p>${totalUsers}</p></div>
                    <div class="stat-icon primary"><i class="fas fa-users"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-arrow-right" style="color:var(--primary-light);"></i> Gestionar usuarios</div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Total de Créditos</h3><p>${totalLoans}</p></div>
                    <div class="stat-icon warning"><i class="fas fa-file-invoice-dollar"></i></div>
                </div>
                <div class="stat-footer">En el portafolio cooperativo</div>
            </div>
            <div class="card" style="cursor:pointer;" onclick="navigateTo('audit-logs')">
                <div class="card-stat">
                    <div class="stat-info"><h3>Eventos en Bitácora</h3><p>${totalLogs}</p></div>
                    <div class="stat-icon accent"><i class="fas fa-shield-alt"></i></div>
                </div>
                <div class="stat-footer"><i class="fas fa-arrow-right" style="color:var(--primary-light);"></i> Ver trazabilidad</div>
            </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="navigateTo('users-admin')"><i class="fas fa-users-cog"></i> Gestionar Usuarios</button>
            <button class="btn btn-secondary" onclick="navigateTo('audit-logs')"><i class="fas fa-shield-alt"></i> Bitácora de Auditoría</button>
            <button class="btn btn-warning" onclick="simulateMoraTrigger()"><i class="fas fa-exclamation-triangle"></i> Simular Alerta de Mora</button>
        </div>`;
}

// ================================================================
// VISTA: SOLICITUD DE CRÉDITO (CU-02)
// ================================================================
function initLoanForm() {
    const typeSelect = document.getElementById("loan-type");
    if (!typeSelect) return;
    typeSelect.onchange = handleLoanTypeChange;
    document.getElementById("loan-amount").oninput = updateAmortizationPreview;
    document.getElementById("loan-term").oninput   = updateAmortizationPreview;

    if (state.currentUser) {
        const salaryField = document.getElementById("loan-salary");
        if (salaryField) salaryField.value = state.currentUser.salary;
    }
    handleLoanTypeChange();
}

function handleLoanTypeChange() {
    const type  = document.getElementById("loan-type")?.value;
    const rules = LOAN_RULES[type];
    if (!rules) return;

    const amountHelp  = document.getElementById("amount-help");
    const termHelp    = document.getElementById("term-help");
    const salarySection = document.getElementById("salary-section");
    const docsSection   = document.getElementById("docs-upload-section");
    const amortPreview  = document.getElementById("amortization-preview");

    if (amountHelp)  amountHelp.textContent  = `Mín: $${rules.min.toLocaleString()} — Máx: $${rules.max.toLocaleString()}`;
    if (termHelp)    termHelp.textContent    = `Plazo máximo permitido: ${rules.maxTerm} meses`;
    if (salarySection) salarySection.style.display  = rules.salaryLimit ? "block" : "none";
    if (docsSection)   docsSection.style.display    = rules.requiresDocs ? "block" : "none";
    if (amortPreview)  amortPreview.style.display   = "block";

    updateAmortizationPreview();
}

function updateAmortizationPreview() {
    const type      = document.getElementById("loan-type")?.value;
    const principal = parseFloat(document.getElementById("loan-amount")?.value) || 0;
    const months    = parseInt(document.getElementById("loan-term")?.value) || 0;
    const rules     = LOAN_RULES[type];
    if (!rules || !months) return;

    const fee          = parseFloat(calculateAmortization(principal, rules.rate, months));
    const totalPayable = (fee * months).toFixed(2);
    const totalInterest= Math.max(0, totalPayable - principal).toFixed(2);

    const rateEl    = document.getElementById("rate-preview");
    const feeEl     = document.getElementById("calc-fee");
    const intEl     = document.getElementById("calc-interest");
    const totalEl   = document.getElementById("calc-total");

    if (rateEl)  rateEl.textContent  = `${rules.rate}% Anual`;
    if (feeEl)   feeEl.textContent   = `$${fee.toFixed(2)}`;
    if (intEl)   intEl.textContent   = `$${totalInterest}`;
    if (totalEl) totalEl.textContent = `$${totalPayable}`;
}

function handleDocSelection(input) {
    const fileList = document.getElementById("form-file-list");
    if (!fileList) return;
    fileList.innerHTML = "";
    state.tempFiles = Array.from(input.files);
    state.tempFiles.forEach((file, i) => {
        const ext = file.name.split(".").pop().toLowerCase();
        const icon = ext === "pdf" ? "fa-file-pdf" : "fa-file-image";
        const color = ext === "pdf" ? "var(--danger)" : "var(--primary-light)";
        fileList.innerHTML += `
            <div class="file-item">
                <span><i class="fas ${icon}" style="color:${color};margin-right:6px;"></i>${file.name}</span>
                <span class="file-item-remove" onclick="removeTempFile(${i})" title="Eliminar">&times;</span>
            </div>`;
    });
}

function removeTempFile(index) {
    state.tempFiles.splice(index, 1);
    const input = document.getElementById("loan-docs");
    if (input) input.value = "";
    // Re-renderizar lista
    const fileList = document.getElementById("form-file-list");
    if (fileList) fileList.innerHTML = "";
    state.tempFiles.forEach((file, i) => {
        const ext = file.name.split(".").pop().toLowerCase();
        const icon = ext === "pdf" ? "fa-file-pdf" : "fa-file-image";
        fileList.innerHTML += `
            <div class="file-item">
                <span><i class="fas ${icon}" style="color:var(--danger);margin-right:6px;"></i>${file.name}</span>
                <span class="file-item-remove" onclick="removeTempFile(${i})">&times;</span>
            </div>`;
    });
}

function handleLoanSubmit() {
    const type   = document.getElementById("loan-type")?.value;
    const amount = parseFloat(document.getElementById("loan-amount")?.value);
    const term   = parseInt(document.getElementById("loan-term")?.value);
    const rules  = LOAN_RULES[type];

    if (!rules) return;

    if (isNaN(amount) || amount < rules.min || amount > rules.max) {
        showToast(`El monto debe estar entre $${rules.min} y $${rules.max.toLocaleString()}.`, "danger");
        return;
    }
    if (isNaN(term) || term < 1 || term > rules.maxTerm) {
        showToast(`El plazo debe estar entre 1 y ${rules.maxTerm} meses.`, "danger");
        return;
    }
    if (rules.requiresDocs && state.tempFiles.length === 0) {
        showToast("Esta línea de crédito requiere documentación adjunta.", "warning");
        return;
    }

    const newLoan = {
        id:           `PRE-${Date.now().toString().slice(-4)}`,
        type, amount, term,
        rate:         rules.rate,
        associate:    state.currentUser.name,
        status:       "Pendiente",
        date:         new Date().toISOString().split("T")[0],
        balance:      amount,
        monthlyFee:   parseFloat(calculateAmortization(amount, rules.rate, term)),
        payments:     [],
        riskStatus:   "Pendiente",
        technicalReport: "",
        freezeMonths: 0,
        hasAppeal:    false
    };

    state.loans.push(newLoan);
    addAuditLog(`Nueva solicitud radicada: ${newLoan.id} — ${type} por $${amount}`, "Financiero");
    addNotification(
        `Nueva solicitud ${newLoan.id} (${type}, $${amount}) radicada y pendiente de análisis técnico.`,
        "Contador", "info"
    );
    showToast(`Solicitud ${newLoan.id} enviada exitosamente al Contador para evaluación.`, "success");
    navigateTo("dashboard");
}

// ================================================================
// VISTA: EVALUACIÓN TÉCNICA DEL CONTADOR (CU-03)
// ================================================================
function renderEvaluateLoans(container) {
    if (!container) container = document.getElementById("view-evaluate-loans");
    if (!container) return;

    const pending = state.loans.filter(l => l.status === "Pendiente");

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Evaluación Técnica de Riesgo</h2>
                <p>Analice cada solicitud, determine el nivel de riesgo crediticio y emita el dictamen técnico.</p>
            </div>
        </div>
        ${pending.length === 0
            ? `<div class="card"><div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success);"></i><p>No hay solicitudes pendientes de evaluación en este momento.</p></div></div>`
            : pending.map(l => `
            <div class="card" style="margin-bottom:20px;">
                <div class="card-header">
                    <div>
                        <div class="card-title">${l.id} — ${l.type}</div>
                        <div style="color:var(--text-muted);font-size:13px;margin-top:3px;">
                            Solicitado por: <strong>${l.associate}</strong> · ${l.date}
                        </div>
                    </div>
                    <span class="badge badge-pending">Pendiente de Evaluación</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;">
                    <div>
                        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:10px;">Detalles del Crédito</div>
                        <div class="loan-detail-row"><span>Monto Solicitado</span><span>$${l.amount.toLocaleString()}</span></div>
                        <div class="loan-detail-row"><span>Plazo</span><span>${l.term} meses</span></div>
                        <div class="loan-detail-row"><span>Tasa Aplicada</span><span>${l.rate}% anual</span></div>
                        <div class="loan-detail-row"><span>Cuota Mensual</span><span>$${l.monthlyFee}</span></div>
                        <div class="loan-detail-row"><span>Total a Pagar</span><span>$${(l.monthlyFee * l.term).toFixed(2)}</span></div>
                    </div>
                    <div>
                        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:10px;">Dictamen del Contador</div>
                        <div class="action-panel">
                            <label for="risk-${l.id}">Nivel de Riesgo Crediticio</label>
                            <select id="risk-${l.id}">
                                <option value="Bajo">Riesgo Bajo — Recomendado para aprobación</option>
                                <option value="Medio">Riesgo Medio — Requiere condiciones adicionales</option>
                                <option value="Alto">Riesgo Alto — No recomendado</option>
                            </select>
                            <label for="report-${l.id}" style="margin-top:4px;">Informe Técnico Financiero <span style="color:var(--danger);">*</span></label>
                            <textarea id="report-${l.id}" placeholder="Redacte el análisis financiero, historial crediticio, capacidad de pago y recomendación..."
                                      style="min-height:80px;"></textarea>
                            <div style="display:flex;gap:8px;margin-top:6px;">
                                <button class="btn btn-primary btn-sm" onclick="submitEvaluation('${l.id}', true)">
                                    <i class="fas fa-check"></i> Emitir Dictamen Favorable
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="submitEvaluation('${l.id}', false)">
                                    <i class="fas fa-times"></i> Emitir Rechazo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`).join("")
        }`;
}

function submitEvaluation(loanId, isApproved) {
    const riskEl   = document.getElementById(`risk-${loanId}`);
    const reportEl = document.getElementById(`report-${loanId}`);
    if (!riskEl || !reportEl) return;

    const risk   = riskEl.value;
    const report = reportEl.value.trim();

    if (!report) {
        showToast("El informe técnico es obligatorio antes de emitir el dictamen.", "danger");
        return;
    }

    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    loan.riskStatus     = risk;
    loan.technicalReport = report;
    loan.status         = isApproved ? "Evaluado por Contador" : "Rechazada";

    addAuditLog(
        `Dictamen ${isApproved ? "favorable" : "desfavorable"} emitido para ${loanId}. Riesgo: ${risk}.`,
        "Financiero"
    );

    if (isApproved) {
        addNotification(
            `El crédito ${loanId} tiene dictamen técnico favorable (Riesgo: ${risk}) y está listo para ratificación del Consejo.`,
            "Consejo", "info"
        );
        showToast(`Dictamen favorable emitido. El crédito ${loanId} está en cola del Consejo.`, "success");
    } else {
        addNotification(
            `Su solicitud de crédito ${loanId} fue rechazada por el Contador tras análisis técnico. Motivo: ${report.substring(0, 80)}...`,
            "Asociado", "danger"
        );
        showToast(`Crédito ${loanId} marcado como rechazado formalmente.`, "danger");
    }

    saveState();
    renderEvaluateLoans(document.getElementById("view-evaluate-loans"));
}

// ================================================================
// VISTA: DECISIONES DEL CONSEJO (CU-03 — Aprobación Final)
// ================================================================
function renderConsejoDecisions(container) {
    if (!container) container = document.getElementById("view-consejo-decisions");
    if (!container) return;

    const queue = state.loans.filter(l => l.status === "Evaluado por Contador" || (l.hasAppeal && l.status === "Rechazada"));

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Resoluciones del Consejo de Administración</h2>
                <p>Ratifique o deniegue los créditos dictaminados por el Contador. Puede otorgar períodos de gracia.</p>
            </div>
        </div>
        ${queue.length === 0
            ? `<div class="card"><div class="empty-state"><i class="fas fa-gavel" style="color:var(--text-muted);"></i><p>No hay créditos pendientes de resolución por el Consejo.</p></div></div>`
            : queue.map(l => `
            <div class="card" style="margin-bottom:20px;">
                <div class="card-header">
                    <div>
                        <div class="card-title">${l.id} — ${l.associate}</div>
                        <div style="color:var(--text-muted);font-size:13px;margin-top:3px;">${l.type} · $${l.amount.toLocaleString()} · ${l.term} meses</div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        ${l.hasAppeal ? `<span class="badge badge-danger"><i class="fas fa-exclamation"></i> Apelación</span>` : ''}
                        <span class="badge badge-review">En revisión del Consejo</span>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;">
                    <div>
                        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:10px;">Informe del Contador</div>
                        <div class="loan-detail-row"><span>Riesgo determinado</span>
                            <span><strong>${l.riskStatus}</strong></span></div>
                        <div class="loan-detail-row"><span>Cuota Mensual</span><span>$${l.monthlyFee}/mes</span></div>
                        <div style="margin-top:10px;padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;font-style:italic;border-left:3px solid var(--primary-light);">
                            "${l.technicalReport || 'Sin informe adjunto.'}"
                        </div>
                    </div>
                    <div>
                        <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:10px;">Resolución del Consejo</div>
                        <div class="action-panel">
                            <label for="freeze-${l.id}">Meses de Gracia / Congelamiento (0–6)</label>
                            <input type="number" id="freeze-${l.id}" value="0" min="0" max="6" style="width:80px;padding:6px 10px;">
                            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                                <button class="btn btn-success btn-sm" onclick="submitConsejoVerdict('${l.id}', true)">
                                    <i class="fas fa-check-double"></i> Ratificar y Desembolsar
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="submitConsejoVerdict('${l.id}', false)">
                                    <i class="fas fa-ban"></i> Denegar Definitivamente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`).join("")
        }`;
}

function submitConsejoVerdict(loanId, approve) {
    const freezeEl = document.getElementById(`freeze-${loanId}`);
    const freeze   = freezeEl ? parseInt(freezeEl.value) || 0 : 0;
    const loan     = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    if (approve) {
        loan.status      = "Desembolsada";
        loan.freezeMonths= freeze;
        loan.hasAppeal   = false;
        addAuditLog(`Consejo ratificó préstamo ${loanId}. Desembolsado con ${freeze} mes(es) de gracia.`, "Financiero");
        addNotification(
            `¡Su crédito ${loanId} fue aprobado y desembolsado por el Consejo de Administración! ${freeze > 0 ? `Período de gracia: ${freeze} mes(es).` : ''}`,
            "Asociado", "success"
        );
        showToast(`Crédito ${loanId} desembolsado exitosamente.`, "success");
    } else {
        loan.status    = "Rechazada";
        loan.hasAppeal = false;
        addAuditLog(`Consejo denegó definitivamente el crédito ${loanId}.`, "Seguridad");
        addNotification(
            `Su solicitud de crédito ${loanId} fue denegada definitivamente por el Consejo de Administración.`,
            "Asociado", "danger"
        );
        showToast(`Crédito ${loanId} denegado por el Consejo.`, "danger");
    }

    saveState();
    renderConsejoDecisions(document.getElementById("view-consejo-decisions"));
}

// ================================================================
// VISTA: PASARELA DE PAGOS — ASOCIADO (CU-04)
// ================================================================
function renderPaymentsAsociado(container) {
    if (!container) container = document.getElementById("view-payments-asociado");
    if (!container) return;

    const active = state.loans.filter(l =>
        l.associate === state.currentUser?.name && l.status === "Desembolsada"
    );

    container.innerHTML = `
        <div class="page-header">
            <div><h2>Pasarela Unificada de Pagos</h2><p>Realice abonos a sus créditos activos. Cada pago queda registrado con comprobante digital.</p></div>
        </div>
        ${active.length === 0
            ? `<div class="card"><div class="empty-state"><i class="fas fa-wallet"></i><p>No tiene créditos activos con saldo pendiente.</p></div></div>`
            : active.map(l => `
            <div class="payment-card" style="margin-bottom:16px;">
                <div class="payment-card-info">
                    <strong>${l.id} <span style="color:var(--text-muted);font-weight:400;">· ${l.type}</span></strong>
                    <p>Saldo actual: <strong>$${parseFloat(l.balance).toFixed(2)}</strong> &nbsp;|&nbsp; Cuota del mes: <strong>$${l.monthlyFee}</strong></p>
                    ${l.freezeMonths > 0 ? `<p style="margin-top:6px;"><span class="badge badge-review"><i class="fas fa-pause-circle"></i> Período de gracia: ${l.freezeMonths} mes(es) restantes</span></p>` : ''}
                    ${l.payments.length > 0 ? `<p style="margin-top:6px;font-size:12px;color:var(--text-muted);">Último pago: ${l.payments[l.payments.length-1].date} — $${l.payments[l.payments.length-1].amount}</p>` : ''}
                </div>
                <button class="btn btn-primary" onclick="executeLoanPayment('${l.id}')">
                    <i class="fas fa-credit-card"></i> Pagar $${l.monthlyFee}
                </button>
            </div>
            <div id="payment-history-${l.id}" style="margin-bottom:20px;">
                ${l.payments.length > 0 ? `
                <div style="margin-left:8px;">
                    <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
                        Historial de Pagos (${l.payments.length} recibos)
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Recibo</th><th>Fecha</th><th>Monto</th><th>Tipo</th><th>Saldo Tras Pago</th><th>Estado</th></tr></thead>
                            <tbody>
                                ${l.payments.map(p => `
                                <tr>
                                    <td><code>${p.id}</code></td>
                                    <td>${p.date}</td>
                                    <td>$${parseFloat(p.amount).toFixed(2)}</td>
                                    <td>${p.type}</td>
                                    <td>$${parseFloat(p.balance).toFixed(2)}</td>
                                    <td><span class="badge badge-approved">${p.status}</span></td>
                                </tr>`).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>` : ''}
            </div>`).join("")
        }`;
}

function executeLoanPayment(loanId) {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    if (loan.balance <= 0) {
        showToast("Este crédito ya se encuentra totalmente cancelado.", "success");
        return;
    }

    const paid     = parseFloat(loan.monthlyFee);
    loan.balance   = Math.max(0, parseFloat(loan.balance) - paid);
    const payId    = `PAG-${Date.now().toString().slice(-4)}`;

    loan.payments.push({
        id:      payId,
        date:    new Date().toLocaleDateString("es-CR"),
        amount:  paid,
        type:    "Pago Web Pasarela",
        balance: loan.balance,
        status:  "Hacienda OK"
    });

    addAuditLog(`Pago vía pasarela para ${loanId}. Recibo: ${payId}. Nuevo saldo: $${loan.balance.toFixed(2)}`, "Financiero");
    addNotification(
        `Pago registrado para crédito ${loanId}. Recibo ${payId} · Monto: $${paid.toFixed(2)} · Saldo restante: $${loan.balance.toFixed(2)}.`,
        "Asociado", "success"
    );
    addNotification(
        `El asociado realizó un pago de $${paid.toFixed(2)} sobre el crédito ${loanId} (Recibo ${payId}).`,
        "Contador", "info"
    );
    showToast(`Pago procesado exitosamente. Recibo ${payId}. Saldo: $${loan.balance.toFixed(2)}`, "success");
    saveState();
    renderPaymentsAsociado(document.getElementById("view-payments-asociado"));
}

// ================================================================
// VISTA: GESTIÓN DE PAGOS — CONTADOR (CU-04)
// ================================================================
function renderPaymentsAdmin(container) {
    if (!container) container = document.getElementById("view-payments-admin");
    if (!container) return;

    const disbursed = state.loans.filter(l => l.status === "Desembolsada");

    container.innerHTML = `
        <div class="page-header">
            <div><h2>Gestión y Registro de Pagos</h2><p>Administre y registre manualmente pagos de cuotas, verifique moras y genere comprobantes.</p></div>
        </div>
        ${disbursed.length === 0
            ? `<div class="card"><div class="empty-state"><i class="fas fa-coins"></i><p>No hay créditos desembolsados activos.</p></div></div>`
            : `<div class="card">
                <div class="table-container">
                    <table>
                        <thead><tr>
                            <th>ID</th><th>Asociado</th><th>Tipo</th>
                            <th>Saldo</th><th>Cuota</th><th>Pagos</th><th>Acción</th>
                        </tr></thead>
                        <tbody>
                            ${disbursed.map(l => `
                            <tr>
                                <td><b>${l.id}</b></td>
                                <td>${l.associate}</td>
                                <td>${l.type}</td>
                                <td>$${parseFloat(l.balance).toFixed(2)}</td>
                                <td>$${l.monthlyFee}</td>
                                <td>${l.payments.length} pago(s)</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="registerManualPayment('${l.id}')">
                                        <i class="fas fa-plus"></i> Registrar Pago
                                    </button>
                                </td>
                            </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`
        }`;
}

function registerManualPayment(loanId) {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    if (loan.balance <= 0) { showToast("Crédito ya cancelado.", "success"); return; }

    const paid     = parseFloat(loan.monthlyFee);
    loan.balance   = Math.max(0, parseFloat(loan.balance) - paid);
    const payId    = `PAG-M${Date.now().toString().slice(-4)}`;

    loan.payments.push({ id: payId, date: new Date().toLocaleDateString("es-CR"), amount: paid, type: "Planilla/Ventanilla", balance: loan.balance, status: "Hacienda OK" });
    addAuditLog(`Pago manual registrado por Contador para ${loanId}. Recibo: ${payId}. Saldo: $${loan.balance.toFixed(2)}`, "Financiero");
    addNotification(`Pago registrado por el Contador para su crédito ${loanId}. Recibo ${payId} · $${paid.toFixed(2)}.`, "Asociado", "success");
    showToast(`Pago manual registrado. Recibo ${payId}.`, "success");
    saveState();
    renderPaymentsAdmin(document.getElementById("view-payments-admin"));
}

// ================================================================
// VISTA: REPORTES (CU-05/CU-06)
// ================================================================
function renderReports(container) {
    if (!container) container = document.getElementById("view-reports");
    if (!container) return;

    const total      = state.loans.length;
    const disbursed  = state.loans.filter(l => l.status === "Desembolsada").length;
    const pending    = state.loans.filter(l => l.status === "Pendiente").length;
    const rejected   = state.loans.filter(l => l.status === "Rechazada").length;
    const totalDebt  = state.loans.filter(l => l.status === "Desembolsada").reduce((s, l) => s + parseFloat(l.balance), 0).toFixed(2);
    const totalDisb  = state.loans.filter(l => l.status === "Desembolsada").reduce((s, l) => s + l.amount, 0).toFixed(2);

    container.innerHTML = `
        <div class="page-header">
            <div><h2>Centro de Reportes Financieros</h2><p>Consulte y exporte reportes en tiempo real según su nivel de acceso.</p></div>
            <button class="btn btn-secondary" onclick="showToast('Exportación PDF simulada exitosamente.','success')">
                <i class="fas fa-file-pdf" style="color:var(--danger);"></i> Exportar PDF
            </button>
        </div>
        <div class="dashboard-grid">
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Total Créditos</h3><p>${total}</p></div>
                    <div class="stat-icon primary"><i class="fas fa-landmark"></i></div>
                </div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Desembolsados</h3><p>${disbursed}</p></div>
                    <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
                </div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>En Revisión</h3><p>${pending}</p></div>
                    <div class="stat-icon warning"><i class="fas fa-clock"></i></div>
                </div>
            </div>
            <div class="card">
                <div class="card-stat">
                    <div class="stat-info"><h3>Rechazados</h3><p>${rejected}</p></div>
                    <div class="stat-icon danger"><i class="fas fa-times-circle"></i></div>
                </div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            <div class="card">
                <div class="card-title" style="margin-bottom:14px;">Resumen de Cartera</div>
                <div class="loan-detail-row"><span>Capital Total Desembolsado</span><span>$${parseFloat(totalDisb).toLocaleString()}</span></div>
                <div class="loan-detail-row"><span>Saldo Pendiente de Recuperación</span><span>$${parseFloat(totalDebt).toLocaleString()}</span></div>
                <div class="loan-detail-row"><span>Tasa Promedio de Cartera</span><span>${(state.loans.reduce((s,l)=>s+l.rate,0)/Math.max(state.loans.length,1)).toFixed(1)}% anual</span></div>
            </div>
            <div class="card">
                <div class="card-title" style="margin-bottom:14px;">Distribución por Estado</div>
                ${["Pendiente","Evaluado por Contador","Desembolsada","Rechazada"].map(status => {
                    const count = state.loans.filter(l => l.status === status).length;
                    const pct   = total > 0 ? Math.round(count/total*100) : 0;
                    return `
                    <div style="margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                            <span><span class="badge ${getStatusBadgeClass(status)}">${status}</span></span>
                            <span>${count} (${pct}%)</span>
                        </div>
                        <div style="background:#f1f5f9;border-radius:4px;height:6px;">
                            <div style="background:var(--primary-light);height:100%;border-radius:4px;width:${pct}%;transition:width 0.5s;"></div>
                        </div>
                    </div>`;
                }).join("")}
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Detalle Completo del Portafolio</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>ID</th><th>Asociado</th><th>Tipo</th><th>Monto</th><th>Saldo</th><th>Tasa</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${state.loans.map(l => `
                        <tr>
                            <td><b>${l.id}</b></td>
                            <td>${l.associate}</td>
                            <td>${l.type}</td>
                            <td>$${l.amount.toLocaleString()}</td>
                            <td>$${parseFloat(l.balance).toFixed(2)}</td>
                            <td>${l.rate}%</td>
                            <td><span class="badge ${getStatusBadgeClass(l.status)}">${l.status}</span></td>
                        </tr>`).join("")}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// ================================================================
// VISTA: APELACIONES (CU-03 alterno)
// ================================================================
function executeAppeal(loanId) {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    loan.hasAppeal = true;
    addAuditLog(`Asociado interpuso recurso de apelación sobre rechazo de crédito ${loanId}.`, "Seguridad");
    addNotification(
        `Alerta: El asociado apeló el rechazo del crédito ${loanId}. Se requiere revisión institucional por el Consejo.`,
        "Consejo", "warning"
    );
    addNotification(
        `Su apelación sobre el crédito ${loanId} fue enviada al Consejo de Administración para revisión.`,
        "Asociado", "info"
    );
    showToast("Apelación elevada al Consejo de Administración.", "success");
    saveState();
    renderDashboard(document.getElementById("view-dashboard"));
}

// ================================================================
// VISTA: USUARIOS ADMIN (CU-08)
// ================================================================
function renderUsersAdmin() {
    const tbody = document.getElementById("admin-users-table");
    if (!tbody) return;
    tbody.innerHTML = state.users.map(u => `
        <tr>
            <td><code>${u.id}</code></td>
            <td><strong>${u.name}</strong></td>
            <td><code>${u.username}</code></td>
            <td><span class="badge badge-info">${u.role}</span></td>
            <td><span class="badge ${u.riskScore === 'Bajo' ? 'badge-approved' : 'badge-rejected'}">${u.riskScore}</span></td>
            <td><span class="badge ${u.status === 'Activo' ? 'badge-approved' : 'badge-pending'}">${u.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="toggleUserStatus('${u.id}')">
                    <i class="fas fa-${u.status === 'Activo' ? 'user-slash' : 'user-check'}"></i>
                    ${u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                </button>
            </td>
        </tr>`).join("");
}

function showAddUserForm()  { document.getElementById("add-user-form-card").style.display = "block"; }
function hideAddUserForm()  { document.getElementById("add-user-form-card").style.display = "none"; }

function saveNewUser() {
    const name     = document.getElementById("new-user-name")?.value.trim();
    const username = document.getElementById("new-user-username")?.value.trim();
    const role     = document.getElementById("new-user-role")?.value;
    const salary   = parseFloat(document.getElementById("new-user-salary")?.value) || 0;

    if (!name || !username) { showToast("Nombre e identificador son obligatorios.", "danger"); return; }
    if (state.users.some(u => u.username === username)) { showToast("Ese identificador ya está en uso.", "danger"); return; }

    const newUser = {
        id:        `U${(state.users.length + 1).toString().padStart(2, "0")}`,
        name, username, role, salary,
        status:    "Activo",
        riskScore: "Bajo"
    };
    state.users.push(newUser);
    addAuditLog(`Nuevo usuario registrado: ${name} (${username}) — Rol: ${role}`, "Seguridad");
    addNotification(`El usuario ${name} fue registrado como ${role} en el sistema.`, "Administrador", "success");
    showToast(`Usuario ${name} creado exitosamente.`, "success");
    saveState();
    hideAddUserForm();
    renderUsersAdmin();
}

function toggleUserStatus(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    user.status = user.status === "Activo" ? "Inactivo" : "Activo";
    addAuditLog(`Estado de usuario ${user.name} (${userId}) cambiado a: ${user.status}`, "Seguridad");
    showToast(`Usuario ${user.name} ${user.status === 'Activo' ? 'activado' : 'desactivado'}.`, user.status === 'Activo' ? "success" : "warning");
    saveState();
    renderUsersAdmin();
}

// ================================================================
// VISTA: BITÁCORA DE AUDITORÍA (CU-08)
// ================================================================
function renderAuditLogs() {
    const container = document.getElementById("full-log-list");
    if (!container) return;

    if (state.logs.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>No hay eventos registrados aún.</p></div>`;
        return;
    }

    container.innerHTML = state.logs.map(l => {
        const typeMap = {
            "Seguridad":  { cls: "security",  icon: "fa-shield-halved",    color: "var(--danger)"  },
            "Financiero": { cls: "financial",  icon: "fa-coins",            color: "var(--success)" },
            "Sistema":    { cls: "system",     icon: "fa-microchip",        color: "var(--warning)" }
        };
        const t = typeMap[l.type] || typeMap["Sistema"];
        return `
        <div class="log-item ${t.cls}">
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <i class="fas ${t.icon}" style="color:${t.color};margin-top:2px;"></i>
                <div style="flex:1;">
                    <div><strong>${l.user}</strong>: ${l.action}</div>
                    <div class="log-meta">
                        <span><i class="fas fa-tag" style="margin-right:3px;"></i>${l.type}</span>
                        <span><i class="fas fa-clock" style="margin-right:3px;"></i>${l.date}</span>
                    </div>
                </div>
            </div>
        </div>`;
    }).join("");
}

// ================================================================
// UTILIDADES
// ================================================================
function simulateMoraTrigger() {
    addAuditLog("Motor de análisis: Alerta de mora detectada — deudor con saldo vencido mayor a 30 días.", "Seguridad");
    addNotification("⚠️ Alerta de mora detectada en cartera. Se requiere gestión de cobranza inmediata.", "Contador", "warning");
    showToast("Alerta de mora inyectada en bitácora y enviada al Contador.", "danger");
}

// ================================================================
// INICIALIZACIÓN
// ================================================================
window.addEventListener("DOMContentLoaded", () => {
    loadState();
    setRole(state.activeRole || "Asociado");
});