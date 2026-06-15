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

    // Özel Admin Kolay Giriş Koruması
    if (emailValue === "tsulhan@gmail.com" && passwordValue === "1234") {
        localStorage.setItem("currentUser", "tsulhan@gmail.com");
        window.location.href = "dashboard.html";
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
        alert("Giriş işlemi sırasında teknik bir hata meydana geldi.");
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

    alert("Kayıt başarılı! Başlangıç bakiyeniz: 0 TOKEN Lütfen Yöneticiye Danışın");
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

    alert("Davet kodu talebi yöneticiye iletildi!");
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

            const balanceElement = document.getElementById("token-balance");
            if (balanceElement) balanceElement.innerText = (user.balance || 0).toLocaleString("tr-TR");

            const tokenRequestArea = document.getElementById("token-request-area");
            if (tokenRequestArea) {
                tokenRequestArea.style.display = (user.balance === 0) ? "block" : "none";
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
}

// ------------------------------------------------------
// LİDERLİK TABLOSU MOTORU (LEADERBOARD RENDER)
// ------------------------------------------------------
function renderLeaderboard(usersObj) {
    const leaderboardList = document.getElementById("leaderboard-list");
    if (!leaderboardList) return;

    const sortedUsers = Object.values(usersObj)
        .filter(u => u && u.email)
        .sort((a, b) => (b.balance || 0) - (a.balance || 0));

    if (sortedUsers.length === 0) {
        leaderboardList.innerHTML = `
            <div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">
                Henüz kayıtlı kullanıcı bulunamadı.
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
    if (currentUserEmail === "tsulhan@gmail.com") {
        adminDeleteHTML = `
            <button onclick="deleteMarketCompletely('${market.id}', '${safeTitle}')" 
                    style="position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.12); 
                           border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; width: 26px; height: 26px; 
                           border-radius: 50%; cursor: pointer; display: flex; align-items: center; 
                           justify-content: center; font-size: 11px; transition: 0.2s; z-index: 10;"
                    onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'; this.style.color='white';"
                    onmouseout="this.style.background='rgba(239, 68, 68, 0.12)'; this.style.color='#f87171';"
                    title="Bu Ladesi Sil ve Paraları İade Et">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
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
// ADMİN: LADESİ SİLME VE KULLANICI TOKENLARINI İADE ETME MOTORU
// ------------------------------------------------------
async function deleteMarketCompletely(marketId, marketTitle) {
    const confirmation = confirm(`"${marketTitle}" isimli ladesi silmek istediğinize emin misiniz?\n\n⚠️ BU İŞLEM: \n1- Ladesi tamamen kaldırır.\n2- Bu ladese oynayan TÜM KULLANICILARIN tokenlarını hesaplarına İADE eder!`);
    
    if (!confirmation) return;
    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok!");
        return;
    }

    try {
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
                        userUpdates[userCleanKey].balance = (parseInt(userUpdates[userCleanKey].balance) || 0) + betAmount;
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

        alert(`⚡ Lades başarıyla silindi!\n\nKatılım Sağlayan: ${affectedUsersCount} kullanıcı\nİade Edilen Toplam: ${refundedTokenCount.toLocaleString("tr-TR")} Token hesaplara geri yüklendi.`);
        
    } catch (error) {
        console.error("Lades silme ve iade hatası:", error);
        alert("İşlem sırasında bir hata oluştu: " + error.message);
    }
}

function updateUI() { }

// ------------------------------------------------------
// TOKEN TALEBİ / LADES OLUŞTURMA / BAHİS
// ------------------------------------------------------
async function openTokenRequestModal() {
    const amount = prompt("Kaç Token talep etmek istiyorsunuz?");
    const tokenAmount = parseInt(amount);

    if (isNaN(tokenAmount) || tokenAmount <= 0) {
        alert("Geçersiz miktar!");
        return;
    }

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

    const reqKey = uniqueId("req");
    await fbSet(`adminRequests/${reqKey}`, {
        id: reqKey,
        type: "token",
        email: currentUserEmail,
        amount: tokenAmount,
        status: "Bekliyor",
        createdAt: Date.now()
    });

    alert("Token talebiniz onay bekliyor.");
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

    const userKey = currentUserEmail.replace(/\./g, ',');
    const currentUser = await fbGet(`ladesUsers/${userKey}`);

    if (!currentUser) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen alanları doğru doldurun!");
        return;
    }

    if (category !== "Spor" && choice === "DRAW") {
        alert("Beraberlik seçeneği yalnızca Spor kategorisinde kullanılabilir.");
        return;
    }

    if (initialBet > (currentUser.balance || 0)) {
        alert("Yetersiz bakiye!");
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

    alert("⚡ Lades Başarıyla Yaratıldı!");

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

    const userKey = currentUserEmail.replace(/\./g, ',');
    const currentUser = await fbGet(`ladesUsers/${userKey}`);

    if (!currentUser) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (amount > (currentUser.balance || 0)) {
        alert("Yetersiz bakiye!");
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
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeKey = uniqueId("code");
    await fbSet(`inviteCodes/${codeKey}`, newCode);
    await renderAdminPanel();
}

async function finalizeLades(marketId, winningChoice) {
    if (typeof db === "undefined" || !db) return;

    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};
    const market = markets[marketId];

    if (!market) return;

    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalPool = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);
    let winningPool = winningChoice === "YES" ? yesPool : (winningChoice === "NO" ? noPool : drawPool);

    if (totalPool === 0 || winningPool === 0) {
        alert("Havuz boş veya kazanan seçeneğe bahis yapılmamış. Lades kapatıldı.");
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        await renderAdminPanel();
        return;
    }

    const historySnap = await fbGet("betHistory");
    const history = historySnap || {};
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};

    const winners = Object.values(history).filter(h => h.marketId === marketId && h.choice === winningChoice);

    winners.forEach(winner => {
        const userEntry = Object.entries(users).find(([key, u]) => u.email === winner.email);
        if (!userEntry) return;

        const [userKey, userObj] = userEntry;
        const userShareRatio = winner.amount / winningPool;
        const rewardAmount = Math.round(userShareRatio * totalPool);

        userObj.balance = (userObj.balance || 0) + rewardAmount;
        users[userKey] = userObj;
    });

    market.status = "Sonuçlandı";
    await fbSet(`customMarkets/${marketId}`, market);
    await fbSet("ladesUsers", users);

    alert(`🎉 Dağıtıldı! Toplam ${totalPool} Token kazananlara aktarıldı.`);
    await renderAdminPanel();
}

