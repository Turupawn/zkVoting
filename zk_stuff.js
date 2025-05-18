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

export async function generateProof(word, winnerAddress) {
  // Initialize noir with precompiled circuit
  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);
  
  // Convert word to array
  const wordArray = Array.from(word)
    .map(char => char.charCodeAt(0).toString())
    .concat(Array(10 - word.length).fill("0"));
  
  show("logs", "Generating witness... ⏳");
  const { witness } = await noir.execute({ 
    word: wordArray,
    word_length: word.length,
    winner: winnerAddress
  });
  show("logs", "Generated witness... ✅");
  
  show("logs", "Generating proof... ⏳");
  const proof = await backend.generateProof(witness, { keccak: true });
  show("logs", "Generated proof... ✅");

  show('logs', 'Verifying proof... ⌛');
  const isValid = await backend.verifyProof(proof, { keccak: true });
  show("logs", `Proof is ${isValid ? "valid" : "invalid"}... ✅`);
  
  const proofBytes = '0x' + Array.from(Object.values(proof.proof))
    .map(n => n.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    proofBytes,
    publicInputs: proof.publicInputs,
    rawProof: proof.proof
  };
}

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

export async function generateMerkleProof() {
  // Initialize noir with precompiled circuit
  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);
  
  // Dummy values for testing - make sure they're strings to match Prover.toml format
  const inputs = {
    index: "0",
    leaf: "1",
    note_hash_path: [
      "2",
      "3201571638824892542293291737096744916910129686872124558524447157776960499912"
    ]
  };
  
  show("logs", "Generating witness... ⏳");
  try {
    const startTime = performance.now(); // More precise than Date.now()
    console.log("Start time:", startTime);
    
    const { witness } = await noir.execute(inputs);
    show("logs", "Generated witness... ✅");
    
    show("logs", "Generating proof... ⏳");
    const proof = await backend.generateProof(witness, { keccak: false });
    
    const endTime = performance.now();
    console.log("End time:", endTime);
    
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    console.log(`Total execution time: ${duration.toFixed(3)} seconds`);

    show("logs", "Generated proof... ✅");

    show('logs', 'Verifying proof... ⌛');
    const isValid = await backend.verifyProof(proof, { keccak: false });
    show("logs", `Proof is ${isValid ? "valid" : "invalid"}... ✅`);
    
    const proofBytes = '0x' + Array.from(Object.values(proof.proof))
      .map(n => n.toString(16).padStart(2, '0'))
      .join('');
    
    return {
      proofBytes,
      publicInputs: proof.publicInputs,
      rawProof: proof.proof
    };
  } catch (error) {
    show("logs", `Error: ${error.message}`);
    throw error;
  }
}