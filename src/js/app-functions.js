// ======================================================
// LADES APP-FUNCTIONS.JS - TÜM FONKSİYONLAR
// ======================================================

// ------------------------------------------------------
// GLOBAL DEĞİŞKENLER
// ------------------------------------------------------
let creatorNamesCache = {};

// ------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ------------------------------------------------------
async function getUserNickname(email) {
    if (!email) return "Bilinmeyen";
    if (creatorNamesCache[email]) return creatorNamesCache[email];
    
    if (typeof db === "undefined" || !db) return maskUserEmail(email);
    try {
        const userKey = email.replace(/\./g, ',');
        const user = await fbGet(`ladesUsers/${userKey}`);
        const nickname = user?.nickname || maskUserEmail(email);
        creatorNamesCache[email] = nickname;
        return nickname;
    } catch {
        return maskUserEmail(email);
    }
}

function maskUserEmail(email) {
    if (!email || !email.includes("@")) return email;
    const parts = email.split("@");
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 4) {
        return name.substring(0, 1) + "***@" + domain;
    }
    return name.substring(0, 4) + "***@" + domain;
}

function validateNickname(nickname) {
    if (!nickname || nickname.length < 3 || nickname.length > 20) return false;
    return /^[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+$/.test(nickname);
}

// ------------------------------------------------------
// GİRİŞ / KAYIT / DAVET
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
// LİDERLİK TABLOSU
// ------------------------------------------------------
function renderLeaderboard(usersObj) {
    const leaderboardList = document.getElementById("leaderboard-list");
    if (!leaderboardList) return;

    const sortedUsers = Object.values(usersObj)
        .filter(u => u && u.email && (u.balance || 0) > 0)
        .sort((a, b) => (b.balance || 0) - (a.balance || 0));

    if (sortedUsers.length === 0) {
        leaderboardList.innerHTML = `
            <div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">
                Henüz token kazanmış kullanıcı bulunmuyor. İlk kazanan sen ol! 🏆
            </div>`;
        return;
    }

    leaderboardList.innerHTML = "";

    sortedUsers.forEach((user, index) => {
        const rank = index + 1;
        let rankDisplay = rank;
        if (rank === 1) rankDisplay = "🥇";
        else if (rank === 2) rankDisplay = "🥈";
        else if (rank === 3) rankDisplay = "🥉";

        const displayName = user.nickname || maskUserEmail(user.email);

        leaderboardList.innerHTML += `
            <div class="leaderboard-row">
                <div class="leaderboard-user">
                    <span class="leaderboard-rank">${rankDisplay}</span>
                    <span class="leaderboard-email">${displayName}</span>
                </div>
                <div class="leaderboard-balance">${(user.balance || 0).toLocaleString("tr-TR")} Token</div>
            </div>
        `;
    });
}

// ------------------------------------------------------
// LADES KARTLARI VE RENDER
// ------------------------------------------------------
function generateMarketCardHTML(market, isActive) {
    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalVolume = market.category === "Spor"
        ? (yesPool + noPool + drawPool)
        : (yesPool + noPool);

    let yesPercent = 50, noPercent = 50, drawPercent = 0;
    if (totalVolume > 0) {
        yesPercent = Math.round((yesPool / totalVolume) * 100);
        noPercent = Math.round((noPool / totalVolume) * 100);
        if (market.category === "Spor") {
            drawPercent = 100 - yesPercent - noPercent;
        } else {
            noPercent = 100 - yesPercent;
        }
    }

    const safeTitle = (market.title || "").replace(/'/g, "\\'");
    const isSpor = market.category === "Spor";
    const currentUserEmail = localStorage.getItem("currentUser");
    const isAdmin = currentUserEmail === "tsulhan@gmail.com";
    const creatorDisplay = maskUserEmail(market.createdBy || "Bilinmeyen");
    
    let actionContent = "";

    if (isActive) {
        const colsClass = isSpor ? "three-cols" : "two-cols";
        if (isSpor) {
            actionContent = `
                <div class="market-actions ${colsClass}">
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">EVET %${yesPercent}</button>
                    <button class="btn-bet btn-draw" onclick="openBetModal('${market.id}', '${safeTitle}', 'DRAW')">BERABERLİK %${drawPercent}</button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">HAYIR %${noPercent}</button>
                </div>
            `;
        } else {
            actionContent = `
                <div class="market-actions ${colsClass}">
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')">EVET %${yesPercent}</button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')">HAYIR %${noPercent}</button>
                </div>
            `;
        }
    } else {
        let winnerText = "BELİRSİZ";
        let winnerStyle = "width: 330px; margin-left: auto; flex-shrink: 0; text-align: center; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 13px;";

        if (yesPool > 0 && yesPool >= noPool && yesPool >= drawPool) {
            winnerText = `🏆 EVET KAZANDI (%${yesPercent})`;
            winnerStyle += " background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4);";
        } else if (noPool > 0 && noPool >= yesPool && noPool >= drawPool) {
            winnerText = `🏆 HAYIR KAZANDI (%${noPercent})`;
            winnerStyle += " background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);";
        } else if (drawPool > 0 && drawPool >= yesPool && drawPool >= noPool) {
            winnerText = `🏆 BERABERLİK KAZANDI (%${drawPercent})`;
            winnerStyle += " background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);";
        } else {
            winnerText = "🔒 SONUÇLANDI (BERABERE DAĞITILDI)";
            winnerStyle += " background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3);";
        }

        actionContent = `
            <div style="${winnerStyle}">
                ${winnerText}
            </div>
        `;
    }

    let adminDeleteHTML = "";
    if (isAdmin) {
        if (isActive) {
            adminDeleteHTML = `
                <button onclick="deleteMarketCompletely('${market.id}', '${safeTitle}')" 
                        style="position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.15); 
                               border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; width: 28px; height: 28px; 
                               border-radius: 50%; cursor: pointer; display: flex; align-items: center; 
                               justify-content: center; font-size: 14px; transition: 0.3s; z-index: 10;
                               font-weight: 700;"
                        onmouseover="this.style.background='rgba(239, 68, 68, 0.4)'; this.style.color='white';"
                        onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444';"
                        title="Bu ladesi sil ve tokenları iade et">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } else {
            adminDeleteHTML = `
                <button onclick="deleteMarketFromHistory('${market.id}', '${safeTitle}')" 
                        style="position: absolute; top: 12px; right: 12px; background: rgba(148, 163, 184, 0.1); 
                               border: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8; width: 28px; height: 28px; 
                               border-radius: 50%; cursor: pointer; display: flex; align-items: center; 
                               justify-content: center; font-size: 14px; transition: 0.3s; z-index: 10;
                               font-weight: 700;"
                        onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'; this.style.color='#ef4444';"
                        onmouseout="this.style.background='rgba(148, 163, 184, 0.1)'; this.style.color='#94a3b8';"
                        title="Bu ladesi geçmişten sil">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        }
    }

    const detailToggleId = `detail-toggle-${market.id}`;
    const detailContentId = `detail-content-${market.id}`;

    return `
        <div class="market-card" style="position: relative; ${!isActive ? 'opacity: 0.9; border-color: #1c2541; background: #060b19;' : ''}">
            ${adminDeleteHTML}
            <div class="market-info" onclick="toggleMarketDetail('${market.id}')" style="cursor: pointer;">
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                    <span class="category-badge">${market.category || "Genel"}</span>
                    ${!isActive ? `<span class="category-badge" style="background:rgba(36,255,255,0.05); color:#24ffff; border-color:rgba(36,255,255,0.2);"><i class="fa-solid fa-lock"></i> Arşiv</span>` : ''}
                </div>
                <h3>${market.title || "Başlıksız Lades"}</h3>
                <p>Bitiş: ${market.date || "-"} • Toplam Hacim: <span style="color:#24ffff; font-weight:700;">${totalVolume.toLocaleString("tr-TR")}</span> Token</p>
                <p style="font-size:12px; color:#64748b; margin-top:2px;">
                    👤 <span style="color:#ff4aa2; font-weight:600;" id="creator-${market.id}">${creatorDisplay}</span> tarafından açıldı
                </p>
                <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
                    <button onclick="event.stopPropagation(); openMarketChat('${market.id}', '${safeTitle}')" 
                            style="background:rgba(36,255,255,0.05); border:1px solid rgba(36,255,255,0.2); 
                                   color:#24ffff; padding:3px 10px; border-radius:12px; font-size:10px; 
                                   cursor:pointer; display:flex; align-items:center; gap:4px; transition: 0.2s;"
                            onmouseover="this.style.background='rgba(36,255,255,0.15)';"
                            onmouseout="this.style.background='rgba(36,255,255,0.05)';">
                        <i class="fa-solid fa-comment"></i> Sohbet
                    </button>
                    <button onclick="event.stopPropagation(); toggleMarketDetail('${market.id}')" 
                            style="background:rgba(255,74,162,0.05); border:1px solid rgba(255,74,162,0.2); 
                                   color:#ff4aa2; padding:3px 10px; border-radius:12px; font-size:10px; 
                                   cursor:pointer; display:flex; align-items:center; gap:4px; transition: 0.2s;"
                            onmouseover="this.style.background='rgba(255,74,162,0.15)';"
                            onmouseout="this.style.background='rgba(255,74,162,0.05)';">
                        <i class="fa-solid fa-chevron-down" id="${detailToggleId}"></i> Detaylar
                    </button>
                </div>
                <div id="${detailContentId}" class="market-detail-content" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(28,37,65,0.5);">
                    <div style="font-size: 13px; color: #94a3b8; margin-bottom: 6px;">📊 Bahis Dağılımı</div>
                    <div id="bet-details-${market.id}" style="font-size: 12px; color: #64748b;">
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid rgba(28,37,65,0.2);">
                            <span>✅ EVET</span>
                            <span style="color: #22c55e; font-weight:600;">${yesPool.toLocaleString("tr-TR")} Token (${yesPercent}%)</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid rgba(28,37,65,0.2);">
                            <span>❌ HAYIR</span>
                            <span style="color: #ef4444; font-weight:600;">${noPool.toLocaleString("tr-TR")} Token (${noPercent}%)</span>
                        </div>
                        ${isSpor ? `
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid rgba(28,37,65,0.2);">
                            <span>🤝 BERABERLİK</span>
                            <span style="color: #f59e0b; font-weight:600;">${drawPool.toLocaleString("tr-TR")} Token (${drawPercent}%)</span>
                        </div>
                        ` : ''}
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; margin-top: 4px; font-weight:700; color:#24ffff;">
                            <span>💰 TOPLAM</span>
                            <span>${totalVolume.toLocaleString("tr-TR")} Token</span>
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: center;">
                            <i class="fa-solid fa-users"></i> Detayları görmek için tıklayınız
                        </div>
                        <div id="bet-participants-${market.id}" style="margin-top: 8px; max-height: 150px; overflow-y: auto; font-size: 11px; color: #94a3b8; background: rgba(3,8,20,0.5); border-radius: 8px; padding: 8px;">
                            <div style="text-align:center; color:#64748b; padding:4px;">Yükleniyor...</div>
                        </div>
                    </div>
                </div>
            </div>
            ${actionContent}
        </div>
    `;
}

function renderMarketGrid(marketsObj) {
    const marketGrid = document.getElementById("market-grid");
    const pastMarketGrid = document.getElementById("past-market-grid");
    
    const allMarkets = objectValuesToArray(marketsObj).filter(m => m);

    let activeMarkets = allMarkets.filter(m => m.status === "Aktif");
    if (selectedCategoryFilter !== "Tümü") {
        activeMarkets = activeMarkets.filter(m => m.category === selectedCategoryFilter);
    }

    let pastMarkets = allMarkets.filter(m => m.status === "Sonuçlandı" || m.status === "Kapatıldı");
    if (selectedCategoryFilter !== "Tümü") {
        pastMarkets = pastMarkets.filter(m => m.category === selectedCategoryFilter);
    }

    if (marketGrid) {
        marketGrid.innerHTML = "";
        if (activeMarkets.length === 0) {
            marketGrid.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:40px; width:100%;">
                    Şu an bu kategoride aktif bir lades bulunmuyor.
                </div>
            `;
        } else {
            activeMarkets.forEach(market => {
                marketGrid.innerHTML += generateMarketCardHTML(market, true);
            });
        }
    }

    if (pastMarketGrid) {
        pastMarketGrid.innerHTML = "";
        if (pastMarkets.length === 0) {
            pastMarketGrid.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:40px; width:100%;">
                    Henüz sonuçlanmış bir lades bulunmuyor.
                </div>
            `;
        } else {
            pastMarkets.forEach(market => {
                pastMarketGrid.innerHTML += generateMarketCardHTML(market, false);
            });
        }
    }

    setTimeout(() => {
        updateCreatorNames();
    }, 100);
}

async function updateCreatorNames() {
    const creatorSpans = document.querySelectorAll('[id^="creator-"]');
    
    for (const span of creatorSpans) {
        const marketId = span.id.replace('creator-', '');
        
        const marketsSnap = await fbGet("customMarkets");
        const markets = marketsSnap || {};
        const market = markets[marketId];
        
        if (market && market.createdBy) {
            const nickname = await getUserNickname(market.createdBy);
            if (nickname) {
                span.textContent = nickname;
            }
        }
    }
}

// ------------------------------------------------------
// LADES DETAY GÖSTER/GİZLE
// ------------------------------------------------------
function toggleMarketDetail(marketId) {
    const detailContent = document.getElementById(`detail-content-${marketId}`);
    const toggleIcon = document.getElementById(`detail-toggle-${marketId}`);
    
    if (!detailContent) return;
    
    if (detailContent.style.display === "none" || detailContent.style.display === "") {
        detailContent.style.display = "block";
        if (toggleIcon) {
            toggleIcon.className = "fa-solid fa-chevron-up";
        }
        loadBetParticipants(marketId);
    } else {
        detailContent.style.display = "none";
        if (toggleIcon) {
            toggleIcon.className = "fa-solid fa-chevron-down";
        }
    }
}

async function loadBetParticipants(marketId) {
    const container = document.getElementById(`bet-participants-${marketId}`);
    if (!container) return;
    
    if (typeof db === "undefined" || !db) {
        container.innerHTML = '<div style="text-align:center; color:#64748b; padding:4px;">Veritabanı bağlantısı yok.</div>';
        return;
    }
    
    try {
        const historySnap = await fbGet("betHistory");
        const history = historySnap || {};
        
        const marketBets = Object.values(history)
            .filter(b => b && b.marketId === marketId)
            .sort((a, b) => (b.amount || 0) - (a.amount || 0));
        
        if (marketBets.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#64748b; padding:4px;">Henüz bu ladese bahis yapılmamış.</div>';
            return;
        }
        
        const userPromises = marketBets.map(async (bet) => {
            const nickname = await getUserNickname(bet.email);
            return {
                nickname: nickname,
                choice: bet.choice,
                amount: bet.amount
            };
        });
        
        const participants = await Promise.all(userPromises);
        const maxAmount = Math.max(...participants.map(p => p.amount));
        
        container.innerHTML = participants.map(p => {
            const choiceText = p.choice === "YES" ? "✅ EVET" : (p.choice === "NO" ? "❌ HAYIR" : "🤝 BERABERLİK");
            const choiceColor = p.choice === "YES" ? "#22c55e" : (p.choice === "NO" ? "#ef4444" : "#f59e0b");
            const barWidth = Math.round((p.amount / maxAmount) * 100);
            
            return `
                <div style="display:flex; align-items:center; gap:8px; padding:3px 0; border-bottom: 1px solid rgba(28,37,65,0.1);">
                    <span style="min-width: 80px; font-weight:600; color:${choiceColor}; font-size:11px;">${choiceText}</span>
                    <span style="min-width: 80px; color:#94a3b8; font-size:11px;">${p.nickname}</span>
                    <div style="flex:1; height:4px; background:#1c2541; border-radius:2px; overflow:hidden;">
                        <div style="height:100%; width:${barWidth}%; background:${choiceColor}; border-radius:2px; transition: width 0.5s;"></div>
                    </div>
                    <span style="min-width: 60px; text-align:right; color:#24ffff; font-size:11px; font-weight:600;">${p.amount.toLocaleString("tr-TR")}</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error("Bahis katılımcıları yüklenirken hata:", error);
        container.innerHTML = '<div style="text-align:center; color:#ef4444; padding:4px;">Yüklenirken hata oluştu.</div>';
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

    // ✅ YENİ LADES BİLDİRİMİ - CANLI AKIŞ
    await addNewMarketNotification(
        currentUser.nickname || maskUserEmail(currentUserEmail),
        title,
        marketId
    );

    // ✅ YENİ LADES BİLDİRİMİ - Tüm kullanıcılara
    const creatorNickname = currentUser.nickname || maskUserEmail(currentUserEmail);
    await sendNotificationToAllUsers({
        title: "📢 Yeni Lades!",
        message: `${creatorNickname}, "${title}" ladesini oluşturdu! Kapanış: ${formattedDateTime}`,
        type: "new_market",
        marketId: marketId,
        link: "dashboard.html?tab=mevcut-ladesler",
        data: { creator: currentUserEmail, creatorNickname: creatorNickname }
    });

    alert(`⚡ Lades Başarıyla Yaratıldı!\n\n💰 Yatırılan: ${initialBet.toLocaleString("tr-TR")} Token\n⏰ Kapanış: ${formattedDateTime}`);

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

    // ✅ CANLI BAHİS AKIŞINA EKLE
    await addLiveBet(
        currentUser.nickname || maskUserEmail(currentUserEmail),
        target.title,
        activeChoice,
        amount,
        activeMarketId
    );

    // ✅ BAHİS BİLDİRİMİ
    const bettorNickname = currentUser.nickname || maskUserEmail(currentUserEmail);
    await sendBetNotificationToParticipants(activeMarketId, currentUserEmail, activeChoice, amount, target.title, bettorNickname);

    alert(`✅ ${amount.toLocaleString("tr-TR")} Token başarıyla yatırıldı!`);
    closeModal();
}

// ------------------------------------------------------
// LADES SONUÇLANDIRMA VE SİLME
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
// ADMIN PANELİ
// ------------------------------------------------------
async function openAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "flex";
    await renderAdminPanel();
}

async function closeAdminPanel() {
    const modal = document.getElementById("admin-modal");
    if (modal) modal.style.display = "none";
}

async function renderAdminPanel() {
    if (typeof db === "undefined" || !db) return;

    fbRef("adminRequests").on("value", (snapshot) => {
        const requestsList = document.getElementById("admin-requests-list");
        if (!requestsList) return;
        
        requestsList.innerHTML = "";
        const requests = snapshot.val() || {};
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
    });

    fbRef("inviteCodes").on("value", (snapshot) => {
        const codesList = document.getElementById("admin-codes-list");
        if (!codesList) return;
        
        codesList.innerHTML = "";
        const codes = snapshot.val() || {};

        if (Object.keys(codes).length === 0) {
            codesList.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:10px; font-size:13px; width:100%;">
                    Henüz oluşturulmuş davet kodu yok.
                </div>
            `;
            return;
        }

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
    });

    fbRef("customMarkets").on("value", (snapshot) => {
        const adminActiveMarkets = document.getElementById("admin-active-markets");
        if (!adminActiveMarkets) return;

        adminActiveMarkets.innerHTML = "";
        const markets = snapshot.val() || {};
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
                        EVET Kazandı
                    </button>
                    <button onclick="finalizeLades('${m.id}', 'NO')" 
                            style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:5px; font-weight:bold; font-size:11px; cursor:pointer;">
                        HAYIR Kazandı
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
    });

    fbRef("ladesUsers").on("value", (snapshot) => {
        const usersTable = document.getElementById("admin-users-list");
        if (!usersTable) return;

        usersTable.innerHTML = "";
        const usersSnap = snapshot.val() || {};

        if (Object.keys(usersSnap).length === 0) {
            usersTable.innerHTML = `
                <tr><td colspan="4" style="text-align:center; color:#64748b; padding:15px;">Kayıtlı kullanıcı bulunmuyor.</td></tr>
            `;
            return;
        }

        Object.entries(usersSnap).forEach(([key, user]) => {
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
    });
}

// ------------------------------------------------------
// ADMIN PANELİ YARDIMCI FONKSİYONLARI
// ------------------------------------------------------
async function generateInviteCode() {
    if (typeof db === "undefined" || !db) return;
    try {
        const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeKey = uniqueId("code");
        await fbSet(`inviteCodes/${codeKey}`, newCode);
        alert(`✅ Yeni davet kodu oluşturuldu!\n\n🔑 ${newCode}`);
    } catch (error) {
        console.error("Kod üretme hatası:", error);
        alert("❌ Kod oluşturulurken bir hata oluştu.");
    }
}

async function deleteRequest(reqKey) {
    if (!confirm("Bu talebi silmek istediğinize emin misiniz?")) return;
    
    try {
        await fbRemove(`adminRequests/${reqKey}`);
        alert("✅ Talep başarıyla silindi.");
    } catch (error) {
        console.error("Talep silme hatası:", error);
        alert("❌ Talep silinirken bir hata oluştu.");
    }
}

async function approveInvite(reqId, email) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const newCode = "LADES_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const codeKey = uniqueId("code");
        await fbSet(`inviteCodes/${codeKey}`, newCode);
        
        const requestsSnap = await fbGet("adminRequests");
        const requests = requestsSnap || {};
        const reqKey = Object.keys(requests).find(k => requests[k] && requests[k].id === reqId);
        if (reqKey) {
            await fbRemove(`adminRequests/${reqKey}`);
        }
        
        alert(`✅ ${email} için davet kodu oluşturuldu!\n\n🔑 Kod: ${newCode}\n\nBu kodu kullanıcıya iletebilirsiniz.`);
    } catch (error) {
        console.error("Kod oluşturma hatası:", error);
        alert("❌ Kod oluşturulurken bir hata oluştu.");
    }
}

async function approveToken(reqId, email, amount) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const usersSnap = await fbGet("ladesUsers");
        const users = usersSnap || {};
        const userEntry = Object.entries(users).find(([key, u]) => u && u.email === email);
        
        if (userEntry) {
            const [userKey, userObj] = userEntry;
            const oldBalance = userObj.balance || 0;
            const newBalance = oldBalance + amount;
            const displayName = userObj.nickname || maskUserEmail(email);
            
            userObj.balance = newBalance;
            await fbSet(`ladesUsers/${userKey}`, userObj);
            
            const requestsSnap = await fbGet("adminRequests");
            const requests = requestsSnap || {};
            const reqKey = Object.keys(requests).find(k => requests[k] && requests[k].id === reqId);
            if (reqKey) {
                await fbRemove(`adminRequests/${reqKey}`);
            }
            
            alert(`✅ ${displayName} (${email}) hesabına ${amount} Token başarıyla yüklendi!\n\nEski Bakiye: ${oldBalance.toLocaleString("tr-TR")}\nYeni Bakiye: ${newBalance.toLocaleString("tr-TR")}`);
        } else {
            alert("❌ Kullanıcı bulunamadı!");
        }
    } catch (error) {
        console.error("Token onay hatası:", error);
        alert("❌ Token onaylanırken bir hata oluştu: " + error.message);
    }
}

