export function showTab(id) {
  document.querySelectorAll('.tab').forEach((button) => {
    const current = button.dataset.tab === id;
    button.setAttribute('aria-selected', String(current));
    if (current) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  });
  document.getElementById(id)?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  });
}

export function initNavigation() {
  document
    .querySelectorAll('[data-scroll]:not([data-close-workspace])')
    .forEach((button) => {
      button.addEventListener('click', () => showTab(button.dataset.scroll));
    });
  // The sticky navigation's actual height also covers wrapped mobile labels.
  const navigation = document.querySelector('nav.tabs');
  new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty(
      '--navigation-height',
      `${entry.target.getBoundingClientRect().height + 8}px`,
    );
  }).observe(navigation);
}
