// --- UPDATE UI FONKSİYONU (LADESLERİ LİSTELEME) ---
function updateUI() {
    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) return;
    
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const user = users.find(u => u.email === currentUserEmail) || { email: currentUserEmail, balance: 0, isAdmin: false };

    const userEmailBadge = document.getElementById('user-email-badge');
    if (userEmailBadge) userEmailBadge.innerText = user.email;

    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) balanceElement.innerText = user.balance;

    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) adminBtn.style.display = user.isAdmin ? 'block' : 'none';

    const marketGrid = document.getElementById('market-grid');
    if (!marketGrid) return;

    let markets = JSON.parse(localStorage.getItem('customMarkets')).filter(m => m.status === "Aktif");
    if (selectedCategoryFilter !== "Tümü") {
        markets = markets.filter(m => m.category === selectedCategoryFilter);
    }

    marketGrid.innerHTML = "";
    if (markets.length === 0) {
        marketGrid.innerHTML = `<div style="text-align:center; color:#64748b; padding:40px; width:100%;">Bu kategoride aktif bir lades bulunmuyor.</div>`;
        return;
    }

    markets.forEach(market => {
        // Eğer spor kategorisiyse beraberlik havuzunu da hesaba kat, değilse 0 al
        const drawPool = market.drawPool || 0;
        const totalVolume = market.yesPool + market.noPool + drawPool;
        
        let yesPercent = 33, noPercent = 33, drawPercent = 34;
        if (totalVolume > 0) {
            yesPercent = Math.round((market.yesPool / totalVolume) * 100);
            drawPercent = drawPool > 0 ? Math.round((drawPool / totalVolume) * 100) : 0;
            noPercent = 100 - (yesPercent + drawPercent);
        }

        // Eğer kategori SPOR ise 3 butonlu (EVET - BERABERLİK - HAYIR) tasarım basılıyor
        let actionButtons = "";
        if (market.category === "Spor") {
            actionButtons = `
                <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'YES')">EVET %${yesPercent}</button>
                <button class="btn-bet btn-draw" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'DRAW')">BERABERLİK %${drawPercent}</button>
                <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'NO')">HAYIR %${noPercent}</button>
            `;
        } else {
            // Spor dışındaki kategorilerde eski 2 butonlu sistem aynen kalıyor
            actionButtons = `
                <button class="btn-bet btn-yes" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'YES')">EVET %${yesPercent}</button>
                <button class="btn-bet btn-no" onclick="openBetModal('${market.id}', '${market.title.replace(/'/g, "\\'")}', 'NO')">HAYIR %${noPercent}</button>
            `;
        }

        marketGrid.innerHTML += `
            <div class="market-card">
                <div class="market-info">
                    <span class="category-badge">${market.category || 'Genel'}</span>
                    <h3>${market.title}</h3>
                    <p>Bitiş: ${market.date} • Hacim: <span style="color:#24ffff; font-weight:700;">${totalVolume.toLocaleString('tr-TR')}</span> Token</p>
                </div>
                <div class="market-actions">
                    ${actionButtons}
                </div>
            </div>`;
    });
}

// --- CREATE NEW MARKET FONKSİYONU (LADES YARATMA) ---
function createNewMarket() {
    const title = document.getElementById('market-question').value.trim();
    const date = document.getElementById('market-date').value;
    const initialBet = parseInt(document.getElementById('market-initial-bet').value);
    const choice = document.getElementById('market-choice').value;
    const category = document.getElementById('market-category').value;
    
    const currentUserEmail = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('ladesUsers'));
    const userIndex = users.findIndex(u => u.email === currentUserEmail);

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) { alert("Lütfen tüm alanları doğru doldurun!"); return; }
    if (initialBet > users[userIndex].balance) { alert("Yetersiz bakiye!"); return; }

    users[userIndex].balance -= initialBet;
    localStorage.setItem('ladesUsers', JSON.stringify(users));

    const marketId = 'custom_' + Date.now();
    
    // Yeni pazar objesine drawPool (Beraberlik Havuzu) ekliyoruz
    const newMarket = {
        id: marketId,
        title: title,
        date: date,
        yesPool: choice === 'YES' ? initialBet : 0,
        drawPool: choice === 'DRAW' ? initialBet : 0,
        noPool: choice === 'NO' ? initialBet : 0,
        category: category,
        status: "Aktif"
    };

    const markets = JSON.parse(localStorage.getItem('customMarkets'));
    markets.push(newMarket);
    localStorage.setItem('customMarkets', JSON.stringify(markets));

    alert(`⚡ Lades Başarıyla Yaratıldı!`);
    document.getElementById('market-question').value = "";
    document.getElementById('market-initial-bet').value = "";
    switchTab('mevcut-ladesler');
    updateUI();
}