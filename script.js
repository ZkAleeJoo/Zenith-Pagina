// ==========================================
// CONFIGURACIÓN GLOBAL 
// ==========================================
const CLIENT_ID = '1442510172961378457'; 
const REDIRECT_URI = 'https://zkaleejoo.github.io/Zenith-Pagina/shop.html';
const API_URL = 'http://mi4.tect.host:1302/api/stats'; 

// ==========================================
// 1. SISTEMA DE LOGIN (DISCORD OAUTH2)
// ==========================================

window.addEventListener('load', () => {
    checkLogin();
});

function loginConDiscord() {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    window.location.href = url;
}

function checkLogin() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchDiscordUser(accessToken);
    } else {
        const savedUser = localStorage.getItem('zenithUser');
        if (savedUser) {
            updateUI(JSON.parse(savedUser));
        }
    }
}

async function fetchDiscordUser(token) {
    try {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const user = await response.json();
        
        if (user.id) {
            localStorage.setItem('zenithUser', JSON.stringify(user));
            updateUI(user);
            showToast(`¡Bienvenido, ${user.username}!`, 'success');
        }
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        showToast('Error al iniciar sesión con Discord', 'error');
    }
}

function updateUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userDisplay = document.getElementById('user-info'); 

    if (loginBtn) loginBtn.style.display = 'none';
    
    if (userDisplay) {
        userDisplay.innerHTML = `
            <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" class="nav-avatar">
            <span>${user.username}</span>
            <button onclick="logout()" class="btn-logout">Salir</button>
        `;
    }
}

function logout() {
    localStorage.removeItem('zenithUser');
    window.location.reload();
}

// ==========================================
// 2. ESTADÍSTICAS DEL BOT (FETCH API)
// ==========================================
async function fetchStats() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if(document.getElementById('stat-servers')) document.getElementById('stat-servers').innerText = data.servers || '0';
        if(document.getElementById('stat-users')) document.getElementById('stat-users').innerText = `+${data.users || '0'}`;
        if(document.getElementById('stat-ping')) document.getElementById('stat-ping').innerText = `${Math.round(data.ping)}ms`;

    } catch (error) {
        console.error('Bot Offline:', error);
        if(document.getElementById('stat-ping')) document.getElementById('stat-ping').innerText = 'Offline';
    }
}

if(document.getElementById('stat-ping')) {
    fetchStats();
    setInterval(fetchStats, 30000); 
}

// ==========================================
// 3. UTILIDADES (NOTIFICACIONES)
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}