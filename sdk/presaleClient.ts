import { AnchorProvider, BN, Program, utils, web3 } from "@coral-xyz/anchor";
import type { TdlPresale } from "./types/tdl_presale";
import idl from "./idl/tdl_presale.json";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

function presaleProgramId(): PublicKey {
  const address =
    (idl as any)?.metadata?.address ?? (idl as any)?.address ?? "";
  return new PublicKey(address);
}

export interface PresaleConfigInput {
  priceNumerator: BN | number;
  priceDenominator: BN | number;
  softCap: BN | number;
  hardCap: BN | number;
  walletMin: BN | number;
  walletMax: BN | number;
  startTs: BN | number;
  endTs: BN | number;
  tgeBps: number;
  cliffSeconds: BN | number;
  vestingSeconds: BN | number;
  whitelistEnabled: boolean;
  whitelistRoot: Uint8Array | number[];
  buyCooldownSeconds: BN | number;
  guardAuthority?: PublicKey | null;
}

export interface BuyArgsInput {
  payAmount: BN | number;
  minExpectedTdl: BN | number;
  merkleProof?: (Uint8Array | number[])[];
}

export class TdlPresaleClient {
  readonly provider: AnchorProvider;
  readonly program: Program;

  constructor(provider: AnchorProvider, programId?: PublicKey) {
    this.provider = provider;
    this.program = new (Program as any)(
      idl as unknown as TdlPresale,
      programId ?? presaleProgramId(),
      provider
    ) as Program;
  }

