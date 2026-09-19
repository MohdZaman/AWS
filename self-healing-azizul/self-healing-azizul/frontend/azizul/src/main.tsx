/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
// @ts-expect-error React is provided by the frontend bundler/runtime.
import React, { StrictMode } from "react";
// @ts-expect-error React DOM client is provided by the frontend bundler/runtime.
import { createRoot } from "react-dom/client";
// @ts-expect-error CSS is handled by the bundler and 'has no TypeScript declarations.
import "./index.css";
import App from "./App";
import  './amplify'
createRoot(document.getElementById("root")!).render(
  React.createElement(StrictMode, null, React.createElement(App))
);
