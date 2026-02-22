const activeOrdersEl = document.getElementById("activeOrders");
const historyOrdersEl = document.getElementById("historyOrders");
const activePanel = document.getElementById("activePanel");
const historyPanel = document.getElementById("historyPanel");

const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const dateFilter = document.getElementById("dateFilter");
const waiterFilter = document.getElementById("waiterFilter");
const newOrderBtn = document.getElementById("newOrderBtn");

const orderModal = document.getElementById("orderModal");
const saveOrderBtn = document.getElementById("saveOrderBtn");
const cancelOrderBtn = document.getElementById("cancelOrderBtn");
const addItemBtn = document.getElementById("addItemBtn");

const tableInput = document.getElementById("tableInput");
const waiterInput = document.getElementById("waiterInput");
const customerNoteInput = document.getElementById("customerNoteInput");
const statusSelect = document.getElementById("statusSelect");
const prioritySelect = document.getElementById("prioritySelect");
const paymentSelect = document.getElementById("paymentSelect");
const discountInput = document.getElementById("discountInput");

const productSelect = document.getElementById("productSelect");
const qtyInput = document.getElementById("qtyInput");
const priceInput = document.getElementById("priceInput");
const notesInput = document.getElementById("notesInput");
const modalTitle = document.getElementById("modalTitle");
const itemsList = document.getElementById("itemsList");
const subtotalPriceEl = document.getElementById("subtotalPrice");
const vatPriceEl = document.getElementById("vatPrice");
const totalPriceEl = document.getElementById("totalPrice");
const quickProductsEl = document.getElementById("quickProducts");
const toast = document.getElementById("toast");

const VAT = 0.18;
const MENU_STORAGE_KEY = "menuProducts";
const ORDER_STORAGE_KEY = "orders";
const PREFILL_TABLE_KEY = "prefillTable";
const WAITER_STORAGE_KEY = "waiters";
const RESET_KEYS = ["orders", "payments", "tableStates", "prefillTable", "menuProducts", "waiters", "reservations"];

const DEFAULT_PRODUCTS = [
  { id: "espresso", name: "Espresso", price: 1.2, hot: true, category: "Kafe" },
  { id: "macchiato", name: "Macchiato", price: 1.5, hot: true, category: "Kafe" },
  { id: "cappuccino", name: "Cappuccino", price: 2.0, hot: true, category: "Kafe" },
  { id: "latte", name: "Latte", price: 2.2, hot: true, category: "Kafe" },
  { id: "americano", name: "Americano", price: 1.8, hot: true, category: "Kafe" },
  { id: "croissant", name: "Croissant", price: 1.3, hot: false, category: "Bakery" },
  { id: "cheesecake", name: "Cheesecake", price: 2.8, hot: false, category: "Dessert" }
];

const TABLES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function maybeResetDataFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") !== "1") return false;

  RESET_KEYS.forEach((key) => localStorage.removeItem(key));
  return true;
}

const didResetData = maybeResetDataFromUrl();

let products = loadProducts();
let waiters = loadWaiters();
let orders = normalizeOrders(JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]"));
let editingId = null;
let draftItems = [];

function loadProducts() {
  const raw = localStorage.getItem(MENU_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid menu");

    const safe = parsed
      .map((p) => ({
        id: String(p.id || p.name || "product"),
        name: String(p.name || "Product"),
        price: Number(p.price || 0),
        hot: Boolean(p.hot),
        category: String(p.category || "General")
      }))
      .filter((p) => p.name.trim() !== "");

    return safe.length > 0 ? safe : [...DEFAULT_PRODUCTS];
  } catch {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
}

function normalizeOrders(input) {
  if (!Array.isArray(input)) return [];

  return input.map((o) => {
    const baseItems = Array.isArray(o.items)
      ? o.items
      : o.item
      ? [{ id: String(o.item).toLowerCase(), name: String(o.item), qty: Number(o.qty || 1), price: Number(o.price || 0) }]
      : [];

    return {
      id: o.id || Date.now(),
      orderCode: o.orderCode || generateOrderId(),
      table: String(o.table || "1"),
      waiterId: String(o.waiterId || ""),
      waiterName: String(o.waiterName || o.waiter || ""),
      waiter: String(o.waiter || ""),
      customerNote: String(o.customerNote || ""),
      items: baseItems,
      subtotal: Number(o.subtotal || 0),
      vat: Number(o.vat || 0),
      discount: Number(o.discount || 0),
      total: Number(o.total || 0),
      notes: String(o.notes || ""),
      status: o.status || "active",
      statusDetail: o.statusDetail || "pending",
      priority: o.priority || "normal",
      payment: o.payment || "unpaid",
      createdAt: o.createdAt || Date.now()
    };
  });
}

function loadWaiters() {
  const raw = localStorage.getItem(WAITER_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((w) => ({
        id: String(w.id || ""),
        name: String(w.name || "").trim(),
        shift: String(w.shift || ""),
        isActive: w.isActive !== false
      }))
      .filter((w) => w.id && w.name);
  } catch {
    return [];
  }
}

function generateOrderId() {
  return Math.floor(100000 + Math.random() * 900000);
}

function consumePrefillTable() {
  const value = localStorage.getItem(PREFILL_TABLE_KEY);
  if (!value) return null;
  localStorage.removeItem(PREFILL_TABLE_KEY);
  return value;
}

function saveOrders() {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2000);
}

