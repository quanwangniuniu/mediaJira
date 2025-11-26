import { CanvasBlocks } from "../types";
import { generateSectionsHTML } from "./htmlGenerator";

// Dynamically import html-to-image to avoid SSR issues
let toPng: any = null;
const loadHtmlToImage = async () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (!toPng) {
    const htmlToImage = await import("html-to-image");
    toPng = htmlToImage.toPng;
  }
  return toPng;
};

/**
 * Captures a thumbnail image from the email template canvas blocks.
 * Uses the same rendering logic as PreviewPanel to ensure consistency.
 *
 * @param canvasBlocks - The canvas blocks to render
 * @param previewContainerRef - Optional ref to PreviewPanel container (for future use)
 * @returns A data URL string (base64 PNG image) or null if capture fails
 */
export async function captureTemplateThumbnail(
  canvasBlocks: CanvasBlocks,
  previewContainerRef?: React.RefObject<HTMLDivElement> | null
): Promise<string | null> {
  let container: HTMLDivElement | null = null;
  try {
    // Generate HTML sections from canvas blocks
    const sections = generateSectionsHTML(canvasBlocks);
    const allSectionsHTML = Object.values(sections).join("");

    // Create a temporary container element
    // Use fixed position off-screen but visible to html-to-image
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "600px";
    container.style.height = "auto";
    container.style.backgroundColor = "#ffffff";
    container.style.fontFamily = "Helvetica, Arial, sans-serif";
    container.style.zIndex = "-9999";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";

    // Build the email HTML structure - same as PreviewPanel
    const emailHTML = `
      <div style="width: 600px; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; box-sizing: border-box;">
        <div style="background-color: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; padding: 12px 0; text-decoration: underline;"></div>
        <div style="padding: 40px; box-sizing: border-box;">
          ${allSectionsHTML}
        </div>
      </div>
    `;

    container.innerHTML = emailHTML;
    document.body.appendChild(container);

    // Force a reflow to ensure the element is rendered
    container.offsetHeight;

    // Wait for images to load if any (with graceful error handling)
    const images = container.querySelectorAll("img");
    if (images.length > 0) {
      await Promise.allSettled(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(null);
              } else {
                img.onload = () => resolve(null);
                img.onerror = () => resolve(null); // Continue even if image fails
                // Timeout after 3 seconds - continue anyway
                setTimeout(() => resolve(null), 3000);
              }
            })
        )
      );
    }

    // Wait longer for rendering and layout
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Force another reflow
    container.offsetHeight;

    // Get the actual content height
    const contentHeight = Math.max(
      container.scrollHeight,
      container.offsetHeight,
      600
    );

    // Temporarily make visible for capture (html-to-image needs visible content)
    const originalOpacity = container.style.opacity;
    container.style.opacity = "1";

    // Load html-to-image dynamically
    const toPngFn = await loadHtmlToImage();
    if (!toPngFn) {
      throw new Error("html-to-image is not available in this environment");
    }

    // Capture the element as PNG - use container directly
    const dataUrl = await toPngFn(container, {
      width: 600,
      height: Math.min(contentHeight, 2000), // Limit height to avoid memory issues
      backgroundColor: "#ffffff",
      pixelRatio: 1,
      quality: 0.9,
      cacheBust: true,
    });

    // Restore opacity
    container.style.opacity = originalOpacity;

    // Clean up
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }

    return dataUrl;
  } catch (error) {
    // Clean up on error
    if (container && container.parentNode) {
      try {
        document.body.removeChild(container);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    return null;
  }
}
