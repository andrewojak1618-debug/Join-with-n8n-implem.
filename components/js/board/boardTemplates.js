/**
 * Returns the complete card markup for prepared task view data.
 * @param {Object} task - Prepared task view data.
 * @returns {string} HTML markup for one board card.
 */
function getBoardTaskTemplate(task) {
  return `
    <article class="board-card" data-task-id="${escapeHtmlText(task.id)}" tabindex="0">
      ${getBoardCardMoveTemplate(task.moveTargets)}
      <span class="board-status-pill board-card__category board-card__category--${task.categoryClass}">
        ${escapeHtmlText(task.categoryLabel)}
      </span>
      <h3 class="board-card__title">${escapeHtmlText(task.title)}</h3>
      <p class="board-card__description">${escapeHtmlText(task.description)}</p>
      ${getBoardSubtaskTemplate(task.subtask)}
      <div class="board-card__footer">
        ${getBoardAssigneeTemplate(task.assignees)}
        <img class="board-card__priority-icon" src="${task.priorityIcon}"
          alt="${escapeHtmlText(task.priority)} priority" />
      </div>
    </article>`;
}


/**
 * Returns the optional subtask progress markup.
 * @param {Object|null} progress - Prepared progress values, if subtasks exist.
 * @returns {string} HTML markup for the progress row or an empty string.
 */
function getBoardSubtaskTemplate(progress) {
  if (!progress) return "";
  return `
    <button class="board-card__subtasks" type="button"
      aria-label="${progress.progressDetail}"
      data-progress-detail="${progress.progressDetail}">
      <span class="board-card__progress"><span style="width: ${progress.progressWidth}%"></span></span>
      <span>${progress.doneCount}/${progress.totalCount} Subtasks</span>
    </button>`;
}


/**
 * Returns the prepared avatar group for one board card.
 * @param {Object} viewData - Prepared assignees and overflow count.
 * @returns {string} HTML markup for the avatar group.
 */
function getBoardAssigneeTemplate(viewData) {
  if (!viewData.assignees.length) return "<span></span>";
  const avatars = viewData.assignees.map(getBoardAvatarTemplate).join("");
  return `<div class="board-card__assignees">${avatars}${getBoardAvatarOverflowTemplate(viewData.overflowCount)}</div>`;
}


/**
 * Returns one prepared board-card avatar.
 * @param {Object} assignee - Prepared assignee avatar data.
 * @returns {string} HTML markup for one avatar.
 */
function getBoardAvatarTemplate(assignee) {
  return `<span class="board-card__avatar" style="background-color: ${escapeHtmlText(assignee.color)}">${assignee.initials}</span>`;
}


/**
 * Returns the optional hidden-assignee counter.
 * @param {number} overflowCount - Number of assignees not shown directly.
 * @returns {string} Overflow avatar markup or an empty string.
 */
function getBoardAvatarOverflowTemplate(overflowCount) {
  if (!overflowCount) return "";
  return `<span class="board-card__avatar board-card__avatar--overflow">+${overflowCount}</span>`;
}


/**
 * Returns one prepared assignee row for the detail view.
 * @param {Object} assignee - Prepared assignee detail data.
 * @returns {string} HTML markup for one assignee row.
 */
function getBoardDetailAssigneeTemplate(assignee) {
  return `
    <div class="board-detail-assignee">
      <span class="board-detail-assignee__avatar" style="background-color: ${escapeHtmlText(assignee.color)}">${assignee.initials}</span>
      <span>${escapeHtmlText(assignee.name)}</span>
    </div>`;
}


/**
 * Returns the empty-state markup for a prepared status label.
 * @param {string} statusLabel - Readable status label for the empty column.
 * @returns {string} HTML markup for the empty board state.
 */
function getBoardEmptyTemplate(statusLabel) {
  return `<p class="board-empty-state">No tasks ${escapeHtmlText(statusLabel)}</p>`;
}


/**
 * Returns one prepared checkable subtask row.
 * @param {Object} subtask - Prepared subtask detail data.
 * @returns {string} HTML markup for one checkable subtask.
 */
function getBoardDetailSubtaskTemplate(subtask) {
  return `
    <label class="board-detail-subtask">
      <input type="checkbox" data-detail-subtask-index="${subtask.index}" ${subtask.checkedAttribute} />
      <span>${escapeHtmlText(subtask.title)}</span>
    </label>`;
}


/**
 * Returns one prepared contact option for the board edit dropdown.
 * @param {Object} contact - Prepared contact option data.
 * @returns {string} HTML markup for one selectable contact.
 */
function getBoardEditAssigneeTemplate(contact) {
  return getAssigneeOptionTemplate(contact);
}


/**
 * Returns the mobile move button and its prepared destination menu.
 * @param {Object[]} targets - Prepared destination column options.
 * @returns {string} HTML markup for the mobile move controls.
 */
function getBoardCardMoveTemplate(targets) {
  const options = targets.map(getBoardMoveOptionTemplate).join("");
  return `
    <div class="board-card-move">
      <button type="button" class="board-card-move__toggle" aria-haspopup="true" aria-expanded="false" aria-label="Move task to another column">
        <img src="./components/assets/img/icons/change_task_mobile.svg" alt="" aria-hidden="true" />
      </button>
      <div class="board-card-move__menu" hidden>
        <span class="board-card-move__title">Move to</span>
        ${options}
      </div>
    </div>`;
}


/**
 * Returns one prepared option in the mobile move menu.
 * @param {Object} target - Prepared destination column data.
 * @returns {string} HTML markup for one move option.
 */
function getBoardMoveOptionTemplate(target) {
  return `
    <button type="button" class="board-card-move__option" data-move-status="${target.value}">
      <img src="./components/assets/img/icons/${target.icon}.svg" alt="" aria-hidden="true" />
      ${target.label}
    </button>`;
}
