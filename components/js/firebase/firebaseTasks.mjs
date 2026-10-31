import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const db = getFirestore();


/**
 * Loads all tasks from Firestore with the document id attached.
 * @returns {Promise<Object[]>} Firestore tasks including document ids.
 */
async function loadTasks() {
  const snapshot = await getDocs(collection(db, "tasks"));
  return snapshot.docs.map((taskDoc) => ({
    id: taskDoc.id,
    ...taskDoc.data(),
  }));
}


/**
 * Creates one task in Firestore and adds server timestamps.
 * @param {Object} task - Task data to create.
 * @returns {Promise<Object>} Created task including its document id.
 */
async function createTask(task) {
  const taskData = getWritableTaskData(task);
  const taskRef = await addDoc(collection(db, "tasks"), {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: taskRef.id, ...taskData };
}


/**
 * Updates one Firestore task without saving local-only fields.
 * @param {string} taskId - Id of the task document to update.
 * @param {Object} task - Complete updated task data.
 * @returns {Promise<void>} Resolves after Firestore saves the update.
 */
async function updateTask(taskId, task) {
  await updateDoc(doc(db, "tasks", taskId), {
    ...getWritableTaskData(task),
    updatedAt: serverTimestamp(),
  });
}


/**
 * Updates only assignee references during a background data migration.
 * @param {string} taskId - Id of the migrated task document.
 * @param {Array|string} assignedTo - Current or legacy assignments.
 * @returns {Promise<void>} Resolves after Firestore saves the assignments.
 */
async function updateTaskAssignees(taskId, assignedTo) {
  await updateDoc(doc(db, "tasks", taskId), {
    assignedTo: normalizeTaskAssignees(assignedTo),
    updatedAt: serverTimestamp(),
  });
}


/**
 * Deletes one task from Firestore.
 * @param {string} taskId - Id of the task document to delete.
 * @returns {Promise<void>} Resolves after Firestore deletes the task.
 */
async function deleteTask(taskId) {
  await deleteDoc(doc(db, "tasks", taskId));
}


/**
 * Removes local-only fields and keeps assignees as a Firestore list.
 * @param {Object} task - Complete Join task to sanitize.
 * @returns {Object} Firestore-safe task data without local-only fields.
 */
function getWritableTaskData(task) {
  const { id, createdAt, updatedAt, assignedTo, ...taskData } = task;
  return {
    ...taskData,
    assignedTo: normalizeTaskAssignees(assignedTo),
  };
}


/**
 * Converts current and legacy task assignments into Firestore-safe references.
 * @param {Array|string} assignedTo - Stored task assignment value.
 * @returns {Object[]} Normalized contact references.
 */
function normalizeTaskAssignees(assignedTo) {
  return window.getTaskAssigneeReferences(assignedTo);
}

window.joinFirebaseTasks = {
  loadTasks,
  createTask,
  updateTask,
  updateTaskAssignees,
  deleteTask,
};
