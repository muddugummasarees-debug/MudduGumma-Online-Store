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

const productFilterState = {
  search: "",
  category: [],
  fabric: [],
  price: "all",
  color: [],
  size: [],
  occasion: [],
  pattern: [],
  work: [],
  border: [],
  blouse: [],
  availability: "all",
  discount: "all",
  featuredOnly: false,
  sort: "recommended"
};

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
    populateProductFilters();
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
  const selectedFabric =
    String(
      product?.fabric ||
      product?.category ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(/[-_]/g, " ");

  const chosenType =
    sareeTypeDefinitions.find(definition =>
      definition.keywords.some(keyword =>
        selectedFabric.includes(keyword)
      )
    );

  if (chosenType) {
    return chosenType;
  }

  const rawCategory =
    String(
      product?.fabric ||
      product?.category ||
      ""
    ).trim();

  const genericCategory =
    !rawCategory ||
    /^(saree|sarees|women'?s wear|collection)$/i
      .test(rawCategory);

  if (!genericCategory) {
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

  const searchText =
    productSareeSearchText({
      ...product,
      category: ""
    });

  const inferredType =
    sareeTypeDefinitions.find(definition =>
      definition.keywords.some(keyword =>
        searchText.includes(keyword)
      )
    );

  if (inferredType) {
    return inferredType;
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

  resetProductFilters(false);
  populateProductFilters();

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

  const breadcrumb =
    document.getElementById(
      "sareeBreadcrumbCurrent"
    );

  if (breadcrumb) {
    breadcrumb.textContent =
      category.resultLabel;
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
  closeProductFilters();

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

// ==========================================
// HEADER PRODUCT SEARCH
// ==========================================

function headerSearchProductText(
  product
) {
  const sareeType =
    getSareeTypeDefinition(product);

  return [
    product.id,
    product.name,
    product.description,
    product.category,
    product.fabric,
    sareeType?.label,
    sareeType?.resultLabel,
    product.occasion,
    product.pattern,
    product.border,
    product.work,
    product.blouse,
    ...(Array.isArray(product.colors)
      ? product.colors
      : []),
    ...(Array.isArray(product.sizes)
      ? product.sizes
      : []),
    ...(Array.isArray(product.tags)
      ? product.tags
      : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function headerSearchMatches(
  query
) {
  const words =
    String(query || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

  const newestProducts =
    [...storeProducts]
      .sort((a, b) =>
        new Date(
          b.createdAt ||
          b.updatedAt ||
          0
        ).getTime() -
        new Date(
          a.createdAt ||
          a.updatedAt ||
          0
        ).getTime()
      );

  if (!words.length) {
    return newestProducts.slice(0, 6);
  }

  return newestProducts
    .filter(product => {
      const searchable =
        headerSearchProductText(product);

      return words.every(word =>
        searchable.includes(word)
      );
    })
    .slice(0, 8);
}

function renderHeaderSearchSuggestions(
  query = ""
) {
  const container =
    document.getElementById(
      "headerSearchSuggestions"
    );

  if (!container) {
    return;
  }

  if (!storeProducts.length) {
    container.innerHTML = `
      <div class="header-search-empty">
        <strong>No sarees are available yet.</strong>
        <span>New collections will appear here automatically.</span>
      </div>
    `;

    return;
  }

  const cleanQuery =
    String(query || "").trim();

  const matches =
    headerSearchMatches(cleanQuery);

  if (!matches.length) {
    container.innerHTML = `
      <div class="header-search-empty">
        <strong>No matching sarees found.</strong>
        <span>Try another name, fabric, color or category.</span>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <p class="header-search-caption">
      ${cleanQuery
        ? `${matches.length} matching ${matches.length === 1 ? "saree" : "sarees"}`
        : "Newest sarees"
      }
    </p>

    <div class="header-search-results">
      ${matches.map(product => {
        const image =
          productImages(product)[0] || "";

        const fabric =
          getSareeTypeDefinition(product)
            .resultLabel
            .replace(/\s*Sarees$/i, "");

        return `
          <button
            type="button"
            class="header-search-result"
            data-product-id="${escapeAttribute(product.id)}"
            onclick="openHeaderSearchProduct(this.dataset.productId)"
          >
            ${image
              ? `
                <img
                  src="${escapeAttribute(image)}"
                  alt=""
                  loading="lazy"
                >
              `
              : `
                <span class="header-search-no-image">
                  MG
                </span>
              `
            }

            <span class="header-search-result-copy">
              <strong>${escapeHTML(product.name)}</strong>
              <small>${escapeHTML(fabric)}</small>
            </span>

            <b>
              ₹${Number(
                product.price || 0
              ).toLocaleString("en-IN")}
            </b>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function openHeaderSearch() {
  const panel =
    document.getElementById(
      "headerSearchPanel"
    );

  const button =
    document.getElementById(
      "searchButton"
    );

  const input =
    document.getElementById(
      "headerSearchInput"
    );

  if (!panel) {
    return;
  }

  panel.hidden = false;

  button?.setAttribute(
    "aria-expanded",
    "true"
  );

  renderHeaderSearchSuggestions(
    input?.value || ""
  );

  requestAnimationFrame(() => {
    input?.focus();
    input?.select();
  });
}

function closeHeaderSearch() {
  const panel =
    document.getElementById(
      "headerSearchPanel"
    );

  if (panel) {
    panel.hidden = true;
  }

  document
    .getElementById("searchButton")
    ?.setAttribute(
      "aria-expanded",
      "false"
    );
}

function submitHeaderSearch(
  event
) {
  event?.preventDefault();

  const input =
    document.getElementById(
      "headerSearchInput"
    );

  const query =
    input?.value.trim() || "";

  if (!query) {
    renderHeaderSearchSuggestions("");
    input?.focus();
    return;
  }

  selectSareeCategory("all");

  const collectionSearch =
    document.getElementById(
      "filterSearch"
    );

  if (collectionSearch) {
    collectionSearch.value =
      query;
  }

  applyProductFilters();
  closeHeaderSearch();
}

function openHeaderSearchProduct(
  productId
) {
  closeHeaderSearch();
  openProductDetail(productId);
}


// ==========================================
// PRODUCT FILTERS
// ==========================================

const productFilterLabels = {
  category: new Map(),
  fabric: new Map(),
  color: new Map(),
  size: new Map(),
  occasion: new Map(),
  pattern: new Map(),
  work: new Map(),
  border: new Map(),
  blouse: new Map()
};

function productFilterOptionValues(
  product,
  field
) {
  const value =
    product?.[field];

  if (Array.isArray(value)) {
    return value
      .map(item =>
        String(item).trim()
      )
      .filter(Boolean);
  }

  const cleanValue =
    String(value || "").trim();

  return cleanValue
    ? [cleanValue]
    : [];
}

function countedFilterOptions(
  values
) {
  const optionMap =
    new Map();

  values
    .filter(Boolean)
    .forEach(rawValue => {
      const label =
        String(rawValue).trim();

      const value =
        label.toLowerCase();

      if (!value) {
        return;
      }

      const current =
        optionMap.get(value);

      optionMap.set(
        value,
        {
          value,
          label:
            current?.label ||
            label,
          count:
            (current?.count || 0) +
            1
        }
      );
    });

  return Array
    .from(optionMap.values())
    .sort((a, b) =>
      a.label.localeCompare(b.label)
    );
}

function setCheckboxFilterOptions(
  containerId,
  groupId,
  inputName,
  options,
  selectedValues
) {
  const container =
    document.getElementById(
      containerId
    );

  const group =
    document.getElementById(
      groupId
    );

  if (!container) {
    return;
  }

  if (group) {
    group.hidden =
      !options.length;
  }

  const labelMap =
    productFilterLabels[
      inputName.replace("filter", "")
        .toLowerCase()
    ];

  labelMap?.clear();

  options.forEach(option => {
    labelMap?.set(
      option.value,
      option.label
    );
  });

  container.innerHTML =
    options
      .map(option => `
        <label class="sidebar-filter-option">
          <input
            type="checkbox"
            name="${escapeAttribute(inputName)}"
            value="${escapeAttribute(option.value)}"
            ${selectedValues.includes(option.value) ? "checked" : ""}
            onchange="applyProductFilters()"
          >
          <span>${escapeHTML(option.label)}</span>
          <small>${option.count}</small>
        </label>
      `)
      .join("");
}

function populateProductFilters() {
  const categories =
    countedFilterOptions(
      storeProducts.map(product =>
        String(
          product.category ||
          "Sarees"
        ).trim()
      )
    );

  const fabricMap =
    new Map();

  storeProducts.forEach(product => {
    const definition =
      getSareeTypeDefinition(product);

    const current =
      fabricMap.get(definition.id);

    fabricMap.set(
      definition.id,
      {
        value: definition.id,
        label:
          definition.resultLabel,
        count:
          (current?.count || 0) +
          1
      }
    );
  });

  const fabrics =
    Array
      .from(fabricMap.values())
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      );

  const colors =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "colors"
        )
      )
    );

  const sizes =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "sizes"
        )
      )
    );

  const occasions =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "occasion"
        )
      )
    );

  const patterns =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "pattern"
        )
      )
    );

  const works =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "work"
        )
      )
    );

  const borders =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "border"
        )
      )
    );

  const blouses =
    countedFilterOptions(
      storeProducts.flatMap(product =>
        productFilterOptionValues(
          product,
          "blouse"
        )
      )
    );

  setCheckboxFilterOptions(
    "filterCategoryOptions",
    "filterCategoryGroup",
    "filterCategory",
    categories,
    productFilterState.category
  );

  setCheckboxFilterOptions(
    "filterFabricOptions",
    "filterFabricGroup",
    "filterFabric",
    fabrics,
    productFilterState.fabric
  );

  setCheckboxFilterOptions(
    "filterColorOptions",
    "filterColorGroup",
    "filterColor",
    colors,
    productFilterState.color
  );

  setCheckboxFilterOptions(
    "filterSizeOptions",
    "filterSizeGroup",
    "filterSize",
    sizes,
    productFilterState.size
  );

  setCheckboxFilterOptions(
    "filterOccasionOptions",
    "filterOccasionGroup",
    "filterOccasion",
    occasions,
    productFilterState.occasion
  );

  setCheckboxFilterOptions(
    "filterPatternOptions",
    "filterPatternGroup",
    "filterPattern",
    patterns,
    productFilterState.pattern
  );

  setCheckboxFilterOptions(
    "filterWorkOptions",
    "filterWorkGroup",
    "filterWork",
    works,
    productFilterState.work
  );

  setCheckboxFilterOptions(
    "filterBorderOptions",
    "filterBorderGroup",
    "filterBorder",
    borders,
    productFilterState.border
  );

  setCheckboxFilterOptions(
    "filterBlouseOptions",
    "filterBlouseGroup",
    "filterBlouse",
    blouses,
    productFilterState.blouse
  );
}

