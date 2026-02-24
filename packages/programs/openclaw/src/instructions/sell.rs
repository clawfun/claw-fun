use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::error::OpenClawError;
use crate::state::{BondingCurve, GlobalConfig, BONDING_CURVE_SEED, GLOBAL_CONFIG_SEED};

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

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
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// CHECK: Fee recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == global_config.fee_recipient
    )]
    pub fee_recipient: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let config = &mut ctx.accounts.global_config;

    // Check not migrated
    require!(!bonding_curve.migrated, OpenClawError::AlreadyMigrated);

    // Calculate SOL out and fee
    let (sol_out, fee) = bonding_curve.get_sol_out(token_amount, config.fee_bps)?;

    // Check slippage
    require!(sol_out >= min_sol_out, OpenClawError::SlippageExceeded);

    // Check sufficient SOL in curve
    require!(
        sol_out <= bonding_curve.real_sol_reserves,
        OpenClawError::InsufficientLiquidity
    );

    // Transfer tokens from seller to curve vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.curve_token_vault.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount,
    )?;

    let sol_out_plus_fee = sol_out.saturating_add(fee);

    // Transfer SOL from curve to seller
    **bonding_curve.to_account_info().try_borrow_mut_lamports()? -= sol_out_plus_fee;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out;

    // Transfer fee to fee recipient
    if fee > 0 {
        **ctx.accounts.fee_recipient.to_account_info().try_borrow_mut_lamports()? += fee;
    }

    // Update bonding curve state
    bonding_curve.virtual_sol_reserves = bonding_curve
        .virtual_sol_reserves
        .checked_sub(sol_out_plus_fee)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_add(token_amount)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.real_sol_reserves = bonding_curve
        .real_sol_reserves
        .checked_sub(sol_out_plus_fee)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_add(token_amount)
        .ok_or(OpenClawError::MathOverflow)?;
    bonding_curve.tokens_sold = bonding_curve
        .tokens_sold
        .checked_sub(token_amount)
        .ok_or(OpenClawError::MathOverflow)?;

    // Update global volume
    config.total_volume = config
        .total_volume
        .checked_add(sol_out_plus_fee)
        .ok_or(OpenClawError::MathOverflow)?;

    msg!(
        "Sell: {} tokens -> {} lamports (fee: {} lamports)",
        token_amount,
        sol_out,
        fee
    );

    Ok(())
}
