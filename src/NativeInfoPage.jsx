import { useEffect, useState } from "react";
import parse from "html-react-parser";
import { beginLoading } from "./loading-state.js";
const pages = {
  about: ["About MySelfPay", "/about/"],
  contact: ["Contact", "/contact/"],
  "privacy-terms": ["Terms & Privacy", "/privacy-terms/"],
  "for-imaging-centers": ["For imaging centers", "/for-imaging-centers/"],
};
export const isNativeInfo = (route) => Object.hasOwn(pages, route);
export default function NativeInfoPage({ route, onBack }) {
  const [html, setHTML] = useState(""),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(),
      end = beginLoading();
    let active = true;
    setHTML("");
    setError("");
    const timeout = setTimeout(() => controller.abort(), 30000);
    fetch(pages[route][1], { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Page unavailable");
        const doc = new DOMParser().parseFromString(
            await response.text(),
            "text/html",
          ),
          main = doc.querySelector("main");
        if (!main) throw Error("Page unavailable");
        main
          .querySelectorAll("script,style,iframe,form,object,embed,footer")
          .forEach((el) => el.remove());
        main.querySelectorAll("*").forEach((el) => {
          [...el.attributes].forEach((attr) => {
            if (attr.name.startsWith("on") || attr.name === "style")
              el.removeAttribute(attr.name);
          });
        });
        main.querySelectorAll("a[href]").forEach((a) => {
          const url = new URL(a.getAttribute("href"), location.origin);
          if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol)) {
            a.removeAttribute("href");
            return;
          }
          if (url.origin === location.origin) {
            const path = url.pathname.replace(/^\/|\/$/g, "");
            if (pages[path]) a.setAttribute("href", "#" + path);
            else if (!path) a.setAttribute("href", url.hash || "#home");
          } else if (url.protocol === "https:") {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
          }
        });
        if (active) setHTML(main.innerHTML);
      })
      .catch(() => {
        if (active)
          setError(
            "This page could not be loaded. Check your connection and try again.",
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        end();
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
      end();
    };
  }, [route, attempt]);
  return (
    <section className="native-info-page">
      <button className="native-info-back" type="button" aria-label="Back" onClick={onBack}>
        ← Back
      </button>
      {error ? (
        <div role="alert">
          <h1>{pages[route][0]}</h1>
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : html ? (
        <article>{parse(html)}</article>
      ) : (
        <p role="status">Loading {pages[route][0]}…</p>
      )}
    </section>
  );
}
