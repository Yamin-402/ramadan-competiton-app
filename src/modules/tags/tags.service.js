import { tagsRepository } from "./tags.repository.js";

export const tagsService = {
  listTags(query) {
    return tagsRepository.listTags(query.includeInactive);
  },
};