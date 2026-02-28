import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/src/firebase";
import { CORES } from "@/src/theme/cores";

export default function TabsLayout() {
  const [isVendedor, setIsVendedor] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "usuarios", uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data: any = snap.exists() ? snap.data() : null;
      setIsVendedor(!!data?.funcoes?.vendedor);
    });

    return () => unsub();
  }, []);

  function handleAddPress() {
    if (isVendedor) {
      router.push("/(tabs)/profile/novo-imovel");
      return;
    }

    Alert.alert(
      "Ativar modo vendedor",
      "Para anunciar imóveis, ative a opção Vendedor nas Preferências."
    );
    router.push("/(tabs)/profile/preferencias");
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
          popToTopOnBlur: true, // ✅ limpa o stack ao sair da aba
          
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={size}
              color={focused ? CORES.primario : CORES.texto}
            />
          ),
        }}
      />

      {/* Botão + */}
      <Tabs.Screen
        name="novo"
        options={{
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={handleAddPress}
              style={[props.style, styles.addWrapper]}
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

      {/* ✅ FIX: Perfil sempre abre na raiz */}
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
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={() => router.replace("/(tabs)/profile")}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
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