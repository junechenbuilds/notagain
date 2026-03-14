// Cloudflare cf.continent values: AF, AN, AS, EU, NA, OC, SA
// Mapped to 3 regions per PRD

const CONTINENT_MAP = {
  NA: 'americas',
  SA: 'americas',
  EU: 'europe',
  AF: 'europe',
  AS: 'asiaPacific',
  OC: 'asiaPacific',
  AN: 'asiaPacific',
};

export function mapContinent(cfContinent) {
  return CONTINENT_MAP[cfContinent] || 'americas';
}
