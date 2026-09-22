import { useEffect, useRef, useCallback, useState } from 'react';
import './index.css';

// ==================== КОСМИЧЕСКИЕ ОБЪЕКТЫ ====================
// Последовательность эволюции: от астероида до сверхгиганта
interface CosmicObject {
  value: number;
  name: string;
  image: string;
  color: string;
  textColor: string;
  glow?: string;
}

const COSMIC_OBJECTS: CosmicObject[] = [
  { value: 2,    name: 'Астероид',      image: './assets/asteroid.png',    color: '#8b7355', textColor: '#f5f0e8' },
  { value: 4,    name: 'Метеорит',      image: './assets/meteorite.png',   color: '#6b5b4f', textColor: '#f5f0e8' },
  { value: 8,    name: 'Луна',          image: './assets/moon.png',        color: '#c4b896', textColor: '#4a4535' },
  { value: 16,   name: 'Марс',          image: './assets/mars.png',        color: '#c1440e', textColor: '#fff5ee' },
  { value: 32,   name: 'Венера',        image: './assets/venus.png',       color: '#e8a735', textColor: '#4a3520' },
  { value: 64,   name: 'Земля',         image: './assets/earth.png',       color: '#2e8b57', textColor: '#f0fff0', glow: 'rgba(46, 139, 87, 0.4)' },
  { value: 128,  name: 'Нептун',        image: './assets/neptune.png',     color: '#4169e1', textColor: '#f0f8ff', glow: 'rgba(65, 105, 225, 0.4)' },
  { value: 256,  name: 'Уран',          image: './assets/uranus.png',      color: '#5f9ea0', textColor: '#f0ffff', glow: 'rgba(95, 158, 160, 0.4)' },
  { value: 512,  name: 'Сатурн',        image: './assets/saturn.png',      color: '#daa520', textColor: '#fff8dc', glow: 'rgba(218, 165, 32, 0.5)' },
  { value: 1024, name: 'Юпитер',        image: './assets/jupiter.png',     color: '#cd853f', textColor: '#fff5ee', glow: 'rgba(205, 133, 63, 0.5)' },
  { value: 2048, name: 'Солнце',        image: './assets/sun.png',         color: '#ffd700', textColor: '#4a3500', glow: 'rgba(255, 215, 0, 0.7)' },
  { value: 4096, name: 'Красный гигант', image: './assets/red-giant.png',  color: '#ff4500', textColor: '#fff5ee', glow: 'rgba(255, 69, 0, 0.7)' },
  { value: 8192, name: 'Сверхгигант',   image: './assets/supergiant.png',  color: '#9400d3', textColor: '#fff0ff', glow: 'rgba(148, 0, 211, 0.8)' },
];

// Получаем объект по значению
function getCosmicObject(value: number): CosmicObject {
  return COSMIC_OBJECTS.find(obj => obj.value === value) || COSMIC_OBJECTS[COSMIC_OBJECTS.length - 1];
}

// ==================== ТИПЫ ====================
interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: boolean;
  isNew?: boolean;
}

interface GameState {
  grid: (Tile | null)[][];
  score: number;
  bestScore: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean;
}

// ==================== КОНСТАНТЫ ====================
const GRID_SIZE = 4;
const WINNING_VALUE = 2048; // Солнце — цель

// ==================== УТИЛИТЫ ====================
let tileIdCounter = 0;
const getNextId = () => ++tileIdCounter;

function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

function cloneGrid(grid: (Tile | null)[][]): (Tile | null)[][] {
  return grid.map(row => row.map(cell => cell ? { ...cell } : null));
}

function getAvailableCells(grid: (Tile | null)[][]): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

