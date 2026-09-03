A clean, lightweight desktop diagnostic tool built with **Electron**, **Vue 3**, **TypeScript**, and **Tailwind CSS**.

This app checks the internet stability on a currently connected network by simulating a `traceroute` command. The idea is to make this terminal command more user-friendly and accessible for simple user, as the raw command output is difficult for everyday users to understand.

**How does it work?:**

The app analyzes the route your signals take across the first three critical stages of your connections:

- **Home Router (Hop 1)**: Checks the link between your computer and your local Wi-Fi router.
- **Neighbourhood Hub (Hop 2)**: Checks the connection leaving your home and reaching your provider's local street hub or optical terminal.
- **Provider Gateway (Hop 3)**: Checks your internet service provider's regional edge network before your signal travels out onto the wider web.

**What do the results mean?**

1. **Failure at Hop 1 (Router)**: The issue is likely with your router. Check your Wi-Fi connection, Ethernet cables and restart the router.
2. **Failures at Hops 2-3 (Hub or Gateway)**: Your internet equipment is working, but your provider's network is experiencing outages or loss of signal. This is an external issue for your provider to resolve.
3. **All Hops pass**: Your local connection and provider link are healthy.

To change how the app runs, after you clone it, go to `config/config.ts`. There, you will find the following options to customize:

- `TARGET_HOST` - server used to test the connection. I recommend putting well known IP addresses like `1.1.1.1` or `8.8.8.8`.
- `MAX_HOPS` - Limit to first 3 crucial hops (Router, Hub, ISP Edge).
- `TIMEOUT_TS` - Timeout per probe in ms to prevent app hanging.

**Roadmap:**

1. I will add the ability to save the command log in case of failures at Hub or ISP Edge. This can be useful for your internet provider to troubleshoot.
2. In the light of recent and frequent CloudFare outages, I will add the ability to check whether a specific site is down. The command should send 1-2 more signals and based on their results, the app will decide, whether the site can be reached. You'll be able to enter the website URL manually.
