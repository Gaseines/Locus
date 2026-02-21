import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/src/firebase";
import { router } from "expo-router";

import { buscarImoveisPorRaio, Imovel } from "@/src/services/imoveisProximos";

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

  // tenta lastKnown primeiro (mais rápido e evita travas em alguns cenários)
  const last = await Location.getLastKnownPositionAsync({});
  if (last?.coords?.latitude && last?.coords?.longitude) {
    return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  }

  // timeout no getCurrentPositionAsync
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [posUsuario, setPosUsuario] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  const [region, setRegion] = useState<Region>({
    latitude: -26.6367, // fallback (ajusta se quiser)
    longitude: -48.6937,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const uid = auth.currentUser?.uid;

  const modoComprador = useMemo(() => {
    const f = usuario?.funcoes;
    const comprador = f?.comprador !== false; // default: true
    const vendedor = !!f?.vendedor;

    // comprador true, ambos, ou pulou => mostra mapa + lista
    if (comprador) return true;
    // vendedor-only => por enquanto também mostra (market intel), mas podemos mudar depois
    if (!comprador && vendedor) return false;
    return true;
  }, [usuario]);

  // carrega usuario (funcoes/preferencias)
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "usuarios", uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUsuario(snap.exists() ? (snap.data() as UsuarioDoc) : null);
    });
    return () => unsub();
  }, [uid]);

  // pega localização ao entrar
  useEffect(() => {
    const run = async () => {
      try {
        const loc = await getUserLocationSafe();
        if (loc) {
          setPosUsuario(loc);
          const r = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };
          setRegion(r);
          // anima o mapa
          requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 600));
        } else {
          // sem permissão: tenta usar preferências (cidade/uf) como fallback depois
        }
      } catch {
        // deixa no fallback
      } finally {
        setCarregando(false);
      }
    };
    run();
  }, []);

  // se o usuário mudar preferências (perfil), recentraliza no local salvo (quando não estiver usando "minha localização")
  useEffect(() => {
    const cidade = usuario?.preferencias?.cidade?.trim();
    const uf = usuario?.preferencias?.uf?.trim()?.toUpperCase();

    if (!cidade || !uf) return;

    // se ele tem localização do GPS, não vamos “brigar” com a experiência inicial
    // (mas ele pode trocar local mexendo no mapa)
    if (posUsuario) return;

    const run = async () => {
      try {
        const results = await Location.geocodeAsync(`${cidade}, ${uf}, Brasil`);
        if (!results?.length) return;

        const { latitude, longitude } = results[0];
        const r = {
          latitude,
          longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);
      } catch {
        // ignora
      }
    };

    run();
  }, [usuario?.preferencias?.cidade, usuario?.preferencias?.uf, posUsuario]);

  function raioKmDaTela(r: Region) {
    // aproximação: 1 grau de latitude ~ 111km
    const half = (r.latitudeDelta * 111) / 2;
    return Math.max(2, Math.min(25, half)); // entre 2km e 25km
  }

  async function carregarImoveis(centro: { latitude: number; longitude: number }, r: Region) {
    try {
      setBuscando(true);
      const raioKm = raioKmDaTela(r);
      const lista = await buscarImoveisPorRaio({ centro, raioKm });
      setImoveis(lista);
    } catch (e: any) {
      // se for primeiro uso e não existir índice, o Firestore dá erro com link
      // (melhor mostrar uma msg amigável)
      // console.log(e?.message);
    } finally {
      setBuscando(false);
    }
  }

  function debouncedFetch(nextRegion: Region) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      carregarImoveis(
        { latitude: nextRegion.latitude, longitude: nextRegion.longitude },
        nextRegion
      );
    }, 450);
  }

  useEffect(() => {
    // busca inicial assim que saiu do loading
    if (carregando) return;
    debouncedFetch(region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando]);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    debouncedFetch(r);
  };

  const irParaMinhaLocalizacao = async () => {
    try {
      const loc = await getUserLocationSafe();
      if (!loc) {
        Alert.alert("Localização", "Permissão negada. Você pode ajustar o local nas Preferências.");
        return;
      }

      setPosUsuario(loc);
      const r = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);
    } catch {
      Alert.alert("Localização", "Não consegui pegar sua localização agora.");
    }
  };

  const abrirPreferencias = () => {
    router.push("/(tabs)/profile/preferencias");
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
      {/* MAPA */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        >
          {imoveis.map((im) => {
            const loc = im.localizacao;
            if (!loc) return null;
            return (
              <Marker
                key={im.id}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                onPress={() => setSelecionadoId(im.id)}
              />
            );
          })}
        </MapView>

        {/* “barra” tipo Airbnb (MVP: abre Preferências pra trocar cidade/UF) */}
        <Pressable style={styles.searchBar} onPress={abrirPreferencias}>
          <Text style={styles.searchText}>
            {usuario?.preferencias?.cidade && usuario?.preferencias?.uf
              ? `${usuario.preferencias.cidade} - ${usuario.preferencias.uf}`
              : "Buscar cidade…"}
          </Text>
          <Text style={styles.searchHint}>Trocar local</Text>
        </Pressable>

        <Pressable style={styles.locBtn} onPress={irParaMinhaLocalizacao}>
          <Text style={styles.locBtnText}>Minha localização</Text>
        </Pressable>
      </View>

      {/* LISTA */}
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
        data={imoveis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 10, gap: 10 }}
        renderItem={({ item }) => {
          const ativo = item.id === selecionadoId;

          return (
            <Pressable
              onPress={() => setSelecionadoId(item.id)}
              style={[styles.card, ativo && styles.cardActive]}
            >
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
            <Text style={{ opacity: 0.7 }}>
              Ainda não tem anúncios publicados nessa região.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8F6" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  mapWrap: {
    height: "45%",
    backgroundColor: "#D7EBDD",
  },

  searchBar: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  searchText: { fontWeight: "800", color: "#111" },
  searchHint: { marginTop: 2, fontSize: 12, opacity: 0.7 },

  locBtn: {
    position: "absolute",
    right: 14,
    bottom: 14,
    backgroundColor: "#5A9F78",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  locBtnText: { color: "#fff", fontWeight: "900" },

  listHeader: { paddingHorizontal: 16, paddingTop: 12 },
  listTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  sellerHint: { marginTop: 6, fontSize: 12, opacity: 0.7 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  cardActive: {
    borderColor: "#5A9F78",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  cardSub: { marginTop: 4, fontSize: 12, opacity: 0.7 },
  cardPrice: { marginTop: 10, fontSize: 14, fontWeight: "900", color: "#111" },
});