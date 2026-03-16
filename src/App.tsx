/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, RotateCcw, Trophy, User, Users, Play } from 'lucide-react';
import { 
  PlayerColor, Token, Player, 
  BOARD_SIZE, PLAYER_CONFIGS, SAFE_ZONES, 
  MAIN_PATH_COORDS, HOME_PATH_COORDS, BASE_COORDS 
} from './types';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'winner'>('setup');
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [numPlayers, setNumPlayers] = useState(2);
  const [canRoll, setCanRoll] = useState(true);
  const [movableTokens, setMovableTokens] = useState<number[]>([]); // IDs of tokens that can move

  const rollSoundRef = useRef<HTMLAudioElement | null>(null);
  const moveSoundRef = useRef<HTMLAudioElement | null>(null);
  const captureSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize game
  const startGame = (count: number) => {
    const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    const newPlayers: Player[] = colors.slice(0, count).map(color => ({
      color,
      tokens: Array.from({ length: 4 }, (_, i) => ({
        id: color === 'red' ? i : color === 'green' ? i + 4 : color === 'yellow' ? i + 8 : i + 12,
        player: color,
        position: -1,
        initialPosition: i
      })),
      startPathIndex: PLAYER_CONFIGS[color].start,
      homePathStartIndex: PLAYER_CONFIGS[color].homeEntry,
      isAI: false
    }));

    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setDiceValue(null);
    setGameState('playing');
    setWinner(null);
    setCanRoll(true);
    setMovableTokens([]);
  };

  const rollDice = () => {
    if (!canRoll || isRolling) return;

    setIsRolling(true);
    setMovableTokens([]);
    
    // Simulate roll animation
    setTimeout(() => {
      const newValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(newValue);
      setIsRolling(false);
      
      const currentPlayer = players[currentPlayerIndex];
      const possibleMoves = getMovableTokens(currentPlayer, newValue);
      
      if (possibleMoves.length === 0) {
        // No moves possible, wait a bit and switch turn
        setTimeout(() => {
          nextTurn(newValue === 6);
        }, 1000);
      } else {
        setMovableTokens(possibleMoves);
        setCanRoll(false);
      }
    }, 600);
  };

  const getMovableTokens = (player: Player, dice: number): number[] => {
    return player.tokens.filter(token => {
      // Token in base can only move if dice is 6
      if (token.position === -1) return dice === 6;
      
      // Token already home
      if (token.position === 58) return false;
      
      // Token in home path
      if (token.position >= 52) {
        return token.position + dice <= 58;
      }
      
      // Token on main path
      return true;
    }).map(t => t.id);
  };

  const moveToken = (tokenId: number) => {
    if (canRoll || diceValue === null) return;
    if (!movableTokens.includes(tokenId)) return;

    const newPlayers = [...players];
    const playerIndex = currentPlayerIndex;
    const tokenIndex = newPlayers[playerIndex].tokens.findIndex(t => t.id === tokenId);
    const token = newPlayers[playerIndex].tokens[tokenIndex];
    const dice = diceValue;

    let newPosition = token.position;

    if (token.position === -1) {
      // Move from base to start
      newPosition = 0;
    } else if (token.position < 52) {
      // Move on main path
      const stepsToHomeEntry = (PLAYER_CONFIGS[token.player].homeEntry - token.position + 52) % 52;
      
      if (dice > stepsToHomeEntry) {
        // Enter home path
        newPosition = 52 + (dice - stepsToHomeEntry - 1);
      } else {
        newPosition = (token.position + dice) % 52;
      }
    } else {
      // Move on home path
      newPosition = token.position + dice;
    }

    // Update token position
    newPlayers[playerIndex].tokens[tokenIndex].position = newPosition;

    let gotExtraTurn = dice === 6;

    // Check for win
    const isHome = newPosition === 58;
    if (isHome) {
      gotExtraTurn = true;
      const allHome = newPlayers[playerIndex].tokens.every(t => t.position === 58);
      if (allHome) {
        setWinner(newPlayers[playerIndex].color);
        setGameState('winner');
        return;
      }
    }

    // Check for capture if on main path
    if (newPosition < 52) {
      const absolutePos = (newPosition + PLAYER_CONFIGS[token.player].start) % 52;
      const isSafe = SAFE_ZONES.includes(absolutePos);

      if (!isSafe) {
        newPlayers.forEach((p, pIdx) => {
          if (pIdx !== playerIndex) {
            p.tokens.forEach((t, tIdx) => {
              const otherAbsolutePos = t.position === -1 ? -1 : (t.position + PLAYER_CONFIGS[t.player].start) % 52;
              if (t.position < 52 && t.position !== -1 && otherAbsolutePos === absolutePos) {
                // Capture!
                p.tokens[tIdx].position = -1;
                gotExtraTurn = true;
              }
            });
          }
        });
      }
    }

    setPlayers(newPlayers);
    setMovableTokens([]);

    // Switch turn
    nextTurn(gotExtraTurn);
  };

  const nextTurn = (keepPlayer: boolean) => {
    if (!keepPlayer) {
      setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }
    setDiceValue(null);
    setCanRoll(true);
    setMovableTokens([]);
  };

  const getCellCoords = (token: Token): [number, number] => {
    if (token.position === -1) {
      return BASE_COORDS[token.player][token.initialPosition];
    }
    if (token.position === 58) {
      return [7, 7]; // Center
    }
    if (token.position >= 52) {
      return HOME_PATH_COORDS[token.player][token.position - 52];
    }
    
    // Main path needs to be relative to player's start
    const absoluteIndex = (token.position + PLAYER_CONFIGS[token.player].start) % 52;
    return MAIN_PATH_COORDS[absoluteIndex];
  };

  const renderBoard = () => {
    const cells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        let bgColor = 'bg-white';
        let border = 'border border-gray-200';
        let content = null;

        // Bases
        if (r < 6 && c < 6) bgColor = 'bg-red-500/20';
        if (r < 6 && c > 8) bgColor = 'bg-green-500/20';
        if (r > 8 && c > 8) bgColor = 'bg-yellow-500/20';
        if (r > 8 && c < 6) bgColor = 'bg-blue-500/20';

        // Inner Base Squares
        const isBaseInner = (r, c) => {
          return (r >= 1 && r <= 4 && c >= 1 && c <= 4) ||
                 (r >= 1 && r <= 4 && c >= 10 && c <= 13) ||
                 (r >= 10 && r <= 13 && c >= 10 && c <= 13) ||
                 (r >= 10 && r <= 13 && c >= 1 && c <= 4);
        };
        if (isBaseInner(r, c)) bgColor = 'bg-white shadow-inner';

        // Home Paths
        if (r === 7 && c > 0 && c < 7) bgColor = 'bg-red-500';
        if (c === 7 && r > 0 && r < 7) bgColor = 'bg-green-500';
        if (r === 7 && c > 7 && c < 14) bgColor = 'bg-yellow-500';
        if (c === 7 && r > 7 && r < 14) bgColor = 'bg-blue-500';

        // Start Squares
        if (r === 6 && c === 1) bgColor = 'bg-red-500';
        if (r === 1 && c === 8) bgColor = 'bg-green-500';
        if (r === 8 && c === 13) bgColor = 'bg-yellow-500';
        if (r === 13 && c === 6) bgColor = 'bg-blue-500';

        // Safe Zones (Stars)
        const isSafe = MAIN_PATH_COORDS.some((coord, idx) => 
          coord[0] === r && coord[1] === c && SAFE_ZONES.includes(idx)
        );
        if (isSafe && bgColor === 'bg-white') {
          content = <div className="text-gray-300 text-[10px]">★</div>;
        }

        // Center Home
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
          bgColor = 'bg-gray-100';
          border = 'border-none';
          if (r === 7 && c === 7) {
            content = (
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-red-500 rotate-90 -translate-x-4" />
                   <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-green-500 rotate-180 -translate-y-4" />
                   <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-yellow-500 -rotate-90 translate-x-4" />
                   <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-blue-500 translate-y-4" />
                </div>
              </div>
            );
          }
        }

        cells.push(
          <div 
            key={`${r}-${c}`} 
            className={`w-full h-full ${bgColor} ${border} flex items-center justify-center relative`}
            style={{ gridRow: r + 1, gridColumn: c + 1 }}
          >
            {content}
          </div>
        );
      }
    }
    return cells;
  };

  const renderDice = (value: number | null) => {
    if (!value) return <Dices className="w-10 h-10 opacity-20" />;
    
    const dots = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };

    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-12 h-12">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {dots[value as keyof typeof dots].includes(i) && (
              <div className="w-2 h-2 rounded-full bg-current" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 font-sans">
      <AnimatePresence>
        {gameState === 'setup' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
          >
            <h1 className="text-4xl font-bold mb-2 text-stone-800">Ludo Master</h1>
            <p className="text-stone-500 mb-8 italic">Classic board game fun</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-stone-600 uppercase tracking-wider mb-4">
                  Select Players
                </label>
                <div className="flex justify-center gap-4">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setNumPlayers(n)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
                        numPlayers === n 
                        ? 'bg-stone-800 text-white scale-110 shadow-lg' 
                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => startGame(numPlayers)}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group"
              >
                <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                Start Game
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Left Panel: Players Info */}
            <div className="flex flex-col gap-4 w-48">
              {players.map((player, idx) => (
                <div 
                  key={player.color}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    currentPlayerIndex === idx 
                    ? `border-${player.color}-500 bg-${player.color}-50 shadow-md scale-105` 
                    : 'border-transparent bg-white opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-${player.color}-500`} />
                    <span className="font-bold capitalize text-stone-700">{player.color}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {player.tokens.map(t => (
                      <div 
                        key={t.id} 
                        className={`w-2 h-2 rounded-full ${t.position === 58 ? `bg-${player.color}-500` : 'bg-stone-200'}`} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Center: Board */}
            <div className="relative bg-white p-2 rounded-xl shadow-2xl border-8 border-stone-800">
              <div 
                className="grid gap-0" 
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                  width: 'min(90vw, 600px)',
                  height: 'min(90vw, 600px)'
                }}
              >
                {renderBoard()}

                {/* Tokens */}
                {players.flatMap(p => p.tokens).map(token => {
                  const [r, c] = getCellCoords(token);
                  const isMovable = movableTokens.includes(token.id);
                  
                  return (
                    <motion.div
                      key={token.id}
                      layoutId={`token-${token.id}`}
                      initial={false}
                      animate={{
                        gridRow: r + 1,
                        gridColumn: c + 1,
                        scale: isMovable ? 1.2 : 1,
                        zIndex: isMovable ? 50 : 10
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      onClick={() => moveToken(token.id)}
                      className={`
                        w-[80%] h-[80%] rounded-full cursor-pointer flex items-center justify-center
                        shadow-lg border-2 border-white/50 m-auto
                        bg-${token.player}-500
                        ${isMovable ? 'ring-4 ring-white animate-pulse' : ''}
                      `}
                    >
                      <div className="w-1/2 h-1/2 rounded-full bg-white/30" />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Dice & Controls */}
            <div className="flex flex-col gap-6 items-center w-48">
              <div className="bg-white p-6 rounded-3xl shadow-xl text-center w-full">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
                  {players[currentPlayerIndex].color}'s Turn
                </p>
                
                <motion.div 
                  animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: isRolling ? Infinity : 0 }}
                  className={`
                    w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl font-bold shadow-inner
                    ${diceValue ? `bg-${players[currentPlayerIndex].color}-500 text-white` : 'bg-stone-100 text-stone-300'}
                  `}
                >
                  {renderDice(diceValue)}
                </motion.div>

                <button
                  disabled={!canRoll || isRolling}
                  onClick={rollDice}
                  className={`
                    mt-6 w-full py-3 rounded-xl font-bold transition-all
                    ${canRoll && !isRolling 
                      ? `bg-${players[currentPlayerIndex].color}-500 text-white shadow-lg hover:scale-105 active:scale-95` 
                      : 'bg-stone-100 text-stone-300 cursor-not-allowed'}
                  `}
                >
                  Roll Dice
                </button>
              </div>

              <button
                onClick={() => setGameState('setup')}
                className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors font-medium text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Game
              </button>
            </div>
          </div>
        )}

        {gameState === 'winner' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md w-full border-8 border-emerald-50"
          >
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-4xl font-black text-stone-800 mb-2">We Have a Winner!</h2>
            <p className="text-2xl font-bold capitalize mb-8" style={{ color: winner ? `var(--tw-color-${winner}-500)` : 'inherit' }}>
              {winner} Player Wins!
            </p>
            
            <button
              onClick={() => setGameState('setup')}
              className="w-full py-4 bg-stone-800 text-white rounded-2xl font-bold text-xl hover:bg-stone-900 transition-all shadow-xl"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Tailwind classes for dynamic colors */}
      <div className="hidden">
        <div className="bg-red-500 bg-green-500 bg-yellow-500 bg-blue-500" />
        <div className="border-red-500 border-green-500 border-yellow-500 border-blue-500" />
        <div className="bg-red-50 bg-green-50 bg-yellow-50 bg-blue-50" />
        <div className="text-red-500 text-green-500 text-yellow-500 text-blue-500" />
      </div>
    </div>
  );
};

export default App;
