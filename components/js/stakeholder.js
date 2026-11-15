hydrateHtmlIncludes(document.body);
const localPreview = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
  && new URLSearchParams(location.search).get("debug") === "limit";
const berlinDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });
let quotaRequest = 0;
if (localPreview) {
  showQuota(10, 10);
} else {
  refreshQuota();
  scheduleQuotaRefresh();
  document.addEventListener("visibilitychange", refreshQuota);
}


/** Aligns polling with full minutes, including midnight in Berlin. */
function scheduleQuotaRefresh() {
  const minute = 60000;
  window.setTimeout(() => {
    refreshQuota();
    scheduleQuotaRefresh();
  }, minute - Date.now() % minute);
}


/** Updates the page only if this is still the latest quota request. */
async function refreshQuota() {
  if (document.hidden) return;
  const request = ++quotaRequest;
  try {
    const { used, limit } = await readDailyQuota();
    if (request === quotaRequest) showQuota(used, limit);
  } catch {
    if (request !== quotaRequest) return;
    updateLimitNote(false);
    document.querySelector(".quota").textContent = "Today's usage unavailable";
  }
}


/** Reads the occupied slots and limit for the current calendar day in Berlin. */
async function readDailyQuota() {
  const day = berlinDate.format(new Date());
  const endpoint = "https://firestore.googleapis.com/v1/projects/join-n8n-andre-2026/databases/(default)/documents/issue-collector-daily-limits/";
  const response = await fetch(endpoint + day, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (response.status === 404) return { used: 0, limit: 10 };
  if (!response.ok) throw new Error("Quota unavailable");
  const { fields } = await response.json();
  const used = Number(fields.completedCount.integerValue) + Number(fields.reservedCount.integerValue);
  return { used, limit: Number(fields.dailyLimit.integerValue) };
}


/** Displays the total number of occupied slots. */
function showQuota(used, limit) {
  if (!Number.isSafeInteger(used) || !Number.isSafeInteger(limit) || limit < 1 || used < 0 || used > limit) {
    throw new Error("Invalid daily quota");
  }
  updateLimitNote(used === limit);
  const count = document.createElement("strong");
  count.textContent = used + " of " + limit;
  document.querySelector(".quota").replaceChildren(count, " requests used today");
}


/** Shows the limit notice and manual request action when all slots are used. */
function updateLimitNote(full) {
  const note = document.querySelector(".limit-note");
  document.body.classList.toggle("quota-full", full);
  document.body.classList.toggle("limit-view", full);
  document.querySelector(".normal-description").hidden = full;
  document.querySelector(".limit-description").hidden = !full;
  document.querySelector(".illustration").src = full ? "./components/assets/img/stakeholder-limit.svg" : "./components/assets/img/stakeholder-request.svg";
  document.querySelector(".intro").textContent = full
    ? "Send your request for manual review by our team."
    : "Easily create a ticket by sending a request — no extra steps needed.";
  document.querySelector(".description p:first-child").hidden = full;
  note.hidden = !full;
  note.querySelector("span").textContent = "Automatic ticket creation resumes tomorrow. You can still send a request today.";
}
