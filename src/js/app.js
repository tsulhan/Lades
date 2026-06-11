// ============================================================================
// LADES (BETTING APP) - ANA UYGULAMA MANTIĞI (src/js/app.js)
// ============================================================================

// Global Durum Yönetimi (State)
let currentCategory = 'Tümü';
let userTokens = 0;
let selectedMarketKey = '';
let selectedBetDirection = '';

// DOM Yüklendiğinde Uygulamayı Başlat
document.addEventListener("DOMContentLoaded", () => {
    checkUserAuthentication();
});

// ============================================================================
// 1. KULLANICI KONTROLÜ VE KALICI ADMIN / TOKEN GÜVENLİĞİ
// ============================================================================
function checkUserAuthentication() {
    const currentUserEmail = localStorage.getItem('currentUser');
    
    // Güvenlik Duvarı: Giriş yapılmamışsa veya geçersiz veri varsa login'e fırlat
    if (!currentUserEmail || currentUserEmail === 'null' || currentUserEmail === 'undefined' || currentUserEmail.trim() === '') {
        localStorage.removeItem('currentUser');
        window.location.replace('login.html');
        return;
    }

    // Firebase Key Kuralları: E-posta içindeki '.' karakterlerini ',' ile değiştiriyoruz
    const userCleanKey = currentUserEmail.replace(/\./g, ',');

    // TSULHAN@GMAIL.COM İÇİN MUTLAK VE KALICI VERİTABANI KURALI
    if (currentUserEmail === 'tsulhan@gmail.com') {
        firebase.database().ref('users/' + userCleanKey).once('value').then((snapshot) => {
            const userData = snapshot.val() || {};
            
            // Eğer veritabanında isAdmin düşmüşse veya tokenı 10.000'den azsa Firebase'de zorla sabitle
            if (!userData.isAdmin || !userData.tokens || userData.tokens < 10000) {
                firebase.database().ref('users/' + userCleanKey).update({
                    email: currentUserEmail,
                    isAdmin: true,
                    tokens: 10000
                }).then(() => {
                    console.log("⚡ [SİSTEM] tsulhan@gmail.com için Yönetici Yetkileri ve 10,000 Başlangıç Tokenı Firebase üzerinde kalıcı olarak güncellendi.");
                    initRealtimeListeners(userCleanKey);
                });
            } else {
                initRealtimeListeners(userCleanKey);
            }
        }).catch((error) => {
            console.error("Kritik kullanıcı kontrol hatası:", error);
            initRealtimeListeners(userCleanKey);
        });
    } else {
        // Standart kullanıcılar için normal akış
        initRealtimeListeners(userCleanKey);
    }
}

// ============================================================================
// 2. REALTIME DATABASE DİNLEYİCİLERİ (CANLI VERİ AKIŞI)
// ============================================================================
function initRealtimeListeners(userCleanKey) {
    const currentUserEmail = localStorage.getItem('currentUser');

    // Kullanıcı Bilgilerini (Token, Adminlik vb.) Canlı Dinle
    firebase.database().ref('users/' + userCleanKey).on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            userTokens = userData.tokens || 0;
            
            // Üst Bar (Navbar) Bilgi Güncellemeleri
            const emailBadge = document.getElementById('user-email-badge');
            const tokenBalance = document.getElementById('token-balance');
            
            if (emailBadge) emailBadge.innerText = userData.email;
            if (tokenBalance) tokenBalance.innerText = userTokens.toLocaleString('tr-TR');

            // Sıfır Bakiye Uyarı Banner'ı Kontrolü
            const tokenBanner = document.getElementById('token-request-area');
            if (tokenBanner) {
                tokenBanner.style.display = (userTokens === 0) ? 'block' : 'none';
            }

            // YÖNETİCİ PANELİ BUTON GÖRÜNÜRLÜK KONTROLÜ (ZORLAMALI SAFELOCK)
            const adminBtn = document.getElementById('admin-panel-btn');
            if (adminBtn) {
                if (userData.isAdmin === true || currentUserEmail === 'tsulhan@gmail.com') {
                    adminBtn.style.setProperty('display', 'block', 'important');
                } else {
                    adminBtn.style.display = 'none';
                }
            }
        }
    });

    // Pazaryerindeki Ladesleri Listelemeyi Başlat
    loadMarkets();
}

