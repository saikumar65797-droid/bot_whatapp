# Commas Engineering WhatsApp Chatbot

Production-ready WhatsApp Chatbot for Commas Engineering built with **Node.js**, **Express**, **MongoDB (Mongoose)**, and **Meta WhatsApp Cloud API**.

The chatbot automatically collects customer enquiry details via a multi-step WhatsApp conversational flow, validates inputs (email, 10-digit phone number, machine selection), stores completed records in MongoDB, and provides REST APIs for customer enquiry management.

---

## 📁 Project Structure

```
project/
│
├── server.js               # Application entry point & Express server setup
├── package.json            # Project dependencies & scripts
├── .env                    # Local environment variables
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore configuration
│
├── config/
│   └── mongo.js            # MongoDB Mongoose connection handler
│
├── models/
│   └── Customer.js         # Mongoose schema for Customer enquiries
│
├── routes/
│   ├── webhook.js          # Meta WhatsApp Cloud API Webhook routes
│   └── customers.js        # REST API endpoints for Customer enquiries
│
├── controllers/
│   ├── webhookController.js  # Conversational step-by-step state machine
│   └── customerController.js # REST API handlers for customer management
│
├── services/
│   └── whatsappService.js   # WhatsApp Cloud API messaging service
│
├── utils/
│   └── userState.js         # In-memory user state & message deduplication
│
└── README.md               # Documentation & Render deployment guide
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
PORT=5000
VERIFY_TOKEN=commas_engineering_verify_token_2026
WHATSAPP_TOKEN=your_whatsapp_cloud_api_access_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
MONGODB_URI=mongodb://127.0.0.1:27017/commas_chatbot
```

| Variable | Description |
| :--- | :--- |
| `PORT` | Port number for Express server (default `5000`) |
| `VERIFY_TOKEN` | Custom verification token set in Meta App Webhook settings |
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API Temporary or Permanent Access Token |
| `PHONE_NUMBER_ID` | WhatsApp Business Phone Number ID from Meta Developer Portal |
| `MONGODB_URI` | MongoDB connection URI (Atlas or local instance) |

---

## 🔄 Conversational Flow

When a user sends `Hi`, `Hello`, `Hey`, or `Start`:

1. **Welcome Message & Step 1**: Requests **Full Name**.
2. **Step 2 (Email)**: Validates email format (`name@example.com`). Re-prompts if invalid.
3. **Step 3 (Mobile Number)**: Validates 10-digit mobile number containing only numbers. Re-prompts if invalid.
4. **Step 4 (Factory Name)**: Requests customer's Factory Name.
5. **Step 5 (Factory Address)**: Requests customer's Factory Address.
6. **Step 6 (Machine Selection)**: Displays menu (1. Dal Mill, 2. Flour Mill, 3. Rice Mill, 4. Besan Plant, 5. Other). Converts option numbers into machine names.
7. **Step 7 (Completion & Persistence)**: Saves customer enquiry to MongoDB, sends final confirmation message, and clears user state.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check endpoint |
| `GET` | `/webhook` | Meta Webhook verification endpoint |
| `POST` | `/webhook` | Incoming Meta WhatsApp Webhook event handler |
| `GET` | `/customers` | Fetch all customer enquiries |
| `GET` | `/customers/:id` | Fetch a single customer enquiry by ID |
| `DELETE` | `/customers/:id` | Delete a customer enquiry by ID |

---

## 🚀 Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up MongoDB**: Ensure MongoDB is running locally or provide a MongoDB Atlas connection string in `.env`.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 🌐 Deploying to Render

This application is ready to deploy directly to [Render](https://render.com).

### Step-by-Step Render Deployment:

1. Push your repository to **GitHub**.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Fill in the deployment details:
   - **Name**: `commas-whatsapp-chatbot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `PORT` = `10000` (or leave default assigned by Render)
   - `VERIFY_TOKEN` = `commas_engineering_verify_token_2026`
   - `WHATSAPP_TOKEN` = `<YOUR_WHATSAPP_TOKEN>`
   - `PHONE_NUMBER_ID` = `<YOUR_PHONE_NUMBER_ID>`
   - `MONGODB_URI` = `<YOUR_MONGODB_ATLAS_URI>`
6. Click **Create Web Service**.
7. Copy your deployed web service URL (e.g. `https://commas-whatsapp-chatbot.onrender.com`).

---

## 📲 Meta WhatsApp Webhook Setup

1. Go to [Meta Developers Portal](https://developers.facebook.com/).
2. Select your App -> **WhatsApp** -> **Configuration**.
3. Under **Webhook**, click **Edit**:
   - **Callback URL**: `https://your-render-app-url.onrender.com/webhook`
   - **Verify Token**: Must match your `VERIFY_TOKEN` environment variable.
4. Click **Verify and Save**.
5. Subscribe to **`messages`** webhook field under Webhook fields.
