// ==========================================
// CONFIGURACIÓN DE ZENITH PÁGINA
// ==========================================
const CLIENT_ID = '1442510172961378457'; 
const REDIRECT_URI = 'https://zkaleejoo.github.io/Zenith-Pagina/shop.html';
const API_URL = 'http://mi4.tect.host:1302/api/stats'; 

// ==========================================
// SISTEMA DE LOGIN (DISCORD OAUTH2)
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
        fetchDiscordUser(accessToken);
        window.history.replaceState(null, null, window.location.pathname);
    } 
    else {
        const savedUser = localStorage.getItem('zenithUser');
        if (savedUser) {
            updateUserUI(JSON.parse(savedUser));
        }
    }
}

async function fetchDiscordUser(token) {
    try {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Token inválido');
        const userData = await response.json();
        
        const userSimple = {
            username: userData.username,
            avatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`,
            id: userData.id
        };

        localStorage.setItem('zenithUser', JSON.stringify(userSimple));
        updateUserUI(userSimple);
        showToast(`¡Hola, ${userSimple.username}!`, 'success');
    } catch (error) {
        console.error('Error al loguear:', error);
    }
}

function updateUserUI(user) {
    const nameEl = document.getElementById('user-name');
    const avatarImg = document.getElementById('user-avatar-img');
    const defaultIcon = document.getElementById('default-icon');
    const loginBtn = document.getElementById('discord-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (nameEl && user) {
        nameEl.innerText = user.username;
        if (avatarImg) {
            avatarImg.src = user.avatar;
            avatarImg.style.display = 'block';
            if(defaultIcon) defaultIcon.style.display = 'none';
        }
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('zenithUser');
    location.reload(); 
}

// ==========================================
// SISTEMA DE ESTADÍSTICAS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    async function fetchStats() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            if(document.getElementById('stat-servers')) document.getElementById('stat-servers').innerText = data.servers;
            if(document.getElementById('stat-users')) document.getElementById('stat-users').innerText = `+${data.users}`;
            if(document.getElementById('stat-ping')) document.getElementById('stat-ping').innerText = `${Math.round(data.ping)}ms`;
        } catch (error) {
            if(document.getElementById('stat-ping')) document.getElementById('stat-ping').innerText = 'Offline';
        }
    }
    if(document.getElementById('stat-ping')) {
        fetchStats();
        setInterval(fetchStats, 10000); 
    }
});

// ==========================================
// SISTEMA DEL CARRITO (CÓDIGO ORIGINAL CORREGIDO)
// ==========================================
let myCart = JSON.parse(localStorage.getItem('zenithCart')) || [];
let isDonationMode = false;
let donationAmount = 0;

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI(); 
    const shopButtons = document.querySelectorAll('.btn-shop');
    shopButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const product = {
                name: this.getAttribute('data-name'),
                price: parseFloat(this.getAttribute('data-price'))
            };
            myCart.push(product);
            saveCart();
            showToast(`¡${product.name} añadido!`, 'success');
        });
    });
    const cartIcon = document.querySelector('.cart-icon');
    if(cartIcon) cartIcon.addEventListener('click', openCartLogic);
});

function saveCart() {
    localStorage.setItem('zenithCart', JSON.stringify(myCart));
    updateCartUI();
}

function updateCartUI() {
    const cartSpan = document.querySelector('.cart-icon span');
    if (cartSpan) cartSpan.innerText = `${myCart.length} items`;
}

function openCartLogic() {
    isDonationMode = false; 
    const user = localStorage.getItem('zenithUser');
    if (!user) {
        openModal('modal-login');
    } else {
        renderCartItems();
        openModal('modal-cart');
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-price');
    container.innerHTML = ''; 
    let total = 0;
    if (myCart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Carrito vacío</p>';
    } else {
        myCart.forEach((item, index) => {
            total += item.price;
            container.innerHTML += `<div class="cart-item-row"><span>${item.name}</span><span>$${item.price.toFixed(2)}</span><i class="fas fa-trash" onclick="removeFromCart(${index})"></i></div>`;
        });
    }
    if(totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
}

window.removeFromCart = function(index) {
    myCart.splice(index, 1);
    saveCart();
    renderCartItems(); 
};

// MODALES Y PAGOS
function openModal(id) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById(id).classList.add('active');
}

window.closeModals = function() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal-box').forEach(m => m.classList.remove('active'));
};

function startPayment(method) {
    const total = isDonationMode ? donationAmount : myCart.reduce((s, i) => s + i.price, 0);
    if (total <= 0) return showToast("Monto inválido", "error");

    const paymentContent = document.getElementById('payment-content');
    document.getElementById('cart-view-main').style.display = 'none';
    document.getElementById('cart-view-payment').style.display = 'block';

    if (method === 'paypal') {
        paymentContent.innerHTML = `<p>Enviar <b>$${total.toFixed(2)}</b> a PayPal. Luego usa /confirmar-pago.</p>
        <a href="https://www.paypal.com/paypalme/AlejandroPretell/${total}" target="_blank" class="btn btn-primary">Pagar</a>`;
    }
}

function showToast(m, t) {
    const c = document.getElementById('toast-container');
    if(!c) return;
    const toast = document.createElement('div');
    toast.className = `toast ${t}`;
    toast.innerText = m;
    c.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}