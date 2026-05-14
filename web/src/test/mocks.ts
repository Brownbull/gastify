import type { ScanEvent } from "@/stores/scanStore";

type Listener = (event: MessageEvent<string>) => void;

export class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  listeners = new Map<string, Listener[]>();
  closed = false;

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener as Listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((candidate) => candidate !== listener),
    );
  }

  close() {
    this.closed = true;
  }

  emit(type: string, event: ScanEvent) {
    const message = new MessageEvent<string>(type, {
      data: JSON.stringify(event),
    });

    if (type === "message") {
      this.onmessage?.(message);
    }

    for (const listener of this.listeners.get(type) ?? []) {
      listener(message);
    }
  }

  fail() {
    this.onerror?.(new Event("error"));
  }
}
