const ORDER_STORAGE_KEY = "orders";
const PAYMENT_STORAGE_KEY = "payments";

const paymentSearch = document.getElementById("paymentSearch");
const paymentMethodFilter = document.getElementById("paymentMethodFilter");
const paymentDateFilter = document.getElementById("paymentDateFilter");

const outstandingList = document.getElementById("outstandingList");
const paymentOrderSelect = document.getElementById("paymentOrderSelect");
const paymentMethod = document.getElementById("paymentMethod");
const paymentAmount = document.getElementById("paymentAmount");
const paymentNote = document.getElementById("paymentNote");
const paymentDue = document.getElementById("paymentDue");
const paymentForm = document.getElementById("paymentForm");
const resetPaymentBtn = document.getElementById("resetPaymentBtn");
const methodBreakdown = document.getElementById("methodBreakdown");
const paymentHistory = document.getElementById("paymentHistory");
const paymentToast = document.getElementById("paymentToast");

const kpiToday = document.getElementById("kpiToday");
const kpiTotal = document.getElementById("kpiTotal");
const kpiOutstanding = document.getElementById("kpiOutstanding");
const kpiCount = document.getElementById("kpiCount");

let orders = loadOrders();
let payments = loadPayments();

reconcileOrderPaymentState();

function loadOrders() {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((o) => ({
      ...o,
      id: o.id,
      orderCode: o.orderCode || "N/A",
      table: String(o.table || "-"),
      waiterId: String(o.waiterId || ""),
      waiterName: String(o.waiterName || o.waiter || "-"),
      waiter: String(o.waiter || o.waiterName || "-"),
      total: Number(o.total || 0),
      payment: String(o.payment || "unpaid"),
      paidAmount: Number(o.paidAmount || 0),
      createdAt: Number(o.createdAt || Date.now())
    }));
  } catch {
    return [];
  }
}

function loadPayments() {
  const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((p) => ({
      id: p.id,
      paymentCode: String(p.paymentCode || `PAY-${Date.now()}`),
      orderId: p.orderId,
      orderCode: String(p.orderCode || "N/A"),
      table: String(p.table || "-"),
      waiterId: String(p.waiterId || ""),
      waiterName: String(p.waiterName || p.waiter || "-"),
      waiter: String(p.waiter || "-"),
      method: String(p.method || "cash"),
      amount: Number(p.amount || 0),
      note: String(p.note || ""),
      status: String(p.status || "paid"),
      createdAt: Number(p.createdAt || Date.now())
    }));
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function savePayments() {
  localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
}

function reconcileOrderPaymentState() {
  let changed = false;

  orders = orders.map((o) => {
    const total = Number(o.total || 0);
    const paid = Number(o.paidAmount || 0);
    const due = Math.max(0, total - paid);

    if (due <= 0.01 && o.status === "active") {
      changed = true;
      return {
        ...o,
        paidAmount: total,
        status: "completed",
        statusDetail: o.statusDetail === "delivered" ? o.statusDetail : "delivered"
      };
    }

    return o;
  });

  if (changed) {
    saveOrders();
  }
}

function showToast(message) {
  paymentToast.textContent = message;
  paymentToast.classList.remove("hidden");
  setTimeout(() => paymentToast.classList.add("hidden"), 1800);
}

function isSameDay(ts, base) {
  const a = new Date(ts);
  const b = new Date(base);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inDateRange(ts, filter) {
  const now = new Date();
  const d = new Date(ts);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startLast7 = new Date(startToday);
  startLast7.setDate(startLast7.getDate() - 6);

  if (filter === "today") return d >= startToday;
  if (filter === "last7") return d >= startLast7;
  return true;
}

function getOutstandingOrders() {
  return orders
    .map((o) => {
      const due = Math.max(0, Number(o.total) - Number(o.paidAmount || 0));
      return { ...o, due };
    })
    .filter((o) => o.due > 0.01);
}

function formatMoney(value) {
  return `${Number(value).toFixed(2)} EUR`;
}

function fillOrderSelect() {
  const outstanding = getOutstandingOrders();
  paymentOrderSelect.innerHTML = "";

  if (outstanding.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No outstanding orders";
    paymentOrderSelect.appendChild(opt);
    paymentAmount.value = "";
    paymentDue.textContent = "Due: 0.00 EUR";
    return;
  }

  outstanding.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = String(o.id);
    opt.textContent = `#${o.orderCode} | Tavolina ${o.table} | Due ${formatMoney(o.due)}`;
    paymentOrderSelect.appendChild(opt);
  });

  syncDueFromSelection();
}

function syncDueFromSelection() {
  const id = paymentOrderSelect.value;
  const order = getOutstandingOrders().find((o) => String(o.id) === String(id));

  if (!order) {
    paymentDue.textContent = "Due: 0.00 EUR";
    paymentAmount.value = "";
    return;
  }

  paymentDue.textContent = `Due: ${formatMoney(order.due)}`;
  paymentAmount.value = Number(order.due).toFixed(2);
}

