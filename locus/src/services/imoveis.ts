import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { geohashForLocation } from "geofire-common";
import { db } from "@/src/firebase";

export type TipoImovel = "casa" | "apartamento" | "terreno";
export type StatusImovel = "rascunho" | "publicado" | "arquivado";

export type CriarImovelInput = {
  idDono: string;
  titulo: string;
  descricao?: string;
  precoCentavos: number;
  moeda: "BRL";
  tipo: TipoImovel;
  cidade: string;
  uf: string;
  idEstado?: number | null;
  idMunicipio?: number | null;
  status: StatusImovel;
  localizacao: {
    latitude: number;
    longitude: number;
    geohash: string;
  };
};

export async function criarImovel(params: {
  idDono: string;
  titulo: string;
  descricao?: string;
  precoCentavos: number;
  tipo: TipoImovel;
  cidade: string;
  uf: string;
  idEstado?: number | null;
  idMunicipio?: number | null;
  status: "rascunho" | "publicado";
  latitude: number;
  longitude: number;
}) {
  const geohash = geohashForLocation([params.latitude, params.longitude]);

  const payload: CriarImovelInput = {
    idDono: params.idDono,
    titulo: params.titulo.trim(),
    descricao: params.descricao?.trim() || undefined,
    precoCentavos: params.precoCentavos,
    moeda: "BRL",
    tipo: params.tipo,
    cidade: params.cidade.trim(),
    uf: params.uf.trim().toUpperCase(),
    idEstado: params.idEstado ?? null,
    idMunicipio: params.idMunicipio ?? null,
    status: params.status,
    localizacao: {
      latitude: params.latitude,
      longitude: params.longitude,
      geohash,
    },
  };

  const ref = await addDoc(collection(db, "imoveis"), {
    ...payload,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
    criadoEm: serverTimestamp() as any,
    atualizadoEm: serverTimestamp() as any,
  } as any);

  return ref.id;
}

export async function atualizarStatusImovel(
  imovelId: string,
  novoStatus: StatusImovel
) {
  const ref = doc(db, "imoveis", imovelId);
  await updateDoc(ref, {
    status: novoStatus,
    atualizadoEm: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function editarImovel(
  imovelId: string,
  params: {
    titulo: string;
    descricao?: string;
    precoCentavos: number;
    tipo: TipoImovel;
    cidade: string;
    uf: string;
    idEstado?: number | null;
    idMunicipio?: number | null;
    status: StatusImovel;
    latitude: number;
    longitude: number;
  }
) {
  const geohash = geohashForLocation([params.latitude, params.longitude]);
  const ref = doc(db, "imoveis", imovelId);

  await updateDoc(ref, {
    titulo: params.titulo.trim(),
    descricao: params.descricao?.trim() || null,
    precoCentavos: params.precoCentavos,
    tipo: params.tipo,
    cidade: params.cidade.trim(),
    uf: params.uf.trim().toUpperCase(),
    idEstado: params.idEstado ?? null,
    idMunicipio: params.idMunicipio ?? null,
    status: params.status,
    localizacao: {
      latitude: params.latitude,
      longitude: params.longitude,
      geohash,
    },
    atualizadoEm: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deletarImovel(imovelId: string) {
  const ref = doc(db, "imoveis", imovelId);
  await deleteDoc(ref);
}