/**
 * Maps a stored category key to its display label.
 * @param {string} category - Stored task category.
 * @returns {string} Readable category label.
 */
function formatBoardCategory(category) {
  const labels = {
    "technical-task": "Technical Task",
    "user-story": "User Story",
  };
  return labels[category] || "Task";
}


/**
 * Maps a stored status key to its display label.
 * @param {string} status - Stored board status.
 * @returns {string} Readable status label.
 */
function formatBoardStatus(status) {
  const labels = {
    todo: "to do",
    "in-progress": "in progress",
    feedback: "awaiting feedback",
    done: "done",
  };
  return labels[status] || "here";
}


/**
 * Returns the CSS modifier used by a category badge.
 * @param {string} category - Stored task category.
 * @returns {string} CSS modifier for the category badge.
 */
function getBoardCategoryClass(category) {
  return category === "technical-task" ? "technical" : "user-story";
}


const boardPreviewStopWords = new Set([
  "aber", "als", "auf", "aus", "bei", "das", "dem", "den", "der", "des",
  "die", "ein", "eine", "einer", "für", "hat", "hier", "ist", "mit", "oder",
  "sich", "und", "von", "werden", "wird", "zu", "zum", "zur",
  "across", "and", "are", "every", "for", "from", "has", "have", "into",
  "is", "of", "on", "or", "that", "the", "this", "to", "was", "with",
  "will", "you", "your",
]);


const boardPreviewActionWords = new Set([
  "add", "align", "build", "check", "collect", "coordinate", "create", "define",
  "implement", "improve", "prepare", "review", "summarize", "update",
]);


/**
 * Shortens card descriptions while details keep the complete text.
 * @param {string} text - Task description shown on the board card.
 * @returns {string} Description limited to the card preview length.
 */
function getBoardShortText(text) {
  const cleanedText = String(text);
  return cleanedText.length > 72
    ? `${cleanedText.slice(0, 69)}...`
    : cleanedText;
}


/**
 * Creates a short readable sentence without changing the stored description.
 * @param {string} text - Complete stored description.
 * @returns {string} Readable preview assembled from meaningful phrases.
 */
function getBoardDescriptionPreview(text) {
  const phrases = getBoardPreviewPhrases(text).slice(0, 3);
  if (!phrases.length) return getBoardShortText(text);
  const summary = formatBoardPreviewPhrases(phrases);
  return `${summary.charAt(0).toUpperCase()}${summary.slice(1)}.`;
}


/**
 * Extracts distinct one- or two-word phrases from the description.
 * @param {string} text - Complete stored description.
 * @returns {string[]} Distinct phrases suitable for the card preview.
 */
function getBoardPreviewPhrases(text) {
  const cleanedText = String(text).replace(/(?:https?:\/\/|www\.)\S+/gi, " ");
  const phrases = cleanedText
    .split(/[.!?;:,\n]+/)
    .flatMap(getBoardClausePhrases);
  const uniquePhrases = new Map(
    phrases.map((phrase) => [phrase.toLocaleLowerCase(), phrase]),
  );
  return [...uniquePhrases.values()];
}


/**
 * Groups neighboring meaningful words from one sentence clause.
 * @param {string} clause - One clause from the description.
 * @returns {string[]} Meaningful phrases found in the clause.
 */
function getBoardClausePhrases(clause) {
  const words = clause.match(/\p{L}[\p{L}\p{N}-]{2,}/gu) || [];
  const phrases = [];
  let currentPhrase = [];
  words.forEach((word) => {
    const normalizedWord = word.toLocaleLowerCase();
    if (boardPreviewStopWords.has(normalizedWord)) {
      appendBoardPreviewPhrase(phrases, currentPhrase);
      currentPhrase = [];
    } else if (!currentPhrase.length && boardPreviewActionWords.has(normalizedWord)) return;
    else currentPhrase.push(word);
    if (currentPhrase.length === 2) {
      appendBoardPreviewPhrase(phrases, currentPhrase);
      currentPhrase = [];
    }
  });
  appendBoardPreviewPhrase(phrases, currentPhrase);
  return phrases;
}


/**
 * Adds a collected phrase when it contains meaningful words.
 * @param {string[]} phrases - Target phrase list.
 * @param {string[]} words - Words collected for one phrase.
 */
function appendBoardPreviewPhrase(phrases, words) {
  if (words.length) phrases.push(words.join(" "));
}


/**
 * Joins preview phrases as a natural short list.
 * @param {string[]} phrases - Phrases selected for the preview.
 * @returns {string} Joined natural-language summary.
 */
function formatBoardPreviewPhrases(phrases) {
  if (phrases.length === 1) return phrases[0];
  const lastPhrase = phrases[phrases.length - 1];
  return `${phrases.slice(0, -1).join(", ")} and ${lastPhrase}`;
}


