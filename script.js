// ==========================================
// MUDDUGUMMA STORE - COMPLETE SCRIPT
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
let wishlist = [];
let activeSareeType = "";

try {
  const savedWishlist =
    JSON.parse(
      localStorage.getItem("muddugummaWishlist") || "[]"
    );

  wishlist = Array.isArray(savedWishlist)
    ? savedWishlist.map(String)
    : [];

} catch (error) {
  console.error("Could not load wishlist:", error);
  wishlist = [];
}


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
      throw new Error("Could not load products.");
    }

    const products =
      await response.json();

    storeProducts =
      Array.isArray(products)
        ? products
        : [];

    renderSareeCategories();
    renderProducts();
    updateCartCount();
    renderCart();
    updateWishlistCount();
    renderWishlist();

  } catch (error) {

    console.error(
      "Could not load products:",
      error
    );

    const grid =
      document.getElementById(
        "productGrid"
      );

    if (grid) {
      grid.innerHTML = `
        <div class="empty-products">
          <h3>New collection coming soon</h3>
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
// SHOP BY SAREE TYPE
// ==========================================

const sareeTypeDefinitions = [
  {
    "id": "silk-cotton",
    "label": "Silk Cottons",
    "resultLabel": "Silk Cotton Sarees",
    "subtitle": "Everyday grace",
    "keywords": [
      "silk cotton",
      "cotton silk"
    ]
  },
  {
    "id": "cotton",
    "label": "Cottons",
    "resultLabel": "Cotton Sarees",
    "subtitle": "Light and easy",
    "keywords": [
      "cotton"
    ]
  },
  {
    "id": "work-wear",
    "label": "Work Wear",
    "resultLabel": "Work Wear Sarees",
    "subtitle": "Casual collections",
    "keywords": [
      "work wear",
      "workwear",
      "office wear",
      "office saree",
      "daily wear",
      "casual saree"
    ]
  },
  {
    "id": "linen",
    "label": "Linens",
    "resultLabel": "Linen Sarees",
    "subtitle": "Soft modern drapes",
    "keywords": [
      "linen",
      "lenin"
    ]
  },
  {
    "id": "kanjivaram",
    "label": "Kanjivaram",
    "resultLabel": "Kanjivaram Sarees",
    "subtitle": "Rich traditional beauty",
    "keywords": [
      "kanjivaram",
      "kanjeevaram",
      "kanchipuram"
    ]
  },
  {
    "id": "banarasi",
    "label": "Banarasi",
    "resultLabel": "Banarasi Sarees",
    "subtitle": "Heritage elegance",
    "keywords": [
      "banarasi",
      "banaras"
    ]
  },
  {
    "id": "organza",
    "label": "Organza",
    "resultLabel": "Organza Sarees",
    "subtitle": "Light festive style",
    "keywords": [
      "organza"
    ]
  },
  {
    "id": "chiffon",
    "label": "Chiffon",
    "resultLabel": "Chiffon Sarees",
    "subtitle": "Flowing and graceful",
    "keywords": [
      "chiffon"
    ]
  },
  {
    "id": "georgette",
    "label": "Georgette",
    "resultLabel": "Georgette Sarees",
    "subtitle": "Easy elegant drapes",
    "keywords": [
      "georgette"
    ]
  },
  {
    "id": "handloom",
    "label": "Handlooms",
    "resultLabel": "Handloom Sarees",
    "subtitle": "Crafted with tradition",
    "keywords": [
      "handloom",
      "hand woven",
      "handwoven"
    ]
  },
  {
    "id": "designer",
    "label": "Designer Sarees",
    "resultLabel": "Designer Sarees",
    "subtitle": "Statement collections",
    "keywords": [
      "designer"
    ]
  },
  {
    "id": "silk",
    "label": "Silks",
    "resultLabel": "Silk Sarees",
    "subtitle": "Timeless elegance",
    "keywords": [
      "silk",
      "pattu"
    ]
  }
];

function productSareeSearchText(product) {
  const tags = Array.isArray(product?.tags)
    ? product.tags
    : [];

  return [
    product?.category,
    product?.type,
    product?.fabric,
    product?.name,
    product?.description,
    ...tags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[-_]/g, " ");
}

function getSareeTypeDefinition(product) {
  const searchText =
    productSareeSearchText(product);

  const knownType =
    sareeTypeDefinitions.find(definition =>
      definition.keywords.some(keyword =>
        searchText.includes(keyword)
      )
    );

  if (knownType) {
    return knownType;
  }

  const rawCategory =
    String(product?.category || "").trim();

  if (
    rawCategory &&
    !/^(saree|sarees|women'?s wear|collection)$/i
      .test(rawCategory)
  ) {
    const cleanLabel =
      rawCategory
        .replace(/\bsarees?\b/gi, "")
        .trim();

    const label =
      cleanLabel || "Other Sarees";

    return {
      id: `category-${label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      label,
      resultLabel: `${label} Sarees`,
      subtitle: "Explore the collection",
      keywords: []
    };
  }

  return {
    id: "other-sarees",
    label: "Other Sarees",
    resultLabel: "Other Sarees",
    subtitle: "More beautiful choices",
    keywords: []
  };
}

