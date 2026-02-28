import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const COLORS = {
  text: "#5b5b5b",
  primary: "#5a9f78",
  bg: "#f8f8f6",
  border: "#dadada",
};

function formatMoneyBRL(centavos: number) {
  const v = (centavos ?? 0) / 100;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0, // fica mais “tag”
    }).format(v);
  } catch {
    return `R$ ${Math.round(v)}`;
  }
}

function PriceMarkerBase({
  precoCentavos,
  selected = false,
}: {
  precoCentavos: number;
  selected?: boolean;
}) {
  const label = formatMoneyBRL(precoCentavos);

  return (
    <View style={styles.wrap}>
      <View style={[styles.bubble, selected && styles.bubbleSelected]}>
        <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* “setinha” */}
      <View style={[styles.arrow, selected && styles.arrowSelected]} />
    </View>
  );
}

export const PriceMarker = memo(PriceMarkerBase);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 50,
  },
  bubble: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,

    // sombra iOS
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },

    // sombra Android
    elevation: 3,
  },
  bubbleSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  text: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 8,
  },
  textSelected: {
    color: "#fff",
  },
  arrow: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.bg,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    transform: [{ rotate: "-45deg" }],
    marginTop: -5,
  },
  arrowSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});