import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Image,
  Alert,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";

// Fire base
import { signInWithEmailAndPassword } from "firebase/auth";
import { Analytics } from "firebase/analytics";


// Styles
import { styles } from "./login.styles";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // validação básica (só pra UI)
  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleEmailLogin = () => {
    const e = email.trim();

    if (!emailOk) {
      Alert.alert("Email inválido", "Digite um email válido para continuar.");
      return;
    }

    if (!passwordOk) {
      Alert.alert(
        "Senha inválida",
        "A senha deve ter pelo menos 6 caracteres.",
      );
      return;
    }

    // por enquanto: modo placeholder
    console.log("Email login (placeholder):", e);

    // só pra você seguir testando telas (tirar depois)
    router.replace("/(tabs)");
  };

  const handleGoogle = () => {
    // depois a gente pluga o Google de verdade
    console.log("Google login (placeholder)");
  };

  const handleApple = () => {
    // depois a gente pluga a Apple de verdade
    console.log("Apple login (placeholder)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image
        source={require("../../assets/images/logoCompleta.png")}
        resizeMode="contain"
        style={styles.logo}
      />
      <Text style={styles.subtitle}>Entre para continuar</Text>

      {/*Login com Email */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar com Email:</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seuemail@exemplo.com"
            placeholderTextColor={"#999"}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
          />
        </View>

        <Pressable
          style={[
            styles.emailButton,
            emailOk && passwordOk
              ? styles.emailButtonEnabled
              : styles.emailButtonDisabled,
          ]}
          onPress={handleEmailLogin}
        >
          <Text style={styles.emailButtonText}>Entrar</Text>
        </Pressable>

        <Pressable onPress={() => console.log("Criar conta (placeholder)")}>
          <Text style={styles.link}>Criar conta</Text>
        </Pressable>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={[styles.button, styles.google]} onPress={handleGoogle}>
        <Image
          source={require("../../assets/images/google-g.png")}
          resizeMode="contain"
          style={styles.Icon}
        />
        <Text style={styles.buttonText}>Continuar com Google</Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable style={[styles.button, styles.apple]} onPress={handleApple}>
          <Image
            source={require("../../assets/images/apple.png")}
            resizeMode="contain"
            style={styles.Icon}
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
    </KeyboardAvoidingView>
  );
}
