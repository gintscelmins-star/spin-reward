(function () {
  'use strict';

  // Find the script tag with data-wheel attribute
  var scripts = document.querySelectorAll('script[data-wheel]');
  var script = scripts[scripts.length - 1];
  if (!script) return;

  var slug = script.getAttribute('data-wheel');
  if (!slug) return;

  // Derive base URL from script src
  var baseUrl = '';
  try {
    baseUrl = script.src ? new URL(script.src).origin : window.location.origin;
  } catch (e) {
    baseUrl = window.location.origin;
  }

  var storageKey = 'spillit_' + slug;

  // Skip if already shown to this user
  try {
    if (localStorage.getItem(storageKey)) return;
  } catch (e) {}

  // Fetch wheel config (public endpoint)
  fetch(baseUrl + '/api/w/' + slug)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (wheel) {
      if (!wheel || !wheel.active) return;
      setupTrigger(wheel);
    })
    .catch(function () {});

  function setupTrigger(wheel) {
    var type = wheel.trigger_type || 'delay';
    var value = parseInt(wheel.trigger_value, 10) || 5;
    var displayType = wheel.display_type || 'popup';

    if (type === 'delay') {
      setTimeout(function () { show(displayType); }, value * 1000);

    } else if (type === 'exit_intent') {
      var fired = false;
      document.addEventListener('mouseleave', function handler(e) {
        if (fired || e.clientY > 0) return;
        fired = true;
        document.removeEventListener('mouseleave', handler);
        show(displayType);
      });

    } else if (type === 'scroll_pct') {
      var scrollFired = false;
      window.addEventListener('scroll', function handler() {
        if (scrollFired) return;
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        if (docH <= 0) return;
        var pct = (window.scrollY / docH) * 100;
        if (pct >= value) {
          scrollFired = true;
          window.removeEventListener('scroll', handler);
          show(displayType);
        }
      }, { passive: true });

    } else if (type === 'element_click') {
      document.querySelectorAll('[data-spillit-trigger]').forEach(function (el) {
        el.addEventListener('click', function () { show(displayType); });
      });

    } else if (type === 'inline') {
      var inlineTarget = document.querySelector('[data-spillit-inline]');
      if (inlineTarget) showInline(inlineTarget);

    } else if (type === 'direct_link') {
      show(displayType);
    }
  }

  function show(displayType) {
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch (e) {}

    if (displayType === 'inline') {
      var target = document.querySelector('[data-spillit-inline]');
      if (target) showInline(target);
    } else {
      showPopup();
    }
  }

  function showPopup() {
    // Prevent duplicate overlays
    if (document.getElementById('spillit-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'spillit-overlay';
    overlay.setAttribute('style', [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'z-index:2147483647',
      'background:rgba(0,0,0,0.6)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
      'box-sizing:border-box',
    ].join(';'));

    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/w/' + slug + '?mode=popup';
    iframe.allow = 'clipboard-write';
    iframe.setAttribute('style', [
      'width:480px',
      'max-width:100%',
      'height:600px',
      'max-height:calc(100vh - 32px)',
      'border:none',
      'border-radius:16px',
      'background:#fff',
      'display:block',
    ].join(';'));

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function close() {
      if (!overlay.parentNode) return;
      overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = prevOverflow;
      try { localStorage.setItem(storageKey, String(Date.now())); } catch (e) {}
    }

    // Close when clicking the dark backdrop
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    // Close on postMessage from iframe (close button or after conversion)
    function msgHandler(e) {
      if (!e.data) return;
      if (e.data.type === 'spillit:close' || e.data.type === 'spillit:converted') {
        window.removeEventListener('message', msgHandler);
        close();
      }
    }
    window.addEventListener('message', msgHandler);
  }

  function showInline(target) {
    // Only mount once
    if (target.querySelector('iframe[data-spillit]')) return;

    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/w/' + slug + '?mode=inline';
    iframe.setAttribute('data-spillit', '1');
    iframe.allow = 'clipboard-write';
    iframe.setAttribute('style', [
      'width:100%',
      'height:600px',
      'border:none',
      'border-radius:16px',
      'display:block',
    ].join(';'));
    target.appendChild(iframe);

    // Mark as shown so popup triggers don't also fire
    try { localStorage.setItem(storageKey, String(Date.now())); } catch (e) {}
  }
})();
