import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { CircleCheck, CircleX } from "lucide-react";
import api, { errorMessage } from "../../lib/api";
import { useShop } from "../../auth/ShopContext";

export default function Verify() {
  const { token } = useParams();
  const { user, refreshUser } = useShop();
  const [state, setState] = useState({ status: "working", message: "" });
  const sent = useRef(false);

  useEffect(() => {
    // React's strict mode runs effects twice in dev. The token only works once, so guard it.
    if (sent.current) return;
    sent.current = true;
    api
      .post("/auth/verify", { token })
      .then(({ data }) => {
        setState({ status: "ok", message: data.message });
        if (user) refreshUser();
      })
      .catch((e) => setState({ status: "failed", message: errorMessage(e) }));
  }, [token]);

  const ok = state.status === "ok";
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {state.status === "working" ? (
        <p className="text-ink-soft">Confirming your email…</p>
      ) : (
        <div className="panel p-10">
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${ok ? "bg-moss-tint text-moss" : "bg-clay-tint text-clay"}`}>
            {ok ? <CircleCheck size={28} aria-hidden="true" /> : <CircleX size={28} aria-hidden="true" />}
          </span>
          <h1 className="mt-5 text-2xl font-bold">{ok ? "Email confirmed" : "That didn't work"}</h1>
          <p className="mt-2 text-ink-soft">{state.message}</p>
          <Link to={ok ? "/shop" : user ? "/account" : "/login"} className="btn-primary mt-8">
            {ok ? "Start shopping" : user ? "Go to my account" : "Log in"}
          </Link>
        </div>
      )}
    </div>
  );
}
