let addTaskDatePickerMonth = new Date();
let addTaskDatePickerDocumentEventsBound = false;


/** Initializes the Add Task calendar and keeps it anchored below its field. */
function initAddTaskDueDatePicker() {
  const input = document.getElementById("taskDueDate");
  const toggle = document.getElementById("taskDueDateToggle");
  if (!input || !toggle) return;
  input.addEventListener("click", openAddTaskDatePicker);
  input.addEventListener("keydown", handleAddTaskDatePickerKeydown);
  toggle.addEventListener("click", toggleAddTaskDatePicker);
  bindAddTaskDatePickerControls();
  bindAddTaskDatePickerDocumentEvents();
  initAddTaskDateScrollFields();
  renderAddTaskDatePicker();
}


/** Binds month navigation and date selection to the current calendar instance. */
function bindAddTaskDatePickerControls() {
  document.getElementById("taskDueDatePreviousMonth")
    .addEventListener("click", () => moveAddTaskDatePickerMonth(-1));
  document.getElementById("taskDueDateNextMonth")
    .addEventListener("click", () => moveAddTaskDatePickerMonth(1));
  document.getElementById("taskDueDateDays")
    .addEventListener("click", handleAddTaskDateSelection);
}


/** Binds global close actions once, even when Add Task is opened repeatedly. */
function bindAddTaskDatePickerDocumentEvents() {
  if (addTaskDatePickerDocumentEventsBound) return;
  document.addEventListener("click", closeAddTaskDatePickerOutside);
  document.addEventListener("keydown", closeAddTaskDatePickerOnEscape);
  addTaskDatePickerDocumentEventsBound = true;
}


/** Opens the calendar when the readonly date field is selected. */
function openAddTaskDatePicker() {
  setAddTaskDatePickerOpen(true);
}


/**
 * Toggles the calendar from its icon button.
 * @param {MouseEvent} event - Click event from the calendar toggle.
 */
function toggleAddTaskDatePicker(event) {
  event.preventDefault();
  const calendar = document.getElementById("taskDueDateCalendar");
  setAddTaskDatePickerOpen(calendar?.hidden);
}


/**
 * Supports keyboard opening from the readonly date field.
 * @param {KeyboardEvent} event - Keydown event from the date input.
 */
function handleAddTaskDatePickerKeydown(event) {
  if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  setAddTaskDatePickerOpen(true);
}


/**
 * Closes the calendar when the user clicks outside its molecule.
 * @param {MouseEvent} event - Document click used to detect an outside target.
 */
function closeAddTaskDatePickerOutside(event) {
  if (event.target.closest("#addTaskDatePicker")) return;
  setAddTaskDatePickerOpen(false);
}


/**
 * Closes the calendar with Escape and returns focus to its input.
 * @param {KeyboardEvent} event - Document keydown event.
 */
function closeAddTaskDatePickerOnEscape(event) {
  if (event.key !== "Escape") return;
  const calendar = document.getElementById("taskDueDateCalendar");
  if (calendar?.hidden) return;
  setAddTaskDatePickerOpen(false);
  document.getElementById("taskDueDate")?.focus();
}


/**
 * Updates visibility and matching expanded states for the calendar.
 * @param {boolean} isOpen - Whether the calendar should be visible.
 */
function setAddTaskDatePickerOpen(isOpen) {
  const calendar = document.getElementById("taskDueDateCalendar");
  const input = document.getElementById("taskDueDate");
  const toggle = document.getElementById("taskDueDateToggle");
  if (!calendar || !input || !toggle) return;
  if (isOpen && !getAddTaskDueDate()) setDefaultAddTaskDueDate();
  calendar.hidden = !isOpen;
  input.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) resetAddTaskDatePickerMonth();
}


/** Opens at the selected date or at the current month. */
function resetAddTaskDatePickerMonth() {
  const selected = getSelectedAddTaskDate();
  addTaskDatePickerMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  setAddTaskDateScrollValues(selected);
  renderAddTaskDatePicker();
}


/**
 * Returns the selected date or today when the field is still empty.
 * @returns {Date} Selected local date or the current date.
 */
function getSelectedAddTaskDate() {
  const value = document.getElementById("taskDueDate").value;
  return parseTaskDueDate(value) || new Date();
}


/**
 * Moves the visible calendar month by the requested offset.
 * @param {number} offset - Number of months to move forward or backward.
 */
function moveAddTaskDatePickerMonth(offset) {
  const year = addTaskDatePickerMonth.getFullYear();
  const month = addTaskDatePickerMonth.getMonth() + offset;
  addTaskDatePickerMonth = new Date(year, month, 1);
  renderAddTaskDatePicker();
}


/** Renders the current month and its selectable day buttons. */
function renderAddTaskDatePicker() {
  const title = document.getElementById("taskDueDateMonth");
  const days = document.getElementById("taskDueDateDays");
  if (!title || !days) return;
  title.textContent = addTaskDatePickerMonth.toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });
  days.replaceChildren(createAddTaskDatePickerDays());
  updateAddTaskDatePickerPreviousButton();
}


/**
 * Builds blank offsets and all days for the visible month.
 * @returns {DocumentFragment} Calendar offsets and day buttons.
 */
function createAddTaskDatePickerDays() {
  const fragment = document.createDocumentFragment();
  const year = addTaskDatePickerMonth.getFullYear();
  const month = addTaskDatePickerMonth.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  for (let index = 0; index < offset; index += 1) fragment.append(document.createElement("span"));
  const count = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= count; day += 1) fragment.append(createAddTaskDatePickerDay(day));
  return fragment;
}


