import { createRoot } from "react-dom/client";
import Memorial from "../app/memorial";
import About from "../app/about/page";
import Privacy from "../app/privacy/page";
import Festivals from "../app/festivals/page";
import "../app/globals.css";

const path = window.location.pathname.replace(/\/+$/, "");
const page = path.endsWith("/about") ? <About /> : path.endsWith("/privacy") ? <Privacy /> :
  path.endsWith("/festivals") ? <Festivals /> : <Memorial initialStats={null} />;
createRoot(document.getElementById("root")!).render(page);
