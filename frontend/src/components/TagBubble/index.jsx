import { useRef, useEffect, useCallback, useState } from 'react';

const getCSSVar = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const getThemeColors = () => {
  const accent = getCSSVar('--accent') || '#7c3aed';
  const accentSecondary = getCSSVar('--accent-secondary') || '#ec4899';
  const accentDark = getCSSVar('--accent-dark') || '#5b21b6';
  const accentLight = getCSSVar('--accent-light') || '#a78bfa';
  const muted = getCSSVar('--muted') || '#9ca3af';
  const heatLevel2 = getCSSVar('--heat-level-2') || '#a78bfa';
  const heatLevel3 = getCSSVar('--heat-level-3') || '#8b5cf6';
  const heatLevel4 = getCSSVar('--heat-level-4') || '#7c3aed';
  
  return [
    accent,
    accentDark,
    accentLight,
    accentSecondary,
    heatLevel2,
    heatLevel3,
    heatLevel4,
    muted,
    accent,
    accentSecondary,
    accentLight,
    heatLevel4,
  ];
};

const DEFAULT_COLORS = getThemeColors();

export default function TagBubble({ tags, onTagSelect, activeTag, colorPalette }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const bubblesRef = useRef([]);
  const animationRef = useRef(null);
  const dragRef = useRef({ bubble: null, offsetX: 0, offsetY: 0, moved: false, vx: 0, vy: 0 });
  const pointerRef = useRef({ x: -9999, y: -9999 });
  const squishRef = useRef({});
  const [hoveredBubble, setHoveredBubble] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const colors = (colorPalette && colorPalette.Vibrant)
    ? [
        colorPalette.Vibrant,
        colorPalette.DarkVibrant,
        colorPalette.LightVibrant,
        colorPalette.Muted,
        colorPalette.DarkMuted,
        colorPalette.LightMuted,
        colorPalette.accentDark || colorPalette.Vibrant,
        colorPalette.accentLight || colorPalette.LightVibrant,
        colorPalette.muted || colorPalette.Muted,
        colorPalette.darkMuted || colorPalette.DarkMuted,
        colorPalette.lightMuted || colorPalette.LightMuted,
        colorPalette.accentSecondary || colorPalette.LightVibrant,
      ]
    : DEFAULT_COLORS;

  const initBubbles = useCallback((width, height) => {
    if (!tags?.length) return [];
    const sorted = [...tags].sort((a, b) => (b.article_count || 0) - (a.article_count || 0));
    const maxCount = Math.max(...sorted.map((t) => t.article_count || 1));
    const minCount = Math.min(...sorted.map((t) => t.article_count || 1));

    const bubbles = [];
    const centerX = width / 2;
    const centerY = height / 2;

    sorted.forEach((tag, i) => {
      const norm = maxCount === minCount ? 0.5 : ((tag.article_count || 1) - minCount) / (maxCount - minCount);
      const radius = Math.max(24, Math.min(50, 24 + norm * 26));

      let x, y;
      let attempts = 0;
      do {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.min(width, height) * 0.35;
        x = centerX + Math.cos(angle) * dist;
        y = centerY + Math.sin(angle) * dist;
        attempts++;
      } while (
        attempts < 50 &&
        bubbles.some((b) => {
          const dx = b.x - x;
          const dy = b.y - y;
          return Math.sqrt(dx * dx + dy * dy) < b.radius + radius + 8;
        })
      );

      bubbles.push({
        id: tag.id,
        name: tag.name,
        article_count: tag.article_count || 0,
        radius,
        x,
        y,
        vx: 0,
        vy: 0,
        color: colors[i % colors.length],
        squish: { sx: 1, sy: 1, angle: 0 },
      });
    });

    return bubbles;
  }, [tags, colors]);

  const findBubbleAt = useCallback((x, y) => {
    return bubblesRef.current.find((b) => {
      const dx = x - b.x;
      const dy = y - b.y;
      return dx * dx + dy * dy < b.radius * b.radius;
    });
  }, []);

  useEffect(() => {
    if (bubblesRef.current.length && colors.length >= 4) {
      bubblesRef.current.forEach((b, i) => {
        b.color = colors[i % colors.length];
      });
    }
  }, [colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!bubblesRef.current.length && tags?.length) {
        bubblesRef.current = initBubbles(width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const getPointerPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onPointerDown = (e) => {
      e.preventDefault();
      const pos = getPointerPos(e);
      pointerRef.current = pos;
      const bubble = findBubbleAt(pos.x, pos.y);
      if (bubble) {
        dragRef.current = {
          bubble,
          offsetX: pos.x - bubble.x,
          offsetY: pos.y - bubble.y,
          moved: false,
          vx: 0,
          vy: 0,
          startX: pos.x,
          startY: pos.y,
        };
        bubble.vx = 0;
        bubble.vy = 0;
        canvas.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (e) => {
      const pos = getPointerPos(e);
      pointerRef.current = pos;

      if (dragRef.current.bubble) {
        const d = dragRef.current;
        const newX = pos.x - d.offsetX;
        const newY = pos.y - d.offsetY;

        const dx = newX - d.bubble.x;
        const dy = newY - d.bubble.y;
        d.vx = dx;
        d.vy = dy;

        d.bubble.x = newX;
        d.bubble.y = newY;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
          const stretch = Math.min(0.35, dist * 0.04);
          const angle = Math.atan2(dy, dx);
          d.bubble.squish = {
            sx: 1 + stretch,
            sy: 1 - stretch * 0.6,
            angle,
          };
        }

        if (Math.abs(pos.x - d.startX) > 3 || Math.abs(pos.y - d.startY) > 3) {
          d.moved = true;
        }
      } else {
        const bubble = findBubbleAt(pos.x, pos.y);
        if (bubble) {
          setHoveredBubble({ name: bubble.name, count: bubble.article_count });
          setTooltipPos({ x: pos.x, y: pos.y });
          canvas.style.cursor = 'grab';
        } else {
          setHoveredBubble(null);
          canvas.style.cursor = 'default';
        }
      }
    };

    const onPointerUp = () => {
      if (dragRef.current.bubble) {
        const d = dragRef.current;
        d.bubble.vx = d.vx * 0.5;
        d.bubble.vy = d.vy * 0.5;

        if (!d.moved) {
          onTagSelect?.(d.bubble.id);
        }

        dragRef.current = { bubble: null, offsetX: 0, offsetY: 0, moved: false, vx: 0, vy: 0 };
        canvas.style.cursor = 'default';
      }
    };

    const onPointerLeave = () => {
      pointerRef.current.x = -9999;
      pointerRef.current.y = -9999;
      setHoveredBubble(null);
    };

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerLeave);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const bubbles = bubblesRef.current;
      if (!bubbles.length) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const padding = 10;
      const dragBubble = dragRef.current.bubble;

      for (const b of bubbles) {
        if (b !== dragBubble) {
          b.x += b.vx;
          b.y += b.vy;
          b.vx *= 0.92;
          b.vy *= 0.92;

          if (b.x < padding + b.radius) { b.x = padding + b.radius; b.vx *= -0.4; }
          if (b.x > width - padding - b.radius) { b.x = width - padding - b.radius; b.vx *= -0.4; }
          if (b.y < padding + b.radius) { b.y = padding + b.radius; b.vy *= -0.4; }
          if (b.y > height - padding - b.radius) { b.y = height - padding - b.radius; b.vy *= -0.4; }
        }

        b.squish.sx += (1 - b.squish.sx) * 0.15;
        b.squish.sy += (1 - b.squish.sy) * 0.15;
      }

      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i];
          const b = bubbles[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const minDist = a.radius + b.radius;

          if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            if (a !== dragBubble && b !== dragBubble) {
              a.x -= nx * overlap * 0.5;
              a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5;
              b.y += ny * overlap * 0.5;

              const tempVx = a.vx;
              const tempVy = a.vy;
              a.vx = b.vx * 0.6;
              a.vy = b.vy * 0.6;
              b.vx = tempVx * 0.6;
              b.vy = tempVy * 0.6;
            } else if (a === dragBubble) {
              b.x += nx * overlap;
              b.y += ny * overlap;
              b.vx += nx * overlap * 0.3;
              b.vy += ny * overlap * 0.3;

              const impact = Math.min(0.3, overlap * 0.04);
              const angle = Math.atan2(-ny, -nx);
              a.squish = { sx: 1 + impact, sy: 1 - impact * 0.6, angle };
            } else {
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              a.vx -= nx * overlap * 0.3;
              a.vy -= ny * overlap * 0.3;

              const impact = Math.min(0.3, overlap * 0.04);
              const angle = Math.atan2(ny, nx);
              b.squish = { sx: 1 + impact, sy: 1 - impact * 0.6, angle };
            }
          }
        }
      }

      for (const b of bubbles) {
        const isActive = activeTag === b.id;
        const isHovered = hoveredBubble?.name === b.name;
        const { sx, sy, angle } = b.squish;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.scale(sx, sy);

        const r = b.radius;

        if (isActive) {
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 20;
        }

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.shadowBlur = 0;

        if (isActive) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          const grad = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
          grad.addColorStop(0, 'rgba(255,255,255,0.25)');
          grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
          grad.addColorStop(1, 'rgba(0,0,0,0.15)');
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.restore();

        ctx.save();
        ctx.translate(b.x, b.y);

        const fontSize = Math.max(10, b.radius * 0.32);
        ctx.fillStyle = '#ffffff';
        ctx.font = `600 ${fontSize}px Inter, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 3;

        const maxChars = Math.max(2, Math.floor(b.radius * 0.28));
        const displayName = b.name.length > maxChars ? b.name.slice(0, maxChars) + '…' : b.name;

        ctx.fillText(
          displayName,
          0,
          b.article_count > 0 ? -b.radius * 0.1 : 0
        );

        if (b.article_count > 0) {
          const countSize = Math.max(8, b.radius * 0.2);
          ctx.font = `500 ${countSize}px Inter, -apple-system, sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.shadowBlur = 0;
          ctx.fillText(`${b.article_count}`, 0, b.radius * 0.3);
        }

        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseup', onPointerUp);
      canvas.removeEventListener('mouseleave', onPointerLeave);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
      cancelAnimationFrame(animationRef.current);
    };
  }, [tags, activeTag, hoveredBubble, colorPalette, onTagSelect, initBubbles, findBubbleAt]);

  return (
    <div ref={containerRef} className="tag-bubble-container">
      <canvas ref={canvasRef} className="tag-bubble-canvas" />
      {hoveredBubble && (
        <div
          className="tag-bubble-tooltip"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
          }}
        >
          <span className="tag-bubble-tooltip-name">{hoveredBubble.name}</span>
          <span className="tag-bubble-tooltip-count">{hoveredBubble.count} 篇文章</span>
        </div>
      )}
    </div>
  );
}
