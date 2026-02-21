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
import { auth } from "@/src/firebase";

// Styles
import { styles } from "./login.styles";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // validação básica (só pra UI)
  const emailOk = useMemo(() => {
    const e = email.trim().toLowerCase();
    return e.length > 3 && e.includes("@") && e.includes(".");
  }, [email]);

  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleEmailLogin = async () => {
    const e = email.trim();

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
      await signInWithEmailAndPassword(auth, e, password);
      router.replace("/"); // melhor: deixa o guard decidir
    } catch (err: any) {
      const code = err?.code;

      // ✅ casos mais comuns (inclui versões novas do Firebase)
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        setGeneralError(
          "Email ou senha incorretos. Se você não tem conta, crie uma agora!",
        );
        return;
      }

      if (code === "auth/too-many-requests") {
        setGeneralError(
          "Muitas tentativas. Aguarde um pouco e tente novamente.",
        );
        return;
      }

      setGeneralError("Não foi possível entrar agora. Tente novamente.");
    }
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
          />

          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}
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
          />

          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}
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

        {generalError ? (
          <Text style={styles.errorText}>{generalError}</Text>
        ) : null}


        <Pressable onPress={() => router.push("/(auth)/register")}>
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
