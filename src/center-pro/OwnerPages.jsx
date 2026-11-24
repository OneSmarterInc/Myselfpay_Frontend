import CHRIndex from "../CHRIndex.jsx";
import {directoryOffer} from "../directory-offer.js";
import Icon from "./Icon.jsx";

import { comparePrice } from "./priceComparison.js";

import { useEffect, useState } from "react";

import { api } from "./api.js";

import { useResource } from "./useResource.js";

import { Alert, Pagination, money, dateTime } from "./components.jsx";



const activityLabels = {

  not_contacted: "Not contacted",

  visited: "Visit completed",

  follow_up: "Follow-up planned",

  rate_sheet_shared: "Rate sheet shared externally",

};



export default function OwnerPages({ center, route, navigate }) {

  if (center.role !== "owner")

    return (

      <Alert error>This section is available to center owners only.</Alert>

    );

  const [section, id] = route.split("/");

  if (section === "pricing")

    return id ? (

      <PriceDetails center={center} id={id} navigate={navigate} />

    ) : (

      <><CenterCHRComparison center={center} /><DirectoryPrices center={center} /><OwnerList center={center} navigate={navigate} type="pricing" /></>

    );

  return id ? (

    <OutreachDetails center={center} id={id} navigate={navigate} />

  ) : (

    <OwnerList center={center} navigate={navigate} type="outreach" />

  );

}



