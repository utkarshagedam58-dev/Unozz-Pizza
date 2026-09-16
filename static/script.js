let cart = [];
let appliedCoupon = null;
let appliedDiscount = 0;

function addToCart(id) {
    const item = menuItems.find(x => x.id === id);
    if (!item) return;

    const existing = cart.find(x => x.id === id);
    if (existing) existing.qty++;
    else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });

    updateCart();
    openCart();
}

function getSubtotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getDelivery(subtotal = getSubtotal()) {
    return subtotal >= 499 ? 0 : 40;
}

function updateCart() {
    const cartItems = document.getElementById("cartItems");
    const subtotal = getSubtotal();
    const delivery = getDelivery(subtotal);

    document.getElementById("cartCount").innerText = cart.reduce((sum, item) => sum + item.qty, 0);

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty 🛒</p>';
        document.getElementById("subtotal").innerText = "₹0";
        document.getElementById("delivery").innerText = "FREE";
        document.getElementById("total").innerText = "₹0";
        document.getElementById("cartDiscountRow").classList.add("hidden");
        resetCoupon();
        return;
    }

    cartItems.innerHTML = "";

    cart.forEach((item, index) => {
        cartItems.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${escapeHtml(item.name)}</strong>
                    <p>₹${item.price} × ${item.qty}</p>
                </div>
                <div class="quantity">
                    <button onclick="changeQty(${index}, -1)">−</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>`;
    });

    let discount = 0;
    if (appliedCoupon) {
        discount = Math.round(subtotal * 0.20 * 100) / 100;
        appliedDiscount = discount;
    }
    const total = Math.max(0, subtotal + delivery - discount);

    document.getElementById("subtotal").innerText = "₹" + subtotal.toFixed(0);
    document.getElementById("delivery").innerText = delivery === 0 ? "FREE" : "₹" + delivery.toFixed(0);
    document.getElementById("total").innerText = "₹" + total.toFixed(2);

    if (discount > 0) {
        document.getElementById("cartDiscountRow").classList.remove("hidden");
        document.getElementById("cartDiscount").innerText = "-₹" + discount.toFixed(2);
    } else {
        document.getElementById("cartDiscountRow").classList.add("hidden");
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

function changeQty(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    updateCart();
    updateCheckoutSummary();
}

function openCart() { document.getElementById("cartOverlay").classList.add("show"); }
function closeCart() { document.getElementById("cartOverlay").classList.remove("show"); }

async function checkout() {
    if (cart.length === 0) {
        alert("Please add an item first 🍕");
        return;
    }

    const meResponse = await fetch("/me");
    const meData = await meResponse.json();

    if (!meData.logged_in) {
        alert("Please log in before checkout so your order can be saved to your account.");
        closeCart();
        openLogin();
        return;
    }

    document.getElementById("customerName").value = meData.name || "";
    document.getElementById("checkoutOverlay").classList.add("show");
    updateCheckoutSummary();
}

function closeCheckout() { document.getElementById("checkoutOverlay").classList.remove("show"); }

function updateCheckoutSummary() {
    const subtotal = getSubtotal();
    const delivery = getDelivery(subtotal);
    const discount = appliedCoupon ? Math.round(subtotal * 0.20 * 100) / 100 : 0;
    const total = Math.max(0, subtotal + delivery - discount);

    document.getElementById("checkoutSubtotal").innerText = "₹" + subtotal.toFixed(2);
    document.getElementById("checkoutDelivery").innerText = delivery === 0 ? "FREE" : "₹" + delivery.toFixed(2);
    document.getElementById("checkoutTotal").innerText = "₹" + total.toFixed(2);

    if (discount > 0) {
        document.getElementById("checkoutDiscountRow").classList.remove("hidden");
        document.getElementById("checkoutDiscount").innerText = "-₹" + discount.toFixed(2);
    } else {
        document.getElementById("checkoutDiscountRow").classList.add("hidden");
    }
}

async function applyCoupon() {
    const input = document.getElementById("couponInput");
    const status = document.getElementById("couponStatus");
    const code = input.value.trim().toUpperCase();

    if (!code) {
        status.className = "coupon-status error";
        status.innerText = "Please enter a coupon code.";
        return;
    }

    try {
        const response = await fetch("/validate-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, subtotal: getSubtotal() })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            appliedCoupon = null;
            appliedDiscount = 0;
            status.className = "coupon-status error";
            status.innerText = data.message || "Invalid coupon code.";
            updateCheckoutSummary();
            updateCart();
            return;
        }

        appliedCoupon = data.code;
        appliedDiscount = data.discount;
        status.className = "coupon-status success-text";
        status.innerText = data.message;
        updateCheckoutSummary();
        updateCart();
    } catch (error) {
        status.className = "coupon-status error";
        status.innerText = "Could not connect to the server. Please try again.";
    }
}

function resetCoupon() {
    appliedCoupon = null;
    appliedDiscount = 0;
    const input = document.getElementById("couponInput");
    const status = document.getElementById("couponStatus");
    if (input) input.value = "";
    if (status) {
        status.className = "coupon-status";
        status.innerText = "";
    }
}

async function placeOrder() {
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();

    if (!name || !phone || !address) {
        alert("Please fill all details.");
        return;
    }

    try {
        const response = await fetch("/place-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                phone,
                address,
                cart,
                coupon_code: appliedCoupon || ""
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            alert(data.message || "Unable to place order.");
            return;
        }

        const couponText = data.order.coupon_code
            ? ` Coupon ${data.order.coupon_code} saved you ₹${Number(data.order.discount).toFixed(2)}.`
            : "";

        document.getElementById("orderMessage").innerText =
            `Thank you ${name}! Your order #${data.order.order_id} has been placed. Total: ₹${Number(data.order.total).toFixed(2)}.${couponText}`;

        cart = [];
        resetCoupon();
        updateCart();
        closeCheckout();
        closeCart();
        document.getElementById("orderModal").classList.add("show");
    } catch (error) {
        alert("Could not connect to the server. Please try again.");
    }
}

