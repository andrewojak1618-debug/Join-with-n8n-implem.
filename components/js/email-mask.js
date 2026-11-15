hydrateHtmlIncludes(document.body);
document.querySelector("#request-form").addEventListener("submit", openRequestDraft);

/** Opens an addressed mail draft after the browser validates the request fields. */
function openRequestDraft(event) {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const subject = fields.get("subject").trim();
  const body = [fields.get("message").trim(), "", fields.get("name").trim(), fields.get("email").trim()].join("\r\n");
  window.location.href = "mailto:ai.viralreelcreator@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}
