// ======================================================
// LADES APP-HELPERS.JS - YARDIMCI FONKSİYONLAR
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
// LADES KARTLARI VE RENDER (Sohbet Butonu Kaldırıldı)
// ------------------------------------------------------
function generateMarketCardHTML(market, isActive) {
    const yesPool = market.yesPool || 0;
    const noPool = market.noPool || 0;
    const drawPool = market.drawPool || 0;

    const totalVolume = market.category === "Spor"
        ? (yesPool + noPool + drawPool)
        : (yesPool + noPool);

    const odds = {
        YES: totalVolume > 0 ? (totalVolume / (yesPool || 1)) : 1,
        NO: totalVolume > 0 ? (totalVolume / (noPool || 1)) : 1,
        DRAW: totalVolume > 0 ? (totalVolume / (drawPool || 1)) : 1
    };

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
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')" 
                            style="display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 6px;">
                        <span>EVET %${yesPercent}</span>
                        <span style="font-size:9px; opacity:0.6; font-weight:400;">${odds.YES.toFixed(2)}x</span>
                    </button>
                    <button class="btn-bet btn-draw" onclick="openBetModal('${market.id}', '${safeTitle}', 'DRAW')" 
                            style="display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 6px;">
                        <span>BERABERLİK %${drawPercent}</span>
                        <span style="font-size:9px; opacity:0.6; font-weight:400;">${odds.DRAW.toFixed(2)}x</span>
                    </button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')" 
                            style="display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 6px;">
                        <span>HAYIR %${noPercent}</span>
                        <span style="font-size:9px; opacity:0.6; font-weight:400;">${odds.NO.toFixed(2)}x</span>
                    </button>
                </div>
            `;
        } else {
            actionContent = `
                <div class="market-actions ${colsClass}">
                    <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${safeTitle}', 'YES')" 
                            style="display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 6px;">
                        <span>EVET %${yesPercent}</span>
                        <span style="font-size:9px; opacity:0.6; font-weight:400;">${odds.YES.toFixed(2)}x</span>
                    </button>
                    <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${safeTitle}', 'NO')" 
                            style="display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 6px;">
                        <span>HAYIR %${noPercent}</span>
                        <span style="font-size:9px; opacity:0.6; font-weight:400;">${odds.NO.toFixed(2)}x</span>
                    </button>
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
                <!-- SADECE DETAYLAR BUTONU (Sohbet Butonu KALDIRILDI) -->
                <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
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
                    <div style="font-size: 13px; color: #94a3b8; margin-bottom: 6px;">📊 Bahis Dağılımı & Oranlar</div>
                    <div id="bet-details-${market.id}" style="font-size: 12px; color: #64748b;">
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid rgba(28,37,65,0.2);">
                            <span>✅ EVET</span>
                            <span style="color: #22c55e; font-weight:600;">${yesPool.toLocaleString("tr-TR")} Token (${yesPercent}%) - ${odds.YES.toFixed(2)}x</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid rgba(28,37,65,0.2);">
                            <span>❌ HAYIR</span>
                            <span style="color: #ef4444; font-weight:600;">${noPool.toLocaleString("tr-TR")} Token (${noPercent}%) - ${odds.NO.toFixed(2)}x</span>
                        </div>
                        ${isSpor ? `
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid rgba(28,37,65,0.2);">
                            <span>🤝 BERABERLİK</span>
                            <span style="color: #f59e0b; font-weight:600;">${drawPool.toLocaleString("tr-TR")} Token (${drawPercent}%) - ${odds.DRAW.toFixed(2)}x</span>
                        </div>
                        ` : ''}
                        <div style="display:flex; justify-content:space-between; padding: 4px 0; margin-top: 4px; font-weight:700; color:#24ffff;">
                            <span>💰 TOPLAM</span>
                            <span>${totalVolume.toLocaleString("tr-TR")} Token</span>
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: center;">
                            <i class="fa-solid fa-users"></i> Katılımcılar
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