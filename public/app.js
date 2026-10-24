let currentAutomations = [];
let currentSettings = {};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  fetchStatus();
  fetchAutomations();
  fetchLogs();
  fetchSettings();
  lucide.createIcons();

  // Listen to scope dropdown in simulator
  const simScope = document.getElementById('simScopeSelect');
  if (simScope) {
    simScope.addEventListener('change', () => {
      const box = document.getElementById('simSpecificPostBox');
      if (simScope.value === 'specific_post') {
        box.classList.remove('hidden');
      } else {
        box.classList.add('hidden');
      }
    });
  }
});

// Tab Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-pink-500', 'text-pink-400', 'font-semibold');
    btn.classList.add('border-transparent', 'text-slate-400');
  });

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`tab-btn-${tabId}`);
  if (targetTab && targetBtn) {
    targetTab.classList.remove('hidden');
    targetBtn.classList.remove('border-transparent', 'text-slate-400');
    targetBtn.classList.add('border-pink-500', 'text-pink-400', 'font-semibold');
  }

  if (tabId === 'logs') fetchLogs();
  if (tabId === 'automations') fetchAutomations();
  lucide.createIcons();
}

// Fetch Status
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    document.getElementById('statActiveRules').textContent = data.active;
    document.getElementById('statMatches').textContent = data.matched;
    document.getElementById('rulesCountBadge').textContent = data.total;

    const badge = document.getElementById('modeBadge');
    if (data.mode === 'live') {
      badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-pink-500 animate-ping"></span><span>Live Meta API Connected</span>';
    } else {
      badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Sandbox Mode (Testing Safe)</span>';
    }
  } catch (e) {
    console.error('Status error:', e);
  }
}

// Fetch Automations
async function fetchAutomations() {
  try {
    const res = await fetch('/api/automations');
    const data = await res.json();
    currentAutomations = data.automations || [];
    renderAutomations(currentAutomations);
  } catch (e) {
    console.error('Automations error:', e);
  }
}

