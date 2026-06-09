// --- VERİ TABANI SİMÜLASYONU (LocalStorage) ---

// Kullanıcılar Listesi
if (!localStorage.getItem('ladesUsers')) {
    const defaultUsers = [
        { email: "tsulhan@gmail.com", balance: 10000, isAdmin: true },
        { email: "test@lades.com", balance: 1000, isAdmin: false },
        { email: "nehir@lades.com", balance: 500, isAdmin: false }
    ];
    localStorage.setItem('ladesUsers', JSON.stringify(defaultUsers));
}

// Aktif Giriş Yapan Kullanıcı Takibi
if (!localStorage.getItem('currentUser')) {
    localStorage.setItem('currentUser', "tsulhan@gmail.com");
}

// Geçerli Üretilmiş Davet Kodları
if (!localStorage.getItem('inviteCodes')) {
    localStorage.setItem('inviteCodes', JSON.stringify(["LADES2026", "VIPUX"]));
}

// Yönetici Bildirimleri ve İstekleri
if (!localStorage.getItem('adminRequests')) {
    localStorage.setItem('adminRequests', JSON.stringify([]));
}

// Sabit/Başlangıç Pazarları (status: "Aktif" veya "Sonuçlandı")
if (!localStorage.getItem('customMarkets')) {
    const defaultMarkets = [
        { id: 'bitcoin', title: "Bitcoin bu ay 100.000$'ı geçer mi?", date: "2026-06-30", yesPool: 2000, noPool: 8000, category: "Ekonomi", status: "Aktif" },
        { id: 'yagmur', title: "Yarın İstanbul'da yağmur yağar mı?", date: "2026-06-10", yesPool: 1000, noPool: 1000, category: "Eğlence", status: "Aktif" }
    ];
    localStorage.setItem('customMarkets', JSON.stringify(defaultMarkets));
}

// HİSSE/BAHİS TAKİP SİSTEMİ (Kimin hangi lades'e ne kadar yatırdığını tutar)
if (!localStorage.getItem('betHistory')) {
    const defaultHistory = [
        { marketId: 'bitcoin', email: 'tsulhan@gmail.com', choice: 'YES', amount: 1500 },
        { marketId: 'bitcoin', email: 'test@lades.com', choice: 'YES', amount: 500 },
        { marketId: 'bitcoin', email: 'nehir@lades.com', choice: 'NO', amount: 8000 }
    ];
    localStorage.setItem('betHistory', JSON.stringify(defaultHistory));
}

// Global Durum Değişkenleri
let activeMarketId = ""; 
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";

// --- GİRİŞ, KAYIT VE DAVET SİSTEMLERİ ---
function handleLogin() {
    const emailValue = document.getElementById('email').value.trim();
    const passwordValue = document.getElementById('password').value;
    if (emailValue === "" || passwordValue === "") { alert("Lütfen tüm alanları doldurun!"); return; }
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const user = users.find(u => u.email === emailValue);
    if (user && passwordValue === "1234") { localStorage.setItem('currentUser', user.email); window.location.href = 'dashboard.html'; } 
    else { alert("Hatalı e-posta veya şifre!"); }
}

function handleRegister() {
    const inviteCode = document.getElementById('reg-invite-code').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (!inviteCode || !email || !password || !passwordConfirm) { alert("Lütfen tüm alanları doldurun!"); return; }
    if (password !== passwordConfirm) { alert("Şifreler birbiriyle uyuşmuyor!"); return; }

    const validCodes = JSON.parse(localStorage.getItem('inviteCodes'));
    if (!validCodes.includes(inviteCode)) { alert("Geçersiz Davet Kodu!"); return; }

    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    if (users.some(u => u.email === email)) { alert("Bu kullanıcı zaten mevcut!"); return; }

    users.push({ email: email, balance: 0, isAdmin: false });
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    const updatedCodes = validCodes.filter(c => c !== inviteCode);
    localStorage.setItem('inviteCodes', JSON.stringify(updatedCodes));

    alert("Kayıt başarılı! Başlangıç bakiyeniz: 0 TOKEN");
    window.location.href = 'login.html';
}

function requestInviteCode() {
    const email = document.getElementById('reg-email').value.trim();
    if (!email) { alert("Lütfen önce E-posta alanını doldurun!"); return; }
    const requests = JSON.parse(localStorage.getItem('adminRequests'));
    if (requests.some(r => r.email === email && r.type === "invite")) { alert("Zaten açık bir talebiniz var."); return; }
    requests.push({ id: Date.now(), type: "invite", email: email, status: "Bekliyor" });
    localStorage.setItem('adminRequests', JSON.stringify(requests));
    alert("Davet kodu talebi yöneticiye iletildi!");
}