  static deriveState(tdlMint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("state"), tdlMint.toBuffer()],
      presaleProgramId()
    )[0];
  }

  static deriveVaultAuthority(state: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), state.toBuffer()],
      presaleProgramId()
    )[0];
  }

  static deriveWhitelist(state: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), state.toBuffer()],
      presaleProgramId()
    )[0];
  }

  static deriveBuyerPosition(state: PublicKey, buyer: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position"), state.toBuffer(), buyer.toBuffer()],
      presaleProgramId()
    )[0];
  }

  async initializeToken(params: {
    admin: web3.Signer;
    tdlMint: PublicKey;
    payMint: PublicKey;
    config: PresaleConfigInput;
  }): Promise<string> {
    const { admin, tdlMint, payMint, config } = params;
    const state = TdlPresaleClient.deriveState(tdlMint);
    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
    const tdlVault = deriveAta(tdlMint, vaultAuthority);
    const payVault = deriveAta(payMint, vaultAuthority);
    const whitelist = TdlPresaleClient.deriveWhitelist(state);

    const methods = this.program.methods as any;
    return methods
      .initializeToken(this.serializeConfig(config))
      .accounts({
        admin: admin.publicKey,
        tdl_mint: tdlMint,
        pay_mint: payMint,
        state,
        vault_authority: vaultAuthority,
        tdl_vault: tdlVault,
        pay_vault: payVault,
        whitelist,
        system_program: web3.SystemProgram.programId,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: utils.token.ASSOCIATED_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();
  }

  async buy(params: {
    buyer: web3.Signer | AnchorWallet;
    state: PublicKey;
    payMint: PublicKey;
    args: BuyArgsInput;
    guard?: (web3.Signer | AnchorWallet) | null;
  }): Promise<string> {
    const { buyer, state, payMint, args, guard } = params;
    const position = TdlPresaleClient.deriveBuyerPosition(
      state,
      buyer.publicKey
    );
    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
    const whitelist = TdlPresaleClient.deriveWhitelist(state);
    const stateAccount = await this.fetchState(state);
    const tdlVault = stateAccount.tdlVault;
    const payVault = deriveAta(payMint, vaultAuthority);
    const buyerPay = deriveAta(payMint, buyer.publicKey);

    let builder = (this.program.methods as any)
      .buy(this.serializeBuyArgs(args))
      .accounts({
        buyer: buyer.publicKey,
        state,
        whitelist,
        position,
        vault_authority: vaultAuthority,
        tdl_vault: tdlVault,
        buyer_pay_account: buyerPay,
        pay_vault: payVault,
        token_program: TOKEN_PROGRAM_ID,
        system_program: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        guard_authority: guard ? guard.publicKey : null,
      });

    const signers: web3.Signer[] = [];
    if (isKeypair(buyer)) signers.push(buyer);
    if (guard && isKeypair(guard)) signers.push(guard);
    if (signers.length > 0) {
      builder = builder.signers(signers);
    }

    return builder.rpc();
  }

  async claim(params: {
    buyer: web3.Signer | AnchorWallet;
    state: PublicKey;
    tdlMint: PublicKey;
  }): Promise<string> {
    const { buyer, state, tdlMint } = params;
    const position = TdlPresaleClient.deriveBuyerPosition(
      state,
      buyer.publicKey
    );
    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
    const stateAccount = await this.fetchState(state);
    const tdlVault = stateAccount.tdlVault;
    const buyerAta = deriveAta(tdlMint, buyer.publicKey);

    let builder = (this.program.methods as any)
      .claim()
      .accounts({
        buyer: buyer.publicKey,
        state,
        position,
        vault_authority: vaultAuthority,
        tdl_vault: tdlVault,
        buyer_tdl_account: buyerAta,
        token_program: TOKEN_PROGRAM_ID,
      });

    if (isKeypair(buyer)) {
      builder = builder.signers([buyer]);
    }

    return builder.rpc();
  }

  async refund(params: {
    buyer: web3.Signer | AnchorWallet;
    state: PublicKey;
    payMint: PublicKey;
  }): Promise<string> {
    const { buyer, state, payMint } = params;
    const position = TdlPresaleClient.deriveBuyerPosition(
      state,
      buyer.publicKey
    );
    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
    const payVault = deriveAta(payMint, vaultAuthority);
    const buyerPay = deriveAta(payMint, buyer.publicKey);

    let builder = (this.program.methods as any)
      .refund()
      .accounts({
        buyer: buyer.publicKey,
        state,
        position,
        vault_authority: vaultAuthority,
        buyer_pay_account: buyerPay,
        pay_vault: payVault,
        token_program: TOKEN_PROGRAM_ID,
        system_program: web3.SystemProgram.programId,
      });

    if (isKeypair(buyer)) {
      builder = builder.signers([buyer]);
    }

    return builder.rpc();
  }

  async fetchState(state: PublicKey) {
    return (this.program.account as any).presaleState.fetch(state);
  }

  serializeConfig(input: PresaleConfigInput) {
    return {
      price_numerator: new BN(input.priceNumerator),
      price_denominator: new BN(input.priceDenominator),
      soft_cap: new BN(input.softCap),
      hard_cap: new BN(input.hardCap),
      wallet_min: new BN(input.walletMin),
      wallet_max: new BN(input.walletMax),
      start_ts: new BN(input.startTs),
      end_ts: new BN(input.endTs),
      tge_bps: input.tgeBps,
      cliff_seconds: new BN(input.cliffSeconds),
      vesting_seconds: new BN(input.vestingSeconds),
      whitelist_enabled: input.whitelistEnabled,
      whitelist_root: Array.from(input.whitelistRoot),
      buy_cooldown_seconds: new BN(input.buyCooldownSeconds),
      guard_authority: input.guardAuthority ?? null,
    };
  }

  serializeBuyArgs(input: BuyArgsInput) {
    return {
      pay_amount: new BN(input.payAmount),
      min_expected_tdl: new BN(input.minExpectedTdl),
      merkle_proof: input.merkleProof?.map((buf) => Array.from(buf)) ?? [],
    };
  }
}


function deriveAta(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    utils.token.ASSOCIATED_PROGRAM_ID
  );
  return ata;
}

function isKeypair(value: any): value is web3.Keypair {
  return value instanceof web3.Keypair;
}
