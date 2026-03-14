import {
  generateMyAiReportSchema,
  publicProfileParamsSchema,
  updateMyProfileSchema,
  updateMyTagsSchema,
} from "./users.validator.js";
import { usersService } from "./users.service.js";

export async function getMyProfile(req, res) {
  const data = await usersService.getMyProfile(req.auth);
  res.status(200).json({ data });
}

export async function updateMyTags(req, res) {
  const payload = updateMyTagsSchema.parse(req.body);
  const data = await usersService.updateMyTags(req.auth, payload);

  res.status(200).json({ data });
}

export async function updateMyProfile(req, res) {
  const payload = updateMyProfileSchema.parse(req.body);
  const data = await usersService.updateMyProfile(req.auth, payload);

  res.status(200).json({ data });
}

export async function getPublicProfile(req, res) {
  const { id } = publicProfileParamsSchema.parse(req.params);
  const data = await usersService.getPublicProfile(req.auth, id);

  res.status(200).json({ data });
}

export async function generateMyAiReport(req, res) {
  const payload = generateMyAiReportSchema.parse(req.body || {});
  const data = await usersService.generateMyAiReport(req.auth, payload);

  res.status(200).json({ data });
}
