import dayjs from "dayjs";

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const rupiah = (value) => idr.format(value || 0);

export const formatDate = (value, pattern = "D MMM YYYY") => (value ? dayjs(value).format(pattern) : "-");
export const formatDateTime = (value) => (value ? dayjs(value).format("D MMM YYYY, HH:mm") : "-");

export const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;

export const kg = (grams) => `${(grams / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`;

/** "2 days" from a courier ETD like "2-3". */
export const etdLabel = (etd) => (etd ? `${etd} ${etd === "1" ? "day" : "days"}` : "");

export const MONTHS = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format("MMMM"));

/** Status names and colours, shared by the shop and the admin panel. */
export const ORDER_STATUS = {
  waiting_payment: { label: "Waiting for payment", tone: "sun" },
  waiting_confirmation: { label: "Checking payment", tone: "sky" },
  payment_rejected: { label: "Payment rejected", tone: "clay" },
  processing: { label: "Being prepared", tone: "sky" },
  shipped: { label: "On the way", tone: "moss" },
  completed: { label: "Delivered", tone: "moss" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export const TONE = {
  sun: "bg-sun-tint text-sun",
  sky: "bg-sky-tint text-sky",
  clay: "bg-clay-tint text-clay",
  moss: "bg-moss-tint text-moss",
  teak: "bg-teak-tint text-teak",
  muted: "bg-canvas text-ink-soft border border-line",
};
