export class ThronCounter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/increment' && request.method === 'POST') {
      const { region } = await request.json();

      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      globalCount += 1;
      if (regionCounts[region] !== undefined) {
        regionCounts[region] += 1;
      }

      await this.state.storage.put('globalCount', globalCount);
      await this.state.storage.put('regionCounts', regionCounts);

      return Response.json({ globalCount, regionCounts });
    }

    if (url.pathname === '/decrement' && request.method === 'POST') {
      const { region } = await request.json();

      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      globalCount = Math.max(0, globalCount - 1);
      if (regionCounts[region] !== undefined) {
        regionCounts[region] = Math.max(0, regionCounts[region] - 1);
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

    if (url.pathname === '/batch-decrement' && request.method === 'POST') {
      const { decrements } = await request.json();

      let globalCount = (await this.state.storage.get('globalCount')) || 0;
      let regionCounts = (await this.state.storage.get('regionCounts')) || {
        americas: 0, europe: 0, asiaPacific: 0,
      };

      let totalDecrement = 0;
      for (const [region, count] of Object.entries(decrements)) {
        if (regionCounts[region] !== undefined) {
          const actual = Math.min(regionCounts[region], count);
          regionCounts[region] -= actual;
          totalDecrement += actual;
        }
      }
      globalCount = Math.max(0, globalCount - totalDecrement);

      await this.state.storage.put('globalCount', globalCount);
      await this.state.storage.put('regionCounts', regionCounts);

      return Response.json({ globalCount, regionCounts });
    }

    return new Response('Not found', { status: 404 });
  }
}
