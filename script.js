const urlParams = new URLSearchParams(window.location.search);
const restoId = urlParams.get('resto') || 'default_resto';

const STORAGE_KEY_MENUS = `resto_menus_${restoId}`;
const STORAGE_KEY_NAME = `resto_name_${restoId}`;
const STORAGE_KEY_TABLE = `resto_table_${restoId}`;
const STORAGE_KEY_SCRIPT = `resto_script_${restoId}`;

let restoName = localStorage.getItem(STORAGE_KEY_NAME) || "Resto & Cafe (" + restoId + ")";
let menus = JSON.parse(localStorage.getItem(STORAGE_KEY_MENUS)) || [];
let currentTable = localStorage.getItem(STORAGE_KEY_TABLE) || "Meja 01";
let customerName = localStorage.getItem('customer_name') || "";
let customerEmail = localStorage.getItem('customer_email') || "";
let googleScriptUrl = localStorage.getItem(STORAGE_KEY_SCRIPT) || "";
let activeCategory = "All";
let cart = [];
let currentTransactionData = null;
let paymentTimer = null; // Variabel untuk timer batas waktu pembayaran
const ADMIN_PIN = "170620";

// KONFIGURASI REKENING OWNER
const ownerBankName = "BCA";
const ownerAccountNumber = "7295061863"; // Nomor rekening owner
const ownerAccountName = "Muhammad Rizqi";

async function initApp() {
    document.getElementById('appTitle').innerText = restoName;
    document.getElementById('welcomeRestoName').innerText = restoName;
    document.getElementById('currentTableName').innerText = currentTable;

    if (googleScriptUrl) {
        await fetchMenusFromCloud();
    }

    if (!customerName || customerName.trim() === "" || !customerEmail || customerEmail.trim() === "") {
        document.getElementById('welcomeModal').classList.remove('hidden');
    } else {
        document.getElementById('currentCustomerName').innerText = customerName;
        renderCustomerMenu();
    }
}

async function fetchMenusFromCloud() {
    try {
        let res = await fetch(`${googleScriptUrl}?action=getMenus`);
        let cloudMenus = await res.json();
        if (Array.isArray(cloudMenus) && cloudMenus.length > 0) {
            menus = cloudMenus;
            localStorage.setItem(STORAGE_KEY_MENUS, JSON.stringify(menus));
        }
    } catch (err) {
        console.log("Gagal sync cloud:", err);
    }
}

