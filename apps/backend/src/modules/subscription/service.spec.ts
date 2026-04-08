import SubscriptionModuleService, { SubscriptionAccountValidationError } from "./service"
import { subscriptionBillingFixture } from "./fixtures/summary"

describe("SubscriptionModuleService.updateBillingAccounts", () => {
  it("updates an existing billing account and preserves the account set", async () => {
    const service = new SubscriptionModuleService({} as any)
    const baseline = await service.getBillingSummary()
    const target = baseline.accounts[0]

    const result = await service.updateBillingAccounts(
      baseline.accounts.map((account) =>
        account.id === target.id
          ? {
              ...account,
              chatgpt_seats_in_use: account.chatgpt_seats_in_use + 2,
              codex_seats_in_use: account.codex_seats_in_use + 1,
              plan_name: "Business Plus",
            }
          : account,
      ),
    )

    const updated = result.accounts.find((account) => account.id === target.id)
    expect(updated).toBeDefined()
    expect(updated?.plan_name).toBe("Business Plus")
    expect(updated?.chatgpt_seats_in_use).toBe(target.chatgpt_seats_in_use + 2)
    expect(updated?.codex_seats_in_use).toBe(target.codex_seats_in_use + 1)
    expect(result.accounts).toHaveLength(subscriptionBillingFixture.accounts.length)
  })

  it("rejects updates that change the account set", async () => {
    const service = new SubscriptionModuleService({} as any)
    const baseline = await service.getBillingSummary()

    await expect(service.updateBillingAccounts(baseline.accounts.slice(0, 1))).rejects.toThrow(
      new SubscriptionAccountValidationError("Billing account updates must preserve the existing account set"),
    )
  })
})
