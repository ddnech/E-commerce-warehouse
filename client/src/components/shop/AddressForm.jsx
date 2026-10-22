import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegions } from "../../hooks/useRegions";
import Field from "../ui/Field";

const schema = z.object({
  address_title: z.string().trim().min(1, "Give it a label, like Home or Office.").max(40, "Keep the label short."),
  address_details: z.string().trim().min(5, "Enter the street address.").max(255, "That's too long."),
  province_id: z.string().min(1, "Pick a province."),
  city_id: z.string().min(1, "Pick a city."),
  postal_code: z.string().trim().regex(/^\d{5}$/, "Postal code is 5 digits."),
  is_primary: z.boolean().optional(),
});

/** Add / edit address form. `onSubmit` gets the values and should return a promise. */
export default function AddressForm({ address, onSubmit, onCancel, submitLabel = "Save address", showPrimary = true }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      address_title: address?.title || "Home",
      address_details: address?.details || "",
      province_id: address?.province?.id ? String(address.province.id) : "",
      city_id: address?.city?.id ? String(address.city.id) : "",
      postal_code: address?.postal_code || "",
      is_primary: address?.is_primary || false,
    },
  });
  const provinceId = watch("province_id");
  const { provinces, cities } = useRegions(provinceId);

  const submit = (values) => onSubmit({ ...values, province_id: Number(values.province_id), city_id: Number(values.city_id) });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Label" htmlFor="address_title" error={errors.address_title?.message}>
        <input id="address_title" className="input" aria-invalid={!!errors.address_title} {...register("address_title")} />
      </Field>
      <Field label="Postal code" htmlFor="postal_code" error={errors.postal_code?.message}>
        <input id="postal_code" inputMode="numeric" maxLength={5} className="input" aria-invalid={!!errors.postal_code} {...register("postal_code")} />
      </Field>
      <Field label="Street address" htmlFor="address_details" error={errors.address_details?.message} hint="Street, number, RT/RW, district." className="sm:col-span-2">
        <textarea id="address_details" rows={2} className="input resize-none" aria-invalid={!!errors.address_details} {...register("address_details")} />
      </Field>
      <Field label="Province" htmlFor="province_id" error={errors.province_id?.message}>
        <select
          id="province_id"
          className="input"
          aria-invalid={!!errors.province_id}
          {...register("province_id", { onChange: () => setValue("city_id", "") })}
        >
          <option value="">Choose a province</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="City or regency" htmlFor="city_id" error={errors.city_id?.message}>
        <select id="city_id" className="input" disabled={!provinceId} aria-invalid={!!errors.city_id} {...register("city_id")}>
          <option value="">{provinceId ? "Choose a city" : "Pick a province first"}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      {showPrimary && (
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-moss" {...register("is_primary")} />
          Use this as my main address
        </label>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
