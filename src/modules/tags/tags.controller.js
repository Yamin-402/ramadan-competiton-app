import { listTagsQuerySchema } from "./tags.validator.js";
import { tagsService } from "./tags.service.js";

export async function listTags(req, res) {
  const query = listTagsQuerySchema.parse(req.query);
  const data = await tagsService.listTags(query);

  res.status(200).json({ data });
}