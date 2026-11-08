export function ConnectGate({ wallet, title, body }) {
  return (
    <div className="py-14 md:py-20 max-w-xl">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      <p className="mt-4 text-muted leading-relaxed">{body}</p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={wallet.connect}
          disabled={wallet.busy}
        >
          {wallet.busy ? 'Connecting…' : 'Connect Stellar Wallet'}
        </button>
        {wallet.connectDemo && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={wallet.connectDemo}
            disabled={wallet.busy}
          >
            Try Interactive Demo Wallet
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-faint">
        Supports Freighter, Albedo, Lobstr, and xBull via Stellar Wallets Kit.
      </p>
      {wallet.error && (
        <p role="alert" className="mt-4 text-sm text-red font-medium">
          {wallet.error}
        </p>
      )}
    </div>
  )
}

export function Page({ title, intro, children }) {
  return (
    <main tabIndex={-1} className="mx-auto w-full max-w-6xl px-5 py-10 outline-none md:px-8 md:py-16">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-4 max-w-2xl text-muted leading-relaxed">{intro}</p>}
      {children}
    </main>
  )
}
