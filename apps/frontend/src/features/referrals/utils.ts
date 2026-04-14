export function buildReferralLink(accountId: string): string {
  const baseUrl = typeof window === "undefined" ? "https://recodee.com/" : window.location.origin;
  const url = new URL("/", baseUrl);
  url.searchParams.set("ref", accountId);
  return url.toString();
}

type JsonRecord = Record<string, unknown>;

const REFERRAL_LIST_KEYS = [
  "referrals",
  "referral",
  "referredUsers",
  "referred_users",
  "referralUsers",
  "referral_users",
  "invitedUsers",
  "invited_users",
  "inviteUsers",
  "invite_users",
  "inviteFlow",
  "invite_flow",
] as const;

const REFERRAL_BY_ACCOUNT_KEYS = [
  "referralsByAccountId",
  "referrals_by_account_id",
  "referredUsersByAccountId",
  "referred_users_by_account_id",
  "invitedUsersByAccountId",
  "invited_users_by_account_id",
] as const;

const COLLECTION_KEYS = [
  "emails",
  "users",
  "items",
  "accounts",
  "list",
  "rows",
  "data",
  "referredUsers",
  "referred_users",
  "invitedUsers",
  "invited_users",
] as const;

const EMAIL_FIELD_KEYS = ["email", "accountEmail", "customerEmail", "userEmail"] as const;

const MAX_PARSE_DEPTH = 5;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function collectEmailsFromCandidate(
  candidate: unknown,
  inviteAccountId: string | null,
  depth = 0,
): string[] {
  if (depth > MAX_PARSE_DEPTH || candidate == null) {
    return [];
  }

  const directEmail = normalizeEmail(candidate);
  if (directEmail) {
    return [directEmail];
  }

  if (Array.isArray(candidate)) {
    return candidate.flatMap((entry) => collectEmailsFromCandidate(entry, inviteAccountId, depth + 1));
  }

  const record = asRecord(candidate);
  if (!record) {
    return [];
  }

  const collected: string[] = [];

  for (const key of EMAIL_FIELD_KEYS) {
    const email = normalizeEmail(record[key]);
    if (email) {
      collected.push(email);
    }
  }

  if (inviteAccountId && inviteAccountId in record) {
    collected.push(...collectEmailsFromCandidate(record[inviteAccountId], inviteAccountId, depth + 1));
  }

  for (const key of COLLECTION_KEYS) {
    if (key in record) {
      collected.push(...collectEmailsFromCandidate(record[key], inviteAccountId, depth + 1));
    }
  }

  return collected;
}

export function extractReferredUserEmails(
  metadata: unknown,
  inviteAccountId: string | null,
): string[] {
  const metadataRecord = asRecord(metadata);
  if (!metadataRecord) {
    return [];
  }

  const candidates: unknown[] = [];
  for (const key of REFERRAL_LIST_KEYS) {
    if (key in metadataRecord) {
      candidates.push(metadataRecord[key]);
    }
  }

  if (inviteAccountId) {
    for (const key of REFERRAL_BY_ACCOUNT_KEYS) {
      const byAccount = asRecord(metadataRecord[key]);
      if (byAccount && inviteAccountId in byAccount) {
        candidates.push(byAccount[inviteAccountId]);
      }
    }
  }

  const uniqueEmails = new Set<string>();
  for (const candidate of candidates) {
    for (const email of collectEmailsFromCandidate(candidate, inviteAccountId)) {
      uniqueEmails.add(email);
    }
  }

  return [...uniqueEmails].sort((left, right) => left.localeCompare(right));
}
