// ==========================================
// MUDDUGUMMA STORE
// COMPLETE SCRIPT.JS
// ==========================================


// ==========================================
// YEAR
// ==========================================

const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}


// ==========================================
// STORE DATA
// ==========================================

let storeProducts = [];

let cart = [];

try {
  const savedCart =
    JSON.parse(
      localStorage.getItem("muddugummaCart") || "[]"
    );

  cart = Array.isArray(savedCart)
    ? savedCart
    : [];

} catch (error) {
  console.error("Could not load cart:", error);
  cart = [];
}


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {

  try {

    const response =
      await fetch("/api/products", {
        cache: "no-store"
      });


    if (!response.ok) {
      throw new Error(
        "Could not load products."
      );
    }


    const products =
      await response.json();


    storeProducts =
      Array.isArray(products)
        ? products
        : [];


    renderProducts();
    updateCartCount();
    renderCart();

  } catch (error) {

    console.error(
      "Could not load products:",
      error
    );


    storeProducts = [];


    const grid =
      document.getElementById(
        "productGrid"
      );


    if (grid) {

      grid.innerHTML = `
        <div class="empty-products">

          <h3>
            New collection coming soon
          </h3>

          <p>
            Beautiful MudduGumma sarees
            will be available here soon.
          </p>

        </div>
      `;

    }

  }

}


// ==========================================
// SHOW PRODUCTS
// ==========================================

