// ======================================================
// LADES APP.JS
// Firebase Realtime Database + local session (currentUser)
// Ortak veriler Firebase'de tutulur:
// - ladesUsers
// - customMarkets
// - adminRequests
// - betHistory
// - inviteCodes
//
// Not:
// - currentUser oturumu şimdilik localStorage'da tutulur
// - aktif ladesler artık tüm kullanıcılar için ortak görünür
// ======================================================

// ------------------------------------------------------
// FIREBASE INITIALIZATION
// ------------------------------------------------------
// Eğer firebaseConfig ve firebase SDK'ları HTML'de zaten yüklüyse,
// bu bölüm doğrudan çalışır.
// Eğer yüklü değilse önce HTML'e Firebase scriptlerini eklemen gerekir.

if (typeof firebase === "undefined") {
    console.error("Firebase SDK yüklenmemiş. Önce Firebase scriptlerini eklemelisin.");
}

if (typeof firebaseConfig === "undefined") {
    console.error("firebaseConfig tanımlı değil. Firebase config bilgisini eklemelisin.");
}

if (typeof firebase !== "undefined" && typeof firebaseConfig !== "undefined") {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

const db = (typeof firebase !== "undefined" && firebase.database) ? firebase.database() : null;

// ------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ------------------------------------------------------
function fbRef(path) {
    return db.ref(path);
}

function fbGet(path) {
    return fbRef(path).once("value").then(snapshot => snapshot.val());
}

function fbSet(path, value) {
    return fbRef(path).set(value);
}

function fbUpdate(path, value) {
    return fbRef(path).update(value);
}

function safeParse(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined || raw === "") return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch (error) {
        console.warn(`localStorage parse hatası (${key}):`, error);
        return fallback;
    }
}

