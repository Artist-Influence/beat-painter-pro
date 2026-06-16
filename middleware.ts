// Vercel Routing Middleware — password gate for the whole site.
// Prompts via HTTP Basic Auth; any username is accepted, password must be "arty".
export const config = {
  matcher: '/:path*',
};

// The gate password comes ONLY from the SITE_PASSWORD env var — no source fallback,
// so the shared secret is never committed. Set it in the Vercel project settings.
const PASSWORD = (typeof process !== 'undefined' && process.env?.SITE_PASSWORD) || '';

// Constant-time comparison so a wrong password can't be recovered char-by-char by
// timing the response (low risk over HTTPS for a shared secret, but cheap to do right).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default function middleware(request: Request) {
  // Fail closed if the gate isn't configured — never fall back to a known password.
  if (!PASSWORD) {
    return new Response('Site password not configured.', { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';

  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (safeEqual(password, PASSWORD)) {
        return; // authorized — let the request through
      }
    } catch {
      // fall through to challenge
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Visualizer Studio", charset="UTF-8"',
    },
  });
}
