/**
 * IPFS/Arweave Storage Stub
 * Phase 1: Pinata API wrapper (requires PINATA_API_KEY env).
 * Phase 2: Arweave permanent storage via Bundlr/Turbo.
 * T-IECR-BC-003
 */

export interface StorageResult {
    provider: "ipfs" | "arweave";
    cid: string;
    url: string;
    size: number;
    uploadedAt: string;
    permanent: boolean;
}

const PINATA_BASE = "https://api.pinata.cloud";
const PINATA_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_API_SECRET;

export async function uploadToIPFS(params: {
    data: Buffer | string;
    filename: string;
    mimeType?: string;
    metadata?: Record<string, string>;
}): Promise<StorageResult> {
    if (!PINATA_KEY || !PINATA_SECRET) {
        // Stub response when keys not configured
        return {
            provider: "ipfs",
            cid: `stub-cid-${Date.now()}`,
            url: `ipfs://stub-cid-${Date.now()}`,
            size: typeof params.data === "string" ? params.data.length : params.data.length,
            uploadedAt: new Date().toISOString(),
            permanent: false,
        };
    }

    const formData = new FormData();
    const blob = new Blob(
        [typeof params.data === "string" ? params.data : new Uint8Array(params.data)],
        { type: params.mimeType ?? "application/octet-stream" }
    );
    formData.append("file", blob, params.filename);

    if (params.metadata) {
        formData.append(
            "pinataMetadata",
            JSON.stringify({ name: params.filename, keyvalues: params.metadata })
        );
    }

    const res = await fetch(`${PINATA_BASE}/pinning/pinFileToIPFS`, {
        method: "POST",
        headers: {
            pinata_api_key: PINATA_KEY,
            pinata_secret_api_key: PINATA_SECRET,
        },
        body: formData,
    });

    if (!res.ok) {
        throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`);
    }

    const json = await res.json() as { IpfsHash: string; PinSize: number; Timestamp: string };

    return {
        provider: "ipfs",
        cid: json.IpfsHash,
        url: `ipfs://${json.IpfsHash}`,
        size: json.PinSize,
        uploadedAt: json.Timestamp,
        permanent: false,
    };
}

export function ipfsGatewayUrl(cid: string, gateway = "https://ipfs.io/ipfs"): string {
    const cleanCid = cid.replace(/^ipfs:\/\//, "");
    return `${gateway}/${cleanCid}`;
}

// Phase 2 stub
export async function uploadToArweave(_params: {
    data: Buffer;
    contentType: string;
}): Promise<StorageResult> {
    throw new Error("Arweave upload is Phase 2 — requires Bundlr/Turbo integration");
}
