/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number;
  player: PlayerColor;
  position: number; // -1 for base, 0-51 for main path, 52-57 for home path, 58 for home
  initialPosition: number; // The index in the base (0-3)
}

export interface Player {
  color: PlayerColor;
  tokens: Token[];
  startPathIndex: number; // Where the player enters the main path
  homePathStartIndex: number; // Where the player enters their home path
  isAI: boolean;
}

export const BOARD_SIZE = 15;

// Path mapping for each player
// Main path is 52 cells (0 to 51)
// Red starts at 0
// Green starts at 13
// Yellow starts at 26
// Blue starts at 39

export const PLAYER_CONFIGS: Record<PlayerColor, { start: number; homeEntry: number }> = {
  red: { start: 0, homeEntry: 50 },
  green: { start: 13, homeEntry: 11 },
  yellow: { start: 26, homeEntry: 24 },
  blue: { start: 39, homeEntry: 37 },
};

export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

// Grid coordinates for the main path (0-51)
// Starting from Red's entry (6,1) and going clockwise
export const MAIN_PATH_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // Red entry path
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // Up to Green
  [0, 7], [0, 8], // Green top
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // Down from Green
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // Right to Yellow
  [7, 14], [8, 14], // Yellow right
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // Left from Yellow
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // Down to Blue
  [14, 7], [14, 6], // Blue bottom
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // Up from Blue
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // Left to Red
  [7, 0], [6, 0] // Red left
];

// Home path coordinates for each player
export const HOME_PATH_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Base coordinates (where tokens sit initially)
export const BASE_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[2, 2], [2, 3], [3, 2], [3, 3]],
  green: [[2, 11], [2, 12], [3, 11], [3, 12]],
  yellow: [[11, 11], [11, 12], [12, 11], [12, 12]],
  blue: [[11, 2], [11, 3], [12, 2], [12, 3]],
};
