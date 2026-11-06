"use strict";

const routes = new Set(["home", "informationen", "uebungen", "videos"]);
const views = Array.from(document.querySelectorAll("[data-route]"));
let activeRoute = null;

function getRoute() {
  const name = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  return routes.has(name) ? name : "home";
}

function showRoute() {
  const route = getRoute();
  if (route === activeRoute) return;

  views.forEach((view) => {
    view.hidden = view.dataset.route !== route;
  });
  activeRoute = route;

  const activeView = views.find((view) => view.dataset.route === route);
  const heading = activeView?.querySelector("h1");

  document.title = route === "home"
    ? "Mock-up Demo"
    : `${heading?.textContent.trim() ?? "Mock-up Demo"} – Mock-up Demo`;

  window.scrollTo({ top: 0, behavior: "instant" });
  if (heading && route !== "home") {
    heading.focus({ preventScroll: true });
  }
}

window.addEventListener("hashchange", showRoute);
showRoute();
