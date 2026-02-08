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

const PRODUCTS = [
  { id: "espresso", name: "Espresso", price: 1.2, hot: true },
  { id: "macchiato", name: "Macchiato", price: 1.5, hot: true },
  { id: "cappuccino", name: "Cappuccino", price: 2.0, hot: true },
  { id: "latte", name: "Latte", price: 2.2, hot: true },
  { id: "americano", name: "Americano", price: 1.8, hot: true },
  { id: "croissant", name: "Croissant", price: 1.3, hot: false },
  { id: "cheesecake", name: "Cheesecake", price: 2.8, hot: false }
];

const TABLES = ["1","2","3","4","5","6","7","8","9","10","11","12"];

let orders = JSON.parse(localStorage.getItem("orders") || "[]");
let editingId = null;
let draftItems = [];

// Normalize old orders
orders = orders.map(o => {
  if (Array.isArray(o.items)) return o;
  if (o.item) {
    return {
      ...o,
      items: [{ id: o.item.toLowerCase(), name: o.item, qty: o.qty || 1, price: o.price || 0 }]
    };
  }
  return { ...o, items: [] };
});

function generateOrderId() {
  return Math.floor(100000 + Math.random() * 900000);
}

function saveToStorage() {
  localStorage.setItem("orders", JSON.stringify(orders));
}

function toastShow(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2000);
}

function fillProducts() {
  productSelect.innerHTML = "";
  PRODUCTS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.price}€)`;
    productSelect.appendChild(opt);
  });
  updatePrice();
}

function fillTables() {
  tableInput.innerHTML = "";
  TABLES.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = `Tavolina ${t}`;
    tableInput.appendChild(opt);
  });
}

function fillQuickProducts() {
  quickProductsEl.innerHTML = "";
  PRODUCTS.slice(0,5).forEach(p => {
    const btn = document.createElement("button");
    btn.className = "quick-btn";
    btn.textContent = `${p.name}`;
    btn.addEventListener("click", () => {
      productSelect.value = p.id;
      updatePrice();
      addItem();
    });
    quickProductsEl.appendChild(btn);
  });
}

function updatePrice() {
  const product = PRODUCTS.find(p => p.id === productSelect.value);
  priceInput.value = product ? `${product.price}€` : "0€";
}

function openModal(editOrder = null) {
  orderModal.classList.remove("hidden");
  if (editOrder) {
    modalTitle.textContent = "Edit Porosi";
    tableInput.value = editOrder.table;
    waiterInput.value = editOrder.waiter || "";
    customerNoteInput.value = editOrder.customerNote || "";
    notesInput.value = editOrder.notes || "";
    statusSelect.value = editOrder.statusDetail || "pending";
    prioritySelect.value = editOrder.priority || "normal";
    paymentSelect.value = editOrder.payment || "unpaid";
    discountInput.value = editOrder.discount || 0;
    draftItems = editOrder.items.map(i => ({ ...i }));
    editingId = editOrder.id;
  } else {
    modalTitle.textContent = "Porosi e re";
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
  const product = PRODUCTS.find(p => p.id === productSelect.value);
  const qty = Number(qtyInput.value);
  if (!product || qty <= 0) return;

  const existing = draftItems.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    draftItems.push({ id: product.id, name: product.name, price: product.price, qty });
  }
  renderDraftItems();
}

function removeItem(id) {
  draftItems = draftItems.filter(i => i.id !== id);
  renderDraftItems();
}

function calcTotals() {
  const subtotal = draftItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const vat = subtotal * VAT;
  const discount = subtotal * (Number(discountInput.value || 0) / 100);
  const total = subtotal + vat - discount;
  return { subtotal, vat, total };
}

function renderDraftItems() {
  itemsList.innerHTML = "";
  draftItems.forEach(i => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <span>${i.name}</span>
      <span>${i.qty} x ${i.price}€</span>
      <button class="btn-ghost" data-id="${i.id}">Hiq</button>
    `;
    row.querySelector("button").addEventListener("click", () => removeItem(i.id));
    itemsList.appendChild(row);
  });

  const { subtotal, vat, total } = calcTotals();
  subtotalPriceEl.textContent = `${subtotal.toFixed(2)}€`;
  vatPriceEl.textContent = `${vat.toFixed(2)}€`;
  totalPriceEl.textContent = `${total.toFixed(2)}€`;
}

function addOrder() {
  const table = tableInput.value.trim();
  if (!table || draftItems.length === 0) return;

  const { subtotal, vat, total } = calcTotals();

  const order = {
    id: Date.now(),
    orderCode: generateOrderId(),
    table,
    waiter: waiterInput.value.trim(),
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
    orders = orders.map(o => o.id === editingId ? { ...order, id: editingId, orderCode: o.orderCode } : o);
  } else {
    orders.push(order);
  }
  saveToStorage();
  renderOrders();
  closeModal();
  toastShow("Order saved");
}

function deleteOrder(id) {
  orders = orders.filter(o => o.id !== id);
  saveToStorage();
  renderOrders();
}

function completeOrder(id) {
  orders = orders.map(o => o.id === id ? { ...o, status: "completed" } : o);
  saveToStorage();
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
  const unique = new Set(orders.map(o => o.waiter).filter(Boolean));
  waiterFilter.innerHTML = `<option value="all">Të gjithë kamarierët</option>`;
  unique.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = w;
    waiterFilter.appendChild(opt);
  });
}

function renderOrders() {
  const query = searchInput.value.toLowerCase();
  const filter = filterSelect.value;
  const dateF = dateFilter.value;
  const waiterF = waiterFilter.value;

  const filtered = orders.filter(o => {
    const itemsText = (o.items || []).map(i => i.name.toLowerCase()).join(" ");
    const codeText = String(o.orderCode || "");
    const matches =
      itemsText.includes(query) ||
      o.table.toLowerCase().includes(query) ||
      codeText.includes(query.replace("#", ""));
    if (!matches) return false;
    if (!inDateRange(o.createdAt || Date.now(), dateF)) return false;
    if (waiterF !== "all" && o.waiter !== waiterF) return false;
    if (filter === "active") return o.status === "active";
    if (filter === "history") return o.status !== "active";
    return true;
  });

  activeOrdersEl.innerHTML = "";
  historyOrdersEl.innerHTML = "";

  filtered.forEach(order => {
    const card = document.createElement("div");
    card.className = "order-card";
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
        ${(order.items || []).map(i => `<div>${i.name} x${i.qty}</div>`).join("")}
      </div>
      <div class="order-total">Total: ${order.total.toFixed(2)}€</div>
      <small>Kamarieri: ${order.waiter || "-"}</small>
      <small>Klienti: ${order.customerNote || "-"}</small>
      <small>Status: ${order.statusDetail || "-"}</small>
      <small>Koha: ${new Date(order.createdAt).toLocaleTimeString()}</small>
      <div class="order-actions">
        <button class="btn-ghost" data-action="edit">Edit</button>
        <button class="btn-ghost" data-action="delete">Delete</button>
        <button class="btn-ghost" data-action="print">Print</button>
        ${order.status === "active" ? `<button class="btn-primary" data-action="complete">Complete</button>` : ""}
      </div>
    `;
    card.querySelector("[data-action='edit']")?.addEventListener("click", () => openModal(order));
    card.querySelector("[data-action='delete']")?.addEventListener("click", () => deleteOrder(order.id));
    card.querySelector("[data-action='complete']")?.addEventListener("click", () => completeOrder(order.id));
    card.querySelector("[data-action='print']")?.addEventListener("click", () => window.print());

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

fillProducts();
fillTables();
fillQuickProducts();
renderOrders();
