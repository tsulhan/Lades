// Cüzdan Kurulumu (İlk giriş için varsayılan)
if (!localStorage.getItem('tokenBalance')) {
    localStorage.setItem('tokenBalance', '10000');
}

// Sabit/Başlangıç Pazarları - Kategoriler Entegre Edildi
if (!localStorage.getItem('customMarkets')) {
    const defaultMarkets = [
        { id: 'bitcoin', title: "Bitcoin bu ay 100.000$'ı geçer mi?", date: "2026-06-30", yesPool: 9260, noPool: 4990, category: "Ekonomi" },
        { id: 'yagmur', title: "Yarın İstanbul'da yağmur yağar mı?", date: "2026-06-10", yesPool: 1020, noPool: 2380, category: "Eğlence" }
    ];
    localStorage.setItem('customMarkets', JSON.stringify(defaultMarkets));
}

// Global Durum Yönetimi
let activeMarketId = ""; 
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü"; // Sol menü filtre takibi için

// GİRİŞ KONTROLÜ - HER GİRİŞTE 10.000 TOKEN VEREN TEST MODU
function handleLogin() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!emailInput || !passwordInput) {
        alert("Giriş form elemanları bulunamadı!");
        return;
    }

    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value;

    const adminEmail = "tsulhan@gmail.com";
    const adminPassword = "1234";

    if (emailValue === adminEmail && passwordValue === adminPassword) {
        localStorage.setItem('tokenBalance', '10000');
        window.location.href = 'dashboard.html';
    } else if (emailValue === "" || passwordValue === "") {
        alert("Lütfen tüm alanları doldurun!");
    } else {
        alert("Hatalı giriş! Bilgiler: tsulhan@gmail.com / 1234");
    }
}

// KATEGORİ FİLTRELEME TETİKLEYİCİSİ
function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;
    
    // Sol menüdeki aktif buton görselini güncelle
    document.querySelectorAll('.sidebar-menu button').forEach(btn => {
        if (btn.innerText.includes(categoryName)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateUI();
}

// ARAYÜZÜ VE TÜM PAZARLARI DİNAMİK YENİLEME ALGORİTMASI
function updateUI() {
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.innerText = localStorage.getItem('tokenBalance');
    }

    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return; 

    let markets = JSON.parse(localStorage.getItem('customMarkets'));
    
    // Kategori Filtresi Uygula
    if (selectedCategoryFilter !== "Tümü") {
        markets = markets.filter(m => m.category === selectedCategoryFilter);
    }

    marketGrid.innerHTML = ""; 

    if (markets.length === 0) {
        marketGrid.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px; font-size:16px;">Bu kategoride henüz aktif bir lades pazarı bulunmuyor.</div>`;
        return;
    }

    markets.forEach(market => {
        const totalVolume = market.yesPool + market.noPool;
        
        let yesPercent = 50;
        let noPercent = 50;
        if (totalVolume > 0) {
            yesPercent = Math.round((market.yesPool / totalVolume) * 100);
            noPercent = 100 - yesPercent;
        }

        // Kart tasarımına küçük bir kategori etiketi (Badge) ekledik
        const cardHTML = `
            <div class="market-card">
                <div class="market-info">
                    <span class="category-badge">${market.category || 'Genel'}</span>
                    <h3>${market.title}</h3>
                    <p>Bitiş: ${market.date} • Hacim: <span style="font-weight:700; color:#24ffff;">${totalVolume.toLocaleString('tr-TR')}</span> Token</p>
                </div>
                <div class="market-actions">
                    <button id="btn-${market.id}-YES" class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'YES')">EVET %${yesPercent}</button>
                    <button id="btn-${market.id}-NO" class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'NO')">HAYIR %${noPercent}</button>
                </div>
            </div>
        `;
        marketGrid.innerHTML += cardHTML;
    });
}

// Yeni Lades / Pazar Yaratma Fonksiyonu
function createNewMarket() {
    const title = document.getElementById('market-question').value.trim();
    const date = document.getElementById('market-date').value;
    const initialBet = parseInt(document.getElementById('market-initial-bet').value);
    const choice = document.getElementById('market-choice').value;
    const category = document.getElementById('market-category').value; // Seçilen kategori varyantı
    let currentBalance = parseInt(localStorage.getItem('tokenBalance'));

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen tüm alanları eksiksiz ve doğru doldurun!");
        return;
    }
    if (initialBet > currentBalance) {
        alert(`Yetersiz bakiye! Sahip olduğunuz maksimum token: ${currentBalance}`);
        return;
    }

    currentBalance -= initialBet;
    localStorage.setItem('tokenBalance', currentBalance.toString());

    let yesPool = 0;
    let noPool = 0;
    if (choice === 'YES') yesPool = initialBet;
    else noPool = initialBet;

    const newMarket = {
        id: 'custom_' + Date.now(),
        title: title,
        date: date,
        yesPool: yesPool,
        noPool: noPool,
        category: category // Yeni pazara kategori atandı
    };

    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    markets.push(newMarket);
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    alert(`⚡ [${category}] Pazarı Başarıyla Açıldı! ${initialBet} Token yatırıldı.`);

    document.getElementById('market-question').value = "";
    document.getElementById('market-initial-bet').value = "";
    
    if (typeof switchTab === 'function') {
        switchTab('mevcut-ladesler');
        document.querySelectorAll('.tab-button')[0].classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.remove('active');
    }
    
    // Filtreyi 'Tümü' yapıp arayüzü sıfırla ki yeni eklenen görünsün
    selectedCategoryFilter = "Tümü";
    document.querySelectorAll('.sidebar-menu button').forEach(btn => {
        if(btn.innerText.includes("Tümü")) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    updateUI();
}

// Mevcut Pazara Sonradan Bahis Yapma (Modal Onaylama)
function confirmBet() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseInt(amountInput.value);
    let currentBalance = parseInt(localStorage.getItem('tokenBalance'));
    
    if (isNaN(amount) || amount <= 0) {
        alert("Lütfen geçerli bir miktar girin!");
        return;
    }
    if (amount > currentBalance) {
        alert(`Yetersiz bakiye!`);
        return;
    }
    
    currentBalance -= amount;
    localStorage.setItem('tokenBalance', currentBalance.toString());
    
    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    const targetMarket = markets.find(m => m.id === activeMarketId);
    
    if (targetMarket) {
        if (activeChoice === 'YES') targetMarket.yesPool += amount;
        else targetMarket.noPool += amount;
    }
    
    localStorage.setItem('customMarkets', JSON.stringify(markets));
    
    closeModal();
    updateUI();
}

// Modal Yardımcıları
function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId;
    activeMarketTitle = marketTitle;
    activeChoice = choice;
    document.getElementById('modal-market-title').innerText = marketTitle;
    document.getElementById('modal-bet-choice').innerText = choice === 'YES' ? 'EVET' : 'HAYIR';
    const choiceSpan = document.getElementById('modal-bet-choice');
    choiceSpan.style.color = (choice === 'YES') ? '#22c55e' : '#ef4444';
    document.getElementById('bet-modal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('bet-modal').style.display = 'none';
    document.getElementById('bet-amount').value = "";
}