import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/src/firebase";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // 1) escuta o Firebase e descobre se está logado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });

    return unsub;
  }, []);

  // 2) decide para onde mandar o usuário (guard)
  useEffect(() => {
    if (!authReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    // Não logado e tentou acessar fora do auth -> manda pro login
    if (!user && !inAuthGroup) {
      router.replace("/login");
      return;
    }

    // Logado e está no auth -> manda pras tabs
    if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, authReady, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {!authReady ? (
        <LoadingScreen />
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      )}

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}