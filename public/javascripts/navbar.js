const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const overlay = document.getElementById("overlay");
const globalLoader = document.getElementById('global-page-loader');

/* HAMBURGER & SIDEBAR LOGIC */
function toggleSidebar(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    sidebar.classList.toggle("mobile-open");
    if (overlay) overlay.classList.toggle("show");
}

// Mobile par instant response ke liye 'pointerdown' behtar hai
if (hamburger) {
    hamburger.addEventListener("pointerdown", toggleSidebar);
}

if (overlay) {
    overlay.addEventListener("click", toggleSidebar);
}

/* SUBMENU */
document.querySelectorAll(".menu-group").forEach(group => {
    const dropdown = group.querySelector(".dropdown");
    const submenu = group.querySelector(".submenu");
    const arrow = group.querySelector(".arrow");

    if (dropdown && submenu) {
        dropdown.addEventListener("click", (e) => {
            // Agar link hai to navigate karein, agar dropdown hai to toggle
            if (dropdown.getAttribute('href') === '#') e.preventDefault();
            
            submenu.classList.toggle("open");
            if (arrow) {
                arrow.textContent = submenu.classList.contains("open") ? "▼" : "▶";
            }
        });
    }
});






/* LOGOUT CONFIRMATION */
const logoutBtn = document.querySelector(".logout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        // Confirmation box dikhayein
        const confirmLogout = confirm("Are you sure you want to logout?");
        
        if (!confirmLogout) {
            // Agar user 'Cancel' karde to click ko rok dein
            e.preventDefault();
            
            // Agar aapka loader chal gaya ho to usay wapis band kar dein
            if (globalLoader) globalLoader.style.display = 'none';
        }
    });
}





// // Database Configuration
// const DB_NAME = "paintStoreDB";
// const STORES = ["products", "sales", "agents", "admins","items","printsales"];

// // 1. Database Initialize Karne Ka Function
// async function initBrowserDB() {
//     return new Promise((resolve, reject) => {
//         const request = indexedDB.open(DB_NAME, 1);
//         request.onupgradeneeded = (e) => {
//             const db = e.target.result;
//             STORES.forEach(s => {
//                 if (!db.objectStoreNames.contains(s)) {
//                     db.createObjectStore(s, { keyPath: "_id" });
//                 }
//             });
//         };
//         request.onsuccess = (e) => resolve(e.target.result);
//         request.onerror = (e) => reject(e.target.error);
//     });
// }

// // 2. Data Sync Karne Ka Function
// async function syncDatabase() {
//     console.log("🔄 Syncing Local Storage...");
//     try {
//         const db = await initBrowserDB();
//         const response = await fetch("/sales/api/sync-all");
//         if (!response.ok) throw new Error("Network response was not ok");
        
//         const data = await response.json();

//         // Transaction start karein (Saare stores ke liye)
//         const tx = db.transaction(STORES, "readwrite");

//         // Bari bari har store mein data bharna
//         STORES.forEach(storeName => {
//             if (data[storeName]) {
//                 const store = tx.objectStore(storeName);
//                 store.clear(); // Purana data clear karein taake duplicates na hon
//                 data[storeName].forEach(item => store.put(item));
//             }
//         });

//         tx.oncomplete = () => {
//             console.log("✅ All Data Synced to IndexedDB");
//             localStorage.setItem("lastSync", new Date().getTime());
//         };

//     } catch (err) {
//         console.error("❌ Sync Error:", err);
//     }
// }

// // 3. Auto-Sync Logic (Jab page load ho)
// document.addEventListener('DOMContentLoaded', () => {
//     const lastSync = localStorage.getItem("lastSync");
//     const now = new Date().getTime();
    
//     // Agar 10 minute se zyada ho gaye hain ya pehli baar hai, toh sync karein
//     if (!lastSync || (now - lastSync) > 10 * 60 * 1000) {
//         syncDatabase();
//     }
// });

