/**
 * Returns the list item markup for one prepared contact.
 * @param {Object} contact - Prepared contact view data.
 * @returns {string} HTML markup for one contact item.
 */
function getContactItemTemplate(contact) {
  return `
  <li class="contacts-item" data-contact-id="${escapeHtmlText(contact.id)}">
    <span class="contacts-item-avatar" style="background-color: ${escapeHtmlText(contact.color)}">
      ${contact.initials}
    </span>
    <div class="contacts-item-info">
      <p class="contacts-item-name" title="${escapeHtmlText(contact.fullName)}">
        <span class="contacts-item-name__full">${escapeHtmlText(contact.fullName)}</span>
        <span class="contacts-item-name__short">${escapeHtmlText(contact.shortName)}</span>
      </p>
      <a class="contacts-item-email">${escapeHtmlText(contact.email)}</a>
    </div>
  </li>`;
}


/**
 * Loads an HTML fragment and returns its first root element.
 * @param {string} templatePath - Relative path of the HTML template.
 * @returns {Promise<Element|null>} First template root element, if present.
 */
async function createTemplateElement(templatePath) {
  const response = await fetch(templatePath);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = await response.text();
  return wrapper.firstElementChild;
}


/**
 * Returns one prepared alphabetic contact section.
 * @param {Object} group - Prepared letter and contact collection.
 * @returns {string} HTML markup for one contact group.
 */
function getContactGroupTemplate(group) {
  return `
  <li class="contacts-group">
    <span class="contacts-group-letter">${escapeHtmlText(group.letter)}</span>
    <ul class="contacts-group-list">${group.contacts.map(getContactItemTemplate).join("")}</ul>
  </li>`;
}
