// ======================================================
// LADES APP-STATS.JS - İSTATİSTİK FONKSİYONLARI
// ======================================================

// ------------------------------------------------------
// İSTATİSTİKLERİ YÜKLE
// ------------------------------------------------------
async function loadStats() {
    console.log("📊 İstatistikler yükleniyor...");
    
    if (typeof db === "undefined" || !db) {
        console.warn("⚠️ Firebase bağlantısı yok!");
        return;
    }

    try {
        const [usersSnap, marketsSnap, historySnap] = await Promise.all([
            fbGet("ladesUsers"),
            fbGet("customMarkets"),
            fbGet("betHistory")
        ]);

        const users = usersSnap || {};
        const markets = marketsSnap || {};
        const history = historySnap || {};

        renderWeeklyWinners(users, history);
        renderMostBetMarkets(markets, history);
        renderBiggestPools(markets);

    } catch (error) {
        console.error("❌ İstatistik yükleme hatası:", error);
    }
}

// ------------------------------------------------------
// 1. HAFTANIN KAZANANLARI
// ------------------------------------------------------
function renderWeeklyWinners(users, history) {
    const container = document.getElementById('weekly-winners');
    if (!container) return;

    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const recentBets = Object.values(history)
        .filter(b => b && b.createdAt && b.createdAt > weekAgo);

    const userEarnings = {};
    recentBets.forEach(bet => {
        if (!userEarnings[bet.email]) {
            userEarnings[bet.email] = 0;
        }
        userEarnings[bet.email] += bet.amount || 0;
    });

    const sorted = Object.entries(userEarnings)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="stats-empty">
                <i class="fa-solid fa-inbox"></i> Henüz veri yok
            </div>
        `;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const ranks = ['gold', 'silver', 'bronze'];

    container.innerHTML = sorted.map(([email, amount], index) => {
        const user = Object.values(users).find(u => u.email === email);
        const displayName = user?.nickname || maskUserEmail(email);
        
        return `
            <div class="stats-item">
                <span class="rank ${ranks[index] || ''}">${medals[index] || '•'}</span>
                <span class="name">${displayName}</span>
                <span class="value">${amount.toLocaleString("tr-TR")} Token</span>
            </div>
        `;
    }).join('');
}

// ------------------------------------------------------
// 2. EN ÇOK BAHİS YAPILAN LADESLER
// ------------------------------------------------------
function renderMostBetMarkets(markets, history) {
    const container = document.getElementById('most-bet-markets');
    if (!container) return;

    const marketBetCount = {};
    Object.values(history).forEach(bet => {
        if (bet && bet.marketId) {
            if (!marketBetCount[bet.marketId]) {
                marketBetCount[bet.marketId] = 0;
            }
            marketBetCount[bet.marketId]++;
        }
    });

    const sorted = Object.entries(marketBetCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="stats-empty">
                <i class="fa-solid fa-inbox"></i> Henüz bahis yapılmamış
            </div>
        `;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const ranks = ['gold', 'silver', 'bronze'];

    container.innerHTML = sorted.map(([marketId, count], index) => {
        const market = markets[marketId];
        const title = market?.title || 'Bilinmeyen Lades';
        const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
        
        return `
            <div class="stats-item">
                <span class="rank ${ranks[index] || ''}">${medals[index] || '•'}</span>
                <span class="name">"${shortTitle}"</span>
                <span class="value">${count} bahis</span>
            </div>
        `;
    }).join('');
}

// ------------------------------------------------------
// 3. EN BÜYÜK HAVUZLAR
// ------------------------------------------------------
function renderBiggestPools(markets) {
    const container = document.getElementById('biggest-pools');
    if (!container) return;

    const marketPools = Object.values(markets)
        .filter(m => m && m.status === "Aktif")
        .map(m => {
            const yesPool = m.yesPool || 0;
            const noPool = m.noPool || 0;
            const drawPool = m.drawPool || 0;
            const total = m.category === "Spor" 
                ? (yesPool + noPool + drawPool) 
                : (yesPool + noPool);
            
            return {
                id: m.id,
                title: m.title || 'Başlıksız',
                total: total
            };
        })
        .filter(m => m.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

    if (marketPools.length === 0) {
        container.innerHTML = `
            <div class="stats-empty">
                <i class="fa-solid fa-inbox"></i> Aktif lades bulunmuyor
            </div>
        `;
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const ranks = ['gold', 'silver', 'bronze'];

    container.innerHTML = marketPools.map((market, index) => {
        const shortTitle = market.title.length > 20 ? market.title.substring(0, 20) + '...' : market.title;
        
        return `
            <div class="stats-item">
                <span class="rank ${ranks[index] || ''}">${medals[index] || '•'}</span>
                <span class="name">"${shortTitle}"</span>
                <span class="value">${market.total.toLocaleString("tr-TR")} Token</span>
            </div>
        `;
    }).join('');
}

// ------------------------------------------------------
// İSTATİSTİKLERİ YENİLE (Gerçek zamanlı)
// ------------------------------------------------------
function startStatsListener() {
    console.log("📊 İstatistik dinleyicisi başlatıldı.");
    
    setInterval(() => {
        const statsTab = document.getElementById('istatistikler');
        if (statsTab && statsTab.classList.contains('active')) {
            loadStats();
        }
    }, 30000);
}