function checkedFilterValues(
  inputName
) {
  return Array.from(
    document.querySelectorAll(
      `input[name="${inputName}"]:checked`
    )
  ).map(input =>
    input.value
  );
}

function selectedRadioValue(
  inputName,
  fallback = "all"
) {
  return document.querySelector(
    `input[name="${inputName}"]:checked`
  )?.value || fallback;
}

function readProductFilters() {
  productFilterState.search =
    document
      .getElementById("filterSearch")
      ?.value
      .trim()
      .toLowerCase() || "";

  productFilterState.category =
    checkedFilterValues(
      "filterCategory"
    );

  productFilterState.fabric =
    checkedFilterValues(
      "filterFabric"
    );

  productFilterState.color =
    checkedFilterValues(
      "filterColor"
    );

  productFilterState.size =
    checkedFilterValues(
      "filterSize"
    );

  productFilterState.occasion =
    checkedFilterValues(
      "filterOccasion"
    );

  productFilterState.pattern =
    checkedFilterValues(
      "filterPattern"
    );

  productFilterState.work =
    checkedFilterValues(
      "filterWork"
    );

  productFilterState.border =
    checkedFilterValues(
      "filterBorder"
    );

  productFilterState.blouse =
    checkedFilterValues(
      "filterBlouse"
    );

  productFilterState.price =
    selectedRadioValue(
      "filterPrice"
    );

  productFilterState.availability =
    selectedRadioValue(
      "filterAvailability"
    );

  productFilterState.discount =
    selectedRadioValue(
      "filterDiscount"
    );

  productFilterState.sort =
    document
      .getElementById("filterSort")
      ?.value || "recommended";
}

