// Cüzdan Kurulumu (İlk kez giriyorsa 1000 Token tanımla)
if (!localStorage.getItem('tokenBalance')) {
    localStorage.setItem('tokenBalance', '1000');
}

// Global Durum Yönetimi (Modal takibi için)
let activeMarket = "";
let activeChoice = "";

// Giriş Kontrol Fonksiyonu (login.html tetikler)
function handleLogin() {
    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;

    const adminEmail = "tsulhan@gmail.com";
    const adminPassword = "1234";

    if (emailInput === adminEmail && passwordInput === adminPassword) {
        // Her girişte tokenları tazelemek istersen burayı açabilirsin:
        // localStorage.setItem('tokenBalance', '1000');
        window.location.href = 'dashboard.html';
    } else if (emailInput === "" || passwordInput === "") {
        alert("Lütfen tüm alanları doldurun!");
    } else {
        alert("Hatalı giriş! Bilgiler: tsulhan@gmail.com / 1234");
    }
}

// Arayüzü Güncel Tutma Fonksiyonu
function updateUI() {
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.innerText = localStorage.getItem('tokenBalance');
    }
}

// Token Yatırma Kutusunu Açma (Modal)
function openBetModal(marketTitle, choice) {
    activeMarket = marketTitle;
    activeChoice = choice;
    
    document.getElementById('modal-market-title').innerText = marketTitle;
    document.getElementById('modal-bet-choice').innerText = choice;
    
    // Seçime göre rengi özelleştir
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

// Bahsi/Tokenları Onaylama Mantığı
function confirmBet() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseInt(amountInput.value);
    let currentBalance = parseInt(localStorage.getItem('tokenBalance'));
    
    if (isNaN(amount) || amount <= 0) {
        alert("Lütfen geçerli bir token miktarı girin!");
        return;
    }
    
    if (amount > currentBalance) {
        alert(`Yetersiz bakiye! Maksimum ${currentBalance} token yatırabilirsiniz.`);
        return;
    }
    
    // Bakiyeden düş ve kaydet
    currentBalance -= amount;
    localStorage.setItem('tokenBalance', currentBalance.toString());
    
    alert(`Başarılı! "${activeMarket}" pazarında [${activeChoice}] seçeneğine ${amount} TOKEN kilitlendi.`);
    
    closeModal();
    updateUI();
}