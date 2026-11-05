import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'nestjs-honeypot',
  description: 'Admin-route honeypot for NestJS applications',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#e0234e' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'API', link: '/api-reference' },
      { text: 'v1.0.0', link: 'https://github.com/Silent-Watcher/nestjs-honeypot/releases' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Events', link: '/events' },
          { text: 'Adapters', link: '/adapters' },
          { text: 'Security', link: '/security' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API Reference', link: '/api-reference' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/Silent-Watcher/nestjs-honeypot' }],
    search: { provider: 'local' },
    outline: [2, 3],
    editLink: {
      pattern: 'https://github.com/Silent-Watcher/nestjs-honeypot/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Silent-Watcher',
    },
  },
})
