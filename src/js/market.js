// ======================================================
// LADES MODÜL 3: MARKET.JS (BAHİS OYNAMA & LADES YARATMA)
// ======================================================

let activeMarketId = "";
let activeMarketTitle = "";
let activeChoice = "";
let selectedCategoryFilter = "Tümü";

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

function filterCategory(categoryName) {
    selectedCategoryFilter = categoryName;
    const buttons = document.querySelectorAll(".sidebar-menu button");
    buttons.forEach(btn => btn.classList.remove("active"));

    buttons.forEach(btn => {
        const text = btn.innerText || "";
        if (categoryName === "Tümü" && text.includes("Tümü")) btn.classList.add("active");
        else if (text.includes(categoryName)) btn.classList.add("active");
    });

    if (typeof db !== "undefined" && db) {
        db.ref("customMarkets").once("value").then(snapshot => {
            renderMarketGrid(snapshot.val() || {});
        });
    }
}

async function createNewMarket() {
    const title = document.getElementById("market-question")?.value.trim();
    const date = document.getElementById("market-date")?.value;
    const initialBet = parseInt(document.getElementById("market-initial-bet")?.value);
    const choice = document.getElementById("market-choice")?.value;
    const category = document.getElementById("market-category")?.value;
    const currentUserEmail = localStorage.getItem("currentUser");

    if (!currentUserEmail) { window.location.href = "login.html"; return; }
    if (typeof db === "undefined" || !db) return;

    if (!title || !date || isNaN(initialBet) || initialBet <= 0) {
        alert("Lütfen tüm alanları doğru doldurun!");
        return;
    }

    try {
        const userCleanKey = currentUserEmail.replace(/\(/\g, '').replace(/\./g, ',');
        const userSnap = await db.ref(`ladesUsers/${userCleanKey}`).once("value");
        const currentUser = userSnap.val();

        if (!currentUser || initialBet > (currentUser.balance || 0)) {
            alert("Yetersiz bakiye veya kullanıcı bulunamadı!");
            return;
        }

        await db.ref(`ladesUsers/${userCleanKey}/balance`).set(parseInt(currentUser.balance) - initialBet);

        const marketId = "market_" + Math.random().toString(36).substring(2, 11);
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

        await db.ref(`customMarkets/${marketId}`).set(newMarket);

        const historyKey = "history_" + Math.random().toString(36).substring(2, 11);
        await db.ref(`betHistory/${historyKey}`).set({
            id: historyKey,
            marketId,
            email: currentUserEmail,
            choice,
            amount: initialBet,
            createdAt: Date.now()
        });

        alert("⚡ Lades Başarıyla Yaratıldı!");
        document.getElementById("market-question").value = "";
        document.getElementById("market-initial-bet").value = "";
        if (typeof switchTab === "function") switchTab("mevcut-ladesler");

    } catch (e) {
        alert("Lades yaratılamadı: " + e.message);
    }
}

function openBetModal(marketId, marketTitle, choice) {
    activeMarketId = marketId;
    activeMarketTitle = marketTitle;
    activeChoice = choice;

    const titleEl = document.getElementById("modal-market-title");
    const choiceEl = document.getElementById("modal-bet-choice");
    const modalEl = document.getElementById("bet-modal");

    if (titleEl) titleEl.innerText = marketTitle;
    if (choiceEl) {
        choiceEl.innerText = choice === "YES" ? "EVET" : (choice === "NO" ? "HAYIR" : "BERABERLİK");
        choiceEl.style.color = choice === "YES" ? "#22c55e" : (choice === "NO" ? "#ef4444" : "#f59e0b");
    }
    if (modalEl) modalEl.style.setProperty("display", "flex", "important");
}

function closeModal() {
    const modalEl = document.getElementById("bet-modal");
    if (modalEl) modalEl.style.setProperty("display", "none", "important");
    const amtInput = document.getElementById("bet-amount");
    if (amtInput) amtInput.value = "";
}

async function confirmBet() {
    const amount = parseInt(document.getElementById("bet-amount")?.value);
    const currentUserEmail = localStorage.getItem("currentUser");

    if (!currentUserEmail) { window.location.href = "login.html"; return; }
    if (isNaN(amount) || amount <= 0) { alert("Geçersiz bakiye miktarı!"); return; }

    try {
        const userCleanKey = currentUserEmail.replace(/\./g, ',');
        const userSnap = await db.ref(`ladesUsers/${userCleanKey}`).once("value");
        const currentUser = userSnap.val();

        if (!currentUser || amount > (currentUser.balance || 0)) {
            alert("Yetersiz bakiye!");
            return;
        }

        const marketSnap = await db.ref(`customMarkets/${activeMarketId}`).once("value");
        const target = marketSnap.val();
        if (!target) return;

        await db.ref(`ladesUsers/${userCleanKey}/balance`).set(parseInt(currentUser.balance) - amount);

        let poolKey = activeChoice === "YES" ? "yesPool" : (activeChoice === "NO" ? "noPool" : "drawPool");
        await db.ref(`customMarkets/${activeMarketId}/${poolKey}`).set((target[poolKey] || 0) + amount);

        const historyKey = "history_" + Math.random().toString(36).substring(2, 11);
        await db.ref(`betHistory/${historyKey}`).set({
            id: historyKey,
            marketId: activeMarketId,
            email: currentUserEmail,
            choice: activeChoice,
            amount,
            createdAt: Date.now()
        });

        closeModal();
    } catch(e) {
        alert("Bahis yatırılamadı: " + e.message);
    }
}

async function openTokenRequestModal() {
    const amount = prompt("Kaç Token talep etmek istiyorsunuz?");
    const tokenAmount = parseInt(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) return;

    const currentUserEmail = localStorage.getItem("currentUser");
    if (!currentUserEmail) return;

    const reqKey = "req_" + Math.random().toString(36).substring(2, 11);
    await db.ref(`adminRequests/${reqKey}`).set({
        id: reqKey,
        type: "token",
        email: currentUserEmail,
        amount: tokenAmount,
        status: "Bekliyor",
        createdAt: Date.now()
    });
    alert("Token talebiniz iletildi.");
}