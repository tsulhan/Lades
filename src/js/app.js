// ======================================================
// LADES APP.JS - ANA DOSYA (BAŞLANGIÇ VE DİNLEYİCİLER)
// ======================================================

// GLOBAL DURUM
let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";
let creatorNamesCache = {};

// ------------------------------------------------------
// GERÇEK ZAMANLI DİNLEYİCİLER
// ------------------------------------------------------
function startRealtimeListeners() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) {
        console.warn("⚠️ Kullanıcı giriş yapmamış, dinleyiciler başlatılamadı.");
        return;
    }

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    console.log("✅ Dinleyici başlatılıyor:", currentUserEmail);
    
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        let user = snapshot.val();
        if (user) {
            const userEmailBadge = document.getElementById("user-email-badge");
            if (userEmailBadge) {
                userEmailBadge.innerText = user.nickname || user.email;
            }

            const balance = user.balance || 0;
            const balanceElement = document.getElementById("token-balance");
            if (balanceElement) balanceElement.innerText = balance.toLocaleString("tr-TR");

            const tokenRequestBtn = document.getElementById("token-request-btn");
            if (tokenRequestBtn) {
                tokenRequestBtn.style.display = balance === 0 ? "inline-block" : "none";
            }

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

// ------------------------------------------------------
// SAYFA YÜKLENİNCE BAŞLAT
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 LADES uygulaması başlatılıyor...");
    
    if (typeof bootstrapFirebase === "function") {
        await bootstrapFirebase();
    }
    
    updateChoiceOptions();
    const categorySelect = document.getElementById("market-category");
    if (categorySelect) {
        categorySelect.addEventListener("change", updateChoiceOptions);
    }
    
    startRealtimeListeners();
    startChatSystem();
    startLiveFeed(); // ✅ CANLI BAHİS AKIŞI BAŞLAT
    
    // Tab geçişleri için switchTab fonksiyonunu global yap
    window.switchTab = function(tabId) {
        document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
        document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add("active");
        if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add("active");
    };
    
    console.log("✅ LADES uygulaması başarıyla başlatıldı!");
});

// ------------------------------------------------------
// GLOBAL FONKSİYONLAR (HTML'den erişim için)
// ------------------------------------------------------
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
window.toggleMarketDetail = toggleMarketDetail;