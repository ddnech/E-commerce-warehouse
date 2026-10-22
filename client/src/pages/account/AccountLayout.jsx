import { NavLink, Outlet, useNavigate } from "react-router";
import { Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useShop } from "../../auth/ShopContext";
import { assetUrl } from "../../lib/api";

const TABS = [
  ["/account/orders", "Orders", Package],
  ["/account/wishlist", "Wishlist", Heart],
  ["/account/addresses", "Addresses", MapPin],
  ["/account", "Profile", UserRound, true],
];

export default function AccountLayout() {
  const { user, logout } = useShop();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    toast.success("Logged out. See you soon!");
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex items-center gap-4">
        {user.avatar ? (
          <img src={assetUrl(user.avatar)} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-moss-tint text-xl font-bold text-moss">{user.first_name?.[0]?.toUpperCase() || "?"}</span>
        )}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hi, {user.first_name || user.username}</h1>
          <p className="text-sm text-ink-soft">{user.email}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[13rem_1fr]">
        <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
          {TABS.map(([to, label, Icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium ${isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink"}`
              }
            >
              <Icon size={17} aria-hidden="true" /> {label}
            </NavLink>
          ))}
          <button onClick={signOut} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-clay lg:mt-4">
            <LogOut size={17} aria-hidden="true" /> Log out
          </button>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
