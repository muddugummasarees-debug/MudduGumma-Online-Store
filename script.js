document.getElementById("year").textContent = new Date().getFullYear();

let storeProducts = [];
let cart = JSON.parse(
  localStorage.getItem("muddugummaCart") || "[]"
);


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    storeProducts = await response.json();

    renderProducts();
    updateCartCount();
  } catch (error) {
    console.error("Could not load products:", error);
  }
}


// ==========================================
// SHOW PRODUCTS
// ==========================================

function renderProducts() {
  const grid = document.getElementById("productGrid");

  if (!grid) return;

  if (!storeProducts.length) {
    grid.innerHTML = `
      <div class="empty-products">
        <h3>New collection coming soon</h3>
        <p>Beautiful MudduGumma sarees will be available here soon.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = storeProducts.map(product => {

    const images =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.image
        ? [product.image]
        : [];

    const mainImage = images[0] || "";

    const oldPrice =
      Number(product.oldPrice) > Number(product.price)
        ? `
          <span class="old-price">
            ₹${Number(product.oldPrice).toLocaleString("en-IN")}
          </span>
        `
        : "";

    const stock =
      Number(product.stock) > 0
        ? `<span class="in-stock">In Stock</span>`
        : `<span class="out-stock">Out of Stock</span>`;

    const thumbnails =
      images.length > 1
        ? `
          <div class="product-thumbnails">
            ${images.map(img => `
              <img
                src="${img}"
                alt="${escapeHTML(product.name)}"
                onclick="changeProductImage(this)"
              >
            `).join("")}
          </div>
        `
        : "";

    return `
      <article class="product-card">

        <div class="product-image-wrap">
          ${
            mainImage
              ? `
                <img
                  class="product-image"
                  src="${mainImage}"
                  alt="${escapeHTML(product.name)}"
                >
              `
              : `
                <div class="product-no-image">
                  No image
                </div>
              `
          }
        </div>

        ${thumbnails}

        <div class="product-info">

          <h3>${escapeHTML(product.name)}</h3>

          <div class="product-price">
            <strong>
              ₹${Number(product.price).toLocaleString("en-IN")}
            </strong>

            ${oldPrice}
          </div>

          ${stock}

          ${
            product.colors && product.colors.length
              ? `
                <div class="product-colors">
                  <b>Colors:</b>
                  ${product.colors.map(escapeHTML).join(", ")}
                </div>
              `
              : ""
          }

          ${
            product.description
              ? `
                <p class="product-description">
                  ${escapeHTML(product.description)}
                </p>
              `
              : ""
          }

          ${
            Number(product.stock) > 0
              ? `
                <div class="shop-buttons">

                  <button
                    class="button add-cart-btn"
                    onclick="addToCart('${product.id}')"
                  >
                    Add to Cart
                  </button>

                  <button
                    class="button buy-now-btn"
                    onclick="buyNow('${product.id}')"
                  >
                    Buy Now
                  </button>

                </div>
              `
              : `
                <button
                  class="button sold-btn"
                  disabled
                >
                  Sold Out
                </button>
              `
          }

        </div>

      </article>
    `;

  }).join("");
}


// ==========================================
// CHANGE PRODUCT IMAGE
// ==========================================

function changeProductImage(thumbnail) {
  const card = thumbnail.closest(".product-card");
  const mainImage = card.querySelector(".product-image");

  if (mainImage) {
    mainImage.src = thumbnail.src;
  }
}


// ==========================================
// ADD TO CART
// ==========================================

function addToCart(productId) {
  const product = storeProducts.find(
    product => product.id === productId
  );

  if (!product) return;

  if (Number(product.stock) <= 0) {
    alert("Sorry, this saree is currently out of stock.");
    return;
  }

  const existing = cart.find(
    item => item.id === productId
  );

  if (existing) {
    if (existing.quantity >= Number(product.stock)) {
      alert("You have reached the available stock quantity.");
      return;
    }

    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image:
        Array.isArray(product.images) && product.images.length
          ? product.images[0]
          : product.image || "",
      quantity: 1
    });
  }

  saveCart();
  openCart();
}


// ==========================================
// BUY NOW
// ==========================================

function buyNow(productId) {
  const product = storeProducts.find(
    product => product.id === productId
  );

  if (!product) return;

  if (Number(product.stock) <= 0) {
    alert("Sorry, this saree is currently out of stock.");
    return;
  }

  const existing = cart.find(
    item => item.id === productId
  );

  if (!existing) {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image:
        Array.isArray(product.images) && product.images.length
          ? product.images[0]
          : product.image || "",
      quantity: 1
    });
  }

  saveCart();

  window.location.href = "/checkout.html";
}


// ==========================================
// SAVE CART
// ==========================================

function saveCart() {
  localStorage.setItem(
    "muddugummaCart",
    JSON.stringify(cart)
  );

  updateCartCount();
  renderCart();
}


// ==========================================
// CART COUNTER
// ==========================================

function updateCartCount() {
  const count = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const element = document.getElementById("cartCount");

  if (element) {
    element.textContent = count;
  }
}


// ==========================================
// OPEN CART
// ==========================================

function openCart() {
  renderCart();

  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");

  if (drawer) {
    drawer.classList.add("open");
  }

  if (overlay) {
    overlay.classList.add("show");
  }

  document.body.style.overflow = "hidden";
}


// ==========================================
// CLOSE CART
// ==========================================

function closeCart() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");

  if (drawer) {
    drawer.classList.remove("open");
  }

  if (overlay) {
    overlay.classList.remove("show");
  }

  document.body.style.overflow = "";
}


// ==========================================
// DISPLAY CART
// ==========================================

function renderCart() {
  const container = document.getElementById("cartItems");
  const totalElement = document.getElementById("cartTotal");

  if (!container || !totalElement) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">♡</div>

        <h3>Your cart is empty</h3>

        <p>
          Add your favourite MudduGumma sarees
          to begin shopping.
        </p>
      </div>
    `;

    totalElement.textContent = "₹0";
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">

      ${
        item.image
          ? `
            <img
              src="${item.image}"
              alt="${escapeHTML(item.name)}"
            >
          `
          : ""
      }

      <div class="cart-item-info">

        <strong>
          ${escapeHTML(item.name)}
        </strong>

        <span>
          ₹${Number(item.price).toLocaleString("en-IN")}
        </span>

        <div class="quantity-controls">

          <button
            onclick="changeQuantity('${item.id}', -1)"
          >
            −
          </button>

          <span>
            ${item.quantity}
          </span>

          <button
            onclick="changeQuantity('${item.id}', 1)"
          >
            +
          </button>

        </div>

        <button
          class="remove-item"
          onclick="removeFromCart('${item.id}')"
        >
          Remove
        </button>

      </div>

    </div>
  `).join("");

  const total = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
      Number(item.quantity),
    0
  );

  totalElement.textContent =
    "₹" + total.toLocaleString("en-IN");
}


// ==========================================
// CHANGE QUANTITY
// ==========================================

function changeQuantity(productId, amount) {
  const item = cart.find(
    item => item.id === productId
  );

  if (!item) return;

  const product = storeProducts.find(
    product => product.id === productId
  );

  if (
    amount > 0 &&
    product &&
    item.quantity >= Number(product.stock)
  ) {
    alert(
      "Only " +
      product.stock +
      " piece(s) available."
    );
    return;
  }

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(
      item => item.id !== productId
    );
  }

  saveCart();
}


// ==========================================
// REMOVE PRODUCT
// ==========================================

function removeFromCart(productId) {
  cart = cart.filter(
    item => item.id !== productId
  );

  saveCart();
}


// ==========================================
// GO TO CHECKOUT
// ==========================================

function goToCheckout() {
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  window.location.href = "/checkout.html";
}


// ==========================================
// NOTIFY FORM
// ==========================================

const notifyForm = document.getElementById("notifyForm");

if (notifyForm) {
  notifyForm.addEventListener(
    "submit",
    function(event) {
      event.preventDefault();

      const name =
        document
          .getElementById("name")
          .value
          .trim();

      const message =
        document.getElementById("formMessage");

      message.textContent =
        `Thank you${
          name ? ", " + name : ""
        }! We'll keep you posted about new collections and offers.`;

      this.reset();
    }
  );
}


// ==========================================
// HTML SAFETY
// ==========================================

function escapeHTML(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}


// ==========================================
// START STORE
// ==========================================

loadProducts();
updateCartCount();
renderCart();