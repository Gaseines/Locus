import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogle = () => {
    // depois a gente pluga o Google de verdade
    console.log("Google login (placeholder)");
  };

  const handleApple = () => {
    // depois a gente pluga a Apple de verdade
    console.log("Apple login (placeholder)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Locus</Text>
      <Text style={styles.subtitle}>Entre para continuar</Text>

      <Pressable style={[styles.button, styles.google]} onPress={handleGoogle}>
        <Image
          source={require("../../assets/images/google-g.png")}
          resizeMode="contain"
          style={styles.googleIcon}
        />
        <Text style={styles.buttonText}>Continuar com Google</Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable style={[styles.button, styles.apple]} onPress={handleApple}>
            <Image
          source={require("../../assets/images/apple.png")}
          resizeMode="contain"
          style={styles.googleIcon}
        />
          <Text style={styles.appleText}>Continuar com Apple</Text>
        </Pressable>
      )}

      {/* Só pra destravar o desenvolvimento enquanto o login real não está pronto */}
      <Pressable
        style={[styles.button, styles.dev]}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.devText}>Entrar (modo dev)</Text>
      </Pressable>

      <Text style={styles.helper}>
        (Apple aparece só no iPhone. Google/Apple vamos conectar depois.)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFFFFfff",
  },
  title: { fontSize: 34, fontWeight: "800", marginBottom: 6, color: "#5a9f78" },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 24, color: "#5b5b5b" },

  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  icon: { marginRight: 10 },

  google: { backgroundColor: "#f8f8f6", display: "flex", flexDirection: "row" },
  googleIcon: { width: 30, height: 30, marginRight: 10 },
  apple: { backgroundColor: "#f8f8f6", display: "flex", flexDirection: "row" },
  dev: { backgroundColor: "#EAEAEA" },

  buttonText: { fontWeight: "700" },
  appleText: { fontWeight: "700" },
  devText: { color: "#111111", fontWeight: "700" },

  helper: { marginTop: 8, fontSize: 12, opacity: 0.6 },
});
