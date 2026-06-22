// ======================================================
// CHAT MODÜLÜ - Sohbet Sistemi
// ======================================================

let currentChatTab = 'global';
let currentMarketIdForChat = null;
let chatMessageListener = null;
let chatUnreadCount = 0;

// ------------------------------------------------------
// CHAT PANELİNİ AÇ/KAPAT
// ------------------------------------------------------
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
        // Chat açıldığında okunmamış sayacı sıfırla
        chatUnreadCount = 0;
        const badge = document.getElementById('chat-unread-badge');
        if (badge) badge.style.display = 'none';
        // Mesajları yükle
        loadChatMessages(currentChatTab);
        // Input'a odaklan
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 300);
    }
}

// ------------------------------------------------------
// CHAT SEKmesini değiştir
// ------------------------------------------------------
function switchChatTab(tab) {
    currentChatTab = tab;
    
    // Tab butonlarını güncelle
    document.querySelectorAll('.chat-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.chat-tab[data-chat="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Lades tab'ını göster/gizle
    const marketTab = document.getElementById('market-chat-tab');
    if (tab === 'market' && currentMarketIdForChat) {
        if (marketTab) {
            marketTab.style.display = 'block';
            marketTab.textContent = `📊 ${activeMarketTitle || 'Lades'}`;
        }
    } else {
        if (marketTab) marketTab.style.display = 'none';
        // Eğer market tab'ından çıkılıyorsa, marketId'yi temizle
        if (tab !== 'market') {
            currentMarketIdForChat = null;
        }
    }
    
    loadChatMessages(tab);
}

// ------------------------------------------------------
// CHAT MESAJLARINI YÜKLE
// ------------------------------------------------------
async function loadChatMessages(tab) {
    if (typeof db === 'undefined' || !db) return;
    
    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    if (!messagesContainer) return;
    
    // Eski dinleyiciyi temizle
    if (chatMessageListener) {
        chatMessageListener();
        chatMessageListener = null;
    }
    
    // Chat path'ini belirle
    let chatPath = 'chats/global';
    if (tab === 'market' && currentMarketIdForChat) {
        chatPath = `chats/market_${currentMarketIdForChat}`;
    }
    
    // Mesajları temizle
    messagesContainer.innerHTML = `
        <div style="text-align:center; color:#64748b; padding:30px; font-size:13px;">
            💬 Yükleniyor...
        </div>
    `;
    
    // Input'u pasifleştir
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    
    // Gerçek zamanlı dinleyici
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
        
        // En son mesaja kaydır
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Input'u aktif et
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        
        // Eğer chat açık değilse, okunmamış sayacı artır
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

// ------------------------------------------------------
// HTML ETİKETLERİNİ GÜVENLİ HALE GETİR
// ------------------------------------------------------
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ------------------------------------------------------
// MESAJ GÖNDER
// ------------------------------------------------------
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;
    if (typeof db === 'undefined' || !db) return;
    
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
    }
    
    // Kullanıcının nickname'ini al
    const userKey = currentUser.replace(/\./g, ',');
    const userSnap = await fbGet(`ladesUsers/${userKey}`);
    const displayName = userSnap?.nickname || maskUserEmail(currentUser);
    
    // Chat path'ini belirle
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

// ------------------------------------------------------
// LADES ÖZEL CHAT AÇ
// ------------------------------------------------------
function openMarketChat(marketId, marketTitle) {
    currentMarketIdForChat = marketId;
    activeMarketTitle = marketTitle;
    
    // Chat panelini aç
    const panel = document.getElementById('chat-panel');
    const toggleBtn = document.getElementById('chat-toggle-btn');
    
    if (!panel.classList.contains('open')) {
        panel.classList.add('open');
        if (toggleBtn) toggleBtn.classList.add('hidden');
    }
    
    // Market tab'ını göster ve aktif yap
    const marketTab = document.getElementById('market-chat-tab');
    if (marketTab) {
        marketTab.style.display = 'block';
        marketTab.textContent = `📊 ${marketTitle}`;
        marketTab.classList.add('active');
    }
    
    // Global tab'ını pasif yap
    const globalTab = document.querySelector('.chat-tab[data-chat="global"]');
    if (globalTab) globalTab.classList.remove('active');
    
    // Market tab'ına geç
    currentChatTab = 'market';
    loadChatMessages('market');
    
    // Input'a odaklan
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 300);
}

// ------------------------------------------------------
// LADES CHAT'İNİ KAPAT
// ------------------------------------------------------
function closeMarketChat() {
    currentMarketIdForChat = null;
    currentChatTab = 'global';
    
    // Global tab'ını aktif yap
    const globalTab = document.querySelector('.chat-tab[data-chat="global"]');
    if (globalTab) globalTab.classList.add('active');
    
    // Market tab'ını gizle
    const marketTab = document.getElementById('market-chat-tab');
    if (marketTab) {
        marketTab.style.display = 'none';
        marketTab.classList.remove('active');
    }
    
    loadChatMessages('global');
}

// ------------------------------------------------------
// CHAT SİSTEMİNİ BAŞLAT
// ------------------------------------------------------
function startChatSystem() {
    // Enter tuşu ile mesaj gönder
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Chat paneli açıldığında input'a odaklan
    const panel = document.getElementById('chat-panel');
    if (panel) {
        panel.addEventListener('transitionend', () => {
            if (panel.classList.contains('open')) {
                const input = document.getElementById('chat-input');
                if (input) input.focus();
            }
        });
    }
    
    // Sayfa yüklendiğinde global chat'i yükle
    setTimeout(() => {
        loadChatMessages('global');
    }, 500);
    
    console.log("✅ Chat sistemi başlatıldı");
}