const NAV_LINK_CLASS = 'whitespace-nowrap py-1 text-sm font-medium text-neutral-600 hover:text-primary'

export const siteShell = (content: string): string =>
  [
    '<div class="flex min-h-screen flex-col bg-neutral-50">',
    '<header class="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm">',
    '<div class="flex flex-wrap items-center justify-between gap-x-6 px-4 py-2 sm:h-14 sm:flex-nowrap sm:justify-start sm:px-6 sm:py-0">',
    '<a href="/" class="whitespace-nowrap py-1 font-display text-lg font-bold text-neutral-900">Between the Bread</a>',
    '<nav aria-label="Main" class="order-last flex w-full items-center gap-6 sm:order-none sm:w-auto">',
    `<a href="/sandwiches" class="${NAV_LINK_CLASS}">Sandwiches</a>`,
    `<a href="/community" class="${NAV_LINK_CLASS}">Community</a>`,
    `<a href="/blog" class="${NAV_LINK_CLASS}">Blog</a>`,
    '</nav>',
    '</div>',
    '</header>',
    `<main class="flex-1">${content}</main>`,
    '</div>',
  ].join('')
