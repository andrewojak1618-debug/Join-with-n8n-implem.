/**
 * Abbreviates every contact name part after the first name.
 * @param {string} name - Complete contact name.
 * @returns {string} Name shortened for narrow contact lists.
 */
function getAbbreviatedContactName(name) {
  const parts = normalizeText(name).split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  const initials = parts.slice(1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`);
  return `${parts[0]} ${initials.join(" ")}`;
}


/**
 * Prepares one contact for list rendering.
 * @param {Object} contact - Stored contact to prepare.
 * @returns {Object} Contact values used by the list template.
 */
function getContactItemViewData(contact) {
  return {
    id: contact.id,
    fullName: contact.name,
    shortName: getAbbreviatedContactName(contact.name),
    initials: getInitials(contact.name),
    email: contact.email,
    color: contact.color,
  };
}


/**
 * Prepares one alphabetic contact group for list rendering.
 * @param {string} letter - Uppercase initial of the contact group.
 * @param {Object[]} contacts - Contacts assigned to the group.
 * @returns {Object} Prepared group heading and contact list.
 */
function getContactGroupViewData(letter, contacts) {
  return { letter, contacts: contacts.map(getContactItemViewData) };
}
