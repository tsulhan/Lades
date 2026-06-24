// ======================================================
// LADES APP-FUNCTIONS.JS - ANA FONKSİYONLAR
// ======================================================

// ------------------------------------------------------
// GİRİŞ / KAYIT / DAVET / TOKEN TALEBİ
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

    await sendNotificationToAdmins({
        title: "📩 Davet Kodu Talebi!",
        message: `${email} kullanıcısı davet kodu talep ediyor!`,
        type: "invite_request",
        link: "dashboard.html?tab=admin",
        data: { email: email }
    });

    alert("✅ Davet kodu talebiniz yöneticiye iletildi! Yönetici onayladığında kodunuz hazır olacak.");
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = "login.html";
}

async function openTokenRequestModal() {
    const currentUserEmail = localStorage.getItem("currentUser");
    
    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = "login.html";
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    try {
        const userKey = currentUserEmail.replace(/\./g, ',');
        const user = await fbGet(`ladesUsers/${userKey}`);
        
        if (!user) {
            alert("Kullanıcı bulunamadı!");
            return;
        }

        const currentBalance = user.balance || 0;
        const displayName = user.nickname || currentUserEmail;
        
        const amount = prompt(
            `💰 MEVCUT BAKİYENİZ: ${currentBalance.toLocaleString("tr-TR")} Token\n` +
            `👤 Kullanıcı: ${displayName}\n\n` +
            `Kaç Token talep etmek istiyorsunuz?\n` +
            `(Yönetici onayı gereklidir)`
        );
        
        const tokenAmount = parseInt(amount);

        if (isNaN(tokenAmount) || tokenAmount <= 0) {
            alert("Geçersiz miktar! Lütfen 0'dan büyük bir sayı girin.");
            return;
        }

        const reqKey = uniqueId("req");
        await fbSet(`adminRequests/${reqKey}`, {
            id: reqKey,
            type: "token",
            email: currentUserEmail,
            nickname: user.nickname || currentUserEmail,
            amount: tokenAmount,
            currentBalance: currentBalance,
            status: "Bekliyor",
            createdAt: Date.now()
        });

        await sendNotificationToAdmins({
            title: "💰 Token Talebi!",
            message: `${displayName} (${currentUserEmail}) kullanıcısı ${tokenAmount} Token talep ediyor!`,
            type: "token_request",
            link: "dashboard.html?tab=admin",
            data: { email: currentUserEmail, nickname: displayName, amount: tokenAmount }
        });

        alert(`✅ ${tokenAmount} Token talebiniz yöneticiye iletildi!\n\nYönetici onayladığında bakiyeniz güncellenecektir.`);
        
    } catch (error) {
        console.error("Token talebi hatası:", error);
        alert("❌ Talep gönderilirken bir hata oluştu: " + error.message);
    }
}

// ------------------------------------------------------
// KATEGORİ / FİLTRELEME
// ------------------------------------------------------
function updateChoiceOptions() {
    const categorySelect = document.getElementById("market-category");
    const choiceSelect = document.getElementById("market-choice");

    if (!categorySelect || !choiceSelect) return;

    const drawOption = choiceSelect.querySelector('option[value="DRAW"]');
    if (!drawOption) return;

    if (categorySelect.value === "Spor") {
        drawOption.hidden = false;
        drawOption.disabled = false;
    } else {
        drawOption.hidden = true;
        drawOption.disabled = true;
        if (choiceSelect.value === "DRAW") {
            choiceSelect.value = "YES";
        }
    }
}

function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;

    const buttons = document.querySelectorAll(".sidebar-menu button");
    buttons.forEach(btn => btn.classList.remove("active"));

    buttons.forEach(btn => {
        const text = btn.innerText || "";
        if (categoryName === "Tümü" && text.includes("Tümü")) {
            btn.classList.add("active");
        } else if (text.includes(categoryName)) {
            btn.classList.add("active");
        }
    });

    if (typeof fbGet === "function") {
        fbGet("customMarkets").then(marketsObj => {
            renderMarketGrid(marketsObj || {});
        }).catch(err => console.error("Filtreleme hatası:", err));
    }
}

