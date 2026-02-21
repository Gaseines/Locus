import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "Bem-vindo ao Locus",
      }}
    />
  );
}