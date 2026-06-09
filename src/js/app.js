// Cüzdan Kurulumu (İlk kez giriyorsa 1000 Token tanımla)
if (!localStorage.getItem('tokenBalance')) {
    localStorage.setItem('tokenBalance', '1000');
}

// Lades Pazarlarının Başlangıç Hacimleri (Hafızada yoksa tanımla)
if (!localStorage.getItem('vol_bitcoin')) {
    localStorage.setItem('vol_bitcoin', '14250');
}
if (!localStorage.getItem('vol_yagmur')) {
    localStorage.setItem('vol_yagmur', '3400');
}

// Global Durum Yönetimi (Modal takibi için)
let activeMarketId = ""; // Hangi pazarın hacmini artıracağımızı bilmek için ID tutuyoruz
let activeMarketTitle = "";
let activeChoice = "";

// Giriş Kontrol Fonksiyonu
function handleLogin() {
    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;

    const adminEmail = "tsulhan@gmail.com";
    const adminPassword = "1234";

    if (emailInput === adminEmail && passwordInput === adminPassword) {
        window.location.href = 'dashboard.html';
    } else if (emailInput === "" || passwordInput === "") {
        alert("Lütfen tüm alanları doldurun!");
    } else {
        alert("Hatalı giriş! Bilgiler: tsulhan@gmail.com / 1234");
    }
}

// Arayüzü Güncel Tutma Fonksiyonu (Cüzdan + Tüm Pazar Hacimleri)
function updateUI() {
    // Cüzdanı Güncelle
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.innerText = localStorage.getItem('tokenBalance');
    }

    // Pazar 1 (Bitcoin) Hacmini Güncelle
    const volBitcoinElement = document.getElementById('vol-display-bitcoin');
    if (volBitcoinElement) {
        // Sayıları binlik ayracı ile şık göstermek için (Örn: 14,250)
        const vol = parseInt(localStorage.getItem('vol_bitcoin'));
        volBitcoinElement.innerText = vol.toLocaleString('tr-TR');
    }

    // Pazar 2 (Yağmur) Hacmini Güncelle
    const volYagmurElement = document.getElementById('vol-display-yagmur');
    if (volYagmurElement) {
        const vol = parseInt(localStorage.getItem('vol_yagmur'));
        volYagmurElement.innerText = vol.toLocaleString('tr-TR');
    }
}

// Token Yatırma Kutusunu Açma (Modal)
function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId; // Hangi pazara tıklandığını kaydet ('bitcoin' veya 'yagmur')
    activeMarketTitle = marketTitle;
    activeChoice = choice;
    
    document.getElementById('modal-market-title').innerText = marketTitle;
    document.getElementById('modal-bet-choice').innerText = choice;
    
    const choiceSpan = document.getElementById('modal-bet-choice');
    if(choice === 'EVET') {
        choiceSpan.style.color = '#22c55e';
    } else {
        choiceSpan.style.color = '#ef4444';
    }
    
    document.getElementById('bet-modal').style.display = 'flex';
}

// Kutuyu Kapatma
function closeModal() {
    document.getElementById('bet-modal').style.display = 'none';
    document.getElementById('bet-amount').value = "";
}

// Bahsi ve Toplam Hacmi Onaylama Mantığı
function confirmBet() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseInt(amountInput.value);
    let currentBalance = parseInt(localStorage.getItem('tokenBalance'));
    
    if (isNaN(amount) || amount <= 0) {
        alert("Lütfen geçerli bir token miktararı girin!");
        return;
    }
    
    if (amount > currentBalance) {
        alert(`Yetersiz bakiye! Maksimum ${currentBalance} token yatırabilirsiniz.`);
        return;
    }
    
    // 1. Kullanıcı Bakiyesinden Düş ve Kaydet
    currentBalance -= amount;
    localStorage.setItem('tokenBalance', currentBalance.toString());
    
    // 2. Tıklanan Pazarın Toplam Hacmini Artır ve Kaydet
    const storageKey = `vol_${activeMarketId}`; // 'vol_bitcoin' veya 'vol_yagmur' oluşturur
    let currentMarketVolume = parseInt(localStorage.getItem(storageKey));
    currentMarketVolume += amount;
    localStorage.setItem(storageKey, currentMarketVolume.toString());
    
    alert(`Başarılı! "${activeMarketTitle}" pazarında [${activeChoice}] seçeneğine ${amount} TOKEN kilitlendi. Toplam pazar hacmi büyüdü! ⚡`);
    
    closeModal();
    updateUI(); // Ekrandaki tüm sayıları (Cüzdan ve Toplam Yatırılan) anlık tazele
}