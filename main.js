const routes = {
  login: {
    title: "Join | Log in",
    file: "./index.html",
    template: "./components/html/pages/login.html",
  },
  signup: {
    title: "Join | Sign up",
    file: "./signup.html",
    template: "./components/html/pages/signup.html",
  },
  "privacy-policy": {
    title: "Join | Privacy Policy",
    file: "./privacyPolicy.html",
    template: "./components/html/pages/privacyPolicy.html",
  },
  "legal-notice": {
    title: "Join | Legal Notice",
    file: "./legalNotice.html",
    template: "./components/html/pages/legalNotice.html",
  },
  summary: {
    title: "Join | Summary",
    file: "./summary.html",
    template: "./components/html/pages/summary.html",
    protected: true,
    usesLayout: true,
  },
  "add-task": {
    title: "Join | Add Task",
    file: "./addTask.html",
    template: "./components/html/pages/addTask.html",
    protected: true,
    usesLayout: true,
    layoutClass: "add-task-shell",
  },
  board: {
    title: "Join | Board",
    file: "./board.html",
    template: "./components/html/pages/board.html",
    protected: true,
    usesLayout: true,
    layoutClass: "board-shell",
  },
  contacts: {
    title: "Join | Contacts",
    file: "./contacts.html",
    template: "./components/html/pages/contacts.html",
    protected: true,
    usesLayout: true,
    layoutClass: "contacts-shell",
  },
  help: {
    title: "Join | Help",
    file: "./help.html",
    template: "./components/html/pages/help.html",
    protected: true,
    usesLayout: true,
    layoutClass: "help-shell",
  },
};

document.addEventListener("DOMContentLoaded", initApp);
let pageTransitionRunning = false;


/**
 * Starts the app after DOM load and chooses between intro and normal render.
 */
async function initApp() {
  document.addEventListener("click", handlePageLinkClick);
  if (getValidPage() === "login") {
    await renderSignupWithTransition();
    return;
  }
  await renderCurrentPage();
}


/**
 * Renders the page from the URL once auth is ready and runs its init code.
 * @param {Object} [options] - Render options, e.g. { animate: true }.
 */
async function renderCurrentPage(options = {}) {
  await waitForFirebaseAuth();
  const page = getAuthorizedPage();
  if (!page) return;
  const route = routes[page];
  const content = await getHtmlContent(route.template);
  document.body.dataset.page = page;
  document.title = route.title;
  await renderPageContent(content, options.animate, page);
  await initPage(page);
}


/**
 * Builds the page markup, swaps it into the app root and updates the nav.
 * @param {string} content - The raw HTML of the page template.
 * @param {boolean} [shouldAnimate] - True to fade the new page in.
 * @param {string} page - The route key of the page.
 */
async function renderPageContent(content, shouldAnimate, page) {
  const app = document.getElementById("app");
  const animatePage = Boolean(shouldAnimate);
  const route = routes[page];
  const nextContent = route.usesLayout
    ? await createAppLayoutContent(content, route)
    : await createHydratedPageContent(content);
  preparePageAnimation(app, animatePage);
  app.replaceChildren(...nextContent.childNodes);
  setActiveNavigation(page);
  showRenderedPage(app, animatePage);
}


/**
 * Sets the starting animation state before new content is swapped in.
 * @param {HTMLElement} app - The app root element.
 * @param {boolean} animatePage - True when the entry animation should run.
 */
function preparePageAnimation(app, animatePage) {
  app.classList.toggle("app-view--entering", animatePage);
  app.classList.remove("app-view--visible");
}


/**
 * Wraps page HTML and resolves all of its includes.
 * @param {string} content - The raw HTML of the page template.
 * @returns {Promise<HTMLElement>} The wrapper with resolved includes.
 */
async function createHydratedPageContent(content) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = content;
  await hydrateHtmlIncludes(wrapper);
  return wrapper;
}


/**
 * Places the page inside the shared app layout and resolves all includes.
 * @param {string} pageContent - The raw HTML of the page template.
 * @param {Object} route - The route config providing the layout class.
 * @returns {Promise<HTMLElement>} The layout wrapper with the embedded page.
 */
async function createAppLayoutContent(pageContent, route) {
  const layoutWrapper = document.createElement("div");
  layoutWrapper.innerHTML = await getHtmlContent(
    "./components/html/templates/appLayout.html",
  );
  insertPageIntoLayout(layoutWrapper, pageContent, route);
  await hydrateHtmlIncludes(layoutWrapper);
  return layoutWrapper;
}


/**
 * Fills the layout content slot with the page and applies the layout class.
 * @param {HTMLElement} layoutWrapper - The wrapper holding the layout markup.
 * @param {string} pageContent - The raw HTML of the page template.
 * @param {Object} route - The route config providing the layout class.
 */
function insertPageIntoLayout(layoutWrapper, pageContent, route) {
  const pageWrapper = document.createElement("div");
  pageWrapper.innerHTML = pageContent;
  const slot = layoutWrapper.querySelector("[data-layout-content]");
  slot.replaceWith(...pageWrapper.childNodes);
  const layout = layoutWrapper.querySelector("[data-app-layout]");
  if (route.layoutClass) {
    layout.classList.add(route.layoutClass);
  }
}


