/* ═══════════════════════════════════════════
   StellarMint — Contract Integration & App Logic
   ═══════════════════════════════════════════ */

import * as StellarSdk from '@stellar/stellar-sdk';
import { isConnected, getAddress, signTransaction, isAllowed, setAllowed } from '@stellar/freighter-api';

// ────────────────────────────────────────────
//  CONFIG — Update these after deploying your contract
// ────────────────────────────────────────────
const CONFIG = {
  // Replace with your deployed contract address
  contractId: 'CAXGFIVRVXFNP6EYEBZL4UNXY4CHPARPTFGU6YKVORZJGWHENEUFHERA',
  networkPassphrase: StellarSdk.Networks.TESTNET,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  network: 'TESTNET',
};

// ────────────────────────────────────────────
//  STATE
// ────────────────────────────────────────────
let walletAddress = null;
let rpcServer = null;

// ────────────────────────────────────────────
//  INITIALIZATION
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  rpcServer = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl);
  initUI();
  loadGallery();
  loadStats();
});

function initUI() {
  // Wallet button
  document.getElementById('btn-wallet').addEventListener('click', handleWallet);

  // Mint form
  document.getElementById('mint-form').addEventListener('submit', handleMint);

  // Live preview
  document.getElementById('nft-name').addEventListener('input', updatePreview);
  document.getElementById('nft-description').addEventListener('input', updatePreview);
  document.getElementById('nft-image').addEventListener('input', updatePreview);

  // Gallery refresh
  document.getElementById('btn-refresh').addEventListener('click', loadGallery);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Transfer
  document.getElementById('btn-transfer').addEventListener('click', handleTransfer);

  // Footer contract address
  document.getElementById('footer-contract').textContent = shortenAddress(CONFIG.contractId);
}

// ────────────────────────────────────────────
//  WALLET CONNECTION (Freighter)
// ────────────────────────────────────────────
async function handleWallet() {
  const btn = document.getElementById('btn-wallet');

  if (walletAddress) {
    // Disconnect
    walletAddress = null;
    btn.innerHTML = '<span class="wallet-dot"></span> Connect Wallet';
    btn.classList.remove('wallet-connected');
    updateMintButton();
    toast('Wallet disconnected', 'info');
    return;
  }

  try {
    const connected = await isConnected();
    if (!connected) {
      toast('Please install the Freighter wallet extension', 'error');
      window.open('https://www.freighter.app/', '_blank');
      return;
    }

    const allowed = await isAllowed();
    if (!allowed) {
      await setAllowed();
    }

    const addressObj = await getAddress();
    if (addressObj.error) {
      toast('Failed to get address: ' + addressObj.error, 'error');
      return;
    }

    walletAddress = addressObj.address;
    btn.innerHTML = `<span class="wallet-dot"></span> ${shortenAddress(walletAddress)}`;
    btn.classList.add('wallet-connected');
    updateMintButton();
    toast('Wallet connected!', 'success');
  } catch (err) {
    console.error('Wallet connection failed:', err);
    toast('Wallet connection failed. Is Freighter installed?', 'error');
  }
}

function updateMintButton() {
  const btn = document.getElementById('btn-mint');
  const text = btn.querySelector('.btn-text');
  if (walletAddress) {
    btn.disabled = false;
    text.textContent = 'Mint NFT 🚀';
  } else {
    btn.disabled = true;
    text.textContent = 'Connect Wallet to Mint';
  }
}

