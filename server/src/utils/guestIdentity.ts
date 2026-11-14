import { createHash, timingSafeEqual } from "node:crypto";

export const hashGuestSecret = (secret: string): string =>
  createHash("sha256").update(secret).digest("hex");

export const matchesGuestSecret = (secret: string, storedHash: string): boolean => {
  const actual = Buffer.from(hashGuestSecret(secret), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
