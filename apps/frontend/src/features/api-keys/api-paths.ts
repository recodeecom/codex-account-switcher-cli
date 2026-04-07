import { ApiError } from "@/lib/api-client";

const API_KEYS_BASE_PATHS = ["/api/api-keys", "/api/keys"] as const;

type ApiKeysBasePath = (typeof API_KEYS_BASE_PATHS)[number];

let resolvedApiKeysBasePath: ApiKeysBasePath | null = null;

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

async function callApiKeysEndpoint<T>(
  operation: (basePath: ApiKeysBasePath) => Promise<T>,
  options: { fallbackOnNotFound: boolean },
): Promise<T> {
  if (resolvedApiKeysBasePath) {
    return operation(resolvedApiKeysBasePath);
  }

  if (!options.fallbackOnNotFound) {
    const primaryPath = API_KEYS_BASE_PATHS[0];
    const result = await operation(primaryPath);
    resolvedApiKeysBasePath = primaryPath;
    return result;
  }

  for (let index = 0; index < API_KEYS_BASE_PATHS.length; index += 1) {
    const basePath = API_KEYS_BASE_PATHS[index];
    const isLastPath = index === API_KEYS_BASE_PATHS.length - 1;
    try {
      const result = await operation(basePath);
      resolvedApiKeysBasePath = basePath;
      return result;
    } catch (error) {
      if (!isNotFound(error) || isLastPath) {
        throw error;
      }
    }
  }

  throw new Error("Failed to resolve API keys endpoint");
}

export function callApiKeysWithFallback<T>(
  operation: (basePath: ApiKeysBasePath) => Promise<T>,
): Promise<T> {
  return callApiKeysEndpoint(operation, { fallbackOnNotFound: true });
}

export function callApiKeysResolvedPath<T>(
  operation: (basePath: ApiKeysBasePath) => Promise<T>,
): Promise<T> {
  return callApiKeysEndpoint(operation, { fallbackOnNotFound: false });
}

export function resetApiKeysResolvedPathForTests() {
  resolvedApiKeysBasePath = null;
}
