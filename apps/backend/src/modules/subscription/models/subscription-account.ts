import { model } from "@medusajs/framework/utils"

import { PaymentStatus, SubscriptionStatus } from "../types"
import SubscriptionSeat from "./subscription-seat"

const SubscriptionAccount = model.define("subscription_account", {
  id: model.id().primaryKey(),
  domain: model.text(),
  plan_code: model.text(),
  plan_name: model.text(),
  subscription_status: model.enum(SubscriptionStatus),
  entitled: model.boolean().default(false),
  payment_status: model.enum(PaymentStatus),
  billing_cycle_start: model.dateTime(),
  billing_cycle_end: model.dateTime(),
  renewal_at: model.dateTime().nullable(),
  chatgpt_seats_in_use: model.number().default(0),
  codex_seats_in_use: model.number().default(0),
  seats: model.hasMany(() => SubscriptionSeat, {
    mappedBy: "account",
  }),
})

export default SubscriptionAccount
