import { prisma } from "../../core/db/prisma.js";

function toTagLabel(tagKey) {
  return tagKey
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export const authRepository = {
  findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  },

  async upsertTagsByKeys(tagKeys) {
    if (tagKeys.length === 0) {
      return [];
    }

    const rows = await Promise.all(
      tagKeys.map((key) =>
        prisma.tag.upsert({
          where: { key },
          update: {
            isActive: true,
          },
          create: {
            key,
            label: toTagLabel(key),
            isActive: true,
          },
        })
      )
    );

    return rows;
  },

  async createUser(data) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          tags:
            data.tagIds && data.tagIds.length > 0
              ? {
                  create: data.tagIds.map((tagId) => ({
                    tagId,
                  })),
                }
              : undefined,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      if (typeof data.initialPoints === "number" && data.initialPoints !== 0) {
        await tx.activity.create({
          data: {
            userId: user.id,
            type: "SYSTEM",
            isDuringFasting: false,
            fastingMultiplier: 1,
            basePoints: data.initialPoints,
            effectivePoints: data.initialPoints,
            note: "Initial points balance",
            metadata: {
              kind: "INITIAL_POINTS",
            },
          },
        });
      }

      return user;
    });
  },
};
