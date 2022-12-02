import React, { useRef } from "react";
import styled from "styled-components";
import Cube from "./Cube";
import FPS from "./FPS";

const AppContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  margin: 0;
  padding: 0;

  background: black;
`;

export default function App() {
  return (
    <AppContainer>
      <Cube />
      <FPS />
    </AppContainer>
  );
}
