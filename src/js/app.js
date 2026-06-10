// --- VERİ TABANI SİMÜLASYONU (LocalStorage) ---

if (!localStorage.getItem('ladesUsers')) {
    const defaultUsers = [
        { email: "tsulhan@gmail.com", password: "1234", balance: 10000, isAdmin: true },
        { email: "test@lades.com", password: "1234", balance: 1000, isAdmin: false },
        { email: "taylansulhan@gmail.com", password: "1234", balance: 0, isAdmin: false },
        { email: "yeni@lades.com", password: "1234", balance: 10000, isAdmin: false }
    ];
    localStorage.setItem('ladesUsers', JSON.stringify(defaultUsers));
}

// CRITICAL FIX: Otomatik admin girişi yaptıran hatalı kod bloğu tamamen kaldırıldı.
if (!localStorage.getItem('inviteCodes')) {
    localStorage.setItem('inviteCodes', JSON.stringify(["VIPUX", "LADES2026"]));
}
if (!localStorage.getItem('adminRequests')) {
    localStorage.setItem('adminRequests', JSON.stringify([
        { id: 1, type: "invite", email: "ornek_talep@gmail.com", status: "Bekliyor" },
        { id: 2, type: "token", email: "test@lades.com", amount: 5000, status: "Bekliyor" }
    ]));
}
if (!localStorage.getItem('customMarkets')) localStorage.setItem('customMarkets', JSON.stringify([]));
if (!localStorage.getItem('betHistory')) localStorage.setItem('betHistory', JSON.stringify([]));

// Global Durum Değişkenleri
let activeMarketId = ""; 
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";

// --- GİRİŞ VE ÇIKIŞ İŞLEMLERİ ---
function handleLogin() {
    const emailValue = document.getElementById('email').value.trim();
    const passwordValue = document.getElementById('password').value;
    if (emailValue === "" || passwordValue === "") { alert("Lütfen tüm alanları doldurun!"); return; }
    
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const user = users.find(u => u.email === emailValue);
    
    if (user && user.password === passwordValue) { 
        localStorage.setItem('currentUser', user.email); 
        window.location.href = 'dashboard.html'; 
    } else { 
        alert("Hatalı e-posta veya şifre!"); 
    }
}

function logout() { 
    // Tarayıcı hafızasını temizle ve login sayfasına at
    localStorage.removeItem('currentUser'); 
    window.location.href = 'login.html'; 
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
    if (!currentUserEmail) return;
    
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const user = users.find(u => u.email === currentUserEmail) || { email: currentUserEmail, balance: 0, isAdmin: false };

    // Sağ üstteki email bilgisini güncelle
    const userEmailBadge = document.getElementById('user-email-badge');
    if (userEmailBadge) userEmailBadge.innerText = user.email;

    // Bakiyeyi güncelle
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) balanceElement.innerText = user.balance;

    // Yönetici butonunun görünürlüğü
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.style.display = user.isAdmin ? 'block' : 'none';

    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return;

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

function createNewMarket() {
    const title = document.getElementById('market-question').value.trim();
    const date = document.getElementById('market-date').value;
    const initialBet = parseInt(document.getElementById('market-initial-bet').value);
    const choice = document.getElementById('market-choice').value;
    const category = document.getElementById('market-category').value;
    
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) { alert("Lütfen tüm alanları doğru doldurun!"); return; }
    if (initialBet > users[userIndex].balance) { alert("Yetersiz bakiye!"); return; }

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
        status: "Aktif"
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

// --- YÖNETİCİ SİSTEMLERİ ---
function openAdminPanel() {
    document.getElementById('admin-modal').style.display = 'flex';
    renderAdminPanel();
}
function closeAdminPanel() { document.getElementById('admin-modal').style.display = 'none'; }

function renderAdminPanel() {
    // Bekleyen Talepler Listesi
    const requestsList = document.getElementById('admin-requests-list');
    const requests = JSON.parse(localStorage.getItem('adminRequests')) || [];
    requestsList.innerHTML = requests.length === 0 ? `<p style="color:#64748b; font-size:13px;">Bekleyen talep yok.</p>` : "";
    requests.forEach(req => {
        requestsList.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#030814; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;">
                <span>${req.type === "invite" ? '✉️ Davet:' : '💰 Token:'} <b>${req.email}</b> ${req.amount ? '-> '+req.amount : ''}</span>
                <button style="background:#22c55e; color:black; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">Onayla</button>
            </div>`;
    });

    // Kayıtlı Kullanıcılar Listesi
    const usersTable = document.getElementById('admin-users-list');
    usersTable.innerHTML = "";
    JSON.parse(localStorage.getItem('ladesUsers')).forEach(u => {
        usersTable.innerHTML += `
            <tr style="border-bottom:1px solid #1c2541;">
                <td style="padding:8px 0; font-size:13px;">${u.email} ${u.isAdmin ? '👑' : ''}</td>
                <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">${u.balance}</td>
                <td style="padding:8px 0; text-align:right;"><button style="background:#ff4aa2; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">+ Token Yükle</button></td>
            </tr>`;
    });
}

function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId; activeMarketTitle = marketTitle; activeChoice = choice;
    document.getElementById('bet-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('bet-modal').style.display = 'none'; }