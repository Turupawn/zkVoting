import { loadDapp, submitAdminProof, submitPlayerProof, submitProposal, castVote, connectWallet } from './web3_stuff.js';
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
    
    // Create merkle paths for each leaf
    const merklePaths = {
      0: [leaves[1], level1Hash2], // Path for leaf 0
      1: [leaves[0], level1Hash2], // Path for leaf 1
      2: [leaves[3], level1Hash1], // Path for leaf 2
      3: [leaves[2], level1Hash1]  // Path for leaf 3
    };
    
    // Format the tree visualization
    const tree = `└─ 0x${rootHash.toString(16)}
   ├─ 0x${level1Hash1.toString(16)}
   │  ├─ 0x${BigInt('0x' + leaves[0].replace(/0x/gi, '')).toString(16)}
   │  └─ 0x${BigInt('0x' + leaves[1].replace(/0x/gi, '')).toString(16)}
   └─ 0x${level1Hash2.toString(16)}
      ├─ 0x${BigInt('0x' + leaves[2].replace(/0x/gi, '')).toString(16)}
      └─ 0x${BigInt('0x' + leaves[3].replace(/0x/gi, '')).toString(16)}`;
    
    document.getElementById("vote_tree_result").value = tree;
    
    // Store the computed values for the vote
    window.voteData = {
      leaves,
      rootHash,
      merklePaths
    };
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

document.getElementById("cast_vote").addEventListener("click", async () => {
  if (!window.voteData) {
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
    const index = window.voteData.leaves.findIndex(leaf => 
      BigInt('0x' + leaf.replace(/0x/gi, '')) === privKeyHash
    );
    
    if (index === -1) {
      show("results", "Private key hash not found in the tree!");
      return;
    }
    
    const { proofBytes, publicInputs } = await generateVoteProof({
      ...window.voteData,
      privateKey,
      proposalId,
      vote,
      index
    });
    
    await castVote(proofBytes, publicInputs);
    show("results", "Vote cast successfully!");
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});