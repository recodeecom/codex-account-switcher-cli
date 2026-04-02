import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createDevice, deleteDevice, listDevices } from "@/features/devices/api";
import type { DeviceCreateRequest } from "@/features/devices/schemas";

export function useDevices() {
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({
    queryKey: ["devices", "list"],
    queryFn: listDevices,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["devices", "list"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: DeviceCreateRequest) => createDevice(payload),
    onSuccess: () => {
      toast.success("Device added");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add device");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),
    onSuccess: () => {
      toast.success("Device deleted");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete device");
    },
  });

  return {
    devicesQuery,
    createMutation,
    deleteMutation,
  };
}
