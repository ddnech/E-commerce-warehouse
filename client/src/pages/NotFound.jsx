import { Link } from "react-router";
import { Drawing } from "../components/art/ProductArt";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <Drawing kind="ladder" fabric="#c4a37f" className="w-32" />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-3 text-ink-soft">We looked in every room. That page isn't here.</p>
      <Link to="/" className="btn-primary mt-8">Back to the shop</Link>
    </div>
  );
}