function fillProducts() {
  productSelect.innerHTML = "";

  if (products.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nuk ka produkte";
    productSelect.appendChild(opt);
    priceInput.value = "0.00 EUR";
    return;
  }

  products.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${Number(p.price).toFixed(2)} EUR)`;
    productSelect.appendChild(opt);
  });

  updatePrice();
}

function fillTables() {
  tableInput.innerHTML = "";
  TABLES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = `Tavolina ${t}`;
    tableInput.appendChild(opt);
  });
}

function fillWaiterSelect(selectedId = "") {
  waiterInput.innerHTML = "";

  const activeWaiters = waiters.filter((w) => w.isActive);
  if (activeWaiters.length === 0) {
    const fallback = document.createElement("option");
    fallback.value = "";
    fallback.textContent = "Regjistro kamarieret te kamariaret.html";
    waiterInput.appendChild(fallback);
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Zgjidh kamarierin";
  waiterInput.appendChild(placeholder);

  activeWaiters.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.shift ? `${w.name} (${w.shift})` : w.name;
    waiterInput.appendChild(opt);
  });

  if (selectedId && activeWaiters.some((w) => w.id === selectedId)) {
    waiterInput.value = selectedId;
  } else {
    waiterInput.value = "";
  }
}

function fillQuickProducts() {
  quickProductsEl.innerHTML = "";

  const quick = products.filter((p) => p.hot).slice(0, 6);
  if (quick.length === 0) return;

  quick.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-btn";
    btn.textContent = p.name;
    btn.addEventListener("click", () => {
      productSelect.value = p.id;
      updatePrice();
      addItem();
    });
    quickProductsEl.appendChild(btn);
  });
}

function updatePrice() {
  const product = products.find((p) => p.id === productSelect.value);
  priceInput.value = product ? `${Number(product.price).toFixed(2)} EUR` : "0.00 EUR";
}

function openModal(editOrder = null) {
  orderModal.classList.remove("hidden");
  fillWaiterSelect();

  if (editOrder) {
    modalTitle.textContent = "Edit Porosi";
    tableInput.value = editOrder.table;
    const waiterId = editOrder.waiterId || "";
    if (waiterId) {
      fillWaiterSelect(waiterId);
    } else {
      const byName = waiters.find((w) => w.name === (editOrder.waiterName || editOrder.waiter));
      fillWaiterSelect(byName ? byName.id : "");
    }
    customerNoteInput.value = editOrder.customerNote || "";
    notesInput.value = editOrder.notes || "";
    statusSelect.value = editOrder.statusDetail || "pending";
    prioritySelect.value = editOrder.priority || "normal";
    paymentSelect.value = editOrder.payment || "unpaid";
    discountInput.value = editOrder.discount || 0;
    draftItems = (editOrder.items || []).map((i) => ({ ...i }));
    editingId = editOrder.id;
  } else {
    modalTitle.textContent = "Porosi e re";
    const prefill = consumePrefillTable();
    tableInput.value = prefill && TABLES.includes(prefill) ? prefill : TABLES[0];
    waiterInput.value = "";
    customerNoteInput.value = "";
    notesInput.value = "";
    statusSelect.value = "pending";
    prioritySelect.value = "normal";
    paymentSelect.value = "unpaid";
    discountInput.value = 0;
    draftItems = [];
    editingId = null;
  }

  qtyInput.value = 1;
  updatePrice();
  renderDraftItems();
}

function closeModal() {
  orderModal.classList.add("hidden");
}

function addItem() {
  const product = products.find((p) => p.id === productSelect.value);
  const qty = Number(qtyInput.value);

  if (!product || qty <= 0) return;

  const existing = draftItems.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    draftItems.push({ id: product.id, name: product.name, price: Number(product.price), qty });
  }

  renderDraftItems();
}

function removeItem(id) {
  draftItems = draftItems.filter((i) => i.id !== id);
  renderDraftItems();
}

function calcTotals() {
  const subtotal = draftItems.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
  const vat = subtotal * VAT;
  const discountAmount = subtotal * (Number(discountInput.value || 0) / 100);
  const total = subtotal + vat - discountAmount;
  return { subtotal, vat, total };
}

function renderDraftItems() {
  itemsList.innerHTML = "";

  draftItems.forEach((i) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <span>${i.name}</span>
      <span>${i.qty} x ${Number(i.price).toFixed(2)} EUR</span>
      <button class="btn-ghost" data-id="${i.id}" type="button">Hiq</button>
    `;

    row.querySelector("button").addEventListener("click", () => removeItem(i.id));
    itemsList.appendChild(row);
  });

  const { subtotal, vat, total } = calcTotals();
  subtotalPriceEl.textContent = `${subtotal.toFixed(2)} EUR`;
  vatPriceEl.textContent = `${vat.toFixed(2)} EUR`;
  totalPriceEl.textContent = `${total.toFixed(2)} EUR`;
}

