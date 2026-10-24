import { describe, expect, it } from 'vitest';
import { delayTruck, newDay, storeById, tick } from '../../engine';
import { seed } from '../../data';
import { br028MessagingEngine, msgs, send, visibleMessages } from './engine';

const day = () => newDay(seed, 'normal', { features: [br028MessagingEngine] });

describe('br-028-messaging [BR-028]', () => {
  it('a message is tied to its store and gets a simulated reply from that role', () => {
    const s = day();
    send(s, 'Ana Ruiz', 'MSL', 's2', 'Endcap is blocked by a pallet.');
    tick(s, 5);
    const [q, a] = msgs(s).list;
    expect(q).toMatchObject({ from: 'Ana Ruiz', to: 'MSL', storeId: 's2' });
    expect(a).toMatchObject({ from: 'MSL North', to: 'Ana Ruiz', storeId: 's2', auto: true });
  });

  it('empty messages are ignored', () => {
    const s = day();
    expect(send(s, 'x', 'Driver', null, '   ')).toBeNull();
    expect(msgs(s).list).toEqual([]);
  });

  it('the driver posts an update to the merchandiser when a truck slips', () => {
    const s = day();
    tick(s, 1);
    delayTruck(s, storeById(s, 's4')!, 45);
    tick(s, 1);
    const m = msgs(s).list.at(-1)!;
    expect(m).toMatchObject({ storeId: 's4', to: 'Merchandiser', auto: true });
    expect(m.from).toContain('Driver');
    expect(m.text).toContain('45 min behind');
  });

  it('viewers only see messages about stores they can see, plus general ones', () => {
    const s = day();
    send(s, 'a', 'MSL', 's2', 'north');
    send(s, 'b', 'MSL', 's9', 'south');
    send(s, 'c', 'Scheduler', null, 'general');
    const north = visibleMessages(s, st => st.market === 'North').map(m => m.text);
    expect(north).toEqual(['north', 'general']);
  });
});
