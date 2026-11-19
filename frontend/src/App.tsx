
import { useMemo, useState } from "react";
import "./App.css";

// ==========================================
// TYPES
// ==========================================

type SpiceLevel = "Not Spicy" | "Mild" | "Medium" | "Hot";

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
  image: string;
};

type CartItem = {
  food: Food;
  quantity: number;
  spiceLevel: SpiceLevel;
};

// ==========================================
// FOOD DATA
// ==========================================

const allSpiceLevels: SpiceLevel[] = [
  "Not Spicy",
  "Mild",
  "Medium",
  "Hot",
];

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

function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const [selectedSpiceLevel, setSelectedSpiceLevel] =
    useState<SpiceLevel>("Medium");

  // ==========================================
  // OPEN FOOD DETAILS
  // ==========================================

  const openFoodDetails = (food: Food) => {
    setSelectedFood(food);
    setSelectedSpiceLevel(food.defaultSpice);
  };

  // ==========================================
  // ADD FOOD TO CART
  // ==========================================

  const addToCart = (
    food: Food,
    spiceLevel: SpiceLevel
  ) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) =>
          item.food.id === food.id &&
          item.spiceLevel === spiceLevel
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.food.id === food.id &&
          item.spiceLevel === spiceLevel
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          food,
          quantity: 1,
          spiceLevel,
        },
      ];
    });
  };

  // ==========================================
  // UPDATE CART QUANTITY
  // ==========================================

  const updateCartQuantity = (
    foodId: number,
    spiceLevel: SpiceLevel,
    change: number
  ) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.food.id === foodId &&
          item.spiceLevel === spiceLevel
            ? {
                ...item,
                quantity: item.quantity + change,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // ==========================================
  // REMOVE CART ITEM
  // ==========================================

  const removeFromCart = (
    foodId: number,
    spiceLevel: SpiceLevel
  ) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) =>
          !(
            item.food.id === foodId &&
            item.spiceLevel === spiceLevel
          )
      )
    );
  };

  // ==========================================
  // CHANGE SPICE LEVEL IN CART
  // ==========================================

  const updateCartSpice = (
    foodId: number,
    oldSpice: SpiceLevel,
    newSpice: SpiceLevel
  ) => {
    if (oldSpice === newSpice) return;

    setCartItems((currentItems) => {
      const sourceItem = currentItems.find(
        (item) =>
          item.food.id === foodId &&
          item.spiceLevel === oldSpice
      );

      if (!sourceItem) return currentItems;

      const existingTarget = currentItems.find(
        (item) =>
          item.food.id === foodId &&
          item.spiceLevel === newSpice
      );

      if (existingTarget) {
        return currentItems
          .filter(
            (item) =>
              !(
                item.food.id === foodId &&
                item.spiceLevel === oldSpice
              )
          )
          .map((item) =>
            item.food.id === foodId &&
            item.spiceLevel === newSpice
              ? {
                  ...item,
                  quantity:
                    item.quantity + sourceItem.quantity,
                }
              : item
          );
      }

      return currentItems.map((item) =>
        item.food.id === foodId &&
        item.spiceLevel === oldSpice
          ? {
              ...item,
              spiceLevel: newSpice,
            }
          : item
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
    (total, item) =>
      total + item.food.price * item.quantity,
    0
  );

  const estimatedPrepTime =
    cartItems.length > 0
      ? Math.max(
          ...cartItems.map((item) => item.food.time)
        )
      : 0;

  // ==========================================
  // FOOD FILTER
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
                    <span>
                      🌶️ {food.defaultSpice}
                    </span>
                    <strong>৳{food.price}</strong>
                  </div>

                  <button
                    className="details-button"
                    onClick={() => openFoodDetails(food)}
                  >
                    Choose spice & view details
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
          FOOD DETAILS AND SPICE MODAL
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
                  <span>Price per serving</span>
                  <strong>
                    ৳{selectedFood.price}
                  </strong>
                </div>

              </div>

              {/* SPICE SELECTOR */}

              <div className="spice-selector">

                <div>
                  <h3>🌶️ Choose your spice level</h3>

                  <p>
                    How spicy would you like your food?
                  </p>
                </div>

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
                Sample menu information. Confirm actual
                ingredients, allergens and spice options
                with restaurant staff before serving.
              </p>

              {/* ADD TO CART */}

              <button
                className="modal-add-button"
                onClick={() => {
                  addToCart(
                    selectedFood,
                    selectedSpiceLevel
                  );
                  setSelectedFood(null);
                }}
              >
                + Add to order — ৳{selectedFood.price}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================
          SHOPPING CART MODAL
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

            {/* EMPTY CART */}

            {cartItems.length === 0 ? (

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

                  {cartItems.map((item) => (

                    <div
                      className="cart-item"
                      key={`${item.food.id}-${item.spiceLevel}`}
                    >

                      <img
                        src={item.food.image}
                        alt={item.food.name}
                      />

                      <div className="cart-item-info">

                        <h3>{item.food.name}</h3>

                        <strong>
                          ৳{item.food.price * item.quantity}
                        </strong>

                        <p className="cart-spice-label">
                          Spice level: {item.spiceLevel}
                        </p>

                        {/* CHANGE SPICE IN CART */}

                        <label className="cart-spice-control">

                          <span>Change spice:</span>

                          <select
                            value={item.spiceLevel}
                            onChange={(e) =>
                              updateCartSpice(
                                item.food.id,
                                item.spiceLevel,
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

                        {/* QUANTITY */}

                        <div className="quantity-controls">

                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item.food.id,
                                item.spiceLevel,
                                -1
                              )
                            }
                            aria-label={`Decrease ${item.food.name} quantity`}
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item.food.id,
                                item.spiceLevel,
                                1
                              )
                            }
                            aria-label={`Increase ${item.food.name} quantity`}
                          >
                            +
                          </button>

                        </div>

                      </div>

                      <button
                        className="remove-item"
                        onClick={() =>
                          removeFromCart(
                            item.food.id,
                            item.spiceLevel
                          )
                        }
                        aria-label={`Remove ${item.food.name}`}
                        title="Remove item"
                      >
                        ×
                      </button>

                    </div>

                  ))}

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
                    <span>Estimated preparation</span>
                    <strong>{estimatedPrepTime} min</strong>
                  </div>

                  <div className="cart-total">
                    <span>Total</span>
                    <strong>৳{subtotal}</strong>
                  </div>

                </div>

                <p className="cart-note">
                  Preparation time is a preliminary estimate
                  assuming dishes can be prepared simultaneously.
                  Actual timing depends on kitchen workload.
                </p>

                <button
                  className="modal-add-button"
                  onClick={() => setIsCartOpen(false)}
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

export default App;
