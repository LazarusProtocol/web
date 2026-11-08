/** Per-route SEO metadata. Pure data: shared by the app (useSeo) and the build-time prerender. */
export const META = {
  home: {
    path: '/',
    title: 'LazarusProtocol — Automated Soroban State-Rent & TTL Infrastructure on Stellar',
    description:
      'LazarusProtocol is a decentralized keeper network and non-custodial escrow protocol on Stellar that proactively extends Soroban smart contract storage TTL so your users never pay cold-archival restoration fees.',
    breadcrumb: 'Home',
  },
  inspect: {
    path: '/inspect',
    title: 'Inspect Soroban Contract Storage TTL — LazarusProtocol',
    description:
      'Paste any 56-character Soroban contract ID to inspect live Persistent, Instance, and ContractCode storage TTLs and detect archival risk on Stellar.',
    breadcrumb: 'Inspect Contract',
  },
  vaults: {
    path: '/vaults',
    title: 'Vaults: Enroll Soroban Contracts & Fund USDC Escrow — LazarusProtocol',
    description:
      'Enroll Soroban smart contracts into non-custodial escrow vaults, set a fixed USDC keeper bounty, and keep your Stellar contract state alive automatically.',
    breadcrumb: 'Vaults',
  },
  keepers: {
    path: '/keepers',
    title: 'Run a Keeper: Earn USDC Bounties on Stellar — LazarusProtocol',
    description:
      'Run a LazarusProtocol keeper, extend expiring Soroban storage in batches, and redeem signed vouchers for USDC bounties.',
    breadcrumb: 'Keepers',
  },
  docs: {
    path: '/docs',
    title: 'Docs: How LazarusProtocol Keeps Soroban State Alive — LazarusProtocol',
    description:
      'Documentation for LazarusProtocol on Stellar: state rent and TTL, the decoupled voucher flow, the LazarusVault contract API, and how to run a keeper.',
    breadcrumb: 'Docs',
  },
}

export const ROUTE_KEYS = Object.keys(META)