// ------------------------------------------------------
// ADMIN PANELİ LİSTELEME MOTORU (GÜNCEL KULLANICI SİLME DAHİL)
// ------------------------------------------------------
async function renderAdminPanel() {
    if (typeof db === "undefined" || !db) return;

    const requestsList = document.getElementById("admin-requests-list");
    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};

    if (requestsList) {
        requestsList.innerHTML = "";
        const pendingRequests = objectValuesToArray(requests).filter(r => r.status === "Bekliyor");

        if (pendingRequests.length === 0) {
            requestsList.innerHTML = `<p style="color:#64748b; font-size:13px;">Bekleyen bir talep bulunmuyor.</p>`;
        } else {
            pendingRequests.forEach(req => {
                if (req.type === "invite") {
                    requestsList.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#030814; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;">
                            <span>✉️ <b>${req.email}</b> davet kodu istiyor.</span>
                            <button onclick="approveInvite('${req.id}', '${req.email}')" style="background:#22c55e; color:black; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">Onayla</button>
                        </div>`;
                } else if (req.type === "token") {
                    requestsList.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#030814; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;">
                            <span>💰 <b>${req.email}</b> -> ${req.amount} Token istiyor.</span>
                            <button onclick="approveToken('${req.id}', '${req.email}', ${req.amount})" style="background:#22c55e; color:black; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">Onayla</button>
                        </div>`;
                }
            });
        }
    }

    const adminActiveMarkets = document.getElementById("admin-active-markets");
    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};
    const activeMarkets = objectValuesToArray(markets).filter(m => m.status === "Aktif");

    if (adminActiveMarkets) {
        adminActiveMarkets.innerHTML = "";
        if (activeMarkets.length === 0) {
            adminActiveMarkets.innerHTML = `<p style="color:#64748b; font-size:13px;">Şu an aktif bir lades pazarı yok.</p>`;
        } else {
            activeMarkets.forEach(m => {
                const yesPool = m.yesPool || 0;
                const noPool = m.noPool || 0;
                const drawPool = m.drawPool || 0;
                const total = m.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);

                let buttons = `
                    <button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">EVET Kazandı</button>
                    <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">HAYIR Kazandı</button>
                `;

                if (m.category === "Spor") {
                    buttons = `
                        <button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">EVET Kazandı</button>
                        <button onclick="finalizeLades('${m.id}', 'DRAW')" style="background:#f59e0b; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">BERABERLİK</button>
                        <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">HAYIR Kazandı</button>
                    `;
                }

                adminActiveMarkets.innerHTML += `
                    <div style="background:#030814; padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                        <div style="font-size:13px; max-width:60%;">
                            <b style="color:white;">${m.title}</b><br>
                            <span style="color:#64748b;">Havuz: ${total} Token (E: ${yesPool} / H: ${noPool}${m.category === 'Spor' ? ` / B: ${drawPool}` : ''})</span>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">${buttons}</div>
                    </div>`;
            });
        }
    }

    const codesList = document.getElementById("admin-codes-list");
    const inviteCodesSnap = await fbGet("inviteCodes");
    if (codesList && inviteCodesSnap) {
        codesList.innerHTML = objectValuesToArray(inviteCodesSnap).map(c => `
            <span style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; padding:4px 8px; border-radius:6px; font-size:12px; color:#24ffff;">${c}</span>
        `).join(" ");
    }

    const usersTable = document.getElementById("admin-users-list");
    const usersSnap = await fbGet("ladesUsers");
    if (usersTable && usersSnap) {
        usersTable.innerHTML = "";
        Object.values(usersSnap).forEach(u => {
            const isSelf = u.email === "tsulhan@gmail.com";
            const deleteButtonHTML = isSelf 
                ? `<span style="color:#64748b; font-size:11px; padding:4px 10px;">🔒 Korumalı</span>`
                : `<button onclick="deleteUserCompletely('${u.email}')" style="background:rgba(239, 68, 68, 0.15); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:600; margin-left:6px; transition:0.2s;" onmouseover="this.style.background='#ef4444'; this.style.color='white';" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444';">🗑️ Kullanıcıyı Sil</button>`;

            usersTable.innerHTML += `
                <tr style="border-bottom:1px solid #1c2541;">
                    <td style="padding:8px 0; font-size:13px;">${u.email} ${u.isAdmin || u.email === "tsulhan@gmail.com" ? "👑" : ""}</td>
                    <td style="padding:8px 0; font-size:13px; color:#ff4aa2; font-family:monospace;">${u.password || "1234"}</td>
                    <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">${(u.balance || 0).toLocaleString("tr-TR")}</td>
                    <td style="padding:8px 0; text-align:right;">
                        <button onclick="setTokensManual('${u.email}', ${u.balance || 0})" style="background:#ff4aa2; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">✏️ Düzenle</button>
                        ${deleteButtonHTML}
                    </td>
                </tr>`;
        });
    }
}

