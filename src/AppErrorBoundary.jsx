import { Component } from "react";
export default class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        style={{
          maxWidth: 480,
          margin: "60px auto",
          padding: 24,
          fontFamily: "system-ui",
          lineHeight: 1.6,
        }}
      >
        <img src="/logo.png" width="48" height="48" alt="" />
        <h1>Let’s reopen MySelfPay</h1>
        <p>
          This screen could not be displayed. Reload to continue. If you just
          sent a request, check its status before sending it again.
        </p>
        <button type="button" onClick={() => location.reload()}>
          Reload MySelfPay
        </button>
      </main>
    );
  }
}
