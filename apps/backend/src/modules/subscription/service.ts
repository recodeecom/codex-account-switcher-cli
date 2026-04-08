import { MedusaService } from "@medusajs/framework/utils"

import { subscriptionBillingFixture } from "./fixtures/summary"
import SubscriptionAccount from "./models/subscription-account"
import SubscriptionSeat from "./models/subscription-seat"
import {
  PaymentStatus,
  SubscriptionStatus,
  type SubscriptionBillingAccount,
  type SubscriptionBillingAccountCreateInput,
  type SubscriptionBillingAccountUpdateInput,
  type SubscriptionBillingMember,
  type SubscriptionBillingSummary,
} from "./types"

const DEFAULT_PLAN_CODE = "business"
const DEFAULT_PLAN_NAME = "Business"
const BILLING_CYCLE_DAYS = 30

function cloneAccount(account: SubscriptionBillingAccount): SubscriptionBillingAccount {
  return {
    ...account,
    billing_cycle: { ...account.billing_cycle },
    members: account.members.map((member) => ({ ...member })),
  }
}

const billingAccountsStore: SubscriptionBillingAccount[] = subscriptionBillingFixture.accounts.map((account) =>
  cloneAccount(account)
)

function sanitizeDomain(value: string): string {
  return value.trim().toLowerCase()
}

function buildAccountId(domain: string): string {
  const token = domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return `business-plan-${token || "account"}`
}

function withSuffix(value: string, suffix: number): string {
  return `${value}-${suffix}`
}

function parseIsoDate(value: string, label: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new SubscriptionAccountValidationError(`${label} must be a valid date`)
  }
  return parsed.toISOString()
}

function normalizeMember(member: SubscriptionBillingMember): SubscriptionBillingMember {
  if (!member.id?.trim()) {
    throw new SubscriptionAccountValidationError("Member id is required")
  }
  if (!member.name?.trim()) {
    throw new SubscriptionAccountValidationError("Member name is required")
  }
  if (!member.email?.trim()) {
    throw new SubscriptionAccountValidationError("Member email is required")
  }

  return {
    ...member,
    id: member.id.trim(),
    name: member.name.trim(),
    email: member.email.trim().toLowerCase(),
    date_added: parseIsoDate(member.date_added, "Member added date"),
  }
}

function normalizeUpdatedAccount(input: SubscriptionBillingAccountUpdateInput): SubscriptionBillingAccount {
  if (!input.id?.trim()) {
    throw new SubscriptionAccountValidationError("Billing account id is required")
  }

  const domain = sanitizeDomain(input.domain ?? "")
  if (!domain) {
    throw new SubscriptionAccountValidationError("Domain is required")
  }

  const planCode = input.plan_code?.trim() || DEFAULT_PLAN_CODE
  const planName = input.plan_name?.trim() || DEFAULT_PLAN_NAME
  if (!planCode) {
    throw new SubscriptionAccountValidationError("Plan code is required")
  }
  if (!planName) {
    throw new SubscriptionAccountValidationError("Plan name is required")
  }

  const normalizedStatus = input.subscription_status
  const entitled =
    normalizedStatus === SubscriptionStatus.CANCELED || normalizedStatus === SubscriptionStatus.EXPIRED
      ? false
      : input.entitled

  const memberIds = new Set<string>()
  const members = input.members.map((member) => {
    const normalizedMember = normalizeMember(member)
    if (memberIds.has(normalizedMember.id)) {
      throw new SubscriptionAccountValidationError(`Duplicate member id ${normalizedMember.id}`)
    }
    memberIds.add(normalizedMember.id)
    return normalizedMember
  })

  return {
    id: input.id.trim(),
    domain,
    plan_code: planCode,
    plan_name: planName,
    subscription_status: normalizedStatus,
    entitled,
    payment_status: input.payment_status,
    billing_cycle: {
      start: parseIsoDate(input.billing_cycle.start, "Billing cycle start"),
      end: parseIsoDate(input.billing_cycle.end, "Billing cycle end"),
    },
    renewal_at: input.renewal_at ? parseIsoDate(input.renewal_at, "Renewal date") : null,
    chatgpt_seats_in_use: Math.max(0, Math.floor(input.chatgpt_seats_in_use)),
    codex_seats_in_use: Math.max(0, Math.floor(input.codex_seats_in_use)),
    members,
  }
}