// Спавн новой плитки (90% шанс на 2, 10% шанс на 4)
function spawnTile(grid: (Tile | null)[][]): Tile | null {
  const available = getAvailableCells(grid);
  if (available.length === 0) return null;

  const cell = available[Math.floor(Math.random() * available.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile: Tile = {
    id: getNextId(),
    value,
    row: cell.row,
    col: cell.col,
    isNew: true,
  };
  grid[cell.row][cell.col] = tile;
  return tile;
}

// ==================== ЛОГИКА ДВИЖЕНИЯ ====================
type Direction = 0 | 1 | 2 | 3;

interface MoveResult {
  grid: (Tile | null)[][];
  moved: boolean;
  score: number;
}

function move(grid: (Tile | null)[][], direction: Direction): MoveResult {
  const newGrid = cloneGrid(grid);
  let moved = false;
  let scoreGained = 0;

  const vectors: Record<Direction, { dr: number; dc: number }> = {
    0: { dr: -1, dc: 0 }, // up
    1: { dr: 0, dc: 1 },  // right
    2: { dr: 1, dc: 0 },  // down
    3: { dr: 0, dc: -1 }, // left
  };

  const vector = vectors[direction];
  const rowOrder = direction === 2 ? [3, 2, 1, 0] : [0, 1, 2, 3];
  const colOrder = direction === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];

  // Отслеживаем, какие позиции уже слились в этом ходу
  const mergedPositions = new Set<string>();

  for (const r of rowOrder) {
    for (const c of colOrder) {
      const tile = newGrid[r][c];
      if (!tile) continue;

      let newRow = r;
      let newCol = c;

      while (true) {
        const nextRow = newRow + vector.dr;
        const nextCol = newCol + vector.dc;

        if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) break;

        const nextCell = newGrid[nextRow][nextCol];

        if (!nextCell) {
          newRow = nextRow;
          newCol = nextCol;
        } else if (
          nextCell.value === tile.value &&
          !mergedPositions.has(`${nextRow},${nextCol}`) &&
          !mergedPositions.has(`${newRow},${newCol}`)
        ) {
          newRow = nextRow;
          newCol = nextCol;
          break;
        } else {
          break;
        }
      }

      if (newRow !== r || newCol !== c) {
        moved = true;
        const targetCell = newGrid[newRow][newCol];

        if (targetCell && targetCell.value === tile.value) {
          // Слияние — получаем следующий космический объект
          const newValue = tile.value * 2;
          const mergedTile: Tile = {
            id: getNextId(),
            value: newValue,
            row: newRow,
            col: newCol,
            mergedFrom: true,
          };
          newGrid[r][c] = null;
          newGrid[newRow][newCol] = mergedTile;
          mergedPositions.add(`${newRow},${newCol}`);
          scoreGained += newValue;
        } else {
          newGrid[r][c] = null;
          tile.row = newRow;
          tile.col = newCol;
          newGrid[newRow][newCol] = tile;
        }
      }
    }
  }

  return { grid: newGrid, moved, score: scoreGained };
}

function isMovePossible(grid: (Tile | null)[][]): boolean {
  if (getAvailableCells(grid).length > 0) return true;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (!tile) continue;
      if (c + 1 < GRID_SIZE && grid[r][c + 1]?.value === tile.value) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1][c]?.value === tile.value) return true;
    }
  }

  return false;
}

function hasWon(grid: (Tile | null)[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]?.value === WINNING_VALUE) return true;
    }
  }
  return false;
}

