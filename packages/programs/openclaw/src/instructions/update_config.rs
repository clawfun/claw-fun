use anchor_lang::prelude::*;
use crate::error::OpenClawError;
use crate::state::{GlobalConfig, GLOBAL_CONFIG_SEED};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateConfigParams {
    pub fee_bps: Option<u16>,
    pub migration_threshold: Option<u64>,
    pub fee_recipient: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        constraint = authority.key() == global_config.authority @ OpenClawError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

pub fn handler(ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
    let config = &mut ctx.accounts.global_config;

    if let Some(fee_bps) = params.fee_bps {
        require!(fee_bps <= 1000, OpenClawError::InvalidFeeConfig); // Max 10%
        config.fee_bps = fee_bps;
        msg!("Updated fee to {} bps", fee_bps);
    }

    if let Some(migration_threshold) = params.migration_threshold {
        config.migration_threshold = migration_threshold;
        msg!("Updated migration threshold to {} lamports", migration_threshold);
    }

    if let Some(fee_recipient) = params.fee_recipient {
        config.fee_recipient = fee_recipient;
        msg!("Updated fee recipient to {}", fee_recipient);
    }

    Ok(())
}
