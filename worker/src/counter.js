const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes
const VALID_REGIONS = ['americas', 'europe', 'asiaPacific'];

export class ThronCounter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Atomic session admission: check IP lock + increment + track session in one DO call
    if (url.pathname === '/admit' && request.method === 'POST') {
      const { region, sessionId, ipHash } = await request.json();

      // Validate region
      if (!VALID_REGIONS.includes(region)) {
        return Response.json({ error: 'Invalid region' }, { status: 400 });
      }

      // Check if this IP already has an active session (single-threaded — no race)
      const existingSession = await this.state.storage.get(`ip:${ipHash}`);
      if (existingSession) {
        return Response.json(
          { error: 'You already have an active session', admitted: false },
          { status: 429 },
        );
      }

      // Admit: increment counters + track session + lock IP
      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      globalCount += 1;
      regionCounts[region] += 1;

      await this.state.storage.put(`session:${sessionId}`, {
        region,
        ipHash,
        startedAt: Date.now(),
      });
      await this.state.storage.put(`ip:${ipHash}`, sessionId);
      await this.state.storage.put('globalCount', globalCount);
      await this.state.storage.put('regionCounts', regionCounts);

      return Response.json({ admitted: true, globalCount, regionCounts });
    }

    if (url.pathname === '/decrement' && request.method === 'POST') {
      const { sessionId } = await request.json();

      // Look up session to get region and IP
      const session = await this.state.storage.get(`session:${sessionId}`);
      if (!session) {
        const globalCount = (await this.state.storage.get('globalCount')) || 0;
        const regionCounts = (await this.state.storage.get('regionCounts')) || {
          americas: 0, europe: 0, asiaPacific: 0,
        };
        return Response.json({ globalCount, regionCounts, found: false });
      }

      // Clean up session + IP lock
      await this.state.storage.delete(`session:${sessionId}`);
      if (session.ipHash) {
        await this.state.storage.delete(`ip:${session.ipHash}`);
      }

      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      globalCount = Math.max(0, globalCount - 1);
      if (regionCounts[session.region] !== undefined) {
        regionCounts[session.region] = Math.max(0, regionCounts[session.region] - 1);
      }

      await this.state.storage.put('globalCount', globalCount);
      await this.state.storage.put('regionCounts', regionCounts);

      return Response.json({ globalCount, regionCounts, found: true });
    }

    if (url.pathname === '/counts' && request.method === 'GET') {
      const globalCount = (await this.state.storage.get('globalCount')) || 0;
      const regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };
      return Response.json({ globalCount, regionCounts });
    }

    if (url.pathname === '/cleanup' && request.method === 'POST') {
      const allSessions = await this.state.storage.list({ prefix: 'session:' });
      const now = Date.now();
      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      let expired = 0;
      for (const [key, session] of allSessions) {
        if (now - session.startedAt > SESSION_TTL_MS) {
          await this.state.storage.delete(key);
          if (session.ipHash) {
            await this.state.storage.delete(`ip:${session.ipHash}`);
          }
          globalCount = Math.max(0, globalCount - 1);
          if (regionCounts[session.region] !== undefined) {
            regionCounts[session.region] = Math.max(0, regionCounts[session.region] - 1);
          }
          expired++;
        }
      }

      if (expired > 0) {
        await this.state.storage.put('globalCount', globalCount);
        await this.state.storage.put('regionCounts', regionCounts);
      }

      return Response.json({ globalCount, regionCounts, expired });
    }

    return new Response('Not found', { status: 404 });
  }
}
