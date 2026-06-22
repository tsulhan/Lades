// ======================================================
// AUTH MODÜLÜ - Giriş, Kayıt, Davet Kodu
// ======================================================

// ------------------------------------------------------
// GİRİŞ YAP
// ------------------------------------------------------
async function handleLogin() {
    const emailValue = document.getElementById("email")?.value.trim();
    const passwordValue = document.getElementById("password")?.value;

    if (!emailValue || !passwordValue) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı kuruluyor, lütfen birkaç saniye sonra tekrar deneyin.");
        return;
    }

    try {
        if (typeof fbGet !== "function") {
            alert("Altyapı fonksiyonları (core.js) yüklenemedi.");
            return;
        }

        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};

        const firebaseUserKey = emailValue.replace(/\./g, ',');
        const user = users[firebaseUserKey];

        if (user && user.password === String(passwordValue)) {
            localStorage.setItem("currentUser", user.email);
            window.location.href = "dashboard.html";
        } else {
            alert("Hatalı e-posta veya şifre!");
        }
    } catch (error) {
        console.error("Giriş hatası detayları:", error);
        alert("Giriş işlem sırasında teknik bir hata meydana geldi.");
    }
}

// ------------------------------------------------------
// KAYIT OL
// ------------------------------------------------------
async function handleRegister() {
    const inviteCode = document.getElementById("reg-invite-code")?.value.trim();
    const nickname = document.getElementById("reg-nickname")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const passwordConfirm = document.getElementById("reg-password-confirm")?.value;

    if (!inviteCode || !nickname || !email || !password || !passwordConfirm) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (!validateNickname(nickname)) {
        alert("Kullanıcı adı 3-20 karakter olmalı ve sadece harf/rakam içermelidir!");
        return;
    }

    if (password !== passwordConfirm) {
        alert("Şifreler birbiriyle uyuşmuyor!");
        return;
    }

    if (password.length < 4) {
        alert("Şifre en az 4 karakter olmalıdır!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const [inviteCodesSnap, usersSnap] = await Promise.all([
        fbGet("inviteCodes"),
        fbGet("ladesUsers")
    ]);

    const inviteCodes = inviteCodesSnap || {};
    const users = usersSnap || {};
    const inviteCodeList = objectValuesToArray(inviteCodes);
    const userList = objectValuesToArray(users);

    if (!inviteCodeList.includes(inviteCode)) {
        alert("Geçersiz Davet Kodu!");
        return;
    }

    if (userList.some(u => u.email === email)) {
        alert("Bu e-posta adresi zaten kayıtlı!");
        return;
    }

    if (userList.some(u => u.nickname === nickname)) {
        alert("Bu kullanıcı adı zaten alınmış! Lütfen başka bir nickname seçin.");
        return;
    }

    const newUserKey = email.replace(/\./g, ',');
    await fbSet(`ladesUsers/${newUserKey}`, {
        email,
        password,
        nickname: nickname,
        balance: 0,
        isAdmin: false,
        createdAt: Date.now()
    });

    const inviteKey = Object.keys(inviteCodes).find(k => inviteCodes[k] === inviteCode);
    if (inviteKey) {
        await fbRemove(`inviteCodes/${inviteKey}`);
    }

    alert(`✅ Kayıt başarılı, ${nickname}! 🎉\n\nBaşlangıç bakiyeniz: 0 TOKEN\nToken talebi oluşturabilirsiniz.`);
    window.location.href = "login.html";
}

// ------------------------------------------------------
// NICKNAME VALİDASYON
// ------------------------------------------------------
function validateNickname(nickname) {
    if (!nickname || nickname.length < 3 || nickname.length > 20) return false;
    return /^[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+$/.test(nickname);
}

// ------------------------------------------------------
// DAVET KODU TALEP ET
// ------------------------------------------------------
async function requestInviteCode() {
    const email = document.getElementById("reg-email")?.value.trim();

    if (!email) {
        alert("Lütfen önce E-posta alanını doldurun!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const requestsSnap = await fbGet("adminRequests");
    const requests = requestsSnap || {};

    const existing = objectValuesToArray(requests).some(
        r => r.email === email && r.type === "invite" && r.status === "Bekliyor"
    );

    if (existing) {
        alert("Zaten açık bir talebiniz var.");
        return;
    }

    const reqKey = uniqueId("req");
    await fbSet(`adminRequests/${reqKey}`, {
        id: reqKey,
        type: "invite",
        email,
        status: "Bekliyor",
        createdAt: Date.now()
    });

    // Adminlere bildirim gönder
    if (typeof sendNotificationToAdmins === 'function') {
        await sendNotificationToAdmins({
            title: "📩 Davet Kodu Talebi!",
            message: `${email} kullanıcısı davet kodu talep ediyor!`,
            type: "invite_request",
            link: "dashboard.html?tab=admin",
            data: { email: email }
        });
    }

    alert("✅ Davet kodu talebiniz yöneticiye iletildi! Yönetici onayladığında kodunuz hazır olacak.");
}

// ------------------------------------------------------
// ÇIKIŞ YAP
// ------------------------------------------------------
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = "login.html";
}