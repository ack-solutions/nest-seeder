import { defineConfig } from 'vitepress';

const GITHUB = 'https://github.com/ack-solutions/nest-seeder';
const NPM = 'https://www.npmjs.com/package/@ackplus/nest-seeder';

export default defineConfig({
    lang: 'en-US',
    title: 'nest-seeder',
    description:
        'A powerful, CLI-first database seeding library for NestJS — factories, Faker.js, and a great DX.',

    // Deployed at https://ack-solutions.github.io/nest-seeder/
    base: '/nest-seeder/',
    cleanUrls: true,
    lastUpdated: true,
    ignoreDeadLinks: true,

    head: [
        ['meta', { name: 'theme-color', content: '#e0234e' }],
        ['meta', { property: 'og:title', content: '@ackplus/nest-seeder' }],
        [
            'meta',
            {
                property: 'og:description',
                content: 'CLI-first database seeding for NestJS.',
            },
        ],
    ],

    themeConfig: {
        nav: [
            { text: 'Guide', link: '/guide/introduction' },
            { text: 'CLI', link: '/guide/cli' },
            { text: 'API', link: '/api/' },
            { text: 'Migration', link: '/migration' },
            { text: 'Changelog', link: '/changelog' },
            {
                text: 'Links',
                items: [
                    { text: 'npm', link: NPM },
                    { text: 'GitHub', link: GITHUB },
                    { text: 'Issues', link: `${GITHUB}/issues` },
                ],
            },
        ],

        sidebar: {
            '/guide/': [
                {
                    text: 'Introduction',
                    items: [
                        { text: 'What is nest-seeder?', link: '/guide/introduction' },
                        { text: 'Getting Started', link: '/guide/getting-started' },
                    ],
                },
                {
                    text: 'Core Concepts',
                    items: [
                        { text: 'Factories', link: '/guide/factories' },
                        { text: 'Seeders', link: '/guide/seeders' },
                        { text: 'Configuration', link: '/guide/configuration' },
                        { text: 'CLI', link: '/guide/cli' },
                    ],
                },
                {
                    text: 'Databases & ORMs',
                    items: [
                        { text: 'TypeORM', link: '/guide/orms/typeorm' },
                        { text: 'Mongoose', link: '/guide/orms/mongoose' },
                        { text: 'Prisma', link: '/guide/orms/prisma' },
                    ],
                },
                {
                    text: 'Going Further',
                    items: [
                        { text: 'Recipes', link: '/guide/recipes' },
                        { text: 'Testing', link: '/guide/testing' },
                        { text: 'Troubleshooting', link: '/guide/troubleshooting' },
                    ],
                },
            ],
            '/api/': [
                {
                    text: 'API Reference',
                    items: [
                        { text: 'Overview', link: '/api/' },
                        { text: 'DataFactory', link: '/api/data-factory' },
                        { text: '@Factory', link: '/api/factory-decorator' },
                        { text: 'Seeder & @SeederName', link: '/api/seeder' },
                        { text: 'defineSeederConfig', link: '/api/define-config' },
                        { text: 'SeederService & Module', link: '/api/seeder-service' },
                    ],
                },
            ],
        },

        socialLinks: [{ icon: 'github', link: GITHUB }],

        editLink: {
            pattern: `${GITHUB}/edit/main/docs/:path`,
            text: 'Edit this page on GitHub',
        },

        search: { provider: 'local' },

        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © AckPlus',
        },
    },
});
