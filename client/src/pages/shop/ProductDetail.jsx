import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ChevronRight, PackageSearch, ShoppingBag, Truck, Warehouse } from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import { kg, rupiah } from "../../lib/format";
import { useFetch } from "../../hooks/useFetch";
import { useShop } from "../../auth/ShopContext";
import ProductArt from "../../components/art/ProductArt";
import WishlistButton from "../../components/shop/WishlistButton";
import { Availability, ProductGrid } from "../../components/shop/ProductCard";
import QuantityStepper from "../../components/ui/QuantityStepper";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, cart, setCart } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);

  const { data, error, loading } = useFetch(() => api.get(`/products/${id}`).then((r) => r.data), [id, user?.id]);

  // Opening another product from "More for the ..." keeps this component, so reset the picks.
  useEffect(() => {
    setQuantity(1);
    setImageIndex(0);
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon={PackageSearch} title="We couldn't find that product" action={<Link to="/shop" className="btn-primary">Browse the shop</Link>}>
          {errorMessage(error)}
        </EmptyState>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-8 w-40" />
        </div>
      </div>
    );
  }

  const product = data.data;
  const inCart = cart?.items.find((i) => i.product.id === product.id)?.quantity || 0;
  const maxQty = Math.max(0, Math.min(99, product.available - inCart));
  const images = product.images;

  const addToCart = async () => {
    if (!user) return navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    setAdding(true);
    try {
      const { data: res } = await api.post("/cart", { product_id: product.id, quantity });
      setCart(res.data);
      setQuantity(1);
      toast.success(res.message, { action: { label: "View cart", onClick: () => navigate("/cart") } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link to="/shop" className="hover:text-ink">Shop</Link>
        <ChevronRight size={14} aria-hidden="true" />
        {product.category && (
          <>
            <Link to={`/shop?category=${product.category.id}`} className="hover:text-ink">{product.category.name}</Link>
            <ChevronRight size={14} aria-hidden="true" />
          </>
        )}
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <ProductArt product={product} image={images[imageIndex]?.url} className="aspect-square w-full" rounded="rounded-[2rem]" />
          {images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setImageIndex(i)} className={`shrink-0 rounded-xl ring-2 ${i === imageIndex ? "ring-moss" : "ring-transparent"}`} aria-label={`Photo ${i + 1}`}>
                  <ProductArt product={product} image={img.url} className="h-20 w-20" rounded="rounded-xl" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:pt-6">
          <p className="text-sm font-medium text-moss">{product.category?.name}</p>
          <h1 className="mt-2 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">{product.name}</h1>
          <p className="price mt-5 text-3xl">{rupiah(product.price)}</p>
          <Availability available={product.available} className="mt-2" />

          <p className="mt-6 max-w-prose leading-relaxed text-ink-soft">{product.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {product.available > 0 && <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, maxQty)} disabled={maxQty === 0} />}
            <button onClick={addToCart} disabled={adding || product.available === 0 || (user && maxQty === 0)} className="btn-primary btn-lg flex-1 sm:flex-none">
              <ShoppingBag size={18} aria-hidden="true" />
              {product.available === 0 ? "Out of stock" : user && maxQty === 0 ? "All available are in your cart" : adding ? "Adding…" : "Add to cart"}
            </button>
            <WishlistButton key={`${product.id}-${product.in_wishlist}`} productId={product.id} initial={product.in_wishlist} variant="button" />
          </div>
          {inCart > 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              You have {inCart} in your <Link to="/cart" className="font-semibold text-moss hover:underline">cart</Link>.
            </p>
          )}

          <dl className="mt-10 divide-y divide-line border-y border-line text-sm">
            <div className="flex items-start gap-3 py-4">
              <Truck size={18} className="mt-0.5 shrink-0 text-moss" aria-hidden="true" />
              <div>
                <dt className="font-semibold">Delivery</dt>
                <dd className="text-ink-soft">Ships from the warehouse closest to your address with JNE, POS or TIKI. You'll see the cost at checkout.</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-4">
              <Warehouse size={18} className="mt-0.5 shrink-0 text-moss" aria-hidden="true" />
              <div>
                <dt className="font-semibold">Weight</dt>
                <dd className="text-ink-soft">{kg(product.weight)} packed</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {data.related?.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-7 text-3xl font-bold tracking-tight">More for the {product.category?.name.toLowerCase()}</h2>
          <ProductGrid products={data.related} columns="lg:grid-cols-4" />
        </section>
      )}
    </div>
  );
}
