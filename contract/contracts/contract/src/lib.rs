#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};

/// Represents a single NFT with its metadata and owner.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct NFT {
    pub owner: Address,
    pub name: String,
    pub description: String,
    pub image: String,
}

/// Storage keys used by the contract.
#[contracttype]
pub enum DataKey {
    /// Stores the next available token ID (u64).
    NextId,
    /// Stores an NFT struct by its token ID.
    Nft(u64),
    /// Stores the list of all minted token IDs.
    AllTokens,
}

#[contract]
pub struct NFTContract;

#[contractimpl]
impl NFTContract {
    // ──────────────────────────────────────────────
    //  MINT — fully permissionless, anyone can call
    // ──────────────────────────────────────────────

    /// Mint a new NFT. Anyone can call this function.
    /// The `minter` address becomes the owner.
    /// Returns the auto-generated token ID.
    pub fn mint(
        env: Env,
        minter: Address,
        name: String,
        description: String,
        image: String,
    ) -> u64 {
        // Require the minter to sign so we know they want this NFT
        minter.require_auth();

        // Auto-increment token ID
        let token_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0);

        let nft = NFT {
            owner: minter,
            name,
            description,
            image,
        };

        // Store the NFT
        env.storage()
            .persistent()
            .set(&DataKey::Nft(token_id), &nft);

        // Update the all-tokens list
        let mut all_tokens: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllTokens)
            .unwrap_or(Vec::new(&env));
        all_tokens.push_back(token_id);
        env.storage()
            .instance()
            .set(&DataKey::AllTokens, &all_tokens);

        // Increment the next ID
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(token_id + 1));

        token_id
    }

    // ──────────────────────────────────────────────
    //  TRANSFER — only the current owner can transfer
    // ──────────────────────────────────────────────

    /// Transfer an NFT to a new owner. Only the current owner can call this.
    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
        from.require_auth();

        let mut nft: NFT = env
            .storage()
            .persistent()
            .get(&DataKey::Nft(token_id))
            .expect("NFT does not exist");

        if nft.owner != from {
            panic!("Not the owner");
        }

        nft.owner = to;
        env.storage()
            .persistent()
            .set(&DataKey::Nft(token_id), &nft);
    }

    // ──────────────────────────────────────────────
    //  READ FUNCTIONS — fully permissionless
    // ──────────────────────────────────────────────

    /// Get the full NFT details by token ID. Anyone can call this.
    pub fn get_nft(env: Env, token_id: u64) -> NFT {
        env.storage()
            .persistent()
            .get(&DataKey::Nft(token_id))
            .expect("NFT does not exist")
    }

    /// Get the owner of an NFT. Anyone can call this.
    pub fn owner_of(env: Env, token_id: u64) -> Address {
        let nft: NFT = env
            .storage()
            .persistent()
            .get(&DataKey::Nft(token_id))
            .expect("NFT does not exist");
        nft.owner
    }

    /// Get the total number of minted NFTs. Anyone can call this.
    pub fn total_supply(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0)
    }

    /// List all minted token IDs. Anyone can call this.
    pub fn list_all(env: Env) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::AllTokens)
            .unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;