// ------------------------------------------------------
// LADES OLUŞTUR
// ------------------------------------------------------
async function createNewMarket() {
    console.log("🆕 Lades oluşturma başlatıldı...");
    
    const title = document.getElementById("market-question")?.value.trim();
    const date = document.getElementById("market-date")?.value;
    const time = document.getElementById("market-time")?.value;
    const initialBet = parseInt(document.getElementById("market-initial-bet")?.value);
    const choice = document.getElementById("market-choice")?.value;
    const category = document.getElementById("market-category")?.value;

    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = "login.html";
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    const MIN_BET = 250;
    const MAX_BET = 1000;
    
    if (isNaN(initialBet) || initialBet < MIN_BET) {
        alert(`❌ Lades oluşturmak için minimum ${MIN_BET.toLocaleString("tr-TR")} Token yatırmanız gerekiyor!`);
        return;
    }

    if (initialBet > MAX_BET) {
        alert(`❌ Lades oluşturmak için maksimum ${MAX_BET.toLocaleString("tr-TR")} Token yatırabilirsiniz!`);
        return;
    }

    const userKey = currentUserEmail.replace(/\./g, ',');
    const currentUser = await fbGet(`ladesUsers/${userKey}`);

    if (!currentUser) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (!title || !date || !time) {
        alert("Lütfen tüm alanları doldurun (Başlık, Tarih, Saat)!");
        return;
    }

    const closingDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();

    if (closingDateTime <= now) {
        alert("❌ Kapanış tarihi ve saati şu andan sonraki bir zaman olmalıdır!");
        return;
    }

    const hourDiff = (closingDateTime - now) / (1000 * 60 * 60);
    if (hourDiff < 1) {
        alert("❌ Kapanış saati en az 1 saat sonra olmalıdır!");
        return;
    }

    if (category !== "Spor" && choice === "DRAW") {
        alert("Beraberlik seçeneği yalnızca Spor kategorisinde kullanılabilir.");
        return;
    }

    if (initialBet > (currentUser.balance || 0)) {
        alert(`❌ Yetersiz bakiye! Mevcut bakiyeniz: ${(currentUser.balance || 0).toLocaleString("tr-TR")} Token`);
        return;
    }

    currentUser.balance = parseInt(currentUser.balance) - initialBet;
    await fbSet(`ladesUsers/${userKey}`, currentUser);

    const marketId = uniqueId("market");

    const formattedDateTime = closingDateTime.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const newMarket = {
        id: marketId,
        title,
        date: formattedDateTime,
        dateRaw: closingDateTime.toISOString(),
        yesPool: choice === "YES" ? initialBet : 0,
        noPool: choice === "NO" ? initialBet : 0,
        drawPool: choice === "DRAW" ? initialBet : 0,
        category,
        status: "Aktif",
        createdBy: currentUserEmail,
        createdAt: Date.now()
    };

    await fbSet(`customMarkets/${marketId}`, newMarket);

    const historyKey = uniqueId("history");
    await fbSet(`betHistory/${historyKey}`, {
        id: historyKey,
        marketId,
        email: currentUserEmail,
        choice,
        amount: initialBet,
        createdAt: Date.now()
    });

    await addNewMarketNotification(
        currentUser.nickname || maskUserEmail(currentUserEmail),
        title,
        marketId
    );

    const creatorNickname = currentUser.nickname || maskUserEmail(currentUserEmail);
    await sendNotificationToAllUsers({
        title: "📢 Yeni Lades!",
        message: `${creatorNickname}, "${title}" ladesini oluşturdu! Kapanış: ${formattedDateTime}`,
        type: "new_market",
        marketId: marketId,
        link: "dashboard.html?tab=mevcut-ladesler",
        data: { creator: currentUserEmail, creatorNickname: creatorNickname }
    });

    alert(`⚡ Lades Başarıyla Yaratıldı!\n\n💰 Yatırılan: ${initialBet.toLocaleString("tr-TR")} Token\n⏰ Kapanış: ${formattedDateTime}\n📈 Oranlar dinamik olarak belirlenecek!`);

    document.getElementById("market-question").value = "";
    document.getElementById("market-date").value = "";
    document.getElementById("market-time").value = "";
    document.getElementById("market-initial-bet").value = "";

    if (typeof switchTab === "function") {
        switchTab("mevcut-ladesler");
    }
}

// ------------------------------------------------------
// BAHİS İŞLEMLERİ
// ------------------------------------------------------
function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId;
    activeMarketTitle = marketTitle;
    activeChoice = choice;

    const titleEl = document.getElementById("modal-market-title");
    const choiceEl = document.getElementById("modal-bet-choice");
    const modalEl = document.getElementById("bet-modal");

    if (titleEl) titleEl.innerText = marketTitle;
    if (choiceEl) {
        if (choice === "YES") { choiceEl.innerText = "EVET"; choiceEl.style.color = "#22c55e"; }
        else if (choice === "NO") { choiceEl.innerText = "HAYIR"; choiceEl.style.color = "#ef4444"; }
        else if (choice === "DRAW") { choiceEl.innerText = "BERABERLİK"; choiceEl.style.color = "#f59e0b"; }
    }
    if (modalEl) modalEl.style.display = "flex";
}

function closeModal() {
    const modalEl = document.getElementById("bet-modal");
    const betAmount = document.getElementById("bet-amount");
    if (modalEl) modalEl.style.display = "none";
    if (betAmount) betAmount.value = "";
}

async function confirmBet() {
    const amount = parseInt(document.getElementById("bet-amount")?.value);
    const currentUserEmail = localStorage.getItem("currentUser");

    if (!currentUserEmail) {
        alert("Lütfen önce giriş yapın!");
        window.location.href = "login.html";
        return;
    }

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok.");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        alert("Geçersiz miktar!");
        return;
    }

    const MIN_BET = 250;
    const MAX_BET = 1000;
    
    if (amount < MIN_BET) {
        alert(`❌ Minimum bahis miktarı ${MIN_BET.toLocaleString("tr-TR")} Token'dır!`);
        return;
    }

    if (amount > MAX_BET) {
        alert(`❌ Maksimum bahis miktarı ${MAX_BET.toLocaleString("tr-TR")} Token'dır!`);
        return;
    }

    const userKey = currentUserEmail.replace(/\./g, ',');
    const currentUser = await fbGet(`ladesUsers/${userKey}`);

    if (!currentUser) {
        alert("Kullanıcı bulunamadı!");
        return;
    }

    if (amount > (currentUser.balance || 0)) {
        alert(`❌ Yetersiz bakiye! Mevcut bakiyeniz: ${(currentUser.balance || 0).toLocaleString("tr-TR")} Token`);
        return;
    }

    const target = await fbGet(`customMarkets/${activeMarketId}`);
    if (!target) {
        alert("Lades bulunamadı!");
        return;
    }

    const closingDate = target.dateRaw ? new Date(target.dateRaw) : new Date(target.date);
    const now = new Date();

    if (now > closingDate) {
        alert(`❌ Bu ladesin kapanış tarihi (${target.date}) geçti! Artık bahis yapılamaz.`);
        closeModal();
        return;
    }

    const timeDiff = closingDate - now;
    const minutesLeft = Math.floor(timeDiff / 60000);
    if (minutesLeft < 5 && minutesLeft > 0) {
        alert(`⚠️ Bu lades ${minutesLeft} dakika içinde kapanacak! Son bahislerinizi yapın.`);
    }

    currentUser.balance = parseInt(currentUser.balance) - amount;
    await fbSet(`ladesUsers/${userKey}`, currentUser);

    if (activeChoice === "YES") {
        target.yesPool = (target.yesPool || 0) + amount;
    } else if (activeChoice === "NO") {
        target.noPool = (target.noPool || 0) + amount;
    } else if (activeChoice === "DRAW") {
        target.drawPool = (target.drawPool || 0) + amount;
    }

    await fbSet(`customMarkets/${activeMarketId}`, target);

    const historyKey = uniqueId("history");
    await fbSet(`betHistory/${historyKey}`, {
        id: historyKey,
        marketId: activeMarketId,
        email: currentUserEmail,
        choice: activeChoice,
        amount,
        createdAt: Date.now()
    });

    await addLiveBet(
        currentUser.nickname || maskUserEmail(currentUserEmail),
        target.title,
        activeChoice,
        amount,
        activeMarketId
    );

    const bettorNickname = currentUser.nickname || maskUserEmail(currentUserEmail);
    await sendBetNotificationToParticipants(activeMarketId, currentUserEmail, activeChoice, amount, target.title, bettorNickname);

    alert(`✅ ${amount.toLocaleString("tr-TR")} Token başarıyla yatırıldı!`);
    closeModal();
}

