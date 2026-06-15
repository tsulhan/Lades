// ======================================================
// LADES MODÜL 4: DASHBOARD.JS (REALTIME DATA VE RENDER)
// ======================================================

function startRealtimeListeners() {
    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const userCleanKey = currentUserEmail.replace(/\./g, ',');
    
    db.ref(`ladesUsers/${userCleanKey}`).on("value", (snapshot) => {
        let user = snapshot.val();
        if (user) {
            if (document.getElementById("user-email-badge")) document.getElementById("user-email-badge").innerText = user.email;
            if (document.getElementById("token-balance")) document.getElementById("token-balance").innerText = (user.balance || 0).toLocaleString("tr-TR");
            
            const reqArea = document.getElementById("token-request-area");
            if (reqArea) reqArea.style.display = (user.balance === 0) ? "block" : "none";

            const adminBtn = document.getElementById("admin-panel-btn");
            if (adminBtn) {
                if (user.isAdmin || currentUserEmail === "tsulhan@gmail.com") {
                    adminBtn.style.setProperty("display", "block", "important");
                } else {
                    adminBtn.style.display = "none";
                }
            }
        }
    });

    db.ref("customMarkets").on("value", (snapshot) => {
        renderMarketGrid(snapshot.val() || {});
    });

    db.ref("ladesUsers").on("value", (snapshot) => {
        renderLeaderboard(snapshot.val() || {});
    });
}

function renderLeaderboard(usersObj) {
    const leaderboardList = document.getElementById("leaderboard-list");
    if (!leaderboardList) return;

    const sortedUsers = Object.values(usersObj)
        .filter(u => u && u.email)
        .sort((a, b) => (b.balance || 0) - (a.balance || 0));

    leaderboardList.innerHTML = "";
    sortedUsers.forEach((user, index) => {
        const rank = index + 1;
        let rDisp = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : rank));
        
        let parts = user.email.split("@");
        let masked = parts[0].length <= 4 ? parts[0].substring(0,1) + "***" : parts[0].substring(0,4) + "***";
        masked += "@" + parts[1];

        leaderboardList.innerHTML += `
            <div class="leaderboard-row">
                <div class="leaderboard-user">
                    <span class="leaderboard-rank">${rDisp}</span>
                    <span class="leaderboard-email">${masked}</span>
                </div>
                <div class="leaderboard-balance">${(user.balance || 0).toLocaleString("tr-TR")} Token</div>
            </div>`;
    });
}

function renderMarketGrid(marketsObj) {
    const marketGrid = document.getElementById("market-grid");
    const pastMarketGrid = document.getElementById("past-market-grid");
    const allMarkets = Object.values(marketsObj).filter(m => m);

    let activeMarkets = allMarkets.filter(m => m.status === "Aktif");
    if (selectedCategoryFilter !== "Tümü") activeMarkets = activeMarkets.filter(m => m.category === selectedCategoryFilter);

    let pastMarkets = allMarkets.filter(m => m.status === "Sonuçlandı" || m.status === "Kapatıldı");
    if (selectedCategoryFilter !== "Tümü") pastMarkets = pastMarkets.filter(m => m.category === selectedCategoryFilter);

    if (marketGrid) {
        marketGrid.innerHTML = activeMarkets.length === 0 ? `<div style="text-align:center; color:#64748b; padding:40px; width:100%;">Aktif lades bulunmuyor.</div>` : "";
        activeMarkets.forEach(m => { marketGrid.innerHTML += generateMarketCardHTML(m, true); });
    }
    if (pastMarketGrid) {
        pastMarketGrid.innerHTML = pastMarkets.length === 0 ? `<div style="text-align:center; color:#64748b; padding:40px; width:100%;">Sonuçlanmış lades bulunmuyor.</div>` : "";
        pastMarkets.forEach(m => { pastMarketGrid.innerHTML += generateMarketCardHTML(m, false); });
    }
}

function generateMarketCardHTML(market, isActive) {
    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;
    const totalVolume = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);

    let yP = 50, nP = 50, dP = 0;
    if (totalVolume > 0) {
        yP = Math.round((yesPool / totalVolume) * 100);
        nP = Math.round((noPool / totalVolume) * 100);
        if (market.category === "Spor") dP = 100 - yP - nP;
        else nP = 100 - yP;
    }

    const safeTitle = (market.title || "").replace(/'/g, "\\'");
    const isSpor = market.category === "Spor";
    const currentUserEmail = localStorage.getItem("currentUser");
    let actionContent = "";

    if (isActive) {
        actionContent = isSpor ? `
            <div class="market-actions three-cols">
                <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">EVET %${yP}</button>
                <button class="btn-bet btn-draw" onclick="openBetModal('${market.id}', '${safeTitle}', 'DRAW')">BERABERLİK %${dP}</button>
                <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">HAYIR %${nP}</button>
            </div>` : `
            <div class="market-actions two-cols">
                <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">EVET %${yP}</button>
                <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">HAYIR %${nP}</button>
            </div>`;
    } else {
        let wText = "BELİRSİZ", wStyle = "width:330px; margin-left:auto; text-align:center; padding:12px; border-radius:10px; font-weight:800; font-size:13px;";
        if (yesPool > 0 && yesPool >= noPool && yesPool >= drawPool) { wText = `🏆 EVET KAZANDI (%${yP})`; wStyle += " background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.4);"; }
        else if (noPool > 0 && noPool >= yesPool && noPool >= drawPool) { wText = `🏆 HAYIR KAZANDI (%${nP})`; wStyle += " background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.4);"; }
        else if (drawPool > 0 && drawPool >= yesPool && drawPool >= noPool) { wText = `🏆 BERABERLİK KAZANDI (%${dP})`; wStyle += " background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.4);"; }
        else { wText = "🔒 BERABERE BİTTİ / İPTAL"; wStyle += " background:rgba(148,163,184,0.1); color:#94a3b8;"; }
        actionContent = `<div style="${wStyle}">${wText}</div>`;
    }

    let delBtn = currentUserEmail === "tsulhan@gmail.com" ? `
        <button onclick="deleteMarketCompletely('${market.id}', '${safeTitle}')" 
                style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); color:#f87171; width:26px; height:26px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:11px; z-index:10;">
            <i class="fa-solid fa-xmark"></i>
        </button>` : "";

    return `
        <div class="market-card" style="position:relative; ${!isActive ? 'opacity:0.8; background:#060b19;' : ''}">
            ${delBtn}
            <div class="market-info">
                <div style="display:flex; gap:8px; margin-bottom:6px;">
                    <span class="category-badge">${market.category || "Genel"}</span>
                </div>
                <h3>${market.title}</h3>
                <p>Bitiş: ${market.date || "-"} • Hacim: <span style="color:#24ffff; font-weight:700;">${totalVolume.toLocaleString("tr-TR")}</span> Token</p>
            </div>
            ${actionContent}
        </div>`;
}

