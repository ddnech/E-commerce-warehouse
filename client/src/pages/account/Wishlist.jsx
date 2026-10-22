import { useState } from "react";
import { Link } from "react-router";
import { Heart } from "lucide-react";
import api from "../../lib/api";
import { useFetch } from "../../hooks/useFetch";
import { ProductGrid } from "../../components/shop/ProductCard";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";

export default function Wishlist() {
  const [page, setPage] = useState(1);
  const { data, reload } = useFetch(() => api.get("/wishlist", { params: { page, size: 12 } }).then((r) => r.data), [page]);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Wishlist</h2>
      {!data ? (
        <Skeleton className="h-64" />
      ) : data.data.length === 0 ? (
        <EmptyState icon={Heart} title="Nothing saved yet" action={<Link to="/shop" className="btn-primary">Browse the shop</Link>}>
          Tap the heart on anything you like and it'll wait for you here.
        </EmptyState>
      ) : (
        <>
          <ProductGrid
            products={data.data.map((p) => ({ ...p, in_wishlist: true }))}
            columns="sm:grid-cols-2 xl:grid-cols-3"
            onWishlistChange={(_, liked) => !liked && reload()}
          />
          <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
