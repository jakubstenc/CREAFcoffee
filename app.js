// CREAF Coffee - App Logic

const firebaseConfig = {
    apiKey: "AIzaSyAO3E9D5C4vBqDLxQUmBiKYBOjH_cjOUsU",
    authDomain: "creafcoffee.firebaseapp.com",
    projectId: "creafcoffee",
    storageBucket: "creafcoffee.firebasestorage.app",
    messagingSenderId: "879312809239",
    appId: "1:879312809239:web:8f4870f617e166ae439b52",
    measurementId: "G-JK4MSHNVZ7"
};

// Initialize Firebase
let db;
let analytics;

try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    analytics = firebase.analytics();
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// State
let currentUser = null;
let dynamicPrice = 0.50; // Fallback default
let totalCups = 0;
let totalSupplyCost = 0;
let allUsers = []; // Cache for users

// DOM Elements
const userSelect = document.getElementById('user-select');
const newUserContainer = document.getElementById('new-user-container');
const newUserInput = document.getElementById('new-user-input');
const addUserBtn = document.getElementById('add-user-btn');

const dashboard = document.getElementById('dashboard');
const priceDisplay = document.getElementById('price-display');
const userDebtDisplay = document.getElementById('user-debt-display');
const drinkBtn = document.getElementById('drink-btn');
const logSupplyBtn = document.getElementById('log-supply-btn');
const supplyAmountInput = document.getElementById('supply-amount');
const downloadCsvBtn = document.getElementById('download-csv-btn');
const settleBtn = document.getElementById('settle-btn');
const payQrBtn = document.getElementById('pay-qr-btn');
const qrModal = document.getElementById('qr-modal');
const closeModal = document.querySelector('.close-modal');

// --- Functions ---

function init() {
    setupRealtimeListeners();
    addRandomStains(); // Add visual flair

    // Event Listeners
    userSelect.addEventListener('change', handleUserLogin);
    addUserBtn.addEventListener('click', handleAddUser);

    // UX: Allow pressing Enter to add user
    newUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddUser();
        }
    });

    drinkBtn.addEventListener('click', handleDrinkCoffee);
    logSupplyBtn.addEventListener('click', handleLogSupplies);
    downloadCsvBtn.addEventListener('click', downloadCSV);
    settleBtn.addEventListener('click', handleSettleUp);

    // QR Modal Listeners
    if (payQrBtn) {
        payQrBtn.addEventListener('click', showPaymentModal);
    }
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            qrModal.classList.add('hidden');
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target == qrModal) {
            qrModal.classList.add('hidden');
        }
    });
}

