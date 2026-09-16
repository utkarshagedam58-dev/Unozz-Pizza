# Unnozz Pizza

Flask + SQLite pizza ordering demo.

## Features
- User registration and login
- Session-based authentication
- Persistent order history for each account
- My Account popup showing past orders
- Checkout coupon field
- `UNNOZZ20` gives 20% off the subtotal
- Free delivery for subtotal >= ₹499
- Local chatbot

## Run
```powershell
venv\Scripts\activate
py -m pip install -r requirements.txt
py app.py
```

Open `http://127.0.0.1:5000`.

The SQLite database `unnozz.db` is created automatically. Existing user accounts are preserved when the application is updated; the `orders` table is added automatically.