// ============================================================================
// 3. PAZARYERİ MANTIĞI VE LADESLERİ RENDER ETME
// ============================================================================
function loadMarkets() {
    firebase.database().ref('markets').on('value', (snapshot) => {
        const markets = snapshot.val();
        const grid = document.getElementById('market-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        let hasActiveMarket = false;

        if (markets) {
            for (let key in markets) {
                const m = markets[key];
                
                // Sadece ACTIVE statüsündeki pazar yerlerini ana sayfada listele
                if (m.status !== 'ACTIVE') continue;
                
                // Kategori Filtreleme Mantığı
                if (currentCategory !== 'Tümü' && m.category !== currentCategory) continue;
                hasActiveMarket = true;

                // Buton Düzeni (Üç Seçenek / İki Seçenek Kontrolü)
                let actionClass = 'three-cols';
                let drawButton = `<button class="btn-bet btn-draw" onclick="openBetModal('${key}', \`${m.question}\`, 'DRAW')">BERABERLİK</button>`;
                
                if (m.choiceOptions === 'TWO_OPTIONS') {
                    actionClass = 'two-cols';
                    drawButton = '';
                }

                const card = `
                    <div class="market-card">
                        <div class="market-info">
                            <span class="category-badge">${m.category}</span>
                            <h3>${m.question}</h3>
                            <p>Kapanış: ${m.endDate} | Kurgulayan: ${m.creator}</p>
                        </div>
                        <div class="market-actions ${actionClass}">
                            <button class="btn-bet btn-yes" onclick="openBetModal('${key}', \`${m.question}\`, 'YES')">EVET</button>
                            ${drawButton}
                            <button class="btn-bet btn-no" onclick="openBetModal('${key}', \`${m.question}\`, 'NO')">HAYIR</button>
                        </div>
                    </div>
                `;
                grid.innerHTML += card;
            }
        }

        if (!hasActiveMarket) {
            grid.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:60px; width:100%; font-weight:600;">
                    <i class="fa-solid fa-folder-open" style="font-size:24px; margin-bottom:10px; display:block; color:#1c2541;"></i>
                    Şu an bu kategoride aktif bir lades bulunmuyor. "Yarat" sekmesinden ilk pazar yerini sen açabilirsin!
                </div>
            `;
        }
    });
}

// Kategori Butonları Tetikleyicisi
function filterCategory(categoryName) {
    currentCategory = categoryName;
    
    const buttons = document.querySelectorAll('.sidebar-menu button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    loadMarkets();
}

// Üst Sekme Geçişleri (Mevcut Ladesler / Yarat)
function switchTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(t => t.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// ============================================================================
// 4. YENİ LADES PAZARI OLUŞTURMA ALGORİTMASI
// ============================================================================
function createNewMarket() {
    const currentUserEmail = localStorage.getItem('currentUser');
    const category = document.getElementById('market-category').value;
    const question = document.getElementById('market-question').value.trim();
    const endDate = document.getElementById('market-date').value;
    const initialChoice = document.getElementById('market-choice').value;
    const initialBet = parseInt(document.getElementById('market-initial-bet').value);

    // Form Validasyonları
    if (!question || !endDate || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen tüm alanları eksiksiz doldurun ve geçerli bir token girin.");
        return;
    }

    if (initialBet > userTokens) {
        alert(`Bakiye yetersiz! Hesapta bulunan miktar: ${userTokens} TOKEN`);
        return;
    }

    // Eğer pazar oluşturulurken 'BERABERLİK' seçeneği seçilmişse otomatik 3 opsiyonlu ayarla
    const choiceOptions = (initialChoice === 'DRAW') ? 'THREE_OPTIONS' : 'TWO_OPTIONS';
    const newMarketRef = firebase.database().ref('markets').push();
    const marketId = newMarketRef.key;

    // 1. Adım: Yeni İddia Pazarını Oluştur
    newMarketRef.set({
        category: category,
        question: question,
        endDate: endDate,
        creator: currentUserEmail,
        choiceOptions: choiceOptions,
        status: 'ACTIVE',
        createdAt: Date.now()
    }).then(() => {
        // 2. Adım: Pazarı kuran kişinin ilk bahsini havuz sistemine işlet
        return firebase.database().ref('bets/' + marketId).push({
            user: currentUserEmail,
            direction: initialChoice,
            amount: initialBet,
            timestamp: Date.now()
        });
    }).then(() => {
        // 3. Adım: Kullanıcının token bakiyesini düşür
        const userCleanKey = currentUserEmail.replace(/\./g, ',');
        return firebase.database().ref('users/' + userCleanKey + '/tokens').set(userTokens - initialBet);
    }).then(() => {
        alert("Lades pazarınız oluşturuldu ve ilk bahsiniz başarıyla kilitlendi! ⚡");
        
        // Formu resetle ve ana sayfaya geri döndür
        document.getElementById('market-question').value = '';
        document.getElementById('market-initial-bet').value = '';
        switchTab('mevcut-ladesler');
        
        // Tab arayüz odaklanmasını güncelle
        const defaultTabBtn = document.querySelector('[onclick="switchTab(\'mevcut-ladesler\')"]');
        if (defaultTabBtn) {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            defaultTabBtn.classList.add('active');
        }
    }).catch((err) => {
        alert("Pazar oluşturulurken teknik hata meydana geldi: " + err.message);
    });
}

// ============================================================================
// 5. BAHİS MODAL YÖNETİMİ VE CÜZDAN ENJEKSİYONU
// ============================================================================
function openBetModal(marketKey, question, direction) {
    selectedMarketKey = marketKey;
    selectedBetDirection = direction;
    
    document.getElementById('modal-market-title').innerText = question;
    document.getElementById('modal-bet-choice').innerText = direction === 'YES' ? 'EVET' : (direction === 'NO' ? 'HAYIR' : 'BERABERLİK');
    document.getElementById('bet-amount').value = '';
    
    const modal = document.getElementById('bet-modal-overlay');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
    }
}

function closeModal() {
    const modal = document.getElementById('bet-modal-overlay');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
}

function confirmBet() {
    const amount = parseInt(document.getElementById('bet-amount').value);
    if (isNaN(amount) || amount <= 0) {
        alert("Lütfen yatırmak istediğiniz pozisyon miktarı için geçerli bir sayı girin.");
        return;
    }

    if (amount > userTokens) {
        alert(`Cüzdan bakiyesi yetersiz! Maksimum ${userTokens} token yatırabilirsiniz.`);
        return;
    }

    const currentUserEmail = localStorage.getItem('currentUser');
    const userCleanKey = currentUserEmail.replace(/\./g, ',');

    // Bahis hareketini 'bets' altına kaydet
    firebase.database().ref('bets/' + selectedMarketKey).push({
        user: currentUserEmail,
        direction: selectedBetDirection,
        amount: amount,
        timestamp: Date.now()
    }).then(() => {
        // Kullanıcının güncel bakiyesinden token'ı düşür
        return firebase.database().ref('users/' + userCleanKey + '/tokens').set(userTokens - amount);
    }).then(() => {
        alert("Bahsiniz başarıyla cüzdandan düşüldü ve havuzda kilitlendi! ⚡");
        closeModal();
    }).catch((err) => {
        alert("Bahis işlenirken hata oluştu: " + err.message);
    });
}

// ============================================================================
// 6. DETAYLI YÖNETİCİ PANELİ (ADMIN) MATRİS VE HAVUZ ALGORİTMALARI
// ============================================================================
function openAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'flex';
    loadAdminData();
}

function closeAdminPanel() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
}

function loadAdminData() {
    loadAdminUsers();
    loadAdminActiveMarkets();
    loadAdminRequests();
    loadAdminInviteCodes();
}

// Kayıtlı Kullanıcıları Listeleme ve Bakiye Kontrolü
function loadAdminUsers() {
    firebase.database().ref('users').once('value').then((snapshot) => {
        const users = snapshot.val();
        const tbody = document.getElementById('admin-users-list');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        if (users) {
            for (let key in users) {
                const u = users[key];
                const cleanMail = u.email;
                const isUserAdmin = u.isAdmin === true || cleanMail === 'tsulhan@gmail.com';
                
                const tr = `
                    <tr style="border-bottom:1px solid #1c2541; font-size:13px; color:#e2e8f0;">
                        <td style="padding:12px 6px;">${cleanMail}</td>
                        <td>${isUserAdmin ? '******' : (u.password || '1234')}</td>
                        <td><span style="color:#24ffff; font-weight:700;">${(u.tokens || 0).toLocaleString('tr-TR')}</span> TOKEN</td>
                        <td style="text-align:right;">
                            <button onclick="editUserTokens('${key}', ${(u.tokens || 0)})" style="background:rgba(36,255,255,0.1); border:1px solid #24ffff; color:#24ffff; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:700;">DÜZENLE</button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += tr;
            }
        }
    });
}

