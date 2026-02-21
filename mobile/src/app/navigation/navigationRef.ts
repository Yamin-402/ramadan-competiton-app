import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToNotifications() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate("Main", {
    screen: "MoreTab",
    params: {
      screen: "Notifications",
    },
  } as never);
}
