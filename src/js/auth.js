// ======================================================
// LADES MODÜL 1: AUTH.JS (GİRİŞ / KAYIT / DAVET)
// ======================================================

async function handleLogin() {
    const emailValue = document.getElementById("email")?.value.trim();
    const passwordValue = document.getElementById("password")?.value;

    if (!emailValue || !passwordValue) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (emailValue === "tsulhan@gmail.com" && passwordValue === "1234") {
        localStorage.setItem("currentUser", "tsulhan@gmail.com");
        window.location.href = "dashboard.html";
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı kuruluyor, lütfen birkaç saniye sonra tekrar deneyin.");
        return;
    }

    try {
        const snapshot = await db.ref("ladesUsers").once("value");
        const users = snapshot.val() || {};
        const firebaseUserKey = emailValue.replace(/\./g, ',');
        const user = users[firebaseUserKey];

        if (user && user.password === String(passwordValue)) {
            localStorage.setItem("currentUser", user.email);
            window.location.href = "dashboard.html";
        } else {
            alert("Hatalı e-posta veya şifre!");
        }
    } catch (error) {
        console.error("Giriş hatası:", error);
        alert("Giriş işlemi sırasında teknik bir hata meydana geldi.");
    }
}

async function handleRegister() {
    const inviteCode = document.getElementById("reg-invite-code")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const passwordConfirm = document.getElementById("reg-password-confirm")?.value;

    if (!inviteCode || !email || !password || !passwordConfirm) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    if (password !== passwordConfirm) {
        alert("Şifreler birbiriyle uyuşmuyor!");
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı henüz kurulamadı. Lütfen birkaç saniye sonra tekrar deneyin.");
        return;
    }

    try {
        const [inviteCodesSnap, usersSnap] = await Promise.all([
            db.ref("inviteCodes").once("value"),
            db.ref("ladesUsers").once("value")
        ]);

        const inviteCodes = inviteCodesSnap.val() || {};
        const users = usersSnap.val() || {};

        const inviteCodeList = Object.values(inviteCodes);
        const userList = Object.values(users);

        if (!inviteCodeList.includes(inviteCode)) {
            alert("Geçersiz veya daha önce kullanılmış bir Davet Kodu girdiniz!");
            return;
        }

        if (userList.some(u => u && u.email === email)) {
            alert("Bu e-posta adresiyle zaten kayıtlı bir kullanıcı mevcut!");
            return;
        }

        const newUserKey = email.replace(/\./g, ',');
        await db.ref(`ladesUsers/${newUserKey}`).set({
            email: email,
            password: String(password),
            balance: 3600,
            isAdmin: false
        });

        const inviteKey = Object.keys(inviteCodes).find(k => inviteCodes[k] === inviteCode);
        if (inviteKey) {
            await db.ref(`inviteCodes/${inviteKey}`).remove();
        }

        alert("🎉 Kayıt başarılı! Başlangıç bakiyeniz (3600 TOKEN) yüklendi.");
        window.location.href = "login.html";

    } catch (error) {
        console.error("Kayıt hatası:", error);
        alert("Bağlantı hatası oluştu: " + error.message);
    }
}

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

    try {
        const snapshot = await db.ref("adminRequests").once("value");
        const requests = snapshot.val() || {};
        
        const existing = Object.values(requests).some(
            r => r && r.email === email && r.type === "invite" && r.status === "Bekliyor"
        );

        if (existing) {
            alert("Zaten açık bir davet kodu talebiniz bulunuyor.");
            return;
        }

        const reqKey = "req_" + Math.random().toString(36).substring(2, 11).toUpperCase();
        await db.ref(`adminRequests/${reqKey}`).set({
            id: reqKey,
            type: "invite",
            email: email,
            status: "Bekliyor",
            createdAt: Date.now()
        });

        alert("Davet kodu talebi yöneticiye iletildi!");
    } catch (error) {
        alert("Talep iletilemedi: " + error.message);
    }
}