/**
 * Highlights the sidebar link that belongs to the open page.
 * @param {string} page - The route key of the open page.
 */
function setActiveNavigation(page) {
  document
    .querySelectorAll(".summary-nav__item, .summary-sidebar__footer a")
    .forEach((link) => {
      link.classList.toggle(
        "summary-nav__item--active",
        link.dataset.page === page,
      );
    });
}


/**
 * Fades the freshly rendered page in when animation is requested.
 * @param {HTMLElement} app - The app root element.
 * @param {boolean} animatePage - True when the entry animation should run.
 */
function showRenderedPage(app, animatePage) {
  if (!animatePage) return;
  requestAnimationFrame(() => {
    app.classList.add("app-view--visible");
    app.classList.remove("app-view--entering");
  });
}


/**
 * @returns {string} The route key declared by the current HTML document.
 */
function getValidPage() {
  const page = document.body.dataset.page;
  return routes[page] ? page : "login";
}


/**
 * Returns the requested page or redirects logged-out visitors to the login.
 * @returns {string|null} The allowed route key, or null during redirect.
 */
function getAuthorizedPage() {
  const page = getValidPage();
  if (isProtectedPage(page) && !isUserAuthenticated())
    return redirectToLoginPage();
  return page;
}


/**
 * @returns {boolean} True when a signed-in user is stored.
 */
function isUserAuthenticated() {
  return Boolean(getStoredUser());
}


/**
 * Waits until Firebase has restored the auth session, when Firebase is used.
 */
async function waitForFirebaseAuth() {
  if (window.joinFirebaseReady) await window.joinFirebaseReady;
}


/**
 * Reads the route config and tells whether a page needs login.
 */
function isProtectedPage(page) {
  return Boolean(routes[page].protected);
}


/**
 * Replaces the URL with the login page when access is not allowed.
 */
function redirectToLoginPage() {
  window.location.replace(createPageUrl("login"));
  return null;
}


/**
 * Intercepts clicks on data-page links and starts the in-app navigation.
 * @param {MouseEvent} event - The document click event.
 */
function handlePageLinkClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target =
    event.target.nodeType === Node.ELEMENT_NODE
      ? event.target
      : event.target.parentElement;
  const link = target.closest("a[data-page], button[data-page]");
  if (!link || link.matches('a[target="_blank"], a[download]')) return;
  event.preventDefault();
  navigateToPage(link.dataset.page, getLinkParams(link));
}


/**
 * Collects extra URL parameters carried by a clicked data-page link.
 * @param {HTMLElement} link - The clicked link element.
 * @returns {Object} The parameters for the target URL.
 */
function getLinkParams(link) {
  const params = {};
  if (link.dataset.taskStatus) {
    params.status = link.dataset.taskStatus;
  }
  if (link.dataset.from) {
    params.from = link.dataset.from;
  }
  return params;
}


/**
 * Opens the HTML document assigned to a route.
 * @param {string} page - The route key of the target page.
 * @param {Object} [params] - Extra URL parameters for the target page.
 */
function navigateToPage(page, params = {}) {
  if (!routes[page] || pageTransitionRunning) return;
  window.location.assign(createPageUrl(page, params));
}


/**
 * Builds the index URL for a route and optional page parameters.
 * @param {string} page - The route key for the requested page.
 * @param {Object} [params] - Additional query parameters.
 * @returns {string} The relative application URL.
 */
function createPageUrl(page, params = {}) {
  const target = new URL(routes[page].file, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    target.searchParams.set(key, value);
  });
  return target.pathname + target.search;
}


/**
 * Runs synchronous startup code for public and static pages.
 * @param {string} page - The route key of the rendered page.
 */
function initStaticPage(page) {
  if (page === "login") initLoginValidation();
  if (page === "signup") initSignupValidation();
  if (page === "help") initHelpPage();
  if (page === "privacy-policy") initPrivacyLanguageSwitch();
  if (page === "legal-notice") initLegalNoticeLanguageSwitch();
}


/**
 * Runs the page-specific startup code after the markup was rendered.
 * @param {string} page - The route key of the rendered page.
 */
async function initPage(page) {
  initStaticPage(page);
  if (page === "contacts") await initContacts();
  if (usesAppShell(page) || isInternalLegalDocPage(page)) {
    initAppUser();
    initAppTopbar();
  }
  if (page === "summary") {
    initSummaryUser();
    await initSummaryMetrics();
  }
  if (page === "add-task") await initAddTaskValidation();
  if (page === "board") await initBoardTasks();
}


/**
 * @param {string} page - The route key to check.
 * @returns {boolean} True when the page renders inside the app layout.
 */
function usesAppShell(page) {
  return ["summary", "add-task", "board", "contacts", "help"].includes(page);
}


/**
 * Tells whether a legal page is viewed from inside the logged-in app.
 * @param {string} page - The route key to check.
 * @returns {boolean} True for legal pages opened by a signed-in user.
 */
function isInternalLegalDocPage(page) {
  return (
    (page === "privacy-policy" || page === "legal-notice") &&
    isUserAuthenticated()
  );
}


window.navigateToPage = navigateToPage;



