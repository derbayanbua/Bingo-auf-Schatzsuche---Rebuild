// Tiny DOM helpers + accessible modal dialogs and toasts.

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, '').toLowerCase(), v as EventListener);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const c of children) if (c != null) el.append(c);
  return el;
}

export function html(markup: string): DocumentFragment {
  const t = document.createElement('template');
  t.innerHTML = markup;
  return t.content;
}

let toastHost: HTMLElement | null = null;
export function toast(msg: string, kind: 'info' | 'good' | 'bad' = 'info', ms = 2600) {
  if (!toastHost) {
    toastHost = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const t = h('div', { class: `toast toast-${kind}` }, msg);
  toastHost.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export interface DialogButton {
  label: string;
  value: string;
  primary?: boolean;
  danger?: boolean;
}

/** Modal dialog; resolves with the clicked button value ('' on Escape/backdrop). */
export function dialog(title: string, body: string | Node, buttons: DialogButton[]): Promise<string> {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const close = (v: string) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('');
    };
    const content = typeof body === 'string' ? h('p', {}, body) : body;
    const btns = buttons.map((b) =>
      h('button', { class: `btn${b.primary ? ' btn-primary' : ''}${b.danger ? ' btn-danger' : ''}`, onclick: () => close(b.value) }, b.label),
    );
    const box = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h2', {}, title), content, h('div', { class: 'dialog-buttons' }, ...btns));
    const overlay: HTMLDivElement = h('div', { class: 'overlay', onclick: (e: Event) => e.target === overlay && close('') }, box);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    (btns.find((_, i) => buttons[i].primary) ?? btns[0])?.focus();
  });
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