function safeSave(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function uniqueId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ------------------------------------------------------
// GLOBAL DURUM
// ------------------------------------------------------
let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";
let fbReady = false;

// ------------------------------------------------------
// BAŞLANGIÇ VERİLERİ (FIREBASE)
// ------------------------------------------------------
async function bootstrapFirebase() {
    if (!db) return;

    const usersSnap = await fbGet("ladesUsers");
    if (!usersSnap) {
        const defaultUsers = {
            "tsulhan@gmail.com": {
                email: "tsulhan@gmail.com",
                password: "1234",
                balance: 10000,
                isAdmin: true
            },
            "test@lades.com": {
                email: "test@lades.com",
                password: "1234",
                balance: 1000,
                isAdmin: false
            },
            "nehir@lades.com": {
                email: "nehir@lades.com",
                password: "1234",
                balance: 500,
                isAdmin: false
            }
        };
        await fbSet("ladesUsers", defaultUsers);
    }

    const inviteCodesSnap = await fbGet("inviteCodes");
    if (!inviteCodesSnap) {
        await fbSet("inviteCodes", {
            code1: "LADES2026",
            code2: "VIPUX"
        });
    }

    const requestsSnap = await fbGet("adminRequests");
    if (!requestsSnap) {
        await fbSet("adminRequests", {});
    }

    const marketsSnap = await fbGet("customMarkets");
    if (!marketsSnap) {
        await fbSet("customMarkets", {});
    }

    const historySnap = await fbGet("betHistory");
    if (!historySnap) {
        await fbSet("betHistory", {});
    }

    fbReady = true;
}

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

    if (!db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userList = Object.values(users);
    const user = userList.find(u => u.email === emailValue);

    if (user && user.password === passwordValue) {
        localStorage.setItem("currentUser", user.email);
        window.location.href = "dashboard.html";
    } else {
        alert("Hatalı e-posta veya şifre!");
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

    if (!db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const [inviteCodesSnap, usersSnap] = await Promise.all([
        fbGet("inviteCodes"),
        fbGet("ladesUsers")
    ]);

    const inviteCodes = inviteCodesSnap || {};
    const users = usersSnap || {};
    const inviteCodeList = Object.values(inviteCodes);
    const userList = Object.values(users);

    if (!inviteCodeList.includes(inviteCode)) {
        alert("Geçersiz Davet Kodu!");
        return;
    }

    if (userList.some(u => u.email === email)) {
        alert("Bu kullanıcı zaten mevcut!");
        return;
    }

    const newUserKey = uniqueId("user");
    await fbSet(`ladesUsers/${newUserKey}`, {
        email,
        password,
        balance: 0,
        isAdmin: false
    });

    const inviteKey = Object.keys(inviteCodes).find(k => inviteCodes[k] === inviteCode);
    if (inviteKey) {
        await fbRef(`inviteCodes/${inviteKey}`).remove();
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

    if (!db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};

    const existing = Object.values(requests).some(
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
// OPSİYON GÖRÜNÜRLÜĞÜ
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

// ------------------------------------------------------
// DASHBOARD / ARAYÜZ
// ------------------------------------------------------
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

    updateUI();
}

async function updateUI() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    if (!db) return;

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userList = Object.values(users);

    const user = userList.find(u => u.email === currentUserEmail) || {
        email: currentUserEmail,
        balance: 0,
        isAdmin: false
    };

    const userEmailBadge = document.getElementById("user-email-badge");
    if (userEmailBadge) userEmailBadge.innerText = user.email;

    const balanceElement = document.getElementById("token-balance");
    if (balanceElement) balanceElement.innerText = user.balance || 0;

    const tokenRequestArea = document.getElementById("token-request-area");
    if (tokenRequestArea) {
        tokenRequestArea.style.display = (user.balance === 0) ? "block" : "none";
    }

    const adminBtn = document.getElementById("admin-panel-btn");
    if (adminBtn) {
        adminBtn.style.display = user.isAdmin ? "block" : "none";
    }

    const marketGrid = document.getElementById("market-grid");
    if (!marketGrid) return;

    const marketsSnap = await fbGet("customMarkets");
    const marketsObj = marketsSnap || {};
    let markets = Object.values(marketsObj).filter(m => m && m.status === "Aktif");

    if (selectedCategoryFilter !== "Tümü") {
        markets = markets.filter(m => m.category === selectedCategoryFilter);
    }

    marketGrid.innerHTML = "";

    if (markets.length === 0) {
        marketGrid.innerHTML = `
            <div style="text-align:center; color:#64748b; padding:40px; width:100%;">
                Şu an bu kategoride aktif bir lades bulunmuyor. "Yarat" sekmesinden ilk ladesi sen başlatabilirsin!
            </div>
        `;
        return;
    }

    markets.forEach(market => {
        const yesPool = market.yesPool || 0;
        const noPool = market.noPool || 0;
        const drawPool = market.drawPool || 0;

        const totalVolume = market.category === "Spor"
            ? (yesPool + noPool + drawPool)
            : (yesPool + noPool);

        let yesPercent = 50;
        let noPercent = 50;
        let drawPercent = 0;

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

        let actionButtons = "";

        if (market.category === "Spor") {
            actionButtons = `
                <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">
                    EVET %${yesPercent}
                </button>
                <button class="btn-bet btn-draw" onclick="openBetModal('${market.id}', '${safeTitle}', 'DRAW')">
                    BERABERLİK %${drawPercent}
                </button>
                <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">
                    HAYIR %${noPercent}
                </button>
            `;
        } else {
            actionButtons = `
                <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">
                    EVET %${yesPercent}
                </button>
                <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">
                    HAYIR %${noPercent}
                </button>
            `;
        }

        marketGrid.innerHTML += `
            <div class="market-card">
                <div class="market-info">
                    <span class="category-badge">${market.category || "Genel"}</span>
                    <h3>${market.title || "Başlıksız Lades"}</h3>
                    <p>
                        Bitiş: ${market.date || "-"} • Hacim:
                        <span style="color:#24ffff; font-weight:700;">
                            ${totalVolume.toLocaleString("tr-TR")}
                        </span>
                        Token
                    </p>
                </div>
                <div class="market-actions ${market.category === "Spor" ? "three-cols" : "two-cols"}">
                    ${actionButtons}
                </div>
            </div>
        `;
    });
}

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

    if (!db) {
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

    if (!db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntries = Object.entries(users);
    const userKey = userEntries.find(([key, u]) => u.email === currentUserEmail)?.[0];

    if (!userKey) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    const currentUser = users[userKey];

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

    currentUser.balance -= initialBet;
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

    updateUI();
}

async function confirmBet() {
    const amount = parseInt(document.getElementById("bet-amount")?.value);
    const currentUserEmail = localStorage.getItem("currentUser");

    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = "login.html";
        return;
    }

    if (!db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        alert("Geçersiz miktar!");
        return;
    }

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntries = Object.entries(users);
    const userKey = userEntries.find(([key, u]) => u.email === currentUserEmail)?.[0];

    if (!userKey) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    const currentUser = users[userKey];

    if (amount > (currentUser.balance || 0)) {
        alert("Geçersiz miktar veya yetersiz bakiye!");
        return;
    }

    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};
    const target = markets[activeMarketId];

    if (!target) {
        alert("Lades bulunamadı!");
        return;
    }

    currentUser.balance -= amount;
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
    updateUI();
}

// ------------------------------------------------------
// ADMIN PANEL
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
    if (!db) return;

    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeKey = uniqueId("code");
    await fbSet(`inviteCodes/${codeKey}`, newCode);
    await renderAdminPanel();
}

async function finalizeLades(marketId, winningChoice) {
    if (!db) return;

    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};
    const market = markets[marketId];

    if (!market) return;

    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalPool = market.category === "Spor"
        ? (yesPool + noPool + drawPool)
        : (yesPool + noPool);

    let winningPool = 0;

    if (winningChoice === "YES") {
        winningPool = yesPool;
    } else if (winningChoice === "NO") {
        winningPool = noPool;
    } else if (winningChoice === "DRAW") {
        winningPool = drawPool;
    }

    if (totalPool === 0) {
        alert("Bu lades pazarında hiç token birikmemiş.");
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        await renderAdminPanel();
        updateUI();
        return;
    }

    if (winningPool === 0) {
        alert("Kazanan seçeneğe hiç bahis yapılmamış! Lades kapatıldı.");
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        await renderAdminPanel();
        updateUI();
        return;
    }

    const historySnap = await fbGet("betHistory");
    const history = historySnap || {};
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};

    const winners = Object.values(history).filter(
        h => h.marketId === marketId && h.choice === winningChoice
    );

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

    alert(
        `🎉 LADES Başarıyla Sonuçlandırıldı!\n` +
        `Kazanan Seçenek: ${winningChoice === "YES" ? "EVET" : winningChoice === "NO" ? "HAYIR" : "BERABERLİK"}\n` +
        `Toplam ${totalPool} Token dağıtıldı.`
    );

    await renderAdminPanel();
    updateUI();
}