export class SubscriptionAccountValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SubscriptionAccountValidationError"
  }
}

export class SubscriptionAccountConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SubscriptionAccountConflictError"
  }
}

class SubscriptionModuleService extends MedusaService({
  SubscriptionAccount,
  SubscriptionSeat,
}) {
  async getBillingSummary(): Promise<SubscriptionBillingSummary> {
    return {
      accounts: billingAccountsStore.map((account) => cloneAccount(account)),
    }
  }

  async addBillingAccount(input: SubscriptionBillingAccountCreateInput): Promise<SubscriptionBillingAccount> {
    const domain = sanitizeDomain(input.domain ?? "")
    if (!domain) {
      throw new SubscriptionAccountValidationError("Domain is required")
    }

    const duplicate = billingAccountsStore.find(
      (account) => account.domain.toLowerCase() === domain
    )
    if (duplicate) {
      throw new SubscriptionAccountConflictError(`Subscription account already exists for ${domain}`)
    }

    const now = new Date()
    const cycleEnd = new Date(now.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000)

    const normalizedStatus = input.subscription_status ?? SubscriptionStatus.ACTIVE
    const entitled =
      normalizedStatus === SubscriptionStatus.CANCELED || normalizedStatus === SubscriptionStatus.EXPIRED
        ? false
        : (input.entitled ?? true)

    const baseId = buildAccountId(domain)
    const existingIds = new Set(billingAccountsStore.map((account) => account.id))
    let accountId = baseId
    let suffix = 2
    while (existingIds.has(accountId)) {
      accountId = withSuffix(baseId, suffix)
      suffix += 1
    }

    const account: SubscriptionBillingAccount = {
      id: accountId,
      domain,
      plan_code: input.plan_code?.trim() || DEFAULT_PLAN_CODE,
      plan_name: input.plan_name?.trim() || DEFAULT_PLAN_NAME,
      subscription_status: normalizedStatus,
      entitled,
      payment_status: input.payment_status ?? PaymentStatus.PAID,
      billing_cycle: {
        start: now.toISOString(),
        end: cycleEnd.toISOString(),
      },
      renewal_at: input.renewal_at ?? cycleEnd.toISOString(),
      chatgpt_seats_in_use: Math.max(0, Math.floor(input.chatgpt_seats_in_use ?? 0)),
      codex_seats_in_use: Math.max(0, Math.floor(input.codex_seats_in_use ?? 0)),
      members: [],
    }

    billingAccountsStore.push(account)

    return cloneAccount(account)
  }

  async updateBillingAccounts(
    accounts: SubscriptionBillingAccountUpdateInput[]
  ): Promise<SubscriptionBillingSummary> {
    const currentIds = new Set(billingAccountsStore.map((account) => account.id))
    if (accounts.length !== billingAccountsStore.length) {
      throw new SubscriptionAccountValidationError(
        "Billing account updates must preserve the existing account set"
      )
    }

    const seenIds = new Set<string>()
    const normalizedAccounts = accounts.map((account) => {
      const normalizedAccount = normalizeUpdatedAccount(account)
      if (!currentIds.has(normalizedAccount.id)) {
        throw new SubscriptionAccountValidationError(
          `Unknown billing account ${normalizedAccount.id}`
        )
      }
      if (seenIds.has(normalizedAccount.id)) {
        throw new SubscriptionAccountValidationError(
          `Duplicate billing account ${normalizedAccount.id}`
        )
      }
      seenIds.add(normalizedAccount.id)
      return normalizedAccount
    })

    const seenDomains = new Set<string>()
    for (const account of normalizedAccounts) {
      if (seenDomains.has(account.domain)) {
        throw new SubscriptionAccountValidationError(
          `Subscription account already exists for ${account.domain}`
        )
      }
      seenDomains.add(account.domain)
    }

    billingAccountsStore.splice(
      0,
      billingAccountsStore.length,
      ...normalizedAccounts.map((account) => cloneAccount(account))
    )

    return {
      accounts: billingAccountsStore.map((account) => cloneAccount(account)),
    }
  }
}

export default SubscriptionModuleService
