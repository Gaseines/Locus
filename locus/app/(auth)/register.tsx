import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase";
import { styles } from "./login.styles";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleRegister = async () => {
    const e = email.trim();

    if (!emailOk) {
      Alert.alert("Email inválido", "Digite um email válido para continuar.");
      return;
    }
    if (!passwordOk) {
      Alert.alert("Senha inválida", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, e, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      const code = err?.code;

      if (code === "auth/email-already-in-use") {
        Alert.alert("Email já cadastrado", "Tente entrar ou use outro email.");
        return;
      }

      Alert.alert("Erro ao criar conta", err?.message ?? "Tente novamente.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={[styles.subtitle, { marginBottom: 18, fontWeight: "700" }]}>
        Criar conta
      </Text>

      <View style={styles.card}>
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seuemail@exemplo.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
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
          onPress={handleRegister}
        >
          <Text style={styles.emailButtonText}>Criar conta</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Voltar para o login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}