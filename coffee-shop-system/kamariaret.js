const WAITER_STORAGE_KEY = "waiters";
const ORDER_STORAGE_KEY = "orders";
const PAYMENT_STORAGE_KEY = "payments";
const RESERVATION_STORAGE_KEY = "reservations";

const waiterForm = document.getElementById("waiterForm");
const waiterFormTitle = document.getElementById("waiterFormTitle");
const waiterName = document.getElementById("waiterName");
const waiterShift = document.getElementById("waiterShift");
const waiterPhone = document.getElementById("waiterPhone");
const waiterActive = document.getElementById("waiterActive");
const waiterCancelBtn = document.getElementById("waiterCancelBtn");

const waiterSearch = document.getElementById("waiterSearch");
const waiterDateFilter = document.getElementById("waiterDateFilter");
const waiterStatusFilter = document.getElementById("waiterStatusFilter");
const waitersList = document.getElementById("waitersList");
const waitersToast = document.getElementById("waitersToast");

const kpiWaitersTotal = document.getElementById("kpiWaitersTotal");
const kpiWaitersActive = document.getElementById("kpiWaitersActive");
const kpiWaitersRevenue = document.getElementById("kpiWaitersRevenue");
const kpiWaitersRes = document.getElementById("kpiWaitersRes");

let waiters = loadWaiters();
let orders = loadList(ORDER_STORAGE_KEY);
let payments = loadList(PAYMENT_STORAGE_KEY);
let reservations = loadList(RESERVATION_STORAGE_KEY);
let editingId = null;

function showToast(message) {
  waitersToast.textContent = message;
  waitersToast.classList.remove("hidden");
  setTimeout(() => waitersToast.classList.add("hidden"), 1800);
}

function loadList(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
        shift: String(w.shift || "Morning"),
        phone: String(w.phone || ""),
        isActive: w.isActive !== false,
        createdAt: Number(w.createdAt || Date.now())
      }))
      .filter((w) => w.id && w.name);
  } catch {
    return [];
  }
}

function saveWaiters() {
  localStorage.setItem(WAITER_STORAGE_KEY, JSON.stringify(waiters));
}

function toMoney(value) {
  return `${Number(value).toFixed(2)} EUR`;
}

function inDateRange(ts, filter) {
  if (filter === "all") return true;
  const now = new Date();
  const d = new Date(Number(ts || Date.now()));
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startLast7 = new Date(startToday);
  startLast7.setDate(startLast7.getDate() - 6);
  if (filter === "today") return d >= startToday;
  if (filter === "last7") return d >= startLast7;
  return true;
}

function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

function waiterMatch(waiter, item) {
  const itemId = String(item.waiterId || "");
  const itemName = normalizeText(item.waiterName || item.waiter || "");
  return itemId === waiter.id || itemName === normalizeText(waiter.name);
}

function waiterStats(waiter, dateFilter) {
  const relatedOrders = orders.filter((o) => waiterMatch(waiter, o));
  const relatedPayments = payments.filter((p) => waiterMatch(waiter, p));
  const relatedReservations = reservations.filter((r) => waiterMatch(waiter, r));

  const ordersPeriod = relatedOrders.filter((o) => inDateRange(o.createdAt, dateFilter));
  const paymentsPeriod = relatedPayments.filter((p) => inDateRange(p.createdAt, dateFilter));
  const reservationsPeriod = relatedReservations.filter((r) => inDateRange(r.startedAt || r.createdAt, dateFilter));

  const activeOrders = relatedOrders.filter((o) => o.status === "active").length;
  const revenue = paymentsPeriod.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    ordersCount: ordersPeriod.length,
    activeOrders,
    paymentsCount: paymentsPeriod.length,
    revenue,
    reservationsCount: reservationsPeriod.length
  };
}

function renderKpis(filteredWaiters, dateFilter) {
  const total = waiters.length;
  const active = waiters.filter((w) => w.isActive).length;

  let revenue = 0;
  let reservationsCount = 0;
  filteredWaiters.forEach((w) => {
    const stats = waiterStats(w, dateFilter);
    revenue += stats.revenue;
    reservationsCount += stats.reservationsCount;
  });

  kpiWaitersTotal.textContent = String(total);
  kpiWaitersActive.textContent = String(active);
  kpiWaitersRevenue.textContent = toMoney(revenue);
  kpiWaitersRes.textContent = String(reservationsCount);
}

function startEdit(id) {
  const w = waiters.find((x) => x.id === id);
  if (!w) return;

  editingId = w.id;
  waiterFormTitle.textContent = `Edit: ${w.name}`;
  waiterName.value = w.name;
  waiterShift.value = w.shift;
  waiterPhone.value = w.phone;
  waiterActive.checked = w.isActive;
}

