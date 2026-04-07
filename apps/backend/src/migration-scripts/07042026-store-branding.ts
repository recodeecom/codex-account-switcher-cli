import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"

const BRANDED_STORE_NAME = "Recodee.com"

export default async function storeBranding({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModuleService = container.resolve(Modules.STORE)

  const stores = await storeModuleService.listStores()

  if (!stores.length) {
    logger.info("Store branding migration skipped: no stores found.")
    return
  }

  let updatedCount = 0

  for (const store of stores) {
    if (!store?.id || store.name === BRANDED_STORE_NAME) {
      continue
    }

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: BRANDED_STORE_NAME,
        },
      },
    })

    updatedCount += 1
  }

  if (updatedCount > 0) {
    logger.info(`Store branding migration applied to ${updatedCount} store(s).`)
  } else {
    logger.info("Store branding migration: all stores already branded.")
  }
}
