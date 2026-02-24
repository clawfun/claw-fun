use anchor_lang::prelude::*;
use crate::state::{GlobalConfig, GLOBAL_CONFIG_SEED};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeParams {
    pub fee_bps: u16,
    pub migration_threshold: u64,
    pub initial_virtual_sol: u64,
    pub initial_virtual_tokens: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = GlobalConfig::LEN,
        seeds = [GLOBAL_CONFIG_SEED],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// CHECK: Fee recipient account
    pub fee_recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    let config = &mut ctx.accounts.global_config;

    config.authority = ctx.accounts.authority.key();
    config.fee_recipient = ctx.accounts.fee_recipient.key();
    config.fee_bps = params.fee_bps;
    config.migration_threshold = params.migration_threshold;
    config.initial_virtual_sol = params.initial_virtual_sol;
    config.initial_virtual_tokens = params.initial_virtual_tokens;
    config.total_tokens = 0;
    config.total_volume = 0;
    config.bump = ctx.bumps.global_config;

    msg!("OpenClaw initialized with fee: {} bps", params.fee_bps);

    Ok(())
}
