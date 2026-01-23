import { init } from "@instantdb/react-native";
import schema from "../instant.schema";

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!appId) {
  throw new Error(
    "EXPO_PUBLIC_INSTANT_APP_ID is not set. Make sure it's defined in your .env file and you've rebuilt the app."
  );
}

export const db = init({
  appId,
  schema,
});
