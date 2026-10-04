// Navigation callbacks cannot call the client provider directly. The marker carries
// no identity or credentials and is consumed only after a validated session read.
export const googleSessionMarker = 'mindyAuth';

export function consumeGoogleSessionMarker(): boolean {
  const url = new URL(window.location.href);
  if (
    url.searchParams.getAll(googleSessionMarker).length !== 1 ||
    url.searchParams.get(googleSessionMarker) !== 'google'
  )
    return false;
  url.searchParams.delete(googleSessionMarker);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}
