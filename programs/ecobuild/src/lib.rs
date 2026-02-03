#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("EcoBui1d11111111111111111111111111111111111");

#[program]
pub mod ecobuild {
    use super::*;

    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        ctx.accounts
            .player_profile
            .initialize(ctx.accounts.authority.key(), ctx.bumps.player_profile)
    }

    pub fn create_project_pool(
        ctx: Context<CreateProjectPool>,
        project_seed: u64,
        name: String,
        goal_credits: u64,
    ) -> Result<()> {
        ctx.accounts.project_pool.initialize(
            ctx.accounts.authority.key(),
            ctx.bumps.project_pool,
            project_seed,
            goal_credits,
            &name,
        )
    }

    pub fn contribute_credits(ctx: Context<ContributeCredits>, amount: u64) -> Result<()> {
        if amount == 0 {
            return Err(ErrorCode::InvalidAmount.into());
        }

        let player = &mut ctx.accounts.player_profile;
        let pool = &mut ctx.accounts.project_pool;
        player.add_credits(amount)?;
        pool.record_contribution(amount)
    }

    pub fn mint_poc_receipt(
        ctx: Context<MintProofOfCollectionReceipt>,
        attestation_id: [u8; 32],
        photo_hash: [u8; 32],
        zone_id: String,
        material_type: u8,
        quantity: u64,
        timestamp: i64,
    ) -> Result<()> {
        let player = &ctx.accounts.player_profile;
        ctx.accounts.poc_receipt.initialize(
            player.authority,
            ctx.bumps.poc_receipt,
            attestation_id,
            photo_hash,
            &zone_id,
            material_type,
            quantity,
            timestamp,
        )
    }
}

#[derive(Accounts)]
pub struct InitializePlayer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = PlayerProfile::SIZE,
        seeds = [PlayerProfile::SEED_PREFIX, authority.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(project_seed: u64)]
pub struct CreateProjectPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = ProjectPool::SIZE,
        seeds = [
            ProjectPool::SEED_PREFIX,
            authority.key().as_ref(),
            &project_seed.to_le_bytes()
        ],
        bump
    )]
    pub project_pool: Account<'info, ProjectPool>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ContributeCredits<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PlayerProfile::SEED_PREFIX, authority.key().as_ref()],
        bump = player_profile.bump,
        constraint = player_profile.authority == authority.key()
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    #[account(
        mut,
        seeds = [
            ProjectPool::SEED_PREFIX,
            project_pool.authority.as_ref(),
            &project_pool.seed.to_le_bytes()
        ],
        bump = project_pool.bump
    )]
    pub project_pool: Account<'info, ProjectPool>,
}

#[derive(Accounts)]
#[instruction(attestation_id: [u8; 32])]
pub struct MintProofOfCollectionReceipt<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [PlayerProfile::SEED_PREFIX, authority.key().as_ref()],
        bump = player_profile.bump,
        constraint = player_profile.authority == authority.key()
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    #[account(
        init,
        payer = authority,
        space = ProofOfCollectionReceipt::SIZE,
        seeds = [
            ProofOfCollectionReceipt::SEED_PREFIX,
            player_profile.authority.as_ref(),
            &attestation_id
        ],
        bump
    )]
    pub poc_receipt: Account<'info, ProofOfCollectionReceipt>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PlayerProfile {
    pub authority: Pubkey,
    pub bump: u8,
    pub total_credits: u64,
}

impl PlayerProfile {
    pub const SEED_PREFIX: &'static [u8] = b"player";
    pub const SIZE: usize = 8  // discriminator
        + 32                   // authority pubkey
        + 1                    // bump
        + 8; // total credits

    pub fn initialize(&mut self, authority: Pubkey, bump: u8) -> Result<()> {
        self.authority = authority;
        self.bump = bump;
        self.total_credits = 0;
        Ok(())
    }

    pub fn add_credits(&mut self, amount: u64) -> Result<()> {
        self.total_credits = self
            .total_credits
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        Ok(())
    }
}

#[account]
pub struct ProjectPool {
    pub authority: Pubkey,
    pub bump: u8,
    pub seed: u64,
    pub goal_credits: u64,
    pub received_credits: u64,
    pub name_len: u8,
    pub name: [u8; ProjectPool::NAME_MAX_LEN],
}

impl ProjectPool {
    pub const SEED_PREFIX: &'static [u8] = b"project";
    pub const NAME_MAX_LEN: usize = 32;
    pub const SIZE: usize = 8  // discriminator
        + 32                   // authority
        + 1                    // bump
        + 8                    // seed
        + 8                    // goal credits
        + 8                    // received credits
        + 1                    // name length
        + Self::NAME_MAX_LEN; // name bytes

