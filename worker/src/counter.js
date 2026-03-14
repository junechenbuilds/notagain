const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

export class ThronCounter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/increment' && request.method === 'POST') {
      const { region, sessionId } = await request.json();

      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      globalCount += 1;
      if (regionCounts[region] !== undefined) {
        regionCounts[region] += 1;
      }

      // Track session in DO (single-threaded — no race conditions)
      await this.state.storage.put(`session:${sessionId}`, {
        region,
        startedAt: Date.now(),
      });

      await this.state.storage.put('globalCount', globalCount);
      await this.state.storage.put('regionCounts', regionCounts);

      return Response.json({ globalCount, regionCounts });
    }

    if (url.pathname === '/decrement' && request.method === 'POST') {
      const { sessionId } = await request.json();

      // Look up session to get region
      const session = await this.state.storage.get(`session:${sessionId}`);
      if (!session) {
        // Session not found — return current counts without decrementing
        const globalCount = (await this.state.storage.get('globalCount')) || 0;
        const regionCounts = (await this.state.storage.get('regionCounts')) || {
          americas: 0, europe: 0, asiaPacific: 0,
        };
        return Response.json({ globalCount, regionCounts });
      }

      await this.state.storage.delete(`session:${sessionId}`);

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

      return Response.json({ globalCount, regionCounts });
    }

    if (url.pathname === '/counts' && request.method === 'GET') {
      const globalCount = (await this.state.storage.get('globalCount')) || 0;
      const regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };
      return Response.json({ globalCount, regionCounts });
    }

    if (url.pathname === '/cleanup' && request.method === 'POST') {
      // Find and remove expired sessions
      const allKeys = await this.state.storage.list({ prefix: 'session:' });
      const now = Date.now();
      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      let expired = 0;
      for (const [key, session] of allKeys) {
        if (now - session.startedAt > SESSION_TTL_MS) {
          await this.state.storage.delete(key);
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
