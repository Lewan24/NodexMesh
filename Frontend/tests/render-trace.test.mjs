import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRenderTrace } from '../e2e/helpers/renderTrace.mjs';

const marks = ['canvas.motion.start', 'canvas.motion.end', 'canvas.restored', 'canvas.measure.end'].map(
  (name, index) => ({ name, ph: 'R', ts: 1000 + index * 1000, pid: 1, tid: 1 }),
);

test('trace summary clips durations by phase and keeps similarly named worker threads separate', () => {
  const trace = {
    traceEvents: [
      { ph: 'M', name: 'thread_name', pid: 1, tid: 1, args: { name: 'CrRendererMain' } },
      { ph: 'M', name: 'thread_name', pid: 1, tid: 2, args: { name: 'Worker' } },
      { ph: 'M', name: 'thread_name', pid: 1, tid: 3, args: { name: 'Worker' } },
      ...marks,
      { ph: 'X', name: 'Paint', pid: 1, tid: 1, ts: 1900, dur: 200 },
      { ph: 'X', name: 'RasterTask', pid: 1, tid: 2, ts: 1100, dur: 300 },
      { ph: 'X', name: 'RasterTask', pid: 1, tid: 3, ts: 1100, dur: 400 },
      { ph: 'B', name: 'Layout', pid: 1, tid: 1, ts: 2900 },
      { ph: 'E', pid: 1, tid: 1, ts: 3100 },
      { ph: 'X', name: 'Outside', pid: 1, tid: 1, ts: 5000, dur: 100 },
    ],
  };
  const summary = summarizeRenderTrace(trace);
  assert.equal(summary.movement.elapsedMs, 1);
  assert.equal(summary.movement.events.find((event) => event.event === 'Paint').totalMs, 0.1);
  assert.equal(summary.restoration.events.find((event) => event.event === 'Paint').totalMs, 0.1);
  assert.equal(summary.restoration.events.find((event) => event.event === 'Layout').totalMs, 0.1);
  assert.equal(summary.afterRestoration.events.find((event) => event.event === 'Layout').totalMs, 0.1);
  assert.equal(summary.movement.events.filter((event) => event.event === 'RasterTask').length, 2);
  assert.equal(
    Object.values(summary).some((phase) => phase.events.some((event) => event.event === 'Outside')),
    false,
  );
});

test('incomplete and reversed trace windows cannot produce apparently valid measurements', () => {
  assert.throws(() => summarizeRenderTrace({ traceEvents: marks.slice(1) }), /missing measurement marks/);
  assert.throws(
    () => summarizeRenderTrace({ traceEvents: marks.map((mark) => ({ ...mark, ts: -mark.ts })) }),
    /out of order/,
  );
});
