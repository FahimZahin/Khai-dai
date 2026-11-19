
import { useMemo, useState } from "react";
import "./App.css";

type Food = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  time: number;
  spice: string;
  spicyIngredients: boolean;
  ingredients: string[];
  allergens: string[];
  image: string;
};

const foods: Food[] = [
  {
    id: 1,
    name: "Chicken Biryani",
    category: "Main Course",
    description: "Fragrant basmati rice with tender chicken and aromatic spices.",
    price: 320,
    time: 25,
    spice: "Medium",
    image:
    "https://images.unsplash.com/photo-1559528896-c5310744cce8?w=700&auto=format&fit=crop",
    spicyIngredients: true,
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
  },
  {
    id: 2,
    name: "Beef Burger",
    category: "Fast Food",
    description: "Juicy beef patty with fresh lettuce, cheese and special sauce.",
    price: 280,
    time: 15,
    spice: "Mild",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700",spicyIngredients: false,
ingredients: [
  "Beef patty",
  "Burger bun",
  "Cheese",
  "Lettuce",
  "Tomato",
  "Onion",
  "Special sauce",
],
allergens: ["Wheat (bun)", "Milk (cheese)", "Check sauce ingredients"],
  },
  {
    id: 3,
    name: "Chicken Pasta",
    category: "Main Course",
    description: "Creamy pasta with grilled chicken and herbs.",
    price: 350,
    time: 20,
    spice: "Mild",
    image:
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=700",
      spicyIngredients: false,
ingredients: [
  "Pasta",
  "Chicken",
  "Cream",
  "Parmesan cheese",
  "Garlic",
  "Mixed herbs",
],
allergens: ["Wheat", "Milk"],
  },
  {
    id: 4,
    name: "Grilled Chicken",
    category: "Main Course",
    description: "Tender grilled chicken served with fresh vegetables.",
    price: 420,
    time: 30,
    spice: "Medium",
    image:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=700",
      spicyIngredients: false,
ingredients: [
  "Chicken",
  "Olive oil",
  "Garlic",
  "Lemon",
  "Mixed herbs",
  "Seasonal vegetables",
],
allergens: ["Verify marinade and seasoning"],
  },
  {
    id: 5,
    name: "French Fries",
    category: "Snacks",
    description: "Golden crispy potato fries with a delicious dip.",
    price: 150,
    time: 10,
    spice: "Not spicy",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=700",
      spicyIngredients: false,
ingredients: [
  "Potatoes",
  "Vegetable oil",
  "Salt",
],
allergens: ["Check shared fryer and seasoning"],
  },
  {
    id: 6,
    name: "Fresh Lemonade",
    category: "Drinks",
    description: "Refreshing fresh lemon juice with a hint of mint.",
    price: 100,
    time: 5,
    spice: "Not spicy",
    image:
    "https://images.unsplash.com/photo-1656936637945-571e3f0893f9?w=700&auto=format&fit=crop",
    spicyIngredients: false,
ingredients: [
  "Fresh lemon",
  "Water",
  "Sugar",
  "Mint leaves",
  "Ice",
],
allergens: ["Not yet verified"],
  },
];

const categories = [
  "All",
  "Main Course",
  "Fast Food",
  "Snacks",
  "Drinks",
];

function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const matchesCategory =
        activeCategory === "All" ||
        food.category === activeCategory;

      const matchesSearch =
        food.name.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="app">
      <header className="navbar">
        <a className="logo" href="#">
          Khai<span>-</span>Dai<span className="logo-dot">.</span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#menu">Our Menu</a>
          <a href="#about">About Us</a>
        </nav>

        <button className="cart-button" onClick={scrollToMenu}>
          <span>🛒</span>
          My Order
          <span className="cart-count">{cartCount}</span>
        </button>
      </header>

      <main>
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
              Fresh ingredients, amazing flavours and unforgettable
              meals. Discover your next favourite dish at Khai-Dai.
            </p>

            <button className="primary-button" onClick={scrollToMenu}>
              Explore Our Menu <span>→</span>
            </button>

            <div className="hero-note">
              <span>✦</span> Freshly prepared for you
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

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DISCOVER OUR FOOD</span>
              <h2>Explore our menu<span>.</span></h2>
              <p>Something delicious is waiting for you.</p>
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

          <div className="food-grid">
            {filteredFoods.map((food) => (
              <article className="food-card" key={food.id}>
                <div className="food-image">
                  <img src={food.image} alt={food.name} />
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
                    <span>🌶️ {food.spice}</span>
                    <strong>৳{food.price}</strong>
                  </div>

                  <button
  className="details-button"
  onClick={() => setSelectedFood(food)}
>
  View ingredients & details
</button>

                  <button
                    className="add-button"
                    onClick={() =>
                      setCartCount((count) => count + 1)
                    }
                  >
                    + Add to order
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

        <section className="about-section" id="about">
          <span className="eyebrow">WELCOME TO KHAI-DAI</span>
          <h2>Good food brings people together.</h2>
          <p>
            We believe every meal should be a memorable experience.
            Explore our menu and let us prepare something special
            for you.
          </p>
        </section>
      </main>

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
            <strong>◷ {selectedFood.time} minutes</strong>
          </div>

          <div className="detail-item">
            <span>Spice level</span>
            <strong>🌶️ {selectedFood.spice}</strong>
          </div>

          <div className="detail-item">
            <span>Contains spicy ingredients?</span>
            <strong>
              {selectedFood.spicyIngredients ? "Yes" : "No"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Price</span>
            <strong>৳{selectedFood.price}</strong>
          </div>
        </div>

        <div className="detail-list">
          <h3>🥗 Ingredients</h3>

          <ul>
            {selectedFood.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>

        <div className="detail-list allergen-section">
          <h3>⚠️ Allergens & kitchen checks</h3>

          <ul>
            {selectedFood.allergens.map((allergen) => (
              <li key={allergen}>{allergen}</li>
            ))}
          </ul>
        </div>

        <p className="demo-warning">
          Sample menu information. Please confirm ingredients
          and allergens with restaurant staff.
        </p>

        <button
          className="modal-add-button"
          onClick={() => {
            setCartCount((count) => count + 1);
            setSelectedFood(null);
          }}
        >
          + Add to order — ৳{selectedFood.price}
        </button>
      </div>
    </div>
  </div>
)}

      <footer className="footer">
        <a className="logo" href="#">
          Khai<span>-</span>Dai<span className="logo-dot">.</span>
        </a>
        <p>Made with ❤️ for food lovers.</p>
        <small>© 2026 Khai-Dai. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;
