type MessageHandler = (data: Record<string, unknown>) => void;

class AlertWebSocket {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = "";

  connect(token: string) {
    const base = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    this.url = `${base}/ws/alerts?token=${token}`;
    this._open();
  }

  private _open() {
    if (this.ws) this.ws.close();
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.forEach((h) => h(data));
      } catch { /* ignore */ }
    };
    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this._open(), 5000);
    };
    this.ws.onerror = () => { this.ws?.close(); };
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter((h) => h !== handler); };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const alertWebSocket = new AlertWebSocket();
