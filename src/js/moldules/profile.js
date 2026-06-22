// ======================================================
// PROFILE MODÜLÜ - Profil Sayfası
// ======================================================

// ------------------------------------------------------
// PROFİL SAYFASINI BAŞLAT
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

// ------------------------------------------------------
// KULLANICININ BAHİSLERİNİ GÖSTER
// ------------------------------------------------------
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