// ------------------------------------------------------
// LADES SONUÇLANDIRMA (KOMİSYON + OTOMATİK ORAN)
// ------------------------------------------------------
async function finalizeLades(marketId, winningChoice) {
    if (typeof db === "undefined" || !db) return;

    const marketsSnap = await fbGet("customMarkets");
    const markets = marketsSnap || {};
    const market = markets[marketId];

    if (!market) {
        alert("❌ Lades bulunamadı!");
        return;
    }

    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalPool = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);
    
    const COMMISSION_RATE = 0.05;
    const commission = Math.floor(totalPool * COMMISSION_RATE);
    const distributedPool = totalPool - commission;

    let winningPool = 0;
    let winningChoiceName = "";
    
    if (winningChoice === "YES") {
        winningPool = yesPool;
        winningChoiceName = "EVET";
    } else if (winningChoice === "NO") {
        winningPool = noPool;
        winningChoiceName = "HAYIR";
    } else if (winningChoice === "DRAW") {
        winningPool = drawPool;
        winningChoiceName = "BERABERLİK";
    }

    if (totalPool === 0 || winningPool === 0) {
        alert(`⚠️ ${winningChoiceName} havuzu boş veya toplam havuz 0. Lades kapatıldı.`);
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        return;
    }

    const historySnap = await fbGet("betHistory");
    const history = historySnap || {};
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};

    const winners = Object.values(history).filter(h => h.marketId === marketId && h.choice === winningChoice);

    if (winners.length === 0) {
        alert(`⚠️ ${winningChoiceName} seçeneğine bahis yapan kimse yok. Lades kapatıldı.`);
        market.status = "Sonuçlandı";
        await fbSet(`customMarkets/${marketId}`, market);
        return;
    }

    const odds = {
        YES: totalPool / (yesPool || 1),
        NO: totalPool / (noPool || 1),
        DRAW: totalPool / (drawPool || 1)
    };

    const winningOdds = odds[winningChoice] || 1;

    let totalDistributed = 0;
    const distributionResults = [];

    winners.forEach(winner => {
        const userEntry = Object.entries(users).find(([key, u]) => u.email === winner.email);
        if (!userEntry) return;

        const [userKey, userObj] = userEntry;
        
        const rawReward = Math.floor(winner.amount * winningOdds);
        const rewardAmount = Math.min(rawReward, distributedPool);

        userObj.balance = (userObj.balance || 0) + rewardAmount;
        users[userKey] = userObj;
        totalDistributed += rewardAmount;

        distributionResults.push({
            email: winner.email,
            nickname: userObj.nickname || maskUserEmail(winner.email),
            amount: winner.amount,
            odds: winningOdds.toFixed(2) + 'x',
            reward: rewardAmount,
            share: ((winner.amount / winningPool) * 100).toFixed(2) + '%'
        });
    });

    await addToSystemPool(commission);

    await fbSet("ladesUsers", users);
    market.status = "Sonuçlandı";
    await fbSet(`customMarkets/${marketId}`, market);

    const allParticipants = Object.values(history).filter(h => h.marketId === marketId);
    
    const resultPromises = allParticipants.map(async (participant) => {
        const isWinner = winners.some(w => w.email === participant.email);
        const winAmount = isWinner ? 
            distributionResults.find(r => r.email === participant.email)?.reward || 0 : 0;
        
        const userEntry = Object.entries(users).find(([key, u]) => u.email === participant.email);
        const displayName = userEntry ? userEntry[1].nickname || maskUserEmail(participant.email) : maskUserEmail(participant.email);
        
        let title = isWinner ? "🎉 Kazandınız!" : "😔 Kaybettiniz";
        let message = isWinner ? 
            `${market.title} ladesinde ${winAmount.toLocaleString("tr-TR")} Token kazandınız! 🏆` :
            `${market.title} ladesinde ${participant.amount.toLocaleString("tr-TR")} Token kaybettiniz.`;

        return createNotification(participant.email, {
            title: title,
            message: message,
            type: "result",
            marketId: marketId,
            link: "profil.html",
            data: { isWinner, winAmount, lostAmount: participant.amount }
        });
    });
    await Promise.all(resultPromises);

    const remainingTokens = distributedPool - totalDistributed;
    
    let distributionDetails = distributionResults.map(r => 
        `  • ${r.nickname}: ${r.amount} Token × ${r.odds} = ${r.reward} Token kazandı (${r.share})`
    ).join('\n');

    alert(`🎉 ${winningChoiceName} KAZANDI!\n\n` +
          `📊 Toplam Havuz: ${totalPool.toLocaleString("tr-TR")} Token\n` +
          `💰 Komisyon (%5): ${commission.toLocaleString("tr-TR")} Token (Sistem Havuzu)\n` +
          `💵 Dağıtılan: ${totalDistributed.toLocaleString("tr-TR")} Token\n` +
          `📦 Kalan: ${remainingTokens.toLocaleString("tr-TR")} Token\n` +
          `👥 Kazanan Sayısı: ${winners.length}\n` +
          `📈 Kazanan Oran: ${winningOdds.toFixed(2)}x\n\n` +
          `📋 DAĞITIM DETAYLARI:\n${distributionDetails}\n\n` +
          `✅ Oran bazlı + %5 komisyon sistemi ile dağıtım yapıldı!`);
}

