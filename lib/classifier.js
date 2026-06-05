// --- Built-in domain lists ---
const BUILTIN_PRODUCTIVE = new Set([
  'github.com','gitlab.com','bitbucket.org','stackoverflow.com','devdocs.io',
  'npmjs.com','pypi.org','codesandbox.io','codepen.io','observablehq.com',
  'localhost','127.0.0.1','vercel.com','netlify.com','heroku.com','supabase.com',
  'docker.com','visualstudio.com','colab.research.google.com',
  'docs.google.com','google.com','drive.google.com','mail.google.com',
  'calendar.google.com','meet.google.com',
  'notion.so','linear.app','jira.com','atlassian.net','confluence.com',
  'trello.com','asana.com','monday.com','clickup.com','basecamp.com',
  'figma.com','sketch.com','zeplin.io','canva.com','miro.com','excalidraw.com',
  'whimsical.com','tldraw.com','slack.com','teams.microsoft.com',
  'chatgpt.com','claude.ai','gemini.google.com','readthedocs.io','gitbook.io','mdbook.com',
  // --- Prototyping & design tools ---
  'modao.cc','pixso.cn','lanhuapp.com','axure.com','framer.com',
  'invisionapp.com','protopie.io','mockplus.cn','mockplus.com','webflow.com',
  'adobe.com','xd.adobe.com','spline.design','rive.app','lottiefiles.com',
  // --- Dev docs & language/framework sites ---
  'developer.mozilla.org','developer.android.com','developer.apple.com',
  'flutter.dev','dart.dev','reactjs.org','react.dev','vuejs.org','angular.io',
  'svelte.dev','nodejs.org','python.org','rust-lang.org','go.dev','kotlinlang.org',
  'tailwindcss.com','w3schools.com','web.dev','css-tricks.com','caniuse.com',
  'regex101.com','jsfiddle.net','replit.com','jsonformatter.org',
  // --- Cloud, hosting & backend dashboards ---
  'aws.amazon.com','console.cloud.google.com','portal.azure.com','cloudflare.com',
  'digitalocean.com','render.com','railway.app','fly.io','firebase.google.com',
  'stripe.com','dashboard.stripe.com','connect.stripe.com','cloudbase.net',
  // --- AI / ML dev ---
  'huggingface.co','kaggle.com','perplexity.ai','poe.com','cursor.com','cursor.sh',
  // --- Search engines (work lookups) ---
  'bing.com','duckduckgo.com','baidu.com','sogou.com','ecosia.org','startpage.com'
]);

const BUILTIN_DISTRACTED = new Set([
  'twitter.com','x.com','reddit.com','weibo.com','tieba.baidu.com',
  'bilibili.com','youtube.com','tiktok.com','douyin.com',
  'douban.com','zhihu.com','instagram.com','facebook.com',
  'taobao.com','jd.com','amazon.com','pinduoduo.com',
  'netflix.com','iqiyi.com','v.qq.com'
]);

// --- Custom domain cache (loaded from storage) ---
let customProductive = new Set();
let customDistracted = new Set();
let cacheLoaded = false;

const STORAGE_KEY = 'timewise_custom_domains';

/**
 * Load user's custom domains from chrome.storage.local.
 * Call once on service worker startup. Idempotent & fast.
 */
export async function loadCustomDomains() {
  if (cacheLoaded) return;
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const data = stored[STORAGE_KEY];
    if (data) {
      customProductive = new Set(data.productive || []);
      customDistracted = new Set(data.distracted || []);
    }
  } catch (_) { /* storage unavailable — use built-ins only */ }
  cacheLoaded = true;
}

// --- Public API ---

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Classify a domain.  Priority: custom > built-in productive > built-in distracted.
 * Returns 'productive', 'distracted', or null (unknown).
 */
export function classify(domain) {
  if (!domain) return null;

  // 1. Check custom overrides
  if (customProductive.has(domain)) return 'productive';
  if (customDistracted.has(domain)) return 'distracted';

  // 2. Check built-in exact match
  if (BUILTIN_PRODUCTIVE.has(domain)) return 'productive';
  if (BUILTIN_DISTRACTED.has(domain)) return 'distracted';

  // 3. Subdomain suffix match (e.g. mail.google.com → google.com)
  for (const prod of BUILTIN_PRODUCTIVE) {
    if (domain.endsWith('.' + prod)) return 'productive';
  }
  for (const prod of customProductive) {
    if (domain.endsWith('.' + prod)) return 'productive';
  }
  for (const dist of BUILTIN_DISTRACTED) {
    if (domain.endsWith('.' + dist)) return 'distracted';
  }
  for (const dist of customDistracted) {
    if (domain.endsWith('.' + dist)) return 'distracted';
  }

  return null;
}