// --- DASHBOARD VE ARAYÜZ YÖNETİMİ ---
function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;
    document.querySelectorAll('.sidebar-menu button').forEach(btn => {
        if (btn.innerText.includes(categoryName)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    updateUI();
}

function updateUI() {
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const user = users.find(u => u.email === currentUserEmail) || { email: currentUserEmail, balance: 0, isAdmin: false };

    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) balanceElement.innerText = user.balance;

    const tokenRequestArea = document.getElementById('token-request-area');
    if (tokenRequestArea) tokenRequestArea.style.display = (user.balance === 0) ? 'block' : 'none';

    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.style.display = user.isAdmin ? 'block' : 'none';

    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return;

    // Sadece "Aktif" olan Ladesleri listele
    let markets = JSON.parse(localStorage.getItem('customMarkets')).filter(m => m.status === "Aktif");
    if (selectedCategoryFilter !== "Tümü") {
        markets = markets.filter(m => m.category === selectedCategoryFilter);
    }

    marketGrid.innerHTML = "";
    if (markets.length === 0) {
        marketGrid.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px; width:100%;">Bu kategoride aktif bir lades bulunmuyor.</div>`;
        return;
    }

    markets.forEach(market => {
        const totalVolume = market.yesPool + market.noPool;
        let yesPercent = 50, noPercent = 50;
        if (totalVolume > 0) {
            yesPercent = Math.round((market.yesPool / totalVolume) * 100);
            noPercent = 100 - yesPercent;
        }

        marketGrid.innerHTML += `
            <div class="market-card">
                <div class="market-info">
                    <span class="category-badge">${market.category || 'Genel'}</span>
                    <h3>${market.title}</h3>
                    <p>Bitiş: ${market.date} • Hacim: <span style="color:#24ffff; font-weight:700;">${totalVolume.toLocaleString('tr-TR')}</span> Token</p>
                </div>
                <div class="market-actions">
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'YES')">EVET %${yesPercent}</button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'NO')">HAYIR %${noPercent}</button>
                </div>
            </div>`;
    });
}

function openTokenRequestModal() {
    const amount = prompt("Kaç Token talep etmek istiyorsunuz?");
    const tokenAmount = parseInt(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) { alert("Geçersiz miktar!"); return; }
    const currentUserEmail = localStorage.getItem('currentUser');
    const requests = JSON.parse(localStorage.getItem('adminRequests'));
    requests.push({ id: Date.now(), type: "token", email: currentUserEmail, amount: tokenAmount, status: "Bekliyor" });
    localStorage.setItem('adminRequests', JSON.stringify(requests));
    alert(`Token talebiniz onay bekliyor.`);
}

// LADES YARAT fonksiyonu
function createNewMarket() {
    const title = document.getElementById('market-question').value.trim();
    const date = document.getElementById('market-date').value;
    const initialBet = parseInt(document.getElementById('market-initial-bet').value);
    const choice = document.getElementById('market-choice').value;
    const category = document.getElementById('market-category').value;
    
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) { alert("Lütfen alanları doğru doldurun!"); return; }
    if (initialBet > users[userIndex].balance) { alert("Yetersiz bakiye!"); return; }

    // Bakiyeden düş
    users[userIndex].balance -= initialBet;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    const marketId = 'custom_' + Date.now();
    const newMarket = {
        id: marketId,
        title: title,
        date: date,
        yesPool: choice === 'YES' ? initialBet : 0,
        noPool: choice === 'NO' ? initialBet : 0,
        category: category,
        status: "Aktif" // Yeni eklenen lades aktif başlar
    };

    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    markets.push(newMarket);
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    // İlk bahsi geçmişe de kaydet (Böylece hissesi oluşur)
    const history = JSON.parse(localStorage.getItem('betHistory')) || [];
    history.push({ marketId: marketId, email: currentUserEmail, choice: choice, amount: initialBet });
    localStorage.setItem('betHistory', JSON.stringify(history));

    alert(`⚡ Lades Başarıyla Yaratıldı!`);
    document.getElementById('market-question').value = "";
    document.getElementById('market-initial-bet').value = "";
    switchTab('mevcut-ladesler');
    updateUI();
}

