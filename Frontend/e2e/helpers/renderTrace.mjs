import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const milestones = ['canvas.motion.start', 'canvas.motion.end', 'canvas.restored', 'canvas.measure.end'];

/** Durations are per event/thread, may overlap, and must not be added into wall-clock time. */
export function summarizeRenderTrace(trace) {
  const marks = new Map();
  const threads = new Map();
  const stacks = new Map();
  const durations = [];
  for (const event of trace.traceEvents) {
    const thread = `${event.pid}:${event.tid}`;
    if (event.ph === 'M' && event.name === 'thread_name') threads.set(thread, event.args.name);
    if (milestones.includes(event.name)) marks.set(event.name, event.ts);
    if (event.ph === 'X' && event.dur > 0) durations.push(event);
    if (event.ph === 'B') {
      const stack = stacks.get(thread) ?? [];
      stack.push(event);
      stacks.set(thread, stack);
    }
    if (event.ph === 'E') {
      const begin = stacks.get(thread)?.pop();
      if (begin && event.ts > begin.ts) durations.push({ ...begin, dur: event.ts - begin.ts });
    }
  }
  if (milestones.some((name) => !marks.has(name))) throw new Error('Rendering trace is missing measurement marks.');
  const phases = {};
  for (const [index, phase] of ['movement', 'restoration', 'afterRestoration'].entries()) {
    const start = marks.get(milestones[index]);
    const end = marks.get(milestones[index + 1]);
    if (end < start) throw new Error('Rendering trace marks are out of order.');
    const groups = new Map();
    for (const event of durations) {
      const overlap = Math.min(event.ts + event.dur, end) - Math.max(event.ts, start);
      if (overlap <= 0) continue;
      const threadId = `${event.pid}:${event.tid}`;
      const thread = threads.get(threadId) ?? threadId;
      const key = `${threadId}:${event.name}`;
      const value = groups.get(key) ?? { thread, threadId, event: event.name, count: 0, totalMs: 0, maxMs: 0 };
      value.count++;
      value.totalMs += overlap / 1000;
      value.maxMs = Math.max(value.maxMs, overlap / 1000);
      groups.set(key, value);
    }
    phases[phase] = {
      elapsedMs: (end - start) / 1000,
      events: [...groups.values()].sort((a, b) => b.totalMs - a.totalMs),
    };
  }
  return phases;
}

export async function startRenderTrace(cdp) {
  await cdp.send('Tracing.start', {
    categories:
      'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,cc,gpu',
    transferMode: 'ReturnAsStream',
  });
  return async (testInfo) => {
    const complete = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    const { stream, dataLossOccurred } = await complete;
    const chunks = [];
    try {
      let eof = false;
      while (!eof) {
        const chunk = await cdp.send('IO.read', { handle: stream });
        chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
        eof = chunk.eof;
      }
    } finally {
      await cdp.send('IO.close', { handle: stream });
    }
    const data = Buffer.concat(chunks).toString('utf8');
    if (dataLossOccurred) throw new Error('Rendering trace lost events; repeat the diagnostic.');
    const summary = summarizeRenderTrace(JSON.parse(data));
    const path = testInfo.outputPath('rendering-trace.json.gz');
    await writeFile(path, gzipSync(data));
    await testInfo.attach('rendering-trace', { path, contentType: 'application/gzip' });
    await testInfo.attach('rendering-summary', {
      body: JSON.stringify(summary, null, 2),
      contentType: 'application/json',
    });
    return summary;
  };
}