    pub fn initialize(
        &mut self,
        authority: Pubkey,
        bump: u8,
        seed: u64,
        goal: u64,
        name: &str,
    ) -> Result<()> {
        if goal == 0 {
            return Err(ErrorCode::InvalidAmount.into());
        }
        if name.as_bytes().len() > Self::NAME_MAX_LEN {
            return Err(ErrorCode::NameTooLong.into());
        }

        self.authority = authority;
        self.bump = bump;
        self.seed = seed;
        self.goal_credits = goal;
        self.received_credits = 0;
        self.name_len = name.len() as u8;
        self.name = [0u8; Self::NAME_MAX_LEN];
        self.name[..name.len()].copy_from_slice(name.as_bytes());
        Ok(())
    }

    pub fn record_contribution(&mut self, amount: u64) -> Result<()> {
        self.received_credits = self
            .received_credits
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        Ok(())
    }

    pub fn name(&self) -> String {
        let bytes = &self.name[..self.name_len as usize];
        String::from_utf8(bytes.to_vec()).unwrap_or_default()
    }
}

#[account]
pub struct ProofOfCollectionReceipt {
    pub player: Pubkey,
    pub bump: u8,
    pub attestation_id: [u8; 32],
    pub photo_hash: [u8; 32],
    pub zone_id_len: u8,
    pub zone_id: [u8; ProofOfCollectionReceipt::ZONE_ID_MAX_LEN],
    pub material_type: u8,
    pub quantity: u64,
    pub timestamp: i64,
}

impl ProofOfCollectionReceipt {
    pub const SEED_PREFIX: &'static [u8] = b"poc";
    pub const ZONE_ID_MAX_LEN: usize = 32;
    pub const SIZE: usize = 8  // discriminator
        + 32                   // player pubkey
        + 1                    // bump
        + 32                   // attestation id
        + 32                   // photo hash
        + 1                    // zone id length
        + Self::ZONE_ID_MAX_LEN // zone id bytes
        + 1                    // material type
        + 8                    // quantity
        + 8; // timestamp

    pub fn initialize(
        &mut self,
        player: Pubkey,
        bump: u8,
        attestation_id: [u8; 32],
        photo_hash: [u8; 32],
        zone_id: &str,
        material_type: u8,
        quantity: u64,
        timestamp: i64,
    ) -> Result<()> {
        if quantity == 0 {
            return Err(ErrorCode::InvalidAmount.into());
        }
        if timestamp <= 0 {
            return Err(ErrorCode::InvalidTimestamp.into());
        }
        if zone_id.as_bytes().len() > Self::ZONE_ID_MAX_LEN {
            return Err(ErrorCode::ZoneIdTooLong.into());
        }
        MaterialType::try_from(material_type)?;

        self.player = player;
        self.bump = bump;
        self.attestation_id = attestation_id;
        self.photo_hash = photo_hash;
        self.zone_id_len = zone_id.len() as u8;
        self.zone_id = [0u8; Self::ZONE_ID_MAX_LEN];
        self.zone_id[..zone_id.len()].copy_from_slice(zone_id.as_bytes());
        self.material_type = material_type;
        self.quantity = quantity;
        self.timestamp = timestamp;
        Ok(())
    }

    pub fn derive_pda(program_id: &Pubkey, player: &Pubkey, attestation_id: &[u8; 32]) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEED_PREFIX, player.as_ref(), attestation_id],
            program_id,
        )
    }

    pub fn zone_id(&self) -> String {
        let bytes = &self.zone_id[..self.zone_id_len as usize];
        String::from_utf8(bytes.to_vec()).unwrap_or_default()
    }
}

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MaterialType {
    Plastic = 0,
    Glass = 1,
    Metal = 2,
    Paper = 3,
}

