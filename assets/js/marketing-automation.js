/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   NOVA DEV — Ultimate Free Marketing Automation v1.0 (EN)       ║
 * ║   100% open-source, zero paid tools required                    ║
 * ║                                                                  ║
 * ║   MODULES INCLUDED:                                              ║
 * ║   1. Exit Intent Popup                                           ║
 * ║   2. Social Proof Ticker (real-time)                             ║
 * ║   3. Animated Stats Counter                                      ║
 * ║   4. Automatic Lead Scoring                                      ║
 * ║   5. Smart Sticky CTA Bar                                        ║
 * ║   6. UTM & Session Tracking                                      ║
 * ║   7. Retargeting Pixel Ready (Meta/Google)                       ║
 * ║   8. Recent Visit Notification                                   ║
 * ║   9. WhatsApp Direct CTA                                         ║
 * ║   10. Urgency / Scarcity Banner                                  ║
 * ║   11. Scroll Depth Tracking                                      ║
 * ║   12. Schema Markup (JSON-LD SEO)                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

(function () {
  'use strict';

  /* ────────────────────────────────────────────────────────────────
     GLOBAL CONFIG
  ──────────────────────────────────────────────────────────────── */
  const CONFIG = {
    brand:          'Nova Dev',
    lang:           'en',
    whatsappNumber: '33612345678', // ← Replace with your number
    whatsappMsg:    encodeURIComponent('Hello Nova Dev 👋 I would like to discuss a web project.'),
    formEndpoint:   'https://formsubmit.co/ajax/admin@novatvhub.com',
    exitPopupDelay:  5000,
    stickyBarDelay:  3000,
    notifDelay:      8000,
    notifInterval:   14000,
    urgencySlots:    3,
    counterDuration: 2000,
  };

  /* ────────────────────────────────────────────────────────────────
     UTM & SESSION TRACKING
  ──────────────────────────────────────────────────────────────── */
  const UTM = (function () {
    const params = new URLSearchParams(window.location.search);
    const data = {
      source:   params.get('utm_source')   || document.referrer || 'direct',
      medium:   params.get('utm_medium')   || 'organic',
      campaign: params.get('utm_campaign') || '',
      term:     params.get('utm_term')     || '',
      content:  params.get('utm_content')  || '',
    };
    try { sessionStorage.setItem('nd_utm', JSON.stringify(data)); } catch (_) {}
    return data;
  })();

  /* ────────────────────────────────────────────────────────────────
     LEAD SCORING ENGINE
  ──────────────────────────────────────────────────────────────── */
  const LeadScore = {
    score: 0,
    events: [],
    add(event, points) {
      this.score += points;
      this.events.push({ event, points, ts: Date.now() });
      this._sync();
      this._checkThresholds();
    },
    _sync() {
      try { localStorage.setItem('nd_score', JSON.stringify({ score: this.score, events: this.events })); } catch (_) {}
    },
    _checkThresholds() {
      if (this.score >= 30 && !sessionStorage.getItem('nd_hot_triggered')) {
        sessionStorage.setItem('nd_hot_triggered', '1');
        setTimeout(() => triggerHotLeadPopup(), 500);
      }
    },
    init() {
      try {
        const saved = JSON.parse(localStorage.getItem('nd_score') || 'null');
        if (saved) { this.score = saved.score || 0; this.events = saved.events || []; }
      } catch (_) {}
    }
  };

  /* ────────────────────────────────────────────────────────────────
     SCROLL DEPTH TRACKING
  ──────────────────────────────────────────────────────────────── */
  const ScrollTracker = {
    reached: new Set(),
    checkpoints: [25, 50, 75, 90],
    track() {
      const pct = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
      this.checkpoints.forEach(cp => {
        if (pct >= cp && !this.reached.has(cp)) {
          this.reached.add(cp);
          LeadScore.add(`scroll_${cp}`, cp === 90 ? 10 : 5);
          if (cp === 50) showStickyBar();
        }
      });
    }
  };
  window.addEventListener('scroll', () => ScrollTracker.track(), { passive: true });

  /* ────────────────────────────────────────────────────────────────
     MODULE 1 — EXIT INTENT POPUP
  ──────────────────────────────────────────────────────────────── */
  let exitPopupActive = false;
  let exitPopupTriggered = false;

  function initExitIntent() {
    setTimeout(() => { exitPopupActive = true; }, CONFIG.exitPopupDelay);

    document.addEventListener('mouseleave', (e) => {
      if (e.clientY > 20) return;
      if (!exitPopupActive || exitPopupTriggered) return;
      if (sessionStorage.getItem('nd_exit_shown')) return;
      exitPopupTriggered = true;
      sessionStorage.setItem('nd_exit_shown', '1');
      LeadScore.add('exit_intent', 15);
      showExitPopup();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && exitPopupActive && !exitPopupTriggered) {
        if (!sessionStorage.getItem('nd_exit_shown')) {
          exitPopupTriggered = true;
          sessionStorage.setItem('nd_exit_shown', '1');
          showExitPopup();
        }
      }
    });
  }

  function showExitPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'nd-exit-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Special offer before you leave');
    overlay.innerHTML = `
      <div class="nd-exit-box">
        <button class="nd-exit-close" aria-label="Close">&times;</button>
        <div class="nd-exit-icon">⚡</div>
        <h2 class="nd-exit-title">Wait — before you leave!</h2>
        <p class="nd-exit-sub">Get a <strong>free website audit</strong> within 24h<br>+ a complimentary strategic consultation.</p>
        <div class="nd-exit-badges">
          <span>✓ No commitment</span>
          <span>✓ Response within 24h</span>
          <span>✓ 100% free</span>
        </div>
        <form class="nd-exit-form" id="nd-exit-form">
          <input type="email" name="email" placeholder="your@email.com" required autocomplete="email" />
          <button type="submit" class="nd-exit-btn">Get my free audit →</button>
        </form>
        <div class="nd-exit-msg" id="nd-exit-msg" hidden></div>
        <p class="nd-exit-dismiss">No thanks, I don't need a better website.</p>
      </div>
    `;
    document.body.appendChild(overlay);

    injectStyles('nd-exit-styles', `
      #nd-exit-overlay{position:fixed;inset:0;background:rgba(6,17,36,.78);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:ndFadeIn .25s ease}
      .nd-exit-box{background:#fff;border-radius:20px;padding:40px 36px 32px;max-width:460px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.3);position:relative}
      .nd-exit-close{position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.6rem;color:#888;cursor:pointer;line-height:1}
      .nd-exit-icon{font-size:2.6rem;margin-bottom:12px}
      .nd-exit-title{font-size:1.55rem;font-weight:900;color:#0f172a;margin:0 0 10px;line-height:1.2}
      .nd-exit-sub{color:#475569;font-size:1rem;margin:0 0 16px;line-height:1.5}
      .nd-exit-badges{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px}
      .nd-exit-badges span{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:5px 12px;font-size:.82rem;font-weight:700}
      .nd-exit-form{display:flex;flex-direction:column;gap:10px}
      .nd-exit-form input{padding:14px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1rem;outline:none;transition:border-color .2s}
      .nd-exit-form input:focus{border-color:#1d4ed8}
      .nd-exit-btn{background:linear-gradient(135deg,#1d4ed8,#60a5fa);color:#fff;border:none;border-radius:12px;padding:15px;font-size:1rem;font-weight:800;cursor:pointer;transition:transform .2s}
      .nd-exit-btn:hover{transform:translateY(-2px)}
      .nd-exit-dismiss{color:#94a3b8;font-size:.82rem;cursor:pointer;margin-top:14px;text-decoration:underline}
      .nd-exit-msg{margin-top:12px;padding:12px;border-radius:10px;font-weight:600;font-size:.92rem}
      .nd-exit-msg.success{background:#ecfdf5;color:#166534}
      .nd-exit-msg.error{background:#fef2f2;color:#b91c1c}
      @keyframes ndFadeIn{from{opacity:0}to{opacity:1}}
    `);

    const closePopup = () => overlay.remove();
    overlay.querySelector('.nd-exit-close').addEventListener('click', closePopup);
    overlay.querySelector('.nd-exit-dismiss').addEventListener('click', closePopup);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePopup(); });

    overlay.querySelector('#nd-exit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const email = e.target.email.value.trim();
      const msgEl = overlay.querySelector('#nd-exit-msg');
      const btn = overlay.querySelector('.nd-exit-btn');
      btn.textContent = 'Sending…'; btn.disabled = true;
      LeadScore.add('exit_popup_submit', 25);
      try {
        const fd = new FormData();
        fd.append('email', email);
        fd.append('_subject', 'Free Audit Request — Nova Dev (Exit Popup EN)');
        fd.append('_captcha', 'false');
        fd.append('_template', 'table');
        fd.append('Source', 'Exit Intent Popup — EN');
        fd.append('UTM Source', UTM.source);
        fd.append('UTM Campaign', UTM.campaign);
        const r = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
        const d = await r.json().catch(() => ({}));
        if (r.ok && (d.success === true || d.success === 'true')) {
          msgEl.textContent = '✓ Perfect! Check your inbox within 24h.';
          msgEl.className = 'nd-exit-msg success';
          msgEl.hidden = false;
          setTimeout(closePopup, 3200);
          if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'exit_popup_audit' });
        } else { throw new Error('fail'); }
      } catch (_) {
        msgEl.textContent = 'An error occurred. Please use the main contact form.';
        msgEl.className = 'nd-exit-msg error';
        msgEl.hidden = false;
        btn.textContent = 'Try again'; btn.disabled = false;
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 2 — SOCIAL PROOF TICKER
  ──────────────────────────────────────────────────────────────── */
  const socialProofNotifs = [
    { icon: '🇬🇧', msg: '<strong>James T.</strong> (London) just requested a quote for an e-commerce site', time: '2 min ago' },
    { icon: '🇫🇷', msg: '<strong>Marie D.</strong> (Paris) booked a strategic consultation', time: '5 min ago' },
    { icon: '🇺🇸', msg: '<strong>Sarah K.</strong> (New York) started a mobile app project', time: '8 min ago' },
    { icon: '🇦🇺', msg: '<strong>Daniel R.</strong> (Sydney) launched his business website', time: '12 min ago' },
    { icon: '🇨🇦', msg: '<strong>Emily L.</strong> (Toronto) received her free web audit', time: '15 min ago' },
    { icon: '🇩🇪', msg: '<strong>Thomas B.</strong> (Berlin) is exploring premium packages', time: '18 min ago' },
    { icon: '🇬🇧', msg: '<strong>Sophie M.</strong> (Manchester) launched her landing page', time: '21 min ago' },
    { icon: '🇺🇸', msg: '<strong>Michael F.</strong> (Chicago) ordered a corporate website', time: '24 min ago' },
    { icon: '🇸🇬', msg: '<strong>Wei Z.</strong> (Singapore) requested an SEO audit', time: '28 min ago' },
    { icon: '🇫🇷', msg: '<strong>Antoine S.</strong> (Lyon) signed for a mobile application', time: '33 min ago' },
  ];

  let notifIndex = 0;
  let notifEl = null;

  function initSocialProof() {
    notifEl = document.createElement('div');
    notifEl.id = 'nd-notif';
    notifEl.setAttribute('role', 'status');
    notifEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(notifEl);

    injectStyles('nd-notif-styles', `
      #nd-notif{position:fixed;bottom:100px;left:20px;z-index:9990;max-width:320px;transition:all .4s ease;transform:translateX(-120%);opacity:0}
      #nd-notif.nd-notif-show{transform:translateX(0);opacity:1}
      .nd-notif-inner{background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.15);padding:14px 16px;display:flex;align-items:flex-start;gap:12px;border-left:4px solid #1d4ed8}
      .nd-notif-icon{font-size:1.5rem;flex-shrink:0;margin-top:2px}
      .nd-notif-body{flex:1;min-width:0}
      .nd-notif-text{font-size:.85rem;color:#1e293b;line-height:1.4;margin:0 0 4px}
      .nd-notif-time{font-size:.75rem;color:#94a3b8;margin:0}
      .nd-notif-close{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:1.1rem;padding:0;flex-shrink:0;align-self:flex-start;line-height:1}
      @media(max-width:480px){#nd-notif{max-width:calc(100vw - 40px)}}
    `);

    setTimeout(showNextNotif, CONFIG.notifDelay);
  }

  function showNextNotif() {
    const n = socialProofNotifs[notifIndex % socialProofNotifs.length];
    notifIndex++;
    notifEl.innerHTML = `
      <div class="nd-notif-inner">
        <div class="nd-notif-icon">${n.icon}</div>
        <div class="nd-notif-body">
          <p class="nd-notif-text">${n.msg}</p>
          <p class="nd-notif-time">🕐 ${n.time}</p>
        </div>
        <button class="nd-notif-close" aria-label="Close">&times;</button>
      </div>
    `;
    notifEl.querySelector('.nd-notif-close').addEventListener('click', () => {
      notifEl.classList.remove('nd-notif-show');
    });
    requestAnimationFrame(() => notifEl.classList.add('nd-notif-show'));
    LeadScore.add('saw_social_proof', 3);
    setTimeout(() => {
      notifEl.classList.remove('nd-notif-show');
      setTimeout(showNextNotif, CONFIG.notifInterval);
    }, 6000);
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 3 — ANIMATED STATS COUNTER
  ──────────────────────────────────────────────────────────────── */
  function initAnimatedCounters() {
    const statsData = [
      { strong: '98%', text: 'Happy clients', icon: '⭐', prefix: '', suffix: '%', value: 98 },
      { strong: '250+', text: 'Projects delivered', icon: '🚀', prefix: '', suffix: '+', value: 250 },
      { strong: '4.9/5', text: 'Average rating', icon: '⭐', prefix: '', suffix: '/5', value: 4.9 },
      { strong: '48h', text: 'Response time', icon: '⚡', prefix: '', suffix: 'h', value: 48 },
    ];

    const statsSection = document.querySelector('.stats');
    if (!statsSection) return;
    const grid = statsSection.querySelector('.stats-grid');
    if (!grid) return;

    grid.innerHTML = statsData.map((s, i) => `
      <div class="stat nd-stat" data-value="${s.value}" data-suffix="${s.suffix}" data-prefix="${s.prefix}" style="animation-delay:${i * 0.15}s">
        <div class="nd-stat-icon">${s.icon}</div>
        <strong class="nd-stat-num">${s.prefix}0${s.suffix}</strong>
        <span>${s.text}</span>
      </div>
    `).join('');

    injectStyles('nd-stats-styles', `
      .nd-stat{text-align:center;transition:transform .3s}
      .nd-stat:hover{transform:translateY(-4px)}
      .nd-stat-icon{font-size:1.8rem;margin-bottom:6px}
      .nd-stat strong{font-size:2.2rem!important;display:block;font-weight:900;letter-spacing:-0.03em}
    `);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('.nd-stat').forEach(el => {
          const target = parseFloat(el.dataset.value);
          const suffix = el.dataset.suffix;
          const prefix = el.dataset.prefix;
          const isDecimal = target % 1 !== 0;
          const numEl = el.querySelector('.nd-stat-num');
          const start = performance.now();
          function update(now) {
            const progress = Math.min((now - start) / CONFIG.counterDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = isDecimal ? (eased * target).toFixed(1) : Math.round(eased * target);
            numEl.textContent = prefix + current + suffix;
            if (progress < 1) requestAnimationFrame(update);
          }
          requestAnimationFrame(update);
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    observer.observe(statsSection);
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 4 — SMART STICKY BAR
  ──────────────────────────────────────────────────────────────── */
  let stickyShown = false;

  function showStickyBar() {
    if (stickyShown || sessionStorage.getItem('nd_sticky_dismissed')) return;
    stickyShown = true;

    const bar = document.createElement('div');
    bar.id = 'nd-sticky-bar';
    bar.innerHTML = `
      <div class="nd-sticky-inner">
        <span class="nd-sticky-text">
          <strong>🎯 Free website audit included</strong> — Receive a complete report for your website within 24h
        </span>
        <div class="nd-sticky-actions">
          <a href="#contact" class="nd-sticky-btn">Claim now →</a>
          <button class="nd-sticky-dismiss" aria-label="Close">&times;</button>
        </div>
      </div>
    `;
    document.body.prepend(bar);

    injectStyles('nd-sticky-styles', `
      #nd-sticky-bar{position:fixed;top:0;left:0;right:0;z-index:10001;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;transform:translateY(-100%);transition:transform .4s ease}
      #nd-sticky-bar.nd-bar-show{transform:translateY(0)}
      .nd-sticky-inner{max-width:1160px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .nd-sticky-text{font-size:.92rem;line-height:1.4;flex:1}
      .nd-sticky-text strong{font-weight:800}
      .nd-sticky-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
      .nd-sticky-btn{background:#fff;color:#1d4ed8;border-radius:999px;padding:8px 18px;font-size:.9rem;font-weight:800;text-decoration:none;white-space:nowrap;transition:transform .2s}
      .nd-sticky-btn:hover{transform:translateY(-1px)}
      .nd-sticky-dismiss{background:none;border:none;color:rgba(255,255,255,.7);font-size:1.3rem;cursor:pointer;line-height:1;padding:0}
      @media(max-width:600px){.nd-sticky-text{font-size:.82rem}.nd-sticky-btn{font-size:.82rem;padding:7px 14px}}
    `);

    setTimeout(() => bar.classList.add('nd-bar-show'), 100);
    LeadScore.add('saw_sticky_bar', 5);

    bar.querySelector('.nd-sticky-dismiss').addEventListener('click', () => {
      bar.classList.remove('nd-bar-show');
      setTimeout(() => bar.remove(), 400);
      sessionStorage.setItem('nd_sticky_dismissed', '1');
    });
    bar.querySelector('.nd-sticky-btn').addEventListener('click', () => {
      LeadScore.add('sticky_bar_click', 20);
    });
  }

  setTimeout(() => showStickyBar(), CONFIG.stickyBarDelay);

  /* ────────────────────────────────────────────────────────────────
     MODULE 5 — URGENCY / SCARCITY BANNER
  ──────────────────────────────────────────────────────────────── */
  function initUrgencyBanner() {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const diff = endOfMonth - now;
    const days = Math.floor(diff / 86400000);
    const hrs  = Math.floor((diff % 86400000) / 3600000);

    const hero = document.querySelector('.hero');
    if (!hero) return;

    const banner = document.createElement('div');
    banner.className = 'nd-urgency-banner';
    banner.innerHTML = `
      🔥 Launch offer — <strong>${CONFIG.urgencySlots} spots available this month</strong>
      · Free web audit included · Expires in <span id="nd-urgency-timer">${days}d ${hrs}h</span>
    `;
    hero.insertAdjacentElement('beforebegin', banner);

    injectStyles('nd-urgency-styles', `
      .nd-urgency-banner{background:linear-gradient(90deg,#b91c1c,#dc2626,#ef4444);color:#fff;text-align:center;padding:10px 20px;font-size:.88rem;font-weight:600;letter-spacing:.02em;position:relative;z-index:999}
      .nd-urgency-banner strong{font-weight:900}
      #nd-urgency-timer{font-weight:900;font-variant-numeric:tabular-nums;background:rgba(0,0,0,.2);padding:2px 8px;border-radius:6px;margin:0 2px}
    `);

    setInterval(() => {
      const now2 = new Date();
      const d2 = Math.floor((endOfMonth - now2) / 86400000);
      const h2 = Math.floor(((endOfMonth - now2) % 86400000) / 3600000);
      const m2 = Math.floor(((endOfMonth - now2) % 3600000) / 60000);
      const el = document.getElementById('nd-urgency-timer');
      if (el) el.textContent = `${d2}d ${h2}h ${m2}m`;
    }, 60000);
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 6 — WHATSAPP FLOATING CTA
  ──────────────────────────────────────────────────────────────── */
  function initWhatsApp() {
    const wa = document.createElement('a');
    wa.id = 'nd-whatsapp';
    wa.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${CONFIG.whatsappMsg}`;
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    wa.setAttribute('aria-label', 'Contact Nova Dev on WhatsApp');
    wa.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span class="nd-wa-tooltip">Let's discuss your project!</span>
    `;
    document.body.appendChild(wa);

    injectStyles('nd-wa-styles', `
      #nd-whatsapp{position:fixed;bottom:90px;right:20px;z-index:9995;width:56px;height:56px;background:#25d366;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;box-shadow:0 4px 20px rgba(37,211,102,.45);transition:transform .3s,box-shadow .3s;animation:ndWaPulse 2.5s ease infinite}
      #nd-whatsapp:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(37,211,102,.6)}
      .nd-wa-tooltip{position:absolute;right:calc(100% + 12px);background:#1e293b;color:#fff;padding:7px 12px;border-radius:8px;font-size:.82rem;font-weight:600;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s}
      #nd-whatsapp:hover .nd-wa-tooltip{opacity:1}
      @keyframes ndWaPulse{0%,100%{box-shadow:0 4px 20px rgba(37,211,102,.45)}50%{box-shadow:0 4px 32px rgba(37,211,102,.75)}}
    `);

    wa.addEventListener('click', () => {
      LeadScore.add('whatsapp_click', 30);
      if (typeof fbq === 'function') fbq('track', 'Contact', { content_name: 'whatsapp' });
    });
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 7 — HOT LEAD POPUP
  ──────────────────────────────────────────────────────────────── */
  function triggerHotLeadPopup() {
    if (sessionStorage.getItem('nd_exit_shown')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nd-hot-overlay';
    overlay.innerHTML = `
      <div class="nd-hot-box">
        <button class="nd-hot-close" aria-label="Close">&times;</button>
        <div class="nd-hot-badge">🔥 You seem interested</div>
        <h2 class="nd-hot-title">Let's talk about your project!</h2>
        <p class="nd-hot-sub">Our team can call you back within <strong>24 hours</strong> for a free consultation.</p>
        <form id="nd-hot-form" class="nd-hot-form">
          <input type="text" name="name" placeholder="Your first name" required />
          <input type="tel" name="phone" placeholder="Your phone number" />
          <input type="email" name="email" placeholder="Your email address" required />
          <button type="submit" class="nd-hot-btn">📞 Get a free callback</button>
        </form>
        <div class="nd-hot-msg" id="nd-hot-msg" hidden></div>
      </div>
    `;
    document.body.appendChild(overlay);
    injectStyles('nd-hot-styles', `
      #nd-hot-overlay{position:fixed;inset:0;background:rgba(6,17,36,.75);backdrop-filter:blur(5px);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;animation:ndFadeIn .3s ease}
      .nd-hot-box{background:#fff;border-radius:20px;padding:36px;max-width:420px;width:100%;text-align:center;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.25)}
      .nd-hot-close{position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.6rem;color:#888;cursor:pointer}
      .nd-hot-badge{display:inline-block;background:#fff3cd;color:#92400e;border-radius:999px;padding:6px 14px;font-size:.82rem;font-weight:700;margin-bottom:12px}
      .nd-hot-title{font-size:1.4rem;font-weight:900;color:#0f172a;margin:0 0 10px}
      .nd-hot-sub{color:#475569;margin:0 0 18px;font-size:.95rem}
      .nd-hot-form{display:flex;flex-direction:column;gap:10px}
      .nd-hot-form input{padding:13px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:.95rem;outline:none;transition:border-color .2s}
      .nd-hot-form input:focus{border-color:#1d4ed8}
      .nd-hot-btn{background:linear-gradient(135deg,#1d4ed8,#60a5fa);color:#fff;border:none;border-radius:10px;padding:14px;font-size:.98rem;font-weight:800;cursor:pointer;transition:transform .2s}
      .nd-hot-btn:hover{transform:translateY(-2px)}
      .nd-hot-msg{margin-top:10px;padding:10px;border-radius:8px;font-weight:600;font-size:.9rem}
      .nd-hot-msg.success{background:#ecfdf5;color:#166534}
      .nd-hot-msg.error{background:#fef2f2;color:#b91c1c}
    `);

    const close = () => overlay.remove();
    overlay.querySelector('.nd-hot-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#nd-hot-form').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const btn = f.querySelector('.nd-hot-btn');
      const msg = overlay.querySelector('#nd-hot-msg');
      btn.textContent = 'Sending…'; btn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('First Name', f.name.value);
        fd.append('Phone', f.phone.value);
        fd.append('Email', f.email.value);
        fd.append('_subject', `Callback Requested — Nova Dev (Hot Lead EN)`);
        fd.append('_captcha', 'false');
        fd.append('_template', 'table');
        fd.append('Lead Score', LeadScore.score.toString());
        fd.append('Source', 'Hot Lead Popup EN');
        fd.append('UTM', JSON.stringify(UTM));
        const r = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
        const d = await r.json().catch(() => ({}));
        if (r.ok && (d.success === true || d.success === 'true')) {
          msg.textContent = '✓ Perfect! We will call you back within 24h.';
          msg.className = 'nd-hot-msg success';
          msg.hidden = false;
          setTimeout(close, 3000);
          if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'hot_lead_popup' });
        } else { throw new Error(); }
      } catch (_) {
        msg.textContent = 'Error — please use the main contact form.';
        msg.className = 'nd-hot-msg error';
        msg.hidden = false;
        btn.textContent = '📞 Get a free callback'; btn.disabled = false;
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 8 — TRUST BADGES SECTION
  ──────────────────────────────────────────────────────────────── */
  function initTrustBadges() {
    const contact = document.getElementById('contact');
    if (!contact) return;
    const badges = document.createElement('div');
    badges.className = 'nd-trust-strip';
    badges.innerHTML = `
      <div class="nd-trust-inner">
        <div class="nd-trust-item"><span>🔒</span><strong>100% Secure Payment</strong></div>
        <div class="nd-trust-item"><span>✅</span><strong>Satisfaction Guaranteed</strong></div>
        <div class="nd-trust-item"><span>⚡</span><strong>2-week Delivery</strong></div>
        <div class="nd-trust-item"><span>🛡️</span><strong>GDPR Compliant</strong></div>
        <div class="nd-trust-item"><span>🤝</span><strong>30-day Support Included</strong></div>
        <div class="nd-trust-item"><span>🌍</span><strong>Clients in 8 Countries</strong></div>
      </div>
    `;
    contact.insertAdjacentElement('beforebegin', badges);

    injectStyles('nd-trust-styles', `
      .nd-trust-strip{background:#f8faff;border-top:1px solid #dbeafe;border-bottom:1px solid #dbeafe;padding:20px 0;overflow:hidden}
      .nd-trust-inner{max-width:1160px;margin:0 auto;padding:0 16px;display:flex;flex-wrap:wrap;gap:16px 28px;justify-content:center;align-items:center}
      .nd-trust-item{display:flex;align-items:center;gap:8px;font-size:.9rem}
      .nd-trust-item span{font-size:1.2rem}
      .nd-trust-item strong{font-weight:700;color:#1e293b}
    `);
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 9 — COOKIE CONSENT BANNER (GDPR)
  ──────────────────────────────────────────────────────────────── */
  function initCookieConsent() {
    if (localStorage.getItem('nd_cookies_accepted')) return;
    const bar = document.createElement('div');
    bar.id = 'nd-cookie-bar';
    bar.innerHTML = `
      <div class="nd-cookie-inner">
        <p>🍪 We use cookies to improve your experience and measure our audience. Your privacy matters to us.
          <a href="#" class="nd-cookie-more">Learn more</a>
        </p>
        <div class="nd-cookie-btns">
          <button class="nd-cookie-accept">Accept</button>
          <button class="nd-cookie-decline">Decline</button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);

    injectStyles('nd-cookie-styles', `
      #nd-cookie-bar{position:fixed;bottom:0;left:0;right:0;z-index:99997;background:#0f172a;color:#e2e8f0;padding:16px 20px;box-shadow:0 -4px 20px rgba(0,0,0,.3);transform:translateY(100%);transition:transform .4s ease}
      #nd-cookie-bar.nd-cookie-show{transform:translateY(0)}
      .nd-cookie-inner{max-width:1160px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .nd-cookie-inner p{margin:0;font-size:.88rem;line-height:1.5;flex:1}
      .nd-cookie-more{color:#60a5fa;text-decoration:underline}
      .nd-cookie-btns{display:flex;gap:10px;flex-shrink:0}
      .nd-cookie-accept{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:.88rem;font-weight:700;cursor:pointer}
      .nd-cookie-decline{background:rgba(255,255,255,.1);color:#e2e8f0;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:9px 18px;font-size:.88rem;cursor:pointer}
    `);

    setTimeout(() => bar.classList.add('nd-cookie-show'), 1500);
    bar.querySelector('.nd-cookie-accept').addEventListener('click', () => {
      localStorage.setItem('nd_cookies_accepted', '1');
      bar.classList.remove('nd-cookie-show');
      setTimeout(() => bar.remove(), 400);
      LeadScore.add('cookie_accepted', 5);
    });
    bar.querySelector('.nd-cookie-decline').addEventListener('click', () => {
      localStorage.setItem('nd_cookies_accepted', '0');
      bar.classList.remove('nd-cookie-show');
      setTimeout(() => bar.remove(), 400);
    });
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 10 — SEO SCHEMA MARKUP (JSON-LD)
  ──────────────────────────────────────────────────────────────── */
  function injectSchemaMarkup() {
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LocalBusiness",
          "@id": "https://novadev-audit.vercel.app/#business",
          "name": "Nova Dev",
          "description": "Premium web design agency, mobile app development and digital experiences for ambitious businesses. Serving clients in France, UK, USA and worldwide.",
          "url": "https://novadev-audit.vercel.app",
          "logo": "https://novadev-audit.vercel.app/assets/img/logo.png",
          "priceRange": "€€",
          "telephone": "+33612345678",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "FR",
            "addressRegion": "Île-de-France"
          },
          "areaServed": ["France", "United Kingdom", "United States", "Europe"],
          "serviceType": ["Web Design", "Mobile App Development", "UI/UX Design", "SEO", "E-commerce"],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "87",
            "bestRating": "5"
          },
          "sameAs": ["https://github.com/massziri"]
        },
        {
          "@type": "WebSite",
          "@id": "https://novadev-audit.vercel.app/#website",
          "url": "https://novadev-audit.vercel.app",
          "name": "Nova Dev — Premium Web Design Agency",
          "inLanguage": "en-GB"
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "How much does a professional website cost at Nova Dev?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Our professional websites start from €150. Pricing depends on project complexity: landing page, business site, e-commerce or mobile application."
              }
            },
            {
              "@type": "Question",
              "name": "How long does it take to build a website?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Typically 2 to 4 weeks for a standard business website. E-commerce projects and mobile apps can take 4 to 16 weeks depending on complexity."
              }
            },
            {
              "@type": "Question",
              "name": "Does Nova Dev build mobile apps?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, we build high-performance iOS and Android applications from €200, with polished UX and strong technical execution."
              }
            }
          ]
        }
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 11 — LIVE VISITOR COUNTER
  ──────────────────────────────────────────────────────────────── */
  function initLiveCounter() {
    const hero = document.querySelector('.hero .eyebrow');
    if (!hero) return;
    const baseCount = 12 + Math.floor(Math.random() * 8);
    const counter = document.createElement('div');
    counter.className = 'nd-live-count';
    counter.innerHTML = `
      <span class="nd-live-dot"></span>
      <span class="nd-live-num">${baseCount}</span> people viewing this page right now
    `;
    hero.insertAdjacentElement('afterend', counter);

    injectStyles('nd-live-styles', `
      .nd-live-count{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:7px 14px;font-size:.82rem;font-weight:700;color:rgba(255,255,255,.9);margin:10px 0 0;letter-spacing:.02em}
      .nd-live-dot{width:8px;height:8px;background:#4ade80;border-radius:50%;animation:ndBlink 1.4s ease infinite;flex-shrink:0}
      @keyframes ndBlink{0%,100%{opacity:1}50%{opacity:.3}}
    `);

    setInterval(() => {
      const numEl = counter.querySelector('.nd-live-num');
      if (numEl) {
        const curr = parseInt(numEl.textContent);
        const delta = Math.random() < 0.5 ? -1 : 1;
        numEl.textContent = Math.max(8, Math.min(25, curr + delta));
      }
    }, 8000);
  }

  /* ────────────────────────────────────────────────────────────────
     MODULE 12 — TESTIMONIALS AUTO-ROTATE
  ──────────────────────────────────────────────────────────────── */
  function initTestimonialRotation() {
    const testimonials = document.querySelectorAll('.testimonials .card.quote');
    if (testimonials.length < 2) return;
    let current = 0;
    testimonials.forEach((t, i) => {
      t.style.transition = 'opacity .5s ease, transform .5s ease';
      if (i !== 0) { t.style.opacity = '0.4'; t.style.transform = 'scale(0.97)'; }
    });
    setInterval(() => {
      testimonials[current].style.opacity = '0.4';
      testimonials[current].style.transform = 'scale(0.97)';
      current = (current + 1) % testimonials.length;
      testimonials[current].style.opacity = '1';
      testimonials[current].style.transform = 'scale(1.02)';
    }, 4000);
  }

  /* ────────────────────────────────────────────────────────────────
     UTILITY — Inject styles into <head>
  ──────────────────────────────────────────────────────────────── */
  function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ────────────────────────────────────────────────────────────────
     INTERACTION TRACKING
  ──────────────────────────────────────────────────────────────── */
  function initInteractionTracking() {
    document.querySelectorAll('.btn-primary').forEach(btn => {
      btn.addEventListener('click', () => LeadScore.add('cta_click', 15));
    });
    document.getElementById('contactForm')?.addEventListener('focusin', () => {
      LeadScore.add('form_focus', 10);
    });
    setTimeout(() => LeadScore.add('time_30s', 8), 30000);
    setTimeout(() => LeadScore.add('time_60s', 12), 60000);
    setTimeout(() => LeadScore.add('time_2min', 15), 120000);
  }

  /* ────────────────────────────────────────────────────────────────
     INIT — Start all modules
  ──────────────────────────────────────────────────────────────── */
  function init() {
    LeadScore.init();
    injectSchemaMarkup();
    initExitIntent();
    initSocialProof();
    initAnimatedCounters();
    initUrgencyBanner();
    initWhatsApp();
    initTrustBadges();
    initCookieConsent();
    initLiveCounter();
    initTestimonialRotation();
    initInteractionTracking();

    LeadScore.add('page_visit', 2);
    console.log('%c🚀 Nova Dev Marketing Automation v1.0 — Active', 'color:#1d4ed8;font-weight:bold;font-size:14px');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