function addOrder() {
  const table = String(tableInput.value || "").trim();
  const waiterId = String(waiterInput.value || "");
  const waiterRef = waiters.find((w) => w.id === waiterId && w.isActive);
  if (!table || draftItems.length === 0) return;
  if (!waiterRef) {
    showToast("Zgjidh kamarierin");
    return;
  }

  const { subtotal, vat, total } = calcTotals();

  const order = {
    id: Date.now(),
    orderCode: generateOrderId(),
    table,
    waiterId: waiterRef.id,
    waiterName: waiterRef.name,
    waiter: waiterRef.name,
    customerNote: customerNoteInput.value.trim(),
    items: draftItems,
    subtotal,
    vat,
    discount: Number(discountInput.value || 0),
    total,
    notes: notesInput.value.trim(),
    status: "active",
    statusDetail: statusSelect.value,
    priority: prioritySelect.value,
    payment: paymentSelect.value,
    createdAt: Date.now()
  };

  if (editingId) {
    orders = orders.map((o) => (o.id === editingId ? { ...order, id: editingId, orderCode: o.orderCode, createdAt: o.createdAt } : o));
  } else {
    orders.push(order);
  }

  saveOrders();
  renderOrders();
  closeModal();
  showToast("Order saved");
}

function deleteOrder(id) {
  orders = orders.filter((o) => o.id !== id);
  saveOrders();
  renderOrders();
}

function completeOrder(id) {
  orders = orders.map((o) => (o.id === id ? { ...o, status: "completed" } : o));
  saveOrders();
  renderOrders();
}

function inDateRange(ts, filter) {
  const now = new Date();
  const d = new Date(ts);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfLast7 = new Date(startOfToday);
  startOfLast7.setDate(startOfLast7.getDate() - 6);

  if (filter === "today") return d >= startOfToday;
  if (filter === "yesterday") return d >= startOfYesterday && d < startOfToday;
  if (filter === "last7") return d >= startOfLast7;
  return true;
}

function fillWaiterFilter() {
  const unique = [...new Set(orders.map((o) => o.waiterName || o.waiter).filter(Boolean))];
  waiterFilter.innerHTML = '<option value="all">Te gjithe kamarieret</option>';

  unique.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = w;
    waiterFilter.appendChild(opt);
  });
}

