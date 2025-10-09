import * as anchor from "@coral-xyz/anchor";
import { BN, web3 } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { keccak_256 } from "@noble/hashes/sha3";
import { TdlPresaleClient, PresaleConfigInput } from "../../sdk/presaleClient";
import idl from "../../sdk/idl/tdl_presale.json";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const adminWallet = provider.wallet as anchor.Wallet;
const PROGRAM_ID = new web3.PublicKey(
  (idl as any)?.metadata?.address ?? (idl as any)?.address
);
let client: TdlPresaleClient;

describe("tdl_presale program", () => {

  before(() => {
    client = new TdlPresaleClient(provider, PROGRAM_ID);
  });

  it("enforces wallet minimum and maximum caps", async () => {
    const now = currentTimestamp();
    const setup = await setupPresale({
      priceNumerator: new BN(1),
      priceDenominator: new BN(1),
      walletMin: new BN(150_000),
      walletMax: new BN(250_000),
      softCap: new BN(1_000_000),
      hardCap: new BN(2_000_000),
      startTs: new BN(now - 60),
      endTs: new BN(now + 300),
    });

    const buyer = await createBuyer(setup.payMint, 1_000_000);

    await expect(
      client.buy({
        buyer: buyer.signer,
        state: setup.state,
        payMint: setup.payMint,
        args: {
          payAmount: new BN(100_000),
          minExpectedTdl: new BN(100_000),
        },
      })
    ).to.be.rejectedWith(/WalletMinNotReached/);

    await client.buy({
      buyer: buyer.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: {
        payAmount: new BN(200_000),
        minExpectedTdl: new BN(200_000),
      },
    });

    await expect(
      client.buy({
        buyer: buyer.signer,
        state: setup.state,
        payMint: setup.payMint,
        args: {
          payAmount: new BN(100_000),
          minExpectedTdl: new BN(100_000),
        },
      })
    ).to.be.rejectedWith(/WalletCapExceeded/);
  });

  it("halts contributions once the hard cap is reached", async () => {
    const now = currentTimestamp();
    const setup = await setupPresale({
      priceNumerator: new BN(1),
      priceDenominator: new BN(1),
      walletMin: new BN(0),
      walletMax: new BN(250_000),
      softCap: new BN(200_000),
      hardCap: new BN(300_000),
      startTs: new BN(now - 60),
      endTs: new BN(now + 300),
    });

    const buyerA = await createBuyer(setup.payMint, 500_000);
    const buyerB = await createBuyer(setup.payMint, 500_000);

    await client.buy({
      buyer: buyerA.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: { payAmount: new BN(150_000), minExpectedTdl: new BN(150_000) },
    });

    await client.buy({
      buyer: buyerB.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: { payAmount: new BN(150_000), minExpectedTdl: new BN(150_000) },
    });

    await expect(
      client.buy({
        buyer: buyerA.signer,
        state: setup.state,
        payMint: setup.payMint,
        args: { payAmount: new BN(50_000), minExpectedTdl: new BN(50_000) },
      })
    ).to.be.rejectedWith(/HardCapExceeded/);
  });

  it("enforces whitelist membership when enabled", async () => {
    const now = currentTimestamp();
    const whitelisted = web3.Keypair.generate();
    const nonWhitelisted = web3.Keypair.generate();
    const { root, proofs } = computeMerkle([whitelisted.publicKey]);

    const setup = await setupPresale({
      priceNumerator: new BN(1),
      priceDenominator: new BN(1),
      walletMin: new BN(0),
      walletMax: new BN(1_000_000),
      softCap: new BN(1_000_000),
      hardCap: new BN(2_000_000),
      startTs: new BN(now - 60),
      endTs: new BN(now + 300),
      whitelistEnabled: true,
      whitelistRoot: root,
    });

    const whitelistedBuyer = await createBuyer(setup.payMint, 500_000, {
      keypair: whitelisted,
    });
    const otherBuyer = await createBuyer(setup.payMint, 500_000, {
      keypair: nonWhitelisted,
    });

    await client.buy({
      buyer: whitelistedBuyer.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: {
        payAmount: new BN(200_000),
        minExpectedTdl: new BN(200_000),
        merkleProof: proofs[whitelisted.publicKey.toBase58()],
      },
    });

    await expect(
      client.buy({
        buyer: otherBuyer.signer,
        state: setup.state,
        payMint: setup.payMint,
        args: {
          payAmount: new BN(100_000),
          minExpectedTdl: new BN(100_000),
          merkleProof: [],
        },
      })
    ).to.be.rejectedWith(/NotWhitelisted/);
  });

  it("allows refunds when soft cap is not met", async () => {
    const now = currentTimestamp();
    const setup = await setupPresale({
      priceNumerator: new BN(1),
      priceDenominator: new BN(1),
      walletMin: new BN(0),
      walletMax: new BN(1_000_000),
      softCap: new BN(1_000_000),
      hardCap: new BN(2_000_000),
      startTs: new BN(now - 60),
      endTs: new BN(now + 6),
    });

    const buyer = await createBuyer(setup.payMint, 500_000);

    await client.buy({
      buyer: buyer.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: {
        payAmount: new BN(200_000),
        minExpectedTdl: new BN(200_000),
      },
    });

    await sleep(7_000);

    const buyerAccountBefore = await provider.connection.getTokenAccountBalance(
      buyer.payAta
    );

    await client.refund({
      buyer: buyer.signer,
      state: setup.state,
      payMint: setup.payMint,
    });

    const buyerAccountAfter = await provider.connection.getTokenAccountBalance(
      buyer.payAta
    );

    expect(
      BigInt(buyerAccountAfter.value.amount) -
        BigInt(buyerAccountBefore.value.amount)
    ).to.equal(200000n);

    const position = await (client.program.account as any).buyerPosition.fetch(
      setup.positionPda(buyer.signer.publicKey)
    );
    expect(position.refunded).to.be.true;
  });

  it("releases tokens according to vesting schedule", async () => {
    const now = currentTimestamp();
    const setup = await setupPresale({
      priceNumerator: new BN(1),
      priceDenominator: new BN(1),
      walletMin: new BN(0),
      walletMax: new BN(2_000_000),
      softCap: new BN(100_000),
      hardCap: new BN(2_000_000),
      startTs: new BN(now - 60),
      endTs: new BN(now + 2),
      tgeBps: 200,
      cliffSeconds: new BN(2),
      vestingSeconds: new BN(6),
    });

    const buyer = await createBuyer(setup.payMint, 500_000);

    await client.buy({
      buyer: buyer.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: {
        payAmount: new BN(300_000),
        minExpectedTdl: new BN(300_000),
      },
    });

    const buyerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      adminWallet.payer,
      setup.tdlMint,
      buyer.signer.publicKey
    );

    await sleep(3_500); // after end, before cliff + vesting

    await client.claim({
      buyer: buyer.signer,
      state: setup.state,
      tdlMint: setup.tdlMint,
    });

    const afterTge = await provider.connection.getTokenAccountBalance(
      buyerToken.address
    );
    expect(Number(afterTge.value.amount)).to.equal(60_000); // 20% of 300k

    await sleep(7_000); // surpass full vesting

    await client.claim({
      buyer: buyer.signer,
      state: setup.state,
      tdlMint: setup.tdlMint,
    });

    const finalBalance = await provider.connection.getTokenAccountBalance(
      buyerToken.address
    );
    expect(Number(finalBalance.value.amount)).to.equal(300_000);
  });

  it("respects pause and cooldown guard controls", async () => {
    const now = currentTimestamp();
    const setup = await setupPresale({
      priceNumerator: new BN(1),
      priceDenominator: new BN(1),
      walletMin: new BN(0),
      walletMax: new BN(1_000_000),
      softCap: new BN(2_000_000),
      hardCap: new BN(4_000_000),
      startTs: new BN(now - 60),
      endTs: new BN(now + 600),
      buyCooldownSeconds: new BN(4),
    });

    const buyer = await createBuyer(setup.payMint, 1_000_000);
    const secondBuyer = await createBuyer(setup.payMint, 1_000_000);

    await client.buy({
      buyer: buyer.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: {
        payAmount: new BN(200_000),
        minExpectedTdl: new BN(200_000),
      },
    });

    await expect(
      client.buy({
        buyer: buyer.signer,
        state: setup.state,
        payMint: setup.payMint,
        args: {
          payAmount: new BN(50_000),
          minExpectedTdl: new BN(50_000),
        },
      })
    ).to.be.rejectedWith(/CooldownActive/);

    await (client.program.methods as any)
      .pause()
      .accounts({
        admin: adminWallet.publicKey,
        state: setup.state,
      })
      .rpc();

    await expect(
      client.buy({
        buyer: secondBuyer.signer,
        state: setup.state,
        payMint: setup.payMint,
        args: {
          payAmount: new BN(100_000),
          minExpectedTdl: new BN(100_000),
        },
      })
    ).to.be.rejectedWith(/SalePaused/);

    await (client.program.methods as any)
      .unpause()
      .accounts({
        admin: adminWallet.publicKey,
        state: setup.state,
      })
      .rpc();

    await sleep(4_500);

    await client.buy({
      buyer: secondBuyer.signer,
      state: setup.state,
      payMint: setup.payMint,
      args: {
        payAmount: new BN(100_000),
        minExpectedTdl: new BN(100_000),
      },
    });
  });
});

