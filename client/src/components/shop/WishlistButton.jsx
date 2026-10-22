import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import { useShop } from "../../auth/ShopContext";

/** Heart toggle. Sends visitors to log in first. */
export default function WishlistButton({ productId, initial = false, onChange, variant = "floating" }) {
  const { user } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [liked, setLiked] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    setBusy(true);
    const next = !liked;
    setLiked(next);
    try {
      if (next) await api.post(`/wishlist/${productId}`);
      else await api.delete(`/wishlist/${productId}`);
      onChange?.(next);
    } catch (error) {
      setLiked(!next);
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const label = liked ? "Remove from wishlist" : "Save to wishlist";
  if (variant === "button") {
    return (
      <button type="button" onClick={toggle} disabled={busy} className="btn-secondary btn-lg" aria-pressed={liked}>
        <Heart size={18} className={liked ? "fill-clay text-clay" : ""} aria-hidden="true" />
        {liked ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm transition-colors hover:bg-surface"
    >
      <Heart size={17} className={liked ? "fill-clay text-clay" : ""} />
    </button>
  );
}
