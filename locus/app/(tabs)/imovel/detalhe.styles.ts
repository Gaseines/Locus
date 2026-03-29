import { Dimensions, StyleSheet } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8F6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 40 },

  backBtn: {
    position: "absolute",
    top: 52,
    left: 14,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  // Galeria
  galeriaWrap: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: "#F0F0F0",
  },
  foto: { width: SCREEN_WIDTH, height: 280 },
  dotsWrap: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotAtivo: { backgroundColor: "#fff", width: 18 },
  contador: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contadorText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  semFoto: {
    height: 200,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  semFotoText: { color: "#ccc", fontSize: 14 },

  // Conteúdo
  content: { padding: 20, gap: 8 },

  rowSpaced: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preco: { fontSize: 22, fontWeight: "900", color: "#111" },
  tipoBadge: {
    backgroundColor: "#D7EBDD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tipoText: { fontSize: 12, fontWeight: "800", color: "#5A9F78" },

  titulo: { fontSize: 18, fontWeight: "800", color: "#111", marginTop: 4 },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locText: { fontSize: 13, color: "#5b5b5b", fontWeight: "600" },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 16,
  },

  secaoTitulo: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
    marginBottom: 8,
  },
  descricao: { fontSize: 14, color: "#5b5b5b", lineHeight: 22 },

  // Mapa
  mapaWrap: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E5E5E5",
  },

  // Vendedor
  vendedorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  vendedorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#D7EBDD",
    alignItems: "center",
    justifyContent: "center",
  },
  vendedorAvatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#5A9F78",
  },
  vendedorNome: { fontSize: 15, fontWeight: "800", color: "#111" },
  vendedorSub: {
    fontSize: 12,
    color: "#5b5b5b",
    opacity: 0.7,
    marginTop: 2,
  },

  // Botões
  contatoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5A9F78",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  contatoBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  editarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#5A9F78",
    backgroundColor: "#fff",
  },
  editarBtnText: { color: "#5A9F78", fontWeight: "900", fontSize: 15 },
});