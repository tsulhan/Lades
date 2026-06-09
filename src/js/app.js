let currentUser = localStorage.getItem('lades_user') || '';

window.onload = () => { if (currentUser) showApp(); };

function login() {
    const name = document.getElementById('username').value.trim();
    if (!name) return alert('İsim gir!');
    localStorage.setItem('lades_user', name);
    currentUser = name;
    showApp();
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    verileriDinle();
}

function switchTab(tabId, title, element) {
    document.getElementById('page-title').innerText = title;
    document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
}

function yeniLadesEkle() {
    const rakip = document.getElementById('rakip').value;
    const odul = document.getElementById('odul').value;
    const yeniRef = database.ref('ladesler').push();
    yeniRef.set({ id: yeniRef.key, olusturan: currentUser, rakip, odul, durum: "Aktif", tarih: new Date().toLocaleDateString() });
    alert("Lades eklendi!");
}

function verileriDinle() {
    database.ref('ladesler').on('value', (snapshot) => {
        const listeDiv = document.getElementById('lades-listesi');
        listeDiv.innerHTML = '';
        const data = snapshot.val();
        if(data) Object.values(data).reverse().forEach(lades => {
            listeDiv.innerHTML += `
                <div class="lades-card">
                    <div><b>${lades.olusturan} vs ${lades.rakip}</b></div>
                    <div style="font-size:12px; color:var(--text-muted)">Ödül: ${lades.odul}</div>
                    <span class="badge-aktif">${lades.durum}</span>
                </div>`;
        });
    });
}