async function postToCloud(payload) {
    if (!googleScriptUrl) return;
    try {
        await fetch(googleScriptUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.log("Gagal mengirim ke cloud:", err);
    }
}

function saveScriptUrl() {
    let url = document.getElementById('inputScriptUrl').value.trim();
    if (url) {
        googleScriptUrl = url;
        localStorage.setItem(STORAGE_KEY_SCRIPT, googleScriptUrl);
        alert("URL Script disimpan! Mengambil data...");
        fetchMenusFromCloud().then(() => {
            renderAdminCards();
            renderCustomerMenu();
            alert("Sinkronisasi berhasil!");
        });
    }
}

function saveCustomerData(e) {
    e.preventDefault();
    let name = document.getElementById('inputCustomerName').value.trim();
    let email = document.getElementById('inputCustomerEmail').value.trim();
    if (name && email) {
        customerName = name;
        customerEmail = email;
        localStorage.setItem('customer_name', customerName);
        localStorage.setItem('customer_email', customerEmail);
        document.getElementById('currentCustomerName').innerText = customerName;
        document.getElementById('welcomeModal').classList.add('hidden');
        document.getElementById('inputCustomerName').value = "";
        document.getElementById('inputCustomerEmail').value = "";
        renderCustomerMenu();
    }
}

function showAdminLogin() {
    document.getElementById('welcomeModal').classList.add('hidden');
    document.getElementById('adminLoginModal').classList.remove('hidden');
    document.getElementById('inputAdminPin').value = "";
}

function backToWelcome() {
    document.getElementById('adminLoginModal').classList.add('hidden');
    if (!customerName || customerName.trim() === "" || !customerEmail || customerEmail.trim() === "") {
        document.getElementById('welcomeModal').classList.remove('hidden');
    }
}

function verifyAdminPin(e) {
    e.preventDefault();
    if (document.getElementById('inputAdminPin').value === ADMIN_PIN) {
        document.getElementById('adminLoginModal').classList.add('hidden');
        openAdminMode();
    } else {
        alert("PIN Salah!");
        document.getElementById('inputAdminPin').value = "";
    }
}

function changeCustomerDataPrompt() {
    let newName = prompt("Ubah Nama Pemesan:", customerName);
    if (newName && newName.trim() !== "") {
        customerName = newName.trim();
        localStorage.setItem('customer_name', customerName);
        document.getElementById('currentCustomerName').innerText = customerName;
    }
    let newEmail = prompt("Ubah Email untuk Struk:", customerEmail);
    if (newEmail !== null && newEmail.trim() !== "") {
        customerEmail = newEmail.trim();
        localStorage.setItem('customer_email', customerEmail);
    }
}

function saveRestoName() {
    let newName = document.getElementById('inputRestoName').value.trim();
    if (newName) {
        restoName = newName;
        localStorage.setItem(STORAGE_KEY_NAME, restoName);
        document.getElementById('appTitle').innerText = restoName;
        document.getElementById('welcomeRestoName').innerText = restoName;
        alert("Nama resto diperbarui!");
    }
}

function changeTable() {
    let newTable = prompt("Nomor Meja:", currentTable);
    if (newTable && newTable.trim() !== "") {
        currentTable = newTable.trim();
        localStorage.setItem(STORAGE_KEY_TABLE, currentTable);
        document.getElementById('currentTableName').innerText = currentTable;
    }
}

function renderCustomerMenu() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = "";
    const filtered = activeCategory === 'All' ? menus : menus.filter(m => m.category === activeCategory);

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center py-10 text-slate-400 text-xs">Belum ada menu. Silakan sinkronkan Google Sheets di Admin.</div>`;
        return;
    }

    filtered.forEach(menu => {
        const isSoldOut = menu.status === 'Habis';
        grid.innerHTML += `
            <div class="glass rounded-2xl overflow-hidden border border-slate-700/50 shadow-md flex flex-col justify-between">
                <div>
                    <div class="h-28 w-full bg-slate-800 relative overflow-hidden">
                        <img src="${menu.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'}" alt="${menu.name}" class="w-full h-full object-cover ${isSoldOut ? 'grayscale opacity-40' : ''}">
                        <span class="absolute top-1.5 right-1.5 px-2 py-0.5 text-[9px] font-bold rounded-md ${isSoldOut ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'}">${menu.status}</span>
                    </div>
                    <div class="p-2.5">
                        <span class="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">${menu.category}</span>
                        <h3 class="font-bold text-xs mt-1 text-slate-100 line-clamp-1">${menu.name}</h3>
                        <p class="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">${menu.desc || '-'}</p>
                    </div>
                </div>
                <div class="p-2.5 pt-0 flex items-center justify-between">
                    <span class="font-bold text-amber-400 text-xs">Rp ${Number(menu.price).toLocaleString('id-ID')}</span>
                    <button onclick="addToCart('${menu.id}')" ${isSoldOut ? 'disabled' : ''} class="w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center transition ${isSoldOut ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'}">
                        <i class="fa-solid fa-plus text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

function filterCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.innerText.includes(cat) || (cat === 'All' && btn.innerText === 'Semua')) {
            btn.className = "cat-btn px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs whitespace-nowrap transition shadow";
        } else {
            btn.className = "cat-btn px-4 py-2 bg-slate-800/80 text-slate-300 font-semibold rounded-xl text-xs whitespace-nowrap transition border border-slate-700/60";
        }
    });
    renderCustomerMenu();
}

function addToCart(id) {
    const menu = menus.find(m => m.id == id);
    const existing = cart.find(item => item.id == id);
    if (existing) { existing.qty += 1; } else { cart.push({ ...menu, qty: 1 }); }
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    if (totalQty > 0) {
        badge.innerText = totalQty;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.10);
    const total = subtotal + tax;
    return { subtotal, tax, total };
}

function openCart() {
    const list = document.getElementById('cartItemsList');
    list.innerHTML = "";
    if (cart.length === 0) {
        list.innerHTML = `<p class="text-center text-slate-400 py-6 text-xs">Keranjang kosong.</p>`;
    } else {
        cart.forEach((item, index) => {
            list.innerHTML += `
                <div class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div class="pr-2">
                        <h4 class="font-bold text-slate-200 line-clamp-1">${item.name}</h4>
                        <span class="text-[11px] text-amber-400">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="changeQty(${index}, -1)" class="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-300">-</button>
                        <span class="text-xs font-bold w-3 text-center">${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)" class="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-300">+</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('cartTableName').innerText = currentTable;
    document.getElementById('cartCustomerName').innerText = customerName;

    const { subtotal, tax, total } = calculateTotals();
    document.getElementById('cartSubtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('cartTax').innerText = `Rp ${tax.toLocaleString('id-ID')}`;
    document.getElementById('cartTotalPrice').innerText = `Rp ${total.toLocaleString('id-ID')}`;

    document.getElementById('cartModal').classList.remove('hidden');
}

function closeCart() { document.getElementById('cartModal').classList.add('hidden'); }

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) { cart.splice(index, 1); }
    updateCartBadge();
    openCart();
}

