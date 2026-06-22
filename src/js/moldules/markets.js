// ======================================================
// MARKETS MODÜLÜ - Lades Oluşturma, Listeleme
// ======================================================

// LADES OLUŞTUR
async function createNewMarket() {
    console.log("🆕 Lades oluşturma başlatıldı...");
    
    const title = document.getElementById("market-question")?.value.trim();
    const date = document.getElementById("market-date")?.value;
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

    if (!title || !date) {
        alert("Lütfen alanları doğru doldurun!");
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

    const newMarket = {
        id: marketId,
        title,
        date,
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

    const creatorNickname = currentUser.nickname || maskUserEmail(currentUserEmail);
    
    if (typeof sendNotificationToAllUsers === 'function') {
        await sendNotificationToAllUsers({
            title: "📢 Yeni Lades!",
            message: `${creatorNickname}, "${title}" ladesini oluşturdu!`,
            type: "new_market",
            marketId: marketId,
            link: "dashboard.html?tab=mevcut-ladesler"
        });
    }

    alert(`⚡ Lades Başarıyla Yaratıldı!\n\n💰 Yatırılan: ${initialBet.toLocaleString("tr-TR")} Token`);

    document.getElementById("market-question").value = "";
    document.getElementById("market-initial-bet").value = "";

    // Mevcut Ladesler sekmesine geç
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        if (btn.innerText.includes('Mevcut Ladesler')) btn.click();
    });
}

// LADESLERİ RENDER ET
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

    setTimeout(() => { updateCreatorNames(); }, 100);
}

// LADES KARTI HTML
function generateMarketCardHTML(market, isActive) {
    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;
    const totalVolume = market.category === "Spor" ? (yesPool + noPool + drawPool) : (yesPool + noPool);
    let yesPercent = 50, noPercent = 50, drawPercent = 0;
    if (totalVolume > 0) {
        yesPercent = Math.round((yesPool / totalVolume) * 100);
        noPercent = Math.round((noPool / totalVolume) * 100);
        if (market.category === "Spor") drawPercent = 100 - yesPercent - noPercent;
        else noPercent = 100 - yesPercent;
    }

    const safeTitle = (market.title || "").replace(/'/g, "\\'");
    const isSpor = market.category === "Spor";
    const currentUserEmail = localStorage.getItem("currentUser");
    const isAdmin = currentUserEmail === "tsulhan@gmail.com";
    const creator = market.createdBy || "Bilinmeyen";
    const creatorDisplay = maskUserEmail(creator);
    
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
        let winnerStyle = "width: 330px; margin-left: auto; flex-shrink: 0; text-align: center; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 0.5px;";
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
        actionContent = `<div style="${winnerStyle}">${winnerText}</div>`;
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

    return `
        <div class="market-card" style="position: relative; ${!isActive ? 'opacity: 0.9; border-color: #1c2541; background: #060b19;' : ''}">
            ${adminDeleteHTML}
            <div class="market-info">
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                    <span class="category-badge">${market.category || "Genel"}</span>
                    ${!isActive ? `<span class="category-badge" style="background:rgba(36,255,255,0.05); color:#24ffff; border-color:rgba(36,255,255,0.2); text-transform:none;"><i class="fa-solid fa-lock"></i> Arşiv</span>` : ''}
                </div>
                <h3>${market.title || "Başlıksız Lades"}</h3>
                <p>Bitiş: ${market.date || "-"} • Toplam Hacim: <span style="color:#24ffff; font-weight:700;">${totalVolume.toLocaleString("tr-TR")}</span> Token</p>
                <p style="font-size:12px; color:#64748b; margin-top:2px;">
                    👤 <span style="color:#ff4aa2; font-weight:600;" id="creator-${market.id}">${creatorDisplay}</span> tarafından açıldı
                </p>
                <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
                    <button onclick="openMarketChat('${market.id}', '${safeTitle}')" 
                            style="background:rgba(36,255,255,0.05); border:1px solid rgba(36,255,255,0.2); 
                                   color:#24ffff; padding:3px 10px; border-radius:12px; font-size:10px; 
                                   cursor:pointer; display:flex; align-items:center; gap:4px;
                                   transition: 0.2s;"
                            onmouseover="this.style.background='rgba(36,255,255,0.15)';"
                            onmouseout="this.style.background='rgba(36,255,255,0.05)';">
                        <i class="fa-solid fa-comment"></i> Sohbet
                    </button>
                </div>
            </div>
            ${actionContent}
        </div>
    `;
}

// LADESİ AÇAN KİŞİNİN İSMİNİ GÜNCELLE
async function updateCreatorNames() {
    const creatorSpans = document.querySelectorAll('[id^="creator-"]');
    for (const span of creatorSpans) {
        const marketId = span.id.replace('creator-', '');
        const marketsSnap = await fbGet("customMarkets");
        const markets = marketsSnap || {};
        const market = markets[marketId];
        if (market && market.createdBy) {
            const nickname = await getUserNickname(market.createdBy);
            if (nickname) span.textContent = nickname;
        }
    }
}

// KATEGORİ FİLTRELEME
function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;
    const buttons = document.querySelectorAll(".sidebar-menu button");
    buttons.forEach(btn => btn.classList.remove("active"));
    buttons.forEach(btn => {
        const text = btn.innerText || "";
        if (categoryName === "Tümü" && text.includes("Tümü")) btn.classList.add("active");
        else if (text.includes(categoryName)) btn.classList.add("active");
    });
    if (typeof fbGet === "function") {
        fbGet("customMarkets").then(marketsObj => {
            renderMarketGrid(marketsObj || {});
        }).catch(err => console.error("Filtreleme hatası:", err));
    }
}

// KATEGORİ SEÇENEĞİNİ GÜNCELLE
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
        if (choiceSelect.value === "DRAW") choiceSelect.value = "YES";
    }
}