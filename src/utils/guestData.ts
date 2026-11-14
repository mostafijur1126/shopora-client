import { OrderItem } from "../types";
import type { GuestIdentity } from "../services/api";

export interface GuestProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  district: string;
}

export interface GuestData {
  identity: GuestIdentity;
  profile: GuestProfile;
  orders: OrderItem[];
}

export const GUEST_DATA_KEY = "shopora_guest_data";

const createIdentity = (): GuestIdentity => {
  if (!window.crypto?.randomUUID || !window.crypto?.getRandomValues) {
    throw new Error("Secure browser storage is required for guest checkout.");
  }
  const bytes = window.crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { guestId: window.crypto.randomUUID(), secret };
};

export const createGuestData = (): GuestData => ({
  identity: createIdentity(),
  profile: { name: "", phone: "", email: "", address: "", district: "Dhaka" },
  orders: [],
});

export const loadGuestData = (): GuestData => {
  const saved = localStorage.getItem(GUEST_DATA_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<GuestData>;
      if (
        typeof parsed.identity?.guestId === "string" &&
        parsed.identity.guestId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ) &&
        typeof parsed.identity.secret === "string" &&
        /^[0-9a-f]{64}$/i.test(parsed.identity.secret) &&
        parsed.profile &&
        ["name", "phone", "email", "address", "district"].every(
          (field) => typeof parsed.profile?.[field as keyof GuestData["profile"]] === "string",
        ) &&
        Array.isArray(parsed.orders)
      ) {
        return parsed as GuestData;
      }
      console.error("Saved guest data is invalid; starting a new guest session.");
    } catch (error) {
      console.error("Failed to parse saved guest data", error);
    }
  }
  return createGuestData();
};
