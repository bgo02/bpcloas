// Extração de payload de laudo PDF via pdf.js (local, sem CDN).
// Resolução CNJ nº 630/2025.

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { decodePayload, validatePayloadHash } from './schema';
import type { CanonicalPayload } from './schema';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MARKER_START = '===CNJ-BPC-DADOS-INICIO===';
const MARKER_END = '===CNJ-BPC-DADOS-FIM===';

export interface ExtractionResult {
  payload: CanonicalPayload;
  hashValid: boolean;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((it) => ('str' in it ? (it as { str: string }).str : '')).join(' '));
  }
  return texts.join('\n');
}

function extractBase64FromText(text: string): string {
  const start = text.indexOf(MARKER_START);
  const end = text.indexOf(MARKER_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Marcadores de dados CNJ não encontrados no PDF. Verifique se o arquivo é um laudo gerado por esta ferramenta.');
  }
  return text.slice(start + MARKER_START.length, end).replace(/\s/g, '');
}

export async function extractDataFromPdf(file: File): Promise<ExtractionResult> {
  const text = await extractTextFromPdf(file);
  const b64 = extractBase64FromText(text);
  const payload = decodePayload(b64);
  const hashValid = await validatePayloadHash(payload);
  return { payload, hashValid };
}

export async function extractDataFromJson(file: File): Promise<ExtractionResult> {
  const text = await file.text();
  let payload: CanonicalPayload;
  try {
    payload = JSON.parse(text) as CanonicalPayload;
  } catch {
    throw new Error('Arquivo JSON inválido.');
  }
  const hashValid = await validatePayloadHash(payload);
  return { payload, hashValid };
}
