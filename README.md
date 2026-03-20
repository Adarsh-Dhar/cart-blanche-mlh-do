
# 🛒 Cart-Blanche
**The Universal Orchestrator for the Autonomous Economy**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![STACKS Network](https://img.shields.io/badge/STACKS-Base_Sepolia-00E1FF)](https://STACKS.space/)

> **Cart-Blanche** transitions AI from a "passive chatbot that suggests" into an "active fiduciary that executes." By combining Google's Agentic Payment Protocol (AP2) and Coinbase's x402, software can now securely pay software without human micromanagement.


## ✨ Core Pillars & Features
* **Google AP2 (Agentic Payment Protocol):** Replaces blind trust with cryptographic certainty. Agents negotiate deterministic `CartMandates` that lock in merchant, price, and item details.
* **x402 Autonomous Settlement:** Enables seamless Machine-to-Machine (M2M) micro-transactions. Agents autonomously handle HTTP `402 Payment Required` challenges in the background.
* **STACKS BITE v2 (Threshold Encryption):** Keeps user budgets and negotiation strategies strictly private from front-running and vendor price-gouging until final settlement.
* **Multi-Merchant Batching:** A single user signature (EIP-712) can authorize a master mandate, allowing the agent to settle multiple vendor transactions simultaneously.

---

## 🏗 Architecture
Powered by **Google Agent Development Kit (ADK)** and **Gemini 2.5 Flash**, the system utilizes a hierarchical multi-agent flow:
1. **Orchestrator Agent:** Breaks down complex user goals (e.g., "Plan a wedding under $10k") into parallel sub-tasks.
2. **Shopping Agent:** Discovers products and verifies live inventory.
3. **Merchant Agent:** Generates rigid, cryptographic `CartMandate` offers.
4. **Vault Agent:** Encrypts user limits via STACKS BITE v2 and enforces EIP-712 signature verification before executing the x402 loop.

---

## ⚙️ Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Python](https://www.python.org/) (v3.10+)
# 🛒 Cart-Blanche
**The Universal Orchestrator for the Autonomous Economy**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stacks](https://img.shields.io/badge/Network-Stacks_Testnet-7026ff)](https://www.stacks.co/)
[![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-orange)](https://deepmind.google/technologies/gemini/)
[![Protocol](https://img.shields.io/badge/Protocol-USDCx_/_UCP-blue)](https://github.com/adarsh-dhar/cart-blanche-nova-ai)

> **Cart-Blanche** transitions AI from a "passive chatbot that suggests" into an "active fiduciary that executes." Built for the **Buidl Battle**, it leverages the Stacks ecosystem to allow software to securely pay software without human micromanagement.

---

## 🏗️ Architecture: The Agentic Loop
Powered by the **Google Agent Development Kit (ADK)** and **Gemini**, the system utilizes a hierarchical multi-agent flow:

1.  **Orchestrator Agent:** Decomposes complex goals (e.g., "Build a gaming YouTube setup") into specific products using a **Semantic Brainstorm RAG** to filter the live catalog.
2.  **Shopping Agent:** Discovers real-time product data and verifies inventory via the **Universal Commerce Protocol (UCP)**.
3.  **Merchant Agent:** Negotiates and generates a cryptographic `CartMandate` offer.
4.  **Settlement Agent:** Executes the **x402 autonomous payment loop** on the Stacks network.

---

## 🔐 Core Bitcoin L2 Integrations (Stacks)

### 1. x402 Autonomous Settlement via USDCx
Cart-Blanche implements the **x402 standard** to handle Machine-to-Machine (M2M) micro-transactions. When an agent encounters an HTTP `402 Payment Required` challenge, the `X402SettlementTool` autonomously settles the debt using **USDCx** (bridged USDC on Stacks).
* **SIP-010 Tokens:** Payments are processed using standard SIP-010 interfaces (USDCx and sBTC).
* **Deterministic Settlement:** The tool predicts nonces and handles Stacks broadcast responses to ensure high-reliability execution.

### 2. Secure Burner Wallet & Session Keys
To enable autonomous spending without compromising a user's primary funds, we implement a **Burner Wallet** system:
* **Creation:** The frontend generates a random Stacks private key and "funds" it via a one-time transaction from the user's main wallet.
* **Threshold Encryption:** The agent's private key is XOR-encrypted using the user's Principal as a seed and stored in the DB, ensuring it can only be used during an active session.
* **STX Drip:** A master wallet "drips" 0.5 STX to burner addresses to cover gas fees for the agent's autonomous transactions.

### 3. SIP-018 Structured Mandates
Safety is paramount. Users do not sign blind hex strings. Instead, they authorize a `CartMandate` using **SIP-018 Structured Data Signing**. This allows the Leather/Xverse wallet to display a human-readable summary of merchants, amounts, and items before the agent is granted execution power.

### 4. UCP (Universal Commerce Protocol)
The UCP "network" is integrated directly into our Prisma/PostgreSQL stack. Each product row functions as a UCP listing, where the `Vendor.pubkey` serves as the on-chain destination for x402 payments.

---

## 🛠️ Smart Contracts (Clarity)
The project includes a dedicated Clarity suite for the **USDCx Bridge**:
* **`usdcx-v1.clar`:** Manages deposit intent parsing (Keccak256), signature verification (Secp256k1), and protocol-controlled minting/burning.
* **Governance:** Includes administrative functions to manage circle-attestors and withdrawal limits.

---

## ⚙️ Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Python](https://www.python.org/) (v3.12+)
* [Clarinet](https://github.com/hirosystems/clarinet) (for contract testing)

### 1. Environment Variables (`.env`)
Configure `server/.env` with your Stacks credentials:
```env
GEMINI_API_KEY="your_key"
STACKS_AGENT_PRIVATE_KEY="your_agent_key"
USDCX_CONTRACT_ADDRESS="ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4"
```

### 2. Launch the Ecosystem
From the root directory:
```bash
chmod +x start_all.sh
./start_all.sh
```
This launches the **Next.js Frontend**, **FastAPI Agent Server**, and the **Simulated Merchant Server** simultaneously.

---

## 🧪 Testing the Flow (Demo Guide)
1.  **Fund your Wallet:** Visit `/wallet` to deposit USDCx and authorize the agent.
2.  **Ask the Agent:** *"I need a professional podcast setup under $500. Find the items and prepare a mandate."*
3.  **Sign:** Review the **SIP-018** mandate in your Stacks wallet and sign.
4.  **Verify:** Watch the **Agentic Audit Ledger** as the `X402SettlementTool` confirms the on-chain receipt.

---

## 🏆 Buidl Battle Submission
* **Innovation:** First-of-its-kind integration of x402 settlement logic with Stacks burner wallets.
* **Technical Depth:** Multi-agent orchestration, Clarity contract bridge, and SIP-018 signing.
* **Stacks Alignment:** Deep usage of SIP-010 (USDCx), SIP-018, and Stacks-specific auth patterns.
