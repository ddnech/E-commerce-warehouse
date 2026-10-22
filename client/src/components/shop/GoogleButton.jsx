import { useEffect, useRef, useState } from "react";
import { useShop } from "../../auth/ShopContext";

const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT}"]`);
    const script = existing || Object.assign(document.createElement("script"), { src: SCRIPT, async: true, defer: true });
    script.addEventListener("load", resolve);
    script.addEventListener("error", reject);
    if (!existing) document.head.appendChild(script);
  });
}

/**
 * "Continue with Google". Only shows up when the server has GOOGLE_CLIENT_ID set.
 * `onCredential` receives the ID token, which the server verifies with Google.
 */
export default function GoogleButton({ onCredential, text = "continue_with" }) {
  const { config } = useShop();
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);
  const clientId = config.googleClientId;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: (res) => onCredential(res.credential) });
        window.google.accounts.id.renderButton(holder.current, { theme: "outline", size: "large", shape: "pill", text, width: holder.current.offsetWidth || 320 });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, text]);

  if (!clientId || failed) return null;
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={holder} className="flex min-h-11 w-full justify-center" />
    </>
  );
}
