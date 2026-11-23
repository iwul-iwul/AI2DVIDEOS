# Putting Reelhouse online for free (Oracle Cloud)

This puts Reelhouse on a free cloud server from Oracle so it runs all day, even when your computer is off. You open it from any browser, with a password only you know.

**What it costs:** nothing, as long as you stay on Oracle's "Always Free" server. Oracle asks for a credit or debit card when you sign up to check you're a real person. They may place a small temporary hold, but you aren't charged for Always Free servers.

**How long it takes:** about 15 minutes of clicking, then about 45 minutes while the server installs everything by itself.

---

## 1. Create an Oracle Cloud account

1. Go to **https://signup.cloud.oracle.com** and sign up.
2. For **Home Region**, pick one close to you, for example **Singapore**. You can't change it later.
3. Enter your card when asked. Choose the free account; you don't need to upgrade.

## 2. Get the setup script ready

1. Open [`deploy/oracle-setup.sh`](deploy/oracle-setup.sh) on GitHub, click **Raw**, and copy all of it into a notes app.
2. Find the line `REELHOUSE_PASSWORD="change-me-to-something-long"` near the top and replace `change-me-to-something-long` with your own password. Use **letters and numbers only**, at least 12 characters, and don't reuse a password from another site.
3. Keep this text handy for step 3.

## 3. Create the server

1. In the Oracle Cloud console, open the menu (☰), then **Compute**, then **Instances**, and click **Create instance**.
2. **Name:** `reelhouse`.
3. **Image and shape:**
   - Click **Change image**, choose **Ubuntu**, then **Canonical Ubuntu 24.04** (not "Minimal").
   - Click **Change shape**, choose **Ampere**, then **VM.Standard.A1.Flex**. Set **4 OCPUs** and **24 GB** memory. It should say "Always Free-eligible".
4. **Networking:** keep the defaults. Make sure **Assign a public IPv4 address** is on.
5. **SSH keys:** choose **Generate a key pair for me** and click **Save private key**. Keep the file somewhere safe; you only need it for troubleshooting.
6. **Boot volume:** tick **Specify a custom boot volume size** and enter **100** GB (still free).
7. Click **Show advanced options**. On the **Management** tab, choose **Paste cloud-init script** and paste the script from step 2.
8. Click **Create**.

> If Oracle says **"Out of capacity"**, the free servers in that zone are taken right now. Change the **Availability domain** at the top of the form and try again, or try again in a few hours.

## 4. Let web traffic in

Oracle blocks visitors until you allow them.

1. On your new server's page, under **Primary VNIC**, click the **Subnet** link.
2. Open **Security** (or **Security Lists**) and click the **Default Security List**.
3. Click **Add Ingress Rules** and fill in:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Destination Port Range:** `80,443`
4. Click **Add Ingress Rules**.

## 5. Open your studio

1. Wait about 45 minutes. The server downloads the story AI (about 5 GB), the voices and the video renderer.
2. On the server's page, copy the **Public IP address**, for example `129.153.10.20`.
3. In your browser, go to the same numbers with dashes instead of dots, followed by `.sslip.io`:
   **https://129-153-10-20.sslip.io**
4. Sign in with user name **reelhouse** and your password.
5. Open the **Producer's Office**, pick your story style, write a channel brief and switch **Autopilot** on. Download finished videos from the **Shipping Dock**.

Bookmark the address. Reelhouse keeps running, and restarts by itself if the server reboots. Every night at 4 AM (server time) it checks GitHub for a newer version of Reelhouse and updates itself.

---

## Good to know

- **Speed:** the free server has no graphics card, so writing a story takes a few minutes. Autopilot doesn't mind; set 2 to 6 stories a day.
- **Trends:** Reddit sometimes blocks cloud servers. If the Trend Lookout says it couldn't reach Reddit, it still uses Google Trends and your brief.
- **Keeping it free:** Oracle may reclaim an Always Free server that sits almost completely idle for a week. With autopilot on, it does real work every day.
- **Your password:** to change it, you would need to recreate the server or ask for help. Keep it somewhere safe.

## If the page doesn't open

- **"This site can't be reached":** wait another 15 minutes, then check step 4 (both ports 80 and 443).
- **It asks for a password and says it's wrong:** the user name is `reelhouse` (all lowercase).
- **Still stuck:** on the server's page, click **Cloud Shell** (top right of the console) or use the SSH key from step 3 to connect, and run `sudo tail -50 /var/log/reelhouse-setup.log`. Send what it shows to whoever set this up.
