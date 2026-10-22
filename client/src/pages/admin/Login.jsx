import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { errorMessage } from "../../lib/api";
import { useAdmin } from "../../auth/AdminContext";
import Logo from "../../components/shop/Logo";
import Field from "../../components/ui/Field";
import PasswordInput from "../../components/ui/PasswordInput";

const DEMO = [
  ["superadmin", "Super admin, sees every warehouse"],
  ["admin.jaktim", "Jakarta Timur warehouse"],
  ["admin.surabaya", "Surabaya warehouse"],
];

export default function AdminLogin() {
  const { admin, login } = useAdmin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(params.get("expired") ? "Your session ended. Please log in again." : "");
  const { register, handleSubmit, setValue, formState } = useForm({ defaultValues: { username: "", password: "" } });

  if (admin) return <Navigate to="/admin" replace />;

  const onSubmit = async ({ username, password }) => {
    setError("");
    try {
      const a = await login(username.trim(), password);
      toast.success(`Hello, ${a.first_name}`);
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo to="/" light suffix="admin" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="panel p-7">
          <h1 className="text-2xl font-bold">Staff login</h1>
          {error && (
            <p className="mt-4 rounded-lg bg-clay-tint p-3 text-sm text-clay" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 space-y-4">
            <Field label="Username" htmlFor="username">
              <input id="username" autoComplete="username" required className="input" {...register("username")} />
            </Field>
            <Field label="Password" htmlFor="password">
              <PasswordInput id="password" autoComplete="current-password" required {...register("password")} />
            </Field>
          </div>
          <button disabled={formState.isSubmitting} className="btn-primary btn-lg mt-6 w-full">
            {formState.isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-white/70">
          <p>Demo accounts, all with password <strong className="text-white">Password123!</strong></p>
          <ul className="mt-2 space-y-1">
            {DEMO.map(([username, label]) => (
              <li key={username}>
                <button
                  type="button"
                  onClick={() => {
                    setValue("username", username);
                    setValue("password", "Password123!");
                  }}
                  className="text-left hover:text-white"
                >
                  <span className="font-mono text-white">{username}</span> <span className="text-white/50">· {label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
