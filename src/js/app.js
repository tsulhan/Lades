// ======================================================
// LADES APP.JS
// LocalStorage tabanlı demo / MVP sürümü
// Spor kategorisinde: EVET / BERABERLİK / HAYIR
// Diğer kategorilerde: EVET / HAYIR
// ======================================================

// ------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ------------------------------------------------------
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

// ------------------------------------------------------
// BAŞLANGIÇ VERİLERİ
// ------------------------------------------------------
if (!localStorage.getItem('ladesUsers')) {
    const defaultUsers = [
        { email: "tsulhan@gmail.com", password: "1234", balance: 10000, isAdmin: true },
        { email: "test@lades.com", password: "1234", balance: 1000, isAdmin: false },
        { email: "nehir@lades.com", password: "1234", balance: 500, isAdmin: false }
    ];
    safeSave('ladesUsers', defaultUsers);
}

if (!localStorage.getItem('inviteCodes')) {
    safeSave('inviteCodes', ["LADES2026", "VIPUX"]);
}

if (!localStorage.getItem('adminRequests')) {
    safeSave('adminRequests', []);
}

if (!localStorage.getItem('customMarkets')) {
    safeSave('customMarkets', []);
}

if (!localStorage.getItem('betHistory')) {
    safeSave('betHistory', []);
}

// ------------------------------------------------------
// ESKİ / BOZUK VERİLERİ DÜZELTME
// ------------------------------------------------------
(function repairLocalStorage() {
    let users = safeParse('ladesUsers', []);
    let changed = false;

    users.forEach(u => {
        if (!u.password) {
            u.password = "1234";
            changed = true;
        }
        if (typeof u.balance !== 'number') {
            u.balance = parseInt(u.balance || 0);
            changed = true;
        }
        if (typeof u.isAdmin !== 'boolean') {
            u.isAdmin = false;
            changed = true;
        }
    });

    if (changed) {
        safeSave('ladesUsers', users);
    }

    let markets = safeParse('customMarkets', []);
    let marketChanged = false;

    markets = markets.filter(m => m && m.id !== 'bitcoin' && m.id !== 'yagmur');

    markets.forEach(m => {
        if (!m.status) {
            m.status = "Aktif";
            marketChanged = true;
        }
        if (typeof m.yesPool !== 'number') {
            m.yesPool = parseInt(m.yesPool || 0);
            marketChanged = true;
        }
        if (typeof m.noPool !== 'number') {
            m.noPool = parseInt(m.noPool || 0);
            marketChanged = true;
        }
        if (typeof m.drawPool !== 'number') {
            m.drawPool = parseInt(m.drawPool || 0);
            marketChanged = true;
        }
        if (!m.category) {
            m.category = "Genel";
            marketChanged = true;
        }
    });

    if (marketChanged) {
        safeSave('customMarkets', markets);
    }

    let history = safeParse('betHistory', []);
    const oldLength = history.length;
    history = history.filter(h => h && h.marketId !== 'bitcoin' && h.marketId !== 'yagmur');

    if (history.length !== oldLength) {
        safeSave('betHistory', history);
    }
})();

// ------------------------------------------------------
// GLOBAL DURUM
// ------------------------------------------------------
let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";

// ------------------------------------------------------
// GİRİŞ / KAYIT / DAVET
// ------------------------------------------------------
function handleLogin() {
    const emailValue = document.getElementById('email')?.value.trim();
    const passwordValue = document.getElementById('password')?.value;

    if (!emailValue || !passwordValue) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    const users = safeParse('ladesUsers', []);
    const user = users.find(u => u.email === emailValue);

    if (user && user.password === passwordValue) {
        localStorage.setItem('currentUser', user.email);
        window.location.href = 'dashboard.html';
    } else {
        alert("Hatalı e-posta veya şifre!");
    }
}

