const NAV_LINK_CLASS = 'text-sm font-medium text-neutral-600 hover:text-primary'

export const siteShell = (content: string): string =>
  [
    '<div class="flex min-h-screen flex-col bg-neutral-50">',
    '<header class="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm">',
    '<div class="flex h-14 items-center justify-between px-6">',
    '<nav class="flex items-center gap-6">',
    '<a href="/" class="font-display text-lg font-bold text-neutral-900">Between the Bread</a>',
    `<a href="/sandwiches" class="${NAV_LINK_CLASS}">Sandwiches</a>`,
    `<a href="/blog" class="${NAV_LINK_CLASS}">Blog</a>`,
    '</nav>',
    '</div>',
    '</header>',
    `<main class="flex-1">${content}</main>`,
    '</div>',
  ].join('')
