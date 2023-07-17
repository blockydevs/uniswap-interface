# Human Protocol links

- Website: [hmanprotocol.org](https://humanprotocol.org/)
- Email: [contact@uniswap.org](mailto:contact@uniswap.org)
- Twitter: [link](http://hmt.ai/twitter)
- Discord: [link](http://hmt.ai/discord)
- GitHub: [link](http://hmt.ai/github)
- LinkedIn: [link](http://hmt.ai/linkedin)
- Youtube: [link](https://www.youtube.com/@HUMANProtocol)


## Overview

This repository is a fork of the Uniswap Interface, a decentralized trading protocol, guaranteeing secure and efficient transactions on the Ethereum blockchain. The original Uniswap Interface can be found [here](https://github.com/Uniswap/interface).

Our project modifies the Uniswap Interface to introduce our user-friendly and transparent custom governance system, where users can efficiently navigate, explore, and actively participate in the governance structure of the primary hub chain and understand the activities of the associated spoke chains.


## Prerequisites

Before you proceed, ensure that you have the following installed:
- Node.js (version 14 is required) - it's the JavaScript runtime that allows us to run our JavaScript code server-side,
[download link](https://nodejs.org/en/download) 
- NVM (Node Version Manager) - a tool that allows you to install and manage multiple versions of Node.js,
- Yarn - Human Governor uses Yarn to handle its dependencies, making it a necessary tool for the project setup.



## Environment Variables

The application uses the following environment variables:

`
ESLINT_NO_DEV_ERRORS=true
REACT_APP_AMPLITUDE_PROXY_URL="https://api.uniswap.org/v1/amplitude-proxy"
REACT_APP_AWS_API_REGION="us-east-2"
REACT_APP_AWS_API_ENDPOINT="https://beta.api.uniswap.org/v1/graphql"
REACT_APP_BNB_RPC_URL="https://rough-sleek-hill.bsc.quiknode.pro/413cc98cbc776cda8fdf1d0f47003583ff73d9bf"
REACT_APP_INFURA_KEY="081241040847461bbcbdcef717b7c297"

REACT_APP_MOONPAY_API="https://api.moonpay.com"
REACT_APP_MOONPAY_LINK="https://us-central1-uniswap-mobile.cloudfunctions.net/signMoonpayLinkV2?platform=web&env=staging"
REACT_APP_MOONPAY_PUBLISHABLE_KEY="pk_test_DycfESRid31UaSxhI5yWKe1r5E5kKSz"
REACT_APP_SENTRY_DSN="https://a3c62e400b8748b5a8d007150e2f38b7@o1037921.ingest.sentry.io/4504255148851200"
REACT_APP_STATSIG_PROXY_URL="https://api.uniswap.org/v1/statsig-proxy"
REACT_APP_TEMP_API_URL="https://temp.api.uniswap.org/v1"

REACT_APP_GOVERNANCE_HUB_ADDRESS="0xbE7E84e22d1a023B31D6eFEcEcBf2c5C603340d2"
REACT_APP_HUB_VOTE_TOKEN_ADDRESS="0xB0bcE7e4F51b3298e3D209e17aEdC6DC8aCbfd15"

REACT_APP_GOVERNANCE_SPOKE_ADRESSES="0x9b5Caca66FeA7e5f9Cb3D04C0b1f7481972664c5"
REACT_APP_SPOKE_VOTE_TOKEN_ADDRESSES="0x61031f9db9a50c1564BC1d59857401986e41D8c3"
`

These variables correspond to the Ethereum addresses of different components of our governance system. You can modify them as per your needs.


## Setup and Installation

Follow the steps below to set up the project on your local machine:

- Clone the repository using the following command: `git clone https://github.com/blockydevs/uniswap-interface.git`
- Check your Node.js version by typing `node --version` in your terminal. If your Node.js version is not 14, follow these steps:
    * Install NVM following instructions [here](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
    * Open your terminal as an administrator and type `nvm install 14`
    * After successful installation, type `nvm use 14`
- Install Yarn globally using the command `npm install -g yarn` - [download link](https://yarnpkg.com/cli/install)
- Open the uniswap-interface folder in your code editor
- Install the necessary Node modules by typing `yarn install` in your terminal
- Start the local development server using `yarn start`
- The project should automatically open in a new tab in your default browser. If not, manually navigate to `localhost:3000` in your browser


## Troubleshooting

- If you encounter an error when checking your Node.js version, it most likely means that Node.js has not been correctly installed, and you should consider reinstalling it.
- If you encounter errors related to missing packages after installing Node modules, try running yarn install again and restart the project.


## Key App Features

- PROPOSAL LIST: Our app offers a holistic view of hub governance proposals, presenting key details such as proposal numbers, titles, descriptions, and their current statuses in an intuitive and easy-to-navigate format.

- PROPOSAL DETAILS: Users can access comprehensive information about individual proposals from any spoke chain. Each proposal's purpose, proposed actions, and associated voting details are readily available, offering a deep understanding of its context and potential impact on the governance structure. Prominently displayed proposal status indicators (e.g., active, succeeded, defeated) provide transparency and enable users to quickly assess the state of the proposal.

- VOTING: Our application facilitates active participation in the decision-making process across the hub and spoke chains. Users can vote on hub chain proposals either from the hub chain using its specific tokens or from any spoke chain using the respective spoke chain tokens. Voting options include 'for', 'against', or 'abstain', with abstain votes counting towards quorum. The voting process is encapsulated in a single transaction for the user's convenience.

- TOKEN EXCHANGE: The application supports the exchange of tokens between hmt and vhmt. The vhmt tokens are used for voting, providing users with a seamless way to participate in the governance process.