// ======================================================
// LADES CORE.JS - SABİT ALTYAPİ VE UTILITY MOTORU
// ======================================================

// Global Firebase Veritabanı Değişkeni
let db;

function fbRef(path) { return db.ref(path); }
function fbGet(path) { return fbRef(path).once("value").then(snapshot => snapshot.val()); }
function fbSet(path, value) { return fbRef(path).set(value); }
function fbRemove(path) { return fbRef(path).remove(); }

function uniqueId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function objectValuesToArray(obj) {
    if (!obj) return [];
    return Object.values(obj);
}

function safeParse(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined || raw === "") return fallback;
        return JSON.parse(raw) ?? fallback;
    } catch (error) {
        console.warn(`localStorage parse hatası (${key}):`, error);
        return fallback;
    }
}

function safeSave(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

const DEFAULT_USERS = {
    "tsulhan@gmail.com": { email: "tsulhan@gmail.com", password: "1234", balance: 3600, isAdmin: true },
    "test@lades.com": { email: "test@lades.com", password: "1234", balance: 1000, isAdmin: false },
    "nehir@lades.com": { email: "nehir@lades.com", password: "1234", balance: 500, isAdmin: false }
};

const DEFAULT_INVITE_CODES = { code1: "LADES2026", code2: "VIPUX" };

// GÜNCELLENEN BOOTSTRAP MOTORU (OTOMATİK BAĞLANTI SAKLIDIR)
async function bootstrapFirebase() {
    // Eğer global db henüz tanımlanmadıysa, yüklü olan Firebase instance'ından eşitlemeyi dene
    if (typeof db === "undefined" || !db) {
        if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0) {
            db = firebase.database();
        } else {
            console.error("Firebase kütüphaneleri veya instance bulunamadı. Bağlantı yok.");
            return;
        }
    }

    const modalEl = document.getElementById("bet-modal");
    if (modalEl) { modalEl.style.display = "none"; }

    const lsUsers = safeParse("ladesUsers", null);
    const lsInviteCodes = safeParse("inviteCodes", null);
    const lsAdminRequests = safeParse("adminRequests", null);
    const lsCustomMarkets = safeParse("customMarkets", null);
    const lsBetHistory = safeParse("betHistory", null);

    const [fbUsers, fbInviteCodes, fbAdminRequests, fbCustomMarkets, fbBetHistory] = await Promise.all([
        fbGet("ladesUsers"), fbGet("inviteCodes"), fbGet("adminRequests"), fbGet("customMarkets"), fbGet("betHistory")
    ]);

    // Kullanıcılar veritabanında hiç yoksa (İlk Kurulum)
    if (!fbUsers) {
        if (lsUsers && Array.isArray(lsUsers) && lsUsers.length > 0) {
            const obj = {};
            lsUsers.forEach((u, index) => {
                const key = u.email ? u.email.replace(/\./g, ',') : `user_${index + 1}`;
                obj[key] = {
                    email: u.email,
                    password: u.password || "1234",
                    balance: typeof u.balance === "number" ? u.balance : parseInt(u.balance || 0),
                    isAdmin: !!u.isAdmin
                };
            });
            if (obj["tsulhan@gmail,com"]) {
                obj["tsulhan@gmail,com"].isAdmin = true;
                if (typeof obj["tsulhan@gmail,com"].balance !== "number") obj["tsulhan@gmail,com"].balance = 3600;
            }
            await fbSet("ladesUsers", obj);
        } else {
            const cleanDefault = {};
            Object.keys(DEFAULT_USERS).forEach(k => { cleanDefault[k.replace(/\./g, ',')] = DEFAULT_USERS[k]; });
            await fbSet("ladesUsers", cleanDefault);
        }
    } else {
        // Kullanıcılar zaten varsa (Normal Girişler)
        let changed = false;
        Object.keys(fbUsers).forEach(key => {
            const user = fbUsers[key];
            if (!user.password) { user.password = "1234"; changed = true; }
            if (typeof user.balance !== "number") { user.balance = parseInt(user.balance || 0); changed = true; }
            if (typeof user.isAdmin !== "boolean") { user.isAdmin = false; changed = true; }
            
            // Sadece adminlik rolünü güvenceye alıyoruz, bakiye sıfırlama şartını kaldırdık!
            if (user.email === "tsulhan@gmail.com") {
                if (!user.isAdmin) { user.isAdmin = true; changed = true; }
            }
        });
        if (changed) await fbSet("ladesUsers", fbUsers);
    }

    if (!fbInviteCodes) {
        if (lsInviteCodes) {
            if (Array.isArray(lsInviteCodes)) {
                const obj = {}; lsInviteCodes.forEach((code, index) => { obj[`code${index + 1}`] = code; });
                await fbSet("inviteCodes", obj);
            } else { await fbSet("inviteCodes", lsInviteCodes); }
        } else { await fbSet("inviteCodes", DEFAULT_INVITE_CODES); }
    }

    if (!fbAdminRequests) {
        if (lsAdminRequests) {
            if (Array.isArray(lsAdminRequests)) {
                const obj = {}; lsAdminRequests.forEach((req, index) => { obj[`req${index + 1}`] = { ...req, id: req.id || `req_${index + 1}` }; });
                await fbSet("adminRequests", obj);
            } else { await fbSet("adminRequests", lsAdminRequests); }
        } else { await fbSet("adminRequests", {}); }
    }

    if (!fbCustomMarkets) {
        if (lsCustomMarkets) {
            if (Array.isArray(lsCustomMarkets)) {
                const obj = {}; lsCustomMarkets.forEach((m, index) => { const id = m.id || `market_${index + 1}`; obj[id] = { ...m, id }; });
                await fbSet("customMarkets", obj);
            } else { await fbSet("customMarkets", lsCustomMarkets); }
        } else { await fbSet("customMarkets", {}); }
    } else {
        let changed = false;
        Object.keys(fbCustomMarkets).forEach(key => {
            const market = fbCustomMarkets[key];
            if (!market.status) { market.status = "Aktif"; changed = true; }
            if (typeof market.yesPool !== "number") { market.yesPool = parseInt(market.yesPool || 0); changed = true; }
            if (typeof market.noPool !== "number") { market.noPool = parseInt(market.noPool || 0); changed = true; }
            if (typeof market.drawPool !== "number") { market.drawPool = parseInt(market.drawPool || 0); changed = true; }
            if (!market.category) { market.category = "Genel"; changed = true; }
        });
        if (changed) await fbSet("customMarkets", fbCustomMarkets);
    }

    if (!fbBetHistory) {
        if (lsBetHistory) {
            if (Array.isArray(lsBetHistory)) {
                const obj = {}; lsBetHistory.forEach((h, index) => { const id = h.id || `history_${index + 1}`; obj[id] = { ...h, id }; });
                await fbSet("betHistory", obj);
            } else { await fbSet("betHistory", lsBetHistory); }
        } else { await fbSet("betHistory", {}); }
    }
}

function closeModal() {
    const modalEl = document.getElementById("bet-modal");
    const betAmount = document.getElementById("bet-amount");
    if (modalEl) modalEl.style.display = "none";
    if (betAmount) betAmount.value = "";
}

function logout() { localStorage.removeItem("currentUser"); window.location.href = "login.html"; }

function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
    document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add("active");
}