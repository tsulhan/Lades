// --- VERİ TABANI SİMÜLASYONU (LocalStorage) ---

// Kullanıcılar Listesi
if (!localStorage.getItem('ladesUsers')) {
    const defaultUsers = [
        { email: "tsulhan@gmail.com", balance: 10000, isAdmin: true },
        { email: "test@lades.com", balance: 0, isAdmin: false }
    ];
    localStorage.setItem('ladesUsers', JSON.stringify(defaultUsers));
}

// Aktif Giriş Yapan Kullanıcı Takibi
if (!localStorage.getItem('currentUser')) {
    localStorage.setItem('currentUser', "tsulhan@gmail.com"); // Varsayılan admin simülasyonu
}

// Geçerli Üretilmiş Davet Kodları
if (!localStorage.getItem('inviteCodes')) {
    localStorage.setItem('inviteCodes', JSON.stringify(["LADES2026", "VIPUX"]));
}

// Yönetici Bildirimleri ve İstekleri (Davet Kodu ve Token İstekleri)
if (!localStorage.getItem('adminRequests')) {
    const defaultRequests = [
        { id: 1, type: "invite", email: "ornek_talep@gmail.com", status: "Bekliyor" },
        { id: 2, type: "token", email: "test@lades.com", amount: 5000, status: "Bekliyor" }
    ];
    localStorage.setItem('adminRequests', JSON.stringify(defaultRequests));
}

// Sabit/Başlangıç Pazarları
if (!localStorage.getItem('customMarkets')) {
    const defaultMarkets = [
        { id: 'bitcoin', title: "Bitcoin bu ay 100.000$'ı geçer mi?", date: "2026-06-30", yesPool: 9260, noPool: 4990, category: "Ekonomi" },
        { id: 'yagmur', title: "Yarın İstanbul'da yağmur yağar mı?", date: "2026-06-10", yesPool: 1020, noPool: 2380, category: "Eğlence" }
    ];
    localStorage.setItem('customMarkets', JSON.stringify(defaultMarkets));
}

// Global Durum Değişkenleri
let activeMarketId = ""; 
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";

// --- GİRİŞ VE KAYIT FONKSİYONLARI ---