function resetForm() {
  editingId = null;
  waiterFormTitle.textContent = "Regjistro kamarier";
  waiterName.value = "";
  waiterShift.value = "Morning";
  waiterPhone.value = "";
  waiterActive.checked = true;
}

function toggleActive(id) {
  waiters = waiters.map((w) => {
    if (w.id !== id) return w;
    return { ...w, isActive: !w.isActive };
  });
  saveWaiters();
  render();
}

function removeWaiter(id) {
  waiters = waiters.filter((w) => w.id !== id);
  saveWaiters();
  if (editingId === id) resetForm();
  render();
}

function render() {
  orders = loadList(ORDER_STORAGE_KEY);
  payments = loadList(PAYMENT_STORAGE_KEY);
  reservations = loadList(RESERVATION_STORAGE_KEY);

  const q = normalizeText(waiterSearch.value);
  const statusF = waiterStatusFilter.value;
  const dateF = waiterDateFilter.value;

  const filtered = waiters.filter((w) => {
    if (q && !normalizeText(`${w.name} ${w.shift} ${w.phone}`).includes(q)) return false;
    if (statusF === "active" && !w.isActive) return false;
    if (statusF === "inactive" && w.isActive) return false;
    return true;
  });

  renderKpis(filtered, dateF);

  waitersList.innerHTML = "";

  if (filtered.length === 0) {
    waitersList.innerHTML = "<p>Nuk ka kamarier per kete filter.</p>";
    return;
  }

  filtered.forEach((w) => {
    const stats = waiterStats(w, dateF);
    const row = document.createElement("div");
    row.className = "waiter-card";
    row.innerHTML = `
      <div class="waiter-top">
        <div>
          <strong>${w.name}</strong>
          <small>${w.shift} | ${w.phone || "No phone"}</small>
        </div>
        <span class="table-badge ${w.isActive ? "table-badge-free" : "table-badge-cleaning"}">${w.isActive ? "Active" : "Inactive"}</span>
      </div>

      <div class="waiter-stats">
        <span>Orders: <strong>${stats.ordersCount}</strong></span>
        <span>Active orders: <strong>${stats.activeOrders}</strong></span>
        <span>Payments: <strong>${stats.paymentsCount}</strong></span>
        <span>Revenue: <strong>${toMoney(stats.revenue)}</strong></span>
        <span>Reservations: <strong>${stats.reservationsCount}</strong></span>
      </div>

      <div class="waiter-actions">
        <button class="btn-ghost" data-edit="${w.id}" type="button">Edit</button>
        <button class="btn-ghost" data-toggle="${w.id}" type="button">${w.isActive ? "Deactivate" : "Activate"}</button>
        <button class="btn-ghost" data-del="${w.id}" type="button">Delete</button>
      </div>
    `;

    row.querySelector("[data-edit]").addEventListener("click", () => startEdit(w.id));
    row.querySelector("[data-toggle]").addEventListener("click", () => toggleActive(w.id));
    row.querySelector("[data-del]").addEventListener("click", () => removeWaiter(w.id));

    waitersList.appendChild(row);
  });
}

waiterForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = waiterName.value.trim();
  if (!name) {
    showToast("Emri eshte i detyrueshem");
    return;
  }

  const payload = {
    name,
    shift: waiterShift.value,
    phone: waiterPhone.value.trim(),
    isActive: waiterActive.checked
  };

  if (editingId) {
    waiters = waiters.map((w) => (w.id === editingId ? { ...w, ...payload } : w));
    showToast("Kamarieri u perditesua");
  } else {
    waiters.push({
      id: `w-${Date.now()}`,
      createdAt: Date.now(),
      ...payload
    });
    showToast("Kamarieri u regjistrua");
  }

  saveWaiters();
  resetForm();
  render();
});

waiterCancelBtn.addEventListener("click", resetForm);
waiterSearch.addEventListener("input", render);
waiterDateFilter.addEventListener("change", render);
waiterStatusFilter.addEventListener("change", render);

window.addEventListener("storage", (e) => {
  if (e.key === WAITER_STORAGE_KEY) waiters = loadWaiters();
  if (e.key === ORDER_STORAGE_KEY) orders = loadList(ORDER_STORAGE_KEY);
  if (e.key === PAYMENT_STORAGE_KEY) payments = loadList(PAYMENT_STORAGE_KEY);
  if (e.key === RESERVATION_STORAGE_KEY) reservations = loadList(RESERVATION_STORAGE_KEY);
  render();
});

render();
