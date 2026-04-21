import {{ defineConfig }} from 'vitepress'

export default defineConfig({{
  title: "fam007e Extensions",
  description: "A personal repository of extensions for Mihon and Tachiyomi.",
  base: '/extensions-source/',
  themeConfig: {{
    nav: [
      {{ text: 'Guide', link: '/guide' }},
      {{ text: 'Extensions', link: '/extensions' }}
    ],
    socialLinks: [
      {{ icon: 'github', link: 'https://github.com/fam007e/extensions-source' }}
    ]
  }}
}})
