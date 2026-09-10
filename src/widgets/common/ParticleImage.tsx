// SVG Particle Image — Originkit (converted to JSX for Sparkz)
"use client";

import React, { useEffect, useRef } from "react";

function containRect(iW: number, iH: number, cW: number, cH: number) {
  const a = iW / iH,
    b = cW / cH;

  return a > b
    ? {
      x: 0,
      y: Math.round((cH - cW / a) / 2),
      w: cW,
      h: Math.round(cW / a),
    }
    : {
      x: Math.round((cW - cH * a) / 2),
      y: 0,
      w: Math.round(cH * a),
      h: cH,
    };
}

function parseColor(c: string) {
  if (!c) return { r: 200, g: 200, b: 200, a: 255 };

  const m = c.match(
    /rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)/
  );

  if (m) {
    return {
      r: +m[1] | 0,
      g: +m[2] | 0,
      b: +m[3] | 0,
      a: m[4] != null ? Math.round(+m[4] * 255) : 255,
    };
  }

  const h = c.replace("#", "");

  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255,
    };
  }

  return { r: 200, g: 200, b: 200, a: 255 };
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/*
 * ============================================================
 * PARTICLE RANDOM SHAPE
 * ============================================================
 *
 * IMPORTANT:
 * The "circle" shape is now a true circular area.
 * The circle is invisible — it is only used as the
 * mathematical boundary for particle movement.
 *
 * Nothing is drawn on screen.
 */

function randomInShape(
  shape: string,
  bx: number,
  by: number,
  bw: number,
  bh: number
): [number, number] {
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  if (shape === "circle") {
    const r = Math.min(bw, bh) / 2;

    const angle = Math.random() * Math.PI * 2;

    /*
     * sqrt(random) keeps the particles distributed
     * naturally throughout the whole circular area.
     */
    const distance = Math.sqrt(Math.random()) * r;

    return [
      cx + Math.cos(angle) * distance,
      cy + Math.sin(angle) * distance,
    ];
  }

  if (shape === "oval") {
    const rx = bw / 2;
    const ry = bh / 2;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random());

    return [
      cx + distance * rx * Math.cos(angle),
      cy + distance * ry * Math.sin(angle),
    ];
  }

  if (shape === "cube" || shape === "box") {
    const u = (Math.random() - 0.5) * bw;
    const v = (Math.random() - 0.5) * bh * 0.65;
    const w = (Math.random() - 0.5) * bw * 0.45;

    return [
      cx + u - w * 0.5,
      cy + v + (u + w) * 0.22,
    ];
  }

  return [
    bx + Math.random() * bw,
    by + Math.random() * bh,
  ];
}

type EaseName =
  | "easeOut"
  | "easeInOut"
  | "easeIn"
  | "backOut"
  | "circOut"
  | "linear";

const EASE: Record<EaseName, (t: number) => number> = {
  easeOut: (t) => 1 - (1 - t) * (1 - t),

  easeInOut: (t) =>
    t < 0.5
      ? 2 * t * t
      : 1 - 2 * (1 - t) * (1 - t),

  easeIn: (t) => t * t,

  backOut: (t) => {
    const c = 1.70158 + 1;

    return (
      1 +
      c * (t - 1) ** 3 +
      1.70158 * (t - 1) ** 2
    );
  },

  circOut: (t) =>
    Math.sqrt(1 - (t - 1) * (t - 1)),

  linear: (t) => t,
};

interface Transition {
  type?: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
  ease?: EaseName;
  duration?: number;
}

function getTransitionParams(tr?: Transition) {
  if (!tr) {
    return {
      easeFn: EASE.easeOut,
      durMs: 800,
    };
  }

  if (tr.type === "spring") {
    const k = tr.stiffness ?? 100;
    const d = tr.damping ?? 15;
    const m = tr.mass ?? 1;

    const durMs = Math.min(
      3000,
      Math.max(
        300,
        (d / (2 * Math.sqrt(k * m))) * 2000
      )
    );

    return {
      easeFn: EASE.backOut,
      durMs,
    };
  }

  return {
    easeFn:
      EASE[tr.ease ?? "easeOut"] ||
      EASE.easeOut,

    durMs: (tr.duration ?? 0.8) * 1000,
  };
}

interface SrcParticle {
  homeX: number;
  homeY: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Particle extends SrcParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;

  startX: number;
  startY: number;

  repX: number;
  repY: number;

  repVX: number;
  repVY: number;

  idleX: number;
  idleY: number;

  totalDist: number;

  isPadding: boolean;
  isExtra: boolean;
  inZone: boolean;

  roamTargetX: number;
  roamTargetY: number;

  colorIdx: number;

  repTargetX: number;
  repTargetY: number;
}

