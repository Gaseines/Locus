import { collection, getDocs, orderBy, query, startAt, endAt, where } from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { db } from "@/src/firebase";

export type Imovel = {
  id: string;
  titulo?: string;
  precoCentavos?: number;
  moeda?: string;
  cidade?: string;
  uf?: string;
  status?: "rascunho" | "publicado" | "arquivado";
  localizacao?: { latitude: number; longitude: number; geohash: string };
};

export async function buscarImoveisPorRaio(params: {
  centro: { latitude: number; longitude: number };
  raioKm: number;
}) {
  const { centro, raioKm } = params;

  const radiusInM = raioKm * 1000;
  const bounds = geohashQueryBounds([centro.latitude, centro.longitude], radiusInM);

  // ⚠️ pode pedir índice composto: status + localizacao.geohash (o console te dá o link)
  const promises = bounds.map(([start, end]) => {
    const q = query(
      collection(db, "imoveis"),
      where("status", "==", "publicado"),
      orderBy("localizacao.geohash"),
      startAt(start),
      endAt(end)
    );
    return getDocs(q);
  });

  const snaps = await Promise.all(promises);

  const map = new Map<string, Imovel>();

  for (const snap of snaps) {
    for (const d of snap.docs) {
      const data = d.data() as any;

      // filtra de verdade por distância (pq geohash bounds é aproximação)
      const loc = data?.localizacao;
      if (!loc?.latitude || !loc?.longitude) continue;

      const distKm = distanceBetween(
        [loc.latitude, loc.longitude],
        [centro.latitude, centro.longitude]
      );

      if (distKm <= raioKm) {
        map.set(d.id, { id: d.id, ...(data as any) });
      }
    }
  }

  return Array.from(map.values());
}