import { EventBus } from './event-bus.js';

export interface ComponentOptions {
  initialState?: Record<string, any>;
  props?: Record<string, any>;
  eventBus?: EventBus;
}

export class Component {
  options: any;
  element: HTMLElement | null;
  children: Map<string, any>;
  eventHandlers: Map<string, any>;
  state: Record<string, any>;
  props: Record<string, any>;
  refs: Map<string, any>;
  mounted: boolean;
  destroyed: boolean;
  eventBus: EventBus | null;

  constructor(options?: ComponentOptions);
  createElement(html: string): HTMLElement;
  render(): string;
  mount(container: string | HTMLElement): void;
  unmount(): void;
  onMount(): void;
  onUnmount(): void;
  setState(partialState: Record<string, any>): void;
  setProps(props: Record<string, any>): void;
  update(): void;
  bindEvents(): void;
  unmount(): void;
  onMount(): void;
  onUnmount(): void;
  emit(event: string, detail: any): void;
  on(event: string, selector: string | null, handler: (e: Event) => void, options?: AddEventListenerOptions): void;
  off(event: string, selector: string | null, handler: (e: Event) => void): void;
  emit(event: string, detail: any): void;
  onEvent(event: string, handler: (e: CustomEvent) => void): () => void;
  ref(name: string, element?: HTMLElement): HTMLElement | null;
  setState(partialState: Record<string, any>): void;
  setProps(props: Record<string, any>): void;
  update(): void;
  bindEvents(): void;
  unmount(): void;
  onMount(): void;
  onUnmount(): void;
}
