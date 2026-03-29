import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { escolherImagem, tirarFoto } from "@/src/services/storageSupa";

export type FotoItem = {
  id: string;           // uuid local para controle
  uri: string;          // uri local ou url remota
  uploading?: boolean;
  erro?: boolean;
};

type Props = {
  fotos: FotoItem[];
  onAddUri: (uri: string) => void;
  onRemove: (id: string) => void;
  maxFotos?: number;
  disabled?: boolean;
};

export function FotoUpload({
  fotos,
  onAddUri,
  onRemove,
  maxFotos = 6,
  disabled = false,
}: Props) {
  const podeAdicionar = fotos.length < maxFotos && !disabled;

  function handleAdd() {
    Alert.alert("Adicionar foto", "Escolha uma opção:", [
      {
        text: "Galeria",
        onPress: async () => {
          const uri = await escolherImagem();
          if (uri) onAddUri(uri);
        },
      },
      {
        text: "Câmera",
        onPress: async () => {
          const uri = await tirarFoto();
          if (uri) onAddUri(uri);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Botão de adicionar */}
        {podeAdicionar && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            onPress={handleAdd}
          >
            <Ionicons name="camera-outline" size={28} color="#5A9F78" />
            <Text style={styles.addText}>
              {fotos.length === 0 ? "Adicionar foto" : "Mais"}
            </Text>
            <Text style={styles.addCount}>
              {fotos.length}/{maxFotos}
            </Text>
          </Pressable>
        )}

        {/* Fotos */}
        {fotos.map((foto) => (
          <View key={foto.id} style={styles.fotoWrap}>
            <Image source={{ uri: foto.uri }} style={styles.foto} />

            {/* Loading overlay */}
            {foto.uploading && (
              <View style={styles.overlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}

            {/* Erro overlay */}
            {foto.erro && !foto.uploading && (
              <View style={[styles.overlay, styles.overlayErro]}>
                <Ionicons name="alert-circle" size={20} color="#fff" />
              </View>
            )}

            {/* Botão remover */}
            {!foto.uploading && (
              <Pressable
                style={styles.removeBtn}
                onPress={() => onRemove(foto.id)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {fotos.length === 0 && (
        <Text style={styles.hint}>
          Adicione até {maxFotos} fotos. A primeira será a capa do anúncio.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  addBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#5A9F78",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FAF4",
    gap: 4,
  },
  addText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5A9F78",
  },
  addCount: {
    fontSize: 11,
    color: "#5A9F78",
    opacity: 0.7,
  },
  fotoWrap: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  foto: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayErro: {
    backgroundColor: "rgba(192,57,43,0.7)",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  hint: {
    fontSize: 12,
    color: "#5b5b5b",
    opacity: 0.7,
    marginTop: 6,
  },
});