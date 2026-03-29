import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { Session } from "@supabase/supabase-js";

import { supabase } from "@/src/supabase";
import { subscribeUsuario, Usuario } from "@/src/services/usuariosSupa";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const [usuarioLoading, setUsuarioLoading] = useState(false);
  const [usuarioDoc, setUsuarioDoc] = useState<Usuario | null>(null);

  // 1) Auth — escuta mudanças de sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 2) Usuário doc — escuta em realtime
  useEffect(() => {
    if (!session?.user?.id) {
      setUsuarioDoc(null);
      setUsuarioLoading(false);
      return;
    }

    setUsuarioLoading(true);

    const unsub = subscribeUsuario(session.user.id, (u) => {
      setUsuarioDoc(u);
      setUsuarioLoading(false);
    });

    return () => {
      unsub();
    }; // ← só essa linha muda
  }, [session?.user?.id]);

  // 3) Guard de rotas
  useEffect(() => {
    if (authLoading) return;

    const grupoAtual = segments[0];
    const estaNoAuth = grupoAtual === "(auth)";
    const estaNoOnboarding = grupoAtual === "(onboarding)";

    if (!session) {
      if (!estaNoAuth) router.replace("/(auth)/login");
      return;
    }

    if (usuarioLoading) return;

    const onboardingConcluido = usuarioDoc?.onboarding_concluido === true;

    if (!onboardingConcluido) {
      if (!estaNoOnboarding) router.replace("/(onboarding)");
      return;
    }

    if (estaNoAuth || estaNoOnboarding) {
      router.replace("/(tabs)");
    }
  }, [authLoading, session, usuarioLoading, usuarioDoc, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
