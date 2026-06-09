// Cüzdan Kurulumu
if (!localStorage.getItem('tokenBalance')) {
    localStorage.setItem('tokenBalance', '1000');
}

// 1. PAZAR (Bitcoin) İÇİN BAŞLANGIÇ HAVUZLARI (Hafızada yoksa oluştur)
if (!localStorage.getItem('pool_bitcoin_YES')) localStorage.setItem('pool_bitcoin_YES', '9260');
if (!localStorage.getItem('pool_bitcoin_NO')) localStorage.setItem('pool_bitcoin_NO', '4990');

// 2. PAZAR (Yağmur) İÇİN BAŞLANGIÇ HAVUZLARI
if (!localStorage.getItem('pool_yagmur_YES')) localStorage.setItem('pool_yagmur_YES', '1020');
if (!localStorage.getItem('pool_yagmur_NO')) localStorage.setItem('pool_yagmur_NO', '2380');

// Global Durum Yönetimi
let activeMarketId = ""; 
let activeMarketTitle = "";
let activeChoice = "";

// Giriş Kontrolü
function handleLogin() {
    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;
    if (emailInput === "tsulhan@gmail.com" && passwordInput === "1234") {
        window.location.href = 'dashboard.html';
    } else {
        alert("Hatalı giriş!");
    }
}

// ORAN VE ARAYÜZ HESAPLAMA ALGORİTMASI
function updateUI() {
    // Cüzdanı Güncelle
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.innerText = localStorage.getItem('tokenBalance');
    }

    // Pazarları döngüyle veya tek tek güncelleyebiliriz. İki pazarımız için de oranları hesaplayalım:
    const markets = ['bitcoin', 'yagmur'];

    markets.forEach(mId => {
        const yesPool = parseInt(localStorage.getItem(`pool_${mId}_YES`));
        const noPool = parseInt(localStorage.getItem(`pool_${mId}_NO`));
        const totalVolume = yesPool + noPool;

        // Yüzde Hesaplama Algoritması
        let yesPercent = Math.round((yesPool / totalVolume) * 100);
        let noPercent = 100 - yesPercent; // Toplamın tam 100 çıkması için

        // Ekranda Toplam Hacmi Güncelle (Örn: 14.250)
        const volElement = document.getElementById(`vol-display-${mId}`);
        if (volElement) {
            volElement.innerText = totalVolume.toLocaleString('tr-TR');
        }

        // Butonların İçindeki Metni ve Yüzdeleri Güncelle
        const yesBtn = document.getElementById(`btn-${mId}-YES`);
        const noBtn = document.getElementById(`btn-${mId}-NO`);

        if (yesBtn && noBtn) {
            yesBtn.innerText = `EVET %${yesPercent}`;
            noBtn.innerText = `HAYIR %${noPercent}`;
        }
    });
}

// Token Yatırma Kutusunu Açma (Modal)
function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId;
    activeMarketTitle = marketTitle;
    activeChoice = choice;
    
    document.getElementById('modal-market-title').innerText = marketTitle;
    document.getElementById('modal-bet-choice').innerText = choice;
    
    const choiceSpan = document.getElementById('modal-bet-choice');
    choiceSpan.style.color = (choice === 'EVET') ? '#22c55e' : '#ef4444';
    
    document.getElementById('bet-modal').style.display = 'flex';
}

// Kutuyu Kapatma
function closeModal() {
    document.getElementById('bet-modal').style.display = 'none';
    document.getElementById('bet-amount').value = "";
}

// Havuzları ve Oranları Değiştiren Onaylama Fonksiyonu
function confirmBet() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseInt(amountInput.value);
    let currentBalance = parseInt(localStorage.getItem('tokenBalance'));
    
    if (isNaN(amount) || amount <= 0) {
        alert("Lütfen geçerli bir miktar girin!");
        return;
    }
    if (amount > currentBalance) {
        alert(`Yetersiz bakiye! En fazla ${currentBalance} token yatırabilirsiniz.`);
        return;
    }
    
    // 1. Kullanıcı cüzdanından düş
    currentBalance -= amount;
    localStorage.setItem('tokenBalance', currentBalance.toString());
    
    // 2. İlgili pazarın seçilen havuzuna ekle (Algoritmanın kalbi)
    const storageKey = `pool_${activeMarketId}_${activeChoice}`; // Örn: pool_bitcoin_YES
    let targetPool = parseInt(localStorage.getItem(storageKey));
    targetPool += amount;
    localStorage.setItem(storageKey, targetPool.toString());
    
    alert(`Başarılı! Oranlar ve toplam pazar hacmi yeniden hesaplanıyor... ⚡`);
    
    closeModal();
    updateUI(); // Algoritmayı tetikle, yeni yüzdeler ekrana yansısın
}