import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { devicesRepository } from "./devices.repository.js";

export const devicesService = {
  registerDevice(auth, payload) {
    const userId = getAuthUserId(auth);
    return devicesRepository.upsertDevice({
      userId,
      pushToken: payload.pushToken,
      platform: payload.platform,
    });
  },
};

