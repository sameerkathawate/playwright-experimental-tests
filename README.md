# Playwright Experimental Tests

## Books Scraper

A web scraper that extracts book data from books.toscrape.com using Playwright.

### Features

- Scrapes books from specific categories (Travel, Mystery)
- Extracts book details including title, price, and availability
- Handles pagination automatically
- Saves results to JSON format

### Installation

```bash
npm install
```

### Usage

Run the scraper:

```bash
node tools/scrape-books.js
```

The output will be saved to `output/books-some.json`.

### Configuration

You can modify the following constants in `tools/scrape-books.js`:

- `ALLOWED_CATEGORIES`: Set of categories to scrape (default: Travel, Mystery)
- `GET_DETAILS`: Whether to visit individual product pages (default: true)
- `NAV_TIMEOUT`: Navigation timeout in ms (default: 60000)
- `PAGE_DELAY_MS`: Delay between pagination (default: 150)
- `PRODUCT_DELAY_MS`: Delay between product details (default: 40)

### Output Format

```json
{
  "origin": "https://books.toscrape.com/",
  "crawledAt": "2026-03-07T...",
  "categories": [...],
  "products": [
    {
      "category": "Travel",
      "title": "Book Title",
      "url": "https://...",
      "price": "£50.10",
      "availability": "In stock",
      "locator": "getByRole('link', { name: \"Book Title\" })"
    }
  ]
}
```