function getSelectedPaymentMethod() {
    const radios = document.getElementsByName('paymentMethod');
    for (let r of radios) {
        if (r.checked) return r.value;
    }
    return 'Cash';
}

function processCheckout() {
    if (cart.length === 0) return;
    const paymentMethod = getSelectedPaymentMethod();
    const { subtotal, tax, total } = calculateTotals();
    const orderNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);

    currentTransactionData = {
        orderNo,
        paymentMethod,
        subtotal,
        tax,
        total,
        cart: [...cart]
    };

    closeCart();

    if (paymentMethod === 'Cash') {
        finalizeOrderDirectly("Cash");
    } else if (paymentMethod === 'QRIS') {
        openQrisModal(orderNo, total);
    } else if (paymentMethod === 'Transfer Bank') {
        openVirtualAccountModal(orderNo, total);
    }
}

// Fitur Countdown Timer Batas Waktu Pembayaran (15 Menit)
function startPaymentCountdown(durationInSeconds) {
    if (paymentTimer) clearInterval(paymentTimer);
    let timer = durationInSeconds;

    paymentTimer = setInterval(() => {
        let minutes = parseInt(timer / 60, 10);
        let seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        const countdownElement = document.getElementById('paymentCountdown');
        if (countdownElement) {
            countdownElement.innerText = `${minutes}:${seconds}`;
        }

        if (--timer < 0) {
            clearInterval(paymentTimer);
            alert("Batas waktu pembayaran telah habis. Silakan buat pesanan ulang.");
            closeOnlinePaymentModal();
        }
    }, 1000);
}

function openQrisModal(orderNo, total) {
    document.getElementById('paymentChannelIcon').className = "fa-solid fa-qrcode";
    document.getElementById('paymentChannelTitle').innerText = "Pembayaran QRIS Otomatis";
    document.getElementById('paymentChannelContent').innerHTML = `
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-2 text-xs text-red-400 font-bold flex justify-between items-center">
            <span><i class="fa-solid fa-clock"></i> Batas Waktu:</span>
            <span id="paymentCountdown" class="text-sm font-mono">15:00</span>
        </div>
        <p class="text-[11px] text-slate-300">Scan QR Code di bawah menggunakan E-Wallet atau M-Banking Anda:</p>
        <div class="bg-white p-3 rounded-2xl w-40 h-40 mx-auto flex items-center justify-center shadow">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PAY_${orderNo}_${total}" alt="QRIS" class="w-full h-full object-contain">
        </div>
        <div class="text-xs font-bold text-amber-400">Total: Rp ${total.toLocaleString('id-ID')}</div>
        <p class="text-[10px] text-slate-400">Dana otomatis diverifikasi dan masuk ke rekening owner secara real-time.</p>
    `;
    document.getElementById('onlinePaymentModal').classList.remove('hidden');
    startPaymentCountdown(15 * 60); // 15 Menit
}

