use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{BondingCurve, GlobalConfig, BONDING_CURVE_SEED, GLOBAL_CONFIG_SEED, CURVE_TOKEN_VAULT_SEED};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[derive(Accounts)]
#[instruction(params: CreateTokenParams)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_CONFIG_SEED],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// The token mint (vanity address)
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = BondingCurve::LEN,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateToken>, params: CreateTokenParams) -> Result<()> {
    let config = &ctx.accounts.global_config;
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let clock = Clock::get()?;

    // Initialize bonding curve
    bonding_curve.mint = ctx.accounts.mint.key();
    bonding_curve.creator = ctx.accounts.creator.key();
    bonding_curve.virtual_sol_reserves = config.initial_virtual_sol;
    bonding_curve.virtual_token_reserves = config.initial_virtual_tokens;
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.real_token_reserves = config.initial_virtual_tokens;
    bonding_curve.tokens_sold = 0;
    bonding_curve.migrated = false;
    bonding_curve.created_at = clock.unix_timestamp;
    bonding_curve.bump = ctx.bumps.bonding_curve;

    // Mint total supply to the curve's token vault
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[
        BONDING_CURVE_SEED,
        mint_key.as_ref(),
        &[bonding_curve.bump],
    ];
    let signer = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.curve_token_vault.to_account_info(),
                authority: bonding_curve.to_account_info(),
            },
            signer,
        ),
        config.initial_virtual_tokens,
    )?;

    // Update global stats
    let config = &mut ctx.accounts.global_config;
    config.total_tokens = config.total_tokens.saturating_add(1);

    msg!(
        "Token created: {} ({}) at {}",
        params.name,
        params.symbol,
        ctx.accounts.mint.key()
    );

    Ok(())
}
