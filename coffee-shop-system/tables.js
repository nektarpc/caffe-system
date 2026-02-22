const ORDER_STORAGE_KEY = "orders";
const PAYMENT_STORAGE_KEY = "payments";
const TABLE_STORAGE_KEY = "tableStates";
const PREFILL_TABLE_KEY = "prefillTable";
const WAITER_STORAGE_KEY = "waiters";
const RESERVATION_STORAGE_KEY = "reservations";

const DEFAULT_TABLES = [
  { id: "1", area: "Main", capacity: 2 },
  { id: "2", area: "Main", capacity: 2 },
  { id: "3", area: "Main", capacity: 4 },
  { id: "4", area: "Main", capacity: 4 },
  { id: "5", area: "Main", capacity: 6 },
  { id: "6", area: "Main", capacity: 6 },
  { id: "7", area: "Window", capacity: 2 },
  { id: "8", area: "Window", capacity: 2 },
  { id: "9", area: "Window", capacity: 4 },
  { id: "10", area: "Patio", capacity: 4 },
  { id: "11", area: "Patio", capacity: 6 },
  { id: "12", area: "VIP", capacity: 8 }
];

const tableSearch = document.getElementById("tableSearch");
const tableStatusFilter = document.getElementById("tableStatusFilter");
const refreshTablesBtn = document.getElementById("refreshTablesBtn");
const tablesGrid = document.getElementById("tablesGrid");
const tablesToast = document.getElementById("tablesToast");

const kpiTablesTotal = document.getElementById("kpiTablesTotal");
const kpiTablesOccupied = document.getElementById("kpiTablesOccupied");
const kpiTablesReserved = document.getElementById("kpiTablesReserved");
const kpiTablesFree = document.getElementById("kpiTablesFree");
const kpiTablesCleaning = document.getElementById("kpiTablesCleaning");
const kpiTablesUtil = document.getElementById("kpiTablesUtil");

const detailEmpty = document.getElementById("detailEmpty");
const detailContent = document.getElementById("detailContent");
const detailTitle = document.getElementById("detailTitle");
const detailStatusBadge = document.getElementById("detailStatusBadge");
const detailMeta = document.getElementById("detailMeta");
const detailWaiterSelect = document.getElementById("detailWaiterSelect");
const detailReserveBtn = document.getElementById("detailReserveBtn");
const detailCleanBtn = document.getElementById("detailCleanBtn");
const detailResetBtn = document.getElementById("detailResetBtn");
const detailCreateOrderBtn = document.getElementById("detailCreateOrderBtn");
const detailActiveOrders = document.getElementById("detailActiveOrders");
const detailPayments = document.getElementById("detailPayments");

let tableStates = loadTableStates();
let orders = loadOrders();
let payments = loadPayments();
let waiters = loadWaiters();
let reservations = loadReservations();
let selectedTableId = null;

function showToast(message) {
  tablesToast.textContent = message;
  tablesToast.classList.remove("hidden");
  setTimeout(() => tablesToast.classList.add("hidden"), 1600);
}

function loadOrders() {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadPayments() {
  const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
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
        isActive: w.isActive !== false
      }))
      .filter((w) => w.id && w.name);
  } catch {
    return [];
  }
}

