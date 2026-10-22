import { Link } from "react-router";
import dayjs from "dayjs";
import { rupiah } from "../../lib/format";
import ProductArt from "../art/ProductArt";
import WishlistButton from "./WishlistButton";

export function Availability({ available, className = "" }) {
  if (available <= 0) return <p className={`text-sm font-medium text-clay ${className}`}>Out of stock</p>;
  if (available <= 5) return <p className={`text-sm font-medium text-teak ${className}`}>Only {available} left</p>;
  return <p className={`text-sm text-ink-soft ${className}`}>In stock</p>;
}

export default function ProductCard({ product, liked = false, onWishlistChange }) {
  const isNew = dayjs().diff(dayjs(product.createdAt), "day") <= 30;
  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="relative">
        <ProductArt product={product} className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.015]" />
        <div className="absolute top-3 right-3">
          <WishlistButton key={String(liked)} productId={product.id} initial={liked} onChange={onWishlistChange} />
        </div>
        {isNew && <span className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-teak">New</span>}
      </div>
      <div className="mt-3 px-1">
        <p className="text-xs text-ink-soft">{product.category?.name}</p>
        <h3 className="mt-0.5 font-sans text-[0.95rem] leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">{product.name}</h3>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="price text-lg">{rupiah(product.price)}</p>
          <Availability available={product.available} className="text-xs" />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, columns = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", onWishlistChange }) {
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 ${columns}`}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} liked={!!p.in_wishlist} onWishlistChange={onWishlistChange && ((liked) => onWishlistChange(p, liked))} />
        </li>
      ))}
    </ul>
  );
}