// ────────────────────────────────────────────
//  LIVE PREVIEW
// ────────────────────────────────────────────
function updatePreview() {
  const name = document.getElementById('nft-name').value || 'Your NFT Name';
  const desc = document.getElementById('nft-description').value || 'Your description here...';
  const imgUrl = document.getElementById('nft-image').value;

  document.getElementById('preview-name').textContent = name;
  document.getElementById('preview-desc').textContent = desc;

  const previewImg = document.getElementById('preview-img');
  const placeholder = document.getElementById('img-placeholder');

  if (imgUrl) {
    previewImg.src = imgUrl;
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
    previewImg.onerror = () => {
      previewImg.style.display = 'none';
      placeholder.style.display = 'flex';
    };
  } else {
    previewImg.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

// ────────────────────────────────────────────
//  SOROBAN CONTRACT HELPERS
// ────────────────────────────────────────────

/**
 * Build and submit a contract invocation transaction.
 */
async function invokeContract(method, args, isReadOnly = false) {
  const contract = new StellarSdk.Contract(CONFIG.contractId);

  if (isReadOnly) {
    // Simulate only — no signing needed
    const account = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const result = await rpcServer.simulateTransaction(tx);
    if (StellarSdk.SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(result.error || 'Simulation failed');
    }
    return result;
  }

  // State-changing transaction — needs signing
  if (!walletAddress) throw new Error('Wallet not connected');

  const account = await rpcServer.getAccount(walletAddress);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  // Simulate to get proper resource values
  const simResult = await rpcServer.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(simResult.error || 'Simulation failed');
  }

  // Assemble the transaction with simulation data
  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();

  // Sign with Freighter
  const signedResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: CONFIG.networkPassphrase,
    network: CONFIG.network,
  });

  if (signedResult.error) {
    throw new Error(signedResult.error);
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedResult.signedTxXdr,
    CONFIG.networkPassphrase
  );

  // Submit
  const sendResult = await rpcServer.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  // Poll for result
  let getResult;
  let attempts = 0;
  do {
    await sleep(2000);
    getResult = await rpcServer.getTransaction(sendResult.hash);
    attempts++;
  } while (getResult.status === 'NOT_FOUND' && attempts < 30);

  if (getResult.status === 'SUCCESS') {
    return getResult;
  } else {
    throw new Error(`Transaction failed: ${getResult.status}`);
  }
}

// ────────────────────────────────────────────
//  MINT NFT
// ────────────────────────────────────────────
async function handleMint(e) {
  e.preventDefault();

  if (!walletAddress) {
    toast('Connect your wallet first!', 'error');
    return;
  }

  const name = document.getElementById('nft-name').value.trim();
  const description = document.getElementById('nft-description').value.trim();
  const image = document.getElementById('nft-image').value.trim();

  if (!name || !description || !image) {
    toast('Please fill in all fields', 'error');
    return;
  }

  const btn = document.getElementById('btn-mint');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');

  try {
    btn.disabled = true;
    btnText.textContent = 'Minting...';
    btnLoader.hidden = false;

    const minterAddress = new StellarSdk.Address(walletAddress);
    const nameStr = StellarSdk.nativeToScVal(name, { type: 'string' });
    const descStr = StellarSdk.nativeToScVal(description, { type: 'string' });
    const imageStr = StellarSdk.nativeToScVal(image, { type: 'string' });

    const result = await invokeContract('mint', [
      minterAddress.toScVal(),
      nameStr,
      descStr,
      imageStr,
    ]);

    // Extract the token ID from the result
    let tokenId = 'N/A';
    if (result.returnValue) {
      tokenId = StellarSdk.scValToNative(result.returnValue);
    }

    toast(`NFT minted successfully! Token ID: ${tokenId}`, 'success');

    // Reset form
    document.getElementById('mint-form').reset();
    updatePreview();

    // Refresh gallery and stats
    loadGallery();
    loadStats();
  } catch (err) {
    console.error('Minting failed:', err);
    toast(`Minting failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Mint NFT 🚀';
    btnLoader.hidden = true;
  }
}

// ────────────────────────────────────────────
//  LOAD GALLERY
// ────────────────────────────────────────────
async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  const loading = document.getElementById('gallery-loading');
  const empty = document.getElementById('gallery-empty');

  grid.hidden = true;
  empty.hidden = true;
  loading.hidden = false;

  try {
    // Get all token IDs
    const listResult = await invokeContract('list_all', [], true);

    if (!listResult.result || !listResult.result.retval) {
      empty.hidden = false;
      loading.hidden = true;
      return;
    }

    const tokenIds = StellarSdk.scValToNative(listResult.result.retval);

    if (!tokenIds || tokenIds.length === 0) {
      empty.hidden = false;
      loading.hidden = true;
      return;
    }

    // Fetch each NFT's details
    const nfts = [];
    for (const tokenId of tokenIds) {
      try {
        const nftResult = await invokeContract(
          'get_nft',
          [StellarSdk.nativeToScVal(tokenId, { type: 'u64' })],
          true
        );
        if (nftResult.result && nftResult.result.retval) {
          const nft = StellarSdk.scValToNative(nftResult.result.retval);
          nfts.push({ tokenId, ...nft });
        }
      } catch (err) {
        console.warn(`Failed to load NFT #${tokenId}:`, err);
      }
    }

    renderGallery(nfts);
    loading.hidden = true;
  } catch (err) {
    console.error('Failed to load gallery:', err);
    loading.hidden = true;
    empty.hidden = false;

    // Show empty state with a message
    const emptyText = empty.querySelector('p');
    if (emptyText) {
      emptyText.textContent = 'Could not load NFTs. The contract may not be deployed yet.';
    }
  }
}

