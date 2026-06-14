// Payload canônico — Instrumento Unificado de Avaliação Biopsicossocial
// Resolução CNJ nº 630/2025.

import type {
  Area, AnexoId, Qualifier, Identificacao,
  AvaliacaoSocialExtra, AvaliacaoMedicaExtra,
} from './types';

export const SCHEMA_VERSION = 'cnj-bpc-biopsicossocial-630-2025-v1' as const;

export interface CanonicalPayload {
  schema: typeof SCHEMA_VERSION;
  area: Area;
  anexo: AnexoId;
  ident: Identificacao;
  domainQualifiers: Record<string, Qualifier>;
  unitScores: Record<string, Qualifier>;
  extra: AvaliacaoSocialExtra | AvaliacaoMedicaExtra;
  calculatedAt: string;
  hash?: string;
}

// Serialização determinística (chaves ordenadas, sem campo hash).
function deterministicJson(payload: CanonicalPayload): string {
  const { hash: _h, ...rest } = payload;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

export async function computeHash(payload: CanonicalPayload): Promise<string> {
  const text = deterministicJson(payload);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function encodePayload(payload: CanonicalPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodePayload(b64: string): CanonicalPayload {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(b64)))) as CanonicalPayload;
  } catch {
    throw new Error('Payload inválido: não foi possível decodificar o bloco de dados.');
  }
}

export async function buildAndHashPayload(
  area: Area,
  anexo: AnexoId,
  ident: Identificacao,
  domainQualifiers: Record<string, Qualifier>,
  unitScores: Record<string, Qualifier>,
  extra: AvaliacaoSocialExtra | AvaliacaoMedicaExtra,
): Promise<CanonicalPayload> {
  const payload: CanonicalPayload = {
    schema: SCHEMA_VERSION,
    area,
    anexo,
    ident,
    domainQualifiers,
    unitScores,
    extra,
    calculatedAt: new Date().toISOString(),
  };
  payload.hash = await computeHash(payload);
  return payload;
}

export async function validatePayloadHash(payload: CanonicalPayload): Promise<boolean> {
  const expected = await computeHash(payload);
  return expected === payload.hash;
}