// ------------------------------------------------------
// KULLANICIYI VERİTABANINDAN KALICI OLARAK SİLME FONKSİYONU
// ------------------------------------------------------
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
        await renderAdminPanel();
    } catch (error) {
        console.error("Kullanıcı silme hatası:", error);
        alert("Kullanıcı silinirken bir hata oluştu: " + error.message);
    }
}

async function approveInvite(reqId, email) {
    if (typeof db === "undefined" || !db) return;
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeKey = uniqueId("code");
    await fbSet(`inviteCodes/${codeKey}`, newCode);

    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};
    const reqKey = Object.keys(requests).find(k => requests[k].id === reqId);
    if (reqKey) await fbRemove(`adminRequests/${reqKey}`);

    alert(`Onaylandı! Kod: ${newCode}`);
    await renderAdminPanel();
}

async function approveToken(reqId, email, amount) {
    if (typeof db === "undefined" || !db) return;
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntry = Object.entries(users).find(([key, u]) => u.email === email);

    if (userEntry) {
        const [userKey, userObj] = userEntry;
        userObj.balance = (userObj.balance || 0) + amount;
        await fbSet(`ladesUsers/${userKey}`, userObj);
    }

    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};
    const reqKey = Object.keys(requests).find(k => requests[k].id === reqId);
    if (reqKey) await fbRemove(`adminRequests/${reqKey}`);

    alert(`${email} hesabına ${amount} token yüklendi.`);
    await renderAdminPanel();
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
    const userEntry = Object.entries(users).find(([key, u]) => u.email === email);

    if (userEntry) {
        const [userKey, userObj] = userEntry;
        userObj.balance = targetBalance; 
        await fbSet(`ladesUsers/${userKey}`, userObj);
        alert(`Başarılı! Bakiyesi ${targetBalance.toLocaleString("tr-TR")} Token olarak güncellendi.`);
    }

    await renderAdminPanel();
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