function openVirtualAccountModal(orderNo, total) {
    // Menghasilkan nomor Virtual Account otomatis berdasarkan kode prefix bank + nomor rekening owner
    const vaNumber = "880" + ownerAccountNumber;

    document.getElementById('paymentChannelIcon').className = "fa-solid fa-building-columns";
    document.getElementById('paymentChannelTitle').innerText = "Virtual Account Otomatis";
    document.getElementById('paymentChannelContent').innerHTML = `
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-2 text-xs text-red-400 font-bold flex justify-between items-center">
            <span><i class="fa-solid fa-clock"></i> Batas Waktu:</span>
            <span id="paymentCountdown" class="text-sm font-mono">15:00</span>
        </div>
        <p class="text-[11px] text-slate-300">Silakan lakukan transfer pembayaran ke nomor Virtual Account ${ownerBankName}:</p>
        <div class="bg-slate-800 p-3 rounded-xl border border-slate-700 text-left space-y-1.5">
            <div class="flex justify-between text-[11px]"><span class="text-slate-400">Bank Tujuan:</span> <span class="font-bold text-slate-200">${ownerBankName}</span></div>
            <div class="flex justify-between text-[11px]"><span class="text-slate-400">No. Virtual Account:</span> <span class="font-mono font-bold text-amber-400">${vaNumber}</span></div>
            <div class="flex justify-between text-[11px]"><span class="text-slate-400">Nama Penerima:</span> <span class="font-bold text-slate-200">${ownerAccountName}</span></div>
        </div>
        <div class="text-xs font-bold text-amber-400 pt-1">Total Tagihan: Rp ${total.toLocaleString('id-ID')}</div>
        <p class="text-[10px] text-slate-400">Sistem otomatis mendeteksi mutasi masuk ke rekening owner.</p>
    `;
    document.getElementById('onlinePaymentModal').classList.remove('hidden');
    startPaymentCountdown(15 * 60); // 15 Menit
}

function closeOnlinePaymentModal() {
    if (paymentTimer) clearInterval(paymentTimer);
    document.getElementById('onlinePaymentModal').classList.add('hidden');
    openCart();
}

async function simulateSuccessfulPayment() {
    if (paymentTimer) clearInterval(paymentTimer);
    document.getElementById('onlinePaymentModal').classList.add('hidden');
    document.getElementById('cartModal').classList.add('hidden');
    await finalizeOrderDirectly(currentTransactionData.paymentMethod);
}

async function finalizeOrderDirectly(paymentMethod) {
    const { orderNo, subtotal, tax, total } = currentTransactionData;

    prepareReceiptDOMCustom(orderNo, paymentMethod, subtotal, tax, total);

    if (googleScriptUrl && customerEmail) {
        await postToCloud({
            action: "sendOrderHistory",
            orderNo,
            customerName,
            customerEmail,
            currentTable,
            paymentMethod,
            cart: JSON.stringify(cart),
            subtotal,
            tax,
            total
        });
    }

    alert(`Pembayaran via ${paymentMethod} Berhasil! Struk digital telah dikirim ke email: ${customerEmail}`);
    window.print();

    cart = [];
    updateCartBadge();
    localStorage.removeItem('customer_name');
    localStorage.removeItem('customer_email');
    customerName = "";
    customerEmail = "";
    document.getElementById('welcomeModal').classList.remove('hidden');
}

