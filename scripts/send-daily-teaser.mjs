const APP_ID = "98115d72-3cd9-4d9e-b78f-8d726e269d69";
const SITE_URL = "https://fahmithanasrins.github.io/a-universe-of-us/";

function dubaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function dayNumber(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const start = Date.UTC(2026, 10, 24); // 24 Nov 2026
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86400000) + 1;
}

async function main() {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const subscriptionIds = (process.env.ONESIGNAL_SUBSCRIPTION_ID || "").split(",").map(id => id.trim()).filter(Boolean);
  const testMode = process.env.TEST_MODE === "true";

  if (!apiKey || subscriptionIds.length === 0) {
    throw new Error("Missing GitHub Actions secrets: ONESIGNAL_REST_API_KEY and/or ONESIGNAL_SUBSCRIPTION_ID");
  }

  const today = dubaiDate();
  const actualDay = dayNumber(today);
  const day = testMode ? 1 : actualDay;

  if (!testMode && (day < 1 || day > 365)) {
    console.log(`No daily message scheduled for ${today}; outside the 365-day universe.`);
    return;
  }

  const teasers = JSON.parse(await (await import("node:fs/promises")).readFile("daily-notification-teasers.json", "utf8"));
  const entry = teasers.find(item => item.day === day);
  if (!entry) throw new Error(`No teaser found for day ${day}`);

  const targetUrl = `${SITE_URL}?openDay=${day}`;
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      app_id: APP_ID,
      include_subscription_ids: subscriptionIds,
      target_channel: "push",
      headings: { en: testMode ? "A Universe of Us — Test 🌙" : "A Universe of Us 🌙" },
      contents: { en: testMode ? `TEST: ${entry.teaser}` : entry.teaser },
      url: targetUrl
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OneSignal API ${response.status}: ${JSON.stringify(result)}`);
  }
  console.log(`${testMode ? "Test notification" : "Daily notification"} sent for Day ${day}. Response: ${JSON.stringify(result)}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
