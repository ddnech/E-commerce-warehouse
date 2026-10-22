import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Heart, ShoppingBag, UserRound } from "lucide-react";
import { useShop } from "../../auth/ShopContext";
import { useCategories } from "../../hooks/useCategories";
import Logo from "./Logo";
import SearchBox from "./SearchBox";

function IconLink({ to, label, children, count }) {
  return (
    <Link to={to} className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5" aria-label={label}>
      {children}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-teak px-1 text-[0.7rem] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export default function ShopLayout() {
  const { user, cart } = useShop();
  const categories = useCategories();
  const { pathname, search } = useLocation();

  // New page, start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  const navLink = ({ isActive }) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors ${isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink"}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:gap-8">
          <Logo />
          <SearchBox className="hidden flex-1 md:block md:max-w-xl" />
          <nav className="ml-auto flex items-center gap-1" aria-label="Account">
            <IconLink to={user ? "/account/wishlist" : "/login?next=/account/wishlist"} label="Wishlist">
              <Heart size={20} />
            </IconLink>
            <IconLink to="/cart" label={`Cart${cart?.count ? `, ${cart.count} items` : ""}`} count={cart?.count}>
              <ShoppingBag size={20} />
            </IconLink>
            {user ? (
              <Link to="/account" className="ml-1 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium hover:bg-ink/5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-tint font-bold text-moss">{user.first_name?.[0]?.toUpperCase() || "?"}</span>
                <span className="hidden sm:inline">{user.first_name}</span>
              </Link>
            ) : (
              <Link to="/login" className="btn-primary btn-sm ml-2">
                <UserRound size={15} aria-hidden="true" /> Log in
              </Link>
            )}
          </nav>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SearchBox />
        </div>
        <nav className="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2.5 sm:px-6" aria-label="Rooms">
          <NavLink to="/shop" end className={({ isActive }) => navLink({ isActive: isActive && !search.includes("category=") })}>
            All furniture
          </NavLink>
          {categories.map((c) => (
            <NavLink key={c.id} to={`/shop?category=${c.id}`} className={() => navLink({ isActive: pathname === "/shop" && new URLSearchParams(search).get("category") === String(c.id) })}>
              {c.name}
            </NavLink>
          ))}
          <NavLink to="/stores" className={navLink}>
            Our stores
          </NavLink>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Furniture for every room, sent from whichever of our warehouses is closest to you. Pay by bank transfer, track every order from your account.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white/60">Shop</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/shop" className="hover:underline">All furniture</Link></li>
              <li><Link to="/shop?sort=newest" className="hover:underline">New arrivals</Link></li>
              <li><Link to="/stores" className="hover:underline">Our stores</Link></li>
              <li><Link to="/about" className="hover:underline">About Furnifor</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white/60">Your account</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/account/orders" className="hover:underline">My orders</Link></li>
              <li><Link to="/account/wishlist" className="hover:underline">Wishlist</Link></li>
              <li><Link to="/account/addresses" className="hover:underline">Addresses</Link></li>
              <li><Link to="/admin" className="text-white/60 hover:underline">Staff login</Link></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/50">A portfolio project. Products, prices and stores are made up.</p>
      </footer>
    </div>
  );
}
