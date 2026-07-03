// src/services/crawler.js
const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const TARGET_URL = process.env.TARGET_WEBSITE || 'https://www.tamilpreneur.in/grand-sangamam';

/**
 * Crawl a single URL and extract clean text content
 */
async function crawlPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrandSangamamBot/1.0)',
      },
    });

    const $ = cheerio.load(response.data);

    // Remove scripts, styles, nav, footer for cleaner content
    $('script, style, nav, footer, .cookie-banner, .ads').remove();

    const title = $('title').text().trim() ||
                  $('h1').first().text().trim() ||
                  url;

    // Extract all meaningful text
    const sections = [];

    // Extract headings and their content
    $('h1, h2, h3, h4').each((i, el) => {
      const heading = $(el).text().trim();
      if (heading) sections.push(`## ${heading}`);
    });

    // Extract paragraphs
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) sections.push(text);
    });

    // Extract list items
    $('li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) sections.push(`• ${text}`);
    });

    // Extract table data
    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td, th').map((k, cell) => $(cell).text().trim()).get();
        if (cells.length) sections.push(cells.join(' | '));
      });
    });

    // Extract meta description
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (metaDesc) sections.unshift(metaDesc);

    const content = sections
      .filter(Boolean)
      .join('\n')
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Extract internal links for further crawling
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absolute = new URL(href, url).href;
          if (absolute.startsWith(TARGET_URL)) {
            links.push(absolute);
          }
        } catch (_) { /* ignore invalid URLs */ }
      }
    });

    return { title, content, links: [...new Set(links)] };
  } catch (err) {
    logger.error(`Failed to crawl ${url}:`, err.message);
    return null;
  }
}

/**
 * Main crawler — crawls the website and stores in knowledge base
 */
async function crawlWebsite(progressCallback = null) {
  logger.info(`Starting crawl of ${TARGET_URL}`);

  const visited = new Set();
  const queue = [TARGET_URL];
  const results = [];
  const maxPages = 50; // safety cap

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift();

    if (visited.has(url)) continue;
    visited.add(url);

    logger.info(`Crawling: ${url}`);
    if (progressCallback) progressCallback({ url, total: visited.size });

    const data = await crawlPage(url);
    if (!data || data.content.length < 100) continue;

    results.push({ url, ...data });

    // Add discovered links to queue
    data.links.forEach(link => {
      if (!visited.has(link)) queue.push(link);
    });

    // Polite crawling delay
    await new Promise(r => setTimeout(r, 1000));
  }

  // Store in database
  logger.info(`Storing ${results.length} pages in knowledge base...`);

  // Clear existing website knowledge
  await prisma.knowledgeBase.deleteMany({ where: { source: 'website' } });

  for (const result of results) {
    // Split large pages into chunks
    const chunks = chunkContent(result.content, 2000);

    for (const chunk of chunks) {
      await prisma.knowledgeBase.create({
        data: {
          url: result.url,
          title: result.title,
          content: chunk,
          category: categorizeContent(result.title, chunk),
          source: 'website',
          embedding: [], // Will be updated when using vector search
        },
      });
    }
  }

  logger.info(`✅ Crawl complete. Stored ${results.length} pages.`);
  return { pagesIndexed: results.length, urls: results.map(r => r.url) };
}

/**
 * Split content into smaller chunks for better search
 */
function chunkContent(content, maxLength = 2000) {
  if (content.length <= maxLength) return [content];

  const chunks = [];
  const paragraphs = content.split('\n\n');
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxLength && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

/**
 * Auto-categorize content based on keywords
 */
function categorizeContent(title, content) {
  const text = (title + ' ' + content).toLowerCase();

  if (text.includes('register') || text.includes('ticket') || text.includes('price')) return 'registration';
  if (text.includes('speaker') || text.includes('keynote')) return 'speakers';
  if (text.includes('schedule') || text.includes('agenda') || text.includes('session')) return 'schedule';
  if (text.includes('venue') || text.includes('location') || text.includes('hotel')) return 'venue';
  if (text.includes('sponsor')) return 'sponsorship';
  if (text.includes('startup') || text.includes('investor')) return 'startup';
  if (text.includes('contact') || text.includes('faq')) return 'support';
  if (text.includes('travel') || text.includes('flight') || text.includes('train')) return 'travel';

  return 'general';
}

module.exports = { crawlWebsite, crawlPage };
