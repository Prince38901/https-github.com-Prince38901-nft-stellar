#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_mint() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTContract, ());
    let client = NFTContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let name = String::from_str(&env, "Cool NFT");
    let description = String::from_str(&env, "A very cool NFT");
    let image = String::from_str(&env, "https://example.com/nft.png");

    let token_id = client.mint(&minter, &name, &description, &image);
    assert_eq!(token_id, 0);

    let nft = client.get_nft(&token_id);
    assert_eq!(nft.owner, minter);
    assert_eq!(nft.name, name);
    assert_eq!(nft.description, description);
    assert_eq!(nft.image, image);
}

#[test]
fn test_total_supply() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTContract, ());
    let client = NFTContractClient::new(&env, &contract_id);

    assert_eq!(client.total_supply(), 0);

    let minter = Address::generate(&env);
    client.mint(
        &minter,
        &String::from_str(&env, "NFT 1"),
        &String::from_str(&env, "First"),
        &String::from_str(&env, "img1"),
    );
    assert_eq!(client.total_supply(), 1);

    client.mint(
        &minter,
        &String::from_str(&env, "NFT 2"),
        &String::from_str(&env, "Second"),
        &String::from_str(&env, "img2"),
    );
    assert_eq!(client.total_supply(), 2);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTContract, ());
    let client = NFTContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);

    let token_id = client.mint(
        &owner,
        &String::from_str(&env, "My NFT"),
        &String::from_str(&env, "Transferable"),
        &String::from_str(&env, "img"),
    );

    assert_eq!(client.owner_of(&token_id), owner.clone());

    client.transfer(&owner, &new_owner, &token_id);
    assert_eq!(client.owner_of(&token_id), new_owner);
}

#[test]
#[should_panic(expected = "Not the owner")]
fn test_transfer_not_owner() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTContract, ());
    let client = NFTContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let not_owner = Address::generate(&env);
    let recipient = Address::generate(&env);

    let token_id = client.mint(
        &owner,
        &String::from_str(&env, "NFT"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "img"),
    );

    // This should panic because not_owner is not the owner
    client.transfer(&not_owner, &recipient, &token_id);
}

#[test]
fn test_list_all() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTContract, ());
    let client = NFTContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);

    let id0 = client.mint(
        &minter,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "Desc A"),
        &String::from_str(&env, "imgA"),
    );
    let id1 = client.mint(
        &minter,
        &String::from_str(&env, "B"),
        &String::from_str(&env, "Desc B"),
        &String::from_str(&env, "imgB"),
    );

    let all = client.list_all();
    assert_eq!(all.len(), 2);
    assert_eq!(all.get(0).unwrap(), id0);
    assert_eq!(all.get(1).unwrap(), id1);
}

#[test]
fn test_auto_increment_ids() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTContract, ());
    let client = NFTContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);

    let id0 = client.mint(
        &minter,
        &String::from_str(&env, "First"),
        &String::from_str(&env, "D1"),
        &String::from_str(&env, "i1"),
    );
    let id1 = client.mint(
        &minter,
        &String::from_str(&env, "Second"),
        &String::from_str(&env, "D2"),
        &String::from_str(&env, "i2"),
    );
    let id2 = client.mint(
        &minter,
        &String::from_str(&env, "Third"),
        &String::from_str(&env, "D3"),
        &String::from_str(&env, "i3"),
    );

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}
