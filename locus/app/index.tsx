import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/src/firebase";

export default function TabsHome() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // ✅ não precisa navegar: o Auth Guard vai te mandar pro login
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível sair.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Você está logado ✅</Text>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#FFFF" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 16 },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAEAEA",
  },
  buttonText: { fontWeight: "800", color: "#111" },
});