// ======================================================
// LADES MODÜL 2: ADMIN.JS (YÖNETİCİ MOTORU & İADE SİSTEMİ)
// ======================================================

async function deleteMarketCompletely(marketId, marketTitle) {
    const confirmation = confirm(`"${marketTitle}" isimli ladesi silmek istediğinize emin misiniz?\n\n⚠️ BU İŞLEM: \n1- Ladesi tamamen kaldırır.\n2- Bu ladese oynayan TÜM KULLANICILARIN tokenlarını hesaplarına İADE eder!`);
    if (!confirmation) return;
    if (typeof db === "undefined" || !db) return;

    try {
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
                        userUpdates[userCleanKey].balance = (parseInt(userUpdates[userCleanKey].balance) || 0) + betAmount;
                        refundedTokenCount += betAmount;
                        affectedUsersCount++;
                    }
                }
                deletePromises.push(db.ref(`betHistory/${historyKey}`).remove());
            }
        });

        if (affectedUsersCount > 0) await db.ref("ladesUsers").set(userUpdates);
        if (deletePromises.length > 0) await Promise.all(deletePromises);
        await db.ref(`customMarkets/${marketId}`).remove();

        alert(`⚡ Lades başarıyla silindi!\n\nKatılım Sağlayan: ${affectedUsersCount} kullanıcı\nİade Edilen Toplam: ${refundedTokenCount.toLocaleString("tr-TR")} Token hesaplara geri yüklendi.`);
    } catch (error) {
        alert("Lades silinirken bir hata oluştu: " + error.message);
    }
}

async function deleteUserCompletely(email) {
    if (!email) return;
    const confirmation = confirm(`"${email}" kullanıcısını sistemden TAMAMEN silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`);
    if (!confirmation) return;
    if (typeof db === "undefined" || !db) return;

    try {
        const userCleanKey = email.replace(/\./g, ',');
        await db.ref(`ladesUsers/${userCleanKey}`).remove();
        alert(`"${email}" kullanıcısı başarıyla silindi!`);
        await renderAdminPanel();
    } catch (error) {
        alert("Kullanıcı silinemedi: " + error.message);
    }
}

async function finalizeLades(marketId, winningChoice) {
    if (typeof db === "undefined" || !db) return;

    try {
        const marketSnap = await db.ref(`customMarkets/${marketId}`).once("value");
        const market = marketSnap.val();
        if (!market) return;

        const yesPool = market.yesPool || 0;
        const noPool = market.noPool || 0;
        const drawPool = market.drawPool || 0;
        const totalPool = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);
        let winningPool = winningChoice === "YES" ? yesPool : (winningChoice === "NO" ? noPool : drawPool);

        if (totalPool === 0 || winningPool === 0) {
            alert("Havuz boş veya kazanan seçeneğe oynayan yok. Lades kapatıldı.");
            await db.ref(`customMarkets/${marketId}/status`).set("Sonuçlandı");
            await renderAdminPanel();
            return;
        }

        const [historySnap, usersSnap] = await Promise.all([
            db.ref("betHistory").once("value"),
            db.ref("ladesUsers").once("value")
        ]);

        const history = historySnap.val() || {};
        const users = usersSnap.val() || {};
        const winners = Object.values(history).filter(h => h.marketId === marketId && h.choice === winningChoice);

        winners.forEach(winner => {
            const userEntry = Object.entries(users).find(([_, u]) => u.email === winner.email);
            if (!userEntry) return;

            const [userKey, userObj] = userEntry;
            const userShareRatio = winner.amount / winningPool;
            const rewardAmount = Math.round(userShareRatio * totalPool);

            userObj.balance = (userObj.balance || 0) + rewardAmount;
            users[userKey] = userObj;
        });

        await db.ref(`customMarkets/${marketId}/status`).set("Sonuçlandı");
        await db.ref("ladesUsers").set(users);

        alert(`🎉 Dağıtıldı! Toplam ${totalPool} Token kazananlara aktarıldı.`);
        await renderAdminPanel();
    } catch (error) {
        alert("Sonuçlandırma hatası: " + error.message);
    }
}

async function generateInviteCode() {
    if (typeof db === "undefined" || !db) return;
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeKey = "code_" + Math.random().toString(36).substring(2, 11);
    await db.ref(`inviteCodes/${codeKey}`).set(newCode);
    await renderAdminPanel();
}

async function approveInvite(reqId, email) {
    if (typeof db === "undefined" || !db) return;
    const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeKey = "code_" + Math.random().toString(36).substring(2, 11);
    
    await db.ref(`inviteCodes/${codeKey}`).set(newCode);
    await db.ref(`adminRequests/${reqId}`).remove();

    alert(`Onaylandı! Kod: ${newCode}`);
    await renderAdminPanel();
}

async function approveToken(reqId, email, amount) {
    if (typeof db === "undefined" || !db) return;
    try {
        const userCleanKey = email.replace(/\./g, ',');
        const userSnap = await db.ref(`ladesUsers/${userCleanKey}`).once("value");
        const userObj = userSnap.val();

        if (userObj) {
            userObj.balance = (userObj.balance || 0) + amount;
            await db.ref(`ladesUsers/${userCleanKey}`).set(userObj);
        }
        await db.ref(`adminRequests/${reqId}`).remove();
        alert(`${email} hesabına ${amount} token yüklendi.`);
        await renderAdminPanel();
    } catch (e) {
        alert("Hata: " + e.message);
    }
}

async function setTokensManual(email, currentBalance) {
    const targetValueStr = prompt(`${email} kullanıcısının YENİ TOPLAM bakiyesi kaç token olsun?\n(Şu anki bakiye: ${currentBalance.toLocaleString("tr-TR")})`);
    if (targetValueStr === null) return; 
    
    const targetBalance = parseInt(targetValueStr);
    if (isNaN(targetBalance) || targetBalance < 0) {
        alert("Lütfen geçerli bir bakiye giriniz!");
        return;
    }

    try {
        const userCleanKey = email.replace(/\./g, ',');
        await db.ref(`ladesUsers/${userCleanKey}/balance`).set(targetBalance);
        alert(`Bakiyesi ${targetBalance.toLocaleString("tr-TR")} Token olarak güncellendi.`);
        await renderAdminPanel();
    } catch(e) {
        alert("Hata: " + e.message);
    }
}

function openAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "flex";
    renderAdminPanel();
}
function closeAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "none";
}
window.closeAdminPanel = closeAdminPanel;