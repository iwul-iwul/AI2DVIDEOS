// Starts the autopilot scheduler when the server boots, so it runs even if nobody opens the page.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutopilot } = await import("./lib/autopilot");
    startAutopilot();
  }
}
