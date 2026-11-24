import { Rescue } from "./CompletePages.jsx";
import { useEffect, useState } from "react";
import { requestQuery } from "./api.js";
import { useResource } from "./useResource.js";
import { Alert, Pagination, Status, dateTime } from "./components.jsx";

export default function Requests({ center, navigate, initialStatus = "" }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus),
    [page, setPage] = useState(1),
    [size, setSize] = useState(5),
    [order, setOrder] = useState("-created_at"),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, loading, error } = useResource(
    `/centers/${center.id}/requests` +
      requestQuery({ search: query, status, page, size, order }),
    retry,
  );
  const reset = () => {
    setSearch("");
    setQuery("");
    setStatus("");
    setPage(1);
  };
  return (
    <>
      <div className="page-heading requests-heading">
        <div><h1>
          Incoming requests
        </h1>
        <p>
          Review requests and confirm an exact appointment. Patient payments are
          handled by the center.
        </p></div>
      </div>
      {center.role === "staff" && <div id="self-pay-link-form">
        <Rescue center={center} />
      </div>}
      <section className="panel data-panel" aria-label="Booking requests">
        <div className="filters">
          <label>
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Reference, patient or exam"
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Needs scheduling</option>
              <option value="confirmed">Confirmed</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label>
            Sort by
            <select
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="-created_at">Newest first</option>
              <option value="created_at">Oldest first</option>
              <option value="reference">Reference</option>
              <option value="patient_name">Patient name</option>
            </select>
          </label>
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
        {loading ? (
          <div className="table-state" role="status">
            Loading requests…
          </div>
        ) : error ? (
          <div className="table-state">
            <Alert error>{error}</Alert>
            <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
          </div>
        ) : !data?.results.length ? (
          <div className="table-state">
            <h2>No matching requests</h2>
            <p>Try another search or clear your filters.</p>
            <button onClick={reset}>Clear filters</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>{status === "confirmed" ? "Appointment" : "Exam"}</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((row) => (
                <tr key={row.id}>
                  <td data-label="Request">
                    <strong>{row.reference}</strong>
                    <span className="cell-note">{row.patient_name}</span>
                  </td>
                  <td data-label={status === "confirmed" ? "Appointment" : "Exam"}>
                    {status === "confirmed" && row.slot
                      ? dateTime(row.slot.starts_at, center.timezone)
                      : row.exam}
                  </td>
                  <td data-label="Status">
                    <Status value={row.status} />
                  </td>
                  <td data-label="Action">
                    <button onClick={() => navigate("request/" + row.id)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination
            count={data.count}
            page={page}
            size={size}
            onPage={setPage}
          />
        )}
      </section>
    </>
  );
}