function mkParticle(
  src: SrcParticle,
  x: number,
  y: number,
  idleX: number,
  idleY: number,
  isExtra = false
): Particle {
  return {
    x,
    y,

    vx: 0,
    vy: 0,

    startX: x,
    startY: y,

    repX: 0,
    repY: 0,

    repVX: 0,
    repVY: 0,

    homeX: src.homeX,
    homeY: src.homeY,

    idleX,
    idleY,

    r: src.r,
    g: src.g,
    b: src.b,
    a: src.a,

    totalDist: Math.max(
      1,
      Math.sqrt(
        (src.homeX - x) ** 2 +
        (src.homeY - y) ** 2
      )
    ),

    isPadding: false,
    isExtra,

    inZone: false,

    roamTargetX: 0,
    roamTargetY: 0,

    colorIdx: Math.floor(Math.random() * 10),

    repTargetX: 0,
    repTargetY: 0,
  };
}

export interface ParticleImageProps {
  imageConfig?: {
    image?: string;

    mode?: "fit" | "px" | "%";

    sizeUnit?: "px" | "%";

    widthPx?: number;
    heightPx?: number;

    widthPct?: number;
    heightPct?: number;

    scale?: number;
  };

  particleShape?:
  | "circle"
  | "square"
  | "cube"
  | "both";

  particleColor?:
  | "original"
  | "single"
  | "multi"
  | "dark";

  singleColor?: string;

  multiColors?: string[];

  particleCount?: number;

  particleSize?: number;

  hoverEnabled?: boolean;

  hoverConfig?: {
    hoverType?: "roam" | "hide" | "scatter";

    transition?: Transition;

    roamWidth?: number;
    roamHeight?: number;

    roamShape?: string;

    roamOpacity?: number;

    hideType?: string;
  };

  repulsionEnabled?: boolean;

  repulsionConfig?: {
    repulsionMode?: "outside" | "random";

    repulsionForce?: number;

    repulsionRadius?: number;
  };

  autoCycle?: boolean;

  cycleInterval?: number;

  holdDuration?: number;

  width?: string | number;

  height?: string | number;

  style?: React.CSSProperties;

  className?: string;
}

const COMPONENT_DEFAULTS = {
  imageConfig: {
    image: "/sparkz(1).svg",

    mode: "fit" as const,

    sizeUnit: "%" as const,

    widthPx: 400,
    heightPx: 400,

    widthPct: 100,
    heightPct: 100,

    scale: 9,
  },

  particleShape: "circle" as const,

  particleColor: "original" as const,

  singleColor: "#ffffff",

  multiColors: [
    "#ffffff",
    "#aaaaaa",
    "#555555",
  ],

  particleCount: 35,

  particleSize: 6,

  hoverEnabled: true,

  hoverConfig: {
    hoverType: "roam" as const,

    transition: {
      duration: 0.8,
      ease: "easeInOut" as const,
    },

    roamWidth: 0,
    roamHeight: 0,

    /*
     * ========================================================
     * CHANGED:
     * Rectangle → Circle
     * ========================================================
     */
    roamShape: "circle",

    roamOpacity: 0.7,

    hideType: "scatter",
  },

  repulsionEnabled: true,

  repulsionConfig: {
    repulsionMode: "outside" as const,

    repulsionForce: 8,

    repulsionRadius: 65,
  },
};

