<div align="center">
  <img src="images/stain_ring_perfect.png" width="200" alt="Coffee Ring Stain">
  <h1>CREAF Coffee</h1>
  <p><strong>The "Lab Notebook" Coffee Tracker</strong></p>
  <p><em>Track clicks. Sip coffee. Pay debts.</em></p>
</div>

---

<div align="center">
  <img src="images/stain_drip_clean.png" width="50" alt="Coffee Drip">
</div>

## ☕ Overview

A mobile-first web application designed to track office coffee consumption with a **"Lab Notebook" aesthetic**. It features realistic, transparent coffee stain visuals, a creamy paper texture, and a simple interface for logging cups and supplies.

## ✨ Features

### 📊 Consumption Tracking
*   **Drink Coffee**: One-click logging effectively calculates your debt.
*   **Dynamic Stats**: Real-time updates of total cups, expenses, and current prices.
*   **Consumption Graph**: Visualize your caffeine intake over time in the "History" view.

### 💰 Payment & Finance
*   **QR Code Payment**: Generate an EPC-QR code to pay your tab instantly via SEPA transfer (Revolut/Bank app).
*   **Log Supplies**: Bought milk or beans? Log the expense to lower your personal tab and adjust the community price.
*   **Fixed Pricing**: Currently set to €0.50 per cup.

### 🎨 Visuals
*   **Organic Chaos**: Uses a randomized distribution of high-quality, transparent coffee stain assets.
*   **Readability First**: Stains are carefully placed and faded to ensure the "messy desk" look doesn't interfere with usability.

---

<div align="center">
  <img src="images/stain_splash_tiny.png" width="80" alt="Coffee Splash">
</div>

## 🛠️ Setup

1.  **Clone** the repository.
2.  **Configure Firebase**:
    *   Create a project at [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Firestore Database** (Start in Test Mode).
    *   Copy your web app config keys into `app.js`.
3.  **Run**:
    *   Simply serve `index.html` via a local server or GitHub Pages.

## 📱 Tech Stack

*   **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend**: Firebase Firestore (No server required)
*   **Visuals**: Custom Python-processed transparent PNG assets

---

## ⚠️ Troubleshooting

### "Query requires an index"
If your **History Graph** doesn't load:
1.  Open the browser console (`F12`).
2.  Look for the Firebase error link.
3.  Click it to auto-create the required composite index in Firestore.

---

<div align="center">
  <sub>Built with caffeine and code.</sub>
</div>
