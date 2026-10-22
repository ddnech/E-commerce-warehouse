import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../../lib/api";
import AuthShell from "../../components/shop/AuthShell";
import Field from "../../components/ui/Field";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address.") });

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    try {
      await api.post("/auth/forgot-password", { email });
      setSentTo(email);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Forgot your password?" subtitle="It happens. We'll email you a link to choose a new one." art="lounger">
      {sentTo ? (
        <div className="rounded-xl bg-moss-tint/50 p-5 text-sm">
          <MailCheck size={22} className="text-moss" aria-hidden="true" />
          <p className="mt-3">
            If <strong>{sentTo}</strong> has an account, the link is on its way. It works for 30 minutes.
          </p>
          <p className="mt-2 text-ink-soft">Running this locally? The email lands in Mailpit at localhost:8027.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <button disabled={isSubmitting} className="btn-primary btn-lg w-full">
            {isSubmitting ? "Sending…" : "Send me the link"}
          </button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="font-semibold text-moss hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