export default function ParticleImage(
  props: ParticleImageProps
) {
  const merged = {
    ...COMPONENT_DEFAULTS,
    ...props,
  };

  const {
    imageConfig,

    particleCount,

    particleSize,

    particleShape = "circle",

    particleColor = "original",

    singleColor = "#2E2645",

    multiColors = [
      "#2E2645",
      "#4A3F6B",
      "#C9A227",
      "#B8860B",
      "#1E1B2E",
    ],

    hoverEnabled = true,

    hoverConfig = {},

    repulsionEnabled = true,

    repulsionConfig = {},

    autoCycle = true,

    cycleInterval = 4500,

    holdDuration = 2200,

    width = "100%",

    height = "100%",

    style,

    className = "",
  } = merged;

  const hover = hoverEnabled;

  const {
    hoverType = "roam",

    transition,

    roamWidth = 0,

    roamHeight = 0,

    roamOpacity = 0.85,

    /*
     * ========================================================
     * Circle is now the default interaction area.
     * ========================================================
     */
    roamShape = "circle",

    hideType = "scatter",
  } = hoverConfig || {};

  const repulsion = repulsionEnabled;

  const {
    repulsionForce = 8,

    repulsionRadius = 65,

    repulsionMode = "outside",
  } = repulsionConfig || {};

  const image =
    imageConfig?.image ||
    "/sparkz-logo.png";

  const mode =
    imageConfig?.mode || "fit";

  const sizeUnit =
    imageConfig?.sizeUnit || "%";

  const widthPx =
    imageConfig?.widthPx || 400;

  const heightPx =
    imageConfig?.heightPx || 400;

  const widthPct =
    imageConfig?.widthPct || 100;

  const heightPct =
    imageConfig?.heightPct || 100;

  const scale =
    imageConfig?.scale || 9;

  const containerRef =
    useRef<HTMLDivElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef({
    x: -99999,
    y: -99999,
    active: false,
  });

  const prevMouseRef = useRef({
    x: -99999,
    y: -99999,
  });

  const mouseSpeedRef = useRef(0);

  const smoothMouseRef = useRef({
    x: -99999,
    y: -99999,
  });

  const physicsRef = useRef({
    hover,

    hoverType,

    transition,

    roamWidth,

    roamHeight,

    roamOpacity,

    roamShape,

    hideType,

    repulsion,

    repulsionForce,

    repulsionRadius,

    repulsionMode,

    particleSize,

    particleShape,

    particleColor,

    singleColor,

    multiColors,
  });

  physicsRef.current = {
    hover,

    hoverType,

    transition,

    roamWidth,

    roamHeight,

    roamOpacity,

    roamShape,

    hideType,

    repulsion,

    repulsionForce,

    repulsionRadius,

    repulsionMode,

    particleSize,

    particleShape,

    particleColor,

    singleColor,

    multiColors,
  };

  const sceneRef =
    useRef<{ particles: Particle[] }>({
      particles: [],
    });

  const dimsRef = useRef({
    W: 0,
    H: 0,
  });

  const samplingRef = useRef({
    image,

    mode,

    sizeUnit,

    widthPx,

    heightPx,

    widthPct,

    heightPct,

    scale,

    particleCount,

    hover,

    hoverType,

    roamWidth,

    roamHeight,

    roamShape,

    hideType,
  });

  samplingRef.current = {
    image,

    mode,

    sizeUnit,

    widthPx,

    heightPx,

    widthPct,

    heightPct,

    scale,

    particleCount,

    hover,

    hoverType,

    roamWidth,

    roamHeight,

    roamShape,

    hideType,
  };

  const animStateRef =
    useRef("active");

  const animRef =
    useRef<number | null>(null);

  const animStartTimeRef =
    useRef(0);

  const animTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const roamFadeStartRef =
    useRef(0);

  const roamFadeFromRef =
    useRef(1);

  const roamFadeToRef =
    useRef(1);

  const startAnimRef =
    useRef<((newState: string) => void) | null>(
      null
    );

  startAnimRef.current = (
    newState: string
  ) => {
    const { particles } =
      sceneRef.current;

    const { W, H } =
      dimsRef.current;

    const {
      hoverType: ht,

      roamWidth: rw,

      roamHeight: rh,

      roamShape: rs,

      roamOpacity: rOp,

      transition: tr,
    } = physicsRef.current;

    const { durMs: _dur } =
      getTransitionParams(tr);

    /*
     * ========================================================
     * Large invisible circular roaming area
     *
     * When roamWidth / roamHeight are 0,
     * the circle uses the complete available area.
     *
     * We use the smaller dimension so the circle
     * can never become a rectangle.
     * ========================================================
     */

    const defaultCircleSize =
      Math.min(W, H);

    const bw =
      rw > 0
        ? rw
        : defaultCircleSize;

    const bh =
      rh > 0
        ? rh
        : defaultCircleSize;

    const bx =
      (W - bw) / 2;

    const by =
      (H - bh) / 2;

    particles.forEach((p) => {
      if (p.isPadding) return;

      p.startX = p.x;

      p.startY = p.y;

      if (
        newState === "scattering" &&
        ht === "roam"
      ) {
        const [tx, ty] =
          randomInShape(
            rs,
            bx,
            by,
            bw,
            bh
          );

        p.roamTargetX = tx;

        p.roamTargetY = ty;

        p.idleX = tx;

        p.idleY = ty;
      }
    });

    const _rOp =
      rOp ?? 0.7;

    if (ht === "roam") {
      if (
        newState === "scattering"
      ) {
        roamFadeStartRef.current =
          Date.now();

        roamFadeFromRef.current =
          1;

        roamFadeToRef.current =
          _rOp;
      } else if (
        newState === "assembling"
      ) {
        roamFadeStartRef.current =
          Date.now();

        roamFadeFromRef.current =
          _rOp;

        roamFadeToRef.current =
          1;
      }
    }

    if (
      newState === "scattering" &&
      ht === "roam"
    ) {
      if (
        animTimerRef.current
      ) {
        clearTimeout(
          animTimerRef.current
        );
      }

      animStateRef.current =
        "idle";

      return;
    }

    animStartTimeRef.current =
      Date.now();

    animStateRef.current =
      newState;

    if (
      animTimerRef.current
    ) {
      clearTimeout(
        animTimerRef.current
      );
    }

    const next =
      newState === "assembling"
        ? "active"
        : "idle";

    animTimerRef.current =
      setTimeout(() => {
        if (
          animStateRef.current ===
          newState
        ) {
          animStateRef.current =
            next;
        }
      }, _dur);
  };

  const initParticles = () => {
    const {
      image: url,

      mode: md,

      sizeUnit: sU,

      widthPx: wPx,

      heightPx: hPx,

      widthPct: wPct,

      heightPct: hPct,

      scale: sc,

      particleCount: count,

      hover: hOn,

      hoverType: ht,

      roamWidth: rw,

      roamHeight: rh,

      roamShape: rs,

      hideType: hT,
    } = samplingRef.current;

    const { W, H } =
      dimsRef.current;

    if (!url || !W || !H)
      return;

    const canvas =
      canvasRef.current;

    if (!canvas)
      return;

    if (
      animTimerRef.current
    ) {
      clearTimeout(
        animTimerRef.current
      );
    }

    const gap = Math.max(
      2,
      Math.round(
        150 /
        Math.max(1, count)
      )
    );

    const dpr =
      window.devicePixelRatio ||
      1;

    canvas.width =
      Math.round(W * dpr);

    canvas.height =
      Math.round(H * dpr);

    mouseRef.current = {
      x: -99999,
      y: -99999,
      active: false,
    };

    sceneRef.current = {
      particles: [],
    };

    const tryLoad = (
      cors: boolean
    ) => {
      const img =
        new Image();

      if (cors) {
        img.crossOrigin =
          "anonymous";
      }

      img.onerror = () => {
        if (cors) {
          tryLoad(false);
        }
      };

      img.onload = () => {
        let rect: {
          x: number;
          y: number;
          w: number;
          h: number;
        };

        if (md === "fit") {
          const base =
            containRect(
              img.naturalWidth ||
              img.width,

              img.naturalHeight ||
              img.height,

              W,

              H
            );

          const f =
            Math.max(
              1,
              Math.min(20, sc)
            ) / 10;

          const w =
            base.w * f;

          const h =
            base.h * f;

          rect = {
            x: (W - w) / 2,

            y: (H - h) / 2,

            w,

            h,
          };
        } else if (
          sU === "px"
        ) {
          const w =
            Math.min(
              wPx,
              W
            );

          const h =
            Math.min(
              hPx,
              H
            );

          rect = {
            x: (W - w) / 2,

            y: (H - h) / 2,

            w,

            h,
          };
        } else {
          const w =
            (W * wPct) / 100;

          const h =
            (H * hPct) / 100;

          rect = {
            x: (W - w) / 2,

            y: (H - h) / 2,

            w,

            h,
          };
        }

        const off =
          document.createElement(
            "canvas"
          );

        off.width = W;

        off.height = H;

        const oc =
          off.getContext("2d");

        if (!oc)
          return;

        oc.drawImage(
          img,

          rect.x,

          rect.y,

          rect.w,

          rect.h
        );

        let px:
          | Uint8ClampedArray
          | null;

        try {
          px =
            oc.getImageData(
              0,
              0,
              W,
              H
            ).data;
        } catch (_) {
          return;
        }

        if (!px)
          return;

        const src:
          SrcParticle[] = [];

        for (
          let y = 0;
          y < H;
          y += gap
        ) {
          for (
            let x = 0;
            x < W;
            x += gap
          ) {
            const i =
              (y * W + x) * 4;

            if (
              px[i + 3] >= 20
            ) {
              src.push({
                homeX: x,

                homeY: y,

                r: px[i],

                g: px[i + 1],

                b: px[i + 2],

                a: px[i + 3],
              });
            }
          }
        }

        shuffle(src);

        let particles:
          Particle[] = [];

        const hidePos = (
          homeX: number,
          homeY: number
        ): [number, number] => {
          const range =
            hT === "in-place"
              ? 1
              : 10;

          const maxD =
            Math.max(W, H);

          const d =
            (range / 10) *
            0.5 *
            maxD;

          const angle =
            Math.random() *
            Math.PI *
            2;

          return [
            homeX +
            Math.cos(angle) * d,

            homeY +
            Math.sin(angle) * d,
          ];
        };

        if (!hOn) {
          animStateRef.current =
            "active";

          particles =
            src.map((p) =>
              mkParticle(
                p,

                p.homeX,

                p.homeY,

                p.homeX,

                p.homeY
              )
            );
        } else if (
          ht === "roam"
        ) {
          /*
           * ==================================================
           * LARGE INVISIBLE CIRCLE
           * ==================================================
           *
           * The previous code used:
           *
           *   bw = W
           *   bh = H
           *
           * which produced a rectangular movement area.
           *
           * Now the default circle uses the smaller dimension.
           * This guarantees a TRUE circle even when the canvas
           * itself is rectangular.
           */

          const defaultCircleSize =
            Math.min(W, H);

          const bw =
            rw > 0
              ? rw
              : defaultCircleSize;

          const bh =
            rh > 0
              ? rh
              : defaultCircleSize;

          const bx =
            (W - bw) / 2;

          const by =
            (H - bh) / 2;

          particles =
            src.map((p) => {
              const [
                rx,
                ry,
              ] =
                randomInShape(
                  rs,
                  bx,
                  by,
                  bw,
                  bh
                );

              const pt =
                mkParticle(
                  p,

                  rx,

                  ry,

                  rx,

                  ry
                );

              const [
                tx,
                ty,
              ] =
                randomInShape(
                  rs,
                  bx,
                  by,
                  bw,
                  bh
                );

              pt.roamTargetX =
                tx;

              pt.roamTargetY =
                ty;

              pt.vx =
                (Math.random() -
                  0.5) *
                1.2;

              pt.vy =
                (Math.random() -
                  0.5) *
                1.2;

              return pt;
            });

          animStateRef.current =
            "idle";
        } else {
          particles =
            src.map((p) => {
              const [
                ox,
                oy,
              ] =
                hidePos(
                  p.homeX,
                  p.homeY
                );

              return mkParticle(
                p,

                ox,

                oy,

                ox,

                oy
              );
            });

          animStateRef.current =
            "idle";
        }

        sceneRef.current = {
          particles,
        };
      };

      img.src = url;
    };

    tryLoad(true);
  };

  useEffect(() => {
    const el =
      containerRef.current;

    if (!el)
      return;

    const ro =
      new ResizeObserver(
        (entries) => {
          const r =
            entries[0]
              ?.contentRect;

          if (!r)
            return;

          const W =
            Math.round(
              r.width
            );

          const H =
            Math.round(
              r.height
            );

          if (!W || !H)
            return;

          dimsRef.current = {
            W,
            H,
          };

          initParticles();
        }
      );

    ro.observe(el);

    return () =>
      ro.disconnect();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initParticles();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    image,

    mode,

    sizeUnit,

    widthPx,

    heightPx,

    widthPct,

    heightPct,

    scale,

    particleCount,

    hover,

    hoverType,

    roamWidth,

    roamHeight,

    roamShape,

    hideType,
  ]);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas)
      return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx)
      return;

    let idata:
      ImageData | null = null;

    let bW = 0;

    let bH = 0;

    const draw = () => {
      animRef.current =
        requestAnimationFrame(
          draw
        );

      const PW =
        canvas.width;

      const PH =
        canvas.height;

      if (!PW || !PH)
        return;

      const dpr =
        window.devicePixelRatio ||
        1;

      const {
        particles,
      } =
        sceneRef.current;

      if (!particles.length)
        return;

      if (
        !idata ||
        PW !== bW ||
        PH !== bH
      ) {
        idata =
          ctx.createImageData(
            PW,
            PH
          );

        bW = PW;

        bH = PH;
      }

      idata.data.fill(0);

      const buf =
        idata.data;

      const {
        hover: hOn,

        hoverType: ht,

        transition: tr,

        roamWidth: rw,

        roamHeight: rh,

        roamOpacity: rOp,

        roamShape: rs,

        repulsion: repOn,

        repulsionForce: rF,

        repulsionRadius: rR,

        repulsionMode: rMode,

        particleSize: pSz,

        particleShape: pShape,

        particleColor: pColor,

        singleColor: scColor,

        multiColors: mcColors,
      } =
        physicsRef.current;

      const state =
        animStateRef.current;

      const {
        x: rawMx,

        y: rawMy,

        active,
      } =
        mouseRef.current;

      const hitSpeed =
        mouseSpeedRef.current;

      mouseSpeedRef.current *=
        0.88;

      const sm =
        smoothMouseRef.current;

      if (active) {
        const lerpFactor =
          Math.max(
            0.08,
            0.3 -
            hitSpeed *
            0.006
          );

        if (sm.x < -9000) {
          sm.x = rawMx;

          sm.y = rawMy;
        } else {
          sm.x +=
            (rawMx - sm.x) *
            lerpFactor;

          sm.y +=
            (rawMy - sm.y) *
            lerpFactor;
        }
      } else {
        sm.x = -99999;

        sm.y = -99999;
      }

      const mx = sm.x;

      const my = sm.y;

      const ps = Math.max(
        1,
        Math.ceil(
          (pSz / 4) * dpr
        )
      );

      const {
        easeFn,

        durMs,
      } =
        getTransitionParams(
          tr
        );

      const elapsed =
        Date.now() -
        animStartTimeRef.current;

      const animT =
        easeFn(
          Math.min(
            1,
            elapsed / durMs
          )
        );

      const {
        W: DW,

        H: DH,
      } =
        dimsRef.current;

      /*
       * ========================================================
       * Large invisible circular roaming area
       * ========================================================
       */

      const defaultCircleSize =
        Math.min(DW, DH);

      const bw =
        rw > 0
          ? rw
          : defaultCircleSize;

      const bh =
        rh > 0
          ? rh
          : defaultCircleSize;

      const bx =
        (DW - bw) / 2;

      const by =
        (DH - bh) / 2;

      const half =
        ps / 2;

      const drawParticle = (
        cx: number,

        cy: number,

        r: number,

        g: number,

        b: number,

        a: number,

        shapeType: string
      ) => {
        const px0 =
          Math.round(cx) -
          (ps >> 1);

        const py0 =
          Math.round(cy) -
          (ps >> 1);

        const s =
          Math.max(2, ps);

        const halfS =
          s >> 1;

        if (
          shapeType === "cube"
        ) {
          const rTop =
            Math.min(
              255,
              Math.round(
                r * 1.35
              ) + 30
            );

          const gTop =
            Math.min(
              255,
              Math.round(
                g * 1.35
              ) + 30
            );

          const bTop =
            Math.min(
              255,
              Math.round(
                b * 1.35
              ) + 30
            );

          const rRight =
            Math.round(
              r * 0.6
            );

          const gRight =
            Math.round(
              g * 0.6
            );

          const bRight =
            Math.round(
              b * 0.6
            );

          for (
            let dy = 0;
            dy < s;
            dy++
          ) {
            const iy =
              py0 + dy;

            if (
              iy < 0 ||
              iy >= PH
            )
              continue;

            const row =
              iy * PW;

            for (
              let dx = 0;
              dx < s;
              dx++
            ) {
              const ix =
                px0 + dx;

              if (
                ix < 0 ||
                ix >= PW
              )
                continue;

              const i =
                (row + ix) *
                4;

              if (
                dy <
                Math.max(
                  1,
                  halfS *
                  0.75
                )
              ) {
                buf[i] = rTop;

                buf[i + 1] =
                  gTop;

                buf[i + 2] =
                  bTop;
              } else if (
                dx < halfS
              ) {
                buf[i] = r;

                buf[i + 1] =
                  g;

                buf[i + 2] =
                  b;
              } else {
                buf[i] =
                  rRight;

                buf[i + 1] =
                  gRight;

                buf[i + 2] =
                  bRight;
              }

              buf[i + 3] =
                a;
            }
          }

          return;
        }

        for (
          let dy = 0;
          dy < ps;
          dy++
        ) {
          const iy =
            py0 + dy;

          if (
            iy < 0 ||
            iy >= PH
          )
            continue;

          const row =
            iy * PW;

          for (
            let dx = 0;
            dx < ps;
            dx++
          ) {
            if (
              shapeType ===
              "circle"
            ) {
              const ddx =
                dx -
                half +
                0.5;

              const ddy =
                dy -
                half +
                0.5;

              if (
                ddx * ddx +
                ddy * ddy >
                half * half
              )
                continue;
            }

            const ix =
              px0 + dx;

            if (
              ix < 0 ||
              ix >= PW
            )
              continue;

            const i =
              (row + ix) *
              4;

            buf[i] = r;

            buf[i + 1] =
              g;

            buf[i + 2] =
              b;

            buf[i + 3] =
              a;
          }
        }
      };

      const repCutoff =
        Math.max(
          1,
          rR
        );

      const repCutoffSq =
        repCutoff *
        repCutoff;

      let pIdx = 0;

      for (
        const p of particles
      ) {
        const pCurrentShape =
          pShape === "both"
            ? pIdx % 2 === 1
              ? "circle"
              : "cube"
            : pShape;

        pIdx++;

        if (p.isPadding)
          continue;

        let baseX = p.x;

        let baseY = p.y;

        if (
          state ===
          "assembling"
        ) {
          baseX =
            p.startX +
            (p.homeX -
              p.startX) *
            animT;

          baseY =
            p.startY +
            (p.homeY -
              p.startY) *
            animT;
        } else if (
          state ===
          "scattering"
        ) {
          baseX =
            p.startX +
            (p.idleX -
              p.startX) *
            animT;

          baseY =
            p.startY +
            (p.idleY -
              p.startY) *
            animT;
        } else if (
          state === "active"
        ) {
          baseX =
            p.homeX;

          baseY =
            p.homeY;
        } else if (
          state === "idle"
        ) {
          if (
            ht === "roam"
          ) {
            const dtx =
              p.roamTargetX -
              p.x;

            const dty =
              p.roamTargetY -
              p.y;

            if (
              Math.sqrt(
                dtx * dtx +
                dty * dty
              ) < 3
            ) {
              const [
                tx,
                ty,
              ] =
                randomInShape(
                  rs,
                  bx,
                  by,
                  bw,
                  bh
                );

              p.roamTargetX =
                tx;

              p.roamTargetY =
                ty;
            }

            p.vx =
              (p.vx || 0) *
              0.98 +
              (p.roamTargetX -
                p.x) *
              0.003;

            p.vy =
              (p.vy || 0) *
              0.98 +
              (p.roamTargetY -
                p.y) *
              0.003;

            const sp2 =
              Math.sqrt(
                p.vx **
                2 +
                p.vy **
                2
              );

            if (
              sp2 > 1.5
            ) {
              p.vx =
                (p.vx /
                  sp2) *
                1.5;

              p.vy =
                (p.vy /
                  sp2) *
                1.5;
            }

            p.x += p.vx;

            p.y += p.vy;

            baseX = p.x;

            baseY = p.y;
          } else {
            baseX =
              p.idleX;

            baseY =
              p.idleY;
          }
        }

        if (repOn) {
          if (
            rMode ===
            "random"
          ) {
            const dx =
              baseX - rawMx;

            const dy =
              baseY - rawMy;

            const dist =
              Math.sqrt(
                dx * dx +
                dy * dy
              );

            if (
              dist <
              repCutoff
            ) {
              if (
                !p.inZone
              ) {
                const angle =
                  Math.random() *
                  Math.PI *
                  2;

                const d =
                  Math.random() *
                  rF *
                  5;

                p.repTargetX =
                  Math.cos(
                    angle
                  ) * d;

                p.repTargetY =
                  Math.sin(
                    angle
                  ) * d;

                p.inZone = true;
              }

              p.repX +=
                (p.repTargetX -
                  p.repX) *
                0.15;

              p.repY +=
                (p.repTargetY -
                  p.repY) *
                0.15;
            } else {
              p.inZone =
                false;
            }
          } else {
            if (active) {
              const dx =
                baseX - mx;

              const dy =
                baseY - my;

              const distSq =
                dx * dx +
                dy * dy;

              if (
                distSq > 0 &&
                distSq <
                repCutoffSq
              ) {
                const dist =
                  Math.sqrt(
                    distSq
                  );

                const nx =
                  dx / dist;

                const ny =
                  dy / dist;

                const falloff =
                  1 -
                  dist /
                  repCutoff;

                const push =
                  falloff *
                  hitSpeed *
                  rF *
                  0.05;

                p.repX +=
                  nx * push;

                p.repY +=
                  ny * push;

                const targetRepX =
                  nx *
                  (repCutoff -
                    dist);

                const targetRepY =
                  ny *
                  (repCutoff -
                    dist);

                p.repX +=
                  (targetRepX -
                    p.repX) *
                  0.06;

                p.repY +=
                  (targetRepY -
                    p.repY) *
                  0.06;

                p.inZone =
                  true;
              } else {
                p.inZone =
                  false;
              }
            } else {
              p.inZone =
                false;
            }
          }
        } else {
          p.inZone =
            false;
        }

        if (!p.inZone) {
          p.repX *=
            0.97;

          p.repY *=
            0.97;
        }

        p.x =
          baseX +
          p.repX;

        p.y =
          baseY +
          p.repY;

        let dr = p.r;

        let dg = p.g;

        let db = p.b;

        let da = p.a;

        if (
          state === "active"
        ) {
          dr = p.r;

          dg = p.g;

          db = p.b;

          da = p.a;
        } else if (
          p.isExtra
        ) {
          dr = p.r;

          dg = p.g;

          db = p.b;

          if (
            state ===
            "assembling"
          ) {
            da = Math.round(
              p.a * animT
            );
          } else if (
            state ===
            "scattering"
          ) {
            da = Math.round(
              p.a *
              (1 - animT)
            );
          } else {
            da = 0;
          }
        } else if (
          ht === "roam" &&
          hOn
        ) {
          let alphaMul: number;

          if (
            roamFadeStartRef.current ===
            0
          ) {
            alphaMul =
              rOp ?? 0.7;
          } else {
            const fadeElapsed =
              Date.now() -
              roamFadeStartRef.current;

            const fadeT =
              Math.min(
                1,
                Math.max(
                  0,
                  fadeElapsed /
                  durMs
                )
              );

            const easedFadeT =
              easeFn(fadeT);

            alphaMul =
              roamFadeFromRef.current +
              (roamFadeToRef.current -
                roamFadeFromRef.current) *
              easedFadeT;
          }

          dr = p.r;

          dg = p.g;

          db = p.b;

          da = Math.round(
            p.a * alphaMul
          );
        } else if (
          ht === "hide" &&
          hOn
        ) {
          let alphaMul: number;

          if (
            state === "idle"
          ) {
            alphaMul = 0;
          } else if (
            state ===
            "assembling"
          ) {
            alphaMul =
              animT;
          } else if (
            state ===
            "scattering"
          ) {
            alphaMul =
              1 - animT;
          } else {
            alphaMul = 1;
          }

          dr = p.r;

          dg = p.g;

          db = p.b;

          da = Math.round(
            p.a * alphaMul
          );
        } else {
          dr = p.r;

          dg = p.g;

          db = p.b;

          da = p.a;
        }

        if (da < 1)
          continue;

        if (
          pColor ===
          "single"
        ) {
          const sc =
            parseColor(
              scColor
            );

          dr = sc.r;

          dg = sc.g;

          db = sc.b;
        } else if (
          pColor === "multi" ||
          pColor === "dark"
        ) {
          const cols = (
            mcColors || [
              "#2E2645",
              "#4A3F6B",
              "#C9A227",
              "#B8860B",
              "#1E1B2E",
            ]
          ).filter(Boolean);

          if (
            cols.length > 0
          ) {
            const mc =
              parseColor(
                cols[
                p.colorIdx %
                cols.length
                ]
              );

            dr = mc.r;

            dg = mc.g;

            db = mc.b;
          }
        } else if (
          pColor ===
          "original"
        ) {
          /*
           * ==================================================
           * ORIGINAL SPARKZ GOLD PARTICLE COLOR
           * ==================================================
           */

          const lum =
            (0.299 * dr +
              0.587 * dg +
              0.114 * db) /
            255;

          let t =
            (lum - 0.1) /
            0.88;

          t = Math.max(
            0,
            Math.min(1, t)
          );

          t =
            t *
            t *
            (3 - 2 * t);

          const stops = [
            {
              t: 0.0,
              r: 112,
              g: 72,
              b: 34,
            },

            {
              t: 0.22,
              r: 168,
              g: 122,
              b: 62,
            },

            {
              t: 0.48,
              r: 203,
              g: 162,
              b: 95,
            },

            {
              t: 0.72,
              r: 234,
              g: 211,
              b: 154,
            },

            {
              t: 1.0,
              r: 249,
              g: 233,
              b: 190,
            },
          ];

          let left =
            stops[0];

          let right =
            stops[
            stops.length -
            1
            ];

          for (
            let i = 0;
            i <
            stops.length - 1;
            i++
          ) {
            if (
              t >=
              stops[i]
                .t &&
              t <=
              stops[i + 1]
                .t
            ) {
              left =
                stops[i];

              right =
                stops[i + 1];

              break;
            }
          }

          const range =
            Math.max(
              0.0001,
              right.t -
              left.t
            );

          const f =
            (t - left.t) /
            range;

          dr = Math.round(
            left.r +
            (right.r -
              left.r) *
            f
          );

          dg = Math.round(
            left.g +
            (right.g -
              left.g) *
            f
          );

          db = Math.round(
            left.b +
            (right.b -
              left.b) *
            f
          );

          const maxC =
            Math.max(
              dr,
              dg,
              db
            );

          const minC =
            Math.min(
              dr,
              dg,
              db
            );

          const mid =
            (maxC + minC) /
            2;

          const satBoost =
            1.08;

          if (
            maxC !== minC
          ) {
            dr = Math.round(
              Math.max(
                0,
                Math.min(
                  255,
                  mid +
                  (dr -
                    mid) *
                  satBoost
                )
              )
            );

            dg = Math.round(
              Math.max(
                0,
                Math.min(
                  255,
                  mid +
                  (dg -
                    mid) *
                  satBoost
                )
              )
            );

            db = Math.round(
              Math.max(
                0,
                Math.min(
                  255,
                  mid +
                  (db -
                    mid) *
                  satBoost
                )
              )
            );
          }

          da = Math.min(
            255,
            Math.round(
              da * 1.08
            )
          );
        }

        drawParticle(
          p.x * dpr,

          p.y * dpr,

          dr,

          dg,

          db,

          da,

          pCurrentShape
        );
      }

      ctx.putImageData(
        idata,
        0,
        0
      );
    };

    draw();

    return () => {
      if (
        animRef.current
      ) {
        cancelAnimationFrame(
          animRef.current
        );
      }
    };
  }, []);

  /*
   * ============================================================
   * AUTO CYCLE
   * ============================================================
   */

  useEffect(() => {
    if (!autoCycle)
      return;

    let intervalTimer:
      | ReturnType<
        typeof setInterval
      >
      | null = null;

    let holdTimer:
      | ReturnType<
        typeof setTimeout
      >
      | null = null;

    const triggerAssembleAndDisperse =
      () => {
        if (
          mouseRef.current
            .active
        )
          return;

        if (
          startAnimRef.current
        ) {
          startAnimRef.current(
            "assembling"
          );
        }

        holdTimer =
          setTimeout(() => {
            if (
              !mouseRef.current
                .active &&
              startAnimRef.current
            ) {
              startAnimRef.current(
                "scattering"
              );
            }
          }, holdDuration);
      };

    const initTimer =
      setTimeout(() => {
        triggerAssembleAndDisperse();

        intervalTimer =
          setInterval(
            triggerAssembleAndDisperse,

            cycleInterval
          );
      }, 1200);

    return () => {
      clearTimeout(
        initTimer
      );

      if (holdTimer)
        clearTimeout(
          holdTimer
        );

      if (intervalTimer)
        clearInterval(
          intervalTimer
        );
    };
  }, [
    autoCycle,

    cycleInterval,

    holdDuration,
  ]);

  const onMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas)
      return;

    const rect =
      canvas.getBoundingClientRect();

    const { W, H } =
      dimsRef.current;

    const scaleX =
      rect.width > 0
        ? W / rect.width
        : 1;

    const scaleY =
      rect.height > 0
        ? H / rect.height
        : 1;

    const mx =
      (e.clientX -
        rect.left) *
      scaleX;

    const my =
      (e.clientY -
        rect.top) *
      scaleY;

    const prev =
      prevMouseRef.current;

    if (
      prev.x > -9999
    ) {
      const ddx =
        mx - prev.x;

      const ddy =
        my - prev.y;

      mouseSpeedRef.current =
        Math.sqrt(
          ddx * ddx +
          ddy * ddy
        );
    }

    prevMouseRef.current = {
      x: mx,

      y: my,
    };

    mouseRef.current = {
      x: mx,

      y: my,

      active: true,
    };

    if (
      physicsRef.current
        .hover
    ) {
      const s =
        animStateRef.current;

      if (
        s === "idle" ||
        s === "scattering"
      ) {
        startAnimRef.current?.(
          "assembling"
        );
      }
    }
  };

  const onMouseLeave =
    () => {
      mouseRef.current = {
        x: -99999,

        y: -99999,

        active: false,
      };

      if (
        physicsRef.current
          .hover &&
        !autoCycle
      ) {
        const s =
          animStateRef.current;

        if (
          s ===
          "assembling" ||
          s === "active"
        ) {
          startAnimRef.current?.(
            "scattering"
          );
        }
      }
    };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",

        width,

        height,

        /*
         * Keep the container invisible.
         * No background.
         * No border.
         * No visible circle.
         */
        overflow: "hidden",

        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",

          width: "100%",

          height: "100%",
        }}
        onMouseMove={
          onMouseMove
        }
        onMouseLeave={
          onMouseLeave
        }
      />
    </div>
  );
}