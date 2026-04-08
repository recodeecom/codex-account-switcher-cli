import { GET } from "./route"
import { getBillingSummaryWorkflow } from "../../../workflows/get-billing-summary"

jest.mock("../../../workflows/get-billing-summary", () => ({
  getBillingSummaryWorkflow: jest.fn(),
}))

describe("GET /billing/summary", () => {
  it("runs the billing summary workflow and returns its result", async () => {
    const run = jest.fn().mockResolvedValue({
      result: {
        accounts: [{ id: "business-plan-edixai", domain: "edixai.com" }],
      },
    })

    ;(getBillingSummaryWorkflow as jest.Mock).mockReturnValue({ run })

    const req = { scope: { resolve: jest.fn() } } as any
    const res = { json: jest.fn() } as any

    await GET(req, res)

    expect(getBillingSummaryWorkflow).toHaveBeenCalledWith(req.scope)
    expect(run).toHaveBeenCalledWith({ input: {} })
    expect(res.json).toHaveBeenCalledWith({
      accounts: [{ id: "business-plan-edixai", domain: "edixai.com" }],
    })
  })
})
