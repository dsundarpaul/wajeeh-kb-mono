# Panel KB admin — backend gaps and notes

This document records mismatches or missing pieces between the **admin panel’s desired behavior** (rich articles, categories, listing) and the **current NestJS API**, after reviewing `apps/backend/docs/kb-hierarchy-api.md` and the live controllers/DTOs.

## Security

- **`/knowledge-chunks` and `/categories` are not protected by `JwtAuthGuard`**, while legacy `/blogs` is. The panel sends a JWT anyway, but unauthenticated clients can read or mutate KB data if the API is exposed. **Recommendation:** apply the same guard (or role-based guard) to admin-affecting routes, or put them behind an API gateway.

## Listing and filtering

- **`GET /knowledge-chunks` has no `type` query** (`blog` vs `video`). The UI must either use **`GET /blogs`** for blog-only lists (legacy) or load paginated chunks and filter client-side (does not scale). **Recommendation:** add optional `type` to `ListKnowledgeChunksQueryDto` and filter in `findAll`.

## Delete

- **There is no `DELETE /knowledge-chunks/:id`.** The panel can continue using **`DELETE /blogs/:id`** for blog documents (same Mongo collection) or you add a dedicated delete on the canonical resource.

## Canonical `url` field

- **Create/update DTOs require `url` with `@IsUrl()`** on create (always) and on update when `url` is present. Admin-authored articles often do not have a public URL yet.
- The panel works around this by generating a stable internal URL such as `https://kb.internal/article/draft/<uuid>` so validation passes and RAG deduplication still has a unique `url`.
- **Optional improvement:** allow optional `url` on create and default server-side to `https://kb.internal/chunk/<newId>` after insert, or relax validation for relative/internal patterns if product requires it.

## Rich HTML in `content`

- The schema stores **`content` as a string** (HTML from TipTap is acceptable). **Ingest/RAG** primarily uses text extraction from that field; heavy HTML (embeds, figures) may reduce embedding quality unless the pipeline strips or normalizes HTML. **Recommendation:** confirm ingest extracts visible text and optionally strips tags for embeddings; document whether iframe/embeds are ignored for chunk text.

## Sections vs editor structure

- The API supports **`sections[]`** with optional per-section `content` for TOC and per-section embedding. The panel can **derive TOC entries from `h2`/`h3` in HTML** and send `sections` with `title`, `slug`, `order`, `level` only (no per-section `content`) so **`GET /knowledge-chunks/:id/toc`** stays useful while a single HTML body drives the reader UI.
- **Nested sections** (arbitrary depth) are not modeled; backend sections are a flat ordered list with `level`. Deep outlines should stay as heading levels inside HTML.

## Media uploads

- There is **no first-party upload endpoint** in the reviewed API; images in the editor use **absolute URLs** (e.g. CDN or external host). If you need hosted uploads, add storage + signed URLs and panel integration.

## YouTube and embeds

- Embeds are stored as **HTML placeholders** in `content` and rendered in the panel preview/reader. No separate field is required. If ingest must index transcript or titles from video, that is **not** covered by storing a YouTube block alone.

## Categories

- **Multi-placement** via `categoryIds` + **`primaryCategoryId`** is implemented and matches the hierarchy docs. Deleting a category that still has chunks or children returns **400** — the panel should surface that message.

---

When these backend items are addressed, the panel can be simplified (e.g. drop legacy `/blogs` for mutations, use typed filters, and align auth).
