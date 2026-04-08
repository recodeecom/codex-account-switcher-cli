import { MedusaService } from "@medusajs/framework/utils"

import { subscriptionBillingFixture } from "./fixtures/summary"
import SubscriptionAccount from "./models/subscription-account"
import SubscriptionSeat from "./models/subscription-seat"
import type { SubscriptionBillingSummary } from "./types"

class SubscriptionModuleService extends MedusaService({
  SubscriptionAccount,
  SubscriptionSeat,
}) {
  async getBillingSummary(): Promise<SubscriptionBillingSummary> {
    return subscriptionBillingFixture
  }
}

export default SubscriptionModuleService
