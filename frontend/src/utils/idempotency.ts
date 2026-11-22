const STORAGE_KEY = "checkout:idempotency-key";

/** Create (or reuse) the idempotency key for the current checkout attempt. */
export function getIdempotencyKey(): string {
  const existing = sessionStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(STORAGE_KEY, created);
  return created;
}

/** Invalidate only after an order was successfully created. */
export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Call when the cart or shipping/payment details change materially. */
export function refreshIdempotencyKey(): void {
  clearIdempotencyKey();
  getIdempotencyKey();
}
