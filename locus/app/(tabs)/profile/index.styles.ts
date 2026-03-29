import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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

  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 8 },

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