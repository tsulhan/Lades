// ======================================================
// BETTING MODÜLÜ - Bahis İşlemleri ve Dağıtım
// ======================================================

// ------------------------------------------------------
// BAHİS MODAL'INI AÇ
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

// ------------------------------------------------------
// MODAL'ı KAPAT
// ------------------------------------------------------
function closeModal() {
    const modalEl = document.getElementById("bet-modal");
    const betAmount = document.getElementById("bet-amount");
    if (modalEl) modalEl.style.display = "none";
    if (betAmount) betAmount.value = "";
}

// ------------------------------------------------------
// BAHİS ONAYLA
// ------------------------------------------------------
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

    // Bahis bildirimi - nickname ile
    const bettorNickname = currentUser.nickname || maskUserEmail(currentUserEmail);
    if (typeof sendBetNotificationToParticipants === 'function') {
        await sendBetNotificationToParticipants(activeMarketId, currentUserEmail, activeChoice, amount, target.title, bettorNickname);
    }

    alert(`✅ ${amount.toLocaleString("tr-TR")} Token başarıyla yatırıldı!`);
    closeModal();
}

// ------------------------------------------------------
// LADESİ SONUÇLANDIR
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
        alert(`⚠️ ${winningChoiceName} havuzu boş veya toplam havuz 0. Lades kapatıldı ama dağıtım yapılmadı.`);
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

    // Basit oransal dağıtım
    let totalDistributed = 0;
    const distributionResults = [];

    winners.forEach(winner => {
        const userEntry = Object.entries(users).find(([key, u]) => u.email === winner.email);
        if (!userEntry) return;

        const [userKey, userObj] = userEntry;
        const userShare = winner.amount / winningPool;
        let rewardAmount = Math.floor(userShare * totalPool);
        if (rewardAmount === 0) rewardAmount = 1;

        userObj.balance = (userObj.balance || 0) + rewardAmount;
        users[userKey] = userObj;
        totalDistributed += rewardAmount;

        distributionResults.push({
            email: winner.email,
            nickname: userObj.nickname || maskUserEmail(winner.email),
            amount: winner.amount,
            reward: rewardAmount,
            share: (userShare * 100).toFixed(2) + '%'
        });
    });

    await fbSet("ladesUsers", users);
    market.status = "Sonuçlandı";
    await fbSet(`customMarkets/${marketId}`, market);

    // Sonuç bildirimi - nickname ile
    const allParticipants = Object.values(history).filter(h => h.marketId === marketId);
    
    if (typeof createNotification === 'function') {
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
    }

    const remainingTokens = totalPool - totalDistributed;
    
    let distributionDetails = distributionResults.map(r => 
        `  • ${r.nickname}: ${r.amount} Token → ${r.reward} Token kazandı (${r.share})`
    ).join('\n');

    alert(`🎉 ${winningChoiceName} KAZANDI!\n\n` +
          `📊 Toplam Havuz: ${totalPool.toLocaleString("tr-TR")} Token\n` +
          `💰 Dağıtılan: ${totalDistributed.toLocaleString("tr-TR")} Token\n` +
          `📦 Kalan: ${remainingTokens.toLocaleString("tr-TR")} Token (küsürat)\n` +
          `👥 Kazanan Sayısı: ${winners.length}\n\n` +
          `📋 DAĞITIM DETAYLARI:\n${distributionDetails}\n\n` +
          `✅ Basit oransal dağıtım yapıldı!`);
}

// ------------------------------------------------------
// ADMIN: LADESİ SİL (TOKEN İADELİ)
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

// ------------------------------------------------------
// ADMIN: GEÇMİŞ LADESİ SİL
// ------------------------------------------------------
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