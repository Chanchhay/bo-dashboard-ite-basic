# 🚀 FluxiBiz — Cloud-Native Retail & Commerce Management Platform

![Platform](https://img.shields.io/badge/Platform-Cloud--Native-blue.svg)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg)
![Architecture](https://img.shields.io/badge/Architecture-API--Driven-orange.svg)

**FluxiBiz** transforms traditional retail systems into a modern, cloud-native ecosystem that operates entirely through standard internet connectivity. By centralizing physical POS transactions, digital storefronts, and social commerce marketplaces into a single automated platform, FluxiBiz enables business owners and retail teams to manage inventory and sales proactively without geographical constraints. With support for real-time inventory reconciliation and webhook-driven multi-channel order synchronization.

---

## ✨ Executive Summary & Core Value Proposition

Modern retail requires businesses to operate across multiple digital and physical touchpoints. FluxiBiz eliminates operational silos by bridging in-store point-of-sale systems with online web stores and social marketplaces into a single real-time control center.

* **Unified Omnichannel Operations:** Single pane of glass for physical stores, custom web shops, and social commerce (Telegram and Messenger).
* **Automated Stock Reconciliation:** Instant inventory synchronization across every channel to prevent overselling and eliminate manual stock counts.
* **Webhook-Driven Automation:** Event-driven order processing, inventory allocation, and automated fulfillment workflows.
* **Geographic Flexibility:** Cloud-native access enables owners and operations managers to control multi-store setups remotely from anywhere.
* **Enterprise Agility & Scalability:** Designed on secure, high-availability microservices architecture to adapt dynamically throughout your enterprise growth lifecycle.

---

## 📚 Interactive API Documentation & Developer Tools

FluxiBiz is engineered API-first, allowing custom frontend store development, third-party ERP integrations, and custom payment gateway connections.

### 1. Scalar Interactive Web UI
Explore and test the complete set of OpenAPI endpoints using the interactive Scalar UI:

* **Scalar API UI:** `https://api.fluxibiz.com/scalar/docs` *(or `http://localhost:8080/scalar/docs` for local development)*
* **OpenAPI Specification (JSON):** `https://api.fluxibiz.com/v3/api-docs`

### 2. Postman Collection Support
For developer testing and webhook simulation:
1. Locate or download the collection file at [`./public/postman_collection.json`](./public/postman_collection.json) (or [`./postman_collection.json`](./postman_collection.json)).
2. Open Postman $\rightarrow$ **Import** $\rightarrow$ **Upload Files** and select `postman_collection.json`.
3. Set your active Postman environment variables:
   * `baseUrl`: `https://api.fluxibiz.com` (or `http://localhost:8080`)
   * `apiKey`: `<YOUR_FLUXIBIZ_BEARER_TOKEN>`

---

## 💻 Installation Steps

### Prerequisites
* **Node.js:** v18+ or v20+
* **Package Manager:** `npm`, `pnpm`, or `yarn`
* **Backend Service:** Running instance of the `ite-sb-api` backend

---

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-org/fluxibiz-dashboard.git](https://github.com/your-org/fluxibiz-dashboard.git)
   cd fluxibiz-dashboard

## ⚙️ Environment Configuration

Configure the required environment variables using a `.env` file or system configuration:

| Variable Name | Required | Default / Example | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://api.fluxibiz.com` | Primary backend API gateway endpoint |
| `NEXT_PUBLIC_SCALAR_DOCS_URL` | No | `https://api.fluxibiz.com/scalar/docs` | Live API reference URL |
| `FLUXIBIZ_WEBHOOK_SECRET` | **Yes** | `whsec_a1b2c3d4e5...` | Secret key used to verify incoming webhook signatures |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@localhost:5432/fluxibiz` | Database connection string |


## 🛠️ System Architecture & Channel Integration

FluxiBiz connects your primary retail operations into a unified, event-driven network:

```text
                               ┌──────────────────────────────┐
                               │    FluxiBiz Business Hub     │
                               │     (Central Core Engine)    │
                               └──────────────┬───────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
┌────────┴─────────┐                 ┌────────┴─────────┐                 ┌────────┴─────────┐
│   Physical POS   │                 │ Web Storefronts  │                 │ Social Commerce  │
│  (In-Store Sales)│                 │   (E-Commerce)   │                 │  (Marketplaces)  │
└────────┴─────────┘                 └────────┴─────────┘                 └────────┴─────────┘
         │                                    │                                    │
         └────────────────────────────────────┼────────────────────────────────────┘
                                              │
                                   ┌──────────┴──────────────┐
                                   │ Dynamic Synchronization │
                                   │  - Real-Time Inventory  │
                                   │  - Webhook Workflows    │
                                   └─────────────────────────┘

