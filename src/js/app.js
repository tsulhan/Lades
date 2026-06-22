// ======================================================
// LADES APP.JS - TÜM İŞ MANTIĞI VE GÜVENLİ YÖNETİCİ ÖZELLİKLERİ
// ======================================================

// GLOBAL DURUM
let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";

// ------------------------------------------------------
// GİRİŞ / KAYIT / DAVET
// ------------------------------------------------------
async function handleLogin() {
    const emailValue = document.getElementById("email")?.value.trim();
    const passwordValue = document.getElementById("password")?.value;

    if (!emailValue || !passwordValue) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı kuruluyor, lütfen birkaç saniye sonra tekrar deneyin.");
        return;
    }

    try {
        if (typeof fbGet !== "function") {
            alert("Altyapı fonksiyonları (core.js) yüklenemedi.");
            return;
        }

        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};

        const firebaseUserKey = emailValue.replace(/\./g, ',');
        const user = users[firebaseUserKey];

        if (user && user.password === String(passwordValue)) {
            localStorage.setItem("currentUser", user.email);
            window.location.href = "dashboard.html";
        } else {
            alert("Hatalı e-posta veya şifre!");
        }
    } catch (error) {
        console.error("Giriş hatası detayları:", error);
        alert("Giriş işlem sırasında teknik bir hata meydana geldi.");
    }
}

async function handleRegister() {
    const inviteCode = document.getElementById("reg-invite-code")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const passwordConfirm = document.getElementById("reg-password-confirm")?.value;

    if (!inviteCode || !email || !password || !passwordConfirm) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (password !== passwordConfirm) {
        alert("Şifreler birbiriyle uyuşmuyor!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const [inviteCodesSnap, usersSnap] = await Promise.all([
        fbGet("inviteCodes"),
        fbGet("ladesUsers")
    ]);

    const inviteCodes = inviteCodesSnap || {};
    const users = usersSnap || {};
    const inviteCodeList = objectValuesToArray(inviteCodes);
    const userList = objectValuesToArray(users);

    if (!inviteCodeList.includes(inviteCode)) {
        alert("Geçersiz Davet Kodu!");
        return;
    }

    if (userList.some(u => u.email === email)) {
        alert("Bu kullanıcı zaten mevcut!");
        return;
    }

    const newUserKey = email.replace(/\./g, ',');
    await fbSet(`ladesUsers/${newUserKey}`, {
        email,
        password,
        balance: 0,
        isAdmin: false
    });

    const inviteKey = Object.keys(inviteCodes).find(k => inviteCodes[k] === inviteCode);
    if (inviteKey) {
        await fbRemove(`inviteCodes/${inviteKey}`);
    }

    alert("✅ Kayıt başarılı! Başlangıç bakiyeniz: 0 TOKEN. Token talebi oluşturabilirsiniz.");
    window.location.href = "login.html";
}

async function requestInviteCode() {
    const email = document.getElementById("reg-email")?.value.trim();

    if (!email) {
        alert("Lütfen önce E-posta alanını doldurun!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};

    const existing = objectValuesToArray(requests).some(
        r => r.email === email && r.type === "invite" && r.status === "Bekliyor"
    );

    if (existing) {
        alert("Zaten açık bir talebiniz var.");
        return;
    }

    const reqKey = uniqueId("req");
    await fbSet(`adminRequests/${reqKey}`, {
        id: reqKey,
        type: "invite",
        email,
        status: "Bekliyor",
        createdAt: Date.now()
    });

    await sendNotificationToAdmins({
        title: "📩 Davet Kodu Talebi!",
        message: `${email} kullanıcısı davet kodu talep ediyor!`,
        type: "invite_request",
        link: "dashboard.html?tab=admin",
        data: { email: email }
    });

    alert("✅ Davet kodu talebiniz yöneticiye iletildi! Yönetici onayladığında kodunuz hazır olacak.");
}

// ------------------------------------------------------
// KATEGORİ / OPSİYON VE FİLTRELEME MOTORU
// ------------------------------------------------------
function updateChoiceOptions() {
    const categorySelect = document.getElementById("market-category");
    const choiceSelect = document.getElementById("market-choice");

    if (!categorySelect || !choiceSelect) return;

    const drawOption = choiceSelect.querySelector('option[value="DRAW"]');
    if (!drawOption) return;

    if (categorySelect.value === "Spor") {
        drawOption.hidden = false;
        drawOption.disabled = false;
    } else {
        drawOption.hidden = true;
        drawOption.disabled = true;

        if (choiceSelect.value === "DRAW") {
            choiceSelect.value = "YES";
        }
    }
}

function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;

    const buttons = document.querySelectorAll(".sidebar-menu button");
    buttons.forEach(btn => btn.classList.remove("active"));

    buttons.forEach(btn => {
        const text = btn.innerText || "";
        if (categoryName === "Tümü" && text.includes("Tümü")) {
            btn.classList.add("active");
        } else if (text.includes(categoryName)) {
            btn.classList.add("active");
        }
    });

    if (typeof fbGet === "function") {
        fbGet("customMarkets").then(marketsObj => {
            renderMarketGrid(marketsObj || {});
        }).catch(err => console.error("Filtreleme hatası:", err));
    }
}

// ------------------------------------------------------
// REALTIME DATA LISTENERS
// ------------------------------------------------------
function startRealtimeListeners() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        let user = snapshot.val();

        if (user) {
            const userEmailBadge = document.getElementById("user-email-badge");
            if (userEmailBadge) userEmailBadge.innerText = user.email;

            const balance = user.balance || 0;
            const balanceElement = document.getElementById("token-balance");
            if (balanceElement) balanceElement.innerText = balance.toLocaleString("tr-TR");

            const tokenRequestBtn = document.getElementById("token-request-btn");
            if (tokenRequestBtn) {
                if (balance === 0) {
                    tokenRequestBtn.style.display = "inline-block";
                } else {
                    tokenRequestBtn.style.display = "none";
                }
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
// LİDERLİK TABLOSU MOTORU (LEADERBOARD RENDER)
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

        const maskedEmail = maskUserEmail(user.email);

        leaderboardList.innerHTML += `
            <div class="leaderboard-row">
                <div class="leaderboard-user">
                    <span class="leaderboard-rank">${rankDisplay}</span>
                    <span class="leaderboard-email">${maskedEmail}</span>
                </div>
                <div class="leaderboard-balance">${(user.balance || 0).toLocaleString("tr-TR")} Token</div>
            </div>
        `;
    });
}

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
// DASHBOARD RENDER MOTORU (AKTİF VE GEÇMİŞ LADESLER)
// ------------------------------------------------------
function renderMarketGrid(marketsObj) {
    const marketGrid = document.getElementById("market-grid");
    const pastMarketGrid = document.getElementById("past-market-grid");
    
    const allMarkets = objectValuesToArray(marketsObj).filter(m => m);

    let activeMarkets = allMarkets.filter(m => m.status === "Aktif");
    if (selectedCategoryFilter !== "Tümü") {
        activeMarkets = activeMarkets.filter(m => m.category === selectedCategoryFilter);
    }

    let pastMarkets = allMarkets.filter(m => m.status === "Sonuçlandı" || m.status === "Kapatıldı");
    if (selectedCategoryFilter !== "Tümü") {
        pastMarkets = pastMarkets.filter(m => m.category === selectedCategoryFilter);
    }

    if (marketGrid) {
        marketGrid.innerHTML = "";
        if (activeMarkets.length === 0) {
            marketGrid.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:40px; width:100%;">
                    Şu an bu kategoride aktif bir lades bulunmuyor.
                </div>
            `;
        } else {
            activeMarkets.forEach(market => {
                marketGrid.innerHTML += generateMarketCardHTML(market, true);
            });
        }
    }

    if (pastMarketGrid) {
        pastMarketGrid.innerHTML = "";
        if (pastMarkets.length === 0) {
            pastMarketGrid.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:40px; width:100%;">
                    Henüz sonuçlanmış bir lades bulunmuyor.
                </div>
            `;
        } else {
            pastMarkets.forEach(market => {
                pastMarketGrid.innerHTML += generateMarketCardHTML(market, false);
            });
        }
    }
}

