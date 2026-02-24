use anchor_lang::prelude::*;

#[error_code]
pub enum OpenClawError {
    #[msg("Insufficient SOL amount")]
    InsufficientSolAmount,

    #[msg("Insufficient token amount")]
    InsufficientTokenAmount,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Token has already been migrated")]
    AlreadyMigrated,

    #[msg("Migration threshold not reached")]
    MigrationThresholdNotReached,

    #[msg("Invalid fee configuration")]
    InvalidFeeConfig,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid token mint")]
    InvalidMint,

    #[msg("Curve has insufficient liquidity")]
    InsufficientLiquidity,
}