// Manuel Bakiye Düzenleme Fonksiyonu
function editUserTokens(userKey, currentAmount) {
    const newAmount = prompt(`Kullanıcının yeni token miktarını girin:`, currentAmount);
    if (newAmount === null) return;
    
    const parsed = parseInt(newAmount);
    if (isNaN(parsed) || parsed < 0) {
        alert("Geçersiz miktar girdiniz.");
        return;
    }

    firebase.database().ref('users/' + userKey + '/tokens').set(parsed).then(() => {
        alert("Kullanıcı cüzdanı başarıyla güncellendi.");
        loadAdminUsers();
    });
}

// Aktif Pazarları Sonuçlandırma Tablosunu Çekme
function loadAdminActiveMarkets() {
    firebase.database().ref('markets').once('value').then((snapshot) => {
        const markets = snapshot.val();
        const container = document.getElementById('admin-active-markets');
        if (!container) return;
        
        container.innerHTML = '';
        let hasMarkets = false;

        if (markets) {
            for (let key in markets) {
                const m = markets[key];
                if (m.status !== 'ACTIVE') continue;
                hasMarkets = true;

                const card = `
                    <div style="background:#030814; border:1px solid #1c2541; padding:12px; margin-bottom:10px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="max-width:60%;">
                            <strong style="color:#fff; font-size:14px; display:block;">${m.question}</strong>
                            <small style="color:#64748b;">Kategori: ${m.category} | Kurucu: ${m.creator}</small>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="resolveMarket('${key}', 'YES')" style="background:#22c55e; color:#000; border:none; padding:6px 12px; font-weight:800; border-radius:6px; cursor:pointer; font-size:11px;">EVET KAZANDI</button>
                            ${m.choiceOptions === 'THREE_OPTIONS' ? `<button onclick="resolveMarket('${key}', 'DRAW')" style="background:#f59e0b; color:#000; border:none; padding:6px 12px; font-weight:800; border-radius:6px; cursor:pointer; font-size:11px;">BERABERE</button>` : ''}
                            <button onclick="resolveMarket('${key}', 'NO')" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; font-weight:800; border-radius:6px; cursor:pointer; font-size:11px;">HAYIR KAZANDI</button>
                            <button onclick="cancelMarket('${key}')" style="background:transparent; border:1px solid #64748b; color:#64748b; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:11px;">İPTAL</button>
                        </div>
                    </div>
                `;
                container.innerHTML += card;
            }
        }

        if (!hasMarkets) {
            container.innerHTML = `<div style="color:#64748b; font-size:13px; text-align:center; padding:10px;">Sonuçlandırılacak aktif iddia pazarı bulunmuyor.</div>`;
        }
    });
}

