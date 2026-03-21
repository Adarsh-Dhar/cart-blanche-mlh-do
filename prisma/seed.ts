import { PrismaClient } from '../frontend/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {

  // ── 1. VENDORS (16 total) ──────────────────────────────────────────────────

  const infraVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST3GA9VQKYW677PDQHMBEEK3G53343N5YY7JWN7J1' },
    update: {},
    create: {
      name:        'BitCompute Cloud',
      description: 'High-performance GPU credits, API throughput vouchers, and cloud storage.',
      pubkey:      'ST3GA9VQKYW677PDQHMBEEK3G53343N5YY7JWN7J1',
      logoUrl:     'https://api.placeholder.com/150/0000FF?text=BitCompute',
    },
  });

  const creativeVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST1F5VZCFZD8YKYH5B2ZRCYDMK54P7E7YX0Q45EPE' },
    update: {},
    create: {
      name:        'AssetStream Digital',
      description: 'Premium UI kits, 3D assets, fonts, stock media, and motion graphics.',
      pubkey:      'ST1F5VZCFZD8YKYH5B2ZRCYDMK54P7E7YX0Q45EPE',
      logoUrl:     'https://api.placeholder.com/150/FF00FF?text=AssetStream',
    },
  });

  const softwareVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST2WSR4ACNNH0D50GA38ACG4B56ZGX12F7BW1YD8K' },
    update: {},
    create: {
      name:        'DevVault Pro',
      description: 'SaaS licenses, IDE plugins, deployment credits, and developer certifications.',
      pubkey:      'ST2WSR4ACNNH0D50GA38ACG4B56ZGX12F7BW1YD8K',
      logoUrl:     'https://api.placeholder.com/150/00FF00?text=DevVault',
    },
  });

  const aiVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST2EPX5MCS97MRBWF4XA9WMT3843Q35X4ZA3EGN0R' },
    update: {},
    create: {
      name:        'NeuralForge AI',
      description: 'AI model access vouchers, fine-tuning credits, prompt packs, and AI toolkits.',
      pubkey:      'ST2EPX5MCS97MRBWF4XA9WMT3843Q35X4ZA3EGN0R',
      logoUrl:     'https://api.placeholder.com/150/FF6600?text=NeuralForge',
    },
  });

  const eduVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'STYXTJYZ857ZC4ARZ2EHNPG4YRJ2WD090JMB09CT' },
    update: {},
    create: {
      name:        'LearnChain Academy',
      description: 'Certification vouchers, online course bundles, and skill bootcamps.',
      pubkey:      'STYXTJYZ857ZC4ARZ2EHNPG4YRJ2WD090JMB09CT',
      logoUrl:     'https://api.placeholder.com/150/00CCFF?text=LearnChain',
    },
  });

  const securityVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'STN2CBVQ6S2QGY27DM30281XV2NCS3GEQ2YQCCQ3' },
    update: {},
    create: {
      name:        'CipherStack Security',
      description: 'Cybersecurity tools, VPN subscriptions, pen-testing kits, and compliance packs.',
      pubkey:      'STN2CBVQ6S2QGY27DM30281XV2NCS3GEQ2YQCCQ3',
      logoUrl:     'https://api.placeholder.com/150/CC0000?text=CipherStack',
    },
  });

  const cloudnovaVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST3F03ZHZ43WY9SEMX47RXQHFPD3ZQWEW1T8ZZFXY' },
    update: {},
    create: {
      name:        'CloudNova Systems',
      description: 'Enterprise-grade cloud infrastructure, serverless compute, and managed Kubernetes solutions.',
      pubkey:      'ST3F03ZHZ43WY9SEMX47RXQHFPD3ZQWEW1T8ZZFXY',
      logoUrl:     'https://api.placeholder.com/150/004499?text=CloudNova',
    },
  });

  const pixelforgeVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST324YYEFGMCPGGMSP5BEEQTDQ6VM12FMNV9AM4ZB' },
    update: {},
    create: {
      name:        'PixelForge Studio',
      description: 'Next-generation creative assets, design systems, and digital art resources for modern products.',
      pubkey:      'ST324YYEFGMCPGGMSP5BEEQTDQ6VM12FMNV9AM4ZB',
      logoUrl:     'https://api.placeholder.com/150/AA0077?text=PixelForge',
    },
  });

  const codecraftVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'STCZD4JGWH49698H92M96SC47AXXHEA7FT3DYZGC' },
    update: {},
    create: {
      name:        'CodeCraft Tools',
      description: 'Professional developer tooling, testing frameworks, linting configs, and CI/CD solutions.',
      pubkey:      'STCZD4JGWH49698H92M96SC47AXXHEA7FT3DYZGC',
      logoUrl:     'https://api.placeholder.com/150/336600?text=CodeCraft',
    },
  });

  const mindsparkVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST9JG78CB7G8V4Q4TQ0Y6D1KKD7RYEEFZHPGS687' },
    update: {},
    create: {
      name:        'MindSpark Learning',
      description: 'Interactive bootcamps, certification prep, and expert-led video courses for tech professionals.',
      pubkey:      'ST9JG78CB7G8V4Q4TQ0Y6D1KKD7RYEEFZHPGS687',
      logoUrl:     'https://api.placeholder.com/150/FF9900?text=MindSpark',
    },
  });

  const guardianVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST1SQ72YD0Q2VK0PATZTE8R0BPH5Y7J05NTDXATA' },
    update: {},
    create: {
      name:        'GuardianShield Security',
      description: 'Enterprise cybersecurity solutions, threat intelligence, and compliance automation.',
      pubkey:      'ST1SQ72YD0Q2VK0PATZTE8R0BPH5Y7J05NTDXATA',
      logoUrl:     'https://api.placeholder.com/150/880000?text=GuardianShield',
    },
  });

  const visionaiVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST29KCFMN5YTV92HVEQF45TF3S15A65E9YR0NZ4FQ' },
    update: {},
    create: {
      name:        'VisionAI Labs',
      description: 'Cutting-edge computer vision, generative AI APIs, and multimodal model access.',
      pubkey:      'ST29KCFMN5YTV92HVEQF45TF3S15A65E9YR0NZ4FQ',
      logoUrl:     'https://api.placeholder.com/150/7700AA?text=VisionAI',
    },
  });

  const datastreamVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST2P2HYPV2TVTW52MJ63GS04JHS3DDKCKPSGQ6V73' },
    update: {},
    create: {
      name:        'DataStream Analytics',
      description: 'Real-time data pipelines, business intelligence tools, and analytics infrastructure.',
      pubkey:      'ST2P2HYPV2TVTW52MJ63GS04JHS3DDKCKPSGQ6V73',
      logoUrl:     'https://api.placeholder.com/150/005577?text=DataStream',
    },
  });

  const gameforgeVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST1B4VTH2FZRM8J3ZWF6F8XWN2SA890ME5FNKHV5D' },
    update: {},
    create: {
      name:        'GameForge Studio',
      description: 'Game development assets, engine plugins, shaders, and indie dev toolkits for Unreal, Unity, and Godot.',
      pubkey:      'ST1B4VTH2FZRM8J3ZWF6F8XWN2SA890ME5FNKHV5D',
      logoUrl:     'https://api.placeholder.com/150/AA5500?text=GameForge',
    },
  });

  const mediavaultVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST585ZFVCPT1YJX4EJFYJYCW8WKA85MFKVW2ZQEJ' },
    update: {},
    create: {
      name:        'MediaVault Pro',
      description: 'Professional broadcast-quality stock media, premium audio, and video production assets.',
      pubkey:      'ST585ZFVCPT1YJX4EJFYJYCW8WKA85MFKVW2ZQEJ',
      logoUrl:     'https://api.placeholder.com/150/003366?text=MediaVault',
    },
  });

  const startupstackVendor = await prisma.vendor.upsert({
    where:  { pubkey: 'ST18G8BEB9QJFEPZ24MD2H528KP5S9966ZBPHKQ7J' },
    update: {},
    create: {
      name:        'StartupStack',
      description: 'All-in-one SaaS bundle marketplace and curated tool packs for early-stage startups and indie hackers.',
      pubkey:      'ST18G8BEB9QJFEPZ24MD2H528KP5S9966ZBPHKQ7J',
      logoUrl:     'https://api.placeholder.com/150/007755?text=StartupStack',
    },
  });

  // ── 2. CATEGORIES ──────────────────────────────────────────────────────────

  const categoryDefs = [
    { name: 'Cloud & Compute',       slug: 'compute'   },
    { name: 'AI & Machine Learning', slug: 'ai-ml'     },
    { name: 'Creative Assets',       slug: 'creative'  },
    { name: 'Audio & Music',         slug: 'audio'     },
    { name: 'SaaS Subscriptions',    slug: 'saas'      },
    { name: 'Developer Tools',       slug: 'dev-tools' },
    { name: 'Education Vouchers',    slug: 'edu'       },
    { name: 'Cybersecurity',         slug: 'security'  },
    { name: 'Design & Fonts',        slug: 'design'    },
    { name: 'Data & Analytics',      slug: 'data'      },
    { name: 'Game Development',      slug: 'gamedev'   },
    { name: 'Marketing & SEO',       slug: 'marketing' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const created = await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }

  // ── 3. PRODUCTS ────────────────────────────────────────────────────────────

  type ProductSeed = {
    productID: string;
    name:      string;
    description: string;
    price:     number;
    cat:       string;
    vendor:    string;
  };

  const products: ProductSeed[] = [

    // ═══════════════════════════════════════════════════════════════════════
    // CLOUD & COMPUTE  (~45 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── BitCompute Cloud ──────────────────────────────────────────────────
    {
      productID: 'GPU-H100-100H',
      name: '100 Hours H100 GPU Cluster',
      description: 'Instant-access 100-hour block of NVIDIA H100 GPU cluster time. Ideal for ML model training, 3D rendering, video encoding, and game asset baking. License keys delivered on payment.',
      price: 250, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-H100-25H',
      name: '25 Hours H100 GPU Cluster',
      description: 'Entry-level 25-hour H100 GPU block. Perfect for quick fine-tuning runs, proof-of-concept training jobs, or short render queues. Instant activation.',
      price: 69, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-H100-500H',
      name: '500 Hours H100 GPU Cluster – Bulk Pack',
      description: 'High-volume 500-hour H100 GPU block for production ML pipelines and large render farms. Best per-hour rate on the platform. Credits never expire.',
      price: 1149, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-A100-200H',
      name: '200 Hours A100 GPU Instance',
      description: '200-hour A100 GPU block for large-scale deep learning training, PyTorch/TensorFlow workloads, and HPC simulations. Great value for researchers and AI startups.',
      price: 320, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-A100-50H',
      name: '50 Hours A100 GPU Instance',
      description: 'Flexible 50-hour A100 compute block. Ideal for mid-size model training experiments, research prototypes, and automated ML pipelines.',
      price: 89, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-RTX4090-50H',
      name: '50 Hours RTX 4090 Instance',
      description: 'Consumer-grade GPU powerhouse. 50-hour RTX 4090 block ideal for game development, real-time ray tracing, 3D animation rendering, and fast prototyping.',
      price: 75, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-RTX4090-200H',
      name: '200 Hours RTX 4090 Instance',
      description: '200-hour RTX 4090 bundle for sustained creative workloads: Blender rendering, Stable Diffusion, AI video upscaling, and game asset baking at scale.',
      price: 265, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-L40S-50H',
      name: '50 Hours NVIDIA L40S Instance',
      description: 'The L40S bridges data-centre efficiency with creative horsepower. 50-hour block ideal for AI inference at scale, rendering pipelines, and video transcoding.',
      price: 99, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-L40S-200H',
      name: '200 Hours NVIDIA L40S Instance',
      description: 'High-volume L40S bundle delivering excellent tokens/second for LLM inference, batch image generation, and multi-stream video processing.',
      price: 369, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'GPU-V100-50H',
      name: '50 Hours Tesla V100 Instance',
      description: 'Budget-friendly V100 block for classic deep learning workloads. Fully NVLink-enabled, great for TensorFlow 1.x legacy training and HPC jobs.',
      price: 65, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'STORAGE-1TB-YEAR',
      name: '1 TB Cloud Object Storage (1 Year)',
      description: 'Scalable, S3-compatible cloud object storage. Ideal for ML datasets, game asset repositories, backup, and media hosting. Instant provisioning.',
      price: 48, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'STORAGE-500GB-YEAR',
      name: '500 GB Cloud Object Storage (1 Year)',
      description: 'Affordable 500 GB S3-compatible object storage. Great for personal projects, small SaaS apps, and developer staging environments.',
      price: 28, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'STORAGE-5TB-YEAR',
      name: '5 TB Cloud Object Storage (1 Year)',
      description: 'Enterprise-scale 5 TB S3-compatible storage for large media archives, video libraries, ML dataset collections, and multi-tenant SaaS backends.',
      price: 199, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CDN-10TB-CREDIT',
      name: '10 TB CDN Bandwidth Credit',
      description: 'Pre-paid CDN bandwidth credit for global content delivery. Use for web apps, game downloads, video streaming, and static asset serving.',
      price: 35, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CDN-1TB-CREDIT',
      name: '1 TB CDN Bandwidth Credit',
      description: 'Entry-level CDN credit for indie developers and small projects. Covers a typical month of traffic for a mid-size web app or game launcher.',
      price: 4, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CDN-50TB-CREDIT',
      name: '50 TB CDN Bandwidth Credit',
      description: 'Bulk CDN credit for high-traffic platforms, game publishers, and streaming services. Best per-GB rate. Credits stack and never expire.',
      price: 149, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'SERVER-VPS-1YR',
      name: 'Dedicated VPS (4 vCPU / 8 GB RAM, 1 Year)',
      description: 'Linux VPS with 4 vCPUs, 8 GB RAM, 100 GB NVMe SSD. Pre-paid annual plan. Perfect for hosting APIs, bots, backends, or databases.',
      price: 120, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'SERVER-VPS-MICRO',
      name: 'Micro VPS (1 vCPU / 1 GB RAM, 1 Year)',
      description: 'Ultra-affordable micro VPS for personal sites, Discord bots, lightweight APIs, and dev environments. 25 GB SSD, 1 TB monthly bandwidth.',
      price: 29, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'SERVER-VPS-LARGE',
      name: 'Large VPS (8 vCPU / 16 GB RAM, 1 Year)',
      description: 'High-memory VPS for production workloads: Node.js apps, Postgres databases, Redis clusters, and Docker Compose stacks. 200 GB NVMe SSD.',
      price: 220, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'SERVER-VPS-XL',
      name: 'XL VPS (16 vCPU / 32 GB RAM, 1 Year)',
      description: 'Top-tier VPS for demanding applications — game servers, large Postgres instances, self-hosted AI inference, and Kubernetes worker nodes.',
      price: 420, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },

    // ── CloudNova Systems ─────────────────────────────────────────────────
    {
      productID: 'CN-GPU-H100-100H',
      name: '100 Hours H100 GPU Cluster (CloudNova)',
      description: 'CloudNova\'s H100 instances feature NVLink-connected clusters, InfiniBand networking, and SSD-backed scratch storage — built for demanding distributed training at lower latency than shared pools.',
      price: 239, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-GPU-A100-100H',
      name: '100 Hours A100 GPU Instance (CloudNova)',
      description: 'CloudNova A100 80 GB instances with 400 Gbps networking. Competitive alternative to bare-metal GPU rentals for transformer training and HPC.',
      price: 149, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-GPU-RTX4090-100H',
      name: '100 Hours RTX 4090 (CloudNova)',
      description: 'CloudNova\'s RTX 4090 instances are optimised for creative rendering and AI image generation with fast NVMe scratch and 10 Gbps uplink.',
      price: 149, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-K8S-CLUSTER-1YR',
      name: 'Managed Kubernetes Cluster (10 nodes, 1 Year)',
      description: 'Fully managed K8s cluster — auto-scaling, automated certificate management, integrated load balancer, and GitOps-ready Argo CD installation. 10 worker nodes.',
      price: 599, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-SERVERLESS-10M',
      name: 'Serverless Compute Credits – 10 M Invocations',
      description: '10 million serverless function invocations (up to 1 GB RAM each). Sub-millisecond cold-start, global edge deployment, and built-in secret management.',
      price: 45, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-SERVERLESS-100M',
      name: 'Serverless Compute Credits – 100 M Invocations',
      description: 'High-volume serverless pack for production backends and event-driven pipelines. 100 million invocations, cold-start optimised runtime, and real-time observability.',
      price: 390, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-STORAGE-2TB',
      name: '2 TB Object Storage (1 Year, CloudNova)',
      description: 'CloudNova\'s geo-replicated object storage with 11-9s durability, multi-region failover, and integrated CDN edge caching. S3 API compatible.',
      price: 89, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-VPS-4X8-1YR',
      name: 'VPS 4 vCPU / 8 GB RAM – 1 Year (CloudNova)',
      description: 'CloudNova VPS with guaranteed CPU allocation, NVMe SSD, weekly snapshots, and DDoS mitigation included. Good BitCompute alternative for price-sensitive users.',
      price: 110, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-MANAGED-DB-PG-1YR',
      name: 'Managed PostgreSQL Database (1 Year)',
      description: 'Fully managed Postgres 16 with automated backups, point-in-time recovery, read replicas, and connection pooling. 20 GB storage included. Scales on demand.',
      price: 180, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-MANAGED-REDIS-1YR',
      name: 'Managed Redis Cluster (1 Year)',
      description: 'CloudNova managed Redis 7 — sentinel-based HA, persistence options (RDB + AOF), and TLS encryption. 2 GB base memory, auto-eviction policies.',
      price: 120, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-LOAD-BALANCER-1YR',
      name: 'Managed Load Balancer (1 Year)',
      description: 'Layer 7 application load balancer with SSL termination, health checks, sticky sessions, and WebSocket support. Handles up to 100K concurrent connections.',
      price: 149, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-BANDWIDTH-100TB',
      name: '100 TB Bandwidth Credit (CloudNova)',
      description: 'Enterprise CDN and egress bundle for high-traffic platforms and game publishers. 100 TB at CloudNova\'s best per-GB rate with global PoP coverage.',
      price: 279, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-DEDICATED-SERVER-1YR',
      name: 'Bare-Metal Dedicated Server (32 vCPU / 128 GB, 1 Year)',
      description: 'Bare-metal server with AMD EPYC 32-core, 128 GB DDR5 ECC, 2× 1.9 TB NVMe RAID, and 10 Gbps uplink. Ideal for latency-sensitive workloads.',
      price: 2400, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AI & MACHINE LEARNING  (~50 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── NeuralForge AI ────────────────────────────────────────────────────
    {
      productID: 'API-GPT4-10M',
      name: '10 M Token GPT-4 Proxy Voucher',
      description: 'Budget entry: 10 million GPT-4 tokens via a reliable proxy endpoint. Great for prototyping chatbots, testing RAG pipelines, and small-scale summarisation.',
      price: 22, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-GPT4-50M',
      name: '50 M Token GPT-4 Proxy Voucher',
      description: 'Prepaid voucher for 50 million tokens via a reliable GPT-4 proxy endpoint. Ideal for AI researchers, chatbot development, RAG pipelines, and LLM prototyping.',
      price: 99, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-GPT4-200M',
      name: '200 M Token GPT-4 Proxy Voucher',
      description: 'High-volume prepaid voucher for 200 M GPT-4 tokens. Best for production AI apps, large-scale document analysis, and enterprise integrations.',
      price: 349, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-GPT4-500M',
      name: '500 M Token GPT-4 Proxy Voucher – Bulk',
      description: 'Bulk GPT-4 token pack for enterprises running high-throughput document pipelines, customer support bots, or multi-tenant AI features. Best per-token price.',
      price: 849, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-CLAUDE-25M',
      name: '25 M Token Claude API Voucher',
      description: 'Entry-level Claude API credit — 25 million tokens. Excellent for developers testing long-context summarisation, coding assistants, and reasoning pipelines.',
      price: 49, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-CLAUDE-100M',
      name: '100 M Token Claude API Voucher',
      description: 'Prepaid Claude API credit — 100 million tokens. Excellent for long-context summarisation, coding assistance, and reasoning-heavy pipelines.',
      price: 180, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-CLAUDE-500M',
      name: '500 M Token Claude API Voucher – Bulk',
      description: 'Enterprise-scale Claude API credit. 500 million tokens for high-volume document processing, legal review pipelines, and production AI assistants.',
      price: 849, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-GEMINI-100M',
      name: '100 M Token Gemini Pro Voucher',
      description: 'Prepaid Gemini Pro API access — 100 million tokens. Competitive alternative for multimodal tasks, structured extraction, and long-document Q&A.',
      price: 120, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-GEMINI-500M',
      name: '500 M Token Gemini Pro Voucher – Bulk',
      description: 'High-volume Gemini Pro API credit for production multimodal pipelines. Includes audio, image, and video understanding via unified context window.',
      price: 549, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-LLAMA-100M',
      name: '100 M Token Llama 3 Hosted API Voucher',
      description: 'Cost-effective open-weight alternative: 100 million Llama 3 70B tokens served via NeuralForge\'s optimised vLLM cluster. No rate limits, SLA-backed.',
      price: 79, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'API-MIXTRAL-100M',
      name: '100 M Token Mixtral 8x22B Hosted Voucher',
      description: 'High-throughput MoE model: 100 million Mixtral 8×22B tokens. Great for multi-lingual tasks, code generation, and instruction-following at scale.',
      price: 69, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-FINETUNE-10K',
      name: 'LLM Fine-Tuning Pack (10 K Samples)',
      description: 'Fine-tuning service credit: upload up to 10,000 training samples to fine-tune an open-source LLM (Llama 3, Mistral, or Falcon). Results in a custom model checkpoint.',
      price: 199, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-FINETUNE-50K',
      name: 'LLM Fine-Tuning Pack (50 K Samples)',
      description: 'Large-scale fine-tuning credit: 50,000 training samples. Ideal for domain-specific assistants (legal, medical, customer support) requiring deep instruction alignment.',
      price: 799, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-IMGGEN-5K',
      name: '5,000 Image Generation Credits (Stable Diffusion)',
      description: 'Prepaid credits for 5,000 AI image generations via Stable Diffusion XL or FLUX. Supports text-to-image, img2img, inpainting, and ControlNet.',
      price: 45, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-IMGGEN-20K',
      name: '20,000 Image Generation Credits',
      description: '20,000 SD/FLUX credits for production image pipelines, e-commerce background generation, and creative asset workflows. Priority queue access.',
      price: 159, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-PROMPTPACK-STARTER',
      name: 'AI Prompt Engineering Pack – Starter (100 Prompts)',
      description: '100 curated starter prompts for ChatGPT, Claude, and Midjourney. Covers content writing, summarisation, and creative ideation. Great for beginners.',
      price: 9, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-PROMPTPACK-PRO',
      name: 'AI Prompt Engineering Pack – Pro (500+ Prompts)',
      description: '500+ hand-crafted, battle-tested prompts for ChatGPT, Claude, Midjourney, and Stable Diffusion. Covers coding, content, business, creative, and research.',
      price: 29, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-PROMPTPACK-ULTIMATE',
      name: 'AI Prompt Engineering Pack – Ultimate (2,000 Prompts)',
      description: '2,000-prompt mega library with system prompt templates, chain-of-thought frameworks, and multi-agent orchestration blueprints. Lifetime updates included.',
      price: 99, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-VECTORDB-1YR',
      name: 'Managed Vector DB – 10 M Vectors (1 Year)',
      description: 'Hosted vector database subscription (Pinecone-compatible) supporting up to 10 million vectors. Essential for RAG apps, semantic search, and recommendation engines.',
      price: 240, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-VECTORDB-STARTER',
      name: 'Managed Vector DB – 1 M Vectors (1 Year)',
      description: 'Budget vector DB for indie developers and early-stage RAG apps. 1 million vectors, REST + gRPC API, metadata filtering, and namespaces.',
      price: 59, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-TTS-250K',
      name: '250 K Character Text-to-Speech Credit',
      description: 'Entry-level TTS credit for small podcast episodes, game dialogue prototyping, or accessibility features. 30+ neural voices, MP3 + WAV output.',
      price: 15, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-TTS-1M',
      name: '1 M Character Text-to-Speech Credit',
      description: 'Prepaid 1 million character TTS credit with 30+ neural voices (ElevenLabs-compatible API). Ideal for audiobooks, game dialogue, podcasts, and accessibility features.',
      price: 55, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-TTS-5M',
      name: '5 M Character Text-to-Speech Credit',
      description: 'High-volume TTS bundle for audiobook publishers, enterprise IVR systems, and game studios with large voice-over pipelines. All 30+ voices included.',
      price: 240, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-WHISPER-100H',
      name: 'Whisper Transcription – 100 Audio Hours',
      description: '100 hours of Whisper-powered speech-to-text. Supports 100+ languages, speaker diarisation, and timestamped JSON output. Ideal for podcast workflows.',
      price: 29, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-WHISPER-1000H',
      name: 'Whisper Transcription – 1,000 Audio Hours',
      description: 'Bulk transcription credit for media companies, legal firms, and enterprise meeting intelligence platforms. 1,000 hours, batch API, priority processing.',
      price: 249, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-EMBEDDING-100M',
      name: '100 M Text Embedding Token Credits',
      description: '100 million text embedding tokens for semantic search, clustering, and retrieval pipelines. Compatible with OpenAI embedding API format.',
      price: 25, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-CODE-ASSIST-1YR',
      name: 'AI Code Assistant Subscription (1 Year)',
      description: '1-year access to NeuralForge\'s AI code assistant: multi-language inline completions, test generation, code review, and refactoring suggestions. IDE plugins included.',
      price: 199, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-OCR-100K',
      name: 'AI OCR – 100 K Page Credits',
      description: '100,000 page OCR credits powered by vision-language models. Handles handwriting, tables, multi-column layouts, and scanned PDFs with >99% accuracy.',
      price: 49, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-TRANSLATION-50M',
      name: 'AI Translation – 50 M Character Credits',
      description: '50 million character neural translation credits across 100+ language pairs. Context-aware, domain-adaptive output with JSON/HTML passthrough support.',
      price: 79, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'AI-CHATBOT-BUILDER-1YR',
      name: 'No-Code AI Chatbot Builder (1 Year)',
      description: 'Build, deploy, and maintain GPT-powered chatbots without code. Visual flow editor, knowledge base upload, website embed, and analytics dashboard.',
      price: 149, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },

    // ── VisionAI Labs ─────────────────────────────────────────────────────
    {
      productID: 'VAI-IMGGEN-10K',
      name: '10,000 HD Image Generation Credits (VisionAI)',
      description: 'VisionAI\'s proprietary image model delivers photorealistic outputs at 2048×2048. Supports style transfer, IP-Adapter, and consistent character generation.',
      price: 89, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-IMGGEN-100K',
      name: '100,000 Image Generation Credits – Bulk (VisionAI)',
      description: 'Bulk image generation pack for e-commerce product imagery, marketing creative pipelines, and design agencies. 100K credits, API + web dashboard access.',
      price: 799, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-VIDEOGEN-100',
      name: '100 AI Video Generation Credits (10-sec clips)',
      description: '100 credits for generating 10-second AI video clips from text prompts or image inputs. Ideal for social content, product demos, and animated ads.',
      price: 149, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-VIDEOGEN-500',
      name: '500 AI Video Generation Credits (VisionAI)',
      description: 'High-volume video generation pack for marketing agencies and content studios. 500 clips, 1080p output, commercial license, custom motion presets.',
      price: 649, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-UPSCALE-10K',
      name: '10,000 AI Image Upscaling Credits (4×)',
      description: '10,000 real-ESRGAN 4× upscaling credits. Restore old photos, upscale AI generations, and improve stock imagery resolution without blurriness.',
      price: 49, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-BG-REMOVE-10K',
      name: '10,000 AI Background Removal Credits',
      description: '10,000 one-click background removal credits via VisionAI\'s matting model. Hair-accurate masks, transparent PNG output, API + batch upload.',
      price: 49, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-VISION-API-1M',
      name: '1 M Vision API Calls (Object Detection + Caption)',
      description: '1 million vision API calls for object detection, classification, and auto-captioning. COCO-format labels, bounding boxes, and semantic tags returned.',
      price: 99, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-3D-GEN-500',
      name: '500 3D Object Generation Credits (VisionAI)',
      description: '500 credits for generating textured 3D meshes from single images or text prompts. GLB/OBJ/USD export, PBR materials, game-engine ready.',
      price: 199, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-AVATAR-100',
      name: '100 AI Avatar / Portrait Generation Credits',
      description: '100 photorealistic AI avatar credits for LinkedIn headshots, game characters, and digital identities. 20+ style presets, consistent identity across renders.',
      price: 59, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-FACE-SWAP-1K',
      name: '1,000 Style & Face Transfer Credits',
      description: '1,000 face-swap and style-transfer credits for game character customisation, virtual try-on, and creative content pipelines. GDPR-compliant consent workflow.',
      price: 39, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VAI-MULTIMODAL-50M',
      name: '50 M Multimodal API Tokens (VisionAI)',
      description: 'VisionAI\'s multimodal model: interleave text, images, and video frames in a single context window. 50 million tokens for complex document understanding and visual QA.',
      price: 159, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CREATIVE ASSETS  (~50 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── AssetStream Digital ───────────────────────────────────────────────
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
      productID: 'AS-UI-MINIMAL',
      name: 'Minimal Flat UI Kit (Figma)',
      description: 'Clean, minimalist flat UI system with 150+ components, 12 page templates, and a muted pastel token system. Ideal for fintech, productivity, and health apps.',
      price: 29, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-UI-GLASSMORPHISM',
      name: 'Glassmorphism UI Kit (Figma)',
      description: 'Trendy frosted-glass UI system with 180+ components, blur/transparency variables, gradient meshes, and 15 full-screen layouts. Dark mode only.',
      price: 49, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-UI-LANDING',
      name: 'Landing Page UI Kit – 40 Templates (Figma)',
      description: '40 complete landing page templates in Figma covering SaaS, mobile apps, portfolios, and agencies. Responsive grids, A/B variant pairs, and CTA libraries.',
      price: 69, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'ICON-PACK-3000',
      name: 'Pro Icon Pack (3,000 Icons, SVG + PNG)',
      description: '3,000 clean, consistent icons in 6 styles (outline, solid, duo-tone, colour, gradient, 3D). SVG, PNG, Figma, and Lottie formats. Royalty-free commercial licence.',
      price: 39, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ICON-8000',
      name: 'Mega Icon Pack – 8,000 Icons',
      description: '8,000 icons spanning 80 categories in outline and solid styles. SVG, PNG, React component export, and Figma plugin. The last icon pack you\'ll ever buy.',
      price: 79, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ICON-ANIMATED',
      name: '500 Animated Icons (Lottie)',
      description: '500 smooth, loopable Lottie animated icons. JSON, SVG, GIF, and AE project exports. Customisable colour via Lottie properties. Royalty-free commercial use.',
      price: 55, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ICON-3D',
      name: '1,000 3D Icon Pack (PNG + Figma)',
      description: '1,000 premium 3D-rendered icons with clay, glass, and metal finish variants. 512 px PNGs with transparent backgrounds, ready for app stores and marketing.',
      price: 89, cat: 'Creative Assets', vendor: creativeVendor.id,
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
      productID: 'AS-3D-VEHICLE-PACK',
      name: 'Realistic Vehicle 3D Pack (Unreal Engine 5)',
      description: '20 AAA-quality vehicles (cars, trucks, motorcycles) with drivable Blueprints, animated wheels, and 4K PBR textures. Nanite + Lumen ready.',
      price: 159, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-3D-INTERIOR-ARCH',
      name: 'Interior Architecture Asset Pack (Blender)',
      description: '400+ modular interior assets: furniture, lighting, decor, and appliances. Blender 4.x native, PBR materials, HDRI lighting setup included.',
      price: 89, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-3D-TROPICAL-ENV',
      name: 'Tropical Environment Pack (Unreal 5 + Unity)',
      description: 'Lush tropical biome with 300+ foliage assets, beach props, water shaders, and weather VFX. Compatible with both UE5 and Unity HDRP/URP.',
      price: 139, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'MOTION-TITLE-PACK',
      name: 'Cinematic Title & Transitions Pack (After Effects)',
      description: '80 premium After Effects title templates and 40 transitions. No plugins required. 4K-ready. Ideal for trailers, YouTube intros, and social media content.',
      price: 55, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-MOTION-SOCIAL',
      name: 'Social Media Motion Pack (Premiere Pro)',
      description: '150 animated social media templates for Premiere Pro: Instagram Reels, YouTube Shorts, TikTok. Drag-and-drop text layers, no plugins needed.',
      price: 45, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-MOTION-LOGO',
      name: 'Logo Animation Kit (After Effects)',
      description: '60 logo animation presets for After Effects. Drop in your logo, pick a style, export. Flat, 3D, glitch, liquid, particle, and kinetic typography variants.',
      price: 35, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'STOCK-PHOTO-500',
      name: '500 Premium Stock Photos (Commercial Licence)',
      description: 'Curated pack of 500 ultra-high-resolution stock photos (technology, lifestyle, business, nature). Full commercial licence, no attribution required.',
      price: 49, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-STOCK-1000',
      name: '1,000 Premium Stock Photos (Commercial Licence)',
      description: '1,000 hand-curated stock photos across 20 thematic collections. Resolution up to 6000×4000px. Extended commercial licence, covers unlimited print runs.',
      price: 89, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-STOCK-VIDEO-100',
      name: '100 Premium 4K Stock Video Clips',
      description: '100 cinematic 4K stock video clips: urban life, nature, business, and abstract. ProRes + H.265 delivery, royalty-free commercial licence.',
      price: 149, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'LUT-FILMMAKER-50',
      name: '50 Cinematic LUT Pack (DaVinci / Premiere / FCPX)',
      description: '50 professional colour grading LUTs in .cube and .3dl format. Compatible with DaVinci Resolve, Premiere Pro, and Final Cut Pro. Film-emulation and modern styles.',
      price: 29, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-LUT-CINEMATIC-100',
      name: '100 Cinematic LUT Mega Pack',
      description: '100 LUTs spanning Hollywood film emulation, drone footage grades, portrait tones, and social media looks. Compatible with all major NLEs and Resolve.',
      price: 59, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-MOCKUP-DEVICE',
      name: 'Device Mockup Pack – 200+ Mockups (Figma)',
      description: '200+ photorealistic device mockups (iPhone, iPad, MacBook, Android, smartwatch). Smart object insertion, scene builder, and transparent / lifestyle variants.',
      price: 49, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ILLUSTRATION-FLAT',
      name: '500 Flat Illustration Vector Pack',
      description: '500 flat-style SVG illustrations covering tech, business, health, education, and lifestyle. Figma-editable with colour swaps. MIT-licensed for commercial use.',
      price: 59, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ILLUSTRATION-3D',
      name: '200 3D Isometric Illustration Pack',
      description: '200 isometric 3D scene illustrations in PNG + SVG + Figma. Tech devices, city scenes, office environments, and abstract compositions.',
      price: 79, cat: 'Creative Assets', vendor: creativeVendor.id,
    },

    // ── PixelForge Studio ─────────────────────────────────────────────────
    {
      productID: 'PF-UI-ENTERPRISE',
      name: 'Enterprise SaaS Design System – 500+ Components (Figma)',
      description: 'PixelForge\'s flagship enterprise design system: 500+ components, 60 dashboard templates, multi-brand token support, and accessibility-audited contrast ratios.',
      price: 149, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-UI-NEOMORPHISM',
      name: 'Neomorphism UI Kit (Figma)',
      description: 'Soft, tactile neomorphism design system with 200+ components, shadow variables, and 10 full-screen templates. Ideal for modern wearable and IoT apps.',
      price: 45, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-ICON-DUOTONE',
      name: '3,000 Duotone Pro Icon Collection',
      description: '3,000 premium duotone icons with customisable accent colours. Available as SVG, PNG, React component set, and Figma component library.',
      price: 49, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-3D-ABSTRACT',
      name: 'Abstract 3D Shape Pack – 300 Objects',
      description: '300 procedurally generated abstract 3D shapes in PNG (3000 × 3000 px) and .glb formats. Perfect for hero sections, landing pages, and product illustrations.',
      price: 69, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-3D-FUTURISTIC-UI',
      name: 'Futuristic UI 3D Elements Pack',
      description: '150 sci-fi HUD elements, holographic displays, and UI chrome pieces as transparent PNGs and AE compositions. Ideal for tech trailers and product videos.',
      price: 89, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-ILLUSTRATION-CHARS',
      name: '100 Character Illustration Set (Figma)',
      description: '100 diverse character illustrations — diverse skin tones, professions, and settings. Modular, mix-and-match body parts, Figma-native design.',
      price: 69, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-MOCKUP-APP',
      name: 'App Store Screenshot Mockup Kit',
      description: '80 App Store and Google Play screenshot templates. Device frames, background scenes, and badge overlays — export in seconds from Figma.',
      price: 35, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-TEMPLATE-PITCH',
      name: 'Pitch Deck Template Collection – 20 Decks',
      description: '20 investor-grade pitch deck templates across Figma, PowerPoint, and Keynote. Covers pre-seed, Series A, and product launch storytelling formats.',
      price: 59, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-3D-DUNGEON-PACK',
      name: 'Dungeon Environment Mega Pack (UE5 + Unity)',
      description: 'AAA dungeon environment pack: stone walls, torches, traps, treasure, and boss-room centerpieces. 400+ assets, 4K PBR textures, optimised LODs.',
      price: 169, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-3D-SPACE-STATION',
      name: 'Space Station Interior Pack (Unreal Engine 5)',
      description: 'Modular space station interior with airlocks, control rooms, corridors, and reactor chambers. 250+ assets, Lumen-ready, Nanite meshes.',
      price: 189, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },

    // ── MediaVault Pro ────────────────────────────────────────────────────
    {
      productID: 'MV-STOCK-PHOTO-2K',
      name: '2,000 Premium Stock Photos – Broadcast Licence',
      description: 'MediaVault\'s flagship stock photography bundle: 2,000 editorial and commercial images cleared for TV, print, and digital advertising. Highest resolution available.',
      price: 159, cat: 'Creative Assets', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-STOCK-VIDEO-500',
      name: '500 4K Stock Video Clips – Broadcast Bundle',
      description: '500 broadcast-licensed 4K clips: aerial drone, city time-lapse, corporate b-roll, and nature footage. ProRes 422 + H.265 delivery. No watermark, unlimited use.',
      price: 599, cat: 'Creative Assets', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-STOCK-VIDEO-50',
      name: '50 4K Stock Video Clips – Budget Pack',
      description: '50 curated 4K stock clips for indie creators on a budget. Business, tech, and lifestyle b-roll. H.265 delivery, standard commercial licence.',
      price: 79, cat: 'Creative Assets', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-TIMELAPSE-100',
      name: '100 4K Timelapse Video Pack',
      description: '100 stunning timelapse clips: cityscapes, nature, starfields, and weather events. 4K DCI, 60 fps interpolated. Broadcast-cleared, royalty-free.',
      price: 119, cat: 'Creative Assets', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-DRONE-FOOTAGE-50',
      name: '50 Drone Aerial Footage Clips – 4K',
      description: '50 licensed drone aerial clips across 10 global locations. Cities, coastlines, forests, and industrial zones. 4K/60fps, colour-graded and raw variants.',
      price: 149, cat: 'Creative Assets', vendor: mediavaultVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO & MUSIC  (~30 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── AssetStream Digital ───────────────────────────────────────────────
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
      description: '200 production-quality music tracks across electronic, orchestral, lo-fi, hip-hop, and pop genres. Stems included. Full YouTube, Twitch, and commercial licence.',
      price: 89, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AUD-PODCAST-KIT',
      name: 'Podcast Production Kit (Jingles + Templates)',
      description: '30 custom podcast jingles, 10 intro/outro templates, 20 transition stings, and Audacity/Descript editing templates. Ready to deploy immediately.',
      price: 39, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-AUD-LOFI-100',
      name: '100 Lo-Fi Hip-Hop Track Bundle',
      description: '100 chill lo-fi hip-hop tracks with stems. Perfect for study streams, YouTube videos, and coffee shop playlists. Full commercial + Twitch licence.',
      price: 55, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-AUD-EPIC-TRAILER',
      name: '30 Epic Trailer Music Tracks',
      description: '30 cinematic trailer and teaser tracks: orchestral swells, hybrid electronic, and tension cues. Broadcast-cleared, stems included, 48-kHz 24-bit WAV.',
      price: 45, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-SFX-UI-500',
      name: '500 UI / UX Sound Effects Pack',
      description: '500 crisp UI sounds: button clicks, notifications, transitions, error tones, and success chimes. Designed for mobile apps, web dashboards, and games.',
      price: 29, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-SFX-SCI-FI-200',
      name: '200 Sci-Fi Sound Effects Pack',
      description: '200 high-quality sci-fi SFX: laser blasts, holograms, spaceship engines, alien voices, and tech glitches. 24-bit WAV, UE5/Unity-ready.',
      price: 29, cat: 'Audio & Music', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-SAMPLE-DRUMS',
      name: 'Drum Machine Sample Pack – 2,000 Samples',
      description: '2,000 drum samples: kick, snare, hi-hat, clap, percussion, and room recordings. 24-bit / 44.1 kHz WAV. Ableton, Logic, and FL Studio kits included.',
      price: 35, cat: 'Audio & Music', vendor: creativeVendor.id,
    },

    // ── PixelForge Studio ─────────────────────────────────────────────────
    {
      productID: 'PF-AUD-HIPHOP-200',
      name: '200 Hip-Hop Beats + Full Stems Bundle',
      description: '200 original hip-hop instrumentals with full stems (drums, bass, melody, FX). Trap, boom-bap, drill, and melodic variants. Unlimited commercial licence.',
      price: 89, cat: 'Audio & Music', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-AUD-ELECTRONIC-150',
      name: '150 Electronic Music Tracks Bundle',
      description: '150 royalty-free electronic tracks: house, techno, ambient, synthwave, and drum-and-bass. Stems and BPM/key metadata included.',
      price: 75, cat: 'Audio & Music', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-AUD-ORCHESTRAL-80',
      name: '80 Orchestral Score Tracks',
      description: '80 full orchestral scores recorded with live players: dramatic suites, heroic themes, and emotional underscores. 48/24 WAV + stems.',
      price: 119, cat: 'Audio & Music', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-SFX-HORROR-400',
      name: '400 Horror & Tension SFX Pack',
      description: '400 spine-chilling SFX: jump scares, ambience drones, monster vocals, door creaks, and psychological horror stingers. Game and film ready.',
      price: 39, cat: 'Audio & Music', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-SFX-CARTOON-300',
      name: '300 Cartoon & Comedy SFX Pack',
      description: '300 classic cartoon SFX: boing, whoosh, splat, slide whistles, and comedy timing stings. Ideal for mobile games, YouTube channels, and animated content.',
      price: 29, cat: 'Audio & Music', vendor: pixelforgeVendor.id,
    },

    // ── MediaVault Pro ────────────────────────────────────────────────────
    {
      productID: 'MV-AUD-BROADCAST-100',
      name: '100 Broadcast Music Tracks (TV / Film Cleared)',
      description: 'MediaVault\'s broadcast music library: 100 tracks fully cleared for TV, film, and streaming platform use. Blanket licensing, no per-use fees.',
      price: 149, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-SFX-FOLEY-500',
      name: '500 Professional Foley SFX Pack',
      description: '500 studio-recorded foley sounds: footsteps (10 surfaces), clothing rustle, prop handling, and ambient room tones. 96 kHz / 24-bit broadcast masters.',
      price: 89, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-AUD-PODCAST-PRO',
      name: 'Podcast Production Pro Kit',
      description: 'Complete podcast audio kit: 50 jingles, 20 bed music loops, 100 transition SFX, and Audacity/Adobe Audition templates. Broadcast-quality masters.',
      price: 59, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-AUD-DOCUMENTARY',
      name: '40 Documentary Score Music Pack',
      description: '40 documentary-style music tracks: investigative, nature, human interest, and political. Stems included, fully licensed for documentary film and web series.',
      price: 69, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-SFX-SPORTS-200',
      name: '200 Sports & Action SFX Library',
      description: '200 high-energy sports sounds: crowds, whistles, impacts, race engines, ball hits, and arena atmospheres. Ideal for sports broadcast and action games.',
      price: 45, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SAAS SUBSCRIPTIONS  (~50 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── DevVault Pro ──────────────────────────────────────────────────────
    {
      productID: 'CO-PILOT-PRO',
      name: 'AI Coding Assistant Pro (Lifetime Licence)',
      description: 'Lifetime licence for an AI pair-programming assistant (Copilot-compatible). Multi-language support, inline suggestions, test generation, and code review.',
      price: 499, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'VERCEL-PRO-3MO',
      name: 'Vercel Pro – 3 Month Credit',
      description: '3-month Vercel Pro plan credit. Includes 1 TB bandwidth, 100 GB-hrs compute, preview deployments, and custom domains. Perfect for Next.js prototypes.',
      price: 60, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'VERCEL-PRO-1YR',
      name: 'Vercel Pro – 1 Year Credit',
      description: 'Full 12-month Vercel Pro credit. Best value for production Next.js, Nuxt, or SvelteKit apps requiring high-availability global edge deployments.',
      price: 200, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'NOTION-TEAM-1YR',
      name: 'Notion Team Plan (1 Year, 10 Seats)',
      description: '1-year Notion Team plan for up to 10 members. Includes unlimited blocks, collaborative docs, database sync, API access, and page analytics.',
      price: 160, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'NOTION-PLUS-1YR',
      name: 'Notion Plus Plan (1 Year, Individual)',
      description: '1-year Notion Plus for solo power users: unlimited file uploads, version history, advanced permissions, and 90-day page restore.',
      price: 96, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
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
      name: 'SendGrid Essentials (1 Year, 100K Emails/mo)',
      description: '1-year SendGrid Essentials plan: 100,000 transactional emails per month, dedicated IP, deliverability insights, and email validation.',
      price: 199, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-LINEAR-1YR',
      name: 'Linear Project Management (1 Year)',
      description: '1-year Linear team plan: sprint planning, roadmaps, GitHub integration, and blazing-fast keyboard-driven UX. Perfect for modern engineering teams.',
      price: 96, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-SUPABASE-PRO-1YR',
      name: 'Supabase Pro (1 Year)',
      description: '1-year Supabase Pro: 8 GB database, 250 GB bandwidth, daily backups, point-in-time recovery, and edge functions. Firebase alternative built on Postgres.',
      price: 300, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-RAILWAY-PRO-1YR',
      name: 'Railway Pro – 1 Year Deployment Credit',
      description: '1-year Railway Pro credit for unlimited projects, custom domains, private networking, and team collaboration. Deploy anything from a Dockerfile.',
      price: 240, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-SENTRY-TEAM-1YR',
      name: 'Sentry Team Error Monitoring (1 Year)',
      description: '1-year Sentry Team plan: 50K errors/month, performance monitoring, session replay, and alerting. Covers JavaScript, Python, Go, and 50+ platforms.',
      price: 312, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-CLOUDFLARE-PRO-1YR',
      name: 'Cloudflare Pro Plan (1 Year)',
      description: '1-year Cloudflare Pro: WAF, image optimisation, priority support, and advanced DDoS mitigation. Essential for any production web property.',
      price: 240, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-LOOM-BIZ-1YR',
      name: 'Loom Business (1 Year, 5 Seats)',
      description: '1-year Loom Business for 5 users: unlimited recording length, password-protected videos, custom branding, and viewer insights.',
      price: 150, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-AIRTABLE-TEAM-1YR',
      name: 'Airtable Team Plan (1 Year, 5 Seats)',
      description: '1-year Airtable Team: 50,000 records per base, 20 GB attachment storage, revision history, advanced calendar, Gantt, and gallery views.',
      price: 300, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-FRAMER-PRO-1YR',
      name: 'Framer Pro Website Builder (1 Year)',
      description: '1-year Framer Pro: unlimited published pages, custom domains, CMS collections, advanced animations, and component libraries.',
      price: 180, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-WEBFLOW-CMS-1YR',
      name: 'Webflow CMS Plan (1 Year)',
      description: '1-year Webflow CMS for marketing websites: 2,000 CMS items, custom domain, 200 GB bandwidth, and white-labelled staging links.',
      price: 276, cat: 'SaaS Subscriptions', vendor: softwareVendor.id,
    },

    // ── StartupStack ──────────────────────────────────────────────────────
    {
      productID: 'SS-STARTER-BUNDLE',
      name: 'Startup Essentials Bundle',
      description: 'The perfect first SaaS toolkit: Notion Plus + GitHub Pro + Linear 1-year credits bundled at a steep discount. Zero configuration needed.',
      price: 199, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-DESIGN-BUNDLE',
      name: 'Design Stack Bundle',
      description: 'Figma Pro + Framer Pro + Canva Pro — 1-year credits for the full modern design workflow. Ship beautiful products without juggling multiple subscriptions.',
      price: 249, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ANALYTICS-BUNDLE',
      name: 'Analytics Stack Bundle',
      description: 'Mixpanel Growth + Hotjar Business + PostHog Cloud — 3-month credits to instrument your funnel, watch session replays, and run A/B tests.',
      price: 149, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-DEVOPS-BUNDLE',
      name: 'DevOps Stack Bundle',
      description: 'Vercel Pro + Sentry Team + Upstash Pro — 1-year deployment, monitoring, and caching stack. Everything you need to ship and maintain production apps.',
      price: 299, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-MARKETING-BUNDLE',
      name: 'Marketing Stack Bundle',
      description: 'Mailchimp Essentials + Buffer Pro + SEMrush Pro — 3-month credits for email marketing, social scheduling, and SEO growth. Save vs. individual plans.',
      price: 249, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-PRODUCTIVITY-BUNDLE',
      name: 'Productivity Stack Bundle',
      description: 'Linear + Notion Team + Loom Business — 1-year bundle for teams that ship fast. Covers planning, documentation, and async video communication.',
      price: 179, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ZAPIER-10K',
      name: 'Zapier Professional – 10 K Tasks/Month (1 Year)',
      description: '1-year Zapier Professional plan: 10,000 monthly tasks, multi-step Zaps, filters, formatters, and premium app integrations.',
      price: 240, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-MAKE-PRO-1YR',
      name: 'Make (Integromat) Pro – 1 Year',
      description: '1-year Make Pro plan: 10,000 operations/month, full-featured visual workflow builder, 1,000+ app connectors, and error handling flows.',
      price: 192, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-TYPEFORM-BIZ-1YR',
      name: 'Typeform Business (1 Year)',
      description: '1-year Typeform Business: unlimited responses, branching logic, file uploads, Salesforce & HubSpot integrations, and custom branding.',
      price: 312, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-CALENDLY-TEAM-1YR',
      name: 'Calendly Teams (1 Year, 5 Seats)',
      description: '1-year Calendly Teams: round-robin scheduling, collective meetings, Salesforce sync, reminders, and custom confirmation pages for 5 users.',
      price: 180, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ZOOM-PRO-1YR',
      name: 'Zoom Pro (1 Year)',
      description: '1-year Zoom Pro: 30-hour meeting limit, 5 GB cloud recording storage, and managed attendee lists. For teams outgrowing the free 40-minute cap.',
      price: 150, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ALGOLIA-1YR',
      name: 'Algolia Search – 1 Year (100 K Searches/mo)',
      description: '1-year Algolia Grow plan: 100,000 monthly searches, 1M records, typo-tolerance, faceting, and geo-search. Plug-and-play React/Vue/JS SDKs.',
      price: 180, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-TWILIO-CREDIT-100',
      name: 'Twilio SMS / Voice Credit – $100',
      description: '$100 Twilio account credit redeemable for SMS, voice calls, WhatsApp Business, or Verify OTP. No expiry, rolls over each month.',
      price: 100, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-RESEND-PRO-1YR',
      name: 'Resend Email Pro (1 Year, 50 K Emails/mo)',
      description: '1-year Resend Pro: 50,000 transactional emails per month, custom domains, dedicated IPs, delivery analytics, and React Email component library.',
      price: 144, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DEVELOPER TOOLS  (~50 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── DevVault Pro ──────────────────────────────────────────────────────
    {
      productID: 'JS-IDE-1YR',
      name: 'JetBrains All Products Pack (1 Year)',
      description: 'Full JetBrains suite licence for 1 year: IntelliJ IDEA Ultimate, WebStorm, PyCharm, DataGrip, Rider, GoLand, and more. Instant licence key delivery.',
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
      name: 'Postman Team Plan (1 Year, 5 Seats)',
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
    {
      productID: 'DV-PYCHARM-1YR',
      name: 'PyCharm Professional (1 Year)',
      description: 'JetBrains PyCharm Pro 1-year licence. Django, FastAPI, Jupyter, scientific tools, Docker integration, and advanced Python debugging.',
      price: 99, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-RIDER-1YR',
      name: 'JetBrains Rider .NET IDE (1 Year)',
      description: 'Full-featured .NET, C#, F#, and Unity IDE from JetBrains. 1-year licence with Roslyn analysis, debugger, profiler, and NuGet integration.',
      price: 139, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-WEBSTORM-1YR',
      name: 'WebStorm JavaScript IDE (1 Year)',
      description: 'JetBrains WebStorm for JavaScript, TypeScript, React, Vue, and Node.js. Smart refactoring, debugging, and integrated test runner.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-GOLAND-1YR',
      name: 'GoLand Go IDE (1 Year)',
      description: 'JetBrains GoLand 1-year licence. Smart completion, goroutine debugging, integrated Go module support, and first-class Kubernetes tooling.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-TERRAFORM-CLOUD-1YR',
      name: 'Terraform Cloud Plus (1 Year)',
      description: '1-year Terraform Cloud Plus: remote state management, Sentinel policy enforcement, audit logging, and team access controls for IaC workflows.',
      price: 240, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-MONGODB-ATLAS-500',
      name: 'MongoDB Atlas Pro Credits – $500',
      description: '$500 MongoDB Atlas credit applicable to any cluster tier. Perfect for production M30+ clusters, Atlas Search, Data Lake, and App Services.',
      price: 500, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-NGROK-PRO-1YR',
      name: 'Ngrok Pro (1 Year)',
      description: '1-year ngrok Pro: custom subdomains, wildcard TLS tunnels, webhook forwarding, traffic inspection, and IP allowlisting. Ideal for webhook dev and demos.',
      price: 120, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-SNYK-TEAM-1YR',
      name: 'Snyk Team Security Plan (1 Year)',
      description: '1-year Snyk Team: automated dependency vulnerability scanning, SAST, container scanning, IaC misconfiguration detection, and PR fix suggestions.',
      price: 300, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-SONARQUBE-1YR',
      name: 'SonarQube Developer Licence (1 Year)',
      description: '1-year SonarQube Developer: advanced branch analysis, PR decoration, 25 supported languages, and OWASP Top 10 security rule detection.',
      price: 150, cat: 'Developer Tools', vendor: softwareVendor.id,
    },

    // ── CodeCraft Tools ───────────────────────────────────────────────────
    {
      productID: 'CC-TEST-FRAMEWORK-JS',
      name: 'JavaScript Testing Framework Kit (Jest + Playwright)',
      description: 'Complete JS testing setup: pre-configured Jest unit-test templates, Playwright e2e suites, CI GitHub Actions workflows, and 30+ code examples.',
      price: 49, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-TEST-FRAMEWORK-PY',
      name: 'Python Testing Framework Kit (pytest + Coverage)',
      description: 'Production-ready pytest configuration: fixtures, parametrize patterns, coverage enforcement, and GitHub Actions CI templates for Python projects.',
      price: 39, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-LINTING-PACK-JS',
      name: 'ESLint / Prettier / Husky Pro Config Pack',
      description: 'Battle-tested ESLint rules for React, Next.js, and Node.js, combined with Prettier configs, Husky pre-commit hooks, and lint-staged automation.',
      price: 25, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-CI-CD-TEMPLATES',
      name: 'CI/CD Template Library (GitHub Actions / GitLab CI)',
      description: '80+ CI/CD pipeline templates for Node.js, Python, Go, Docker, and Kubernetes. Covers build, test, staging deploy, and blue-green production releases.',
      price: 59, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-DOCKER-LIBRARY',
      name: '50 Production Docker Compose Templates',
      description: '50 real-world Docker Compose stacks: Postgres+Redis, Next.js+API, ELK stack, Kafka, MinIO, and more. TLS-ready, env-variable driven, comments included.',
      price: 29, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-K8S-HELM-CHARTS',
      name: '100 Production Helm Chart Templates',
      description: '100 Helm charts for common workloads: web APIs, cron jobs, workers, databases, monitoring stacks, and ingress controllers. ArgoCD compatible.',
      price: 89, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-API-DESIGN-TOOLKIT',
      name: 'REST / GraphQL API Design Toolkit',
      description: 'End-to-end API design toolkit: OpenAPI templates, GraphQL schema best practices, Postman collection starters, versioning strategy guide, and error schema standards.',
      price: 45, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-SECURITY-SCAN-1YR',
      name: 'Code Security Scanner (SAST / DAST, 1 Year)',
      description: '1-year access to CodeCraft\'s integrated code security scanner: SAST for 10+ languages, DAST for web APIs, secrets detection, and dependency auditing.',
      price: 180, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-ARCHITECTURE-DIAGRAMS',
      name: 'Software Architecture Diagram Templates (200+)',
      description: '200+ editable architecture diagrams in Mermaid, Draw.io, and Excalidraw format. Microservices, event-driven, monorepo, serverless, and data pipeline patterns.',
      price: 29, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-GRAPHQL-TOOLKIT',
      name: 'GraphQL Schema Design & Testing Toolkit',
      description: 'Apollo-compatible GraphQL schema design guide, resolver patterns, N+1 prevention strategies, subscriptions, and Postman + Insomnia test collections.',
      price: 45, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-OPENAPI-GENERATOR',
      name: 'OpenAPI Spec Generator & Documentation Kit',
      description: 'Auto-generate OpenAPI 3.1 specs from your codebase, add Redoc-powered docs sites, and validate specs in CI. Supports Express, FastAPI, and Gin.',
      price: 35, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-ENV-MANAGER-1YR',
      name: 'Environment & Secrets Manager (1 Year, 5 Devs)',
      description: '1-year team secrets and environment variable manager: encrypted vault, per-environment scoping, audit trails, and GitHub/Vercel sync for 5 developers.',
      price: 60, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-PERFORMANCE-TOOLKIT',
      name: 'Web Performance Optimisation Toolkit',
      description: 'Lighthouse CI setup, Core Web Vitals budget enforcement, image optimisation scripts, critical CSS extraction, and CDN cache-control configuration templates.',
      price: 39, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-ACCESSIBILITY-KIT',
      name: 'Web Accessibility Testing & Fix Kit (WCAG 2.2)',
      description: 'WCAG 2.2 AA compliance toolkit: axe-core CI integration, VoiceOver/NVDA test scripts, component accessibility patterns, and audit report templates.',
      price: 49, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-ERROR-REPORTING-1YR',
      name: 'Error & Log Aggregation Service (1 Year)',
      description: '1-year error and log aggregation: real-time error grouping, stack trace deduplication, Slack/PagerDuty alerts, and custom dashboards for 3 projects.',
      price: 120, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-DATABASE-MIGRATION',
      name: 'Database Migration Toolkit',
      description: 'Schema versioning toolkit for Postgres and MySQL: Flyway-compatible migration templates, rollback scripts, CI integration, and data seeding patterns.',
      price: 59, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // EDUCATION VOUCHERS  (~52 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── LearnChain Academy ────────────────────────────────────────────────
    {
      productID: 'AWS-CERT-VOUCH',
      name: 'AWS Solutions Architect – Associate Exam Voucher',
      description: 'Official AWS Certified Solutions Architect – Associate exam voucher. Valid for 12 months. Includes Pearson VUE scheduling access.',
      price: 150, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AWS-SAP-VOUCH',
      name: 'AWS Solutions Architect – Professional Exam Voucher',
      description: 'Official AWS SA Professional voucher. Most advanced AWS architecture certification. Valid 12 months, Pearson VUE scheduling included.',
      price: 300, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AWS-SDA-VOUCH',
      name: 'AWS Developer – Associate Exam Voucher',
      description: 'Official AWS Certified Developer Associate voucher. Covers Lambda, DynamoDB, SQS, IAM, and CDK deployment patterns. Valid 12 months.',
      price: 150, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AWS-DOPS-VOUCH',
      name: 'AWS DevOps Engineer – Professional Exam Voucher',
      description: 'Official AWS DevOps Engineer Professional voucher. Covers CI/CD, IaC, monitoring, and high-availability architecture. Pearson VUE scheduling.',
      price: 300, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'GCP-CERT-VOUCH',
      name: 'Google Cloud Professional Data Engineer Voucher',
      description: 'Official Google Cloud Professional Data Engineer certification voucher. Valid 12 months. Covers BigQuery, Dataflow, Pub/Sub, and Vertex AI.',
      price: 150, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'GCP-ACE-VOUCH',
      name: 'Google Cloud Associate Cloud Engineer Voucher',
      description: 'Official GCP ACE exam voucher. Entry-point GCP certification covering Compute Engine, GKE, Cloud Storage, and IAM. Valid 12 months.',
      price: 150, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AZ-900-VOUCH',
      name: 'Microsoft Azure Fundamentals (AZ-900) Voucher',
      description: 'Official Microsoft AZ-900 exam voucher. Entry-level Azure certification covering cloud concepts, Azure services, and pricing. Great for beginners.',
      price: 99, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AZ-104-VOUCH',
      name: 'Microsoft Azure Administrator (AZ-104) Voucher',
      description: 'Official AZ-104 voucher. Covers Azure VMs, networking, storage, identity, and monitoring. Mid-level Azure operations certification.',
      price: 165, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'AZ-204-VOUCH',
      name: 'Microsoft Azure Developer (AZ-204) Voucher',
      description: 'Official AZ-204 voucher for Azure developer certification. Covers Azure Functions, App Service, Cosmos DB, and Azure AD B2C integration.',
      price: 165, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'CKA-CERT-VOUCH',
      name: 'Certified Kubernetes Administrator (CKA) Voucher',
      description: 'CNCF CKA exam voucher. Covers cluster architecture, workloads, networking, storage, and troubleshooting. Includes 2 free retakes.',
      price: 299, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'CKAD-VOUCH',
      name: 'Certified Kubernetes Application Developer (CKAD) Voucher',
      description: 'CNCF CKAD exam voucher. Focuses on container design, configuration, multi-container pods, and observability for Kubernetes-native apps.',
      price: 299, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'CKS-VOUCH',
      name: 'Certified Kubernetes Security Specialist (CKS) Voucher',
      description: 'Advanced CNCF CKS voucher. Covers cluster hardening, supply chain security, runtime threat detection, and network policy. Prerequisites: CKA required.',
      price: 299, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'TERRAFORM-CERT-VOUCH',
      name: 'HashiCorp Terraform Associate Voucher',
      description: 'Official HashiCorp Terraform Associate certification voucher. Covers HCL, state management, modules, Terraform Cloud, and remote backends.',
      price: 70, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'DOCKER-CERT-VOUCH',
      name: 'Docker Certified Associate Voucher',
      description: 'Official Docker DCA exam voucher. Covers image management, networking, orchestration, security, and storage. Includes 1 free retake.',
      price: 195, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'UDEMY-100-BUNDLE',
      name: 'Udemy 100-Course Bundle Credit',
      description: 'Prepaid Udemy credit redeemable for up to 100 courses. Valid for any subject: programming, design, AI, business, photography, and more.',
      price: 199, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'BOOT-FULLSTACK',
      name: 'Full-Stack Web Dev Bootcamp (Self-Paced, 120 hr)',
      description: '120-hour self-paced full-stack bootcamp: HTML/CSS, JavaScript, React, Node.js, PostgreSQL, and deployment. Certificate of completion included.',
      price: 249, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'BOOT-ML-ENGINEERING',
      name: 'ML Engineering Bootcamp (Self-Paced, 80 hr)',
      description: '80-hour ML Engineering course: Python, scikit-learn, PyTorch, model deployment with FastAPI, and MLflow experiment tracking. Project-based.',
      price: 299, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-REACT-ADVANCED',
      name: 'Advanced React Development Course (30 hr)',
      description: 'Deep-dive React course: concurrent mode, Server Components, TanStack Query, Zustand, performance profiling, and production deployment patterns.',
      price: 89, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-PYTHON-DATA',
      name: 'Python for Data Science Course (40 hr)',
      description: 'Comprehensive Python data science course: NumPy, pandas, matplotlib, seaborn, scikit-learn, and a capstone data analysis project.',
      price: 69, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-PYTORCH-COURSE',
      name: 'PyTorch Deep Learning Practical Course (35 hr)',
      description: 'Hands-on PyTorch: CNNs, RNNs, Transformers, fine-tuning LLMs, model deployment with TorchServe, and quantisation optimisation.',
      price: 99, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-RUST-COURSE',
      name: 'Systems Programming with Rust (30 hr)',
      description: 'Production Rust course: ownership, lifetimes, async/await, building CLI tools, wasm targets, and contributing to open-source Rust crates.',
      price: 89, cat: 'Education Vouchers', vendor: eduVendor.id,
    },

    // ── MindSpark Learning ────────────────────────────────────────────────
    {
      productID: 'MS-BOOT-REACT-NATIVE',
      name: 'React Native Mobile Dev Bootcamp (60 hr)',
      description: 'MindSpark\'s flagship mobile bootcamp: React Native + Expo, navigation, native modules, camera/GPS, push notifications, App Store & Play Store submission.',
      price: 299, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOT-DEVOPS',
      name: 'DevOps & Cloud Engineer Bootcamp (80 hr)',
      description: 'Comprehensive DevOps bootcamp: Linux, Docker, Kubernetes, CI/CD (GitHub Actions + ArgoCD), Terraform, AWS fundamentals, and production incident response.',
      price: 349, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOT-DATA-SCI',
      name: 'Data Science Bootcamp + Portfolio (100 hr)',
      description: 'End-to-end data science bootcamp: Python, SQL, machine learning, model deployment, and 5 real-world portfolio projects with mentorship sessions.',
      price: 399, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOT-CYBERSEC',
      name: 'Cybersecurity Professional Bootcamp (70 hr)',
      description: 'Hands-on cybersecurity bootcamp: networking fundamentals, OWASP, Metasploit, Wireshark, CTF challenges, and Security+ exam prep module.',
      price: 329, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOT-UI-UX',
      name: 'UI/UX Design Bootcamp (60 hr)',
      description: 'Full UX process bootcamp: user research, wireframing, Figma prototyping, usability testing, design systems, and a professional portfolio review.',
      price: 249, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOT-BLOCKCHAIN',
      name: 'Blockchain & Web3 Dev Bootcamp (50 hr)',
      description: 'Web3 developer bootcamp: Solidity, Hardhat, Foundry, ERC standards, DeFi protocols, IPFS, and deploying NFT + DeFi contracts on testnets.',
      price: 349, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-SYSTEM-DESIGN',
      name: 'System Design Interview Prep Masterclass (20 hr)',
      description: 'Comprehensive system design prep: URL shorteners, Twitter clone, ride-sharing, distributed caches, CDN design, and 50 mock interview questions.',
      price: 99, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-ALGO',
      name: 'Algorithms & Data Structures Masterclass (30 hr)',
      description: 'LeetCode-focused algorithm mastery: arrays, trees, graphs, DP, sliding window, two-pointer, and 200+ graded practice problems. Timed mock contests.',
      price: 79, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-CERT-PMP',
      name: 'PMP Exam Prep Bundle + Practice Tests',
      description: 'PMI PMP prep bundle: 40-hr study course, 6 full practice exams (1,200+ questions), flashcard sets, and agile vs predictive process comparison guides.',
      price: 199, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-CERT-SECURITY-PLUS',
      name: 'CompTIA Security+ Exam Prep Bundle',
      description: 'SY0-701 prep bundle: video lectures, 5 full practice exams, performance-based question drills, and a 90-day study planner. Voucher not included.',
      price: 149, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BUNDLE-FULLSTACK',
      name: 'Full-Stack Mastery Learning Bundle (120 hr)',
      description: 'MindSpark\'s full-stack learning path: React + TypeScript, Node.js + Express, PostgreSQL + Prisma, Docker, CI/CD, and production deployment. Projects + mentorship.',
      price: 449, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BUNDLE-AI-ML',
      name: 'AI / ML Engineer Learning Bundle',
      description: 'Complete AI/ML path: Python fundamentals, ML theory, PyTorch, LLM fine-tuning, RAG systems, model deployment on AWS, and MLOps with MLflow.',
      price: 399, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CYBERSECURITY  (~40 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── CipherStack Security ──────────────────────────────────────────────
    {
      productID: 'VPN-PRO-1YR',
      name: 'Enterprise VPN Pro (1 Year, 10 Devices)',
      description: 'No-log enterprise VPN for up to 10 devices. WireGuard protocol, split tunnelling, kill switch, and 60+ server locations. Instant activation.',
      price: 79, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-VPN-PERSONAL-1YR',
      name: 'Personal VPN Pro (1 Year, 5 Devices)',
      description: 'Budget-friendly personal VPN: WireGuard + OpenVPN, 45 countries, no-logs policy, and automatic kill switch. 5-device plan with shared credentials.',
      price: 49, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-VPN-BUSINESS-1YR',
      name: 'Business VPN (1 Year, 25 Devices)',
      description: 'Business VPN with dedicated server option, split tunnelling per-app, audit logs, SSO support, and priority support SLA. 25 concurrent devices.',
      price: 149, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'PENTEST-KIT-PRO',
      name: 'Penetration Testing Toolkit – Pro',
      description: 'Professional pen-testing toolkit: Burp Suite Pro 1-year licence + custom payloads library + OWASP checklist templates + report generator.',
      price: 449, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-PENTEST-BASIC',
      name: 'Penetration Testing Starter Kit',
      description: 'Entry-level pen-testing kit: Burp Suite Community + custom proxy plugins, OWASP ZAP config, SQLMap scripts, and a recon automation toolkit.',
      price: 149, cat: 'Cybersecurity', vendor: securityVendor.id,
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
      productID: 'CS-SSL-SINGLE-1YR',
      name: 'Single Domain SSL Certificate (1 Year)',
      description: 'Budget single-domain DV SSL/TLS certificate. 2048-bit key, SHA-256, trusted by all browsers. Ideal for personal projects and small business sites.',
      price: 19, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-SSL-EV-1YR',
      name: 'Extended Validation (EV) SSL Certificate (1 Year)',
      description: 'EV SSL certificate with organisation validation. Green padlock in legacy browsers, highest level of trust for e-commerce and financial platforms.',
      price: 149, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'PWD-MANAGER-TEAM',
      name: 'Team Password Manager (1 Year, 25 Seats)',
      description: 'Secure team password manager: end-to-end encrypted vault, role-based sharing, audit logs, MFA enforcement, and SSO integration for 25 seats.',
      price: 120, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-PWD-MANAGER-PERSONAL',
      name: 'Personal Password Manager (1 Year)',
      description: 'Personal password manager with zero-knowledge AES-256 vault, biometric unlock, TOTP authenticator, secure notes, and breach-monitoring alerts.',
      price: 29, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-WAF-PRO-1YR',
      name: 'Web Application Firewall Pro (1 Year)',
      description: 'Cloud WAF with OWASP Top 10 rule sets, rate limiting, bot mitigation, geo-blocking, and real-time threat intelligence feed. Up to 5 domains.',
      price: 360, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-VULN-SCANNER-1YR',
      name: 'Vulnerability Scanner (1 Year)',
      description: '1-year automated vulnerability scanning: CVE detection, port scanning, SSL/TLS audits, CMS plugin checks, and scheduled weekly scan reports.',
      price: 199, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-ENDPOINT-5-1YR',
      name: 'Endpoint Security Suite (1 Year, 5 Devices)',
      description: 'Next-gen AV + EDR for 5 devices: behavioural detection, ransomware rollback, USB control, network firewall, and web content filtering.',
      price: 89, cat: 'Cybersecurity', vendor: securityVendor.id,
    },

    // ── GuardianShield Security ───────────────────────────────────────────
    {
      productID: 'GS-VPN-TEAM-1YR',
      name: 'Enterprise Team VPN (1 Year, 50 Devices)',
      description: 'GuardianShield enterprise VPN: dedicated server cluster, LDAP/SAML SSO, split-tunnel policy management, and SIEM integration for 50 devices.',
      price: 349, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-PENTEST-ADVANCED',
      name: 'Advanced Penetration Testing Suite',
      description: 'GuardianShield\'s enterprise pen-test suite: Metasploit Pro, Burp Suite Pro, custom exploit library, automated report generator, and 1-year updates.',
      price: 899, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-COMPLIANCE-GDPR',
      name: 'GDPR Compliance Automation Toolkit',
      description: 'Complete GDPR automation: consent management platform templates, data mapping tools, DPA agreement templates, DPIA questionnaires, and staff training materials.',
      price: 299, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-COMPLIANCE-SOC2',
      name: 'SOC 2 Type II Readiness Pack',
      description: 'SOC 2 readiness bundle: security policy templates, evidence collection checklists, vendor assessment questionnaires, and employee training packs.',
      price: 499, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-ZERO-TRUST-1YR',
      name: 'Zero Trust Network Access (1 Year)',
      description: '1-year ZTNA platform: identity-aware proxy, device posture checks, microsegmentation, and continuous authentication for remote teams up to 100 users.',
      price: 599, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-THREAT-INTEL-1YR',
      name: 'Threat Intelligence Feed (1 Year)',
      description: '1-year threat intelligence feed: real-time IOC updates, malware hashes, phishing URLs, APT TTPs, and STIX/TAXII integration for your SIEM.',
      price: 249, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-PHISHING-SIM-1YR',
      name: 'Phishing Simulation Platform (1 Year)',
      description: '1-year phishing simulation and security awareness training platform: 1,000+ phishing templates, automated campaigns, click tracking, and staff training videos.',
      price: 199, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-DARK-WEB-MONITOR-1YR',
      name: 'Dark Web Monitoring Service (1 Year)',
      description: 'Continuous dark web monitoring for your company\'s domains, executive email addresses, and credential leaks. Real-time Slack/email alerts, analyst-verified.',
      price: 149, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-API-SECURITY-1YR',
      name: 'API Security Testing Suite (1 Year)',
      description: 'API security scanner: OWASP API Top 10 checks, authentication bypass testing, schema validation, and automated regression testing in CI pipelines.',
      price: 299, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-CLOUD-SECURITY-AUDIT',
      name: 'Cloud Security Posture Audit Pack',
      description: 'Cloud configuration audit toolkit for AWS, GCP, and Azure: CIS Benchmark checks, IAM policy analysis, S3/GCS bucket exposure audit, and remediation guides.',
      price: 199, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-IDENTITY-MGMT-1YR',
      name: 'Identity & Access Management Suite (1 Year, 50 Users)',
      description: '1-year IAM platform: SSO, MFA enforcement, privileged access management, role provisioning, and quarterly access reviews for 50 users.',
      price: 599, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-INCIDENT-RESPONSE-KIT',
      name: 'Incident Response Playbook & Toolkit',
      description: 'Comprehensive IR toolkit: 20 incident playbooks (ransomware, DDoS, data breach, insider threat), forensic collection scripts, and communication templates.',
      price: 149, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DESIGN & FONTS  (~30 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── AssetStream Digital ───────────────────────────────────────────────
    {
      productID: 'FONT-COLLECTION-50',
      name: '50 Premium Font Collection (Commercial Licence)',
      description: '50 premium fonts: display, sans-serif, serif, monospace, and script. OTF + TTF + WOFF2 formats. Full desktop, web, and app commercial licence.',
      price: 49, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-FONT-VARIABLE-10',
      name: '10 Variable Font Collection – Web Licence',
      description: '10 premium variable fonts licensed for unlimited web use. WOFF2 only. Covers weight, width, and optical-size axes. Performance-optimised for Core Web Vitals.',
      price: 49, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-FONT-MONO-CODING',
      name: 'Developer Coding Font Pack – 15 Fonts',
      description: '15 coding fonts including ligature-enabled and symbol-rich variants: inspiration from Fira Code, JetBrains Mono, and Cascadia aesthetics. TTF + OTF + WOFF2.',
      price: 25, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'BRAND-KIT-TEMPLATE',
      name: 'Complete Brand Identity Kit (Canva + Figma)',
      description: 'Full brand identity system: logo variations, colour palette, typography guide, business card, social media templates, pitch deck. 80+ files.',
      price: 69, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'PRINT-TEMPLATE-PACK',
      name: 'Professional Print Template Pack (50 Templates)',
      description: '50 print-ready templates: brochures, flyers, posters, business cards, menus, and banners. InDesign, Illustrator, and Canva formats. CMYK-ready.',
      price: 45, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-SOCIAL-TEMPLATE-200',
      name: '200 Social Media Template Pack (Canva)',
      description: '200 branded social media templates for Instagram, LinkedIn, Twitter/X, and Facebook. Canva-editable, includes reels covers, story frames, and carousel packs.',
      price: 39, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-LOGO-TEMPLATE-200',
      name: '200 Editable Logo Templates (AI + SVG)',
      description: '200 vector logo templates for startups, agencies, restaurants, and personal brands. Adobe Illustrator AI + SVG + PNG. Royalty-free commercial licence.',
      price: 49, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-WIREFRAME-KIT',
      name: 'UX Wireframe Kit – 200+ Components (Figma)',
      description: '200+ low-fidelity wireframe components for web and mobile. Figma auto-layout, covers navigation, forms, cards, tables, onboarding, and checkout flows.',
      price: 39, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-INFOGRAPHIC-TEMPLATES',
      name: '100 Infographic Templates (Figma / Canva)',
      description: '100 editable infographic templates: timelines, comparison charts, process flows, data visualisations, and statistics layouts. Figma + Canva formats.',
      price: 45, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-COLOR-PALETTE-500',
      name: '500 Designer Colour Palette Collection',
      description: '500 curated professional colour palettes in ASE, CSV, and Figma formats. Primary/secondary/accent breakdown, WCAG contrast ratios, and dark-mode variants.',
      price: 15, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-MOCKUP-PRINT',
      name: 'Print Mockup Pack – 150 Templates (Photoshop)',
      description: '150 print mockup PSD files: business cards, brochures, books, packaging, apparel, and signage. Smart object layers, multiple lighting variants.',
      price: 39, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },

    // ── PixelForge Studio ─────────────────────────────────────────────────
    {
      productID: 'PF-FONT-COLLECTION-100',
      name: '100 Font Mega Collection – Commercial Licence',
      description: 'PixelForge\'s definitive font library: 100 typefaces spanning display, body, monospace, and decorative styles. OTF + TTF + WOFF2 + EOT. Unlimited projects.',
      price: 89, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-FONT-VARIABLE-20',
      name: '20 Premium Variable Fonts – Web + App Licence',
      description: '20 cutting-edge variable fonts with extended axis ranges. Web-optimised WOFF2 + desktop OTF. App and ebook licensing included. Performance-tuned subsetting guide.',
      price: 79, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-BRANDING-SYSTEM-PRO',
      name: 'Pro Brand System – 200+ Assets (Figma)',
      description: 'Enterprise brand system in Figma: logo construction grid, full token library, email signature, presentation master, and social media system. 200+ files.',
      price: 99, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-SOCIAL-MEDIA-KIT-PRO',
      name: 'Social Media Pro Kit – 400+ Templates (Figma)',
      description: '400+ social media templates for all major platforms. Animated variants, story/reel covers, highlight icon sets, and brand-consistent carousel designs.',
      price: 59, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-PITCH-DECK-20',
      name: '20 Premium Pitch Deck Templates (Figma + PPTX)',
      description: '20 investor-ready pitch deck templates: product launch, funding round, agency proposal, and partnership decks. Figma source + PowerPoint export.',
      price: 79, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-NEWSLETTER-TEMPLATES',
      name: '50 HTML Newsletter Templates',
      description: '50 fully responsive HTML email templates: newsletters, promotional campaigns, product launches, and transactional emails. Tested in Gmail, Outlook, Apple Mail.',
      price: 45, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-TEMPLATE-RESUME',
      name: 'Resume & Portfolio Template Pack – 30 Designs',
      description: '30 ATS-friendly resume templates and 10 portfolio website wireframes. Figma, Word, and Google Docs formats. Tailored for tech, design, and creative roles.',
      price: 25, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-ICON-MINIMAL',
      name: '2,000 Minimal Icon Set (SVG + React)',
      description: '2,000 pixel-perfect minimal icons at 24 px and 48 px. SVG, PNG, and React (tree-shakeable) component export. MIT licence for open source, commercial licence included.',
      price: 29, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'AS-PATTERN-1000',
      name: '1,000 Seamless Pattern Pack (SVG)',
      description: '1,000 seamless tileable SVG patterns: geometric, organic, abstract, and thematic sets. Figma and Illustrator compatible. Commercial licence.',
      price: 35, cat: 'Design & Fonts', vendor: creativeVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DATA & ANALYTICS  (~30 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── BitCompute Cloud ──────────────────────────────────────────────────
    {
      productID: 'DATA-PIPELINE-1YR',
      name: 'Managed ETL Pipeline (1 Year, 10 M Events/mo)',
      description: 'Hosted ETL/ELT pipeline service: connects 50+ sources, processes up to 10M events per month, and delivers to your warehouse or BI tool.',
      price: 360, cat: 'Data & Analytics', vendor: infraVendor.id,
    },
    {
      productID: 'BI-DASHBOARD-PRO',
      name: 'BI Dashboard Builder Pro (1 Year)',
      description: 'No-code BI dashboard builder: 20+ chart types, real-time data connectors, white-label embeds, and scheduled PDF reports. Up to 5 users.',
      price: 180, cat: 'Data & Analytics', vendor: infraVendor.id,
    },
    {
      productID: 'BC-DATA-WAREHOUSE-1YR',
      name: 'Managed Data Warehouse (1 Year, 500 GB)',
      description: 'BitCompute\'s columnar data warehouse with 500 GB storage, SQL query interface, auto-scaling compute, and direct BI tool integration via JDBC/ODBC.',
      price: 480, cat: 'Data & Analytics', vendor: infraVendor.id,
    },
    {
      productID: 'BC-STREAMING-1YR',
      name: 'Real-Time Event Streaming (1 Year, 50 M Events/mo)',
      description: 'Managed Kafka-compatible event streaming: 50 million events per month, 7-day retention, consumer group management, and schema registry.',
      price: 360, cat: 'Data & Analytics', vendor: infraVendor.id,
    },

    // ── DataStream Analytics ──────────────────────────────────────────────
    {
      productID: 'DS-ETL-STARTER-1YR',
      name: 'ETL Pipeline – Starter (1 Year, 1 M Events/mo)',
      description: 'DataStream\'s entry-level ETL: 1 million events/month, 20 source connectors, and delivery to Postgres, BigQuery, or S3. Ideal for early-stage startups.',
      price: 120, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ETL-GROWTH-1YR',
      name: 'ETL Pipeline – Growth (1 Year, 50 M Events/mo)',
      description: '50 million events/month ETL with 80+ source connectors, custom transformations, SLA-backed 99.9% uptime, and Slack failure alerting.',
      price: 480, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ETL-ENTERPRISE-1YR',
      name: 'ETL Pipeline – Enterprise (1 Year, 500 M Events/mo)',
      description: 'DataStream Enterprise ETL: 500 million events/month, dedicated processing cluster, HIPAA-compliant mode, and a dedicated CSM. Custom pricing available.',
      price: 1800, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-BI-STARTER-1YR',
      name: 'BI Dashboard – Starter (1 Year, 1 User)',
      description: 'Solo BI plan: connect to 10 data sources, build unlimited dashboards, and schedule weekly email reports. Powered by DataStream\'s semantic layer.',
      price: 60, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-BI-TEAM-1YR',
      name: 'BI Dashboard – Team (1 Year, 10 Users)',
      description: 'Team BI: 10 users, role-based dashboard access, shared metric definitions, and embedded dashboard iframes with JWT auth for your product.',
      price: 360, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ANALYTICS-SDK-1YR',
      name: 'Product Analytics SDK (1 Year, 100 K MAU)',
      description: 'Drop-in product analytics SDK: event autocapture, session recording, feature flags, funnel analysis, and cohort retention charts. 100,000 MAU.',
      price: 240, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ANALYTICS-GROWTH-1YR',
      name: 'Product Analytics – Growth (1 Year, 1 M MAU)',
      description: 'Scale-up product analytics for 1 million MAU: A/B testing, multivariate experiments, user journey maps, and predictive churn modelling.',
      price: 720, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-DATA-CATALOG-1YR',
      name: 'Data Catalog & Governance Tool (1 Year)',
      description: '1-year data catalog: automated schema discovery, data lineage tracking, column-level access policies, and business glossary for data teams.',
      price: 360, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-REPORTING-AUTOMATION',
      name: 'Automated Report Scheduling Tool (1 Year)',
      description: 'Schedule and deliver BI reports as PDF, CSV, or Slack summaries. 1-year access, 100 scheduled jobs, custom recipients, and anomaly detection alerts.',
      price: 180, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-DATA-QUALITY-1YR',
      name: 'Data Quality & Monitoring (1 Year)',
      description: '1-year data quality platform: row-count anomaly detection, schema drift alerts, freshness checks, and dbt test integration for data pipeline reliability.',
      price: 240, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ML-FEATURE-STORE',
      name: 'ML Feature Store (1 Year)',
      description: '1-year managed ML feature store: online + offline feature serving, feature versioning, point-in-time retrieval, and integration with MLflow and SageMaker.',
      price: 480, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-REVERSE-ETL-1YR',
      name: 'Reverse ETL Sync Tool (1 Year)',
      description: 'Sync your data warehouse to CRMs, ad platforms, and support tools. 1-year plan: 25 destinations, row-level sync, and incremental updates every 15 minutes.',
      price: 360, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-DBT-CLOUD-1YR',
      name: 'dbt Cloud Developer Plan (1 Year)',
      description: '1-year dbt Cloud Developer plan: managed dbt runner, CI/CD for dbt models, documentation hosting, and Slack job failure alerts.',
      price: 240, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-LOOKER-DASHBOARDS',
      name: 'Looker Studio Pro Dashboard Templates (50 Dashboards)',
      description: '50 production-ready Looker Studio (Google Data Studio) dashboard templates: ecommerce, SaaS metrics, marketing analytics, and finance dashboards.',
      price: 79, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // GAME DEVELOPMENT  (~40 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── GameForge Studio ──────────────────────────────────────────────────
    {
      productID: 'GF-UNITY-SHADER-PACK',
      name: 'Unity Shader Graph Pro Pack – 50 Shaders',
      description: '50 production-quality Unity Shader Graph shaders: water, lava, holographic, outline, dissolve, and toon lighting. URP + HDRP compatible.',
      price: 49, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UE5-BLUEPRINT-LIB',
      name: 'Unreal Engine 5 Blueprint Library – 200+ Systems',
      description: '200+ UE5 Blueprint systems: inventory, quest, dialogue, crafting, day/night cycle, weather, and AI behaviour trees. Fully documented, beginner friendly.',
      price: 89, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UE5-VFX-PACK',
      name: 'Unreal Engine 5 Niagara VFX Mega Pack',
      description: '150+ Niagara particle systems: fire, explosions, magic spells, environmental particles, blood, water, and sci-fi energy effects. Optimised for console targets.',
      price: 129, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UNITY-VFX-PACK',
      name: 'Unity VFX Graph Particle Pack – 100 Effects',
      description: '100 Unity VFX Graph particle effects: HDRP and URP variants, fire, smoke, magic, portals, and weapon effects. Performance-profiled for mobile targets.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GODOT-ASSET-PACK',
      name: 'Godot 4 Complete Asset Pack',
      description: 'Comprehensive Godot 4 asset pack: 200+ 2D/3D assets, shader library, audio integration examples, and a template top-down RPG project.',
      price: 59, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-PIXEL-ART-PACK',
      name: 'Pixel Art Mega Pack (Tilesets + Characters + UI)',
      description: 'Massive pixel art pack: RPG tileset, dungeon tiles, overworld map, 20 character sprites with walk/attack/death animations, and a full UI skin.',
      price: 39, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-ISOMETRIC-PACK',
      name: 'Isometric City Builder Asset Pack',
      description: 'Detailed isometric city building pack: 300+ buildings, roads, vehicles, trees, water tiles, and animated citizens. Multi-level z-index ready.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-MOBILE-GAME-KIT',
      name: 'Hyper-Casual Mobile Game Template Kit',
      description: '10 complete hyper-casual game templates for Unity: endless runner, ball roller, stack builder, helix jump, and more. Ad integration stubs included.',
      price: 99, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-MULTIPLAYER-TEMPLATE',
      name: 'Multiplayer Game Starter Template (Unity + Netcode)',
      description: 'Production-ready Unity multiplayer template: Netcode for GameObjects, lobby system, matchmaking, relay servers, and in-game chat foundation.',
      price: 149, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-INVENTORY-SYSTEM',
      name: 'Drag-Drop Inventory System (Unity)',
      description: 'Full-featured Unity inventory system: grid/slot layouts, item stacking, equipment slots, save/load, loot tables, and Scriptable Object item definitions.',
      price: 49, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-DIALOGUE-SYSTEM',
      name: 'RPG Dialogue System Plugin (Unity / Godot)',
      description: 'Node-based dialogue editor with branching, variables, localisation support, portrait system, and voice-line playback. Unity + Godot 4 versions included.',
      price: 59, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-AI-PATHFINDING',
      name: 'Advanced AI Pathfinding & Behaviour System (Unity)',
      description: 'Production Unity AI toolkit: A* + Navmesh hybrid pathfinding, behaviour trees, sensory system (sight/sound), group steering, and combat stances.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-PROCEDURAL-TERRAIN',
      name: 'Procedural Terrain Generator (Unreal Engine 5)',
      description: 'UE5 PCG-based procedural terrain system: biome blending, foliage scattering, river generation, cave networks, and real-time LOD streaming.',
      price: 99, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GAME-ANALYTICS-SDK',
      name: 'Mobile Game Analytics SDK (1 Year)',
      description: '1-year game analytics SDK: DAU/MAU tracking, session length, level completion funnels, A/B test framework, and monetisation event tracking.',
      price: 120, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-LEADERBOARD-1YR',
      name: 'Cloud Leaderboard & Achievement Service (1 Year)',
      description: '1-year managed leaderboard service: global + friend leaderboards, time-windowed boards, achievement unlocks, and REST + SDK access for Unity/Godot.',
      price: 60, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GAME-SFX-COMPLETE',
      name: 'Complete Game Audio Pack (SFX + Music + UI)',
      description: 'All-in-one game audio pack: 500 SFX, 30 BGM tracks, 100 UI sounds, and a boss fight score. 24-bit WAV + OGG, UE5/Unity/FMOD-ready.',
      price: 149, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-CHARACTER-ANIMATOR',
      name: '2D Character Animation Pack – 500 Frames',
      description: '10 character classes with full 2D animation sets: idle, walk, run, jump, attack (3 types), hurt, and death. PNG sprite sheets + individual frames.',
      price: 69, cat: 'Game Development', vendor: gameforgeVendor.id,
    },

    // ── LearnChain / MindSpark – Game Dev Courses ─────────────────────────
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
    {
      productID: 'MS-COURSE-UNITY-BEGINNER',
      name: 'Unity 2024 Complete Beginner Course (40 hr)',
      description: 'MindSpark\'s beginner Unity course: C# fundamentals, 2D + 3D game development, physics, animation rigging, and publishing to itch.io and WebGL.',
      price: 79, cat: 'Game Development', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-UE5-BEGINNER',
      name: 'Unreal Engine 5 Beginner to Intermediate (50 hr)',
      description: 'Hands-on UE5 course: Blueprints, landscape tools, Lumen, MetaHumans, Chaos physics, and shipping a cross-platform demo build. Project-based.',
      price: 99, cat: 'Game Development', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-GODOT-4',
      name: 'Godot 4 Game Development Complete Course (35 hr)',
      description: 'Comprehensive Godot 4 course: GDScript, 2D platformer, 3D FPS, UI systems, shaders, and deploying to Web + Android. Beginner-friendly.',
      price: 69, cat: 'Game Development', vendor: mindsparkVendor.id,
    },
    {
      productID: 'GF-COURSE-MULTIPLAYER',
      name: 'Multiplayer Game Dev with Mirror / Fish-Net (25 hr)',
      description: 'Deep-dive multiplayer Unity course: client-server architecture, prediction & reconciliation, lobby systems, anti-cheat basics, and server hosting.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'MS-COURSE-MOBILE-GAME',
      name: 'Mobile Game Monetisation & Publishing Course',
      description: 'Learn AdMob, IAP, subscription models, Play Store + App Store optimisation, and analytics-driven retention strategies. Unity + Godot examples.',
      price: 49, cat: 'Game Development', vendor: mindsparkVendor.id,
    },
    {
      productID: 'AS-3D-PROPS-MODERN',
      name: 'Modern Interior Props Pack – 500 Assets',
      description: '500 game-ready interior props: electronics, furniture, kitchen items, office equipment, and decorations. UE5 + Unity compatible, 4K PBR textures.',
      price: 99, cat: 'Game Development', vendor: creativeVendor.id,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MARKETING & SEO  (~35 products)
    // ═══════════════════════════════════════════════════════════════════════

    // ── NeuralForge AI ────────────────────────────────────────────────────
    {
      productID: 'SEO-AUDIT-TOOL-1YR',
      name: 'SEO Audit & Rank Tracker (1 Year)',
      description: '1-year access to an SEO suite: site audits, keyword rank tracking (500 keywords), backlink analysis, competitor monitoring, and weekly reports.',
      price: 149, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'NF-SEO-KEYWORDS-DB',
      name: 'SEO Keyword Research Database Access (1 Year)',
      description: '1-year access to NeuralForge\'s keyword intelligence database: 500M+ keywords, monthly search volume, keyword difficulty, SERP feature data, and question explorer.',
      price: 99, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'SOCIAL-SCHEDULER-1YR',
      name: 'Social Media Scheduler Pro (1 Year, 10 Profiles)',
      description: '1-year social media management plan: schedule posts across Instagram, X, LinkedIn, TikTok, and Facebook for up to 10 profiles. Includes analytics.',
      price: 99, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'EMAIL-MARKETING-TEMPLATE',
      name: 'Email Marketing Template Pack (100 Templates)',
      description: '100 professionally designed HTML email templates: newsletters, promotions, onboarding flows, and transactional emails. Compatible with Mailchimp, SendGrid, and Klaviyo.',
      price: 39, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'NF-CONTENT-AI-1YR',
      name: 'AI Content Generation Suite (1 Year)',
      description: '1-year AI content suite: long-form article generation, SEO brief creation, headline testing, social caption writing, and brand voice training on your past content.',
      price: 149, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'NF-AD-COPY-GENERATOR',
      name: 'AI Ad Copy Generator (1,000 Credits)',
      description: '1,000 credits for AI-generated ad copy: Facebook, Google, LinkedIn, and TikTok ad variants. A/B headline pairs, CTA optimisation, and tone-of-voice controls.',
      price: 49, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'NF-LANDING-PAGE-AI',
      name: 'AI Landing Page Copy Generator Kit',
      description: 'Template-driven landing page copy generator: hero headline, feature blocks, social proof sections, FAQ, and CTA copy — tailored to your product in minutes.',
      price: 59, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'NF-CRO-TOOLKIT',
      name: 'Conversion Rate Optimisation Toolkit',
      description: 'CRO toolkit: 50 proven A/B test ideas, Hotjar session analysis guide, landing page audit checklist, form optimisation playbook, and trust-signal library.',
      price: 79, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'NF-AFFILIATE-TRACKER-1YR',
      name: 'Affiliate Marketing Tracking Platform (1 Year)',
      description: '1-year affiliate platform: custom tracking links, commission management, affiliate portal, fraud detection, and Stripe payout automation.',
      price: 149, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },

    // ── StartupStack ──────────────────────────────────────────────────────
    {
      productID: 'SS-MAILCHIMP-6MO',
      name: 'Mailchimp Essentials – 6 Month Credit',
      description: '6-month Mailchimp Essentials: 500K monthly email sends, 3 audience seats, A/B testing, custom templates, and basic automation workflows.',
      price: 75, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-BUFFER-PRO-1YR',
      name: 'Buffer Pro – 1 Year, 10 Profiles',
      description: '1-year Buffer Pro social scheduling: 10 social profiles, 100 scheduled posts per profile, first comment scheduling, and engagement analytics.',
      price: 120, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-SEMRUSH-PRO-3MO',
      name: 'SEMrush Pro – 3 Month Credit',
      description: '3-month SEMrush Pro: 5 projects, 500 keyword tracking positions, site audit, backlink analytics, competitor traffic analysis, and content marketing tools.',
      price: 330, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-HUBSPOT-MARKETING-1YR',
      name: 'HubSpot Marketing Hub Starter (1 Year)',
      description: '1-year HubSpot Marketing Starter: email marketing, forms, landing pages, ads management, and basic CRM integration for 1,000 marketing contacts.',
      price: 600, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ACTIVECAMPAIGN-1YR',
      name: 'ActiveCampaign Lite (1 Year, 1K Contacts)',
      description: '1-year ActiveCampaign Lite: email automation, conditional content, site tracking, and a basic CRM for up to 1,000 contacts. Competitor to Mailchimp.',
      price: 180, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-KLAVIYO-3MO',
      name: 'Klaviyo Email & SMS – 3 Months (2,500 Contacts)',
      description: '3-month Klaviyo plan for e-commerce: 2,500 active profiles, email + SMS campaigns, abandoned cart flows, and predictive CLV analytics.',
      price: 60, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-HOTJAR-BIZ-3MO',
      name: 'Hotjar Business – 3 Month Credit',
      description: '3-month Hotjar Business: 500 daily sessions, heatmaps, session recordings, feedback widgets, and funnel analysis for conversion optimisation.',
      price: 99, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },

    // ── MediaVault Pro ────────────────────────────────────────────────────
    {
      productID: 'MV-AD-CREATIVE-PACK',
      name: 'Social Ad Creative Template Pack – 300 Templates',
      description: '300 social ad creative templates: Facebook feed ads, Instagram carousels, LinkedIn sponsored content, TikTok ads, and Google Display banners in Figma + Canva.',
      price: 79, cat: 'Marketing & SEO', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-VIDEO-AD-TEMPLATES',
      name: 'Video Ad Template Pack – 50 Templates (Premiere)',
      description: '50 Premiere Pro video ad templates: 15-second, 30-second, and 60-second formats for Instagram, TikTok, YouTube, and Facebook. Motion graphics included.',
      price: 99, cat: 'Marketing & SEO', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-BRAND-CONTENT-PACK',
      name: 'Brand Content Photo Pack – 200 Lifestyle Photos',
      description: '200 brand-agnostic lifestyle photos cleared for commercial advertising use. Tech, wellness, food, and travel themes. Ultra-high-res, model-released.',
      price: 119, cat: 'Marketing & SEO', vendor: mediavaultVendor.id,
    },
    {
      productID: 'NF-ANALYTICS-REPORTING',
      name: 'Marketing Analytics Auto-Report Generator',
      description: 'Connect Google Analytics, Meta Ads, and LinkedIn Ads — get a weekly AI-written performance report delivered to your inbox. 1-year subscription.',
      price: 89, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'SS-CONVERTKIT-1YR',
      name: 'ConvertKit Creator Plan (1 Year, 1K Subscribers)',
      description: '1-year ConvertKit Creator: unlimited broadcasts, 3 automations, unlimited landing pages, and 1,000 subscribers. Ideal for creators and solo newsletters.',
      price: 290, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'BC-GPU-H100-80G-7DAY',
      name: 'H100 80GB GPU Instance – 7-Day Pass',
      description: '7-day dedicated H100 80GB SXM5 instance for large-scale LLM training runs. NVLink fabric, 3.35 TB/s memory bandwidth, CUDA 12 pre-installed.',
      price: 1099, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-GPU-A100-40G-SPOT',
      name: 'A100 40GB Spot Instance – 72h',
      description: '72-hour spot A100 40GB PCIe instance at discounted rates. Ideal for interruptible training jobs with checkpoint support.',
      price: 129, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-STORAGE-10TB-COLD',
      name: 'Cold Object Storage – 10 TB',
      description: '10 TB of S3-compatible cold object storage. 99.999% durability, lifecycle policies, cross-region replication optional.',
      price: 39, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-CDN-5TB-TRANSFER',
      name: 'CDN Bandwidth Pack – 5 TB',
      description: '5 TB of global CDN egress. 50+ PoPs, HTTP/3, Brotli compression, real-time purge API included.',
      price: 25, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-VPS-8CORE-32GB',
      name: 'VPS Pro – 8 vCPU / 32 GB RAM',
      description: 'High-memory virtual server with 8 AMD EPYC vCPUs, 32 GB DDR5 RAM, 400 GB NVMe SSD, 10 Gbps uplink. 30-day credit.',
      price: 89, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-GPU-L40S-30DAY',
      name: 'L40S 48GB GPU Instance – 30-Day Pass',
      description: '30-day L40S 48GB instance optimised for inference, video rendering, and multi-modal workloads. PCIe Gen4, 864 GB/s bandwidth.',
      price: 999, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CN-K8S-STARTER-1MO',
      name: 'Managed Kubernetes Starter – 1 Month',
      description: '3-node managed Kubernetes cluster (4 vCPU / 16 GB each), auto-scaling up to 10 nodes, integrated load balancer, 1-month subscription.',
      price: 149, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-SERVERLESS-10M-INVOC',
      name: 'Serverless Function Pack – 10M Invocations',
      description: '10 million serverless function invocations. Sub-10ms cold start, 512 MB RAM default, custom runtimes (Node, Python, Go, Rust).',
      price: 35, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-MANAGED-PG-50GB',
      name: 'Managed PostgreSQL – 50 GB Storage',
      description: 'Fully managed PostgreSQL 16 instance with daily backups, connection pooling (PgBouncer), read replicas, and 50 GB SSD storage.',
      price: 59, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-BARE-METAL-1MO',
      name: 'Bare-Metal Server – 1 Month',
      description: 'Dedicated bare-metal: 2× 32-core AMD EPYC, 512 GB DDR5 ECC, 4× 3.84 TB NVMe RAID, 25 Gbps network. Full root access.',
      price: 1299, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-MANAGED-REDIS-1MO',
      name: 'Managed Redis Cluster – 1 Month',
      description: 'Three-node Redis 7 cluster with AOF persistence, TLS, automatic failover, and 16 GB total memory.',
      price: 79, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'NF-LLAMA3-70B-500K',
      name: 'Llama 3.1 70B – 500K Token Voucher',
      description: '500,000 inference tokens on hosted Llama 3.1 70B Instruct. JSON mode, function calling, 128K context window.',
      price: 18, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-MIXTRAL-8X22B-1M',
      name: 'Mixtral 8×22B – 1M Token Voucher',
      description: '1 million tokens on Mixtral 8×22B MoE model. 64K context, multilingual, strong at code and reasoning tasks.',
      price: 22, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-EMBEDDINGS-50M',
      name: 'Text Embeddings – 50M Tokens',
      description: '50 million embedding tokens using multilingual-e5-large-instruct. 1024-dim vectors, cosine similarity optimised.',
      price: 15, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-FINETUNE-7B-JOB',
      name: 'LLM Fine-Tuning Job – 7B Model',
      description: 'Single LoRA fine-tuning run on a 7B parameter base model. Up to 100K training samples, wandb logging, exported GGUF.',
      price: 199, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-TTS-CLONING-5VOICE',
      name: 'TTS Voice Cloning – 5 Custom Voices',
      description: 'Clone 5 unique voices from 30-second audio samples. Ultra-low latency streaming, SSML support, 12 languages.',
      price: 89, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-OCR-DOC-10K',
      name: 'Document OCR – 10,000 Pages',
      description: '10,000 pages of high-accuracy OCR with layout preservation. Tables, forms, handwriting, 95+ language support.',
      price: 29, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-IMAGEGEN-SDXL-5K',
      name: 'SDXL Image Generation – 5,000 Credits',
      description: '5,000 Stable Diffusion XL generation credits. 1024×1024, inpainting, ControlNet, LoRA injection, commercial licence.',
      price: 39, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'VA-VIDEO-GEN-500',
      name: 'AI Video Generation – 500 Credits',
      description: '500 credits for text-to-video and image-to-video synthesis. Up to 1080p, 10-second clips, motion control prompts.',
      price: 79, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-VISION-API-100K',
      name: 'Computer Vision API – 100K Calls',
      description: '100,000 computer vision API calls: object detection, segmentation, OCR, face landmarks, scene classification.',
      price: 45, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-UPSCALE-4X-10K',
      name: 'AI Image Upscaling – 10,000 Credits',
      description: '10,000 upscaling credits for 4× super-resolution. Real-ESRGAN architecture, face restoration, artifact removal.',
      price: 19, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-3DGEN-OBJ-200',
      name: 'AI 3D Object Generation – 200 Credits',
      description: '200 credits for single-image-to-3D mesh generation. Exports OBJ, GLB, FBX. PBR texture maps included.',
      price: 59, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-AVATAR-TALKING-50',
      name: 'Talking Avatar Generation – 50 Videos',
      description: '50 talking-head avatar videos driven by audio or text script. Custom background removal, lip-sync accuracy >95%.',
      price: 69, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-POSE-ESTIMATION-50K',
      name: 'Pose Estimation API – 50K Frames',
      description: '50,000 frames of skeleton pose estimation (17-keypoint COCO format). Batch video input, WebSocket streaming available.',
      price: 29, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'AS-UI-KIT-SAAS-PRO',
      name: 'SaaS Dashboard UI Kit – Pro Edition',
      description: '800+ Figma and React components for SaaS dashboards. Dark/light themes, 6 accent palettes, design tokens, Storybook docs.',
      price: 79, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ICON-PACK-3000-DUOTONE',
      name: 'Duotone Icon Pack – 3,000 Icons',
      description: '3,000 duotone vector icons across 80 categories. SVG, PNG (16–512px), Figma, Sketch. Commercial licence included.',
      price: 39, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-3D-ENV-SCI-FI',
      name: 'Sci-Fi 3D Environment Pack',
      description: '45 modular sci-fi environment meshes with 4K PBR textures. Blender, Cinema 4D, OBJ/FBX formats. Game-ready topology.',
      price: 89, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-MOTION-TITLES-50',
      name: 'Motion Graphics Title Pack – 50 Templates',
      description: '50 After Effects and Premiere Pro title templates. 4K, customisable colours/fonts, no plugins required.',
      price: 59, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-STOCK-PHOTO-500',
      name: 'Stock Photo Bundle – 500 Images',
      description: '500 curated high-resolution stock photographs (min 6000px wide). Tech, business, lifestyle, nature. Royalty-free commercial use.',
      price: 49, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-LUT-CINEMA-PACK',
      name: 'Cinematic LUT Pack – 120 Presets',
      description: '120 professional .cube LUT files. Film emulation, teal-orange grades, bleach bypass, day-for-night. Compatible with Resolve, Premiere, FCPX.',
      price: 29, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-MOCKUP-BUNDLE-200',
      name: 'Device Mockup Bundle – 200 Scenes',
      description: '200 smart-object Photoshop mockups: phones, tablets, laptops, packaging, print. Photorealistic lighting, 4K output.',
      price: 55, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'PF-DESIGN-SYSTEM-ENT',
      name: 'Enterprise Design System – Full Licence',
      description: 'Production-ready design system: 1,200+ Figma components, CSS variables, React + Vue libraries, accessibility audit docs.',
      price: 299, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-FONT-COLLECTION-VAR',
      name: 'Variable Font Collection – 30 Families',
      description: '30 premium variable font families: sans, serif, display, monospace. All axes exposed, web-optimised WOFF2, desktop OTF.',
      price: 129, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-3D-ABSTRACT-PACK',
      name: '3D Abstract Asset Pack – 80 Objects',
      description: '80 high-poly abstract 3D objects with procedural shaders. Blender source files + rendered PNG on transparent backgrounds.',
      price: 69, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-PITCH-DECK-BUNDLE',
      name: 'Startup Pitch Deck Bundle – 10 Templates',
      description: '10 professionally designed pitch deck templates for PowerPoint, Keynote, and Google Slides. Investor-ready layouts, editable charts.',
      price: 49, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-BRAND-KIT-ULTIMATE',
      name: 'Ultimate Brand Identity Kit',
      description: 'Complete brand identity: logo system, colour palette, typography, business card, letterhead, social templates. Figma + AI sources.',
      price: 119, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-SOCIAL-TEMPLATE-500',
      name: 'Social Media Template Mega Pack – 500',
      description: '500 editable social media templates (Instagram, LinkedIn, Twitter, TikTok, YouTube). Canva + Figma + PSD formats.',
      price: 59, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'MV-STOCK-BROADCAST-100',
      name: 'Broadcast Stock Video Pack – 100 Clips',
      description: '100 broadcast-quality 4K stock video clips. Aerials, time-lapses, corporate, nature. Royalty-free, no attribution required.',
      price: 149, cat: 'Creative Assets', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-FOLEY-SFX-1000',
      name: 'Foley & SFX Library – 1,000 Sounds',
      description: '1,000 professionally recorded foley and SFX clips. WAV 96kHz/24-bit, metadata-tagged, Soundminer compatible.',
      price: 99, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-ORCHESTRAL-SCORE-20',
      name: 'Orchestral Score Pack – 20 Tracks',
      description: '20 full orchestral composition stems (60–120 BPM), loop-ready sections, mixed for film and game trailers. Broadcast licence.',
      price: 129, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-AMBIENT-DRONE-50',
      name: 'Ambient Drone Pack – 50 Textures',
      description: '50 evolving ambient drone textures for meditation, horror, sci-fi, and documentary. 5–10 min each, WAV + FLAC.',
      price: 49, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-PODCAST-MUSIC-KIT',
      name: 'Podcast Music Kit – 40 Loops',
      description: '40 upbeat and neutral podcast background loops. 30-second, 60-second, and full 3-minute versions. MP3 320 + WAV.',
      price: 35, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-LOFIHIPHOP-ALBUM',
      name: 'Lo-Fi Hip-Hop Studio Album – 16 Tracks',
      description: '16-track lo-fi hip-hop album, stems included. Vinyl crackle, tape saturation, fully mixed and mastered. Sync licence.',
      price: 59, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-DOCUMENTARY-AUDIO',
      name: 'Documentary Audio Pack – 30 Tracks',
      description: '30 documentary-style music tracks with tension, resolve, and neutral beds. Stems split by instrument group. Broadcast ready.',
      price: 79, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-ALL-1YR',
      name: 'JetBrains All Products Pack – 1 Year',
      description: 'Annual licence for all JetBrains IDEs: IntelliJ IDEA Ultimate, PyCharm, WebStorm, GoLand, Rider, CLion, DataGrip, and more.',
      price: 249, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-GITHUB-ENTERPRISE-1MO',
      name: 'GitHub Enterprise Server – 1-Month Seat',
      description: 'One-month GitHub Enterprise seat with advanced security, code scanning, secret detection, Copilot Business included.',
      price: 39, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-DOCKER-BUSINESS-1YR',
      name: 'Docker Business – 1 Year',
      description: 'Docker Business annual licence: enhanced security, SAML SSO, image access management, private registries, 3 seats.',
      price: 179, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-POSTMAN-PRO-1YR',
      name: 'Postman Pro – 1 Year',
      description: 'Postman Pro annual plan: unlimited collections, monitors, mock servers, API governance, team collaboration for 5 users.',
      price: 129, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-TERRAFORM-CLOUD-PLUS',
      name: 'Terraform Cloud Plus – 3 Months',
      description: '3-month Terraform Cloud Plus subscription: run tasks, policy as code (Sentinel/OPA), SSO, audit logging, 5 concurrent runs.',
      price: 89, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-MONGOATLAS-M30-1MO',
      name: 'MongoDB Atlas M30 – 1 Month',
      description: 'MongoDB Atlas M30 dedicated cluster for 1 month. 8 GB RAM, 40 GB NVMe, 3-node replica set, global distribution.',
      price: 189, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-NGROK-PRO-1YR',
      name: 'ngrok Pro – 1 Year',
      description: 'ngrok Pro annual subscription: 5 reserved domains, custom subdomains, OAuth, IP allowlists, webhook inspection.',
      price: 99, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-SNYK-TEAM-1YR',
      name: 'Snyk Team – 1 Year (10 Devs)',
      description: 'Snyk Team plan for 10 developers: open-source, container, IaC, and code scanning. PR checks, Jira integration.',
      price: 299, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'CC-TESTING-FRAMEWORK-JS',
      name: 'JS/TS Testing Framework Bundle',
      description: 'Complete JavaScript/TypeScript testing setup: Jest config, Playwright E2E suite, MSW API mocking, coverage thresholds, CI integration.',
      price: 49, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-CICD-GITHUB-ACTIONS',
      name: 'GitHub Actions CI/CD Template Library',
      description: '40 production-ready GitHub Actions workflows: Docker build/push, Kubernetes deploy, semantic release, security scans, Slack notifications.',
      price: 39, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-HELM-CHARTS-20',
      name: 'Helm Chart Library – 20 Production Charts',
      description: '20 battle-tested Helm charts: web apps, workers, cron jobs, Redis, Postgres, NGINX, cert-manager, VPA, HPA presets.',
      price: 59, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-SECURITY-STARTER-KIT',
      name: 'Developer Security Starter Kit',
      description: 'Pre-configured Trivy, Semgrep, Gitleaks, OWASP Dependency Check in a single Makefile. CI-ready, policy-as-code rules included.',
      price: 45, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-API-SPEC-TEMPLATE',
      name: 'OpenAPI 3.1 Spec Template Collection',
      description: '15 OpenAPI 3.1 specification templates: REST CRUD, OAuth 2.0, webhook, pagination, error schema conventions.',
      price: 29, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-TERRAFORM-MODULES-AWS',
      name: 'Terraform AWS Module Library – 30 Modules',
      description: '30 production Terraform AWS modules: VPC, EKS, RDS, ElastiCache, SQS, SNS, S3 lifecycle, CloudFront, WAF v2.',
      price: 79, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-LOADTEST-K6-SUITE',
      name: 'k6 Load Testing Script Suite',
      description: '25 k6 performance test scripts with thresholds, scenarios, and Grafana dashboards. Smoke, soak, stress, spike patterns.',
      price: 35, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'SS-VERCEL-PRO-6MO',
      name: 'Vercel Pro – 6 Months',
      description: '6-month Vercel Pro subscription: custom domains, advanced analytics, 1TB bandwidth, concurrent builds, password protection.',
      price: 120, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-NOTION-TEAM-6MO',
      name: 'Notion Team – 6 Months (5 Members)',
      description: '6-month Notion Team plan for 5 members: unlimited blocks, version history, collaborative workspace, API access.',
      price: 99, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-FIGMA-PRO-1YR',
      name: 'Figma Professional – 1 Year',
      description: 'Figma Professional annual licence: unlimited projects, shared libraries, advanced prototyping, version history, Dev Mode.',
      price: 144, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-LINEAR-STARTUP-1YR',
      name: 'Linear Startup Plan – 1 Year',
      description: 'Linear Startup annual plan: unlimited members, cycles, projects, roadmaps, GitHub/Jira sync, 10,000 issues.',
      price: 199, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-SUPABASE-PRO-1YR',
      name: 'Supabase Pro – 1 Year',
      description: 'Supabase Pro annual subscription: 8 GB database, 100 GB storage, 250 GB bandwidth, daily backups, custom domains.',
      price: 250, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-SENTRY-TEAM-6MO',
      name: 'Sentry Team – 6 Months',
      description: 'Sentry Team plan for 6 months: 50K errors/month, performance monitoring, session replay, 90-day retention, 5 team members.',
      price: 119, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-RAILWAY-PRO-6MO',
      name: 'Railway Pro – 6 Months',
      description: 'Railway Pro 6-month credit pack: $20/mo credit, unlimited deployments, private networking, persistent volumes.',
      price: 99, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-CLOUDFLARE-WORKERS-1YR',
      name: 'Cloudflare Workers Paid – 1 Year',
      description: '1-year Cloudflare Workers Paid plan: 10M requests/day, 30s CPU limit, KV storage, Durable Objects, R2 egress-free.',
      price: 60, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ZAPIER-STARTER-1YR',
      name: 'Zapier Starter – 1 Year',
      description: 'Zapier Starter annual plan: 750 tasks/month, multi-step zaps, filters, formatters, and webhooks. 3 premium apps.',
      price: 240, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-TWILIO-CREDITS-100',
      name: 'Twilio Credit Pack – $100',
      description: '$100 in Twilio credits for SMS, voice, WhatsApp, and email (SendGrid). No expiry, pooled across products.',
      price: 100, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-RESEND-PRO-1YR',
      name: 'Resend Pro – 1 Year',
      description: 'Resend Pro annual plan: 50K emails/month, custom domains, email logs, webhooks, React Email templates, team seats.',
      price: 190, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-CALENDLY-TEAMS-1YR',
      name: 'Calendly Teams – 1 Year',
      description: 'Calendly Teams annual plan: collective event types, round-robin routing, Salesforce CRM sync, admin reporting, 5 seats.',
      price: 240, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-FRAMER-PRO-1YR',
      name: 'Framer Pro – 1 Year',
      description: 'Framer Pro annual subscription: custom domain, 1K page views/day, CMS collections, password protection, analytics.',
      price: 150, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-WEBFLOW-CMS-1YR',
      name: 'Webflow CMS Plan – 1 Year',
      description: 'Webflow CMS annual plan: 2,000 CMS items, custom domain, 1TB CDN bandwidth, form submissions, staging environment.',
      price: 192, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-STARTUP-BUNDLE-ESSENTIAL',
      name: 'Essential Startup SaaS Bundle',
      description: 'Curated credits: Vercel Pro 3mo + Notion Team 3mo + Sentry Team 3mo + Railway Pro 3mo. Everything to ship your MVP.',
      price: 149, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'LC-AWS-SAA-VOUCHER',
      name: 'AWS Solutions Architect Associate – Exam Voucher',
      description: 'Official AWS Certified Solutions Architect Associate exam voucher. Proctored online or in-person. Valid 12 months.',
      price: 149, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-AWS-DEVOPS-PRO-VOUCHER',
      name: 'AWS DevOps Engineer Professional – Exam Voucher',
      description: 'AWS Certified DevOps Engineer Professional exam voucher. Covers CI/CD, monitoring, infrastructure as code, high availability.',
      price: 149, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-GCP-ACE-VOUCHER',
      name: 'GCP Associate Cloud Engineer – Exam Voucher',
      description: 'Google Cloud Associate Cloud Engineer exam voucher via Pearson VUE. Valid for online or test-centre scheduling.',
      price: 125, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-AZURE-AZ900-VOUCHER',
      name: 'Azure AZ-900 Fundamentals – Exam Voucher',
      description: 'Microsoft Azure AZ-900 Fundamentals exam voucher. Entry-level cloud concepts, services, security, compliance.',
      price: 99, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-AZURE-AZ204-VOUCHER',
      name: 'Azure AZ-204 Developer – Exam Voucher',
      description: 'Microsoft Azure AZ-204 Developer Associate voucher. Covers Azure Functions, Storage, Cosmos DB, API Management.',
      price: 125, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-CKA-VOUCHER',
      name: 'Certified Kubernetes Administrator (CKA) – Exam Voucher',
      description: 'Linux Foundation CKA exam voucher with 2-hour remote proctoring, one free retake. Valid 12 months.',
      price: 395, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-CKAD-VOUCHER',
      name: 'Certified Kubernetes Application Developer (CKAD) – Voucher',
      description: 'Linux Foundation CKAD exam voucher. Application design, deployment, configuration in Kubernetes. One retake included.',
      price: 395, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-TERRAFORM-ASSOC-VOUCHER',
      name: 'HashiCorp Terraform Associate – Exam Voucher',
      description: 'HashiCorp Certified Terraform Associate (003) exam voucher. IaC concepts, HCL, state management, modules.',
      price: 70, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-DOCKER-ASSOCIATE-VOUCHER',
      name: 'Docker Certified Associate – Exam Voucher',
      description: 'Official Docker Certified Associate exam voucher: image management, orchestration, networking, security.',
      price: 195, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-BOOTCAMP-FULLSTACK-16WK',
      name: 'Full-Stack Web Dev Bootcamp – 16 Weeks',
      description: '16-week async full-stack bootcamp: React, Next.js, Node, PostgreSQL, Docker. Live mentoring sessions, capstone project.',
      price: 499, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-UDEMY-BUNDLE-50',
      name: 'Udemy Course Bundle – 50 Courses',
      description: 'Access to 50 hand-picked Udemy courses covering AWS, Python, React, Machine Learning, Cybersecurity, and DevOps.',
      price: 79, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'MS-BOOTCAMP-DEVOPS-12WK',
      name: 'DevOps Engineering Bootcamp – 12 Weeks',
      description: '12-week live + recorded DevOps bootcamp: Git, CI/CD, Docker, Kubernetes, Prometheus, Grafana, Terraform, AWS. Certificate on completion.',
      price: 399, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOTCAMP-DATASCIENCE-12WK',
      name: 'Data Science Bootcamp – 12 Weeks',
      description: '12-week data science bootcamp: Python, pandas, scikit-learn, deep learning (PyTorch), SQL, Spark, end-to-end ML projects.',
      price: 449, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOTCAMP-CYBERSEC-10WK',
      name: 'Cybersecurity Analyst Bootcamp – 10 Weeks',
      description: '10-week cybersecurity bootcamp: network security, SIEM, pen testing, incident response, CompTIA Security+ alignment.',
      price: 379, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOTCAMP-UIUX-8WK',
      name: 'UI/UX Design Bootcamp – 8 Weeks',
      description: '8-week UI/UX design bootcamp: user research, wireframing, Figma prototyping, usability testing, portfolio prep.',
      price: 299, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BOOTCAMP-WEB3-8WK',
      name: 'Web3 Developer Bootcamp – 8 Weeks',
      description: '8-week Web3 bootcamp: Solidity, Hardhat, ethers.js, DeFi protocols, NFT contracts, Stacks/Clarity track included.',
      price: 349, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-MLOPS',
      name: 'MLOps Fundamentals – Self-Paced Course',
      description: 'Self-paced MLOps course: experiment tracking (MLflow), model serving (BentoML/Triton), feature stores, monitoring. 25 hours.',
      price: 99, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-GRAPHQL',
      name: 'GraphQL Mastery – Self-Paced Course',
      description: 'Comprehensive GraphQL course: schema design, resolvers, subscriptions, federation, Apollo, Hasura. 18 hours of content.',
      price: 69, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-REACT-ADVANCED',
      name: 'Advanced React Patterns – Self-Paced Course',
      description: 'Deep-dive into advanced React: compound components, render props, custom hooks, performance optimisation, RSC, Suspense.',
      price: 79, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BUNDLE-CLOUD-TRIO',
      name: 'Cloud Certification Trio Bundle',
      description: 'Three exam vouchers: AWS SAA + GCP ACE + Azure AZ-900. Best-value bundle for multi-cloud professionals.',
      price: 349, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'CS-VPN-PERSONAL-1YR',
      name: 'Personal VPN – 1 Year (5 Devices)',
      description: 'CipherStack Personal VPN: WireGuard + OpenVPN, 80+ servers in 40 countries, kill switch, no-logs policy, 5 simultaneous devices.',
      price: 49, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-VPN-BUSINESS-1YR',
      name: 'Business VPN – 1 Year (25 Devices)',
      description: 'CipherStack Business VPN: dedicated IP, split tunnelling, team management portal, DNS filtering, 25 devices.',
      price: 199, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-SSL-DV-1YR',
      name: 'SSL DV Certificate – 1 Year',
      description: 'Domain-validated SSL certificate, auto-renewed via ACME, 256-bit encryption, unlimited server licences, $10K warranty.',
      price: 19, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-SSL-WILDCARD-1YR',
      name: 'SSL Wildcard Certificate – 1 Year',
      description: 'Wildcard DV SSL covering root domain and unlimited subdomains. RSA 4096 or ECDSA P-256, 1-hour issuance.',
      price: 79, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-SSL-EV-1YR',
      name: 'SSL EV Certificate – 1 Year',
      description: 'Extended Validation SSL with organisation identity verification. Green padlock, highest trust indicator, $1.75M warranty.',
      price: 149, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-PENTEST-STARTER',
      name: 'Pen-Test Toolkit – Starter',
      description: 'Pre-configured pen-testing toolkit: Metasploit pro access (30 days), Burp Suite Pro 30-day, Nessus Essentials, lab environment.',
      price: 99, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-PENTEST-PRO',
      name: 'Pen-Test Toolkit – Pro',
      description: 'Pro pen-test suite: Burp Suite Professional 90-day, Metasploit Pro 90-day, Nessus Professional 1 IP, custom wordlists, reporting templates.',
      price: 299, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-WAF-CLOUD-1MO',
      name: 'Cloud WAF – 1 Month',
      description: 'Managed Web Application Firewall: OWASP Top 10 ruleset, bot mitigation, rate limiting, DDoS protection up to 10 Gbps, 3 domains.',
      price: 69, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-VULN-SCANNER-1YR',
      name: 'Vulnerability Scanner – 1 Year (5 Targets)',
      description: 'Continuous vulnerability scanning for 5 IP targets. CVE detection, CVSS scoring, weekly reports, Jira/Slack alerting.',
      price: 249, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-ENDPOINT-EDR-1YR',
      name: 'Endpoint EDR – 1 Year (10 Endpoints)',
      description: 'Next-gen EDR for 10 endpoints: behavioural AI, ransomware rollback, threat hunting queries, USB control, lightweight agent.',
      price: 179, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'GS-VPN-ENTERPRISE-1YR',
      name: 'Enterprise VPN Gateway – 1 Year',
      description: 'GuardianShield enterprise VPN with SAML SSO, RADIUS auth, site-to-site tunnels, dedicated gateways, 200 concurrent users.',
      price: 899, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-ZTNA-STARTER-1YR',
      name: 'Zero Trust Network Access (ZTNA) – Starter',
      description: 'Zero Trust access for 25 users: identity-aware proxy, device posture checks, micro-segmentation, MFA enforcement, audit logs.',
      price: 499, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-THREAT-INTEL-1YR',
      name: 'Threat Intelligence Feed – 1 Year',
      description: 'Real-time threat intelligence: malicious IPs, domains, hashes, TTP mappings (MITRE ATT&CK). STIX/TAXII, SIEM integration.',
      price: 399, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-PHISHING-SIM-1YR',
      name: 'Phishing Simulation Platform – 1 Year',
      description: 'Automated phishing simulation for up to 500 employees. 200+ templates, training modules, risk score dashboard, SCORM export.',
      price: 349, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-DARKWEB-MONITOR-1YR',
      name: 'Dark Web Monitoring – 1 Year',
      description: '24/7 dark web monitoring for company domains, executive emails, and credentials. Instant breach alerts, remediation guidance.',
      price: 279, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-COMPLIANCE-GDPR-KIT',
      name: 'GDPR Compliance Toolkit',
      description: 'GDPR compliance bundle: data mapping templates, DPA agreements, privacy notice generator, cookie audit tool, 1-year support.',
      price: 199, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-COMPLIANCE-SOC2-PREP',
      name: 'SOC 2 Type II Prep Kit',
      description: 'SOC 2 Type II readiness: policy templates (CC1–CC9), evidence collection checklists, vendor questionnaire library, audit-ready.',
      price: 349, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'DS-ETL-STARTER-1MO',
      name: 'ETL Pipeline – Starter (1 Month)',
      description: 'Managed ETL starter tier: 5 data sources, 10 destinations, 1M rows/month, visual pipeline builder, scheduling, error alerts.',
      price: 49, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ETL-PRO-1MO',
      name: 'ETL Pipeline – Pro (1 Month)',
      description: 'Managed ETL Pro: 25 sources, 50 destinations, 100M rows/month, CDC support, custom transformations, SLA 99.9%.',
      price: 199, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-ETL-ENTERPRISE-1MO',
      name: 'ETL Pipeline – Enterprise (1 Month)',
      description: 'Enterprise ETL: unlimited sources, 1B rows/month, on-prem connector, dedicated cluster, HIPAA/SOC2 compliant, priority support.',
      price: 799, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-BI-DASHBOARD-STARTER',
      name: 'BI Dashboard – Starter Plan',
      description: 'Self-serve BI platform: 5 dashboards, 3 data sources, charts, filters, scheduled email reports, 10 viewer seats.',
      price: 79, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-BI-DASHBOARD-PRO',
      name: 'BI Dashboard – Pro Plan',
      description: 'BI Pro: unlimited dashboards, 20 data sources, embedded analytics (iframe), white-labelling, row-level security, 50 seats.',
      price: 299, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-PRODUCT-ANALYTICS-STD',
      name: 'Product Analytics – Standard',
      description: 'Product analytics platform: event tracking, funnel analysis, cohort retention, A/B test results, 10M events/month.',
      price: 149, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-PRODUCT-ANALYTICS-PRO',
      name: 'Product Analytics – Pro',
      description: 'Product Analytics Pro: 100M events/month, session replay, heatmaps, feature flags, CDP integrations, custom SQL access.',
      price: 499, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-DATA-CATALOG-1YR',
      name: 'Data Catalog – 1 Year',
      description: 'Automated data catalog: schema discovery, lineage tracking, PII tagging, business glossary, search, Slack/Jira integration.',
      price: 399, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-REPORTING-AUTO-1YR',
      name: 'Reporting Automation – 1 Year',
      description: 'Automated report generation: 50 report templates, PDF/Excel export, scheduled delivery, role-based access, branding.',
      price: 249, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-DATA-QUALITY-1MO',
      name: 'Data Quality Monitor – 1 Month',
      description: 'Automated data quality: freshness, volume, schema drift, null rate, distribution anomaly detection. dbt and Airflow integrations.',
      price: 99, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-FEATURE-STORE-1MO',
      name: 'ML Feature Store – 1 Month',
      description: 'Online + offline feature store: sub-10ms serving, point-in-time correct training datasets, feature sharing, versioning.',
      price: 199, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-REVERSE-ETL-1MO',
      name: 'Reverse ETL – 1 Month',
      description: 'Sync data warehouse data to CRM, marketing, and support tools. Salesforce, HubSpot, Zendesk, Intercom. 10M rows/month.',
      price: 149, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-DBT-CLOUD-DEV-1YR',
      name: 'dbt Cloud Developer – 1 Year',
      description: 'dbt Cloud Developer seat for 1 year: IDE, job scheduler, docs, lineage graph, CI runs on PR, Slack notifications.',
      price: 100, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'GF-UNITY-SHADER-PACK',
      name: 'Unity Shader Pack – 60 Shaders',
      description: '60 URP/HDRP shaders for Unity: water, foliage, toon, hologram, dissolve, lava, ice, glass. Shader Graph sources included.',
      price: 59, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UE5-BLUEPRINT-LIBRARY',
      name: 'Unreal Engine 5 Blueprint Library',
      description: '45 production-ready UE5 Blueprints: inventory, quest system, AI behaviour trees, save/load, dialogue, interaction system.',
      price: 89, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GODOT-TEMPLATE-2D',
      name: 'Godot 2D Game Template Collection',
      description: '10 complete Godot 4 2D game templates: platformer, top-down RPG, bullet-hell, match-3, tower defence. Full source code.',
      price: 69, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-VFX-PARTICLE-PACK',
      name: 'VFX Particle Pack – 80 Effects',
      description: '80 game-ready particle effects: explosions, fire, magic, impacts, weather, portals. Unity VFX Graph + UE5 Niagara sources.',
      price: 49, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-PIXEL-ART-SPRITES',
      name: 'Pixel Art Sprite Pack – 500 Assets',
      description: '500 pixel art sprites: characters, enemies, items, tiles, UI elements. 16×16 and 32×32 grids, transparent PNG and Aseprite source.',
      price: 39, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-ISO-TILESET-FANTASY',
      name: 'Isometric Fantasy Tileset',
      description: '300 isometric tiles for fantasy environments: grass, stone, dungeon, forest, water, bridges, decorations. 2× and 4× resolution.',
      price: 55, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-MULTIPLAYER-TEMPLATE-UNITY',
      name: 'Unity Multiplayer Template – Netcode',
      description: 'Unity Netcode for GameObjects multiplayer template: lobby, matchmaking, player spawning, networked physics, chat, leaderboard.',
      price: 119, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-PROCEDURAL-TERRAIN-UE5',
      name: 'Procedural Terrain Generator – UE5',
      description: 'UE5 procedural terrain plugin: biome blending, erosion simulation, foliage scatter, LOD management, runtime generation.',
      price: 99, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GAME-ANALYTICS-SDK',
      name: 'Game Analytics SDK',
      description: 'Cross-platform game analytics SDK (Unity/UE5/Godot): event tracking, funnel analysis, session length, monetisation dashboards.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-LEADERBOARD-SERVICE-1YR',
      name: 'Global Leaderboard Service – 1 Year',
      description: 'Hosted leaderboard service with REST + WebSocket API: real-time rankings, seasonal resets, friend lists, cheat detection.',
      price: 129, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-MOBILE-GAME-TEMPLATE-HYPER',
      name: 'Hyper-Casual Mobile Game Template',
      description: 'Unity hyper-casual template: swipe controls, level generator, rewarded ads integration (AdMob/Unity Ads), IAP, analytics.',
      price: 59, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UNITY-AI-NPC',
      name: 'Unity AI NPC System',
      description: 'Advanced NPC AI for Unity: NavMesh-based pathfinding, perception system, behaviour tree editor, dialogue integration, LOD.',
      price: 89, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-COURSE-UNITY-BEGINNER',
      name: 'Unity Game Development – Beginner Course',
      description: 'Beginner Unity course: 30 hours, C# fundamentals, 5 mini-games built from scratch, published to WebGL. Certificate awarded.',
      price: 49, cat: 'Education Vouchers', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-COURSE-UE5-ADVANCED',
      name: 'Unreal Engine 5 – Advanced Course',
      description: 'Advanced UE5 course: Lumen, Nanite, PCG framework, MetaHuman integration, multiplayer. 40 hours, 2 complete projects.',
      price: 99, cat: 'Education Vouchers', vendor: gameforgeVendor.id,
    },
    {
      productID: 'MK-SEO-AUDIT-TOOL-1YR',
      name: 'SEO Audit Tool – 1 Year (10 Sites)',
      description: 'Comprehensive SEO audits for 10 sites: on-page, technical, backlink analysis, Core Web Vitals, schema validator, weekly crawls.',
      price: 149, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-KEYWORD-RESEARCH-100K',
      name: 'Keyword Research Pack – 100K Credits',
      description: '100,000 keyword research API credits: search volume, CPC, difficulty, SERP features, clustering, intent classification.',
      price: 59, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-SOCIAL-SCHEDULER-1YR',
      name: 'Social Media Scheduler – 1 Year (10 Profiles)',
      description: 'Schedule, publish, and analyse social posts across 10 profiles (Instagram, LinkedIn, Twitter, Facebook). AI caption suggestions.',
      price: 119, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-EMAIL-TEMPLATE-PACK-200',
      name: 'Email Marketing Template Pack – 200',
      description: '200 responsive HTML email templates: newsletters, product launches, abandoned cart, welcome series. Tested in 40+ clients.',
      price: 49, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-AI-CONTENT-GEN-5K',
      name: 'AI Content Generator – 5,000 Credits',
      description: '5,000 credits for long-form AI content: blog posts, product descriptions, landing page copy, with SEO keyword injection.',
      price: 39, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-AI-LANDING-PAGE-GEN',
      name: 'AI Landing Page Generator – 50 Pages',
      description: '50 AI-generated landing pages: hero, features, testimonials, CTA. Export to HTML, Webflow, or Framer. A/B variants included.',
      price: 89, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-CRO-TOOLKIT',
      name: 'CRO Toolkit – Heatmaps & Session Replay',
      description: '3-month CRO toolkit: heatmaps, scroll maps, session recording, form analytics, exit-intent triggers. Up to 10K sessions/month.',
      price: 69, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-AFFILIATE-TRACKER-1YR',
      name: 'Affiliate Tracking Platform – 1 Year',
      description: 'Affiliate management: unlimited affiliates, custom commission rules, fraud detection, postback URL, dashboard + API.',
      price: 199, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-MAILCHIMP-CREDITS-50K',
      name: 'Mailchimp Send Credits – 50,000 Emails',
      description: '50,000 Mailchimp email send credits. No audience limit, pay-as-you-go, automation and transactional eligible.',
      price: 29, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-SEMRUSH-PRO-3MO',
      name: 'SEMrush Pro – 3 Months',
      description: 'SEMrush Pro 3-month subscription: 5 projects, 500 keywords to track, site audit, backlink analytics, on-page SEO checker.',
      price: 120, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-HUBSPOT-STARTER-6MO',
      name: 'HubSpot Starter CRM – 6 Months',
      description: 'HubSpot Starter suite for 6 months: CRM, email marketing, forms, live chat, 1,000 contacts, ad management, basic reporting.',
      price: 150, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-ACTIVECAMPAIGN-PLUS-1YR',
      name: 'ActiveCampaign Plus – 1 Year (1K Contacts)',
      description: 'ActiveCampaign Plus annual plan for 1,000 contacts: automation builder, CRM, landing pages, SMS, site tracking.',
      price: 228, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-BUFFER-TEAM-1YR',
      name: 'Buffer Team Plan – 1 Year',
      description: 'Buffer Team: unlimited posts, 10 social channels, team collaboration, approval workflows, analytics, custom link shortener.',
      price: 120, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-AD-CREATIVE-PACK-100',
      name: 'Ad Creative Template Pack – 100 Designs',
      description: '100 editable ad creative templates for Facebook, Instagram, Google Display, LinkedIn. PSD + Figma, animated versions included.',
      price: 49, cat: 'Marketing & SEO', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'MK-VIDEO-AD-TEMPLATE-50',
      name: 'Video Ad Template Pack – 50 Templates',
      description: '50 After Effects video ad templates: 15s, 30s, 60s variants. Social-format ready (9:16, 1:1, 16:9), logo and text placeholders.',
      price: 79, cat: 'Marketing & SEO', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MK-KLAVIYO-CREDITS-100K',
      name: 'Klaviyo Email Credits – 100K Sends',
      description: '100,000 Klaviyo email sends. Works with any existing Klaviyo account, no plan upgrade required, flow and campaign eligible.',
      price: 45, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-CONVERTKIT-CREATOR-1YR',
      name: 'ConvertKit Creator – 1 Year (1K Subscribers)',
      description: 'ConvertKit Creator annual plan for 1,000 subscribers: visual automations, sequences, commerce features, custom domains.',
      price: 290, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-HOTJAR-PLUS-3MO',
      name: 'Hotjar Plus – 3 Months',
      description: 'Hotjar Plus for 3 months: 500 daily sessions, heatmaps, recordings, feedback polls, surveys, no watermark.',
      price: 99, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'DV-SONARQUBE-DEVOP-1YR',
      name: 'SonarQube Developer – 1 Year',
      description: 'SonarQube Developer Edition annual licence: 5 projects, all language plugins, branch analysis, PR decoration, security hotspots.',
      price: 149, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-INTELLIJ-1YR',
      name: 'IntelliJ IDEA Ultimate – 1 Year',
      description: 'JetBrains IntelliJ IDEA Ultimate individual licence for 1 year: full Java/Kotlin/Spring/JPA/Quarkus support, database tools.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-PYCHARM-1YR',
      name: 'PyCharm Professional – 1 Year',
      description: 'PyCharm Professional individual licence: Django, Flask, FastAPI, Jupyter, remote interpreter, profiler, scientific mode.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-WEBSTORM-1YR',
      name: 'WebStorm – 1 Year',
      description: 'JetBrains WebStorm annual licence: React, Angular, Vue, TypeScript, Node.js, built-in debugger, HTTP client.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-GOLAND-1YR',
      name: 'GoLand – 1 Year',
      description: 'JetBrains GoLand annual licence: smart code completion, code inspections, refactoring, built-in debugger, Docker integration.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-RIDER-1YR',
      name: 'Rider – 1 Year (.NET IDE)',
      description: 'JetBrains Rider annual licence for .NET: C#, F#, VB.NET, Unity, Blazor, MAUI, Xamarin, ReSharper features built-in.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'CC-OBSERVABILITY-STACK',
      name: 'Observability Stack Template (Prometheus + Grafana)',
      description: 'Production observability stack: Prometheus, Grafana, Loki, Tempo Helm charts + 30 pre-built dashboards + alerting rules.',
      price: 49, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-DATABASE-MIGRATION-KIT',
      name: 'Database Migration Toolkit',
      description: 'Database migration scripts and patterns: Flyway + Liquibase configs, rollback strategies, blue-green schema deploy guide.',
      price: 35, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-MICROSERVICES-BOILERPLATE',
      name: 'Microservices Boilerplate (Node.js + Docker)',
      description: 'Production microservices starter: API gateway, auth service, notification service, shared event bus, Docker Compose, k8s manifests.',
      price: 69, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-NEXTJS-SAAS-STARTER',
      name: 'Next.js SaaS Starter Kit',
      description: 'Full-stack Next.js 14 SaaS template: Stripe billing, Clerk auth, Prisma ORM, shadcn/ui, feature flags, onboarding flow.',
      price: 89, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-PYTHON-API-TEMPLATE',
      name: 'FastAPI Production Template',
      description: 'FastAPI production template: JWT auth, rate limiting, background tasks, async SQLAlchemy, Alembic migrations, pytest suite.',
      price: 45, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'BC-GPU-RTX4090-30DAY',
      name: 'RTX 4090 24GB Instance – 30-Day Pass',
      description: '30-day dedicated RTX 4090 24GB instance. Ideal for inference, rendering, and smaller fine-tuning workloads. NVMe SSD included.',
      price: 599, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-GPU-V100-48H',
      name: 'V100 16GB GPU Instance – 48h',
      description: '48-hour V100 16GB spot block. CUDA 11, cuDNN 8, TensorFlow and PyTorch pre-installed. Good for smaller training experiments.',
      price: 69, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-STORAGE-50TB-HOT',
      name: 'Hot Object Storage – 50 TB',
      description: '50 TB S3-compatible hot storage with SSD-backed infrastructure. Sub-10ms latency, 99.99% availability, versioning enabled.',
      price: 249, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CN-K8S-PRODUCTION-1MO',
      name: 'Managed Kubernetes Production – 1 Month',
      description: '6-node managed Kubernetes production cluster (16 vCPU / 64 GB each), auto-scaling, integrated monitoring, 1-month subscription.',
      price: 549, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-SERVERLESS-100M-INVOC',
      name: 'Serverless Function Pack – 100M Invocations',
      description: '100 million serverless invocations, custom runtimes, VPC private networking, provisioned concurrency, 1 GB RAM option.',
      price: 290, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-MANAGED-MYSQL-100GB',
      name: 'Managed MySQL – 100 GB Storage',
      description: 'Fully managed MySQL 8 with read replicas, point-in-time recovery, slow query analysis, and 100 GB SSD storage.',
      price: 99, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'NF-GPT4O-1M-TOKENS',
      name: 'gpt-4o-mini – 1M Token Voucher',
      description: '1 million tokens on gpt-4o-mini via hosted API. Vision input supported, JSON mode, 128K context, function calling.',
      price: 29, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-CLAUDE35-500K-TOKENS',
      name: 'Claude 3.5 Sonnet – 500K Token Voucher',
      description: '500K tokens on Claude 3.5 Sonnet hosted endpoint. 200K context, vision support, tool use, high-fidelity reasoning.',
      price: 24, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-GEMINI15-2M-TOKENS',
      name: 'Gemini 1.5 Pro – 2M Token Voucher',
      description: '2 million tokens on Gemini 1.5 Pro. 1M context window, native video/audio/code understanding, Google Search grounding.',
      price: 35, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-FINETUNE-13B-JOB',
      name: 'LLM Fine-Tuning Job – 13B Model',
      description: 'Full LoRA fine-tuning run on a 13B parameter base model. Up to 250K training samples, wandb/MLflow logging, GGUF + safetensors export.',
      price: 399, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-WHISPER-TRANSCRIPTION-100H',
      name: 'Whisper Transcription – 100 Hours',
      description: '100 hours of Whisper Large v3 audio transcription. 97 languages, speaker diarisation, SRT/VTT/JSON output, batch API.',
      price: 49, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'VA-VIDEO-GEN-PRO-2000',
      name: 'AI Video Generation – 2,000 Credits',
      description: '2,000 credits for text-to-video synthesis. Up to 4K output, 30-second clips, camera motion control, style locking.',
      price: 269, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-VISION-API-1M',
      name: 'Computer Vision API – 1M Calls',
      description: '1 million computer vision API calls: OCR, object detection, face analysis, NSFW classification, document parsing.',
      price: 349, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-SEGMENT-SAM2-10K',
      name: 'SAM 2 Segmentation API – 10K Images',
      description: '10,000 image segmentation runs with Segment Anything Model 2. Zero-shot, point/box/text prompt, mask export as PNG/JSON.',
      price: 39, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'AS-ILLUSTRATION-PACK-300',
      name: 'Vector Illustration Pack – 300 Scenes',
      description: '300 flat-style vector illustrations for web and app. Tech, business, wellness, food, travel. SVG + AI + PNG, 6 colour palettes.',
      price: 65, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-STOCK-VIDEO-100-4K',
      name: '4K Stock Video Bundle – 100 Clips',
      description: '100 curated 4K stock footage clips. Tech offices, urban aerials, nature, abstract. Royalty-free, commercial use.',
      price: 89, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-PATTERN-LIBRARY-500',
      name: 'Pattern & Texture Library – 500 Assets',
      description: '500 seamless patterns and textures: geometric, organic, grunge, fabric, noise. SVG + 4K PNG, Figma and Photoshop ready.',
      price: 35, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'PF-LOGO-TEMPLATE-100',
      name: 'Logo Template Pack – 100 Designs',
      description: '100 professional logo templates across 20 industries. Fully editable in Illustrator and Figma. Vector, commercial licence.',
      price: 69, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-WIREFRAME-KIT-WEB',
      name: 'Web Wireframe Kit – 200 Components',
      description: '200 low-fidelity wireframe components for Figma: navigation, forms, cards, tables, dashboards, mobile. Pixel-perfect grid.',
      price: 39, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-INFOGRAPHIC-TEMPLATE-50',
      name: 'Infographic Template Pack – 50',
      description: '50 data visualisation and infographic templates for Illustrator and Canva. Charts, timelines, comparisons, process flows.',
      price: 45, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-COLOUR-PALETTE-SYSTEM',
      name: 'Colour Palette System – 200 Palettes',
      description: '200 curated colour palettes with WCAG accessibility scores, HEX/HSL/OKLCH values, dark-mode pairs, and CSS variable exports.',
      price: 29, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-PRINT-TEMPLATE-BUNDLE',
      name: 'Print Design Template Bundle – 60 Items',
      description: '60 print-ready templates: brochures, flyers, posters, business cards, banners. InDesign + Illustrator, CMYK, bleed and crop marks.',
      price: 55, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'PF-CODING-FONT-5PACK',
      name: 'Premium Coding Font Pack – 5 Families',
      description: '5 premium monospaced coding fonts with ligatures: regular, italic, bold variants. WOFF2 + TTF + OTF, desktop and web licences.',
      price: 49, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'MV-AMBIENT-NATURE-30',
      name: 'Nature Ambience Pack – 30 Soundscapes',
      description: '30 nature ambience recordings: rainforest, ocean, forest, desert rain, fire crackling. 10-min stereo WAV, 48kHz/24-bit.',
      price: 29, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-JAZZ-LOOPS-40',
      name: 'Jazz & Bossa Nova Loop Pack – 40 Loops',
      description: '40 jazz and bossa nova production loops with stems. Piano, bass, drums, guitar. 90–130 BPM, WAV, royalty-free.',
      price: 45, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-SFX-GAME-500',
      name: 'Game Sound Effects Pack – 500 Clips',
      description: '500 game-optimised SFX: UI, weapons, footsteps, environmental, magic, monsters. 44.1kHz/16-bit WAV, metadata-tagged.',
      price: 59, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-HIPHOP-BEATS-25',
      name: 'Hip-Hop Beat Pack – 25 Tracks',
      description: '25 exclusive hip-hop beats with stems. Trap, boom-bap, drill variants. Mixed, mastered, tagged BPM/key. Sync licence.',
      price: 79, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-UI-SOUNDS-200',
      name: 'UI Sound Pack – 200 Effects',
      description: '200 clean UI sound effects: clicks, hovers, transitions, notifications, success/error states. WAV + MP3, app-ready.',
      price: 25, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'DS-LOOKER-DASHBOARD-PACK',
      name: 'Looker Dashboard Template Pack – 20',
      description: '20 Looker Studio / Looker dashboard templates: marketing, SaaS metrics, e-commerce, finance, ops. LookML views included.',
      price: 129, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-AIRFLOW-DAG-LIBRARY',
      name: 'Apache Airflow DAG Library – 50 DAGs',
      description: '50 production Apache Airflow DAGs: ETL patterns, ML pipelines, data quality checks, notification tasks, error handling.',
      price: 89, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-SPARK-NOTEBOOK-PACK',
      name: 'PySpark Analytics Notebook Pack',
      description: '20 PySpark Jupyter notebooks: EDA, aggregations, ML feature engineering, streaming analytics, Delta Lake operations.',
      price: 59, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-SNOWFLAKE-CREDIT-500',
      name: 'Snowflake Compute Credits – 500',
      description: '500 Snowflake virtual warehouse compute credits, compatible with any Snowflake account on AWS, Azure, or GCP.',
      price: 199, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-BIGQUERY-CREDITS-1TB',
      name: 'BigQuery On-Demand Credits – 1 TB',
      description: '1 TB of BigQuery on-demand query processing credits. Any project, region-neutral, no expiry, supports all SQL dialects.',
      price: 5, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'GF-UE5-ENVIRONMENT-PACK',
      name: 'UE5 Open World Environment Pack',
      description: '200 Nanite-enabled UE5 environment assets: rocks, cliffs, trees, grasses, water materials. Lumen-compatible, 4K textures.',
      price: 149, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UNITY-CHARACTER-ANIMATOR',
      name: 'Unity Character Animator Controller',
      description: 'Advanced Unity Animator Controller with 80+ motion-captured animations: walk/run cycles, combat, climbing, swimming, emotes.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GODOT-RPG-SYSTEM',
      name: 'Godot RPG Systems Bundle',
      description: 'Godot 4 RPG systems: stats/levelling, equipment, skill tree, shop, save/load, map transitions. Fully commented source.',
      price: 99, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-AUDIO-ADAPTIVE-MUSIC',
      name: 'Adaptive Game Music System',
      description: 'Adaptive music system for Unity/Godot: stem-based layers, intensity transitions, FMOD-free, 12 included orchestral stems.',
      price: 69, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'CS-PENTEST-ENTERPRISE',
      name: 'Pen-Test Toolkit – Enterprise',
      description: 'Enterprise pen-testing suite: 12-month Burp Suite Enterprise Edition (3 agents), Nessus Professional unlimited, red-team playbooks.',
      price: 899, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'CS-WAF-ENTERPRISE-1YR',
      name: 'Enterprise Cloud WAF – 1 Year',
      description: 'Enterprise WAF: 50 domains, 100 Gbps DDoS protection, API security, bot management, custom rules engine, 24/7 SOC support.',
      price: 1499, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'GS-ZTNA-ENTERPRISE-1YR',
      name: 'Zero Trust Network Access – Enterprise',
      description: 'Enterprise ZTNA for 500 users: continuous device health validation, CASB, SWG, SASE architecture, SIEM integration.',
      price: 3999, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-COMPLIANCE-ISO27001-KIT',
      name: 'ISO 27001 Compliance Kit',
      description: 'ISO 27001:2022 readiness kit: ISMS policy templates, risk register, Statement of Applicability, internal audit checklist.',
      price: 449, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-PENTEST-EXTERNAL-REPORT',
      name: 'External Penetration Test Report Template',
      description: 'PTES-aligned external pen test report template with executive summary, CVSS scoring matrix, remediation tracking spreadsheet.',
      price: 149, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'LC-GCP-PCA-VOUCHER',
      name: 'GCP Professional Cloud Architect – Voucher',
      description: 'Google Cloud Professional Cloud Architect exam voucher via Pearson VUE. Advanced cloud design, hybrid and multi-cloud strategies.',
      price: 200, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-AWS-CCP-VOUCHER',
      name: 'AWS Cloud Practitioner – Exam Voucher',
      description: 'AWS Certified Cloud Practitioner foundational exam voucher. Entry-level AWS certification covering core services.',
      price: 99, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-CKS-VOUCHER',
      name: 'Certified Kubernetes Security Specialist (CKS) – Voucher',
      description: 'Linux Foundation CKS exam voucher. Kubernetes security hardening, runtime security, supply chain security. One retake included.',
      price: 395, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'LC-AZURE-AZ305-VOUCHER',
      name: 'Azure AZ-305 Solutions Architect – Voucher',
      description: 'Microsoft Azure AZ-305 Designing Azure Infrastructure exam voucher. Identity, governance, data storage, monitoring.',
      price: 125, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'MS-COURSE-SYSTEM-DESIGN',
      name: 'System Design Masterclass',
      description: '20-hour system design course: scalability, databases, caching, message queues, CAP theorem, real-world case studies.',
      price: 89, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-RUST-ZERO-TO-PROD',
      name: 'Rust: Zero to Production',
      description: '22-hour Rust course building a production email newsletter service: actix-web, sqlx, tokio, testing, Docker, CI/CD.',
      price: 79, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-TYPESCRIPT-DEEP',
      name: 'TypeScript Deep Dive',
      description: '15-hour advanced TypeScript course: type narrowing, conditional types, mapped types, template literals, generics, declaration files.',
      price: 59, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-BUNDLE-FULLSTACK-COMBO',
      name: 'Full-Stack Developer Bundle',
      description: 'Bundled courses: Advanced React + Node.js APIs + TypeScript Deep Dive + System Design. 70 hours, certificate on completion.',
      price: 199, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'BC-CDN-50TB-TRANSFER',
      name: 'CDN Bandwidth Pack – 50 TB',
      description: '50 TB global CDN egress, HTTP/3, Brotli, real-time analytics, WAF add-on compatible. Best value for high-traffic sites.',
      price: 199, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'BC-VPS-32CORE-128GB',
      name: 'VPS Ultra – 32 vCPU / 128 GB RAM',
      description: 'High-performance VPS with 32 AMD EPYC vCPUs, 128 GB DDR5, 1.6 TB NVMe RAID-0, 25 Gbps uplink. 30-day subscription.',
      price: 349, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CN-MANAGED-MONGO-1MO',
      name: 'Managed MongoDB Atlas-Compatible – 1 Month',
      description: 'CloudNova managed MongoDB-compatible cluster: 16 GB RAM, 100 GB NVMe, auto-sharding, Atlas-compatible driver API.',
      price: 129, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'CN-CDN-100TB',
      name: 'CDN Bandwidth Pack – 100 TB',
      description: '100 TB CloudNova CDN egress with edge caching, image optimisation, real-time purge, HTTP/3, Brotli. 60+ PoPs worldwide.',
      price: 349, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'VA-FACE-SWAP-1K',
      name: 'AI Face Swap API – 1,000 Credits',
      description: '1,000 face-swap API credits for single and multi-face replacement in photos and video frames. Photorealistic blending.',
      price: 29, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'VA-BACKGROUND-REMOVE-50K',
      name: 'Background Removal API – 50K Images',
      description: '50,000 background removal API calls. Sub-100ms response, hair/fur accuracy, batch mode, returns PNG with alpha.',
      price: 49, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'NF-VOICE-TRANSLATION-50H',
      name: 'AI Voice Translation – 50 Hours',
      description: '50 hours of real-time voice translation across 40 language pairs. Preserves speaker tone and emotion, streaming output.',
      price: 99, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'NF-CODEGEN-CREDITS-500K',
      name: 'AI Code Generation – 500K Tokens',
      description: '500K tokens on a code-specialist LLM (DeepSeek Coder 33B). FIM (fill-in-the-middle), 16K context, 80+ language support.',
      price: 19, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'DS-METABASE-CLOUD-6MO',
      name: 'Metabase Cloud – 6 Months',
      description: '6-month Metabase Cloud Starter: unlimited questions, 5 dashboards, 2 data sources, email reports, embedding included.',
      price: 150, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'DS-AMPLITUDE-GROWTH-3MO',
      name: 'Amplitude Growth – 3 Months',
      description: '3-month Amplitude Growth plan: 100M monthly tracked users, 1-year data retention, cohorts, funnels, A/B test analysis.',
      price: 399, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'CC-ARGOCD-GITOPS-TEMPLATE',
      name: 'ArgoCD GitOps Template Library',
      description: '15 production ArgoCD ApplicationSet templates with sync waves, health checks, rollback triggers, Slack notifications.',
      price: 39, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-PULUMI-STACK-TEMPLATES',
      name: 'Pulumi Infrastructure Stack Templates',
      description: '10 Pulumi TypeScript stacks: EKS cluster, RDS Aurora, SQS + Lambda, CloudFront CDN, multi-account AWS landing zone.',
      price: 69, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'DV-DATAGRIP-1YR',
      name: 'DataGrip – 1 Year',
      description: 'JetBrains DataGrip annual licence: multi-database IDE supporting PostgreSQL, MySQL, Oracle, Redis, MongoDB, BigQuery.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'DV-CLION-1YR',
      name: 'CLion – 1 Year (C/C++ IDE)',
      description: 'JetBrains CLion annual licence: C and C++ IDE with CMake, Makefile support, embedded dev, memory profiler, sanitizers.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'GF-UNITY-MOBILE-ADS-KIT',
      name: 'Unity Mobile Monetisation Kit',
      description: 'Unity monetisation kit: rewarded ad integration (AdMob, IronSource, Unity Ads), IAP boilerplate, A/B test scaffold, GDPR consent.',
      price: 55, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-GODOT-3D-FPS-TEMPLATE',
      name: 'Godot 3D FPS Template',
      description: 'Godot 4 3D FPS template: player controller, weapons system (hitscan + projectile), enemy AI, level streaming, HUD.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'MV-TROPICAL-HOUSE-LOOPS',
      name: 'Tropical House Loop Pack – 30 Loops',
      description: '30 tropical house production loops with stems. Marimba, steel pans, synth pads. 100–125 BPM, WAV, commercial licence.',
      price: 39, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'MV-CINEMATIC-TRAILER-PACK',
      name: 'Cinematic Trailer Music Pack – 15 Tracks',
      description: '15 cinematic trailer tracks: epic, dark, emotional, action. 60s and 90s edits, stems split, broadcast sync licence.',
      price: 99, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'AS-UI-KIT-ECOMMERCE',
      name: 'E-Commerce UI Kit – 600 Components',
      description: '600 Figma and React components for e-commerce: product cards, cart, checkout, filters, ratings, wishlists, dark mode.',
      price: 89, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'AS-ICON-PACK-1500-OUTLINE',
      name: 'Outline Icon Pack – 1,500 Icons',
      description: '1,500 clean outline icons across 60 categories. SVG (stroke-based, scalable), Figma component, PNG in 6 sizes.',
      price: 29, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'PF-FONT-DISPLAY-PACK-10',
      name: 'Display Font Pack – 10 Typefaces',
      description: '10 expressive display typefaces for headlines, branding, and editorial. OTF + WOFF2, variable axes where available.',
      price: 69, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'SS-MIXPANEL-GROWTH-3MO',
      name: 'Mixpanel Growth – 3 Months',
      description: '3-month Mixpanel Growth plan: 1M MTUs, unlimited saved reports, cohorts, funnels, group analytics, data pipelines.',
      price: 240, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-SENDGRID-PRO-6MO',
      name: 'SendGrid Pro – 6 Months',
      description: '6-month SendGrid Pro: 100K emails/month, dedicated IP, email validation, 30-day stats, subuser management, inbound parse.',
      price: 180, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ALGOLIA-SEARCH-1YR',
      name: 'Algolia Search – 1 Year (1M Records)',
      description: 'Algolia annual subscription: 1M searchable records, 10M searches/month, typo tolerance, instant search UI components.',
      price: 490, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-ZOOM-PRO-1YR',
      name: 'Zoom Pro – 1 Year',
      description: 'Zoom Pro annual licence: 30-hour meetings, 100 attendees, cloud recording 5 GB, custom backgrounds, webinar add-on eligible.',
      price: 149, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-TYPEFORM-PLUS-1YR',
      name: 'Typeform Plus – 1 Year',
      description: 'Typeform Plus annual plan: 1,000 responses/month, 3 workspaces, custom domains, logic jumps, hidden fields, webhooks.',
      price: 228, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-MAKE-CORE-1YR',
      name: 'Make (Integromat) Core – 1 Year',
      description: 'Make Core annual plan: 10,000 operations/month, unlimited scenarios, 5-min intervals, webhooks, routers, error handlers.',
      price: 96, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-GROWTH-BUNDLE-PRO',
      name: 'Growth SaaS Bundle – Pro',
      description: 'Bundle: Mixpanel Growth 1mo + SendGrid Pro 1mo + Algolia Search 1mo + Zoom Pro 1mo. Growth-stage essentials.',
      price: 249, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'CC-REACT-COMPONENT-LIBRARY',
      name: 'Production React Component Library Template',
      description: 'Rollup-bundled React component library template: TypeScript, Storybook 8, CSS Modules, Vitest, npm publish workflow.',
      price: 55, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'CC-MONOREPO-TURBOREPO',
      name: 'Turborepo Monorepo Starter',
      description: 'Turborepo monorepo with shared packages, ESLint configs, TypeScript paths, Changesets, CI matrix build, Docker multi-stage.',
      price: 59, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'GS-VPN-PERSONAL-2YR',
      name: 'Personal VPN – 2 Years (10 Devices)',
      description: 'GuardianShield Personal VPN 2-year plan: WireGuard, no-logs, RAM-only servers, kill switch, 10 devices, 90+ locations.',
      price: 69, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'GS-EMAIL-SECURITY-1YR',
      name: 'Business Email Security – 1 Year',
      description: 'Cloud email security gateway: anti-phishing AI, BEC protection, sandboxing, DMARC enforcement, 25 mailboxes.',
      price: 299, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'CS-VPN-ENTERPRISE-3YR',
      name: 'Enterprise VPN – 3 Years (Unlimited Devices)',
      description: 'CipherStack Enterprise VPN 3-year: SAML/LDAP SSO, dedicated servers, site-to-site, unlimited devices, audit logs.',
      price: 1499, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'NF-LLAMA3-405B-200K',
      name: 'Llama 3.1 405B – 200K Token Voucher',
      description: '200,000 inference tokens on hosted Llama 3.1 405B, the most capable open-weight model. 128K context, function calling.',
      price: 39, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'VA-DEPTH-MAP-API-20K',
      name: 'Depth Map Estimation API – 20K Images',
      description: '20,000 monocular depth estimation calls using DepthAnything v2. Returns 16-bit depth PNG, point cloud export option.',
      price: 35, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'MK-AI-ADCOPY-10K',
      name: 'AI Ad Copy Generator – 10,000 Credits',
      description: '10,000 credits for AI ad copy across Facebook, Google, LinkedIn, TikTok. A/B pairs, tone-of-voice sliders, brand voice training.',
      price: 399, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'MK-SEO-CONTENT-BRIEF-500',
      name: 'AI SEO Content Brief Generator – 500 Briefs',
      description: '500 AI-generated SEO content briefs: keyword clusters, H-structure, word count, SERP analysis, competitor content gaps.',
      price: 149, cat: 'Marketing & SEO', vendor: aiVendor.id,
    },
    {
      productID: 'DS-POSTGRES-ANALYTICS-COURSE',
      name: 'Advanced PostgreSQL Analytics Course',
      description: '12-hour self-paced course: window functions, CTEs, EXPLAIN ANALYSE, partitioning, pg_stat, JSONB analytics, FDW.',
      price: 69, cat: 'Education Vouchers', vendor: datastreamVendor.id,
    },
    {
      productID: 'GF-SOUND-DESIGN-COURSE',
      name: 'Game Sound Design Course',
      description: '14-hour course on game audio: SFX creation in Reaper, Wwise/FMOD implementation, adaptive music, mixing for games.',
      price: 79, cat: 'Education Vouchers', vendor: gameforgeVendor.id,
    },
    {
      productID: 'MS-COURSE-KUBERNETES-DEEP',
      name: 'Kubernetes in Production – Deep Dive',
      description: '18-hour Kubernetes deep-dive: RBAC, network policies, PSA, monitoring, cost optimisation, multi-tenancy, cluster upgrades.',
      price: 89, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'LC-BOOTCAMP-CLOUD-ARCHITECT-20WK',
      name: 'Cloud Architect Bootcamp – 20 Weeks',
      description: '20-week cloud architect bootcamp: AWS + GCP + Azure, Terraform, Kubernetes, networking, security, solutions architecture.',
      price: 699, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'PF-MOTION-DESIGN-KIT',
      name: 'Motion Design Starter Kit',
      description: 'After Effects and Figma motion design kit: easing presets, spring animations, scroll trigger templates, micro-interaction library.',
      price: 69, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'AS-PRODUCT-PHOTO-MOCKUP-100',
      name: 'Product Photography Mockup Pack – 100',
      description: '100 lifestyle and studio product mockups: apparel, packaging, electronics, cosmetics. Smart object PSD, 5K resolution.',
      price: 65, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'MV-TECHNO-EDM-LOOPS-30',
      name: 'Techno & EDM Loop Pack – 30 Loops',
      description: '30 techno and EDM production loops with stems. Kicks, basslines, synth sequences, 128–145 BPM, WAV 48kHz.',
      price: 45, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'BC-OBJECT-STORAGE-ARCHIVE-100TB',
      name: 'Archive Object Storage – 100 TB',
      description: '100 TB deep-archive object storage for backups and cold data. S3-compatible, retrieval within 12 hours, 99.999999999% durability.',
      price: 99, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CN-SERVERLESS-DB-1MO',
      name: 'Serverless Database – 1 Month',
      description: 'CloudNova serverless PostgreSQL: scales to zero, per-query billing, branching for dev/staging, 10 GB storage included.',
      price: 39, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'NF-MODERATION-API-500K',
      name: 'Content Moderation API – 500K Calls',
      description: '500,000 content moderation API calls. Text and image classification: hate speech, NSFW, spam, PII detection, 40+ categories.',
      price: 59, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'VA-LOGO-ANIMATE-100',
      name: 'AI Logo Animation – 100 Credits',
      description: '100 logo animation credits: static SVG/PNG to animated intro (5 animation styles). MP4 + WebM + Lottie JSON export.',
      price: 49, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'GS-SIEM-STARTER-1MO',
      name: 'Cloud SIEM – Starter (1 Month)',
      description: 'GuardianShield cloud SIEM: log ingestion up to 5 GB/day, 90-day retention, 200+ detection rules, threat dashboards.',
      price: 199, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'CS-CLOUD-POSTURE-1MO',
      name: 'Cloud Security Posture Management – 1 Month',
      description: 'CSPM for AWS/GCP/Azure: misconfiguration detection, CIS benchmark scoring, auto-remediation playbooks, 1 cloud account.',
      price: 149, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'DS-KAFKA-MANAGED-1MO',
      name: 'Managed Apache Kafka – 1 Month',
      description: 'Fully managed Kafka cluster: 3 brokers, 10 GB storage, Schema Registry, Kafka Connect, 99.95% SLA, monitoring dashboards.',
      price: 129, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'CC-LINT-CONFIG-MONOREPO',
      name: 'ESLint + Prettier Monorepo Config Pack',
      description: 'Shareable ESLint + Prettier configs for monorepos: React, Node, Next.js, vanilla TS presets, Husky + lint-staged integration.',
      price: 19, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'DV-JETBRAINS-PHPSTORM-1YR',
      name: 'PhpStorm – 1 Year',
      description: 'JetBrains PhpStorm annual licence: PHP 8.x, Laravel, Symfony, WordPress, Composer, PHPUnit, Docker integration.',
      price: 69, cat: 'Developer Tools', vendor: softwareVendor.id,
    },
    {
      productID: 'GF-UE5-CINEMATIC-CAMERA-PACK',
      name: 'UE5 Cinematic Camera Rig Pack',
      description: '20 UE5 Sequencer camera rigs: dolly moves, cranes, steadicam simulations, aperture flares, film grain post-process.',
      price: 59, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'MK-INFLUENCER-BRIEF-TEMPLATE',
      name: 'Influencer Marketing Brief Template Kit',
      description: '15 influencer brief templates for Instagram, TikTok, YouTube. Deliverable tables, FTC disclosure checklists, rate card.',
      price: 25, cat: 'Marketing & SEO', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'MK-PR-PRESS-RELEASE-TEMPLATES',
      name: 'PR Press Release Template Pack – 20',
      description: '20 press release templates: product launch, funding announcement, partnership, award win, crisis comms. AP style guide.',
      price: 29, cat: 'Marketing & SEO', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'SS-INTERCOM-STARTER-3MO',
      name: 'Intercom Starter – 3 Months',
      description: '3-month Intercom Starter: live chat, inbox, custom bots, product tours, 1,000 people reached/month, 1 seat.',
      price: 99, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-LOOM-BUSINESS-1YR',
      name: 'Loom Business – 1 Year',
      description: 'Loom Business annual plan: unlimited video length, engagement insights, custom branding, SSO, 3 creator seats.',
      price: 144, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-RETOOL-TEAM-1MO',
      name: 'Retool Team – 1 Month',
      description: '1-month Retool Team: unlimited editors, custom branding, source control, audit log, SSO, unlimited end users.',
      price: 50, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-POSTHOG-SCALE-3MO',
      name: 'PostHog Scale – 3 Months',
      description: '3-month PostHog Scale: 10M events/month, session recording, feature flags, A/B tests, data pipelines, SSO, priority support.',
      price: 450, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'MS-COURSE-GOLANG-MICROSERVICES',
      name: 'Go Microservices in Practice',
      description: '20-hour Go course building production microservices: gRPC, Kafka, PostgreSQL, Docker, Kubernetes, tracing with OpenTelemetry.',
      price: 89, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'LC-BOOTCAMP-AI-ENGINEER-16WK',
      name: 'AI Engineer Bootcamp – 16 Weeks',
      description: '16-week AI engineering bootcamp: LLM APIs, RAG pipelines, agent frameworks, vector databases, deployment, evals.',
      price: 599, cat: 'Education Vouchers', vendor: eduVendor.id,
    },
    {
      productID: 'GF-UNITY-DIALOGUE-SYSTEM',
      name: 'Unity Dialogue & Narrative System',
      description: 'Ink-runtime powered dialogue system for Unity: branching stories, variables, localisation hooks, portrait animation, audio cues.',
      price: 69, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'GF-UE5-FLUID-SIM',
      name: 'UE5 Fluid Simulation Pack',
      description: 'Niagara-based fluid simulation pack for UE5: water splashes, blood, oil, slime, lava. 4K flipbook textures included.',
      price: 79, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'AS-3D-CHARACTER-PACK-10',
      name: '3D Character Pack – 10 Rigged Models',
      description: '10 fully rigged low-poly 3D characters with idle, walk, run, and attack animations. FBX + Blender source. Game-ready.',
      price: 99, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'PF-NEWSLETTER-TEMPLATE-30',
      name: 'Newsletter Design Template Pack – 30',
      description: '30 HTML email newsletter templates designed in Figma. Modular sections, dark/light mode, tested in Gmail, Outlook, Apple Mail.',
      price: 45, cat: 'Design & Fonts', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'BC-GPU-H100-NVL-1DAY',
      name: 'H100 NVL 94GB GPU Instance – 24h',
      description: '24-hour H100 NVL 94GB instance, the highest-VRAM H100 variant. Ideal for 70B+ model inference or ultra-fast training runs.',
      price: 199, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CN-K8S-GPU-CLUSTER-1MO',
      name: 'Managed GPU Kubernetes Cluster – 1 Month',
      description: '4-node GPU Kubernetes cluster (4× A100 40GB each): NVIDIA device plugin, Prometheus GPU metrics, auto-scaling node pools.',
      price: 2499, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'NF-TRANSLATION-API-1M',
      name: 'Neural Machine Translation – 1M Characters',
      description: '1 million characters of neural machine translation. 200+ language pairs, document-level context, HTML tag preservation.',
      price: 9, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'VA-STYLE-TRANSFER-2K',
      name: 'AI Style Transfer – 2,000 Credits',
      description: '2,000 image style transfer credits. 40 artistic styles, strength control, batch processing, preserves composition fidelity.',
      price: 25, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'MV-SCORE-HORROR-15',
      name: 'Horror Score Pack – 15 Tracks',
      description: '15 horror/thriller score tracks: suspense builds, sting hits, ambient dread. Stems, 48kHz/24-bit WAV, broadcast sync licence.',
      price: 89, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'DS-DAGSTER-CLOUD-1MO',
      name: 'Dagster Cloud Serverless – 1 Month',
      description: 'Dagster Cloud Serverless 1-month: managed orchestration, asset catalogue, auto-materialisation, alerts, 1 full deployment.',
      price: 99, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'CC-RATE-LIMITER-REDIS',
      name: 'Redis Rate-Limiter Library (Node.js + Go)',
      description: 'Production rate-limiter implementations in Node.js and Go using Redis: sliding window, token bucket, fixed window patterns.',
      price: 25, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'GS-COMPLIANCE-PCI-DSS-KIT',
      name: 'PCI DSS v4 Compliance Toolkit',
      description: 'PCI DSS v4 readiness kit: SAQ templates, network diagram templates, cardholder data flow maps, patch policy, QSA checklist.',
      price: 299, cat: 'Cybersecurity', vendor: guardianVendor.id,
    },
    {
      productID: 'CS-SECRETS-MANAGER-1YR',
      name: 'Secrets Manager Service – 1 Year',
      description: 'Cloud secrets manager: AES-256 encryption at rest, automatic rotation, audit trail, Kubernetes external secrets operator support.',
      price: 99, cat: 'Cybersecurity', vendor: securityVendor.id,
    },
    {
      productID: 'SS-AIRTABLE-TEAMS-1YR',
      name: 'Airtable Teams – 1 Year',
      description: 'Airtable Teams annual plan: unlimited bases, 20K records/base, revision history, automations (25K runs/month), Gantt, timeline.',
      price: 240, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'SS-MIRO-STARTER-1YR',
      name: 'Miro Starter – 1 Year',
      description: 'Miro Starter annual plan: unlimited boards, advanced diagramming, smart draw, voting, timer, Jira/Slack integration.',
      price: 120, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'MK-PODCAST-GROWTH-COURSE',
      name: 'Podcast Growth Mastery Course',
      description: '8-hour course on podcast growth: SEO for audio, guesting strategy, monetisation, listener retention, analytics interpretation.',
      price: 59, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'MS-COURSE-PROMPT-ENGINEERING',
      name: 'Prompt Engineering for Developers',
      description: '10-hour course: chain-of-thought, few-shot, RAG, function calling, structured outputs, evaluation, red-teaming LLMs.',
      price: 69, cat: 'Education Vouchers', vendor: mindsparkVendor.id,
    },
    {
      productID: 'VA-PRODUCT-SHOOT-AI-500',
      name: 'AI Product Photography – 500 Shots',
      description: '500 AI-generated product photography shots from plain-background images. 20 scene presets, lifestyle and studio styles.',
      price: 59, cat: 'Creative Assets', vendor: visionaiVendor.id,
    },
    {
      productID: 'AS-EMOJI-PACK-500-CUSTOM',
      name: 'Custom Emoji & Sticker Pack – 500',
      description: '500 custom-style emoji and sticker assets in flat and 3D styles. PNG + SVG, Figma source, Slack/Discord-optimised sizes.',
      price: 39, cat: 'Creative Assets', vendor: creativeVendor.id,
    },
    {
      productID: 'NF-SEARCH-RERANK-500K',
      name: 'Neural Search Reranker – 500K Queries',
      description: '500K search reranking API calls using cross-encoder model. Boosts relevance for RAG pipelines, e-commerce, and site search.',
      price: 29, cat: 'AI & Machine Learning', vendor: aiVendor.id,
    },
    {
      productID: 'GF-UNITY-PROCEDURAL-DUNGEON',
      name: 'Unity Procedural Dungeon Generator',
      description: 'Runtime procedural dungeon generator for Unity: BSP + cellular automata, enemy spawn rules, loot tables, minimap integration.',
      price: 65, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'DS-DATABRICKS-DBU-100',
      name: 'Databricks DBU Credits – 100',
      description: '100 Databricks DBU compute credits. Valid on AWS, Azure, and GCP. Use for Spark jobs, Delta Live Tables, ML workloads.',
      price: 50, cat: 'Data & Analytics', vendor: datastreamVendor.id,
    },
    {
      productID: 'MK-YOUTUBE-THUMBNAIL-PACK-50',
      name: 'YouTube Thumbnail Template Pack – 50',
      description: '50 high-CTR YouTube thumbnail templates. PSD + Canva, bold typography, face-frame layouts, A/B test variants included.',
      price: 29, cat: 'Marketing & SEO', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'MK-PODCAST-COVER-TEMPLATES-20',
      name: 'Podcast Cover Art Template Pack – 20',
      description: '20 podcast cover art templates for Spotify, Apple Podcasts. 3000×3000px, PSD + Canva, genre-specific designs.',
      price: 25, cat: 'Marketing & SEO', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'GS-API-SECURITY-COURSE',
      name: 'API Security Fundamentals Course',
      description: '8-hour course on API security: OWASP API Top 10, JWT attacks, OAuth misconfigs, rate limiting, API gateway hardening.',
      price: 69, cat: 'Education Vouchers', vendor: guardianVendor.id,
    },
    {
      productID: 'CS-SECURITY-AWARENESS-COURSE',
      name: 'Security Awareness Training – 50 Seats',
      description: '50-seat annual security awareness training: phishing, social engineering, password hygiene, compliance modules, completion tracking.',
      price: 199, cat: 'Education Vouchers', vendor: securityVendor.id,
    },
    {
      productID: 'BC-INFERENCE-API-CREDITS-1M',
      name: 'BitCompute Inference API – 1M Credits',
      description: '1M credits for BitCompute hosted inference API. Use across Llama, Mistral, SDXL, and Whisper endpoints. No expiry.',
      price: 19, cat: 'AI & Machine Learning', vendor: infraVendor.id,
    },
    {
      productID: 'CN-AI-INFERENCE-SERVERLESS-10M',
      name: 'CloudNova AI Inference Serverless – 10M Tokens',
      description: '10 million serverless LLM inference tokens on CloudNova. Supports Llama 3.1 70B, Mixtral 8×7B, Phi-3, automatic routing.',
      price: 29, cat: 'AI & Machine Learning', vendor: cloudnovaVendor.id,
    },
    {
      productID: 'PF-UI-ANIMATION-LIBRARY',
      name: 'UI Animation Library – Framer Motion',
      description: '60 ready-to-use Framer Motion animation components: page transitions, scroll animations, stagger reveals, shared layout.',
      price: 49, cat: 'Creative Assets', vendor: pixelforgeVendor.id,
    },
    {
      productID: 'MV-CORPORATE-MUSIC-20',
      name: 'Corporate Music Pack – 20 Tracks',
      description: '20 uplifting corporate tracks for presentations, explainer videos, and ads. 30s, 60s, 90s edits, stems, broadcast licence.',
      price: 69, cat: 'Audio & Music', vendor: mediavaultVendor.id,
    },
    {
      productID: 'GF-GODOT-MULTIPLAYER-STARTER',
      name: 'Godot Multiplayer Starter Kit',
      description: 'Godot 4 multiplayer template: ENet + WebSocket, lobby, player sync, lag compensation, server-authoritative physics, chat.',
      price: 89, cat: 'Game Development', vendor: gameforgeVendor.id,
    },
    {
      productID: 'DS-TABLEAU-PREP-COURSE',
      name: 'Tableau Prep & Desktop Fundamentals Course',
      description: '10-hour Tableau course: data prep, calculated fields, LOD expressions, story points, published data sources, performance tuning.',
      price: 59, cat: 'Education Vouchers', vendor: datastreamVendor.id,
    },
    {
      productID: 'CC-STORYBOOK-DESIGN-TOKENS',
      name: 'Storybook Design Token Integration Kit',
      description: 'Storybook 8 setup with design token sync (Style Dictionary), Figma plugin bridge, a11y addon, Chromatic visual testing config.',
      price: 45, cat: 'Developer Tools', vendor: codecraftVendor.id,
    },
    {
      productID: 'SS-NOTION-AI-6MO',
      name: 'Notion AI Add-On – 6 Months',
      description: '6-month Notion AI add-on for existing workspace: unlimited AI writing, summarisation, Q&A on workspace content.',
      price: 96, cat: 'SaaS Subscriptions', vendor: startupstackVendor.id,
    },
    {
      productID: 'VA-HANDWRITING-GEN-10K',
      name: 'AI Handwriting Generator – 10K Lines',
      description: '10,000 lines of AI-generated personalised handwriting. 20 style templates, adjustable baseline and slant, PNG + SVG.',
      price: 19, cat: 'AI & Machine Learning', vendor: visionaiVendor.id,
    },
    {
      productID: 'MK-GROWTH-HACKING-PLAYBOOK',
      name: 'SaaS Growth Hacking Playbook',
      description: 'Actionable SaaS growth playbook: 60 acquisition experiments, retention tactics, viral loops, pricing psychology, churn analysis.',
      price: 49, cat: 'Marketing & SEO', vendor: startupstackVendor.id,
    },
    {
      productID: 'BC-DGX-CLOUD-6H',
      name: 'DGX Cloud Instance – 6-Hour Block',
      description: '6-hour DGX Cloud block: 8× H100 SXM5 with NVLink, 640 GB total VRAM, 3.2 TB/s interconnect. For largest training runs.',
      price: 999, cat: 'Cloud & Compute', vendor: infraVendor.id,
    },
    {
      productID: 'CN-PRIVATE-NETWORK-1MO',
      name: 'Private Cloud Network – 1 Month',
      description: 'Isolated VPC with 10 Gbps backbone, BGP routing, dedicated firewall, VPN gateway, inter-region peering. 1-month subscription.',
      price: 199, cat: 'Cloud & Compute', vendor: cloudnovaVendor.id,
    },
  ];

  // ── 4. UPSERT ALL PRODUCTS ─────────────────────────────────────────────────

  for (const p of products) {
    await prisma.product.upsert({
      where:  { productID: p.productID },
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
    console.log(`  ✓  ${p.productID.padEnd(32)}  ${p.name.slice(0, 48).padEnd(50)}  $${p.price}`);
  }

  const vendorCount   = 16;
  const categoryCount = categoryDefs.length;
  console.log(`\n✅  Seeded ${products.length} products across ${categoryCount} categories and ${vendorCount} vendors.\n`);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});