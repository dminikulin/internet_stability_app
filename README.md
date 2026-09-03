This **Electron** app, built with **Vue and TypeScript** and stylized with **Tailwind**, checks the internet stability on a currently connected network by simulating a `ping` command. The idea is to make this terminal command more user-friendly and accessible for simple user.

**Principle of work:**

- If there are no significant interruptions for a long period of time, your internet connection is stable.
- If there are some significant interruptions and `ping` command received only 70-80% of internet signals, your internet connection needs some attention.
- If there are no signals received, connection is considered to be lost.

To change how the app runs, after you clone it, go to `config/config.ts`. There, you will find the following options to customize:

- `TARGET_HOST` - server used to test the connection. I recommend putting well known IP addresses like `1.1.1.1` or `8.8.8.8`.
- `MAX_HOPS` - Limit to first 3 crucial hops (Router, Hub, ISP Edge).
- `TIMEOUT_TS` - Timeout per probe in ms to prevent app hanging.

**Roadmap:**

1. I will add the ability to save the command log in case of failures at Hub or ISP Edge. This can be useful for your internet provider to troubleshoot.
2. In the light of recent and frequent CloudFare outages, I will add the ability to check whether a specific site is down. The command should send 1-2 more signals and based on their results, the app will decide, whether the site can be reached. You'll be able to enter the website URL manually.
