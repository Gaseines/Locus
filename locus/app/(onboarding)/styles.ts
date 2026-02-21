import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, gap: 16 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { opacity: 0.7 },

  header: { gap: 8, marginTop: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7, lineHeight: 20 },

  cards: { gap: 12, marginTop: 10 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
  },
  cardActive: {
    borderColor: "#5A9F78",
    backgroundColor: "#D7EBDD",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardDesc: { fontSize: 13, opacity: 0.75, lineHeight: 18 },

  hint: { marginTop: 6, opacity: 0.7 },

  form: { gap: 10, marginTop: 6 },
  label: { fontSize: 13, fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: "#f7f7f7",
  },

  selectInput: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectText: { fontSize: 15 },
  selectPlaceholder: { fontSize: 15, opacity: 0.6 },

  sugestoesBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
    backgroundColor: "#fff",
  },
  sugestaoItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  okText: {
    marginTop: 8,
    color: "#2e7d32",
    fontWeight: "700",
  },

  error: { color: "#d11", marginTop: 6 },

  footerRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#5A9F78",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  secondaryText: { fontWeight: "700" },

  linkBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  linkText: { color: "#5A9F78", fontWeight: "700" },

  rowLoading: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  rowLoadingText: { opacity: 0.7 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalSearch: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  estadoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  separator: { height: 1, backgroundColor: "#f0f0f0" },
});