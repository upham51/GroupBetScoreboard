import Turnstile from './Turnstile.jsx'

// The browser check as it appears in a form, including the states where it
// cannot run at all. Loading, unreachable and unconfigured say different things
// and none of them quietly let a write through.
export default function TurnstileField({ turnstile, label = 'Browser check' }) {
  const { config, onToken, resetSignal } = turnstile

  if (config.status === 'loading') {
    return (
      <div className="check">
        <span className="eyebrow">{label}</span>
        <span className="check-note">Loading the browser check.</span>
      </div>
    )
  }

  if (config.status === 'error') {
    return (
      <div className="check">
        <span className="eyebrow">{label}</span>
        <span className="check-note check-note-error" role="alert">
          The browser check settings could not be read, so nothing can be saved right now. Reload
          the page and try again.
        </span>
      </div>
    )
  }

  if (!config.siteKey) {
    return (
      <div className="check">
        <span className="eyebrow">{label}</span>
        <span className="check-note check-note-error" role="alert">
          This deployment has no browser check configured, so nothing can be saved. Whoever set it
          up needs to add the Turnstile keys.
        </span>
      </div>
    )
  }

  return (
    <Turnstile
      siteKey={config.siteKey}
      onToken={onToken}
      resetSignal={resetSignal}
      label={label}
    />
  )
}
