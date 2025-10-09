import { keccak_256 } from "@noble/hashes/sha3";
import { PublicKey } from "@solana/web3.js";

export function computeWhitelistRoot(addresses: PublicKey[]) {
  if (addresses.length === 0) {
    return {
      root: new Array(32).fill(0),
      proofs: {} as Record<string, number[][]>,
    };
  }

  const leaves = addresses.map((pk) => keccak_256(pk.toBuffer()));
  const tree: Uint8Array[][] = [leaves];

  while (tree[tree.length - 1].length > 1) {
    const current = tree[tree.length - 1];
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : current[i];
      next.push(hashPair(left, right));
    }
    tree.push(next);
  }

  const root = Array.from(tree[tree.length - 1][0]);
  const proofs: Record<string, number[][]> = {};
  addresses.forEach((pk, index) => {
    proofs[pk.toBase58()] = buildProof(tree, index);
  });

  return { root, proofs };
}

function hashPair(left: Uint8Array, right: Uint8Array) {
  const [a, b] =
    Buffer.compare(Buffer.from(left), Buffer.from(right)) <= 0 ? [left, right] : [right, left];
  return keccak_256(Buffer.concat([a, b]));
}

function buildProof(tree: Uint8Array[][], index: number) {
  const proof: number[][] = [];
  let idx = index;
  for (let level = 0; level < tree.length - 1; level++) {
    const nodes = tree[level];
    const pairIndex = idx ^ 1;
    const sibling = pairIndex < nodes.length ? nodes[pairIndex] : nodes[idx];
    proof.push(Array.from(sibling));
    idx = Math.floor(idx / 2);
  }
  return proof;
}