async function deleteInviteCode(codeKey) {
    if (!confirm("Bu davet kodunu silmek istediğinize emin misiniz?")) return;
    
    try {
        await fbRemove(`inviteCodes/${codeKey}`);
        alert("✅ Davet kodu başarıyla silindi.");
    } catch (error) {
        console.error("Kod silme hatası:", error);
        alert("❌ Kod silinirken bir hata oluştu.");
    }
}

async function deleteUserCompletely(email) {
    if (!email) return;

    const confirmation = confirm(`"${email}" kullanıcısını sistemden TAMAMEN silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve kullanıcının hesabı kalıcı olarak kapatılır!`);
    if (!confirmation) return;

    if (typeof db === "undefined" || !db) {
        alert("Firebase bağlantısı yok!");
        return;
    }

    try {
        const userCleanKey = email.replace(/\./g, ',');
        await db.ref(`ladesUsers/${userCleanKey}`).remove();
        alert(`"${email}" kullanıcısı başarıyla her yerden silindi!`);
    } catch (error) {
        console.error("Kullanıcı silme hatası:", error);
        alert("Kullanıcı silinirken bir hata oluştu: " + error.message);
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
    
    if (typeof db === "undefined" || !db) return;

    const usersSnap = await fbGet("ladesUsers");
    const users = usersSnap || {};
    const userEntry = Object.entries(users).find(([key, u]) => u && u.email === email);

    if (userEntry) {
        const [userKey, userObj] = userEntry;
        userObj.balance = targetBalance; 
        await fbSet(`ladesUsers/${userKey}`, userObj);
        alert(`Başarılı! Bakiyesi ${targetBalance.toLocaleString("tr-TR")} Token olarak güncellendi.`);
    }
}

// ------------------------------------------------------
// TOKEN TALEBİ
// ------------------------------------------------------
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

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return new Date(timestamp).toLocaleDateString('tr-TR');
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    
    const panel = document.getElementById('chat-panel');
    if (panel) {
        panel.addEventListener('transitionend', () => {
            if (panel.classList.contains('open')) {
                const input = document.getElementById('chat-input');
                if (input) input.focus();
            }
        });
    }
    
    setTimeout(() => {
        loadChatMessages('global');
    }, 500);
}

