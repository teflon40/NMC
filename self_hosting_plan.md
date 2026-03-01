# Self-Hosting Plan: NMC Assessment Dashboard

If you want full control and reliability without relying on a friend's setup, hosting it yourself on a **VPS (Virtual Private Server)** is the best choice. This ensures the backend and database are always available and you can manage the SSL (HTTPS) yourself.

## Recommended Option: DigitalOcean (VPS)
*Note: If they reject your virtual card, see the "Alternatives" section below.*

### 1. The Cost (Estimation)
- **Basic VPS (Droplet)**: $6/month (1GB RAM / 1 CPU) - *Perfect for your current needs.*
- **Custom Domain**: ~$10 - $15/year (purchased from Namecheap, Google Domains, etc.)
- **Total Startup**: ~$20 first month, then ~$6/month.

---

## 2. Step-by-Step Action Plan

### Phase 1: Setup the Account
1.  Go to [DigitalOcean.com](https://www.digitalocean.com/) and create an account.
2.  Add a payment method (Credit Card or PayPal).
3.  Click **"Create"** > **"Droplets"**.
4.  **Choose Region**: Pick the one closest to you (e.g., London or New York).
5.  **Choose Image**: Select **Ubuntu 22.04 LTS**.
6.  **Choose Size**: Select the **Basic Plan** ($6/mo).
7.  **Authentication**: Choose a **Password** (make it very strong and save it!) or SSH Key.
8.  Click **Create Droplet**. 

### Phase 2: Configure the Server
Once the Droplet is running, you will get an **IP Address**. You can connect to it using "Console" on the website or a tool like PuTTY.

Run these commands (or have me help you) to install the engine:
```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js & Database
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx
```

### Phase 3: Prepare the Code
1.  Zip your local `nmc` folder.
2.  Upload it to the server (you can use a free tool like **WinSCP** or **FileZilla**).
3.  Follow the **`deployment_guide.md`** I created for you to:
    -   Set up the `.env` files with the server IP.
    -   Build the project.
    -   Start the backend with PM2.

### Phase 4: Point a Domain (Optional but Recommended)
1.  Buy a domain (e.g., `nmcproject.com`).
2.  In your domain provider settings, create an "A Record" pointing to your DigitalOcean IP Address.
3.  Use **Certbot** (it's free) to add the green padlock (HTTPS):
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx
    ```

---

## 3. Alternative Providers (Better for Virtual Cards)

If DigitalOcean rejects your card, try these providers which are often more flexible with international payments:

### A. Railway.app (Highly Recommended)
- **Why**: It is the easiest to set up. You don't have to manage a "Linux server." You just give it the code, and it handles the database and hosting automatically.
- **Payment**: They tend to be more lenient with virtual cards and offer a fixed credit system.
- **Setup**: One-click deployment for Node.js and PostgreSQL.

### B. Render.com
- **Why**: Very popular for React/Node projects. It has a great free tier for testing and a "Team" plan for production.
- **Payment**: Uses Stripe, which generally handles virtual cards well.
- **Setup**: Very similar to Railway.

### C. Vultr or Linode
- **Why**: These are direct competitors to DigitalOcean. If DO doesn't work, one of these usually will.
- **Payment**: Vultr sometimes accepts PayPal or Crypto (if that is an option for you), which bypasses the card restriction entirely.

## My Recommendation
If you just want it to **WORK** immediately without the stress of managing a server, go with **Railway.app**. It is built specifically for projects like yours (React + Node + Postgres). 

I can help you set up Railway in about 10 minutes once you create an account!
