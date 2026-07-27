# Internet stability app

This **Electron** app, built with **Vue and TypeScript** and stylized with **Tailwind**, checks the internet stability on a currently connected network by simulating a `ping` command. The idea is to make this terminal command more user-friendly and accessible for simple user.

**Principle of work:**

- If there are no significant interruptions for a long period of time, your internet connection is stable.
- If there are some significant interruptions and `ping` command received only 70-80% of internet signals, your internet connection needs some attention.
- If there are no signals received, connection is considered to be lost.

To change how the app runs, after you clone it, go to `config/config.ts`. There, you will find the following options to customize:

- `TARGET_HOST` - server used to test the connection. I recommend putting well known IP addresses like `1.1.1.1` or `8.8.8.8`
- `TARGET_PORT` - port for TCP connection
- `PING_TIMEOUT` - how long (in ms) to wait for a response before declaring a signal "dropped"
- `PING_DELAY` - time (in ms) to wait between individual signals
- `SUCCESS_BOUNDARY` - number of successfully received signals to stop the program
- `CONSECUTIVE_FAILURES` - number of consecutive failures to receive signals to stop the program

**TODO:** Soon, I'll add the functionality to save the log of `ping` command into a separate file. This will help internet providers quickly analyze network issues by viewing a raw command output.
