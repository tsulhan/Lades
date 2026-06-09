// Cüzdan Kurulumu
if (!localStorage.getItem('tokenBalance')) {
    localStorage.setItem('tokenBalance', '1000');
}

// Sabit/Başlangıç Pazarları (Hafızada yoksa dizi olarak oluştur)
if (!localStorage.getItem('customMarkets')) {
    const defaultMarkets = [
        { id: 'bitcoin', title: "Bitcoin bu ay 100.000$'ı geçer mi?", date: "2026-06-30", yesPool: 9260, noPool: 4990 },
        { id: 'yagmur', title: "Yarın İstanbul'da yağmur yağar mı?", date: "2026-06-10", yesPool: 1020, noPool: 2380 }
    ];
    localStorage.setItem('customMarkets', JSON.stringify(defaultMarkets));
}

// Global Durum Yönetimi
let activeMarketId = ""; 
let activeMarketTitle = "";
let activeChoice = "";

// ARAYÜZÜ VE TÜM PAZARLARI DİNAMİK YENİLEME ALGORİTMASI
function updateUI() {
    // 1. Cüzdanı Güncelle
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.innerText = localStorage.getItem('tokenBalance');
    }

    // 2. Pazarları Hafızadan Oku ve Listeyi Dinamik Oluştur
    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return; // Eğer element o sayfada yoksa dur

    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    marketGrid.innerHTML = ""; // Eski listeyi temizle

    markets.forEach(market => {
        const totalVolume = market.yesPool + market.noPool;
        
        // Yüzde Hesaplama (0'a bölünmeyi engellemek için korumalı)
        let yesPercent = 50;
        let noPercent = 50;
        if (totalVolume > 0) {
            yesPercent = Math.round((market.yesPool / totalVolume) * 100);
            noPercent = 100 - yesPercent;
        }

        // Dinamik HTML Kartı Oluşturma
        const cardHTML = `
            <div class="market-card">
                <div class="market-info">
                    <h3>${market.title}</h3>
                    <p>Bitiş: ${market.date} • Toplam Hacim: <span style="font-weight:700; color:#24ffff;">${totalVolume.toLocaleString('tr-TR')}</span> Token</p>
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
    let currentBalance = parseInt(localStorage.getItem('tokenBalance'));

    // Form Kontrolleri
    if (!title || !date || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen tüm alanları eksiksiz ve doğru doldurun!");
        return;
    }
    if (initialBet > currentBalance) {
        alert(`Yetersiz bakiye! Sahip olduğunuz maksimum token: ${currentBalance}`);
        return;
    }

    // 1. Kullanıcı Bakiyesinden İlk Bahsi Düş
    currentBalance -= initialBet;
    localStorage.setItem('tokenBalance', currentBalance.toString());

    // 2. Havuz Miktarlarını Ayarla
    let yesPool = 0;
    let noPool = 0;
    if (choice === 'YES') yesPool = initialBet;
    else noPool = initialBet;

    // 3. Yeni Pazar Objesini Oluştur
    const newMarket = {
        id: 'custom_' + Date.now(), // Benzersiz ID üretme
        title: title,
        date: date,
        yesPool: yesPool,
        noPool: noPool
    };

    // 4. Hafızadaki Listeye Ekle
    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    markets.push(newMarket);
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    alert(`⚡ Lades Pazarı Başarıyla Açıldı! ${initialBet} Token ${choice === 'YES' ? 'EVET' : 'HAYIR'} seçeneğine yatırıldı.`);

    // Formu temizle ve Mevcut Ladesler sekmesine geçiş yap
    document.getElementById('market-question').value = "";
    document.getElementById('market-initial-bet').value = "";
    
    // dashboard.html içindeki switchTab fonksiyonunu tetikle
    if (typeof switchTab === 'function') {
        switchTab('mevcut-ladesler');
        // Aktif tab buton stillerini güncelle
        document.querySelectorAll('.tab-button')[0].classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.remove('active');
    }
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
    
    // Cüzdandan düş
    currentBalance -= amount;
    localStorage.setItem('tokenBalance', currentBalance.toString());
    
    // Hafızadaki ilgili pazarın havuzunu bulup artır
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

// Modal Açma / Kapatma Yardımcıları
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