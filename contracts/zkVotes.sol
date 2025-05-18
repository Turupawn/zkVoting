//SPDX-License-Identifier: MIT
pragma solidity >=0.8.22;


interface IVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}

contract zkVoting {

    struct Proposal {
        string description;
        uint deadline;
        uint forVotes;
        uint againstVotes;
    }

    IVerifier noirVerifier;

    bytes32 merkleRoot;
    uint proposalCount;
    mapping (uint proposalId => Proposal) public proposals;
    mapping (bytes32 nullifier => bool isNullified) public nullifiers;

    constructor(bytes32 _merkleRoot, address noirVerifierAddress) {
        merkleRoot = _merkleRoot;
        noirVerifier = IVerifier(noirVerifierAddress);
    }

    function propose(string memory description, uint deadline) public {
        proposals[proposalCount] = Proposal(description, deadline, 0, 0);
        proposalCount += 1;
    }

    function castVote(bytes calldata _proof, bytes32[] calldata _publicInputs) public {
        require(noirVerifier.verify(_proof, _publicInputs) ==  true, "Invalid proof");
        bytes32 merkleRootPublicInput = _publicInputs[0];
        uint proposalId = uint(_publicInputs[1]);
        uint vote = uint(_publicInputs[2]);
        bytes32 nullifier = _publicInputs[3];

        require(block.timestamp < proposals[proposalId].deadline, "Voting period is over");
        require(merkleRoot == merkleRootPublicInput, "Invalid merke root");
        require(!nullifiers[nullifier], "Vote already casted");

        nullifiers[nullifier] = true;

        if(vote == 1)
            proposals[proposalId].forVotes += 1;
        else if (vote == 2)
            proposals[proposalId].againstVotes += 1;
    }
}