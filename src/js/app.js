let currentUser = localStorage.getItem('lades_user') || '';

window.onload = function() {
    if (currentUser) {
        showApp();
    }
};

function login() {
    const name = document.getElementById('username').value.trim();
    if (!name) {
        alert('Lütfen adınızı yazın.');
        return;
    }
    localStorage.setItem('lades_user', name);
    currentUser = name;
    showApp();
}

function logout() {
    localStorage.removeItem('lades_user');
    location.reload();
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-badge').innerText = currentUser.split(' ')[0];
    document.getElementById('profile-name').innerText = currentUser;
    verileriDinle();
}

// Sekme Değiştirici Fonksiyon (Flutter Tarzı Akıcı Geçiş)
function switchTab(tabId, title, element) {
    document.getElementById('page-title').innerText = title;
    
    document.getElementById('tab-listesi').classList.add('hidden');
    document.getElementById('tab-ekle').classList.add('hidden');
    document.getElementById('tab-profil').classList.add('hidden');
    document.getElementById('tab-admin').classList.add('hidden');
    
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
}

function yeniLadesEkle() {
    const rakip = document.getElementById('rakip').value.trim();
    const odul = document.getElementById('odul').value.trim();

    if (!rakip || !odul) {
        alert('Lütfen boş alan bırakmayın.');
        return;
    }

    const yeniLadesRef = database.ref('ladesler').push();
    yeniLadesRef.set({
        id: yeniLadesRef.key,
        olusturan: currentUser,
        rakip: rakip,
        odul: odul,
        durum: "Aktif",
        kazanan: "",
        tarih: new Date().toLocaleDateString('tr-TR')
    }).then(() => {
        document.getElementById('rakip').value = '';
        document.getElementById('odul').value = '';
        switchTab('listesi', 'LADESLER', document.querySelectorAll('.nav-item')[0]);
    }).catch(err => alert("Hata: " + err.message));
}

function verileriDinle() {
    database.ref('ladesler').on('value', (snapshot) => {
        const listeDiv = document.getElementById('lades-listesi');
        const adminDiv = document.getElementById('admin-listesi');
        listeDiv.innerHTML = '';
        adminDiv.innerHTML = '';
        
        const data = snapshot.val();
        
        let toplamIddia = 0;
        let kazanilanIddia = 0;

        if (!data) {
            listeDiv.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 40px;">Henüz aktif iddia yok.</p>';
            adminDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">İddia bulunamadı.</p>';
            guncelleIstatistikler(0, 0);
            return;
        }

        const ladeslerArray = Object.values(data).reverse();

        ladeslerArray.forEach(lades => {
            const isBitti = lades.durum !== "Aktif";
            
            if (lades.olusturan === currentUser || lades.rakip === currentUser) {
                toplamIddia++;
                if (isBitti && lades.kazanan === currentUser) {
                    kazanilanIddia++;
                }
            }

            // --- KULLANICI LİSTESİ TASARIMI ---
            let cardHtml = `
                <div class="lades-card ${isBitti ? 'bitti' : ''}">
                    <div class="lades-header">
                        <div class="lades-versus">🤝 ${lades.olusturan} vs ${lades.rakip}</div>
                        <span class="badge ${isBitti ? 'badge-bitti' : 'badge-aktif'}">${isBitti ? 'BİTTİ' : 'AKTİF'}</span>
                    </div>
                    <div class="lades-reward">🏆 <b>Ödül:</b> ${lades.odul}</div>
                    <div style="font-size: 11px; color: var(--text-muted)">📅 ${lades.tarih}</div>
            `;

            if (!isBitti) {
                cardHtml += `
                    <div class="action-grid">
                        <button class="btn-action" onclick="ladesBitir('${lades.id}', '${lades.olusturan}')">🏆 ${lades.olusturan.split(' ')[0]} Kazandı</button>
                        <button class="btn-action" onclick="ladesBitir('${lades.id}', '${lades.rakip}')">🏆 ${lades.rakip.split(' ')[0]} Kazandı</button>
                    </div>
                `;
            } else {
                cardHtml += `
                    <div style="margin-top: 10px; font-weight: bold; color: var(--neon-cyan); font-size: 14px;">🎉 Kazanan: ${lades.kazanan}</div>
                `;
            }
            cardHtml += `</div>`;
            listeDiv.innerHTML += cardHtml;

            // --- ADMIN LİSTESİ TASARIMI (SİLME BUTONLU) ---
            let adminCardHtml = `
                <div class="lades-card ${isBitti ? 'bitti' : ''}" style="padding: 12px;">
                    <div style="font-size: 13px; font-weight: bold;">${lades.olusturan} vs ${lades.rakip}</div>
                    <div style="font-size: 11px; color: var(--text-muted)">Ödül: ${lades.odul} | Durum: ${lades.durum}</div>
                    <button class="btn-action btn-delete" onclick="ladesSil('${lades.id}')">Bu İddiayı Sistemden Sil</button>
                </div>
            `;
            adminDiv.innerHTML += adminCardHtml;
        });

        guncelleIstatistikler(toplamIddia, kazanilanIddia);
    });
}

function ladesBitir(id, kazananIsim) {
    if(confirm(`${kazananIsim} kazandı olarak onaylıyor musunuz?`)) {
        database.ref(`ladesler/${id}`).update({
            durum: "Bitti",
            kazanan: kazananIsim
        });
    }
}

function ladesSil(id) {
    if(confirm("DİKKAT! Bu iddia kaydını Firebase'den kalıcı olarak silmek istediğinize emin misiniz?")) {
        database.ref(`ladesler/${id}`).remove()
            .then(() => alert("Kayıt başarıyla silindi."))
            .catch(err => alert("Hata: " + err.message));
    }
}

function guncelleIstatistikler(toplam, kazanilan) {
    document.getElementById('stat-toplam').innerText = toplam;
    document.getElementById('stat-kazanilan').innerText = kazanilan;
}