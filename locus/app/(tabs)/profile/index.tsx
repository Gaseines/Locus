import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/src/supabase";
import { subscribeUsuario, Usuario, signOutUser } from "@/src/services/usuariosSupa";
import { styles } from "./index.styles";

export default function ProfileTab() {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      unsub = subscribeUsuario(user.id, (u) => {
        setUsuario(u);
        setLoading(false);
      });
    });

    return () => { unsub?.(); };
  }, []);

  const nomeExibicao = useMemo(() => {
    if (!usuario) return "Usuário";
    const nome = [usuario.primeiro_nome, usuario.sobrenome].filter(Boolean).join(" ");
    return nome.trim() || "Usuário";
  }, [usuario]);

  const isVendedor = !!usuario?.funcao_vendedor;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível sair.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seus dados</Text>

        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{nomeExibicao}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
        <Text style={styles.value}>{usuario?.email ?? "Não informado"}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>WhatsApp</Text>
        <Text style={styles.value}>{usuario?.telefone ?? "Não informado"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Especificações para o app</Text>

        <Text style={styles.label}>Intenção</Text>
        <Text style={styles.value}>
          {usuario?.funcao_comprador && usuario?.funcao_vendedor
            ? "Comprador e Vendedor"
            : usuario?.funcao_comprador
            ? "Comprador"
            : usuario?.funcao_vendedor
            ? "Vendedor"
            : "Não definido"}
        </Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Residência</Text>
        <Text style={styles.value}>
          {usuario?.pref_cidade && usuario?.pref_uf
            ? `${usuario.pref_cidade} - ${usuario.pref_uf}`
            : usuario?.pref_cidade ?? usuario?.pref_uf ?? "Não definido"}
        </Text>

        <Pressable
          style={[styles.primaryBtn, { marginTop: 14 }]}
          onPress={() => router.push("/(tabs)/profile/preferencias")}
        >
          <Text style={styles.primaryText}>Editar preferências</Text>
        </Pressable>
      </View>

      {isVendedor ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Seus imóveis</Text>
          <Pressable style={styles.menuItem} onPress={() => router.push("/(tabs)/profile/meus-imoveis")}>
            <Ionicons name="home-outline" size={20} color="#5A9F78" />
            <Text style={styles.menuItemText}>Meus imóveis</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.menuItem} onPress={() => router.push("/(tabs)/profile/novo-imovel")}>
            <Ionicons name="add-circle-outline" size={20} color="#5A9F78" />
            <Text style={styles.menuItemText}>Anunciar novo imóvel</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/(tabs)/profile/novo-imovel")}>
            <Text style={styles.primaryText}>Anunciar imóvel</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}