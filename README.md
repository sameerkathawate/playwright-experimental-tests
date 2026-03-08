# Playwright Experimental Tests

## URL Scraper Utility

A reusable web scraper utility using Playwright. You can pass any URL and it will crawl pages from the same origin.

### Features

- Accepts any start URL
- Crawls same-origin links up to a max page limit
- Extracts page title, h1, description, and links
- Saves JSON output under `output/`

### Installation

```bash
npm install
```

### Usage

Run the scraper:

```bash
node --experimental-default-type=module tools/scrape-books.js <url> [outputFileName] [maxPages]
```

Examples:

```bash
node --experimental-default-type=module tools/scrape-books.js https://books.toscrape.com/
node --experimental-default-type=module tools/scrape-books.js https://books.toscrape.com/ books-some.json 5
```

Output is always written under `output/`.

### Configuration

You can modify these defaults in `tools/scrape-books.js`:

- `MAX_PAGES_DEFAULT`: Max pages to crawl when not provided on CLI
- `NAV_TIMEOUT`: Navigation timeout in ms
- `ACT_TIMEOUT`: Action timeout in ms

### Output Format

```json
{
  "origin": "https://books.toscrape.com/",
  "crawledAt": "2026-03-07T...",
  "pageCount": 3,
  "pages": [
    {
      "url": "https://...",
      "title": "Page Title",
      "h1": "Heading",
      "description": "Meta description",
      "links": []
    }
  ]
}
```