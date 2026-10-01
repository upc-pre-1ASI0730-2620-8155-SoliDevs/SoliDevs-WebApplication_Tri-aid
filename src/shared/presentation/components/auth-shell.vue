<script setup>
import logo from '../../../assets/tri-aid-logo.png'
defineProps({ title: String, lead: String, features: { type: Array, default: () => [] } })

// 10 latidos de 120 unidades cada uno (1200 de ancho); el CSS desplaza un latido en bucle
const ecgPath = 'M0 24' + ' h20 q5 -8 10 0 h6 l3 4 l5 -24 l5 28 l3 -8 h10 q10 -16 20 0 h38'.repeat(10)
</script>

<template>
  <main class="auth">
    <aside class="auth__brand">
      <header class="auth__logo">
        <img :src="logo" alt="Tri-Aid" />
        <div><strong>Tri-Aid</strong><small>PANEL DE TRIAJE · EMERGENCIAS</small></div>
      </header>
      <section class="auth__pitch">
        <h1>{{ title }}</h1>
        <p class="lead">{{ lead }}</p>
        <div class="ecg" aria-hidden="true">
          <svg class="ecg__svg" viewBox="0 0 1200 48">
            <path class="glow" :d="ecgPath" />
            <path class="line" :d="ecgPath" />
          </svg>
        </div>
        <ul>
          <li v-for="(f, i) in features" :key="f.title" :style="{ '--i': i }">
            <span class="ico">
              <svg v-if="f.icon === 'mail'" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
              <svg v-else-if="f.icon === 'clock'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <svg v-else-if="f.icon === 'lock'" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            </span>
            <div><b>{{ f.title }}</b><p>{{ f.text }}</p></div>
          </li>
        </ul>
      </section>
    </aside>
    <section class="auth__panel"><div class="auth__card"><slot /></div></section>
  </main>
</template>

<style>
@import '../styles/tokens.css';
.auth{display:grid;grid-template-columns:minmax(300px,34%) 1fr;min-height:100vh;font-family:var(--ta-font);color:var(--ta-text);letter-spacing:0}
.auth__brand{background:var(--ta-ink);color:#e8f3ec;padding:28px 36px;display:flex;flex-direction:column}
.auth__logo{display:flex;align-items:flex-start;gap:10px}
.auth__logo img{width:24px;height:24px;border-radius:6px;flex:none}
.auth__logo strong{display:block;font-size:14px;font-weight:600;line-height:24px}
.auth__logo small{display:block;margin-top:1px;font-family:var(--ta-mono);font-size:8px;line-height:1.2;letter-spacing:.1em;color:#7fa392}
.auth__pitch{margin:auto 0;padding-bottom:6vh}
.auth__pitch h1{font-size:clamp(24px,2.4vw,32px);line-height:1.15;font-weight:500;margin:0 0 14px;animation:ta-rise .7s both}
.auth__pitch .lead{font-size:13px;line-height:1.55;color:#9bb5a7;margin:0 0 24px;animation:ta-rise .7s .08s both}

.auth .ecg{position:relative;height:48px;margin:0 0 24px;overflow:hidden;
  background:
    linear-gradient(rgba(52,210,123,.07) 1px,transparent 1px) 0 0/100% 12px,
    linear-gradient(90deg,rgba(52,210,123,.07) 1px,transparent 1px) 0 0/12px 100%;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 16%,#000 84%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 16%,#000 84%,transparent);
  animation:ta-rise .7s .16s both}
.auth .ecg__svg{display:block;width:1200px;height:48px;will-change:transform;animation:ta-scroll .95s linear infinite}
.auth .ecg__svg path{fill:none;stroke:var(--ta-accent);stroke-linecap:round;stroke-linejoin:round}
.auth .ecg__svg .glow{stroke-width:5;opacity:.16}
.auth .ecg__svg .line{stroke-width:1.5}

.auth__pitch ul{list-style:none;margin:0;padding:0;display:grid;gap:18px}
.auth__pitch li{display:flex;gap:12px;animation:ta-rise .6s calc(.25s + var(--i)*.12s) both}
.auth__pitch .ico{width:18px;flex:none;color:var(--ta-accent)}
.auth__pitch .ico svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;margin-top:2px}
.auth__pitch li b{font-size:13px;font-weight:500}
.auth__pitch li p{margin:3px 0 0;font-size:11.5px;line-height:1.45;color:#8aa597}
.auth__panel{background:var(--ta-bg);display:grid;place-items:center;padding:32px}
.auth__card{width:min(100%,380px);animation:ta-rise .7s .15s both}
.auth__card h2{text-align:center;font-size:20px;font-weight:600;margin:0 0 8px}
.auth__card .sub{text-align:center;font-size:12px;line-height:1.5;color:var(--ta-muted);margin:0 0 28px}
.auth .field{display:grid;gap:6px;margin-bottom:16px}
.auth .field label{font-size:12px;font-weight:500}
.auth .field input{height:40px;padding:0 12px;border:1px solid var(--ta-line);border-radius:8px;background:var(--ta-surface);font:inherit;font-size:13px;color:var(--ta-text);transition:border-color .2s,box-shadow .2s}
.auth .field input:focus{outline:none;border-color:var(--ta-brand);box-shadow:0 0 0 3px rgba(10,107,56,.15)}
.auth .btn{width:100%;height:42px;border:0;border-radius:8px;background:var(--ta-brand);color:#fff;font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:background .2s,transform .1s}
.auth .btn:hover{background:var(--ta-brand-dk)}
.auth .btn:active{transform:scale(.98)}
.auth .btn:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px}
.auth .btn:disabled{opacity:.7;cursor:progress}
.auth .link{display:block;text-align:center;margin-top:16px;font-size:12px;color:var(--ta-brand);text-decoration:none}
.auth .link:hover{text-decoration:underline}
.auth .err{color:var(--ta-danger);font-size:12px;margin:-4px 0 12px}
.auth .ok{background:#e3f3ea;color:var(--ta-brand);border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:14px}
@keyframes ta-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes ta-scroll{to{transform:translateX(-120px)}}
@media(max-width:820px){.auth{grid-template-columns:1fr}.auth__pitch ul,.auth .ecg{display:none}.auth__pitch{margin:24px 0 0}}
@media(prefers-reduced-motion:reduce){.auth *{animation:none!important}}
</style>