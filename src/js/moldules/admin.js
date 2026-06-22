// ======================================================
// ADMIN MODÜLÜ - Yönetici Paneli
// ======================================================

// Admin panelini aç
async function openAdminPanel() {
    console.log("🔓 Admin paneli açılıyor...");
    const modal = document.getElementById("admin-modal");
    if (modal) {
        modal.style.display = "flex";
        await renderAdminPanel();
    }
}

// Admin panelini kapat
function closeAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "none";
}

// Admin panelini render et
async function renderAdminPanel() {
    console.log("📋 Admin paneli render ediliyor...");
    if (typeof db === "undefined" || !db) return;

    // 1. BEKLEYEN İSTEKLER
    try {
        const requestsSnap = await fbGet("adminRequests");
        const requests = requestsSnap || {};
        const requestsList = document.getElementById("admin-requests-list");
        if (!requestsList) return;
        
        requestsList.innerHTML = "";
        let hasPending = false;

        Object.entries(requests).forEach(([key, req]) => {
            if (req && req.status === "Bekliyor") {
                hasPending = true;
                const isToken = req.type === "token";
                const email = req.email || "Bilinmeyen";
                const nickname = req.nickname || maskUserEmail(email);
                const amount = req.amount || 0;
                const currentBalance = req.currentBalance || 0;
                
                let actionButtons = "";
                let requestInfo = "";
                
                if (isToken) {
                    requestInfo = `
                        <span style="font-size:12px; color:#ff4aa2;">
                            ${nickname} (${email}) - 💰 ${amount} Token talep ediyor 
                            (Mevcut: ${currentBalance.toLocaleString("tr-TR")} Token)
                        </span>
                    `;
                    actionButtons = `
                        <button onclick="approveToken('${req.id}', '${email}', ${amount})" 
                                style="background:#22c55e; color:black; border:none; padding:4px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:12px;">
                            ✅ Onayla
                        </button>
                    `;
                } else {
                    requestInfo = `
                        <span style="font-size:12px; color:#24ffff;">
                            ${email} - ✉️ Davet kodu talep ediyor
                        </span>
                    `;
                    actionButtons = `
                        <button onclick="approveInvite('${req.id}', '${email}')" 
                                style="background:#22c55e; color:black; border:none; padding:4px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:12px;">
                            🔑 Kod Üret
                        </button>
                    `;
                }

                requestsList.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; 
                                background:#030814; padding:12px 15px; border-radius:8px; 
                                margin-bottom:8px; border-left: 3px solid ${isToken ? '#ff4aa2' : '#24ffff'};">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="font-size:13px; font-weight:600; color:white;">
                                ${nickname}
                            </span>
                            ${requestInfo}
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${actionButtons}
                            <button onclick="deleteRequest('${key}')" 
                                    style="background:#ef4444; color:white; border:none; padding:4px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:12px;">
                                ❌ Reddet
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        if (!hasPending) {
            requestsList.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:20px; font-size:13px;">
                    ✅ Bekleyen talep bulunmuyor.
                </div>
            `;
        }
    } catch (error) {
        console.error("İstekler yüklenirken hata:", error);
    }

    // 2. DAVET KODLARI
    try {
        const codesSnap = await fbGet("inviteCodes");
        const codes = codesSnap || {};
        const codesList = document.getElementById("admin-codes-list");
        if (!codesList) return;
        
        codesList.innerHTML = "";
        if (Object.keys(codes).length === 0) {
            codesList.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:10px; font-size:13px; width:100%;">
                    Henüz oluşturulmuş davet kodu yok.
                </div>
            `;
        } else {
            Object.entries(codes).forEach(([key, code]) => {
                codesList.innerHTML += `
                    <div style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; 
                                padding:8px 14px; border-radius:8px; font-size:13px; 
                                color:#24ffff; display:inline-flex; align-items:center; gap:10px; margin:4px;">
                        <span style="font-family:monospace; font-weight:700;">${code}</span>
                        <i class="fa-solid fa-trash" onclick="deleteInviteCode('${key}')" 
                           style="cursor:pointer; color:#ef4444; font-size:14px;" 
                           title="Kodu Sil"></i>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("Davet kodları yüklenirken hata:", error);
    }

    // 3. AKTİF LADESLER
    try {
        const marketsSnap = await fbGet("customMarkets");
        const markets = marketsSnap || {};
        const adminActiveMarkets = document.getElementById("admin-active-markets");
        if (!adminActiveMarkets) return;
        
        adminActiveMarkets.innerHTML = "";
        const activeMarkets = Object.values(markets).filter(m => m && m.status === "Aktif");

        if (activeMarkets.length === 0) {
            adminActiveMarkets.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:15px; font-size:13px;">
                    Şu an aktif bir lades pazarı yok.
                </div>
            `;
        } else {
            activeMarkets.forEach(m => {
                const yesPool = m.yesPool || 0;
                const noPool = m.noPool || 0;
                const drawPool = m.drawPool || 0;
                const total = m.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);

                let buttons = `
                    <button onclick="finalizeLades('${m.id}', 'YES')" 
                            style="background:#22c55e; color:black; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                        EVET
                    </button>
                    <button onclick="finalizeLades('${m.id}', 'NO')" 
                            style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                        HAYIR
                    </button>
                `;

                if (m.category === "Spor") {
                    buttons = `
                        <button onclick="finalizeLades('${m.id}', 'YES')" 
                                style="background:#22c55e; color:black; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                            EVET
                        </button>
                        <button onclick="finalizeLades('${m.id}', 'DRAW')" 
                                style="background:#f59e0b; color:black; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                            BERABERLİK
                        </button>
                        <button onclick="finalizeLades('${m.id}', 'NO')" 
                                style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                            HAYIR
                        </button>
                    `;
                }

                adminActiveMarkets.innerHTML += `
                    <div style="background:#030814; padding:12px 15px; border-radius:8px; margin-bottom:8px; 
                                display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                        <div style="font-size:13px; min-width:200px;">
                            <b style="color:white;">${m.title}</b><br>
                            <span style="color:#64748b; font-size:12px;">
                                Havuz: ${total} Token (E: ${yesPool} / H: ${noPool}${m.category === 'Spor' ? ` / B: ${drawPool}` : ''})
                            </span>
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">${buttons}</div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("Aktif ladesler yüklenirken hata:", error);
    }

    // 4. KAYITLI KULLANICILAR
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        const usersTable = document.getElementById("admin-users-list");
        if (!usersTable) return;
        
        usersTable.innerHTML = "";
        if (Object.keys(users).length === 0) {
            usersTable.innerHTML = `
                <tr><td colspan="4" style="text-align:center; color:#64748b; padding:15px;">Kayıtlı kullanıcı bulunmuyor.</td></tr>
            `;
        } else {
            Object.entries(users).forEach(([key, user]) => {
                if (!user) return;
                const isSelf = user.email === "tsulhan@gmail.com";
                const displayName = user.nickname || maskUserEmail(user.email);
                const deleteButtonHTML = isSelf 
                    ? `<span style="color:#64748b; font-size:11px; padding:4px 8px;">🔒 Korumalı</span>`
                    : `<button onclick="deleteUserCompletely('${user.email}')" 
                              style="background:rgba(239, 68, 68, 0.15); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); 
                                     padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:600; 
                                     transition:0.2s;"
                              onmouseover="this.style.background='#ef4444'; this.style.color='white';" 
                              onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444';">
                        🗑️ Sil
                    </button>`;

                usersTable.innerHTML += `
                    <tr style="border-bottom:1px solid #1c2541;">
                        <td style="padding:8px 0; font-size:13px;">
                            <strong>${displayName}</strong> ${user.isAdmin || user.email === "tsulhan@gmail.com" ? "👑" : ""}
                            <span style="color:#64748b; font-size:11px; display:block;">${user.email}</span>
                        </td>
                        <td style="padding:8px 0; font-size:13px; color:#ff4aa2; font-family:monospace;">
                            ${user.password || "1234"}
                        </td>
                        <td style="padding:8px 0; font-size:13px; color:#24ffff; font-weight:bold;">
                            ${(user.balance || 0).toLocaleString("tr-TR")}
                        </td>
                        <td style="padding:8px 0; text-align:right;">
                            <button onclick="setTokensManual('${user.email}', ${user.balance || 0})" 
                                    style="background:#ff4aa2; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:500;">
                                ✏️ Bakiye Düzenle
                            </button>
                            ${deleteButtonHTML}
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error("Kullanıcılar yüklenirken hata:", error);
    }
    
    console.log("✅ Admin paneli render edildi!");
}

// DAVET KODU OLUŞTUR
async function generateInviteCode() {
    if (typeof db === "undefined" || !db) return;
    try {
        const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeKey = uniqueId("code");
        await fbSet(`inviteCodes/${codeKey}`, newCode);
        alert(`✅ Yeni davet kodu oluşturuldu!\n\n🔑 ${newCode}`);
        await renderAdminPanel();
    } catch (error) {
        console.error("Kod üretme hatası:", error);
        alert("❌ Kod oluşturulurken bir hata oluştu.");
    }
}

// DAVET KODUNU ONAYLA
async function approveInvite(reqId, email) {
    if (typeof db === "undefined" || !db) return;
    try {
        const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeKey = uniqueId("code");
        await fbSet(`inviteCodes/${codeKey}`, newCode);
        const requestsSnap = await fbGet("adminRequests");
        const requests = requestsSnap || {};
        const reqKey = Object.keys(requests).find(k => requests[k] && requests[k].id === reqId);
        if (reqKey) await fbRemove(`adminRequests/${reqKey}`);
        alert(`✅ ${email} için davet kodu oluşturuldu!\n\n🔑 ${newCode}`);
        await renderAdminPanel();
    } catch (error) {
        console.error("Kod oluşturma hatası:", error);
        alert("❌ Kod oluşturulurken bir hata oluştu.");
    }
}

// TOKEN TALEBİNİ ONAYLA
async function approveToken(reqId, email, amount) {
    if (typeof db === "undefined" || !db) return;
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        const userEntry = Object.entries(users).find(([key, u]) => u && u.email === email);
        if (userEntry) {
            const [userKey, userObj] = userEntry;
            userObj.balance = (userObj.balance || 0) + amount;
            await fbSet(`ladesUsers/${userKey}`, userObj);
            const requestsSnap = await fbGet("adminRequests");
            const requests = requestsSnap || {};
            const reqKey = Object.keys(requests).find(k => requests[k] && requests[k].id === reqId);
            if (reqKey) await fbRemove(`adminRequests/${reqKey}`);
            alert(`✅ ${email} hesabına ${amount} Token başarıyla yüklendi!`);
            await renderAdminPanel();
        }
    } catch (error) {
        console.error("Token onay hatası:", error);
        alert("❌ Token onaylanırken bir hata oluştu.");
    }
}

// İSTEK SİL
async function deleteRequest(reqKey) {
    if (!confirm("Bu talebi silmek istediğinize emin misiniz?")) return;
    try {
        await fbRemove(`adminRequests/${reqKey}`);
        alert("✅ Talep başarıyla silindi.");
        await renderAdminPanel();
    } catch (error) {
        console.error("Talep silme hatası:", error);
        alert("❌ Talep silinirken bir hata oluştu.");
    }
}

// DAVET KODUNU SİL
async function deleteInviteCode(codeKey) {
    if (!confirm("Bu davet kodunu silmek istediğinize emin misiniz?")) return;
    try {
        await fbRemove(`inviteCodes/${codeKey}`);
        alert("✅ Davet kodu başarıyla silindi.");
        await renderAdminPanel();
    } catch (error) {
        console.error("Kod silme hatası:", error);
        alert("❌ Kod silinirken bir hata oluştu.");
    }
}

// KULLANICI BAKİYESİNİ MANUEL DÜZENLE
async function setTokensManual(email, currentBalance) {
    const targetValueStr = prompt(`${email} kullanıcısının YENİ TOPLAM bakiyesi kaç token olsun?\n(Şu anki bakiye: ${currentBalance.toLocaleString("tr-TR")})`);
    if (targetValueStr === null) return;
    const targetBalance = parseInt(targetValueStr);
    if (isNaN(targetBalance) || targetBalance < 0) {
        alert("Lütfen geçerli bir bakiye giriniz!");
        return;
    }
    if (typeof db === "undefined" || !db) return;
    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntry = Object.entries(users).find(([key, u]) => u && u.email === email);
    if (userEntry) {
        const [userKey, userObj] = userEntry;
        userObj.balance = targetBalance;
        await fbSet(`ladesUsers/${userKey}`, userObj);
        alert(`Başarılı! Bakiyesi ${targetBalance.toLocaleString("tr-TR")} Token olarak güncellendi.`);
        await renderAdminPanel();
    }
}

// KULLANICIYI SİL
async function deleteUserCompletely(email) {
    if (!email) return;
    if (!confirm(`"${email}" kullanıcısını sistemden TAMAMEN silmek istediğinize emin misiniz?`)) return;
    if (typeof db === "undefined" || !db) return;
    try {
        const userCleanKey = email.replace(/\./g, ',');
        await db.ref(`ladesUsers/${userCleanKey}`).remove();
        alert(`"${email}" kullanıcısı başarıyla silindi!`);
        await renderAdminPanel();
    } catch (error) {
        console.error("Kullanıcı silme hatası:", error);
        alert("Kullanıcı silinirken bir hata oluştu.");
    }
}