// KRİTİK ALGORİTMA: MATEMATİKSEL KAZANÇ DAĞITIM HAVUZ SİSTEMİ
function resolveMarket(marketKey, winningDirection) {
    if (!confirm(`Bu ladesi '${winningDirection}' yönünde kapatmak ve havuz dağıtımını başlatmak istediğinize emin misiniz?`)) return;

    let totalPool = 0;
    let winningPool = 0;
    const betsList = [];

    // 1. Adım: Pazara ait tüm bahisleri çek, havuz matrisini çıkart
    firebase.database().ref('bets/' + marketKey).once('value').then((snapshot) => {
        const bets = snapshot.val();
        if (!bets) {
            // Eğer hiç bahis yatırılmamışsa direkt pazarı kapat
            return firebase.database().ref('markets/' + marketKey + '/status').set('RESOLVED_' + winningDirection);
        }

        for (let bKey in bets) {
            const b = bets[bKey];
            totalPool += b.amount;
            if (b.direction === winningDirection) {
                winningPool += b.amount;
            }
            betsList.push(b);
        }

        // 2. Adım: Havuz dağıtım simülasyonunu başlat
        if (winningPool === 0) {
            alert("Bu yönü doğru tahmin eden kimse çıkmadı! Toplam havuz kasada kaldı.");
            return firebase.database().ref('markets/' + marketKey + '/status').set('RESOLVED_' + winningDirection);
        }

        // Kazanan kişilerin cüzdanlarını güncelle (Orantılı Pay Dağıtımı)
        const promises = betsList.map((bet) => {
            if (bet.direction === winningDirection) {
                // Formül: (Kişinin Yatırdığı / Toplam Kazanan Havuzu) * Toplam Büyük Havuz
                const prize = Math.floor((bet.amount / winningPool) * totalPool);
                const targetUserKey = bet.user.replace(/\./g, ',');
                
                return firebase.database().ref('users/' + targetUserKey + '/tokens').once('value').then((uSnap) => {
                    const currentTokens = uSnap.val() || 0;
                    return firebase.database().ref('users/' + targetUserKey + '/tokens').set(currentTokens + prize);
                });
            }
            return Promise.resolve();
        });

        return Promise.all(promises);
    }).then(() => {
        // 3. Adım: Pazar durumunu güncelle ve arayüzü tazele
        return firebase.database().ref('markets/' + marketKey + '/status').set('RESOLVED_' + winningDirection);
    }).then(() => {
        alert(`Lades başarıyla sonuçlandırıldı! Havuz (${totalPool} Token) kazananlar arasında paylaştırıldı. 🏁`);
        loadAdminActiveMarkets();
        loadAdminUsers();
    }).catch((err) => {
        alert("Havuz dağıtımı yapılırken teknik bir arıza oluştu: " + err.message);
    });
}

