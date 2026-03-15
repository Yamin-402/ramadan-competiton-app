import { AppError } from "../../core/errors/app-error.js";
import { adminRepository } from "../admin/admin.repository.js";
import { dailyQuestionsService } from "../daily-questions/daily-questions.service.js";
import { competitionRepository } from "./competition.repository.js";
import {
  COMPETITION_STATE_KEY,
  DEFAULT_COMPETITION_STATE,
} from "./competition.constants.js";

function normalizeWinner(raw, index) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const userId = Number(raw.userId ?? raw.id);
  if (!Number.isFinite(userId)) {
    return null;
  }
  const rank = Number(raw.rank) || index + 1;
  const displayName = raw.displayName || raw.name || raw.email || `User ${userId}`;
  const avatarUrl = raw.avatarUrl || null;
  const totalPointsRaw = raw.totalPoints ?? raw.score;
  const totalPoints = Number.isFinite(Number(totalPointsRaw)) ? Number(totalPointsRaw) : null;
  return {
    userId,
    rank,
    displayName,
    avatarUrl,
    totalPoints,
  };
}

function normalizeCompetitionState(value) {
  const raw = value && typeof value === "object" ? value : {};
  const winnersRaw = Array.isArray(raw.winners) ? raw.winners : [];
  const winners = winnersRaw
    .map((winner, index) => normalizeWinner(winner, index))
    .filter(Boolean);
  const allowedUserIds = Array.isArray(raw.allowedUserIds)
    ? raw.allowedUserIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];

  return {
    ...DEFAULT_COMPETITION_STATE,
    ...raw,
    winners,
    allowedUserIds,
    isOpen: raw.isOpen !== false,
    closedAt: raw.closedAt ? String(raw.closedAt) : null,
    showWinnersPopup: Boolean(raw.showWinnersPopup),
  };
}

function isUserAllowed(state, userId) {
  if (state.isOpen) {
    return true;
  }
  return state.allowedUserIds.includes(Number(userId));
}

async function computeWinners() {
  const rows = await adminRepository.getLeaderboardRows(10);
  const eligible = rows.filter((row) => row.user?.isLeaderboardVisible !== false);
  return eligible.slice(0, 3).map((row, index) => ({
    userId: row.user.id,
    rank: index + 1,
    displayName: row.user.displayName || row.user.email || `User ${row.user.id}`,
    avatarUrl: row.user.avatarUrl || null,
    totalPoints: row.totalPoints,
  }));
}

async function hydrateWinnerPoints(winners) {
  const missing = winners.filter((winner) => winner.totalPoints === null);
  if (missing.length === 0) {
    return winners.map((winner) => ({ ...winner, totalPoints: winner.totalPoints ?? 0 }));
  }
  const totals = await adminRepository.getTotalPointsByUserIds(missing.map((winner) => winner.userId));
  return winners.map((winner) => ({
    ...winner,
    totalPoints: winner.totalPoints ?? totals.get(winner.userId) ?? 0,
  }));
}

export const competitionService = {
  async getState() {
    const row = await competitionRepository.getState();
    return {
      ...normalizeCompetitionState(row?.value),
      updatedAt: row?.updatedAt || null,
    };
  },

  async getStateForUser(userId) {
    const state = await competitionService.getState();
    return {
      ...state,
      canAct: isUserAllowed(state, userId),
    };
  },

  async updateState(payload) {
    const current = await competitionService.getState();
    let winners = Array.isArray(payload?.winners)
      ? payload.winners.map((row, index) => normalizeWinner(row, index)).filter(Boolean)
      : current.winners;
    winners = await hydrateWinnerPoints(winners);
    const allowedUserIds = Array.isArray(payload?.allowedUserIds)
      ? payload.allowedUserIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : current.allowedUserIds;

    const next = {
      ...current,
      ...payload,
      winners,
      allowedUserIds,
      isOpen: payload?.isOpen === undefined ? current.isOpen : Boolean(payload.isOpen),
      showWinnersPopup:
        payload?.showWinnersPopup === undefined
          ? current.showWinnersPopup
          : Boolean(payload.showWinnersPopup),
    };
    const updated = await competitionRepository.upsertState(next);
    return {
      ...normalizeCompetitionState(updated?.value),
      updatedAt: updated?.updatedAt || null,
    };
  },

  async openCompetition() {
    const current = await competitionService.getState();
    const next = {
      ...current,
      isOpen: true,
      closedAt: null,
      showWinnersPopup: false,
    };
    const updated = await competitionRepository.upsertState(next);
    return {
      ...normalizeCompetitionState(updated?.value),
      updatedAt: updated?.updatedAt || null,
    };
  },

  async closeCompetition(payload = {}) {
    const current = await competitionService.getState();
    let winners = Array.isArray(payload?.winners) && payload.winners.length > 0
      ? payload.winners.map((row, index) => normalizeWinner(row, index)).filter(Boolean)
      : await computeWinners();
    winners = await hydrateWinnerPoints(winners);

    const next = {
      ...current,
      isOpen: false,
      closedAt: new Date().toISOString(),
      winners,
      showWinnersPopup:
        payload?.showWinnersPopup === undefined ? true : Boolean(payload.showWinnersPopup),
    };

    const updated = await competitionRepository.upsertState(next);
    await dailyQuestionsService.revealAllAnswers();

    return {
      ...normalizeCompetitionState(updated?.value),
      updatedAt: updated?.updatedAt || null,
    };
  },

  async assertCompetitionOpenForUser(userId) {
    const state = await competitionService.getState();
    if (!isUserAllowed(state, userId)) {
      throw new AppError(403, "Competition is closed");
    }
  },
};

export { COMPETITION_STATE_KEY };
