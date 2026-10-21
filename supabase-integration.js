/* QSW Supabase integration. Requires supabase-config.js with URL + publishable key. */
(() => {
  'use strict';
  const cfg = window.QSW_SUPABASE_CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  if (!window.supabase || !cfg || !cfg.url || !cfg.publishableKey || /替换为|YOUR_|填入|REPLACE_WITH/.test(cfg.url + cfg.publishableKey)) {
    console.error('[QSW] Supabase config missing. Auth/database features are disabled.');
    return;
  }
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  // Remove legacy client-side admin flag; authorization is based only on the Supabase profile role.
  try { localStorage.removeItem('qsw_admin'); localStorage.removeItem('qsw-admin'); } catch (_) {}
  let session = null, profile = null, isAdmin = false, messages = [], projects = [];
  const originalProjectsMarkup = $('#projectsGrid')?.innerHTML || '';
  const toast = (msg) => { const el = $('#toast'); if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); } else alert(msg); };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const errText = (e) => e?.message || '请求失败，请稍后重试。';
  async function getIdentity() {
    const { data: { session: s }, error } = await db.auth.getSession();
    if (error) throw error;
    session = s;
    profile = null; isAdmin = false;
    if (session?.user) {
      const { data, error: pe } = await db.from('profiles').select('id,username,display_name,role').eq('id', session.user.id).maybeSingle();
      if (pe) throw pe;
      profile = data; isAdmin = data?.role === 'admin';
    }
  }
  function updateAccountUI() {
    const a = $('#accountLink');
    if (a) { a.textContent = session ? `退出登录（${profile?.username || session.user.email}）` : '注册 / 登录'; a.href = session ? '#message' : '#login'; }
    const nav = $('#adminNavLink'); if (nav) nav.hidden = !isAdmin;
    const oldAdmin = $('#adminLoginForm'); if (oldAdmin) oldAdmin.hidden = true;
    const dashboard = $('#adminDashboard'); if (dashboard) dashboard.hidden = !isAdmin;
    const privacy = document.querySelector('.privacy-note'); if (privacy) privacy.textContent = '账户与留言由 Supabase Auth 和数据库处理；请勿填写不必要的敏感个人信息。';
    const registerForm = $('#registerForm');
    const email = $('#regEmail'); if (email) { email.required = true; email.autocomplete = 'email'; }
    if (registerForm && session) { const submit = registerForm.querySelector('[type=submit]'); if (submit) submit.disabled = true; }
    if (registerForm && !session) { const submit = registerForm.querySelector('[type=submit]'); if (submit) submit.disabled = false; }
    if (isAdmin) loadAdminData().catch(e => toast('管理员数据读取失败：' + errText(e)));
  }
  async function loadMessages() {
    const { data, error } = await db.from('messages').select('id,user_id,display_name,category,content,status,created_at').order('created_at',{ascending:false});
    if (error) throw error;
    messages = data || [];
    const publicMessages = messages.filter(m => m.status === 'published' || (session && m.user_id === session.user.id));
    const list = $('#messageList'); if (list) {
      const count = $('#messageCount'); if (count) count.textContent = publicMessages.length;
      list.innerHTML = publicMessages.length ? publicMessages.map(m => `<article class="message-item"><div class="message-item-head"><div class="message-avatar">${esc((m.display_name||'?').slice(0,1).toUpperCase())}</div><div class="message-author"><b>${esc(m.display_name||'访客')}</b><small>${esc(new Date(m.created_at).toLocaleString('zh-CN'))}${m.status==='pending'?' · 待审核':''}</small></div><span class="message-type">${esc(m.category||'其他')}</span></div><p class="message-text">${esc(m.content)}</p></article>`).join('') : '<div class="empty-state">还没有公开留言。欢迎登录后分享想法。</div>';
    }
    const who = $('#messageUser'); if (who) who.textContent = session ? `当前登录：${profile?.username || session.user.email}` : '访客模式';
    const composer = $('#messageComposer'); if (composer) {
      if (session) {
        composer.innerHTML = `<form id="qswCloudComposer" class="composer-form"><div class="composer-top"><b>写下你的想法</b><span>新留言提交后需管理员审核</span></div><select id="qswMessageType" aria-label="留言类型"><option>鼓励支持</option><option>技术交流</option><option>建议反馈</option><option>其他</option></select><textarea id="qswMessageContent" maxlength="1000" required placeholder="分享你的想法（最多 1000 字）"></textarea><div class="composer-bottom"><small>请勿发布身份证号、电话等敏感信息</small><button class="btn btn-primary btn-small" type="submit">提交审核 →</button></div><p class="form-error" id="qswMessageError" role="alert"></p></form>`;
      } else composer.innerHTML = `<div class="composer-locked"><span class="lock-icon">⌑</span><div><b>登录后参与交流</b><p>留言将进入审核队列，审核通过后公开展示。</p></div><a class="btn btn-primary btn-small" href="#login">登录 / 注册</a></div>`;
    }
  }
  async function loadProjects() {
    const { data, error } = await db.from('projects').select('id,title,description,category,image_url,project_url,tags,sort_order,is_published').order('sort_order').order('created_at');
    if (error) throw error;
    projects = data || [];
    const grid = $('#projectsGrid'); if (!grid || !projects.length) return;
    const existing = originalProjectsMarkup;
    const dynamic = projects.map((p,i) => `<article class="project-card" data-category="${esc(p.category)}"><div class="project-art project-art-custom"><div class="custom-project-symbol">Q</div><span class="art-number">${String(i+1).padStart(2,'0')}</span></div><div class="project-info"><div class="project-meta"><span>${esc(p.category.toUpperCase())}</span><span>QSW PROJECT</span></div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="tag-row">${(p.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div>${p.project_url?`<a class="project-more" href="${esc(p.project_url)}" target="_blank" rel="noopener noreferrer">查看项目 ↗</a>`:''}</div></article>`).join('');
    grid.innerHTML = existing + dynamic;
  }
  async function loadAdminData() {
    if (!isAdmin) return;
    await loadMessages(); await loadProjects();
    const root = $('#adminMessageList');
    if (root) root.innerHTML = messages.map(m => `<article class="admin-message-row"><div><b>${esc(m.display_name||'访客')}</b><span>${esc(m.category)} · ${esc(new Date(m.created_at).toLocaleString('zh-CN'))} · ${esc(m.status)}</span><p>${esc(m.content)}</p></div><div class="admin-actions"><button class="btn btn-ghost btn-small" data-qsw-approve="${esc(m.id)}" ${m.status==='published'?'disabled':''}>通过</button><button class="btn btn-ghost btn-small" data-qsw-reject="${esc(m.id)}">拒绝</button><button class="btn btn-ghost btn-small" data-qsw-delete="${esc(m.id)}">删除</button></div></article>`).join('') || '<p class="admin-empty">暂无留言。</p>';
    const u = $('#adminUsersCount'); if (u) u.textContent = '—';
    const mc = $('#adminMessagesCount'); if (mc) mc.textContent = String(messages.length);
    const pc = $('#adminProjectsCount'); if (pc) pc.textContent = String(projects.length);
    const pRoot = $('#projectManagerList'); if (pRoot) pRoot.innerHTML = projects.map(p => `<article class="project-manager-row"><div class="project-manager-row-copy"><b>${esc(p.title)}</b><small>${esc(p.category)} · ${p.is_published?'已发布':'草稿'}</small></div><div class="project-manager-row-actions"><button class="btn btn-ghost btn-small" data-qsw-project-edit="${esc(p.id)}">编辑</button><button class="btn btn-ghost btn-small" data-qsw-project-delete="${esc(p.id)}">删除</button></div></article>`).join('') || '<p class="admin-empty">数据库暂无项目；添加项目可使用上方表单。</p>';
  }
  // Capture phase prevents legacy demo handlers from handling these forms.
  $('#registerForm')?.addEventListener('submit', async e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const errorEl = $('#registerError'); if (errorEl) errorEl.textContent = '';
    const username = $('#regUsername').value.trim(), displayName = $('#regName').value.trim(), email = $('#regEmail').value.trim(), password = $('#regPassword').value;
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(username)) { if(errorEl) errorEl.textContent='用户名须为 1–30 位字母、数字、下划线或连字符。'; return; }
    if (!email) { if(errorEl) errorEl.textContent='使用 Supabase Auth 注册需要填写有效邮箱。'; $('#regEmail')?.focus(); return; }
    if (password.length < 8) { if(errorEl) errorEl.textContent='为提高安全性，密码至少 8 位。'; $('#regPassword')?.focus(); return; }
    if (password !== $('#regConfirm').value) { if(errorEl) errorEl.textContent='两次输入的密码不一致。'; return; }
    try {
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { username, display_name: displayName } } });
      if (error) throw error;
      e.target.reset();
      if (data.session) { await getIdentity(); updateAccountUI(); await loadMessages(); toast('注册成功，已登录。'); location.hash='#message'; }
      else { if(errorEl) errorEl.textContent='注册请求已提交。请先到邮箱点击验证链接，再返回登录。'; toast('请检查邮箱完成验证'); }
    } catch (err) { if(errorEl) errorEl.textContent=errText(err); }
  }, true);
  $('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const errorEl=$('#loginError'); if(errorEl) errorEl.textContent='';
    const usernameOrEmail=$('#loginUsername').value.trim(), password=$('#loginPassword').value;
    // Supabase Auth authenticates by email. Keep username as an accepted email field label in this UI.
    try {
      const { data, error } = await db.auth.signInWithPassword({ email: usernameOrEmail, password });
      if (error) throw error;
      await getIdentity(); updateAccountUI(); await loadMessages(); e.target.reset(); toast('登录成功'); location.hash='#message';
    } catch(err) { if(errorEl) errorEl.textContent=errText(err); }
  }, true);
  $('#adminLoginForm')?.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); toast('请先使用普通登录表单登录，再由数据库中的 admin 角色授权管理后台。'); location.hash='#login'; }, true);
  $('#projectManagerForm')?.addEventListener('submit', async e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const status=$('#projectManagerStatus'); if(!isAdmin){if(status)status.textContent='当前账户没有管理员权限。';return;}
    const id=$('#managedProjectId').value.trim(), title=$('#managedProjectTitle').value.trim(), description=$('#managedProjectDescription').value.trim(), category=$('#managedProjectCategory').value, image_url=$('#managedProjectImage').value.trim(), project_url='', tags=$('#managedProjectTags').value.split(',').map(x=>x.trim()).filter(Boolean), sort_order=projects.length;
    if(!title||!description){if(status)status.textContent='项目名称和说明不能为空。';return;}
    const payload={title,description,category,image_url,project_url,tags,sort_order,is_published:true};
    try { const result = id ? await db.from('projects').update(payload).eq('id',id) : await db.from('projects').insert(payload); if(result.error)throw result.error; if(status)status.textContent='已保存到 Supabase 数据库。'; e.target.reset(); $('#managedProjectId').value=''; await loadAdminData(); await loadProjects(); toast('项目已保存'); }
    catch(err){if(status)status.textContent=errText(err);}
  }, true);
  document.addEventListener('click', async e => {
    const target=e.target.closest('[data-qsw-approve],[data-qsw-reject],[data-qsw-delete],[data-qsw-project-delete],[data-qsw-project-edit]'); if(!target)return;
    if(!isAdmin){toast('当前账户没有管理员权限');return;}
    try {
      if(target.dataset.qswApprove || target.dataset.qswReject || target.dataset.qswDelete){
        const id=target.dataset.qswApprove||target.dataset.qswReject||target.dataset.qswDelete;
        if(target.dataset.qswDelete){if(!confirm('确定永久删除这条留言吗？'))return;const r=await db.from('messages').delete().eq('id',id);if(r.error)throw r.error;}
        else {const r=await db.from('messages').update({status:target.dataset.qswApprove?'published':'rejected'}).eq('id',id);if(r.error)throw r.error;}
        await loadAdminData(); await loadMessages(); toast('留言管理已更新');
      } else if(target.dataset.qswProjectDelete){if(!confirm('确定删除该数据库项目吗？'))return;const r=await db.from('projects').delete().eq('id',target.dataset.qswProjectDelete);if(r.error)throw r.error;await loadAdminData();await loadProjects();toast('项目已删除');}
      else if(target.dataset.qswProjectEdit){const p=projects.find(x=>x.id===target.dataset.qswProjectEdit);if(!p)return;$('#managedProjectId').value=p.id;$('#managedProjectTitle').value=p.title;$('#managedProjectDescription').value=p.description;$('#managedProjectCategory').value=p.category;$('#managedProjectImage').value=p.image_url||'';$('#managedProjectTags').value=(p.tags||[]).join(', ');$('#projectManagerStatus').textContent='正在编辑数据库项目：'+p.title;}
    } catch(err){toast('操作失败：'+errText(err));}
  });
  document.addEventListener('submit', async e => {
    if (e.target?.id !== 'qswCloudComposer') return;
    e.preventDefault();
    const errorEl = $('#qswMessageError'); if (errorEl) errorEl.textContent = '';
    if (!session) { toast('请先登录后留言。'); location.hash='#login'; return; }
    const content = ($('#qswMessageContent')?.value || '').trim();
    if (!content || content.length > 1000) { if(errorEl) errorEl.textContent='留言不能为空，且最多 1000 字。'; return; }
    const payload = { user_id: session.user.id, display_name: profile?.display_name || profile?.username || session.user.email, category: $('#qswMessageType')?.value || '其他', content, status: 'pending' };
    try { const { error } = await db.from('messages').insert(payload); if(error) throw error; e.target.reset(); await loadMessages(); toast('留言已提交，审核通过后会公开显示。'); }
    catch(err) { if(errorEl) errorEl.textContent=errText(err); }
  });
    $('#accountLink')?.addEventListener('click', async e => { if(!session)return; e.preventDefault(); if(confirm('确定退出登录吗？')){await db.auth.signOut();session=null;profile=null;isAdmin=false;localStorage.removeItem('qsw_admin');updateAccountUI();await loadMessages();toast('已退出登录');location.hash='#home';} });
  db.auth.onAuthStateChange((_event, _session) => { setTimeout(async()=>{try{await getIdentity();updateAccountUI();await loadMessages();}catch(err){console.error('[QSW]',err);}},0); });
  (async()=>{try{await getIdentity(); updateAccountUI(); await loadMessages(); await loadProjects();}catch(err){console.error('[QSW] Supabase init failed:',err);toast('数据库连接失败，请检查项目 URL、公开密钥和 Supabase RLS 设置。');}})();
})();
