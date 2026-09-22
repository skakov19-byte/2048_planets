import { useEffect, useRef, useCallback, useState } from 'react';
import './index.css';

// ==================== ТИПЫ ====================
interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: boolean; // Флаг: плитка была создана слиянием
  isNew?: boolean; // Флаг: новая плитка
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
const WINNING_VALUE = 2048;

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

// Получаем свободные клетки
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
// Направления: 0=up, 1=right, 2=down, 3=left
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

  // Определяем порядок обхода и вектор движения
  // Вектор: куда двигаются плитки
  const vectors: Record<Direction, { dr: number; dc: number }> = {
    0: { dr: -1, dc: 0 }, // up
    1: { dr: 0, dc: 1 },  // right
    2: { dr: 1, dc: 0 },  // down
    3: { dr: 0, dc: -1 }, // left
  };

  const vector = vectors[direction];

  // Определяем порядок обхода строк/столбцов
  // Для up/left — обходим с начала, для down/right — с конца
  const rowOrder = direction === 2 ? [3, 2, 1, 0] : [0, 1, 2, 3];
  const colOrder = direction === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];

  // Отслеживаем, какие плитки уже слились в этом ходу
  const mergedPositions = new Set<string>();

  for (const r of rowOrder) {
    for (const c of colOrder) {
      const tile = newGrid[r][c];
      if (!tile) continue;

      // Находим самую дальнюю позицию, куда может двигаться плитка
      let newRow = r;
      let newCol = c;

      while (true) {
        const nextRow = newRow + vector.dr;
        const nextCol = newCol + vector.dc;

        // Проверяем границы
        if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) break;

        const nextCell = newGrid[nextRow][nextCol];

        if (!nextCell) {
          // Пустая клетка — продолжаем движение
          newRow = nextRow;
          newCol = nextCol;
        } else if (
          nextCell.value === tile.value &&
          !mergedPositions.has(`${nextRow},${nextCol}`) &&
          !mergedPositions.has(`${newRow},${newCol}`)
        ) {
          // Одинаковые значения и ни одна из плиток не сливалась — слияние
          newRow = nextRow;
          newCol = nextCol;
          break;
        } else {
          // Другая плитка — останавливаемся
          break;
        }
      }

      // Если позиция изменилась — двигаем
      if (newRow !== r || newCol !== c) {
        moved = true;
        const targetCell = newGrid[newRow][newCol];

        if (targetCell && targetCell.value === tile.value) {
          // Слияние
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
          // Просто перемещение
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

// Проверка: есть ли возможные ходы
function isMovePossible(grid: (Tile | null)[][]): boolean {
  // Есть свободные клетки
  if (getAvailableCells(grid).length > 0) return true;

  // Проверяем возможность слияния
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (!tile) continue;

      // Проверяем правого и нижнего соседа
      if (c + 1 < GRID_SIZE && grid[r][c + 1]?.value === tile.value) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1][c]?.value === tile.value) return true;
    }
  }

  return false;
}

// Проверка: достигнута ли цель (2048)
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
  // Хранилище для начального состояния (используется для инициализации tiles)
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

  // Инициализация игры
  function initGame(): GameState {
    const grid = createEmptyGrid();
    spawnTile(grid);
    spawnTile(grid);

    const bestScore = parseInt(localStorage.getItem('best2048') || '0', 10);

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

    // Сбрасываем флаги isNew и mergedFrom после анимации
    // Только если есть плитки с этими флагами (предотвращаем бесконечный цикл)
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

    // Спавн новой плитки
    spawnTile(result.grid);

    const newScore = gameState.score + result.score;
    const newBest = Math.max(newScore, gameState.bestScore);

    // Сохраняем лучший счёт
    if (newBest > gameState.bestScore) {
      localStorage.setItem('best2048', String(newBest));
    }

    // Проверяем состояния
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
        ArrowUp: 0,
        ArrowRight: 1,
        ArrowDown: 2,
        ArrowLeft: 3,
        w: 0, W: 0,
        d: 1, D: 1,
        s: 2, S: 2,
        a: 3, A: 3,
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
      direction = dx > 0 ? 1 : 3; // right : left
    } else {
      direction = dy > 0 ? 2 : 0; // down : up
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

  // Новая игра
  const handleNewGame = useCallback(() => {
    tileIdCounter = 0;
    setGameState(initGame());
  }, []);

  // Продолжить игру (после победы)
  const handleKeepPlaying = useCallback(() => {
    setGameState(prev => ({ ...prev, won: false, keepPlaying: true }));
  }, []);

  // Получить CSS-класс для плитки
  const getTileClass = (value: number): string => {
    return `tile-${value}`;
  };

  // Получить CSS-переменные для позиционирования плитки
  // Позиция вычисляется через CSS: left = var(--col) * (100% + var(--gap)) / 4
  const getTilePosition = (row: number, col: number): React.CSSProperties => {
    return {
      '--col': `${col}`,
      '--row': `${row}`,
    } as React.CSSProperties;
  };

  return (
    <div className="game-wrapper">
      <div className="game-container">
        {/* Заголовок */}
        <div className="game-header">
          <div className="game-title">
            <h1>2048</h1>
          </div>
          <div className="game-scores">
            <div className="score-box">
              <span className="score-label">Счёт</span>
              <span className="score-value">{gameState.score}</span>
            </div>
            <div className="score-box">
              <span className="score-label">Лучший</span>
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
            Используйте <strong>стрелки</strong> или <strong>свайпы</strong> для перемещения плиток.
            Соединяйте одинаковые числа, чтобы получить <strong>2048</strong>!
          </p>
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
            {tiles.map(tile => (
              <div
                key={tile.id}
                className={`tile ${getTileClass(tile.value)} ${tile.isNew ? 'tile-new' : ''} ${tile.mergedFrom ? 'tile-merged' : ''}`}
                style={getTilePosition(tile.row, tile.col)}
              >
                <span className="tile-value">{tile.value}</span>
              </div>
            ))}
          </div>

          {/* Оверлей победы */}
          {gameState.won && !gameState.keepPlaying && (
            <div className="game-overlay overlay-win">
              <div className="overlay-content">
                <h2>Вы победили! 🎉</h2>
                <p>Вы достигли 2048!</p>
                <div className="overlay-buttons">
                  <button className="overlay-btn btn-continue" onClick={handleKeepPlaying}>
                    Продолжить
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
                <h2>Игра окончена</h2>
                <p>Ваш счёт: {gameState.score}</p>
                <div className="overlay-buttons">
                  <button className="overlay-btn btn-new" onClick={handleNewGame}>
                    Новая игра
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="game-footer">
          <p>Сделано с ❤️ | Классическая игра 2048</p>
        </div>
      </div>
    </div>
  );
}
