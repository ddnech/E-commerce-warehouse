import { MapPin, Phone } from "lucide-react";
import api, { assetUrl } from "../../lib/api";
import { useFetch } from "../../hooks/useFetch";
import { Drawing } from "../../components/art/ProductArt";
import Skeleton from "../../components/ui/Skeleton";

const ART = ["sofa", "wardrobe", "diningSet", "bookcase", "bed"];
const BG = ["living", "bedroom", "dining", "work", "kids"];

export default function Stores() {
  const { data: stores, error } = useFetch(() => api.get("/stores").then((r) => r.data.data), []);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Our stores</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Each store is also a warehouse. When you order online, we send it from the one closest to your address. If that one is out of something, another store
        sends it over first, so you don't have to split your order.
      </p>

      {error && <p className="mt-8 text-clay">We couldn't load the stores right now.</p>}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {!stores && !error
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-80" />)
          : stores?.map((s, i) => (
              <li key={s.id} className="panel overflow-hidden">
                {s.warehouse_img ? (
                  <img src={assetUrl(s.warehouse_img)} alt="" className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/10] items-end justify-center" style={{ background: `var(--color-room-${BG[i % BG.length]})` }} aria-hidden="true">
                    <Drawing kind={ART[i % ART.length]} fabric="#7d8f6a" className="w-3/5" />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-bold">{s.warehouse_name}</h2>
                  <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-moss" aria-hidden="true" />
                    <span>
                      {s.address_warehouse}
                      <br />
                      {s.City?.name}, {s.Province?.name}
                    </span>
                  </p>
                  {s.warehouse_contact && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                      <Phone size={16} className="shrink-0 text-moss" aria-hidden="true" />
                      <a href={`tel:${s.warehouse_contact}`} className="hover:text-ink">{s.warehouse_contact}</a>
                    </p>
                  )}
                  {s.latitude && s.longitude && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=15/${s.latitude}/${s.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block text-sm font-semibold text-moss hover:underline"
                    >
                      Open in a map
                    </a>
                  )}
                </div>
              </li>
            ))}
      </ul>
    </div>
  );
}
