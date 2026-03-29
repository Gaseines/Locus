import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

import { router, useLocalSearchParams } from "expo-router";

import { CORES } from "@/src/theme/cores";
import { supabase } from "@/src/supabase";
import {
  editarImovel,
  StatusImovel,
  TipoImovel,
} from "@/src/services/imoveisSupa";
import {
  aplicarMascaraPreco,
  centavosParaInputStr,
  inputStrParaCentavos,
} from "@/src/utils/formatters";
import { MAPA_ESTILO } from "./novo-imovel.styles";
import { styles } from "./editar-imovel.styles";
import { FotoUpload, FotoItem } from "@/components/FotoUpload";
import {
  uploadImagem,
  deletarImagem,
  extrairPathDaUrl,
} from "@/src/services/storageSupa";
import { atualizarFotosImovel } from "@/src/services/imoveisSupa";
import { v4 as uuidv4 } from "uuid";

type Estado = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

const IBGE_ESTADOS_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const IBGE_MUNICIPIOS_POR_UF = (estadoId: number) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`;

function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EditarImovelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView>(null);
  const municipiosCache = useRef<Record<number, Municipio[]>>({});
  const [uid, setUid] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [region, setRegion] = useState<Region>({
    latitude: -15.7801,
    longitude: -47.9292,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoImovel>("terreno");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<StatusImovel>("rascunho");

  const [estados, setEstados] = useState<Estado[]>([]);
  const [modalEstadosAberto, setModalEstadosAberto] = useState(false);
  const [buscaEstado, setBuscaEstado] = useState("");
  const [estadoSelecionado, setEstadoSelecionado] = useState<Estado | null>(
    null,
  );

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false);
  const [cidade, setCidade] = useState("");
  const [municipioSelecionado, setMunicipioSelecionado] =
    useState<Municipio | null>(null);

  const [erroTitulo, setErroTitulo] = useState<string | null>(null);
  const [erroPreco, setErroPreco] = useState<string | null>(null);
  const [erroCidade, setErroCidade] = useState<string | null>(null);
  const [erroUf, setErroUf] = useState<string | null>(null);
  const [erroPin, setErroPin] = useState<string | null>(null);

  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [fotosRemovidas, setFotosRemovidas] = useState<string[]>([]); // paths a deletar

  const precoCentavos = useMemo(() => inputStrParaCentavos(preco), [preco]);

  const estadosFiltrados = useMemo(() => {
    if (!buscaEstado.trim()) return estados;
    const b = normalizarTexto(buscaEstado);
    return estados.filter(
      (e) =>
        normalizarTexto(e.sigla).includes(b) ||
        normalizarTexto(e.nome).includes(b),
    );
  }, [estados, buscaEstado]);

  const sugestoesCidades = useMemo(() => {
    if (!cidade.trim() || municipioSelecionado) return [];
    const b = normalizarTexto(cidade);
    return municipios
      .filter((m) => normalizarTexto(m.nome).includes(b))
      .slice(0, 6);
  }, [cidade, municipios, municipioSelecionado]);

  async function fetchEstados(): Promise<Estado[]> {
    const res = await fetch(IBGE_ESTADOS_URL);
    if (!res.ok) throw new Error("Falha ao buscar estados");
    const data = (await res.json()) as any[];
    return data
      .map((e) => ({ id: e.id, sigla: e.sigla, nome: e.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  async function fetchMunicipios(estadoId: number): Promise<Municipio[]> {
    if (municipiosCache.current[estadoId])
      return municipiosCache.current[estadoId];
    const res = await fetch(IBGE_MUNICIPIOS_POR_UF(estadoId));
    if (!res.ok) throw new Error("Falha ao buscar municípios");
    const data = (await res.json()) as any[];
    const lista = data
      .map((m) => ({ id: m.id, nome: m.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    municipiosCache.current[estadoId] = lista;
    return lista;
  }

  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !id) {
          router.back();
          return;
        }
        setUid(user.id);

        const [estadosLista, { data: imovelData, error }] = await Promise.all([
          fetchEstados(),
          supabase.from("imoveis").select("*").eq("id", id).single(),
        ]);

        if (error || !imovelData) {
          Alert.alert("Erro", "Imóvel não encontrado.");
          router.back();
          return;
        }

        const data: any = imovelData;

        setTitulo(data.titulo ?? "");
        setTipo(data.tipo ?? "terreno");
        setDescricao(data.descricao ?? "");
        setStatus(data.status ?? "rascunho");

        // ✅ Carrega fotos existentes
        if (data.fotos && data.fotos.length > 0) {
          const fotosExistentes: FotoItem[] = data.fotos.map((url: string) => ({
            id: uuidv4(),
            uri: url,
            uploading: false,
          }));
          setFotos(fotosExistentes);
        }

        // ✅ Preço já formatado como "350.000,00"

        if (data.preco_centavos) {
          setPreco(centavosParaInputStr(data.preco_centavos));
        }

        // Localização:
        const loc = { latitude: data.latitude, longitude: data.longitude };
        if (loc?.latitude && loc?.longitude) {
          const r: Region = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };
          setRegion(r);
          setPin({ latitude: loc.latitude, longitude: loc.longitude });
          setTimeout(() => mapRef.current?.animateToRegion(r, 400), 500);
        }

        // Cidade/UF:
        const ufSalvo = data.uf ?? "";
        const cidadeSalva = data.cidade ?? "";

        if (ufSalvo) {
          const estLocal =
            estadosLista.find((e) => e.sigla === ufSalvo) ?? null;
          setEstadoSelecionado(estLocal);

          if (estLocal) {
            setCarregandoMunicipios(true);
            try {
              const lista = await fetchMunicipios(estLocal.id);
              setMunicipios(lista);
              if (cidadeSalva) {
                const match =
                  lista.find(
                    (m) =>
                      normalizarTexto(m.nome) === normalizarTexto(cidadeSalva),
                  ) ?? null;
                if (match) {
                  setCidade(match.nome);
                  setMunicipioSelecionado(match);
                } else setCidade(cidadeSalva);
              }
            } finally {
              setCarregandoMunicipios(false);
            }
          }
        }
      } catch (e: any) {
        Alert.alert(
          "Erro",
          e?.message ?? "Não foi possível carregar o imóvel.",
        );
        router.back();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [uid, id]);

  async function selecionarEstado(estado: Estado) {
    setEstadoSelecionado(estado);
    setModalEstadosAberto(false);
    setBuscaEstado("");
    setCidade("");
    setMunicipioSelecionado(null);
    setMunicipios([]);
    setErroUf(null);
    setCarregandoMunicipios(true);
    try {
      const lista = await fetchMunicipios(estado.id);
      setMunicipios(lista);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as cidades.");
    } finally {
      setCarregandoMunicipios(false);
    }
  }

  function selecionarCidade(m: Municipio) {
    setCidade(m.nome);
    setMunicipioSelecionado(m);
    setErroCidade(null);
  }

  async function salvar() {
    let valido = true;
    if (!titulo.trim()) {
      setErroTitulo("Informe um título.");
      valido = false;
    }
    if (!precoCentavos || precoCentavos <= 0) {
      setErroPreco("Informe um preço válido.");
      valido = false;
    }
    if (!estadoSelecionado) {
      setErroUf("Selecione um estado.");
      valido = false;
    }
    if (!municipioSelecionado) {
      setErroCidade("Selecione uma cidade da lista.");
      valido = false;
    }
    if (!pin) {
      setErroPin("Toque no mapa para posicionar o imóvel.");
      valido = false;
    }
    if (!valido) return;

    setSalvando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      // 1) Salva os dados do imóvel
      await editarImovel(id!, {
        titulo,
        descricao,
        precoCentavos: precoCentavos!,
        tipo,
        cidade: municipioSelecionado!.nome,
        uf: estadoSelecionado!.sigla,
        idEstado: estadoSelecionado!.id,
        idMunicipio: municipioSelecionado!.id,
        status,
        latitude: pin!.latitude,
        longitude: pin!.longitude,
      });

      // 2) Faz upload das fotos novas (que têm uri local, não http)
      const fotosNovas = fotos.filter((f) => !f.uri.startsWith("http"));
      const fotasExistentes = fotos
        .filter((f) => f.uri.startsWith("http"))
        .map((f) => f.uri);

      const urlsNovas: string[] = [];

      if (fotosNovas.length > 0) {
        setFotos((prev) =>
          prev.map((f) =>
            !f.uri.startsWith("http") ? { ...f, uploading: true } : f,
          ),
        );

        for (const foto of fotosNovas) {
          try {
            const url = await uploadImagem({
              uri: foto.uri,
              imovelId: id!,
              userId: user.id,
            });
            urlsNovas.push(url);
            setFotos((prev) =>
              prev.map((f) =>
                f.id === foto.id ? { ...f, uri: url, uploading: false } : f,
              ),
            );
          } catch {
            setFotos((prev) =>
              prev.map((f) =>
                f.id === foto.id ? { ...f, uploading: false, erro: true } : f,
              ),
            );
          }
        }
      }

      // 3) Atualiza a lista de fotos no banco
      const todasFotos = [...fotasExistentes, ...urlsNovas];
      await atualizarFotosImovel(id!, todasFotos);

      // 4) Deleta fotos removidas do Storage
      for (const path of fotosRemovidas) {
        try {
          await deletarImagem(path);
        } catch {
          /* ignora */
        }
      }

      Alert.alert("Salvo!", "Imóvel atualizado com sucesso.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }
  function handleAddFotoUri(uri: string) {
    setFotos((prev) => [...prev, { id: uuidv4(), uri, uploading: false }]);
  }

  function handleRemoveFoto(id: string) {
    const foto = fotos.find((f) => f.id === id);
    if (foto) {
      // Se for uma URL remota, marca para deletar do Storage depois
      const path = extrairPathDaUrl(foto.uri);
      if (path) setFotosRemovidas((prev) => [...prev, path]);
    }
    setFotos((prev) => prev.filter((f) => f.id !== id));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A9F78" />
        <Text style={{ marginTop: 10, color: CORES.texto, opacity: 0.75 }}>
          Carregando…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={region}
          onPress={(e) => {
            setPin(e.nativeEvent.coordinate);
            setErroPin(null);
          }}
          customMapStyle={Platform.OS === "android" ? MAPA_ESTILO : undefined}
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          showsUserLocation
          showsPointsOfInterest={false}
          showsBuildings={false}
          showsTraffic={false}
          rotateEnabled={false}
          pitchEnabled={false}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        >
          {pin && (
            <Marker
              coordinate={pin}
              draggable
              onDragEnd={(e) => {
                setPin(e.nativeEvent.coordinate);
                setErroPin(null);
              }}
            />
          )}
        </MapView>
        <View style={styles.tip}>
          <Text style={styles.tipText}>Toque no mapa para reposicionar.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Editar imóvel</Text>

        {/* ✅ Fotos */}
        <Text style={[styles.label, { marginTop: 4 }]}>Fotos</Text>
        <FotoUpload
          fotos={fotos}
          onAddUri={handleAddFotoUri}
          onRemove={handleRemoveFoto}
          maxFotos={6}
          disabled={salvando}
        />

        {!!erroPin && <Text style={styles.error}>{erroPin}</Text>}

        <Text style={styles.label}>Título</Text>
        <TextInput
          value={titulo}
          onChangeText={(t) => {
            setTitulo(t);
            if (erroTitulo) setErroTitulo(null);
          }}
          placeholder="Ex: Terreno próximo à praia"
          placeholderTextColor="#999"
          style={[styles.input, erroTitulo && styles.inputError]}
        />
        {!!erroTitulo && <Text style={styles.error}>{erroTitulo}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Tipo</Text>
        <View style={styles.segment}>
          {(["terreno", "casa", "apartamento"] as TipoImovel[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTipo(t)}
              style={[styles.segmentBtn, tipo === t && styles.segmentBtnActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  tipo === t && styles.segmentTextActive,
                ]}
              >
                {t === "terreno" ? "Terreno" : t === "casa" ? "Casa" : "Apto"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Preço (R$)</Text>
        <TextInput
          value={preco}
          onChangeText={(t) => {
            // ✅ Aplica máscara: "35000000" → "350.000,00"
            setPreco(aplicarMascaraPreco(t));
            if (erroPreco) setErroPreco(null);
          }}
          placeholder="Ex: 350.000,00"
          placeholderTextColor="#999"
          keyboardType="numeric"
          style={[styles.input, erroPreco && styles.inputError]}
        />
        {!!erroPreco && <Text style={styles.error}>{erroPreco}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Estado (UF)</Text>
        <Pressable
          style={styles.selectInput}
          onPress={() => setModalEstadosAberto(true)}
        >
          <Text
            style={
              estadoSelecionado ? styles.selectText : styles.selectPlaceholder
            }
          >
            {estadoSelecionado
              ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
              : "Selecione um estado"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={CORES.texto} />
        </Pressable>
        {!!erroUf && <Text style={styles.error}>{erroUf}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Cidade</Text>
        <TextInput
          value={cidade}
          onChangeText={(t) => {
            setCidade(t);
            setMunicipioSelecionado(null);
            if (erroCidade) setErroCidade(null);
          }}
          placeholder={
            estadoSelecionado
              ? "Digite e selecione na lista…"
              : "Selecione um estado primeiro"
          }
          placeholderTextColor="#999"
          editable={!!estadoSelecionado && !carregandoMunicipios}
          style={[
            styles.input,
            erroCidade && styles.inputError,
            !estadoSelecionado && { opacity: 0.6 },
          ]}
        />

        {carregandoMunicipios && (
          <View style={styles.rowLoading}>
            <ActivityIndicator />
            <Text style={styles.rowLoadingText}>Carregando cidades…</Text>
          </View>
        )}

        {!!estadoSelecionado && sugestoesCidades.length > 0 && (
          <View style={styles.sugestoesBox}>
            {sugestoesCidades.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => selecionarCidade(m)}
                style={styles.sugestaoItem}
              >
                <Text style={{ color: CORES.texto }}>{m.nome}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!!municipioSelecionado && (
          <Text style={styles.okText}>✓ {municipioSelecionado.nome}</Text>
        )}
        {!!erroCidade && <Text style={styles.error}>{erroCidade}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>
          Descrição (opcional)
        </Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Detalhes do imóvel…"
          placeholderTextColor="#999"
          multiline
          style={[styles.input, { height: 90, textAlignVertical: "top" }]}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Status</Text>
        <View style={styles.segment}>
          {(["rascunho", "publicado", "arquivado"] as StatusImovel[]).map(
            (s) => {
              const labels: Record<StatusImovel, string> = {
                rascunho: "Rascunho",
                publicado: "Publicado",
                arquivado: "Arquivado",
              };
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.segmentBtn,
                    status === s && styles.segmentBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      status === s && styles.segmentTextActive,
                    ]}
                  >
                    {labels[s]}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <Pressable
          style={[styles.primaryBtn, salvando && { opacity: 0.75 }]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Salvar alterações</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.back()}
          disabled={salvando}
        >
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={modalEstadosAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalEstadosAberto(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalEstadosAberto(false)}
        />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione seu estado</Text>
          <TextInput
            value={buscaEstado}
            onChangeText={setBuscaEstado}
            placeholder="Buscar (ex: SC, Santa Catarina)"
            placeholderTextColor="#999"
            style={styles.modalSearch}
            autoCapitalize="none"
          />
          <FlatList
            data={estadosFiltrados}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selecionarEstado(item)}
                style={styles.estadoItem}
              >
                <Text style={{ fontWeight: "900", color: CORES.texto }}>
                  {item.sigla}
                </Text>
                <Text style={{ marginLeft: 10, color: CORES.texto }}>
                  {item.nome}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
