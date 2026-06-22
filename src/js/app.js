// ======================================================
// LADES APP.JS - ANA DOSYA (SADECE BAĞLANTILAR)
// ======================================================

// GLOBAL DEĞİŞKENLER
let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";
let creatorNamesCache = {};

// YARDIMCI FONKSİYONLAR
async function getUserNickname(email) {
    if (!email) return "Bilinmeyen";
    if (creatorNamesCache[email]) return creatorNamesCache[email];
    if (typeof db === "undefined" || !db) return maskUserEmail(email);
    try {
        const userKey = email.replace(/\./g, ',');
        const user = await fbGet(`ladesUsers/${userKey}`);
        const nickname = user?.nickname || maskUserEmail(email);
        creatorNamesCache[email] = nickname;
        return nickname;
    } catch { return maskUserEmail(email); }
}

function maskUserEmail(email) {
    if (!email || !email.includes("@")) return email;
    const parts = email.split("@");
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 4) return name.substring(0, 1) + "***@" + domain;
    return name.substring(0, 4) + "***@" + domain;
}

// LİDERLİK TABLOSU
function renderLeaderboard(usersObj) {
    const leaderboardList = document.getElementById("leaderboard-list");
    if (!leaderboardList) return;
    const sortedUsers = Object.values(usersObj)
        .filter(u => u && u.email && (u.balance || 0) > 0)
        .sort((a, b) => (b.balance || 0) - (a.balance || 0));
    if (sortedUsers.length === 0) {
        leaderboardList.innerHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Henüz token kazanmış kullanıcı bulunmuyor. 🏆</div>`;
        return;
    }
    leaderboardList.innerHTML = "";
    sortedUsers.forEach((user, index) => {
        const rank = index + 1;
        let rankDisplay = rank;
        if (rank === 1) rankDisplay = "🥇";
        else if (rank === 2) rankDisplay = "🥈";
        else if (rank === 3) rankDisplay = "🥉";
        const displayName = user.nickname || maskUserEmail(user.email);
        leaderboardList.innerHTML += `
            <div class="leaderboard-row">
                <div class="leaderboard-user">
                    <span class="leaderboard-rank">${rankDisplay}</span>
                    <span class="leaderboard-email">${displayName}</span>
                </div>
                <div class="leaderboard-balance">${(user.balance || 0).toLocaleString("tr-TR")} Token</div>
            </div>
        `;
    });
}

// GERÇEK ZAMANLI DİNLEYİCİLER
function startRealtimeListeners() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) { console.warn("⚠️ Kullanıcı giriş yapmamış."); return; }
    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    console.log("✅ Dinleyici başlatılıyor:", currentUserEmail);
    
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        let user = snapshot.val();
        if (user) {
            const badge = document.getElementById("user-email-badge");
            if (badge) badge.innerText = user.nickname || user.email;
            const balance = user.balance || 0;
            const balEl = document.getElementById("token-balance");
            if (balEl) balEl.innerText = balance.toLocaleString("tr-TR");
            const tokenBtn = document.getElementById("token-request-btn");
            if (tokenBtn) tokenBtn.style.display = balance === 0 ? "inline-block" : "none";
            const adminBtn = document.getElementById("admin-panel-btn");
            if (adminBtn) {
                if (user.isAdmin || currentUserEmail === "tsulhan@gmail.com") {
                    adminBtn.style.setProperty("display", "block", "important");
                } else adminBtn.style.display = "none";
            }
            const reqArea = document.getElementById("token-request-area");
            if (reqArea) reqArea.style.display = balance === 0 ? "block" : "none";
        }
    });
    
    fbRef("customMarkets").on("value", (snapshot) => {
        const marketsObj = snapshot.val() || {};
        renderMarketGrid(marketsObj);
    });
    
    fbRef("ladesUsers").on("value", (snapshot) => {
        const usersObj = snapshot.val() || {};
        renderLeaderboard(usersObj);
    });
    
    startNotificationListener();
}

// SAYFA YÜKLENİNCE
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 LADES başlatılıyor...");
    if (typeof bootstrapFirebase === "function") await bootstrapFirebase();
    if (typeof updateChoiceOptions === "function") updateChoiceOptions();
    const catSelect = document.getElementById("market-category");
    if (catSelect) catSelect.addEventListener("change", updateChoiceOptions);
    startRealtimeListeners();
    if (typeof startChatSystem === "function") startChatSystem();
    window.switchTab = function(tabId) {
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        const target = document.getElementById(tabId);
        if (target) target.classList.add("active");
        if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add("active");
    };
    console.log("✅ LADES başarıyla başlatıldı!");
});

// GLOBAL FONKSİYONLAR (HTML'den erişim için)
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.requestInviteCode = requestInviteCode;
window.logout = logout;
window.createNewMarket = createNewMarket;
window.filterCategory = filterCategory;
window.updateChoiceOptions = updateChoiceOptions;
window.openBetModal = openBetModal;
window.confirmBet = confirmBet;
window.closeModal = closeModal;
window.finalizeLades = finalizeLades;
window.deleteMarketCompletely = deleteMarketCompletely;
window.deleteMarketFromHistory = deleteMarketFromHistory;
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.generateInviteCode = generateInviteCode;
window.approveInvite = approveInvite;
window.approveToken = approveToken;
window.deleteRequest = deleteRequest;
window.deleteInviteCode = deleteInviteCode;
window.deleteUserCompletely = deleteUserCompletely;
window.setTokensManual = setTokensManual;
window.renderAdminPanel = renderAdminPanel;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.updateNotificationBadge = updateNotificationBadge;
window.openTokenRequestModal = openTokenRequestModal;
window.toggleChatPanel = toggleChatPanel;
window.switchChatTab = switchChatTab;
window.sendChatMessage = sendChatMessage;
window.openMarketChat = openMarketChat;
window.closeMarketChat = closeMarketChat;
window.initProfilePage = initProfilePage;