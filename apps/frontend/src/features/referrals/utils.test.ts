import { describe, expect, it } from "vitest";

import { buildReferralLink, extractReferredUserEmails } from "@/features/referrals/utils";

describe("buildReferralLink", () => {
  it("creates a stable referral URL from account id", () => {
    const link = buildReferralLink("acc_primary");
    const url = new URL(link);

    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("ref")).toBe("acc_primary");
  });
});

describe("extractReferredUserEmails", () => {
  it("returns empty list when metadata has no referral fields", () => {
    const emails = extractReferredUserEmails(
      {
        codex_lb_dashboard_overview_v1: {
          accounts: [{ email: "primary@example.com" }, { email: "secondary@example.com" }],
        },
      },
      "acc_primary",
    );

    expect(emails).toEqual([]);
  });

  it("extracts deduplicated emails from nested referral metadata", () => {
    const emails = extractReferredUserEmails(
      {
        referrals: {
          emails: ["alice@example.com", "invalid-email", "ALICE@example.com"],
          users: [
            { email: "bob@example.com" },
            { accountEmail: "carol@example.com" },
          ],
        },
      },
      "acc_primary",
    );

    expect(emails).toEqual([
      "alice@example.com",
      "bob@example.com",
      "carol@example.com",
    ]);
  });

  it("scopes account-keyed metadata to the selected invite account", () => {
    const emails = extractReferredUserEmails(
      {
        referred_users_by_account_id: {
          acc_primary: ["one@example.com"],
          acc_secondary: ["two@example.com"],
        },
      },
      "acc_secondary",
    );

    expect(emails).toEqual(["two@example.com"]);
  });
});
