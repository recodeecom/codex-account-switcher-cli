import { subscriptionBillingFixture } from "./summary"

describe("subscriptionBillingFixture", () => {
  it("provides fixture-backed dashboard accounts with normalized subscription state", () => {
    expect(subscriptionBillingFixture.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "business-plan-edixai",
          domain: "edixai.com",
          plan_code: "business",
          plan_name: "Business",
          subscription_status: "active",
          entitled: true,
          payment_status: "paid",
        }),
      ])
    )
  })
})
