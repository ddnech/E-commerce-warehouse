import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import { kg, plural, rupiah } from "../../lib/format";
import { useShop } from "../../auth/ShopContext";
import ProductArt from "../../components/art/ProductArt";
import QuantityStepper from "../../components/ui/QuantityStepper";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

export default function Cart() {
  const { user, cart, setCart, refreshCart } = useShop();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (user) refreshCart();
  }, [user, refreshCart]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon={ShoppingBag} title="Log in to see your cart" action={<Link to="/login?next=/cart" className="btn-primary">Log in</Link>}>
          Your cart is saved to your account, so it follows you to any device.
        </EmptyState>
      </div>
    );
  }

  const change = async (productId, quantity) => {
    setBusy(productId);
    try {
      const { data } = quantity === 0 ? await api.delete(`/cart/${productId}`) : await api.patch(`/cart/${productId}`, { quantity });
      setCart(data.data);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Your cart</h1>

      {!cart ? (
        <Skeleton className="mt-8 h-64" />
      ) : cart.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Link to="/shop" className="btn-primary">Start shopping</Link>}>
            Anything you add shows up here until you check out.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <ul className="panel divide-y divide-line">
            {cart.items.map(({ product, quantity, subtotal, problem }) => (
              <li key={product.id} className={`flex gap-4 p-4 sm:gap-6 sm:p-6 ${busy === product.id ? "opacity-60" : ""}`}>
                <Link to={`/products/${product.id}`} className="shrink-0">
                  <ProductArt product={product} className="h-24 w-24 sm:h-28 sm:w-28" rounded="rounded-xl" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link to={`/products/${product.id}`} className="font-semibold hover:underline">
                        {product.name}
                      </Link>
                      <p className="text-sm text-ink-soft">
                        {rupiah(product.price)} each, {kg(product.weight)}
                      </p>
                    </div>
                    <p className="price shrink-0 text-lg">{rupiah(subtotal)}</p>
                  </div>
                  {problem && <p className="mt-2 text-sm font-medium text-clay">{problem}</p>}
                  <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                    <QuantityStepper value={quantity} onChange={(q) => change(product.id, q)} max={Math.max(quantity, Math.min(99, product.available))} disabled={busy === product.id} size="sm" />
                    <button onClick={() => change(product.id, 0)} disabled={busy === product.id} className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-clay">
                      <Trash2 size={15} aria-hidden="true" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="panel h-fit p-6 lg:sticky lg:top-36">
            <h2 className="text-xl font-bold">Summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">{plural(cart.count, "item")}</dt>
                <dd className="font-medium">{rupiah(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Total weight</dt>
                <dd>{kg(cart.weight)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="text-ink-soft">Next step</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
              <span className="font-semibold">Subtotal</span>
              <span className="price text-2xl">{rupiah(cart.subtotal)}</span>
            </div>
            <button onClick={() => navigate("/checkout")} disabled={!cart.can_checkout} className="btn-primary btn-lg mt-6 w-full">
              Check out
            </button>
            {!cart.can_checkout && <p className="mt-3 text-center text-xs text-clay">Fix the items marked in red first.</p>}
            {!user.is_verified && cart.can_checkout && (
              <p className="mt-3 text-center text-xs text-ink-soft">You'll need to confirm your email before placing the order.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
