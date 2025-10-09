import { keccak_256 } from "@noble/hashes/sha3";
import { PublicKey } from "@solana/web3.js";

export type WhitelistLeaf = {
  address: PublicKey;
};

export type MerkleArtifacts = {
  root: Uint8Array;
  proofs: Record<string, string[]>;
};

export function computeMerkleArtifacts(
  addresses: PublicKey[]
): MerkleArtifacts {
  if (addresses.length === 0) {
    return {
      root: new Uint8Array(32),
      proofs: {},
    };
  }

  const leaves = addresses.map((pubkey) => keccakLeaf(pubkey));
  const tree = buildTree(leaves);
  const root = tree[tree.length - 1][0];

  const proofs: Record<string, string[]> = {};
  addresses.forEach((pubkey, idx) => {
    proofs[pubkey.toBase58()] = buildProof(tree, idx).map((node) =>
      Buffer.from(node).toString("hex")
    );
  });

  return { root, proofs };
}

function keccakLeaf(pubkey: PublicKey): Uint8Array {
  return keccak_256(pubkey.toBuffer());
}

function buildTree(level: Uint8Array[]): Uint8Array[][] {
  const tree: Uint8Array[][] = [level];
  let current = level;

  while (current.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : current[i];
      next.push(hashPair(left, right));
    }
    tree.push(next);
    current = next;
  }

  return tree;
}

function hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
  const leftRight =
    Buffer.compare(Buffer.from(a), Buffer.from(b)) <= 0
      ? [a, b]
      : [b, a];
  return keccak_256(Buffer.concat(leftRight.map((buf) => Buffer.from(buf))));
}

function buildProof(tree: Uint8Array[][], index: number): Uint8Array[] {
  const proof: Uint8Array[] = [];
  let idx = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const nodes = tree[level];
    const isRightNode = idx % 2 === 1;
    const pairIndex = isRightNode ? idx - 1 : idx + 1;

    if (pairIndex < nodes.length) {
      proof.push(nodes[pairIndex]);
    } else {
      proof.push(nodes[idx]); // duplicate when odd number of nodes
    }

    idx = Math.floor(idx / 2);
  }

  return proof;
}