function generateMarketCardHTML(market, isActive) {
    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalVolume = market.category === "Spor"
        ? (yesPool + noPool + drawPool)
        : (yesPool + noPool);

    let yesPercent = 50, noPercent = 50, drawPercent = 0;
    if (totalVolume > 0) {
        yesPercent = Math.round((yesPool / totalVolume) * 100);
        noPercent = Math.round((noPool / totalVolume) * 100);
        if (market.category === "Spor") {
            drawPercent = 100 - yesPercent - noPercent;
        } else {
            noPercent = 100 - yesPercent;
        }
    }

    const safeTitle = (market.title || "").replace(/'/g, "\\'");
    const isSpor = market.category === "Spor";
    const currentUserEmail = localStorage.getItem("currentUser");
    const isAdmin = currentUserEmail === "tsulhan@gmail.com";
    
    let actionContent = "";

    if (isActive) {
        const colsClass = isSpor ? "three-cols" : "two-cols";
        if (isSpor) {
            actionContent = `
                <div class="market-actions ${colsClass}">
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">EVET %${yesPercent}</button>
                    <button class="btn-bet btn-draw" onclick="openBetModal('${market.id}', '${safeTitle}', 'DRAW')">BERABERLİK %${drawPercent}</button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">HAYIR %${noPercent}</button>
                </div>
            `;
        } else {
            actionContent = `
                <div class="market-actions ${colsClass}">
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">EVET %${yesPercent}</button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">HAYIR %${noPercent}</button>
                </div>
            `;
        }
    } else {
        let winnerText = "BELİRSİZ";
        let winnerStyle = "width: 330px; margin-left: auto; flex-shrink: 0; text-align: center; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 0.5px;";

        if (yesPool > 0 && yesPool >= noPool && yesPool >= drawPool) {
            winnerText = `🏆 EVET KAZANDI (%${yesPercent})`;
            winnerStyle += " background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); box-shadow: 0 0 10px rgba(34, 197, 94, 0.1);";
        } else if (noPool > 0 && noPool >= yesPool && noPool >= drawPool) {
            winnerText = `🏆 HAYIR KAZANDI (%${noPercent})`;
            winnerStyle += " background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);";
        } else if (drawPool > 0 && drawPool >= yesPool && drawPool >= noPool) {
            winnerText = `🏆 BERABERLİK KAZANDI (%${drawPercent})`;
            winnerStyle += " background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); box-shadow: 0 0 10px rgba(245, 158, 11, 0.1);";
        } else {
            winnerText = "🔒 SONUÇLANDI (BERABERE DAĞITILDI)";
            winnerStyle += " background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3);";
        }

        actionContent = `
            <div style="${winnerStyle}">
                ${winnerText}
            </div>
        `;
    }

    let adminDeleteHTML = "";
    if (isAdmin) {
        if (isActive) {
            adminDeleteHTML = `
                <button onclick="deleteMarketCompletely('${market.id}', '${safeTitle}')" 
                        style="position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.15); 
                               border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; width: 28px; height: 28px; 
                               border-radius: 50%; cursor: pointer; display: flex; align-items: center; 
                               justify-content: center; font-size: 14px; transition: 0.3s; z-index: 10;
                               font-weight: 700;"
                        onmouseover="this.style.background='rgba(239, 68, 68, 0.4)'; this.style.color='white'; this.style.borderColor='#ef4444';"
                        onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444'; this.style.borderColor='rgba(239, 68, 68, 0.3)';"
                        title="Bu ladesi sil ve tokenları iade et">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } else {
            adminDeleteHTML = `
                <button onclick="deleteMarketFromHistory('${market.id}', '${safeTitle}')" 
                        style="position: absolute; top: 12px; right: 12px; background: rgba(148, 163, 184, 0.1); 
                               border: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8; width: 28px; height: 28px; 
                               border-radius: 50%; cursor: pointer; display: flex; align-items: center; 
                               justify-content: center; font-size: 14px; transition: 0.3s; z-index: 10;
                               font-weight: 700;"
                        onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'; this.style.color='#ef4444'; this.style.borderColor='rgba(239, 68, 68, 0.5)';"
                        onmouseout="this.style.background='rgba(148, 163, 184, 0.1)'; this.style.color='#94a3b8'; this.style.borderColor='rgba(148, 163, 184, 0.2)';"
                        title="Bu ladesi geçmişten sil">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        }
    }

    return `
        <div class="market-card" style="position: relative; ${!isActive ? 'opacity: 0.9; border-color: #1c2541; background: #060b19;' : ''}">
            ${adminDeleteHTML}
            <div class="market-info">
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                    <span class="category-badge">${market.category || "Genel"}</span>
                    ${!isActive ? `<span class="category-badge" style="background:rgba(36,255,255,0.05); color:#24ffff; border-color:rgba(36,255,255,0.2); text-transform:none;"><i class="fa-solid fa-lock"></i> Arşiv</span>` : ''}
                </div>
                <h3>${market.title || "Başlıksız Lades"}</h3>
                <p>Bitiş: ${market.date || "-"} • Toplam Hacim: <span style="color:#24ffff; font-weight:700;">${totalVolume.toLocaleString("tr-TR")}</span> Token</p>
            </div>
            ${actionContent}
        </div>
    `;
}

// ------------------------------------------------------
// ADMIN: LADESİ SİLME VE KULLANICI TOKENLARINI İADE ETME
// ------------------------------------------------------
async function deleteMarketCompletely(marketId, marketTitle) {
    if (typeof db === "undefined" || !db) {
        alert("❌ Firebase bağlantısı yok!");
        return;
    }

    const currentUserEmail = localStorage.getItem("currentUser");
    if (currentUserEmail !== "tsulhan@gmail.com") {
        alert("❌ Bu işlem sadece yönetici tarafından yapılabilir!");
        return;
    }

    const confirmation = confirm(
        `"${marketTitle}" isimli AKTİF ladesi silmek istediğinize emin misiniz?\n\n` +
        `⚠️ BU İŞLEM:\n` +
        `1- Ladesi tamamen kaldırır.\n` +
        `2- Bu ladese oynayan TÜM KULLANICILARIN tokenlarını hesaplarına İADE eder!\n` +
        `3- Tüm bahis geçmişini siler.\n\n` +
        `Bu işlem geri alınamaz!`
    );
    
    if (!confirmation) return;

    try {
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#0b132b; padding:20px 40px; border-radius:12px; border:1px solid #24ffff; color:#24ffff; font-weight:bold; z-index:9999;';
        loadingMsg.innerHTML = '⏳ Lades siliniyor ve tokenlar iade ediliyor...';
        document.body.appendChild(loadingMsg);

        const marketSnapshot = await db.ref(`customMarkets/${marketId}`).once("value");
        const marketData = marketSnapshot.val();
        
        if (!marketData) {
            alert("❌ Lades bulunamadı! Zaten silinmiş olabilir.");
            document.body.removeChild(loadingMsg);
            return;
        }

        const [betHistorySnapshot, usersSnapshot] = await Promise.all([
            db.ref("betHistory").once("value"),
            db.ref("ladesUsers").once("value")
        ]);

        const allHistories = betHistorySnapshot.val() || {};
        const allUsers = usersSnapshot.val() || {};

        const deletePromises = [];
        const userUpdates = { ...allUsers };
        let refundedTokenCount = 0;
        let affectedUsersCount = 0;

        Object.keys(allHistories).forEach(historyKey => {
            const bet = allHistories[historyKey];
            
            if (bet && bet.marketId === marketId) {
                const userEmail = bet.email;
                const betAmount = parseInt(bet.amount || 0);

                if (userEmail && betAmount > 0) {
                    const userCleanKey = userEmail.replace(/\./g, ',');
                    
                    if (userUpdates[userCleanKey]) {
                        const currentBalance = parseInt(userUpdates[userCleanKey].balance) || 0;
                        userUpdates[userCleanKey].balance = currentBalance + betAmount;
                        refundedTokenCount += betAmount;
                        affectedUsersCount++;
                    }
                }
                deletePromises.push(db.ref(`betHistory/${historyKey}`).remove());
            }
        });

        if (affectedUsersCount > 0) {
            await db.ref("ladesUsers").set(userUpdates);
        }

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }

        await db.ref(`customMarkets/${marketId}`).remove();

        document.body.removeChild(loadingMsg);

        alert(`✅ "${marketTitle}" başarıyla silindi!\n\n` +
              `👥 Etkilenen Kullanıcı: ${affectedUsersCount}\n` +
              `💰 İade Edilen Toplam Token: ${refundedTokenCount.toLocaleString("tr-TR")}`);
        
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error("❌ Lades silme ve iade hatası:", error);
        alert("❌ İşlem sırasında bir hata oluştu: " + error.message);
        
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
    }
}

