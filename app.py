from flask import Flask, render_template, jsonify, request, session
from datetime import datetime
import json
import re
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "unnozz_pizza_demo_secret"
DATABASE = "unnozz.db"

COUPONS = {
    "UNNOZZ20": {
        "discount_percent": 20,
        "description": "20% off your order"
    }
}


MENU = [
    {"id": 1, "name": "Margherita Pizza", "category": "Pizza", "price": 199, "description": "Classic tomato sauce, mozzarella and herbs", "emoji": "🍕"},
    {"id": 2, "name": "Farmhouse Pizza", "category": "Pizza", "price": 249, "description": "Onion, capsicum, tomato and fresh vegetables", "emoji": "🍕"},
    {"id": 3, "name": "Paneer Tikka Pizza", "category": "Pizza", "price": 279, "description": "Spicy paneer tikka with onion and capsicum", "emoji": "🧀"},
    {"id": 4, "name": "Cheese Burst Pizza", "category": "Pizza", "price": 299, "description": "Extra cheese with a delicious cheese-filled crust", "emoji": "🧀"},
    {"id": 5, "name": "Veggie Paradise", "category": "Pizza", "price": 269, "description": "Loaded with vegetables and mozzarella cheese", "emoji": "🌽"},
    {"id": 6, "name": "Spicy Corn Pizza", "category": "Pizza", "price": 229, "description": "Sweet corn, jalapeno and spicy sauce", "emoji": "🌶️"},
    {"id": 7, "name": "Garlic Bread", "category": "Sides", "price": 129, "description": "Soft garlic bread with herbs", "emoji": "🥖"},
    {"id": 8, "name": "Cheesy Garlic Bread", "category": "Sides", "price": 159, "description": "Garlic bread loaded with cheese", "emoji": "🧀"},
    {"id": 9, "name": "Choco Lava Cake", "category": "Desserts", "price": 109, "description": "Warm chocolate cake with molten chocolate", "emoji": "🍫"},
    {"id": 10, "name": "Cold Drink", "category": "Beverages", "price": 79, "description": "Chilled refreshing soft drink", "emoji": "🥤"},
]


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL,
            delivery REAL NOT NULL,
            coupon_code TEXT,
            discount REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


init_db()


def chatbot_response(message):
    text = message.lower().strip()

    if not text:
        return "Please type something 😊"

    if any(word in text for word in ["hello", "hi", "hey", "hii", "helo"]):
        return (
            "Hello! 👋 Welcome to Unnozz Pizza 🍕\n"
            "I am your AI Pizza Assistant. I can help you choose pizzas, "
            "check prices, offers and menu items."
        )

    if any(word in text for word in ["cheapest", "cheap", "lowest price", "affordable"]):
        item = min(MENU, key=lambda x: x["price"])
        return f"🍕 Our most affordable option is {item['name']} at ₹{item['price']}."

    if any(word in text for word in ["spicy", "hot", "chilli", "chili"]):
        return "🌶️ I recommend our Paneer Tikka Pizza or Spicy Corn Pizza. Both are great choices for a spicy taste!"

    if "cheese" in text:
        return "🧀 If you love cheese, I recommend our Cheese Burst Pizza at ₹299!"

    if "paneer" in text:
        return "🧀 Our Paneer Tikka Pizza is a delicious choice at ₹279."

    if any(word in text for word in ["veg", "vegetable", "healthy"]):
        return "🥗 For a vegetable-loaded option, I recommend Farmhouse Pizza or Veggie Paradise."

    if "price" in text or "cost" in text or "rupee" in text:
        return "💰 Our pizzas start from ₹199 and go up to ₹299. You can check all prices in the Menu section."

    if "menu" in text:
        return "🍕 We have Pizza, Sides, Desserts and Beverages. Check the Menu section to explore everything."

    if any(word in text for word in ["offer", "offers", "discount", "deal", "deals", "coupon", "promo"]):
        return "🔥 Use coupon code UNNOZZ20 at checkout to get 20% off your order."

    if "delivery" in text:
        return "🚴 We provide doorstep delivery. Delivery is FREE on orders of ₹499 or more."

    if "garlic" in text:
        return "🥖 Our Garlic Bread is ₹129 and Cheesy Garlic Bread is ₹159."

    if any(word in text for word in ["dessert", "sweet", "cake", "chocolate"]):
        return "🍫 Try our Choco Lava Cake for ₹109. It's a perfect dessert after pizza!"

    if any(word in text for word in ["recommend", "suggest", "best pizza", "which pizza", "what pizza"]):
        return (
            "🍕 My recommendation:\n\n"
            "⭐ Farmhouse Pizza – ₹249\n"
            "⭐ Paneer Tikka Pizza – ₹279\n"
            "⭐ Cheese Burst Pizza – ₹299\n\n"
            "Tell me your taste — spicy, cheesy or veggie!"
        )

    if any(word in text for word in ["order", "buy", "purchase"]):
        return "🛒 Choose your favourite items from the Menu, open your cart, apply a coupon if you have one, and proceed to checkout."

    if any(word in text for word in ["thank", "thanks"]):
        return "You're welcome! 😊🍕 Enjoy your Unnozz Pizza!"

    return (
        "🤖 I can help you with:\n\n"
        "🍕 Pizza recommendations\n"
        "💰 Pizza prices\n"
        "🌶️ Spicy pizzas\n"
        "🧀 Cheese pizzas\n"
        "🔥 Offers and coupons\n"
        "🚴 Delivery\n"
        "🛒 Ordering\n\n"
        "Try asking: 'How can I use the UNNOZZ20 coupon?'"
    )


