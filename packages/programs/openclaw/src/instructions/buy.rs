use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::error::OpenClawError;
use crate::state::{BondingCurve, GlobalConfig, BONDING_CURVE_SEED, GLOBAL_CONFIG_SEED};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, bonding_curve.mint.as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Fee recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == global_config.fee_recipient
    )]
    pub fee_recipient: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let config = &mut ctx.accounts.global_config;

    // Check not migrated
    require!(!bonding_curve.migrated, OpenClawError::AlreadyMigrated);

    // Calculate tokens out and fee
    let (tokens_out, fee) = bonding_curve.get_tokens_out(sol_amount, config.fee_bps)?;

    // Check slippage
    require!(tokens_out >= min_tokens_out, OpenClawError::SlippageExceeded);

    // Check sufficient liquidity
    require!(
        tokens_out <= bonding_curve.real_token_reserves,
        OpenClawError::InsufficientLiquidity
    );

    let sol_after_fee = sol_amount.saturating_sub(fee);

    // Transfer SOL from buyer to curve (minus fee)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: bonding_curve.to_account_info(),
            },
        ),
        sol_after_fee,
    )?;

    // Transfer fee to fee recipient
    if fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // Transfer tokens from curve vault to buyer
    let mint_key = bonding_curve.mint;
    let seeds = &[
        BONDING_CURVE_SEED,
        mint_key.as_ref(),
        &[bonding_curve.bump],
    ];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.curve_token_vault.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: bonding_curve.to_account_info(),
            },
            signer,
        ),
        tokens_out,
    )?;

    // Update bonding curve state
    bonding_curve.virtual_sol_reserves = bonding_curve
        .virtual_sol_reserves
        .checked_add(sol_after_fee)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_sub(tokens_out)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.real_sol_reserves = bonding_curve
        .real_sol_reserves
        .checked_add(sol_after_fee)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_sub(tokens_out)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.tokens_sold = bonding_curve
        .tokens_sold
        .checked_add(tokens_out)
        .ok_or(OpenClawError::MathOverflow)?;

    // Update global volume
    config.total_volume = config
        .total_volume
        .checked_add(sol_amount)
        .ok_or(OpenClawError::MathOverflow)?;

    msg!(
        "Buy: {} lamports -> {} tokens (fee: {} lamports)",
        sol_amount,
        tokens_out,
        fee
    );

    Ok(())
}
