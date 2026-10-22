import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import api from "../../lib/api";
import { useFetch } from "../../hooks/useFetch";
import { useCategories } from "../../hooks/useCategories";
import { useShop } from "../../auth/ShopContext";
import { Drawing } from "../../components/art/ProductArt";
import { ProductGrid } from "../../components/shop/ProductCard";
import Skeleton from "../../components/ui/Skeleton";

const ROOM_ART = {
  "Living Room": ["sofa", "#7d8f6a", "var(--color-room-living)"],
  Bedroom: ["bed", "#5f7486", "var(--color-room-bedroom)"],
  "Dining & Kitchen": ["diningSet", "#c4a37f", "var(--color-room-dining)"],
  Workspace: ["desk", "#7f6a8e", "var(--color-room-work)"],
  "Kids & Baby": ["crib", "#a8664a", "var(--color-room-kids)"],
  Lighting: ["pendant", "#c4a37f", "var(--color-room-light)"],
  Bathroom: ["roundMirror", "#4f6b5a", "var(--color-room-bath)"],
  Outdoor: ["lounger", "#4f6b5a", "var(--color-room-outdoor)"],
};

/** A little living room made of the product drawings. */
function HeroScene() {
  return (
    <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[2rem]" style={{ background: "var(--color-room-living)" }} aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[#cfd8c9]" />
      <Drawing kind="wallShelf" fabric="#a8664a" className="absolute top-[12%] left-[30%] w-[40%]" />
      <Drawing kind="rug" fabric="#c4a37f" className="absolute bottom-[2%] left-[18%] w-[64%]" />
      <Drawing kind="floorLamp" fabric="#a8664a" className="absolute bottom-[14%] left-[1%] w-[30%]" />
      <Drawing kind="sofa" fabric="#4f6b5a" className="absolute bottom-[14%] left-[20%] w-[60%]" />
      <Drawing kind="planter" fabric="#c4a37f" className="absolute right-[0%] bottom-[14%] w-[30%]" />
      <Drawing kind="coffeeTable" fabric="#c4a37f" className="absolute bottom-[4%] left-[32%] w-[36%]" />
    </div>
  );
}

function Section({ title, link, linkLabel, children }) {
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
      <div className="mb-7 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {link && (
          <Link to={link} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-moss hover:underline">
            {linkLabel} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const categories = useCategories();
  const { user } = useShop();
  const newest = useFetch(() => api.get("/products", { params: { sort: "newest", size: 4 } }).then((r) => r.data.data), [user?.id]);
  const popular = useFetch(() => api.get("/products", { params: { sort: "popular", size: 8, in_stock: true } }).then((r) => r.data.data), [user?.id]);
  const stores = useFetch(() => api.get("/stores").then((r) => r.data.data), []);

  const loadingGrid = (n) => (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="aspect-[4/3]" />
      ))}
    </div>
  );

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-16">
        <div>
          <h1 className="text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">Furniture for every room in the house.</h1>
          <p className="mt-6 max-w-lg text-lg text-ink-soft">
            Order online and we ship from whichever of our {stores.data?.length || "five"} warehouses is closest to you, so it gets there sooner and costs less to send.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="btn-primary btn-lg">
              Shop all furniture
            </Link>
            <Link to="/stores" className="btn-secondary btn-lg">
              <MapPin size={18} aria-hidden="true" /> Find a store
            </Link>
          </div>
        </div>
        <HeroScene />
      </section>

      <Section title="Shop by room">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => {
            const [kind, fabric, bg] = ROOM_ART[c.name] || ["sideboard", "#7d8f6a", "var(--color-room-living)"];
            return (
              <li key={c.id}>
                <Link to={`/shop?category=${c.id}`} className="group flex flex-col overflow-hidden rounded-2xl" style={{ background: bg }}>
                  <Drawing kind={kind} fabric={fabric} className="mx-auto mt-4 w-[78%] transition-transform duration-300 group-hover:-translate-y-1" />
                  <span className="flex items-baseline justify-between gap-2 px-4 pt-2 pb-4">
                    <span className="font-display text-lg font-bold">{c.name}</span>
                    <span className="text-xs text-ink-soft">{c.product_count}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Just arrived" link="/shop?sort=newest" linkLabel="See everything new">
        {newest.data ? <ProductGrid products={newest.data} columns="lg:grid-cols-4" /> : loadingGrid(4)}
      </Section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 rounded-[2rem] bg-moss px-6 py-10 text-white sm:px-10 md:grid-cols-3">
          {[
            ["Order online", "Pick what you like, choose a courier and see the delivery cost before you pay."],
            ["Pay by bank transfer", "Transfer the total and upload a photo of the receipt. We check it within a day."],
            ["We ship from nearby", "Your order leaves from the warehouse closest to your address. Track it from your account."],
          ].map(([title, text], i) => (
            <div key={title}>
              <span className="font-display text-5xl font-extrabold text-white/30">{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm text-white/75">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Section title="Popular right now" link="/shop?sort=popular" linkLabel="See more">
        {popular.data ? <ProductGrid products={popular.data} /> : loadingGrid(8)}
      </Section>

      {stores.data?.length > 0 && (
        <Section title="Warehouses near you" link="/stores" linkLabel="Store details">
          <ul className="flex flex-wrap gap-2">
            {stores.data.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm">
                <MapPin size={15} className="text-moss" aria-hidden="true" />
                <span className="font-medium">{s.City?.name?.replace(/^(Kota Administrasi|Kota|Kabupaten) /, "")}</span>
                <span className="text-ink-soft">{s.Province?.name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
