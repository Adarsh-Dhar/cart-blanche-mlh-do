import { PrismaClient } from '../frontend/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {

  // ── 1. VENDORS ─────────────────────────────────────────────────────────────

  const infraVendor = await prisma.vendor.upsert({
    where: { pubkey: 'ST3GA9VQKYW677PDQHMBEEK3G53343N5YY7JWN7J1' },
    update: {},
    create: {
      name: "BitCompute Cloud",
      description: "High-performance GPU credits, API throughput vouchers, and cloud storage.",
      pubkey: 'ST3GA9VQKYW677PDQHMBEEK3G53343N5YY7JWN7J1',
      logoUrl: "https://api.placeholder.com/150/0000FF?text=BitCompute",
    },
  });

  const creativeVendor = await prisma.vendor.upsert({
    where: { pubkey: 'ST1F5VZCFZD8YKYH5B2ZRCYDMK54P7E7YX0Q45EPE' },
    update: {},
    create: {
      name: "AssetStream Digital",
      description: "Premium UI kits, 3D assets, fonts, stock media, and motion graphics.",
      pubkey: 'ST1F5VZCFZD8YKYH5B2ZRCYDMK54P7E7YX0Q45EPE',
      logoUrl: "https://api.placeholder.com/150/FF00FF?text=AssetStream",
    },
  });

  const softwareVendor = await prisma.vendor.upsert({
    where: { pubkey: 'ST2WSR4ACNNH0D50GA38ACG4B56ZGX12F7BW1YD8K' },
    update: {},
    create: {
      name: "DevVault Pro",
      description: "SaaS licenses, IDE plugins, deployment credits, and developer certifications.",
      pubkey: 'ST2WSR4ACNNH0D50GA38ACG4B56ZGX12F7BW1YD8K',
      logoUrl: "https://api.placeholder.com/150/00FF00?text=DevVault",
    },
  });

  const aiVendor = await prisma.vendor.upsert({
    where: { pubkey: 'ST2EPX5MCS97MRBWF4XA9WMT3843Q35X4ZA3EGN0R' },
    update: {},
    create: {
      name: "NeuralForge AI",
      description: "AI model access vouchers, fine-tuning credits, prompt packs, and AI toolkits.",
      pubkey: 'ST2EPX5MCS97MRBWF4XA9WMT3843Q35X4ZA3EGN0R',
      logoUrl: "https://api.placeholder.com/150/FF6600?text=NeuralForge",
    },
  });

  const eduVendor = await prisma.vendor.upsert({
    where: { pubkey: 'STYXTJYZ857ZC4ARZ2EHNPG4YRJ2WD090JMB09CT' },
    update: {},
    create: {
      name: "LearnChain Academy",
      description: "Certification vouchers, online course bundles, and skill bootcamps.",
      pubkey: 'STYXTJYZ857ZC4ARZ2EHNPG4YRJ2WD090JMB09CT',
      logoUrl: "https://api.placeholder.com/150/00CCFF?text=LearnChain",
    },
  });

  const securityVendor = await prisma.vendor.upsert({
    where: { pubkey: 'STN2CBVQ6S2QGY27DM30281XV2NCS3GEQ2YQCCQ3' },
    update: {},
    create: {
      name: "CipherStack Security",
      description: "Cybersecurity tools, VPN subscriptions, pen-testing kits, and compliance packs.",
      pubkey: 'STN2CBVQ6S2QGY27DM30281XV2NCS3GEQ2YQCCQ3',
      logoUrl: "https://api.placeholder.com/150/CC0000?text=CipherStack",
    },
  });

  // ── 2. CATEGORIES ──────────────────────────────────────────────────────────

  const categoryDefs = [
    { name: 'Cloud & Compute',       slug: 'compute' },
    { name: 'AI & Machine Learning', slug: 'ai-ml' },
    { name: 'Creative Assets',       slug: 'creative' },
    { name: 'Audio & Music',         slug: 'audio' },
    { name: 'SaaS Subscriptions',    slug: 'saas' },
    { name: 'Developer Tools',       slug: 'dev-tools' },
    { name: 'Education Vouchers',    slug: 'edu' },
    { name: 'Cybersecurity',         slug: 'security' },
    { name: 'Design & Fonts',        slug: 'design' },
    { name: 'Data & Analytics',      slug: 'data' },
    { name: 'Game Development',      slug: 'gamedev' },
    { name: 'Marketing & SEO',       slug: 'marketing' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }

  // ── 3. PRODUCTS ────────────────────────────────────────────────────────────
  // Format: { productID, name, description, price, cat, vendor, sku? }

  const products = [

    // ── BITCOMPUTE CLOUD ─── Cloud & Compute ──────────────────────────────────
    {
      productID: 'GPU-H100-100H',
      name: '100 Hours H100 GPU Cluster',
      description: 'Instant-access 100-hour block of NVIDIA H100 GPU cluster time. Ideal for ML model training, 3D rendering, video encoding, and game asset baking. License keys delivered on payment.',
      price: 250, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-A100-200H',
      name: '200 Hours A100 GPU Instance',
      description: '200-hour A100 GPU block for large-scale deep learning training, PyTorch/TensorFlow workloads, and HPC simulations. Great value for researchers and AI startups.',
      price: 320, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-RTX4090-50H',
      name: '50 Hours RTX 4090 Instance',
      description: 'Consumer-grade GPU powerhouse. 50-hour RTX 4090 block ideal for game development, real-time ray tracing, 3D animation rendering, and fast prototyping.',
      price: 75, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'STORAGE-1TB-YEAR',
      name: '1TB Cloud Object Storage (1 Year)',
      description: 'Scalable, S3-compatible cloud object storage. Ideal for ML datasets, game asset repositories, backup, and media hosting. Instant provisioning.',
      price: 48, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CDN-10TB-CREDIT',
      name: '10TB CDN Bandwidth Credit',
      description: 'Pre-paid CDN bandwidth credit for global content delivery. Use for web apps, game downloads, video streaming, and static asset serving.',
      price: 35, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'SERVER-VPS-1YR',
      name: 'Dedicated VPS (4 vCPU / 8GB RAM, 1 Year)',
      description: 'Linux VPS with 4 vCPUs, 8GB RAM, 100GB NVMe SSD. Pre-paid annual plan. Perfect for hosting APIs, bots, backends, or databases.',
      price: 120, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },

    // ── NEURALFORGE AI ─── AI & Machine Learning ──────────────────────────────
    {
      productID: 'API-GPT4-50M',
      name: '50M Token GPT-4 Proxy Voucher',
      description: 'Prepaid voucher for 50 million tokens via a reliable GPT-4 proxy endpoint. Ideal for AI researchers, chatbot development, RAG pipelines, and LLM prototyping.',
      price: 99, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-GPT4-200M',
      name: '200M Token GPT-4 Proxy Voucher',
      description: 'High-volume prepaid voucher for 200M GPT-4 tokens. Best for production AI apps, large-scale document analysis, and enterprise integrations.',
      price: 349, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-CLAUDE-100M',
      name: '100M Token Claude API Voucher',
      description: 'Prepaid Claude API credit voucher — 100 million tokens. Excellent for long-context summarisation, coding assistance, and reasoning-heavy pipelines.',
      price: 180, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-FINETUNE-10K',
      name: 'LLM Fine-Tuning Pack (10K samples)',
      description: 'Fine-tuning service credit: upload up to 10,000 training samples to fine-tune an open-source LLM (Llama 3, Mistral, or Falcon). Results in a custom model checkpoint.',
      price: 199, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-IMGGEN-5K',
      name: '5,000 Image Generation Credits',
      description: 'Prepaid credits for 5,000 AI image generations via Stable Diffusion XL or FLUX. Supports text-to-image, img2img, inpainting, and ControlNet.',
      price: 45, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-PROMPTPACK-PRO',
      name: 'AI Prompt Engineering Pack (Pro)',
      description: '500+ hand-crafted, battle-tested prompts for ChatGPT, Claude, Midjourney, and Stable Diffusion. Covers coding, content, business, creative, and research use cases.',
      price: 29, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-VECTORDB-1YR',
      name: 'Managed Vector DB (1 Year, 10M vectors)',
      description: 'Hosted vector database subscription (Pinecone-compatible) supporting up to 10 million vectors. Essential for RAG apps, semantic search, and recommendation engines.',
      price: 240, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-TTS-1M',
      name: '1M Character Text-to-Speech Credit',
      description: 'Prepaid 1 million character TTS credit with 30+ neural voices (ElevenLabs-compatible API). Ideal for audiobooks, game dialogue, podcasts, and accessibility features.',
      price: 55, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },

    // ── ASSETSTREAM ─── Creative Assets ───────────────────────────────────────
    {
      productID: 'UI-NEON-PRO',
      name: 'Neon-Cyber UI Kit (Figma)',
      description: 'Premium dark-mode Neon-Cyber design system for Figma. 200+ components, 20 screen templates, auto-layout, design tokens. Ideal for mobile apps and SaaS dashboards.',
      price: 45, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'UI-SAAS-DASHBOARD',
      name: 'SaaS Dashboard UI Kit (Figma + Framer)',
      description: '300+ components, 40 dashboard templates, chart widgets, and dark/light variants. Figma source + Framer-ready export. Perfect for admin panels and analytics products.',
      price: 79, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'UI-MOBILE-IOS',
      name: 'iOS App UI Component Library',
      description: 'Complete iOS-style UI library with 400+ components following HIG guidelines. SwiftUI-compatible annotations, dark mode, and accessibility labels included.',
      price: 59, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'ICON-PACK-3000',
      name: 'Pro Icon Pack (3,000 icons, SVG + PNG)',
      description: '3,000 clean, consistent icons in 6 styles (outline, solid, duo-tone, color, gradient, 3D). SVG, PNG, Figma, and Lottie formats. Royalty-free commercial license.',
      price: 39, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: '3D-SCI-FI-PACK',
      name: 'Sci-Fi Modular Base (Unreal Engine 5)',
      description: 'AAA-quality modular sci-fi environment pack for Unreal Engine 5. 150+ meshes, PBR textures, Lumen-ready lighting, and Nanite-optimised geometry.',
      price: 120, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: '3D-FANTASY-PACK',
      name: 'Fantasy RPG Environment Pack (Unreal 5 / Unity)',
      description: 'High-fidelity fantasy biome pack: forests, dungeons, castles. 200+ assets, 4K PBR textures, compatible with Unreal 5 and Unity URP/HDRP.',
      price: 149, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'MOTION-TITLE-PACK',
      name: 'Cinematic Title & Transitions Pack (After Effects)',
      description: '80 premium After Effects title templates and 40 transitions. No plugins required. 4K-ready. Ideal for trailers, YouTube intros, and social media content.',
      price: 55, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'STOCK-PHOTO-500',
      name: '500 Premium Stock Photos (Commercial License)',
      description: 'Curated pack of 500 ultra-high-resolution stock photos (technology, lifestyle, business, nature). Full commercial license, no attribution required.',
      price: 49, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'LUT-FILMMAKER-50',
      name: '50 Cinematic LUT Pack (DaVinci / Premiere / FCPX)',
      description: '50 professional colour grading LUTs in .cube and .3dl format. Compatible with DaVinci Resolve, Premiere Pro, and Final Cut Pro. Film-emulation and modern styles.',
      price: 29, cat: 'Creative Assets', vendor: creativeVendor.id,
    },

    // ── ASSETSTREAM ─── Audio & Music ─────────────────────────────────────────
    {
      productID: 'AUD-CIN-LOOP',
      name: 'Cinematic Ambient Audio Bundle',
      description: 'Royalty-free cinematic ambient audio bundle: 60 high-quality looping tracks across sci-fi, fantasy, horror, and drama genres. WAV + MP3 formats.',
      price: 35, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AUD-SFX-GAME-1000',
      name: 'Game Sound Effects Library (1,000 SFX)',
      description: '1,000 professional game sound effects: UI, weapons, footsteps, ambience, magic, explosions. 24-bit WAV. Ready for Unreal, Unity, and FMOD integration.',
      price: 65, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AUD-MUSIC-ROYALTY-FREE',
      name: 'Royalty-Free Music Library (200 Tracks)',
      description: '200 production-quality music tracks across electronic, orchestral, lo-fi, hip-hop, and pop genres. Stems included. Full YouTube, Twitch, and commercial license.',
      price: 89, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AUD-PODCAST-KIT',
      name: 'Podcast Production Kit (Jingles + Templates)',
      description: '30 custom podcast jingles, 10 intro/outro templates, 20 transition stings, and Audacity/Descript editing templates. Ready to deploy immediately.',
      price: 39, cat: 'Audio & Music', vendor: creativeVendor.id,
    },

    // ── DEVVAULT PRO ─── Developer Tools ───────────────────────────────────────
    {
      productID: 'JS-IDE-1YR',
      name: 'JetBrains All Products Pack (1 Year)',
      description: 'Full JetBrains suite license for 1 year: IntelliJ IDEA Ultimate, WebStorm, PyCharm, DataGrip, Rider, GoLand, and more. Instant licence key delivery.',
      price: 289, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'IDE-VSCODE-PACK',
      name: 'VS Code Premium Extension Bundle',
      description: '15 curated VS Code extension licences: GitHub Copilot Pro, REST Client Pro, Docker Pro, GitLens Pro, Remote Dev Pack, and more. 1-year keys.',
      price: 79, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'API-TESTING-PRO',
      name: 'Postman Team Plan (1 Year, 5 seats)',
      description: '1-year Postman Team plan covering API design, mock servers, automated testing, and team collaboration for up to 5 developers.',
      price: 180, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DB-DATAGRIP-1YR',
      name: 'DataGrip Database IDE (1 Year)',
      description: 'JetBrains DataGrip standalone 1-year licence. Supports PostgreSQL, MySQL, MongoDB, Redis, SQLite, and more. Instant delivery.',
      price: 99, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DEVOPS-DOCKER-1YR',
      name: 'Docker Pro Subscription (1 Year)',
      description: 'Docker Pro annual plan: unlimited private repositories, 5,000 image pulls/day, advanced access control, and vulnerability scanning.',
      price: 120, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'GIT-GITHUB-PRO-1YR',
      name: 'GitHub Pro (1 Year)',
      description: 'GitHub Pro annual licence: unlimited private repos, advanced code insights, required reviewers, protected branches, and GitHub Actions minutes.',
      price: 48, cat: 'Developer Tools', vendor: softwareVendor.id,
    },

    // ── DEVVAULT PRO ─── SaaS Subscriptions ───────────────────────────────────
    {
      productID: 'CO-PILOT-PRO',
      name: 'AI Coding Assistant Pro (Lifetime)',
      description: 'Lifetime licence for an AI pair-programming assistant (Copilot-compatible). Multi-language support, inline suggestions, test generation, and code review.',
      price: 499, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'VERCEL-PRO-3MO',
      name: 'Vercel Pro (3 Month Credit)',
      description: '3-month Vercel Pro plan credit. Includes 1TB bandwidth, 100GB-hrs compute, preview deployments, and custom domains. Perfect for Next.js prototypes.',
      price: 60, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'VERCEL-PRO-1YR',
      name: 'Vercel Pro (1 Year Credit)',
      description: 'Full 12-month Vercel Pro credit. Best value for production Next.js, Nuxt, or SvelteKit apps requiring high-availability global edge deployments.',
      price: 200, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'NOTION-TEAM-1YR',
      name: 'Notion Team Plan (1 Year, 10 seats)',
      description: '1-year Notion Team plan for up to 10 members. Includes unlimited blocks, collaborative docs, database sync, API access, and page analytics.',
      price: 160, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'FIGMA-PRO-1YR',
      name: 'Figma Professional (1 Year)',
      description: '1-year Figma Professional licence. Unlimited projects, version history, team libraries, prototyping, and advanced component management.',
      price: 144, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'ANALYTICS-MIXPANEL-3MO',
      name: 'Mixpanel Growth Plan (3 Months)',
      description: '3-month Mixpanel Growth credit for up to 1M monthly tracked users. Includes funnels, retention analysis, A/B testing, and cohort reports.',
      price: 75, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'EMAIL-SENDGRID-1YR',
      name: 'SendGrid Essentials (1 Year, 100K emails/mo)',
      description: '1-year SendGrid Essentials plan: 100,000 transactional emails per month, dedicated IP, deliverability insights, and email validation.',
      price: 199, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },

    // ── LEARNCHAIN ACADEMY ─── Education Vouchers ──────────────────────────────
    {
      productID: 'AWS-CERT-VOUCH',
      name: 'AWS Solutions Architect Exam Voucher',
      description: 'Official AWS Certified Solutions Architect – Associate exam voucher. Valid for 12 months. Includes Pearson VUE scheduling access.',
      price: 150, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'GCP-CERT-VOUCH',
      name: 'Google Cloud Professional Data Engineer Voucher',
      description: 'Official Google Cloud Professional Data Engineer certification voucher. Valid 12 months. Covers BigQuery, Dataflow, Pub/Sub, and Vertex AI.',
      price: 150, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AZ-900-VOUCH',
      name: 'Microsoft Azure Fundamentals (AZ-900) Voucher',
      description: 'Official Microsoft AZ-900 exam voucher. Entry-level Azure certification covering cloud concepts, Azure services, and pricing. Great for beginners.',
      price: 99, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'CKA-CERT-VOUCH',
      name: 'Certified Kubernetes Administrator (CKA) Voucher',
      description: 'CNCF CKA exam voucher. Covers cluster architecture, workloads, networking, storage, and troubleshooting. Includes 2 free retakes.',
      price: 299, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'UDEMY-100-BUNDLE',
      name: 'Udemy 100-Course Bundle Credit',
      description: 'Prepaid Udemy credit redeemable for up to 100 courses. Valid for any subject: programming, design, AI, business, photography, and more.',
      price: 199, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'BOOT-FULLSTACK',
      name: 'Full-Stack Web Dev Bootcamp (Self-Paced)',
      description: '120-hour self-paced full-stack bootcamp: HTML/CSS, JavaScript, React, Node.js, PostgreSQL, and deployment. Certificate of completion included.',
      price: 249, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'BOOT-ML-ENGINEERING',
      name: 'ML Engineering Bootcamp (Self-Paced)',
      description: '80-hour ML Engineering course: Python, scikit-learn, PyTorch, model deployment with FastAPI, and MLflow experiment tracking. Project-based.',
      price: 299, cat: 'Education Vouchers', vendor: eduVendor.id,
    },

    // ── CIPHERSTACK SECURITY ─── Cybersecurity ────────────────────────────────
    {
      productID: 'VPN-PRO-1YR',
      name: 'Enterprise VPN Pro (1 Year, 10 devices)',
      description: 'No-log enterprise VPN for up to 10 devices. WireGuard protocol, split tunneling, kill switch, and 60+ server locations. Instant activation.',
      price: 79, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'PENTEST-KIT-PRO',
      name: 'Penetration Testing Toolkit (Pro)',
      description: 'Professional pen-testing toolkit: Burp Suite Pro 1-year licence + custom payloads library + OWASP checklist templates + report generator.',
      price: 449, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'SEC-AUDIT-CHECKLIST',
      name: 'Web App Security Audit Bundle',
      description: 'Comprehensive web application security audit pack: 300-point OWASP checklist, threat model templates, GDPR compliance checklist, and risk matrix.',
      price: 59, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'SSL-WILDCARD-1YR',
      name: 'Wildcard SSL Certificate (1 Year)',
      description: 'Wildcard SSL/TLS certificate covering unlimited subdomains. 256-bit encryption, browser-trusted, with automated renewal reminders.',
      price: 69, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'PWD-MANAGER-TEAM',
      name: 'Team Password Manager (1 Year, 25 seats)',
      description: 'Secure team password manager: end-to-end encrypted vault, role-based sharing, audit logs, MFA enforcement, and SSO integration for 25 seats.',
      price: 120, cat: 'Cybersecurity', vendor: securityVendor.id,
    },

    // ── ASSETSTREAM ─── Design & Fonts ────────────────────────────────────────
    {
      productID: 'FONT-COLLECTION-50',
      name: '50 Premium Font Collection (Commercial License)',
      description: '50 premium fonts: display, sans-serif, serif, monospace, and script. OTF + TTF + WOFF2 formats. Full desktop, web, and app commercial licence.',
      price: 49, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'BRAND-KIT-TEMPLATE',
      name: 'Complete Brand Identity Kit (Canva + Figma)',
      description: 'Full brand identity system: logo variations, colour palette, typography guide, business card, social media templates, pitch deck. 80+ files.',
      price: 69, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'PRINT-TEMPLATE-PACK',
      name: 'Professional Print Template Pack (50 templates)',
      description: '50 print-ready templates: brochures, flyers, posters, business cards, menus, and banners. InDesign, Illustrator, and Canva formats. CMYK-ready.',
      price: 45, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },

    // ── BITCOMPUTE ─── Data & Analytics ──────────────────────────────────────
    {
      productID: 'DATA-PIPELINE-1YR',
      name: 'Managed ETL Pipeline (1 Year, 10M events/mo)',
      description: 'Hosted ETL/ELT pipeline service: connects 50+ sources, processes up to 10M events per month, and delivers to your warehouse or BI tool.',
      price: 360, cat: 'Data & Analytics', vendor: infraVendor.id,
    },
    {
      productID: 'BI-DASHBOARD-PRO',
      name: 'BI Dashboard Builder Pro (1 Year)',
      description: 'No-code BI dashboard builder: 20+ chart types, real-time data connectors, white-label embeds, and scheduled PDF reports. Up to 5 users.',
      price: 180, cat: 'Data & Analytics', vendor: infraVendor.id,
    },

    // ── LEARNCHAIN ─── Game Development ──────────────────────────────────────
    {
      productID: 'UNITY-ASSET-BUNDLE',
      name: 'Unity Pro Asset Mega Bundle',
      description: 'Curated Unity asset collection: 30+ complete packs covering terrain, characters, VFX, shaders, and audio. URP and HDRP compatible. $500+ retail value.',
      price: 99, cat: 'Game Development', vendor: eduVendor.id,
    },
    {
      productID: 'GAMEDEV-COURSE-PRO',
      name: 'Advanced Game Dev Course Bundle (Unreal + Unity)',
      description: '60-hour advanced game dev bundle: Unreal 5 Blueprints/C++, Unity 6 gameplay programming, shader development, and multiplayer networking.',
      price: 179, cat: 'Game Development', vendor: eduVendor.id,
    },

    // ── NEURALFORGE ─── Marketing & SEO ──────────────────────────────────────
    {
      productID: 'SEO-AUDIT-TOOL-1YR',
      name: 'SEO Audit & Rank Tracker (1 Year)',
      description: '1-year access to an SEO suite: site audits, keyword rank tracking (500 keywords), backlink analysis, competitor monitoring, and weekly reports.',
      price: 149, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'SOCIAL-SCHEDULER-1YR',
      name: 'Social Media Scheduler Pro (1 Year, 10 profiles)',
      description: '1-year social media management plan: schedule posts across Instagram, X, LinkedIn, TikTok, and Facebook for up to 10 profiles. Includes analytics.',
      price: 99, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'EMAIL-MARKETING-TEMPLATE',
      name: 'Email Marketing Template Pack (100 templates)',
      description: '100 professionally designed HTML email templates: newsletters, promotions, onboarding flows, and transactional emails. Compatible with Mailchimp, SendGrid, and Klaviyo.',
      price: 39, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
  ];

  // ── 4. UPSERT ALL PRODUCTS ─────────────────────────────────────────────────

  for (const p of products) {
    await prisma.product.upsert({
      where: { productID: p.productID },
      update: {
        name:        p.name,
        description: p.description,
        price:       p.price,
        categoryId:  categoryMap[p.cat],
        vendorId:    p.vendor,
      },
      create: {
        productID:     p.productID,
        sku:           p.productID,
        name:          p.name,
        description:   p.description,
        price:         p.price,
        vendorId:      p.vendor,
        categoryId:    categoryMap[p.cat],
        stockQuantity: 9999,
        images:        [`https://api.placeholder.com/400/300?text=${encodeURIComponent(p.name)}`],
      },
    });
    console.log(`  ✓ ${p.productID}  ${p.name}  ($${p.price})`);
  }

  console.log(`\n✅ Seeded ${products.length} products across ${categoryDefs.length} categories and 6 vendors.`);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});