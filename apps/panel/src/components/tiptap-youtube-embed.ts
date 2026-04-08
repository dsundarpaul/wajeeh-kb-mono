import { Node, mergeAttributes } from "@tiptap/core";

export const YoutubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      videoId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video-id]',
        getAttrs: (el) => {
          if (typeof el === "string") return false;
          const id = el.getAttribute("data-youtube-video-id");
          return id ? { videoId: id } : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-youtube-video-id": node.attrs.videoId as string,
        class: "youtube-embed-node",
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const wrap = document.createElement("div");
      wrap.className =
        "youtube-embed-node my-4 aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900";
      const iframe = document.createElement("iframe");
      iframe.className = "h-full w-full min-h-[200px]";
      iframe.src = `https://www.youtube-nocookie.com/embed/${node.attrs.videoId as string}`;
      iframe.title = "YouTube video";
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      );
      wrap.appendChild(iframe);
      return { dom: wrap };
    };
  },
});