async function addToSystemPool(amount) {
    if (typeof db === "undefined" || !db || amount <= 0) return;
    
    try {
        const currentPool = await fbGet("systemPool") || 0;
        await fbSet("systemPool", currentPool + amount);
        console.log(`💰 Sistem havuzuna ${amount} Token eklendi. Toplam: ${currentPool + amount}`);
    } catch (error) {
        console.error("Sistem havuzu güncelleme hatası:", error);
    }
}

// ------------------------------------------------------
// LADES SİLME
// ------------------------------------------------------
async function deleteMarketCompletely(marketId, marketTitle) {
    if (typeof db === "undefined" || !db) {
        alert("❌ Firebase bağlantısı yok!");
        return;
    }

    const currentUserEmail = localStorage.getItem("currentUser");
    if (currentUserEmail !== "tsulhan@gmail.com") {
        alert("❌ Bu işlem sadece yönetici tarafından yapılabilir!");
        return;
    }

    const confirmation = confirm(
        `"${marketTitle}" isimli AKTİF ladesi silmek istediğinize emin misiniz?\n\n` +
        `⚠️ BU İŞLEM:\n` +
        `1- Ladesi tamamen kaldırır.\n` +
        `2- Bu ladese oynayan TÜM KULLANICILARIN tokenlarını hesaplarına İADE eder!\n` +
        `3- Tüm bahis geçmişini siler.\n\n` +
        `Bu işlem geri alınamaz!`
    );
    
    if (!confirmation) return;

    try {
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#0b132b; padding:20px 40px; border-radius:12px; border:1px solid #24ffff; color:#24ffff; font-weight:bold; z-index:9999;';
        loadingMsg.innerHTML = '⏳ Lades siliniyor ve tokenlar iade ediliyor...';
        document.body.appendChild(loadingMsg);

        const marketSnapshot = await db.ref(`customMarkets/${marketId}`).once("value");
        const marketData = marketSnapshot.val();
        
        if (!marketData) {
            alert("❌ Lades bulunamadı! Zaten silinmiş olabilir.");
            document.body.removeChild(loadingMsg);
            return;
        }

        const [betHistorySnapshot, usersSnapshot] = await Promise.all([
            db.ref("betHistory").once("value"),
            db.ref("ladesUsers").once("value")
        ]);

        const allHistories = betHistorySnapshot.val() || {};
        const allUsers = usersSnapshot.val() || {};

        const deletePromises = [];
        const userUpdates = { ...allUsers };
        let refundedTokenCount = 0;
        let affectedUsersCount = 0;

        Object.keys(allHistories).forEach(historyKey => {
            const bet = allHistories[historyKey];
            
            if (bet && bet.marketId === marketId) {
                const userEmail = bet.email;
                const betAmount = parseInt(bet.amount || 0);

                if (userEmail && betAmount > 0) {
                    const userCleanKey = userEmail.replace(/\./g, ',');
                    
                    if (userUpdates[userCleanKey]) {
                        const currentBalance = parseInt(userUpdates[userCleanKey].balance) || 0;
                        userUpdates[userCleanKey].balance = currentBalance + betAmount;
                        refundedTokenCount += betAmount;
                        affectedUsersCount++;
                    }
                }
                deletePromises.push(db.ref(`betHistory/${historyKey}`).remove());
            }
        });

        if (affectedUsersCount > 0) {
            await db.ref("ladesUsers").set(userUpdates);
        }

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }

        await db.ref(`customMarkets/${marketId}`).remove();

        document.body.removeChild(loadingMsg);

        alert(`✅ "${marketTitle}" başarıyla silindi!\n\n` +
              `👥 Etkilenen Kullanıcı: ${affectedUsersCount}\n` +
              `💰 İade Edilen Toplam Token: ${refundedTokenCount.toLocaleString("tr-TR")}`);
        
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error("❌ Lades silme ve iade hatası:", error);
        alert("❌ İşlem sırasında bir hata oluştu: " + error.message);
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
    }
}

