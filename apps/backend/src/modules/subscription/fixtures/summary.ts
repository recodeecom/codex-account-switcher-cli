import {
  PaymentStatus,
  SeatType,
  SubscriptionStatus,
  type SubscriptionBillingSummary,
} from "../types"

export const subscriptionBillingFixture: SubscriptionBillingSummary = {
  accounts: [
    {
      id: "business-plan-edixai",
      domain: "edixai.com",
      plan_code: "business",
      plan_name: "Business",
      subscription_status: SubscriptionStatus.ACTIVE,
      entitled: true,
      payment_status: PaymentStatus.PAID,
      billing_cycle: {
        start: "2026-03-23T00:00:00.000Z",
        end: "2026-04-23T00:00:00.000Z",
      },
      renewal_at: "2026-04-23T00:00:00.000Z",
      chatgpt_seats_in_use: 5,
      codex_seats_in_use: 5,
      members: [
        {
          id: "member-edixai-owner",
          name: "Edix.ai (You)",
          email: "admin@edixai.com",
          role: "Owner",
          seat_type: SeatType.CHATGPT,
          date_added: "2026-03-23T00:00:00.000Z",
        },
        {
          id: "member-bianka-belovics",
          name: "Bianka Belovics",
          email: "bia@edixai.com",
          role: "Member",
          seat_type: SeatType.CHATGPT,
          date_added: "2026-03-30T00:00:00.000Z",
        },
      ],
    },
    {
      id: "business-plan-kozpont",
      domain: "kozpontihusbolt.hu",
      plan_code: "business",
      plan_name: "Business",
      subscription_status: SubscriptionStatus.PAST_DUE,
      entitled: false,
      payment_status: PaymentStatus.PAST_DUE,
      billing_cycle: {
        start: "2026-03-26T00:00:00.000Z",
        end: "2026-04-26T00:00:00.000Z",
      },
      renewal_at: "2026-04-26T00:00:00.000Z",
      chatgpt_seats_in_use: 5,
      codex_seats_in_use: 5,
      members: [
        {
          id: "member-kozpont-admin",
          name: "Kozpont Admin",
          email: "admin@kozpontihusbolt.hu",
          role: "Owner",
          seat_type: SeatType.CHATGPT,
          date_added: "2026-03-23T00:00:00.000Z",
        },
      ],
    },
    {
      id: "business-plan-kronakert",
      domain: "kronakert.hu",
      plan_code: "trial",
      plan_name: "Trial",
      subscription_status: SubscriptionStatus.TRIALING,
      entitled: true,
      payment_status: PaymentStatus.PAID,
      billing_cycle: {
        start: "2026-04-01T00:00:00.000Z",
        end: "2026-05-01T00:00:00.000Z",
      },
      renewal_at: "2026-05-01T00:00:00.000Z",
      chatgpt_seats_in_use: 3,
      codex_seats_in_use: 3,
      members: [
        {
          id: "member-kronakert-owner",
          name: "Kronakert Owner",
          email: "owner@kronakert.hu",
          role: "Owner",
          seat_type: SeatType.CHATGPT,
          date_added: "2026-04-01T00:00:00.000Z",
        },
      ],
    },
  ],
}
