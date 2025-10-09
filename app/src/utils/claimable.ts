import { BN } from "@coral-xyz/anchor";

export function computeClaimableAmount(
  state: any,
  position: any,
  now: number
): BN {
  if (!position || position.refunded) {
    return new BN(0);
  }

  const total = new BN(position.purchased);
  if (total.isZero()) return new BN(0);

  const tge = new BN(state.tgeBps ?? state.tge_bps ?? 0);
  const denom = new BN(10_000);

  let unlocked = total.mul(tge).div(denom);

  const endTs = toNumber(state.endTs ?? state.end_ts);
  const cliffSeconds = toNumber(state.cliffSeconds ?? state.cliff_seconds);
  const vestingSeconds = toNumber(state.vestingSeconds ?? state.vesting_seconds);

  if (vestingSeconds === 0) {
    unlocked = total;
  } else if (now > endTs + cliffSeconds) {
    const elapsed = Math.min(now - endTs - cliffSeconds, vestingSeconds);
    if (elapsed > 0) {
      const remaining = total.sub(unlocked);
      unlocked = unlocked.add(
        remaining.muln(elapsed).divn(vestingSeconds)
      );
    }
  }

  const claimed = new BN(position.claimed);
  const claimable = unlocked.sub(claimed);
  return claimable.gt(new BN(0)) ? claimable : new BN(0);
}

function toNumber(value: any): number {
  if (typeof value === "number") return value;
  if (value instanceof BN) return value.toNumber();
  if (value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  if (typeof value === "string") return Number(value);
  return 0;
}