function closeOrderModal() { document.getElementById("orderModal").classList.remove("show"); }
function goToMenu() { document.getElementById("menu").scrollIntoView({ behavior: "smooth" }); }

function filterMenu(category, button) {
    document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    document.querySelectorAll(".card").forEach(card => {
        card.style.display = category === "All" || card.dataset.category === category ? "block" : "none";
    });
}

let authMode = "login";

function openLogin() {
    authMode = "login";
    updateAuthUI();
    document.getElementById("loginModal").classList.add("show");
}

function closeLogin() { document.getElementById("loginModal").classList.remove("show"); }

function toggleAuthMode() {
    authMode = authMode === "login" ? "register" : "login";
    updateAuthUI();
}

function updateAuthUI() {
    const registerFields = document.getElementById("registerFields");
    const title = document.getElementById("authTitle");
    const button = document.getElementById("authButton");
    const switchText = document.getElementById("authSwitchText");
    const switchLink = document.getElementById("authSwitchLink");

    if (authMode === "register") {
        registerFields.classList.remove("hidden");
        title.innerText = "Create Account 📝";
        button.innerText = "Register";
        switchText.innerText = "Already have an account?";
        switchLink.innerText = " Login";
    } else {
        registerFields.classList.add("hidden");
        title.innerText = "Login 👤";
        button.innerText = "Login";
        switchText.innerText = "Don't have an account?";
        switchLink.innerText = " Register";
    }
}

document.getElementById("authSwitchLink").addEventListener("click", toggleAuthMode);

async function submitAuth() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    let body = { email, password };
    let endpoint = "/login";

    if (authMode === "register") {
        const name = document.getElementById("registerName").value.trim();
        if (!name) {
            alert("Please enter your name.");
            return;
        }
        body.name = name;
        endpoint = "/register";
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            alert(data.message || "Something went wrong.");
            return;
        }

        if (authMode === "register") {
            alert("Account created successfully. Please log in.");
            authMode = "login";
            updateAuthUI();
            document.getElementById("authPassword").value = "";
            return;
        }

        closeLogin();
        document.getElementById("authEmail").value = "";
        document.getElementById("authPassword").value = "";
        updateUserUI(data.name, document.getElementById("authEmail").value);
        alert("Welcome, " + data.name + "! 👋");
    } catch (error) {
        alert("Could not connect to the server. Please try again.");
    }
}

async function logoutUser() {
    try {
        await fetch("/logout", { method: "POST" });
        updateUserUI(null);
        closeAccount();
        alert("You have been logged out.");
    } catch (error) {
        alert("Could not log out. Please try again.");
    }
}

