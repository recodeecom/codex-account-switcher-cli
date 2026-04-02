import { del, get, post } from "@/lib/api-client";

import {
  DeviceCreateRequestSchema,
  DeviceDeleteResponseSchema,
  DeviceEntrySchema,
  DevicesResponseSchema,
} from "@/features/devices/schemas";

const DEVICES_BASE_PATH = "/api/devices";

export function listDevices() {
  return get(DEVICES_BASE_PATH, DevicesResponseSchema);
}

export function createDevice(payload: unknown) {
  const validated = DeviceCreateRequestSchema.parse(payload);
  return post(DEVICES_BASE_PATH, DeviceEntrySchema, {
    body: validated,
  });
}

export function deleteDevice(deviceId: string) {
  return del(`${DEVICES_BASE_PATH}/${encodeURIComponent(deviceId)}`, DeviceDeleteResponseSchema);
}
