// Lades Giriş Kontrol Sistemi
function handleLogin() {
    // Sayfadaki input alanlarından verileri çekiyoruz
    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;

    // Belirlediğin özel giriş bilgileri
    const adminEmail = "tsulhan@gmail.com";
    const adminPassword = "1234";

    if (emailInput === adminEmail && passwordInput === adminPassword) {
        // Bilgiler doğruysa Dashboard sayfasına fırlatıyoruz
        window.location.href = 'dashboard.html';
    } else if (emailInput === "" || passwordInput === "") {
        alert("Lütfen tüm alanları doldurun!");
    } else {
        alert("Hatalı e-posta adresi veya şifre! (Test için tsulhan@gmail.com / 1234 kullanın)");
    }
}