// ------------------------------------------------------
// GEÇMİŞ LADESİ SİLME (SADECE ADMIN - TOKEN İADESİZ)
// ------------------------------------------------------
async function deleteMarketFromHistory(marketId, marketTitle) {
    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok!");
        return;
    }

    const currentUserEmail = localStorage.getItem("currentUser");
    if (currentUserEmail !== "tsulhan@gmail.com") {
        alert("❌ Bu işlem sadece yönetici tarafından yapılabilir!");
        return;
    }

    const confirmation = confirm(
        `"${marketTitle}" isimli GEÇMİŞ ladesi silmek istediğinize emin misiniz?\n\n` +
        `⚠️ BU İŞLEM:\n` +
        `1- Ladesi geçmişten tamamen kaldırır.\n` +
        `2- Bu ladese ait tüm bahis geçmişini siler.\n` +
        `3- Kullanıcıların tokenlarına DOKUNULMAZ (Zaten dağıtıldı).\n\n` +
        `Bu işlem geri alınamaz!`
    );
    
    if (!confirmation) return;

    try {
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#0b132b; padding:20px 40px; border-radius:12px; border:1px solid #94a3b8; color:#94a3b8; font-weight:bold; z-index:9999;';
        loadingMsg.innerHTML = '⏳ Geçmiş lades siliniyor...';
        document.body.appendChild(loadingMsg);

        await db.ref(`customMarkets/${marketId}`).remove();
        
        const betHistorySnapshot = await db.ref("betHistory").once("value");
        const allHistories = betHistorySnapshot.val() || {};
        
        const deletePromises = [];
        let deletedCount = 0;
        
        Object.keys(allHistories).forEach(historyKey => {
            const bet = allHistories[historyKey];
            if (bet && bet.marketId === marketId) {
                deletePromises.push(db.ref(`betHistory/${historyKey}`).remove());
                deletedCount++;
            }
        });

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }

        document.body.removeChild(loadingMsg);

        alert(`✅ "${marketTitle}" geçmişten başarıyla silindi!\n\n🗑️ ${deletedCount} adet bahis kaydı temizlendi.`);
        
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error("❌ Lades silme hatası:", error);
        alert("❌ Lades silinirken bir hata oluştu: " + error.message);
        
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
    }
}