function syncProductFilterControls() {
  const arrayGroups = [
    ["filterCategory", "category"],
    ["filterFabric", "fabric"],
    ["filterColor", "color"],
    ["filterSize", "size"],
    ["filterOccasion", "occasion"],
    ["filterPattern", "pattern"],
    ["filterWork", "work"],
    ["filterBorder", "border"],
    ["filterBlouse", "blouse"]
  ];

  arrayGroups.forEach(
    ([inputName, stateKey]) => {
      document
        .querySelectorAll(
          `input[name="${inputName}"]`
        )
        .forEach(input => {
          input.checked =
            productFilterState[
              stateKey
            ].includes(
              input.value
            );
        });
    }
  );

  [
    ["filterPrice", productFilterState.price],
    [
      "filterAvailability",
      productFilterState.availability
    ],
    [
      "filterDiscount",
      productFilterState.discount
    ]
  ].forEach(([inputName, value]) => {
    const input =
      document.querySelector(
        `input[name="${inputName}"][value="${value}"]`
      ) ||
      document.querySelector(
        `input[name="${inputName}"][value="all"]`
      );

    if (input) {
      input.checked = true;
    }
  });

  const sort =
    document.getElementById(
      "filterSort"
    );

  if (sort) {
    sort.value =
      productFilterState.sort;
  }

  const search =
    document.getElementById(
      "filterSearch"
    );

  if (search) {
    search.value =
      productFilterState.search;
  }
}

function resetProductFilters(
  shouldRender = true
) {
  Object.assign(
    productFilterState,
    {
      search: "",
      category: [],
      fabric: [],
      price: "all",
      color: [],
      size: [],
      occasion: [],
      pattern: [],
      work: [],
      border: [],
      blouse: [],
      availability: "all",
      discount: "all",
      featuredOnly: false,
      sort: "recommended"
    }
  );

  const headerSearch =
    document.getElementById(
      "headerSearchInput"
    );

  if (headerSearch) {
    headerSearch.value = "";
  }

  syncProductFilterControls();
  renderActiveProductFilters();

  if (shouldRender) {
    renderProducts();
  }
}

function matchesPriceFilter(
  product
) {
  const price =
    Number(product.price || 0);

  switch (
    productFilterState.price
  ) {
    case "under-500":
      return price < 500;

    case "under-1000":
      return price < 1000;

    case "500-999":
      return (
        price >= 500 &&
        price <= 999
      );

    case "1000-1999":
      return (
        price >= 1000 &&
        price <= 1999
      );

    case "2000-4999":
      return (
        price >= 2000 &&
        price <= 4999
      );

    case "5000-plus":
      return price >= 5000;

    default:
      return true;
  }
}