impl MaterialType {
    pub fn try_from(value: u8) -> Result<Self> {
        match value {
            0 => Ok(Self::Plastic),
            1 => Ok(Self::Glass),
            2 => Ok(Self::Metal),
            3 => Ok(Self::Paper),
            _ => Err(ErrorCode::InvalidMaterialType.into()),
        }
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Project name exceeds max length")]
    NameTooLong,
    #[msg("Zone id exceeds max length")]
    ZoneIdTooLong,
    #[msg("Material type is invalid")]
    InvalidMaterialType,
    #[msg("Timestamp is invalid")]
    InvalidTimestamp,
    #[msg("Arithmetic overflow")]
    Overflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn player_initialize_sets_defaults() {
        let authority = Pubkey::new_unique();
        let mut profile = PlayerProfile {
            authority: Pubkey::default(),
            bump: 0,
            total_credits: 12,
        };

        profile.initialize(authority, 7).unwrap();
        assert_eq!(profile.authority, authority);
        assert_eq!(profile.bump, 7);
        assert_eq!(profile.total_credits, 0);
    }

    #[test]
    fn project_pool_initialize_and_contribute() {
        let authority = Pubkey::new_unique();
        let mut pool = ProjectPool {
            authority: Pubkey::default(),
            bump: 0,
            seed: 0,
            goal_credits: 0,
            received_credits: 0,
            name_len: 0,
            name: [0u8; ProjectPool::NAME_MAX_LEN],
        };

        pool.initialize(authority, 4, 42, 10, "Community Garden")
            .unwrap();
        assert_eq!(pool.authority, authority);
        assert_eq!(pool.bump, 4);
        assert_eq!(pool.seed, 42);
        assert_eq!(pool.goal_credits, 10);
        assert_eq!(pool.received_credits, 0);
        assert_eq!(pool.name(), "Community Garden");

        pool.record_contribution(6).unwrap();
        assert_eq!(pool.received_credits, 6);

        let err = pool.record_contribution(u64::MAX).unwrap_err();
        assert_eq!(err, ErrorCode::Overflow.into());
    }

    #[test]
    fn player_add_credits_checks_overflow() {
        let mut profile = PlayerProfile {
            authority: Pubkey::default(),
            bump: 1,
            total_credits: u64::MAX,
        };

        let err = profile.add_credits(1).unwrap_err();
        assert_eq!(err, ErrorCode::Overflow.into());
    }

    #[test]
    fn project_name_too_long() {
        let mut pool = ProjectPool {
            authority: Pubkey::default(),
            bump: 0,
            seed: 0,
            goal_credits: 0,
            received_credits: 0,
            name_len: 0,
            name: [0u8; ProjectPool::NAME_MAX_LEN],
        };

        let long_name = "x".repeat(ProjectPool::NAME_MAX_LEN + 1);
        let err = pool
            .initialize(Pubkey::new_unique(), 2, 5, 10, &long_name)
            .unwrap_err();
        assert_eq!(err, ErrorCode::NameTooLong.into());
    }

    #[test]
    fn poc_receipt_seed_derivation_matches() {
        let player = Pubkey::new_unique();
        let attestation_id = [7u8; 32];
        let (pda, bump) =
            ProofOfCollectionReceipt::derive_pda(&crate::ID, &player, &attestation_id);
        let (expected, expected_bump) = Pubkey::find_program_address(
            &[
                ProofOfCollectionReceipt::SEED_PREFIX,
                player.as_ref(),
                &attestation_id,
            ],
            &crate::ID,
        );

        assert_eq!(pda, expected);
        assert_eq!(bump, expected_bump);
    }

    #[test]
    fn poc_receipt_validation_rejects_invalid_inputs() {
        let mut receipt = ProofOfCollectionReceipt {
            player: Pubkey::default(),
            bump: 0,
            attestation_id: [0u8; 32],
            photo_hash: [0u8; 32],
            zone_id_len: 0,
            zone_id: [0u8; ProofOfCollectionReceipt::ZONE_ID_MAX_LEN],
            material_type: 0,
            quantity: 0,
            timestamp: 0,
        };

        let too_long_zone = "z".repeat(ProofOfCollectionReceipt::ZONE_ID_MAX_LEN + 1);
        let err = receipt
            .initialize(
                Pubkey::new_unique(),
                1,
                [1u8; 32],
                [2u8; 32],
                &too_long_zone,
                MaterialType::Plastic as u8,
                1,
                1,
            )
            .unwrap_err();

        assert_eq!(err, ErrorCode::ZoneIdTooLong.into());

        let err = receipt
            .initialize(
                Pubkey::new_unique(),
                1,
                [1u8; 32],
                [2u8; 32],
                "zone-1",
                9,
                1,
                1,
            )
            .unwrap_err();
        assert_eq!(err, ErrorCode::InvalidMaterialType.into());

        let err = receipt
            .initialize(
                Pubkey::new_unique(),
                1,
                [1u8; 32],
                [2u8; 32],
                "zone-1",
                MaterialType::Plastic as u8,
                0,
                1,
            )
            .unwrap_err();
        assert_eq!(err, ErrorCode::InvalidAmount.into());
    }
}