// Pazar İptal Etme ve Paraları İade Etme Algoritması
function cancelMarket(marketKey) {
    if (!confirm("Bu pazarı iptal etmek ve yatırılan tüm tokenları sahiplerine iade etmek istiyor musunuz?")) return;

    firebase.database().ref('bets/' + marketKey).once('value').then((snapshot) => {
        const bets = snapshot.val();
        if (!bets) return Promise.resolve();

        const promises = Object.keys(bets).map((bKey) => {
            const b = bets[bKey];
            const targetUserKey = b.user.replace(/\./g, ',');
            
            return firebase.database().ref('users/' + targetUserKey + '/tokens').once('value').then((uSnap) => {
                const currentTokens = uSnap.val() || 0;
                return firebase.database().ref('users/' + targetUserKey + '/tokens').set(currentTokens + b.amount);
            });
        });

        return Promise.all(promises);
    }).then(() => {
        return firebase.database().ref('markets/' + marketKey + '/status').set('CANCELLED');
    }).then(() => {
        alert("Lades pazarı iptal edildi ve tüm bakiyeler sahiplerine iade edildi. ↩️");
        loadAdminActiveMarkets();
        loadAdminUsers();
    });
}

// Bekleyen Token & Giriş İstekleri Yönetimi
function loadAdminRequests() {
    const listDiv = document.getElementById('admin-requests-list');
    if (!listDiv) return;
    listDiv.innerHTML = `<div style="color:#64748b; font-size:13px; padding:5px;">Bekleyen onay mekanizması aktif. Otomatik onay devrededir.</div>`;
}

// Davet Kodlarını Listeleme Bölümü
function loadAdminInviteCodes() {
    firebase.database().ref('inviteCodes').once('value').then((snapshot) => {
        const codes = snapshot.val();
        const container = document.getElementById('admin-codes-list');
        if (!container) return;
        
        container.innerHTML = '';
        if (codes) {
            for (let key in codes) {
                const c = codes[key];
                const badge = `
                    <span style="background:rgba(36,255,255,0.05); border:1px solid #1c2541; padding:4px 10px; border-radius:6px; font-size:12px; color:#24ffff; font-family:monospace;">
                        ${c.code} (${c.status === 'ACTIVE' ? 'Aktif' : 'Kullanıldı'})
                    </span>
                `;
                container.innerHTML += badge;
            }
        } else {
            container.innerHTML = `<span style="color:#64748b; font-size:13px;">Üretilmiş davet kodu bulunmuyor.</span>`;
        }
    });
}

// Rastgele Davet Kodu Üretici
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'LADES-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    firebase.database().ref('inviteCodes').push({
        code: code,
        status: 'ACTIVE',
        createdAt: Date.now()
    }).then(() => {
        loadAdminInviteCodes();
    });
}

// Hard Reset: LocalStorage Temizleme Butonu Fonksiyonu
function hardResetDatabase() {
    if (confirm("DİKKAT! Bu işlem tarayıcınızdaki tüm oturum hafızasını sıfırlayacaktır. Devam edilsin mi?")) {
        localStorage.clear();
        alert("Hafıza temizlendi! Giriş sayfasına yönlendiriliyorsunuz.");
        window.location.replace('login.html');
    }
}

// ============================================================================
// 7. GÜVENLİ OTURUM KAPATMA (LOGOUT) MANTIĞI
// ============================================================================
function logout() {
    if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        localStorage.removeItem('currentUser');
        window.location.replace('login.html');
    }
}