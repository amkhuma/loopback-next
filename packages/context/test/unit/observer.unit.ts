// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  DefaultObservableRegistry,
  ObservableRegistry,
  Event,
  EventSource,
  Observer,
} from '../..';

describe('observer', () => {
  const source = {};
  const events: Event[] = [];
  beforeEach(clearEvents);

  describe('observable registry', () => {
    let registry: ObservableRegistry;
    beforeEach(givenObservableRegistry);

    it('subscribes to events', async () => {
      const observer = givenObserver();
      registry.subscribe(source, 'starting', observer);
      expect(registry.getObservers(source, 'starting')).containEql(observer);
    });

    it('unsubscribes to events', () => {
      const observer = givenObserver();
      registry.subscribe(source, 'starting', observer);
      expect(registry.getObservers(source, 'starting')).containEql(observer);
      registry.unsubscribe(source, 'starting', observer);
      expect(registry.getObservers(source, 'starting')).not.containEql(
        observer,
      );
    });

    it('cancels subscription', () => {
      const observer = givenObserver();
      const subscription = registry.subscribe(source, 'starting', observer);
      expect(registry.getObservers(source, 'starting')).containEql(observer);
      subscription.cancel();
      expect(registry.getObservers(source, 'starting')).not.containEql(
        observer,
      );
    });

    it('observes to events', async () => {
      const observer = givenObserver();
      registry.subscribe(source, 'starting', observer);
      registry.publish(source, 'starting', '1');
      // Events are processed asynchronously
      expect(events).to.eql([]);
      // Wait for the promise to be fulfilled in next tick
      await timeout(10);
      expect(events).to.eql(['starting-1']);
      registry.publish(source, 'stopping', '2');
      // The observer is not interested in 'stopping'
      expect(events).to.eql(['starting-1']);
    });

    it('notifies observers', async () => {
      const observer1 = givenObserver('A', 10);
      const observer2 = givenObserver('B', 0);
      registry.subscribe(source, 'starting', observer1);
      registry.subscribe(source, 'starting', observer2);
      await registry.notify(source, 'starting', '1');
      // A should come 1st
      expect(events).to.eql(['A: starting-1', 'B: starting-1']);
      await registry.notify(source, 'stopping', '2');
      // The observer is not interested in 'stopping'
      expect(events).to.eql(['A: starting-1', 'B: starting-1']);
    });

    it('publishes events to observers in parallel', async () => {
      const observer1 = givenObserver('A', 10);
      const observer2 = givenObserver('B', 0);
      registry.subscribe(source, 'starting', observer1);
      registry.subscribe(source, 'starting', observer2);
      await registry.publish(source, 'starting', '1');
      // B should come 1st
      expect(events).to.eql(['B: starting-1', 'A: starting-1']);
      await registry.publish(source, 'stopping', '2');
      // The observer is not interested in 'stopping'
      expect(events).to.eql(['B: starting-1', 'A: starting-1']);
    });

    it('creates an event source', () => {
      const eventSource = registry.createObservable(source);
      expect(eventSource).to.be.instanceof(EventSource);
    });

    function givenObservableRegistry() {
      registry = new DefaultObservableRegistry();
      return registry;
    }
  });

  describe('event source', () => {
    let eventSource: EventSource;
    beforeEach(givenEventSource);

    it('subscribes to events', async () => {
      const observer = givenObserver();
      eventSource.subscribe('starting', observer);
      expect(eventSource.getObservers('starting')).containEql(observer);
    });

    it('unsubscribes to events', () => {
      const observer = givenObserver();
      eventSource.subscribe('starting', observer);
      expect(eventSource.getObservers('starting')).containEql(observer);
      eventSource.unsubscribe('starting', observer);
      expect(eventSource.getObservers('starting')).not.containEql(observer);
    });

    it('cancels subscription', () => {
      const observer = givenObserver();
      const subscription = eventSource.subscribe('starting', observer);
      expect(eventSource.getObservers('starting')).containEql(observer);
      subscription.cancel();
      expect(eventSource.getObservers('starting')).not.containEql(observer);
    });

    it('observes to events', async () => {
      const observer = givenObserver();
      eventSource.subscribe('starting', observer);
      eventSource.publish('starting', '1');
      // Events are processed asynchronously
      expect(events).to.eql([]);
      // Wait for the promise to be fulfilled in next tick
      await timeout(10);
      expect(events).to.eql(['starting-1']);
      eventSource.publish('stopping', '2');
      // The observer is not interested in 'stopping'
      expect(events).to.eql(['starting-1']);
    });

    it('notifies observers', async () => {
      const observer1 = givenObserver('A', 10);
      const observer2 = givenObserver('B', 0);
      eventSource.subscribe('starting', observer1);
      eventSource.subscribe('starting', observer2);
      await eventSource.notify('starting', '1');
      // A should come 1st
      expect(events).to.eql(['A: starting-1', 'B: starting-1']);
      await eventSource.notify('stopping', '2');
      // The observer is not interested in 'stopping'
      expect(events).to.eql(['A: starting-1', 'B: starting-1']);
    });

    it('publishes events to observers in parallel', async () => {
      const observer1 = givenObserver('A', 10);
      const observer2 = givenObserver('B', 0);
      eventSource.subscribe('starting', observer1);
      eventSource.subscribe('starting', observer2);
      await eventSource.publish('starting', '1');
      // B should come 1st
      expect(events).to.eql(['B: starting-1', 'A: starting-1']);
      await eventSource.publish('stopping', '2');
      // The observer is not interested in 'stopping'
      expect(events).to.eql(['B: starting-1', 'A: starting-1']);
    });
    function givenEventSource() {
      eventSource = new EventSource();
    }
  });

  function givenObserver(name = '', wait: number = 0) {
    const prefix = name ? name + ': ' : '';
    const observer: Observer = {
      name,
      observe: (eventType, event) => {
        return timeout(wait, () =>
          events.push(`${prefix}${eventType}-${event}`),
        );
      },
    };
    return observer;
  }

  function timeout(ms: number, fn?: () => void) {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (fn) fn();
        resolve();
      }, ms);
    });
  }

  function clearEvents() {
    events.splice(0, events.length);
  }
});
