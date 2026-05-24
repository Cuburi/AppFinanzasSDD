import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { routerFutureFlags } from "./router-future-flags";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter future={routerFutureFlags}>
    <App />
  </BrowserRouter>,
);