// Render Automations Cards
function renderAutomations(list) {
  const container = document.getElementById('automationsList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3 bg-slate-900/30">
        <i data-lucide="video" class="w-8 h-8 text-slate-600 mx-auto"></i>
        <h3 class="text-sm font-bold text-slate-200">No Reel or Post Automations Configured</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">Create an automation to instantly send links and DMs to followers commenting on your reels.</p>
        <button onclick="openCreateModal()" class="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-pink-600 text-white">Create Automation</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = list.map(item => {
    let scopeLabel = 'All Reels & Posts';
    if (item.post_scope === 'next_post') scopeLabel = 'Next Reel / Post';
    if (item.post_scope === 'specific_post') scopeLabel = 'Specific Reel';

    return `
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 space-y-4 hover:border-slate-700/80 transition-all shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-sm text-white tracking-tight">${escapeHtml(item.name)}</h3>
              ${item.active ? 
                '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>' : 
                '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">Paused</span>'
              }
              ${item.require_follow ? 
                '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1"><i data-lucide="lock" class="w-2.5 h-2.5"></i>Follow Gate</span>' : ''
              }
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-400">
              <span class="flex items-center gap-1 font-medium text-slate-300">
                <i data-lucide="film" class="w-3 h-3 text-pink-400"></i>
                <span>${scopeLabel}</span>
              </span>
              ${item.specific_post_url ? `<span class="font-mono text-slate-500 text-[10px] truncate max-w-[140px]">(${escapeHtml(item.specific_post_url)})</span>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button onclick="toggleAutomation(${item.id})" title="Toggle Active" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
              <i data-lucide="${item.active ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="editAutomation(${item.id})" title="Edit" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="deleteAutomation(${item.id})" title="Delete" class="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- Trigger Keywords & Exclusions -->
        <div class="space-y-1.5 bg-[#050811] p-3 rounded-2xl border border-slate-800/80 text-xs">
          <div class="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Trigger Keywords (${(item.trigger_keywords || []).length}):</span>
            ${item.keyword_type === 'any_comment' ? '<span class="text-pink-400 font-bold">Any Comment</span>' : '<span>Word Match</span>'}
          </div>
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            ${(item.trigger_keywords || []).map(k => `
              <span class="px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-300 font-mono text-[11px] border border-pink-500/20">${escapeHtml(k)}</span>
            `).join('')}
            ${(!item.trigger_keywords || item.trigger_keywords.length === 0) ? '<span class="text-slate-500 italic text-[11px]">Triggers on all comments</span>' : ''}
          </div>

          ${(item.excluded_keywords && item.excluded_keywords.length > 0) ? `
            <div class="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-slate-400">
              <span class="text-red-400 font-bold">⚠️ Excluded:</span>
              <span class="font-mono text-red-300/80 truncate">${item.excluded_keywords.join(', ')}</span>
            </div>
          ` : ''}
        </div>

        <!-- Actions Summary -->
        <div class="grid grid-cols-2 gap-2 text-xs pt-1">
          <div class="p-2.5 rounded-2xl bg-[#050811] border border-slate-800/80">
            <span class="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
              <i data-lucide="message-square" class="w-3 h-3 text-blue-400"></i>
              <span>Public Comment Reply</span>
            </span>
            <p class="text-slate-300 text-[11px] mt-1 font-medium truncate">
              ${item.public_reply_enabled ? `${(item.public_replies || []).length} rotating variations` : '<span class="text-slate-500">Disabled</span>'}
            </p>
          </div>

          <div class="p-2.5 rounded-2xl bg-[#050811] border border-slate-800/80">
            <span class="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
              <i data-lucide="send" class="w-3 h-3 text-purple-400"></i>
              <span>Direct Message</span>
            </span>
            <p class="text-slate-300 text-[11px] mt-1 font-medium truncate">
              ${item.dm_enabled ? (item.require_follow ? 'Follow-Locked DM' : `Delivery in ${item.dm_delay_seconds || 0}s`) : '<span class="text-slate-500">Disabled</span>'}
            </p>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Simulator Execution
async function runSimulation() {
  const username = document.getElementById('simUsername').value.trim() || 'alex_travels';
  const isFollowing = document.getElementById('simIsFollowing').checked;
  const scope = document.getElementById('simScopeSelect').value;
  const postId = (scope === 'specific_post') ? document.getElementById('simPostId').value.trim() : 'reel_sample_101';
  const comment = document.getElementById('simComment').value.trim();

  if (!comment) {
    alert('Please enter a follower comment to test.');
    return;
  }

  const btn = document.getElementById('btnRunSim');
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<span class="animate-spin mr-2">⚙️</span> Testing...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, postId, comment, isFollowing })
    });
    const data = await res.json();
    const evalResult = data.evaluation;

    // Update Phone Mockup Header
    document.getElementById('mockUsername').textContent = username;
    document.getElementById('mockUserInitial').textContent = username.charAt(0).toUpperCase();
    document.getElementById('mockCommentText').textContent = comment;

    // Update Follower Status Tag in Mockup
    const followerTag = document.getElementById('mockFollowerTag');
    if (isFollowing) {
      followerTag.textContent = 'Following';
      followerTag.className = 'text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold';
    } else {
      followerTag.textContent = 'Not Following';
      followerTag.className = 'text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold';
    }

    const badge = document.getElementById('simExecutionBadge');
    const replyBox = document.getElementById('mockReplyBox');
    const replyText = document.getElementById('mockReplyText');
    const dmContainer = document.getElementById('mockDmContainer');
    const dmText = document.getElementById('mockDmText');
    const dmDelayBadge = document.getElementById('mockDmDelayBadge');
    const followButtons = document.getElementById('mockFollowButtons');

    if (evalResult.matched) {
      replyBox.classList.remove('hidden');
      replyText.textContent = evalResult.publicReply || '(Public reply disabled)';
      dmText.textContent = evalResult.dmMessage || '(DM disabled)';

      if (evalResult.isFollowGate) {
        // Follow-Gate Active: Non-follower must follow first!
        badge.textContent = `Follow-Gate Active: User Must Follow`;
        badge.className = 'text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30';

        dmDelayBadge.textContent = 'Follow Check Sent 🔒';
        dmDelayBadge.className = 'text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono';

        dmContainer.className = 'max-w-[90%] rounded-2xl rounded-br-none bg-gradient-to-r from-purple-900 via-slate-900 to-purple-900 p-3.5 text-xs text-white shadow-md space-y-2.5 border border-purple-800/40';

        // Show follow action buttons
        followButtons.classList.remove('hidden');
      } else {
        // Unlocked Resource DM
        badge.textContent = `Matched: ${evalResult.automation.name}`;
        badge.className = 'text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

        dmDelayBadge.textContent = evalResult.delaySeconds ? `Sent in ${evalResult.delaySeconds}s` : 'Sent Instantly ⚡';
        dmDelayBadge.className = 'text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 font-mono';

        dmContainer.className = 'max-w-[90%] rounded-2xl rounded-br-none bg-gradient-to-r from-ig-purple via-[#a82582] to-ig-pink p-3.5 text-xs text-white shadow-md space-y-2.5';

        // Hide follow buttons
        followButtons.classList.add('hidden');
      }
    } else {
      const isExcluded = evalResult.reason && evalResult.reason.includes('excluded');
      badge.textContent = isExcluded ? 'Filtered by Excluded Keyword' : 'No Rule Matched';
      badge.className = isExcluded ? 
        'text-xs font-mono px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20' : 
        'text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';

      replyBox.classList.remove('hidden');
      replyText.textContent = isExcluded ? '⚠️ No public reply (comment contained negative keyword filter).' : '— No public reply triggered —';
      dmText.textContent = isExcluded ? '⚠️ No DM dispatched (negative keyword filter blocked execution).' : '— No Direct Message triggered —';
      dmDelayBadge.textContent = 'Blocked / Skipped';
      dmDelayBadge.className = 'text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-mono';
      followButtons.classList.add('hidden');
    }

    fetchStatus();
  } catch (e) {
    alert('Simulation failed: ' + e.message);
  } finally {
    btn.innerHTML = origHtml;
    btn.disabled = false;
  }
}