/**
 * Creates one calendar day with past and selected states.
 * @param {number} day - Day number in the visible month.
 * @returns {HTMLButtonElement} Configured calendar day button.
 */
function createAddTaskDatePickerDay(day) {
  const date = new Date(addTaskDatePickerMonth.getFullYear(), addTaskDatePickerMonth.getMonth(), day);
  const value = getTodayTaskDueDate(date);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "date-picker__day";
  button.textContent = String(day);
  button.dataset.date = value;
  button.disabled = isPastAddTaskDueDate(value);
  setAddTaskDatePickerDayStates(button, value);
  button.setAttribute("aria-label", date.toLocaleDateString("en-US", { dateStyle: "long" }));
  return button;
}


/**
 * Applies today's outline and the active selection to a day button.
 * @param {HTMLButtonElement} button - Calendar day button to update.
 * @param {string} value - Normalized date stored by the button.
 */
function setAddTaskDatePickerDayStates(button, value) {
  const selected = getAddTaskDueDate() === value;
  button.classList.toggle("date-picker__day--today", value === getTodayTaskDueDate());
  button.classList.toggle("date-picker__day--selected", selected);
  button.setAttribute("aria-pressed", String(selected));
}


/** Prevents navigating to months that contain only expired dates. */
function updateAddTaskDatePickerPreviousButton() {
  const today = new Date();
  const current = today.getFullYear() * 12 + today.getMonth();
  const visible = addTaskDatePickerMonth.getFullYear() * 12 + addTaskDatePickerMonth.getMonth();
  document.getElementById("taskDueDatePreviousMonth").disabled = visible <= current;
}


/**
 * Stores a selected desktop calendar date.
 * @param {MouseEvent} event - Click event from the calendar grid.
 */
function handleAddTaskDateSelection(event) {
  const day = event.target.closest("[data-date]");
  if (!day || day.disabled) return;
  setAddTaskDueDate(day.dataset.date);
  setAddTaskDateScrollValues(parseTaskDueDate(day.dataset.date));
  setAddTaskDatePickerOpen(false);
  document.getElementById("taskDueDate").focus();
}


/** Builds the three compact mobile scroll fields. */
function initAddTaskDateScrollFields() {
  fillAddTaskDateScrollSelect("taskDueDateDay", 1, 31);
  fillAddTaskDateMonthSelect();
  const year = new Date().getFullYear();
  fillAddTaskDateScrollSelect("taskDueDateYear", year, year + 20);
  document.getElementById("taskDueDateScrollFields")
    .addEventListener("change", handleAddTaskDateScrollChange);
  setAddTaskDateScrollValues(getSelectedAddTaskDate());
}


/**
 * Fills a numeric scroll field inclusively.
 * @param {string} id - Id of the select element to populate.
 * @param {number} start - First numeric option value.
 * @param {number} end - Last numeric option value.
 */
function fillAddTaskDateScrollSelect(id, start, end) {
  const select = document.getElementById(id);
  const options = [];
  for (let value = start; value <= end; value += 1) options.push(new Option(value, value));
  select.replaceChildren(...options);
}


/** Fills the responsive month field with compact labels. */
function fillAddTaskDateMonthSelect() {
  const select = document.getElementById("taskDueDateMonthSelect");
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const options = Array.from({ length: 12 }, (_, index) => (
    new Option(formatter.format(new Date(2024, index, 1)), index + 1)
  ));
  select.replaceChildren(...options);
}


/**
 * Synchronizes the mobile scroll positions with a date.
 * @param {Date} date - Local date reflected by the scroll fields.
 */
function setAddTaskDateScrollValues(date) {
  document.getElementById("taskDueDateDay").value = date.getDate();
  document.getElementById("taskDueDateMonthSelect").value = date.getMonth() + 1;
  document.getElementById("taskDueDateYear").value = date.getFullYear();
}


/** Converts the mobile scroll selection into a valid future date. */
function handleAddTaskDateScrollChange() {
  const day = Number(document.getElementById("taskDueDateDay").value);
  const month = Number(document.getElementById("taskDueDateMonthSelect").value);
  const year = Number(document.getElementById("taskDueDateYear").value);
  const lastDay = new Date(year, month, 0).getDate();
  const selected = new Date(year, month - 1, Math.min(day, lastDay));
  const validDate = selected < getStartOfToday() ? getStartOfToday() : selected;
  setAddTaskDateScrollValues(validDate);
  setAddTaskDueDate(getTodayTaskDueDate(validDate));
}


/**
 * Returns today at local midnight for reliable date comparisons.
 * @returns {Date} Current local date without a time component.
 */
function getStartOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}


/** Uses today's local date when the calendar is opened without a value. */
function setDefaultAddTaskDueDate() {
  const today = getStartOfToday();
  setAddTaskDueDate(getTodayTaskDueDate(today));
  setAddTaskDateScrollValues(today);
  addTaskDatePickerMonth = new Date(today.getFullYear(), today.getMonth(), 1);
}


/**
 * Updates the shared input and triggers the existing validation.
 * @param {string|Date} value - Date value to normalize and store.
 */
function setAddTaskDueDate(value) {
  const input = document.getElementById("taskDueDate");
  input.value = formatTaskDueDate(value);
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
