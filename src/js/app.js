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
    if (!currentUserEmail) {
        console.warn("⚠️ Kullanıcı giriş yapmamış, dinleyiciler başlatılamadı.");
        return;
    }

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    console.log("✅ Dinleyici başlatılıyor:", currentUserEmail);
    
    // Kullanıcı bilgilerini dinle
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        let user = snapshot.val();
        console.log("📊 Kullanıcı verisi geldi:", user);
        
        if (user) {
            // Kullanıcı badge'ini güncelle
            const userEmailBadge = document.getElementById("user-email-badge");
            if (userEmailBadge) {
                userEmailBadge.innerText = user.nickname || user.email;
            }
            
            // Token bakiyesini güncelle
            const balance = user.balance || 0;
            const balanceElement = document.getElementById("token-balance");
            if (balanceElement) {
                balanceElement.innerText = balance.toLocaleString("tr-TR");
            }
            
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
            
            // Token request banner'ı göster/gizle
            const tokenRequestArea = document.getElementById("token-request-area");
            if (tokenRequestArea) {
                tokenRequestArea.style.display = balance === 0 ? "block" : "none";
            }
        } else {
            console.warn("⚠️ Kullanıcı verisi bulunamadı! Kullanıcı oluşturulması gerekebilir.");
        }
    });
    
    // Ladesleri dinle
    fbRef("customMarkets").on("value", (snapshot) => {
        const marketsObj = snapshot.val() || {};
        if (typeof renderMarketGrid === "function") {
            renderMarketGrid(marketsObj);
        }
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
// BİLDİRİM SİSTEMİ (DOĞRUDAN APP.JS İÇİNDE)
// ------------------------------------------------------

// Bildirim rozetini güncelle
async function updateNotificationBadge() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap || {};
        
        const unreadCount = Object.values(notifications).filter(n => !n.read).length;
        const badge = document.getElementById("notification-badge");
        
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = "inline-block";
                badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
            } else {
                badge.style.display = "none";
            }
        }
    } catch (error) {
        console.error("Rozet güncelleme hatası:", error);
    }
}

// Bildirim dinleyicisi
function startNotificationListener() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`notifications/${userKey}`).on("value", () => {
        updateNotificationBadge();
    });
}

// Bildirim tipini Türkçe'ye çevir
function getNotificationTypeText(type) {
    const types = {
        'new_market': 'Yeni Lades',
        'new_bet': 'Yeni Bahis',
        'closing': 'Kapanış Uyarısı',
        'result': 'Sonuç',
        'token_request': 'Token Talebi',
        'invite_request': 'Davet Talebi'
    };
    return types[type] || 'Genel';
}

// Zamanı formatla
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return new Date(timestamp).toLocaleDateString('tr-TR');
}

