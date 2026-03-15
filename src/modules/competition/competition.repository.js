import { prisma } from "../../core/db/prisma.js";
import { COMPETITION_STATE_KEY } from "./competition.constants.js";

export const competitionRepository = {
  getState() {
    return prisma.appSetting.findUnique({
      where: { key: COMPETITION_STATE_KEY },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
    });
  },

  upsertState(value) {
    return prisma.appSetting.upsert({
      where: { key: COMPETITION_STATE_KEY },
      update: { value },
      create: { key: COMPETITION_STATE_KEY, value },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
    });
  },
};