function updateUserUI(name) {
    const greeting = document.getElementById("userGreeting");
    const button = document.getElementById("authNavButton");
    const accountButton = document.getElementById("accountButton");

    if (name) {
        greeting.innerText = "Hi, " + name;
        button.innerText = "🚪 Logout";
        button.onclick = logoutUser;
        accountButton.classList.remove("hidden");
    } else {
        greeting.innerText = "";
        button.innerText = "👤 Login";
        button.onclick = openLogin;
        accountButton.classList.add("hidden");
    }
}

async function loadCurrentUser() {
    try {
        const response = await fetch("/me");
        const data = await response.json();
        updateUserUI(data.logged_in ? data.name : null);
    } catch (error) {
        updateUserUI(null);
    }
}

function openAccount() {
    document.getElementById("accountModal").classList.add("show");
    loadAccount();
}

function closeAccount() { document.getElementById("accountModal").classList.remove("show"); }

async function loadAccount() {
    const profile = document.getElementById("accountProfile");
    const history = document.getElementById("orderHistory");

    try {
        const meResponse = await fetch("/me");
        const meData = await meResponse.json();

        if (!meData.logged_in) {
            closeAccount();
            openLogin();
            return;
        }

        profile.innerHTML = `
            <strong>${escapeHtml(meData.name)}</strong>
            <span>${escapeHtml(meData.email)}</span>
        `;

        const orderResponse = await fetch("/account/orders");
        const orderData = await orderResponse.json();

        if (!orderResponse.ok || !orderData.success) {
            history.innerHTML = `<p class="muted">${escapeHtml(orderData.message || "Unable to load orders.")}</p>`;
            return;
        }

        if (orderData.orders.length === 0) {
            history.innerHTML = '<p class="muted">You have not placed any orders yet. 🍕</p>';
            return;
        }

        history.innerHTML = orderData.orders.map(order => {
            const itemText = order.items.map(item => `${escapeHtml(item.name)} × ${item.qty}`).join(", ");
            const couponText = order.coupon_code
                ? `<div><span>Coupon</span><span>${escapeHtml(order.coupon_code)} (-₹${Number(order.discount).toFixed(2)})</span></div>`
                : "";

            return `
                <div class="order-card">
                    <div class="order-card-header">
                        <strong>Order #${order.order_id}</strong>
                        <span>${formatDate(order.created_at)}</span>
                    </div>
                    <p class="order-items">${itemText}</p>
                    <div class="order-meta"><span>Subtotal</span><span>₹${Number(order.subtotal).toFixed(2)}</span></div>
                    <div class="order-meta"><span>Delivery</span><span>${Number(order.delivery) === 0 ? "FREE" : "₹" + Number(order.delivery).toFixed(2)}</span></div>
                    ${couponText}
                    <div class="order-meta order-total"><span>Total</span><span>₹${Number(order.total).toFixed(2)}</span></div>
                </div>
            `;
        }).join("");
    } catch (error) {
        history.innerHTML = '<p class="muted">Could not load your order history.</p>';
    }
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

function toggleChat() { document.getElementById("chatbot").classList.toggle("show"); }

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    appendChatMessage(message, "user");
    input.value = "";

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        appendChatMessage(data.response || "Sorry, I could not answer that.", "bot");
    } catch (error) {
        appendChatMessage("I cannot reach the server right now. Please try again.", "bot");
    }
}

function appendChatMessage(message, type) {
    const messages = document.getElementById("chatMessages");
    const wrapper = document.createElement("div");
    wrapper.className = `chat-message ${type}`;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = message;
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
}

document.getElementById("cartOverlay").addEventListener("click", function(event) {
    if (event.target === this) closeCart();
});

document.getElementById("checkoutOverlay").addEventListener("click", function(event) {
    if (event.target === this) closeCheckout();
});

document.getElementById("loginModal").addEventListener("click", function(event) {
    if (event.target === this) closeLogin();
});

document.getElementById("accountModal").addEventListener("click", function(event) {
    if (event.target === this) closeAccount();
});

document.getElementById("orderModal").addEventListener("click", function(event) {
    if (event.target === this) closeOrderModal();
});

updateCart();
loadCurrentUser();
