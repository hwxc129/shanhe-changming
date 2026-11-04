import { createRoot } from "react-dom/client";
import Memorial from "../app/memorial";
import About from "../app/about/page";
import Privacy from "../app/privacy/page";
import Festivals from "../app/festivals/page";
import Feedback from "../app/feedback/page";
import Share from "../app/share/page";
import "../app/globals.css";

const path = window.location.pathname.replace(/\/+$/, "");
const page = path.endsWith("/about") ? <About /> : path.endsWith("/privacy") ? <Privacy /> :
  path.endsWith("/festivals") ? <Festivals /> : path.endsWith("/feedback") ? <Feedback /> : path.endsWith("/share") ? <Share /> : <Memorial initialStats={null} />;
createRoot(document.getElementById("root")!).render(page);
