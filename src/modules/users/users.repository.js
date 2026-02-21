import { prisma } from "../../core/db/prisma.js";

const userProfileSelect = {
  id: true,
  email: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  isStreakPublic: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  tags: {
    include: {
      tag: true,
    },
  },
};

export const usersRepository = {
  findById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });
  },

  findTagsByKeys(tagKeys) {
    return prisma.tag.findMany({
      where: {
        key: { in: tagKeys },
        isActive: true,
      },
    });
  },

  async replaceUserTags(userId, tagIds) {
    return prisma.$transaction(async (tx) => {
      await tx.userTag.deleteMany({ where: { userId } });

      if (tagIds.length > 0) {
        await tx.userTag.createMany({
          data: tagIds.map((tagId) => ({ userId, tagId })),
          skipDuplicates: true,
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        select: userProfileSelect,
      });
    });
  },

  async updateProfile(userId, payload) {
    await prisma.user.updateMany({
      where: { id: userId },
      data: {
        ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
        ...(payload.isStreakPublic !== undefined
          ? { isStreakPublic: payload.isStreakPublic }
          : {}),
      },
    });

    return prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });
  },

  async findPublicProfileById(viewerUserId, targetUserId) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isStreakPublic: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const canShowStreak = viewerUserId === user.id || user.isStreakPublic;
    if (!canShowStreak) {
      return {
        id: user.id,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        isStreakPublic: user.isStreakPublic,
        streakSummary: null,
      };
    }

    const [activeCount, maxValues] = await Promise.all([
      prisma.streak.count({
        where: {
          userId: user.id,
          currentStreak: { gt: 0 },
        },
      }),
      prisma.streak.aggregate({
        where: { userId: user.id },
        _max: {
          currentStreak: true,
          longestStreak: true,
        },
      }),
    ]);

    return {
      id: user.id,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      isStreakPublic: user.isStreakPublic,
      streakSummary: {
        activeStreaks: activeCount,
        bestCurrentStreak: maxValues._max.currentStreak || 0,
        longestStreak: maxValues._max.longestStreak || 0,
      },
    };
  },
};
