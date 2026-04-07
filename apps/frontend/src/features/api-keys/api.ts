import { del, get, patch, post } from "@/lib/api-client";

import {
  ApiKeyCreateRequestSchema,
  ApiKeyCreateResponseSchema,
  ApiKeyListSchema,
  ApiKeySchema,
  ApiKeyUpdateRequestSchema,
  ModelsResponseSchema,
} from "@/features/api-keys/schemas";
import {
  callApiKeysResolvedPath,
  callApiKeysWithFallback,
} from "@/features/api-keys/api-paths";
const MODELS_PATH = "/api/models";

export function listApiKeys() {
  return callApiKeysWithFallback((basePath) =>
    get(`${basePath}/`, ApiKeyListSchema),
  );
}

export function createApiKey(payload: unknown) {
  const validated = ApiKeyCreateRequestSchema.parse(payload);
  return callApiKeysWithFallback((basePath) =>
    post(`${basePath}/`, ApiKeyCreateResponseSchema, {
      body: validated,
    }),
  );
}

export function updateApiKey(keyId: string, payload: unknown) {
  const validated = ApiKeyUpdateRequestSchema.parse(payload);
  return callApiKeysResolvedPath((basePath) =>
    patch(`${basePath}/${encodeURIComponent(keyId)}`, ApiKeySchema, {
      body: validated,
    }),
  );
}

export function deleteApiKey(keyId: string) {
  return callApiKeysResolvedPath((basePath) =>
    del(`${basePath}/${encodeURIComponent(keyId)}`),
  );
}

export function regenerateApiKey(keyId: string) {
  return callApiKeysResolvedPath((basePath) =>
    post(
      `${basePath}/${encodeURIComponent(keyId)}/regenerate`,
      ApiKeyCreateResponseSchema,
    ),
  );
}

export function listModels() {
  return get(MODELS_PATH, ModelsResponseSchema);
}
