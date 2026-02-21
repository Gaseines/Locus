import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Image,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

// Firebase
import { signInWithEmailAndPassword, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/src/firebase";

// Styles
import { styles } from "./login.styles";

type OldUserDoc = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string | null;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
};

async function ensureUsuarioDoc(user: User) {
  const uid = user.uid;
  const email = (user.email ?? "").toLowerCase();

  const refUsuarios = doc(db, "usuarios", uid);
  const snapUsuarios = await getDoc(refUsuarios);

  // ✅ Já existe: só garante atualizadoEm pra manter “vivo”
  if (snapUsuarios.exists()) {
    await setDoc(
      refUsuarios,
      { atualizadoEm: serverTimestamp(), email },
      { merge: true }
    );
    return;
  }

  // 🧠 Migração automática (se você tinha doc antigo em "users")
  const refUsersOld = doc(db, "users", uid);
  const snapOld = await getDoc(refUsersOld);

  if (snapOld.exists()) {
    const old = snapOld.data() as OldUserDoc;

    const primeiroNome = (old.firstName ?? "").trim();
    const sobrenome = (old.lastName ?? "").trim();
    const nomeCompleto =
      (old.fullName ?? `${primeiroNome} ${sobrenome}`.trim()).trim() ||
      (user.displayName ?? "").trim() ||
      "Usuário";

    await setDoc(
      refUsuarios,
      {
        primeiroNome: primeiroNome || undefined,
        sobrenome: sobrenome || undefined,
        nomeCompleto,
        telefone: old.phone ?? null,
        email: (old.email ?? email).toLowerCase(),

        // defaults do onboarding (pra ficar consistente com o app)
        onboardingConcluido: false,
        onboardingPulado: false,
        funcoes: { comprador: true, vendedor: false },

        // tenta reaproveitar datas antigas se existirem
        criadoEm: old.createdAt ?? serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      },
      { merge: true }
    );

    return;
  }

  // ✅ Cria do zero (conta antiga do Auth sem doc no Firestore, por exemplo)
  const displayName = (user.displayName ?? "").trim();
  await setDoc(
    refUsuarios,
    {
      nomeCompleto: displayName || "Usuário",
      email,

      onboardingConcluido: false,
      onboardingPulado: false,
      funcoes: { comprador: true, vendedor: false },

      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    },
    { merge: true }
  );
}

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // validação básica (só pra UI)
  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleEmailLogin = async () => {
    if (submitting) return;

    const e = email.trim().toLowerCase();

    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

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

      const cred = await signInWithEmailAndPassword(auth, e, password);

      // ✅ garante que o doc em "usuarios" exista
      await ensureUsuarioDoc(cred.user);

      // ✅ melhor: deixa o Auth Guard decidir (tabs/onboarding)
      router.replace("/");
    } catch (err: any) {
      const code = err?.code;

      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        setGeneralError("Email ou senha incorretos. Se você não tem conta, crie uma agora!");
        return;
      }

      if (code === "auth/too-many-requests") {
        setGeneralError("Muitas tentativas. Aguarde um pouco e tente novamente.");
        return;
      }

      if (code === "auth/network-request-failed") {
        setGeneralError("Sem conexão. Verifique sua internet e tente novamente.");
        return;
      }

      setGeneralError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    console.log("Google login (placeholder)");
  };

  const handleApple = () => {
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

      {/* Login com Email */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar com Email:</Text>

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
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.emailButtonText}>Entrar</Text>
          )}
        </Pressable>

        {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

        <Pressable onPress={() => router.push("/(auth)/register")} disabled={submitting}>
          <Text style={styles.link}>Criar conta</Text>
        </Pressable>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={[styles.button, styles.google]} onPress={handleGoogle} disabled={submitting}>
        <Image
          source={require("../../assets/images/google-g.png")}
          resizeMode="contain"
          style={styles.Icon}
        />
        <Text style={styles.buttonText}>Continuar com Google</Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable style={[styles.button, styles.apple]} onPress={handleApple} disabled={submitting}>
          <Image
            source={require("../../assets/images/apple.png")}
            resizeMode="contain"
            style={styles.Icon}
          />
          <Text style={styles.appleText}>Continuar com Apple</Text>
        </Pressable>
      )}

      {/* Dev mode: com Auth Guard ativo, isso não funciona sem autenticar */}
      <Pressable
        style={[styles.button, styles.dev]}
        onPress={() => Alert.alert("Modo dev", "Com o Auth Guard ativo, esse botão não entra sem autenticar.")}
        disabled={submitting}
      >
        <Text style={styles.devText}>Entrar (modo dev)</Text>
      </Pressable>

      <Text style={styles.helper}>
        (Apple aparece só no iPhone. Google/Apple vamos conectar depois.)
      </Text>
    </KeyboardAvoidingView>
  );
}