// ======================================================
// LADES APP.JS - ANA DOSYA (TÜM MODÜLLERİ BİRLEŞTİREN)
// ======================================================

// ------------------------------------------------------
// GLOBAL DEĞİŞKENLER
// ------------------------------------------------------
let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";
let creatorNamesCache = {};

// ------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ------------------------------------------------------

// Kullanıcının nickname'ini getir (cache ile)
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
    } catch {
        return maskUserEmail(email);
    }
}

// Email maskeleme (fallback)
function maskUserEmail(email) {
    if (!email || !email.includes("@")) return email;
    const parts = email.split("@");
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 4) {
        return name.substring(0, 1) + "***@" + domain;
    }
    return name.substring(0, 4) + "***@" + domain;
}

// ------------------------------------------------------
// LİDERLİK TABLOSU
// ------------------------------------------------------
function renderLeaderboard(usersObj) {
    const leaderboardList = document.getElementById("leaderboard-list");
    if (!leaderboardList) return;

    const sortedUsers = Object.values(usersObj)
        .filter(u => u && u.email && (u.balance || 0) > 0)
        .sort((a, b) => (b.balance || 0) - (a.balance || 0));

    if (sortedUsers.length === 0) {
        leaderboardList.innerHTML = `
            <div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">
                Henüz token kazanmış kullanıcı bulunmuyor. İlk kazanan sen ol! 🏆
            </div>`;
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

// ------------------------------------------------------
// GERÇEK ZAMANLI DİNLEYİCİLER
// ------------------------------------------------------
function startRealtimeListeners() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    
    // Kullanıcı bilgilerini dinle
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        let user = snapshot.val();
        if (user) {
            // Kullanıcı badge'ini güncelle
            const userEmailBadge = document.getElementById("user-email-badge");
            if (userEmailBadge) {
                userEmailBadge.innerText = user.nickname || user.email;
            }
            
            // Token bakiyesini güncelle
            const balance = user.balance || 0;
            const balanceElement = document.getElementById("token-balance");
            if (balanceElement) balanceElement.innerText = balance.toLocaleString("tr-TR");
            
            // Token iste butonunu göster/gizle
            const tokenRequestBtn = document.getElementById("token-request-btn");
            if (tokenRequestBtn) {
                tokenRequestBtn.style.display = balance === 0 ? "inline-block" : "none";
            }
            
            // Admin butonunu göster/gizle
            const adminBtn = document.getElementById("admin-panel-btn");
            if (adminBtn) {
                if (user.isAdmin || currentUserEmail === "tsulhan@gmail.com") {
                    adminBtn.style.setProperty("display", "block", "important");
                } else {
                    adminBtn.style.display = "none";
                }
            }
        }
    });
    
    // Ladesleri dinle
    fbRef("customMarkets").on("value", (snapshot) => {
        const marketsObj = snapshot.val() || {};
        renderMarketGrid(marketsObj);
    });
    
    // Kullanıcıları dinle (Liderlik tablosu için)
    fbRef("ladesUsers").on("value", (snapshot) => {
        const usersObj = snapshot.val() || {};
        renderLeaderboard(usersObj);
    });
    
    // Bildirimleri dinle
    startNotificationListener();
}

// ------------------------------------------------------
// SAYFA YÜKLENİNCE BAŞLAT
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    if (typeof bootstrapFirebase === "function") {
        await bootstrapFirebase();
    }
    
    // Kategori seçeneğini güncelle
    updateChoiceOptions();
    const categorySelect = document.getElementById("market-category");
    if (categorySelect) {
        categorySelect.addEventListener("change", updateChoiceOptions);
    }
    
    // Gerçek zamanlı dinleyicileri başlat
    startRealtimeListeners();
    
    // Chat sistemini başlat
    startChatSystem();
    
    // Bildirim sistemini başlat
    startNotificationSystem();
    
    // Tab geçişleri için switchTab fonksiyonunu global yap
    window.switchTab = function(tabId) {
        document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
        document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add("active");
        if (window.event && window.event.currentTarget) {
            window.event.currentTarget.classList.add("active");
        }
    };
});

// ------------------------------------------------------
// GLOBAL FONKSİYONLARI WINDOW'A EKLE (HTML'den erişilebilir olması için)
// ------------------------------------------------------
// Auth
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.requestInviteCode = requestInviteCode;
window.logout = logout;

// Markets
window.createNewMarket = createNewMarket;
window.filterCategory = filterCategory;
window.updateChoiceOptions = updateChoiceOptions;

// Betting
window.openBetModal = openBetModal;
window.confirmBet = confirmBet;
window.closeModal = closeModal;
window.finalizeLades = finalizeLades;
window.deleteMarketCompletely = deleteMarketCompletely;
window.deleteMarketFromHistory = deleteMarketFromHistory;

// Admin
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.generateInviteCode = generateInviteCode;
window.approveInvite = approveInvite;
window.approveToken = approveToken;
window.deleteRequest = deleteRequest;
window.deleteInviteCode = deleteInviteCode;
window.deleteUserCompletely = deleteUserCompletely;
window.setTokensManual = setTokensManual;

// Notifications
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;

// Chat
window.toggleChatPanel = toggleChatPanel;
window.switchChatTab = switchChatTab;
window.sendChatMessage = sendChatMessage;
window.openMarketChat = openMarketChat;
window.closeMarketChat = closeMarketChat;

// Profile
window.initProfilePage = initProfilePage;

console.log("✅ LADES uygulaması başarıyla başlatıldı!");