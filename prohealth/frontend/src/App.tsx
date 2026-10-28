import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { HelpPage, HomePage, LoginPage, OrdersPage, PrescriptionsPage } from './pages'

type Page = 'home' | 'medicines' | 'prescriptions' | 'orders' | 'help' | 'login'
type Theme = 'light' | 'dark'

const pages: Page[] = ['home', 'medicines', 'prescriptions', 'orders', 'help', 'login']

function storedTheme(): Theme {
  const savedTheme = window.localStorage.getItem('prohealth-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function currentPage(): Page {
  const hash = window.location.hash.slice(1)
  return pages.includes(hash as Page) ? hash as Page : 'medicines'
}

const demoAccounts = [
  { name: 'Bill', initials: 'BK', email: 'bill@example.com' },
  { name: 'Amina Njeri', initials: 'AN', email: 'amina@example.com' },
]

type Medicine = {
  id: number
  name: string
  genericName: string
  category: string
  price: number
  stock: 'in-stock' | 'low-stock' | 'out-of-stock'
  requiresPrescription: boolean
}

const medicines: Medicine[] = [
  { id: 1, name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Pain relief', price: 120, stock: 'in-stock', requiresPrescription: false },
  { id: 2, name: 'Amoxicillin 250mg', genericName: 'Amoxicillin', category: 'Antibiotics', price: 450, stock: 'in-stock', requiresPrescription: true },
  { id: 3, name: 'Vitamin C 1000mg', genericName: 'Ascorbic acid', category: 'Vitamins', price: 800, stock: 'low-stock', requiresPrescription: false },
  { id: 4, name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Pain relief', price: 220, stock: 'in-stock', requiresPrescription: false },
  { id: 5, name: 'Metformin 500mg', genericName: 'Metformin', category: 'Chronic care', price: 380, stock: 'in-stock', requiresPrescription: true },
  { id: 6, name: 'Adhesive plasters', genericName: 'Plasters', category: 'First aid', price: 150, stock: 'in-stock', requiresPrescription: false },
  { id: 7, name: 'Baby gripe water', genericName: 'Gripe water', category: 'Baby care', price: 340, stock: 'out-of-stock', requiresPrescription: false },
  { id: 8, name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Allergy', price: 260, stock: 'in-stock', requiresPrescription: false },
]

const categories = ['Pain relief', 'Antibiotics', 'Vitamins', 'First aid', 'Baby care', 'Chronic care']
const currency = new Intl.NumberFormat('en-KE')

function formatPrice(price: number) {
  return `KES ${currency.format(price)}`
}

function App() {
  const [page, setPage] = useState<Page>(currentPage)
  const [theme, setTheme] = useState<Theme>(storedTheme)
  const [accountName, setAccountName] = useState('Bill')
  const [isSignedIn, setIsSignedIn] = useState(true)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Pain relief'])
  const [maxPrice, setMaxPrice] = useState(5000)
  const [prescriptionFilter, setPrescriptionFilter] = useState<'all' | 'otc' | 'prescription'>('all')
  const [appliedFilters, setAppliedFilters] = useState({
    categories: [] as string[],
    maxPrice: 5000,
    prescriptionFilter: 'all' as 'all' | 'otc' | 'prescription',
  })
  const [sortOrder, setSortOrder] = useState<'featured' | 'ascending' | 'descending'>('featured')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    function syncPage() {
      setPage(currentPage())
      setAccountMenuOpen(false)
      setNotice('')
    }

    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  useEffect(() => {
    const titles: Record<Page, string> = {
      home: 'Home',
      medicines: 'Medicines',
      prescriptions: 'Prescriptions',
      orders: 'My orders',
      help: 'Help',
      login: 'Sign in',
    }
    document.title = `${titles[page]} | ProHealth`
  }, [page])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('prohealth-theme', theme)
  }, [theme])

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return medicines
      .filter((medicine) => {
        const matchesQuery =
          !normalizedQuery ||
          medicine.name.toLowerCase().includes(normalizedQuery) ||
          medicine.genericName.toLowerCase().includes(normalizedQuery)
        const matchesCategory =
          appliedFilters.categories.length === 0 ||
          appliedFilters.categories.includes(medicine.category)
        const matchesPrice = medicine.price <= appliedFilters.maxPrice
        const matchesPrescription =
          appliedFilters.prescriptionFilter === 'all' ||
          (appliedFilters.prescriptionFilter === 'prescription' && medicine.requiresPrescription) ||
          (appliedFilters.prescriptionFilter === 'otc' && !medicine.requiresPrescription)

        return matchesQuery && matchesCategory && matchesPrice && matchesPrescription
      })
      .sort((first, second) => {
        if (sortOrder === 'ascending') return first.price - second.price
        if (sortOrder === 'descending') return second.price - first.price
        return first.id - second.id
      })
  }, [appliedFilters, query, sortOrder])

  const cartEntries = medicines.filter((medicine) => cart[medicine.id] > 0)
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0)
  const cartSubtotal = cartEntries.reduce(
    (total, medicine) => total + medicine.price * cart[medicine.id],
    0,
  )

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(searchInput)
    navigate('medicines')
  }

  function navigate(nextPage: Page) {
    if (window.location.hash === `#${nextPage}`) {
      setPage(nextPage)
      return
    }
    window.location.hash = nextPage
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  function addToCart(medicine: Medicine) {
    if (medicine.requiresPrescription) {
      setNotice(`${medicine.name} requires a valid prescription before it can be added.`)
      return
    }

    setCart((current) => ({ ...current, [medicine.id]: (current[medicine.id] ?? 0) + 1 }))
    setNotice(`${medicine.name} added to your cart.`)
  }

  function updateCart(medicineId: number, change: number) {
    setCart((current) => {
      const quantity = (current[medicineId] ?? 0) + change
      const updated = { ...current }

      if (quantity <= 0) {
        delete updated[medicineId]
      } else {
        updated[medicineId] = quantity
      }

      return updated
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="ProHealth home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span>ProHealth</span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a className={page === 'home' ? 'active' : ''} href="#home" aria-current={page === 'home' ? 'page' : undefined}>Home</a>
          <a className={page === 'medicines' ? 'active' : ''} href="#medicines" aria-current={page === 'medicines' ? 'page' : undefined}>Medicines</a>
          <a className={page === 'prescriptions' ? 'active' : ''} href="#prescriptions" aria-current={page === 'prescriptions' ? 'page' : undefined}>Prescriptions</a>
          <a className={page === 'orders' ? 'active' : ''} href="#orders" aria-current={page === 'orders' ? 'page' : undefined}>My Orders</a>
          <a className={page === 'help' ? 'active' : ''} href="#help" aria-current={page === 'help' ? 'page' : undefined}>Help</a>
        </nav>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
            </svg>
          )}
          <span className="visually-hidden">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>

        {page !== 'login' && <form className="header-search" onSubmit={submitSearch} role="search">
          <label className="visually-hidden" htmlFor="header-search">Search medicines</label>
          <input
            id="header-search"
            type="search"
            placeholder="Search medicines"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </form>}

        {page !== 'login' && <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
          <span className="cart-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.9-1.4L21 9H7" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
          </span>
          <span>Cart</span>
          {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </button>}

        {page !== 'login' && (isSignedIn ? <div className="profile-wrap">
          <button
            className="profile-button"
            type="button"
            aria-label={`Account: ${accountName}`}
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setAccountMenuOpen((open) => !open)}
          >
            <span className="profile-avatar">{demoAccounts.find((account) => account.name === accountName)?.initials ?? accountName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="profile-name">{accountName.split(' ')[0]}</span>
            <span className="profile-caret" aria-hidden="true">⌄</span>
          </button>
          {accountMenuOpen && (
            <div className="account-menu" role="menu" aria-label="Account options">
              <p className="account-menu-label">Switch account</p>
              {demoAccounts.map((account) => (
                <button
                  className={`account-option ${account.name === accountName ? 'current' : ''}`}
                  type="button"
                  role="menuitem"
                  key={account.email}
                  onClick={() => {
                    setAccountName(account.name)
                    setIsSignedIn(true)
                    setAccountMenuOpen(false)
                    setNotice(`Switched to ${account.name}'s demo account.`)
                  }}
                >
                  <span className="account-avatar">{account.initials}</span>
                  <span><strong>{account.name}</strong><small>{account.email}</small></span>
                  {account.name === accountName && <span className="account-check" aria-label="Current account">✓</span>}
                </button>
              ))}
              <div className="account-menu-divider" />
              <button className="account-action" type="button" role="menuitem" onClick={() => navigate('login')}>Sign in to another account</button>
              <button className="account-action sign-out-action" type="button" role="menuitem" onClick={() => {
                setIsSignedIn(false)
                setAccountMenuOpen(false)
                navigate('login')
              }}>Sign out</button>
              <p className="account-demo-note">Demo accounts only. Authentication is not connected.</p>
            </div>
          )}
        </div> : <button className="sign-in-header" type="button" onClick={() => navigate('login')}>Sign in</button>)}
      </header>

      {notice && page !== 'medicines' && page !== 'login' && (
        <div className="global-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
        </div>
      )}

      {page === 'home' && <HomePage name={accountName} onBrowse={() => navigate('medicines')} onNavigate={navigate} />}
      {page === 'prescriptions' && <PrescriptionsPage />}
      {page === 'orders' && <OrdersPage />}
      {page === 'help' && <HelpPage />}
      {page === 'login' && <LoginPage
        onLogin={(name) => {
          setAccountName(name)
          setIsSignedIn(true)
          navigate('home')
        }}
        onBack={() => navigate('medicines')}
      />}
      {page === 'medicines' && <main id="medicines" className="page-content">
        <div className="page-heading">
          <div>
            <h1>Medicines</h1>
            <p>
              Showing {filteredMedicines.length} of {medicines.length} featured medicines
            </p>
          </div>
          <span className="trust-note">
            <span className="trust-dot" aria-hidden="true" />
            Genuine, pharmacist-verified products
          </span>
        </div>

        <div className="catalog-layout">
          <aside className="filter-panel" aria-label="Medicine filters">
            <h2>Filters</h2>

            <fieldset className="filter-group category-options">
              <legend>Category</legend>
              {categories.map((category) => (
                <label className="checkbox-option" key={category}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span className="custom-checkbox" aria-hidden="true" />
                  <span>{category}</span>
                </label>
              ))}
            </fieldset>

            <div className="filter-group price-filter">
              <label htmlFor="price-range">Price (KES)</label>
              <input
                id="price-range"
                type="range"
                min="0"
                max="5000"
                step="100"
                value={maxPrice}
                style={{ '--range-progress': `${(maxPrice / 5000) * 100}%` } as CSSProperties}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
              <div className="range-labels"><span>0</span><span>{currency.format(maxPrice)}</span></div>
            </div>

            <fieldset className="filter-group type-options">
              <legend>Type</legend>
              <label className="radio-option">
                <input
                  type="radio"
                  name="medicine-type"
                  checked={prescriptionFilter === 'otc'}
                  onChange={() => setPrescriptionFilter('otc')}
                />
                <span className="custom-radio" aria-hidden="true" />
                <span>Over the counter</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="medicine-type"
                  checked={prescriptionFilter === 'prescription'}
                  onChange={() => setPrescriptionFilter('prescription')}
                />
                <span className="custom-radio" aria-hidden="true" />
                <span>Prescription only</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="medicine-type"
                  checked={prescriptionFilter === 'all'}
                  onChange={() => setPrescriptionFilter('all')}
                />
                <span className="custom-radio" aria-hidden="true" />
                <span>All medicine types</span>
              </label>
            </fieldset>

            <button
              className="button button-primary apply-button"
              type="button"
              onClick={() => {
                setAppliedFilters({
                  categories: selectedCategories,
                  maxPrice,
                  prescriptionFilter,
                })
                setNotice('Filters applied.')
              }}
            >
              Apply filters
            </button>
          </aside>

          <section className="catalog-results" aria-label="Medicine results">
            <div className="results-toolbar">
              <form className="catalog-search" onSubmit={submitSearch} role="search">
                <label className="visually-hidden" htmlFor="catalog-search">Search by name or generic name</label>
                <input
                  id="catalog-search"
                  type="search"
                  placeholder="Search by name or generic name..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button className="button button-primary search-button" type="submit">Search</button>
              </form>
              <button
                className="sort-button"
                type="button"
                onClick={() => setSortOrder((current) =>
                  current === 'featured' || current === 'descending' ? 'ascending' : 'descending',
                )}
                aria-label={`Sort by ${sortOrder === 'featured' ? 'featured medicines' : `price ${sortOrder}`}`}
              >
                Sort: {sortOrder === 'featured' ? 'Featured' : `Price ${sortOrder === 'ascending' ? '↑' : '↓'}`}
              </button>
            </div>

            {notice && (
              <div className="notice" role="status">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
              </div>
            )}

            {filteredMedicines.length > 0 ? (
              <div className="product-grid">
                {filteredMedicines.map((medicine) => (
                  <article className="product-card" key={medicine.id}>
                    <div className="product-image" aria-label={`${medicine.name} image placeholder`}>
                      <span>Product photo</span>
                      {medicine.requiresPrescription && <span className="rx-badge">Rx only</span>}
                    </div>
                    <div className="product-details">
                      <h3>{medicine.name}</h3>
                      <p className="product-category">{medicine.category}</p>
                      <p className={`stock-status ${medicine.stock}`}>
                        <span className="stock-dot" aria-hidden="true" />
                        {medicine.stock === 'in-stock'
                          ? 'In stock'
                          : medicine.stock === 'low-stock'
                            ? 'Low stock'
                            : 'Out of stock'}
                      </p>
                      <div className="product-purchase">
                        <span className="product-price">{formatPrice(medicine.price)}</span>
                        {medicine.stock === 'out-of-stock' ? (
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => setNotice(`We’ll notify you when ${medicine.name} is back in stock.`)}
                          >
                            Notify me
                          </button>
                        ) : (
                          <button
                            className="button button-primary add-button"
                            type="button"
                            onClick={() => addToCart(medicine)}
                          >
                            Add to cart
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">⌕</span>
                <h2>No medicines found</h2>
                <p>Try a different search or adjust your filters.</p>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setQuery('')
                    setSelectedCategories([])
                    setMaxPrice(5000)
                    setPrescriptionFilter('all')
                    setAppliedFilters({
                      categories: [],
                      maxPrice: 5000,
                      prescriptionFilter: 'all',
                    })
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
      </main>}

      {cartOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCartOpen(false)
        }}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div className="drawer-heading">
              <div>
                <h2 id="cart-title">Your cart</h2>
                <p>{cartCount} {cartCount === 1 ? 'item' : 'items'}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button>
            </div>
            {cartEntries.length > 0 ? (
              <>
                <div className="cart-items">
                  {cartEntries.map((medicine) => (
                    <div className="cart-item" key={medicine.id}>
                      <div className="cart-item-image" aria-hidden="true">+</div>
                      <div className="cart-item-info">
                        <h3>{medicine.name}</h3>
                        <p>{formatPrice(medicine.price)}</p>
                        <div className="quantity-control">
                          <button type="button" onClick={() => updateCart(medicine.id, -1)} aria-label={`Remove one ${medicine.name}`}>−</button>
                          <span>{cart[medicine.id]}</span>
                          <button type="button" onClick={() => updateCart(medicine.id, 1)} aria-label={`Add one ${medicine.name}`}>+</button>
                        </div>
                      </div>
                      <strong>{formatPrice(medicine.price * cart[medicine.id])}</strong>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <span>Subtotal</span>
                  <strong>{formatPrice(cartSubtotal)}</strong>
                </div>
                <button className="button button-primary checkout-button" type="button" onClick={() => {
                  setCartOpen(false)
                  setNotice('Checkout will be available when the ProHealth service is connected.')
                }}>
                  Continue to checkout
                </button>
                <p className="cart-disclaimer">Delivery and pickup options are selected at checkout.</p>
              </>
            ) : (
              <div className="cart-empty">
                <span aria-hidden="true">🛍</span>
                <h3>Your cart is empty</h3>
                <p>Add medicines to get started.</p>
                <button className="button button-primary" type="button" onClick={() => setCartOpen(false)}>Browse medicines</button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