function OwnerList({ center, navigate, type }) {

  const pricing = type === "pricing";

  const [search, setSearch] = useState(""),

    [query, setQuery] = useState(""),

    [page, setPage] = useState(1),

    [size, setSize] = useState(5),

    [status, setStatus] = useState(""),

    [retry, setRetry] = useState(0);

  useEffect(() => {

    const timer = setTimeout(() => {

      setQuery(search);

      setPage(1);

    }, 250);

    return () => clearTimeout(timer);

  }, [search]);

  const params = new URLSearchParams({

    search: query,

    page: String(page),

    page_size: String(size),

    status,

  });

  const resource = useResource(

    `/centers/${center.id}/${pricing ? "offers" : "outreach"}?${params}`,

    retry,

  );

  return (

    <>

      <div className="page-heading">

        <h1>{pricing ? "Manage current center offers" : "Referral outreach"}</h1>

        <p>

          {pricing

            ? "Review current prices and comparison sources before changing an offer."

            : "Manage nearby referral targets and record your outreach activity."}

        </p>

      </div>

      <section className="panel data-panel owner-table">

        <div className={"filters owner-filters" + (pricing ? " pricing-filters" : "")}>

          <label>

            Search

            <input

              type="search"

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder={pricing ? "Search by exam" : "Organization or type"}

            />

          </label>

          {!pricing && (

            <label>

              Activity status

              <select

                value={status}

                onChange={(e) => {

                  setStatus(e.target.value);

                  setPage(1);

                }}

              >

                <option value="">All statuses</option>

                {Object.entries(activityLabels).map(([value, label]) => (

                  <option key={value} value={value}>

                    {label}

                  </option>

                ))}

              </select>

            </label>

          )}

          <label>

            Rows per page

            <select

              value={size}

              onChange={(e) => {

                setSize(Number(e.target.value));

                setPage(1);

              }}

            >

              <option>5</option>

              <option>10</option>

              <option>20</option>

            </select>

          </label>

        </div>

        {resource.loading ? (

          <div className="table-state" role="status">

            Loading {pricing ? "offers" : "targets"}â€¦

          </div>

        ) : resource.error ? (

          <div className="table-state">

            <Alert error>{resource.error}</Alert>

            <button onClick={() => setRetry((n) => n + 1)}>Retry</button>

          </div>

        ) : !resource.data?.results.length ? (

          <div className="table-state">

            <h2>No matching {pricing ? "offers" : "targets"}</h2>

            <p>Try another search or clear your filters.</p>

            <button

              onClick={() => {

                setSearch("");

                setQuery("");

                setStatus("");

                setPage(1);

              }}

            >

              Clear filters

            </button>

          </div>

        ) : (

          <table>

            <thead>

              <tr>

                <th>{pricing ? "Exam" : "Organization"}</th>

                <th>{pricing ? "Current price" : "Distance"}</th>

                <th>{pricing ? "Comparison" : "Activity"}</th>

                <th>Action</th>

              </tr>

            </thead>

            <tbody>

              {resource.data.results.map((row) => (

                <tr key={row.id}>

                  <td data-label={pricing ? "Exam" : "Organization"}>

                    <strong>{pricing ? row.exam : row.name}</strong>

                    {!pricing && (

                      <span className="cell-note">{row.category}</span>

                    )}

                  </td>

                  <td data-label={pricing ? "Current price" : "Distance"}>

                    {pricing ? <PriceIndicator price={row.price} benchmark={row.benchmark_price} /> : `${row.distance_miles} mi`}

                  </td>

                  <td data-label={pricing ? "Comparison" : "Activity"}>

                    {pricing

                      ? row.benchmark_price

                        ? money(row.benchmark_price)

                        : "Not available"

                      : <span className={"badge " + (row.status === "follow_up" ? "pending" : row.status === "not_contacted" ? "neutral" : "success")}>{activityLabels[row.status]}</span>}

                    {pricing && (

                      <span className="cell-note">

                        {row.benchmark_source || "Source unavailable"}

                      </span>

                    )}

                  </td>

                  <td data-label="Action">

                    <button onClick={() => navigate(`${type}/${row.id}`)}>

                      {pricing ? "Review price" : "Open target"}

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

        {resource.data && (

          <Pagination

            count={resource.data.count}

            page={page}

            size={size}

            onPage={setPage}

          />

        )}

      </section>

      <p className="source-note">

        {pricing

          ? "Published directory prices are linked here. Changes are submitted for administrator review."

          : "Saved outreach targets. New target sourcing is not connected."}

      </p>

    </>

  );

}



function PriceDetails({ center, id, navigate }) {

  const [refresh, setRefresh] = useState(0),

    [price, setPrice] = useState(""),

    [reason, setReason] = useState(""),

    [review, setReview] = useState(false),

    [busy, setBusy] = useState(false),

    [message, setMessage] = useState(""),

    [error, setError] = useState(""),

    [conflict, setConflict] = useState(false);

  const offer = useResource(`/centers/${center.id}/offers/${id}`, refresh);

  async function save() {

    if (busy || !offer.data) return;

    setBusy(true);

    setError("");

    try {

      await api(`/centers/${center.id}/offers/${id}`, {

        method: "POST",

        body: { price, reason, expected_version: offer.data.version },

      });

      setReview(false);

      setPrice("");

      setReason("");

      setMessage(

        "Price saved and submitted for administrator review. Existing bookings and issued links keep their original price.",

      );

      setRefresh((n) => n + 1);

    } catch (e) {

      setError(e.message);

      if (e.status === 409) {

        setConflict(true);

        setReview(false);

      }

    } finally {

      setBusy(false);

    }

  }

  return (

    <>

      <button className="text-button" onClick={() => navigate("pricing")}>

        <Icon name="back" /> Back to pricing

      </button>

      <div className="page-heading">

        <h1>Review price change</h1>

        <p>

          Changes apply to future offers. Previous bookings keep their original

          prices.

        </p>

      </div>

      {message && <Alert>{message}</Alert>}

      {error && <Alert error>{error}</Alert>}

      {offer.loading ? (

        <p role="status">Loading offerâ€¦</p>

      ) : offer.error ? (

        <Alert error>{offer.error}</Alert>

      ) : (

        offer.data && (

          <>

            <div className="detail-grid">

              <section className="panel">

                <h2>{offer.data.exam}</h2>

                <dl>

                  <dt>Current price</dt>

                  <dd><PriceIndicator price={offer.data.price} benchmark={offer.data.benchmark_price} /></dd>

                  <dt>Comparison price</dt>

                  <dd>

                    {offer.data.benchmark_price

                      ? money(offer.data.benchmark_price)

                      : "Not available"}

                  </dd>

                  <dt>Source</dt>

                  <dd>{offer.data.benchmark_source || "Unavailable"}</dd>

                  <dt>Source date</dt>

                  <dd>{offer.data.benchmark_checked_at || "Not available"}</dd>

                  <dt>Last updated</dt>

                  <dd>{dateTime(offer.data.updated_at, center.timezone)}</dd>

                </dl>

              </section>

              <section className="panel">

                <h2>{review ? "Confirm this change" : "Set a new price"}</h2>

                {conflict ? (

                  <>

                    <p>

                      The offer changed while you were reviewing it. Reload

                      before making another change.

                    </p>

                    <button

                      onClick={() => {

                        setConflict(false);

                        setPrice("");

                        setReason("");

                        setError("");

                        setRefresh((n) => n + 1);

                      }}

                    >

                      Reload latest offer

                    </button>

                  </>

                ) : review ? (

                  <>

                    <dl>

                      <dt>Previous price</dt>

                      <dd><PriceIndicator price={offer.data.price} benchmark={offer.data.benchmark_price} /></dd>

                      <dt>New price</dt>

                      <dd><PriceIndicator price={price} benchmark={offer.data.benchmark_price} /></dd>

                      <dt>Reason</dt>

                      <dd>{reason}</dd>

                    </dl>

                    <div className="actions">

                      <button

                        className="primary"

                        disabled={busy}

                        onClick={save}

                      >

                        {busy ? "Savingâ€¦" : "Confirm price change"}

                      </button>

                      <button disabled={busy} onClick={() => setReview(false)}>

                        Edit change

                      </button>

                    </div>

                  </>

                ) : (

                  <form

                    onSubmit={(e) => {

                      e.preventDefault();

                      setMessage("");

                      setError("");

                      if (Number(price) === Number(offer.data.price)) {

                        setError("Enter a different price.");

                        return;

                      }

                      setReview(true);

                    }}

                  >

                    <label className="field">

                      New price (USD)

                      <input

                        type="number"

                        min="0.01"

                        max="99999999.99"

                        step="0.01"

                        required

                        value={price}

                        onChange={(e) => setPrice(e.target.value)}

                      />

                    </label>

                    <label className="field">

                      Reason for change

                      <textarea

                        required

                        maxLength={500}

                        value={reason}

                        onChange={(e) => setReason(e.target.value)}

                        placeholder="Explain why this price is changing"

                      />

                    </label>

                    <button className="primary">Review change</button>

                  </form>

                )}

              </section>

            </div>

            <History

              center={center}

              path={`offers/${id}/history`}

              refresh={refresh}

              pricing

            />

          </>

        )

      )}

    </>

  );

}



function OutreachDetails({ center, id, navigate }) {

  const [refresh, setRefresh] = useState(0),

    [kind, setKind] = useState("visited"),

    [note, setNote] = useState(""),

    [busy, setBusy] = useState(false),

    [error, setError] = useState(""),

    [saved, setSaved] = useState(false);

  const target = useResource(`/centers/${center.id}/outreach/${id}`, refresh);

  async function save(e) {

    e.preventDefault();

    if (busy) return;

    setBusy(true);

    setError("");

    setSaved(false);

    try {

      await api(`/centers/${center.id}/outreach/${id}/activities`, {

        method: "POST",

        body: { kind, note },

      });

      setNote("");

      setSaved(true);

      setRefresh((n) => n + 1);

    } catch (e) {

      setError(e.message);

    } finally {

      setBusy(false);

    }

  }

  return (

    <>

      <button className="text-button" onClick={() => navigate("outreach")}>

        <Icon name="back" /> Back to outreach

      </button>

      <div className="page-heading">

        <h1>Outreach activity</h1>

        <p>

          Record a visit, follow-up, or rate sheet share.

        </p>

      </div>

      {saved && <Alert>Activity saved.</Alert>}

      {error && <Alert error>{error}</Alert>}

      {target.loading ? (

        <p role="status">Loading targetâ€¦</p>

      ) : target.error ? (

        <Alert error>{target.error}</Alert>

      ) : (

        target.data && (

          <>

            <div className="detail-grid">

              <section className="panel">

                <h2>{target.data.name}</h2>

                <dl>

                  <dt>Organization type</dt>

                  <dd>{target.data.category}</dd>

                  <dt>Distance</dt>

                  <dd>{target.data.distance_miles} miles</dd>

                  <dt>Last activity</dt>

                  <dd>{activityLabels[target.data.status]}</dd>

                </dl>

              </section>

              <section className="panel">

                <h2>Record an activity</h2>

                <form onSubmit={save}>

                  <label className="field">

                    Activity

                    <select

                      value={kind}

                      onChange={(e) => setKind(e.target.value)}

                    >

                      {Object.entries(activityLabels)

                        .filter(([key]) => key !== "not_contacted")

                        .map(([key, label]) => (

                          <option key={key} value={key}>

                            {label}

                          </option>

                        ))}

                    </select>

                  </label>

                  <label className="field">

                    Notes

                    <textarea

                      required

                      maxLength={2000}

                      value={note}

                      onChange={(e) => setNote(e.target.value)}

                      placeholder="Record the outcome and any next steps"

                    />

                  </label>

                  <button className="primary" disabled={busy}>

                    {busy ? "Savingâ€¦" : "Save activity"}

                  </button>

                </form>

              </section>

            </div>

            <History

              center={center}

              path={`outreach/${id}/activities`}

              refresh={refresh}

            />

          </>

        )

      )}

    </>

  );

}



function History({ center, path, refresh, pricing = false }) {

  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [refresh]);

  const { data, error, loading } = useResource(

    `/centers/${center.id}/${path}?page=${page}`,

    refresh,

  );

  return (

    <section className="panel data-panel history-panel">

      <h2>{pricing ? "Price history" : "Activity history"}</h2>

      {loading ? (

        <div className="table-state" role="status">

          Loading historyâ€¦

        </div>

      ) : error ? (

        <Alert error>{error}</Alert>

      ) : !data?.count ? (

        <div className="table-state">No changes recorded yet.</div>

      ) : (

        <>

          <table>

            <thead>

              <tr>

                <th>When / who</th>

                <th>{pricing ? "Change" : "Activity"}</th>

                <th>{pricing ? "Reason" : "Notes"}</th>

              </tr>

            </thead>

            <tbody>

              {data.results.map((row) => (

                <tr key={row.id}>

                  <td data-label="When / who">

                    {dateTime(row.created_at, center.timezone)}

                    <span className="cell-note">{row.actor}</span>

                  </td>

                  <td data-label={pricing ? "Change" : "Activity"}>

                    {pricing

                      ? `${money(row.old_price)} â†’ ${money(row.new_price)}`

                      : activityLabels[row.kind]}

                  </td>

                  <td data-label={pricing ? "Reason" : "Notes"}>

                    <details className="record-note">

                      <summary>Read {pricing ? "reason" : "note"}</summary>

                      <p>{pricing ? row.reason : row.note}</p>

                    </details>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          <Pagination

            count={data.count}

            page={page}

            size={5}

            onPage={setPage}

          />

        </>

      )}

    </section>

  );

}



function PriceIndicator({ price, benchmark }) {

  const comparison = comparePrice(price, benchmark);

  return <div className={"price-indicator price-" + (comparison?.tone || "unknown")}>

    <strong>{money(price)}</strong>

    <span className="price-comparison-label">{!comparison ? "No comparison available" : comparison.tone === "equal" ? "Matches comparison" : `${money(comparison.difference)} ${comparison.tone === "high" ? "above" : "below"} comparison`}</span>

  </div>;

}





function DirectoryPrices({ center }) {

  const [search,setSearch] = useState("");

  const [query,setQuery] = useState("");

  const [page,setPage] = useState(1);

  const [size,setSize] = useState(10);

  const [retry,setRetry] = useState(0);

  useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(1)},250);return ()=>clearTimeout(timer)},[search]);

  const resource=useResource(`/centers/${center.id}/directory-prices?${new URLSearchParams({search:query,page:String(page),page_size:String(size)})}`,retry);

  const own=resource.data?.current_center;

  function priceText(row,modality) {

    const offers=row.offers.filter(o=>o.exam.toUpperCase()===modality && o.price!==null);

    return offers.length ? offers.map(o=>`${o.scope || modality}${o.contrast==='unknown'?'':` (${o.contrast} contrast)`}: ${o.type==='starting'?'From ':''}${money(o.price)}`).join('; ') : row[modality.toLowerCase()];

  }

  return <>

    <div className="page-heading"><h1>Center pricing and comparisons</h1><p>Review your center's saved prices alongside public directory pricing for centers with available prices.</p></div>

    {own && <section className="panel directory-current-prices"><h2>Current center: {own.name}</h2><div className="directory-price-summary"><div><strong>MRI</strong><p>{priceText(own,'MRI')}</p></div><div><strong>CT</strong><p>{priceText(own,'CT')}</p></div><div><strong>Other imaging</strong><p>{own.other}</p></div></div></section>}

    <section className="panel data-panel directory-pricing-panel">

      <div className="filters pricing-filters"><label>Search priced centers<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Center, location or exam" /></label><label>Rows per page<select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option>5</option><option>10</option><option>20</option></select></label></div>

      {resource.loading ? <p className="table-state" role="status">Loading directory prices...</p> : resource.error ? <div className="table-state"><Alert error>{resource.error}</Alert><button onClick={()=>setRetry(n=>n+1)}>Retry</button></div> : !resource.data?.results.length ? <p className="table-state">No centers match your search.</p> : <table><thead><tr><th>Center</th><th>MRI</th><th>CT</th><th>Other imaging</th><th>Compared with your center</th></tr></thead><tbody>{resource.data.results.map(row=><tr key={row.id}><td data-label="Center"><strong>{row.name}</strong>{row.current && <span className="badge neutral">Current center</span>}<span className="cell-note">{row.location}</span></td><td data-label="MRI">{priceText(row,'MRI')}</td><td data-label="CT">{priceText(row,'CT')}</td><td data-label="Other imaging">{row.other}</td><td data-label="Comparison">{row.current?'Your saved prices':row.comparisons.length?row.comparisons.map((c,i)=><p key={i}>{c.exam} {c.contrast}: {c.difference===0?'Same price':`${money(Math.abs(c.difference))} ${c.difference>0?'higher':'lower'}`}</p>):'No matching published numeric prices'}</td></tr>)}</tbody></table>}

      {resource.data && <Pagination count={resource.data.count} page={page} size={size} onPage={setPage} />}

    </section><p className="source-note">Only centers with a numeric imaging price are listed. Comparisons require the same exam, scope, contrast and price type; unavailable prices are never treated as zero.</p>

  </>;

}



function CenterCHRComparison({center}) {
 const [retry,setRetry]=useState(0);
 const resource=useResource(`/centers/${center.id}/chr-offer`,retry);
 if(resource.loading)return <p role="status">Loading center CHR index...</p>;
 if(resource.error)return <section className="panel"><Alert error>{resource.error}</Alert><button onClick={()=>setRetry(n=>n+1)}>Retry CHR index</button></section>;
 if(!resource.data)return null;
 const {entry,offer}=resource.data;
 const selected=offer?{...offer,entry}:directoryOffer(entry);
 return <section className="center-chr-comparison"><h1>CHR index</h1><CHRIndex key={center.id} offer={selected} comparisonAPI={api} comparisonPath={`/centers/${center.id}/chr-index`} /></section>;
}
