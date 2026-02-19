import { Redirect } from "expo-router";
import "@/assets/images/partial-react-logo.png"

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