// Preset helper
function testPreset(commentText, isFollowing) {
  document.getElementById('simComment').value = commentText;
  document.getElementById('simIsFollowing').checked = isFollowing;
  runSimulation();
}

// Simulated Follow confirmation button click inside the mockup
function confirmFollowSim() {
  document.getElementById('simIsFollowing').checked = true;
  runSimulation();
}

// Activity Logs
async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    const logs = data.logs || [];
    document.getElementById('logsCountBadge').textContent = logs.length;

    const tbody = document.getElementById('logsTableBody');
    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-slate-500 font-sans">
            No comment activity logged yet. Test a comment in the Reels Simulator!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const isSuccess = l.status === 'success';
      const isFollowGate = l.status === 'follow_gate';

      let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-500">Ignored</span>`;
      if (isSuccess) {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Unlocked DM</span>`;
      } else if (isFollowGate) {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">Follow Gate</span>`;
      }

      return `
        <tr class="hover:bg-slate-900/40 transition-colors">
          <td class="px-4 py-3 text-slate-400 whitespace-nowrap">${formatDate(l.timestamp)}</td>
          <td class="px-4 py-3 text-white font-bold">@${escapeHtml(l.username)}</td>
          <td class="px-4 py-3 text-slate-300 font-sans max-w-xs truncate" title="${escapeHtml(l.comment_text)}">${escapeHtml(l.comment_text)}</td>
          <td class="px-4 py-3 whitespace-nowrap font-sans">
            <span class="${isSuccess ? 'text-emerald-400 font-semibold' : (isFollowGate ? 'text-purple-300 font-semibold' : 'text-slate-500')}">${escapeHtml(l.rule_name || 'None')}</span>
          </td>
          <td class="px-4 py-3 text-slate-400 font-sans max-w-xs truncate" title="${escapeHtml(l.public_reply)}">${escapeHtml(l.public_reply || '—')}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error('Logs error:', e);
  }
}

async function clearLogs() {
  if (!confirm('Clear all activity logs?')) return;
  await fetch('/api/logs', { method: 'DELETE' });
  fetchLogs();
  fetchStatus();
}

// Settings
async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    currentSettings = data.settings || {};

    document.getElementById('settingToken').value = currentSettings.page_access_token || '';
    document.getElementById('settingVerifyToken').value = currentSettings.webhook_verify_token || '';

    const isLive = currentSettings.mode === 'live';
    const toggle = document.getElementById('settingModeToggle');
    const label = document.getElementById('settingModeLabel');
    toggle.checked = isLive;
    label.textContent = isLive ? 'Live Mode (Real Instagram)' : 'Sandbox Mode';
    label.className = isLive ? 'text-xs font-semibold text-pink-400' : 'text-xs font-semibold text-emerald-400';
  } catch (e) {
    console.error('Settings error:', e);
  }
}

async function toggleMode() {
  const toggle = document.getElementById('settingModeToggle');
  const newMode = toggle.checked ? 'live' : 'sandbox';
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: newMode })
  });
  fetchSettings();
  fetchStatus();
}

async function saveSettings() {
  const token = document.getElementById('settingToken').value.trim();
  const verifyToken = document.getElementById('settingVerifyToken').value.trim();

  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_access_token: token, webhook_verify_token: verifyToken })
  });

  alert('Meta API configuration saved!');
  fetchSettings();
}

function copyWebhookUrl() {
  const el = document.getElementById('settingWebhookUrl');
  navigator.clipboard.writeText(el.value);
  alert('Webhook URL copied: ' + el.value);
}

// Multi-Step Modal Builder
function openCreateModal() {
  document.getElementById('modalTitle').textContent = 'Configure Reel / Post Comment Automation';
  document.getElementById('ruleId').value = '';
  document.getElementById('ruleName').value = '';
  
  // Scope
  document.querySelector('input[name="post_scope"][value="any_post_or_reel"]').checked = true;
  document.getElementById('specificPostUrlBox').classList.add('hidden');
  document.getElementById('rulePostUrl').value = '';

  // Keywords
  document.getElementById('ruleKeywordType').value = 'specific';
  document.getElementById('triggerKeywordsBox').classList.remove('hidden');
  document.getElementById('ruleTriggerKeywords').value = 'link, guide, send, info, access';
  document.getElementById('ruleExcludedKeywords').value = 'scam, fake, hate, refund, bot';

  // Follow Gate
  document.getElementById('ruleRequireFollow').checked = false;
  handleFollowGateToggle();
  document.getElementById('ruleFollowCheckMessage').value = 'Hey {username}! 👋 One quick step before we unlock your link:\n\nFollow our Instagram profile, then tap "I am following" below to receive your instant access! 🚀';
  document.getElementById('ruleFollowCheckPublicReply').value = 'Please follow our profile first and check your DMs to unlock the link! 🔒✨';

  // Public Reply
  document.getElementById('rulePublicEnabled').checked = true;
  document.getElementById('ruleTagUser').checked = true;
  document.getElementById('rulePublicReplies').value = 'Check your DMs! 📩\nSent you the details directly in inbox! 🚀\nJust sent it to your DMs ✨';

  // DM
  document.getElementById('ruleDmEnabled').checked = true;
  document.getElementById('ruleDmMessage').value = 'Hey {username}! Here is the direct link from the reel: https://yourbrand.com/access 🚀\n\nLet me know if you have any questions!';
  document.getElementById('ruleDmDelay').value = '0';

  document.getElementById('ruleModal').classList.remove('hidden');
}

function editAutomation(id) {
  const item = currentAutomations.find(a => a.id === id);
  if (!item) return;

  document.getElementById('modalTitle').textContent = 'Edit Reel / Post Automation';
  document.getElementById('ruleId').value = item.id;
  document.getElementById('ruleName').value = item.name || '';

  // Scope
  const scopeRadio = document.querySelector(`input[name="post_scope"][value="${item.post_scope}"]`);
  if (scopeRadio) scopeRadio.checked = true;
  handleScopeRadio();
  document.getElementById('rulePostUrl').value = item.specific_post_url || '';

  // Keywords
  document.getElementById('ruleKeywordType').value = item.keyword_type || 'specific';
  handleKeywordType();
  document.getElementById('ruleTriggerKeywords').value = (item.trigger_keywords || []).join(', ');
  document.getElementById('ruleExcludedKeywords').value = (item.excluded_keywords || []).join(', ');

  // Follow Gate
  document.getElementById('ruleRequireFollow').checked = Boolean(item.require_follow);
  handleFollowGateToggle();
  document.getElementById('ruleFollowCheckMessage').value = item.follow_check_message || '';
  document.getElementById('ruleFollowCheckPublicReply').value = item.follow_check_public_reply || '';

  // Public Reply
  document.getElementById('rulePublicEnabled').checked = Boolean(item.public_reply_enabled);
  document.getElementById('ruleTagUser').checked = Boolean(item.tag_user);
  document.getElementById('rulePublicReplies').value = (item.public_replies || []).join('\n');

  // DM
  document.getElementById('ruleDmEnabled').checked = Boolean(item.dm_enabled);
  document.getElementById('ruleDmMessage').value = item.dm_message || '';
  document.getElementById('ruleDmDelay').value = String(item.dm_delay_seconds || 0);

  document.getElementById('ruleModal').classList.remove('hidden');
}

function handleFollowGateToggle() {
  const isChecked = document.getElementById('ruleRequireFollow').checked;
  const box = document.getElementById('followGateConfigBox');
  if (isChecked) {
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
}

function handleScopeRadio() {
  const selected = document.querySelector('input[name="post_scope"]:checked').value;
  const box = document.getElementById('specificPostUrlBox');
  if (selected === 'specific_post') {
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
}

function handleKeywordType() {
  const type = document.getElementById('ruleKeywordType').value;
  const box = document.getElementById('triggerKeywordsBox');
  if (type === 'any_comment') {
    box.classList.add('hidden');
  } else {
    box.classList.remove('hidden');
  }
}

function closeModal() {
  document.getElementById('ruleModal').classList.add('hidden');
}

async function saveAutomation() {
  const id = document.getElementById('ruleId').value;
  const name = document.getElementById('ruleName').value.trim();
  if (!name) {
    alert('Please enter an Automation Title.');
    return;
  }

  const post_scope = document.querySelector('input[name="post_scope"]:checked').value;
  const specific_post_url = document.getElementById('rulePostUrl').value.trim();
  const keyword_type = document.getElementById('ruleKeywordType').value;

  const trigger_keywords = document.getElementById('ruleTriggerKeywords').value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const excluded_keywords = document.getElementById('ruleExcludedKeywords').value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const public_replies = document.getElementById('rulePublicReplies').value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const payload = {
    name,
    post_scope,
    specific_post_url,
    keyword_type,
    trigger_keywords,
    excluded_keywords,
    require_follow: document.getElementById('ruleRequireFollow').checked,
    follow_check_message: document.getElementById('ruleFollowCheckMessage').value.trim(),
    follow_check_public_reply: document.getElementById('ruleFollowCheckPublicReply').value.trim(),
    public_reply_enabled: document.getElementById('rulePublicEnabled').checked,
    tag_user: document.getElementById('ruleTagUser').checked,
    public_replies,
    dm_enabled: document.getElementById('ruleDmEnabled').checked,
    dm_message: document.getElementById('ruleDmMessage').value.trim(),
    dm_delay_seconds: parseInt(document.getElementById('ruleDmDelay').value, 10) || 0
  };

  const url = id ? `/api/automations/${id}` : '/api/automations';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeModal();
      fetchAutomations();
      fetchStatus();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  } catch (e) {
    alert('Failed to save automation: ' + e.message);
  }
}

async function toggleAutomation(id) {
  await fetch(`/api/automations/${id}/toggle`, { method: 'POST' });
  fetchAutomations();
  fetchStatus();
}

async function deleteAutomation(id) {
  if (!confirm('Are you sure you want to delete this automation?')) return;
  await fetch(`/api/automations/${id}`, { method: 'DELETE' });
  fetchAutomations();
  fetchStatus();
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
