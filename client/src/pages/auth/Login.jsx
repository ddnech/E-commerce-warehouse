import { useCallback } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { errorMessage } from "../../lib/api";
import { useShop } from "../../auth/ShopContext";
import AuthShell from "../../components/shop/AuthShell";
import GoogleButton from "../../components/shop/GoogleButton";
import Field from "../../components/ui/Field";
import PasswordInput from "../../components/ui/PasswordInput";

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

/** Only follow links inside this site, so ?next= can't send people elsewhere. */
export function safeNext(params) {
  const next = params.get("next") || "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function Login() {
  const { user, login, loginWithGoogle } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  const onGoogle = useCallback(
    async (credential) => {
      try {
        const data = await loginWithGoogle(credential);
        toast.success(data.message);
        navigate(next, { replace: true });
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [loginWithGoogle, navigate, next]
  );

  if (user) return <Navigate to={next} replace />;

  const onSubmit = async ({ identifier, password }) => {
    try {
      const u = await login(identifier, password);
      toast.success(`Welcome back, ${u.first_name || u.username}!`);
      navigate(next, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const fillDemo = () => {
    setValue("identifier", "rani@example.com");
    setValue("password", "Password123!");
  };

  return (
    <AuthShell title="Log in" subtitle="Good to see you again.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Email or username" htmlFor="identifier" error={errors.identifier?.message}>
          <input id="identifier" autoComplete="username" className="input" aria-invalid={!!errors.identifier} {...register("identifier")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-moss hover:underline">
            Forgot your password?
          </Link>
        </div>
        <button disabled={isSubmitting} className="btn-primary btn-lg w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <GoogleButton onCredential={onGoogle} />

      <p className="mt-8 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link to={`/register${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-moss hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-xl bg-canvas p-4 text-sm text-ink-soft">
        <p>
          Just looking around? Use the demo customer <strong className="text-ink">rani@example.com</strong> with password{" "}
          <strong className="text-ink">Password123!</strong>
        </p>
        <button type="button" onClick={fillDemo} className="mt-2 font-semibold text-moss hover:underline">
          Fill it in for me
        </button>
      </div>
    </AuthShell>
  );
}
