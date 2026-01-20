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

    // History Button (Reusing Settle Btn for "Status / History")
    settleBtn.innerHTML = "[ MY STATUS / HISTORY ]";
    settleBtn.removeEventListener('click', handleSettleUp); // Remove old handler
    settleBtn.addEventListener('click', showHistoryModal);

    // QR Modal Listeners
    if (payQrBtn) {
        payQrBtn.addEventListener('click', showPaymentModal);
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
    });
}

function showhistoryModal() {
    // Note: We'll create a new modal for history or reuse the concept
}

function showHistoryModal() {
    if (!currentUser) return;

    const historyModal = document.getElementById('history-modal');
    // If modal doesn't exist, create it
    let modal = historyModal;
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; text-align: left;">
                <span class="close-modal">&times;</span>
                <h2>Logbook: ${currentUser.name}</h2>
                <!-- Chart Container -->
                <div style="height: 200px; width: 100%; margin-bottom: 20px;">
                    <canvas id="consumptionChart"></canvas>
                </div>
                <h3>Recent Transactions</h3>
                <div id="history-list" style="max-height: 200px; overflow-y: auto; font-size: 0.9rem;">Loading...</div>
                <hr>
                <div style="text-align: right; font-weight: bold;">Current Debt: €${(currentUser.debt || 0).toFixed(2)}</div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
    }

    modal.classList.remove('hidden');
    const list = modal.querySelector('#history-list');
    list.innerHTML = "Loading records & generating graph...";

    // Increase limit for graph data
    db.collection('logs')
        .where('userId', '==', currentUser.id)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                list.innerHTML = "<p>No records found.</p>";
                return;
            }

            // 1. Process Data for Graph (Group by Date)
            const dateCounts = {};
            const labels = [];
            const dataPoints = [];

            // Initialize last 7 days with 0 (optional, but looks better)
            for (let d = 6; d >= 0; d--) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const key = date.toISOString().split('T')[0];
                dateCounts[key] = 0;
            }

            // Fill with actual data
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.action === 'DRANK' && d.timestamp) {
                    const dateKey = d.timestamp.toDate().toISOString().split('T')[0];
                    if (dateCounts[dateKey] !== undefined) {
                        dateCounts[dateKey]++;
                    } else {
                        // If older than 7 days and not initialized, just track it if we want full history, 
                        // but for now let's stick to showing what we caught or add it dynamically
                        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
                    }
                }
            });

            // Sort dates
            Object.keys(dateCounts).sort().forEach(date => {
                labels.push(date.slice(5)); // MM-DD
                dataPoints.push(dateCounts[date]);
            });

            // Render Chart
            const ctx = document.getElementById('consumptionChart').getContext('2d');
            // Destroy old chart if exists (to prevent overlay)
            if (window.myCoffeeChart) window.myCoffeeChart.destroy();

            window.myCoffeeChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Cups per Day',
                        data: dataPoints,
                        borderColor: '#5d4037', // Coffee Dark
                        backgroundColor: 'rgba(121, 85, 72, 0.2)', // Coffee Light
                        borderWidth: 2,
                        tension: 0.3, // Slight curve
                        fill: true,
                        pointBackgroundColor: '#3e2723'
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Caffeine Intake Trend' }
                    }
                }
            });

            // 2. Render List (same as before)
            let html = '<ul style="list-style: none; padding: 0;">';
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
                const color = data.action === 'SUPPLY' ? 'green' : 'black';
                const sign = data.action === 'SUPPLY' ? '-' : '+';
                const icon = data.action === 'SUPPLY' ? '📦' : '☕';

                html += `
                    <li style="border-bottom: 1px dashed #ccc; padding: 5px 0; color: ${color}">
                        <strong>${date.split(',')[0]}</strong>: ${icon} ${data.action} <span style="float: right;">${sign}€${data.amount.toFixed(2)}</span>
                    </li>
                `;
            });
            html += '</ul>';
            list.innerHTML = html;
        })
        .catch(err => {
            console.error(err);
            list.innerHTML = "Error: " + err.message;
            if (err.message.includes("index")) {
                alert("Please check console to create the required Index!");
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
    // Generate realistic "Organic" SVG Coffee Rings
    const numStains = 3 + Math.floor(Math.random() * 3);

    // Coffee Colors
    const darkest = "#3e2723";
    const dark = "#5d4037";
    const light = "#795548";

    for (let i = 0; i < numStains; i++) {
        const size = 200 + Math.random() * 150; // Large
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");

        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.style.position = "fixed";
        svg.style.top = `${Math.random() * 90}vh`;
        svg.style.left = `${Math.random() * 90}vw`;
        svg.style.pointerEvents = "none";
        svg.style.zIndex = "9999";
        svg.style.transform = `rotate(${Math.random() * 360}deg)`;
        svg.style.mixBlendMode = "multiply";
        svg.style.opacity = "0.85";

        // --- 1. Base Wash (Faint, wide) ---
        const pathBase = document.createElementNS(svgNS, "path");
        const points = [];
        const segments = 20;

        // Generate irregular circle points
        for (let j = 0; j <= segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            const r = 40 + (Math.random() * 3 - 1.5); // Slight wobble
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            points.push({ x, y });
        }

        // Construct Path "d"
        let d = `M ${points[0].x} ${points[0].y} `;
        for (let j = 1; j < points.length; j++) {
            d += `L ${points[j].x} ${points[j].y} `;
        }
        d += "Z";

        pathBase.setAttribute("d", d);
        pathBase.setAttribute("fill", "none");
        pathBase.setAttribute("stroke", light);
        pathBase.setAttribute("stroke-width", "8"); // Wide wash
        pathBase.setAttribute("stroke-opacity", "0.15");
        pathBase.style.filter = "blur(2px)";
        svg.appendChild(pathBase);

        // --- 2. The "Rim" (Darker, thinner, broken) ---
        const pathRim = document.createElementNS(svgNS, "path");
        pathRim.setAttribute("d", d);
        pathRim.setAttribute("fill", "none");
        pathRim.setAttribute("stroke", dark);
        pathRim.setAttribute("stroke-width", "2");
        pathRim.setAttribute("stroke-opacity", "0.7");
        pathRim.setAttribute("stroke-linecap", "round");
        // Random breaks in the rim
        const dash1 = 50 + Math.random() * 100;
        const gap1 = 10 + Math.random() * 50;
        pathRim.setAttribute("stroke-dasharray", `${dash1} ${gap1} ${dash1 / 2} ${gap1 / 2}`);
        svg.appendChild(pathRim);

        // --- 3. The "Crust" (Very dark edge, fine line) ---
        const pathCrust = document.createElementNS(svgNS, "path");
        pathCrust.setAttribute("d", d);
        pathCrust.setAttribute("fill", "none");
        pathCrust.setAttribute("stroke", darkest);
        pathCrust.setAttribute("stroke-width", "0.5");
        pathCrust.setAttribute("stroke-opacity", "0.9");
        // More breaks
        pathCrust.setAttribute("stroke-dasharray", `${dash1} ${gap1 + 5} ${dash1 / 2} ${gap1 / 2 + 5}`);
        svg.appendChild(pathCrust);

        // --- 4. Splatters ---
        const numSplatters = 3 + Math.floor(Math.random() * 5);
        for (let k = 0; k < numSplatters; k++) {
            const dot = document.createElementNS(svgNS, "circle");
            const angle = Math.random() * Math.PI * 2;
            const dist = 43 + Math.random() * 10; // Outside the ring
            const r = 0.5 + Math.random() * 1.5;

            dot.setAttribute("cx", 50 + Math.cos(angle) * dist);
            dot.setAttribute("cy", 50 + Math.sin(angle) * dist);
            dot.setAttribute("r", r);
            dot.setAttribute("fill", dark);
            dot.setAttribute("opacity", "0.6");
            svg.appendChild(dot);
        }

        document.body.appendChild(svg);
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
