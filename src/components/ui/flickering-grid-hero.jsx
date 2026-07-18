import { useCallback, useEffect, useMemo, useRef } from "react";

// Redraws only the cells that actually flickered this frame instead of
// clearing + repainting the whole grid every tick — a full-grid redraw of a
// full-viewport canvas at 60fps was saturating the main thread and made
// everything below the hero (proof-bar counters, scroll reveals) stutter.
const MAX_DPR = 2;

export const FlickeringGrid = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
  ...props
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isInViewRef = useRef(true);
  const isTabVisibleRef = useRef(true);

  const memoizedColor = useMemo(() => {
    const toRGBA = (color) => {
      if (typeof window === "undefined") return "rgba(0, 0, 0,";
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "rgba(255, 0, 0,";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r}, ${g}, ${b},`;
    };
    return toRGBA(color);
  }, [color]);

  const setupCanvas = useCallback(
    (canvas, width, height) => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const cols = Math.floor(width / (squareSize + gridGap));
      const rows = Math.floor(height / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }
      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity],
  );

  const drawCell = useCallback(
    (ctx, i, j, rows, squares, dpr) => {
      const opacity = squares[i * rows + j];
      const x = i * (squareSize + gridGap) * dpr;
      const y = j * (squareSize + gridGap) * dpr;
      const size = squareSize * dpr;
      ctx.clearRect(x, y, size, size);
      ctx.fillStyle = `${memoizedColor}${opacity})`;
      ctx.fillRect(x, y, size, size);
    },
    [memoizedColor, squareSize, gridGap],
  );

  const drawAllCells = useCallback(
    (ctx, width, height, cols, rows, squares, dpr) => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          drawCell(ctx, i, j, rows, squares, dpr);
        }
      }
    },
    [drawCell],
  );

  // Mutates squares in place for cells whose flicker roll hits, redrawing
  // only those cells instead of the full grid.
  const updateAndDrawChangedCells = useCallback(
    (ctx, cols, rows, squares, dpr, deltaTime) => {
      const chance = flickerChance * deltaTime;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (Math.random() < chance) {
            const idx = i * rows + j;
            squares[idx] = Math.random() * maxOpacity;
            drawCell(ctx, i, j, rows, squares, dpr);
          }
        }
      }
    },
    [flickerChance, maxOpacity, drawCell],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let gridParams;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      gridParams = setupCanvas(canvas, newWidth, newHeight);
      // canvas.width/height assignment above clears the canvas, so paint
      // the freshly-seeded random state once before switching to dirty draws.
      drawAllCells(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr,
      );
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time) => {
      if (!isInViewRef.current || !isTabVisibleRef.current || !gridParams) {
        lastTime = time;
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      updateAndDrawChangedCells(
        ctx,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr,
        deltaTime,
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateCanvasSize, 200);
    };

    window.addEventListener("resize", handleResize);

    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => { isInViewRef.current = entry.isIntersecting; },
      { threshold: 0 },
    );

    intersectionObserver.observe(container);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, drawAllCells, updateAndDrawChangedCells, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      {...props}
    >
      <canvas
        ref={canvasRef}
        style={{ pointerEvents: 'none', position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};