function getSareeCategories() {
  const categoryMap =
    new Map();

  storeProducts.forEach(product => {
    const definition =
      getSareeTypeDefinition(product);

    if (!categoryMap.has(definition.id)) {
      categoryMap.set(
        definition.id,
        {
          ...definition,
          products: []
        }
      );
    }

    categoryMap
      .get(definition.id)
      .products
      .push(product);
  });

  return Array.from(categoryMap.values());
}

function renderSareeCategories() {
  const container =
    document.getElementById(
      "sareeCategoryGrid"
    );

  const results =
    document.getElementById(
      "sareeResults"
    );

  if (!container) {
    return;
  }

  if (!storeProducts.length) {
    container.innerHTML = `
      <div class="empty-saree-types">
        <h3>New saree types coming soon</h3>
        <p>
          Cotton, silk, linen and more beautiful
          collections will appear here.
        </p>
      </div>
    `;

    if (results) {
      results.hidden = true;
    }

    return;
  }

  const categories =
    getSareeCategories();

  const allCategory = {
    id: "all",
    label: "All Sarees",
    resultLabel: "All Sarees",
    subtitle: "See every collection",
    products: storeProducts
  };

  container.innerHTML = [
    ...categories,
    allCategory
  ]
    .map(category => {
      const previewProduct =
        category.products[0];

      const previewImage =
        productImages(previewProduct)[0] || "";

      const selected =
        activeSareeType === category.id;

      return `
        <article class="saree-category-card${selected ? " selected" : ""}">
          <button
            type="button"
            data-saree-type="${escapeAttribute(category.id)}"
            onclick="selectSareeCategory(this.dataset.sareeType)"
            aria-pressed="${selected ? "true" : "false"}"
          >
            ${
              previewImage
                ? `
                  <img
                    src="${escapeAttribute(previewImage)}"
                    alt="${escapeHTML(category.label)}"
                    loading="lazy"
                  >
                `
                : `
                  <span class="saree-category-placeholder">
                    MudduGumma
                  </span>
                `
            }

            <span class="saree-category-copy">
              <strong>${escapeHTML(category.label)}</strong>
              <small>${escapeHTML(category.subtitle)}</small>
              <span class="saree-category-explore">
                Explore <b aria-hidden="true">→</b>
              </span>
            </span>
          </button>
        </article>
      `;
    })
    .join("");
}

