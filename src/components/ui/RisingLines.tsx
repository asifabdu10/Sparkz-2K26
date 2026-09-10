"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

interface RisingLinesProps {
  className?: string;
  particles?: number;
  color?: string;
  riseSpeed?: number;
  opacity?: number;
  scale?: number;
  showHorizon?: boolean;
  horizonColor?: string;
  horizonOpacity?: number;
  bg?: string;
  style?: React.CSSProperties;
}

const COMPONENT_DEFAULTS = {
  className: "",
  particles: 500,
  color: "#C9A227", // Rich Gold
  riseSpeed: 30,
  opacity: 90,
  scale: 8,
  showHorizon: true,
  horizonColor: "#2F4156", // Deep Purple
  horizonOpacity: 40,
  bg: "transparent",
};

export default function RisingLines(userProps: RisingLinesProps = {}) {
  const props = { ...COMPONENT_DEFAULTS, ...userProps };
  const {
    className,
    particles,
    color,
    showHorizon,
    horizonColor,
    riseSpeed: riseSpeedRaw,
    opacity: opacityRaw,
    horizonOpacity: horizonOpacityRaw,
    scale: scaleRaw,
    bg,
    style,
  } = props;

  const riseSpeed = riseSpeedRaw / 100;
  const opacity = opacityRaw / 100;
  const horizonOpacity = horizonOpacityRaw / 100;
  const scale = scaleRaw / 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  const parseColor = (input?: string): [number, number, number] => {
    if (!input) return [201, 162, 39];
    const s = input.trim();
    if (s.startsWith("#")) {
      let hex = s.slice(1);
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      }
      const num = parseInt(hex, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
      return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    }
    return [201, 162, 39];
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cParticle = parseColor(color);
    const cHorizon = parseColor(horizonColor);

    const defaultScale = 3.5;
    const worldScale = Math.max(0.2, scale) / defaultScale;

    const makeRng = (seed: number) => {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const rng = makeRng(0xc0ffee);

    let particleCount = 0;
    let pX = new Float32Array(0);
    let pY = new Float32Array(0);
    let pVY = new Float32Array(0);
    let pHeight = new Float32Array(0);
    let pWidth = new Float32Array(0);

    let blobCount = 0;
    let bX = new Float32Array(0);
    let bY = new Float32Array(0);
    let bVY = new Float32Array(0);
    let bR = new Float32Array(0);

    const sampleCenterX = (w: number) => {
      const r = (rng() + rng() + rng()) / 3;
      return r * w;
    };

    const sampleSparkHeight = () => {
      let tall: number;
      if (rng() < 0.15) {
        tall = 80 + rng() * 40;
      } else {
        tall = 30 + Math.pow(rng(), 0.7) * 45;
      }
      return Math.max(2, Math.floor(tall * worldScale));
    };

    const getHorizonY = (h: number) => h - 1;

    const initParticles = () => {
      const { w, h } = sizeRef.current;
      const area = w * h;
      const refArea = 800 * 400;
      const target = Math.max(0, Math.floor((particles * area) / refArea));
      particleCount = Math.min(target, 4000);
      pX = new Float32Array(particleCount);
      pY = new Float32Array(particleCount);
      pVY = new Float32Array(particleCount);
      pHeight = new Float32Array(particleCount);
      pWidth = new Float32Array(particleCount);

      const horizonY = getHorizonY(h);
      for (let i = 0; i < particleCount; i++) {
        pX[i] = sampleCenterX(w);
        pY[i] = horizonY - rng() * horizonY * 0.95;
        pVY[i] = 20 + rng() * 60;
        pHeight[i] = sampleSparkHeight();
        pWidth[i] = rng() < 0.2 ? 2.5 : 1.5;
      }

      const blobTarget = Math.max(0, Math.floor(target * 0.35));
      blobCount = Math.min(blobTarget, 1200);
      bX = new Float32Array(blobCount);
      bY = new Float32Array(blobCount);
      bVY = new Float32Array(blobCount);
      bR = new Float32Array(blobCount);

      for (let i = 0; i < blobCount; i++) {
        bX[i] = sampleCenterX(w);
        bY[i] = horizonY - rng() * horizonY * 0.95;
        bVY[i] = 15 + rng() * 40;
        bR[i] = (2.0 + Math.pow(rng(), 1.8) * 4.5) * worldScale;
      }
    };

    const resize = (entry?: ResizeObserverEntry) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cr = entry?.contentRect;
      const rectW =
        cr?.width ||
        container.clientWidth ||
        container.getBoundingClientRect().width;
      const rectH =
        cr?.height ||
        container.clientHeight ||
        container.getBoundingClientRect().height;
      const w = Math.max(1, Math.floor(rectW) || 800);
      const h = Math.max(1, Math.floor(rectH) || 400);
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initParticles();
    };

    resize();
    const ro = new ResizeObserver((entries) => resize(entries[0]));
    ro.observe(container);

    const drawFrame = (deltaSec: number) => {
      const { w, h } = sizeRef.current;
      const dt = Math.max(0.001, Math.min(0.05, deltaSec));
      const horizonY = getHorizonY(h);

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      if (bg && bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }

      // (1) Horizon Glow
      const horizonAlpha = Math.max(0, Math.min(1, horizonOpacity));
      if (showHorizon && horizonAlpha > 0.001) {
        const rx = w * 0.55;
        const ry = 50 * worldScale;
        ctx.save();
        ctx.translate(w / 2, horizonY);
        ctx.scale(rx / ry, 1);
        const hGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
        hGrad.addColorStop(0, `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},${horizonAlpha * 0.5})`);
        hGrad.addColorStop(0.4, `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},${horizonAlpha * 0.25})`);
        hGrad.addColorStop(1, `rgba(${cHorizon[0]},${cHorizon[1]},${cHorizon[2]},0)`);
        ctx.fillStyle = hGrad;
        ctx.fillRect(-ry - 2, -ry - 2, (ry + 2) * 2, (ry + 2) * 2);
        ctx.restore();
      }

      const riseSpeedMul = Math.max(0, riseSpeed) * 10;
      const denom = Math.max(1, horizonY);

      // (2) Circular Glow Blobs
      for (let i = 0; i < blobCount; i++) {
        const effVy = bVY[i] * (1.0 + riseSpeedMul);
        bY[i] -= effVy * dt;
        if (bY[i] < -bR[i] * 2) {
          bX[i] = sampleCenterX(w);
          bY[i] = horizonY - rng() * 10;
          bVY[i] = 15 + rng() * 40;
          bR[i] = (2.0 + Math.pow(rng(), 1.8) * 4.5) * worldScale;
        }
        const t = Math.max(0, Math.min(1, (horizonY - bY[i]) / denom));
        const fade = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
        const a = fade * opacity * 0.85;
        if (a < 0.01) continue;

        const cx = bX[i];
        const cy = bY[i];
        const r = bR[i];
        const bGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const aClamped = Math.min(1, a);
        bGrad.addColorStop(0, `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped})`);
        bGrad.addColorStop(0.5, `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped * 0.4})`);
        bGrad.addColorStop(1, `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},0)`);
        ctx.fillStyle = bGrad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // (3) Pixel-line Trail Sparks (Vibrant Solid Lines)
      for (let i = 0; i < particleCount; i++) {
        const effVy = pVY[i] * (1.0 + riseSpeedMul);
        pY[i] -= effVy * dt;
        if (pY[i] < -pHeight[i]) {
          pX[i] = sampleCenterX(w);
          pY[i] = horizonY - rng() * 10;
          pVY[i] = 20 + rng() * 60;
          pHeight[i] = sampleSparkHeight();
        }
        const t = Math.max(0, Math.min(1, (horizonY - pY[i]) / denom));
        const fade = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
        const a = fade * opacity;
        if (a < 0.01) continue;

        const px = Math.floor(pX[i]);
        const py = Math.floor(pY[i]);
        const lineHeight = pHeight[i];
        const lineW = pWidth[i];
        const aClamped = Math.min(1, a);

        const sGrad = ctx.createLinearGradient(0, py, 0, py + lineHeight);
        sGrad.addColorStop(0, `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},0)`);
        sGrad.addColorStop(0.6, `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped * 0.95})`);
        sGrad.addColorStop(1, `rgba(${cParticle[0]},${cParticle[1]},${cParticle[2]},${aClamped * 0.95})`);

        ctx.fillStyle = sGrad;
        ctx.fillRect(px, py, lineW, lineHeight);
      }
    };

    let lastT = performance.now();
    const loop = (t: number) => {
      const deltaSec = (t - lastT) / 1000;
      lastT = t;
      drawFrame(deltaSec);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [
    particles,
    color,
    showHorizon,
    horizonColor,
    riseSpeed,
    opacity,
    horizonOpacity,
    scale,
    bg,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 100,
        minHeight: 60,
        overflow: "hidden",
        background: "transparent",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
