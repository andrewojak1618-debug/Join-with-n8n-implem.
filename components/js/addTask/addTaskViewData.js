/**
 * Prepares one contact for the assignee option template.
 * @param {Object} contact - Contact selected or offered as an assignee.
 * @param {boolean} [isChecked=false] - Whether the option starts selected.
 * @returns {Object} Prepared contact option view data.
 */
function getAssigneeOptionViewData(contact, isChecked = false) {
  return {
    id: contact.id,
    name: contact.name,
    initials: getInitials(contact.name),
    color: contact.color || "var(--color-primary-auth)",
    checkedAttribute: isChecked ? "checked" : "",
  };
}


/**
 * Prepares one selected assignee avatar.
 * @param {Object} contact - Selected contact represented by the avatar.
 * @returns {Object} Initials and color used by the avatar template.
 */
function getAssigneeChipViewData(contact) {
  return {
    initials: getInitials(contact.name),
    color: contact.color || "var(--color-primary-auth)",
  };
}