// Mevcut Lades'e Sonradan Katılma / Bahis Yapma
function confirmBet() {
    const amount = parseInt(document.getElementById('bet-amount').value);
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (isNaN(amount) || amount <= 0 || amount > users[userIndex].balance) {
        alert("Geçersiz miktar veya yetersiz bakiye!");
        return;
    }

    // Bakiyeyi düş ve kaydet
    users[userIndex].balance -= amount;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    // Havuzu güncelle
    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    const target = markets.find(m => m.id === activeMarketId);
    if (target) {
        if (activeChoice === 'YES') target.yesPool += amount;
        else target.noPool += amount;
    }
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    // Hisse geçmişine ekle (Eğer daha önce bu ladese aynı seçeneği yatırdıysa üstüne ekle, yoksa yeni kayıt aç)
    const history = JSON.parse(localStorage.getItem('betHistory')) || [];
    const existingBet = history.find(h => h.marketId === activeMarketId && h.email === currentUserEmail && h.choice === activeChoice);
    if (existingBet) {
        existingBet.amount += amount;
    } else {
        history.push({ marketId: activeMarketId, email: currentUserEmail, choice: activeChoice, amount: amount });
    }
    localStorage.setItem('betHistory', JSON.stringify(history));

    closeModal();
    updateUI();
}

// --- YÖNETİCİ PANELİ KONTROLLERİ VE HAVUZ DAĞITIM ALGORİTMASI ---

function openAdminPanel() {
    document.getElementById('admin-modal').style.display = 'flex';
    renderAdminPanel();
}
function closeAdminPanel() { document.getElementById('admin-modal').style.display = 'none'; }
function generateInviteCode() {
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codes = JSON.parse(localStorage.getItem('inviteCodes'));
    codes.push(newCode); localStorage.setItem('inviteCodes', JSON.stringify(codes));
    renderAdminPanel();
}

// KAZANANLARA TOKEN DAĞITIM ALGORİTMASI (EN KRİTİK KISIM)
function finalizeLades(marketId, winningChoice) {
    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    const market = markets.find(m => m.id === marketId);
    
    if (!market) return;

    const totalPool = market.yesPool + market.noPool;
    const winningPool = (winningChoice === 'YES') ? market.yesPool : market.noPool;

    if (totalPool === 0) {
        alert("Bu lades pazarında hiç token birikmemiş.");
        market.status = "Sonuçlandı";
        localStorage.setItem('customMarkets', JSON.stringify(markets));
        renderAdminPanel();
        updateUI();
        return;
    }

    // Eğer kazanan tarafta hiç kimse yoksa tokenlar sistemde kalmasın diye iade mantığı veya uyarı:
    if (winningPool === 0) {
        alert("Kazanan seçeneğe hiç bahis yapılmamış! Lades kapatıldı, tokenlar kasada kaldı.");
        market.status = "Sonuçlandı";
        localStorage.setItem('customMarkets', JSON.stringify(markets));
        renderAdminPanel();
        updateUI();
        return;
    }

    const history = JSON.parse(localStorage.getItem('betHistory')) || [];
    const users = JSON.parse(localStorage.getItem('ladesUsers'));

    // Sadece bu lades pazarında doğru tahmini (winningChoice) yapan kişileri bul
    const winners = history.filter(h => h.marketId === marketId && h.choice === winningChoice);

    winners.forEach(winner => {
        // Formül: (Kullanıcının Yatardığı Miktar / Kazanan Havuzun Toplamı) * Toplam Havuz
        const userShareRatio = winner.amount / winningPool;
        const rewardAmount = Math.round(userShareRatio * totalPool);

        // Kullanıcının bakiyesine ödülü ekle
        const userObj = users.find(u => u.email === winner.email);
        if (userObj) {
            userObj.balance += rewardAmount;
        }
    });

    // Lades'in durumunu "Sonuçlandı" yap ki ana sayfadan kalksın
    market.status = "Sonuçlandı";
    
    // Verileri lokal hafızaya kilitle
    localStorage.setItem('ladesUsers', JSON.stringify(users));
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    alert(`🎉 LADES Başarıyla Sonuçlandırıldı!\nKazanan Seçenek: ${winningChoice === 'YES' ? 'EVET' : 'HAYIR'}\nToplam ${totalPool} Token kazanan hisse sahiplerine dağıtıldı.`);
    
    renderAdminPanel();
    updateUI();
}

