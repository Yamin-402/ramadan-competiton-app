import { apiClient, unwrapData } from "../client";

type DevicePlatform = "IOS" | "ANDROID";

interface RegisterDevicePayload {
  pushToken: string;
  platform: DevicePlatform;
}

export const devicesApi = {
  register(payload: RegisterDevicePayload) {
    return unwrapData(apiClient.post("/devices/register", payload));
  },
};