async function renderAdminPanel() {
    if (!db) return;

    // 1) Bekleyen istekler
    const requestsList = document.getElementById("admin-requests-list");
    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};

    if (requestsList) {
        requestsList.innerHTML = "";

        const pendingRequests = Object.values(requests).filter(r => r.status === "Bekliyor");

        if (pendingRequests.length === 0) {
            requestsList.innerHTML = `<p style="color:#64748b; font-size:13px;">Bekleyen bir talep bulunmuyor.</p>`;
        } else {
            pendingRequests.forEach(req => {
                if (req.type === "invite") {
                    requestsList.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#030814; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;">
                            <span>✉️ <b>${req.email}</b> davet kodu istiyor.</span>
                            <button onclick="approveInvite('${req.id}', '${req.email}')"
                                style="background:#22c55e; color:black; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                                Onayla
                            </button>
                        </div>
                    `;
                } else if (req.type === "token") {
                    requestsList.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#030814; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;">
                            <span>💰 <b>${req.email}</b> -> ${req.amount} Token istiyor.</span>
                            <button onclick="approveToken('${req.id}', '${req.email}', ${req.amount})"
                                style="background:#22c55e; color:black; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">
                                Onayla
                            </button>
                        </div>
                    `;
                }
            });
        }
    }

    // 2) Aktif ladesler
    const adminActiveMarkets = document.getElementById("admin-active-markets");
    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};

    const activeMarkets = Object.values(markets).filter(m => m.status === "Aktif");

    if (adminActiveMarkets) {
        adminActiveMarkets.innerHTML = "";

        if (activeMarkets.length === 0) {
            adminActiveMarkets.innerHTML = `<p style="color:#64748b; font-size:13px;">Şu an sonuçlandırılacak aktif bir lades pazarı yok.</p>`;
        } else {
            activeMarkets.forEach(m => {
                const yesPool = m.yesPool || 0;
                const noPool = m.noPool || 0;
                const drawPool = m.drawPool || 0;

                const total = m.category === "Spor"
                    ? (yesPool + noPool + drawPool)
                    : (yesPool + noPool);

                let buttons = `
                    <button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                        EVET Kazandı
                    </button>
                    <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                        HAYIR Kazandı
                    </button>
                `;

                if (m.category === "Spor") {
                    buttons = `
                        <button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                            EVET Kazandı
                        </button>
                        <button onclick="finalizeLades('${m.id}', 'DRAW')" style="background:#f59e0b; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                            BERABERLİK
                        </button>
                        <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">
                            HAYIR Kazandı
                        </button>
                    `;
                }

                adminActiveMarkets.innerHTML += `
                    <div style="background:#030814; padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                        <div style="font-size:13px; max-width:60%;">
                            <b style="color:white;">${m.title}</b><br>
                            <span style="color:#64748b;">
                                Havuz: ${total} Token
                                (E: ${yesPool} / H: ${noPool}${m.category === 'Spor' ? ` / B: ${drawPool}` : ''})
                            </span>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            ${buttons}
                        </div>
                    </div>
                `;
            });
        }
    }

    // 3) Davet kodları
    const codesList = document.getElementById("admin-codes-list");
    const inviteCodesSnap = await fbGet("inviteCodes");
    const inviteCodes = inviteCodesSnap || {};

    if (codesList) {
        const codeValues = Object.values(inviteCodes);
        codesList.innerHTML = codeValues.map(c => `
            <span style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; padding:4px 8px; border-radius:6px; font-size:12px; color:#24ffff;">
                ${c}
            </span>
        `).join(" ");
    }

    // 4) Kullanıcı listesi
    const usersTable = document.getElementById("admin-users-list");
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};

    if (usersTable) {
        usersTable.innerHTML = "";

        Object.values(users).forEach(u => {
            usersTable.innerHTML += `
                <tr style="border-bottom:1px solid #1c2541;">
                    <td style="padding:8px 0; font-size:13px;">
                        ${u.email} ${u.isAdmin ? "👑" : ""}
                    </td>
                    <td style="padding:8px 0; font-size:13px; color:#ff4aa2; font-family:monospace;">
                        ${u.password || "1234"}
                    </td>
                    <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">
                        ${u.balance || 0}
                    </td>
                    <td style="padding:8px 0; text-align:right;">
                        <button onclick="addTokensManual('${u.email}')"
                            style="background:#ff4aa2; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">
                            + Token Yükle
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

async function approveInvite(reqId, email) {
    if (!db) return;

    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeKey = uniqueId("code");
    await fbSet(`inviteCodes/${codeKey}`, newCode);

    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};
    const reqKey = Object.keys(requests).find(k => requests[k].id === reqId);

    if (reqKey) {
        await fbRef(`adminRequests/${reqKey}`).remove();
    }

    alert(`Onaylandı! Kod: ${newCode}`);
    await renderAdminPanel();
}

async function approveToken(reqId, email, amount) {
    if (!db) return;

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

    if (reqKey) {
        await fbRef(`adminRequests/${reqKey}`).remove();
    }

    alert(`${email} hesabına ${amount} token yüklendi.`);
    await renderAdminPanel();
    updateUI();
}

async function addTokensManual(email) {
    const amt = prompt(`${email} için yüklenecek miktar:`);
    const amount = parseInt(amt);

    if (isNaN(amount) || amount <= 0) return;

    if (!db) return;

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
    updateUI();
}

async function hardResetDatabase() {
    if (confirm("Tüm yerel verileri sıfırlamak ve temiz veritabanı yüklemek istiyor musunuz?")) {
        localStorage.clear();

        if (db) {
            await fbSet("ladesUsers", {});
            await fbSet("inviteCodes", {});
            await fbSet("adminRequests", {});
            await fbSet("customMarkets", {});
            await fbSet("betHistory", {});
        }

        alert("Hafıza başarıyla temizlendi! Sayfa yeniden başlatılıyor.");
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
        if (choice === "YES") {
            choiceEl.innerText = "EVET";
            choiceEl.style.color = "#22c55e";
        } else if (choice === "NO") {
            choiceEl.innerText = "HAYIR";
            choiceEl.style.color = "#ef4444";
        } else if (choice === "DRAW") {
            choiceEl.innerText = "BERABERLİK";
            choiceEl.style.color = "#f59e0b";
        }
    }

    if (modalEl) modalEl.style.display = "flex";
}

function closeModal() {
    const modalEl = document.getElementById("bet-modal");
    const betAmount = document.getElementById("bet-amount");

    if (modalEl) modalEl.style.display = "none";
    if (betAmount) betAmount.value = "";
}

// ------------------------------------------------------
// DİĞER YARDIMCI FONKSİYONLAR
// ------------------------------------------------------
function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
    document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add("active");
    }

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add("active");
    }
}

// ------------------------------------------------------
// SAYFA YÜKLENİNCE BAŞLAT
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    await bootstrapFirebase();

    updateChoiceOptions();

    const categorySelect = document.getElementById("market-category");
    if (categorySelect) {
        categorySelect.addEventListener("change", updateChoiceOptions);
    }

    if (typeof updateUI === "function") {
        updateUI();
    }
});