/* --- ESTADÍSTICAS DEL BOT --- */
document.addEventListener('DOMContentLoaded', () => {
    // Si estás en local, usa localhost. Si lo subes a un host, cambia esto.
    const API_URL = 'http://localhost:3000/api/stats'; 

    async function fetchStats() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            // Verificar si los elementos existen antes de asignar (para evitar errores en páginas donde no estén)
            if(document.getElementById('stat-servers')) document.getElementById('stat-servers').innerText = data.servers;
            if(document.getElementById('stat-users')) document.getElementById('stat-users').innerText = `+${data.users}`;
            if(document.getElementById('stat-ping')) document.getElementById('stat-ping').innerText = `${Math.round(data.ping)}ms`;

        } catch (error) {
            console.error('Error al obtener estadísticas (Bot posiblemente offline):', error);
            if(document.getElementById('stat-ping')) document.getElementById('stat-ping').innerText = 'Offline';
        }
    }

    // Ejecutar solo si estamos en la página de inicio (donde existen los stats)
    if(document.getElementById('stat-ping')) {
        fetchStats();
        setInterval(fetchStats, 30000); 
    }
});


/* --- SISTEMA DE LOGIN SIMPLE (Discord OAuth2 Implicit) --- */
window.addEventListener('load', () => {
    checkLogin();
});

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
            headers: {
                Authorization: `Bearer ${token}`
            }
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
        nameEl.style.color = '#00ff88'; 

        if (user.avatar) {
            avatarImg.src = user.avatar;
            avatarImg.style.display = 'block';
            defaultIcon.style.display = 'none';
        }

        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('zenithUser');
    location.reload(); 
}


/* --- LÓGICA DEL CARRITO PRO --- */
// (Aquí borré la lógica antigua duplicada)

let myCart = JSON.parse(localStorage.getItem('zenithCart')) || [];

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

            const originalText = this.innerText;
            const originalBg = this.style.backgroundColor;
            
            this.innerText = "¡Añadido!";
            this.style.backgroundColor = "#00ff88"; 
            this.style.color = "#000";
            
            setTimeout(() => {
                this.innerText = originalText;
                this.style.backgroundColor = originalBg; 
                this.style.color = "";
            }, 1000);
        });
    });

    const cartIcon = document.querySelector('.cart-icon');
    if(cartIcon) {
        cartIcon.addEventListener('click', openCartLogic);
    }
});

function saveCart() {
    localStorage.setItem('zenithCart', JSON.stringify(myCart));
    updateCartUI();
}

function updateCartUI() {
    const cartSpan = document.querySelector('.cart-icon span');
    if (cartSpan) {
        cartSpan.innerText = `${myCart.length} items`;
    }
}

function openCartLogic() {
    const user = localStorage.getItem('zenithUser');

    if (!user) {
        openModal('modal-login');
    } 
    else {
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
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Tu carrito está vacío 👻</p>';
    } else {
        myCart.forEach((item, index) => {
            total += item.price;
            container.innerHTML += `
                <div class="cart-item-row">
                    <span>${item.name}</span>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="color: var(--color-primary);">$${item.price.toFixed(2)}</span>
                        <i class="fas fa-trash" onclick="removeFromCart(${index})" style="cursor:pointer; color:#ff4444; font-size:0.8rem;"></i>
                    </div>
                </div>
            `;
        });
    }

    totalEl.innerText = `$${total.toFixed(2)}`;
}

window.removeFromCart = function(index) {
    myCart.splice(index, 1);
    saveCart();
    renderCartItems(); 
};


function openModal(modalId) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById(modalId).classList.add('active');
}

window.closeModals = function() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal-box').forEach(box => box.classList.remove('active'));
};

const overlay = document.getElementById('modal-overlay');
if (overlay) {
    overlay.addEventListener('click', closeModals);
}


/* --- SISTEMA DE PAGOS (PAYPAL & YAPE) --- */

function startPayment(method) {
    const mainView = document.getElementById('cart-view-main');
    const paymentView = document.getElementById('cart-view-payment');
    const paymentContent = document.getElementById('payment-content');
    const cartTitle = document.getElementById('cart-title');

    let total = 0;
    myCart.forEach(item => total += item.price);

    if (total === 0) {
        alert("¡Tu carrito está vacío!");
        return;
    }

    mainView.style.display = 'none';
    paymentView.style.display = 'block';

    if (method === 'paypal') {
        cartTitle.innerHTML = '<i class="fab fa-paypal"></i> Pagar con PayPal';
        const paypalLink = `https://www.paypal.com/paypalme/AlejandroPretell/${total}`;
        
        paymentContent.innerHTML = `
            <p>Estás a punto de pagar <strong>$${total.toFixed(2)} USD</strong></p>
            <div style="margin: 20px 0;">
                <a href="${paypalLink}" target="_blank" class="btn btn-primary" style="background: #00457C;">
                    Pagar Ahora en PayPal
                </a>
            </div>
            <div class="instruction-step">
                <div class="step-num">1</div>
                <div>Realiza el pago en la nueva pestaña.</div>
            </div>
            <div class="instruction-step">
                <div class="step-num">2</div>
                <div>Toma una captura del recibo.</div>
            </div>
            <div class="instruction-step">
                <div class="step-num">3</div>
                <div>Envía la captura a nuestro Discord para recibir tus items.</div>
            </div>
        `;
    } 
    else if (method === 'yape') {
        cartTitle.innerHTML = '📱 Pagar con Yape';
        const totalSoles = (total * 3.80).toFixed(2);
        
        paymentContent.innerHTML = `
            <p>Total a pagar: <strong>S/ ${totalSoles}</strong></p>
            
            <div class="qr-container">
                <img src="assets/img/qr-yape.png" class="qr-img" alt="QR Yape">
            </div>

            <div class="instruction-step">
                <div class="step-num">1</div>
                <div>Escanea el QR desde tu app Yape.</div>
            </div>
            <div class="instruction-step">
                <div class="step-num">2</div>
                <div>Envía el monto exacto de <strong>S/ ${totalSoles}</strong>.</div>
            </div>
            <div class="instruction-step">
                <div class="step-num">3</div>
                <div>Envía la captura del "Yapeo" a nuestro Discord.</div>
            </div>
        `;
    }
}

function backToCart() {
    document.getElementById('cart-view-main').style.display = 'block';
    document.getElementById('cart-view-payment').style.display = 'none';
    document.getElementById('cart-title').innerHTML = '<i class="fas fa-shopping-cart"></i> Tu Botín';
}