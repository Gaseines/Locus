import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/src/supabase";
import { Imovel } from "@/src/services/imoveisSupa";
import { getUsuario, Usuario } from "@/src/services/usuariosSupa";
import { MAPA_ESTILO } from "../home.styles";
import { styles } from "./detalhe.styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatarPreco(centavos?: number) {
  if (!centavos) return "Preço a combinar";
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const TIPO_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
};

export default function DetalheImovelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [vendedor, setVendedor] = useState<Usuario | null>(null);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUsuarioAtualId(user.id);

        const { data, error } = await supabase
          .from("imoveis")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          Alert.alert("Erro", "Imóvel não encontrado.");
          router.back();
          return;
        }

        setImovel(data as Imovel);

        if (data.id_dono) {
          const u = await getUsuario(data.id_dono);
          setVendedor(u);
        }
      } catch (e: any) {
        Alert.alert("Erro", e?.message ?? "Não foi possível carregar.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A9F78" />
      </View>
    );
  }

  if (!imovel) return null;

  const fotos = imovel.fotos ?? [];
  const temFotos = fotos.length > 0;
  const nomeVendedor =
    [vendedor?.primeiro_nome, vendedor?.sobrenome].filter(Boolean).join(" ") ||
    "Vendedor";
  const isDono = usuarioAtualId === imovel.id_dono;

  return (
    <View style={styles.page}>
      {/* Botão voltar flutuante */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#111" />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Galeria de fotos ── */}
        {temFotos ? (
          <View style={styles.galeriaWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setFotoAtiva(idx);
              }}
            >
              {fotos.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={styles.foto}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {fotos.length > 1 && (
              <View style={styles.dotsWrap}>
                {fotos.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === fotoAtiva && styles.dotAtivo]}
                  />
                ))}
              </View>
            )}

            <View style={styles.contador}>
              <Text style={styles.contadorText}>
                {fotoAtiva + 1}/{fotos.length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.semFoto}>
            <Ionicons name="home-outline" size={48} color="#ccc" />
            <Text style={styles.semFotoText}>Sem fotos</Text>
          </View>
        )}

        {/* ── Conteúdo ── */}
        <View style={styles.content}>

          <View style={styles.rowSpaced}>
            <Text style={styles.preco}>
              {formatarPreco(imovel.preco_centavos)}
            </Text>
            {imovel.tipo && (
              <View style={styles.tipoBadge}>
                <Text style={styles.tipoText}>
                  {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.titulo}>{imovel.titulo}</Text>

          {(imovel.cidade || imovel.uf) && (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={15} color="#5A9F78" />
              <Text style={styles.locText}>
                {[imovel.cidade, imovel.uf].filter(Boolean).join(" — ")}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {imovel.descricao ? (
            <>
              <Text style={styles.secaoTitulo}>Descrição</Text>
              <Text style={styles.descricao}>{imovel.descricao}</Text>
              <View style={styles.divider} />
            </>
          ) : null}

          {imovel.latitude && imovel.longitude && (
            <>
              <Text style={styles.secaoTitulo}>Localização</Text>
              <View style={styles.mapaWrap}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: imovel.latitude,
                    longitude: imovel.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  customMapStyle={
                    Platform.OS === "android" ? MAPA_ESTILO : undefined
                  }
                  mapType={
                    Platform.OS === "ios" ? "mutedStandard" : "standard"
                  }
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  showsPointsOfInterest={false}
                  showsBuildings={false}
                  provider={
                    Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                  }
                >
                  <Marker
                    coordinate={{
                      latitude: imovel.latitude,
                      longitude: imovel.longitude,
                    }}
                  />
                </MapView>
              </View>
              <View style={styles.divider} />
            </>
          )}

          <Text style={styles.secaoTitulo}>Anunciante</Text>
          <View style={styles.vendedorCard}>
            <View style={styles.vendedorAvatar}>
              <Text style={styles.vendedorAvatarText}>
                {nomeVendedor.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendedorNome}>{nomeVendedor}</Text>
              <Text style={styles.vendedorSub}>Vendedor no Locus</Text>
            </View>
          </View>

          {!isDono && (
            <Pressable
              style={styles.contatoBtn}
              onPress={() =>
                Alert.alert(
                  "Em breve",
                  "O chat interno estará disponível em breve. Por enquanto, negociações fora do app são de responsabilidade dos usuários.",
                  [{ text: "Entendi" }]
                )
              }
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.contatoBtnText}>Entrar em contato</Text>
            </Pressable>
          )}

          {isDono && (
            <Pressable
              style={styles.editarBtn}
              onPress={() =>
                router.push(
                  `/(tabs)/profile/editar-imovel?id=${imovel.id}` as any
                )
              }
            >
              <Ionicons name="pencil-outline" size={18} color="#5A9F78" />
              <Text style={styles.editarBtnText}>Editar este anúncio</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}