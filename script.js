// Constants
const API_URL =
  "https://3sb655pz3a.execute-api.ap-southeast-2.amazonaws.com/live/product";
const CACHE_KEY = "product_data";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const API_CALL_LIMIT_KEY = "api_call_count";
const API_CALL_LIMIT = 5; // Limit to 5 API calls per hour
const LAST_API_CALL_TIMESTAMP_KEY = "last_api_call_timestamp";

// Global Variables
let cart = [];
let selectedSize = "";

// --- Helper Functions ---

/**
 * Checks if we can make an API call based on the rate limit and cache.
 */
function canMakeApiCall() {
  const now = Date.now();
  const lastCallTimestamp = localStorage.getItem(LAST_API_CALL_TIMESTAMP_KEY);
  const callCount = parseInt(localStorage.getItem(API_CALL_LIMIT_KEY), 10) || 0;

  // If 1 hour has passed since the last API call, reset the counter
  if (!lastCallTimestamp || now - lastCallTimestamp > CACHE_TTL) {
    localStorage.setItem(API_CALL_LIMIT_KEY, "0"); // Reset API call count
    localStorage.setItem(LAST_API_CALL_TIMESTAMP_KEY, now.toString()); // Update timestamp
    return true;
  }

  // Check if the API call limit has been reached
  return callCount < API_CALL_LIMIT;
}

/**
 * Increments the count of API calls made in the current hour.
 */
function incrementApiCallCount() {
  const callCount = parseInt(localStorage.getItem(API_CALL_LIMIT_KEY), 10) || 0;
  localStorage.setItem(API_CALL_LIMIT_KEY, (callCount + 1).toString());
}

/**
 * Fetches product data either from cache or by making an API call.
 */
async function fetchProductData() {
  const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY));
  const now = Date.now();

  // Return cached data if it's still valid (within the TTL)
  if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
    return cachedData.data;
  }

  // Check if we can make an API call within the rate limit
  if (!canMakeApiCall()) {
    alert("API rate limit reached. Please try again later.");
    return cachedData ? cachedData.data : null;
  }

  // Fetch fresh product data from API
  const response = await fetch(API_URL);
  const data = await response.json();

  // Cache the new data and update the API call count
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: now }));
  incrementApiCallCount();

  return data;
}

// --- Rendering Functions ---

/**
 * Renders the product details on the page.
 */
async function renderProductDetails() {
  const product = await fetchProductData();

  if (!product) return; // If no product data is available, exit

  // Update the product details on the page
  document.getElementById("product-image").src = product.imageURL;
  document.getElementById("product-title").textContent = product.title;
  document.getElementById("product-description").textContent =
    product.description;
  document.getElementById("product-price").textContent = `$${product.price}`;

  // Render size options for the product
  const sizeOptions = document.getElementById("size-options");
  product.sizeOptions.forEach((size) => {
    const button = document.createElement("button");
    button.textContent = size.label;
    button.dataset.size = size.label;
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".sizes button")
        .forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
      selectedSize = size.label; // Store selected size
    });
    sizeOptions.appendChild(button);
  });
}

/**
 * Adds the selected product to the cart.
 */
function addToCart() {
  if (!selectedSize) {
    alert("Please select a size!");
    return;
  }

  // Check if the selected size already exists in the cart
  const existingItem = cart.find((item) => item.size === selectedSize);
  if (existingItem) {
    existingItem.quantity += 1; // Increment quantity if already in cart
  } else {
    // Add new item to the cart
    cart.push({
      name: "Classic Tee",
      size: selectedSize,
      price: 75,
      quantity: 1,
    });
  }

  renderCart(); // Update the cart UI
}

/**
 * Renders the cart with all added items.
 */
function renderCart() {
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const cartCount = document.getElementById("cart-count");

  cartItems.innerHTML = ""; // Clear existing cart items
  let total = 0;
  let count = 0;

  // Render each item in the cart
  cart.forEach((item) => {
    total += item.price * item.quantity;
    count += item.quantity;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.name} (${item.size})</span>
      <input type="number" min="1" value="${item.quantity}" data-size="${
      item.size
    }">
      <span>$${item.price * item.quantity}</span>
    `;

    cartItems.appendChild(li);

    // Allow quantity change in the cart
    li.querySelector("input").addEventListener("input", (e) => {
      const quantity = parseInt(e.target.value, 10);
      if (quantity <= 0) {
        // Remove item if quantity is less than or equal to 0
        cart = cart.filter((i) => i.size !== item.size);
      } else {
        item.quantity = quantity; // Update the quantity
      }
      renderCart(); // Re-render the cart
    });
  });

  // Display the total price and item count in the cart
  cartTotal.textContent = `Total: $${total}`;
  cartCount.textContent = count;
}

// --- Event Listeners ---

// Toggle the visibility of the cart dropdown
document.getElementById("cart-toggle").addEventListener("click", () => {
  document.getElementById("cart-dropdown").classList.toggle("hidden");
});

// Close the cart dropdown when clicking outside of it
document.addEventListener("click", (event) => {
  const cartDropdown = document.getElementById("cart-dropdown");
  const cartToggle = document.getElementById("cart-toggle");

  if (
    !cartDropdown.contains(event.target) &&
    !cartToggle.contains(event.target)
  ) {
    cartDropdown.classList.add("hidden");
  }
});

// Initialize the page by rendering product details and setting up event listeners
document.getElementById("add-to-cart").addEventListener("click", addToCart);
renderProductDetails(); // Load the product details when the page loads