// ------------------------------------------------------
// ADMIN: LADESİ SİLME VE KULLANICI TOKENLARINI İADE ETME
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
// GEÇMİŞ LADESİ SİLME (SADECE ADMIN - TOKEN İADESİZ)
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
// CANLI BAHİS AKIŞI (LIVE FEED)
// ------------------------------------------------------
let liveBetHistory = [];
let liveBetListener = null;
const MAX_LIVE_BETS = 20;

function startLiveFeed() {
    console.log("🔥 Canlı bahis akışı başlatılıyor...");
    
    if (typeof db === "undefined" || !db) {
        console.warn("⚠️ Firebase bağlantısı yok, canlı akış başlatılamadı.");
        return;
    }
    
    if (liveBetListener) {
        liveBetListener();
        liveBetListener = null;
    }
    
    liveBetListener = fbRef("liveBets").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const bets = Object.values(data)
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, MAX_LIVE_BETS);
            liveBetHistory = bets;
            renderLiveFeed();
        } else {
            liveBetHistory = [];
            renderLiveFeed();
        }
    });
}

function renderLiveFeed() {
    const container = document.getElementById('live-feed-container');
    const countElement = document.getElementById('live-feed-count');
    
    if (!container) return;
    
    if (liveBetHistory.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#64748b; padding:15px; font-size:12px;">
                💤 Henüz bahis yapılmamış.
            </div>
        `;
        if (countElement) countElement.textContent = "0";
        return;
    }
    
    if (countElement) countElement.textContent = liveBetHistory.length;
    
    container.innerHTML = liveBetHistory.map((bet, index) => {
        const timeAgo = getTimeAgo(bet.timestamp);
        const isBig = bet.amount >= 500;
        const isNew = index < 3;
        
        const choiceColor = bet.choice === "EVET" ? "#22c55e" : 
                           (bet.choice === "HAYIR" ? "#ef4444" : "#f59e0b");
        
        let icon = "🔥";
        let iconColor = "#f59e0b";
        if (isBig) {
            icon = "💰";
            iconColor = "#ff4aa2";
        } else if (bet.type === "new_market") {
            icon = "🆕";
            iconColor = "#24ffff";
        } else if (isNew) {
            icon = "⚡";
            iconColor = "#24ffff";
        }
        
        const borderColor = isBig ? "#ff4aa2" : (isNew ? "#24ffff" : "transparent");
        
        return `
            <div style="
                background: rgba(255,255,255,0.02);
                border-left: 2px solid ${borderColor};
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 11px;
                animation: fadeInFeed 0.3s ease;
                transition: all 0.2s;
                cursor: default;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.05)'"
            onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span style="color:${iconColor}; font-size:12px;">${icon}</span>
                    <span style="font-weight:600; color:#94a3b8; font-size:11px;">${bet.userName}</span>
                    <span style="color:#64748b; font-size:10px;">•</span>
                    <span style="color:#64748b; font-size:10px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${bet.marketTitle}"</span>
                    <span style="color:${choiceColor}; font-weight:700; font-size:11px;">${bet.choice}</span>
                    <span style="color:#24ffff; font-weight:600; font-size:11px;">${bet.amount.toLocaleString("tr-TR")}</span>
                    <span style="color:#64748b; font-size:9px; margin-left:auto;">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = 0;
}

