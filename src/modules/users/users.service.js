import { AppError } from "../../core/errors/app-error.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { usersRepository } from "./users.repository.js";

function uniqueKeys(values) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function isEducationTagKey(key) {
  const normalized = key.trim().toLowerCase();
  return normalized.includes("school") || normalized.includes("university") || normalized.includes("uni");
}

export const usersService = {
  async getMyProfile(auth) {
    const userId = getAuthUserId(auth);
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user;
  },

  async updateMyProfile(auth, payload) {
    const userId = getAuthUserId(auth);
    const hasDisplayName = Object.prototype.hasOwnProperty.call(payload, "displayName");
    const hasBio = Object.prototype.hasOwnProperty.call(payload, "bio");
    const hasAvatarUrl = Object.prototype.hasOwnProperty.call(payload, "avatarUrl");
    const hasStreakVisibility = Object.prototype.hasOwnProperty.call(payload, "isStreakPublic");

    if (!hasDisplayName && !hasBio && !hasAvatarUrl && !hasStreakVisibility) {
      throw new AppError(400, "No profile updates provided");
    }

    const updatedUser = await usersRepository.updateProfile(userId, payload);

    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }

    return updatedUser;
  },

  async getPublicProfile(auth, targetUserId) {
    const viewerUserId = getAuthUserId(auth);
    const profile = await usersRepository.findPublicProfileById(viewerUserId, targetUserId);

    if (!profile) {
      throw new AppError(404, "User not found");
    }

    return profile;
  },

  async updateMyTags(auth, payload) {
    const userId = getAuthUserId(auth);
    const tagKeys = uniqueKeys(payload.tagKeys);

    const availableTags = await usersRepository.findTagsByKeys(tagKeys);
    const availableTagKeySet = new Set(availableTags.map((tag) => tag.key));

    const missingKeys = tagKeys.filter((key) => !availableTagKeySet.has(key));
    if (missingKeys.length > 0) {
      throw new AppError(400, "Unknown tag keys", { missingKeys });
    }

    const hasEducationLevel = availableTags.some((tag) => isEducationTagKey(tag.key));
    if (!hasEducationLevel) {
      throw new AppError(400, "At least one education level tag is required");
    }

    const updatedUser = await usersRepository.replaceUserTags(
      userId,
      availableTags.map((tag) => tag.id)
    );

    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }

    return updatedUser;
  },
};