function productDiscountPercent(
  product
) {
  const price =
    Number(product.price || 0);

  const oldPrice =
    Number(
      product.oldPrice ||
      product.old_price ||
      0
    );

  if (
    oldPrice <= price ||
    oldPrice <= 0
  ) {
    return 0;
  }

  return Math.round(
    ((oldPrice - price) / oldPrice) *
    100
  );
}

function matchesSelectedValues(
  selectedValues,
  productValues
) {
  if (!selectedValues.length) {
    return true;
  }

  const normalizedValues =
    productValues.map(value =>
      String(value)
        .trim()
        .toLowerCase()
    );

  return selectedValues.some(value =>
    normalizedValues.includes(value)
  );
}

function hasActiveProductFilters() {
  return Boolean(
    productFilterState.search ||
    productFilterState.category.length ||
    productFilterState.fabric.length ||
    productFilterState.price !== "all" ||
    productFilterState.color.length ||
    productFilterState.size.length ||
    productFilterState.occasion.length ||
    productFilterState.pattern.length ||
    productFilterState.work.length ||
    productFilterState.border.length ||
    productFilterState.blouse.length ||
    productFilterState.availability !== "all" ||
    productFilterState.discount !== "all" ||
    productFilterState.featuredOnly
  );
}

function productRecommendedScore(
  product
) {
  return (
    (product.featured ? 1000000 : 0) +
    (Number(product.stock || 0) > 0
      ? 100000
      : 0) +
    Math.max(
      0,
      new Date(
        product.createdAt ||
        product.updatedAt ||
        0
      ).getTime() / 100000000
    )
  );
}