/**
 * Prepares the optional progress data for a board card.
 * @param {Object[]} subtasks - Subtasks stored on the task.
 * @returns {Object|null} Prepared progress values or null without subtasks.
 */
function getBoardSubtaskViewData(subtasks) {
  const items = Array.isArray(subtasks) ? subtasks : [];
  if (!items.length) return null;
  const doneCount = items.filter((subtask) => subtask.done).length;
  return {
    doneCount,
    totalCount: items.length,
    progressWidth: (doneCount / items.length) * 100,
    progressDetail: `${doneCount} of ${items.length} subtasks completed`,
  };
}


/**
 * Resolves and limits the assignee data shown on a board card.
 * @param {Array|string} assignedTo - Current or legacy task assignments.
 * @returns {Object} Visible assignees and their overflow count.
 */
function getBoardAssigneeViewData(assignedTo) {
  const assignees = getTaskAssigneeReferences(assignedTo)
    .map(getBoardDetailAssigneeViewData);
  const limited = getVisibleAssigneeChips(assignees, 4);
  return { assignees: limited.visible, overflowCount: limited.overflowCount };
}


/**
 * Prepares one resolved assignee for avatar rendering.
 * @param {Object} reference - Stored assignee reference.
 * @returns {Object} Resolved assignee data including initials.
 */
function getBoardDetailAssigneeViewData(reference) {
  const assignee = resolveAssigneeDisplay(reference, activeBoardContacts);
  return { ...assignee, initials: getInitials(assignee.name) };
}


/**
 * Returns the icon path for a stored priority.
 * @param {string} priority - Stored task priority.
 * @returns {string} Matching priority icon path.
 */
function getBoardPriorityIcon(priority) {
  const icons = {
    urgent: "./components/assets/img/icons/red_arrow_up.svg",
    medium: "./components/assets/img/icons/medium_even_orange.svg",
    low: "./components/assets/img/icons/green_arrow_down.svg",
  };
  return icons[String(priority).toLowerCase()] || icons.medium;
}


/**
 * Prepares all values required to render one board card.
 * @param {Object} task - Stored task to prepare.
 * @returns {Object} Complete board-card view data.
 */
function getBoardTaskViewData(task) {
  return {
    id: task.id,
    categoryClass: getBoardCategoryClass(task.category),
    categoryLabel: formatBoardCategory(task.category),
    title: task.title,
    description: task.description
      ? getBoardDescriptionPreview(task.description)
      : "No description",
    subtask: getBoardSubtaskViewData(task.subtasks),
    assignees: getBoardAssigneeViewData(task.assignedTo),
    priority: task.priority,
    priorityIcon: getBoardPriorityIcon(task.priority),
    moveTargets: getBoardMoveTargets(task.status),
  };
}


/**
 * Returns adjacent board columns as valid move targets.
 * @param {string} currentStatus - Current task status.
 * @returns {Object[]} Prepared adjacent move targets.
 */
function getBoardMoveTargets(currentStatus) {
  const order = ["todo", "in-progress", "feedback", "done"];
  const labels = { todo: "To-do", "in-progress": "In progress", feedback: "Review", done: "Done" };
  const currentIndex = order.indexOf(currentStatus);
  if (currentIndex < 0) return [];
  return [order[currentIndex - 1], order[currentIndex + 1]]
    .filter(Boolean)
    .map((status) => getBoardMoveTarget(status, currentIndex, order, labels));
}


/**
 * Prepares one destination in the mobile move menu.
 * @param {string} status - Status represented by the destination.
 * @param {number} currentIndex - Index of the task's current status.
 * @param {string[]} order - Ordered board status values.
 * @param {Object.<string, string>} labels - Display labels keyed by status.
 * @returns {Object} Prepared move target with label and icon.
 */
function getBoardMoveTarget(status, currentIndex, order, labels) {
  return {
    value: status,
    label: labels[status],
    icon: order.indexOf(status) < currentIndex ? "arrow_upward" : "arrow_downward",
  };
}


/**
 * Returns whether a contact is selected in an assignee value.
 * @param {Object} contact - Contact to look for.
 * @param {Array|string} assignedTo - Current or legacy task assignments.
 * @returns {boolean} Whether the contact is assigned to the task.
 */
function isBoardAssigneeSelected(contact, assignedTo) {
  return getTaskAssigneeReferences(assignedTo)
    .some((assignee) => isTaskAssigneeContact(assignee, contact));
}


/**
 * Prepares one checkable subtask for the task detail view.
 * @param {Object} subtask - Stored subtask to prepare.
 * @param {number} index - Position of the subtask in the task.
 * @returns {Object} Prepared detail-view subtask data.
 */
function getBoardDetailSubtaskViewData(subtask, index) {
  return {
    index,
    title: subtask.title,
    checkedAttribute: subtask.done ? "checked" : "",
  };
}
