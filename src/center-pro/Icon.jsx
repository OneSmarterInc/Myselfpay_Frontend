const paths = {
  signout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5M21 12H9"],
  switch: ["M4 7h16m-4-4 4 4-4 4", "M20 17H4m4-4-4 4 4 4"],
  back: ["m14 6-6 6 6 6"],
  next: ["m10 6 6 6-6 6"],
  close: ["m6 6 12 12M6 18 18 6"],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"],
  print: ["M6 9V3h12v6M6 17H3V9h18v8h-3", "M6 14h12v7H6zM17 11h1"],
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z", "M7 3v6h10V3M7 21v-8h10v8"],
  check: ["m5 12 4 4L19 6"],
  link: ["M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2", "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"],
};
export default function Icon({ name }) {
  return <svg className="action-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {(paths[name] || []).map(d => <path key={d} d={d} />)}
  </svg>;
}