function updateUI() { }

// ------------------------------------------------------
// TOKEN TALEBİ / LADES OLUŞTURMA / BAHİS
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
        
        const amount = prompt(
            `💰 MEVCUT BAKİYENİZ: ${currentBalance.toLocaleString("tr-TR")} Token\n\n` +
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
            amount: tokenAmount,
            currentBalance: currentBalance,
            status: "Bekliyor",
            createdAt: Date.now()
        });

        await sendNotificationToAdmins({
            title: "💰 Token Talebi!",
            message: `${currentUserEmail} kullanıcısı ${tokenAmount} Token talep ediyor!`,
            type: "token_request",
            link: "dashboard.html?tab=admin",
            data: { email: currentUserEmail, amount: tokenAmount }
        });

        alert(`✅ ${tokenAmount} Token talebiniz yöneticiye iletildi!\n\nYönetici onayladığında bakiyeniz güncellenecektir.`);
        
    } catch (error) {
        console.error("Token talebi hatası:", error);
        alert("❌ Talep gönderilirken bir hata oluştu: " + error.message);
    }
}

async function createNewMarket() {
    const title = document.getElementById("market-question")?.value.trim();
    const date = document.getElementById("market-date")?.value;
    const initialBet = parseInt(document.getElementById("market-initial-bet")?.value);
    const choice = document.getElementById("market-choice")?.value;
    const category = document.getElementById("market-category")?.value;

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

    const MIN_BET = 250;
    const MAX_BET = 1000;
    
    if (isNaN(initialBet) || initialBet < MIN_BET) {
        alert(`❌ Lades oluşturmak için minimum ${MIN_BET.toLocaleString("tr-TR")} Token yatırmanız gerekiyor!`);
        return;
    }

    if (initialBet > MAX_BET) {
        alert(`❌ Lades oluşturmak için maksimum ${MAX_BET.toLocaleString("tr-TR")} Token yatırabilirsiniz!`);
        return;
    }

    const userKey = currentUserEmail.replace(/\./g, ',');
    const currentUser = await fbGet(`ladesUsers/${userKey}`);

    if (!currentUser) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (!title || !date) {
        alert("Lütfen alanları doğru doldurun!");
        return;
    }

    if (category !== "Spor" && choice === "DRAW") {
        alert("Beraberlik seçeneği yalnızca Spor kategorisinde kullanılabilir.");
        return;
    }

    if (initialBet > (currentUser.balance || 0)) {
        alert(`❌ Yetersiz bakiye! Mevcut bakiyeniz: ${(currentUser.balance || 0).toLocaleString("tr-TR")} Token`);
        return;
    }

    currentUser.balance = parseInt(currentUser.balance) - initialBet;
    await fbSet(`ladesUsers/${userKey}`, currentUser);

    const marketId = uniqueId("market");

    const newMarket = {
        id: marketId,
        title,
        date,
        yesPool: choice === "YES" ? initialBet : 0,
        noPool: choice === "NO" ? initialBet : 0,
        drawPool: choice === "DRAW" ? initialBet : 0,
        category,
        status: "Aktif",
        createdBy: currentUserEmail,
        createdAt: Date.now()
    };

    await fbSet(`customMarkets/${marketId}`, newMarket);

    const historyKey = uniqueId("history");
    await fbSet(`betHistory/${historyKey}`, {
        id: historyKey,
        marketId,
        email: currentUserEmail,
        choice,
        amount: initialBet,
        createdAt: Date.now()
    });

    // ✅ YENİ: Lades yaratıcısının adını göster
    const creatorDisplay = maskUserEmail(currentUserEmail);

    await sendNotificationToAllUsers({
        title: "📢 Yeni Lades!",
        message: `${creatorDisplay}, "${title}" ladesini oluşturdu! Katılmak ister misin?`,
        type: "new_market",
        marketId: marketId,
        link: "dashboard.html?tab=mevcut-ladesler",
        data: { creator: currentUserEmail }
    });

    alert(`⚡ Lades Başarıyla Yaratıldı!\n\n💰 Yatırılan: ${initialBet.toLocaleString("tr-TR")} Token`);

    const questionInput = document.getElementById("market-question");
    const betInput = document.getElementById("market-initial-bet");

    if (questionInput) questionInput.value = "";
    if (betInput) betInput.value = "";

    if (typeof switchTab === "function") {
        switchTab("mevcut-ladesler");
    }
}
async function confirmBet() {
    const amount = parseInt(document.getElementById("bet-amount")?.value);
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

    if (isNaN(amount) || amount <= 0) {
        alert("Geçersiz miktar!");
        return;
    }

    const MIN_BET = 250;
    const MAX_BET = 1000;
    
    if (amount < MIN_BET) {
        alert(`❌ Minimum bahis miktarı ${MIN_BET.toLocaleString("tr-TR")} Token'dır!`);
        return;
    }

    if (amount > MAX_BET) {
        alert(`❌ Maksimum bahis miktarı ${MAX_BET.toLocaleString("tr-TR")} Token'dır!`);
        return;
    }

    const userKey = currentUserEmail.replace(/\./g, ',');
    const currentUser = await fbGet(`ladesUsers/${userKey}`);

    if (!currentUser) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (amount > (currentUser.balance || 0)) {
        alert(`❌ Yetersiz bakiye! Mevcut bakiyeniz: ${(currentUser.balance || 0).toLocaleString("tr-TR")} Token`);
        return;
    }

    const target = await fbGet(`customMarkets/${activeMarketId}`);
    if (!target) {
        alert("Lades bulunamadı!");
        return;
    }

    currentUser.balance = parseInt(currentUser.balance) - amount;
    await fbSet(`ladesUsers/${userKey}`, currentUser);

    if (activeChoice === "YES") {
        target.yesPool = (target.yesPool || 0) + amount;
    } else if (activeChoice === "NO") {
        target.noPool = (target.noPool || 0) + amount;
    } else if (activeChoice === "DRAW") {
        target.drawPool = (target.drawPool || 0) + amount;
    }

    await fbSet(`customMarkets/${activeMarketId}`, target);

    const historyKey = uniqueId("history");
    await fbSet(`betHistory/${historyKey}`, {
        id: historyKey,
        marketId: activeMarketId,
        email: currentUserEmail,
        choice: activeChoice,
        amount,
        createdAt: Date.now()
    });

    // ✅ YENİ: Bu ladese katılan diğer kullanıcılara bildirim gönder
    await sendBetNotificationToParticipants(activeMarketId, currentUserEmail, activeChoice, amount, target.title);

    alert(`✅ ${amount.toLocaleString("tr-TR")} Token başarıyla yatırıldı!`);
    closeModal();
}

