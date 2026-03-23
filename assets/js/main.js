(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('[data-menu-toggle]');
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  const error = document.getElementById('formError');
  const submit = form?.querySelector('button[type="submit"]');
  const lang = document.documentElement.lang || 'en';

  const messages = {
    en: {
      required: 'Please complete the required fields before submitting your request.',
      sending: 'Sending your request…',
      submit: 'Book my consultation',
      fallback: 'We could not send your request right now. Please try again in a moment.',
      network: 'A network error occurred. Please try again in a moment.'
    },
    fr: {
      required: 'Veuillez remplir les champs obligatoires avant d’envoyer votre demande.',
      sending: 'Envoi en cours…',
      submit: 'Réserver ma consultation',
      fallback: 'Nous n’avons pas pu envoyer votre demande pour le moment. Merci de réessayer dans un instant.',
      network: 'Une erreur réseau est survenue. Merci de réessayer dans un instant.'
    }
  };

  const t = messages[lang.startsWith('fr') ? 'fr' : 'en'];

  toggle?.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      header?.classList.remove('menu-open');
      toggle?.setAttribute('aria-expanded', 'false');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const showAlert = (element, message) => {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
  };

  const hideAlerts = () => {
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    hideAlerts();

    const data = new FormData(form);
    const firstName = (data.get('fname') || '').toString().trim();
    const lastName = (data.get('lname') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const company = (data.get('company') || '').toString().trim();

    if (!firstName || !lastName || !email || !company) {
      showAlert(error, t.required);
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.dataset.original = submit.textContent;
      submit.textContent = t.sending;
    }

    try {
      const response = await fetch('https://formsubmit.co/ajax/admin@novatvhub.com', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      });

      const result = await response.json().catch(() => ({}));
      const successFlag = result.success === true || result.success === 'true';

      if (response.ok && successFlag) {
        window.location.href = 'thank-you.html';
        return;
      }

      showAlert(error, result.message || t.fallback);
    } catch (err) {
      showAlert(error, t.network);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.original || t.submit;
      }
    }
  });
})();
