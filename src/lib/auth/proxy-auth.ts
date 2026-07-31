// lib/auth/proxy-auth.ts
import {
    jwtDecrypt,
    EncryptJWT,
    base64url,
    calculateJwkThumbprint,
} from "jose";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

// Better Auth's encryption constants
const ENCRYPTION_INFO = new TextEncoder().encode(
    "BetterAuth.js Generated Encryption Key",
);

async function deriveEncryptionKey(secret: string, salt: string) {
    return hkdf(
        sha256,
        new TextEncoder().encode(secret),
        new TextEncoder().encode(salt),
        ENCRYPTION_INFO,
        64,
    );
}

export async function decodeAccountCookie(cookieValue: string, secret: string) {
    const encryptionSecret = await deriveEncryptionKey(
        secret,
        "better-auth-account",
    );
    const { payload } = await jwtDecrypt(
        cookieValue,
        async ({ kid }) => {
            if (kid === undefined) return encryptionSecret;
            const thumbprint = await calculateJwkThumbprint(
                { kty: "oct", k: base64url.encode(encryptionSecret) },
                "sha256",
            );
            if (kid === thumbprint) return encryptionSecret;
            throw new Error("no matching decryption secret");
        },
        {
            clockTolerance: 15,
            keyManagementAlgorithms: ["dir"],
            contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"],
        },
    );
    return payload;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function encodeAccountCookie(data: any, secret: string) {
    const encryptionSecret = await deriveEncryptionKey(
        secret,
        "better-auth-account",
    );
    const thumbprint = await calculateJwkThumbprint(
        { kty: "oct", k: base64url.encode(encryptionSecret) },
        "sha256",
    );
    return await new EncryptJWT(data)
        .setProtectedHeader({
            alg: "dir",
            enc: "A256CBC-HS512",
            kid: thumbprint,
        })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 900)
        .setJti(crypto.randomUUID())
        .encrypt(encryptionSecret);
}