function filteredStoreProducts() {
  const products =
    productsForActiveSareeType()
      .filter(product => {
        const searchable = [
          product.name,
          product.description,
          product.category,
          product.fabric,
          product.occasion,
          product.pattern,
          product.border,
          product.work,
          product.blouse,
          ...(Array.isArray(product.colors)
            ? product.colors
            : []),
          ...(Array.isArray(product.sizes)
            ? product.sizes
            : []),
          ...(Array.isArray(product.tags)
            ? product.tags
            : [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !productFilterState.search ||
          searchable.includes(
            productFilterState.search
          );

        const matchesCategory =
          matchesSelectedValues(
            productFilterState.category,
            [
              product.category ||
              "Sarees"
            ]
          );

        const matchesFabric =
          !productFilterState.fabric.length ||
          productFilterState.fabric.includes(
            getSareeTypeDefinition(product)
              .id
          );

        const matchesColor =
          matchesSelectedValues(
            productFilterState.color,
            productFilterOptionValues(
              product,
              "colors"
            )
          );

        const matchesSize =
          matchesSelectedValues(
            productFilterState.size,
            productFilterOptionValues(
              product,
              "sizes"
            )
          );

        const matchesOccasion =
          matchesSelectedValues(
            productFilterState.occasion,
            productFilterOptionValues(
              product,
              "occasion"
            )
          );

        const matchesPattern =
          matchesSelectedValues(
            productFilterState.pattern,
            productFilterOptionValues(
              product,
              "pattern"
            )
          );

        const matchesWork =
          matchesSelectedValues(
            productFilterState.work,
            productFilterOptionValues(
              product,
              "work"
            )
          );

        const matchesBorder =
          matchesSelectedValues(
            productFilterState.border,
            productFilterOptionValues(
              product,
              "border"
            )
          );

        const matchesBlouse =
          matchesSelectedValues(
            productFilterState.blouse,
            productFilterOptionValues(
              product,
              "blouse"
            )
          );

        const stock =
          Number(product.stock || 0);

        const matchesAvailability =
          productFilterState.availability ===
            "all" ||
          (
            productFilterState.availability ===
              "in-stock"
              ? stock > 0
              : stock <= 0
          );

        const minimumDiscount =
          productFilterState.discount ===
            "all"
            ? 0
            : Number(
                productFilterState.discount
              );

        const matchesDiscount =
          !minimumDiscount ||
          productDiscountPercent(product) >=
            minimumDiscount;

        const matchesFeatured =
          !productFilterState.featuredOnly ||
          Boolean(product.featured);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesFabric &&
          matchesPriceFilter(product) &&
          matchesColor &&
          matchesSize &&
          matchesOccasion &&
          matchesPattern &&
          matchesWork &&
          matchesBorder &&
          matchesBlouse &&
          matchesAvailability &&
          matchesDiscount &&
          matchesFeatured
        );
      });

  return products.sort((a, b) => {
    switch (
      productFilterState.sort
    ) {
      case "newest":
        return (
          new Date(
            b.createdAt ||
            b.updatedAt ||
            0
          ).getTime() -
          new Date(
            a.createdAt ||
            a.updatedAt ||
            0
          ).getTime()
        );

      case "price-low":
        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );

      case "price-high":
        return (
          Number(b.price || 0) -
          Number(a.price || 0)
        );

      case "discount":
        return (
          productDiscountPercent(b) -
          productDiscountPercent(a)
        );

      case "name":
        return String(a.name || "")
          .localeCompare(
            String(b.name || "")
          );

      default:
        return (
          productRecommendedScore(b) -
          productRecommendedScore(a)
        );
    }
  });
}

function filterLabel(
  group,
  value
) {
  const staticLabels = {
    price: {
      "under-500": "Under ₹500",
      "under-1000": "Under ₹999",
      "500-999": "₹500–₹999",
      "1000-1999": "₹1,000–₹1,999",
      "2000-4999": "₹2,000–₹4,999",
      "5000-plus": "₹5,000+"
    },
    availability: {
      "in-stock": "In Stock",
      "out-of-stock": "Out of Stock"
    },
    discount: {
      "10": "10%+ Discount",
      "20": "20%+ Discount",
      "30": "30%+ Discount",
      "50": "50%+ Discount"
    }
  };

  return (
    productFilterLabels[
      group
    ]?.get(value) ||
    staticLabels[group]?.[value] ||
    value
  );
}

function activeProductFilterEntries() {
  const entries = [];

  if (productFilterState.search) {
    entries.push({
      group: "search",
      value:
        productFilterState.search,
      label:
        `Search: ${productFilterState.search}`
    });
  }

  [
    "category",
    "fabric",
    "color",
    "size",
    "occasion",
    "pattern",
    "work",
    "border",
    "blouse"
  ].forEach(group => {
    productFilterState[group]
      .forEach(value => {
        entries.push({
          group,
          value,
          label:
            filterLabel(
              group,
              value
            )
        });
      });
  });

  [
    "price",
    "availability",
    "discount"
  ].forEach(group => {
    const value =
      productFilterState[group];

    if (value !== "all") {
      entries.push({
        group,
        value,
        label:
          filterLabel(
            group,
            value
          )
      });
    }
  });

  if (
    productFilterState.featuredOnly
  ) {
    entries.push({
      group: "featuredOnly",
      value: "true",
      label: "Recommended"
    });
  }

  return entries;
}

function renderActiveProductFilters() {
  const container =
    document.getElementById(
      "activeFilterChips"
    );

  const entries =
    activeProductFilterEntries();

  if (container) {
    container.innerHTML =
      entries.length
        ? `
          ${entries.map(entry => `
            <button
              type="button"
              data-filter-group="${escapeAttribute(entry.group)}"
              data-filter-value="${escapeAttribute(entry.value)}"
              onclick="removeProductFilter(this.dataset.filterGroup,this.dataset.filterValue)"
            >
              ${escapeHTML(entry.label)}
              <span aria-hidden="true">×</span>
            </button>
          `).join("")}

          <button
            type="button"
            class="clear-active-filters"
            onclick="resetProductFilters()"
          >
            Clear All
          </button>
        `
        : "";
  }

  const count =
    document.getElementById(
      "mobileFilterCount"
    );

  if (count) {
    count.textContent =
      entries.length;

    count.hidden =
      !entries.length;
  }

  document
    .querySelectorAll(
      "[data-quick-filter]"
    )
    .forEach(button => {
      const quick =
        button.dataset.quickFilter;

      const pressed =
        (
          quick === "newest" &&
          productFilterState.sort ===
            "newest"
        ) ||
        (
          quick === "featured" &&
          productFilterState.featuredOnly
        ) ||
        (
          quick === "silk" &&
          productFilterState.fabric
            .includes("silk")
        ) ||
        (
          quick === "cotton" &&
          productFilterState.fabric
            .includes("cotton")
        ) ||
        (
          quick === "in-stock" &&
          productFilterState.availability ===
            "in-stock"
        ) ||
        (
          quick === "under-999" &&
          productFilterState.price ===
            "under-1000"
        );

      button.setAttribute(
        "aria-pressed",
        pressed ? "true" : "false"
      );
    });
}

function removeProductFilter(
  group,
  value
) {
  if (
    Array.isArray(
      productFilterState[group]
    )
  ) {
    productFilterState[group] =
      productFilterState[group]
        .filter(item =>
          item !== value
        );

  } else if (
    group === "search"
  ) {
    productFilterState.search = "";

    const headerSearch =
      document.getElementById(
        "headerSearchInput"
      );

    if (headerSearch) {
      headerSearch.value = "";
    }

  } else if (
    group === "featuredOnly"
  ) {
    productFilterState.featuredOnly =
      false;

  } else if (
    Object.prototype.hasOwnProperty.call(
      productFilterState,
      group
    )
  ) {
    productFilterState[group] =
      "all";
  }

  syncProductFilterControls();
  renderProducts();
}

function applyQuickProductFilter(
  type,
  value
) {
  if (type === "newest") {
    productFilterState.sort =
      productFilterState.sort ===
        "newest"
        ? "recommended"
        : "newest";

  } else if (type === "featured") {
    productFilterState.featuredOnly =
      !productFilterState.featuredOnly;

  } else if (type === "fabric") {
    const exists =
      productFilterState.fabric
        .includes(value);

    productFilterState.fabric =
      exists
        ? productFilterState.fabric
            .filter(item =>
              item !== value
            )
        : [
            ...productFilterState.fabric,
            value
          ];

  } else if (
    type === "availability"
  ) {
    productFilterState.availability =
      productFilterState.availability ===
        value
        ? "all"
        : value;

  } else if (type === "price") {
    productFilterState.price =
      productFilterState.price ===
        value
        ? "all"
        : value;
  }

  syncProductFilterControls();
  renderProducts();
}

function openProductFilters() {
  document.body.classList.add(
    "product-filters-open"
  );
}

function closeProductFilters() {
  document.body.classList.remove(
    "product-filters-open"
  );
}

function updateProductResultsCount(
  count
) {
  const element =
    document.getElementById(
      "filterResultCount"
    );

  if (element) {
    element.textContent =
      `${count} ${
        count === 1
          ? "saree"
          : "sarees"
      } found`;
  }
}

function applyProductFilters() {
  readProductFilters();
  renderProducts();
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
    filteredStoreProducts();

  renderActiveProductFilters();


  if (!visibleProducts.length) {

    updateProductResultsCount(0);

    grid.innerHTML = `
      <div class="empty-products">

        <h3>
          ${hasActiveProductFilters()
            ? "No sarees match these filters"
            : "New collection coming soon"
          }
        </h3>

        <p>
          ${hasActiveProductFilters()
            ? "Try changing or clearing your filters."
            : "Beautiful MudduGumma sarees will be available here soon."
          }
        </p>

        ${hasActiveProductFilters()
          ? `
            <button
              type="button"
              class="button primary"
              onclick="resetProductFilters()"
            >
              Clear Filters
            </button>
          `
          : ""
        }

      </div>
    `;

    return;
  }

  updateProductResultsCount(
    visibleProducts.length
  );


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

        const hasVariants =
          productVariants(product).length > 0;


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
                        onclick="${
                          hasVariants
                            ? `openProductDetail('${escapeJS(product.id)}')`
                            : `addToCart('${escapeJS(product.id)}')`
                        }"
                      >
                        ${hasVariants ? "Select Options" : "Add to Cart"}
                      </button>


                      <button
                        type="button"
                        class="button buy-now-btn"
                        onclick="${
                          hasVariants
                            ? `openProductDetail('${escapeJS(product.id)}')`
                            : `buyNow('${escapeJS(product.id)}')`
                        }"
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


