import { ApiError, del, get, patch, post } from "@/lib/api-client";

import {
  ApiKeyCreateRequestSchema,
  ApiKeyCreateResponseSchema,
  ApiKeyListSchema,
  ApiKeySchema,
  ApiKeyUpdateRequestSchema,
} from "@/features/api-keys/schemas";
import { ApiKeyTrendsResponseSchema, ApiKeyUsage7DayResponseSchema } from "@/features/apis/schemas";

const API_KEYS_BASE_PATHS = ["/api/api-keys", "/api/keys"] as const;

async function withApiKeysPathFallback<T>(
  operation: (basePath: (typeof API_KEYS_BASE_PATHS)[number]) => Promise<T>,
): Promise<T> {
  for (let index = 0; index < API_KEYS_BASE_PATHS.length; index += 1) {
    const basePath = API_KEYS_BASE_PATHS[index];
    const isLastPath = index === API_KEYS_BASE_PATHS.length - 1;
    try {
      return await operation(basePath);
    } catch (error) {
      const isNotFound = error instanceof ApiError && error.status === 404;
      if (!isNotFound || isLastPath) {
        throw error;
      }
    }
  }

  throw new Error("Failed to resolve API keys endpoint");
}

export function listApiKeys() {
  return withApiKeysPathFallback((basePath) =>
    get(`${basePath}/`, ApiKeyListSchema),
  );
}

export function createApiKey(payload: unknown) {
  const validated = ApiKeyCreateRequestSchema.parse(payload);
  return withApiKeysPathFallback((basePath) =>
    post(`${basePath}/`, ApiKeyCreateResponseSchema, {
      body: validated,
    }),
  );
}

export function updateApiKey(keyId: string, payload: unknown) {
  const validated = ApiKeyUpdateRequestSchema.parse(payload);
  return withApiKeysPathFallback((basePath) =>
    patch(`${basePath}/${encodeURIComponent(keyId)}`, ApiKeySchema, {
      body: validated,
    }),
  );
}

export function deleteApiKey(keyId: string) {
  return withApiKeysPathFallback((basePath) =>
    del(`${basePath}/${encodeURIComponent(keyId)}`),
  );
}

export function regenerateApiKey(keyId: string) {
  return withApiKeysPathFallback((basePath) =>
    post(
      `${basePath}/${encodeURIComponent(keyId)}/regenerate`,
      ApiKeyCreateResponseSchema,
    ),
  );
}

export function getApiKeyTrends(keyId: string) {
  return withApiKeysPathFallback((basePath) =>
    get(
      `${basePath}/${encodeURIComponent(keyId)}/trends`,
      ApiKeyTrendsResponseSchema,
    ),
  );
}

export function getApiKeyUsage7Day(keyId: string) {
  return withApiKeysPathFallback((basePath) =>
    get(
      `${basePath}/${encodeURIComponent(keyId)}/usage-7d`,
      ApiKeyUsage7DayResponseSchema,
    ),
  );
}
