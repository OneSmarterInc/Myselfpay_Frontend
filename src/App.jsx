import { useEffect, useMemo, useRef, useState } from "react";
import parse, { attributesToProps, domToReact } from "html-react-parser";
import { api, establishSession, setCsrf } from "./api.js";
import { originalUI } from "./original-ui.js";
import { directoryOffer } from "./directory-offer.js";
import { spatialOffers, watchLocation } from "./spatial.js";
import { currentLocationLabel } from "./auto-location.js";
import { StatewideLocationManager } from "./statewide-location.js";
import { predefinedQuestion } from "./chat-questions.js";
import UserDashboard from "./UserDashboard.jsx";
import OriginalBooking, { OriginalBookingLink } from "./OriginalBooking.jsx";

const initialState = () => ({
  mod: "",
  body: "",
  contrast: "unknown",
  location: "",
  locationExplicit: false,
  nearToMe: false,
  nearInfoOpen: false,
  budget: 0,
  type: "all",
  mode: "classic",
  selected: [],
  private: true,
  messages: [],
  conversationId: null,
  usage: {},
  chatBlocked: false,
  chatLimitReason: null,
  member: "",
  savedId: null,
  sort: "distance",
  scope: "state",
  radius: 50,
  programs: [],
  programEntries: [],
  nearbyUnpriced: [],
  resultsHeading: "",
  directoryQuery: "",
  directoryPage: 0,
  resultsPage: 0,
  detailsOpen: false,
  searched: false,
  dirty: false,
});
const initialCatalog = { entries: [], offers: [], locations: [] };
const filterNames = [
  "mod",
  "body",
  "contrast",
  "location",
  "budget",
  "type",
  "scope",
  "radius",
  "sort",
  "selected",
];
const payload = (state) =>
  Object.fromEntries(filterNames.map((key) => [key, state[key]]));
const route = () => decodeURIComponent(location.hash.slice(1) || "home");

export function OriginalHTML({ html, onInput, replace, disabled = false }) {
  const options = {
    replace(node) {
      if (node.type !== "tag") return undefined;
      if (replace) {
        const result = replace(node, options);
        if (result !== undefined) return result;
      }
      if (disabled && node.name === "button")
        return (
          <button {...attributesToProps(node.attribs)} disabled>
            {domToReact(node.children, options)}
          </button>
        );
      if (node.name === "option") {
        const props = attributesToProps(node.attribs);
        delete props.selected;
        return <option {...props}>{domToReact(node.children, options)}</option>;
      }
      if (["input", "select", "textarea"].includes(node.name)) {
        const props = attributesToProps(node.attribs);
        props.onChange = onInput || (() => {});
        if (node.name === "select") {
          const selected = node.children.find(
            (child) => child.name === "option" && "selected" in child.attribs,
          );
          if (selected)
            props.value =
              selected.attribs.value ??
              selected.children.map((x) => x.data || "").join("");
        }
        if (node.name === "textarea")
          props.value = node.children.map((x) => x.data || "").join("");
        if (props.defaultValue !== undefined) {
          props.value = props.defaultValue;
          delete props.defaultValue;
        }
        if (props.defaultChecked !== undefined) {
          props.checked = props.defaultChecked;
          delete props.defaultChecked;
        }
        if (node.name === "input" && props.type === "checkbox") {
          props.checked = "checked" in node.attribs;
        }
        if (disabled) props.disabled = true;
        if (node.name === "input") return <input {...props} />;
        return node.name === "select" ? (
          <select {...props}>{domToReact(node.children, options)}</select>
        ) : (
          <textarea {...props} />
        );
      }
      return undefined;
    },
  };
  return parse(html, options);
}

function Dialog({ children, onClose, booking = false }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      id="modal"
      className={booking ? "booking-flow-dialog" : undefined}
      ref={ref}
      aria-labelledby="dialogTitle"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-header row between" hidden={booking}>
        <span className="eyebrow">MYSELFPAY</span>
        <button id="closeModal" aria-label="Close dialog" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="modal-body" id="modalBody">
        {children}
      </div>
    </dialog>
  );
}

