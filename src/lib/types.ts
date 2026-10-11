export const packages = [
  "Breakfast",
  "Half board",
  "Room upsell",
  "Suite upsell",
] as const;
export type Package = (typeof packages)[number];
export type Role = "admin" | "user";
export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};
export type ManagedUser = User & {
  deletedAt: string | null;
  createdAt: string;
  hasPassword: boolean;
};
export type Sale = {
  id: string;
  guestName: string;
  confirmation: string;
  room: string;
  package: Package;
  /** Upsell value in AED per night. */
  amount: number;
  nights: number;
  soldAt: string;
  opera: "pending" | "self" | "other";
  updatedBy: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
export function saleRevenue(sale: Pick<Sale, "amount" | "nights">) {
  // Work in whole fils so decimal rates do not accumulate floating-point errors.
  return (Math.round(sale.amount * 100) * sale.nights) / 100;
}
export function dubaiDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function localInput(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(" ", "T");
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
