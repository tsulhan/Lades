// ======================================================
// LADES APP-POKER.JS - TEXAS HOLD'EM (SADELEŞTİRİLMİŞ)
// ======================================================

let currentPokerRoom = null;
let pokerListener = null;

// ------------------------------------------------------
// YARDIMCI FONKSİYON: Email'i güvenli Firebase key'e çevir
// ------------------------------------------------------
function getPlayerKey(email) {
    if (!email) return 'unknown';
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
            <div style="text-align:center; color:#ef4444; padding:30px;">
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
                <div style="text-align:center; padding:60px 20px; background:#030814; border:1px solid #1c2541; border-radius:16px;">
                    <div style="font-size:64px; margin-bottom:16px;">🃏</div>
                    <div style="color:#94a3b8; font-size:18px; margin-bottom:8px;">Henüz masa oluşturulmamış</div>
                    <div style="color:#64748b; font-size:14px; margin-bottom:20px;">İlk masayı sen oluştur!</div>
                    <button onclick="createPokerRoom()" style="background: #24ffff; color: #030814; border: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 16px;">
                        🎯 Hemen Masa Oluştur
                    </button>
                </div>
            `;
            return;
        }

        const currentUser = localStorage.getItem('currentUser');
        const playerKey = currentUser ? getPlayerKey(currentUser) : null;

        container.innerHTML = roomList.map(([roomId, room]) => {
            const playerCount = room.players ? Object.keys(room.players).length : 0;
            const maxPlayers = room.maxPlayers || 10;
            const isFull = playerCount >= maxPlayers;
            const isPlayer = room.players && playerKey && room.players[playerKey] !== undefined;

            return `
                <div style="background:#030814; border:1px solid ${isPlayer ? '#24ffff' : '#1c2541'}; border-radius:12px; padding:20px; transition: all 0.3s;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <div>
                            <div style="font-size:20px; font-weight:700; color:#fff;">♠️ ${room.name || 'Texas Hold\'em'}</div>
                            <div style="color:#94a3b8; font-size:14px; margin-top:4px;">
                                👤 ${room.host || 'Bilinmeyen'} oluşturdu
                            </div>
                            <div style="color:#64748b; font-size:13px; margin-top:4px;">
                                👥 ${playerCount}/${maxPlayers} oyuncu
                                ${room.status === 'playing' ? ' 🔴 Oyun devam ediyor' : ' 🟢 Bekliyor'}
                            </div>
                        </div>
                        <div>
                            ${isPlayer ? 
                                `<button onclick="joinPokerRoom('${roomId}')" style="background:#f59e0b; color:#fff; border:none; padding:10px 24px; border-radius:8px; font-weight:600; cursor:pointer;">
                                    🎯 Masaya Dön
                                </button>` :
                                (isFull ? 
                                    `<span style="color:#ef4444; font-weight:600;">❌ Masa Dolu</span>` :
                                    `<button onclick="joinPokerRoom('${roomId}')" style="background:#24ffff; color:#030814; border:none; padding:10px 24px; border-radius:8px; font-weight:700; cursor:pointer;">
                                        💺 Katıl
                                    </button>`
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
            <div style="text-align:center; color:#ef4444; padding:30px;">
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

    const roomName = prompt('Masa adı ne olsun? (Örn: VIP Masası)', 'Texas Hold\'em');
    if (!roomName) return;

    if (typeof db === "undefined" || !db) {
        alert('Firebase bağlantısı yok!');
        return;
    }

    try {
        const userNickname = await getUserNickname(currentUser);
        const roomId = uniqueId('poker');
        const playerKey = getPlayerKey(currentUser);
        
        await fbSet(`pokerRooms/${roomId}`, {
            id: roomId,
            name: roomName,
            host: userNickname,
            hostEmail: currentUser,
            maxPlayers: 10, // ✅ 10 sandalye
            status: 'waiting',
            createdAt: Date.now(),
            players: {
                [playerKey]: {
                    name: userNickname,
                    email: currentUser,
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

        const playerKey = getPlayerKey(currentUser);

        if (room.players && room.players[playerKey] !== undefined) {
            currentPokerRoom = roomId;
            renderPokerTable(roomId);
            return;
        }

        const playerCount = room.players ? Object.keys(room.players).length : 0;
        if (playerCount >= room.maxPlayers) {
            alert('❌ Masa dolu! (10/10)');
            return;
        }

        const userNickname = await getUserNickname(currentUser);
        
        await fbSet(`pokerRooms/${roomId}/players/${playerKey}`, {
            name: userNickname,
            email: currentUser,
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
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 20px; color: #24ffff; margin-bottom: 12px;">
                <i class="fa-solid fa-spinner fa-spin"></i> 
                Poker masası yükleniyor...
            </div>
            <div style="font-size: 14px; color: #64748b;">
                Oda ID: ${roomId}
            </div>
        </div>
    `;

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
// POKER TABLO İÇERİĞİNİ RENDER ET (10 Sandalye)
// ------------------------------------------------------
function renderPokerTableContent(room) {
    const tableContainer = document.getElementById('poker-table');
    if (!tableContainer) return;

    const currentUser = localStorage.getItem('currentUser');
    const playerKey = currentUser ? getPlayerKey(currentUser) : null;
    const players = room.players || {};
    const playerCount = Object.keys(players).length;
    const isPlayer = playerKey && players[playerKey] !== undefined;

    if (!isPlayer) {
        tableContainer.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 18px; color: #94a3b8; margin-bottom: 16px;">Artık bu masada değilsin.</div>
                <button onclick="loadPokerRooms()" style="background:#24ffff; color:#030814; border:none; padding:12px 28px; border-radius:8px; font-weight:700; cursor:pointer;">
                    📋 Masalara Dön
                </button>
            </div>
        `;
        return;
    }

    // 10 sandalye için oyuncu listesi
    const playerList = Object.entries(players).map(([key, data]) => ({
        key,
        name: data.name || 'Bilinmeyen',
        chips: data.chips || 0,
        isCurrent: key === playerKey,
        email: data.email || key
    }));

    // Boş sandalyeler (10 - mevcut oyuncu sayısı)
    const emptySeats = Math.max(0, 10 - playerList.length);

    tableContainer.innerHTML = `
        <div style="padding: 20px;">
            <!-- Masa Başlığı -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
                <div>
                    <div style="font-size:24px; font-weight:700; color:#fff;">♠️ ${room.name || 'Texas Hold\'em'}</div>
                    <div style="color:#94a3b8; font-size:14px; margin-top:4px;">
                        👑 ${room.host || 'Bilinmeyen'} | 👥 ${playerCount}/10 oyuncu
                        ${room.status === 'playing' ? ' 🔴 Oyun devam ediyor' : ' 🟢 Bekliyor'}
                    </div>
                </div>
                <button onclick="leavePokerRoom()" 
                        style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); 
                               padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:600;">
                    🚪 Masadan Ayrıl
                </button>
            </div>

            <!-- 10 Sandalyeli Masa -->
            <div style="background:#0b132b; border:2px solid #1c2541; border-radius:20px; padding:30px; margin-bottom:24px;">
                
                <!-- Oyuncular (Grid: 5 sütun x 2 satır) -->
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px;">
                    ${playerList.map(p => `
                        <div style="background:${p.isCurrent ? '#1a2a4a' : '#030814'}; 
                                    border:2px solid ${p.isCurrent ? '#24ffff' : '#1c2541'}; 
                                    border-radius:12px; padding:16px; text-align:center; 
                                    transition: all 0.3s;
                                    ${p.isCurrent ? 'box-shadow: 0 0 20px rgba(36,255,255,0.2);' : ''}">
                            <div style="font-size:28px; margin-bottom:4px;">${p.isCurrent ? '👤' : '🃏'}</div>
                            <div style="font-weight:700; color:${p.isCurrent ? '#24ffff' : '#94a3b8'}; font-size:14px;">
                                ${p.name}
                                ${p.isCurrent ? ' 👈' : ''}
                            </div>
                            <div style="color:#24ffff; font-weight:700; font-size:16px; margin-top:4px;">
                                🪙 ${p.chips}
                            </div>
                            <div style="font-size:11px; color:#64748b; margin-top:4px;">
                                ${p.isCurrent ? 'Sizsiniz' : 'Oyuncu'}
                            </div>
                        </div>
                    `).join('')}
                    
                    <!-- Boş Sandalyeler -->
                    ${Array.from({ length: emptySeats }).map((_, i) => `
                        <div style="background:#030814; border:2px dashed #1c2541; border-radius:12px; padding:16px; text-align:center; opacity:0.5;">
                            <div style="font-size:28px; margin-bottom:4px;">💺</div>
                            <div style="color:#64748b; font-size:12px;">Boş Sandalye</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Kasa ve Community Kartları -->
                <div style="margin-top:24px; padding-top:20px; border-top:1px solid #1c2541;">
                    <div style="display:flex; justify-content:center; align-items:center; gap:20px; flex-wrap:wrap;">
                        <div style="text-align:center;">
                            <div style="color:#64748b; font-size:12px;">KASA</div>
                            <div style="color:#24ffff; font-size:24px; font-weight:700;">🪙 ${room.pot || 0}</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="color:#64748b; font-size:12px;">KARTLAR</div>
                            <div style="display:flex; gap:8px; justify-content:center; margin-top:4px;">
                                ${(room.communityCards || []).length > 0 ? 
                                    room.communityCards.map(card => `
                                        <span style="background:#0b132b; border:1px solid #1c2541; border-radius:6px; padding:8px 14px; font-size:18px;">${card}</span>
                                    `).join('') : 
                                    '<span style="color:#64748b; font-size:13px;">Kart bekleniyor...</span>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Oyun Butonları -->
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                ${room.status === 'playing' && room.currentTurn === playerKey ? `
                    <button onclick="pokerAction('fold')" style="background:#ef4444; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer;">
                        🙅 Pas Geç
                    </button>
                    <button onclick="pokerAction('call')" style="background:#3b82f6; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer;">
                        👀 Gör
                    </button>
                    <button onclick="pokerAction('raise')" style="background:#f59e0b; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer;">
                        📈 Yükselt
                    </button>
                ` : `
                    <span style="color:#64748b; font-size:15px; padding:12px 24px; background:#030814; border-radius:8px;">
                        ${room.status === 'playing' ? '⏳ Sıra bekleniyor...' : '🕐 Oyun başlamak için bekleniyor...'}
                    </span>
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
        const playerKey = getPlayerKey(currentUser);
        const roomSnap = await fbGet(`pokerRooms/${currentPokerRoom}`);
        const room = roomSnap;
        if (!room) return;

        const player = room.players[playerKey];
        if (!player) return;

        if (action === 'fold') {
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
        const playerKey = getPlayerKey(currentUser);
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