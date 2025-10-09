use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use anchor_spl::{
    associated_token,
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("D4Yy14wWkvDBy9wq1PLwPaAvTd26tgQ8UMxq71sDjKhW");

const BPS_DENOMINATOR: u64 = 10_000;
const STATE_SEED: &[u8] = b"state";
const VAULT_AUTHORITY_SEED: &[u8] = b"vault";
const BUYER_POSITION_SEED: &[u8] = b"position";
const WHITELIST_SEED: &[u8] = b"whitelist";


#[derive(Accounts)]
pub struct InitializeTokenAccounts<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub tdl_mint: Account<'info, Mint>,
    pub pay_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        space = 8 + PresaleState::INIT_SPACE,
        seeds = [STATE_SEED, tdl_mint.key().as_ref()],
        bump
    )]
    pub state: Account<'info, PresaleState>,
    /// CHECK: Derived vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, state.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        associated_token::mint = tdl_mint,
        associated_token::authority = vault_authority
    )]
    pub tdl_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        associated_token::mint = pay_mint,
        associated_token::authority = vault_authority
    )]
    pub pay_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        space = 8 + Whitelist::INIT_SPACE,
        seeds = [WHITELIST_SEED, state.key().as_ref()],
        bump
    )]
    pub whitelist: Account<'info, Whitelist>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
    #[account(
        mut,
        seeds = [WHITELIST_SEED, state.key().as_ref()],
        bump = state.whitelist_bump
    )]
    pub whitelist: Account<'info, Whitelist>,
}

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
    #[account(
        mut,
        seeds = [WHITELIST_SEED, state.key().as_ref()],
        bump = state.whitelist_bump
    )]
    pub whitelist: Account<'info, Whitelist>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + BuyerPosition::INIT_SPACE,
        seeds = [BUYER_POSITION_SEED, state.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub position: Account<'info, BuyerPosition>,
    /// CHECK: PDA authority
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, state.key().as_ref()],
        bump = state.vault_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = tdl_vault.key() == state.tdl_vault
    )]
    pub tdl_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_pay_account: Option<Account<'info, TokenAccount>>,
    #[account(mut, constraint = pay_vault.key() == state.pay_vault)]
    pub pay_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub guard_authority: Option<Signer<'info>>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
    #[account(
        mut,
        seeds = [BUYER_POSITION_SEED, state.key().as_ref(), buyer.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, BuyerPosition>,
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, state.key().as_ref()],
        bump = state.vault_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub buyer_pay_account: Option<Account<'info, TokenAccount>>,
    #[account(mut, constraint = pay_vault.key() == state.pay_vault)]
    pub pay_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
    #[account(
        mut,
        seeds = [BUYER_POSITION_SEED, state.key().as_ref(), buyer.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, BuyerPosition>,
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, state.key().as_ref()],
        bump = state.vault_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = tdl_vault.key() == state.tdl_vault
    )]
    pub tdl_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_tdl_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, state.key().as_ref()],
        bump = state.vault_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, constraint = pay_vault.key() == state.pay_vault)]
    pub pay_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = destination.mint == state.pay_mint)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawUnallocated<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [STATE_SEED, state.tdl_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Account<'info, PresaleState>,
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, state.key().as_ref()],
        bump = state.vault_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = tdl_vault.key() == state.tdl_vault
    )]
    pub tdl_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

