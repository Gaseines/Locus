import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../src/firebase"; // ✅ ajuste o caminho se precisar

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [usuarioLoading, setUsuarioLoading] = useState(false);
  const [usuarioDoc, setUsuarioDoc] = useState<any | null>(null);

  // 1) Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // 2) Firestore user doc
  useEffect(() => {
    if (!user?.uid) {
      setUsuarioDoc(null);
      setUsuarioLoading(false);
      return;
    }

    setUsuarioLoading(true);
    const ref = doc(db, "usuarios", user.uid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setUsuarioDoc(snap.exists() ? snap.data() : null);
        setUsuarioLoading(false);
      },
      () => {
        setUsuarioDoc(null);
        setUsuarioLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  // 3) Guard de rotas
  useEffect(() => {
    if (authLoading) return;

    const grupoAtual = segments[0]; // "(auth)" | "(onboarding)" | "(tabs)" ...
    const estaNoAuth = grupoAtual === "(auth)";
    const estaNoOnboarding = grupoAtual === "(onboarding)";

    // não logado -> auth
    if (!user) {
      if (!estaNoAuth) router.replace("/(auth)/login");
      return;
    }

    // logado mas ainda carregando doc
    if (usuarioLoading) return;

    const onboardingConcluido = usuarioDoc?.onboardingConcluido === true;

    // logado e precisa onboarding
    if (!onboardingConcluido) {
      if (!estaNoOnboarding) router.replace("/(onboarding)");
      return;
    }

    // logado e onboarding ok -> tabs
    if (estaNoAuth || estaNoOnboarding) {
      router.replace("/(tabs)");
    }
  }, [authLoading, user, usuarioLoading, usuarioDoc, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}