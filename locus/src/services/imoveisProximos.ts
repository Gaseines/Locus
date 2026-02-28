import {
  collection,
  getDocs,
  orderBy,
  query,
  startAt,
  endAt,
  where,
} from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { db } from "@/src/firebase";

export type Imovel = {
  id: string;
  titulo?: string;
  precoCentavos?: number;
  cidade?: string;
  uf?: string;
  status?: "rascunho" | "publicado" | "arquivado";
  localizacao?: {
    latitude: number;
    longitude: number;
    geohash: string;
  };
  idDono?: string;
};

export async function buscarImoveisPorRaio(params: {
  centro: { latitude: number; longitude: number };
  raioKm: number;
}): Promise<Imovel[]> {
  const { centro, raioKm } = params;

  const bounds = geohashQueryBounds(
    [centro.latitude, centro.longitude],
    raioKm * 1000
  );

  try {
    const snapshots = await Promise.all(
      bounds.map(async ([start, end]) => {
        const q = query(
          collection(db, "imoveis"),
          where("status", "==", "publicado"),            // ✅ necessário por causa da regra
          orderBy("localizacao.geohash"),               // necessário pro geohash range
          startAt(start),
          endAt(end)
        );

        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Imovel);
      })
    );

    // dedup (bounds podem repetir docs)
    const map = new Map<string, Imovel>();
    snapshots.flat().forEach((im) => map.set(im.id, im));

    // filtra por distância real (km)
    const filtrados = Array.from(map.values()).filter((im) => {
      const loc = im.localizacao;
      if (!loc?.latitude || !loc?.longitude) return false;

      const distKm = distanceBetween(
        [centro.latitude, centro.longitude],
        [loc.latitude, loc.longitude]
      );

      return distKm <= raioKm;
    });

    return filtrados;
  } catch (e: any) {
    console.log("ERRO buscarImoveisPorRaio:", e?.code, e?.message, e);
    throw e;
  }
}