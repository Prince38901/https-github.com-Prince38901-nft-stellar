# 🚀 NFT Minting Platform (Soroban Smart Contract)

## 📌 Project Description
This project is a basic NFT (Non-Fungible Token) minting platform built using **Soroban**, the smart contract platform on the Stellar blockchain.

It allows users to mint unique NFTs, store metadata, transfer ownership, and query NFT details — all on-chain.

---

## ⚙️ What it does

This smart contract enables:

- Minting unique NFTs with metadata
- Storing ownership securely on-chain
- Transferring NFTs between users
- Fetching NFT metadata and ownership
- Listing all minted NFTs

Each NFT is identified by a unique `token_id`.

---

## ✨ Features

- 🪙 **Mint NFTs**
  - Create unique NFTs with metadata
  - Prevents duplicate token IDs

- 👤 **Ownership Tracking**
  - Each NFT is mapped to an owner address

- 🔁 **Transfer Functionality**
  - Secure transfer with authentication

- 📦 **Metadata Storage**
  - Store simple metadata (e.g., IPFS hash or URI)

- 📋 **NFT Listing**
  - Retrieve all minted token IDs

---

## 🛠 Tech Stack

- **Language:** Rust
- **Platform:** Soroban (Stellar Smart Contracts)
- **Blockchain:** Stellar

---

## 🚀 How to Deploy

1. Install Soroban CLI:
   ```bash
   cargo install --locked soroban-cli
2. Build contract:
   cargo build --target wasm32-unknown-unknown --release
3. Deploy to Stellar network:
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/your_contract.wasm \
     --source your-key
NFT Minting Platform:
[https://stellar.expert/explorer/public/contract/YOUR_CONTRACT_ID
](https://stellar.expert/explorer/testnet/contract/CAXGFIVRVXFNP6EYEBZL4UNXY4CHPARPTFGU6YKVORZJGWHENEUFHERA)
Replace YOUR_CONTRACT_ID with your deployed contract address.
<img width="1919" height="928" alt="image" src="https://github.com/user-attachments/assets/55aaf668-17ac-42da-b624-fdc3c07ee1fc" />
