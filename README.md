# CREAF Coffee

**The "Lab Notebook" Coffee Tracker**

A mobile-first application to track office coffee consumption and calculate dynamic pricing based on supply costs.

## Features
- **Drink Coffee**: Log cups to increase your tab.
- **Log Supplies**: Add expenses to lower your tab and adjust the global price.
- **Dynamic Pricing**: `Price = Total Cups / Total Supply Cost`.
- **CSV Export**: Download all data for analysis.

## Setup
1. Clone the repository.
2. Edit `app.js` to add your Firebase configuration keys.
3. Serve `index.html` via GitHub Pages or a local server.

## Tech Stack
- HTML5, CSS3, Vanilla JS
- Firebase Firestore

## Firebase Setup (Crucial!)

For this app to work, you must enable the Database in your Firebase Console:

1.  Go to [Firebase Console](https://console.firebase.google.com/) and open your project (`creafcoffee`).
2.  In the left menu, click **Build** -> **Firestore Database**.
3.  Click **Create Database**.
4.  **Location**: Choose a location near you (e.g., `eur3` for Europe).
5.  **Security Rules**: Choose **Start in Test Mode**.
    *   This allows anyone with the app to read/write for 30 days.
6.  Click **Enable**.

## Troubleshooting

### "Query requires an index" Error
When you open **My History** for the first time, you might see an empty list.
1.  **Log in** to the app (Select a user).
2.  Click **[ MY STATUS / HISTORY ]**.
3.  Open your browser's **Web Console** (F12 > Console).
4.  Look for a red error message from Firebase saying `The query requires an index`.
5.  **Click the long link** in that error message.
6.  It opens Firebase -> Click **Create Index**.
7.  Wait a few minutes, then try again.
