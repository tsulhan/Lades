// ======================================================
// LADES APP.JS - SADECE İŞ MANTIĞI (TEMİZLENMİŞ SÜRÜM)
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
        // Eğer core.js yüklenemediyse veya fbGet tanımlı değilse kullanıcıyı uyaralım
        if (typeof fbGet !== "function") {
            alert("Sistem altyapısı (core.js) yüklenemedi. Lütfen login.html dosyasında core.js scriptinin eklendiğini kontrol edin.");
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
        alert("Giriş işlemi sırasında teknik bir hata meydana geldi. Konsol (F12) kayıtlarını inceleyebilirsiniz.");
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

    alert("Kayıt başarılı! Başlangıç bakiyeniz: 0 TOKEN");
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
// KATEGORİ / OPSİYON
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

    return `
        <div class="market-card" style="${!isActive ? 'opacity: 0.9; border-color: #1c2541; background: #060b19;' : ''}">
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

function updateUI() { /* core.js dinleyicileri devraldı */ }

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

function closeAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "none";
}

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

    alert(`🎉 Dağıtıldı! Toplam ${totalPool} Token kazananlara aktarıldığı.`);
    await renderAdminPanel();
}

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
            usersTable.innerHTML += `
                <tr style="border-bottom:1px solid #1c2541;">
                    <td style="padding:8px 0; font-size:13px;">${u.email} ${u.isAdmin || u.email === "tsulhan@gmail.com" ? "👑" : ""}</td>
                    <td style="padding:8px 0; font-size:13px; color:#ff4aa2; font-family:monospace;">${u.password || "1234"}</td>
                    <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">${(u.balance || 0).toLocaleString("tr-TR")}</td>
                    <td style="padding:8px 0; text-align:right;">
                        <button onclick="addTokensManual('${u.email}')" style="background:#ff4aa2; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">+ Token Yükle</button>
                    </td>
                </tr>`;
        });
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

async function addTokensManual(email) {
    const amt = prompt(`${email} için yüklenecek miktar:`);
    const amount = parseInt(amt);
    if (isNaN(amount) || amount <= 0) return;
    if (typeof db === "undefined" || !db) return;

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntry = Object.entries(users).find(([key, u]) => u.email === email);

    if (userEntry) {
        const [userKey, userObj] = userEntry;
        userObj.balance = (userObj.balance || 0) + amount;
        await fbSet(`ladesUsers/${userKey}`, userObj);
    }

    alert("Yüklendi!");
    await renderAdminPanel();
}

async function hardResetDatabase() {
    if (confirm("Tüm verileri sıfırlamak istiyor musunuz?")) {
        localStorage.clear();
        if (typeof db !== "undefined" && db) {
            await fbSet("ladesUsers", {});
            await fbSet("inviteCodes", {});
            await fbSet("adminRequests", {});
            await fbSet("customMarkets", {});
            await fbSet("betHistory", {});
        }
        alert("Veritabanı sıfırlandı!");
        window.location.reload();
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
    // bootstrapFirebase() artık sadece core.js'ten çağrılıyor
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