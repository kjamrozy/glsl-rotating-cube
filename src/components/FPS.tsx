import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;

  font-family: sans-serif;
  font-size: 30px;
  color: springgreen;

  user-select: none;
  pointer-events: none;
`;
export default function FPS() {
  const [fps, setFPS] = useState(60);
  const currentFPSRef = useRef<number | null>(0);
  const countFPS = useCallback(() => {
    if (currentFPSRef.current === null) { return; }
    ++currentFPSRef.current;
    requestAnimationFrame(countFPS);
  }, []);
  const updateFPS = useCallback(() => {
    setFPS(currentFPSRef.current!);
    currentFPSRef.current = 0;
  }, []);
  useEffect(() => {
    requestAnimationFrame(countFPS);
    const updateFPSInterval = setInterval(updateFPS, 1000);
    return () => {
      // another RAF will not be scheduled thanks to this
      currentFPSRef.current = null;
      clearInterval(updateFPSInterval);
    };
  }, []);
  return (
    <Container>FPS:{fps}</Container>
  );
}
