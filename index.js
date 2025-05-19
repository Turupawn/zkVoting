import { loadDapp, submitAdminProof, submitPlayerProof, submitProposal, castVote, connectWallet, getProposals } from './web3_stuff.js';
import { show, computeMerkleTree, pedersenHashArray, generateVoteProof } from './zk_stuff.js';

// Initialize dapp
loadDapp();

// Add connect wallet event listener
document.getElementById("connect_button").addEventListener("click", connectWallet);

document.getElementById("compute_merkle_hash").addEventListener("click", async () => {
    const leftLeaf = Math.floor(Math.random() * 1000) + 1;
    const rightLeaf = Math.floor(Math.random() * 1000) + 1;

    const leaves = [1, 2, 3, 4].map(n => BigInt(n));
    const { leaves: leavesWithPaths, root } = await computeMerkleTree(leaves);
    show("results", `Merkle Root: ${root}`);
    show("results", `Merkle Leaves: ${leavesWithPaths}`);
    console.log(root);
    console.log(leavesWithPaths);
});

document.getElementById("compute_hash").addEventListener("click", async () => {
  const input = document.getElementById("hash_input").value;
  try {
    const hash = await pedersenHashArray([input]);
    document.getElementById("hash_result").value = `0x${hash.toString(16)}`;
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

document.getElementById("compute_two_hash").addEventListener("click", async () => {
  const input1 = document.getElementById("hash_input1").value;
  const input2 = document.getElementById("hash_input2").value;
  try {
    const hash = await pedersenHashArray([input1, input2]);
    document.getElementById("two_hash_result").value = `0x${hash.toString(16)}`;
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

// Function to format timestamp
function formatDate(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

// Function to display proposals
async function displayProposals() {
  try {
    const proposals = await getProposals();
    const proposalsList = document.getElementById("proposals_list");
    proposalsList.innerHTML = ''; // Clear existing content
    
    if (proposals.length === 0) {
      proposalsList.innerHTML = '<p>No proposals found</p>';
      return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px;">ID</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Deadline</th>
        <th style="border: 1px solid #ddd; padding: 8px;">For Votes</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Against Votes</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add proposals
    const tbody = document.createElement('tbody');
    proposals.forEach(proposal => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="border: 1px solid #ddd; padding: 8px;">${proposal.id}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${proposal.description}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${formatDate(proposal.deadline)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${proposal.forVotes}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${proposal.againstVotes}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    proposalsList.appendChild(table);
  } catch (error) {
    show("results", `Error loading proposals: ${error.message}`);
  }
}

// Add event listener for refresh button
document.getElementById("refresh_proposals").addEventListener("click", displayProposals);

// Modify submitProposal to refresh the list after submission
document.getElementById("submit_proposal").addEventListener("click", async () => {
  const description = document.getElementById("proposal_description").value;
  const deadline = document.getElementById("proposal_deadline").value;
  
  try {
    await submitProposal(description, deadline);
    show("results", "Proposal submitted successfully!");
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

// Display proposals when page loads
document.addEventListener('DOMContentLoaded', displayProposals);

document.getElementById("compute_vote_tree").addEventListener("click", async () => {
  const leaves = [
    document.getElementById("vote_leaf1").value,
    document.getElementById("vote_leaf2").value,
    document.getElementById("vote_leaf3").value,
    document.getElementById("vote_leaf4").value
  ];
  
  try {
    // Compute first level hashes
    const level1Hash1 = await pedersenHashArray([leaves[0], leaves[1]]);
    const level1Hash2 = await pedersenHashArray([leaves[2], leaves[3]]);
    
    // Compute root hash
    const rootHash = await pedersenHashArray([level1Hash1, level1Hash2]);
    
    // Create merkle paths for each leaf as strings, ensuring they're within field modulus
    const merklePaths = {
      0: [
        BigInt('0x' + leaves[1].replace(/0x/gi, '')).toString(),
        level1Hash2.toString()
      ],
      1: [
        BigInt('0x' + leaves[0].replace(/0x/gi, '')).toString(),
        level1Hash2.toString()
      ],
      2: [
        BigInt('0x' + leaves[3].replace(/0x/gi, '')).toString(),
        level1Hash1.toString()
      ],
      3: [
        BigInt('0x' + leaves[2].replace(/0x/gi, '')).toString(),
        level1Hash1.toString()
      ]
    };

    console.log(merklePaths)
    
    // Format the tree visualization
    const tree = `└─ 0x${rootHash.toString(16)}
   ├─ 0x${level1Hash1.toString(16)}
   │  ├─ 0x${BigInt('0x' + leaves[0].replace(/0x/gi, '')).toString(16)}
   │  └─ 0x${BigInt('0x' + leaves[1].replace(/0x/gi, '')).toString(16)}
   └─ 0x${level1Hash2.toString(16)}
      ├─ 0x${BigInt('0x' + leaves[2].replace(/0x/gi, '')).toString(16)}
      └─ 0x${BigInt('0x' + leaves[3].replace(/0x/gi, '')).toString(16)}`;
    
    document.getElementById("vote_tree_result").value = tree;
    
    // Store data in localStorage
    localStorage.setItem('voteTree', tree);
    localStorage.setItem('voteLeaves', JSON.stringify(leaves));
    localStorage.setItem('voteRootHash', rootHash.toString());
    localStorage.setItem('voteMerklePaths', JSON.stringify(merklePaths));
    
    console.log("Stored merkle paths:", merklePaths);
    console.log("Stored data:", {
      tree,
      leaves,
      rootHash: rootHash.toString(),
      merklePaths
    });
    
    show("results", "Tree computed and stored successfully!");
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

document.getElementById("cast_vote").addEventListener("click", async () => {
  // Check if tree data exists in localStorage
  const storedTree = localStorage.getItem('voteTree');
  const storedLeaves = localStorage.getItem('voteLeaves');
  const storedRootHash = localStorage.getItem('voteRootHash');
  const storedMerklePaths = localStorage.getItem('voteMerklePaths');
  
  console.log("Retrieved from storage:", {
    tree: storedTree,
    leaves: storedLeaves,
    rootHash: storedRootHash,
    merklePaths: storedMerklePaths
  });
  
  if (!storedTree || !storedLeaves || !storedRootHash || !storedMerklePaths) {
    show("results", "Please compute the vote tree first!");
    return;
  }
  
  const privateKey = document.getElementById("vote_private_key").value;
  const proposalId = document.getElementById("vote_proposal_id").value;
  const vote = document.getElementById("vote_value").value;
  
  if (!privateKey || !proposalId || vote === '') {
    show("results", "Please fill in all required fields!");
    return;
  }
  
  try {
    // Find the index of the private key's hash in the leaves
    const privKeyHash = await pedersenHashArray([privateKey]);
    const leaves = JSON.parse(storedLeaves);
    const index = leaves.findIndex(leaf => 
      BigInt('0x' + leaf.replace(/0x/gi, '')) === privKeyHash
    );
    
    if (index === -1) {
      show("results", "Private key hash not found in the tree!");
      return;
    }
    
    console.log(1111111)
    const { proofBytes, publicInputs } = await generateVoteProof({
      leaves: JSON.parse(storedLeaves),
      rootHash: BigInt(storedRootHash),
      merklePaths: JSON.parse(storedMerklePaths),
      privateKey,
      proposalId,
      vote,
      index
    });
    console.log(2222222)

    
    await castVote(proofBytes, publicInputs);
    show("results", "Vote cast successfully!");
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

// Function to load stored tree
function loadStoredTree() {
  console.log("Loading stored tree");
  const storedTree = localStorage.getItem('voteTree');
  if (storedTree) {
    document.getElementById("vote_tree_result").value = storedTree;
    console.log("Tree loaded from storage:", storedTree);
  } else {
    console.log("No stored tree found");
  }
}

loadStoredTree()