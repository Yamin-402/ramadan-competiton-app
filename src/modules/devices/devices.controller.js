import { registerDeviceSchema } from "./devices.validator.js";
import { devicesService } from "./devices.service.js";

export async function registerDevice(req, res) {
  const payload = registerDeviceSchema.parse(req.body);
  const data = await devicesService.registerDevice(req.auth, payload);

  res.status(200).json({ data });
}