async function deleteMarketFromHistory(marketId, marketTitle) {
    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok!");
        return;
    }

    const currentUserEmail = localStorage.getItem("currentUser");
    if (currentUserEmail !== "tsulhan@gmail.com") {
        alert("❌ Bu işlem sadece yönetici tarafından yapılabilir!");
        return;
    }

    const confirmation = confirm(
        `"${marketTitle}" isimli GEÇMİŞ ladesi silmek istediğinize emin misiniz?\n\n` +
        `⚠️ BU İŞLEM:\n` +
        `1- Ladesi geçmişten tamamen kaldırır.\n` +
        `2- Bu ladese ait tüm bahis geçmişini siler.\n` +
        `3- Kullanıcıların tokenlarına DOKUNULMAZ (Zaten dağıtıldı).\n\n` +
        `Bu işlem geri alınamaz!`
    );
    
    if (!confirmation) return;

    try {
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#0b132b; padding:20px 40px; border-radius:12px; border:1px solid #94a3b8; color:#94a3b8; font-weight:bold; z-index:9999;';
        loadingMsg.innerHTML = '⏳ Geçmiş lades siliniyor...';
        document.body.appendChild(loadingMsg);

        await db.ref(`customMarkets/${marketId}`).remove();
        
        const betHistorySnapshot = await db.ref("betHistory").once("value");
        const allHistories = betHistorySnapshot.val() || {};
        
        const deletePromises = [];
        let deletedCount = 0;
        
        Object.keys(allHistories).forEach(historyKey => {
            const bet = allHistories[historyKey];
            if (bet && bet.marketId === marketId) {
                deletePromises.push(db.ref(`betHistory/${historyKey}`).remove());
                deletedCount++;
            }
        });

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }

        document.body.removeChild(loadingMsg);

        alert(`✅ "${marketTitle}" geçmişten başarıyla silindi!\n\n🗑️ ${deletedCount} adet bahis kaydı temizlendi.`);
        
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error("❌ Lades silme hatası:", error);
        alert("❌ Lades silinirken bir hata oluştu: " + error.message);
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
    }
}

// ------------------------------------------------------
// BİLDİRİM SİSTEMİ
// ------------------------------------------------------
async function createNotification(userEmail, notificationData) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const userKey = userEmail.replace(/\./g, ',');
        const notifKey = uniqueId("notif");
        
        const notification = {
            id: notifKey,
            title: notificationData.title || "Bildirim",
            message: notificationData.message || "",
            type: notificationData.type || "general",
            read: false,
            createdAt: Date.now(),
            marketId: notificationData.marketId || null,
            link: notificationData.link || "#",
            data: notificationData.data || {}
        };
        
        await fbSet(`notifications/${userKey}/${notifKey}`, notification);
        return true;
    } catch (error) {
        console.error("Bildirim oluşturma hatası:", error);
        return false;
    }
}

async function sendNotificationToAllUsers(notificationData) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        
        const promises = Object.keys(users).map(userKey => {
            const user = users[userKey];
            if (user && user.email) {
                return createNotification(user.email, notificationData);
            }
            return Promise.resolve();
        });
        
        await Promise.all(promises);
        console.log("✅ Tüm kullanıcılara bildirim gönderildi");
        return true;
    } catch (error) {
        console.error("Toplu bildirim hatası:", error);
        return false;
    }
}

async function sendNotificationToAdmins(notificationData) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        
        const promises = Object.keys(users).map(userKey => {
            const user = users[userKey];
            if (user && (user.isAdmin || user.email === "tsulhan@gmail.com")) {
                return createNotification(user.email, notificationData);
            }
            return Promise.resolve();
        });
        
        await Promise.all(promises);
        console.log("✅ Adminlere bildirim gönderildi");
        return true;
    } catch (error) {
        console.error("Admin bildirim hatası:", error);
        return false;
    }
}

async function sendBetNotificationToParticipants(marketId, bettorEmail, choice, amount, marketTitle, bettorNickname) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const historySnap = await fbGet("betHistory");
        const history = historySnap || {};
        
        const participants = Object.values(history)
            .filter(h => h.marketId === marketId && h.email !== bettorEmail)
            .map(h => h.email);
        
        const uniqueParticipants = [...new Set(participants)];
        
        if (uniqueParticipants.length === 0) {
            console.log("ℹ️ Bu ladese katılan başka kullanıcı yok, bildirim gönderilmedi.");
            return;
        }

        const choiceText = choice === "YES" ? "EVET" : (choice === "NO" ? "HAYIR" : "BERABERLİK");
        const displayName = bettorNickname || maskUserEmail(bettorEmail);

        const promises = uniqueParticipants.map(email => {
            return createNotification(email, {
                title: "💰 Yeni Bahis!",
                message: `${displayName}, "${marketTitle}" ladesinde ${choiceText} seçeneğine ${amount.toLocaleString("tr-TR")} Token yatırdı!`,
                type: "new_bet",
                marketId: marketId,
                link: "dashboard.html?tab=mevcut-ladesler",
                data: { bettor: bettorEmail, choice: choice, amount: amount }
            });
        });

        await Promise.all(promises);
        console.log(`✅ ${uniqueParticipants.length} kullanıcıya bahis bildirimi gönderildi`);
        
    } catch (error) {
        console.error("Bahis bildirimi gönderme hatası:", error);
    }
}

async function getNotifications(userEmail) {
    if (typeof db === "undefined" || !db) return [];
    
    try {
        const userKey = userEmail.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap || {};
        
        return Object.values(notifications)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("Bildirim getirme hatası:", error);
        return [];
    }
}

