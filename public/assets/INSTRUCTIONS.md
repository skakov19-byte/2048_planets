# 🌌 Космическая 2048 — Инструкция по изображениям

## Структура папок

```
public/
  assets/
    asteroid.png      ← Астероид (значение 2)
    meteorite.png     ← Метеорит (значение 4)
    moon.png          ← Луна (значение 8)
    mars.png          ← Марс (значение 16)
    venus.png         ← Венера (значение 32)
    earth.png         ← Земля (значение 64)
    neptune.png       ← Нептун (значение 128)
    uranus.png        ← Уран (значение 256)
    saturn.png        ← Сатурн (значение 512)
    jupiter.png       ← Юпитер (значение 1024)
    sun.png           ← Солнце (значение 2048) — ЦЕЛЬ!
    red-giant.png     ← Красный гигант (значение 4096)
    supergiant.png    ← Сверхгигант (значение 8192)
```

## Требования к изображениям

- **Формат:** PNG (с прозрачным фоном) или JPG
- **Размер:** Рекомендуется 128x128px или 256x256px
- **Соотношение сторон:** Квадратное (1:1)
- **Стиль:** Космические объекты на прозрачном фоне

## Цепочка эволюции

```
☄️ Астероид (2)
    ↓
🪨 Метеорит (4)
    ↓
🌙 Луна (8)
    ↓
🔴 Марс (16)
    ↓
🟡 Венера (32)
    ↓
🌍 Земля (64)
    ↓
🔵 Нептун (128)
    ↓
🫧 Уран (256)
    ↓
🪐 Сатурн (512)
    ↓
🟠 Юпитер (1024)
    ↓
☀️ Солнце (2048) ← ПОБЕДА!
    ↓
🌟 Красный гигант (4096)
    ↓
💫 Сверхгигант (8192)
```

## Где найти изображения?

1. **Генерация с помощью ИИ:**
   - DALL-E, Midjourney, Stable Diffusion
   - Промпт: "planet Earth, game icon, transparent background, 128x128"

2. **Бесплатные ресурсы:**
   - Flaticon.com
   - Icons8.com
   - Freepik.com

3. **NASA (бесплатные изображения планет):**
   - images.nasa.gov

## Как добавить изображения

1. Поместите все 13 изображений в папку `public/assets/`
2. Убедитесь, что имена файлов совпадают с указанными выше
3. Перезапустите dev-сервер или пересоберите проект

## Деплой на GitHub Pages

Для корректной работы на GitHub Pages:
1. В `vite.config.js` установлен `base: './'` (относительные пути)
2. Пути к изображениям в коде — относительные (`./assets/...`)
3. После `npm run build` загрузите содержимое папки `dist/` на GitHub Pages

## Примеры промптов для генерации

```
"asteroid, space rock, game icon, cartoon style, transparent background, 128x128px"
"planet earth, blue and green, game icon, cartoon style, transparent background"
"sun, bright yellow star, game icon, cartoon style, transparent background"
```

## Альтернатива: Эмодзи

Если у вас нет изображений, можно вернуться к эмодзи, изменив в `src/App.tsx`:

```typescript
interface CosmicObject {
  value: number;
  name: string;
  emoji: string; // вместо image
  color: string;
  textColor: string;
  glow?: string;
}
```

И в компоненте заменить `<img>` на `<span className="tile-emoji">{cosmicObj.emoji}</span>`
