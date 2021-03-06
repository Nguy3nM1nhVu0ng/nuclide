/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {Action, AnnotatedTaskMetadata, AppState, TaskId} from '../types';

import * as Actions from './Actions';
import {taskIdsAreEqual} from '../taskIdsAreEqual';

// Normally there would be more than one reducer. Since we were using a single reducer here before
// we ported to Redux, we just left it this way.
export function app(state: AppState, action: Action): AppState {
  switch (action.type) {
    case Actions.SELECT_TASK: {
      const {taskId} = action.payload;
      return {
        ...state,
        activeTaskId: taskId,
        previousSessionActiveTaskId: null,
      };
    }
    case Actions.TASK_COMPLETED: {
      return {
        ...state,
        runningTaskInfo: null,
      };
    }
    case Actions.TASK_PROGRESS: {
      const {progress} = action.payload;
      return {
        ...state,
        runningTaskInfo: {
          ...state.runningTaskInfo,
          progress,
        },
      };
    }
    case Actions.TASK_ERRORED: {
      return {
        ...state,
        runningTaskInfo: null,
      };
    }
    case Actions.TASK_STARTED: {
      const {task} = action.payload;
      return {
        ...state,
        runningTaskInfo: {
          task,
          progress: null,
        },
      };
    }
    case Actions.TASK_STOPPED: {
      return {
        ...state,
        runningTaskInfo: null,
      };
    }
    case Actions.SET_TOOLBAR_VISIBILITY: {
      const {visible} = action.payload;
      return {...state, visible};
    }
    case Actions.SET_PROJECT_ROOT: {
      const {projectRoot} = action.payload;
      return {
        ...state,
        projectRoot,
        projectWasOpened: state.projectWasOpened || (projectRoot != null),
        tasksAreReady: false,
      };
    }
    case Actions.SET_TASK_LISTS: {
      const {taskLists} = action.payload;
      return validateActiveTask({...state, taskLists});
    }
    case Actions.TASKS_READY: {
      // When the tasks become ready, select a default task.
      const initialTaskMeta = getInitialTaskMeta(
        state.previousSessionActiveTaskId,
        state.activeTaskId,
        state.taskLists,
      );

      return validateActiveTask({
        ...state,
        tasksAreReady: true,
        activeTaskId: initialTaskMeta == null
          ? null
          : {taskRunnerId: initialTaskMeta.taskRunnerId, type: initialTaskMeta.type},
        previousSessionActiveTaskId: null,
      });
    }
    case Actions.INITIALIZE_VIEW: {
      const {visible} = action.payload;
      return {
        ...state,
        viewIsInitialized: true,
        visible,
        previousSessionVisible: null,
      };
    }
    case Actions.REGISTER_TASK_RUNNER: {
      const {taskRunner} = action.payload;
      return {
        ...state,
        taskRunners: new Map(state.taskRunners).set(taskRunner.id, taskRunner),
      };
    }
    case Actions.UNREGISTER_TASK_RUNNER: {
      const {id} = action.payload;
      const taskRunners = new Map(state.taskRunners);
      const taskLists = new Map(state.taskLists);
      taskRunners.delete(id);
      taskLists.delete(id);
      return validateActiveTask({
        ...state,
        taskRunners,
        taskLists,
      });
    }
  }

  return state;
}

/**
 * Ensure that the active task is in the task list. If not, pick a fallback.
 */
function validateActiveTask(state: AppState): AppState {
  if (activeTaskIsValid(state)) { return state; }
  return {
    ...state,
    activeTaskId: null,
  };
}

/**
 * Is the active task a valid one according to the tasks we have?
 */
function activeTaskIsValid(state: AppState): boolean {
  if (state.activeTaskId == null) { return false; }
  const {activeTaskId} = state;
  for (const taskList of state.taskLists.values()) {
    for (const taskMeta of taskList) {
      if (
        taskMeta.taskRunnerId === activeTaskId.taskRunnerId
        && taskMeta.type === activeTaskId.type
        && !taskMeta.disabled
      ) {
        return true;
      }
    }
  }
  return false;
}

const flatten = arr => Array.prototype.concat.apply([], arr);

function getInitialTaskMeta(
  previousSessionActiveTaskId: ?TaskId,
  activeTaskId: ?TaskId,
  taskLists: Map<string, Array<AnnotatedTaskMetadata>>,
): ?AnnotatedTaskMetadata {
  const allTaskMetadatas = flatten(Array.from(taskLists.values()));
  let candidate;

  for (const taskMeta of allTaskMetadatas) {
    // No disabled tasks.
    if (taskMeta.disabled) {
      continue;
    }

    // If the task we're waiting to restore is present, use that.
    if (previousSessionActiveTaskId && taskIdsAreEqual(taskMeta, previousSessionActiveTaskId)) {
      return taskMeta;
    }

    // If the task that's already active is present, use that.
    if (activeTaskId && taskIdsAreEqual(taskMeta, activeTaskId)) {
      return taskMeta;
    }

    if (candidate == null) {
      candidate = taskMeta;
      continue;
    }

    // Prefer tasks that are explicitly enabled over those that aren't.
    if (taskMeta.disabled === false && candidate.disabled == null) {
      candidate = taskMeta;
      continue;
    }

    // Prefer tasks with higher priority.
    const priorityDiff = (taskMeta.priority || 0) - (candidate.priority || 0);
    if (priorityDiff !== 0) {
      if (priorityDiff > 0) {
        candidate = taskMeta;
      }
      continue;
    }

    // Prefer task runner names that come first alphabetically.
    const nameDiff = taskMeta.taskRunnerName.localeCompare(candidate.taskRunnerName);
    if (nameDiff !== 0) {
      if (nameDiff < 0) {
        candidate = taskMeta;
      }
      continue;
    }

    // Prefer task types that come first alphabetically.
    const typeDiff = taskMeta.type.localeCompare(candidate.type);
    if (typeDiff !== 0) {
      if (typeDiff < 0) {
        candidate = taskMeta;
      }
      continue;
    }
  }

  return candidate;
}
