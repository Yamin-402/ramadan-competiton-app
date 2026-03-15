import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Auth: undefined;
  Onboarding:
    | {
        mode?: "first_login" | "replay";
      }
    | undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  TasksTab: undefined;
  ForbiddenTab: undefined;
  DailyQuestionsTab: undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Guide:
    | {
        mode?: "first_login" | "replay";
      }
    | undefined;
  Leaderboard: undefined;
  Streaks: undefined;
  Notifications: undefined;
  Money: undefined;
  ActivityStats: undefined;
  ActivityHistory: undefined;
  AiReport: undefined;
  CompetitionWinners: undefined;
  Profile: undefined;
  UserProfile: {
    userId: number;
    fallbackDisplayName: string | null;
    fallbackEmail: string;
  };
};