function prepareReceiptDOMCustom(orderNo, paymentMethod, subtotal, tax, total) {
    document.getElementById('receiptRestoName').innerText = restoName;
    document.getElementById('recOrderNo').innerText = orderNo;
    document.getElementById('recDate').innerText = new Date().toLocaleString('id-ID');
    document.getElementById('recCustomer').innerText = customerName;
    document.getElementById('recEmail').innerText = customerEmail || '-';
    document.getElementById('recTable').innerText = currentTable;
    document.getElementById('recPayment').innerText = paymentMethod;

    let itemsHtml = '';
    cart.forEach(item => {
        itemsHtml += `<div class="flex justify-between"><span>${item.name} (${item.qty}x)</span> <span>Rp ${(item.price * item.qty).toLocaleString('id-ID')}</span></div>`;
    });
    document.getElementById('recItemsList').innerHTML = itemsHtml;

    document.getElementById('recSubtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('recTax').innerText = `Rp ${tax.toLocaleString('id-ID')}`;
    document.getElementById('recTotal').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

function printReceipt() {
    if (cart.length === 0) return;
    const { subtotal, tax, total } = calculateTotals();
    const orderNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const paymentMethod = getSelectedPaymentMethod();
    prepareReceiptDOMCustom(orderNo, paymentMethod, subtotal, tax, total);
    window.print();
}

function openAdminMode() {
    closeCart();
    document.getElementById('inputRestoName').value = restoName;
    document.getElementById('inputScriptUrl').value = googleScriptUrl;
    document.getElementById('adminModal').classList.remove('hidden');
    renderAdminCards();
}

function closeAdminMode() {
    document.getElementById('adminModal').classList.add('hidden');
    renderCustomerMenu();
}

function renderAdminCards() {
    const container = document.getElementById('adminMenuCards');
    container.innerHTML = "";
    menus.forEach(menu => {
        const isSoldOut = menu.status === 'Habis';
        container.innerHTML += `
            <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div class="pr-2">
                    <h4 class="font-bold text-slate-200 line-clamp-1">${menu.name}</h4>
                    <p class="text-amber-400 font-semibold">Rp ${Number(menu.price).toLocaleString('id-ID')}</p>
                    <span class="text-[9px] text-slate-400">${menu.category}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="toggleStock('${menu.id}')" class="px-2 py-1 text-[9px] font-bold rounded-lg ${isSoldOut ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                        ${menu.status}
                    </button>
                    <button onclick="editMenu('${menu.id}')" class="p-1.5 bg-slate-800 text-amber-400 rounded-lg"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="deleteMenu('${menu.id}')" class="p-1.5 bg-slate-800 text-red-400 rounded-lg"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `;
    });
}

function handleAddMenu(e) {
    e.preventDefault();
    const id = document.getElementById('menuId').value || 'MN-' + Date.now();
    const name = document.getElementById('inputName').value;
    const category = document.getElementById('inputCategory').value;
    const price = Number(document.getElementById('inputPrice').value);
    const image = document.getElementById('inputImage').value;
    const desc = document.getElementById('inputDesc').value;
    const status = "Tersedia";

    const menuData = { id, name, category, price, desc, image, status };

    const index = menus.findIndex(m => m.id == id);
    if (index !== -1) {
        menus[index] = menuData;
    } else {
        menus.push(menuData);
    }

    localStorage.setItem(STORAGE_KEY_MENUS, JSON.stringify(menus));
    postToCloud({ action: "saveOrUpdateMenu", ...menuData });

    document.getElementById('menuForm').reset();
    document.getElementById('menuId').value = "";
    document.getElementById('formTitle').innerText = "Tambah Menu Baru";
    renderAdminCards();
    renderCustomerMenu();
    alert("Menu berhasil disimpan!");
}

function editMenu(id) {
    const menu = menus.find(m => m.id == id);
    if (!menu) return;
    document.getElementById('menuId').value = menu.id;
    document.getElementById('inputName').value = menu.name;
    document.getElementById('inputCategory').value = menu.category;
    document.getElementById('inputPrice').value = menu.price;
    document.getElementById('inputImage').value = menu.image || '';
    document.getElementById('inputDesc').value = menu.desc || '';
    document.getElementById('formTitle').innerText = "Edit Menu: " + menu.name;
}

function toggleStock(id) {
    const menu = menus.find(m => m.id == id);
    if (menu) {
        menu.status = menu.status === 'Tersedia' ? 'Habis' : 'Tersedia';
        localStorage.setItem(STORAGE_KEY_MENUS, JSON.stringify(menus));
        postToCloud({ action: "saveOrUpdateMenu", ...menu });
        renderAdminCards();
        renderCustomerMenu();
    }
}

function deleteMenu(id) {
    if (confirm("Hapus menu ini?")) {
        menus = menus.filter(m => m.id != id);
        localStorage.setItem(STORAGE_KEY_MENUS, JSON.stringify(menus));
        postToCloud({ action: "deleteMenu", id });
        renderAdminCards();
        renderCustomerMenu();
    }
}