function handleRegister() {
    const inviteCode = document.getElementById('reg-invite-code')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const passwordConfirm = document.getElementById('reg-password-confirm')?.value;

    if (!inviteCode || !email || !password || !passwordConfirm) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (password !== passwordConfirm) {
        alert("Şifreler birbiriyle uyuşmuyor!");
        return;
    }

    const validCodes = safeParse('inviteCodes', []);
    if (!validCodes.includes(inviteCode)) {
        alert("Geçersiz Davet Kodu!");
        return;
    }

    const users = safeParse('ladesUsers', []);
    if (users.some(u => u.email === email)) {
        alert("Bu kullanıcı zaten mevcut!");
        return;
    }

    users.push({
        email: email,
        password: password,
        balance: 0,
        isAdmin: false
    });

    safeSave('ladesUsers', users);

    const updatedCodes = validCodes.filter(c => c !== inviteCode);
    safeSave('inviteCodes', updatedCodes);

    alert("Kayıt başarılı! Başlangıç bakiyeniz: 0 TOKEN");
    window.location.href = 'login.html';
}

function requestInviteCode() {
    const email = document.getElementById('reg-email')?.value.trim();

    if (!email) {
        alert("Lütfen önce E-posta alanını doldurun!");
        return;
    }

    const requests = safeParse('adminRequests', []);
    const existing = requests.some(r => r.email === email && r.type === "invite" && r.status === "Bekliyor");

    if (existing) {
        alert("Zaten açık bir talebiniz var.");
        return;
    }

    requests.push({
        id: Date.now(),
        type: "invite",
        email: email,
        status: "Bekliyor"
    });

    safeSave('adminRequests', requests);
    alert("Davet kodu talebi yöneticiye iletildi!");
}

// ------------------------------------------------------
// OPSİYON GÖRÜNÜRLÜĞÜ
// ------------------------------------------------------
function updateChoiceOptions() {
    const categorySelect = document.getElementById('market-category');
    const choiceSelect = document.getElementById('market-choice');

    if (!categorySelect || !choiceSelect) return;

    const drawOption = choiceSelect.querySelector('option[value="DRAW"]');
    if (!drawOption) return;

    if (categorySelect.value === 'Spor') {
        drawOption.hidden = false;
        drawOption.disabled = false;
    } else {
        drawOption.hidden = true;
        drawOption.disabled = true;

        if (choiceSelect.value === 'DRAW') {
            choiceSelect.value = 'YES';
        }
    }
}

// ------------------------------------------------------
// DASHBOARD / ARAYÜZ
// ------------------------------------------------------
function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;

    const buttons = document.querySelectorAll('.sidebar-menu button');
    buttons.forEach(btn => btn.classList.remove('active'));

    buttons.forEach(btn => {
        const text = btn.innerText || "";
        if (categoryName === "Tümü" && text.includes("Tümü")) {
            btn.classList.add('active');
        } else if (text.includes(categoryName)) {
            btn.classList.add('active');
        }
    });

    updateUI();
}

