(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const KEYS = {users:'qswUsers', current:'qswCurrentUser', messages:'qswMessages', theme:'qswBomTheme', visits:'qswVisitCount', content:'qswSiteContent', admin:'qswAdminSession'};
  let toastTimer;
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
  function safeParse(value, fallback){try{return value?JSON.parse(value):fallback}catch{return fallback}}
  function getUsers(){const v=safeParse(localStorage.getItem(KEYS.users),[]);if(Array.isArray(v))return v;if(v&&typeof v==='object')return Object.entries(v).map(([username,user])=>({...user,username:user.username||username}));return []}
  function saveUsers(users){const map={};users.forEach(user=>{map[user.username]=user});localStorage.setItem(KEYS.users,JSON.stringify(map));refreshAdminStats()}
  function getMessages(){const v=safeParse(localStorage.getItem(KEYS.messages),null);if(Array.isArray(v))return v.map((m,i)=>({...m,id:m.id||`legacy-${i}-${String(m.time||'').replace(/\W/g,'')}`,username:m.username||m.name||'访客',type:String(m.type||'其他').replace(/^留言类型：/, '')}));const initial=[{id:'sample-1',username:'小明',type:'鼓励支持',content:'QSW你好！你的个人主页设计得很棒，内容丰富，加油！',time:'2026-09-22T10:00:00'},{id:'sample-2',username:'红领巾',type:'技术交流',content:'技能展示那块做得很清晰，学习了！期待更多作品。',time:'2026-09-21T15:30:00'}];localStorage.setItem(KEYS.messages,JSON.stringify(initial));return initial}
  function currentUser(){const name=localStorage.getItem(KEYS.current);return name&&getUsers().some(u=>u.username===name)?name:null}
  function setCurrent(name){if(name)localStorage.setItem(KEYS.current,name);else localStorage.removeItem(KEYS.current);renderAccount();renderMessages()}
  function renderAccount(){const name=currentUser();const link=$('#accountLink');if(name){link.textContent=`${name} · 退出`;link.href='#message';link.onclick=e=>{e.preventDefault();setCurrent(null);toast('已退出登录')}}else{link.textContent='注册 / 登录';link.href='#register';link.onclick=null}const user=$('#messageUser');if(user)user.textContent=name?`当前登录：${name}`:'访客模式'}
  const pages=['home','skills','projects','journey','hobbies','register','login','message','admin'];
  const revealSelector='.page-hero,.hero-copy,.hero-visual,.stat-card,.section-heading,.feature-card,.quote-panel,.skill-card,.project-card,.education-card,.timeline-item,.journey-aside,.hobby-card,.form-card,.form-aside,.login-art,.message-toolbar,.composer-card,.message-aside,.admin-toolbar,.admin-messages';
  let revealObserver=null;
  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.body.classList.add('reveal-enabled');
    revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -28px 0px'});
  }
  function observeReveals(page=$('.page.active')){
    if(!revealObserver||!page)return;
    $$(revealSelector,page).forEach((el,index)=>{if(el.dataset.revealReady)return;el.dataset.revealReady='1';el.classList.add('js-reveal');const parent=el.parentElement;if(parent&&(/grid/.test(parent.className)||parent.classList.contains('timeline'))){const siblings=$$(revealSelector,parent);el.style.setProperty('--reveal-delay',`${Math.min(siblings.indexOf(el),5)*65}ms`)}revealObserver.observe(el)});
  }
  function navigate(){let page=location.hash.replace('#','')||'home';if(!pages.includes(page))page='home';$$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page));$$('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===page));$('#nav').classList.remove('open');window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});observeReveals($('.page.active'));if(page==='message')renderMessages();if(page==='register')$('#registerError').textContent='';if(page==='login')$('#loginError').textContent='';if(page==='admin')renderAdminState();refreshInlineEdit()}
  window.addEventListener('hashchange',navigate);$('#menuBtn').addEventListener('click',()=>$('#nav').classList.toggle('open'));
  function getThemeMode(){const mode=localStorage.getItem(KEYS.theme)||'auto';return ['auto','light','dark'].includes(mode)?mode:'auto'}
  function applyTheme(){const mode=getThemeMode();const light=mode==='light'||(mode==='auto'&&new Date().getHours()>=7&&new Date().getHours()<19);document.body.classList.toggle('light',light);const btn=$('#themeToggle');if(btn){btn.textContent=mode==='auto'?'◐':light?'☾':'☼';btn.title=mode==='auto'?'主题模式：自动（按本地时间切换）':mode==='light'?'主题模式：日间（点击切换）':'主题模式：夜间（点击切换）';btn.setAttribute('aria-label',btn.title)}}
  $('#themeToggle').addEventListener('click',()=>{const next={auto:'light',light:'dark',dark:'auto'}[getThemeMode()]||'auto';localStorage.setItem(KEYS.theme,next);applyTheme();toast(next==='auto'?'已切换为自动日夜模式':next==='light'?'已切换为日间模式':'已切换为夜间模式')});applyTheme();setInterval(()=>{if(getThemeMode()==='auto')applyTheme()},60000);
  const backToTop=$('#backToTop');function updateBackToTop(){backToTop.classList.toggle('visible',window.scrollY>320)}window.addEventListener('scroll',updateBackToTop,{passive:true});backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));updateBackToTop();
  window.addEventListener('storage',e=>{if([KEYS.theme,KEYS.users,KEYS.current,KEYS.messages,KEYS.content].includes(e.key)){if(e.key===KEYS.theme)applyTheme();if(e.key===KEYS.content){applySiteContent();refreshInlineEdit()}renderAccount();renderMessages();if(typeof refreshAdminStats==='function')refreshAdminStats();if(localStorage.getItem(KEYS.admin)==='1'&&typeof renderAdminMessages==='function')renderAdminMessages()}});
  const visits=Number(localStorage.getItem(KEYS.visits)||0)+1;localStorage.setItem(KEYS.visits,String(visits));$('#visitCount').textContent=visits.toLocaleString();const started=Date.now();setInterval(()=>{const sec=Math.floor((Date.now()-started)/1000);$('#visitDuration').textContent=sec<60?`${sec} 秒钟`:`${Math.floor(sec/60)} 分 ${sec%60} 秒`},1000);$('#year').textContent=new Date().getFullYear();
  const addressData={
    '北京市':{'北京市':['东城区','西城区','朝阳区','海淀区','丰台区','石景山区','通州区','昌平区']},
    '上海市':{'上海市':['黄浦区','徐汇区','长宁区','静安区','普陀区','虹口区','杨浦区','浦东新区']},
    '天津市':{'天津市':['和平区','河东区','河西区','南开区','河北区','红桥区','滨海新区']},
    '重庆市':{'重庆市':['渝中区','江北区','南岸区','沙坪坝区','九龙坡区','渝北区','巴南区']},
    '江苏省':{'南京市':['玄武区','秦淮区','建邺区','鼓楼区','浦口区','栖霞区','雨花台区','江宁区'],'苏州市':['姑苏区','虎丘区','吴中区','相城区','吴江区'],'无锡市':['梁溪区','锡山区','惠山区','滨湖区','新吴区'],'常州市':['天宁区','钟楼区','新北区','武进区']},
    '浙江省':{'杭州市':['上城区','拱墅区','西湖区','滨江区','萧山区','余杭区'],'宁波市':['海曙区','江北区','镇海区','鄞州区'],'温州市':['鹿城区','龙湾区','瓯海区']},
    '广东省':{'广州市':['越秀区','海珠区','荔湾区','天河区','白云区','番禺区'],'深圳市':['福田区','罗湖区','南山区','宝安区','龙岗区','龙华区'],'佛山市':['禅城区','南海区','顺德区']},
    '四川省':{'成都市':['锦江区','青羊区','金牛区','武侯区','成华区','高新区'],'绵阳市':['涪城区','游仙区','安州区']},
    '湖北省':{'武汉市':['江岸区','江汉区','硚口区','汉阳区','武昌区','洪山区'],'宜昌市':['西陵区','伍家岗区','点军区']},
    '山东省':{'济南市':['历下区','市中区','槐荫区','天桥区','历城区'],'青岛市':['市南区','市北区','李沧区','崂山区']},
    '河南省':{'郑州市':['中原区','二七区','金水区','管城回族区','郑东新区'],'洛阳市':['老城区','西工区','涧西区']},
    '湖南省':{'长沙市':['芙蓉区','天心区','岳麓区','开福区','雨花区'],'株洲市':['荷塘区','芦淞区','石峰区']},
    '陕西省':{'西安市':['新城区','碑林区','莲湖区','雁塔区','未央区','长安区']},
    '福建省':{'福州市':['鼓楼区','台江区','仓山区','晋安区'],'厦门市':['思明区','海沧区','湖里区','集美区']},
    '辽宁省':{'沈阳市':['和平区','沈河区','皇姑区','大东区','铁西区'],'大连市':['中山区','西岗区','沙河口区','甘井子区']},
    '云南省':{'昆明市':['五华区','盘龙区','官渡区','西山区','呈贡区']},
    '黑龙江省':{'哈尔滨市':['道里区','南岗区','道外区','香坊区','松北区']},
    '安徽省':{'合肥市':['瑶海区','庐阳区','蜀山区','包河区'],'芜湖市':['镜湖区','弋江区','鸠江区']},
    '江西省':{'南昌市':['东湖区','西湖区','青云谱区','青山湖区']},
    '河北省':{'石家庄市':['长安区','桥西区','新华区','裕华区'],'唐山市':['路南区','路北区','开平区']},
    '广西壮族自治区':{'南宁市':['青秀区','兴宁区','江南区','西乡塘区'],'桂林市':['秀峰区','叠彩区','象山区']},
    '海南省':{'海口市':['秀英区','龙华区','琼山区','美兰区']},
    '贵州省':{'贵阳市':['南明区','云岩区','花溪区','观山湖区']},
    '甘肃省':{'兰州市':['城关区','七里河区','西固区','安宁区']},
    '吉林省':{'长春市':['南关区','宽城区','朝阳区','二道区']},
    '内蒙古自治区':{'呼和浩特市':['新城区','回民区','玉泉区','赛罕区']},
    '宁夏回族自治区':{'银川市':['兴庆区','西夏区','金凤区']},
    '青海省':{'西宁市':['城东区','城中区','城西区','城北区']},
    '新疆维吾尔自治区':{'乌鲁木齐市':['天山区','沙依巴克区','新市区','水磨沟区']},
    '西藏自治区':{'拉萨市':['城关区','堆龙德庆区','达孜区']},
    '台湾省':{'台北市':['中正区','大同区','中山区','松山区']},
    '香港特别行政区':{'香港岛':['中西区','湾仔区','东区','南区']},
    '澳门特别行政区':{'澳门半岛':['花地玛堂区','圣安多尼堂区','大堂区','望德堂区']}
  };
  const province=$('#province'),city=$('#city'),district=$('#district');Object.keys(addressData).forEach(p=>province.add(new Option(p,p)));
  province.addEventListener('change',()=>{city.replaceChildren(new Option('请选择城市',''));district.replaceChildren(new Option('请先选择城市',''));city.disabled=!province.value;district.disabled=true;if(province.value)Object.keys(addressData[province.value]).forEach(c=>city.add(new Option(c,c)))});
  city.addEventListener('change',()=>{district.replaceChildren(new Option('请选择城区 / 区县',''));district.disabled=!city.value;if(city.value)(addressData[province.value][city.value]||[]).forEach(d=>district.add(new Option(d,d)))});
  function validIdCard(value){const id=value.trim().toUpperCase();if(!/^\d{17}[\dX]$/.test(id))return false;const y=+id.slice(6,10),m=+id.slice(10,12),d=+id.slice(12,14),date=new Date(y,m-1,d);if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d||y<1900||date>new Date())return false;const weights=[7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2],codes=['1','0','X','9','8','7','6','5','4','3','2'];let sum=0;for(let i=0;i<17;i++)sum+=Number(id[i])*weights[i];return codes[sum%11]===id[17]}
  function showFormError(id,message,focus){$(id).textContent=message;if(focus)focus.focus()}
  $('#registerForm').addEventListener('submit',e=>{e.preventDefault();const err=$('#registerError');err.textContent='';$$('.field input,.field select').forEach(x=>x.classList.remove('invalid'));const username=$('#regUsername').value.trim(),name=$('#regName').value.trim(),password=$('#regPassword').value,confirm=$('#regConfirm').value,phone=$('#regPhone').value.trim(),email=$('#regEmail').value.trim(),zip=$('#regZip').value.trim(),id=$('#regId').value.trim().toUpperCase();const fields=[['#regUsername',username],['#regName',name],['#regPassword',password],['#regConfirm',confirm],['#province',province.value],['#city',city.value],['#district',district.value],['#regAddress',$('#regAddress').value.trim()],['#regPhone',phone],['#regId',id],['#regQuestion',$('#regQuestion').value],['#regAnswer',$('#regAnswer').value.trim()]];const missing=fields.find(([selector,value])=>!value);if(missing){$(missing[0]).classList.add('invalid');showFormError('#registerError','请完整填写所有必填项目。',$(missing[0]));return}if(!/^[A-Za-z0-9_-]{1,16}$/.test(username)){showFormError('#registerError','用户名需为 1–16 位字母、数字、下划线或连字符。',$('#regUsername'));return}if(password.length<1||password.length>12){showFormError('#registerError','密码长度需为 1–12 个字符。',$('#regPassword'));return}if(password!==confirm){$('#regConfirm').classList.add('invalid');showFormError('#registerError','两次输入的密码不一致。',$('#regConfirm'));return}if(name.length>30||$('#regAddress').value.trim().length>120){showFormError('#registerError','姓名或详细地址长度超出限制。');return}if(zip&&!/^\d{6}$/.test(zip)){showFormError('#registerError','邮政编码应为 6 位数字。',$('#regZip'));return}if(!/^1\d{10}$/.test(phone)&&!/^\+?[0-9()\- ]{7,20}$/.test(phone)){showFormError('#registerError','请输入有效的联系电话。',$('#regPhone'));return}if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showFormError('#registerError','邮箱格式不正确。',$('#regEmail'));return}if(!validIdCard(id)){showFormError('#registerError','身份证号码格式、出生日期或校验码不正确。',$('#regId'));return}const users=getUsers();if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){showFormError('#registerError','该用户名已存在，请换一个用户名。',$('#regUsername'));return}const user={username,name,password,province:province.value,city:city.value,district:district.value,address:$('#regAddress').value.trim(),zip,phone,email,idCard:id,question:$('#regQuestion').value,answer:$('#regAnswer').value.trim(),createdAt:new Date().toISOString()};users.push(user);saveUsers(users);setCurrent(username);e.target.reset();city.disabled=true;district.disabled=true;toast('注册成功，已为你登录');location.hash='#message'});
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();const username=$('#loginUsername').value.trim(),password=$('#loginPassword').value;const user=getUsers().find(u=>u.username===username&&u.password===password);if(!user){showFormError('#loginError','用户名或密码不正确，请检查后重试。');return}setCurrent(user.username);e.target.reset();toast(`欢迎回来，${user.username}`);location.hash='#message'});
  function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '时间未知';return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}
  function renderMessages(){const list=$('#messageList');if(!list)return;const messages=getMessages().slice().sort((a,b)=>new Date(b.time)-new Date(a.time));$('#messageCount').textContent=messages.length;const user=currentUser();$('#messageUser').textContent=user?`当前登录：${user}`:'访客模式';const composer=$('#messageComposer');if(user){composer.innerHTML=`<form id="composerForm" class="composer-form"><div class="composer-top"><b>写下你的想法</b><span>以友善交流为前提</span></div><select id="messageType" aria-label="留言类型"><option>鼓励支持</option><option>技术交流</option><option>建议反馈</option><option>其他</option></select><textarea id="messageContent" maxlength="1000" required placeholder="分享你的想法、建议或问题（最多 1000 字）"></textarea><div class="composer-bottom"><small><span id="charCount">0</span> / 1000 字</small><button class="btn btn-primary btn-small" type="submit">发布留言 <span>→</span></button></div><p class="form-error" id="messageError"></p></form>`;$('#messageContent').addEventListener('input',()=>$('#charCount').textContent=$('#messageContent').value.length);$('#composerForm').addEventListener('submit',e=>{e.preventDefault();const content=$('#messageContent').value.trim();if(!content){$('#messageError').textContent='留言内容不能为空。';return}const items=getMessages();items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random(),username:user,type:$('#messageType').value,content,time:new Date().toISOString()});localStorage.setItem(KEYS.messages,JSON.stringify(items));renderMessages();toast('留言发布成功');});}else{composer.innerHTML=`<div class="composer-locked"><span class="lock-icon">⌑</span><div><b>登录后参与交流</b><p>留言板仅对已注册并登录的访客开放。</p></div><a class="btn btn-primary btn-small" href="#login">登录 / 注册</a></div>`}
    if(!messages.length){list.innerHTML='<div class="empty-state"><span>✳</span>还没有留言，成为第一个分享想法的人吧。</div>';return}list.innerHTML=messages.map(m=>{const own=user&&m.username===user;return `<article class="message-item"><div class="message-item-head"><div class="message-avatar">${escapeHtml((m.username||'?').slice(0,1).toUpperCase())}</div><div class="message-author"><b>${escapeHtml(m.username||'访客')}</b><small>${escapeHtml(formatDate(m.time))}</small></div><span class="message-type">${escapeHtml(m.type||'其他')}</span>${own?'<button class="message-delete" data-delete="'+escapeHtml(m.id)+'" aria-label="删除自己的留言">删除</button>':''}</div><p class="message-text">${escapeHtml(m.content||'')}</p></article>`}).join('');$$('[data-delete]',list).forEach(btn=>btn.addEventListener('click',()=>{if(!confirm('确定删除这条留言吗？'))return;const id=btn.dataset.delete;localStorage.setItem(KEYS.messages,JSON.stringify(getMessages().filter(m=>m.id!==id)));renderMessages();toast('留言已删除')}))}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function setupFilters(root){const buttons=$$('[data-filter]',root);buttons.forEach(btn=>btn.addEventListener('click',()=>{buttons.forEach(b=>b.classList.toggle('active',b===btn));const filter=btn.dataset.filter;const container=root.id==='skillFilters'?'#skillsGrid':'#projectsGrid';$$('[data-category]',$(container)).forEach(card=>card.hidden=filter!=='all'&&card.dataset.category!==filter)}))}setupFilters($('#skillFilters'));setupFilters($('#projectFilters'));
  const projectDetails={portfolio:{title:'个人简介网站',body:'<p>围绕个人展示建立统一的信息架构，包含个人介绍、技能熟练度、项目经历、成长时间线、兴趣生活、注册与留言模块。</p><ul><li>使用响应式布局适配桌面与移动设备。</li><li>通过 JavaScript 实现导航、筛选、表单校验和留言交互。</li><li>演示版数据保存在浏览器 localStorage。</li></ul>'},weather:{title:'移动端天气应用',body:'<p>一个以移动端体验为核心的天气应用概念，重点关注天气摘要、城市信息与关键信息的视觉层级。</p><ul><li>原项目记录技术方向：Vue.js、API、响应式布局。</li><li>当前卡片为视觉概念展示，不连接实时天气 API。</li></ul>'},shop:{title:'电商商品展示页',body:'<p>通过商品卡片、留白和统一的视觉元素呈现商品信息，探索视觉设计与 Web 布局的结合。</p><ul><li>原项目记录技术方向：HTML、CSS3。</li><li>本网站中展示的是概念视觉，不是完整电商系统。</li></ul>'},data:{title:'数据可视化探索',body:'<p>探索用图表表达趋势和差异，通过颜色、大小与布局让数据更容易理解。</p><ul><li>目前是静态示意图，用于呈现项目方向。</li><li>后续可接入真实数据源和图表库实现动态可视化。</li></ul>'}};
  const dialog=$('#projectDialog');$$('[data-project]').forEach(btn=>btn.addEventListener('click',()=>{const d=projectDetails[btn.dataset.project]||{title:btn.closest('.project-card')?.querySelector('h3')?.textContent||'项目详情',body:`<p>${escapeHtml(btn.closest('.project-card')?.querySelector('.project-info > p')?.textContent||'项目介绍')}</p>`};$('#dialogTitle').textContent=d.title;$('#dialogBody').innerHTML=d.body;if(dialog.showModal)dialog.showModal();else toast(d.title)}));$('#dialogClose').addEventListener('click',()=>dialog.close());$('#dialogOk').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  const PROJECTS_KEY='qswPortfolioProjects';
  const projectGrid=$('#projectsGrid');
  const originalProjectArts={};
  $$('.project-card',projectGrid).forEach(card=>{const key=card.querySelector('.project-art')?.className.split(/\s+/).find(c=>c.startsWith('art-'))||'custom';originalProjectArts[key]=card.querySelector('.project-art')?.innerHTML||''});
  let projectUndoStack=[];
  const projectDefaults=()=> $$('.project-card',projectGrid).map((card,i)=>({id:card.querySelector('[data-project]')?.dataset.project||`project-${i+1}`,category:card.dataset.category||'web',title:card.querySelector('h3')?.textContent.trim()||`项目 ${i+1}`,description:card.querySelector('.project-info > p')?.textContent.trim()||'',meta:card.querySelector('.project-meta span:last-child')?.textContent.trim()||'',metaLabel:card.querySelector('.project-meta span:first-child')?.textContent.trim()||'PROJECT',tags:$$('.tag-row span',card).map(t=>t.textContent.trim()),imageUrl:'',artKey:card.querySelector('.project-art')?.className.split(/\s+/).find(c=>c.startsWith('art-'))||'custom'}));
  function getProjects(){const saved=safeParse(localStorage.getItem(PROJECTS_KEY),null);if(Array.isArray(saved)&&saved.every(p=>p&&typeof p==='object'&&p.id&&typeof p.title==='string'))return saved;const defaults=projectDefaults();localStorage.setItem(PROJECTS_KEY,JSON.stringify(defaults));return defaults}
  function saveProjects(items){localStorage.setItem(PROJECTS_KEY,JSON.stringify(items));renderProjects(items);renderProjectManagerList();refreshAdminStats();}
  function projectArt(project){const url=String(project.imageUrl||'').trim();if(url){if(!/^https?:\/\//i.test(url))return '<div class="project-art-placeholder">图片链接无效</div>';return `<div class="project-art project-art-image"><img src="${escapeHtml(url)}" alt="${escapeHtml(project.title)} 项目图片" loading="lazy" referrerpolicy="no-referrer"><span class="art-number">✦</span></div>`}const html=originalProjectArts[project.artKey];if(html)return `<div class="project-art ${escapeHtml(project.artKey)}">${html}</div>`;return '<div class="project-art project-art-custom"><div class="custom-project-symbol">Q</div><span class="art-number">✦</span></div>'}
  function renderProjects(items=getProjects()){projectGrid.innerHTML=items.map((p,i)=>`<article class="project-card" data-project-id="${escapeHtml(p.id)}" data-category="${escapeHtml(p.category||'web')}">${projectArt(p)}<div class="project-info"><div class="project-meta"><span>${escapeHtml(p.metaLabel||({web:'WEB DEVELOPMENT',design:'UI / WEB DESIGN',data:'DATA VISUALIZATION'}[p.category]||'PROJECT'))}</span><span>${escapeHtml(p.meta||'PROJECT')}</span></div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description)}</p><div class="tag-row">${(Array.isArray(p.tags)?p.tags:[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div><button class="project-more" type="button" data-project="${escapeHtml(p.id)}">项目详情 <span>↗</span></button></div></article>`).join('');
    $$('#projectFilters [data-filter]').forEach(btn=>{const active=btn.classList.contains('active');if(active){const f=btn.dataset.filter;$$('[data-category]',projectGrid).forEach(card=>card.hidden=f!=='all'&&card.dataset.category!==f)}});observeReveals($('#page-projects'));
  }
  projectGrid.addEventListener('click',e=>{const btn=e.target.closest('[data-project]');if(!btn)return;const id=btn.dataset.project;const p=getProjects().find(item=>item.id===id);const d=projectDetails[id];$('#dialogTitle').textContent=d?.title||p?.title||'项目详情';$('#dialogBody').innerHTML=d?.body||`<p>${escapeHtml(p?.description||'')}</p><p>技术标签：${escapeHtml((p?.tags||[]).join('、')||'暂未填写')}</p>`;if(dialog.showModal)dialog.showModal();else toast(p?.title||'项目详情')});
  function rememberProjectState(){projectUndoStack.push(JSON.stringify(getProjects()));if(projectUndoStack.length>30)projectUndoStack.shift();$('#undoProjectAction').disabled=false}
  function fillProjectForm(p){$('#managedProjectId').value=p?.id||'';$('#managedProjectTitle').value=p?.title||'';$('#managedProjectDescription').value=p?.description||'';$('#managedProjectCategory').value=p?.category||'web';$('#managedProjectMeta').value=p?.meta||'';$('#managedProjectImage').value=p?.imageUrl||'';$('#managedProjectTags').value=(p?.tags||[]).join(', ');$('#saveManagedProject').textContent=p?'保存项目修改':'添加项目';$('#projectManagerStatus').textContent=p?`正在编辑：${p.title}`:'填写信息后新增项目。'}
  function renderProjectManagerList(){const root=$('#projectManagerList');if(!root)return;const items=getProjects();root.innerHTML=items.map((p,i)=>`<article class="project-manager-row" draggable="true" data-manage-id="${escapeHtml(p.id)}"><span class="project-drag-handle" aria-label="拖动排序" title="拖动排序">⠿</span><div class="project-manager-row-copy"><b>${escapeHtml(p.title)}</b><small>${escapeHtml(({web:'Web 开发',design:'设计作品',data:'数据可视化'}[p.category]||'其他'))} · ${escapeHtml(p.meta||'未填写日期')}</small></div><div class="project-manager-row-actions"><button type="button" class="btn btn-ghost btn-small" data-project-edit="${escapeHtml(p.id)}">编辑</button><button type="button" class="btn btn-ghost btn-small" data-project-up="${escapeHtml(p.id)}" ${i===0?'disabled':''}>上移</button><button type="button" class="btn btn-ghost btn-small" data-project-down="${escapeHtml(p.id)}" ${i===items.length-1?'disabled':''}>下移</button><button type="button" class="btn btn-ghost btn-small" data-project-delete="${escapeHtml(p.id)}">删除</button></div></article>`).join('')||'<p class="admin-empty">还没有项目，请新增一个项目。</p>';root.querySelectorAll('[data-project-edit]').forEach(btn=>btn.addEventListener('click',()=>fillProjectForm(getProjects().find(p=>p.id===btn.dataset.projectEdit))));root.querySelectorAll('[data-project-delete]').forEach(btn=>btn.addEventListener('click',()=>{const items=getProjects(),p=items.find(x=>x.id===btn.dataset.projectDelete);if(!p||!confirm(`确定删除项目“${p.title}”吗？`))return;rememberProjectState();saveProjects(items.filter(x=>x.id!==p.id));if($('#managedProjectId').value===p.id)fillProjectForm(null);toast('项目已删除')}));root.querySelectorAll('[data-project-up],[data-project-down]').forEach(btn=>btn.addEventListener('click',()=>{const items=getProjects(),i=items.findIndex(p=>p.id===(btn.dataset.projectUp||btn.dataset.projectDown)),j=i+(btn.hasAttribute('data-project-up')?-1:1);if(i<0||j<0||j>=items.length)return;rememberProjectState();[items[i],items[j]]=[items[j],items[i]];saveProjects(items);toast('项目顺序已更新')}));
    root.querySelectorAll('[draggable="true"]').forEach(row=>{row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',row.dataset.manageId);e.dataTransfer.effectAllowed='move';row.classList.add('is-dragging')});row.addEventListener('dragend',()=>row.classList.remove('is-dragging'));row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('is-drop-target')});row.addEventListener('dragleave',()=>row.classList.remove('is-drop-target'));row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('is-drop-target');const from=e.dataTransfer.getData('text/plain'),to=row.dataset.manageId;if(!from||from===to)return;const items=getProjects(),a=items.findIndex(p=>p.id===from),b=items.findIndex(p=>p.id===to);if(a<0||b<0)return;rememberProjectState();const [moved]=items.splice(a,1);items.splice(b,0,moved);saveProjects(items);toast('拖动排序已保存')})});
  }
  $('#projectManagerForm').addEventListener('submit',e=>{e.preventDefault();if(localStorage.getItem(KEYS.admin)!=='1'){toast('请先登录管理员账户');return}const id=$('#managedProjectId').value.trim(),title=$('#managedProjectTitle').value.trim(),description=$('#managedProjectDescription').value.trim(),category=$('#managedProjectCategory').value,meta=$('#managedProjectMeta').value.trim(),imageUrl=$('#managedProjectImage').value.trim(),tags=$('#managedProjectTags').value.split(',').map(t=>t.trim()).filter(Boolean);if(!title||!description){$('#projectManagerStatus').textContent='项目名称和说明不能为空。';return}if(imageUrl&&!/^https?:\/\//i.test(imageUrl)){ $('#projectManagerStatus').textContent='图片地址必须以 http:// 或 https:// 开头。';return}if(tags.length>12||tags.some(t=>t.length>30)){ $('#projectManagerStatus').textContent='标签最多 12 个，每个标签不超过 30 个字符。';return}const items=getProjects();rememberProjectState();if(id){const i=items.findIndex(p=>p.id===id);if(i<0){toast('项目已不存在，请刷新列表');return}items[i]={...items[i],title,description,category,meta, imageUrl,tags}}else{items.push({id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title,description,category,meta:meta||'NEW PROJECT',metaLabel:({web:'WEB DEVELOPMENT',design:'UI / WEB DESIGN',data:'DATA VISUALIZATION'}[category]||'PROJECT'),imageUrl,tags,artKey:'custom'})}saveProjects(items);fillProjectForm(null);toast(id?'项目修改已保存':'新项目已添加');$('#projectManagerStatus').textContent='已保存到当前浏览器。'});
  $('#newManagedProject').addEventListener('click',()=>fillProjectForm(null));
  $('#undoProjectAction').addEventListener('click',()=>{const prior=projectUndoStack.pop();if(!prior){toast('没有可撤销的操作');return}const items=safeParse(prior,[]);localStorage.setItem(PROJECTS_KEY,JSON.stringify(items));renderProjects(items);renderProjectManagerList();$('#undoProjectAction').disabled=!projectUndoStack.length;$('#projectManagerStatus').textContent='已撤销最近一次项目操作。';toast('已撤销上一步')});
  $('#undoProjectAction').disabled=true;
  function initProjectManager(){renderProjects(getProjects());renderProjectManagerList();fillProjectForm(null)}
  const cmsFields = [
    ['首页｜问候语','.hero-copy .kicker'],['首页｜主标题','.hero-copy h1'],['首页｜简介','.hero-copy .hero-desc'],
    ['首页｜设计理念标题','.section-block .section-heading h2'],['首页｜设计理念说明','.section-aside'],['首页｜设计原则引言','.quote-panel p'],
    ['首页｜能力卡片一标题','.feature-card:nth-child(1) h3'],['首页｜能力卡片一说明','.feature-card:nth-child(1) p'],
    ['首页｜能力卡片二标题','.feature-card:nth-child(2) h3'],['首页｜能力卡片二说明','.feature-card:nth-child(2) p'],
    ['首页｜能力卡片三标题','.feature-card:nth-child(3) h3'],['首页｜能力卡片三说明','.feature-card:nth-child(3) p'],
    ['技能页｜标题','#page-skills .page-hero h1'],['技能页｜介绍','#page-skills .page-hero > p:last-child'],
    ['项目页｜标题','#page-projects .page-hero h1'],['项目页｜介绍','#page-projects .page-hero > p:last-child'],
    ['成长页｜标题','#page-journey .page-hero h1'],['成长页｜介绍','#page-journey .page-hero > p:last-child'],
    ['生活页｜标题','#page-hobbies .page-hero h1'],['生活页｜介绍','#page-hobbies .page-hero > p:last-child'],
    ['教育经历｜专业名称','#page-journey .education-card:nth-child(1) h3'],['教育经历｜学校阶段说明','#page-journey .education-card:nth-child(1) .edu-content > p'],
    ['成长页｜当前关注标题','#page-journey .journey-aside .aside-card h3'],['留言页｜交流约定标题','#page-message .message-aside .aside-card h3'],
    ['留言页｜标题','#page-message .page-hero h1'],['留言页｜介绍','#page-message .page-hero > p:last-child'],
    ...Array.from($$('#skillsGrid .skill-card')).flatMap((el,i)=>[[`技能 ${i+1}｜名称`, `#skillsGrid .skill-card:nth-child(${i+1}) h3`],[`技能 ${i+1}｜说明`, `#skillsGrid .skill-card:nth-child(${i+1}) > p`],[`技能 ${i+1}｜熟练度`, `#skillsGrid .skill-card:nth-child(${i+1}) .progress-label b`]]),
    ...Array.from($$('#projectsGrid .project-card')).flatMap((el,i)=>[[`项目 ${i+1}｜名称`, `#projectsGrid .project-card:nth-child(${i+1}) h3`],[`项目 ${i+1}｜说明`, `#projectsGrid .project-card:nth-child(${i+1}) .project-info > p`]]),
    ...Array.from($$('#page-journey .timeline-item')).flatMap((el,i)=>[[`成长经历 ${i+1}｜标题`, `#page-journey .timeline-item:nth-child(${i+1}) h3`],[`成长经历 ${i+1}｜说明`, `#page-journey .timeline-item:nth-child(${i+1}) .timeline-card p`]]),
    ...Array.from($$('#page-hobbies .hobby-card')).flatMap((el,i)=>[[`兴趣 ${i+1}｜名称`, `#page-hobbies .hobby-card:nth-child(${i+1}) h3`],[`兴趣 ${i+1}｜说明`, `#page-hobbies .hobby-card:nth-child(${i+1}) .hobby-content > p`]])
  ].map(([label,selector],i)=>({key:`field_${i}`,label,selector}));
  let inlineEditMode = false;
  function ensureInlineEditorBar(){
    let bar=$('#inlineEditorBar');
    if(!bar){
      bar=document.createElement('div');bar.id='inlineEditorBar';bar.className='inline-editor-bar';
      bar.innerHTML='<span class="inline-editor-status">管理员已登录</span><span class="inline-editor-hint">进入任意页面，开启后点击带虚线框的文字即可修改</span><div class="inline-editor-actions"><button type="button" id="toggleInlineEdit" class="btn btn-primary btn-small">开启页面编辑</button><button type="button" id="exitInlineAdmin" class="btn btn-ghost btn-small">退出管理员</button></div>';
      document.body.appendChild(bar);
      $('#toggleInlineEdit').addEventListener('click',()=>{inlineEditMode=!inlineEditMode;refreshInlineEdit();});
      $('#exitInlineAdmin').addEventListener('click',()=>{localStorage.removeItem(KEYS.admin);inlineEditMode=false;refreshInlineEdit();renderAdminState();toast('已退出管理员')});
    }
    return bar;
  }
  function refreshInlineEdit(){
    const logged=localStorage.getItem(KEYS.admin)==='1';
    const bar=ensureInlineEditorBar();bar.hidden=!logged;
    document.body.classList.toggle('inline-edit-mode',logged&&inlineEditMode);
    const toggle=$('#toggleInlineEdit');if(toggle)toggle.textContent=inlineEditMode?'完成页面编辑':'开启页面编辑';
    $$('.inline-edit-target').forEach(el=>{el.classList.remove('inline-edit-target');el.removeAttribute('data-inline-edit-label');if(el.__inlineEditorHandler){el.removeEventListener('click',el.__inlineEditorHandler);delete el.__inlineEditorHandler}});
    if(!logged||!inlineEditMode)return;
    const page=$('.page.active');if(!page||page.dataset.page==='admin'||page.dataset.page==='register'||page.dataset.page==='login')return;
    cmsFields.forEach(field=>{
      const el=$(field.selector);if(!el||!page.contains(el)||el.closest('form')||el.closest('button')||el.closest('a'))return;
      el.classList.add('inline-edit-target');el.dataset.inlineEditLabel=field.label;
      el.__inlineEditorHandler=function(ev){ev.preventDefault();ev.stopPropagation();const current=el.textContent.trim();const next=prompt(`修改内容：${field.label}\n\n提示：可直接输入新文字。`,current);if(next===null)return;const value=next.trim();if(!value){toast('内容不能为空');return}el.textContent=value;const data=getSiteContent();data[field.key]=value;localStorage.setItem(KEYS.content,JSON.stringify(data));const projectCard=el.closest('#projectsGrid .project-card');if(projectCard){const projectId=projectCard.dataset.projectId;const items=getProjects();const item=items.find(p=>p.id===projectId);if(item){if(el.matches('h3'))item.title=value;else if(el.matches('.project-info > p'))item.description=value;localStorage.setItem(PROJECTS_KEY,JSON.stringify(items));renderProjectManagerList()}}toast(`已保存：${field.label}`)};el.addEventListener('click',el.__inlineEditorHandler);
    });
  }
  function getSiteContent(){return safeParse(localStorage.getItem(KEYS.content),{})||{}}
  function applySiteContent(){const data=getSiteContent();cmsFields.forEach(f=>{const el=$(f.selector);if(el&&Object.prototype.hasOwnProperty.call(data,f.key))el.textContent=data[f.key]})}
  function buildContentEditor(){const root=$('#contentEditorFields');if(!root||root.dataset.built==='1')return;root.dataset.built='1';const data=getSiteContent();root.innerHTML=cmsFields.map(f=>{const el=$(f.selector);const value=Object.prototype.hasOwnProperty.call(data,f.key)?data[f.key]:(el?el.textContent.trim():'');return `<label class="field admin-field"><span>${escapeHtml(f.label)}</span><textarea data-cms-key="${f.key}" rows="${value.length>100?4:2}" maxlength="1200">${escapeHtml(value)}</textarea></label>`}).join('')}
  $('#adminLoginForm').addEventListener('submit',e=>{e.preventDefault();const user=$('#adminUsername').value.trim(),pass=$('#adminPassword').value;if(user==='admin'&&pass==='QswAdmin2026!'){localStorage.setItem(KEYS.admin,'1');$('#adminLoginError').textContent='';e.target.reset();renderAdminState();toast('管理员登录成功')}else{$('#adminLoginError').textContent='管理员账号或密码不正确。'}});
  $('#adminLogout').addEventListener('click',()=>{localStorage.removeItem(KEYS.admin);renderAdminState();toast('已退出管理后台')});
  $('#contentEditorForm').addEventListener('submit',e=>{e.preventDefault();if(localStorage.getItem(KEYS.admin)!=='1'){toast('请先登录管理员账户');renderAdminState();return}const data={};$$('[data-cms-key]').forEach(input=>data[input.dataset.cmsKey]=input.value.trim());localStorage.setItem(KEYS.content,JSON.stringify(data));applySiteContent();$('#contentSaveStatus').textContent='已保存。网站内容已更新；刷新页面后仍会保留。';toast('网站内容已保存')});
  $('#resetContent').addEventListener('click',()=>{if(!confirm('确定恢复网站默认内容吗？这会清除已保存的文案修改。'))return;localStorage.removeItem(KEYS.content);$$('[data-cms-key]').forEach(input=>{const field=cmsFields.find(f=>f.key===input.dataset.cmsKey),el=field&&$(field.selector);input.value=el?el.textContent.trim():''});location.reload()});
  function refreshAdminStats(){
    const put=(selector,value)=>{const el=$(selector);if(el)el.textContent=Number(value||0).toLocaleString('zh-CN')};
    put('#adminUsersCount',getUsers().length);put('#adminMessagesCount',getMessages().length);put('#adminProjectsCount',getProjects().length);put('#adminVisitsCount',localStorage.getItem(KEYS.visits)||0);
  }
  function renderAdminState(){const active=localStorage.getItem(KEYS.admin)==='1';$('#adminLoginForm').hidden=active;$('#adminDashboard').hidden=!active;$('#adminNavLink').classList.toggle('admin-nav-active',active);if(active){buildContentEditor();refreshAdminStats();renderAdminMessages();renderProjectManagerList()}}
  function getFilteredAdminMessages(){
    const query=($('#adminMessageSearch')?.value||'').trim().toLocaleLowerCase('zh-CN');
    const type=$('#adminMessageTypeFilter')?.value||'all';
    return getMessages().slice().sort((a,b)=>new Date(b.time)-new Date(a.time)).filter(m=>{
      const matchesType=type==='all'||(m.type||'其他')===type;
      const haystack=`${m.username||''} ${m.content||''} ${m.type||''}`.toLocaleLowerCase('zh-CN');
      return matchesType&&(!query||haystack.includes(query));
    });
  }
  function renderAdminMessages(){
    const root=$('#adminMessageList');if(!root||localStorage.getItem(KEYS.admin)!=='1')return;
    const messages=getFilteredAdminMessages();const total=getMessages().length;
    const counter=$('#adminMessageResultCount');if(counter)counter.textContent=`显示 ${messages.length} 条 / 共 ${total} 条留言`;
    refreshAdminStats();
    if(!messages.length){root.innerHTML='<p class="admin-empty">没有符合当前搜索条件的留言。</p>';return}
    root.innerHTML=messages.map(m=>`<article class="admin-message-row"><div><b>${escapeHtml(m.username||'访客')}</b><span>${escapeHtml(m.type||'其他')} · ${escapeHtml(formatDate(m.time))}</span><p>${escapeHtml(m.content||'')}</p></div><button class="btn btn-ghost btn-small" type="button" data-admin-delete="${escapeHtml(m.id)}">删除</button></article>`).join('');
    $$('[data-admin-delete]',root).forEach(btn=>btn.addEventListener('click',()=>{if(localStorage.getItem(KEYS.admin)!=='1'){toast('管理员登录状态已失效');renderAdminState();return}if(!confirm('确定删除这条留言吗？'))return;localStorage.setItem(KEYS.messages,JSON.stringify(getMessages().filter(m=>m.id!==btn.dataset.adminDelete)));renderAdminMessages();renderMessages();toast('留言已删除')}));
  }
  $('#adminMessageSearch').addEventListener('input',renderAdminMessages);
  $('#adminMessageTypeFilter').addEventListener('change',renderAdminMessages);
  const BACKUP_SCHEMA='qsw-portfolio-backup';
  function isPlainObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
  function validateBackup(data){
    if(!isPlainObject(data)||data.schema!==BACKUP_SCHEMA||data.version!==1||!isPlainObject(data.data))return '备份文件格式不正确或版本不受支持。';
    const d=data.data;
    if(!Array.isArray(d.users)||!Array.isArray(d.messages)||!Array.isArray(d.projects)||!isPlainObject(d.content))return '备份缺少必要的数据项或数据类型不正确。';
    if(d.users.length>10000||d.messages.length>100000||d.projects.length>1000)return '备份数据量超出安全限制。';
    if(!d.users.every(u=>isPlainObject(u)&&typeof u.username==='string'&&/^[A-Za-z0-9_-]{1,16}$/.test(u.username)&&typeof u.password==='string'&&u.password.length<=256&&typeof (u.name||'')==='string'&&(u.name||'').length<=120))return '备份中的用户数据格式不正确。';
    const normalizedNames=d.users.map(u=>u.username.toLowerCase());
    if(new Set(normalizedNames).size!==normalizedNames.length)return '备份中存在重复用户名，请修正后再导入。';
    if(!d.messages.every(m=>isPlainObject(m)&&typeof m.content==='string'&&m.content.length<=1000&&typeof (m.username||'')==='string'&&(m.username||'').length<=100&&typeof (m.type||'')==='string'&&(m.type||'').length<=40))return '备份中的留言数据格式不正确。';
    if(!d.projects.every(p=>isPlainObject(p)&&typeof p.id==='string'&&p.id.length<=120&&typeof p.title==='string'&&p.title.length<=200&&typeof (p.description||'')==='string'&&(p.description||'').length<=3000))return '备份中的项目数据格式不正确。';
    if(!Object.values(d.content).every(v=>typeof v==='string'&&v.length<=5000))return '备份中的网站文案格式不正确。';
    if(!['auto','light','dark'].includes(d.theme))return '备份中的主题设置无效。';
    if(!Number.isFinite(d.visits)||d.visits<0)return '备份中的访问次数无效。';
    return '';
  }
  $('#exportSiteBackup').addEventListener('click',()=>{
    if(localStorage.getItem(KEYS.admin)!=='1'){toast('请先登录管理员账户');return}
    try{
      const users=getUsers();
      const data={users,messages:getMessages(),projects:getProjects(),content:getSiteContent(),theme:getThemeMode(),visits:Number(localStorage.getItem(KEYS.visits)||0)};
      const backup={schema:BACKUP_SCHEMA,version:1,exportedAt:new Date().toISOString(),data};
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`QSW网站备份_${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      $('#backupStatus').textContent=`备份已生成：${users.length} 个账户、${data.messages.length} 条留言、${data.projects.length} 个项目。请妥善保管文件。`;
    }catch(error){$('#backupStatus').textContent='备份失败，可能是浏览器存储不可用或数据异常。'}
  });
  $('#importSiteBackup').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    const status=$('#backupStatus');
    try{
      if(localStorage.getItem(KEYS.admin)!=='1'){toast('请先登录管理员账户');return}
      if(file.size>20*1024*1024){status.textContent='文件超过 20 MB，已拒绝导入。';return}
      const raw=await file.text();let backup;
      try{backup=JSON.parse(raw)}catch{status.textContent='无法解析该 JSON 文件，请选择有效的 QSW 备份。';return}
      const problem=validateBackup(backup);if(problem){status.textContent=problem;return}
      const ok=confirm(`即将恢复备份（导出时间：${backup.exportedAt||'未知'}）。\n\n这会覆盖当前浏览器中的账户、留言、项目、网站文案、主题和访问次数。建议先导出当前备份。\n\n确认继续吗？`);
      if(!ok){status.textContent='已取消恢复。';return}
      const d=backup.data;
      const userMap={};d.users.forEach(u=>{userMap[u.username]=u});
      localStorage.setItem(KEYS.users,JSON.stringify(userMap));
      localStorage.setItem(KEYS.messages,JSON.stringify(d.messages));
      localStorage.setItem(PROJECTS_KEY,JSON.stringify(d.projects));
      localStorage.setItem(KEYS.content,JSON.stringify(d.content));
      localStorage.setItem(KEYS.theme,d.theme);
      localStorage.setItem(KEYS.visits,String(Math.floor(d.visits)));
      localStorage.removeItem(KEYS.current);
      status.textContent='备份恢复成功，页面即将刷新。请重新登录普通用户账户。';
      setTimeout(()=>location.reload(),700);
    }catch(error){status.textContent='恢复失败。请检查浏览器存储空间，并确认备份文件完整。'}
    finally{e.target.value=''}
  });
  function csvCell(value){let text=String(value??'').replace(/\r?\n/g,' ');if(/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}
  $('#exportMessagesCsv').addEventListener('click',()=>{
    if(localStorage.getItem(KEYS.admin)!=='1'){toast('请先登录管理员账户');return}
    const messages=getFilteredAdminMessages();if(!messages.length){toast('当前没有可导出的留言');return}
    const rows=[['用户名','留言类型','留言内容','留言时间'],...messages.map(m=>[m.username||'访客',m.type||'其他',m.content||'',formatDate(m.time)])];
    const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`QSW留言导出_${new Date().toISOString().slice(0,10)}.csv`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);toast(`已导出 ${messages.length} 条留言`);
  });
  applySiteContent();
  initProjectManager();

  renderAccount();renderMessages();navigate();observeReveals($('.page.active'));refreshInlineEdit();
})();
