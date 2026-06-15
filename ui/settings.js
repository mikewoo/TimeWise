// --- Default domain lists (mirrors classifier.js) ---
const DEFAULTS = {
  productive: [
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
  ],
  distracted: [
    'twitter.com','x.com','reddit.com','weibo.com','tieba.baidu.com',
    'bilibili.com','youtube.com','tiktok.com','douyin.com',
    'douban.com','zhihu.com','instagram.com','facebook.com',
    'taobao.com','jd.com','amazon.com','pinduoduo.com',
    'netflix.com','iqiyi.com','v.qq.com'
  ]
};

const STORAGE_KEY = 'timewise_custom_domains';

let custom = { productive: [], distracted: [] };

// --- Init ---
(async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) custom = stored[STORAGE_KEY];
  renderAll();
  bindEvents();
})();

// --- Render ---
function renderAll() {
  renderList('prodList', custom.productive);
  renderList('distList', custom.distracted);
}

function renderList(listId, domains) {
  const el = document.getElementById(listId);
  if (domains.length === 0) {
    el.innerHTML = '<span class="tw-empty">(none — using built-in defaults only)</span>';
    return;
  }
  el.innerHTML = domains.map((d, i) => `
    <span class="tw-tag">
      ${escapeHtml(d)}
      <button data-list="${listId}" data-index="${i}" title="Remove">×</button>
    </span>
  `).join('');
}

// --- Events ---
function bindEvents() {
  setupInput('prodInput', 'prodAddBtn', 'productive');
  setupInput('distInput', 'distAddBtn', 'distracted');

  document.getElementById('resetBtn').addEventListener('click', async () => {
    custom = { productive: [], distracted: [] };
    await save();
    renderAll();
    toast('Reset to built-in defaults');
  });

  // Delegate tag remove clicks
  document.getElementById('prodList').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') removeDomain('productive', +e.target.dataset.index);
  });
  document.getElementById('distList').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') removeDomain('distracted', +e.target.dataset.index);
  });
}

function setupInput(inputId, btnId, listType) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);

  const add = async () => {
    const raw = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!raw || !raw.includes('.')) return;
    if (custom.productive.includes(raw) || custom.distracted.includes(raw)) {
      toast('Already in your list');
      return;
    }
    custom[listType].push(raw);
    await save();
    renderAll();
    input.value = '';
    input.focus();
  };

  btn.addEventListener('click', add);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
}

async function removeDomain(listType, index) {
  custom[listType].splice(index, 1);
  await save();
  renderAll();
}

async function save() {
  await chrome.storage.local.set({ [STORAGE_KEY]: custom });
}

// --- Toast ---
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'tw-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
