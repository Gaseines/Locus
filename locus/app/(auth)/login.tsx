import React, { useMemo, useState } from "react";
import {
  View, Text, Pressable, Platform, Image,
  KeyboardAvoidingView, TextInput, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { signInWithEmail } from "@/src/services/auth";
import { criarOuAtualizarUsuario } from "@/src/services/usuariosSupa";
import { supabase } from "@/src/supabase";
import { styles } from "./login.styles";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleEmailLogin = async () => {
    if (submitting) return;

    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    if (!emailOk) { setEmailError("Digite um email válido."); return; }
    if (!passwordOk) { setPasswordError("A senha deve ter pelo menos 6 caracteres."); return; }

    try {
      setSubmitting(true);

      const data = await signInWithEmail(email.trim().toLowerCase(), password);

      if (data.user) {
        // ✅ Tenta recuperar dados pendentes do cadastro
        const pendingRaw = await AsyncStorage.getItem("@locus:pending_registro");

        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          await criarOuAtualizarUsuario(data.user.id, {
            email: data.user.email ?? "",
            primeiro_nome: pending.primeiro_nome,
            sobrenome: pending.sobrenome,
            telefone: pending.telefone,
            funcao_comprador: true,
            funcao_vendedor: false,
            onboarding_concluido: false,
            onboarding_pulado: false,
          });

          // ✅ Limpa os dados temporários
          await AsyncStorage.removeItem("@locus:pending_registro");
        } else {
          // Login normal — só garante que o doc existe
          await criarOuAtualizarUsuario(data.user.id, {
            email: data.user.email ?? "",
          });
        }
      }

      router.replace("/");
    } catch (err: any) {
      const msg = err?.message ?? "";

      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setGeneralError("Email ou senha incorretos. Se não tem conta, crie uma!");
      } else if (msg.includes("Email not confirmed")) {
        setGeneralError("Você ainda não confirmou seu email. Verifique sua caixa de entrada.");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        setGeneralError("Sem conexão. Verifique sua internet.");
      } else {
        setGeneralError("Não foi possível entrar agora. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar com Email:</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); setEmailError(null); setGeneralError(null); }}
            placeholder="seuemail@exemplo.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={[styles.input, emailError ? styles.inputError : null]}
            editable={!submitting}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={(t) => { setPassword(t); setPasswordError(null); setGeneralError(null); }}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
            style={[styles.input, passwordError ? styles.inputError : null]}
            editable={!submitting}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <Pressable
          style={[
            styles.emailButton,
            emailOk && passwordOk && !submitting
              ? styles.emailButtonEnabled
              : styles.emailButtonDisabled,
          ]}
          onPress={handleEmailLogin}
          disabled={!emailOk || !passwordOk || submitting}
        >
          {submitting
            ? <ActivityIndicator />
            : <Text style={styles.emailButtonText}>Entrar</Text>}
        </Pressable>

        {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

        <Pressable onPress={() => router.push("/(auth)/register")} disabled={submitting}>
          <Text style={styles.link}>Criar conta</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}