function loadReservations() {
  const raw = localStorage.getItem(RESERVATION_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReservations() {
  localStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(reservations));
}

function buildDefaultState() {
  const state = {};
  DEFAULT_TABLES.forEach((t) => {
    state[t.id] = {
      reserved: false,
      reservedById: "",
      reservedByName: "",
      cleaning: false,
      area: t.area,
      capacity: t.capacity,
      updatedAt: Date.now()
    };
  });
  return state;
}

function loadTableStates() {
  const raw = localStorage.getItem(TABLE_STORAGE_KEY);
  const defaults = buildDefaultState();
  if (!raw) {
    localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    const merged = { ...defaults };
    Object.keys(merged).forEach((id) => {
      if (!parsed[id]) return;
      merged[id] = {
        ...merged[id],
        reserved: Boolean(parsed[id].reserved),
        reservedById: String(parsed[id].reservedById || ""),
        reservedByName: String(parsed[id].reservedByName || ""),
        cleaning: Boolean(parsed[id].cleaning),
        area: String(parsed[id].area || merged[id].area),
        capacity: Number(parsed[id].capacity || merged[id].capacity),
        updatedAt: Number(parsed[id].updatedAt || Date.now())
      };
    });
    localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
}

function saveTableStates() {
  localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(tableStates));
}

function orderDue(order) {
  const paid = Number(order.paidAmount || 0);
  return Math.max(0, Number(order.total || 0) - paid);
}

function tableInfo(tableId) {
  const state = tableStates[tableId] || {
    reserved: false,
    reservedById: "",
    reservedByName: "",
    cleaning: false,
    area: "Main",
    capacity: 4
  };

  const activeOrders = orders.filter((o) => {
    if (String(o.table) !== String(tableId)) return false;
    if (o.status !== "active") return false;
    return orderDue(o) > 0.01;
  });

  const due = activeOrders.reduce((sum, o) => sum + orderDue(o), 0);

  let status = "free";
  if (activeOrders.length > 0) status = "occupied";
  else if (state.reserved) status = "reserved";
  else if (state.cleaning) status = "cleaning";

  return {
    id: tableId,
    area: state.area,
    capacity: state.capacity,
    reserved: state.reserved,
    reservedById: state.reservedById,
    reservedByName: state.reservedByName,
    cleaning: state.cleaning,
    activeOrders,
    due,
    status
  };
}

function statusLabel(status) {
  if (status === "occupied") return "Occupied";
  if (status === "reserved") return "Reserved";
  if (status === "cleaning") return "Cleaning";
  return "Free";
}

function fillReservationWaiterSelect(selectedId = "") {
  if (!detailWaiterSelect) return;

  detailWaiterSelect.innerHTML = "";
  const activeWaiters = waiters.filter((w) => w.isActive);

  if (activeWaiters.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Regjistro kamarieret te kamariaret.html";
    detailWaiterSelect.appendChild(opt);
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Zgjidh kamarierin";
  detailWaiterSelect.appendChild(placeholder);

  activeWaiters.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    detailWaiterSelect.appendChild(opt);
  });

  detailWaiterSelect.value = selectedId && activeWaiters.some((w) => w.id === selectedId) ? selectedId : "";
}

function renderKpis() {
  const infos = DEFAULT_TABLES.map((t) => tableInfo(t.id));
  const total = infos.length;
  const occupied = infos.filter((t) => t.status === "occupied").length;
  const reserved = infos.filter((t) => t.status === "reserved").length;
  const cleaning = infos.filter((t) => t.status === "cleaning").length;
  const free = infos.filter((t) => t.status === "free").length;

  kpiTablesTotal.textContent = String(total);
  kpiTablesOccupied.textContent = String(occupied);
  kpiTablesReserved.textContent = String(reserved);
  kpiTablesCleaning.textContent = String(cleaning);
  kpiTablesFree.textContent = String(free);
  kpiTablesUtil.textContent = `${Math.round((occupied / Math.max(1, total)) * 100)}%`;
}

