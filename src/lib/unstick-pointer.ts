const isAnyModalOpen = () =>
  Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'));

const release = () => {
  const body = document.body;
  if (body.style.pointerEvents === 'none' && !isAnyModalOpen()) body.style.pointerEvents = '';
};

export const startPointerGuard = () => {
  if (typeof window === 'undefined') return;
  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(release, 350);
  };
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['style'] });
  window.addEventListener('pointerdown', release, true);
};