// ==================== КОМПОНЕНТ ====================
export default function App() {
  const initialGameRef = useRef<GameState | null>(null);
  if (!initialGameRef.current) {
    initialGameRef.current = initGame();
  }

  const [gameState, setGameState] = useState<GameState>(initialGameRef.current);
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const allTiles: Tile[] = [];
    const grid = initialGameRef.current!.grid;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = grid[r][c];
        if (tile) allTiles.push(tile);
      }
    }
    return allTiles;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  function initGame(): GameState {
    const grid = createEmptyGrid();
    spawnTile(grid);
    spawnTile(grid);

    const bestScore = parseInt(localStorage.getItem('best2048cosmic') || '0', 10);

    return {
      grid,
      score: 0,
      bestScore,
      gameOver: false,
      won: false,
      keepPlaying: false,
    };
  }

  // Обновляем список плиток из сетки
  useEffect(() => {
    const allTiles: Tile[] = [];
    let hasAnimatedTiles = false;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = gameState.grid[r][c];
        if (tile) {
          allTiles.push(tile);
          if (tile.isNew || tile.mergedFrom) hasAnimatedTiles = true;
        }
      }
    }
    setTiles(allTiles);

    if (hasAnimatedTiles) {
      const timer = setTimeout(() => {
        setGameState(prev => {
          const newGrid = cloneGrid(prev.grid);
          let changed = false;
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              const t = newGrid[r][c];
              if (t && (t.isNew || t.mergedFrom)) {
                newGrid[r][c] = { ...t, isNew: false, mergedFrom: false };
                changed = true;
              }
            }
          }
          if (!changed) return prev;
          return { ...prev, grid: newGrid };
        });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [gameState.grid]);

  // Обработка хода
  const handleMove = useCallback((direction: Direction) => {
    if (isAnimating) return;
    if (gameState.gameOver) return;
    if (gameState.won && !gameState.keepPlaying) return;

    setIsAnimating(true);

    const result = move(gameState.grid, direction);

    if (!result.moved) {
      setIsAnimating(false);
      return;
    }

    spawnTile(result.grid);

    const newScore = gameState.score + result.score;
    const newBest = Math.max(newScore, gameState.bestScore);

    if (newBest > gameState.bestScore) {
      localStorage.setItem('best2048cosmic', String(newBest));
    }

    let won = gameState.won;
    let gameOver = false;

    if (!won && hasWon(result.grid)) {
      won = true;
    }

    if (!isMovePossible(result.grid)) {
      gameOver = true;
    }

    setGameState({
      grid: result.grid,
      score: newScore,
      bestScore: newBest,
      gameOver,
      won,
      keepPlaying: gameState.keepPlaying,
    });

    setTimeout(() => setIsAnimating(false), 100);
  }, [gameState, isAnimating]);

  // Клавиатура (стрелки + WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
        w: 0, W: 0, d: 1, D: 1, s: 2, S: 2, a: 3, A: 3,
      };

      const direction = keyMap[e.key];
      if (direction !== undefined) {
        e.preventDefault();
        handleMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // Touch-события (свайпы)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minSwipe = 30;

    if (Math.max(absDx, absDy) < minSwipe) return;

    let direction: Direction;
    if (absDx > absDy) {
      direction = dx > 0 ? 1 : 3;
    } else {
      direction = dy > 0 ? 2 : 0;
    }

    handleMove(direction);
    touchStartRef.current = null;
  }, [handleMove]);

  // Предотвращаем скролл при свайпах
  useEffect(() => {
    const container = gameContainerRef.current;
    if (!container) return;

    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    container.addEventListener('touchmove', preventScroll, { passive: false });
    return () => container.removeEventListener('touchmove', preventScroll);
  }, []);

  const handleNewGame = useCallback(() => {
    tileIdCounter = 0;
    setGameState(initGame());
  }, []);

  const handleKeepPlaying = useCallback(() => {
    setGameState(prev => ({ ...prev, won: false, keepPlaying: true }));
  }, []);

  // Позиционирование плитки через CSS-переменные
  const getTilePosition = (row: number, col: number): React.CSSProperties => {
    return {
      '--col': `${col}`,
      '--row': `${row}`,
    } as React.CSSProperties;
  };

  // Получить стиль плитки на основе космического объекта
  const getTileStyle = (value: number): React.CSSProperties => {
    const obj = getCosmicObject(value);
    const style: React.CSSProperties = {
      backgroundColor: obj.color,
      color: obj.textColor,
    };
    if (obj.glow) {
      style.boxShadow = `0 0 20px 5px ${obj.glow}`;
    }
    return style;
  };

  // Найти следующий объект для подсказки
  const getNextEvolution = (value: number): CosmicObject | null => {
    const idx = COSMIC_OBJECTS.findIndex(obj => obj.value === value);
    if (idx >= 0 && idx < COSMIC_OBJECTS.length - 1) {
      return COSMIC_OBJECTS[idx + 1];
    }
    return null;
  };

  return (
    <div className="game-wrapper">
      <div className="game-container">
        {/* Заголовок */}
        <div className="game-header">
          <div className="game-title">
            <h1>2048</h1>
            <p className="subtitle">Космическая эволюция</p>
          </div>
          <div className="game-scores">
            <div className="score-box">
              <span className="score-label">Счёт</span>
              <span className="score-value">{gameState.score}</span>
            </div>
            <div className="score-box">
              <span className="score-label">Рекорд</span>
              <span className="score-value">{gameState.bestScore}</span>
            </div>
          </div>
        </div>

        {/* Кнопка и описание */}
        <div className="game-controls">
          <button className="new-game-btn" onClick={handleNewGame}>
            Новая игра
          </button>
          <p className="game-instructions">
            Соединяй космические объекты: <strong>Астероид → Луна → Земля → Сатурн → Солнце</strong>
          </p>
        </div>

        {/* Эволюционная шкала */}
        <div className="evolution-bar">
          {COSMIC_OBJECTS.map((obj, idx) => {
            const isHighestOnBoard = tiles.some(t => t.value === obj.value);
            return (
              <div
                key={obj.value}
                className={`evo-item ${isHighestOnBoard ? 'evo-active' : ''}`}
                title={obj.name}
              >
                <img className="evo-image" src={obj.image} alt={obj.name} />
              </div>
            );
          })}
        </div>

        {/* Игровое поле */}
        <div
          ref={gameContainerRef}
          className="game-board"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Фоновая сетка */}
          <div className="grid-background">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <div key={i} className="grid-cell" />
            ))}
          </div>

          {/* Плитки */}
          <div className="tiles-container">
            {tiles.map(tile => {
              const cosmicObj = getCosmicObject(tile.value);
              const nextObj = getNextEvolution(tile.value);

              return (
                <div
                  key={tile.id}
                  className={`tile ${tile.isNew ? 'tile-new' : ''} ${tile.mergedFrom ? 'tile-merged' : ''}`}
                  style={{ ...getTilePosition(tile.row, tile.col), ...getTileStyle(tile.value) }}
                  title={`${cosmicObj.name}${nextObj ? ` → ${nextObj.name}` : ''}`}
                >
                  <img className="tile-image" src={cosmicObj.image} alt={cosmicObj.name} />
                  <span className="tile-name">{cosmicObj.name}</span>
                </div>
              );
            })}
          </div>

          {/* Оверлей победы */}
          {gameState.won && !gameState.keepPlaying && (
            <div className="game-overlay overlay-win">
              <div className="overlay-content">
                <h2>🌟 Вы создали Солнце!</h2>
                <p>Невероятно! Вы достигли вершины эволюции!</p>
                <div className="overlay-buttons">
                  <button className="overlay-btn btn-continue" onClick={handleKeepPlaying}>
                    Продолжить эволюцию
                  </button>
                  <button className="overlay-btn btn-new" onClick={handleNewGame}>
                    Новая игра
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Оверлей поражения */}
          {gameState.gameOver && (
            <div className="game-overlay overlay-lose">
              <div className="overlay-content">
                <h2>Конец вселенной</h2>
                <p>Больше нет возможных ходов. Счёт: {gameState.score}</p>
                <div className="overlay-buttons">
                  <button className="overlay-btn btn-new" onClick={handleNewGame}>
                    Новая вселенная
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="game-footer">
          <p>Космическая 2048 | Стрелки / WASD / Свайпы</p>
        </div>
      </div>
    </div>
  );
}