function updateUI() {
    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) return;

    const users = safeParse('ladesUsers', []);
    const user = users.find(u => u.email === currentUserEmail) || {
        email: currentUserEmail,
        balance: 0,
        isAdmin: false
    };

    const userEmailBadge = document.getElementById('user-email-badge');
    if (userEmailBadge) {
        userEmailBadge.innerText = user.email;
    }

    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.innerText = user.balance;
    }

    const tokenRequestArea = document.getElementById('token-request-area');
    if (tokenRequestArea) {
        tokenRequestArea.style.display = (user.balance === 0) ? 'block' : 'none';
    }

    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) {
        adminBtn.style.display = user.isAdmin ? 'block' : 'none';
    }

    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return;

    let markets = safeParse('customMarkets', []);
    markets = markets.filter(m => m && m.status === "Aktif");

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

        const totalVolume = market.category === 'Spor'
            ? (yesPool + noPool + drawPool)
            : (yesPool + noPool);

        let yesPercent = 50;
        let noPercent = 50;
        let drawPercent = 0;

        if (totalVolume > 0) {
            yesPercent = Math.round((yesPool / totalVolume) * 100);
            noPercent = Math.round((noPool / totalVolume) * 100);

            if (market.category === 'Spor') {
                drawPercent = 100 - yesPercent - noPercent;
            } else {
                noPercent = 100 - yesPercent;
            }
        }

        const safeTitle = (market.title || "").replace(/'/g, "\\'");

        let actionButtons = "";

        if (market.category === 'Spor') {
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
                    <span class="category-badge">${market.category || 'Genel'}</span>
                    <h3>${market.title || 'Başlıksız Lades'}</h3>
                    <p>
                        Bitiş: ${market.date || '-'} • Hacim:
                        <span style="color:#24ffff; font-weight:700;">
                            ${totalVolume.toLocaleString('tr-TR')}
                        </span>
                        Token
                    </p>
                </div>
                <div class="market-actions ${market.category === 'Spor' ? 'three-cols' : 'two-cols'}">
                    ${actionButtons}
                </div>
            </div>
        `;
    });
}

function openTokenRequestModal() {
    const amount = prompt("Kaç Token talep etmek istiyorsunuz?");
    const tokenAmount = parseInt(amount);

    if (isNaN(tokenAmount) || tokenAmount <= 0) {
        alert("Geçersiz miktar!");
        return;
    }

    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = 'login.html';
        return;
    }

    const requests = safeParse('adminRequests', []);
    requests.push({
        id: Date.now(),
        type: "token",
        email: currentUserEmail,
        amount: tokenAmount,
        status: "Bekliyor"
    });

    safeSave('adminRequests', requests);
    alert("Token talebiniz onay bekliyor.");
}

function createNewMarket() {
    const title = document.getElementById('market-question')?.value.trim();
    const date = document.getElementById('market-date')?.value;
    const initialBet = parseInt(document.getElementById('market-initial-bet')?.value);
    const choice = document.getElementById('market-choice')?.value;
    const category = document.getElementById('market-category')?.value;

    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = 'login.html';
        return;
    }

    const users = safeParse('ladesUsers', []);
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (userIndex === -1) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen alanları doğru doldurun!");
        return;
    }

    if (category !== 'Spor' && choice === 'DRAW') {
        alert("Beraberlik seçeneği yalnızca Spor kategorisinde kullanılabilir.");
        return;
    }

    if (initialBet > users[userIndex].balance) {
        alert("Yetersiz bakiye!");
        return;
    }

    users[userIndex].balance -= initialBet;
    safeSave('ladesUsers', users);

    const marketId = 'custom_' + Date.now();

    const newMarket = {
        id: marketId,
        title: title,
        date: date,
        yesPool: choice === 'YES' ? initialBet : 0,
        noPool: choice === 'NO' ? initialBet : 0,
        drawPool: choice === 'DRAW' ? initialBet : 0,
        category: category,
        status: "Aktif"
    };

    const markets = safeParse('customMarkets', []);
    markets.push(newMarket);
    safeSave('customMarkets', markets);

    const history = safeParse('betHistory', []);
    history.push({
        marketId: marketId,
        email: currentUserEmail,
        choice: choice,
        amount: initialBet
    });
    safeSave('betHistory', history);

    alert("⚡ Lades Başarıyla Yaratıldı!");

    const questionInput = document.getElementById('market-question');
    const betInput = document.getElementById('market-initial-bet');

    if (questionInput) questionInput.value = "";
    if (betInput) betInput.value = "";

    if (typeof switchTab === 'function') {
        switchTab('mevcut-ladesler');
    }

    updateUI();
}

function confirmBet() {
    const amount = parseInt(document.getElementById('bet-amount')?.value);
    const currentUserEmail = localStorage.getItem('currentUser');

    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = 'login.html';
        return;
    }

    const users = safeParse('ladesUsers', []);
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (userIndex === -1) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (isNaN(amount) || amount <= 0 || amount > users[userIndex].balance) {
        alert("Geçersiz miktar veya yetersiz bakiye!");
        return;
    }

    users[userIndex].balance -= amount;
    safeSave('ladesUsers', users);

    const markets = safeParse('customMarkets', []);
    const target = markets.find(m => m.id === activeMarketId);

    if (target) {
        if (activeChoice === 'YES') {
            target.yesPool = (target.yesPool || 0) + amount;
        } else if (activeChoice === 'NO') {
            target.noPool = (target.noPool || 0) + amount;
        } else if (activeChoice === 'DRAW') {
            target.drawPool = (target.drawPool || 0) + amount;
        }
        safeSave('customMarkets', markets);
    }

    const history = safeParse('betHistory', []);
    const existingBet = history.find(
        h => h.marketId === activeMarketId &&
             h.email === currentUserEmail &&
             h.choice === activeChoice
    );

    if (existingBet) {
        existingBet.amount += amount;
    } else {
        history.push({
            marketId: activeMarketId,
            email: currentUserEmail,
            choice: activeChoice,
            amount: amount
        });
    }

    safeSave('betHistory', history);

    closeModal();
    updateUI();
}

// ------------------------------------------------------
// ADMIN PANEL
// ------------------------------------------------------
function openAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
    renderAdminPanel();
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function generateInviteCode() {
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codes = safeParse('inviteCodes', []);
    codes.push(newCode);
    safeSave('inviteCodes', codes);
    renderAdminPanel();
}

function finalizeLades(marketId, winningChoice) {
    const markets = safeParse('customMarkets', []);
    const market = markets.find(m => m.id === marketId);

    if (!market) return;

    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalPool = market.category === 'Spor'
        ? (yesPool + noPool + drawPool)
        : (yesPool + noPool);

    let winningPool = 0;

    if (winningChoice === 'YES') {
        winningPool = yesPool;
    } else if (winningChoice === 'NO') {
        winningPool = noPool;
    } else if (winningChoice === 'DRAW') {
        winningPool = drawPool;
    }

    if (totalPool === 0) {
        alert("Bu lades pazarında hiç token birikmemiş.");
        market.status = "Sonuçlandı";
        safeSave('customMarkets', markets);
        renderAdminPanel();
        updateUI();
        return;
    }

    if (winningPool === 0) {
        alert("Kazanan seçeneğe hiç bahis yapılmamış! Lades kapatıldı.");
        market.status = "Sonuçlandı";
        safeSave('customMarkets', markets);
        renderAdminPanel();
        updateUI();
        return;
    }

    const history = safeParse('betHistory', []);
    const users = safeParse('ladesUsers', []);

    const winners = history.filter(h => h.marketId === marketId && h.choice === winningChoice);

    winners.forEach(winner => {
        const userShareRatio = winner.amount / winningPool;
        const rewardAmount = Math.round(userShareRatio * totalPool);
        const userObj = users.find(u => u.email === winner.email);

        if (userObj) {
            userObj.balance += rewardAmount;
        }
    });

    market.status = "Sonuçlandı";
    safeSave('ladesUsers', users);
    safeSave('customMarkets', markets);

    alert(
        `🎉 LADES Başarıyla Sonuçlandırıldı!\n` +
        `Kazanan Seçenek: ${winningChoice === 'YES' ? 'EVET' : winningChoice === 'NO' ? 'HAYIR' : 'BERABERLİK'}\n` +
        `Toplam ${totalPool} Token dağıtıldı.`
    );

    renderAdminPanel();
    updateUI();
}

function renderAdminPanel() {
    const requestsList = document.getElementById('admin-requests-list');
    const requests = safeParse('adminRequests', []).filter(r => r.status === "Bekliyor");

    if (requestsList) {
        requestsList.innerHTML = "";

        if (requests.length === 0) {
            requestsList.innerHTML = `<p style="color:#64748b; font-size:13px;">Bekleyen bir talep bulunmuyor.</p>`;
        } else {
            requests.forEach(req => {
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

    const adminActiveMarkets = document.getElementById('admin-active-markets');
    const activeMarkets = safeParse('customMarkets', []).filter(m => m.status === "Aktif");

    if (adminActiveMarkets) {
        adminActiveMarkets.innerHTML = "";

        if (activeMarkets.length === 0) {
            adminActiveMarkets.innerHTML = `<p style="color:#64748b; font-size:13px;">Şu an sonuçlandırılacak aktif bir lades pazarı yok.</p>`;
        } else {
            activeMarkets.forEach(m => {
                const yesPool = m.yesPool || 0;
                const noPool = m.noPool || 0;
                const drawPool = m.drawPool || 0;

                const total = m.category === 'Spor'
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

                if (m.category === 'Spor') {
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

    const codesList = document.getElementById('admin-codes-list');
    const codes = safeParse('inviteCodes', []);

    if (codesList) {
        codesList.innerHTML = codes.map(c => `
            <span style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; padding:4px 8px; border-radius:6px; font-size:12px; color:#24ffff;">
                ${c}
            </span>
        `).join(" ");
    }

    const usersTable = document.getElementById('admin-users-list');
    const users = safeParse('ladesUsers', []);

    if (usersTable) {
        usersTable.innerHTML = "";

        users.forEach(u => {
            usersTable.innerHTML += `
                <tr style="border-bottom:1px solid #1c2541;">
                    <td style="padding:8px 0; font-size:13px;">
                        ${u.email} ${u.isAdmin ? '👑' : ''}
                    </td>
                    <td style="padding:8px 0; font-size:13px; color:#ff4aa2; font-family:monospace;">
                        ${u.password || '1234'}
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

function approveInvite(reqId, email) {
    const code = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codes = safeParse('inviteCodes', []);
    codes.push(code);
    safeSave('inviteCodes', codes);

    let requests = safeParse('adminRequests', []);
    requests = requests.filter(r => r.id != reqId);
    safeSave('adminRequests', requests);

    alert(`Onaylandı! Kod: ${code}`);
    renderAdminPanel();
}

function approveToken(reqId, email, amount) {
    const users = safeParse('ladesUsers', []);
    const idx = users.findIndex(u => u.email === email);

    if (idx !== -1) {
        users[idx].balance += amount;
        safeSave('ladesUsers', users);
    }

    let requests = safeParse('adminRequests', []);
    requests = requests.filter(r => r.id != reqId);
    safeSave('adminRequests', requests);

    alert(`${email} hesabına ${amount} token yüklendi.`);
    renderAdminPanel();
    updateUI();
}

function addTokensManual(email) {
    const amt = prompt(`${email} için yüklenecek miktar:`);
    const amount = parseInt(amt);

    if (isNaN(amount) || amount <= 0) return;

    const users = safeParse('ladesUsers', []);
    const idx = users.findIndex(u => u.email === email);

    if (idx !== -1) {
        users[idx].balance += amount;
        safeSave('ladesUsers', users);
    }

    alert("Yüklendi!");
    renderAdminPanel();
    updateUI();
}

function hardResetDatabase() {
    if (confirm("Tüm yerel verileri sıfırlamak ve temiz veritabanı yüklemek istiyor musunuz?")) {
        localStorage.clear();
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

    const titleEl = document.getElementById('modal-market-title');
    const choiceEl = document.getElementById('modal-bet-choice');
    const modalEl = document.getElementById('bet-modal');

    if (titleEl) titleEl.innerText = marketTitle;

    if (choiceEl) {
        if (choice === 'YES') {
            choiceEl.innerText = 'EVET';
            choiceEl.style.color = '#22c55e';
        } else if (choice === 'NO') {
            choiceEl.innerText = 'HAYIR';
            choiceEl.style.color = '#ef4444';
        } else if (choice === 'DRAW') {
            choiceEl.innerText = 'BERABERLİK';
            choiceEl.style.color = '#f59e0b';
        }
    }

    if (modalEl) modalEl.style.display = 'flex';
}

function closeModal() {
    const modalEl = document.getElementById('bet-modal');
    const betAmount = document.getElementById('bet-amount');

    if (modalEl) modalEl.style.display = 'none';
    if (betAmount) betAmount.value = "";
}

// ------------------------------------------------------
// DİĞER YARDIMCI FONKSİYONLAR
// ------------------------------------------------------
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// ------------------------------------------------------
// SAYFA YÜKLENİNCE UI BAŞLAT
// ------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    updateChoiceOptions();

    const categorySelect = document.getElementById('market-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', updateChoiceOptions);
    }

    if (typeof updateUI === "function") {
        updateUI();
    }
});