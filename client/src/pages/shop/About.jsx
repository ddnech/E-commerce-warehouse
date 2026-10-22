import { Link } from "react-router";
import { Drawing } from "../../components/art/ProductArt";

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <Drawing kind="rocker" fabric="#a8664a" className="w-40" />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">About Furnifor</h1>
      <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink-soft">
        <p>
          Furnifor is a made-up furniture shop with five stores across Indonesia. It started as a final project and grew into a small but complete online
          store: a shop for customers and a back office for the people who run the warehouses.
        </p>
        <p>
          The interesting part happens behind the scenes. Every order ships from the store nearest to the customer. If that store doesn't have enough of
          something, the system asks another store to send it over first and keeps a record of every unit that moves.
        </p>
        <p>Payment is by bank transfer. You upload a photo of the receipt, a warehouse admin checks it, and then your order gets packed.</p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/shop" className="btn-primary btn-lg">Browse the shop</Link>
        <Link to="/stores" className="btn-secondary btn-lg">See the stores</Link>
      </div>
    </div>
  );
}
