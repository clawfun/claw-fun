use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::error::OpenClawError;
use crate::state::{BondingCurve, GlobalConfig, BONDING_CURVE_SEED, GLOBAL_CONFIG_SEED};

#[derive(Accounts)]
pub struct Migrate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
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

    // TODO: Add Raydium accounts for actual migration
    // For now, this is a placeholder that marks the token as migrated

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Migrate>) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let config = &ctx.accounts.global_config;

    // Check not already migrated
    require!(!bonding_curve.migrated, OpenClawError::AlreadyMigrated);

    // Check migration threshold reached
    require!(
        bonding_curve.real_sol_reserves >= config.migration_threshold,
        OpenClawError::MigrationThresholdNotReached
    );

    // Mark as migrated
    bonding_curve.migrated = true;

    // TODO: Implement actual Raydium migration
    // 1. Create Raydium AMM pool
    // 2. Transfer SOL and remaining tokens to pool
    // 3. Burn LP tokens (lock liquidity forever)

    msg!(
        "Token {} migrated to DEX with {} lamports and {} tokens",
        bonding_curve.mint,
        bonding_curve.real_sol_reserves,
        bonding_curve.real_token_reserves
    );

    Ok(())
}
