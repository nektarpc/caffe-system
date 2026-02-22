const MENU_STORAGE_KEY = "menuProducts";

const DEFAULT_PRODUCTS = [
  { id: "espresso", name: "Espresso", price: 1.2, hot: true, category: "Kafe" },
  { id: "macchiato", name: "Macchiato", price: 1.5, hot: true, category: "Kafe" },
  { id: "cappuccino", name: "Cappuccino", price: 2.0, hot: true, category: "Kafe" },
  { id: "latte", name: "Latte", price: 2.2, hot: true, category: "Kafe" },
  { id: "americano", name: "Americano", price: 1.8, hot: true, category: "Kafe" },
  { id: "croissant", name: "Croissant", price: 1.3, hot: false, category: "Bakery" },
  { id: "cheesecake", name: "Cheesecake", price: 2.8, hot: false, category: "Dessert" }
];

const menuForm = document.getElementById("menuForm");
const menuFormTitle = document.getElementById("menuFormTitle");
const productName = document.getElementById("productName");
const productCategory = document.getElementById("productCategory");
const productPrice = document.getElementById("productPrice");
const productHot = document.getElementById("productHot");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const menuList = document.getElementById("menuList");
const menuSearch = document.getElementById("menuSearch");
const menuToast = document.getElementById("menuToast");

let editingId = null;
let products = loadProducts();

function showToast(message) {
  menuToast.textContent = message;
  menuToast.classList.remove("hidden");
  setTimeout(() => menuToast.classList.add("hidden"), 1800);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function loadProducts() {
  const raw = localStorage.getItem(MENU_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid format");
    return parsed
      .map((p) => ({
        id: p.id || slugify(p.name || "produkt"),
        name: String(p.name || "Produkt"),
        price: Number(p.price || 0),
        hot: Boolean(p.hot),
        category: String(p.category || "General")
      }))
      .filter((p) => p.name.trim() !== "");
  } catch {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
}

function saveProducts() {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(products));
}

function clearForm() {
  editingId = null;
  menuFormTitle.textContent = "Produkt i ri";
  productName.value = "";
  productCategory.value = "";
  productPrice.value = "";
  productHot.checked = true;
}

function startEdit(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  editingId = id;
  menuFormTitle.textContent = `Edit: ${product.name}`;
  productName.value = product.name;
  productCategory.value = product.category || "";
  productPrice.value = Number(product.price).toFixed(2);
  productHot.checked = Boolean(product.hot);
}

function deleteProduct(id) {
  products = products.filter((p) => p.id !== id);
  saveProducts();
  renderProducts();
  showToast("Produkti u fshi");

  if (editingId === id) {
    clearForm();
  }
}

function renderProducts() {
  const q = menuSearch.value.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const haystack = `${p.name} ${p.category}`.toLowerCase();
    return haystack.includes(q);
  });

  menuList.innerHTML = "";

  if (filtered.length === 0) {
    menuList.innerHTML = "<p>Nuk ka produkte per kete kerkim.</p>";
    return;
  }

  filtered.forEach((p) => {
    const row = document.createElement("div");
    row.className = "menu-item";
    row.innerHTML = `
      <div class="menu-item-main">
        <strong>${p.name}</strong>
        <span>${p.category || "General"}</span>
      </div>
      <div class="menu-item-price">${Number(p.price).toFixed(2)} EUR</div>
      <div class="menu-item-flags">${p.hot ? "Quick" : "Standard"}</div>
      <div class="menu-item-actions">
        <button class="btn-ghost" data-edit="${p.id}">Edit</button>
        <button class="btn-ghost" data-del="${p.id}">Fshi</button>
      </div>
    `;

    row.querySelector("[data-edit]").addEventListener("click", () => startEdit(p.id));
    row.querySelector("[data-del]").addEventListener("click", () => deleteProduct(p.id));
    menuList.appendChild(row);
  });
}

menuForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = productName.value.trim();
  const category = productCategory.value.trim() || "General";
  const price = Number(productPrice.value);
  const hot = productHot.checked;

  if (!name || Number.isNaN(price) || price < 0) {
    showToast("Vendos te dhena valide");
    return;
  }

  if (editingId) {
    products = products.map((p) =>
      p.id === editingId ? { ...p, name, category, price, hot } : p
    );
    showToast("Produkti u perditesua");
  } else {
    const baseId = slugify(name) || "produkt";
    const uniqueId = `${baseId}-${Date.now()}`;

    products.push({
      id: uniqueId,
      name,
      category,
      price,
      hot
    });
    showToast("Produkti u shtua");
  }

  saveProducts();
  renderProducts();
  clearForm();
});

cancelEditBtn.addEventListener("click", clearForm);
menuSearch.addEventListener("input", renderProducts);

renderProducts();