function productVariants(product) {
  return Array.isArray(product?.variants)
    ? product.variants.filter(variant =>
        variant &&
        (variant.color || variant.size)
      )
    : [];
}


function findProductVariant(product, variantKey) {
  return productVariants(product)
    .find(variant =>
      String(variant.key) ===
      String(variantKey || "")
    ) || null;
}


function cartLineKey(item) {
  return [
    String(item?.id || ""),
    String(item?.variantKey || "simple")
  ].join("::");
}


function cartVariantText(item) {
  return [
    item?.color ? `Color: ${item.color}` : "",
    item?.size ? `Size: ${item.size}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
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
  const product = findStoreProduct(productId);
  closeWishlist();

  if (productVariants(product).length) {
    openProductDetail(productId);
    return;
  }

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
  const variants = productVariants(product);

  const detailSpecs = [
    ["Fabric", product.fabric],
    ["Occasion", product.occasion],
    ["Pattern", product.pattern],
    ["Work", product.work],
    ["Border", product.border],
    ["Blouse Piece", product.blouse]
  ].filter(([, value]) =>
    String(value || "").trim()
  );

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

        ${detailSpecs.length
          ? `
            <div class="product-detail-spec-grid">
              ${detailSpecs.map(([label, value]) => `
                <div>
                  <b>${escapeHTML(label)}</b>
                  <span>${escapeHTML(value)}</span>
                </div>
              `).join("")}
            </div>
          `
          : ""
        }

        ${variants.length
          ? `
            <div class="product-variant-picker">
              <label for="productVariantSelect">Choose size / color *</label>
              <select id="productVariantSelect">
                <option value="">Choose an available option</option>
                ${variants.map(variant => {
                  const label =
                    [variant.color, variant.size]
                      .filter(Boolean)
                      .join(" / ");
                  const quantity =
                    Math.max(0, Number(variant.quantity || 0));

                  return `
                    <option
                      value="${escapeAttribute(variant.key)}"
                      ${quantity <= 0 ? "disabled" : ""}
                    >
                      ${escapeHTML(label)} — ${quantity} available
                    </option>
                  `;
                }).join("")}
              </select>
              <div id="productVariantMessage" class="product-variant-message" aria-live="polite"></div>
            </div>
          `
          : ""
        }

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
                onclick="addProductDetailToCart(this.dataset.productId, false)"
              >
                Add to Cart
              </button>

              <button
                type="button"
                class="detail-buy-button"
                data-product-id="${productIdValue}"
                onclick="addProductDetailToCart(this.dataset.productId, true)"
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


function addProductDetailToCart(
  productId,
  buyNowMode
) {
  const product = findStoreProduct(productId);
  const variants = productVariants(product);
  let selection = {};

  if (variants.length) {
    const select =
      document.getElementById("productVariantSelect");
    const message =
      document.getElementById("productVariantMessage");
    const variant =
      findProductVariant(product, select?.value);

    if (!variant || Number(variant.quantity || 0) <= 0) {
      if (message) {
        message.textContent =
          "Please choose an available size and color.";
      }
      select?.focus();
      return;
    }

    selection = variant;
  }

  closeProductDetail();

  if (buyNowMode) {
    buyNow(productId, selection);
    return;
  }

  addToCart(productId, selection);
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

function addToCart(
  productId,
  selection = {},
  openAfter = true
) {

  const product = findStoreProduct(productId);

  if (!product) {
    alert("Product not found.");
    return false;
  }

  const variants = productVariants(product);
  const selectedVariant =
    variants.length
      ? findProductVariant(
          product,
          selection.variantKey || selection.key
        )
      : null;

  if (
    variants.length &&
    (!selectedVariant || Number(selectedVariant.quantity || 0) <= 0)
  ) {
    openProductDetail(productId);
    return false;
  }

  const stock =
    selectedVariant
      ? Number(selectedVariant.quantity || 0)
      : Number(product.stock || 0);

  if (stock <= 0) {
    alert("Sorry, this product is currently out of stock.");
    return false;
  }

  const variantKey =
    selectedVariant
      ? String(selectedVariant.key)
      : "";

  const existing =
    cart.find(item =>
      String(item.id) === String(productId) &&
      String(item.variantKey || "") === variantKey
    );

  if (existing) {
    if (Number(existing.quantity) >= stock) {
      alert("You have reached the available stock quantity.");
      return false;
    }

    existing.quantity += 1;

  } else {
    const images = productImages(product);

    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      image: images[0] || product.image || "",
      quantity: 1,
      variantKey,
      color: selectedVariant?.color || "",
      size: selectedVariant?.size || ""
    });
  }

  saveCart();

  if (openAfter) {
    openCart();
  }

  return true;
}


// ==========================================
// BUY NOW
// ==========================================

function buyNow(
  productId,
  selection = {}
) {
  const added =
    addToCart(productId, selection, false);

  if (!added) {
    return false;
  }

  window.location.href = "/checkout.html";
  return true;
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
    document.getElementById("cartItems");
  const totalElement =
    document.getElementById("cartTotal");

  if (!container || !totalElement) {
    return;
  }

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">♡</div>
        <h3>Your cart is empty</h3>
        <p>Add your favourite MudduGumma products to begin shopping.</p>
      </div>
    `;

    totalElement.textContent = "₹0";
    return;
  }

  container.innerHTML =
    cart
      .map(item => {
        const lineKey = cartLineKey(item);
        const variantText = cartVariantText(item);

        return `
          <div class="cart-item">
            ${
              item.image
                ? `<img src="${escapeAttribute(item.image)}" alt="${escapeHTML(item.name)}">`
                : ""
            }

            <div class="cart-item-info">
              <strong>${escapeHTML(item.name)}</strong>

              ${
                variantText
                  ? `<span class="cart-item-variant">${escapeHTML(variantText)}</span>`
                  : ""
              }

              <span>₹${Number(item.price).toLocaleString("en-IN")}</span>

              <div class="quantity-controls">
                <button type="button" onclick="changeQuantity('${escapeJS(lineKey)}', -1)" title="Reduce quantity">−</button>
                <span>${Number(item.quantity || 1)}</span>
                <button type="button" onclick="changeQuantity('${escapeJS(lineKey)}', 1)" title="Increase quantity">+</button>
              </div>

              <button type="button" class="remove-item" onclick="removeFromCart('${escapeJS(lineKey)}')">
                🗑 Remove
              </button>
            </div>
          </div>
        `;
      })
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
    "₹" + total.toLocaleString("en-IN");
}


