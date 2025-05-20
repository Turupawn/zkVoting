import { displayProposals } from './index.js';

const NETWORK_ID = 17000 // Holesky
const CONTRACT_ADDRESS = "0x35b65d079ec29ca9B1aE7874Efd0215Ae64208F1"

// Define ABI directly instead of loading from file
const CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "_proof",
				"type": "bytes"
			},
			{
				"internalType": "bytes32[]",
				"name": "_publicInputs",
				"type": "bytes32[]"
			}
		],
		"name": "castVote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			}
		],
		"name": "propose",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposalId",
				"type": "uint256"
			}
		],
		"name": "proposals",
		"outputs": [
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "forVotes",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "againstVotes",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "proposalCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

let web3;
let accounts;
let contract;

function metamaskReloadCallback() {
  window.ethereum.on('accountsChanged', () => {
    window.location.reload();
  });
  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

const getWeb3 = async () => {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask");
  }
  return new Web3(window.ethereum);
};

const getContract = async (web3) => {
  return new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
};

async function loadDapp() {
  try {
    metamaskReloadCallback();
    web3 = await getWeb3();
    
    const netId = await web3.eth.net.getId();
    if (netId !== NETWORK_ID) {
      console.log("Network ID:", netId);
      console.log("Network ID:", NETWORK_ID);
      document.getElementById("web3_message").textContent = "Please connect to Holesky network";
      return;
    }

    contract = await getContract(web3);
    // Display proposals right after getting the contract
    await displayProposals();
    
    accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      onWalletConnected();
    } else {
      document.getElementById("web3_message").textContent = "Please connect wallet";
      document.getElementById("connect_button").style.display = "block";
      document.getElementById("connected_section").style.display = "none";
    }
  } catch (error) {
    console.error("Error loading dapp:", error);
    document.getElementById("web3_message").textContent = error.message;
  }
}

async function connectWallet() {
  try {
    accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    onWalletConnected();
  } catch (error) {
    console.error("Error connecting wallet:", error);
  }
}

function onWalletConnected() {
  document.getElementById("connect_button").style.display = "none";
  document.getElementById("web3_message").textContent = "Connected!";
  document.getElementById("wallet_address").textContent = `Wallet: ${accounts[0]}`;
  document.getElementById("connected_section").style.display = "block";
  document.getElementById("forms").style.display = "block";
}

// Contract interaction functions
async function submitAdminProof(proofBytes, publicInputs) {
  console.log(proofBytes);
  console.log(publicInputs);
  try {
    await contract.methods.init(proofBytes, publicInputs)
      .send({ from: accounts[0] })
      .on('transactionHash', (hash) => {
        document.getElementById("web3_message").textContent = "Transaction pending...";
      })
      .on('receipt', (receipt) => {
        document.getElementById("web3_message").textContent = "Success!";
      });
  } catch (error) {
    console.error("Error submitting admin proof:", error);
    document.getElementById("web3_message").textContent = "Transaction failed";
  }
}

async function submitPlayerProof(proofBytes, publicInputs) {
  try {
    await contract.methods.playWord(proofBytes, publicInputs)
      .send({ from: accounts[0] })
      .on('transactionHash', (hash) => {
        document.getElementById("web3_message").textContent = "Transaction pending...";
      })
      .on('receipt', (receipt) => {
        document.getElementById("web3_message").textContent = "Success!";
      });
  } catch (error) {
    console.error("Error submitting player proof:", error);
    document.getElementById("web3_message").textContent = "Transaction failed";
  }
}

async function submitProposal(description, deadline) {
  try {
    await contract.methods.propose(description, deadline)
      .send({ from: accounts[0] })
      .on('transactionHash', (hash) => {
        document.getElementById("web3_message").textContent = "Proposal submission pending...";
      })
      .on('receipt', (receipt) => {
        document.getElementById("web3_message").textContent = "Proposal submitted successfully!";
      });
  } catch (error) {
    console.error("Error submitting proposal:", error);
    document.getElementById("web3_message").textContent = "Proposal submission failed";
    throw error;
  }
}

async function castVote(proofBytes, publicInputs) {
  try {
    await contract.methods.castVote(proofBytes, publicInputs)
      .send({ from: accounts[0] })
      .on('transactionHash', (hash) => {
        document.getElementById("web3_message").textContent = "Vote casting pending...";
      })
      .on('receipt', (receipt) => {
        document.getElementById("web3_message").textContent = "Vote cast successfully!";
      });
  } catch (error) {
    console.error("Error casting vote:", error);
    document.getElementById("web3_message").textContent = "Vote casting failed";
    throw error;
  }
}

// Add delay helper function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getProposals() {
  try {
    let i = 0;
    const proposals = [];
    
    while (true) {
      try {
        const proposal = await contract.methods.proposals(i).call();
        // If deadline is 0, we've reached the end of valid proposals
        if (proposal.deadline === '0') {
          break;
        }
        proposals.push({
          id: i,
          ...proposal
        });
        i++;
        
        // Add a small delay between requests to avoid rate limiting
        await delay(100);
      } catch (error) {
        // If we get a rate limit error, wait longer and retry
        if (error.message && error.message.includes('rate limit exceeded')) {
          console.log('Rate limit hit, waiting 2 seconds...');
          await delay(2000);
          continue;
        }
        // If it's any other error, we've probably reached the end of proposals
        break;
      }
    }
    
    return proposals;
  } catch (error) {
    console.error("Error getting proposals:", error);
    throw error;
  }
}

export { loadDapp, connectWallet, submitAdminProof, submitPlayerProof, submitProposal, castVote, getProposals }; 