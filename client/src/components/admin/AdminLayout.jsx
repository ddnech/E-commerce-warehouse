import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  Shapes,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";
import { useAdmin } from "../../auth/AdminContext";
import Logo from "../shop/Logo";

const NAV = [
  ["Overview", [["/admin", "Dashboard", LayoutDashboard, true], ["/admin/orders", "Orders", ShoppingCart], ["/admin/reports", "Sales report", BarChart3]]],
  ["Catalog", [["/admin/products", "Products", Package], ["/admin/categories", "Categories", Shapes]]],
  ["Warehouse", [["/admin/stock", "Stock", Boxes], ["/admin/transfers", "Transfers", ArrowLeftRight], ["/admin/stock-history", "Stock history", History]]],
  ["People", [["/admin/warehouses", "Warehouses", Store], ["/admin/admins", "Admins", ShieldCheck, false, true], ["/admin/customers", "Customers", Users]]],
];

function Sidebar({ onNavigate }) {
  const { admin, isSuper, logout } = useAdmin();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="px-5 py-5">
        <Logo to="/admin" light suffix="admin" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Admin">
        {NAV.map(([group, links]) => (
          <div key={group} className="mt-5">
            <p className="px-3 text-[0.7rem] font-semibold tracking-wider text-white/40 uppercase">{group}</p>
            <ul className="mt-1.5 space-y-0.5">
              {links
                .filter(([, , , , superOnly]) => !superOnly || isSuper)
                .map(([to, label, Icon, end]) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/12 font-semibold text-white" : "text-white/70 hover:bg-white/6 hover:text-white"}`
                      }
                    >
                      <Icon size={17} aria-hidden="true" /> {label}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="text-sm font-semibold">
          {admin.first_name} {admin.last_name}
        </p>
        <p className="text-xs text-white/50">{isSuper ? "Super admin, all warehouses" : admin.warehouse?.name || "No warehouse assigned"}</p>
        <button
          onClick={() => {
            logout();
            navigate("/admin/login");
          }}
          className="mt-3 flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <LogOut size={15} aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Logo to="/admin" light suffix="admin" />
        <button onClick={() => setOpen(true)} className="rounded p-2 text-white" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute top-5 right-3 rounded p-1 text-white/70" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
