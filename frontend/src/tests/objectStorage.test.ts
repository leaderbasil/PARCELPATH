import { afterEach, describe, expect, it, vi } from "vitest";

import { config } from "@/config";
import { putImage } from "@/services/objectStorage";

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("object storage upload", () => {
  it("posts to the configured backend URL and reads data.url from the envelope", async () => {
    sessionStorage.setItem("access_token", "real-token");
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { url: "http://localhost:8000/uploads/a.png" },
            message: "Image uploaded",
          }),
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["png"], "product.png", { type: "image/png" });
    const url = await putImage(file);

    expect(url).toBe("http://localhost:8000/uploads/a.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit] | undefined;
    expect(call).toBeDefined();
    if (!call) throw new Error("fetch was not called");
    const [target, init] = call;
    expect(target).toBe(config.objectStorageUploadUrl);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer real-token" });
    expect(init.body).toBeInstanceOf(FormData);
  });
});
