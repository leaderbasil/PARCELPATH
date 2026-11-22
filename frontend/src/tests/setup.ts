import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "./server";

/**
 * Deterministic UUIDs keep idempotency-key assertions stable. jsdom does not
 * provide crypto.randomUUID in all supported versions, so only install the
 * counter when the runtime lacks it.
 */
let uuidCounter = 0;
const existingCrypto = globalThis.crypto;

if (typeof existingCrypto?.randomUUID !== "function") {
  vi.stubGlobal("crypto", {
    randomUUID: (): string => {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
    },
  });
}

/** jsdom has no matchMedia; components that read it must not crash. */
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

beforeAll(() => {
  // `error` surfaces any request that has no handler instead of silently
  // letting axios hit the network.
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  // Do NOT call unstubAllGlobals() here: the crypto polyfill must stay alive
  // for the whole test file.
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
