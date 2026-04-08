import { model } from "@medusajs/framework/utils"

import { SeatType } from "../types"
import SubscriptionAccount from "./subscription-account"

const SubscriptionSeat = model.define("subscription_seat", {
  id: model.id().primaryKey(),
  member_name: model.text(),
  member_email: model.text(),
  role: model.text(),
  seat_type: model.enum(SeatType),
  date_added: model.dateTime(),
  account: model.belongsTo(() => SubscriptionAccount, {
    mappedBy: "seats",
  }),
})

export default SubscriptionSeat
