/* 입시 나침반 — 학생 / 학부모·강사 모드. localStorage 'ipsi-mode' 하나로 내비와 허브 카드를 거른다. */
(function(){
 'use strict';
 var KEY='ipsi-mode';
 var STUDENT=['my.html','sulgye.html','gwamok.html','consulting.html','faq.html'];  // 학생 모드 내비 5개
 var get=function(){try{return localStorage.getItem(KEY)||'';}catch(e){return '';}};
 var set=function(m){try{if(m)localStorage.setItem(KEY,m);else localStorage.removeItem(KEY);}catch(e){}apply();};
 var file=function(a){return (a.getAttribute('href')||'').split('#')[0].split('/').pop();};
 function apply(){
  var m=get();document.documentElement.setAttribute('data-mode',m||'all');
  document.querySelectorAll('.site-nav a').forEach(function(a){a.classList.toggle('mode-hide',m==='student'&&STUDENT.indexOf(file(a))<0);});
  document.querySelectorAll('a.card.link').forEach(function(a){a.classList.toggle('mode-hide',m==='student'&&STUDENT.indexOf(file(a))<0);});
  var b=document.getElementById('modeBtn');if(b){b.textContent=m==='student'?'학생 모드 · 전체 보기':m==='parent'?'학부모·강사 모드':'모드 선택';b.title=m==='student'?'누르면 전체 메뉴로':'누르면 학생 모드로';}
  document.querySelectorAll('[data-mode-pick]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-mode-pick')===m);});
  var gate=document.getElementById('modeGate');if(gate)gate.classList.toggle('picked',!!m);
 }
 function mount(){
  var inner=document.querySelector('.nav-inner');
  if(inner&&!document.getElementById('modeBtn')){var b=document.createElement('button');b.id='modeBtn';b.type='button';b.className='mode-btn';b.addEventListener('click',function(){set(get()==='student'?'parent':'student');});var t=inner.querySelector('.nav-toggle');inner.insertBefore(b,t||inner.querySelector('.site-nav'));}
  document.querySelectorAll('[data-mode-pick]').forEach(function(x){x.addEventListener('click',function(e){e.preventDefault();set(x.getAttribute('data-mode-pick'));var to=x.getAttribute('data-go');if(to)location.href=to;});});
  apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.IpsiMode={get:get,set:set};
})();
