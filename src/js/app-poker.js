// ======================================================
// LADES APP-POKER.JS - POKER OYUNU FONKSİYONLARI
// ======================================================

let currentPokerRoom = null;
let pokerListener = null;

// ------------------------------------------------------
// YARDIMCI FONKSİYON: Email'i güvenli Firebase key'e çevir
// ------------------------------------------------------
function getPlayerKey(email) {
    if (!email) return 'unknown';
    // Email'in @ öncesini al ve geçersiz karakterleri temizle
    return email.split('@')[0].replace(/[.#$\/\[\]]/g, '_');
}

// ------------------------------------------------------
// POKER SAYFASINI AÇ
// ------------------------------------------------------
function openPoker() {
    const pokerArea = document.getElementById('poker-area');
    if (pokerArea) {
        pokerArea.style.display = 'block';
        pokerArea.scrollIntoView({ behavior: 'smooth' });
        loadPokerRooms();
    }
}

function closePoker() {
    const pokerArea = document.getElementById('poker-area');
    if (pokerArea) {
        pokerArea.style.display = 'none';
    }
    if (pokerListener) {
        pokerListener();
        pokerListener = null;
    }
}

// ------------------------------------------------------
// POKER ODALARINI YÜKLE
// ------------------------------------------------------
async function loadPokerRooms() {
    const container = document.getElementById('poker-rooms-list');
    if (!container) return;

    if (typeof db === "undefined" || !db) {
        container.innerHTML = `
            <div style="text-align:center; color:#ef4444; padding:30px; grid-column: 1/-1;">
                ❌ Firebase bağlantısı yok.
            </div>
        `;
        return;
    }

    try {
        const roomsSnap = await fbGet("pokerRooms");
        const rooms = roomsSnap || {};
        const roomList = Object.entries(rooms);

        if (roomList.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; color:#64748b; padding:30px; grid-column: 1/-1;">
                    🃏 Henüz masa oluşturulmamış. İlk masayı sen oluştur!
                </div>
            `;
            return;
        }

        const currentUser = localStorage.getItem('currentUser');
        const userNickname = await getUserNickname(currentUser);
        const playerKey = currentUser ? getPlayerKey(currentUser) : null;

        container.innerHTML = roomList.map(([roomId, room]) => {
            const playerCount = room.players ? Object.keys(room.players).length : 0;
            const maxPlayers = room.maxPlayers || 6;
            const isFull = playerCount >= maxPlayers;
            const isPlayer = room.players && playerKey && room.players[playerKey] !== undefined;

            return `
                <div class="poker-room-card" style="${isFull && !isPlayer ? 'opacity:0.5;' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div class="room-name">${room.name || 'İsimsiz Masa'}</div>
                            <div class="room-detail">👤 ${room.host || 'Bilinmeyen'} tarafından oluşturuldu</div>
                            <div class="room-players">
                                👥 ${playerCount}/${maxPlayers} oyuncu
                                ${room.status === 'playing' ? ' • 🔴 Oyun devam ediyor' : ' • 🟢 Bekliyor'}
                            </div>
                        </div>
                        <div>
                            ${isPlayer ? 
                                `<button onclick="joinPokerRoom('${roomId}')" class="room-join-btn" style="background:#f59e0b;">Devam Et</button>` :
                                (isFull ? 
                                    `<span style="color:#ef4444; font-size:12px;">Masa Dolu</span>` :
                                    `<button onclick="joinPokerRoom('${roomId}')" class="room-join-btn">Katıl</button>`
                                )
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Poker odaları yüklenirken hata:", error);
        container.innerHTML = `
            <div style="text-align:center; color:#ef4444; padding:30px; grid-column: 1/-1;">
                ❌ Odalar yüklenirken hata oluştu.
            </div>
        `;
    }
}

// ------------------------------------------------------
// POKER ODASI OLUŞTUR
// ------------------------------------------------------
async function createPokerRoom() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
    }

    const roomName = prompt('Masa adı ne olsun?', 'Kral Masası');
    if (!roomName) return;

    const maxPlayers = parseInt(prompt('Kaç oyuncu olsun? (2-6)', '4')) || 4;

    if (typeof db === "undefined" || !db) {
        alert('Firebase bağlantısı yok!');
        return;
    }

    try {
        const userNickname = await getUserNickname(currentUser);
        const roomId = uniqueId('poker');
        const playerKey = getPlayerKey(currentUser); // ✅ Güvenli key
        
        await fbSet(`pokerRooms/${roomId}`, {
            id: roomId,
            name: roomName,
            host: userNickname,
            hostEmail: currentUser,
            maxPlayers: Math.min(6, Math.max(2, maxPlayers)),
            status: 'waiting',
            createdAt: Date.now(),
            players: {
                [playerKey]: {  // ✅ Email yerine güvenli key
                    name: userNickname,
                    email: currentUser,  // Email değer olarak saklanıyor
                    chips: 1000,
                    cards: [],
                    folded: false,
                    bet: 0
                }
            },
            pot: 0,
            currentTurn: playerKey,
            deck: [],
            communityCards: []
        });

        alert(`✅ "${roomName}" masası oluşturuldu!`);
        loadPokerRooms();
        joinPokerRoom(roomId);

    } catch (error) {
        console.error("Masa oluşturma hatası:", error);
        alert('❌ Masa oluşturulurken hata oluştu.');
    }
}

// ------------------------------------------------------
// POKER ODASINA KATIL
// ------------------------------------------------------
async function joinPokerRoom(roomId) {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
    }

    if (typeof db === "undefined" || !db) return;

    try {
        const roomSnap = await fbGet(`pokerRooms/${roomId}`);
        const room = roomSnap;

        if (!room) {
            alert('❌ Masa bulunamadı!');
            return;
        }

        const playerKey = getPlayerKey(currentUser); // ✅ Güvenli key

        // Zaten masada mı?
        if (room.players && room.players[playerKey] !== undefined) {
            currentPokerRoom = roomId;
            renderPokerTable(roomId);
            return;
        }

        const playerCount = room.players ? Object.keys(room.players).length : 0;
        if (playerCount >= room.maxPlayers) {
            alert('❌ Masa dolu!');
            return;
        }

        const userNickname = await getUserNickname(currentUser);
        
        // ✅ Güvenli key ile ekle
        await fbSet(`pokerRooms/${roomId}/players/${playerKey}`, {
            name: userNickname,
            email: currentUser,  // Email değer olarak saklanıyor
            chips: 1000,
            cards: [],
            folded: false,
            bet: 0
        });

        currentPokerRoom = roomId;
        renderPokerTable(roomId);

    } catch (error) {
        console.error("Masa katılma hatası:", error);
        alert('❌ Masaya katılırken hata oluştu.');
    }
}

// ------------------------------------------------------
// POKER TABLOSUNU RENDER ET
// ------------------------------------------------------
function renderPokerTable(roomId) {
    const tableContainer = document.getElementById('poker-table');
    if (!tableContainer) return;

    tableContainer.style.display = 'block';
    tableContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 14px; color: #64748b;">
                <i class="fa-solid fa-spinner fa-spin"></i> 
                Poker masası başlatılıyor...
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                Oda ID: ${roomId}
            </div>
            <button onclick="leavePokerRoom()" 
                    style="margin-top: 16px; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); 
                           padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600;">
                Masadan Ayrıl
            </button>
        </div>
    `;

    // Gerçek zamanlı dinleyici
    if (pokerListener) {
        pokerListener();
        pokerListener = null;
    }

    pokerListener = fbRef(`pokerRooms/${roomId}`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            renderPokerTableContent(data);
        }
    });
}

// ------------------------------------------------------
// POKER TABLO İÇERİĞİNİ RENDER ET
// ------------------------------------------------------
function renderPokerTableContent(room) {
    const tableContainer = document.getElementById('poker-table');
    if (!tableContainer) return;

    const currentUser = localStorage.getItem('currentUser');
    const playerKey = currentUser ? getPlayerKey(currentUser) : null; // ✅ Güvenli key
    const players = room.players || {};
    const playerCount = Object.keys(players).length;
    const isPlayer = playerKey && players[playerKey] !== undefined;

    if (!isPlayer) {
        tableContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 16px; color: #94a3b8;">Artık bu masada değilsin.</div>
                <button onclick="loadPokerRooms()" style="margin-top:16px; background:#24ffff; color:#030814; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer;">
                    Masalara Dön
                </button>
            </div>
        `;
        return;
    }

    const playerList = Object.entries(players).map(([key, data]) => ({
        key,
        name: data.name || 'Bilinmeyen',
        chips: data.chips || 0,
        isCurrent: key === playerKey
    }));

    const currentPlayer = players[playerKey];

    tableContainer.innerHTML = `
        <div style="padding: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div style="font-size:18px; font-weight:700; color:#fff;">♠️ ${room.name || 'Poker Masası'}</div>
                <div style="font-size:13px; color:#64748b;">
                    👥 ${playerCount}/${room.maxPlayers} oyuncu
                    ${room.status === 'playing' ? '🔴 Oyun devam ediyor' : '🟢 Bekliyor'}
                </div>
            </div>

            <!-- Oyuncular -->
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:12px; margin-bottom:20px;">
                ${playerList.map(p => `
                    <div style="background:#030814; border:1px solid ${p.isCurrent ? '#24ffff' : '#1c2541'}; border-radius:10px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:600; color:${p.isCurrent ? '#24ffff' : '#94a3b8'}">${p.name} ${p.isCurrent ? '👈' : ''}</span>
                            <span style="color:#24ffff; font-weight:700;">${p.chips}</span>
                        </div>
                        <div style="font-size:11px; color:#64748b; margin-top:4px;">
                            ${p.isCurrent ? 'Sizsiniz' : 'Oyuncu'}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Oyun Alanı -->
            ${room.status === 'playing' ? `
            <div style="background:#030814; border:1px solid #1c2541; border-radius:12px; padding:20px; margin-bottom:20px;">
                <div style="text-align:center; color:#64748b; font-size:13px; margin-bottom:12px;">
                    🃏 Kasa: <span style="color:#24ffff; font-weight:700;">${room.pot || 0}</span> Token
                </div>
                <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                    ${(room.communityCards || []).map(card => `
                        <span style="background:#0b132b; border:1px solid #1c2541; border-radius:6px; padding:10px 14px; font-size:20px; min-width:50px; text-align:center;">${card}</span>
                    `).join('') || '<span style="color:#64748b; font-size:13px;">Henüz kart açılmadı</span>'}
                </div>
            </div>
            ` : `
            <div style="background:#030814; border:1px solid #1c2541; border-radius:12px; padding:20px; margin-bottom:20px; text-align:center; color:#64748b;">
                🕐 Oyun başlamak için bekleniyor...
            </div>
            `}

            <!-- İşlem Butonları -->
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
                ${room.status === 'playing' && room.currentTurn === playerKey ? `
                    <button class="btn-modal btn-confirm" onclick="pokerAction('fold')">Pas Geç</button>
                    <button class="btn-modal btn-confirm" onclick="pokerAction('call')">Gör</button>
                    <button class="btn-modal btn-confirm" onclick="pokerAction('raise')">Yükselt</button>
                ` : `
                    <span style="color:#64748b; font-size:13px;">Sıra bekleniyor...</span>
                `}
            </div>
        </div>
    `;
}

// ------------------------------------------------------
// POKER OYUNU İŞLEMLERİ
// ------------------------------------------------------
async function pokerAction(action) {
    if (!currentPokerRoom) return;
    
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;

    try {
        const playerKey = getPlayerKey(currentUser); // ✅ Güvenli key
        const roomSnap = await fbGet(`pokerRooms/${currentPokerRoom}`);
        const room = roomSnap;
        if (!room) return;

        const player = room.players[playerKey]; // ✅ Güvenli key ile
        if (!player) return;

        // Basit oyun mantığı (genişletilecek)
        if (action === 'fold') {
            player.folded = true;
            await fbSet(`pokerRooms/${currentPokerRoom}/players/${playerKey}/folded`, true);
            alert('✅ Pas geçtiniz.');
        } else if (action === 'call') {
            const callAmount = 50;
            if (player.chips < callAmount) {
                alert('❌ Yeterli Token yok!');
                return;
            }
            player.chips -= callAmount;
            room.pot += callAmount;
            await fbSet(`pokerRooms/${currentPokerRoom}/players/${playerKey}/chips`, player.chips);
            await fbSet(`pokerRooms/${currentPokerRoom}/pot`, room.pot);
            alert(`✅ ${callAmount} Token ile görüldü.`);
        } else if (action === 'raise') {
            const raiseAmount = parseInt(prompt('Kaç Token yükseltmek istiyorsunuz?', '100'));
            if (!raiseAmount || raiseAmount <= 0) return;
            if (player.chips < raiseAmount) {
                alert('❌ Yeterli Token yok!');
                return;
            }
            player.chips -= raiseAmount;
            room.pot += raiseAmount;
            await fbSet(`pokerRooms/${currentPokerRoom}/players/${playerKey}/chips`, player.chips);
            await fbSet(`pokerRooms/${currentPokerRoom}/pot`, room.pot);
            alert(`✅ ${raiseAmount} Token yükseltildi.`);
        }

    } catch (error) {
        console.error("Poker işlem hatası:", error);
        alert('❌ İşlem sırasında hata oluştu.');
    }
}

// ------------------------------------------------------
// POKER ODASINDAN AYRIL
// ------------------------------------------------------
async function leavePokerRoom() {
    if (!confirm('Masadan ayrılmak istediğinize emin misiniz?')) return;

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;

    if (typeof db === "undefined" || !db) return;

    try {
        const playerKey = getPlayerKey(currentUser); // ✅ Güvenli key
        await fbRemove(`pokerRooms/${currentPokerRoom}/players/${playerKey}`);
        const roomSnap = await fbGet(`pokerRooms/${currentPokerRoom}`);
        const room = roomSnap;
        
        if (room && room.players && Object.keys(room.players).length === 0) {
            await fbRemove(`pokerRooms/${currentPokerRoom}`);
        }

        currentPokerRoom = null;
        if (pokerListener) {
            pokerListener();
            pokerListener = null;
        }

        document.getElementById('poker-table').style.display = 'none';
        loadPokerRooms();
        alert('✅ Masadan ayrıldınız.');

    } catch (error) {
        console.error("Masadan ayrılma hatası:", error);
        alert('❌ Ayrılırken hata oluştu.');
    }
}