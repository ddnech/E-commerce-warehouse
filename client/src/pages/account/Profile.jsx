import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, MailWarning, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { assetUrl, errorMessage } from "../../lib/api";
import { useShop } from "../../auth/ShopContext";
import { useObjectUrl } from "../../hooks/useObjectUrl";
import Field from "../../components/ui/Field";
import PasswordInput from "../../components/ui/PasswordInput";
import { passwordRule } from "../auth/Register";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required.").max(60),
  last_name: z.string().trim().max(60),
  username: z
    .string()
    .trim()
    .min(3, "Username must be 3 to 30 characters.")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, dots and underscores."),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "Enter an Indonesian mobile number, like 081234567890.")])),
});

const passwordSchema = z
  .object({ current_password: z.string().min(1, "Enter your current password."), new_password: passwordRule, confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

const MAX_AVATAR = 2 * 1024 * 1024;

function ProfileForm() {
  const { user, saveSession } = useShop();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const preview = useObjectUrl(file);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: user.first_name, last_name: user.last_name, username: user.username, phone: user.phone || "" },
  });

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Pick an image file.");
    if (f.size > MAX_AVATAR) return toast.error("That photo is over 2 MB. Try a smaller one.");
    setFile(f);
    setRemoveAvatar(false);
  };

  const onSubmit = async (values) => {
    const form = new FormData();
    Object.entries(values).forEach(([k, v]) => form.append(k, v));
    if (file) form.append("avatar", file);
    if (removeAvatar) form.append("remove_avatar", "true");
    try {
      const { data } = await api.patch("/account/profile", form);
      saveSession(null, data.user);
      setFile(null);
      setRemoveAvatar(false);
      toast.success(data.message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const shown = preview || (!removeAvatar && assetUrl(user.avatar));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="panel p-6">
      <h2 className="text-xl font-bold">Your details</h2>
      <div className="mt-6 flex items-center gap-5">
        {shown ? (
          <img src={shown} alt="Your photo" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-moss-tint text-2xl font-bold text-moss">{user.first_name?.[0]?.toUpperCase() || "?"}</span>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="hidden" />
          <button type="button" onClick={() => fileInput.current.click()} className="btn-secondary btn-sm">
            <Camera size={15} aria-hidden="true" /> {shown ? "Change photo" : "Add a photo"}
          </button>
          {shown && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setRemoveAvatar(!!user.avatar);
              }}
              className="btn-ghost btn-sm"
            >
              <Trash2 size={15} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" error={errors.first_name?.message}>
          <input id="first_name" className="input" {...register("first_name")} />
        </Field>
        <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
          <input id="last_name" className="input" {...register("last_name")} />
        </Field>
        <Field label="Username" htmlFor="username" error={errors.username?.message}>
          <input id="username" className="input" {...register("username")} />
        </Field>
        <Field label="Mobile number" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" type="tel" className="input" {...register("phone")} />
        </Field>
        <Field label="Email" htmlFor="email" hint="Your email can't be changed." className="sm:col-span-2">
          <input id="email" value={user.email} disabled className="input opacity-70" />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <button disabled={isSubmitting || (!isDirty && !file && !removeAvatar)} className="btn-primary">
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async ({ current_password, new_password }) => {
    try {
      const { data } = await api.patch("/account/password", { current_password, new_password });
      toast.success(data.message);
      reset({ current_password: "", new_password: "", confirm: "" });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="panel p-6">
      <h2 className="text-xl font-bold">Change password</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <Field label="Current password" htmlFor="current_password" error={errors.current_password?.message}>
          <PasswordInput id="current_password" autoComplete="current-password" {...register("current_password")} />
        </Field>
        <Field label="New password" htmlFor="new_password" error={errors.new_password?.message}>
          <PasswordInput id="new_password" autoComplete="new-password" {...register("new_password")} />
        </Field>
        <Field label="Type it again" htmlFor="confirm" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" {...register("confirm")} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-ink-soft">8+ characters with a capital letter, a number and a symbol.</p>
      <div className="mt-6 flex justify-end">
        <button disabled={isSubmitting} className="btn-secondary">
          {isSubmitting ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}

export default function Profile() {
  const { user, refreshUser } = useShop();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/auth/resend-verification");
      toast.success(data.message);
    } catch (e) {
      toast.error(errorMessage(e));
      refreshUser();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {!user.is_verified && (
        <div className="flex flex-col gap-3 rounded-2xl bg-sun-tint p-5 text-sun sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm">
            <MailWarning size={20} className="shrink-0" aria-hidden="true" />
            Your email isn't confirmed yet. You'll need to confirm it before placing an order.
          </p>
          <button onClick={resend} disabled={sending} className="btn-secondary btn-sm shrink-0">
            {sending ? "Sending…" : "Send the link again"}
          </button>
        </div>
      )}
      <ProfileForm />
      {user.signed_up_with === "email" ? (
        <PasswordForm />
      ) : (
        <p className="panel p-6 text-sm text-ink-soft">You sign in with Google, so there's no password to manage here.</p>
      )}
    </div>
  );
}
