#![no_std]

use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Symbol, Vec, Map
};

#[contract]
pub struct NFTContract;

#[contractimpl]
impl NFTContract {

    // Mint a new NFT
    pub fn mint(
        env: Env,
        to: Address,
        token_id: Symbol,
        metadata: Symbol,
    ) {
        let mut storage: Map<Symbol, (Address, Symbol)> =
            env.storage().instance().get(&symbol_short!("NFTS"))
            .unwrap_or(Map::new(&env));

        // Prevent duplicate token
        if storage.contains_key(token_id.clone()) {
            panic!("Token already exists");
        }

        storage.set(token_id.clone(), (to.clone(), metadata));
        env.storage().instance().set(&symbol_short!("NFTS"), &storage);
    }

    // Get NFT owner
    pub fn owner_of(env: Env, token_id: Symbol) -> Address {
        let storage: Map<Symbol, (Address, Symbol)> =
            env.storage().instance().get(&symbol_short!("NFTS"))
            .unwrap();

        let (owner, _) = storage.get(token_id).unwrap();
        owner
    }

    // Get metadata
    pub fn get_metadata(env: Env, token_id: Symbol) -> Symbol {
        let storage: Map<Symbol, (Address, Symbol)> =
            env.storage().instance().get(&symbol_short!("NFTS"))
            .unwrap();

        let (_, metadata) = storage.get(token_id).unwrap();
        metadata
    }

    // Transfer NFT
    pub fn transfer(env: Env, from: Address, to: Address, token_id: Symbol) {
        from.require_auth();

        let mut storage: Map<Symbol, (Address, Symbol)> =
            env.storage().instance().get(&symbol_short!("NFTS"))
            .unwrap();

        let (owner, metadata) = storage.get(token_id.clone()).unwrap();

        if owner != from {
            panic!("Not the owner");
        }

        storage.set(token_id, (to, metadata));
        env.storage().instance().set(&symbol_short!("NFTS"), &storage);
    }

    // List all NFTs (basic)
    pub fn list_all(env: Env) -> Vec<Symbol> {
        let storage: Map<Symbol, (Address, Symbol)> =
            env.storage().instance().get(&symbol_short!("NFTS"))
            .unwrap_or(Map::new(&env));

        let mut keys = Vec::new(&env);

        for (k, _) in storage.iter() {
            keys.push_back(k);
        }

        keys
    }
}