function renderProducts() {

  const grid =
    document.getElementById(
      "productGrid"
    );


  if (!grid) {
    return;
  }


  if (!storeProducts.length) {

    grid.innerHTML = `
      <div class="empty-products">

        <h3>
          New collection coming soon
        </h3>

        <p>
          Beautiful MudduGumma sarees
          will be available here soon.
        </p>

      </div>
    `;

    return;
  }


  grid.innerHTML =
    storeProducts
      .map(product => {


        const images =
          Array.isArray(product.images) &&
          product.images.length
            ? product.images
            : product.image
            ? [product.image]
            : [];


        const mainImage =
          images[0] || "";


        const productName =
          escapeHTML(
            product.name ||
            "MudduGumma Saree"
          );


        const price =
          Number(
            product.price || 0
          );


        const oldPriceValue =
          Number(
            product.oldPrice || 0
          );


        const oldPrice =
          oldPriceValue > price
            ? `
              <span class="old-price">

                ₹${oldPriceValue
                  .toLocaleString(
                    "en-IN"
                  )}

              </span>
            `
            : "";


        const stock =
          Number(
            product.stock || 0
          );


        const stockLabel =
          stock > 0
            ? `
              <span class="in-stock">
                In Stock
              </span>
            `
            : `
              <span class="out-stock">
                Out of Stock
              </span>
            `;


        const thumbnails =
          images.length > 1
            ? `
              <div class="product-thumbnails">

                ${images
                  .map(img => `

                    <img
                      src="${escapeAttribute(img)}"
                      alt="${productName}"
                      onclick="changeProductImage(this)"
                    >

                  `)
                  .join("")}

              </div>
            `
            : "";


        const colors =
          Array.isArray(product.colors)
            ? product.colors
            : [];


        return `

          <article class="product-card">

            <div class="product-image-wrap">

              ${
                mainImage
                  ? `
                    <img
                      class="product-image"
                      src="${escapeAttribute(mainImage)}"
                      alt="${productName}"
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

              <h3>
                ${productName}
              </h3>


              <div class="product-price">

                <strong>
                  ₹${price.toLocaleString(
                    "en-IN"
                  )}
                </strong>

                ${oldPrice}

              </div>


              ${stockLabel}


              ${
                colors.length
                  ? `
                    <div class="product-colors">

                      <b>
                        Colors:
                      </b>

                      ${colors
                        .map(
                          color =>
                            escapeHTML(
                              color
                            )
                        )
                        .join(", ")}

                    </div>
                  `
                  : ""
              }


              ${
                product.description
                  ? `
                    <p class="product-description">

                      ${escapeHTML(
                        product.description
                      )}

                    </p>
                  `
                  : ""
              }


              ${
                stock > 0
                  ? `
                    <div class="shop-buttons">

                      <button
                        type="button"
                        class="button add-cart-btn"
                        onclick="addToCart('${escapeJS(
                          product.id
                        )}')"
                      >
                        Add to Cart
                      </button>


                      <button
                        type="button"
                        class="button buy-now-btn"
                        onclick="buyNow('${escapeJS(
                          product.id
                        )}')"
                      >
                        Buy Now
                      </button>

                    </div>
                  `
                  : `
                    <button
                      type="button"
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

      })
      .join("");

}


// ==========================================
// CHANGE PRODUCT IMAGE
// ==========================================

function changeProductImage(
  thumbnail
) {

  if (!thumbnail) {
    return;
  }


  const card =
    thumbnail.closest(
      ".product-card"
    );


  if (!card) {
    return;
  }


  const mainImage =
    card.querySelector(
      ".product-image"
    );


  if (mainImage) {
    mainImage.src =
      thumbnail.src;
  }

}


// ==========================================
// ADD TO CART
// ==========================================

function addToCart(productId) {

  const product =
    storeProducts.find(
      product =>
        String(product.id) ===
        String(productId)
    );


  if (!product) {

    alert(
      "This product could not be found."
    );

    return;

  }


  const availableStock =
    Number(
      product.stock || 0
    );


  if (availableStock <= 0) {

    alert(
      "Sorry, this saree is currently out of stock."
    );

    return;

  }


  const existing =
    cart.find(
      item =>
        String(item.id) ===
        String(productId)
    );


  if (existing) {

    if (
      Number(existing.quantity) >=
      availableStock
    ) {

      alert(
        "You have reached the available stock quantity."
      );

      return;

    }


    existing.quantity =
      Number(
        existing.quantity || 0
      ) + 1;

  } else {

    const images =
      Array.isArray(
        product.images
      )
        ? product.images
        : [];


    cart.push({

      id:
        product.id,

      name:
        product.name,

      price:
        Number(
          product.price || 0
        ),

      image:
        images.length
          ? images[0]
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

  const product =
    storeProducts.find(
      product =>
        String(product.id) ===
        String(productId)
    );


  if (!product) {

    alert(
      "This product could not be found."
    );

    return;

  }


  const availableStock =
    Number(
      product.stock || 0
    );


  if (availableStock <= 0) {

    alert(
      "Sorry, this saree is currently out of stock."
    );

    return;

  }


  const existing =
    cart.find(
      item =>
        String(item.id) ===
        String(productId)
    );


  if (!existing) {

    const images =
      Array.isArray(
        product.images
      )
        ? product.images
        : [];


    cart.push({

      id:
        product.id,

      name:
        product.name,

      price:
        Number(
          product.price || 0
        ),

      image:
        images.length
          ? images[0]
          : product.image || "",

      quantity: 1

    });

  }


  saveCart();


  window.location.href =
    "/checkout.html";

}


// ==========================================
// SAVE CART
// ==========================================

function saveCart() {

  try {

    localStorage.setItem(
      "muddugummaCart",
      JSON.stringify(cart)
    );

  } catch (error) {

    console.error(
      "Could not save cart:",
      error
    );

  }


  updateCartCount();
  renderCart();

}


// ==========================================
// CART COUNTER
// ==========================================

function updateCartCount() {

  const count =
    cart.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity || 0
        ),
      0
    );


  const element =
    document.getElementById(
      "cartCount"
    );


  if (element) {
    element.textContent =
      count;
  }

}


// ==========================================
// OPEN CART
// ==========================================

function openCart() {

  renderCart();


  const drawer =
    document.getElementById(
      "cartDrawer"
    );


  const overlay =
    document.getElementById(
      "cartOverlay"
    );


  if (!drawer) {

    console.error(
      "Cart drawer was not found."
    );

    return;

  }


  drawer.classList.add(
    "open"
  );


  /*
    These inline styles are a backup.
    Even if Chrome has cached an older
    CSS file, the drawer should open.
  */

  drawer.style.transform =
    "translateX(0)";

  drawer.style.visibility =
    "visible";


  if (overlay) {

    overlay.classList.add(
      "show"
    );

    overlay.style.opacity =
      "1";

    overlay.style.visibility =
      "visible";

  }


  document.body.style.overflow =
    "hidden";

}


// ==========================================
// CLOSE CART
// ==========================================

function closeCart() {

  const drawer =
    document.getElementById(
      "cartDrawer"
    );


  const overlay =
    document.getElementById(
      "cartOverlay"
    );


  if (drawer) {

    drawer.classList.remove(
      "open"
    );

    drawer.style.transform =
      "";

    drawer.style.visibility =
      "";

  }


  if (overlay) {

    overlay.classList.remove(
      "show"
    );

    overlay.style.opacity =
      "";

    overlay.style.visibility =
      "";

  }


  document.body.style.overflow =
    "";

}


// ==========================================
// DISPLAY CART
// ==========================================

function renderCart() {

  const container =
    document.getElementById(
      "cartItems"
    );


  const totalElement =
    document.getElementById(
      "cartTotal"
    );


  if (
    !container ||
    !totalElement
  ) {

    return;

  }


  if (!cart.length) {

    container.innerHTML = `

      <div class="empty-cart">

        <div class="empty-cart-icon">
          ♡
        </div>

        <h3>
          Your cart is empty
        </h3>

        <p>
          Add your favourite
          MudduGumma sarees
          to begin shopping.
        </p>

      </div>

    `;


    totalElement.textContent =
      "₹0";


    return;

  }


  container.innerHTML =
    cart
      .map(item => {


        const quantity =
          Math.max(
            1,
            Number(
              item.quantity || 1
            )
          );


        return `

          <div class="cart-item">

            ${
              item.image
                ? `
                  <img
                    src="${escapeAttribute(
                      item.image
                    )}"
                    alt="${escapeHTML(
                      item.name
                    )}"
                  >
                `
                : ""
            }


            <div class="cart-item-info">

              <strong>
                ${escapeHTML(
                  item.name
                )}
              </strong>


              <span>
                ₹${Number(
                  item.price || 0
                ).toLocaleString(
                  "en-IN"
                )}
              </span>


              <div class="quantity-controls">

                <button
                  type="button"
                  onclick="changeQuantity(
                    '${escapeJS(
                      item.id
                    )}',
                    -1
                  )"
                >
                  −
                </button>


                <span>
                  ${quantity}
                </span>


                <button
                  type="button"
                  onclick="changeQuantity(
                    '${escapeJS(
                      item.id
                    )}',
                    1
                  )"
                >
                  +
                </button>

              </div>


              <button
                type="button"
                class="remove-item"
                onclick="removeFromCart(
                  '${escapeJS(
                    item.id
                  )}'
                )"
              >
                Remove
              </button>

            </div>

          </div>

        `;

      })
      .join("");


  const total =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.price || 0
        ) *
        Number(
          item.quantity || 0
        ),
      0
    );


  totalElement.textContent =
    "₹" +
    total.toLocaleString(
      "en-IN"
    );

}


// ==========================================
// CHANGE QUANTITY
// ==========================================

function changeQuantity(
  productId,
  amount
) {

  const item =
    cart.find(
      item =>
        String(item.id) ===
        String(productId)
    );


  if (!item) {
    return;
  }


  const product =
    storeProducts.find(
      product =>
        String(product.id) ===
        String(productId)
    );


  if (
    amount > 0 &&
    product &&
    Number(item.quantity) >=
      Number(
        product.stock || 0
      )
  ) {

    alert(
      "Only " +
      Number(
        product.stock || 0
      ) +
      " piece(s) available."
    );

    return;

  }


  item.quantity =
    Number(
      item.quantity || 1
    ) +
    Number(amount);


  if (
    item.quantity <= 0
  ) {

    cart =
      cart.filter(
        item =>
          String(item.id) !==
          String(productId)
      );

  }


  saveCart();

}


// ==========================================
// REMOVE PRODUCT
// ==========================================

function removeFromCart(
  productId
) {

  cart =
    cart.filter(
      item =>
        String(item.id) !==
        String(productId)
    );


  saveCart();

}


// ==========================================
// GO TO CHECKOUT
// ==========================================

function goToCheckout() {

  if (!cart.length) {

    alert(
      "Your cart is empty."
    );

    return;

  }


  saveCart();


  window.location.href =
    "/checkout.html";

}


// ==========================================
// NOTIFY FORM
// ==========================================

const notifyForm =
  document.getElementById(
    "notifyForm"
  );


if (notifyForm) {

  notifyForm.addEventListener(
    "submit",
    function(event) {

      event.preventDefault();


      const nameInput =
        document.getElementById(
          "name"
        );


      const message =
        document.getElementById(
          "formMessage"
        );


      const name =
        nameInput
          ? nameInput.value.trim()
          : "";


      if (message) {

        message.textContent =
          `Thank you${
            name
              ? ", " + name
              : ""
          }! We'll keep you posted about new collections and offers.`;

      }


      this.reset();

    }
  );

}


// ==========================================
// HTML SAFETY
// ==========================================

function escapeHTML(value) {

  return String(
    value || ""
  ).replace(
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


function escapeAttribute(value) {

  return escapeHTML(
    value
  );

}


function escapeJS(value) {

  return String(
    value || ""
  )
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /\r/g,
      "\\r"
    )
    .replace(
      /\n/g,
      "\\n"
    );

}


// ==========================================
// MAKE FUNCTIONS AVAILABLE TO HTML BUTTONS
// ==========================================

window.openCart =
  openCart;

window.closeCart =
  closeCart;

window.addToCart =
  addToCart;

window.buyNow =
  buyNow;

window.changeQuantity =
  changeQuantity;

window.removeFromCart =
  removeFromCart;

window.goToCheckout =
  goToCheckout;

window.changeProductImage =
  changeProductImage;


// ==========================================
// START STORE
// ==========================================

updateCartCount();
renderCart();
loadProducts();
