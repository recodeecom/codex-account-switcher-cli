import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import SubscriptionModuleService from "../modules/subscription/service"
import type { SubscriptionBillingSummary } from "../modules/subscription/types"

const getBillingSummaryStep = createStep(
  "get-billing-summary",
  async (_input: Record<string, never>, { container }) => {
    const subscriptionModuleService: SubscriptionModuleService = container.resolve(
      SUBSCRIPTION_MODULE
    )

    const summary = await subscriptionModuleService.getBillingSummary()

    return new StepResponse(summary)
  }
)

export const getBillingSummaryWorkflow = createWorkflow(
  "get-billing-summary",
  (_input: Record<string, never>) => {
    const summary = getBillingSummaryStep({})

    return new WorkflowResponse<SubscriptionBillingSummary>(summary)
  }
)
