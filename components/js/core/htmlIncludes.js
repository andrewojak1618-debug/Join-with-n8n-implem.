const htmlCache = new Map();


/**
 * Resolves data-include placeholders, repeating until nested includes are done.
 * @param {HTMLElement} root - The element whose includes get resolved.
 */
async function hydrateHtmlIncludes(root) {
  let includes = [...root.querySelectorAll("[data-include]")];
  while (includes.length) {
    await Promise.all(includes.map(replaceHtmlInclude));
    includes = [...root.querySelectorAll("[data-include]")];
  }
}


/**
 * Swaps one include placeholder with its loaded HTML file.
 * @param {HTMLElement} placeholder - The element carrying the data-include path.
 */
async function replaceHtmlInclude(placeholder) {
  placeholder.outerHTML = await getHtmlContent(placeholder.dataset.include);
}


/**
 * Returns the HTML for a path from the cache, fetching it only once.
 * @param {string} path - The path of the HTML file.
 * @returns {Promise<string>} The HTML text of the file.
 */
async function getHtmlContent(path) {
  if (!htmlCache.has(path)) htmlCache.set(path, fetchHtml(path).catch((error) => {
    htmlCache.delete(path);
    throw error;
  }));
  return htmlCache.get(path);
}


/**
 * Loads the raw HTML text of a file over the network.
 * @param {string} path - The path of the HTML file.
 * @returns {Promise<string>} The HTML text of the file.
 */
async function fetchHtml(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTML could not be loaded: ${path} (HTTP ${response.status})`);
  return response.text();
}


/**
 * Displays a safe startup error instead of an empty page or server response.
 */
function showPageLoadError() {
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.textContent = "Page could not be loaded. Please reload to try again.";
  document.getElementById("app").replaceChildren(message);
}
