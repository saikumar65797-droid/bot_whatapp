# Sruthi Technologies WhatsApp Chatbot

A production-ready WhatsApp chatbot built for Sruthi Technologies. This Node.js/Express application integrates with the WhatsApp Cloud API and MongoDB to provide seamless customer service for both existing and new customers.

## Features

- **Session Management:** Stateful conversations handling complex flows.
- **Dynamic Data Validation:** Securely match `contactNumber` + `contactEmail` or `serialNumber` inside `companyProfiles_testing`.
- **Existing Customer Services:**
  - Raise a Support Ticket
  - Buy/Renew AMC (with centralized plans config)
  - Request New Machines
  - General Enquiries
- **New Customer Lead Capture:**
  - Onboard new customers directly into the ERP.
- **Security Built-In:** Rate limiting, idempotency (duplicate webhook protection), robust input normalization (mobile/email), masked logging.

## Prerequisites

- Node.js v18+
- MongoDB Atlas cluster with `companyProfiles_testing` or ERP collections.
- Meta Developer Account (WhatsApp Cloud API App, Verify Token, Phone Number ID, Access Token).

## Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in the details:
   ```bash
   cp .env.example .env
   ```
   **Important Variables:**
   - `VERIFY_TOKEN`: Set this to your own secret (e.g., `chatbot2026`) and configure the exact same string in your Meta Webhook dashboard.
   - `WHATSAPP_TOKEN`: Permanent or temporary access token from Meta.
   - `PHONE_NUMBER_ID`: The Phone Number ID from Meta Dashboard.
   - `MONGODB_URI`: Do not share this in the source code!

## Configuration

- **AMC Pricing**: You can configure AMC plans, duration, and prices in `src/config/amcPlans.js`.
- **Support Details**: Phone, email, and brochure URL are centralized in `.env`.

## Running Locally

To run the server in development mode using Nodemon:
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```

## How to Test Webhook

You can use `ngrok` or similar to expose your local port (e.g., 5000) to the internet.
```bash
ngrok http 5000
```
Copy the Forwarding URL and append `/webhook` (e.g., `https://xxxxxx.ngrok-free.app/webhook`). Use this URL in the Meta Developer Dashboard to configure your Webhook.

## MongoDB Integration & Troubleshooting

The chatbot accesses the dynamic `companyProfiles_testing` collection without a strict schema to read machine/contract data.
If a customer fails to find their profile:
1. Ensure the user is passing the Mobile number exactly as it's saved. Normalization rules handle `+91`, `91`, and `0` prefixes.
2. Email must match exactly (case-insensitive). 
3. Serial number lookup is case-insensitive but must exactly match the value in the nested `machines.serialNumber` field.

## Deployment

Deploy this app on Render, Heroku, or AWS. Ensure you set all the exact Environment Variables inside your host's dashboard. Do not commit `.env`.

Ensure that you have enabled HTTPS. The webhook must be hosted over `https://`.