async function toggleNotificationDropdown() {
    const dropdown = document.getElementById("notification-dropdown");
    const list = document.getElementById("notification-list");
    
    if (!dropdown) return;
    
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
        return;
    }
    
    dropdown.style.display = "block";
    
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        list.innerHTML = `
            <div style="text-align: center; color: #64748b; padding: 30px; font-size: 13px;">
                Lütfen giriş yapın.
            </div>
        `;
        return;
    }
    
    const notifications = await getNotifications(currentUser);
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; color: #64748b; padding: 30px; font-size: 13px;">
                📭 Bildirim bulunmuyor.
            </div>
        `;
        return;
    }
    
    list.innerHTML = notifications.map(notif => {
        const timeAgo = getTimeAgo(notif.createdAt);
        const isUnread = !notif.read ? 'unread' : '';
        const badgeClass = `notif-badge-${notif.type}`;
        
        return `
            <div class="notification-item ${isUnread}" onclick="markNotificationAsRead('${notif.id}')">
                <div class="notif-title">${notif.title}</div>
                <div class="notif-message">${notif.message}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span class="notif-time">${timeAgo}</span>
                    <span class="notif-badge ${badgeClass}">${getNotificationTypeText(notif.type)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getNotificationTypeText(type) {
    const types = {
        'new_market': 'Yeni Lades',
        'new_bet': 'Yeni Bahis',
        'closing': 'Kapanış Uyarısı',
        'result': 'Sonuç',
        'token_request': 'Token Talebi',
        'invite_request': 'Davet Talebi'
    };
    return types[type] || 'Genel';
}

async function markNotificationAsRead(notificationId) {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        await db.ref(`notifications/${userKey}/${notificationId}/read`).set(true);
        updateNotificationBadge();
    } catch (error) {
        console.error("Bildirim okundu hatası:", error);
    }
}

async function markAllNotificationsAsRead() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap || {};
        
        const promises = Object.keys(notifications).map(key => {
            return db.ref(`notifications/${userKey}/${key}/read`).set(true);
        });
        
        await Promise.all(promises);
        updateNotificationBadge();
        await toggleNotificationDropdown();
    } catch (error) {
        console.error("Tümünü okundu hatası:", error);
    }
}

async function updateNotificationBadge() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;
    
    try {
        const userKey = currentUser.replace(/\./g, ',');
        const notifSnap = await fbGet(`notifications/${userKey}`);
        const notifications = notifSnap || {};
        
        const unreadCount = Object.values(notifications).filter(n => !n.read).length;
        const badge = document.getElementById("notification-badge");
        
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = "inline-block";
                badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
            } else {
                badge.style.display = "none";
            }
        }
    } catch (error) {
        console.error("Rozet güncelleme hatası:", error);
    }
}

function startNotificationListener() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`notifications/${userKey}`).on("value", () => {
        updateNotificationBadge();
    });
}

// ------------------------------------------------------
// CHAT SİSTEMİ
// ------------------------------------------------------
let currentChatTab = 'global';
let currentMarketIdForChat = null;
let chatMessageListener = null;
let chatUnreadCount = 0;
let chatMinimized = false;

function toggleChatMinimize() {
    const panel = document.getElementById('chat-panel');
    const icon = document.getElementById('chat-minimize-icon');
    
    if (!panel) return;
    
    chatMinimized = !chatMinimized;
    
    if (chatMinimized) {
        panel.classList.add('minimized');
        if (icon) icon.className = 'fa-solid fa-plus';
    } else {
        panel.classList.remove('minimized');
        if (icon) icon.className = 'fa-solid fa-minus';
    }
}

async function clearChatHistory() {
    const currentUserEmail = localStorage.getItem("currentUser");
    
    if (currentUserEmail !== "tsulhan@gmail.com") {
        alert("❌ Bu işlem sadece yönetici tarafından yapılabilir!");
        return;
    }
    
    const chatType = confirm(
        "🔄 Chat Geçmişi Temizleme\n\n" +
        "Hangi chat odasını temizlemek istiyorsunuz?\n" +
        "• 'Tamam' → Tüm chatleri temizle\n" +
        "• 'İptal' → Sadece aktif chat'i temizle"
    );
    
    const confirmMessage = chatType ?
        "⚠️ TÜM CHAT GEÇMİŞİNİ (Global + Tüm Lades Chati) silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!" :
        `⚠️ "${currentChatTab === 'global' ? 'Global Chat' : 'Lades Chat'}" odasını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`;
    
    if (!confirm(confirmMessage)) return;
    
    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok!");
        return;
    }
    
    try {
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#0b132b; padding:20px 40px; border-radius:12px; border:1px solid #24ffff; color:#24ffff; font-weight:bold; z-index:9999;';
        loadingMsg.innerHTML = '⏳ Chat geçmişi temizleniyor...';
        document.body.appendChild(loadingMsg);
        
        if (chatType) {
            await fbRemove("chats");
            alert("✅ Tüm chat geçmişi başarıyla temizlendi!");
        } else {
            let chatPath = 'chats/global';
            if (currentChatTab === 'market' && currentMarketIdForChat) {
                chatPath = `chats/market_${currentMarketIdForChat}`;
            }
            await fbRemove(chatPath);
            alert(`✅ "${currentChatTab === 'global' ? 'Global Chat' : 'Lades Chat'}" başarıyla temizlendi!`);
        }
        
        document.body.removeChild(loadingMsg);
        loadChatMessages(currentChatTab);
        
    } catch (error) {
        console.error("Chat temizleme hatası:", error);
        alert("❌ Chat temizlenirken bir hata oluştu: " + error.message);
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
    }
}