async function renderAdminPanel() {
    if (typeof db === "undefined" || !db) return;
    try {
        const [reqsSnap, marketsSnap, codesSnap, usersSnap] = await Promise.all([
            db.ref("adminRequests").once("value"),
            db.ref("customMarkets").once("value"),
            db.ref("inviteCodes").once("value"),
            db.ref("ladesUsers").once("value")
        ]);

        const reqsList = document.getElementById("admin-requests-list");
        if (reqsList) {
            reqsList.innerHTML = "";
            const pendings = Object.values(reqsSnap.val() || {}).filter(r => r.status === "Bekliyor");
            if (pendings.length === 0) reqsList.innerHTML = `<p style="color:#64748b; font-size:13px;">Bekleyen talep yok.</p>`;
            else {
                pendings.forEach(r => {
                    reqsList.innerHTML += `
                    <div style="display:flex; justify-content:space-between; background:#030814; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;">
                        <span>${r.type === 'invite' ? '✉️' : '💰'} <b>${r.email}</b> (${r.type === 'invite' ? 'Kod' : r.amount + ' Token'})</span>
                        <button onclick="${r.type === 'invite' ? 'approveInvite' : 'approveToken'}('${r.id}', '${r.email}', ${r.amount || 0})" style="background:#22c55e; border:none; padding:4px 8px; border-radius:5px; font-weight:bold; cursor:pointer;">Onayla</button>
                    </div>`;
                });
            }
        }

        const activeArea = document.getElementById("admin-active-markets");
        if (activeArea) {
            activeArea.innerHTML = "";
            const actives = Object.values(marketsSnap.val() || {}).filter(m => m.status === "Aktif");
            if (actives.length === 0) activeArea.innerHTML = `<p style="color:#64748b; font-size:13px;">Aktif pazar yok.</p>`;
            else {
                actives.forEach(m => {
                    let btns = `<button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">EVET</button>
                                <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">HAYIR</button>`;
                    if (m.category === "Spor") btns = `<button onclick="finalizeLades('${m.id}', 'YES')" style="background:#22c55e; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">EVET</button>
                                                       <button onclick="finalizeLades('${m.id}', 'DRAW')" style="background:#f59e0b; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">BERABERE</button>
                                                       <button onclick="finalizeLades('${m.id}', 'NO')" style="background:#ef4444; color:white; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">HAYIR</button>`;
                    activeArea.innerHTML += `
                    <div style="background:#030814; padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:13px;"><b>${m.title}</b></div>
                        <div style="display:flex; gap:8px;">${btns}</div>
                    </div>`;
                });
            }
        }

        const codesList = document.getElementById("admin-codes-list");
        if (codesList) {
            codesList.innerHTML = Object.values(codesSnap.val() || {}).map(c => `
                <span style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; padding:4px 8px; border-radius:6px; font-size:12px; color:#24ffff;">${c}</span>
            `).join(" ");
        }

        const usersTable = document.getElementById("admin-users-list");
        if (usersTable) {
            usersTable.innerHTML = "";
            Object.values(usersSnap.val() || {}).forEach(u => {
                let isSelf = u.email === "tsulhan@gmail.com";
                let delBtn = isSelf ? `<span style="color:#64748b; font-size:11px;">🔒 Korumalı</span>` : `<button onclick="deleteUserCompletely('${u.email}')" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer;">Sil</button>`;
                usersTable.innerHTML += `
                <tr style="border-bottom:1px solid #1c2541;">
                    <td style="padding:8px 0; font-size:13px;">${u.email}</td>
                    <td style="padding:8px 0; font-size:13px; color:#ff4aa2;">${u.password || "1234"}</td>
                    <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">${(u.balance || 0).toLocaleString("tr-TR")}</td>
                    <td style="padding:8px 0; text-align:right;">
                        <button onclick="setTokensManual('${u.email}', ${u.balance || 0})" style="background:#ff4aa2; border:none; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer;">Düzenle</button>
                        ${delBtn}
                    </td>
                </tr>`;
            });
        }
    } catch(e) { console.error(e); }
}

document.addEventListener("DOMContentLoaded", () => {
    updateChoiceOptions();
    const catSelect = document.getElementById("market-category");
    if (catSelect) catSelect.addEventListener("change", updateChoiceOptions);
    
    // Firebase tamamen yüklenene kadar küçük bir aralık bırakıyoruz
    setTimeout(() => {
        if (typeof db !== "undefined" && db) startRealtimeListeners();
    }, 1000);
});