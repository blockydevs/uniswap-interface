# Human Protocol links

- Website: [uniswap.org](https://https://humanprotocol.org/)
- Twitter: [@HumanProtocol](http://hmt.ai/twitter)
- Email: [contact@uniswap.org](mailto:contact@uniswap.org)
- Discord: [Human Protocol](http://hmt.ai/discord)
- GitHub: [Human Protocol](http://hmt.ai/github)
- LinkedIn: [Human Protocol](http://hmt.ai/linkedin)
- Youtube: [Human Protocol](https://www.youtube.com/@HUMANProtocol)


## Overview

This repository is a fork of the Uniswap Interface, a decentralized trading protocol, guaranteeing secure and efficient transactions on the Ethereum blockchain. The original Uniswap Interface can be found [here](https://github.com/Uniswap/interface).

Our project modifies the Uniswap Interface to introduce our user-friendly and transparent custom governance system, where users can efficiently navigate, explore, and actively participate in the governance structure of the primary hub chain and understand the activities of the associated spoke chains.


## Key Features

- PROPOSAL LIST: Our app offers a holistic view of hub governance proposals, presenting key details such as proposal numbers, titles, descriptions, and their current statuses in an intuitive and easy-to-navigate format.

- PROPOSAL DETAILS: Users can access comprehensive information about individual proposals from any spoke chain. Each proposal's purpose, proposed actions, and associated voting details are readily available, offering a deep understanding of its context and potential impact on the governance structure. Prominently displayed proposal status indicators (e.g., active, succeeded, defeated) provide transparency and enable users to quickly assess the state of the proposal.

- VOTING: Our application facilitates active participation in the decision-making process across the hub and spoke chains. Users can vote on hub chain proposals either from the hub chain using its specific tokens or from any spoke chain using the respective spoke chain tokens. Voting options include 'for', 'against', or 'abstain', with abstain votes counting towards quorum. The voting process is encapsulated in a single transaction for the user's convenience.

- TOKEN EXCHANGE: The application supports the exchange of tokens between hmt and vhmt. The vhmt tokens are used for voting, providing users with a seamless way to participate in the governance process.


## Prerequisites

Before you proceed, ensure that you have the following installed:
- Node.js (version 14 is recommended)
- NVM (Node Version Manager)
- Yarn


## Environment Variables

The application uses the following environment variables:

`REACT_APP_GOVERNANCE_HUB_ADDRESS="0xd4526Eeb5C8dca40286eFB68dF91dC02Df615Ae4"
REACT_APP_HUB_VOTE_TOKEN_ADDRESS="0x26FBbC47D41616DC0061Ee538F4b50d85f0F1F84"
REACT_APP_GOVERNANCE_SPOKE_ADRESSES="0xC306b0E662F19ca12e64221C84b1da68bc767ABd"
REACT_APP_SPOKE_VOTE_TOKEN_ADDRESSES="0xb8C720f4fa8BC6A5774315Ca2fF4e298D3bCCc3a"`

These variables correspond to the Ethereum addresses of different components of our governance system. You can modify them as per your needs.


## Setup and Installation

Follow the steps below to set up the project on your local machine:

- Clone the repository using the following command: git clone https://github.com/blockydevs/uniswap-interface.git
- Check your Node.js version by typing node --version in your terminal. If your Node.js version is not 14, follow these steps:
    * Install NVM following instructions here
    * Open your terminal as an administrator and type nvm install 14
    * After successful installation, type nvm use 14
- Install Yarn globally using the command npm install -g yarn
- Open the uniswap-interface folder in your code editor
- Install the necessary Node modules by typing yarn install in your terminal
- Start the local development server using yarn start
- The project should automatically open in a new tab in your default browser. If not, manually navigate to localhost:3000 in your browser


## Troubleshooting

- If you encounter an error when checking your Node.js version, it most likely means Node.js has not been correctly installed, and you should consider reinstalling it.
- If you encounter errors related to missing packages after installing Node modules, try running yarn install again and restarting the project.