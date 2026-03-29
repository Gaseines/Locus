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
  const [usuarioDoc, setUsuarioDoc] = useState<Usuario | null | undefined>(
    undefined // ← undefined = ainda não carregou, null = não existe
  );

  // 1) Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setAuthLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 2) Usuário doc
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

    return () => { unsub(); };
  }, [session?.user?.id]);

  // 3) Guard de rotas
  useEffect(() => {
    // Ainda carregando auth
    if (authLoading) return;

    // Ainda carregando doc (só bloqueia se tiver sessão)
    if (session && usuarioLoading) return;

    // Doc ainda não foi buscado (undefined = aguardando primeira resposta)
    if (session && usuarioDoc === undefined) return;

    const grupoAtual = segments[0];
    const estaNoAuth = grupoAtual === "(auth)";
    const estaNoOnboarding = grupoAtual === "(onboarding)";
    const estaNoTabs = grupoAtual === "(tabs)";

    // Não logado → login
    if (!session) {
      if (!estaNoAuth) router.replace("/(auth)/login");
      return;
    }

    const onboardingConcluido = usuarioDoc?.onboarding_concluido === true;

    // Logado mas onboarding pendente → onboarding
    if (!onboardingConcluido) {
      if (!estaNoOnboarding) router.replace("/(onboarding)");
      return;
    }

    // Logado e onboarding ok → tabs
    if (estaNoAuth || estaNoOnboarding) {
      router.replace("/(tabs)");
    }
  }, [authLoading, session, usuarioLoading, usuarioDoc, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}