async function setupPresale(
  overrides: Partial<PresaleConfigInput> = {}
) {
  const tdlMint = await createMint(
    provider.connection,
    adminWallet.payer,
    adminWallet.publicKey,
    null,
    9
  );
  const payMint = await createMint(
    provider.connection,
    adminWallet.payer,
    adminWallet.publicKey,
    null,
    6
  );

  const config = mergeConfig(defaultConfig(), overrides);
  const state = TdlPresaleClient.deriveState(tdlMint);
  const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
  const whitelist = TdlPresaleClient.deriveWhitelist(state);

  await client.initializeToken({
    admin: adminWallet.payer,
    tdlMint,
    payMint,
    config,
  });

  const stateAccount = await client.fetchState(state);

  await mintTo(
    provider.connection,
    adminWallet.payer,
    tdlMint,
    stateAccount.tdlVault,
    adminWallet.payer,
    BigInt(1_000_000_000_000)
  );

  return {
    state,
    tdlMint,
    payMint,
    tdlVault: stateAccount.tdlVault,
    payVault: stateAccount.payVault,
    vaultAuthority,
    whitelist,
    positionPda: (buyer: web3.PublicKey) =>
      TdlPresaleClient.deriveBuyerPosition(state, buyer),
  };
}

async function createBuyer(
  payMint: web3.PublicKey,
  payAmount: number,
  options: { keypair?: web3.Keypair } = {}
) {
  const keypair = options.keypair ?? web3.Keypair.generate();

  await requestAirdrop(keypair.publicKey, web3.LAMPORTS_PER_SOL);

  const payAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    adminWallet.payer,
    payMint,
    keypair.publicKey
  );

  await mintTo(
    provider.connection,
    adminWallet.payer,
    payMint,
    payAta.address,
    adminWallet.payer,
    BigInt(payAmount)
  );

  return {
    signer: keypair,
    payAta: payAta.address,
  };
}

