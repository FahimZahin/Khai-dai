import { useMemo, useState } from "react";

import "./App.css";
import ManagerDashboard from "./ManagerDashboard";

import AdminQrPage from "./AdminQrPage";
import OrderTracking from "./OrderTracking";

import TableSessionBanner from "./TableSessionBanner";

// ==========================================

// TYPES

// ==========================================

type SpiceLevel = "Not Spicy" | "Mild" | "Medium" | "Hot";

type AddOn = {

  id: string;

  name: string;

  price: number;

};

type Food = {

  id: number;

  name: string;

  category: string;

  description: string;

  price: number;

  time: number;

  defaultSpice: SpiceLevel;

  spiceOptions: SpiceLevel[];

  ingredients: string[];

  allergens: string[];

  addons: AddOn[];

  image: string;

};

type CartItem = {

  food: Food;

  quantity: number;

  spiceLevel: SpiceLevel;

  selectedAddons: AddOn[];

};

type CreatedOrder = {
  id: number;
  orderNumber: string;
  tableNumber: number;
  status: string;
  totalAmount: number | string;
  totalPreparationWorkMinutes: number;
  createdAt: string;
};

const API_BASE_URL =
  `${window.location.protocol}//${window.location.hostname}:8090`;

const tableToken =
  new URLSearchParams(window.location.search).get("tableToken")?.trim() ?? "";

const trackingStorageKey = tableToken
  ? `khaidai.activeOrder.${tableToken}`
  : "";  

const allSpiceLevels: SpiceLevel[] = [

  "Not Spicy",

  "Mild",

  "Medium",

  "Hot",

];

// ==========================================

// HELPER FUNCTIONS

// ==========================================

const getAddOnTotal = (addons: AddOn[]) =>

  addons.reduce((total, addon) => total + addon.price, 0);

const getCartItemKey = (item: CartItem) => {

  const addonIds = item.selectedAddons

    .map((addon) => addon.id)

    .sort()

    .join(",");

  return `${item.food.id}|${item.spiceLevel}|${addonIds}`;

};

// ==========================================

// FOOD DATA

// ==========================================

