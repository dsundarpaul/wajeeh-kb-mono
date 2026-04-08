# Knowledge base hierarchy — API and data model

## Intent

The backend supports a **nested folder tree** of categories (unbounded depth). Each **knowledge chunk** (article document) can be linked to **one or more categories** via `categoryIds` and optional `primaryCategoryId`. The legacy field **`categoryId`** is still supported: when `categoryIds` is empty and `categoryId` is set, that single id is treated as the only placement.

The public KB UI can render a sidebar from the tree; the admin panel can create folders, move them, and assign articles. **Chat / RAG** stores category metadata on each **vector row** at ingest time so sources returned to clients include placement context.

**Operational note:** After changing categories or reassigning chunks, run **ingest / rebuild index** so embeddings metadata stays aligned.

See also: [kb-hierarchy-review-and-roadmap.md](./kb-hierarchy-review-and-roadmap.md) (glossary, `parentId` vs `ancestorIds`, metadata contract).

---

## Data model (MongoDB)

### `KnowledgeCategory` collection (`knowledgecategories`)

- `name` (string, required)
- `slug` (string, required) — unique **per parent** (sibling uniqueness)
- `parentId` (ObjectId | null) — **immediate** parent only; `null` = root
- `order` (number, default 0) — sibling sort
- `ancestorIds` (ObjectId[]) — ordered ids from **root down to the immediate parent** (does **not** include this document’s own `_id`). Denormalized for subtree queries and safe reparenting. Same information as walking `parentId` repeatedly, stored for performance.
- `description` (string, optional)
- `createdAt` / `updatedAt` (timestamps)

### `KnowledgeChunks` collection

Core fields:

- `title`, `url`, `content`, `tags`, `type` (`blog` | `video`), `isIndexed`

Category placement:

- `categoryIds` (ObjectId[], default `[]`) — all folders this article appears under
- `primaryCategoryId` (ObjectId | null, optional) — default placement for breadcrumb/UI when multiple exist
- `categoryId` (ObjectId | null, optional) — **legacy**; if `categoryIds` is empty and this is set, it behaves as a single placement

Structured sections (optional, for TOC / anchors):

- `sections` — array of `{ _id, slug, title, order, level?, content? }`. If `content` is omitted on all sections, the main `content` field is chunked for RAG; if sections include `content`, each section’s text is embedded separately with `section_id` / `heading_path` metadata.

---

## HTTP APIs

Base URL: same as the API (e.g. `http://localhost:3003`). Paths below are relative to that origin.