function renderOrders() {
  const query = searchInput.value.toLowerCase().trim();
  const filter = filterSelect.value;
  const dateF = dateFilter.value;
  const waiterF = waiterFilter.value;

  const filtered = orders.filter((o) => {
    const waiterName = (o.waiterName || o.waiter || "").trim();
    const itemsText = (o.items || []).map((i) => String(i.name).toLowerCase()).join(" ");
    const codeText = String(o.orderCode || "");
    const matches =
      itemsText.includes(query) ||
      String(o.table || "").toLowerCase().includes(query) ||
      codeText.includes(query.replace("#", ""));

    if (!matches) return false;
    if (!inDateRange(o.createdAt || Date.now(), dateF)) return false;
    if (waiterF !== "all" && waiterName !== waiterF) return false;
    if (filter === "active") return o.status === "active";
    if (filter === "history") return o.status !== "active";
    return true;
  });

  activeOrdersEl.innerHTML = "";
  historyOrdersEl.innerHTML = "";

  filtered.forEach((order) => {
    const waiterName = order.waiterName || order.waiter || "-";
    const card = document.createElement("div");
    card.className = "order-card";
    card.draggable = order.status === "active";
    card.dataset.orderId = String(order.id);

    card.innerHTML = `
      <div class="order-top">
        <strong>Porosia #${order.orderCode}</strong>
        <span class="badge ${order.status}">${order.status}</span>
      </div>
      <div class="order-meta">
        <span>Tavolina ${order.table}</span>
        <span>Prioritet: ${order.priority}</span>
        <span>Pagesa: ${order.payment}</span>
      </div>
      <div class="order-items">
        ${(order.items || []).map((i) => `<div>${i.name} x${i.qty}</div>`).join("")}
      </div>
      <div class="order-total">Total: ${Number(order.total).toFixed(2)} EUR</div>
      <small>Kamarieri: ${waiterName}</small>
      <small>Klienti: ${order.customerNote || "-"}</small>
      <small>Status: ${order.statusDetail || "-"}</small>
      <small>Koha: ${new Date(order.createdAt).toLocaleTimeString()}</small>
      <div class="order-actions">
        <button class="btn-ghost" data-action="edit" type="button">Edit</button>
        <button class="btn-ghost" data-action="delete" type="button">Delete</button>
        <button class="btn-ghost" data-action="print" type="button">Print</button>
        ${order.status === "active" ? '<button class="btn-primary" data-action="complete" type="button">Complete</button>' : ""}
      </div>
    `;

    card.querySelector('[data-action="edit"]')?.addEventListener("click", () => openModal(order));
    card.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteOrder(order.id));
    card.querySelector('[data-action="complete"]')?.addEventListener("click", () => completeOrder(order.id));
    card.querySelector('[data-action="print"]')?.addEventListener("click", () => window.print());

    if (order.status === "active") {
      activeOrdersEl.appendChild(card);
    } else {
      historyOrdersEl.appendChild(card);
    }
  });

  if (filter === "active") {
    historyPanel.classList.add("panel-hidden");
    activePanel.classList.remove("panel-hidden");
  } else if (filter === "history") {
    activePanel.classList.add("panel-hidden");
    historyPanel.classList.remove("panel-hidden");
  } else {
    activePanel.classList.remove("panel-hidden");
    historyPanel.classList.remove("panel-hidden");
  }

  if (!activeOrdersEl.children.length) activeOrdersEl.innerHTML = "<p>No active orders</p>";
  if (!historyOrdersEl.children.length) historyOrdersEl.innerHTML = "<p>No history yet</p>";

  fillWaiterFilter();
}

function reorderActiveOrders(draggedId, targetId) {
  const active = orders.filter((o) => o.status === "active");
  const others = orders.filter((o) => o.status !== "active");

  const from = active.findIndex((o) => String(o.id) === draggedId);
  const to = active.findIndex((o) => String(o.id) === targetId);
  if (from < 0 || to < 0 || from === to) return;

  const [moved] = active.splice(from, 1);
  active.splice(to, 0, moved);

  orders = [...active, ...others];
  saveOrders();
  renderOrders();
}

activeOrdersEl.addEventListener("dragstart", (e) => {
  const card = e.target.closest(".order-card");
  if (!card) return;
  e.dataTransfer.setData("text/plain", card.dataset.orderId);
});

activeOrdersEl.addEventListener("dragover", (e) => {
  e.preventDefault();
});

activeOrdersEl.addEventListener("drop", (e) => {
  e.preventDefault();
  const draggedId = e.dataTransfer.getData("text/plain");
  const targetCard = e.target.closest(".order-card");
  if (!draggedId || !targetCard) return;
  reorderActiveOrders(draggedId, targetCard.dataset.orderId);
});

newOrderBtn.addEventListener("click", () => openModal());
saveOrderBtn.addEventListener("click", addOrder);
cancelOrderBtn.addEventListener("click", closeModal);
addItemBtn.addEventListener("click", addItem);
discountInput.addEventListener("input", renderDraftItems);

productSelect.addEventListener("change", updatePrice);
searchInput.addEventListener("input", renderOrders);
filterSelect.addEventListener("change", renderOrders);
dateFilter.addEventListener("change", renderOrders);
waiterFilter.addEventListener("change", renderOrders);

window.addEventListener("storage", (e) => {
  if (e.key === MENU_STORAGE_KEY) {
    products = loadProducts();
    fillProducts();
    fillQuickProducts();
    return;
  }

  if (e.key === WAITER_STORAGE_KEY) {
    waiters = loadWaiters();
    fillWaiterSelect();
    renderOrders();
  }
});

fillProducts();
fillTables();
fillWaiterSelect();
fillQuickProducts();
renderOrders();

if (didResetData) {
  showToast("Data reset complete");
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
}