function defaultConfig(): PresaleConfigInput {
  const now = currentTimestamp();
  return {
    priceNumerator: new BN(1),
    priceDenominator: new BN(1),
    softCap: new BN(1_000_000),
    hardCap: new BN(2_000_000),
    walletMin: new BN(0),
    walletMax: new BN(2_000_000),
    startTs: new BN(now - 60),
    endTs: new BN(now + 600),
    tgeBps: 0,
    cliffSeconds: new BN(0),
    vestingSeconds: new BN(0),
    whitelistEnabled: false,
    whitelistRoot: new Array(32).fill(0),
    buyCooldownSeconds: new BN(0),
    guardAuthority: null,
  };
}

function mergeConfig(
  base: PresaleConfigInput,
  overrides: Partial<PresaleConfigInput>
): PresaleConfigInput {
  return {
    ...base,
    ...overrides,
    whitelistRoot:
      overrides.whitelistRoot ?? (base.whitelistRoot as number[]),
    guardAuthority:
      overrides.guardAuthority === undefined
        ? base.guardAuthority
        : overrides.guardAuthority,
  };
}

function currentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestAirdrop(pubkey: web3.PublicKey, lamports: number) {
  const signature = await provider.connection.requestAirdrop(pubkey, lamports);
  await provider.connection.confirmTransaction(signature);
}

function computeMerkle(addresses: web3.PublicKey[]) {
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

function hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
  const [left, right] =
    Buffer.compare(Buffer.from(a), Buffer.from(b)) <= 0 ? [a, b] : [b, a];
  return keccak_256(Buffer.concat([left, right]));
}

function buildProof(tree: Uint8Array[][], index: number): number[][] {
  const proof: number[][] = [];
  let idx = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const nodes = tree[level];
    const pairIndex = idx ^ 1;
    const sibling =
      pairIndex < nodes.length ? nodes[pairIndex] : nodes[idx];
    proof.push(Array.from(sibling));
    idx = Math.floor(idx / 2);
  }

  return proof;
}