function toggleChatPanel() {
    const panel = document.getElementById('chat-panel');
    const toggleBtn = document.getElementById('chat-toggle-btn');
    
    if (!panel) return;
    
    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        if (toggleBtn) toggleBtn.classList.remove('hidden');
    } else {
        panel.classList.add('open');
        if (toggleBtn) toggleBtn.classList.add('hidden');
        chatUnreadCount = 0;
        const badge = document.getElementById('chat-unread-badge');
        if (badge) badge.style.display = 'none';
        loadChatMessages(currentChatTab);
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 300);
    }
}

function switchChatTab(tab) {
    currentChatTab = tab;
    
    document.querySelectorAll('.chat-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTab = document.querySelector(`.chat-tab[data-chat="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    const marketTab = document.getElementById('market-chat-tab');
    if (tab === 'market' && currentMarketIdForChat) {
        if (marketTab) {
            marketTab.style.display = 'block';
            marketTab.textContent = `📊 ${activeMarketTitle || 'Lades'}`;
        }
    } else {
        if (marketTab) marketTab.style.display = 'none';
    }
    
    loadChatMessages(tab);
}

async function loadChatMessages(tab) {
    if (typeof db === "undefined" || !db) return;
    
    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    if (!messagesContainer) return;
    
    if (chatMessageListener) {
        chatMessageListener();
        chatMessageListener = null;
    }
    
    let chatPath = 'chats/global';
    if (tab === 'market' && currentMarketIdForChat) {
        chatPath = `chats/market_${currentMarketIdForChat}`;
    }
    
    messagesContainer.innerHTML = `
        <div style="text-align:center; color:#64748b; padding:30px; font-size:13px;">
            💬 Yükleniyor...
        </div>
    `;
    
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    
    chatMessageListener = fbRef(chatPath).on('value', (snapshot) => {
        const data = snapshot.val();
        const messages = data ? Object.values(data).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)) : [];
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:30px; font-size:13px;">
                    💬 Henüz mesaj yok. İlk mesajı sen gönder!
                </div>
            `;
            if (input) input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            return;
        }
        
        const currentUser = localStorage.getItem('currentUser');
        
        messagesContainer.innerHTML = messages.map(msg => {
            const isOwn = msg.senderEmail === currentUser;
            const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
            
            return `
                <div class="chat-message ${isOwn ? 'sent' : 'received'}">
                    <div class="sender">${escapeHtml(msg.sender)}</div>
                    <div class="message-text">${escapeHtml(msg.message)}</div>
                    <div class="time">${time}</div>
                </div>
            `;
        }).join('');
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        
        const panel = document.getElementById('chat-panel');
        if (!panel || !panel.classList.contains('open')) {
            chatUnreadCount++;
            const badge = document.getElementById('chat-unread-badge');
            if (badge) {
                badge.textContent = chatUnreadCount;
                badge.style.display = 'inline-block';
            }
        }
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;
    if (typeof db === "undefined" || !db) return;
    
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
    }
    
    const userKey = currentUser.replace(/\./g, ',');
    const userSnap = await fbGet(`ladesUsers/${userKey}`);
    const displayName = userSnap?.nickname || maskUserEmail(currentUser);
    
    let chatPath = 'chats/global';
    if (currentChatTab === 'market' && currentMarketIdForChat) {
        chatPath = `chats/market_${currentMarketIdForChat}`;
    }
    
    const messageId = uniqueId('msg');
    await fbSet(`${chatPath}/${messageId}`, {
        sender: displayName,
        senderEmail: currentUser,
        message: message,
        timestamp: Date.now()
    });
    
    input.value = '';
    input.focus();
}

function openMarketChat(marketId, marketTitle) {
    currentMarketIdForChat = marketId;
    activeMarketTitle = marketTitle;
    
    const panel = document.getElementById('chat-panel');
    if (!panel || !panel.classList.contains('open')) {
        toggleChatPanel();
    }
    
    const marketTab = document.getElementById('market-chat-tab');
    if (marketTab) {
        marketTab.style.display = 'block';
        marketTab.textContent = `📊 ${marketTitle}`;
    }
    
    switchChatTab('market');
}

function closeMarketChat() {
    currentMarketIdForChat = null;
    switchChatTab('global');
    const marketTab = document.getElementById('market-chat-tab');
    if (marketTab) marketTab.style.display = 'none';
}

function startChatSystem() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    const currentUserEmail = localStorage.getItem('currentUser');
    const clearBtn = document.getElementById('chat-clear-btn');
    if (clearBtn) {
        if (currentUserEmail === "tsulhan@gmail.com") {
            clearBtn.style.display = 'inline-block';
        } else {
            clearBtn.style.display = 'none';
        }
    }
    
    setTimeout(() => {
        loadChatMessages('global');
    }, 500);
}

// ------------------------------------------------------
// PROFİL SAYFASI
// ------------------------------------------------------
async function initProfilePage() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) {
        window.location.href = "login.html";
        return;
    }

    const emailEl = document.getElementById("profile-email");
    if (emailEl) emailEl.innerText = currentUserEmail;

    if (typeof db === "undefined" || !db) return;

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    fbRef(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        const user = snapshot.val();
        if (user) {
            const displayName = user.nickname || user.email;
            const balEl = document.getElementById("profile-token-balance");
            if (balEl) balEl.innerText = (user.balance || 0).toLocaleString("tr-TR");
            
            const nameEl = document.getElementById("profile-username");
            if (nameEl) nameEl.innerText = displayName;
        }
    });

    try {
        const [marketsSnap, historySnap] = await Promise.all([
            fbGet("customMarkets"),
            fbGet("betHistory")
        ]);

        const markets = marketsSnap || {};
        const history = historySnap || {};

        renderProfileBets(currentUserEmail, markets, history);
    } catch (err) {
        console.error("Profil verileri yüklenirken hata oluştu:", err);
    }
}

function renderProfileBets(currentUserEmail, markets, history) {
    const activeContainer = document.getElementById("profile-active-bets");
    const pastContainer = document.getElementById("profile-past-bets");

    if (!activeContainer || !pastContainer) return;

    activeContainer.innerHTML = "";
    pastContainer.innerHTML = "";

    const allBets = Object.values(history)
        .filter(b => b && b.email === currentUserEmail)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    let activeCount = 0;
    let pastCount = 0;

    if (allBets.length === 0) {
        const noDataHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Henüz hiçbir ladese katılmadınız.</div>`;
        activeContainer.innerHTML = noDataHTML;
        pastContainer.innerHTML = noDataHTML;
        return;
    }

    allBets.forEach(bet => {
        const market = markets[bet.marketId];
        if (!market) return;

        const yesPool = market.yesPool || 0;
        const noPool = market.noPool || 0;
        const drawPool = market.drawPool || 0;
        const totalPool = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);

        let choiceBadge = "";
        if (bet.choice === "YES") choiceBadge = `<span class="badge-choice badge-yes">EVET YATIRDI</span>`;
        if (bet.choice === "NO") choiceBadge = `<span class="badge-choice badge-no">HAYIR YATIRDI</span>`;
        if (bet.choice === "DRAW") choiceBadge = `<span class="badge-choice badge-draw">BERABERLİK YATIRDI</span>`;

        if (market.status === "Aktif") {
            activeCount++;
            activeContainer.innerHTML += `
                <div class="user-bet-card">
                    <div class="bet-details">
                        <h3>${market.title}</h3>
                        <p>Kategori: <b>${market.category || "Genel"}</b> • Bitiş: ${market.date || "-"}</p>
                        <div style="margin-top: 8px;">${choiceBadge}</div>
                    </div>
                    <div class="bet-stats">
                        <div class="stat-box">
                            <div class="lbl">Sizin Yatırımınız</div>
                            <div class="val" style="color: #24ffff;">${(bet.amount || 0).toLocaleString("tr-TR")} Token</div>
                        </div>
                        <div class="stat-box" style="border-left: 1px solid #1c2541; padding-left: 20px;">
                            <div class="lbl">Toplam Havuz</div>
                            <div class="val" style="color: white;">${totalPool.toLocaleString("tr-TR")} Token</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            pastCount++;
            let resultHTML = "";
            let winningChoice = "";

            if (yesPool >= noPool && yesPool >= drawPool) winningChoice = "YES";
            else if (noPool >= yesPool && noPool >= drawPool) winningChoice = "NO";
            else if (drawPool >= yesPool && drawPool >= noPool) winningChoice = "DRAW";

            if (bet.choice === winningChoice) {
                const winningPool = winningChoice === "YES" ? yesPool : (winningChoice === "NO" ? noPool : drawPool);
                const winAmount = Math.round((bet.amount / winningPool) * totalPool);
                resultHTML = `<span class="result-win">+${winAmount.toLocaleString("tr-TR")} Token Kazandın 🏆</span>`;
            } else {
                resultHTML = `<span class="result-lose">-${bet.amount.toLocaleString("tr-TR")} Token Kaybedildi</span>`;
            }

            pastContainer.innerHTML += `
                <div class="user-bet-card" style="border-color: #161b2c; background: #060b19;">
                    <div class="bet-details">
                        <h3 style="color: #94a3b8;">${market.title}</h3>
                        <p>Kategori: ${market.category || "Genel"} • Durum: <span style="color:#ff4aa2; font-weight:600;">Sonuçlandı</span></p>
                        <div style="margin-top: 8px;">${choiceBadge}</div>
                    </div>
                    <div class="bet-stats">
                        <div class="stat-box">
                            <div class="lbl">Yatırdığınız</div>
                            <div class="val" style="color: #94a3b8;">${(bet.amount || 0).toLocaleString("tr-TR")} Token</div>
                        </div>
                        <div class="stat-box" style="border-left: 1px solid #1c2541; padding-left: 20px; min-width: 140px;">
                            <div class="lbl">Sonuç</div>
                            <div class="val">${resultHTML}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    if (activeCount === 0) {
        activeContainer.innerHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Şu an aktif ladesiniz bulunmuyor.</div>`;
    }
    if (pastCount === 0) {
        pastContainer.innerHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">Henüz sonuçlanan lades geçmişiniz yok.</div>`;
    }
}

// ------------------------------------------------------
// OTOMATİK LADES KAPATMA (ZAMANLAYICI)
// ------------------------------------------------------
async function checkAndCloseMarkets() {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const marketsSnap = await fbGet("customMarkets");
        const markets = marketsSnap || {};
        const now = new Date();
        let closedCount = 0;
        
        for (const [key, market] of Object.entries(markets)) {
            if (market.status === "Aktif" && market.dateRaw) {
                const closingDate = new Date(market.dateRaw);
                if (now > closingDate) {
                    market.status = "Kapatıldı";
                    await fbSet(`customMarkets/${key}`, market);
                    closedCount++;
                    console.log(`✅ "${market.title}" ladesi otomatik kapatıldı.`);
                }
            }
        }
        
        if (closedCount > 0) {
            console.log(`📊 ${closedCount} lades otomatik kapatıldı.`);
            const marketsSnap2 = await fbGet("customMarkets");
            if (typeof renderMarketGrid === 'function') {
                renderMarketGrid(marketsSnap2 || {});
            }
        }
    } catch (error) {
        console.error("Otomatik kapatma hatası:", error);
    }
}

setInterval(checkAndCloseMarkets, 30 * 1000);