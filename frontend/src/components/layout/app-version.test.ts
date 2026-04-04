import { describe, expect, it, vi } from "vitest";

import { fetchRuntimeAppVersion } from "@/components/layout/app-version";

function okJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchRuntimeAppVersion", () => {
  it("returns version from the first successful source", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okJsonResponse({ version: "1.10.71" }));

    const version = await fetchRuntimeAppVersion(fetchMock);

    expect(version).toBe("1.10.71");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to next source after a failed request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(okJsonResponse({ version: "1.10.72" }));

    const version = await fetchRuntimeAppVersion(fetchMock);

    expect(version).toBe("1.10.72");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when no source yields a valid version", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(okJsonResponse({ version: 123 }));

    const version = await fetchRuntimeAppVersion(fetchMock);

    expect(version).toBeNull();
  });
});

