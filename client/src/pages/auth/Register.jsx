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
import { safeNext } from "./Login";

export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Z]/, "Add a capital letter.")
  .regex(/\d/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a symbol, like ! or #.");

const schema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required.").max(60),
    last_name: z.string().trim().max(60).optional(),
    username: z
      .string()
      .trim()
      .min(3, "Username must be 3 to 30 characters.")
      .max(30, "Username must be 3 to 30 characters.")
      .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, dots and underscores."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Enter an Indonesian mobile number, like 081234567890.")),
    password: passwordRule,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

export default function Register() {
  const { user, register: signUp, loginWithGoogle } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

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

  const onSubmit = async ({ confirm, ...values }) => {
    try {
      const data = await signUp(values);
      toast.success(data.message, { duration: 8000 });
      navigate(next, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const input = (name, props = {}) => (
    <input id={name} className="input" aria-invalid={!!errors[name]} {...props} {...register(name)} />
  );

  return (
    <AuthShell title="Create an account" subtitle="Save your cart, track orders and keep a wishlist." art="sofa" fabric="#a8664a">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={errors.first_name?.message}>
          {input("first_name", { autoComplete: "given-name" })}
        </Field>
        <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
          {input("last_name", { autoComplete: "family-name" })}
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message} className="sm:col-span-2">
          {input("email", { type: "email", autoComplete: "email" })}
        </Field>
        <Field label="Username" htmlFor="username" error={errors.username?.message}>
          {input("username", { autoComplete: "username" })}
        </Field>
        <Field label="Mobile number" htmlFor="phone" error={errors.phone?.message}>
          {input("phone", { type: "tel", autoComplete: "tel", placeholder: "0812…" })}
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="8+ characters with a capital, a number and a symbol.">
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label="Type it again" htmlFor="confirm" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        <button disabled={isSubmitting} className="btn-primary btn-lg w-full sm:col-span-2">
          {isSubmitting ? "Creating your account…" : "Create account"}
        </button>
      </form>

      <GoogleButton onCredential={onGoogle} text="signup_with" />

      <p className="mt-8 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to={`/login${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-moss hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