const foods: Food[] = [

  {

    id: 1,

    name: "Chicken Biryani",

    category: "Main Course",

    description:

      "Fragrant basmati rice with tender chicken and aromatic spices.",

    price: 320,

    time: 25,

    defaultSpice: "Medium",

    spiceOptions: allSpiceLevels,

    ingredients: [

      "Basmati rice",

      "Chicken",

      "Yogurt",

      "Onion",

      "Ginger and garlic",

      "Biryani spices",

      "Fresh coriander",

    ],

    allergens: ["Milk (yogurt)"],

    addons: [

      { id: "extra-chicken", name: "Extra chicken", price: 120 },

      { id: "boiled-egg", name: "Boiled egg", price: 25 },

      { id: "extra-rice", name: "Extra rice", price: 60 },

      { id: "raita", name: "Extra raita", price: 30 },

    ],

    image:

      "https://images.unsplash.com/photo-1559528896-c5310744cce8?w=700&auto=format&fit=crop",

  },

  {

    id: 2,

    name: "Beef Burger",

    category: "Fast Food",

    description:

      "Juicy beef patty with fresh lettuce, cheese and special sauce.",

    price: 280,

    time: 15,

    defaultSpice: "Mild",

    spiceOptions: allSpiceLevels,

    ingredients: [

      "Beef patty",

      "Burger bun",

      "Cheese",

      "Lettuce",

      "Tomato",

      "Onion",

      "Special sauce",

    ],

    allergens: [

      "Wheat (bun)",

      "Milk (cheese)",

      "Check sauce ingredients",

    ],

    addons: [

      { id: "extra-cheese", name: "Extra cheese", price: 40 },

      { id: "extra-patty", name: "Extra beef patty", price: 120 },

      { id: "jalapenos", name: "Jalapeños", price: 25 },

      { id: "extra-sauce", name: "Extra sauce", price: 20 },

    ],

    image:

      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700",

  },

  {

    id: 3,

    name: "Chicken Pasta",

    category: "Main Course",

    description: "Creamy pasta with grilled chicken and herbs.",

    price: 350,

    time: 20,

    defaultSpice: "Mild",

    spiceOptions: allSpiceLevels,

    ingredients: [

      "Pasta",

      "Chicken",

      "Cream",

      "Parmesan cheese",

      "Garlic",

      "Mixed herbs",

    ],

    allergens: ["Wheat", "Milk"],

    addons: [

      { id: "extra-chicken", name: "Extra chicken", price: 100 },

      { id: "extra-cheese", name: "Extra cheese", price: 40 },

      { id: "mushrooms", name: "Mushrooms", price: 50 },

      { id: "garlic-bread", name: "Garlic bread", price: 60 },

    ],

    image:

      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=700",

  },

  {

    id: 4,

    name: "Grilled Chicken",

    category: "Main Course",

    description:

      "Tender grilled chicken served with fresh vegetables.",

    price: 420,

    time: 30,

    defaultSpice: "Medium",

    spiceOptions: allSpiceLevels,

    ingredients: [

      "Chicken",

      "Olive oil",

      "Garlic",

      "Lemon",

      "Mixed herbs",

      "Seasonal vegetables",

    ],

    allergens: ["Verify marinade and seasoning"],

    addons: [

      { id: "extra-chicken", name: "Extra chicken portion", price: 150 },

      { id: "extra-vegetables", name: "Extra vegetables", price: 50 },

      { id: "mashed-potatoes", name: "Mashed potatoes", price: 60 },

      { id: "extra-sauce", name: "Extra sauce", price: 25 },

    ],

    image:

      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=700",

  },

  {

    id: 5,

    name: "French Fries",

    category: "Snacks",

    description:

      "Golden crispy potato fries with a delicious dip.",

    price: 150,

    time: 10,

    defaultSpice: "Not Spicy",

    spiceOptions: allSpiceLevels,

    ingredients: [

      "Potatoes",

      "Vegetable oil",

      "Salt",

    ],

    allergens: ["Check shared fryer and seasoning"],

    addons: [

      { id: "extra-fries", name: "Extra fries", price: 80 },

      { id: "cheese-dip", name: "Cheese dip", price: 30 },

      { id: "spicy-seasoning", name: "Spicy seasoning", price: 15 },

    ],

    image:

      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=700",

  },

  {

    id: 6,

    name: "Fresh Lemonade",

    category: "Drinks",

    description:

      "Refreshing fresh lemon juice with a hint of mint.",

    price: 100,

    time: 5,

    defaultSpice: "Not Spicy",

    spiceOptions: ["Not Spicy"],

    ingredients: [

      "Fresh lemon",

      "Water",

      "Sugar",

      "Mint leaves",

      "Ice",

    ],

    allergens: ["Not yet verified"],

    addons: [

      { id: "extra-lemon", name: "Extra lemon", price: 15 },

      { id: "extra-mint", name: "Extra mint", price: 10 },

      { id: "extra-sugar", name: "Extra sugar", price: 0 },

    ],

    image:

      "https://images.unsplash.com/photo-1656936637945-571e3f0893f9?w=700&auto=format&fit=crop",

  },

];

// ==========================================

// CATEGORIES

// ==========================================

const categories = [

  "All",

  "Main Course",

  "Fast Food",

  "Snacks",

  "Drinks",

];

// ==========================================

// MAIN APP

// ==========================================

