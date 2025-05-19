import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';
import circuit from './circuit/target/zk_votes.json';

import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";

// Initialize Noir
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);

export const show = (id, content) => {
  const container = document.getElementById(id);
  container.appendChild(document.createTextNode(content));
  container.appendChild(document.createElement("br"));
};

export async function pedersenHashArray(inputs) {
  const backend = new UltraHonkBackend(circuit.bytecode);
  await backend.instantiate();
  
  // Convert all inputs to BigInt
  const bigIntInputs = inputs.map(input => BigInt(input));
  
  const hash = await backend.api.pedersenHash(bigIntInputs, 0);
  
  // Handle different return types from pedersenHash
  if (typeof hash === 'bigint') {
    return hash;
  }
  
  if (hash.constructor.name === 'Fr' && hash.value instanceof Uint8Array) {
    const hexString = Array.from(hash.value)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return BigInt('0x' + hexString);
  }
  
  if (hash instanceof Uint8Array) {
    const hexString = Array.from(hash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return BigInt('0x' + hexString);
  }
  
  throw new Error(`Invalid hash result from pedersenHash: ${hash}`);
}

export async function computeMerkleTree(leaves) {
  // Convert all leaves to BigInt
  const bigIntLeaves = leaves.map(leaf => BigInt(leaf));
  
  // Helper function to build a level of the tree
  const buildLevel = async (nodes) => {
    if (nodes.length === 1) return nodes;
    
    const nextLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] || left; // If odd number of nodes, duplicate the last one
      const hash = await pedersenHashArray([left, right]);
      nextLevel.push(hash);
    }
    return nextLevel;
  };

  // Build the tree level by level
  const buildTree = async (nodes) => {
    const tree = [nodes]; // Start with leaves
    let currentLevel = nodes;
    
    while (currentLevel.length > 1) {
      currentLevel = await buildLevel(currentLevel);
      tree.push(currentLevel);
    }
    
    return tree;
  };

  show("logs", "Building Merkle tree... ⏳");
  const tree = await buildTree(bigIntLeaves);
  show("logs", "Merkle tree built... ✅");

  // Create array of leaves with their merkle paths
  const leavesWithPaths = bigIntLeaves.map((leaf, index) => {
    const path = [];
    let currentIndex = index;
    
    for (let level = 0; level < tree.length - 1; level++) {
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < tree[level].length) {
        path.push({
          value: tree[level][siblingIndex],
          isRight: !isRight
        });
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return {
      leaf,
      path
    };
  });

  return {
    leaves: leavesWithPaths,
    root: tree[tree.length - 1][0]
  };
}

export async function generateVoteProof(voteData) {
  const { leaves, rootHash, merklePaths, privateKey, proposalId, vote, index } = voteData;
  
  // Initialize noir with precompiled circuit
  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);
  
  // Get the merkle path for the current index
  const note_hash_path = merklePaths[index].map(hash => 
    typeof hash === 'string' ? BigInt('0x' + hash.replace(/0x/gi, '')).toString() : hash.toString()
  );

  console.log(note_hash_path);
  
  // Prepare inputs for the circuit
  const inputs = {
    root: rootHash.toString(),
    index: index.toString(),
    priv_key: privateKey,
    note_hash_path,
    proposalId: proposalId.toString(),
    vote: vote.toString()
  };

  console.log(inputs);
  
  show("logs", "AxxGenerating witness... ⏳");
  const { witness } = await noir.execute(inputs);
  show("logs", "AGenerated witness... ✅");
  
  show("logs", "AGenerating proof... ⏳");
  const proof = await backend.generateProof(witness, { keccak: true });
  show("logs", "AGenerated proof... ✅");
  
  show('logs', 'AVerifying proof... ⌛');
  const isValid = await backend.verifyProof(proof, { keccak: true });
  show("logs", `AProof is ${isValid ? "valid" : "invalid"}... ✅`);
  
  const proofBytes = '0x' + Array.from(Object.values(proof.proof))
    .map(n => n.toString(16).padStart(2, '0'))
    .join('');
  
  console.log(proofBytes);
  console.log(proof.publicInputs);
  
  return {
    proofBytes,
    publicInputs: proof.publicInputs
  };
}