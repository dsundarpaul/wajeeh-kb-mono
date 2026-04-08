"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  Youtube,
} from "lucide-react";
import toast from "react-hot-toast";

interface Video {
  _id: string;
  id: string;
  title: string;
  youtube_url: string;
  video_id: string;
  channel: string;
  thumbnail_url: string;
  transcript_word_count: number;
  was_summarized: boolean;
  tags: string[];
  created_at: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [tags, setTags] = useState("");
  const [adding, setAdding] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const data = await api.get<Video[]>("/videos");
      setVideos(data);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const closeAdd = () => {
    setAddOpen(false);
    setYoutubeUrl("");
    setTranscript("");
    setTags("");
  };

  const closeEdit = () => {
    setEditVideo(null);
    setEditTitle("");
    setEditTags("");
  };

  const openEdit = (v: Video) => {
    setEditVideo(v);
    setEditTitle(v.title);
    setEditTags((v.tags ?? []).join(", "));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      toast.error("YouTube URL is required");
      return;
    }
    if (!transcript.trim()) {
      toast.error("Transcript is required");
      return;
    }

    setAdding(true);
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await api.post("/videos/manual", {
        youtube_url: youtubeUrl.trim(),
        transcript_raw: transcript.trim(),
        tags: tagList,
      });
      toast.success("Video added");
      closeAdd();
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVideo) return;
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setSavingEdit(true);
    const tagList = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await api.patch(`/videos/${editVideo._id}`, {
        title: editTitle.trim(),
        tags: tagList,
      });
      toast.success("Video updated");
      closeEdit();
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      await api.delete(`/videos/${id}`);
      toast.success("Video deleted");
      fetchVideos();
    } catch {
      toast.error("Failed to delete video");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Videos
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            YouTube entries with pasted transcripts for the knowledge base
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} />
          Add video
        </button>
      </div>

      <Drawer open={addOpen} onOpenChange={(o) => !o && closeAdd()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add YouTube video</DrawerTitle>
            <DrawerDescription>
              Paste the video URL and transcript (captions). Metadata is read
              from YouTube.
            </DrawerDescription>
          </DrawerHeader>
          <form
            id="video-add-form"
            onSubmit={handleAdd}
            className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto px-4"
          >
            <div>
              <label htmlFor="youtube_url" className="label">
                YouTube URL
              </label>
              <input
                id="youtube_url"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="transcript" className="label">
                Transcript
              </label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the transcript…"
                rows={8}
                className="input resize-y"
                required
              />
            </div>
            <div>
              <label htmlFor="video_tags" className="label">
                Tags
              </label>
              <input
                id="video_tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
                className="input"
              />
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Comma-separated
              </p>
            </div>
          </form>
          <DrawerFooter className="flex-row justify-end border-t-0">
            <button type="button" className="btn-secondary" onClick={closeAdd}>
              Cancel
            </button>
            <button
              type="submit"
              form="video-add-form"
              disabled={adding}
              className="btn-primary"
            >
              {adding ? "Adding…" : "Add video"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!editVideo} onOpenChange={(o) => !o && closeEdit()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit video</DrawerTitle>
            <DrawerDescription>
              Update display title and tags. Transcript is not changed here.
            </DrawerDescription>
          </DrawerHeader>
          <form
            id="video-edit-form"
            onSubmit={handleSaveEdit}
            className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-4"
          >
            <div>
              <label htmlFor="edit_title" className="label">
                Title
              </label>
              <input
                id="edit_title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="edit_tags" className="label">
                Tags
              </label>
              <input
                id="edit_tags"
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tag1, tag2"
                className="input"
              />
            </div>
          </form>
          <DrawerFooter className="flex-row justify-end border-t-0">
            <button type="button" className="btn-secondary" onClick={closeEdit}>
              Cancel
            </button>
            <button
              type="submit"
              form="video-edit-form"
              disabled={savingEdit}
              className="btn-primary"
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : videos.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Youtube
            size={48}
            className="mb-4 text-neutral-300 dark:text-neutral-600"
          />
          <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">
            No videos yet
          </p>
          <p className="mt-1 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Add a video with a transcript to include it in the knowledge base
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Add video
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div key={video._id} className="card overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="h-20 w-36 shrink-0 rounded-lg bg-neutral-200 object-cover dark:bg-neutral-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {video.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {video.channel} · {video.transcript_word_count} words
                    {video.was_summarized ? (
                      <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        Summarized
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {video.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expandedId === video._id ? null : video._id)
                    }
                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    title="Details"
                  >
                    {expandedId === video._id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <a
                    href={video.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Open on YouTube"
                  >
                    <Youtube size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={() => openEdit(video)}
                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(video._id)}
                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedId === video._id ? (
                <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Video ID
                  </p>
                  <p className="mb-3 font-mono text-sm text-neutral-700 dark:text-neutral-300">
                    {video.video_id}
                  </p>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Added
                  </p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {video.created_at
                      ? new Date(video.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
