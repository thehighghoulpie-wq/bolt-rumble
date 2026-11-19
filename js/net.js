// Online versus over WebRTC (PeerJS). The host runs the battle; the guest sends choices.
const PREFIX = "boltrumble-v1-";

export function makeCode() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export class Link {
  constructor(onMessage, onStatus) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.peer = null;
    this.conn = null;
    this.isHost = false;
  }

  _wire(conn) {
    this.conn = conn;
    conn.on("open", () => this.onStatus("connected"));
    conn.on("data", (d) => this.onMessage(d));
    conn.on("close", () => this.onStatus("closed"));
    conn.on("error", (e) => this.onStatus("error", String(e)));
  }

  host(code) {
    this.isHost = true;
    this.peer = new window.Peer(PREFIX + code);
    this.peer.on("open", () => this.onStatus("waiting", code));
    this.peer.on("connection", (c) => {
      if (this.conn) { c.close(); return; }
      this._wire(c);
      if (c.open) this.onStatus("connected");
    });
    this.peer.on("error", (e) => this.onStatus("error", e.type === "unavailable-id" ? "That room code is busy, try again." : String(e.type || e)));
  }

  join(code) {
    this.isHost = false;
    this.peer = new window.Peer();
    this.peer.on("open", () => {
      this.onStatus("joining", code);
      this._wire(this.peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true }));
    });
    this.peer.on("error", (e) => this.onStatus("error", e.type === "peer-unavailable" ? "No room with that code." : String(e.type || e)));
  }

  send(msg) { if (this.conn && this.conn.open) this.conn.send(msg); }

  close() {
    try { this.conn && this.conn.close(); } catch { /* ignore */ }
    try { this.peer && this.peer.destroy(); } catch { /* ignore */ }
    this.conn = null; this.peer = null;
  }
}