function renderGallery(nfts) {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');

  grid.innerHTML = '';

  if (nfts.length === 0) {
    grid.hidden = true;
    empty.hidden = false;
    return;
  }

  nfts.forEach((nft) => {
    const card = document.createElement('div');
    card.className = 'nft-card';
    card.innerHTML = `
      <div class="nft-card-img">
        <img src="${escapeHtml(nft.image || '')}" alt="${escapeHtml(nft.name || 'NFT')}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="img-placeholder" style="display:none;">
          <span>🖼️</span>
          <span>No Image</span>
        </div>
      </div>
      <div class="nft-card-body">
        <h3>${escapeHtml(nft.name || 'Untitled')}</h3>
        <p>${escapeHtml(nft.description || '')}</p>
      </div>
      <div class="nft-card-footer">
        <span>Owner: ${shortenAddress(nft.owner || '')}</span>
        <span class="token-id">#${nft.tokenId}</span>
      </div>
    `;
    card.addEventListener('click', () => openModal(nft));
    grid.appendChild(card);
  });

  grid.hidden = false;
  empty.hidden = true;
}

// ────────────────────────────────────────────
//  LOAD STATS
// ────────────────────────────────────────────
async function loadStats() {
  try {
    const result = await invokeContract('total_supply', [], true);
    if (result.result && result.result.retval) {
      const total = StellarSdk.scValToNative(result.result.retval);
      document.getElementById('stat-total').textContent = total.toString();
    }
  } catch (err) {
    console.warn('Could not load stats:', err);
  }
}

// ────────────────────────────────────────────
//  NFT DETAIL MODAL
// ────────────────────────────────────────────
let currentModalNFT = null;

function openModal(nft) {
  currentModalNFT = nft;

  document.getElementById('modal-img').src = nft.image || '';
  document.getElementById('modal-name').textContent = nft.name || 'Untitled';
  document.getElementById('modal-desc').textContent = nft.description || '';
  document.getElementById('modal-id').textContent = `#${nft.tokenId}`;
  document.getElementById('modal-owner').textContent = nft.owner || 'Unknown';

  // Show transfer section if current user is the owner
  const transferSection = document.getElementById('transfer-section');
  if (walletAddress && nft.owner === walletAddress) {
    transferSection.hidden = false;
  } else {
    transferSection.hidden = true;
  }

  document.getElementById('transfer-to').value = '';

  const overlay = document.getElementById('modal-overlay');
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.hidden = true;
    currentModalNFT = null;
  }, 300);
}

// ────────────────────────────────────────────
//  TRANSFER NFT
// ────────────────────────────────────────────
async function handleTransfer() {
  if (!currentModalNFT || !walletAddress) return;

  const toAddress = document.getElementById('transfer-to').value.trim();
  if (!toAddress) {
    toast('Please enter a recipient address', 'error');
    return;
  }

  // Validate Stellar address
  if (!toAddress.startsWith('G') || toAddress.length !== 56) {
    toast('Invalid Stellar address', 'error');
    return;
  }

  const btn = document.getElementById('btn-transfer');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');

  try {
    btn.disabled = true;
    btnText.textContent = 'Transferring...';
    btnLoader.hidden = false;

    const fromAddr = new StellarSdk.Address(walletAddress);
    const toAddr = new StellarSdk.Address(toAddress);
    const tokenIdVal = StellarSdk.nativeToScVal(currentModalNFT.tokenId, { type: 'u64' });

    await invokeContract('transfer', [
      fromAddr.toScVal(),
      toAddr.toScVal(),
      tokenIdVal,
    ]);

    toast(`NFT #${currentModalNFT.tokenId} transferred successfully!`, 'success');
    closeModal();
    loadGallery();
  } catch (err) {
    console.error('Transfer failed:', err);
    toast(`Transfer failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Transfer NFT';
    btnLoader.hidden = true;
  }
}

// ────────────────────────────────────────────
//  UTILITIES
// ────────────────────────────────────────────
function shortenAddress(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
