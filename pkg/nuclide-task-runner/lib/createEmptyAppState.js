/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {AppState} from './types';

export function createEmptyAppState(): AppState {
  return {
    activeTaskId: null,
    previousSessionActiveTaskId: null,
    showPlaceholderInitially: false,
    taskRunners: new Map(),
    projectRoot: null,
    projectWasOpened: false,
    tasksAreReady: false,
    taskLists: new Map(),
    runningTaskInfo: null,
    viewIsInitialized: false,
    visible: false,
    previousSessionVisible: null,
  };
}