// ------------------------------------------------------
// ADMIN PANEL İŞLEMLERİ
// ------------------------------------------------------
async function openAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "flex";
    await renderAdminPanel();
}

fn_closeAdminPanel = function() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "none";
}
if (typeof closeAdminPanel === "undefined") { window.closeAdminPanel = fn_closeAdminPanel; }

async function generateInviteCode() {
    if (typeof db === "undefined" || !db) return;
    try {
        const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeKey = uniqueId("code");
        await fbSet(`inviteCodes/${codeKey}`, newCode);
        alert(`✅ Yeni davet kodu oluşturuldu!\n\n🔑 ${newCode}`);
    } catch (error) {
        console.error("Kod üretme hatası:", error);
        alert("❌ Kod oluşturulurken bir hata oluştu.");
    }
}

async function finalizeLades(marketId, winningChoice) {
    if (typeof db === "undefined" || !db) return;

    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};
    const market = markets[marketId];

    if (!market) {
        alert("❌ Lades bulunamadı!");
        return;
    }

    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalPool = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);
    let winningPool = 0;
    let winningChoiceName = "";
    
    if (winningChoice === "YES") {
        winningPool = yesPool;
        winningChoiceName = "EVET";
    } else if (winningChoice === "NO") {
        winningPool = noPool;
        winningChoiceName = "HAYIR";
    } else if (winningChoice === "DRAW") {
        winningPool = drawPool;
        winningChoiceName = "BERABERLİK";
    }

    if (totalPool === 0 || winningPool === 0) {
        alert(`⚠️ ${winningChoiceName} havuzu boş veya toplam havuz 0. Lades kapatıldı ama dağıtım yapılmadı.`);
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        return;
    }

    const historySnap = await fbGet("betHistory");
    const history = historySnap || {};
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};

    const winners = Object.values(history).filter(h => h.marketId === marketId && h.choice === winningChoice);

    if (winners.length === 0) {
        alert(`⚠️ ${winningChoiceName} seçeneğine bahis yapan kimse yok. Lades kapatıldı.`);
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        return;
    }

    let totalDistributed = 0;
    const distributionResults = [];

    winners.forEach(winner => {
        const userEntry = Object.entries(users).find(([key, u]) => u.email === winner.email);
        if (!userEntry) return;

        const [userKey, userObj] = userEntry;
        const userShare = winner.amount / winningPool;
        let rewardAmount = Math.floor(userShare * totalPool);

        if (rewardAmount === 0) rewardAmount = 1;

        userObj.balance = (userObj.balance || 0) + rewardAmount;
        users[userKey] = userObj;
        totalDistributed += rewardAmount;

        distributionResults.push({
            email: winner.email,
            amount: winner.amount,
            reward: rewardAmount,
            share: (userShare * 100).toFixed(2) + '%'
        });
    });

    await fbSet("ladesUsers", users);
    market.status = "Sonuçlandı";
    await fbSet(`customMarkets/${marketId}`, market);

    // ✅ SONUÇ BİLDİRİMİ
    const allParticipants = Object.values(history).filter(h => h.marketId === marketId);
    
    const resultPromises = allParticipants.map(participant => {
        const isWinner = winners.some(w => w.email === participant.email);
        const winAmount = isWinner ? 
            distributionResults.find(r => r.email === participant.email)?.reward || 0 : 0;
        
        let title = isWinner ? "🎉 Kazandınız!" : "😔 Kaybettiniz";
        let message = isWinner ? 
            `${market.title} ladesinde ${winAmount.toLocaleString("tr-TR")} Token kazandınız! 🏆` :
            `${market.title} ladesinde ${participant.amount.toLocaleString("tr-TR")} Token kaybettiniz.`;

        return createNotification(participant.email, {
            title: title,
            message: message,
            type: "result",
            marketId: marketId,
            link: "profil.html",
            data: { isWinner, winAmount, lostAmount: participant.amount }
        });
    });
    await Promise.all(resultPromises);

    const remainingTokens = totalPool - totalDistributed;
    
    let distributionDetails = distributionResults.map(r => 
        `  • ${r.email}: ${r.amount} Token → ${r.reward} Token kazandı (${r.share})`
    ).join('\n');

    alert(`🎉 ${winningChoiceName} KAZANDI!\n\n` +
          `📊 Toplam Havuz: ${totalPool.toLocaleString("tr-TR")} Token\n` +
          `💰 Dağıtılan: ${totalDistributed.toLocaleString("tr-TR")} Token\n` +
          `📦 Kalan: ${remainingTokens.toLocaleString("tr-TR")} Token (küsürat)\n` +
          `👥 Kazanan Sayısı: ${winners.length}\n\n` +
          `📋 DAĞITIM DETAYLARI:\n${distributionDetails}\n\n` +
          `✅ Basit oransal dağıtım yapıldı!`);
}

