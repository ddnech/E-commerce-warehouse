import { Link, useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import AuthShell from "../../components/shop/AuthShell";
import Field from "../../components/ui/Field";
import PasswordInput from "../../components/ui/PasswordInput";
import { passwordRule } from "./Register";

const schema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      toast.success(data.message);
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Choose a new password" art="bed" fabric="#5f7486">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="New password" htmlFor="password" error={errors.password?.message} hint="8+ characters with a capital, a number and a symbol.">
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label="Type it again" htmlFor="confirm" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        <button disabled={isSubmitting} className="btn-primary btn-lg w-full">
          {isSubmitting ? "Saving…" : "Save new password"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm">
        <Link to="/forgot-password" className="font-semibold text-moss hover:underline">
          Need a new link?
        </Link>
      </p>
    </AuthShell>
  );
}