function CustomerApp() {

  const [activeCategory, setActiveCategory] = useState("All");

  const [search, setSearch] = useState("");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const [selectedSpiceLevel, setSelectedSpiceLevel] =

    useState<SpiceLevel>("Medium");

  const [selectedAddons, setSelectedAddons] = useState<AddOn[]>([]);

  const [customerNote, setCustomerNote] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

type CheckoutPaymentMethod = "CASH" | "SSLCOMMERZ";

const [paymentMethod, setPaymentMethod] =
  useState<CheckoutPaymentMethod>("CASH");

const [customerName, setCustomerName] = useState("");
const [customerEmail, setCustomerEmail] = useState("");
const [customerPhone, setCustomerPhone] = useState("");
const [customerAddress, setCustomerAddress] = useState("");
const [customerCity, setCustomerCity] = useState("");
const [customerPostcode, setCustomerPostcode] = useState("");

const [pendingPaymentOrderNumber, setPendingPaymentOrderNumber] =
  useState<string | null>(null);


const [trackingOrderNumber, setTrackingOrderNumber] =
  useState<string | null>(() => {
    const returnedOrderNumber =
      new URLSearchParams(window.location.search)
        .get("orderNumber");

    if (returnedOrderNumber) {
      return returnedOrderNumber;
    }

    if (!trackingStorageKey) return null;

    try {
      return window.sessionStorage.getItem(trackingStorageKey);
    } catch {
      return null;
    }
  });


  // ==========================================

  // OPEN FOOD DETAILS

  // ==========================================

  const openFoodDetails = (food: Food) => {

    setSelectedFood(food);

    setSelectedSpiceLevel(food.defaultSpice);

    setSelectedAddons([]);

  };

  // ==========================================

  // TOGGLE ADD-ON

  // ==========================================

  const toggleAddon = (addon: AddOn) => {

    setSelectedAddons((current) => {

      const alreadySelected = current.some(

        (item) => item.id === addon.id

      );

      if (alreadySelected) {

        return current.filter((item) => item.id !== addon.id);

      }

      return [...current, addon];

    });

  };

  // ==========================================

  // ADD FOOD TO CART

  // ==========================================

  const addToCart = (

    food: Food,

    spiceLevel: SpiceLevel,

    addons: AddOn[]

  ) => {
    setOrderError("");

    const normalizedAddons = [...addons].sort((a, b) =>

      a.id.localeCompare(b.id)

    );

    const newItem: CartItem = {

      food,

      quantity: 1,

      spiceLevel,

      selectedAddons: normalizedAddons,

    };

    const newKey = getCartItemKey(newItem);

    setCartItems((currentItems) => {

      const existingItem = currentItems.find(

        (item) => getCartItemKey(item) === newKey

      );

      if (existingItem) {

        return currentItems.map((item) =>

          getCartItemKey(item) === newKey

            ? { ...item, quantity: item.quantity + 1 }

            : item

        );

      }

      return [...currentItems, newItem];

    });

  };

  // ==========================================

  // UPDATE CART QUANTITY

  // ==========================================

  const updateCartQuantity = (

    itemKey: string,

    change: number

  ) => {

    setCartItems((currentItems) =>

      currentItems

        .map((item) =>

          getCartItemKey(item) === itemKey

            ? { ...item, quantity: item.quantity + change }

            : item

        )

        .filter((item) => item.quantity > 0)

    );

  };

  // ==========================================

  // REMOVE CART ITEM

  // ==========================================

  const removeFromCart = (itemKey: string) => {

    setCartItems((currentItems) =>

      currentItems.filter(

        (item) => getCartItemKey(item) !== itemKey

      )

    );

  };

  // ==========================================

  // CHANGE SPICE LEVEL IN CART

  // ==========================================

  const updateCartSpice = (

    itemKey: string,

    newSpice: SpiceLevel

  ) => {

    setCartItems((currentItems) => {

      const sourceItem = currentItems.find(

        (item) => getCartItemKey(item) === itemKey

      );

      if (!sourceItem || sourceItem.spiceLevel === newSpice) {

        return currentItems;

      }

      const updatedItem: CartItem = {

        ...sourceItem,

        spiceLevel: newSpice,

      };

      const targetKey = getCartItemKey(updatedItem);

      const targetExists = currentItems.some(

        (item) => getCartItemKey(item) === targetKey

      );

      if (targetExists) {

        return currentItems

          .filter((item) => getCartItemKey(item) !== itemKey)

          .map((item) =>

            getCartItemKey(item) === targetKey

              ? {

                  ...item,

                  quantity:

                    item.quantity + sourceItem.quantity,

                }

              : item

          );

      }

      return currentItems.map((item) =>

        getCartItemKey(item) === itemKey ? updatedItem : item

      );

    });

  };

  // ==========================================

  // CART CALCULATIONS

  // ==========================================

  const cartCount = cartItems.reduce(

    (total, item) => total + item.quantity,

    0

  );

  const subtotal = cartItems.reduce(

    (total, item) => {

      const unitPrice =

        item.food.price + getAddOnTotal(item.selectedAddons);

      return total + unitPrice * item.quantity;

    },

    0

  );

const estimatedPrepTime = cartItems.reduce(
    (longest, item) => Math.max(longest, item.food.time),
    0
);

  const selectedAddOnTotal = getAddOnTotal(selectedAddons);

  // ==========================================

  // SUBMIT CUSTOMER ORDER TO BACKEND

  // ==========================================

 
const submitOrder = async () => {
  if (!tableToken) {
    setOrderError(
      "Please scan the QR code on your restaurant table."
    );
    return;
  }

  if (!pendingPaymentOrderNumber && cartItems.length === 0) {
    setOrderError("Your cart is empty.");
    return;
  }

  if (paymentMethod === "SSLCOMMERZ") {
    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerPhone.trim() ||
      !customerAddress.trim() ||
      !customerCity.trim()
    ) {
      setOrderError("Please complete all required customer information.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
      setOrderError("Please enter a valid email address.");
      return;
    }

    if (customerPhone.trim().length < 6 ||
        customerPhone.trim().length > 20) {
      setOrderError("Please enter a valid phone number.");
      return;
    }
  }

  setIsSubmittingOrder(true);
  setOrderError("");

  try {
    let orderNumber = pendingPaymentOrderNumber;

    // CREATE ORDER ONLY ONCE
    if (!orderNumber) {
      const payload = {
        tableToken,
        customerNote: customerNote.trim() || null,
        paymentMethod,

        items: cartItems.map((item) => ({
          foodId: item.food.id,
          quantity: item.quantity,
          spiceLevel: item.spiceLevel,

          selectedAddons: item.selectedAddons.map((addon) => ({
            id: addon.id,
          })),
        })),
      };

      const orderResponse = await fetch(
        `${API_BASE_URL}/api/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const orderText = await orderResponse.text();
      let orderData: any = null;

      try {
        orderData = orderText ? JSON.parse(orderText) : null;
      } catch {
        orderData = null;
      }

      if (!orderResponse.ok) {
        throw new Error(
          orderData?.detail ||
          orderData?.message ||
          orderData?.error ||
          `Order failed: ${orderResponse.status}`
        );
      }

const createdOrder = orderData as CreatedOrder;

if (
  typeof createdOrder?.orderNumber !== "string" ||
  !createdOrder.orderNumber.trim()
) {
  throw new Error("No valid order number received.");
}

const confirmedOrderNumber = createdOrder.orderNumber.trim();
orderNumber = confirmedOrderNumber;

      if (paymentMethod === "SSLCOMMERZ") {
        setPendingPaymentOrderNumber(orderNumber);
      }
    }

    // CASH PAYMENT: PRESERVE EXISTING FLOW
    if (paymentMethod === "CASH") {
      setTrackingOrderNumber(orderNumber);

      try {
        if (trackingStorageKey) {
          window.sessionStorage.setItem(
            trackingStorageKey,
            orderNumber
          );
        }
      } catch {
        // Tracking remains available in React state.
      }

      setCartItems([]);
      setCustomerNote("");
      setOrderError("");
      return;
    }

    // ONLINE PAYMENT: INITIATE SSLCOMMERZ
    const paymentResponse = await fetch(
      `${API_BASE_URL}/api/payments/initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          orderNumber,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerCity: customerCity.trim(),
          customerPostcode: customerPostcode.trim() || null,
        }),
      }
    );

    const paymentText = await paymentResponse.text();
    let paymentData: any = null;

    try {
      paymentData = paymentText ? JSON.parse(paymentText) : null;
    } catch {
      paymentData = null;
    }

    if (!paymentResponse.ok) {
      throw new Error(
        paymentData?.detail ||
        paymentData?.message ||
        paymentData?.error ||
        `Payment initiation failed: ${paymentResponse.status}`
      );
    }

    if (!paymentData?.gatewayPageUrl) {
      throw new Error("SSLCommerz did not return a gateway URL.");
    }

    const gatewayUrl = new URL(paymentData.gatewayPageUrl);

    if (gatewayUrl.protocol !== "https:") {
      throw new Error("Invalid secure payment gateway URL.");
    }

    // SAVE ORDER NUMBER BEFORE REDIRECT
    setTrackingOrderNumber(orderNumber);

    try {
      if (trackingStorageKey) {
        window.sessionStorage.setItem(
          trackingStorageKey,
          orderNumber
        );
      }
    } catch {
      // Continue with the gateway redirect.
    }

    setPendingPaymentOrderNumber(null);
    setCartItems([]);
    setCustomerNote("");
    setIsCartOpen(false);

    // REDIRECT TO SSLCOMMERZ
    window.location.assign(gatewayUrl.toString());

  } catch (error) {
    setOrderError(
      error instanceof Error
        ? error.message
        : "Something went wrong during checkout."
    );
  } finally {
    setIsSubmittingOrder(false);
  }
};



  // ==========================================

  // FILTER FOOD

  // ==========================================

  const filteredFoods = useMemo(() => {

    return foods.filter((food) => {

      const matchesCategory =

        activeCategory === "All" ||

        food.category === activeCategory;

      const matchesSearch = food.name

        .toLowerCase()

        .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;

    });

  }, [activeCategory, search]);

  // ==========================================

  // SCROLL TO MENU

  // ==========================================

  const scrollToMenu = () => {

    document.getElementById("menu")?.scrollIntoView({

      behavior: "smooth",

    });

  };

  // ==========================================

  // RENDER

  // ==========================================

  return (

    <div className="app">

      {/* NAVBAR */}

      <header className="navbar">

        <a className="logo" href="#">

          Khai<span>-</span>Dai

          <span className="logo-dot">.</span>

        </a>

        <nav className="nav-links">

          <a href="#home">Home</a>

          <a href="#menu">Our Menu</a>

          <a href="#about">About Us</a>

        </nav>

        <button

          className="cart-button"

          onClick={() => setIsCartOpen(true)}
        >

          <span>🛒</span>

          My Order

          <span className="cart-count">{cartCount}</span>

        </button>

      </header>

      <main>

        {/* HERO */}

        <section className="hero" id="home">

          <div className="hero-content">

            <span className="eyebrow">

              GOOD FOOD. GOOD MOOD.

            </span>

            <h1>

              Delicious food,

              <br />

              <span>made with love.</span>

            </h1>

            <p>

              Fresh ingredients, amazing flavours and

              unforgettable meals. Discover your next

              favourite dish at Khai-Dai.

            </p>

            <button

              className="primary-button"

              onClick={scrollToMenu}

            >

              Explore Our Menu <span>→</span>

            </button>

            <div className="hero-note">

              <span>✦</span>

              Freshly prepared for you

            </div>

          </div>

          <div className="hero-image">

            <img

              src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1000"

              alt="Freshly prepared restaurant food"

            />

            <div className="floating-card">

              <span>🍽️</span>

              <div>

                <strong>Made fresh</strong>

                <small>Every single order</small>

              </div>

            </div>

          </div>

        </section>

        {/* MENU */}

        <section className="menu-section" id="menu">

          <div className="section-heading">

            <div>

              <span className="eyebrow">

                DISCOVER OUR FOOD

              </span>

              <h2>

                Explore our menu<span>.</span>

              </h2>

              <p>

                Something delicious is waiting for you.

              </p>

            </div>

            <div className="search-box">

              <span>⌕</span>

              <input

                type="search"

                placeholder="Search your favourite food..."

                value={search}

                onChange={(e) => setSearch(e.target.value)}

              />

            </div>

          </div>

          {/* CATEGORY FILTER */}

          <div className="category-list">

            {categories.map((category) => (

              <button

                key={category}

                className={

                  activeCategory === category

                    ? "category-button active"

                    : "category-button"

                }

                onClick={() => setActiveCategory(category)}

              >

                {category}

              </button>

            ))}

          </div>

          {/* FOOD CARDS */}

          <div className="food-grid">

            {filteredFoods.map((food) => (

              <article

                className="food-card"

                key={food.id}

              >

                <div className="food-image">

                  <img

                    src={food.image}

                    alt={food.name}

                  />

                  <span className="food-time">

                    ◷ {food.time} min

                  </span>

                </div>

                <div className="food-info">

                  <span className="food-category">

                    {food.category}

                  </span>

                  <h3>{food.name}</h3>

                  <p>{food.description}</p>

                  <div className="food-meta">

                    <span>🌶️ {food.defaultSpice}</span>

                    <strong>৳{food.price}</strong>

                  </div>

                  <button

                    className="details-button"

                    onClick={() => openFoodDetails(food)}

                  >

                    View ingredients & details

                  </button>

                  <button

                    className="add-button"

                    onClick={() => openFoodDetails(food)}

                  >

                    + Customize & add to order

                  </button>

                </div>

              </article>

            ))}

          </div>

          {filteredFoods.length === 0 && (

            <div className="empty-state">

              <span>🍽️</span>

              <h3>No dishes found</h3>

              <p>Try searching for something else.</p>

            </div>

          )}

        </section>

        {/* ABOUT */}

        <section className="about-section" id="about">

          <span className="eyebrow">

            WELCOME TO KHAI-DAI

          </span>

          <h2>

            Good food brings people together.

          </h2>

          <p>

            We believe every meal should be a memorable

            experience. Explore our menu and let us prepare

            something special for you.

          </p>

        </section>

      </main>

      {/* =================================

          FOOD DETAILS, SPICE AND ADD-ONS

      ================================= */}

      {selectedFood && (

        <div

          className="modal-backdrop"

          onClick={() => setSelectedFood(null)}

        >

          <div

            className="food-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="food-modal-title"

            onClick={(e) => e.stopPropagation()}

          >

            <button

              className="modal-close"

              onClick={() => setSelectedFood(null)}

              aria-label="Close food details"

            >

              ×

            </button>

            <img

              className="modal-food-image"

              src={selectedFood.image}

              alt={selectedFood.name}

            />

            <div className="modal-content">

              <span className="food-category">

                {selectedFood.category}

              </span>

              <h2 id="food-modal-title">

                {selectedFood.name}

              </h2>

              <p>{selectedFood.description}</p>

              <div className="detail-grid">

                <div className="detail-item">

                  <span>Preparation time</span>

                  <strong>

                    ◷ {selectedFood.time} minutes

                  </strong>

                </div>

                <div className="detail-item">

                  <span>Base price</span>

                  <strong>

                    ৳{selectedFood.price}

                  </strong>

                </div>

              </div>

              {/* SPICE SELECTOR */}

              <div className="spice-selector">

                <h3>🌶️ Choose your spice level</h3>

                <p>

                  How spicy would you like your food?

                </p>

                <div className="spice-options">

                  {selectedFood.spiceOptions.map((level) => (

                    <button

                      key={level}

                      type="button"

                      className={

                        selectedSpiceLevel === level

                          ? "spice-option active"

                          : "spice-option"

                      }

                      onClick={() => setSelectedSpiceLevel(level)}

                    >

                      {level === "Not Spicy"

                        ? "😊"

                        : level === "Mild"

                        ? "🌶️"

                        : level === "Medium"

                        ? "🌶️🌶️"

                        : "🌶️🌶️🌶️"}

                      <span>{level}</span>

                    </button>

                  ))}

                </div>

                <p className="spice-note">

                  Selected: <strong>{selectedSpiceLevel}</strong>

                </p>

              </div>

              {/* ADD-ON SELECTOR */}

              <div className="addon-selector">

                <div className="addon-heading">

                  <div>

                    <h3>➕ Customize your food</h3>

                    <p>

                      Choose any extras you would like.

                    </p>

                  </div>

                  <span className="optional-label">

                    OPTIONAL

                  </span>

                </div>

                <div className="addon-options">

                  {selectedFood.addons.map((addon) => {

                    const isSelected = selectedAddons.some(

                      (item) => item.id === addon.id

                    );

                    return (

                      <label

                        key={addon.id}

                        className={

                          isSelected

                            ? "addon-option selected"

                            : "addon-option"

                        }

                      >

                        <input

                          type="checkbox"

                          checked={isSelected}

                          onChange={() => toggleAddon(addon)}

                        />

                        <span className="addon-option-info">

                          <span className="addon-name">

                            {addon.name}

                          </span>

                          <span className="addon-price">

                            {addon.price === 0

                              ? "Free"

                              : `+৳${addon.price}`}

                          </span>

                        </span>

                      </label>

                    );

                  })}

                </div>

                <div className="addon-total">

                  <span>Selected add-ons</span>

                  <strong>

                    +৳{selectedAddOnTotal}

                  </strong>

                </div>

              </div>

              {/* INGREDIENTS */}

              <div className="detail-list">

                <h3>🥗 Ingredients</h3>

                <ul>

                  {selectedFood.ingredients.map((ingredient) => (

                    <li key={ingredient}>{ingredient}</li>

                  ))}

                </ul>

              </div>

              {/* ALLERGENS */}

              <div className="detail-list allergen-section">

                <h3>⚠️ Allergens & kitchen checks</h3>

                <ul>

                  {selectedFood.allergens.map((allergen) => (

                    <li key={allergen}>{allergen}</li>

                  ))}

                </ul>

              </div>

              <p className="demo-warning">

                Sample menu information and add-on prices.

                Confirm actual ingredients, allergens and

                available customizations with restaurant staff.

              </p>

              {/* FINAL PRICE */}

              <div className="customized-price">

                <span>Total per serving</span>

                <strong>

                  ৳{selectedFood.price + selectedAddOnTotal}

                </strong>

              </div>

              <button

                className="modal-add-button"

                onClick={() => {

                  addToCart(

                    selectedFood,

                    selectedSpiceLevel,

                    selectedAddons

                  );

                  setSelectedFood(null);

                }}

              >

                + Add to order — ৳

                {selectedFood.price + selectedAddOnTotal}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================

          SHOPPING CART

      ================================= */}

      {isCartOpen && (

        <div

          className="modal-backdrop"

          onClick={() => setIsCartOpen(false)}

        >

          <section

            className="cart-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="cart-title"

            onClick={(e) => e.stopPropagation()}

          >

            {/* CART HEADER */}

            <div className="cart-header">

              <div>

                <span className="eyebrow">

                  YOUR SELECTION

                </span>

                <h2 id="cart-title">My Order</h2>

              </div>

              <button

                className="modal-close"

                onClick={() => setIsCartOpen(false)}

                aria-label="Close cart"

              >

                ×

              </button>

            </div>

            {/* ORDER SUCCESS / EMPTY CART / CART ITEMS */}

{trackingOrderNumber && cartItems.length === 0 ? (

  <OrderTracking
    orderNumber={trackingOrderNumber}

    onContinueBrowsing={() => {
      setIsCartOpen(false);
    }}

    onDone={() => {

      try {
        window.sessionStorage.removeItem(trackingStorageKey);
      } catch {
        // Ignore storage errors.
      }

      setTrackingOrderNumber(null);
      setIsCartOpen(false);

    }}
  />

) : cartItems.length === 0 ? (

              <div className="empty-cart">

                <span>🛒</span>

                <h3>Your cart is empty</h3>

                <p>

                  Discover something delicious from our menu.

                </p>

                <button

                  className="modal-add-button"

                  onClick={() => {

                    setIsCartOpen(false);

                    scrollToMenu();

                  }}

                >

                  Explore Menu

                </button>

              </div>

            ) : (

              <>

                {/* CART ITEMS */}

                <div className="cart-items">

                  {cartItems.map((item) => {

                    const itemKey = getCartItemKey(item);

                    const addonTotal = getAddOnTotal(

                      item.selectedAddons

                    );

                    const unitPrice =

                      item.food.price + addonTotal;

                    return (

                      <div

                        className="cart-item"

                        key={itemKey}

                      >

                        <img

                          src={item.food.image}

                          alt={item.food.name}

                        />

                        <div className="cart-item-info">

                          <h3>{item.food.name}</h3>

                          <strong>

                            ৳{unitPrice * item.quantity}

                          </strong>

                          <p className="cart-spice-label">

                            Spice level: {item.spiceLevel}

                          </p>

                          {/* CHANGE SPICE */}

                          <label className="cart-spice-control">

                            <span>Change spice:</span>

                            <select

                              value={item.spiceLevel}

                              onChange={(e) =>

                                updateCartSpice(

                                  itemKey,

                                  e.target.value as SpiceLevel

                                )

                              }

                            >

                              {item.food.spiceOptions.map((level) => (

                                <option key={level} value={level}>

                                  {level}

                                </option>

                              ))}

                            </select>

                          </label>

                          {/* SELECTED ADD-ONS */}

                          {item.selectedAddons.length > 0 && (

                            <div className="cart-addon-list">

                              <span>Extras:</span>

                              {item.selectedAddons.map((addon) => (

                                <p key={addon.id}>

                                  + {addon.name}

                                  {addon.price > 0

                                    ? ` (৳${addon.price})`

                                    : " (Free)"}

                                </p>

                              ))}

                            </div>

                          )}

                          <div className="quantity-controls">

                            <button

                              onClick={() =>

                                updateCartQuantity(itemKey, -1)

                              }

                              aria-label={`Decrease ${item.food.name} quantity`}

                            >

                              −

                            </button>

                            <span>{item.quantity}</span>

                            <button

                              onClick={() =>

                                updateCartQuantity(itemKey, 1)

                              }

                              aria-label={`Increase ${item.food.name} quantity`}

                            >

                              +

                            </button>

                          </div>

                        </div>

                        <button

                          className="remove-item"

                          onClick={() => removeFromCart(itemKey)}

                          aria-label={`Remove ${item.food.name}`}

                          title="Remove item"

                        >

                          ×

                        </button>

                      </div>

                    );

                  })}

                </div>

                {/* CUSTOMER NOTE */}

                <div className="order-note-field">

                  <label htmlFor="customer-order-note">
                    Special instructions (optional)
                  </label>

                  <textarea
                    id="customer-order-note"
                    value={customerNote}
                    onChange={(event) => setCustomerNote(event.target.value)}
                    placeholder="Any instructions for the kitchen?"
                    maxLength={500}
                    rows={3}
                  />

                  <small>{customerNote.length}/500 characters</small>

                </div>


{/* PAYMENT METHOD */}

<div className="payment-method-field">

  <h3>Choose payment method</h3>

  <div className="payment-method-options">

    <label className="payment-option">
      <input
        type="radio"
        name="paymentMethod"
        value="CASH"
        checked={paymentMethod === "CASH"}
        disabled={!!pendingPaymentOrderNumber}
        onChange={() => setPaymentMethod("CASH")}
      />

      <span>
        <strong>Cash at table</strong>
        <small>Pay directly at the restaurant.</small>
      </span>
    </label>

    <label className="payment-option">
      <input
        type="radio"
        name="paymentMethod"
        value="SSLCOMMERZ"
        checked={paymentMethod === "SSLCOMMERZ"}
        disabled={!!pendingPaymentOrderNumber}
        onChange={() => setPaymentMethod("SSLCOMMERZ")}
      />

      <span>
        <strong>Online payment</strong>
        <small>Secure payment through SSLCommerz.</small>
      </span>
    </label>

  </div>

  {paymentMethod === "SSLCOMMERZ" && (

    <div className="payment-customer-details">

      <h3>Customer information</h3>

      <label>
        Full name *
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={100}
          placeholder="Your full name"
          autoComplete="name"
        />
      </label>

      <label>
        Email address *
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          maxLength={100}
          placeholder="example@email.com"
          autoComplete="email"
        />
      </label>

      <label>
        Phone number *
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          maxLength={20}
          placeholder="01XXXXXXXXX"
          autoComplete="tel"
        />
      </label>

      <label>
        Address *
        <input
          type="text"
          value={customerAddress}
          onChange={(e) => setCustomerAddress(e.target.value)}
          maxLength={200}
          placeholder="Your address"
          autoComplete="street-address"
        />
      </label>

      <label>
        City *
        <input
          type="text"
          value={customerCity}
          onChange={(e) => setCustomerCity(e.target.value)}
          maxLength={80}
          placeholder="Dhaka"
          autoComplete="address-level2"
        />
      </label>

      <label>
        Postcode
        <input
          type="text"
          value={customerPostcode}
          onChange={(e) => setCustomerPostcode(e.target.value)}
          maxLength={20}
          placeholder="Optional"
          autoComplete="postal-code"
        />
      </label>

      <div className="sslcommerz-info">
        <strong>Secure checkout</strong>
        <p>
          You will be redirected to SSLCommerz to complete
          your payment securely.
        </p>
      </div>

    </div>
  )}

  {pendingPaymentOrderNumber && (
    <p className="payment-pending-info">
      Your order has already been created.
      Retry payment to continue with the same order.
    </p>
  )}

</div>


                {/* CART SUMMARY */}

                <div className="cart-summary">

                  <div>

                    <span>Total items</span>

                    <strong>{cartCount}</strong>

                  </div>

                  <div>

                    <span>Subtotal</span>

                    <strong>৳{subtotal}</strong>

                  </div>

                  <div>

                    <span>Estimated preparation time</span>

                    <strong>{estimatedPrepTime} min</strong>

                  </div>

                  <div className="cart-total">

                    <span>Total</span>

                    <strong>৳{subtotal}</strong>

                  </div>

                </div>

                <p className="cart-note">

                  Add-on prices are included in the subtotal.
                  Preparation workload adds the preparation time of each
                  ordered serving. Actual waiting time may differ.

                </p>

                {!tableToken && (
                  <p className="order-submit-error" role="alert">
                    Scan the QR code on your restaurant table before placing an order.
                  </p>
                )}

                {orderError && (
                  <p className="order-submit-error" role="alert">
                    {orderError}
                  </p>
                )}

                <button

                  className="modal-add-button order-submit-button"

                  onClick={submitOrder}

                  disabled={isSubmittingOrder || !tableToken}

                >

{isSubmittingOrder
  ? "Processing..."
  : paymentMethod === "SSLCOMMERZ"
    ? pendingPaymentOrderNumber
      ? "Retry online payment"
      : `Continue to payment — ৳${subtotal}`
    : `Place cash order — ৳${subtotal}`}

                </button>

                <button

                  className="order-continue-button"

                  onClick={() => setIsCartOpen(false)}

                  disabled={isSubmittingOrder}

                >

                  Continue browsing

                </button>

              </>

            )}

          </section>

        </div>

      )}

      {/* FOOTER */}

      <footer className="footer">

        <a className="logo" href="#">

          Khai<span>-</span>Dai

          <span className="logo-dot">.</span>

        </a>

        <p>Made with ❤️ for food lovers.</p>

        <small>

          © 2026 Khai-Dai. All rights reserved.

        </small>

      </footer>

    </div>

  );

}

// ==========================================
// MAIN APPLICATION ROUTING
// ==========================================


function App() {

  // Restaurant manager dashboard
  if (window.location.pathname === "/admin/orders") {
    return <ManagerDashboard />;
  }

  // Administrator QR management page
  if (window.location.pathname === "/admin/qr") {
    return <AdminQrPage />;
  }

  // Customer restaurant application
  return (
    <>
      <TableSessionBanner />
      <CustomerApp />
    </>
  );
}

export default App;
