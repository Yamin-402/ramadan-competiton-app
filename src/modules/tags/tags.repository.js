import { prisma } from "../../core/db/prisma.js";

export const tagsRepository = {
  listTags(includeInactive) {
    return prisma.tag.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { key: "asc" },
    });
  },
};