function renderGrid() {
  const q = tableSearch.value.trim().toLowerCase();
  const statusFilter = tableStatusFilter.value;

  tablesGrid.innerHTML = "";

  DEFAULT_TABLES.map((t) => tableInfo(t.id))
    .filter((t) => {
      const hay = `table ${t.id} ${t.area}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    })
    .forEach((t) => {
      const card = document.createElement("div");
      card.className = `table-card table-${t.status}`;
      card.innerHTML = `
        <div class="table-top">
          <strong>Table ${t.id}</strong>
          <span class="table-badge table-badge-${t.status}">${statusLabel(t.status)}</span>
        </div>
        <div class="table-meta">Zone: ${t.area} | Seats: ${t.capacity}</div>
        <div class="table-stats">
          <span>Active: ${t.activeOrders.length}</span>
          <span>Due: ${Number(t.due).toFixed(2)} EUR</span>
        </div>
        <div class="table-actions">
          <button class="btn-ghost" type="button" data-action="select" data-id="${t.id}">Details</button>
          <button class="btn-ghost" type="button" data-action="reserve" data-id="${t.id}">${t.reserved ? "Unreserve" : "Reserve"}</button>
          <button class="btn-primary" type="button" data-action="order" data-id="${t.id}">Create Order</button>
        </div>
      `;

      card.querySelector('[data-action="select"]').addEventListener("click", () => selectTable(t.id));
      card.querySelector('[data-action="reserve"]').addEventListener("click", () => toggleReserve(t.id));
      card.querySelector('[data-action="order"]').addEventListener("click", () => createOrderForTable(t.id));

      tablesGrid.appendChild(card);
    });

  if (!tablesGrid.children.length) {
    tablesGrid.innerHTML = "<p>Nuk ka tavolina per kete filter.</p>";
  }
}

function renderDetail() {
  if (!selectedTableId) {
    detailEmpty.classList.remove("hidden");
    detailContent.classList.add("hidden");
    return;
  }

  const info = tableInfo(selectedTableId);
  detailEmpty.classList.add("hidden");
  detailContent.classList.remove("hidden");

  detailTitle.textContent = `Table ${info.id}`;
  detailStatusBadge.textContent = statusLabel(info.status);
  detailStatusBadge.className = `table-badge table-badge-${info.status}`;

  const reservedText = info.reservedByName ? ` | Reserved by: ${info.reservedByName}` : "";
  detailMeta.textContent = `Zone: ${info.area} | Seats: ${info.capacity} | Due: ${Number(info.due).toFixed(2)} EUR${reservedText}`;

  fillReservationWaiterSelect(info.reservedById || "");

  detailReserveBtn.textContent = info.reserved ? "Unreserve" : "Reserve";
  detailCleanBtn.textContent = info.cleaning ? "Set Clean" : "Mark Cleaning";

  detailActiveOrders.innerHTML = "";
  if (info.activeOrders.length === 0) {
    detailActiveOrders.innerHTML = "<p>No active orders for this table.</p>";
  } else {
    info.activeOrders.forEach((o) => {
      const item = document.createElement("div");
      const due = orderDue(o);
      item.className = "detail-item";
      item.innerHTML = `
        <strong>#${o.orderCode || "N/A"}</strong>
        <span>${Number(o.total || 0).toFixed(2)} EUR | Due ${due.toFixed(2)} EUR</span>
      `;
      detailActiveOrders.appendChild(item);
    });
  }

  const tablePayments = payments
    .filter((p) => String(p.table) === String(info.id))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 6);

  detailPayments.innerHTML = "";
  if (tablePayments.length === 0) {
    detailPayments.innerHTML = "<p>No payments yet for this table.</p>";
  } else {
    tablePayments.forEach((p) => {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.innerHTML = `
        <strong>#${p.paymentCode || "PAY"}</strong>
        <span>${String(p.method || "cash").toUpperCase()} | ${Number(p.amount || 0).toFixed(2)} EUR</span>
      `;
      detailPayments.appendChild(item);
    });
  }
}

function selectTable(tableId) {
  selectedTableId = String(tableId);
  renderDetail();
}

function closeActiveReservation(tableId) {
  const targetId = String(tableId);
  const idx = [...reservations].reverse().findIndex((r) => String(r.tableId) === targetId && r.status === "active");
  if (idx < 0) return;

  const realIndex = reservations.length - 1 - idx;
  reservations[realIndex] = {
    ...reservations[realIndex],
    status: "released",
    endedAt: Date.now()
  };
  saveReservations();
}

function toggleReserve(tableId) {
  const id = String(tableId);
  const info = tableInfo(id);

  if (info.status === "occupied") {
    showToast("Table is occupied. Complete order first.");
    return;
  }

  if (!tableStates[id].reserved) {
    const waiterId = String(detailWaiterSelect?.value || "");
    const waiter = waiters.find((w) => w.id === waiterId && w.isActive);
    if (!waiter) {
      showToast("Zgjidh kamarierin per rezervim");
      return;
    }

    tableStates[id].reserved = true;
    tableStates[id].reservedById = waiter.id;
    tableStates[id].reservedByName = waiter.name;
    tableStates[id].cleaning = false;
    reservations.push({
      id: `res-${Date.now()}`,
      tableId: id,
      waiterId: waiter.id,
      waiterName: waiter.name,
      status: "active",
      startedAt: Date.now(),
      endedAt: null
    });
    saveReservations();
  } else {
    tableStates[id].reserved = false;
    tableStates[id].reservedById = "";
    tableStates[id].reservedByName = "";
    closeActiveReservation(id);
  }

  tableStates[id].updatedAt = Date.now();
  saveTableStates();
  renderAll();
}

function toggleCleaning(tableId) {
  const id = String(tableId);
  const info = tableInfo(id);

  if (info.status === "occupied") {
    showToast("Cannot mark cleaning while occupied.");
    return;
  }

  tableStates[id].cleaning = !tableStates[id].cleaning;
  if (tableStates[id].cleaning) {
    tableStates[id].reserved = false;
    tableStates[id].reservedById = "";
    tableStates[id].reservedByName = "";
    closeActiveReservation(id);
  }
  tableStates[id].updatedAt = Date.now();
  saveTableStates();
  renderAll();
}

function resetTable(tableId) {
  const id = String(tableId);
  const info = tableInfo(id);

  if (info.activeOrders.length > 0) {
    showToast("Table has active orders.");
    return;
  }

  tableStates[id].reserved = false;
  tableStates[id].reservedById = "";
  tableStates[id].reservedByName = "";
  tableStates[id].cleaning = false;
  tableStates[id].updatedAt = Date.now();
  closeActiveReservation(id);
  saveTableStates();
  renderAll();
}

function createOrderForTable(tableId) {
  const id = String(tableId);
  if (tableStates[id]) {
    tableStates[id].reserved = false;
    tableStates[id].reservedById = "";
    tableStates[id].reservedByName = "";
    tableStates[id].updatedAt = Date.now();
    saveTableStates();
    closeActiveReservation(id);
  }

  localStorage.setItem(PREFILL_TABLE_KEY, id);
  window.location.href = "orders.html";
}

function reloadData() {
  orders = loadOrders();
  payments = loadPayments();
  waiters = loadWaiters();
  reservations = loadReservations();
}

function renderAll() {
  renderKpis();
  renderGrid();
  renderDetail();
}

detailReserveBtn.addEventListener("click", () => {
  if (!selectedTableId) return;
  toggleReserve(selectedTableId);
});

detailCleanBtn.addEventListener("click", () => {
  if (!selectedTableId) return;
  toggleCleaning(selectedTableId);
});

detailResetBtn.addEventListener("click", () => {
  if (!selectedTableId) return;
  resetTable(selectedTableId);
});

detailCreateOrderBtn.addEventListener("click", () => {
  if (!selectedTableId) return;
  createOrderForTable(selectedTableId);
});

tableSearch.addEventListener("input", renderGrid);
tableStatusFilter.addEventListener("change", renderGrid);
refreshTablesBtn.addEventListener("click", () => {
  reloadData();
  renderAll();
  showToast("Tables refreshed");
});

window.addEventListener("storage", (e) => {
  if (e.key === ORDER_STORAGE_KEY) {
    orders = loadOrders();
    renderAll();
  }
  if (e.key === PAYMENT_STORAGE_KEY) {
    payments = loadPayments();
    renderAll();
  }
  if (e.key === TABLE_STORAGE_KEY) {
    tableStates = loadTableStates();
    renderAll();
  }
  if (e.key === WAITER_STORAGE_KEY) {
    waiters = loadWaiters();
    renderAll();
  }
  if (e.key === RESERVATION_STORAGE_KEY) {
    reservations = loadReservations();
    renderAll();
  }
});

selectTable("1");
renderAll();
