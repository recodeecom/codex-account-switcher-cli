import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getBillingSummaryWorkflow } from "../../../workflows/get-billing-summary"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await getBillingSummaryWorkflow(req.scope).run({
    input: {},
  })

  res.json(result)
}
