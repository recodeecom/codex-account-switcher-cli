import { afterEach, describe, expect, it, vi } from "vitest";

import { getMedusaConnectionSnapshot } from "@/lib/medusa/store";
import { medusaStoreFetch } from "@/lib/medusa/client";

vi.mock("@/lib/medusa/client", () => ({
  medusaStoreFetch: vi.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

describe("getMedusaConnectionSnapshot", () => {
  it("maps store regions and reflects runtime configuration", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = "https://commerce.example.com/";
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_live_123";

    vi.mocked(medusaStoreFetch).mockResolvedValue({
      regions: [
        {
          id: "reg_hu",
          name: "Hungary",
          currency_code: "eur",
          countries: [{ iso_2: "hu" }, { iso_2: "sk" }],
        },
      ],
    });

    await expect(getMedusaConnectionSnapshot()).resolves.toEqual({
      backendUrl: "https://commerce.example.com",
      publishableKeyConfigured: true,
      regions: [
        {
          id: "reg_hu",
          name: "Hungary",
          currencyCode: "EUR",
          countryCodes: ["HU", "SK"],
        },
      ],
    });

    expect(medusaStoreFetch).toHaveBeenCalledWith("/regions");
  });

  it("provides safe fallbacks for incomplete region payloads", async () => {
    delete process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
    delete process.env.MEDUSA_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
    delete process.env.MEDUSA_PUBLISHABLE_KEY;

    vi.mocked(medusaStoreFetch).mockResolvedValue({
      regions: [{ countries: [{ iso_2: "hu" }] }],
    });

    await expect(getMedusaConnectionSnapshot()).resolves.toEqual({
      backendUrl: "http://localhost:9000",
      publishableKeyConfigured: false,
      regions: [
        {
          id: "region-1",
          name: "region-1",
          currencyCode: null,
          countryCodes: ["HU"],
        },
      ],
    });
  });
});