export default function App() {
  const [pendingBooking, setPendingBooking] = useState(null);
  const [account, setAccount] = useState(null),
    [state, setState] = useState(() => ({
      ...initialState(),
      mode: route() === "agent" ? "agent" : "classic",
    })),
    [catalog, setCatalog] = useState(initialCatalog),
    [results, setResults] = useState([]);
  const [view, setView] = useState(() =>
      ["directory", "compare"].includes(route()) ? "home" : route(),
    ),
    [dialog, setDialog] = useState(() =>
      ["directory", "compare"].includes(route()) ? { type: route() } : null,
    ),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [catalogReady, setCatalogReady] = useState(false),
    [catalogError, setCatalogError] = useState(""),
    [summary, setSummary] = useState(null),
    [locationsOpen, setLocationsOpen] = useState(false),
    [locationAll, setLocationAll] = useState(false),
    [map, setMap] = useState(null),
    [auth, setAuth] = useState({}),
    [authError, setAuthError] = useState(""),
    [boot, setBoot] = useState(true);
  const [spatialEnabled, setSpatialEnabled] = useState(false);
  const [spatialSnapshot, setSpatialSnapshot] = useState(null);
  const [spatialManager] = useState(() => new StatewideLocationManager(api));
  const displayResults = useMemo(
    () =>
      spatialSnapshot ? spatialOffers(spatialSnapshot.records, state) : results,
    [
      spatialSnapshot,
      results,
      state.mod,
      state.contrast,
      state.budget,
      state.type,
      state.sort,
    ],
  );
  useEffect(() => {
    spatialManager.clear();
    setSpatialEnabled(false);
    setSpatialSnapshot(null);
    setState((old) => ({
      ...old,
      spatialActive: false,
      spatialLoading: false,
      spatialStatus: "",
    }));
  }, [account?.id, spatialManager]);
  useEffect(() => {
    if (!spatialEnabled || !account || view !== "search") return;
    let active = true;
    let stop = () => {};
    const fail = (error) => {
      if (!active) return;
      if (![2, 3].includes(error.code)) setSpatialEnabled(false);
      setState((old) => ({
        ...old,
        spatialLoading: false,
        nearToMe: [2,3].includes(error.code) ? old.nearToMe : false,
        spatialStatus: error.message,
      }));
    };
    stop = watchLocation(async (latitude, longitude) => {
      try {
        const bundle = await spatialManager.update(latitude, longitude);
        if (!active || !bundle) return;
        bundle.currentLocationLabel = await currentLocationLabel(latitude, longitude);
        if (!active) return;
        setSpatialSnapshot(bundle);
        setState((old) => ({
          ...old,
          spatialLoading: false,
          location: bundle.queryLocation,
          spatialStatus:
            bundle.truncated || bundle.offers_truncated
              ? "This area contains more records than one bundle can display. Results are limited; use ZIP or state search for the wider directory."
              : bundle.records.length
                ? `Showing centers across ${bundle.state === "National" ? "the US directory" : bundle.state}. Distances are approximate straight-line miles from your current location.`
                : `No centers are available for ${bundle.state} in the current directory.`,
          resultsPage: bundle.initial ? 0 : old.resultsPage,
        }));
      } catch (error) {
        fail(error);
      }
    }, fail);
    const hide = () => {
      if (document.hidden) setSpatialEnabled(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [spatialEnabled, account?.id, view, spatialManager]);
  function stopSpatial() {
    setSpatialEnabled(false);
    setSpatialSnapshot(null);
    spatialManager.clear();
    setState((old) => ({
      ...old,
      spatialActive: false,
      nearToMe: false,
      nearInfoOpen: false,
      spatialStatus: "",
      spatialLoading: false,
      ...(old.location === "Near my location"
        ? { location: "", searched: false }
        : {}),
    }));
  }
  const sequence = useRef(0),
    form = useRef(null);
  const allOffers = useMemo(
    () => [
      ...new Map(
        [
          ...catalog.entries.map((entry) => directoryOffer(entry, state)),
          ...(state.nearbyUnpriced || []).map((entry) =>
            directoryOffer(entry, state),
          ),
          ...(state.programEntries || []).map((entry) =>
            directoryOffer(entry, state),
          ),
          ...catalog.offers,
          ...displayResults,
          ...(state.programs || []),
        ].map((o) => [o.id, o]),
      ).values(),
    ],
    [
      catalog,
      displayResults,
      state.programs,
      state.nearbyUnpriced,
      state.programEntries,
      state.mod,
    ],
  );
  const ui = originalUI({
    state: {
      ...state,
      spatialActive: !!spatialSnapshot || spatialEnabled || state.spatialActive,
      spatialEnabled,
      currentLocationLabel: spatialSnapshot?.currentLocationLabel || "",
      member: account ? `${account.tenant} / ${account.name}` : "",
    },
    account,
    DIRECTORY: catalog.entries,
    catalogCounts: catalog,
    offers: allOffers,
    results: displayResults,
    catalogReady,
    catalogError,
    summary,
  });
  function navigate(next) {
    location.hash = next;
  }
  function clear() {
    stopSpatial();
    sequence.current++;
    setCsrf("");
    setAccount(null);
    setCatalog(initialCatalog);
    setCatalogReady(false);
    setState(initialState());
    setResults([]);
    setDialog(null);
    setMap(null);
  }
  useEffect(() => {
    if (
      pendingBooking &&
      account &&
      account.tenant !== "guest" &&
      view === "search"
    ) {
      setDialog(pendingBooking);
      setPendingBooking(null);
    }
  }, [pendingBooking, account, view]);
  useEffect(() => {
    const chat = document.getElementById("chat");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [state.messages, view]);
  function close() {
    if (dialog?.type === "booking-login") setPendingBooking(null);
    setDialog(null);
    if (["directory", "compare"].includes(route()))
      history.replaceState(null, "", `${location.pathname}#${view}`);
  }
  useEffect(() => {
    const change = () => {
      const next = route();
      if (["directory", "compare"].includes(next)) {
        setDialog({ type: next });
        return;
      }
      setView(next);
      if (next === "search" || next === "agent")
        setState((old) => ({
          ...old,
          mode: next === "agent" ? "agent" : "classic",
        }));
      setDialog(null);
      setMap(null);
      setAuth({});
      setAuthError("");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    const expired = () => {
      clear();
      setToast("Your session expired. Sign in as guest or log in again.");
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("selfpay:session-expired", expired);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("selfpay:session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    let active = true;
    api("/directory-summary")
      .then((value) => {
        if (active) setSummary(value);
      })
      .catch(() => {});
    api("/me")
      .then((value) => {
        if (active) setAccount(value.member);
      })
      .catch((error) => {
        if (active && error.status !== 401) setToast(error.message);
      })
      .finally(() => {
        if (active) setBoot(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!account) return;
    let active = true;
    setCatalogReady(false);
    if (summary?.spatial_api_version) {
      api("/catalog?metadata=1")
        .then((value) => {
          if (active) {
            setCatalog(value);
            setCatalogReady(true);
            setCatalogError("");
          }
        })
        .catch((error) => {
          if (active) {
            setCatalogError(error.message);
            if (error.status !== 401) setToast(error.message);
          }
        });
    }
    api("/guest-usage")
      .then((value) => {
        if (active) setState((old) => ({ ...old, usage: value.usage || {} }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [account, summary?.spatial_api_version]);
  async function run(action) {
    setBusy(true);
    try {
      return await action();
    } catch (error) {
      if (error.status !== 401) setToast(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function enter(kind = "search") {
    await run(async () => {
      if (!account) {
        const value = await establishSession("/guest", {});
        setAccount(value.member);
      }
      setState((old) => ({
        ...old,
        mode: kind === "agent" ? "agent" : "classic",
      }));
      navigate(kind === "agent" ? "agent" : "search");
    });
  }
  async function logout() {
    await run(async () => {
      try {
        await api("/logout", {});
      } catch (error) {
        if (error.status !== 401) throw error;
      }
      clear();
      navigate("home");
    });
  }
  function acceptResults(data) {
    setResults(data.offers || []);
    setState((old) => ({
      ...old,
      ...data.search,
      programs: data.programs || [],
      programEntries: data.program_entries || [],
      nearbyUnpriced: data.nearby_unpriced || [],
      resultsHeading: data.results_heading || "",
      programHeading: data.program_heading || "",
      locationSuggestions: data.location_suggestions || [],
      locationUnresolved:
        data.resolved_location === null &&
        !!data.search.location &&
        data.search.location.toLowerCase() !== "national",
      locationNotice: data.location_notice || "",
      unlocatedOfferCount: data.unlocated_offer_count || 0,
      noExamPrice: !!data.no_exam_price,
      searched: true,
      resultsPage: 0,
      dirty: false,
    }));
  }
  async function search(override = {}) {
    if (spatialEnabled && !spatialSnapshot && !override.location) {
      setToast(
        "Waiting for your browser location. Results will appear automatically.",
      );
      return;
    }
    if (
      spatialSnapshot &&
      state.location.trim().toLowerCase() ===
        (spatialSnapshot.queryLocation || "").trim().toLowerCase() &&
      (!override.location || override.location === "Near my location")
    ) {
      setState((old) => ({
        ...old,
        ...override,
        resultsPage: 0,
        dirty: false,
      }));
      return;
    }
    if (spatialEnabled || spatialSnapshot || state.spatialActive) stopSpatial();
    const next = { ...state, ...override };
    if (!next.location.trim()) {
      setToast("Enter your ZIP, city or state to continue.");
      return;
    }
    const seq = ++sequence.current;
    await run(async () => {
      const data = await api("/search", payload(next));
      if (seq === sequence.current) acceptResults(data);
    });
  }
  async function talk(message) {
    if (spatialEnabled || spatialSnapshot || state.spatialActive) stopSpatial();
    const question = predefinedQuestion(message);
    if (!question) {
      setToast(
        "Choose one of the predefined questions. Free-text questions are not supported.",
      );
      return;
    }
    setToast("");
    await run(async () => {
      try {
        const data = await api("/agent", {
          message: question,
          search: payload(state),
          conversation_id: state.conversationId,
        });
        acceptResults(data);
        setState((old) => ({
          ...old,
          messages: [
            ...old.messages,
            { role: "user", text: question },
            { role: "assistant", text: data.reply },
          ],
          conversationId: data.conversation_id || old.conversationId,
          usage: data.usage || old.usage,
        }));
      } catch (error) {
        if (error.status === 429)
          setState((old) => ({
            ...old,
            chatBlocked: true,
            chatLimitReason: error.details.reason,
          }));
        throw error;
      }
    });
  }
  function input(event) {
    const element = event.target,
      id = element.id;
    if (element.dataset.select) {
      const selected = element.checked
        ? [...state.selected, element.dataset.select]
        : state.selected.filter((x) => x !== element.dataset.select);
      if (selected.length > 3) return setToast("Compare up to three options.");
      setState((old) => ({ ...old, selected }));
      return;
    }
    if (id === "dirSearch") {
      setState((old) => ({
        ...old,
        directoryQuery: element.value,
        directoryPage: 0,
      }));
      return;
    }
    if (id?.startsWith("account")) {
      setAuth((old) => ({ ...old, [id]: id === "accountZip" ? element.value.replace(/\D/g, "").slice(0, 5) : element.value }));
      return;
    }
    if (id === "sort") {
      setState((old) => ({ ...old, nearToMe: false }));
      void search({ sort: element.value, nearToMe: false });
      return;
    }
    if (
      [
        "mod",
        "body",
        "contrast",
        "location",
        "type",
        "budget",
        "radius",
      ].includes(id)
    ) {
      if (
        id === "location" &&
        (spatialEnabled || spatialSnapshot || state.spatialActive)
      ) {
        if (spatialSnapshot) {
          setSpatialEnabled(false);
          spatialManager.clear();
        } else stopSpatial();
      }
      let changes = { [id]: element.value };
      if (id === "location") changes.locationExplicit = !!element.value.trim();
      if (id === "budget") {
        if (!/^[0-9]{0,6}$/.test(element.value)) return;
        changes.budget = Number(element.value) || 0;
      }
      if (id === "radius")
        changes = {
          scope: ["state", "city"].includes(element.value)
            ? element.value
            : "radius",
          radius: Number(element.value) || 50,
        };
      setState((old) => ({
        ...old,
        ...changes,
        dirty:
          id === "location"
            ? old.searched || false
            : spatialSnapshot
              ? false
              : old.searched || false,
      }));
      if (id === "location") {
        setLocationsOpen(true);
        setLocationAll(false);
      }
      return;
    }
  }
  async function submit(event) {
    event.preventDefault();
    const target = event.target;
    if (target.id === "searchForm") return search();
    if (target.id === "chatForm") {
      const message = target.querySelector("#message").value;
      target.reset();
      return talk(message);
    }
    if (target.id === "accountForm") {
      const signup = view === "signup";
      setAuthError("");
      if (signup && auth.accountPassword !== auth.accountConfirm)
        return setAuthError("Passwords do not match.");
      setBusy(true);
      try {
        const value = await establishSession(signup ? "/register" : "/login", {
          email: auth.accountEmail,
          password: auth.accountPassword,
          ...(signup
            ? {
                name: auth.accountName,
                phone: auth.accountPhone || "",
                zip_code: auth.accountZip || "",
              }
            : {}),
        });
        setAccount(value.member);
        setAuth({});
        navigate("search");
        if (value.member.zip_code && !pendingBooking) {
          await search({
            ...initialState(),
            location: value.member.zip_code.slice(0, 5),
            sort: "distance",
          });
        }
        setToast(
          signup ? "Account created. You are signed in." : "You are signed in.",
        );
      } catch (error) {
        setAuthError(error.message);
      } finally {
        setBusy(false);
      }
      return;
    }
  }
  function click(event) {
    if (event.target.closest(".near-info-icon")) {
      event.preventDefault();
      setState(old => ({ ...old, nearInfoOpen: !old.nearInfoOpen }));
      return;
    }
    if (state.nearInfoOpen && !event.target.closest(".near-info"))
      setState(old => ({ ...old, nearInfoOpen: false }));
    if (event.target.closest("#nearToMe")) {
      event.preventDefault();
      if (state.nearToMe) {
        setSpatialEnabled(false);
        spatialManager.clear();
        setState(old => ({ ...old, nearToMe: false, nearInfoOpen: false, sort: "distance", resultsPage: 0 }));
      } else {
        const location =
          state.location.trim() && state.location !== "Near my location"
            ? state.location
            : account?.zip_code?.slice(0, 5) || "";
        if (state.locationExplicit && location)
          spatialManager.setLocation(location);
        else spatialManager.setAutomaticLocation(location);
        navigate("search");
        sequence.current++;
        setResults([]);
        setState((old) => ({
          ...old,
          location,
          scope: "state",
          sort: "distance",
          nearToMe: true,
          nearInfoOpen: false,
          noExamPrice: false,
          unlocatedOfferCount: 0,
          mode: "classic",
          programs: [],
          programEntries: [],
          nearbyUnpriced: [],
          locationSuggestions: [],
          locationUnresolved: false,
          resultsHeading: "",
          spatialActive: true,
          spatialLoading: true,
          spatialStatus: "Waiting for browser location permission…",
          searched: true,
          dirty: false,
          selected: [],
          resultsPage: 0,
        }));
        setSpatialEnabled(true);
      }
      return;
    }
    const bookingChoice = event.target.closest("[data-booking-auth]");
    if (bookingChoice) {
      event.preventDefault();
      const choice = bookingChoice.dataset.bookingAuth;
      if (choice === "cancel") close();
      else navigate(choice);
      return;
    }
    const pageButton = event.target.closest("[data-results-page]");
    if (pageButton) {
      event.preventDefault();
      setState((old) => ({
        ...old,
        resultsPage: Number(pageButton.dataset.resultsPage),
      }));
      document
        .getElementById("searchNotice")
        ?.scrollIntoView({ block: "start" });
      return;
    }
    const target = event.target.closest("button,a");
    if (!target) return;
    const id = target.id;
    if (id === "closeModal") return;
    if (id === "brandHome") {
      event.preventDefault();
      navigate("home");
      return;
    }
    if (id === "profile") {
      event.preventDefault();
      return account ? logout() : enter();
    }
    if (id === "accountLogin") {
      event.preventDefault();
      navigate("login");
      return;
    }
    if (id === "directory" || id === "browseDirectory" || id === "leads") {
      event.preventDefault();
      if (catalog.metadata_only || !catalogReady) {
        void run(async () => {
          const value = await api("/catalog");
          setCatalog(value);
          setCatalogReady(true);
          setCatalogError("");
        });
      }
      setState((old) => ({ ...old, directoryQuery: "", directoryPage: 0 }));
      setDialog({ type: "directory" });
      history.pushState(null, "", "#directory");
      return;
    }
    if (id === "history") {
      event.preventDefault();
      void run(async () => {
        const value = await api("/conversations");
        setDialog({ type: "history", items: value.conversations });
      });
      return;
    }
    if (
      id === "welcomeBegin" ||
      id === "welcomeAccount" ||
      id === "accountGuest"
    ) {
      event.preventDefault();
      return enter();
    }
    if (target.dataset.journey) {
      event.preventDefault();
      return enter(target.dataset.journey);
    }
    if (id === "classic" || id === "agent") {
      event.preventDefault();
      setState((old) => ({
        ...old,
        mode: id === "agent" ? "agent" : "classic",
      }));
      navigate(id === "agent" ? "agent" : "search");
      return;
    }
    if (id === "sampleSearch") {
      event.preventDefault();
      return search({
        mod: "",
        body: "",
        contrast: "unknown",
        location: "Cincinnati, OH",
        scope: "city",
        budget: 0,
        type: "all",
        selected: [],
      });
    }
    if (id === "widen" || id === "browseNational") {
      event.preventDefault();
      return search({
        location: "National",
        scope: "state",
        mod: "",
        body: "",
        contrast: "unknown",
        budget: 0,
        type: "all",
        selected: [],
      });
    }
    if (id === "locationToggle") {
      event.preventDefault();
      setLocationsOpen((old) => !old);
      setLocationAll(true);
      return;
    }
    if (target.dataset.locationChoice) {
      event.preventDefault();
      if (spatialSnapshot) {
        setSpatialEnabled(false);
        spatialManager.clear();
      } else if (spatialEnabled || state.spatialActive) stopSpatial();
      setState((old) => ({
        ...old,
        location: target.dataset.locationChoice,
        locationExplicit: true,
        scope: "state",
        dirty: old.searched,
      }));
      setLocationsOpen(false);
      return;
    }
    if (target.dataset.city) {
      event.preventDefault();
      return search({ location: target.dataset.city });
    }
    if (id === "editLocation") {
      event.preventDefault();
      document.getElementById("location")?.focus();
      document.getElementById("location")?.scrollIntoView({ block: "center" });
      return;
    }
    if (target.dataset.detail) {
      event.preventDefault();
      navigate("facility/" + encodeURIComponent(target.dataset.detail));
      return;
    }
    if (id === "back") {
      event.preventDefault();
      navigate(state.mode === "agent" ? "agent" : "search");
      return;
    }
    if (id === "compare" || target.dataset.compareDirectory) {
      event.preventDefault();
      setDialog({ type: "compare" });
      history.pushState(null, "", "#compare");
      return;
    }
    if (id === "clearCompare") {
      event.preventDefault();
      setState((old) => ({ ...old, selected: [] }));
      return;
    }
    if (id === "request") {
      event.preventDefault();
      const offer = allOffers.find(
        (x) => x.id === decodeURIComponent(view.slice(9)),
      );
      if (offer) setDialog({ type: "quote", offer });
      return;
    }
    if (target.dataset.appointment) {
      event.preventDefault();
      const entry = [
        ...catalog.entries,
        ...allOffers.map((offer) => offer.entry),
      ].find((x) => x.booking_id === target.dataset.appointment);
      if (entry) {
        const bookingDialog = {
          type: "booking",
          entry,
          offer: allOffers.find(
            (x) => x.id === target.dataset.bookingOffer && !x.directory_only,
          ),
        };
        if (!account || account.tenant === "guest") {
          setPendingBooking(bookingDialog);
          setDialog({ type: "booking-login" });
        } else {
          setDialog(bookingDialog);
        }
      }
      return;
    }
    if (target.dataset.mapIndex) {
      event.preventDefault();
      const offer = allOffers.find(
        (x) => x.id === decodeURIComponent(view.slice(9)),
      );
      setMap(offer?.entry.locations?.[Number(target.dataset.mapIndex)]);
      return;
    }
    if (id === "newGuestChat") {
      event.preventDefault();
      setToast("");
      setState((old) => ({
        ...old,
        conversationId: null,
        messages: [],
        chatBlocked: false,
      }));
      return;
    }
    if (target.dataset.starter) {
      event.preventDefault();
      return talk(target.dataset.starter);
    }
    if (id === "voice") {
      event.preventDefault();
      setDialog({ type: "voice" });
      return;
    }
    if (id === "useTranscript") {
      event.preventDefault();
      const text = document.getElementById("transcript").value;
      setDialog(null);
      return talk(text);
    }
    if (id === "dirPrev" || id === "dirNext") {
      event.preventDefault();
      setState((old) => ({
        ...old,
        directoryPage: Math.max(
          0,
          old.directoryPage + (id === "dirPrev" ? -1 : 1),
        ),
      }));
      return;
    }
    if (target.dataset.resume) {
      event.preventDefault();
      const saved = dialog.items.find((x) => x.id === target.dataset.resume);
      setState((old) => ({
        ...old,
        ...saved.search,
        messages: saved.messages || [],
        private: false,
      }));
      close();
      navigate(saved.messages?.length ? "agent" : "search");
      void search(saved.search);
      return;
    }
    if (target.dataset.delete) {
      event.preventDefault();
      void run(async () => {
        await api(
          "/conversations/" + target.dataset.delete,
          undefined,
          "DELETE",
        );
        const value = await api("/conversations");
        setDialog({ type: "history", items: value.conversations });
      });
      return;
    }
  }
  const matches = catalog.entries.filter((entry) =>
    [entry.name, entry.area, entry.states]
      .join(" ")
      .toLowerCase()
      .includes(state.directoryQuery.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(matches.length / 10)),
    directoryPage = Math.min(state.directoryPage, pages - 1);
  const choices = [...new Set(catalog.locations || [])].filter(
    (label) =>
      locationAll ||
      !state.location.trim() ||
      label.toLowerCase().includes(state.location.toLowerCase()),
  );
  function replace(node, options) {
    const id = node.attribs.id;
    if (id === "locationPicker")
      return (
        <div
          {...attributesToProps(node.attribs)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setLocationsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setLocationsOpen(false);
              document.getElementById("location")?.focus();
            } else if (
              event.key === "ArrowDown" &&
              event.target.id === "location"
            ) {
              event.preventDefault();
              setLocationsOpen(true);
              setLocationAll(true);
              requestAnimationFrame(() =>
                document.querySelector("#cityChoices button")?.focus(),
              );
            }
          }}
        >
          {domToReact(node.children, options)}
        </div>
      );
    if (id === "publicCoverage" && summary)
      return (
        <section className="panel" id="publicCoverage" aria-live="polite">
          <p>
            <strong>{summary.listing_count.toLocaleString()}</strong> imaging
            facilities and programs listed so far.
          </p>
        </section>
      );
    if (id === "searchNotice")
      return (
        <div id="searchNotice" role="status">
          {state.dirty
            ? "Search changed—click Find options to update results. Displayed results belong to your previous search."
            : /^Distances are approximate straight-line miles\b/.test(
                  state.locationNotice || "",
                ) &&
                !state.budget &&
                !state.body.trim() &&
                state.contrast === "unknown"
              ? ""
              : state.locationNotice
                  ?.replace(
                    /^Showing indexed imaging centers across the selected state\. Optional filters apply\.\s*/,
                    "",
                  )
                  ?.replace(
                    /^Showing indexed imaging centers across all states\. Exam and price filters still apply; confirm availability and prices directly\.\s*/,
                    "",
                  )
                  ?.replace(
                    /Directory-only centers need matching exam or contrast information to appear; unverified matches are excluded\.\s*/g,
                    "",
                  )}
        </div>
      );
    if (id === "locationSuggestions")
      return (
        <div id="locationSuggestions" role="status" aria-live="polite">
          {state.locationSuggestions?.length > 0 && (
            <>
              <p className="small">
                <strong>Which location did you mean?</strong> Choose a city and
                state to find the nearest offers.
              </p>
              {state.locationSuggestions.map((label) => (
                <button type="button" key={label} data-city={label}>
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      );
    if (id === "cityChoices")
      return (
        <div
          id="cityChoices"
          hidden={!locationsOpen}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            maxHeight: 260,
            overflowY: "auto",
            background: "white",
            border: "1px solid #b9cbd4",
            borderRadius: 8,
            padding: 6,
            boxShadow: "0 4px 12px #0002",
          }}
        >
          {choices.length ? (
            choices.map((label) => (
              <button
                type="button"
                data-location-choice={label}
                key={label}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  margin: 0,
                  border: 0,
                }}
              >
                {label}
              </button>
            ))
          ) : (
            <p className="small">
              No suggestions. You can still search by city or ZIP.
            </p>
          )}
        </div>
      );
    if (id === "locationToggle")
      return (
        <button
          type="button"
          id="locationToggle"
          aria-label="Show all location options"
          aria-expanded={locationsOpen}
          aria-controls="cityChoices"
        >
          ▼
        </button>
      );
    if (id === "dirRows")
      return (
        <div id="dirRows">
          <OriginalHTML
            html={ui.directoryRows(
              matches.slice(directoryPage * 10, directoryPage * 10 + 10),
            )}
            onInput={input}
          />
        </div>
      );
    if (id === "dirCount")
      return (
        <p id="dirCount" role="status">
          {matches.length
            ? `Showing ${directoryPage * 10 + 1}–${Math.min(directoryPage * 10 + 10, matches.length)} of ${matches.length} matches`
            : "No directory entries match."}
        </p>
      );
    if (id === "dirPrev" || id === "dirNext")
      return (
        <button
          type="button"
          id={id}
          disabled={
            id === "dirPrev" ? directoryPage === 0 : directoryPage >= pages - 1
          }
        >
          {id === "dirPrev" ? "Previous" : "Next"}
        </button>
      );
    if (id === "accountError")
      return (
        <p id="accountError" role="alert" tabIndex={-1}>
          {authError}
        </p>
      );
    if (id?.startsWith("account") && node.name === "input") {
      const props = attributesToProps(node.attribs);
      return <input {...props} value={auth[id] || ""} onChange={input} />;
    }
    if (id === "dirSearch")
      return (
        <input
          id="dirSearch"
          placeholder="e.g. Tellica, OH, Vermont"
          value={state.directoryQuery}
          onChange={input}
        />
      );
    if (id === "facilityMapCanvas" && map) {
      const bbox = [
        map.longitude - 0.04,
        map.latitude - 0.025,
        map.longitude + 0.04,
        map.latitude + 0.025,
      ];
      return (
        <div id="facilityMapCanvas" aria-live="polite">
          <iframe
            title={`Map reference for ${map.city}, ${map.state}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            src={
              "https://www.openstreetmap.org/export/embed.html?bbox=" +
              encodeURIComponent(bbox.join(",")) +
              "&layer=mapnik&marker=" +
              encodeURIComponent(map.latitude + "," + map.longitude)
            }
          />
        </div>
      );
    }
    if (
      node.name === "button" &&
      (busy ||
        (state.dirty && ("data-detail" in node.attribs || id === "compare")))
    )
      return (
        <button {...attributesToProps(node.attribs)} disabled>
          {domToReact(node.children, options)}
        </button>
      );
    return undefined;
  }
  let markup;
  if (view === "login" || view === "signup")
    markup = ui.auth(view === "signup");
  else if (view.startsWith("facility/") && account)
    markup = ui.detail(view.slice(9));
  else if ((view === "search" || view === "agent") && account)
    markup = ui.search();
  else markup = ui.home();
  let dialogHTML = "";
  if (dialog?.type === "booking-login")
    dialogHTML =
      '<h2>Log in to book an appointment</h2><p>You cannot book an appointment without a user account. Would you like to create an account and continue?</p><p>Your selected center will be kept so you can continue after signing in.</p><div class="actions"><button type="button" class="primary" data-booking-auth="signup">Create account and continue</button><button type="button" data-booking-auth="login">Log in</button><button type="button" data-booking-auth="cancel">Cancel</button></div>';
  if (dialog?.type === "directory") dialogHTML = ui.directory();
  if (dialog?.type === "compare") dialogHTML = ui.compare();
  if (dialog?.type === "quote") dialogHTML = ui.request(dialog.offer);
  if (dialog?.type === "voice") dialogHTML = ui.voice();
  if (dialog?.type === "history")
    dialogHTML =
      "<h2>Saved conversations and searches</h2>" +
      dialog.items
        .map(
          (item) =>
            `<div class="lead"><strong>${ui.esc(item.title)}</strong><p class="small">Expires ${new Date(item.expires).toLocaleDateString()}</p><button data-resume="${ui.esc(item.id)}">Continue</button> <button data-delete="${ui.esc(item.id)}">Delete</button></div>`,
        )
        .join("");
  dialogHTML = dialogHTML.replace("<h2>", '<h2 id="dialogTitle">');
  const linkedBooking = /^(booking|request|clinic)\//.test(view);
  return (
    <div onClick={click} onSubmit={submit} ref={form} className={linkedBooking ? "booking-link-layout" : undefined}>
      <header>
        <a
          className="brand"
          id="brandHome"
          href="/"
          aria-label="MySelfPay by One Smarter, Inc. homepage"
        >
          <img
            className="brand-logo"
            src="/logo.png"
            alt=""
            width="44"
            height="44"
          />
          <span className="brand-text">
            <span className="brand-name">
              MySelf<span>Pay</span>
            </span>
            <span className="brand-by">by One Smarter, Inc.</span>
          </span>
        </a>
        <nav>
          {account && account.tenant !== "guest" && <a className="button" href="#dashboard" aria-current={view === "dashboard" ? "page" : undefined}>Dashboard</a>}
          <a href="/for-imaging-centers">For imaging centers</a>
          <button id="history" hidden>
            Saved conversations
          </button>
          <button id="directory" hidden={!account}>
            Directory
          </button>
          <button
            id="accountLogin"
            hidden={!!account && account.tenant !== "guest"}
          >
            Log in
          </button>
          <button id="profile" disabled={busy || boot}
            aria-label={account?.tenant === "guest" ? "Sign out of guest session" : undefined}
            title={account?.tenant === "guest" ? "Sign out of guest session" : undefined}
            className={account?.tenant === "guest" ? "guest-signout" : undefined}>
            {account?.tenant === "guest" ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg> : account ? "Sign out" : "Sign in as guest"}
          </button>
        </nav>
      </header>
      <main className={"shell" + (view === "search" && state.searched ? " results-shell" : "")} id="app">
        {view === "dashboard" ? <UserDashboard key={account?.id || "guest"} account={account} /> : linkedBooking ? (
          <OriginalBookingLink route={view} ui={ui} />
        ) : (
          <OriginalHTML html={markup} onInput={input} replace={replace} />
        )}
      </main>
      <footer className="site-footer">
        <span className="footer-brand">
          <img src="/logo.png" alt="" width="28" height="28" />
          MySelfPay by One Smarter, Inc. · Dayton, Ohio
        </span>
        <span className="footer-links">
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy-terms">Terms &amp; Privacy</a>
        </span>
      </footer>
      {dialog && (
        <Dialog onClose={close} booking={dialog.type === "booking"}>
          {dialog.type === "booking" ? (
            <OriginalBooking
              entry={dialog.entry}
              account={account}
              offer={dialog.offer}
              search={state}
              ui={ui}
              onClose={close}
              notify={setToast}
            />
          ) : (
            <OriginalHTML html={dialogHTML} onInput={input} replace={replace} />
          )}
        </Dialog>
      )}
      <div
        id="toast"
        className={"toast" + (toast ? "" : " hidden")}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}
