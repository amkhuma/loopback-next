// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

// tslint:disable-next-line:no-any
export type Event = any;

/**
 * Observer
 */
export interface Observer {
  name?: string;
  observe(eventType: string, event: Event): Promise<void>;
}

/**
 * An map of observers keyed by event types
 */
export interface ObserverMap {
  [eventType: string]: Observer[];
}

/**
 * A subscription
 */
export interface Subscription {
  /**
   * Cancel the subscription
   */
  cancel(): void;
}

/**
 * An interface to describe an observable object
 */
export interface Observable {
  /**
   * Get a list of observers for the given source object and event type
   * @param source Source object
   * @param eventType Event type
   */
  getObservers(eventType: string): Observer[];

  /**
   * Subscribe to an event type
   * @param eventType Event type
   * @param observer An observer
   */
  subscribe(eventType: string, observer: Observer): Subscription;

  /**
   * Unsubscribe to an event type
   * @param eventType Event type
   * @param observer An observer
   */
  unsubscribe(eventType: string, observer: Observer): boolean;

  /**
   * Publish an event for the given type.
   * @param eventType Event type
   * @param event Event object
   */
  publish(eventType: string, event: Event): Promise<void>;

  /**
   * Notify observers one by one with an event for the given type. It
   * will wait for the completion of observers to process the event.
   * @param eventType
   * @param event
   */
  notify(eventType: string, event: Event): Promise<void>;
}

/**
 * A registry for observable objects
 */
export interface ObservableRegistry {
  /**
   * Get a list of observers for the given source object and event type
   * @param source Source object
   * @param eventType Event type
   */
  getObservers(source: object, eventType: string): Observer[];

  /**
   * Subscribe to an event source and type
   * @param source Source object
   * @param eventType Event type
   * @param observer An observer
   */
  subscribe(
    source: object,
    eventType: string,
    observer: Observer,
  ): Subscription;

  /**
   * Unsubscribe to an event source and type
   * @param source Source object
   * @param eventType Event type
   * @param observer An observer
   */
  unsubscribe(source: object, eventType: string, observer: Observer): boolean;

  /**
   * Publish an event for the event source/type. It will not wait for the
   * completion of observers to process the event.
   * @param source Source object
   * @param eventType Event type
   * @param event Event object
   */
  publish(source: object, eventType: string, event: Event): Promise<void>;

  /**
   * Notify observers one by one with an event for the event source/type. It
   * will wait for the completion of observers to process the event.
   * @param source Source object
   * @param eventType Event type
   * @param event Event object
   */
  notify(source: object, eventType: string, event: Event): Promise<void>;

  /**
   * Wrap an object to be observable
   * @param source Source object
   */
  createObservable(source: object): Observable;
}

/**
 * Default in-memory implementation of ObservableRegistry
 */
export class DefaultObservableRegistry implements ObservableRegistry {
  protected readonly registry = new WeakMap<object, ObserverMap>();

  getObservers(source: object, eventType: string) {
    let observerMap = this.registry.get(source);
    if (!observerMap) return [];
    return observerMap[eventType] || [];
  }

  subscribe(source: object, eventType: string, observer: Observer) {
    let observerMap = this.registry.get(source);
    if (!observerMap) {
      observerMap = {};
      this.registry.set(source, observerMap);
    }
    let observers = observerMap[eventType];
    if (!observers) {
      observers = [];
      observerMap[eventType] = observers;
    }
    observers.push(observer);
    return {
      cancel: () => {
        this.unsubscribe(source, eventType, observer);
      },
    };
  }

  unsubscribe(source: object, eventType: string, observer: Observer) {
    const observers = this.getObservers(source, eventType);
    const index = observers.indexOf(observer);
    if (index === -1) return false;
    observers.splice(index, 1);
    return true;
  }

  async notify(source: object, eventType: string, event: Event) {
    const observers = this.getObservers(source, eventType);
    for (const observer of observers) {
      await observer.observe(eventType, event);
    }
  }

  async publish(source: object, eventType: string, event: Event) {
    const observers = this.getObservers(source, eventType);
    const promises = observers.map(observer =>
      observer.observe(eventType, event),
    );
    await Promise.all(promises);
  }

  createObservable(source: object): Observable {
    return new EventSource(source, this);
  }
}

/**
 * Event source
 */
export class EventSource implements Observable {
  protected readonly registry: ObservableRegistry;
  protected readonly source: object;

  constructor(source?: object, registry?: ObservableRegistry) {
    this.source = source || this;
    this.registry = registry || new DefaultObservableRegistry();
  }

  getObservers(eventType: string) {
    return this.registry.getObservers(this.source, eventType);
  }

  subscribe(eventType: string, observer: Observer) {
    return this.registry.subscribe(this.source, eventType, observer);
  }

  unsubscribe(eventType: string, observer: Observer) {
    return this.registry.unsubscribe(this.source, eventType, observer);
  }

  publish(eventType: string, event: Event) {
    return this.registry.publish(this.source, eventType, event);
  }

  async notify(eventType: string, event: Event) {
    return this.registry.notify(this.source, eventType, event);
  }
}