@app.route("/")
def home():
    return render_template("index.html", menu=MENU, menu_json=json.dumps(MENU, ensure_ascii=False))


@app.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Please fill all registration details."}), 400

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400

    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)",
            (name, email, generate_password_hash(password), datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"success": False, "message": "An account with this email already exists."}), 409
    conn.close()

    return jsonify({"success": True, "message": "Account created successfully. You can now log in."})


@app.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"success": False, "message": "Please enter email and password."}), 400

    conn = get_db()
    user = conn.execute("SELECT id, name, email, password FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]

    return jsonify({"success": True, "name": user["name"]})


@app.post("/logout")
def logout():
    session.clear()
    return jsonify({"success": True})


@app.get("/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False})
    return jsonify({
        "logged_in": True,
        "name": session.get("user_name", ""),
        "email": session.get("user_email", ""),
    })


@app.get("/account/orders")
def account_orders():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Please log in first."}), 401

    conn = get_db()
    rows = conn.execute(
        """
        SELECT id, customer_name, phone, address, items, subtotal, delivery,
               coupon_code, discount, total, created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (session["user_id"],),
    ).fetchall()
    conn.close()

    orders = []
    for row in rows:
        orders.append({
            "order_id": row["id"],
            "customer_name": row["customer_name"],
            "phone": row["phone"],
            "address": row["address"],
            "items": json.loads(row["items"]),
            "subtotal": row["subtotal"],
            "delivery": row["delivery"],
            "coupon_code": row["coupon_code"],
            "discount": row["discount"],
            "total": row["total"],
            "created_at": row["created_at"],
        })

    return jsonify({"success": True, "orders": orders})


@app.post("/validate-coupon")
def validate_coupon():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip().upper()
    subtotal = data.get("subtotal", 0)

    try:
        subtotal = float(subtotal)
    except (TypeError, ValueError):
        subtotal = 0

    if code not in COUPONS:
        return jsonify({
            "success": False,
            "message": "Invalid coupon code."
        }), 400

    discount_percent = COUPONS[code]["discount_percent"]
    discount = round(subtotal * discount_percent / 100, 2)
    return jsonify({
        "success": True,
        "code": code,
        "discount_percent": discount_percent,
        "discount": discount,
        "message": f"Coupon applied! You saved ₹{discount:.2f}."
    })


@app.post("/place-order")
def place_order_api():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Please log in before placing an order."}), 401

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    address = str(data.get("address", "")).strip()
    coupon_code = str(data.get("coupon_code", "")).strip().upper()
    cart = data.get("cart", [])

    if not name or not phone or not address or not isinstance(cart, list) or not cart:
        return jsonify({"success": False, "message": "Please provide valid customer details and cart items."}), 400

    subtotal = 0
    order_items = []

    for item in cart:
        try:
            item_id = int(item.get("id"))
            qty = int(item.get("qty", 0))
        except (TypeError, ValueError, AttributeError):
            continue

        menu_item = next((x for x in MENU if x["id"] == item_id), None)
        if not menu_item or qty <= 0:
            continue

        line_total = menu_item["price"] * qty
        subtotal += line_total
        order_items.append({
            "id": menu_item["id"],
            "name": menu_item["name"],
            "price": menu_item["price"],
            "qty": qty,
            "line_total": line_total,
        })

    if not order_items:
        return jsonify({"success": False, "message": "Your cart is empty."}), 400

    delivery = 0 if subtotal >= 499 else 40

    discount = 0
    applied_coupon = None
    if coupon_code:
        coupon = COUPONS.get(coupon_code)
        if not coupon:
            return jsonify({"success": False, "message": "Invalid coupon code."}), 400
        discount = round(subtotal * coupon["discount_percent"] / 100, 2)
        applied_coupon = coupon_code

    total = round(subtotal + delivery - discount, 2)
    if total < 0:
        total = 0

    created_at = datetime.now().isoformat(timespec="seconds")

    conn = get_db()
    cursor = conn.execute(
        """
        INSERT INTO orders (
            user_id, customer_name, phone, address, items,
            subtotal, delivery, coupon_code, discount, total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session["user_id"],
            name,
            phone,
            address,
            json.dumps(order_items, ensure_ascii=False),
            subtotal,
            delivery,
            applied_coupon,
            discount,
            total,
            created_at,
        ),
    )
    order_id = cursor.lastrowid
    conn.commit()
    conn.close()

    order = {
        "order_id": order_id,
        "name": name,
        "phone": phone,
        "address": address,
        "items": order_items,
        "subtotal": subtotal,
        "delivery": delivery,
        "coupon_code": applied_coupon,
        "discount": discount,
        "total": total,
        "created_at": created_at,
    }

    return jsonify({"success": True, "order": order})


@app.post("/chat")
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", ""))
    return jsonify({"response": chatbot_response(message)})


if __name__ == "__main__":
    app.run(debug=True)