### Categories

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/categories/tree` | Nested tree: each node includes `children[]` (sorted by `order`). |
| `GET` | `/categories` | Flat list of all categories (sorted by `parentId`, `order`, `name`). |
| `GET` | `/categories/:id` | Single category by MongoDB id. |
| `POST` | `/categories` | Create a category. |
| `PATCH` | `/categories/:id` | Update fields and/or **reparent** (`parentId` null = root). |
| `DELETE` | `/categories/:id` | Delete only if **no subcategories** and **no chunks** reference this category (any placement). |
| `GET` | `/categories/:id/chunks` | Paginated **direct** members: chunks that list this id in `categoryIds` or legacy `categoryId`. |

#### `POST /categories` — request body

```json
{
  "name": "Billing",
  "slug": "billing",
  "parentId": null,
  "order": 0,
  "description": "Optional"
}
```

- `parentId`: optional; omit or `null` for root; otherwise a valid category id string.
- `slug`: URL-safe (letters, numbers, hyphens).

**Response:** Created category document (JSON).

#### `PATCH /categories/:id` — request body

All fields optional. Include `parentId` only when reparenting (use `null` to move to root).

```json
{
  "name": "Billing & invoices",
  "slug": "billing-invoices",
  "parentId": "64a1b2c3d4e5f6789012345",
  "order": 1,
  "description": "Updated"
}
```

**Response:** Updated category document.

**Errors:** `400` if reparent would create a cycle (moving under a descendant); `404` if category or new parent not found.

#### `DELETE /categories/:id`

**Response:** `{ "deleted": true }`

**Errors:** `400` if the category has child categories or assigned chunks (any placement).

#### `GET /categories/:id/chunks` — query parameters

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (≥ 1). |
| `limit` | integer | 20 | Page size (1–100). |

**Response:**

```json
{
  "data": [ { "_id": "...", "title": "...", "type": "blog", "categoryIds": ["..."], "...": "..." } ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

#### `GET /categories/tree` — response shape (illustrative)

```json
[
  {
    "_id": "...",
    "name": "Root topic",
    "slug": "root-topic",
    "parentId": null,
    "order": 0,
    "ancestorIds": [],
    "children": [
      {
        "_id": "...",
        "name": "Subfolder",
        "slug": "subfolder",
        "children": []
      }
    ]
  }
]
```

---

### Knowledge chunks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/knowledge-chunks` | Paginated list; optional **filter by category** (member of `categoryIds` or legacy `categoryId`). |
| `GET` | `/knowledge-chunks/:id/toc` | Table of contents from `sections` (ordered). |
| `GET` | `/knowledge-chunks/:id` | Single chunk by id. |
| `POST` | `/knowledge-chunks` | Create (`categoryId` and/or `categoryIds` / `primaryCategoryId`). |
| `PATCH` | `/knowledge-chunks/:id` | Partial update. |

#### `GET /knowledge-chunks` — query parameters

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `categoryId` | Mongo id string | — | If set, only chunks that include this category (placement). |
| `page` | integer | 1 | Page number. |
| `limit` | integer | 50 | Page size (1–100). |

**Response:** `{ "data", "total", "page", "limit", "totalPages" }`.

#### `GET /knowledge-chunks/:id/toc` — response

```json
{
  "sections": [
    { "id": "...", "slug": "overview", "title": "Overview", "order": 0, "level": 2 }
  ]
}
```

#### `POST /knowledge-chunks` — request body (extended)

```json
{
  "title": "Article title",
  "url": "https://example.com/a",
  "content": "Plain text body",
  "tags": ["tag1"],
  "type": "blog",
  "categoryId": "64a1b2c3d4e5f6789012345",
  "categoryIds": ["64a1b2c3d4e5f6789012345", "64a1b2c3d4e5f6789012346"],
  "primaryCategoryId": "64a1b2c3d4e5f6789012345",
  "sections": [
    { "slug": "intro", "title": "Introduction", "order": 0, "level": 2, "content": "Optional section body" }
  ]
}
```

- `categoryIds` / `primaryCategoryId` / `categoryId`: optional; categories must exist when set. Legacy-only clients may send only `categoryId`.

#### `PATCH /knowledge-chunks/:id` — request body

Any subset of fields, including `categoryIds`, `primaryCategoryId`, `categoryId`, `sections`, etc.

Use `"categoryId": null` and `"categoryIds": []` to clear placements as needed.

---

## Chat (RAG) — sources

`POST` chat returns **sources** deduped by `url`. Each source may include:

- `category_id`, `category_breadcrumb` — **primary** placement (backward compatible)
- `category_placements` — `{ "category_id", "category_breadcrumb" }[]` for all placements
- Other fields as before (`title`, `url`, `source_type`, …)

---

## Ingest / index rebuild

Rebuild reads knowledge chunks, splits text (by **section** when section `content` exists, otherwise main `content`), embeds, and writes metadata including **category** and **section** fields. After category moves or chunk edits, **rebuild** so search and chat stay consistent.

---

## Infra / module notes

- `DatabaseModule` registers `KnowledgeChunks` and `KnowledgeCategory` schemas and exports `DatabaseService`.
- Prefer `MONGO_URI` / env-based Mongo configuration in production.

---

## UI integration hints

1. **KB browser:** `GET /categories/tree`; `GET /categories/:id/chunks` or `GET /knowledge-chunks?categoryId=...`.
2. **Admin:** CRUD categories; assign placements via `PATCH /knowledge-chunks/:id` with `categoryIds` / `primaryCategoryId`.
3. **Article page:** `GET /knowledge-chunks/:id/toc` for section navigation (landmarks / skip links on the frontend).
4. **Chat panel:** Show `category_placements` (or legacy breadcrumb) after reindex.
