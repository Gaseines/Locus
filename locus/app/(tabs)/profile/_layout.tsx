import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Perfil",
          headerBackVisible: false,
          headerLeft: () => null, // ✅ garante
        }}
      />
      <Stack.Screen name="preferencias" options={{ title: "Preferências" }} />
      <Stack.Screen name="novo-imovel" options={{ title: "Novo imóvel" }} />
    </Stack>
  );
}