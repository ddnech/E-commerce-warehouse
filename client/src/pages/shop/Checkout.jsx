import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { MailWarning, MapPin, Plus, Truck, Warehouse } from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import { etdLabel, kg, rupiah } from "../../lib/format";
import { useShop } from "../../auth/ShopContext";
import ProductArt from "../../components/art/ProductArt";
import AddressForm from "../../components/shop/AddressForm";
import Skeleton from "../../components/ui/Skeleton";

function Step({ number, title, children }) {
  return (
    <section className="panel p-6">
      <h2 className="flex items-center gap-3 text-xl font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss text-sm text-white">{number}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function Checkout() {
  const { user, cart, refreshCart, refreshUser } = useShop();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [choice, setChoice] = useState(null); // { courier, service, cost }
  const [placing, setPlacing] = useState(false);

  const loadAddresses = async (selectId) => {
    const { data } = await api.get("/account/addresses");
    setAddresses(data.data);
    const pick = selectId || data.data.find((a) => a.is_primary)?.id || data.data[0]?.id || null;
    setAddressId(pick);
    if (!data.data.length) setAdding(true);
  };

  useEffect(() => {
    loadAddresses().catch((e) => toast.error(errorMessage(e)));
    refreshCart();
  }, []);

  useEffect(() => {
    if (!addressId) return;
    setQuote(null);
    setChoice(null);
    setQuoteError("");
    api
      .post("/checkout/quote", { address_id: addressId })
      .then(({ data }) => {
        setQuote(data.data);
        const first = data.data.shipping.couriers[0];
        if (first?.services[0]) setChoice({ courier: first.code, service: first.services[0].service, cost: first.services[0].cost });
      })
      .catch((e) => setQuoteError(errorMessage(e)));
  }, [addressId]);

  if (cart && cart.items.length === 0 && !placing) return <Navigate to="/cart" replace />;

  const saveAddress = async (values) => {
    try {
      const { data } = await api.post("/account/addresses", values);
      toast.success(data.message);
      setAdding(false);
      await loadAddresses(data.data.id);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post("/auth/resend-verification");
      toast.success(data.message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const place = async () => {
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", { address_id: addressId, courier: choice.courier, service: choice.service });
      await refreshCart();
      navigate(`/account/orders/${data.data.invoice}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      toast.error(errorMessage(e));
      if (e.response?.status === 403) refreshUser();
      setPlacing(false);
    }
  };

  const total = (quote?.cart.subtotal || cart?.subtotal || 0) + (choice?.cost || 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Checkout</h1>

      {!user.is_verified && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-sun-tint p-5 text-sun sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm">
            <MailWarning size={20} className="shrink-0" aria-hidden="true" />
            <span>
              Please confirm your email before placing the order. We sent a link to <strong>{user.email}</strong>.
            </span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={resend} className="btn-secondary btn-sm">Send the link again</button>
            <button onClick={refreshUser} className="btn-ghost btn-sm">I've confirmed it</button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Step number="1" title="Deliver to">
            {addresses === null ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                {addresses.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm transition-colors ${addressId === a.id ? "border-moss bg-moss-tint/40" : "border-line hover:border-ink-soft/40"}`}>
                        <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-moss" />
                        <span>
                          <span className="font-semibold">{a.title}</span>
                          {a.is_primary && <span className="ml-2 text-xs text-moss">Main</span>}
                          <span className="mt-1 block text-ink-soft">{a.details}</span>
                          <span className="block text-ink-soft">
                            {a.city.name}, {a.province.name} {a.postal_code}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {adding ? (
                  <div className={addresses.length ? "mt-6 border-t border-line pt-6" : ""}>
                    <AddressForm onSubmit={saveAddress} onCancel={addresses.length ? () => setAdding(false) : undefined} submitLabel="Save and use this address" />
                  </div>
                ) : (
                  <button onClick={() => setAdding(true)} className="btn-ghost btn-sm mt-4">
                    <Plus size={15} aria-hidden="true" /> Add another address
                  </button>
                )}
              </>
            )}
          </Step>

          <Step number="2" title="Delivery">
            {!addressId ? (
              <p className="text-sm text-ink-soft">Add an address first to see delivery options.</p>
            ) : quoteError ? (
              <p className="text-sm text-clay">{quoteError}</p>
            ) : !quote ? (
              <Skeleton className="h-40" />
            ) : (
              <>
                <p className="mb-5 flex items-center gap-2 text-sm text-ink-soft">
                  <Warehouse size={16} className="text-moss" aria-hidden="true" />
                  Ships from <span className="font-semibold text-ink">{quote.warehouse.name}</span>
                  {quote.warehouse.distance_km < 10 ? ", right in your area." : `, about ${quote.warehouse.distance_km.toLocaleString("id-ID")} km away.`} Total weight {kg(quote.cart.weight)}.
                </p>
                <div className="space-y-5">
                  {quote.shipping.couriers.map((c) => (
                    <fieldset key={c.code}>
                      <legend className="mb-2 text-sm font-semibold">{c.name}</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {c.services.map((s) => {
                          const on = choice?.courier === c.code && choice?.service === s.service;
                          return (
                            <label key={s.service} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${on ? "border-moss bg-moss-tint/40" : "border-line hover:border-ink-soft/40"}`}>
                              <span className="flex items-center gap-3">
                                <input type="radio" name="delivery" checked={on} onChange={() => setChoice({ courier: c.code, service: s.service, cost: s.cost })} className="accent-moss" />
                                <span>
                                  <span className="font-medium">{s.description}</span>
                                  <span className="block text-xs text-ink-soft">{etdLabel(s.etd)}</span>
                                </span>
                              </span>
                              <span className="price">{rupiah(s.cost)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
                {quote.shipping.mode === "flat" && (
                  <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
                    <Truck size={14} aria-hidden="true" /> Estimated rates based on distance and weight.
                  </p>
                )}
              </>
            )}
          </Step>
        </div>

        <aside className="panel h-fit p-6 lg:sticky lg:top-36">
          <h2 className="text-xl font-bold">Your order</h2>
          <ul className="mt-5 space-y-3">
            {(quote?.cart || cart)?.items.map(({ product, quantity, subtotal }) => (
              <li key={product.id} className="flex items-center gap-3 text-sm">
                <ProductArt product={product} className="h-14 w-14 shrink-0" rounded="rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-medium">{product.name}</span>
                  <span className="text-ink-soft">× {quantity}</span>
                </span>
                <span className="price">{rupiah(subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items</dt>
              <dd>{rupiah(quote?.cart.subtotal || cart?.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd>{choice ? rupiah(choice.cost) : "-"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="price text-2xl">{rupiah(total)}</span>
          </div>
          <button onClick={place} disabled={!choice || placing || !user.is_verified} className="btn-primary btn-lg mt-6 w-full">
            {placing ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
            <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            You'll pay by bank transfer on the next page.
          </p>
          <Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-moss hover:underline">
            Back to cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