async function addLiveBet(userName, marketTitle, choice, amount, marketId) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const betId = uniqueId("live");
        const choiceText = choice === "YES" ? "EVET" : (choice === "NO" ? "HAYIR" : "BERABERLİK");
        
        await fbSet(`liveBets/${betId}`, {
            id: betId,
            userName: userName,
            marketTitle: marketTitle,
            choice: choiceText,
            amount: amount,
            timestamp: Date.now(),
            marketId: marketId,
            type: "bet"
        });
        
        const snapshot = await fbRef("liveBets").once("value");
        const data = snapshot.val();
        if (data) {
            const keys = Object.keys(data);
            if (keys.length > MAX_LIVE_BETS) {
                const sortedKeys = keys.sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
                const keysToRemove = sortedKeys.slice(MAX_LIVE_BETS);
                const removePromises = keysToRemove.map(key => fbRemove(`liveBets/${key}`));
                await Promise.all(removePromises);
            }
        }
    } catch (error) {
        console.error("Canlı bahis ekleme hatası:", error);
    }
}

async function addNewMarketNotification(userName, marketTitle, marketId) {
    if (typeof db === "undefined" || !db) return;
    
    try {
        const betId = uniqueId("live");
        
        await fbSet(`liveBets/${betId}`, {
            id: betId,
            userName: userName,
            marketTitle: marketTitle,
            choice: "🆕 Yeni Lades!",
            amount: 0,
            timestamp: Date.now(),
            marketId: marketId,
            type: "new_market"
        });
        
        const snapshot = await fbRef("liveBets").once("value");
        const data = snapshot.val();
        if (data) {
            const keys = Object.keys(data);
            if (keys.length > MAX_LIVE_BETS) {
                const sortedKeys = keys.sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
                const keysToRemove = sortedKeys.slice(MAX_LIVE_BETS);
                const removePromises = keysToRemove.map(key => fbRemove(`liveBets/${key}`));
                await Promise.all(removePromises);
            }
        }
    } catch (error) {
        console.error("Yeni lades bildirimi ekleme hatası:", error);
    }
}

