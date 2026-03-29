import React, { useMemo, useState } from "react";
import {
  View, Text, Pressable, Image, KeyboardAvoidingView,
  Platform, TextInput, ActivityIndicator, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { signUpWithEmail } from "@/src/services/auth";
import { styles } from "./login.styles";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ Tela de confirmação de email
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [emailCadastrado, setEmailCadastrado] = useState("");

  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);
  const firstNameOk = useMemo(() => firstName.trim().length >= 2, [firstName]);
  const lastNameOk = useMemo(() => lastName.trim().length >= 2, [lastName]);

  const phoneDigits = useMemo(() => onlyDigits(phone), [phone]);
  const phoneOk = useMemo(() => {
    if (phoneDigits.length === 0) return true;
    return phoneDigits.length >= 10 && phoneDigits.length <= 11;
  }, [phoneDigits]);

  const formOk = firstNameOk && lastNameOk && phoneOk && emailOk && passwordOk;

  const handleRegister = async () => {
    if (submitting) return;

    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    if (!firstNameOk) { setFirstNameError("Digite seu nome (mínimo 2 letras)."); return; }
    if (!lastNameOk) { setLastNameError("Digite seu sobrenome (mínimo 2 letras)."); return; }
    if (!phoneOk) { setPhoneError("Digite um WhatsApp válido (DDD + número)."); return; }
    if (!emailOk) { setEmailError("Digite um email válido."); return; }
    if (!passwordOk) { setPasswordError("A senha deve ter pelo menos 6 caracteres."); return; }

    try {
      setSubmitting(true);

      await signUpWithEmail(email.trim().toLowerCase(), password);

      // ✅ Salva os dados no dispositivo para usar no primeiro login
      await AsyncStorage.setItem("@locus:pending_registro", JSON.stringify({
        primeiro_nome: firstName.trim(),
        sobrenome: lastName.trim(),
        telefone: phoneDigits.length ? phoneDigits : null,
        email: email.trim().toLowerCase(),
      }));

      // ✅ Mostra tela de confirmação (sem navegar)
      setEmailCadastrado(email.trim().toLowerCase());
      setAguardandoConfirmacao(true);

    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        setEmailError("Esse email já está cadastrado. Tente entrar.");
      } else if (msg.includes("weak") || msg.includes("password")) {
        setPasswordError("Senha fraca. Use pelo menos 6 caracteres.");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        setGeneralError("Sem conexão. Verifique sua internet.");
      } else {
        setGeneralError("Não foi possível criar sua conta. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Tela de aguardar confirmação ────────────────────────────────────────────
  if (aguardandoConfirmacao) {
    return (
      <View style={confirmStyles.page}>
        <View style={confirmStyles.card}>
          <Text style={confirmStyles.icon}>📧</Text>
          <Text style={confirmStyles.title}>Confirme seu email</Text>
          <Text style={confirmStyles.sub}>
            Enviamos um link de confirmação para:
          </Text>
          <Text style={confirmStyles.email}>{emailCadastrado}</Text>
          <Text style={confirmStyles.hint}>
            Após confirmar, volte aqui e faça login com seu email e senha.
          </Text>

          <Pressable
            style={confirmStyles.primaryBtn}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={confirmStyles.primaryText}>Ir para o login</Text>
          </Pressable>

          <Pressable
            style={confirmStyles.secondaryBtn}
            onPress={() => setAguardandoConfirmacao(false)}
          >
            <Text style={confirmStyles.secondaryText}>Voltar e corrigir dados</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Formulário de cadastro ───────────────────────────────────────────────────
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

      <Text style={[styles.subtitle, { marginBottom: 18, fontWeight: "700" }]}>
        Criar conta
      </Text>

      <View style={styles.card}>
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={firstName}
            onChangeText={(t) => { setFirstName(t); setFirstNameError(null); }}
            placeholder="Ex.: Gabriel"
            placeholderTextColor="#999"
            autoCapitalize="words"
            style={[styles.input, firstNameError ? styles.inputError : null]}
            editable={!submitting}
          />
          {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Sobrenome</Text>
          <TextInput
            value={lastName}
            onChangeText={(t) => { setLastName(t); setLastNameError(null); }}
            placeholder="Ex.: Nunes"
            placeholderTextColor="#999"
            autoCapitalize="words"
            style={[styles.input, lastNameError ? styles.inputError : null]}
            editable={!submitting}
          />
          {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>WhatsApp (opcional)</Text>
          <TextInput
            value={phone}
            onChangeText={(t) => { setPhone(t); setPhoneError(null); }}
            placeholder="(47) 99999-9999"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            style={[styles.input, phoneError ? styles.inputError : null]}
            editable={!submitting}
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
        </View>

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
            onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
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
            formOk && !submitting ? styles.emailButtonEnabled : styles.emailButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={!formOk || submitting}
        >
          {submitting
            ? <ActivityIndicator />
            : <Text style={styles.emailButtonText}>Criar conta</Text>}
        </Pressable>

        {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

        <Pressable onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.link}>Voltar para o login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const confirmStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8F8F6",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    width: "100%",
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "900", color: "#111", marginBottom: 8 },
  sub: { fontSize: 14, color: "#5b5b5b", textAlign: "center" },
  email: {
    fontSize: 15, fontWeight: "800", color: "#5A9F78",
    marginTop: 6, marginBottom: 12, textAlign: "center",
  },
  hint: {
    fontSize: 13, color: "#5b5b5b", opacity: 0.8,
    textAlign: "center", marginBottom: 24, lineHeight: 20,
  },
  primaryBtn: {
    height: 48, borderRadius: 10, alignItems: "center",
    justifyContent: "center", backgroundColor: "#5A9F78",
    width: "100%", marginBottom: 10,
  },
  primaryText: { fontWeight: "900", color: "#fff", fontSize: 15 },
  secondaryBtn: {
    height: 48, borderRadius: 10, alignItems: "center",
    justifyContent: "center", borderWidth: 1,
    borderColor: "#E5E5E5", width: "100%",
  },
  secondaryText: { fontWeight: "800", color: "#5b5b5b" },
});