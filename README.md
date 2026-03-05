
# 🛒 Cart-Blanche
**The Universal Orchestrator for the Autonomous Economy**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![SKALE Network](https://img.shields.io/badge/SKALE-Base_Sepolia-00E1FF)](https://skale.space/)

> **Cart-Blanche** transitions AI from a "passive chatbot that suggests" into an "active fiduciary that executes." By combining Google's Agentic Payment Protocol (AP2) and Coinbase's x402, software can now securely pay software without human micromanagement.


## ✨ Core Pillars & Features
* **Google AP2 (Agentic Payment Protocol):** Replaces blind trust with cryptographic certainty. Agents negotiate deterministic `CartMandates` that lock in merchant, price, and item details.
* **x402 Autonomous Settlement:** Enables seamless Machine-to-Machine (M2M) micro-transactions. Agents autonomously handle HTTP `402 Payment Required` challenges in the background.
* **SKALE BITE v2 (Threshold Encryption):** Keeps user budgets and negotiation strategies strictly private from front-running and vendor price-gouging until final settlement.
* **Multi-Merchant Batching:** A single user signature (EIP-712) can authorize a master mandate, allowing the agent to settle multiple vendor transactions simultaneously.

---

## 🏗 Architecture
Powered by **Google Agent Development Kit (ADK)** and **Gemini 2.5 Flash**, the system utilizes a hierarchical multi-agent flow:
1. **Orchestrator Agent:** Breaks down complex user goals (e.g., "Plan a wedding under $10k") into parallel sub-tasks.
2. **Shopping Agent:** Discovers products and verifies live inventory.
3. **Merchant Agent:** Generates rigid, cryptographic `CartMandate` offers.
4. **Vault Agent:** Encrypts user limits via SKALE BITE v2 and enforces EIP-712 signature verification before executing the x402 loop.

---

## ⚙️ Setup & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Python](https://www.python.org/) (v3.10+)
* MetaMask Extension installed in your browser

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/cart-blanche.git](https://github.com/your-username/cart-blanche.git)
cd cart-blanche

```

### 2. Environment Variables (`.env`)

To run the backend agents and the settlement tool, you must configure your environment variables.

Navigate to the `server` directory and duplicate the `.env.example` file to create your `.env` file:

```bash
cd server
cp .env.example .env

```

Open `server/.env` and populate it with your actual credentials:

```env
# --- AI & Agent Config ---
GEMINI_API_KEY="your_google_gemini_api_key_here"
GOOGLE_SEARCH_API_KEY="your_google_search_api_key_here"

# --- Blockchain / x402 Execution ---
# The private key of the AGENT's wallet (Used to pay SKALE gas/micro-txs)
# Do NOT use your personal mainnet wallet key here.
SKALE_AGENT_PRIVATE_KEY="your_agent_wallet_private_key_here"


```

---

## 🚀 How to Start the App

We have provided a unified startup script that launches the Next.js frontend, the FastAPI Agent server, and the simulated Merchant Server all at once.

From the **root directory** of the project, run:

```bash
# 1. Make the script executable (Mac/Linux only)
chmod +x start_all.sh

# 2. Run the startup script
./start_all.sh

```

**If you prefer to start the services manually:**

* **Frontend:** `cd frontend && npm install && npm run dev` (Runs on `localhost:3000`)
* **Agent Backend:** `cd server && pip install -r requirements.txt && uvicorn server_entry:app --reload --port 8000`
* **Merchant Server:** `cd server && python payment_server.py` (Runs on `localhost:8001`)

---

## 🧪 Testing the Flow (Demo Guide)

To see the full potential of Cart-Blanche, use the following prompt in the chat interface once the app is running:

> *"I'm looking for high-end noise-canceling headphones for my upcoming travel. My budget is $200. Please find the best options, verify their availability, and prepare a mandate for the one with the best reviews."*

**What to watch for:**

1. The **Shopping Agent** will scout the web and propose an option.
2. The **Vault Agent** will encrypt your $200 budget limit using SKALE BITE v2.
3. The **Merchant Agent** will return a JSON `CartMandate`.
4. You will be prompted by **MetaMask** to provide an EIP-712 signature.
5. Watch your terminal! The `X402SettlementTool` will autonomously catch the `402` error and settle the transaction on the SKALE testnet.
6. Check the **Agentic Audit Ledger** in the UI to view your verified on-chain receipt.

---

## 🏆 Hackathon Tracks Addressed

* **Best Agentic App (Overall):** Demonstrates a deterministic `discover -> decide -> pay -> outcome` workflow with strict spend caps and EIP-712 guardrails.
* **Best Integration of AP2:** Clean separation of user intent, credential custody (Vault Agent), and execution (`CartMandate`).
* **Agentic Tool Usage on x402:** Shows agents chaining tools and handling HTTP 402 challenges autonomously.
* **Encrypted Agents (SKALE):** Implements BITE v2 to enable conditional, private workflow execution.

```# cart-blanche-nova-ai
