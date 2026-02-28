import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/src/firebase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { buscarImoveisPorRaio, Imovel } from "@/src/services/imoveisProximos";
import { MAPA_ESTILO, styles } from "./home.styles";

type UsuarioDoc = {
  funcoes?: { comprador?: boolean; vendedor?: boolean };
  preferencias?: { cidade?: string; uf?: string };
};

function formatarPreco(precoCentavos?: number) {
  if (!precoCentavos) return "Preço a combinar";
  const v = precoCentavos / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function getUserLocationSafe() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const last = await Location.getLastKnownPositionAsync({});
  if (last?.coords?.latitude && last?.coords?.longitude) {
    return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  }

  const timeoutMs = 6000;
  const pos = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
  ]);

  const p: any = pos;
  return { latitude: p.coords.latitude, longitude: p.coords.longitude };
}

export default function HomeTab() {
  const mapRef = useRef<MapView>(null);
  const listaRef = useRef<FlatList<Imovel>>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // evita rebuscar mil vezes quando volta pra Home e também no load inicial
  const jaBuscouInicialRef = useRef(false);

  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [posUsuario, setPosUsuario] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  const [region, setRegion] = useState<Region>({
    latitude: -26.6367,
    longitude: -48.6937,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [areaMudou, setAreaMudou] = useState(false);

  const uid = auth.currentUser?.uid;

  const modoComprador = useMemo(() => {
    const f = usuario?.funcoes;
    const comprador = f?.comprador !== false; // default true
    const vendedor = !!f?.vendedor;

    if (comprador) return true;
    if (!comprador && vendedor) return false;
    return true;
  }, [usuario]);

  const indexPorId = useMemo(() => {
    const map = new Map<string, number>();
    imoveis.forEach((it, idx) => map.set(it.id, idx));
    return map;
  }, [imoveis]);

  // carrega usuario (funcoes/preferencias)
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "usuarios", uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUsuario(snap.exists() ? (snap.data() as UsuarioDoc) : null);
    });
    return () => unsub();
  }, [uid]);

  function raioKmDaTela(r: Region) {
    const half = (r.latitudeDelta * 111) / 2;
    return Math.max(2, Math.min(25, half));
  }

  const carregarImoveis = useCallback(
    async (centro: { latitude: number; longitude: number }, r: Region) => {
      try {
        setBuscando(true);
        const raioKm = raioKmDaTela(r);
        const lista = await buscarImoveisPorRaio({ centro, raioKm });
        setImoveis(lista);
      } catch (e: any) {
        console.log("ERRO carregarImoveis:", e?.code, e?.message, e);
      } finally {
        setBuscando(false);
      }
    },
    []
  );

  function debouncedMarcarAreaMudou() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setAreaMudou(true), 300);
  }

  // pega localização ao entrar e faz busca inicial
  useEffect(() => {
    const run = async () => {
      try {
        const loc = await getUserLocationSafe();

        if (loc) {
          setPosUsuario(loc);

          const r: Region = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };

          setRegion(r);
          requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 600));

          await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
          jaBuscouInicialRef.current = true;
          setAreaMudou(false);
        }
      } catch (e: any) {
        console.log("ERRO getUserLocationSafe:", e?.code, e?.message, e);
      } finally {
        setCarregando(false);
      }
    };

    run();
  }, [carregarImoveis]);

  // quando voltar pra Home, rebusca (ex: após salvar imóvel)
  useFocusEffect(
    useCallback(() => {
      if (carregando) return;

      // se ainda não fez a busca inicial, não força aqui
      if (!jaBuscouInicialRef.current) return;

      carregarImoveis(
        { latitude: region.latitude, longitude: region.longitude },
        region
      );
      setAreaMudou(false);
    }, [
      carregando,
      carregarImoveis,
      region.latitude,
      region.longitude,
      region.latitudeDelta,
      region.longitudeDelta,
    ])
  );

  // se usuário não tem GPS (posUsuario null) e ele alterou preferências, centraliza e busca
  useEffect(() => {
    const cidade = usuario?.preferencias?.cidade?.trim();
    const uf = usuario?.preferencias?.uf?.trim()?.toUpperCase();

    if (!cidade || !uf) return;
    if (posUsuario) return;

    const run = async () => {
      try {
        const results = await Location.geocodeAsync(`${cidade}, ${uf}, Brasil`);
        if (!results?.length) return;

        const { latitude, longitude } = results[0];
        const r: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        };

        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);

        await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
        setAreaMudou(false);
        jaBuscouInicialRef.current = true;
      } catch (e: any) {
        console.log("ERRO geocode preferências:", e?.code, e?.message, e);
      }
    };

    run();
  }, [usuario?.preferencias?.cidade, usuario?.preferencias?.uf, posUsuario, carregarImoveis]);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    debouncedMarcarAreaMudou();
  };

  const buscarNestaArea = async () => {
    await carregarImoveis({ latitude: region.latitude, longitude: region.longitude }, region);
    setAreaMudou(false);
    jaBuscouInicialRef.current = true;
  };

  const irParaMinhaLocalizacao = async () => {
    try {
      const loc = await getUserLocationSafe();
      if (!loc) {
        Alert.alert("Localização", "Permissão negada. Você pode ajustar o local nas Preferências.");
        return;
      }

      setPosUsuario(loc);

      const r: Region = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };

      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);

      await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
      setAreaMudou(false);
      jaBuscouInicialRef.current = true;
    } catch {
      Alert.alert("Localização", "Não consegui pegar sua localização agora.");
    }
  };

  const abrirPreferencias = () => {
    router.push("/(tabs)/profile/preferencias");
  };

  const selecionarImovel = (im: Imovel) => {
    setSelecionadoId(im.id);

    const loc = im.localizacao;
    if (loc?.latitude && loc?.longitude) {
      const r: Region = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      mapRef.current?.animateToRegion(r, 450);
    }
  };

  const selecionarMarker = (im: Imovel) => {
    setSelecionadoId(im.id);

    const idx = indexPorId.get(im.id);
    if (idx !== undefined) {
      listaRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
    }
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ opacity: 0.7, marginTop: 10 }}>Carregando mapa…</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          customMapStyle={Platform.OS === "android" ? MAPA_ESTILO : undefined}
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          showsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          showsBuildings={false}
          showsTraffic={false}
          rotateEnabled={false}
          pitchEnabled={false}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        >
          {imoveis.map((im) => {
            const loc = im.localizacao;
            if (!loc) return null;

            const ativo = im.id === selecionadoId;

            return (
              <Marker
                key={im.id}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                onPress={() => selecionarMarker(im)}
                opacity={ativo ? 1 : 0.85}
              />
            );
          })}
        </MapView>

        <Pressable style={styles.searchBar} onPress={abrirPreferencias} hitSlop={8}>
          <Ionicons name="search" size={18} color="#5B5B5B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.searchText}>
              {usuario?.preferencias?.cidade && usuario?.preferencias?.uf
                ? `${usuario.preferencias.cidade} - ${usuario.preferencias.uf}`
                : "Buscar cidade…"}
            </Text>
            <Text style={styles.searchHint}>Trocar local</Text>
          </View>

          <View style={styles.searchChip}>
            <Ionicons name="options-outline" size={16} color="#111" />
          </View>
        </Pressable>

        {areaMudou && (
          <Pressable
            style={[styles.buscarAreaBtn, buscando && { opacity: 0.7 }]}
            onPress={buscarNestaArea}
            disabled={buscando}
            hitSlop={10}
          >
            <Ionicons name="refresh" size={16} color="#111" />
            <Text style={styles.buscarAreaText}>
              {buscando ? "Buscando…" : "Buscar nesta área"}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.locFab}
          onPress={irParaMinhaLocalizacao}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Ir para minha localização"
        >
          <Ionicons name="locate" size={20} color="#5A9F78" />
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {buscando ? "Buscando imóveis perto…" : "Imóveis por perto"}
        </Text>

        {!modoComprador && (
          <Text style={styles.sellerHint}>
            Você está como vendedor. (Depois a gente cria uma home específica pra vendedor-only.)
          </Text>
        )}
      </View>

      <FlatList
        ref={listaRef}
        data={imoveis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 10, gap: 10 }}
        onScrollToIndexFailed={() => {}}
        refreshing={buscando}
        onRefresh={() =>
          carregarImoveis({ latitude: region.latitude, longitude: region.longitude }, region)
        }
        renderItem={({ item }) => {
          const ativo = item.id === selecionadoId;

          return (
            <Pressable onPress={() => selecionarImovel(item)} style={[styles.card, ativo && styles.cardActive]}>
              <Text style={styles.cardTitle}>{item.titulo ?? "Imóvel"}</Text>
              <Text style={styles.cardSub}>
                {item.cidade && item.uf ? `${item.cidade} - ${item.uf}` : "Local não informado"}
              </Text>
              <Text style={styles.cardPrice}>{formatarPreco(item.precoCentavos)}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ opacity: 0.7 }}>Ainda não tem anúncios publicados nessa região.</Text>
          </View>
        }
      />
    </View>
  );
}