function renderAdminPanel() {
    // 1. Bekleyen İstekler
    const requestsList = document.getElementById('admin-requests-list');
    const requests = JSON.parse(localStorage.getItem('adminRequests')).filter(r => r.status === "Bekliyor");
    requestsList.innerHTML = "";
    if (requests.length === 0) {
        requestsList.innerHTML = `<p style="color:#64748b; font-size:13px;">Bekleyen bir talep bulunmuyor.</p>`;
    } else {
        requests.forEach(req => {
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

    // 2. AKTİF LADESLERİ SONUÇLANDIRMA BÖLÜMÜ (Yeni Eklenen Panel)
    const adminActiveMarkets = document.getElementById('admin-active-markets');
    const activeMarkets = JSON.parse(localStorage.getItem('customMarkets')).filter(m => m.status === "Aktif");
    adminActiveMarkets.innerHTML = "";

    if (activeMarkets.length === 0) {
        adminActiveMarkets.innerHTML = `<p style="color:#64748b; font-size:13px;">Şu an sonuçlandırılacak aktif bir lades pazarı yok.</p>`;
    } else {
        activeMarkets.forEach(m => {
            const total = m.yesPool + m.noPool;
            adminActiveMarkets.innerHTML += `
                <div style="background:#030814; padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:13px; max-width:60%;">
                        <b style="color:white;">${m.title}</b><br>
                        <span style="color:#64748b;">Havuz: ${total} Token (E: ${m.yesPool} / H: ${m.noPool})</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; color:black; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">EVET Kazandı</button>
                        <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">HAYIR Kazandı</button>
                    </div>
                </div>`;
        });
    }

    // 3. Davet Kodları
    const codesList = document.getElementById('admin-codes-list');
    const codes = JSON.parse(localStorage.getItem('inviteCodes'));
    codesList.innerHTML = codes.map(c => `<span style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; padding:4px 8px; border-radius:6px; font-size:12px; color:#24ffff;">${c}</span>`).join(" ");

    // 4. Kullanıcı Listesi
    const usersTable = document.getElementById('admin-users-list');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    usersTable.innerHTML = "";
    users.forEach(u => {
        usersTable.innerHTML += `
            <tr style="border-bottom:1px solid #1c2541;">
                <td style="padding:8px 0; font-size:13px;">${u.email} ${u.isAdmin ? '👑' : ''}</td>
                <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">${u.balance}</td>
                <td style="padding:8px 0; text-align:right;">
                    <button onclick="addTokensManual('${u.email}')" style="background:#ff4aa2; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">+ Token Yükle</button>
                </td>
            </tr>`;
    });
}

function approveInvite(reqId, email) {
    const code = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codes = JSON.parse(localStorage.getItem('inviteCodes'));
    codes.push(code); localStorage.setItem('inviteCodes', JSON.stringify(codes));
    let requests = JSON.parse(localStorage.getItem('adminRequests'));
    requests = requests.filter(r => r.id != reqId); localStorage.setItem('adminRequests', JSON.stringify(requests));
    alert(`Onaylandı! Kod: ${code}`); renderAdminPanel();
}

function approveToken(reqId, email, amount) {
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) users[idx].balance += amount;
    localStorage.setItem('ladesUsers', JSON.stringify(users));
    let requests = JSON.parse(localStorage.getItem('adminRequests'));
    requests = requests.filter(r => r.id != reqId); localStorage.setItem('adminRequests', JSON.stringify(requests));
    alert(`${email} hesabına ${amount} token yüklendi.`); renderAdminPanel(); updateUI();
}

function addTokensManual(email) {
    const amt = prompt(`${email} için yüklenecek miktar:`);
    const amount = parseInt(amt); if (isNaN(amount) || amount <= 0) return;
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) users[idx].balance += amount;
    localStorage.setItem('ladesUsers', JSON.stringify(users));
    alert("Yüklendi!"); renderAdminPanel(); updateUI();
}

function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId; activeMarketTitle = marketTitle; activeChoice = choice;
    document.getElementById('modal-market-title').innerText = marketTitle;
    document.getElementById('modal-bet-choice').innerText = choice === 'YES' ? 'EVET' : 'HAYIR';
    document.getElementById('modal-bet-choice').style.color = (choice === 'YES') ? '#22c55e' : '#ef4444';
    document.getElementById('bet-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('bet-modal').style.display = 'none'; document.getElementById('bet-amount').value = ""; }