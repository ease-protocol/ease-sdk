import { decode } from "cbor2";
import { AttestationDocument } from "./type";

export function parseAttestationDocument(attestationDocBase64: string) {
    const rawBytes = base64ToBytes(attestationDocBase64);
    const coseSign1Data = decode(rawBytes) as [
        Uint8Array,
        {},
        Uint8Array,
        Uint8Array
    ];
    const payload = decode(coseSign1Data[2]) as Record<string, any>;

    const pcrs = Object.entries(
        Object.fromEntries(payload.pcrs as Map<number, Uint8Array>)
    ).reduce((acc, [k, v]) => {
        acc[k] = bytesToHex(v);
        return acc;
    }, {} as Record<string, string>);

    const doc: AttestationDocument = {
        module_id: payload.module_id as string,
        digest: payload.digest as string,
        timestamp: payload.timestamp as number,
        pcrs,
        cabundle: (payload.cabundle as Uint8Array[]).map(bytesToBase64),
        certificate: bytesToBase64(payload.certificate as Uint8Array),
        public_key: bytesToBase64(payload.public_key as Uint8Array),
        nonce: new TextDecoder().decode(payload.nonce as Uint8Array),
    };
    return doc;
}

function base64ToBytes(base64String: string) {
    return Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
    return btoa(String.fromCharCode(...bytes));
}

function bytesToHex(bytes: Uint8Array) {
    return [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
}