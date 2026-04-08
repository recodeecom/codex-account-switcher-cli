const medusaConfig = require("../medusa-config")

describe("medusa-config", () => {
  it("registers the subscription module", () => {
    expect(Object.values(medusaConfig.modules)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resolve: "./src/modules/subscription",
        }),
      ])
    )
  })
})
