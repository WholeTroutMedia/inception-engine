import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/EventBus';

describe('EventBus', () => {
  it('should create with default config', () => {
    const bus = new EventBus();
    const config = bus.getConfig();
    expect(config.maxReplaySize).toBe(1000);
    expect(config.enableReplay).toBe(true);
    expect(config.enableWildcards).toBe(true);
    expect(config.maxListenersPerTopic).toBe(100);
  });

  it('should accept custom config', () => {
    const bus = new EventBus({ maxReplaySize: 50, enableReplay: false });
    expect(bus.getConfig().maxReplaySize).toBe(50);
    expect(bus.getConfig().enableReplay).toBe(false);
  });

  describe('pub/sub', () => {
    it('should deliver events to subscribers', async () => {
      const bus = new EventBus();
      const received: unknown[] = [];
      bus.on('test.topic', (e) => { received.push(e.payload); });
      await bus.emit('test.topic', { msg: 'hello' }, 'test');
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ msg: 'hello' });
    });

    it('should deliver to multiple subscribers', async () => {
      const bus = new EventBus();
      let count = 0;
      bus.on('multi', () => { count++; });
      bus.on('multi', () => { count++; });
      await bus.emit('multi', {}, 'test');
      expect(count).toBe(2);
    });

    it('should not deliver to unsubscribed handlers', async () => {
      const bus = new EventBus();
      let count = 0;
      const id = bus.on('topic', () => { count++; });
      bus.off(id);
      await bus.emit('topic', {}, 'test');
      expect(count).toBe(0);
    });

    it('should return false for invalid unsubscribe', () => {
      const bus = new EventBus();
      expect(bus.off('nonexistent')).toBe(false);
    });

    it('once() should fire only once', async () => {
      const bus = new EventBus();
      let count = 0;
      bus.once('once.topic', () => { count++; });
      await bus.emit('once.topic', {}, 'test');
      await bus.emit('once.topic', {}, 'test');
      expect(count).toBe(1);
    });

    it('should return EventEnvelope from emit', async () => {
      const bus = new EventBus();
      const event = await bus.emit('test', { x: 1 }, 'src');
      expect(event.topic).toBe('test');
      expect(event.source).toBe('src');
      expect(event.payload).toEqual({ x: 1 });
      expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  describe('wildcards', () => {
    it('* should match any single-segment topic', async () => {
      const bus = new EventBus();
      const received: string[] = [];
      bus.on('*', (e) => { received.push(e.topic); });
      await bus.emit('anything', {}, 'test');
      await bus.emit('other', {}, 'test');
      expect(received).toEqual(['anything', 'other']);
    });

    it('agent.* should match agent.spawn but not agent.process.deep', async () => {
      const bus = new EventBus();
      const received: string[] = [];
      bus.on('agent.*', (e) => { received.push(e.topic); });
      await bus.emit('agent.spawn', {}, 'test');
      await bus.emit('agent.kill', {}, 'test');
      await bus.emit('agent.process.deep', {}, 'test');
      expect(received).toEqual(['agent.spawn', 'agent.kill']);
    });

    it('agent.** should match deep topics', async () => {
      const bus = new EventBus();
      const received: string[] = [];
      bus.on('agent.**', (e) => { received.push(e.topic); });
      await bus.emit('agent.spawn', {}, 'test');
      await bus.emit('agent.process.deep', {}, 'test');
      expect(received).toEqual(['agent.spawn', 'agent.process.deep']);
    });

    it('*.error should match prefix.error', async () => {
      const bus = new EventBus();
      const received: string[] = [];
      bus.on('*.error', (e) => { received.push(e.topic); });
      await bus.emit('router.error', {}, 'test');
      await bus.emit('process.error', {}, 'test');
      await bus.emit('router.success', {}, 'test');
      expect(received).toEqual(['router.error', 'process.error']);
    });

    it('should support disabling wildcards', async () => {
      const bus = new EventBus({ enableWildcards: false });
      let count = 0;
      bus.on('*', () => { count++; });
      await bus.emit('test', {}, 'test');
      expect(count).toBe(0);
    });
  });

  describe('replay buffer', () => {
    it('should store events in replay buffer', async () => {
      const bus = new EventBus();
      await bus.emit('a', { v: 1 }, 'test');
      await bus.emit('b', { v: 2 }, 'test');
      const buffer = bus.getReplayBuffer();
      expect(buffer).toHaveLength(2);
    });

    it('should filter replay buffer by topic', async () => {
      const bus = new EventBus();
      await bus.emit('a', {}, 'test');
      await bus.emit('b', {}, 'test');
      expect(bus.getReplayBuffer('a')).toHaveLength(1);
    });

    it('should replay events to a handler', async () => {
      const bus = new EventBus();
      await bus.emit('x', { v: 1 }, 'test');
      await bus.emit('x', { v: 2 }, 'test');
      const replayed: unknown[] = [];
      const count = bus.replay('x', (e) => { replayed.push(e.payload); });
      expect(count).toBe(2);
      expect(replayed).toHaveLength(2);
    });

    it('should respect maxReplaySize', async () => {
      const bus = new EventBus({ maxReplaySize: 3 });
      for (let i = 0; i < 5; i++) {
        await bus.emit('t', { i }, 'test');
      }
      expect(bus.getReplayBuffer()).toHaveLength(3);
    });

    it('should clear replay buffer', async () => {
      const bus = new EventBus();
      await bus.emit('t', {}, 'test');
      bus.clearReplayBuffer();
      expect(bus.getReplayBuffer()).toHaveLength(0);
    });

    it('replay returns 0 when disabled', async () => {
      const bus = new EventBus({ enableReplay: false });
      await bus.emit('t', {}, 'test');
      expect(bus.replay('t', () => {})).toBe(0);
    });
  });

  describe('stats', () => {
    it('should track publish and delivery counts', async () => {
      const bus = new EventBus();
      bus.on('s', () => {});
      await bus.emit('s', {}, 'test');
      const stats = bus.getStats();
      expect(stats.totalPublished).toBe(1);
      expect(stats.totalDelivered).toBe(1);
    });

    it('should track dropped events on handler error', async () => {
      const bus = new EventBus();
      bus.on('err', () => { throw new Error('boom'); });
      await bus.emit('err', {}, 'test');
      expect(bus.getStats().totalDropped).toBe(1);
    });

    it('should track subscription counts', () => {
      const bus = new EventBus();
      bus.on('a', () => {});
      bus.on('b', () => {});
      expect(bus.getStats().activeSubscriptions).toBe(2);
      expect(bus.getStats().topicCount).toBe(2);
    });
  });

  describe('utilities', () => {
    it('getTopics returns active patterns', () => {
      const bus = new EventBus();
      bus.on('a', () => {});
      bus.on('b.*', () => {});
      expect(bus.getTopics()).toEqual(['a', 'b.*']);
    });

    it('listenerCount returns correct count', () => {
      const bus = new EventBus();
      bus.on('t', () => {});
      bus.on('t', () => {});
      expect(bus.listenerCount('t')).toBe(2);
      expect(bus.listenerCount('none')).toBe(0);
    });

    it('removeAllListeners clears specific topic', () => {
      const bus = new EventBus();
      bus.on('a', () => {});
      bus.on('b', () => {});
      bus.removeAllListeners('a');
      expect(bus.listenerCount('a')).toBe(0);
      expect(bus.listenerCount('b')).toBe(1);
    });

    it('removeAllListeners() clears everything', () => {
      const bus = new EventBus();
      bus.on('a', () => {});
      bus.on('b', () => {});
      bus.removeAllListeners();
      expect(bus.getStats().activeSubscriptions).toBe(0);
    });

    it('should throw on max listeners exceeded', () => {
      const bus = new EventBus({ maxListenersPerTopic: 2 });
      bus.on('t', () => {});
      bus.on('t', () => {});
      expect(() => bus.on('t', () => {})).toThrow(/max listeners/);
    });
  });
});