function renderOutstanding() {
  const outstanding = getOutstandingOrders();
  outstandingList.innerHTML = "";

  if (outstanding.length === 0) {
    outstandingList.innerHTML = "<p>Te gjitha porosite jane paguar.</p>";
    return;
  }

  outstanding.forEach((o) => {
    const row = document.createElement("div");
    row.className = "payment-order-row";
    row.innerHTML = `
      <div>
        <strong>Order #${o.orderCode}</strong>
        <small>Tavolina ${o.table} | Kamarier: ${o.waiterName}</small>
      </div>
      <div class="payment-order-amount">${formatMoney(o.due)}</div>
      <button class="btn-ghost" type="button" data-id="${o.id}">Pay</button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      paymentOrderSelect.value = String(o.id);
      syncDueFromSelection();
      paymentAmount.focus();
    });

    outstandingList.appendChild(row);
  });
}

function renderKpis() {
  const now = Date.now();
  const outstanding = getOutstandingOrders().reduce((sum, o) => sum + o.due, 0);
  const revenueTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const revenueToday = payments
    .filter((p) => isSameDay(p.createdAt, now))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  kpiToday.textContent = formatMoney(revenueToday);
  kpiTotal.textContent = formatMoney(revenueTotal);
  kpiOutstanding.textContent = formatMoney(outstanding);
  kpiCount.textContent = String(payments.length);
}

function renderMethodBreakdown() {
  const totals = {
    cash: 0,
    card: 0,
    bank: 0
  };

  payments.forEach((p) => {
    const method = p.method in totals ? p.method : "cash";
    totals[method] += Number(p.amount);
  });

  const max = Math.max(1, totals.cash, totals.card, totals.bank);

  methodBreakdown.innerHTML = ["cash", "card", "bank"]
    .map((m) => {
      const pct = (totals[m] / max) * 100;
      return `
        <div class="method-row">
          <span>${m.toUpperCase()}</span>
          <div class="method-bar"><i style="width:${pct.toFixed(2)}%"></i></div>
          <strong>${formatMoney(totals[m])}</strong>
        </div>
      `;
    })
    .join("");
}

function renderHistory() {
  const q = paymentSearch.value.trim().toLowerCase();
  const methodF = paymentMethodFilter.value;
  const dateF = paymentDateFilter.value;

  const filtered = payments.filter((p) => {
    const hay = `${p.paymentCode} ${p.orderCode} ${p.waiterName || p.waiter}`.toLowerCase();
    if (q && !hay.includes(q.replace("#", ""))) return false;
    if (methodF !== "all" && p.method !== methodF) return false;
    if (!inDateRange(p.createdAt, dateF)) return false;
    return true;
  });

  paymentHistory.innerHTML = "";

  if (filtered.length === 0) {
    paymentHistory.innerHTML = "<p>Nuk ka transaksione per kete filter.</p>";
    return;
  }

  filtered
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((p) => {
      const row = document.createElement("div");
      row.className = "payment-history-row";
      row.innerHTML = `
        <div>
          <strong>#${p.paymentCode}</strong>
          <small>Order #${p.orderCode} | Tavolina ${p.table} | Kamarier: ${p.waiterName || p.waiter}</small>
        </div>
        <div>${p.method.toUpperCase()}</div>
        <div>${formatMoney(p.amount)}</div>
        <div>${new Date(p.createdAt).toLocaleString()}</div>
      `;
      paymentHistory.appendChild(row);
    });
}

function registerPayment(event) {
  event.preventDefault();

  const orderId = paymentOrderSelect.value;
  const method = paymentMethod.value;
  const amount = Number(paymentAmount.value);
  const note = paymentNote.value.trim();

  const orderIndex = orders.findIndex((o) => String(o.id) === String(orderId));
  if (orderIndex < 0) {
    showToast("Zgjidh nje porosi valide");
    return;
  }

  if (Number.isNaN(amount) || amount <= 0) {
    showToast("Amount duhet te jete > 0");
    return;
  }

  const order = orders[orderIndex];
  const dueBefore = Math.max(0, Number(order.total) - Number(order.paidAmount || 0));
  if (amount > dueBefore + 0.001) {
    showToast("Amount eshte me i madh se due");
    return;
  }

  const paymentCode = `PAY-${Date.now().toString().slice(-6)}`;
  const nextPaid = Number(order.paidAmount || 0) + amount;
  const fullyPaid = nextPaid + 0.01 >= Number(order.total);
  const finalPaidAmount = fullyPaid ? Number(order.total) : nextPaid;

  const tx = {
    id: Date.now(),
    paymentCode,
    orderId: order.id,
    orderCode: order.orderCode,
    table: order.table,
    waiter: order.waiter,
    waiterId: order.waiterId || "",
    waiterName: order.waiterName || order.waiter || "-",
    method,
    amount,
    note,
    status: fullyPaid ? "paid" : "partial",
    createdAt: Date.now()
  };

  payments.push(tx);

  orders[orderIndex] = {
    ...order,
    paidAmount: finalPaidAmount,
    payment: fullyPaid ? method : "partial",
    status: fullyPaid ? "completed" : (order.status || "active"),
    statusDetail: fullyPaid ? "delivered" : (order.statusDetail || "pending")
  };

  savePayments();
  saveOrders();

  paymentNote.value = "";
  showToast(`Payment saved: ${paymentCode}`);
  refreshAll();
}

function refreshAll() {
  fillOrderSelect();
  renderOutstanding();
  renderKpis();
  renderMethodBreakdown();
  renderHistory();
}

paymentOrderSelect.addEventListener("change", syncDueFromSelection);
paymentForm.addEventListener("submit", registerPayment);
resetPaymentBtn.addEventListener("click", () => {
  paymentMethod.value = "cash";
  paymentNote.value = "";
  syncDueFromSelection();
});

paymentSearch.addEventListener("input", renderHistory);
paymentMethodFilter.addEventListener("change", renderHistory);
paymentDateFilter.addEventListener("change", renderHistory);

window.addEventListener("storage", (e) => {
  if (e.key === ORDER_STORAGE_KEY) {
    orders = loadOrders();
    refreshAll();
  }
  if (e.key === PAYMENT_STORAGE_KEY) {
    payments = loadPayments();
    refreshAll();
  }
});

refreshAll();
