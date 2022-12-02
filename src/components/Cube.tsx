import React, { useCallback, useEffect, useMemo } from "react";
import { useRef } from "react";
import styled from "styled-components";
import { draw, resize, setup } from "../rendering";

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

// FIXME: Duplicated type
type Point = { x: number, y: number };

export default function Cube() {
  /* Refs */
  const ctxRef = useRef<WebGLRenderingContext | null>(null);
  const mousePosRef = useRef<Point>({ x: -1, y: -1 });

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    window.addEventListener("resize", onResize);

    loop(performance.now());
    return () => {
      // thanks to this loop will end after next RAF
      ctxRef.current = null;

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);

      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* Callbacks */

  const onMouseMove = useCallback((ev: MouseEvent) => {
    mousePosRef.current.x = ev.clientX / window.innerWidth;
    mousePosRef.current.y = ev.clientY / window.innerHeight;
  }, []);
  const onMouseLeave = useCallback(() => {
    mousePosRef.current.x = -1;
    mousePosRef.current.y = -1;
  }, []);

  const onResize = useCallback(() => {
    mousePosRef.current.x = -1;
    mousePosRef.current.y = -1;
    resize(
      ctxRef.current!,
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio,
    );
  }, []);

  const loop = useCallback((frameTime: number) => {
    draw(ctxRef.current!, frameTime / 1000, mousePosRef.current);
    ctxRef.current && requestAnimationFrame(loop);
  }, []);

  const onCanvas = useCallback((canvas: HTMLCanvasElement) => {
    ctxRef.current = setup(
      canvas,
      window.devicePixelRatio * window.innerWidth,
      window.devicePixelRatio * window.innerHeight
    );
  }, []);

  return (
    <Canvas ref={onCanvas} />
  )
}