function showPaymentModal() {
    if (!currentUser) return;

    qrModal.classList.remove('hidden');

    const amount = (currentUser.debt || 0).toFixed(2);

    // EPC-QR Standard for SEPA Transfers
    // Replace with ACTUAL IBAN and NAME
    const recipientName = "CREAF COFFEE";
    const recipientIBAN = "XY0000000000000000000000"; // User must replace this
    const bic = ""; // Optional
    const remittanceText = `Coffee Tab ${currentUser.name}`;

    // Construct SEPA QR String
    // Service Tag | Version | Encoding | TransferType | BIC | Name | IBAN | Amount | Purpose | Ref | Remittance
    const qrData = `BCD\n002\n1\nSCT\n${bic}\n${recipientName}\n${recipientIBAN}\nEUR${amount}\n\n\n${remittanceText}`;

    // Generate QR
    const qrImage = document.querySelector('.qr-placeholder img');
    if (qrImage) {
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=200x200`;
        qrImage.alt = `Pay €${amount}`;
    }

    // Update Modal Text if possible
    let modalText = document.querySelector('.qr-text-info');
    if (!modalText) {
        modalText = document.createElement('p');
        modalText.className = 'qr-text-info';
        modalText.style.fontWeight = 'bold';
        document.querySelector('.modal-content').insertBefore(modalText, qrImage);
    }
    modalText.innerText = `Scan to Pay: €${amount}`;
}

function setupRealtimeListeners() {
    // 1. Listen to USERS
    db.collection('users').onSnapshot(snapshot => {
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        allUsers = users; // Update global cache
        updateUserDropdown(users);

        // If current user, update their debt display specifically
        if (currentUser) {
            const updatedUser = users.find(u => u.id === currentUser.id);
            if (updatedUser) {
                currentUser = updatedUser;
                updateDashboard();
            }
        }
    }, error => {
        console.error("Error fetching users:", error);
        if (error.code === 'permission-denied') {
            alert("⚠️ SYSTEM ERROR: Permission Denied.\n\nThe app cannot read the user list.\nThis usually means the Firestore Database has not been created or rules block access.\n\nGo to Firebase Console > Build > Firestore Database to enable it.");
        }
    });

    // 2. Listen to LOGS (for Stats only, price is now FIXED)
    db.collection('logs').onSnapshot(snapshot => {
        let cups = 0;
        let supplies = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.action === 'DRANK') cups++;
            if (data.action === 'SUPPLY') supplies += (parseFloat(data.amount) || 0);
        });

        totalCups = cups;
        totalSupplyCost = supplies;
        // recalcPrice(); // Disabled dynamic pricing
        updateDashboard();
    });
}

function recalcPrice() {
    // FIXED PRICE MODEL as per User Request
    dynamicPrice = 0.50;
    updateDashboard();
}

function updateDashboard() {
    // Current Price
    priceDisplay.textContent = `€${dynamicPrice.toFixed(2)}`;

    if (currentUser) {
        userDebtDisplay.textContent = `€${(currentUser.debt || 0).toFixed(2)}`;
    }
}

function updateUserDropdown(users) {
    // Save current selection
    const currentVal = userSelect.value;

    // Clear (except default)
    userSelect.innerHTML = '<option value="" disabled selected>-- IDENTIFY YOURSELF --</option>';

    users.sort((a, b) => a.name.localeCompare(b.name)).forEach(user => {
        const opt = document.createElement('option');
        opt.value = user.id;
        opt.textContent = user.name;
        userSelect.appendChild(opt);
    });

    // Allow adding new user
    const addNewOpt = document.createElement('option');
    addNewOpt.value = "__NEW__";
    addNewOpt.textContent = "+ [ NEW RECRUIT ]";
    userSelect.appendChild(addNewOpt);

    // Restore selection if possible
    if (currentVal && users.find(u => u.id === currentVal)) {
        userSelect.value = currentVal;
    }
}

function handleUserLogin(e) {
    const val = e.target.value;
    if (val === "__NEW__") {
        enterNewUserMode();
    } else {
        // Use cached user data
        const selectedUser = allUsers.find(u => u.id === val);

        if (selectedUser) {
            currentUser = selectedUser;
            updateDashboard();
            dashboard.classList.remove('hidden');
        } else {
            console.error("User not found in cache:", val);
        }
    }
}

function enterNewUserMode() {
    userSelect.style.display = 'none';
    newUserInput.style.display = 'block';
    newUserInput.focus();
    dashboard.classList.add('hidden');
    addUserBtn.textContent = "[ CONFIRM RECRUIT ]";
}

function handleAddUser() {
    // If input is hidden (or we are not in add mode), switch to add mode
    if (newUserInput.style.display === 'none' || newUserInput.style.display === '') {
        enterNewUserMode();
        return;
    }

    const name = newUserInput.value.trim();
    if (!name) {
        alert("Please enter a name.");
        return;
    }

    // Check for duplicates (case-insensitive)
    const exists = allUsers.some(u => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert(`User "${name}" already exists. Logging you in...`);

        const existingUser = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
        if (existingUser) {
            userSelect.value = existingUser.id;
            currentUser = existingUser;

            // Reset UI
            newUserInput.value = "";
            newUserInput.style.display = 'none';
            userSelect.style.display = 'block';
            addUserBtn.textContent = "[ + NEW RECRUIT ]";

            updateDashboard();
            dashboard.classList.remove('hidden');
        }
        return;
    }

    db.collection('users').add({
        name: name,
        debt: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then((docRef) => {
        console.log("User added:", docRef.id);

        // AUTO-LOGIN
        currentUser = { id: docRef.id, name: name, debt: 0 };

        // Reset UI
        newUserInput.value = "";
        newUserInput.style.display = 'none';
        userSelect.style.display = 'block';
        addUserBtn.textContent = "[ + NEW RECRUIT ]";

        // Show Dashboard
        updateDashboard();
        dashboard.classList.remove('hidden');

        alert(`Welcome, ${name}! You are logged in.`);
    }).catch(error => {
        console.error("Error adding user: ", error);
        alert("System error. Check console.");
    });
}

function handleDrinkCoffee() {
    if (!currentUser) return;

    // 1. Log to 'logs'
    db.collection('logs').add({
        action: 'DRANK',
        user: currentUser.name,
        userId: currentUser.id,
        amount: dynamicPrice, // Historical price at moment of consumption
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update 'users' debt
    db.collection('users').doc(currentUser.id).update({
        debt: firebase.firestore.FieldValue.increment(dynamicPrice)
    });

    // Visual Feedback
    drinkBtn.textContent = "COFFEE LOGGED!";
    setTimeout(() => {
        drinkBtn.innerHTML = '<span class="icon">☕</span><span class="text">DRINK COFFEE<br><small>[ +1 CUP ]</small></span>';
    }, 1500);
}

function handleLogSupplies() {
    if (!currentUser) return;
    const amount = parseFloat(supplyAmountInput.value);

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    // 1. Log to 'logs'
    db.collection('logs').add({
        action: 'SUPPLY',
        user: currentUser.name,
        userId: currentUser.id,
        amount: amount,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update 'users' debt (Subtract)
    db.collection('users').doc(currentUser.id).update({
        debt: firebase.firestore.FieldValue.increment(-amount)
    });

    supplyAmountInput.value = "";
    alert(`Thank you! €${amount.toFixed(2)} credited.`);
}

function handleSettleUp() {
    if (!currentUser) return;
    alert(`Your current debt is €${(currentUser.debt || 0).toFixed(2)}.\n\nTo settle, buy supplies or pay someone who bought supplies!`);
}

function downloadCSV() {
    console.log("Generating CSV...");

    db.collection("logs").orderBy("timestamp", "desc").get().then((querySnapshot) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,User,Action,Amount\n"; // Header

        querySnapshot.forEach((doc) => {
            let data = doc.data();
            // Handle timestamp
            let dateStr = "N/A";
            if (data.timestamp && data.timestamp.toDate) {
                dateStr = data.timestamp.toDate().toISOString().split('T')[0];
            } else if (data.timestamp) {
                // Try parsing string or other format
                dateStr = new Date(data.timestamp).toISOString().split('T')[0];
            }

            let row = `${dateStr},${data.user},${data.action},${data.amount}`;
            csvContent += row + "\r\n";
        });

        // Create download link
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "creaf_coffee_data.csv");
        document.body.appendChild(link);

        // Trigger click
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        console.error("Error generating CSV:", err);
        alert("Failed to download data. Check console.");
    });
}

function addRandomStains() {
    // Add 3-6 random coffee rings
    const numStains = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numStains; i++) {
        const stain = document.createElement('div');
        stain.classList.add('coffee-stain-random');

        // Random size (rings are usually smaller than big blotches)
        const size = 80 + Math.random() * 120;
        stain.style.width = `${size}px`;
        stain.style.height = `${size}px`;

        // Random position
        stain.style.top = `${Math.random() * 90}vh`;
        stain.style.left = `${Math.random() * 90}vw`;

        // Random Rotation
        stain.style.transform = `rotate(${Math.random() * 360}deg)`;

        // Random irregularity per stain
        const r1 = 40 + Math.random() * 20;
        const r2 = 40 + Math.random() * 20;
        const r3 = 40 + Math.random() * 20;
        const r4 = 40 + Math.random() * 20;
        stain.style.borderRadius = `${r1}% ${100 - r1}% ${r3}% ${100 - r3}% / ${r2}% ${r4}% ${100 - r4}% ${100 - r2}%`;

        document.body.appendChild(stain);
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