// ==========================================
// CHANGE QUANTITY
// ==========================================

function changeQuantity(
  lineKey,
  amount
) {

  const item =
    cart.find(item =>
      cartLineKey(item) === String(lineKey)
    );

  if (!item) {
    return;
  }

  const product = findStoreProduct(item.id);
  const variant =
    item.variantKey
      ? findProductVariant(product, item.variantKey)
      : null;

  const availableStock =
    variant
      ? Number(variant.quantity || 0)
      : Number(product?.stock || 0);

  if (
    amount > 0 &&
    Number(item.quantity) >= availableStock
  ) {
    alert("Only " + availableStock + " piece(s) available.");
    return;
  }

  item.quantity =
    Number(item.quantity || 1) + Number(amount);

  if (item.quantity <= 0) {
    removeFromCart(lineKey);
    return;
  }

  saveCart();
}


// ==========================================
// REMOVE ONE CART PRODUCT
// ==========================================

function removeFromCart(lineKey) {

  const exists =
    cart.some(item =>
      cartLineKey(item) === String(lineKey)
    );

  if (!exists) {
    return;
  }

  cart =
    cart.filter(item =>
      cartLineKey(item) !== String(lineKey)
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
// HOMEPAGE HERO CAROUSEL
// ==========================================

let activeHeroSlide = 0;
let heroCarouselTimer = null;
let heroCarouselPaused = false;

const HERO_CAROUSEL_DELAY = 7000;


function heroSlides() {

  return Array.from(
    document.querySelectorAll(
      ".hero-slide"
    )
  );

}


function stopHeroCarousel() {

  if (heroCarouselTimer) {
    clearInterval(heroCarouselTimer);
    heroCarouselTimer = null;
  }

}


function startHeroCarousel() {

  stopHeroCarousel();

  const slides = heroSlides();

  if (
    heroCarouselPaused ||
    slides.length < 2 ||
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    return;
  }

  heroCarouselTimer = setInterval(
    () => {
      setHeroSlide(
        activeHeroSlide + 1,
        { restart: false }
      );
    },
    HERO_CAROUSEL_DELAY
  );

}


function setHeroSlide(
  requestedIndex,
  options = {}
) {

  const slides = heroSlides();

  if (!slides.length) {
    return;
  }

  const dots = Array.from(
    document.querySelectorAll(
      ".hero-carousel-dot"
    )
  );

  activeHeroSlide =
    (
      Number(requestedIndex) +
      slides.length
    ) % slides.length;

  slides.forEach(
    (slide, index) => {
      const isActive =
        index === activeHeroSlide;

      slide.classList.toggle(
        "is-active",
        isActive
      );

      slide.setAttribute(
        "aria-hidden",
        String(!isActive)
      );

      slide.inert = !isActive;
    }
  );

  dots.forEach(
    (dot, index) => {
      const isActive =
        index === activeHeroSlide;

      dot.classList.toggle(
        "is-active",
        isActive
      );

      dot.setAttribute(
        "aria-selected",
        String(isActive)
      );
    }
  );

  if (options.restart !== false) {
    startHeroCarousel();
  }

}


function changeHeroSlide(direction) {

  setHeroSlide(
    activeHeroSlide +
    Number(direction || 0)
  );

}


function toggleHeroCarouselPause() {

  heroCarouselPaused =
    !heroCarouselPaused;

  const button =
    document.getElementById(
      "heroCarouselPause"
    );

  if (button) {
    button.setAttribute(
      "aria-pressed",
      String(heroCarouselPaused)
    );

    button.setAttribute(
      "aria-label",
      heroCarouselPaused
        ? "Resume automatic slides"
        : "Pause automatic slides"
    );

    button.textContent =
      heroCarouselPaused
        ? "▶"
        : "❚❚";
  }

  if (heroCarouselPaused) {
    stopHeroCarousel();
  } else {
    startHeroCarousel();
  }

}


function setupHeroCarousel() {

  const carousel =
    document.querySelector(
      ".hero-carousel"
    );

  if (!carousel) {
    return;
  }

  let touchStartX = null;

  setHeroSlide(
    0,
    { restart: false }
  );

  startHeroCarousel();

  carousel.addEventListener(
    "mouseenter",
    stopHeroCarousel
  );

  carousel.addEventListener(
    "mouseleave",
    startHeroCarousel
  );

  carousel.addEventListener(
    "focusin",
    stopHeroCarousel
  );

  carousel.addEventListener(
    "focusout",
    event => {
      if (
        !carousel.contains(
          event.relatedTarget
        )
      ) {
        startHeroCarousel();
      }
    }
  );

  carousel.addEventListener(
    "keydown",
    event => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeHeroSlide(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        changeHeroSlide(1);
      }
    }
  );

  carousel.addEventListener(
    "touchstart",
    event => {
      touchStartX =
        event.changedTouches[0]
          ?.clientX ?? null;
    },
    { passive: true }
  );

  carousel.addEventListener(
    "touchend",
    event => {
      if (touchStartX === null) {
        return;
      }

      const touchEndX =
        event.changedTouches[0]
          ?.clientX ?? touchStartX;

      const distance =
        touchEndX - touchStartX;

      touchStartX = null;

      if (Math.abs(distance) < 50) {
        return;
      }

      changeHeroSlide(
        distance > 0 ? -1 : 1
      );
    },
    { passive: true }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        stopHeroCarousel();
      } else {
        startHeroCarousel();
      }
    }
  );

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

