import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { supabase } from "@/src/supabase";
import { getUsuario } from "@/src/services/usuariosSupa";
import { CORES } from "@/src/theme/cores";

export default function TabsLayout() {
  const [isVendedor, setIsVendedor] = useState(false);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const usuario = await getUsuario(user.id);
      setIsVendedor(!!usuario?.funcao_vendedor);
    };

    run();

    // Escuta mudanças em realtime
    const channel = supabase
      .channel("tabs-layout-usuario")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "usuarios",
        },
        () => run(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleAddPress() {
    if (isVendedor) {
      router.push("/(tabs)/profile/novo-imovel");
      return;
    }

    Alert.alert(
      "Ativar modo vendedor",
      "Para anunciar imóveis, ative a opção Vendedor nas Preferências.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Ir para Preferências",
          onPress: () => router.push("/(tabs)/profile/preferencias"),
        },
      ],
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: CORES.branco,
          borderTopColor: CORES.borda,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={size}
              color={focused ? CORES.primario : CORES.texto}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="novo"
        options={{
          tabBarIcon: () => null,
          tabBarButton: ({
            accessibilityLabel,
            accessibilityRole,
            accessibilityState,
            testID,
            style,
          }) => (
            <Pressable
              testID={testID}
              accessibilityLabel={accessibilityLabel}
              accessibilityRole={accessibilityRole}
              accessibilityState={accessibilityState}
              onPress={handleAddPress}
              style={[style as any, styles.addWrapper]}
            >
              <View style={styles.addButton}>
                <Ionicons name="add" size={28} color={CORES.branco} />
              </View>
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={size}
              color={focused ? CORES.primario : CORES.texto}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={focused ? CORES.primario : CORES.texto}
            />
          ),
          tabBarButton: ({
            children,
            accessibilityLabel,
            accessibilityRole,
            accessibilityState,
            testID,
            style,
          }) => (
            <Pressable
              testID={testID}
              accessibilityLabel={accessibilityLabel}
              accessibilityRole={accessibilityRole}
              accessibilityState={accessibilityState}
              onPress={() => router.replace("/(tabs)/profile")}
              style={style as any}
            >
              {children}
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="imovel/[id]"
        options={{
          href: null, // não aparece na tab bar
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addWrapper: { alignItems: "center", justifyContent: "center" },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: CORES.primario,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    borderWidth: 1,
    borderColor: CORES.borda,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
