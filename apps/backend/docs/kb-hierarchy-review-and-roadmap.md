# KB hierarchy — review, glossary, and roadmap

## Executive summary

- **Categories** use a normal `parentId` plus **denormalized `ancestorIds`** for fast subtree queries and safe reparenting. See glossary below.
- **Articles** are stored as **knowledge chunks** with optional **multiple category placements** via `categoryIds` and `primaryCategoryId`, with legacy **`categoryId`** still supported and treated as a single placement when `categoryIds` is empty.
- **Ingest** writes vector metadata including **category placements**, **breadcrumbs**, and optional **section** fields so chat sources stay aligned after reindex.
- **RAG** remains **content-centric**: retrieval uses embedding similarity on chunk text; paths and categories are **metadata** for filtering and display, not primary search keys.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Knowledge chunk** | One persisted article (or video) document in MongoDB used for KB + RAG. Despite the name, it is the canonical **article** record. |
| **parentId** | The **immediate** parent category’s `_id`, or `null` for a root category. One hop up the tree. |
| **ancestorIds** | Ordered array of **strict ancestors** from root down through the immediate parent. It **does not** include this category’s own `_id`. Equivalent mental model: **lineage / materialized path** for queries. |
| **Placement** | One link between an article and a category folder. An article may have **multiple** placements (`categoryIds`). |
| **primaryCategoryId** | Optional hint for default breadcrumb / UI when multiple placements exist. |
| **categoryId (legacy)** | Single optional folder; if set and `categoryIds` is empty, the API treats it as one placement. |

---

## `parentId` vs `ancestorIds`

- **`parentId`**: who is my **direct** parent? (at most one reference.)
- **`ancestorIds`**: **all** category ids from the root to my parent, in order. Used to answer “is X an ancestor of me?” (cycle checks), recompute descendants after moves, and subtree-style queries via index on `ancestorIds`.

---

## API naming

- **JSON bodies** for REST use **camelCase** (`categoryId`, `categoryIds`, `primaryCategoryId`).
- **Chat / vector metadata** uses **snake_case** for historical fields (`source_id`, `category_id`, `chunk_text`) and adds structured fields where noted in the API doc.

---

## Vector metadata (per indexed chunk row)

| Field | Description |
|-------|-------------|
| `source_type` | `blog` \| `video` |
| `source_id` | Mongo id of the knowledge chunk document |
| `title`, `url`, `chunk_text`, `chunk_index` | As before |
| `category_id` | Legacy single field: primary category id when present |
| `category_breadcrumb` | Legacy single field: breadcrumb for primary placement |
| `category_ids` | All linked category ids (strings) |
| `category_breadcrumbs` | Parallel array of breadcrumb strings for each placement |
| `category_placements` | Array of `{ category_id, category_breadcrumb }` |
| `section_id` | When chunk is scoped to a section, that section’s id |
| `heading_path` | Section title or path for UI deep-linking |

---

## Chat `sources` object (deduped by `url`)

Includes legacy `category_id` / `category_breadcrumb` (primary), plus **`category_placements`** when multiple categories apply. Clients should prefer `category_placements` for full context.

---

## HTTP additions

- **`GET /knowledge-chunks/:id/toc`** — ordered table of contents from `sections` for in-page / accessibility-friendly navigation.

---

## Roadmap (completed in codebase iteration)

- Doc sync with ingest and multi-placement.
- Ingest populates category + section metadata.
- Hardened `PATCH` for knowledge chunks.
- Multi-parent fields and query filters.
- Category service reparent logic split into private methods.

---

## Security note

Move MongoDB credentials and connection strings to environment-only configuration in production; avoid committing secrets in `app.module` or source control.