window.openHeaderSearch =
  openHeaderSearch;

window.closeHeaderSearch =
  closeHeaderSearch;

window.submitHeaderSearch =
  submitHeaderSearch;

window.renderHeaderSearchSuggestions =
  renderHeaderSearchSuggestions;

window.openHeaderSearchProduct =
  openHeaderSearchProduct;

window.applyQuickProductFilter =
  applyQuickProductFilter;

window.removeProductFilter =
  removeProductFilter;

window.openProductFilters =
  openProductFilters;

window.closeProductFilters =
  closeProductFilters;

window.applyProductFilters =
  applyProductFilters;

window.resetProductFilters =
  resetProductFilters;

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

window.addProductDetailToCart =
  addProductDetailToCart;

window.addWishlistItemToCart =
  addWishlistItemToCart;

window.setHeroSlide =
  setHeroSlide;

window.changeHeroSlide =
  changeHeroSlide;

window.toggleHeroCarouselPause =
  toggleHeroCarouselPause;


document.addEventListener("click", event => {
  const panel =
    document.getElementById(
      "headerSearchPanel"
    );

  const button =
    document.getElementById(
      "searchButton"
    );

  if (
    !panel ||
    panel.hidden ||
    panel.contains(event.target) ||
    button?.contains(event.target)
  ) {
    return;
  }

  closeHeaderSearch();
});


document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeProductDetail();
    closeWishlist();
    closeHeaderSearch();
  }
});


// ==========================================
// START STORE
// ==========================================

updateCartCount();
updateWishlistCount();
renderCart();
renderWishlist();
setupHeroCarousel();
loadProducts();