// ------------------------------------------------------
// BİLDİRİM DROPDOWN
// ------------------------------------------------------
async function toggleNotificationDropdown() {
    console.log("🔔 Bildirim dropdown açılıyor...");
    
    const dropdown = document.getElementById("notification-dropdown");
    const list = document.getElementById("notification-list");
    
    if (!dropdown) {
        console.error("❌ notification-dropdown bulunamadı!");
        return;
    }
    
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
        return;
    }
    
    dropdown.style.display = "block";
    
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        list.innerHTML = `
            <div style="text-align: center; color: #64748b; padding: 30px; font-size: 13px;">
                Lütfen giriş yapın.
            </div>
        `;
        return;
    }
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap ? Object.values(notifSnap).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];
        
        if (notifications.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 30px; font-size: 13px;">
                    📭 Bildirim bulunmuyor.
                </div>
            `;
            return;
        }
        
        list.innerHTML = notifications.map(notif => {
            const timeAgo = getTimeAgo(notif.createdAt);
            const isUnread = !notif.read ? 'unread' : '';
            const badgeClass = `notif-badge-${notif.type || 'general'}`;
            
            return `
                <div class="notification-item ${isUnread}" onclick="markNotificationAsRead('${notif.id}')">
                    <div class="notif-title">${notif.title || 'Bildirim'}</div>
                    <div class="notif-message">${notif.message || ''}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <span class="notif-time">${timeAgo}</span>
                        <span class="notif-badge ${badgeClass}">${getNotificationTypeText(notif.type)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Bildirim yükleme hatası:", error);
        list.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px; font-size: 13px;">
                ❌ Bildirimler yüklenirken bir hata oluştu.
            </div>
        `;
    }
}

// Bildirimi okundu işaretle
async function markNotificationAsRead(notificationId) {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        await db.ref(`notifications/${userKey}/${notificationId}/read`).set(true);
        updateNotificationBadge();
        // Dropdown'ı yenile
        await toggleNotificationDropdown();
    } catch (error) {
        console.error("Bildirim okundu hatası:", error);
    }
}

// Tüm bildirimleri okundu işaretle
async function markAllNotificationsAsRead() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap || {};
        
        const promises = Object.keys(notifications).map(key => {
            return db.ref(`notifications/${userKey}/${key}/read`).set(true);
        });
        
        await Promise.all(promises);
        updateNotificationBadge();
        await toggleNotificationDropdown();
    } catch (error) {
        console.error("Tümünü okundu hatası:", error);
    }
}

// ------------------------------------------------------
// ADMIN PANELİ
// ------------------------------------------------------
async function openAdminPanel() {
    console.log("🔓 Admin paneli açılıyor...");
    
    const modal = document.getElementById("admin-modal");
    if (!modal) {
        console.error("❌ admin-modal bulunamadı!");
        alert("Admin paneli bulunamadı!");
        return;
    }
    
    modal.style.display = "flex";
    
    // Admin panelini render et
    if (typeof renderAdminPanel === 'function') {
        await renderAdminPanel();
    } else {
        console.warn("⚠️ renderAdminPanel fonksiyonu bulunamadı!");
    }
}

function closeAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

// ------------------------------------------------------
// TOKEN TALEBİ (EKSİK OLAN)
// ------------------------------------------------------
async function openTokenRequestModal() {
    const currentUserEmail = localStorage.getItem("currentUser");
    
    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = "login.html";
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    try {
        const userKey = currentUserEmail.replace(/\./g, ',');
        const user = await fbGet(`ladesUsers/${userKey}`);
        
        if (!user) {
            alert("Kullanıcı bulunamadı!");
            return;
        }

        const currentBalance = user.balance || 0;
        const displayName = user.nickname || currentUserEmail;
        
        const amount = prompt(
            `💰 MEVCUT BAKİYENİZ: ${currentBalance.toLocaleString("tr-TR")} Token\n` +
            `👤 Kullanıcı: ${displayName}\n\n` +
            `Kaç Token talep etmek istiyorsunuz?\n` +
            `(Yönetici onayı gereklidir)`
        );
        
        const tokenAmount = parseInt(amount);

        if (isNaN(tokenAmount) || tokenAmount <= 0) {
            alert("Geçersiz miktar! Lütfen 0'dan büyük bir sayı girin.");
            return;
        }

        const reqKey = uniqueId("req");
        await fbSet(`adminRequests/${reqKey}`, {
            id: reqKey,
            type: "token",
            email: currentUserEmail,
            nickname: user.nickname || currentUserEmail,
            amount: tokenAmount,
            currentBalance: currentBalance,
            status: "Bekliyor",
            createdAt: Date.now()
        });

        // Adminlere bildirim gönder
        if (typeof sendNotificationToAdmins === 'function') {
            await sendNotificationToAdmins({
                title: "💰 Token Talebi!",
                message: `${displayName} (${currentUserEmail}) kullanıcısı ${tokenAmount} Token talep ediyor!`,
                type: "token_request",
                link: "dashboard.html?tab=admin",
                data: { email: currentUserEmail, nickname: displayName, amount: tokenAmount }
            });
        }

        alert(`✅ ${tokenAmount} Token talebiniz yöneticiye iletildi!\n\nYönetici onayladığında bakiyeniz güncellenecektir.`);
        
    } catch (error) {
        console.error("Token talebi hatası:", error);
        alert("❌ Talep gönderilirken bir hata oluştu: " + error.message);
    }
}

// ------------------------------------------------------
// SAYFA YÜKLENİNCE BAŞLAT
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 LADES uygulaması başlatılıyor...");
    
    // Firebase'i başlat
    if (typeof bootstrapFirebase === "function") {
        await bootstrapFirebase();
        console.log("✅ Firebase başlatıldı");
    }
    
    // Kategori seçeneğini güncelle
    if (typeof updateChoiceOptions === "function") {
        updateChoiceOptions();
    }
    
    const categorySelect = document.getElementById("market-category");
    if (categorySelect) {
        categorySelect.addEventListener("change", function() {
            if (typeof updateChoiceOptions === "function") {
                updateChoiceOptions();
            }
        });
    }
    
    // Gerçek zamanlı dinleyicileri başlat
    startRealtimeListeners();
    
    // Chat sistemini başlat
    if (typeof startChatSystem === "function") {
        startChatSystem();
    } else {
        console.warn("⚠️ Chat sistemi başlatılamadı!");
    }
    
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
    
    console.log("✅ LADES uygulaması başarıyla başlatıldı!");
});

// ------------------------------------------------------
// GLOBAL FONKSİYONLARI WINDOW'A EKLE
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
window.updateNotificationBadge = updateNotificationBadge;

// Token
window.openTokenRequestModal = openTokenRequestModal;

// Chat
window.toggleChatPanel = toggleChatPanel;
window.switchChatTab = switchChatTab;
window.sendChatMessage = sendChatMessage;
window.openMarketChat = openMarketChat;
window.closeMarketChat = closeMarketChat;

// Profile
window.initProfilePage = initProfilePage;

// Admin paneli render
window.renderAdminPanel = renderAdminPanel;

console.log("✅ Tüm modüller başarıyla yüklendi!");
console.log("📋 Kullanıma hazır fonksiyonlar:");
console.log("  🔔 toggleNotificationDropdown - Bildirimler");
console.log("  🔓 openAdminPanel - Admin Paneli");
console.log("  💬 toggleChatPanel - Sohbet");
console.log("  💰 openTokenRequestModal - Token Talebi");