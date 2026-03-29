import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Perfil",
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="preferencias" options={{ title: "Preferências" }} />
      <Stack.Screen name="novo-imovel" options={{ title: "Novo imóvel" }} />
      <Stack.Screen name="meus-imoveis" options={{ title: "Meus imóveis" }} />
      <Stack.Screen name="editar-imovel" options={{ title: "Editar imóvel" }} />
    </Stack>
  );
}