// ------------------------------------------------------
// ADMIN PANELİ LİSTELEME MOTORU
// ------------------------------------------------------
async function renderAdminPanel() {
    if (typeof db === "undefined" || !db) return;

    fbRef("adminRequests").on("value", (snapshot) => {
        const requestsList = document.getElementById("admin-requests-list");
        if (!requestsList) return;
        
        requestsList.innerHTML = "";
        const requests = snapshot.val() || {};
        let hasPending = false;

        Object.entries(requests).forEach(([key, req]) => {
            if (req && req.status === "Bekliyor") {
                hasPending = true;
                const isToken = req.type === "token";
                const email = req.email || "Bilinmeyen";
                const amount = req.amount || 0;
                const currentBalance = req.currentBalance || 0;
                
                let actionButtons = "";
                let requestInfo = "";
                
                if (isToken) {
                    requestInfo = `
                        <span style="font-size:12px; color:#ff4aa2;">
                            💰 ${amount} Token talep ediyor 
                            (Mevcut: ${currentBalance.toLocaleString("tr-TR")} Token)
                        </span>
                    `;
                    actionButtons = `
                        <button onclick="approveToken('${req.id}', '${email}', ${amount})" 
                                style="background:#22c55e; color:black; border:none; padding:4px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:12px;">
                            ✅ Onayla
                        </button>
                    `;
                } else {
                    requestInfo = `
                        <span style="font-size:12px; color:#24ffff;">
                            ✉️ Davet kodu talep ediyor
                        </span>
                    `;
                    actionButtons = `
                        <button onclick="approveInvite('${req.id}', '${email}')" 
                                style="background:#22c55e; color:black; border:none; padding:4px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:12px;">
                            🔑 Kod Üret
                        </button>
                    `;
                }

                requestsList.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; 
                                background:#030814; padding:12px 15px; border-radius:8px; 
                                margin-bottom:8px; border-left: 3px solid ${isToken ? '#ff4aa2' : '#24ffff'};">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="font-size:13px; font-weight:600; color:white;">
                                ${email}
                            </span>
                            ${requestInfo}
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${actionButtons}
                            <button onclick="deleteRequest('${key}')" 
                                    style="background:#ef4444; color:white; border:none; padding:4px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:12px;">
                                ❌ Reddet
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        if (!hasPending) {
            requestsList.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:20px; font-size:13px;">
                    ✅ Bekleyen talep bulunmuyor.
                </div>
            `;
        }
    });

    fbRef("inviteCodes").on("value", (snapshot) => {
        const codesList = document.getElementById("admin-codes-list");
        if (!codesList) return;
        
        codesList.innerHTML = "";
        const codes = snapshot.val() || {};

        if (Object.keys(codes).length === 0) {
            codesList.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:10px; font-size:13px; width:100%;">
                    Henüz oluşturulmuş davet kodu yok.
                </div>
            `;
            return;
        }

        Object.entries(codes).forEach(([key, code]) => {
            codesList.innerHTML += `
                <div style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; 
                            padding:8px 14px; border-radius:8px; font-size:13px; 
                            color:#24ffff; display:inline-flex; align-items:center; gap:10px; margin:4px;">
                    <span style="font-family:monospace; font-weight:700;">${code}</span>
                    <i class="fa-solid fa-trash" onclick="deleteInviteCode('${key}')" 
                       style="cursor:pointer; color:#ef4444; font-size:14px;" 
                       title="Kodu Sil"></i>
                </div>
            `;
        });
    });

    fbRef("customMarkets").on("value", (snapshot) => {
        const adminActiveMarkets = document.getElementById("admin-active-markets");
        if (!adminActiveMarkets) return;

        adminActiveMarkets.innerHTML = "";
        const markets = snapshot.val() || {};
        const activeMarkets = Object.values(markets).filter(m => m && m.status === "Aktif");

        if (activeMarkets.length === 0) {
            adminActiveMarkets.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:15px; font-size:13px;">
                    Şu an aktif bir lades pazarı yok.
                </div>
            `;
        } else {
            activeMarkets.forEach(m => {
                const yesPool = m.yesPool || 0;
                const noPool = m.noPool || 0;
                const drawPool = m.drawPool || 0;
                const total = m.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);

                let buttons = `
                    <button onclick="finalizeLades('${m.id}', 'YES')" 
                            style="background:#22c55e; color:black; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                        EVET Kazandı
                    </button>
                    <button onclick="finalizeLades('${m.id}', 'NO')" 
                            style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                        HAYIR Kazandı
                    </button>
                `;

                if (m.category === "Spor") {
                    buttons = `
                        <button onclick="finalizeLades('${m.id}', 'YES')" 
                                style="background:#22c55e; color:black; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                            EVET
                        </button>
                        <button onclick="finalizeLades('${m.id}', 'DRAW')" 
                                style="background:#f59e0b; color:black; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                            BERABERLİK
                        </button>
                        <button onclick="finalizeLades('${m.id}', 'NO')" 
                                style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                            HAYIR
                        </button>
                    `;
                }

                adminActiveMarkets.innerHTML += `
                    <div style="background:#030814; padding:12px 15px; border-radius:8px; margin-bottom:8px; 
                                display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                        <div style="font-size:13px; min-width:200px;">
                            <b style="color:white;">${m.title}</b><br>
                            <span style="color:#64748b; font-size:12px;">
                                Havuz: ${total} Token (E: ${yesPool} / H: ${noPool}${m.category === 'Spor' ? ` / B: ${drawPool}` : ''})
                            </span>
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">${buttons}</div>
                    </div>
                `;
            });
        }
    });

    fbRef("ladesUsers").on("value", (snapshot) => {
        const usersTable = document.getElementById("admin-users-list");
        if (!usersTable) return;

        usersTable.innerHTML = "";
        const usersSnap = snapshot.val() || {};

        if (Object.keys(usersSnap).length === 0) {
            usersTable.innerHTML = `
                <tr><td colspan="4" style="text-align:center; color:#64748b; padding:15px;">Kayıtlı kullanıcı bulunmuyor.</td></tr>
            `;
            return;
        }

        Object.entries(usersSnap).forEach(([key, user]) => {
            if (!user) return;
            const isSelf = user.email === "tsulhan@gmail.com";
            const deleteButtonHTML = isSelf 
                ? `<span style="color:#64748b; font-size:11px; padding:4px 8px;">🔒 Korumalı</span>`
                : `<button onclick="deleteUserCompletely('${user.email}')" 
                          style="background:rgba(239, 68, 68, 0.15); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); 
                                 padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:600; 
                                 transition:0.2s;"
                          onmouseover="this.style.background='#ef4444'; this.style.color='white';" 
                          onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444';">
                    🗑️ Sil
                </button>`;

            usersTable.innerHTML += `
                <tr style="border-bottom:1px solid #1c2541;">
                    <td style="padding:8px 0; font-size:13px;">
                        ${user.email} ${user.isAdmin || user.email === "tsulhan@gmail.com" ? "👑" : ""}
                    </td>
                    <td style="padding:8px 0; font-size:13px; color:#ff4aa2; font-family:monospace;">
                        ${user.password || "1234"}
                    </td>
                    <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">
                        ${(user.balance || 0).toLocaleString("tr-TR")}
                    </td>
                    <td style="padding:8px 0; text-align:right;">
                        <button onclick="setTokensManual('${user.email}', ${user.balance || 0})" 
                                style="background:#ff4aa2; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">
                            ✏️ Bakiye Düzenle
                        </button>
                        ${deleteButtonHTML}
                    </td>
                </tr>
            `;
        });
    });
}

// ------------------------------------------------------
// ADMIN PANELİ YARDIMCI FONKSİYONLARI
// ------------------------------------------------------
async function deleteRequest(reqKey) {
    if (!confirm("Bu talebi silmek istediğinize emin misiniz?")) return;
    
    try {
        await fbRemove(`adminRequests/${reqKey}`);
        alert("✅ Talep başarıyla silindi.");
    } catch (error) {
        console.error("Talep silme hatası:", error);
        alert("❌ Talep silinirken bir hata oluştu.");
    }
}

async function approveInvite(reqId, email) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeKey = uniqueId("code");
        await fbSet(`inviteCodes/${codeKey}`, newCode);
        
        const requestsSnap = await fbGet("adminRequests");
        const requests = requestsSnap || {};
        const reqKey = Object.keys(requests).find(k => requests[k] && requests[k].id === reqId);
        if (reqKey) {
            await fbRemove(`adminRequests/${reqKey}`);
        }
        
        alert(`✅ ${email} için davet kodu oluşturuldu!\n\n🔑 Kod: ${newCode}\n\nBu kodu kullanıcıya iletebilirsiniz.`);
    } catch (error) {
        console.error("Kod oluşturma hatası:", error);
        alert("❌ Kod oluşturulurken bir hata oluştu.");
    }
}

async function approveToken(reqId, email, amount) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        const userEntry = Object.entries(users).find(([key, u]) => u && u.email === email);
        
        if (userEntry) {
            const [userKey, userObj] = userEntry;
            const oldBalance = userObj.balance || 0;
            const newBalance = oldBalance + amount;
            
            userObj.balance = newBalance;
            await fbSet(`ladesUsers/${userKey}`, userObj);
            
            const requestsSnap = await fbGet("adminRequests");
            const requests = requestsSnap || {};
            const reqKey = Object.keys(requests).find(k => requests[k] && requests[k].id === reqId);
            if (reqKey) {
                await fbRemove(`adminRequests/${reqKey}`);
            }
            
            alert(`✅ ${email} hesabına ${amount} Token başarıyla yüklendi!\n\nEski Bakiye: ${oldBalance.toLocaleString("tr-TR")}\nYeni Bakiye: ${newBalance.toLocaleString("tr-TR")}`);
        } else {
            alert("❌ Kullanıcı bulunamadı!");
        }
    } catch (error) {
        console.error("Token onay hatası:", error);
        alert("❌ Token onaylanırken bir hata oluştu: " + error.message);
    }
}

async function deleteInviteCode(codeKey) {
    if (!confirm("Bu davet kodunu silmek istediğinize emin misiniz?")) return;
    
    try {
        await fbRemove(`inviteCodes/${codeKey}`);
        alert("✅ Davet kodu başarıyla silindi.");
    } catch (error) {
        console.error("Kod silme hatası:", error);
        alert("❌ Kod silinirken bir hata oluştu.");
    }
}

async function deleteUserCompletely(email) {
    if (!email) return;

    const confirmation = confirm(`"${email}" kullanıcısını sistemden TAMAMEN silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve kullanıcının hesabı kalıcı olarak kapatılır!`);
    if (!confirmation) return;

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok!");
        return;
    }

    try {
        const userCleanKey = email.replace(/\./g, ',');
        await db.ref(`ladesUsers/${userCleanKey}`).remove();
        
        alert(`"${email}" kullanıcısı başarıyla her yerden silindi!`);
    } catch (error) {
        console.error("Kullanıcı silme hatası:", error);
        alert("Kullanıcı silinirken bir hata oluştu: " + error.message);
    }
}

async function setTokensManual(email, currentBalance) {
    const targetValueStr = prompt(`${email} kullanıcısının YENİ TOPLAM bakiyesi kaç token olsun?\n(Şu anki bakiye: ${currentBalance.toLocaleString("tr-TR")})`);
    
    if (targetValueStr === null) return; 
    
    const targetBalance = parseInt(targetValueStr);
    if (isNaN(targetBalance) || targetBalance < 0) {
        alert("Lütfen geçerli bir bakiye giriniz!");
        return;
    }
    
    if (typeof db === "undefined" || !db) return;

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntry = Object.entries(users).find(([key, u]) => u && u.email === email);

    if (userEntry) {
        const [userKey, userObj] = userEntry;
        userObj.balance = targetBalance; 
        await fbSet(`ladesUsers/${userKey}`, userObj);
        alert(`Başarılı! Bakiyesi ${targetBalance.toLocaleString("tr-TR")} Token olarak güncellendi.`);
    }
}

// ------------------------------------------------------
// MODAL FONKSİYONLARI
// ------------------------------------------------------
function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId;
    activeMarketTitle = marketTitle;
    activeChoice = choice;

    const titleEl = document.getElementById("modal-market-title");
    const choiceEl = document.getElementById("modal-bet-choice");
    const modalEl = document.getElementById("bet-modal");

    if (titleEl) titleEl.innerText = marketTitle;

    if (choiceEl) {
        if (choice === "YES") { choiceEl.innerText = "EVET"; choiceEl.style.color = "#22c55e"; }
        else if (choice === "NO") { choiceEl.innerText = "HAYIR"; choiceEl.style.color = "#ef4444"; }
        else if (choice === "DRAW") { choiceEl.innerText = "BERABERLİK"; choiceEl.style.color = "#f59e0b"; }
    }
    if (modalEl) modalEl.style.display = "flex";
}

// ------------------------------------------------------
// SAYFA YÜKLENİNCE BAŞLAT
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    if (typeof bootstrapFirebase === "function") {
        await bootstrapFirebase();
    }
    updateChoiceOptions();
    const categorySelect = document.getElementById("market-category");
    if (categorySelect) {
        categorySelect.addEventListener("change", updateChoiceOptions);
    }
    startRealtimeListeners();
});

// ------------------------------------------------------
// PROFİL SAYFASI ÖZEL MOTORU
// ------------------------------------------------------
async function initProfilePage() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) {
        window.location.href = "login.html";
        return;
    }

    const emailEl = document.getElementById("profile-email");
    if (emailEl) emailEl.innerText = currentUserEmail;

    if (typeof db === "undefined" || !db) return;

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        const user = snapshot.val();
        if (user) {
            const balEl = document.getElementById("profile-token-balance");
            if (balEl) balEl.innerText = (user.balance || 0).toLocaleString("tr-TR");
        }
    });

    try {
        const [marketsSnap, historySnap] = await Promise.all([
            fbGet("customMarkets"),
            fbGet("betHistory")
        ]);

        const markets = marketsSnap || {};
        const history = historySnap || {};

        renderProfileBets(currentUserEmail, markets, history);
    } catch (err) {
        console.error("Profil verileri yüklenirken hata oluştu:", err);
    }
}

function renderProfileBets(currentUserEmail, markets, history) {
    const activeContainer = document.getElementById("profile-active-bets");
    const pastContainer = document.getElementById("profile-past-bets");

    if (!activeContainer || !pastContainer) return;

    activeContainer.innerHTML = "";
    pastContainer.innerHTML = "";

    const allBets = Object.values(history)
        .filter(b => b && b.email === currentUserEmail)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    let activeCount = 0;
    let pastCount = 0;

    if (allBets.length === 0) {
        const noDataHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Henüz hiçbir ladese katılmadınız.</div>`;
        activeContainer.innerHTML = noDataHTML;
        pastContainer.innerHTML = noDataHTML;
        return;
    }

    allBets.forEach(bet => {
        const market = markets[bet.marketId];
        if (!market) return;

        const yesPool = market.yesPool || 0;
        const noPool = market.noPool || 0;
        const drawPool = market.drawPool || 0;
        const totalPool = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);

        let choiceBadge = "";
        if (bet.choice === "YES") choiceBadge = `<span class="badge-choice badge-yes">EVET YATIRDI</span>`;
        if (bet.choice === "NO") choiceBadge = `<span class="badge-choice badge-no">HAYIR YATIRDI</span>`;
        if (bet.choice === "DRAW") choiceBadge = `<span class="badge-choice badge-draw">BERABERLİK YATIRDI</span>`;

        if (market.status === "Aktif") {
            activeCount++;
            activeContainer.innerHTML += `
                <div class="user-bet-card">
                    <div class="bet-details">
                        <h3>${market.title}</h3>
                        <p>Kategori: <b>${market.category || "Genel"}</b> • Bitiş: ${market.date || "-"}</p>
                        <div style="margin-top: 8px;">${choiceBadge}</div>
                    </div>
                    <div class="bet-stats">
                        <div class="stat-box">
                            <div class="lbl">Sizin Yatırımınız</div>
                            <div class="val" style="color: #24ffff;">${(bet.amount || 0).toLocaleString("tr-TR")} Token</div>
                        </div>
                        <div class="stat-box" style="border-left: 1px solid #1c2541; padding-left: 20px;">
                            <div class="lbl">Toplam Havuz</div>
                            <div class="val" style="color: white;">${totalPool.toLocaleString("tr-TR")} Token</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            pastCount++;
            let resultHTML = "";
            let winningChoice = "";

            if (yesPool >= noPool && yesPool >= drawPool) winningChoice = "YES";
            else if (noPool >= yesPool && noPool >= drawPool) winningChoice = "NO";
            else if (drawPool >= yesPool && drawPool >= noPool) winningChoice = "DRAW";

            if (bet.choice === winningChoice) {
                const winningPool = winningChoice === "YES" ? yesPool : (winningChoice === "NO" ? noPool : drawPool);
                const winAmount = Math.round((bet.amount / winningPool) * totalPool);
                resultHTML = `<span class="result-win">+${winAmount.toLocaleString("tr-TR")} Token Kazandın 🏆</span>`;
            } else {
                resultHTML = `<span class="result-lose">-${bet.amount.toLocaleString("tr-TR")} Token Kaybedildi</span>`;
            }

            pastContainer.innerHTML += `
                <div class="user-bet-card" style="border-color: #161b2c; background: #060b19;">
                    <div class="bet-details">
                        <h3 style="color: #94a3b8;">${market.title}</h3>
                        <p>Kategori: ${market.category || "Genel"} • Durum: <span style="color:#ff4aa2; font-weight:600;">Sonuçlandı</span></p>
                        <div style="margin-top: 8px;">${choiceBadge}</div>
                    </div>
                    <div class="bet-stats">
                        <div class="stat-box">
                            <div class="lbl">Yatırdığınız</div>
                            <div class="val" style="color: #94a3b8;">${(bet.amount || 0).toLocaleString("tr-TR")} Token</div>
                        </div>
                        <div class="stat-box" style="border-left: 1px solid #1c2541; padding-left: 20px; min-width: 140px;">
                            <div class="lbl">Sonuç</div>
                            <div class="val">${resultHTML}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    if (activeCount === 0) {
        activeContainer.innerHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Şu an aktif ladesiniz bulunmuyor.</div>`;
    }
    if (pastCount === 0) {
        pastContainer.innerHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Henüz sonuçlanan lades geçmişiniz yok.</div>`;
    }
}

// ======================================================
// BİLDİRİM SİSTEMİ - TÜM FONKSİYONLAR
// ======================================================

// ------------------------------------------------------
// 1. BİLDİRİM OLUŞTURMA FONKSİYONLARI
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
// 2. BAHİS BİLDİRİMİ - Ladese katılan diğer kullanıcılara
// ------------------------------------------------------
async function sendBetNotificationToParticipants(marketId, bettorEmail, choice, amount, marketTitle) {
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
        const bettorDisplay = maskUserEmail(bettorEmail);

        const promises = uniqueParticipants.map(email => {
            return createNotification(email, {
                title: "💰 Yeni Bahis!",
                message: `${bettorDisplay}, "${marketTitle}" ladesinde ${choiceText} seçeneğine ${amount.toLocaleString("tr-TR")} Token yatırdı!`,
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
// 3. BİLDİRİM GÖSTERME FONKSİYONLARI
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

function startNotificationListener() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`notifications/${userKey}`).on("value", () => {
        updateNotificationBadge();
    });
}