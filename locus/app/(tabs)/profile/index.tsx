import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { router } from "expo-router";

import { auth, db } from "@/src/firebase";

type Funcoes = { comprador?: boolean; vendedor?: boolean };

type Preferencias = {
  cidade?: string;
  uf?: string;
  estadoNome?: string | null;
  idEstado?: number | null;
  idMunicipio?: number | null;
};

type UsuarioDoc = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string | null;
  email?: string;

  primeiroNome?: string;
  sobrenome?: string;
  nomeCompleto?: string;
  telefone?: string | null;

  funcoes?: Funcoes;
  preferencias?: Preferencias;
  onboardingConcluido?: boolean;
  onboardingPulado?: boolean;
};

export default function ProfileTab() {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null);

  const uid = auth.currentUser?.uid;
  const emailAuth = auth.currentUser?.email ?? "";

  useEffect(() => {
    if (!uid) {
      setUsuario(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, "usuarios", uid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        if (snap.exists()) setUsuario(snap.data() as UsuarioDoc);
        else setUsuario({ email: emailAuth });
      },
      (err) => {
        setLoading(false);
        Alert.alert("Erro", err?.message ?? "Não foi possível carregar seu perfil.");
      }
    );

    return () => unsub();
  }, [uid, emailAuth]);

  const nomeExibicao = useMemo(() => {
    const n =
      usuario?.fullName ||
      usuario?.nomeCompleto ||
      [usuario?.firstName ?? usuario?.primeiroNome, usuario?.lastName ?? usuario?.sobrenome]
        .filter(Boolean)
        .join(" ");
    return n?.trim() ? n : "Usuário";
  }, [usuario]);

  const telefoneExibicao = useMemo(() => {
    const t = usuario?.phone ?? usuario?.telefone ?? null;
    return t ? String(t) : "Não informado";
  }, [usuario]);

  const emailExibicao = useMemo(() => usuario?.email ?? emailAuth ?? "Não informado", [usuario, emailAuth]);

  const funcoesExibicao = useMemo(() => {
    const f = usuario?.funcoes;
    const comprador = !!f?.comprador;
    const vendedor = !!f?.vendedor;
    if (comprador && vendedor) return "Comprador e Vendedor";
    if (comprador) return "Comprador";
    if (vendedor) return "Vendedor";
    return "Não definido";
  }, [usuario]);

  const localExibicao = useMemo(() => {
    const p = usuario?.preferencias;
    const cidade = p?.cidade?.trim();
    const uf = p?.uf?.trim()?.toUpperCase();
    if (cidade && uf) return `${cidade} - ${uf}`;
    if (cidade) return cidade;
    if (uf) return uf;
    return "Não definido";
  }, [usuario]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível sair.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seus dados</Text>

        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{nomeExibicao}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
        <Text style={styles.value}>{emailExibicao}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>WhatsApp</Text>
        <Text style={styles.value}>{telefoneExibicao}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Especificações para o app</Text>

        <Text style={styles.label}>Intenção</Text>
        <Text style={styles.value}>{funcoesExibicao}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Residência</Text>
        <Text style={styles.value}>{localExibicao}</Text>

        <Pressable
          style={[styles.primaryBtn, { marginTop: 14 }]}
          onPress={() => router.push("/(tabs)/profile/preferencias")}
        >
          <Text style={styles.primaryText}>Editar preferências</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 24, paddingBottom: 40, gap: 14 },
  title: { fontSize: 22, fontWeight: "800" },

  card: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 10, color: "#111" },

  label: { fontSize: 12, opacity: 0.7 },
  value: { fontSize: 16, fontWeight: "700", marginTop: 4 },

  primaryBtn: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5A9F78",
  },
  primaryText: { fontWeight: "800", color: "#fff" },

  logoutButton: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAEAEA",
  },
  logoutText: { fontWeight: "800", color: "#111" },
});