function stopLiveFeed() {
    if (liveBetListener) {
        liveBetListener();
        liveBetListener = null;
    }
    console.log("⏹️ Canlı bahis akışı durduruldu.");
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

// ======================================================
// CHAT KÜÇÜLT/BÜYÜT VE TEMİZLEME (EKLENECEK FONKSİYONLAR)
// ======================================================

// ------------------------------------------------------
// CHAT KÜÇÜLT/BÜYÜT
// ------------------------------------------------------
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

// ------------------------------------------------------
// CHAT GEÇMİŞİNİ TEMİZLE (SADECE ADMIN)
// ------------------------------------------------------
async function clearChatHistory() {
    const currentUserEmail = localStorage.getItem("currentUser");
    
    // Admin kontrolü
    if (currentUserEmail !== "tsulhan@gmail.com") {
        alert("❌ Bu işlem sadece yönetici tarafından yapılabilir!");
        return;
    }
    
    // Hangi chat'in temizleneceğini sor
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
            // Tüm chat'leri temizle
            await fbRemove("chats");
            alert("✅ Tüm chat geçmişi başarıyla temizlendi!");
        } else {
            // Sadece aktif chat'i temizle
            let chatPath = 'chats/global';
            if (currentChatTab === 'market' && currentMarketIdForChat) {
                chatPath = `chats/market_${currentMarketIdForChat}`;
            }
            await fbRemove(chatPath);
            alert(`✅ "${currentChatTab === 'global' ? 'Global Chat' : 'Lades Chat'}" başarıyla temizlendi!`);
        }
        
        document.body.removeChild(loadingMsg);
        
        // Chat mesajlarını yeniden yükle
        loadChatMessages(currentChatTab);
        
    } catch (error) {
        console.error("Chat temizleme hatası:", error);
        alert("❌ Chat temizlenirken bir hata oluştu: " + error.message);
        const loadingMsg = document.querySelector('div[style*="position:fixed"]');
        if (loadingMsg) document.body.removeChild(loadingMsg);
    }
}