fn apply_config(
    state: &mut Account<PresaleState>,
    whitelist: &mut Account<Whitelist>,
    config: PresaleConfig,
) -> Result<()> {
    state.price_numerator = config.price_numerator;
    state.price_denominator = config.price_denominator;
    state.soft_cap = config.soft_cap;
    state.hard_cap = config.hard_cap;
    state.wallet_min = config.wallet_min;
    state.wallet_max = config.wallet_max;
    state.start_ts = config.start_ts;
    state.end_ts = config.end_ts;
    state.tge_bps = config.tge_bps;
    state.cliff_seconds = config.cliff_seconds;
    state.vesting_seconds = config.vesting_seconds;
    state.buy_cooldown_seconds = config.buy_cooldown_seconds;
    state.whitelist_enabled = config.whitelist_enabled;
    state.guard_enabled = config.guard_authority.is_some();
    state.guard_authority = config.guard_authority.unwrap_or(Pubkey::default());

    whitelist.root = config.whitelist_root;
    whitelist.enabled = config.whitelist_enabled;
    whitelist.version = whitelist
        .version
        .checked_add(1)
        .ok_or(PresaleError::MathOverflow)?;
    whitelist.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

fn validate_config(config: &PresaleConfig) -> Result<()> {
    require!(
        config.price_numerator > 0,
        PresaleError::InvalidPriceConfiguration
    );
    require!(
        config.price_denominator > 0,
        PresaleError::InvalidPriceConfiguration
    );
    require!(
        config.hard_cap >= config.soft_cap,
        PresaleError::InvalidCapConfiguration
    );
    if config.wallet_max > 0 {
        require!(
            config.wallet_max >= config.wallet_min,
            PresaleError::InvalidCapConfiguration
        );
    }
    require!(
        config.start_ts < config.end_ts,
        PresaleError::InvalidSchedule
    );
    require!(
        config.tge_bps <= BPS_DENOMINATOR as u16,
        PresaleError::InvalidTgeBps
    );
    require!(config.cliff_seconds >= 0, PresaleError::InvalidSchedule);
    require!(config.vesting_seconds >= 0, PresaleError::InvalidSchedule);
    Ok(())
}

fn calculate_token_amount(amount: u64, num: u64, denom: u64) -> Result<u64> {
    let scaled = amount
        .checked_mul(denom)
        .ok_or(PresaleError::MathOverflow)?;
    let tokens = scaled
        .checked_div(num)
        .ok_or(PresaleError::InvalidPriceConfiguration)?;
    Ok(tokens)
}

fn calculate_claimable(state: &PresaleState, position: &BuyerPosition, now: i64) -> Result<u64> {
    let total = position.purchased;
    if total == 0 {
        return Ok(0);
    }

    let mut unlocked = total
        .checked_mul(state.tge_bps as u64)
        .ok_or(PresaleError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(PresaleError::MathOverflow)?;

    let cliff_end = state
        .end_ts
        .checked_add(state.cliff_seconds)
        .ok_or(PresaleError::MathOverflow)?;

    if state.vesting_seconds == 0 {
        unlocked = total;
    } else if now > cliff_end {
        let vesting_start = cliff_end;
        let elapsed = now.saturating_sub(vesting_start);
        let elapsed = elapsed.min(state.vesting_seconds);
        if elapsed > 0 {
            let remaining = total
                .checked_sub(unlocked)
                .ok_or(PresaleError::MathOverflow)?;
            let linear = remaining
                .checked_mul(elapsed as u64)
                .ok_or(PresaleError::MathOverflow)?
                .checked_div(state.vesting_seconds as u64)
                .ok_or(PresaleError::MathOverflow)?;
            unlocked = unlocked
                .checked_add(linear)
                .ok_or(PresaleError::MathOverflow)?;
        }
    }

    let claimable = unlocked
        .checked_sub(position.claimed)
        .ok_or(PresaleError::MathOverflow)?;
    Ok(claimable)
}

fn keccak_leaf(owner: &Pubkey) -> [u8; 32] {
    keccak::hashv(&[owner.as_ref()]).0
}

fn verify_merkle(root: &[u8; 32], leaf: &[u8; 32], proof: &[[u8; 32]]) -> bool {
    if root == &[0u8; 32] {
        return true;
    }
    let mut computed = *leaf;
    for node in proof {
        let (left, right) = if computed <= *node {
            (computed, *node)
        } else {
            (*node, computed)
        };
        computed = keccak::hashv(&[left.as_ref(), right.as_ref()]).0;
    }
    &computed == root
}


#[program]
pub mod tdl_presale {
    use super::*;

    pub fn initialize_token(
        ctx: Context<InitializeTokenAccounts>,
        config: PresaleConfig,
    ) -> Result<()> {
        let _ = associated_token::ID;

        let program_id = ctx.program_id;
        let mint_key = ctx.accounts.tdl_mint.key();
        let (expected_state, state_bump) =
            Pubkey::find_program_address(&[STATE_SEED, mint_key.as_ref()], program_id);
        require_keys_eq!(
            expected_state,
            ctx.accounts.state.key(),
            PresaleError::InvalidStateAccount
        );

        let state_key = expected_state;
        let (expected_vault, vault_bump) =
            Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED, state_key.as_ref()], program_id);
        require_keys_eq!(
            expected_vault,
            ctx.accounts.vault_authority.key(),
            PresaleError::InvalidVaultAccount
        );

        let (expected_whitelist, whitelist_bump) =
            Pubkey::find_program_address(&[WHITELIST_SEED, state_key.as_ref()], program_id);
        require_keys_eq!(
            expected_whitelist,
            ctx.accounts.whitelist.key(),
            PresaleError::InvalidWhitelistAccount
        );

        common_initialize(
            &mut ctx.accounts.state,
            &mut ctx.accounts.whitelist,
            InitializeParams {
                admin: ctx.accounts.admin.key(),
                tdl_mint: mint_key,
                pay_mint: Some(ctx.accounts.pay_mint.key()),
                tdl_vault: ctx.accounts.tdl_vault.key(),
                pay_vault: Some(ctx.accounts.pay_vault.key()),
                vault_bump,
                whitelist_bump,
                state_bump,
                pay_mint_decimals: ctx.accounts.pay_mint.decimals,
            },
            config,
        )?;

        Ok(())
    }

    pub fn set_config(ctx: Context<SetConfig>, config: PresaleConfig) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require_keys_eq!(
            state.admin,
            ctx.accounts.admin.key(),
            PresaleError::Unauthorized
        );

        let now = Clock::get()?.unix_timestamp;
        require!(
            now <= state.start_ts || state.is_paused,
            PresaleError::SaleInProgress
        );

        validate_config(&config)?;
        apply_config(state, &mut ctx.accounts.whitelist, config)?;

        emit!(ConfigUpdated {
            state: state.key(),
            admin: ctx.accounts.admin.key(),
            timestamp: now,
        });

        Ok(())
    }

    pub fn pause(ctx: Context<TogglePause>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require_keys_eq!(
            state.admin,
            ctx.accounts.admin.key(),
            PresaleError::Unauthorized
        );
        if state.is_paused {
            return Err(PresaleError::AlreadyPaused.into());
        }
        state.is_paused = true;
        emit!(SalePaused {
            state: state.key(),
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn unpause(ctx: Context<TogglePause>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require_keys_eq!(
            state.admin,
            ctx.accounts.admin.key(),
            PresaleError::Unauthorized
        );
        if !state.is_paused {
            return Err(PresaleError::NotPaused.into());
        }
        state.is_paused = false;
        emit!(SaleResumed {
            state: state.key(),
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, args: BuyArgs) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let whitelist = &ctx.accounts.whitelist;
        let position = &mut ctx.accounts.position;

        let buyer_key = ctx.accounts.buyer.key();
        let now = Clock::get()?.unix_timestamp;
        require!(!state.is_paused, PresaleError::SalePaused);
        require!(now >= state.start_ts, PresaleError::SaleNotStarted);
        require!(now <= state.end_ts, PresaleError::SaleEnded);

        if state.guard_enabled {
            let guard_authority = ctx
                .accounts
                .guard_authority
                .as_ref()
                .ok_or(PresaleError::MissingGuard)?;
            require_keys_eq!(
                guard_authority.key(),
                state.guard_authority,
                PresaleError::MissingGuard
            );
            require!(guard_authority.is_signer, PresaleError::MissingGuard);
        }

        if state.whitelist_enabled {
            require!(whitelist.enabled, PresaleError::WhitelistDisabled);
            let leaf = keccak_leaf(&buyer_key);
            require!(
                verify_merkle(&whitelist.root, &leaf, &args.merkle_proof),
                PresaleError::NotWhitelisted
            );
        }

        if position.is_uninitialized() {
            position.bump = ctx.bumps.position;
            position.state = state.key();
            position.buyer = buyer_key;
        }

        require!(!position.refunded, PresaleError::AlreadyRefunded);

        if state.buy_cooldown_seconds > 0 && position.last_purchase_ts > 0 {
            let cooldown_done = position
                .last_purchase_ts
                .checked_add(state.buy_cooldown_seconds)
                .ok_or(PresaleError::MathOverflow)?;
            require!(now >= cooldown_done, PresaleError::CooldownActive);
        }

        require!(args.pay_amount > 0, PresaleError::InvalidAmount);

        let new_total = position
            .contributed
            .checked_add(args.pay_amount)
            .ok_or(PresaleError::MathOverflow)?;

        if state.wallet_min > 0 && position.contributed == 0 {
            require!(
                args.pay_amount >= state.wallet_min,
                PresaleError::WalletMinNotReached
            );
        }
        if state.wallet_max > 0 {
            require!(
                new_total <= state.wallet_max,
                PresaleError::WalletCapExceeded
            );
        }

        let new_collected = state
            .collected
            .checked_add(args.pay_amount)
            .ok_or(PresaleError::MathOverflow)?;
        require!(
            new_collected <= state.hard_cap,
            PresaleError::HardCapExceeded
        );

        let tokens_purchased = calculate_token_amount(
            args.pay_amount,
            state.price_numerator,
            state.price_denominator,
        )?;
        require!(
            tokens_purchased > 0,
            PresaleError::InvalidPriceConfiguration
        );
        require!(
            tokens_purchased >= args.min_expected_tdl,
            PresaleError::SlippageExceeded
        );

        let buyer_token = ctx
            .accounts
            .buyer_pay_account
            .as_ref()
            .ok_or(PresaleError::MissingPayAccount)?;
        let pay_vault = &ctx.accounts.pay_vault;
        require_keys_eq!(buyer_token.owner, buyer_key, PresaleError::InvalidOwner);
        require_keys_eq!(
            buyer_token.mint,
            state.pay_mint,
            PresaleError::IncorrectPayMint
        );

        let cpi_accounts = Transfer {
            from: buyer_token.to_account_info(),
            to: pay_vault.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, args.pay_amount)?;

        let tdl_vault_amount = ctx.accounts.tdl_vault.amount;
        let pending_after = state
            .total_allocated
            .checked_add(tokens_purchased)
            .ok_or(PresaleError::MathOverflow)?;
        require!(
            tdl_vault_amount
                >= pending_after
                    .checked_sub(state.total_claimed)
                    .ok_or(PresaleError::MathOverflow)?,
            PresaleError::InsufficientVaultBalance
        );

        state.collected = new_collected;
        state.total_allocated = pending_after;
        position.contributed = new_total;
        position.purchased = position
            .purchased
            .checked_add(tokens_purchased)
            .ok_or(PresaleError::MathOverflow)?;
        position.last_purchase_ts = now;

        emit!(TokensPurchased {
            state: state.key(),
            buyer: buyer_key,
            pay_amount: args.pay_amount,
            tdl_amount: tokens_purchased,
            timestamp: now,
        });

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let position = &mut ctx.accounts.position;
        let now = Clock::get()?.unix_timestamp;

        require!(now > state.end_ts, PresaleError::SaleNotEnded);
        require!(state.collected < state.soft_cap, PresaleError::SoftCapMet);
        require!(!position.refunded, PresaleError::AlreadyRefunded);
        require!(position.contributed > 0, PresaleError::NothingToRefund);

        let amount = position.contributed;

        let pay_vault = &ctx.accounts.pay_vault;
        let buyer_token = ctx
            .accounts
            .buyer_pay_account
            .as_ref()
            .ok_or(PresaleError::MissingPayAccount)?;
        let state_key = state.key();
        let seeds = &[
            VAULT_AUTHORITY_SEED,
            state_key.as_ref(),
            &[state.vault_bump],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: pay_vault.to_account_info(),
            to: buyer_token.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, amount)?;

        state.total_allocated = state
            .total_allocated
            .checked_sub(position.purchased)
            .ok_or(PresaleError::MathOverflow)?;
        state.total_refunded = state
            .total_refunded
            .checked_add(amount)
            .ok_or(PresaleError::MathOverflow)?;

        position.refunded = true;
        position.contributed = 0;
        position.purchased = 0;
        position.claimed = 0;

        emit!(RefundIssued {
            state: state.key(),
            buyer: ctx.accounts.buyer.key(),
            pay_amount: amount,
            timestamp: now,
        });

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let position = &mut ctx.accounts.position;
        require!(!position.refunded, PresaleError::AlreadyRefunded);
        require!(position.purchased > 0, PresaleError::NothingToClaim);

        let now = Clock::get()?.unix_timestamp;
        require!(
            state.collected >= state.soft_cap,
            PresaleError::SoftCapNotMet
        );
        require!(now >= state.end_ts, PresaleError::SaleNotEnded);

        let claimable = calculate_claimable(state, position, now)?;
        require!(claimable > 0, PresaleError::NothingToClaim);

        let state_key = state.key();
        let seeds = &[
            VAULT_AUTHORITY_SEED,
            state_key.as_ref(),
            &[state.vault_bump],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.tdl_vault.to_account_info(),
            to: ctx.accounts.buyer_tdl_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );

        token::transfer(cpi_ctx, claimable)?;

        position.claimed = position
            .claimed
            .checked_add(claimable)
            .ok_or(PresaleError::MathOverflow)?;
        state.total_claimed = state
            .total_claimed
            .checked_add(claimable)
            .ok_or(PresaleError::MathOverflow)?;

        emit!(TokensClaimed {
            state: state.key(),
            buyer: ctx.accounts.buyer.key(),
            amount: claimable,
            timestamp: now,
        });

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require_keys_eq!(
            state.admin,
            ctx.accounts.admin.key(),
            PresaleError::Unauthorized
        );
        require!(amount > 0, PresaleError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        require!(now > state.end_ts, PresaleError::SaleNotEnded);
        require!(
            state.collected >= state.soft_cap,
            PresaleError::SoftCapNotMet
        );

        let withdrawable = state
            .collected
            .checked_sub(state.total_refunded)
            .and_then(|v| v.checked_sub(state.funds_withdrawn))
            .ok_or(PresaleError::MathOverflow)?;
        require!(
            amount <= withdrawable,
            PresaleError::InsufficientEscrowBalance
        );

        let pay_vault = &ctx.accounts.pay_vault;
        let destination = &ctx.accounts.destination;
        let state_key = state.key();
        let seeds = &[
            VAULT_AUTHORITY_SEED,
            state_key.as_ref(),
            &[state.vault_bump],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: pay_vault.to_account_info(),
            to: destination.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, amount)?;

        state.funds_withdrawn = state
            .funds_withdrawn
            .checked_add(amount)
            .ok_or(PresaleError::MathOverflow)?;

        emit!(FundsWithdrawn {
            state: state.key(),
            admin: ctx.accounts.admin.key(),
            amount,
            timestamp: now,
        });

        Ok(())
    }

    pub fn withdraw_unallocated_tdl(ctx: Context<WithdrawUnallocated>, amount: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require_keys_eq!(
            state.admin,
            ctx.accounts.admin.key(),
            PresaleError::Unauthorized
        );
        require!(amount > 0, PresaleError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        require!(now > state.end_ts, PresaleError::SaleNotEnded);

        let remaining_to_claim = state
            .total_allocated
            .checked_sub(state.total_claimed)
            .ok_or(PresaleError::MathOverflow)?;
        let vault_balance = ctx.accounts.tdl_vault.amount;
        require!(
            vault_balance >= remaining_to_claim,
            PresaleError::MathOverflow
        );
        let available = vault_balance
            .checked_sub(remaining_to_claim)
            .ok_or(PresaleError::MathOverflow)?;
        require!(amount <= available, PresaleError::InsufficientVaultBalance);

        let state_key = state.key();
        let seeds = &[
            VAULT_AUTHORITY_SEED,
            state_key.as_ref(),
            &[state.vault_bump],
        ];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.tdl_vault.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );

        token::transfer(cpi_ctx, amount)?;

        emit!(UnallocatedWithdrawn {
            state: state.key(),
            admin: ctx.accounts.admin.key(),
            amount,
            timestamp: now,
        });

        Ok(())
    }
}

fn common_initialize(
    state: &mut Account<PresaleState>,
    whitelist: &mut Account<Whitelist>,
    params: InitializeParams,
    config: PresaleConfig,
) -> Result<()> {
    validate_config(&config)?;

    state.bump = params.state_bump;
    state.vault_bump = params.vault_bump;
    state.whitelist_bump = params.whitelist_bump;
    state.admin = params.admin;
    state.tdl_mint = params.tdl_mint;
    state.tdl_vault = params.tdl_vault;
    state.pay_mint = params.pay_mint.unwrap_or(Pubkey::default());
    state.pay_vault = params.pay_vault.unwrap_or(Pubkey::default());
    state.pay_mint_decimals = params.pay_mint_decimals;

    state.price_numerator = config.price_numerator;
    state.price_denominator = config.price_denominator;
    state.soft_cap = config.soft_cap;
    state.hard_cap = config.hard_cap;
    state.wallet_min = config.wallet_min;
    state.wallet_max = config.wallet_max;
    state.start_ts = config.start_ts;
    state.end_ts = config.end_ts;
    state.tge_bps = config.tge_bps;
    state.cliff_seconds = config.cliff_seconds;
    state.vesting_seconds = config.vesting_seconds;
    state.buy_cooldown_seconds = config.buy_cooldown_seconds;

    state.collected = 0;
    state.total_allocated = 0;
    state.total_claimed = 0;
    state.total_refunded = 0;
    state.funds_withdrawn = 0;
    state.is_paused = false;
    state.guard_enabled = config.guard_authority.is_some();
    state.guard_authority = config.guard_authority.unwrap_or(Pubkey::default());
    state.whitelist_enabled = config.whitelist_enabled;

    whitelist.bump = params.whitelist_bump;
    whitelist.state = state.key();
    whitelist.root = config.whitelist_root;
    whitelist.enabled = config.whitelist_enabled;
    whitelist.version = 1;
    whitelist.last_updated = Clock::get()?.unix_timestamp;

    Ok(())
}

#[account]
#[derive(InitSpace)]
pub struct PresaleState {
    pub bump: u8,
    pub vault_bump: u8,
    pub whitelist_bump: u8,
    pub admin: Pubkey,
    pub tdl_mint: Pubkey,
    pub tdl_vault: Pubkey,
    pub pay_mint: Pubkey,
    pub pay_vault: Pubkey,
    pub pay_mint_decimals: u8,
    pub price_numerator: u64,
    pub price_denominator: u64,
    pub soft_cap: u64,
    pub hard_cap: u64,
    pub wallet_min: u64,
    pub wallet_max: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub tge_bps: u16,
    pub cliff_seconds: i64,
    pub vesting_seconds: i64,
    pub buy_cooldown_seconds: i64,
    pub collected: u64,
    pub total_allocated: u64,
    pub total_claimed: u64,
    pub total_refunded: u64,
    pub funds_withdrawn: u64,
    pub whitelist_enabled: bool,
    pub guard_authority: Pubkey,
    pub guard_enabled: bool,
    pub is_paused: bool,
}

#[account]
#[derive(InitSpace)]
pub struct BuyerPosition {
    pub bump: u8,
    pub state: Pubkey,
    pub buyer: Pubkey,
    pub contributed: u64,
    pub purchased: u64,
    pub claimed: u64,
    pub last_purchase_ts: i64,
    pub refunded: bool,
}

impl BuyerPosition {
    pub fn is_uninitialized(&self) -> bool {
        self.buyer == Pubkey::default()
    }
}

#[account]
#[derive(InitSpace)]
pub struct Whitelist {
    pub bump: u8,
    pub state: Pubkey,
    pub root: [u8; 32],
    pub enabled: bool,
    pub version: u64,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PresaleConfig {
    pub price_numerator: u64,
    pub price_denominator: u64,
    pub soft_cap: u64,
    pub hard_cap: u64,
    pub wallet_min: u64,
    pub wallet_max: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub tge_bps: u16,
    pub cliff_seconds: i64,
    pub vesting_seconds: i64,
    pub whitelist_enabled: bool,
    pub whitelist_root: [u8; 32],
    pub buy_cooldown_seconds: i64,
    pub guard_authority: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuyArgs {
    pub pay_amount: u64,
    pub min_expected_tdl: u64,
    pub merkle_proof: Vec<[u8; 32]>,
}

struct InitializeParams {
    pub admin: Pubkey,
    pub tdl_mint: Pubkey,
    pub pay_mint: Option<Pubkey>,
    pub tdl_vault: Pubkey,
    pub pay_vault: Option<Pubkey>,
    pub vault_bump: u8,
    pub whitelist_bump: u8,
    pub state_bump: u8,
    pub pay_mint_decimals: u8,
}

#[event]
pub struct TokensPurchased {
    pub state: Pubkey,
    pub buyer: Pubkey,
    pub pay_amount: u64,
    pub tdl_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensClaimed {
    pub state: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RefundIssued {
    pub state: Pubkey,
    pub buyer: Pubkey,
    pub pay_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsWithdrawn {
    pub state: Pubkey,
    pub admin: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct UnallocatedWithdrawn {
    pub state: Pubkey,
    pub admin: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct SalePaused {
    pub state: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SaleResumed {
    pub state: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConfigUpdated {
    pub state: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum PresaleError {
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Sale is currently paused")]
    SalePaused,
    #[msg("Sale is already paused")]
    AlreadyPaused,
    #[msg("Sale is not paused")]
    NotPaused,
    #[msg("Sale has not started")]
    SaleNotStarted,
    #[msg("Sale has already ended")]
    SaleEnded,
    #[msg("Sale has not ended yet")]
    SaleNotEnded,
    #[msg("Sale is currently running")]
    SaleInProgress,
    #[msg("Invalid configuration parameters")]
    InvalidConfiguration,
    #[msg("Invalid caps configuration")]
    InvalidCapConfiguration,
    #[msg("Invalid schedule configuration")]
    InvalidSchedule,
    #[msg("Invalid price configuration")]
    InvalidPriceConfiguration,
    #[msg("Invalid TGE basis points")]
    InvalidTgeBps,
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Wallet minimum contribution not met")]
    WalletMinNotReached,
    #[msg("Wallet cap exceeded")]
    WalletCapExceeded,
    #[msg("Hard cap exceeded")]
    HardCapExceeded,
    #[msg("Invalid amount provided")]
    InvalidAmount,
    #[msg("Buyer not whitelisted")]
    NotWhitelisted,
    #[msg("Whitelist disabled")]
    WhitelistDisabled,
    #[msg("Cooldown still active")]
    CooldownActive,
    #[msg("Soft cap already met")]
    SoftCapMet,
    #[msg("Soft cap not met")]
    SoftCapNotMet,
    #[msg("Nothing to refund")]
    NothingToRefund,
    #[msg("Position already refunded")]
    AlreadyRefunded,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Incorrect payment mint")]
    IncorrectPayMint,
    #[msg("Invalid account owner")]
    InvalidOwner,
    #[msg("Invalid state account provided")]
    InvalidStateAccount,
    #[msg("Invalid whitelist account provided")]
    InvalidWhitelistAccount,
    #[msg("Missing buyer payment account")]
    MissingPayAccount,
    #[msg("Missing guard signer")]
    MissingGuard,
    #[msg("Invalid vault account provided")]
    InvalidVaultAccount,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    #[msg("Slippage exceeded allowed minimum")]
    SlippageExceeded,
}
