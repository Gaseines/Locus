import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "@/src/firebase";
import { styles } from "./login.styles";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(""); // WhatsApp (opcional)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const firstNameOk = useMemo(() => firstName.trim().length >= 2, [firstName]);
  const lastNameOk = useMemo(() => lastName.trim().length >= 2, [lastName]);

  const phoneDigits = useMemo(() => onlyDigits(phone), [phone]);
  const phoneOk = useMemo(() => {
    if (phoneDigits.length === 0) return true; // opcional
    return phoneDigits.length >= 10 && phoneDigits.length <= 11;
  }, [phoneDigits]);

  const formOk = firstNameOk && lastNameOk && phoneOk && emailOk && passwordOk;

  const handleRegister = async () => {
    if (submitting) return;

    const e = email.trim().toLowerCase();
    const f = firstName.trim();
    const l = lastName.trim();

    // limpa erros
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    // validações
    if (!firstNameOk) {
      setFirstNameError("Digite seu nome (mínimo 2 letras).");
      return;
    }
    if (!lastNameOk) {
      setLastNameError("Digite seu sobrenome (mínimo 2 letras).");
      return;
    }
    if (!phoneOk) {
      setPhoneError("Digite um WhatsApp válido (DDD + número).");
      return;
    }
    if (!emailOk) {
      setEmailError("Digite um email válido.");
      return;
    }
    if (!passwordOk) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setSubmitting(true);

      const cred = await createUserWithEmailAndPassword(auth, e, password);

      // 1) salva nome no Auth
      const nomeCompleto = `${f} ${l}`.trim();
      await updateProfile(cred.user, { displayName: nomeCompleto });

      // 2) salva perfil completo no Firestore (PT-BR)
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        primeiroNome: f,
        sobrenome: l,
        nomeCompleto,
        telefone: phoneDigits.length ? phoneDigits : null,
        email: e,

        // defaults do onboarding (pra manter tudo consistente)
        onboardingConcluido: false,
        onboardingPulado: false,
        funcoes: { comprador: true, vendedor: false },
        // preferencias: null, // opcional: pode omitir

        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      // deixa o Auth Guard decidir (ele vai mandar pro onboarding)
      router.replace("/");
    } catch (err: any) {
      const code = err?.code;

      if (code === "auth/email-already-in-use") {
        setEmailError("Esse email já está cadastrado. Tente entrar.");
      } else if (code === "auth/invalid-email") {
        setEmailError("Email inválido.");
      } else if (code === "auth/weak-password") {
        setPasswordError("Senha fraca. Use pelo menos 6 caracteres.");
      } else if (code === "auth/network-request-failed") {
        setGeneralError("Sem conexão. Verifique sua internet e tente novamente.");
      } else {
        setGeneralError("Não foi possível criar sua conta. Tente novamente.");
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

      <Text style={[styles.subtitle, { marginBottom: 18, fontWeight: "700" }]}>
        Criar conta
      </Text>

      <View style={styles.card}>
        {/* Nome */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={firstName}
            onChangeText={(t) => {
              setFirstName(t);
              if (firstNameError) setFirstNameError(null);
              if (generalError) setGeneralError(null);
            }}
            placeholder="Ex.: Gabriel"
            placeholderTextColor="#999"
            autoCapitalize="words"
            style={[styles.input, firstNameError ? styles.inputError : null]}
            editable={!submitting}
          />
          {firstNameError ? (
            <Text style={styles.errorText}>{firstNameError}</Text>
          ) : null}
        </View>

        {/* Sobrenome */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Sobrenome</Text>
          <TextInput
            value={lastName}
            onChangeText={(t) => {
              setLastName(t);
              if (lastNameError) setLastNameError(null);
              if (generalError) setGeneralError(null);
            }}
            placeholder="Ex.: Nunes"
            placeholderTextColor="#999"
            autoCapitalize="words"
            style={[styles.input, lastNameError ? styles.inputError : null]}
            editable={!submitting}
          />
          {lastNameError ? (
            <Text style={styles.errorText}>{lastNameError}</Text>
          ) : null}
        </View>

        {/* WhatsApp (opcional) */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>WhatsApp (opcional)</Text>
          <TextInput
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (phoneError) setPhoneError(null);
              if (generalError) setGeneralError(null);
            }}
            placeholder="(47) 99999-9999"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            style={[styles.input, phoneError ? styles.inputError : null]}
            editable={!submitting}
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
        </View>

        {/* Email */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError(null);
              if (generalError) setGeneralError(null);
            }}
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

        {/* Senha */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passwordError) setPasswordError(null);
              if (generalError) setGeneralError(null);
            }}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
            style={[styles.input, passwordError ? styles.inputError : null]}
            editable={!submitting}
          />
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}
        </View>

        <Pressable
          style={[
            styles.emailButton,
            formOk && !submitting ? styles.emailButtonEnabled : styles.emailButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={!formOk || submitting}
        >
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.emailButtonText}>Criar conta</Text>
          )}
        </Pressable>

        {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

        <Pressable onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.link}>Voltar para o login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}