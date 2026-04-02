import { z } from "zod";

export const DeviceEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ipAddress: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const DevicesResponseSchema = z.object({
  entries: z.array(DeviceEntrySchema).default([]),
});

export const DeviceCreateRequestSchema = z.object({
  name: z.string().min(1).max(128),
  ipAddress: z.string().min(1),
});

export const DeviceDeleteResponseSchema = z.object({
  status: z.string().min(1),
});

export type DeviceEntry = z.infer<typeof DeviceEntrySchema>;
export type DevicesResponse = z.infer<typeof DevicesResponseSchema>;
export type DeviceCreateRequest = z.infer<typeof DeviceCreateRequestSchema>;
export type DeviceDeleteResponse = z.infer<typeof DeviceDeleteResponseSchema>;