function handleLogin() {
    const emailValue = document.getElementById('email').value.trim();
    const passwordValue = document.getElementById('password').value;

    if (emailValue === "" || passwordValue === "") {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const user = users.find(u => u.email === emailValue);

    if (user && passwordValue === "1234") { // Basit şifre simülasyonu
        localStorage.setItem('currentUser', user.email);
        window.location.href = 'dashboard.html';
    } else {
        alert("Hatalı e-posta veya şifre! (Şifre: 1234)");
    }
}

function handleRegister() {
    const inviteCode = document.getElementById('reg-invite-code').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (!inviteCode || !email || !password || !passwordConfirm) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (password !== passwordConfirm) {
        alert("Şifreler birbiriyle uyuşmuyor!");
        return;
    }

    // Davet kodu kontrolü
    const validCodes = JSON.parse(localStorage.getItem('inviteCodes'));
    if (!validCodes.includes(inviteCode)) {
        alert("Geçersiz Davet Kodu! Kodunuz yoksa yanındaki butondan talep edebilirsiniz.");
        return;
    }

    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    if (users.some(u => u.email === email)) {
        alert("Bu e-posta adresiyle zaten kayıtlı bir kullanıcı var!");
        return;
    }

    // Yeni kullanıcıyı ekle (Bakiyesi 0 olarak başlar)
    users.push({ email: email, balance: 0, isAdmin: false });
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    // Kullanılan davet kodunu listeden sil (Tek kullanımlık mantığı)
    const updatedCodes = validCodes.filter(c => c !== inviteCode);
    localStorage.setItem('inviteCodes', JSON.stringify(updatedCodes));

    alert("🎉 Kayıt başarıyla tamamlandı! Başlangıç bakiyeniz 0 TOKEN'dir. Giriş yaptıktan sonra Token İsteyebilirsiniz.");
    window.location.href = 'login.html';
}

// Dışarıdan Davet Kodu İsteği Gönderme
function requestInviteCode() {
    const email = document.getElementById('reg-email').value.trim();
    if (!email) {
        alert("Davet kodu talebi oluşturmak için lütfen önce E-posta Adresi alanını doldurun!");
        return;
    }

    const requests = JSON.parse(localStorage.getItem('adminRequests'));
    if (requests.some(r => r.email === email && r.type === "invite")) {
        alert("Bu e-posta adresi için zaten açık bir davet kodu talebi var.");
        return;
    }

    requests.push({
        id: Date.now(),
        type: "invite",
        email: email,
        status: "Bekliyor"
    });
    localStorage.setItem('adminRequests', JSON.stringify(requests));
    alert("⚡ Davet kodu talebiniz yöneticiye iletildi! Lütfen onaylanmasını bekleyin.");
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

    // Bakiye Güncelle
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) balanceElement.innerText = user.balance;

    // Sıfır Bakiyeliler için "TOKEN İSTE" Butonu Kontrolü
    const tokenRequestArea = document.getElementById('token-request-area');
    if (tokenRequestArea) {
        if (user.balance === 0) {
            tokenRequestArea.style.display = 'block';
        } else {
            tokenRequestArea.style.display = 'none';
        }
    }

    // Admin İkonu Görünürlüğü
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) {
        adminBtn.style.display = user.isAdmin ? 'block' : 'none';
    }

    // Pazar Grid Güncelleme
    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return;

    let markets = JSON.parse(localStorage.getItem('customMarkets'));
    if (selectedCategoryFilter !== "Tümü") {
        markets = markets.filter(m => m.category === selectedCategoryFilter);
    }

    marketGrid.innerHTML = "";
    if (markets.length === 0) {
        marketGrid.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px;">Bu kategoride aktif bir lades bulunmuyor.</div>`;
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
            </div>
        `;
    });
}

// Token İsteme Aksiyonu (Kullanıcı Tarafı)
function openTokenRequestModal() {
    const amount = prompt("Kaç Token talep etmek istiyorsunuz?");
    const tokenAmount = parseInt(amount);

    if (isNaN(tokenAmount) || tokenAmount <= 0) {
        alert("Lütfen geçerli bir miktar girin!");
        return;
    }

    const currentUserEmail = localStorage.getItem('currentUser');
    const requests = JSON.parse(localStorage.getItem('adminRequests'));

    requests.push({
        id: Date.now(),
        type: "token",
        email: currentUserEmail,
        amount: tokenAmount,
        status: "Bekliyor"
    });

    localStorage.setItem('adminRequests', JSON.stringify(requests));
    alert(`⚡ ${tokenAmount} Token talebiniz yönetici onayına gönderildi!`);
}

// Yeni Lades Yaratma
function createNewMarket() {
    const title = document.getElementById('market-question').value.trim();
    const date = document.getElementById('market-date').value;
    const initialBet = parseInt(document.getElementById('market-initial-bet').value);
    const choice = document.getElementById('market-choice').value;
    const category = document.getElementById('market-category').value;
    
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen alanları doğru doldurun!");
        return;
    }
    if (initialBet > users[userIndex].balance) {
        alert("Yetersiz bakiye!");
        return;
    }

    users[userIndex].balance -= initialBet;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    const newMarket = {
        id: 'custom_' + Date.now(),
        title: title,
        date: date,
        yesPool: choice === 'YES' ? initialBet : 0,
        noPool: choice === 'NO' ? initialBet : 0,
        category: category
    };

    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    markets.push(newMarket);
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    alert(`⚡ Lades Başarıyla Yaratıldı!`);
    document.getElementById('market-question').value = "";
    document.getElementById('market-initial-bet').value = "";
    switchTab('mevcut-ladesler');
    updateUI();
}

// --- YÖNETİCİ PANELİ KONTROLLERİ ---

function openAdminPanel() {
    document.getElementById('admin-modal').style.display = 'flex';
    renderAdminPanel();
}

function closeAdminPanel() {
    document.getElementById('admin-modal').style.display = 'none';
}

function generateInviteCode() {
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codes = JSON.parse(localStorage.getItem('inviteCodes'));
    codes.push(newCode);
    localStorage.setItem('inviteCodes', JSON.stringify(codes));
    renderAdminPanel();
}

function renderAdminPanel() {
    // 1. İstekleri Listele
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
                        <button onclick="approveInvite('${req.id}', '${req.email}')" style="background:#22c55e; color:black; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">Kod Üret & Onayla</button>
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

    // 2. Davet Kodlarını Listele
    const codesList = document.getElementById('admin-codes-list');
    const codes = JSON.parse(localStorage.getItem('inviteCodes'));
    codesList.innerHTML = codes.map(c => `<span style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; padding:4px 8px; border-radius:6px; font-size:12px; color:#24ffff;">${c}</span>`).join(" ");

    // 3. Kullanıcıları Listele
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
    codes.push(code);
    localStorage.setItem('inviteCodes', JSON.stringify(codes));

    let requests = JSON.parse(localStorage.getItem('adminRequests'));
    requests = requests.filter(r => r.id != reqId);
    localStorage.setItem('adminRequests', JSON.stringify(requests));

    alert(`Onaylandı! ${email} kullanıcısı için üretilen kod: ${code}\n(Gerçek sistemde bu kod e-posta olarak gider)`);
    renderAdminPanel();
}

function approveToken(reqId, email, amount) {
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) users[idx].balance += amount;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    let requests = JSON.parse(localStorage.getItem('adminRequests'));
    requests = requests.filter(r => r.id != reqId);
    localStorage.setItem('adminRequests', JSON.stringify(requests));

    alert(`${email} hesabına ${amount} token tanımlandı!`);
    renderAdminPanel();
    updateUI();
}

function addTokensManual(email) {
    const amt = prompt(`${email} için kaç token eklemek istersiniz?`);
    const amount = parseInt(amt);
    if (isNaN(amount) || amount <= 0) return;

    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) users[idx].balance += amount;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    alert(`Başarıyla yüklendi!`);
    renderAdminPanel();
    updateUI();
}

// Bahis Onaylama Ekranları ve Diğer Yardımcılar
function confirmBet() {
    const amount = parseInt(document.getElementById('bet-amount').value);
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (isNaN(amount) || amount <= 0 || amount > users[userIndex].balance) {
        alert("Geçersiz miktar veya yetersiz bakiye!");
        return;
    }

    users[userIndex].balance -= amount;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    const target = markets.find(m => m.id === activeMarketId);
    if (target) {
        if (activeChoice === 'YES') target.yesPool += amount;
        else target.noPool += amount;
    }
    localStorage.setItem('customMarkets', JSON.stringify(markets));
    closeModal();
    updateUI();
}

function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId; activeMarketTitle = marketTitle; activeChoice = choice;
    document.getElementById('modal-market-title').innerText = marketTitle;
    document.getElementById('modal-bet-choice').innerText = choice === 'YES' ? 'EVET' : 'HAYIR';
    document.getElementById('modal-bet-choice').style.color = (choice === 'YES') ? '#22c55e' : '#ef4444';
    document.getElementById('bet-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('bet-modal').style.display = 'none'; document.getElementById('bet-amount').value = ""; }