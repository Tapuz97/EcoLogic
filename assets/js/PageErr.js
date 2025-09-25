// assets/js/PageErr.js
const ERR_KEY = 'EC_LOGIC_LAST_ERR';

function saveErr(payload) {
  try { sessionStorage.setItem(ERR_KEY, JSON.stringify(payload)); }
  catch { /* ignore */ }
}

export function renderErrorFromSession() {
  let data;
  try { data = JSON.parse(sessionStorage.getItem(ERR_KEY) || 'null'); } catch {}
  if (!data) return;

  const chip = document.getElementById('errChip');
  const meta = document.getElementById('errMeta');

  if (chip) {
    chip.textContent = `Error: ${data.statusText || 'Unknown'} (${data.status})`;
    chip.style.display = 'inline-flex';
  }
  if (meta) {
    const lines = [];
    if (data.method) lines.push(`Method: ${data.method}`);
    if (data.url) lines.push(`URL: ${data.url}`);
    if (data.time) lines.push(`Time: ${new Date(data.time).toLocaleString()}`);
    meta.innerText = lines.join('\n');
    meta.style.display = 'block';
  }

  // clear so next visit to 404 doesn’t show old info
  try { sessionStorage.removeItem(ERR_KEY); } catch {}
}

export function installGlobalGetGuard({ redirect = true, base404 = '/404.html' } = {}) {
  if (installGlobalGetGuard._installed) return;
  installGlobalGetGuard._installed = true;

  const origFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const req = (typeof input === 'string') ? new Request(input, init) : input;
    const method = (req.method || (init.method ?? 'GET')).toUpperCase();

    if (method !== 'GET') return origFetch(input, init);

    try {
      const res = await origFetch(input, init);
      if (!res.ok) {
        // this is where "Cannot GET ..." would happen → 404
        saveErr({
          method, url: req.url,
          status: res.status, statusText: res.statusText,
          time: Date.now()
        });
        if (redirect) {
          const url = new URL(base404, window.location.origin);
          url.searchParams.set('code', res.status);
          url.searchParams.set('from', window.location.pathname);
          window.location.assign(url.toString());
        }
      }
      return res;
    } catch (err) {
      saveErr({
        method, url: req.url,
        status: 'network', statusText: err?.message || 'Network error',
        time: Date.now()
      });
      if (redirect) {
        const url = new URL(base404, window.location.origin);
        url.searchParams.set('code', 'network');
        url.searchParams.set('from', window.location.pathname);
        window.location.assign(url.toString());
      }
      throw err;
    }
  };
}