function selectSareeCategory(typeId) {
  const categories =
    getSareeCategories();

  const category =
    typeId === "all"
      ? {
          id: "all",
          resultLabel: "All Sarees",
          subtitle: "Browse every MudduGumma collection."
        }
      : categories.find(item =>
          item.id === typeId
        );

  if (!category) {
    return;
  }

  activeSareeType =
    category.id;

  document
    .querySelectorAll(
      ".saree-category-card"
    )
    .forEach(card => {
      const button =
        card.querySelector(
          "[data-saree-type]"
        );

      const selected =
        button?.dataset.sareeType ===
        activeSareeType;

      card.classList.toggle(
        "selected",
        selected
      );

      button?.setAttribute(
        "aria-pressed",
        selected ? "true" : "false"
      );
    });

  const results =
    document.getElementById(
      "sareeResults"
    );

  const title =
    document.getElementById(
      "sareeResultsTitle"
    );

  const description =
    document.getElementById(
      "sareeResultsDescription"
    );

  if (results) {
    results.hidden = false;
  }

  if (title) {
    title.textContent =
      category.resultLabel;
  }

  if (description) {
    description.textContent =
      category.subtitle;
  }

  renderProducts();

  requestAnimationFrame(() => {
    results?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function showSareeTypes() {
  activeSareeType = "";

  const results =
    document.getElementById(
      "sareeResults"
    );

  if (results) {
    results.hidden = true;
  }

  document
    .querySelectorAll(
      ".saree-category-card"
    )
    .forEach(card => {
      card.classList.remove("selected");
      card
        .querySelector("[data-saree-type]")
        ?.setAttribute(
          "aria-pressed",
          "false"
        );
    });

  document
    .getElementById("sareeCategoryGrid")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}

function productsForActiveSareeType() {
  if (
    !activeSareeType ||
    activeSareeType === "all"
  ) {
    return storeProducts;
  }

  return storeProducts.filter(product =>
    getSareeTypeDefinition(product).id ===
    activeSareeType
  );
}


// ==========================================
// SHOW PRODUCTS
// ==========================================

function renderProducts() {

  const grid =
    document.getElementById("productGrid");

  if (!grid) return;

  const visibleProducts =
    productsForActiveSareeType();


  if (!visibleProducts.length) {

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
    visibleProducts
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


        const price =
          Number(product.price || 0);


        const oldPriceValue =
          Number(product.oldPrice || 0);


        const oldPrice =
          oldPriceValue > price
            ? `
              <span class="old-price">
                ₹${oldPriceValue.toLocaleString("en-IN")}
              </span>
            `
            : "";


        const stock =
          Number(product.stock || 0);


        const wished =
          isWishlisted(product.id);


        const thumbnails =
          images.length > 1
            ? `
              <div class="product-thumbnails">

                ${images.map(img => `
                  <img
                    src="${escapeAttribute(img)}"
                    alt="${escapeHTML(product.name)}"
                    onclick="changeProductImage(this)"
                  >
                `).join("")}

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

              <button
                type="button"
                class="product-wishlist-button${wished ? " active" : ""}"
                data-product-id="${escapeAttribute(product.id)}"
                aria-label="${wished ? "Remove from wishlist" : "Add to wishlist"}"
                aria-pressed="${wished ? "true" : "false"}"
                onclick="event.stopPropagation(); toggleWishlist(this.dataset.productId)"
              >
                <span aria-hidden="true">${wished ? "♥" : "♡"}</span>
              </button>

              ${
                mainImage
                  ? `
                    <img
                      class="product-image product-detail-trigger"
                      data-product-id="${escapeAttribute(product.id)}"
                      role="button"
                      tabindex="0"
                      onclick="openProductDetail(this.dataset.productId)"
                      onkeydown="if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); openProductDetail(this.dataset.productId); }"
                      src="${escapeAttribute(mainImage)}"
                      alt="${escapeHTML(product.name)}"
                    >
                  `
                  : `
                    <div
                      class="product-no-image product-detail-trigger"
                      data-product-id="${escapeAttribute(product.id)}"
                      role="button"
                      tabindex="0"
                      onclick="openProductDetail(this.dataset.productId)"
                      onkeydown="if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); openProductDetail(this.dataset.productId); }"
                    >
                      No image
                    </div>
                  `
              }

            </div>


            ${thumbnails}


            <div class="product-info">

              <h3>
                <button
                  type="button"
                  class="product-title-button"
                  data-product-id="${escapeAttribute(product.id)}"
                  onclick="openProductDetail(this.dataset.productId)"
                >
                  ${escapeHTML(product.name)}
                </button>
              </h3>


              <div class="product-price">

                <strong>
                  ₹${price.toLocaleString("en-IN")}
                </strong>

                ${oldPrice}

              </div>


              ${
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
                  `
              }


              ${
                colors.length
                  ? `
                    <div class="product-colors">
                      <b>Colors:</b>
                      ${colors.map(escapeHTML).join(", ")}
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
                stock > 0
                  ? `
                    <div class="shop-buttons">

                      <button
                        type="button"
                        class="button add-cart-btn"
                        onclick="addToCart('${escapeJS(product.id)}')"
                      >
                        Add to Cart
                      </button>


                      <button
                        type="button"
                        class="button buy-now-btn"
                        onclick="buyNow('${escapeJS(product.id)}')"
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

      })
      .join("");

}


// ==========================================
// WISHLIST AND PRODUCT DETAILS
// ==========================================

function productImages(product) {
  if (
    Array.isArray(product?.images) &&
    product.images.length
  ) {
    return product.images.filter(Boolean);
  }

  return product?.image
    ? [product.image]
    : [];
}


function findStoreProduct(productId) {
  return storeProducts.find(
    product =>
      String(product.id) ===
      String(productId)
  );
}


function isWishlisted(productId) {
  return wishlist.includes(String(productId));
}


function saveWishlist() {
  localStorage.setItem(
    "muddugummaWishlist",
    JSON.stringify(wishlist)
  );

  updateWishlistCount();
  renderProducts();
  renderWishlist();
}


function toggleWishlist(productId) {
  const id = String(productId);
  const product = findStoreProduct(id);

  if (!product) {
    return;
  }

  wishlist = isWishlisted(id)
    ? wishlist.filter(itemId => itemId !== id)
    : [...wishlist, id];

  saveWishlist();
}


function updateWishlistCount() {
  const count =
    document.getElementById("wishlistCount");

  if (count) {
    count.textContent = wishlist.length;
  }
}


function openWishlist() {
  closeCart();
  closeProductDetail();
  renderWishlist();

  const drawer =
    document.getElementById("wishlistDrawer");
  const overlay =
    document.getElementById("wishlistOverlay");

  drawer?.classList.add("open");
  overlay?.classList.add("show");
  drawer?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}


function closeWishlist() {
  const drawer =
    document.getElementById("wishlistDrawer");
  const overlay =
    document.getElementById("wishlistOverlay");

  drawer?.classList.remove("open");
  overlay?.classList.remove("show");
  drawer?.setAttribute("aria-hidden", "true");

  if (!document.getElementById("productDetailModal")
    ?.classList.contains("open")) {
    document.body.style.overflow = "";
  }
}


function renderWishlist() {
  const container =
    document.getElementById("wishlistItems");

  if (!container) {
    return;
  }

  const products = wishlist
    .map(findStoreProduct)
    .filter(Boolean);

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">♡</div>
        <h3>Your wishlist is empty</h3>
        <p>
          Tap the heart on a saree to save it here.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = products
    .map(product => {
      const images = productImages(product);
      const image = images[0] || "";
      const stock = Number(product.stock || 0);
      const productId = escapeAttribute(product.id);

      return `
        <article class="wishlist-item">
          ${image
            ? `
              <img
                src="${escapeAttribute(image)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy"
              >
            `
            : `
              <div class="wishlist-no-image">No image</div>
            `
          }

          <div class="wishlist-item-info">
            <strong>${escapeHTML(product.name)}</strong>
            <span>
              ₹${Number(product.price || 0)
                .toLocaleString("en-IN")}
            </span>

            <div class="wishlist-item-actions">
              <button
                type="button"
                class="wishlist-view-button"
                data-product-id="${productId}"
                onclick="closeWishlist(); openProductDetail(this.dataset.productId)"
              >
                View Details
              </button>

              ${stock > 0
                ? `
                  <button
                    type="button"
                    class="wishlist-cart-button"
                    data-product-id="${productId}"
                    onclick="addWishlistItemToCart(this.dataset.productId)"
                  >
                    Add to Cart
                  </button>
                `
                : `
                  <span class="wishlist-sold">Sold Out</span>
                `
              }

              <button
                type="button"
                class="wishlist-remove-button"
                data-product-id="${productId}"
                onclick="toggleWishlist(this.dataset.productId)"
              >
                Remove
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}


function addWishlistItemToCart(productId) {
  closeWishlist();
  addToCart(productId);
}

function openProductDetail(productId) {
  const product = findStoreProduct(productId);
  const content =
    document.getElementById("productDetailContent");
  const modal =
    document.getElementById("productDetailModal");
  const overlay =
    document.getElementById("productDetailOverlay");

  if (!product || !content || !modal || !overlay) {
    return;
  }

  closeWishlist();
  closeCart();

  const images = productImages(product);
  const mainImage = images[0] || "";
  const stock = Number(product.stock || 0);
  const price = Number(product.price || 0);
  const oldPrice = Number(product.oldPrice || 0);
  const colors = Array.isArray(product.colors)
    ? product.colors
    : [];
  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];
  const wished = isWishlisted(product.id);
  const productIdValue = escapeAttribute(product.id);

  content.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-detail-gallery">
        ${mainImage
          ? `
            <img
              id="productDetailMainImage"
              class="product-detail-main-image"
              src="${escapeAttribute(mainImage)}"
              alt="${escapeHTML(product.name)}"
            >
          `
          : `
            <div class="product-detail-no-image">
              No image available
            </div>
          `
        }

        ${images.length > 1
          ? `
            <div class="product-detail-thumbnails">
              ${images.map((image, index) => `
                <button
                  type="button"
                  class="${index === 0 ? "active" : ""}"
                  data-image="${escapeAttribute(image)}"
                  onclick="setProductDetailImage(this)"
                  aria-label="Show image ${index + 1}"
                >
                  <img
                    src="${escapeAttribute(image)}"
                    alt="${escapeHTML(product.name)} image ${index + 1}"
                  >
                </button>
              `).join("")}
            </div>
          `
          : ""
        }
      </div>

      <div class="product-detail-info">
        ${product.category
          ? `
            <div class="product-detail-category">
              ${escapeHTML(product.category)}
            </div>
          `
          : ""
        }

        <h2 id="productDetailTitle">
          ${escapeHTML(product.name)}
        </h2>

        <div class="product-detail-price">
          <strong>₹${price.toLocaleString("en-IN")}</strong>
          ${oldPrice > price
            ? `<span>₹${oldPrice.toLocaleString("en-IN")}</span>`
            : ""
          }
        </div>

        <div class="product-detail-stock ${stock > 0 ? "available" : "sold"}">
          ${stock > 0 ? "In Stock" : "Out of Stock"}
        </div>

        ${colors.length
          ? `
            <div class="product-detail-option">
              <b>Colours</b>
              <p>${colors.map(escapeHTML).join(", ")}</p>
            </div>
          `
          : ""
        }

        ${sizes.length
          ? `
            <div class="product-detail-option">
              <b>Sizes</b>
              <p>${sizes.map(escapeHTML).join(", ")}</p>
            </div>
          `
          : ""
        }

        <div class="product-detail-description">
          <b>Product Details</b>
          <p>
            ${escapeHTML(
              product.description ||
              "Contact MudduGumma for more details about this saree."
            )}
          </p>
        </div>

        <div class="product-detail-actions">
          <button
            type="button"
            class="detail-wishlist-button ${wished ? "active" : ""}"
            data-product-id="${productIdValue}"
            onclick="toggleWishlist(this.dataset.productId); openProductDetail(this.dataset.productId)"
          >
            ${wished ? "♥ Saved to Wishlist" : "♡ Add to Wishlist"}
          </button>

          ${stock > 0
            ? `
              <button
                type="button"
                class="detail-cart-button"
                data-product-id="${productIdValue}"
                onclick="closeProductDetail(); addToCart(this.dataset.productId)"
              >
                Add to Cart
              </button>

              <button
                type="button"
                class="detail-buy-button"
                data-product-id="${productIdValue}"
                onclick="buyNow(this.dataset.productId)"
              >
                Buy Now
              </button>
            `
            : `
              <button type="button" class="detail-sold-button" disabled>
                Sold Out
              </button>
            `
          }
        </div>
      </div>
    </div>
  `;

  modal.classList.add("open");
  overlay.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelector(".product-detail-close")?.focus();
}


function closeProductDetail() {
  const modal =
    document.getElementById("productDetailModal");
  const overlay =
    document.getElementById("productDetailOverlay");

  modal?.classList.remove("open");
  overlay?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");

  if (!document.getElementById("wishlistDrawer")
    ?.classList.contains("open")) {
    document.body.style.overflow = "";
  }
}


function setProductDetailImage(button) {
  const image =
    document.getElementById("productDetailMainImage");

  if (!image || !button?.dataset.image) {
    return;
  }

  image.src = button.dataset.image;

  document
    .querySelectorAll(".product-detail-thumbnails button")
    .forEach(item => item.classList.remove("active"));

  button.classList.add("active");
}

// ==========================================
// CHANGE PRODUCT IMAGE
// ==========================================

function changeProductImage(thumbnail) {

  const card =
    thumbnail.closest(".product-card");

  if (!card) return;

  const mainImage =
    card.querySelector(".product-image");

  if (mainImage) {
    mainImage.src = thumbnail.src;
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
    alert("Product not found.");
    return;
  }


  const stock =
    Number(product.stock || 0);

  if (stock <= 0) {

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
      stock
    ) {

      alert(
        "You have reached the available stock quantity."
      );

      return;
    }

    existing.quantity += 1;

  } else {

    const images =
      Array.isArray(product.images)
        ? product.images
        : [];


    cart.push({

      id:
        product.id,

      name:
        product.name,

      price:
        Number(product.price || 0),

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
    return;
  }


  if (
    Number(product.stock || 0) <= 0
  ) {

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
      Array.isArray(product.images)
        ? product.images
        : [];


    cart.push({

      id:
        product.id,

      name:
        product.name,

      price:
        Number(product.price || 0),

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

  localStorage.setItem(
    "muddugummaCart",
    JSON.stringify(cart)
  );

  updateCartCount();
  renderCart();

}


// ==========================================
// CART COUNT
// ==========================================

function updateCartCount() {

  const count =
    cart.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
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


  if (drawer) {

    drawer.classList.add("open");

    drawer.style.transform =
      "translateX(0)";

  }


  if (overlay) {

    overlay.classList.add("show");

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

    drawer.classList.remove("open");

    drawer.style.transform = "";

  }


  if (overlay) {

    overlay.classList.remove("show");

    overlay.style.opacity = "";

    overlay.style.visibility = "";

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
          Add your favourite MudduGumma sarees
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
      .map(item => `

        <div class="cart-item">

          ${
            item.image
              ? `
                <img
                  src="${escapeAttribute(item.image)}"
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
                type="button"
                onclick="changeQuantity(
                  '${escapeJS(item.id)}',
                  -1
                )"
                title="Reduce quantity"
              >
                −
              </button>


              <span>
                ${Number(item.quantity || 1)}
              </span>


              <button
                type="button"
                onclick="changeQuantity(
                  '${escapeJS(item.id)}',
                  1
                )"
                title="Increase quantity"
              >
                +
              </button>

            </div>


            <button
              type="button"
              class="remove-item"
              onclick="removeFromCart(
                '${escapeJS(item.id)}'
              )"
            >
              🗑 Remove
            </button>

          </div>

        </div>

      `)
      .join("");


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.quantity || 0),
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
    Number(product.stock || 0)
  ) {

    alert(
      "Only " +
      product.stock +
      " piece(s) available."
    );

    return;

  }


  item.quantity =
    Number(item.quantity || 1) +
    Number(amount);


  if (
    item.quantity <= 0
  ) {

    removeFromCart(productId);
    return;

  }


  saveCart();

}


// ==========================================
// REMOVE ONE CART PRODUCT
// ==========================================

function removeFromCart(
  productId
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


      const name =
        document
          .getElementById("name")
          ?.value
          .trim() || "";


      const message =
        document.getElementById(
          "formMessage"
        );


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

  return escapeHTML(value);

}


function escapeJS(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

}


// ==========================================
// AVAILABLE FOR HTML BUTTONS
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

window.selectSareeCategory =
  selectSareeCategory;

window.showSareeTypes =
  showSareeTypes;

window.openWishlist =
  openWishlist;

window.closeWishlist =
  closeWishlist;

window.toggleWishlist =
  toggleWishlist;

window.openProductDetail =
  openProductDetail;

window.closeProductDetail =
  closeProductDetail;

window.setProductDetailImage =
  setProductDetailImage;

window.addWishlistItemToCart =
  addWishlistItemToCart;


document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeProductDetail();
    closeWishlist();
  }
});


// ==========================================
// START STORE
// ==========================================

updateCartCount();
updateWishlistCount();
renderCart();
renderWishlist();
loadProducts();
