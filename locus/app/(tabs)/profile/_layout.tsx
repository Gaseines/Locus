import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Perfil" }} />
      <Stack.Screen name="preferencias" options={{ title: "Preferências" }} />
    </Stack>
  );
}