use anchor_lang::prelude::*;

/// Global configuration for the OpenClaw protocol
#[account]
#[derive(Default)]
pub struct GlobalConfig {
    /// Admin authority
    pub authority: Pubkey,
    /// Fee recipient
    pub fee_recipient: Pubkey,
    /// Platform fee in basis points (1% = 100)
    pub fee_bps: u16,
    /// SOL threshold for migration (in lamports)
    pub migration_threshold: u64,
    /// Initial virtual SOL reserves (in lamports)
    pub initial_virtual_sol: u64,
    /// Initial virtual token reserves
    pub initial_virtual_tokens: u64,
    /// Total tokens created
    pub total_tokens: u64,
    /// Total volume (in lamports)
    pub total_volume: u64,
    /// Bump seed
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // fee_recipient
        2 +  // fee_bps
        8 +  // migration_threshold
        8 +  // initial_virtual_sol
        8 +  // initial_virtual_tokens
        8 +  // total_tokens
        8 +  // total_volume
        1;   // bump
}

/// Bonding curve state for a token
#[account]
#[derive(Default)]
pub struct BondingCurve {
    /// Token mint address
    pub mint: Pubkey,
    /// Token creator
    pub creator: Pubkey,
    /// Virtual SOL reserves (for price calculation)
    pub virtual_sol_reserves: u64,
    /// Virtual token reserves (for price calculation)
    pub virtual_token_reserves: u64,
    /// Real SOL reserves (actual SOL in the curve)
    pub real_sol_reserves: u64,
    /// Real token reserves (actual tokens in the curve)
    pub real_token_reserves: u64,
    /// Total tokens sold
    pub tokens_sold: u64,
    /// Whether the token has been migrated to DEX
    pub migrated: bool,
    /// Timestamp when the token was created
    pub created_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 8 + // discriminator
        32 + // mint
        32 + // creator
        8 +  // virtual_sol_reserves
        8 +  // virtual_token_reserves
        8 +  // real_sol_reserves
        8 +  // real_token_reserves
        8 +  // tokens_sold
        1 +  // migrated
        8 +  // created_at
        1;   // bump

    /// Calculate the current token price
    pub fn get_price(&self) -> u64 {
        if self.virtual_token_reserves == 0 {
            return 0;
        }
        // Price = virtual_sol / virtual_tokens (in lamports per token)
        (self.virtual_sol_reserves as u128 * 1_000_000 / self.virtual_token_reserves as u128) as u64
    }

    /// Calculate tokens out for a given SOL input
    pub fn get_tokens_out(&self, sol_in: u64, fee_bps: u16) -> Result<(u64, u64)> {
        // Calculate fee
        let fee = (sol_in as u128 * fee_bps as u128 / 10_000) as u64;
        let sol_after_fee = sol_in.saturating_sub(fee);

        // Constant product: k = x * y
        // new_y = k / new_x
        // tokens_out = old_y - new_y
        let k = self.virtual_sol_reserves as u128 * self.virtual_token_reserves as u128;
        let new_sol = self.virtual_sol_reserves as u128 + sol_after_fee as u128;
        let new_tokens = k / new_sol;
        let tokens_out = self.virtual_token_reserves as u128 - new_tokens;

        Ok((tokens_out as u64, fee))
    }

    /// Calculate SOL out for a given token input
    pub fn get_sol_out(&self, tokens_in: u64, fee_bps: u16) -> Result<(u64, u64)> {
        // Constant product: k = x * y
        // new_x = k / new_y
        // sol_out = old_x - new_x
        let k = self.virtual_sol_reserves as u128 * self.virtual_token_reserves as u128;
        let new_tokens = self.virtual_token_reserves as u128 + tokens_in as u128;
        let new_sol = k / new_tokens;
        let sol_out_gross = self.virtual_sol_reserves as u128 - new_sol;

        // Calculate fee
        let fee = (sol_out_gross * fee_bps as u128 / 10_000) as u64;
        let sol_out = (sol_out_gross as u64).saturating_sub(fee);

        Ok((sol_out, fee))
    }
}

/// Seeds for PDAs
pub const GLOBAL_CONFIG_SEED: &[u8] = b"global_config";
pub const BONDING_CURVE_SEED: &[u8] = b"bonding_curve";
pub const CURVE_SOL_VAULT_SEED: &[u8] = b"curve_sol_vault";
pub const CURVE_TOKEN_VAULT_SEED: &[u8] = b"curve_token_vault";
