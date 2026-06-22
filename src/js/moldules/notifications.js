// ======================================================
// NOTIFICATIONS MODÜLÜ - Bildirim Sistemi
// ======================================================

// ------------------------------------------------------
// BİLDİRİM OLUŞTUR
// ------------------------------------------------------
async function createNotification(userEmail, notificationData) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const userKey = userEmail.replace(/\./g, ',');
        const notifKey = uniqueId("notif");
        
        const notification = {
            id: notifKey,
            title: notificationData.title || "Bildirim",
            message: notificationData.message || "",
            type: notificationData.type || "general",
            read: false,
            createdAt: Date.now(),
            marketId: notificationData.marketId || null,
            link: notificationData.link || "#",
            data: notificationData.data || {}
        };
        
        await fbSet(`notifications/${userKey}/${notifKey}`, notification);
        return true;
    } catch (error) {
        console.error("Bildirim oluşturma hatası:", error);
        return false;
    }
}

// ------------------------------------------------------
// TÜM KULLANICILARA BİLDİRİM GÖNDER
// ------------------------------------------------------
async function sendNotificationToAllUsers(notificationData) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        
        const promises = Object.keys(users).map(userKey => {
            const user = users[userKey];
            if (user && user.email) {
                return createNotification(user.email, notificationData);
            }
            return Promise.resolve();
        });
        
        await Promise.all(promises);
        console.log("✅ Tüm kullanıcılara bildirim gönderildi");
        return true;
    } catch (error) {
        console.error("Toplu bildirim hatası:", error);
        return false;
    }
}

// ------------------------------------------------------
// ADMİNLERE BİLDİRİM GÖNDER
// ------------------------------------------------------
async function sendNotificationToAdmins(notificationData) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        
        const promises = Object.keys(users).map(userKey => {
            const user = users[userKey];
            if (user && (user.isAdmin || user.email === "tsulhan@gmail.com")) {
                return createNotification(user.email, notificationData);
            }
            return Promise.resolve();
        });
        
        await Promise.all(promises);
        console.log("✅ Adminlere bildirim gönderildi");
        return true;
    } catch (error) {
        console.error("Admin bildirim hatası:", error);
        return false;
    }
}

// ------------------------------------------------------
// BAHİS BİLDİRİMİ GÖNDER (Ladese katılan diğer kullanıcılara)
// ------------------------------------------------------
async function sendBetNotificationToParticipants(marketId, bettorEmail, choice, amount, marketTitle, bettorNickname) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const historySnap = await fbGet("betHistory");
        const history = historySnap || {};
        
        const participants = Object.values(history)
            .filter(h => h.marketId === marketId && h.email !== bettorEmail)
            .map(h => h.email);
        
        const uniqueParticipants = [...new Set(participants)];
        
        if (uniqueParticipants.length === 0) {
            console.log("ℹ️ Bu ladese katılan başka kullanıcı yok, bildirim gönderilmedi.");
            return;
        }

        const choiceText = choice === "YES" ? "EVET" : (choice === "NO" ? "HAYIR" : "BERABERLİK");
        const displayName = bettorNickname || maskUserEmail(bettorEmail);

        const promises = uniqueParticipants.map(email => {
            return createNotification(email, {
                title: "💰 Yeni Bahis!",
                message: `${displayName}, "${marketTitle}" ladesinde ${choiceText} seçeneğine ${amount.toLocaleString("tr-TR")} Token yatırdı!`,
                type: "new_bet",
                marketId: marketId,
                link: "dashboard.html?tab=mevcut-ladesler",
                data: { bettor: bettorEmail, choice: choice, amount: amount }
            });
        });

        await Promise.all(promises);
        console.log(`✅ ${uniqueParticipants.length} kullanıcıya bahis bildirimi gönderildi`);
        
    } catch (error) {
        console.error("Bahis bildirimi gönderme hatası:", error);
    }
}

// ------------------------------------------------------
// BİLDİRİMLERİ GETİR
// ------------------------------------------------------
async function getNotifications(userEmail) {
    if (typeof db === "undefined" || !db) return [];
    
    try {
        const userKey = userEmail.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap || {};
        
        return Object.values(notifications)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("Bildirim getirme hatası:", error);
        return [];
    }
}

// ------------------------------------------------------
// BİLDİRİM DROPDOWN'INI GÖSTER/GİZLE
// ------------------------------------------------------
async function toggleNotificationDropdown() {
    const dropdown = document.getElementById("notification-dropdown");
    const list = document.getElementById("notification-list");
    
    if (!dropdown) return;
    
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
    
    const notifications = await getNotifications(currentUser);
    
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
        const badgeClass = `notif-badge-${notif.type}`;
        
        return `
            <div class="notification-item ${isUnread}" onclick="markNotificationAsRead('${notif.id}')">
                <div class="notif-title">${notif.title}</div>
                <div class="notif-message">${notif.message}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span class="notif-time">${timeAgo}</span>
                    <span class="notif-badge ${badgeClass}">${getNotificationTypeText(notif.type)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ------------------------------------------------------
// BİLDİRİM TİPİNİ TÜRKÇE'YE ÇEVİR
// ------------------------------------------------------
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

// ------------------------------------------------------
// ZAMANI FORMATLA
// ------------------------------------------------------
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
// BİLDİRİMİ OKUNDU İŞARETLE
// ------------------------------------------------------
async function markNotificationAsRead(notificationId) {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        await db.ref(`notifications/${userKey}/${notificationId}/read`).set(true);
        updateNotificationBadge();
    } catch (error) {
        console.error("Bildirim okundu hatası:", error);
    }
}

// ------------------------------------------------------
// TÜM BİLDİRİMLERİ OKUNDU İŞARETLE
// ------------------------------------------------------
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
// BİLDİRİM ROZETİNİ GÜNCELLE
// ------------------------------------------------------
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

// ------------------------------------------------------
// GERÇEK ZAMANLI BİLDİRİM DİNLEYİCİSİ
// ------------------------------------------------------
function startNotificationListener() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`notifications/${userKey}`).on("value", () => {
        updateNotificationBadge();
    });
}

// ------------------------------------------------------
// BİLDİRİM SİSTEMİNİ BAŞLAT
// ------------------------------------------------------
function startNotificationSystem() {
    // Bildirim düğümünü oluştur (yoksa)
    if (typeof db !== "undefined" && db) {
        fbGet("notifications").then(notifCheck => {
            if (!notifCheck) {
                fbSet("notifications", {});
                console.log("✅ Bildirim düğümü oluşturuldu");
            }
        }).catch(() => {});
    }
    
    // Dinleyiciyi başlat
    startNotificationListener();
}