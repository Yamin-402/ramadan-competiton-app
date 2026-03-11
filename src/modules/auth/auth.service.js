import bcrypt from "bcrypt";
import { AppError } from "../../core/errors/app-error.js";
import { authRepository } from "./auth.repository.js";

const INITIAL_USER_POINTS = 100;

function toSessionUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function audienceToTagKeys(payload) {
  if (payload.audience === "SCHOOL") {
    return [
      "school",
      payload.schoolSystem === "EGYPTIAN" ? "egyptian" : "foreign",
    ];
  }

  return ["university"];
}

export const authService = {
  async register(payload) {
    const existingUser = await authRepository.findUserByEmail(payload.email);

    if (existingUser) {
      throw new AppError(409, "Email already registered");
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const tagKeys = audienceToTagKeys(payload);
    const tags = await authRepository.upsertTagsByKeys(tagKeys);
    const user = await authRepository.createUser({
      email: payload.email,
      displayName: payload.displayName,
      passwordHash: hashedPassword,
      tagIds: tags.map((tag) => tag.id),
      initialPoints: INITIAL_USER_POINTS,
    });

    return {
      token: `dev-session-${user.id}`,
      user: toSessionUser(user),
    };
  },

  async createSession(payload) {
    const user = await authRepository.findUserByEmail(payload.email);

    if (!user || !user.isActive) {
      throw new AppError(401, "Invalid credentials");
    }

    if (!user.passwordHash) {
      throw new AppError(401, "Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(401, "Invalid credentials");
    }

    await authRepository.ensureInitialPointsActivity(user.id, INITIAL_USER_POINTS);

    return {
      token: `dev-session-${user.id}`,
      user: toSessionUser(user),
    };
  },
};
