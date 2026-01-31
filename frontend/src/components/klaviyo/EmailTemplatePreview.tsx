"use client";
import React from "react";
import Image from "next/image";
import { Facebook, Instagram, Share2 } from "lucide-react";
import { CanvasBlocks, CanvasBlock, SocialPlatform } from "@/components/mailchimp/email-builder/types";

interface EmailTemplatePreviewProps {
  canvasBlocks: CanvasBlocks;
}

const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  canvasBlocks,
}) => {
  // Scale factor for compact preview (approximately 1/3 to 1/4 of full size)
  const SCALE = 0.25;

  const getBoxStyleProps = (styles?: any) => {
    if (!styles) return {};
    const hasUnifiedPadding = styles.padding !== undefined;
    const hasUnifiedMargin = styles.margin !== undefined;

    return {
      backgroundColor: styles.backgroundColor,
      borderStyle: styles.borderStyle,
      borderWidth: styles.borderWidth,
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      ...(hasUnifiedPadding ? { padding: styles.padding } : {}),
      ...(!hasUnifiedPadding
        ? {
            paddingTop: styles.paddingTop,
            paddingRight: styles.paddingRight,
            paddingBottom: styles.paddingBottom,
            paddingLeft: styles.paddingLeft,
          }
        : {}),
      ...(hasUnifiedMargin ? { margin: styles.margin } : {}),
      ...(!hasUnifiedMargin
        ? {
            marginTop: styles.marginTop,
            marginRight: styles.marginRight,
            marginBottom: styles.marginBottom,
            marginLeft: styles.marginLeft,
          }
        : {}),
    };
  };

  const getStyleProps = (styles: any) => {
    if (!styles) {
      return {
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: undefined,
        fontWeight: undefined,
        textAlign: "center",
        color: undefined,
      };
    }
    return {
      fontFamily: styles.fontFamily || "Helvetica, Arial, sans-serif",
      fontSize: styles.fontSize ? `${(styles.fontSize as number) * SCALE}px` : `${10 * SCALE}px`,
      fontWeight: styles.fontWeight || undefined,
      textAlign: styles.textAlign || "center",
      color: styles.color || undefined,
    };
  };

  const renderPreviewBlock = (block: CanvasBlock): React.ReactNode => {
    switch (block.type) {
      case "Image": {
        const imageAlt = block.imageAltText?.trim() || "Image";
        return (
          <div className="w-full flex justify-center">
            {block.imageUrl ? (
              <Image
                src={block.imageUrl}
                alt={imageAlt}
                width={150}
                height={100}
                className="object-contain"
                style={{ maxWidth: "100%", height: "auto" }}
                unoptimized
              />
            ) : (
              <div className="border border-gray-200 w-full h-16 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400 text-xs">Image</div>
              </div>
            )}
          </div>
        );
      }
      case "Heading": {
        const headingStyles = block.styles || {};
        const headingStyleProps = getStyleProps(headingStyles);
        return (
          <h2
            className="py-1"
            style={{
              ...headingStyleProps,
              fontSize: headingStyleProps.fontSize || "12px",
              color: headingStyleProps.color || "#111827",
            } as React.CSSProperties}
          >
            {block.content || "Heading"}
          </h2>
        );
      }
      case "Paragraph": {
        const paragraphStyles = block.styles || {};
        const paragraphStyleProps = getStyleProps(paragraphStyles);
        const content = block.content || "Text content";
        const truncatedContent = content.length > 50 ? content.substring(0, 50) + "..." : content;
        return (
          <p
            className="py-0.5"
            style={{
              ...paragraphStyleProps,
              fontSize: paragraphStyleProps.fontSize || "10px",
              color: paragraphStyleProps.color || "#374151",
            } as React.CSSProperties}
          >
            {truncatedContent}
          </p>
        );
      }
      case "Text": {
        // Text blocks use the same rendering as Paragraph
        const textStyles = block.styles || {};
        const textStyleProps = getStyleProps(textStyles);
        const content = block.content || "Text content";
        const truncatedContent = content.length > 50 ? content.substring(0, 50) + "..." : content;
        return (
          <p
            className="py-0.5"
            style={{
              ...textStyleProps,
              fontSize: textStyleProps.fontSize || "10px",
              color: textStyleProps.color || "#374151",
            } as React.CSSProperties}
          >
            {truncatedContent}
          </p>
        );
      }
      case "Logo": {
        return (
          <div className="w-full flex justify-center py-1">
            {block.imageUrl ? (
              <Image
                src={block.imageUrl}
                alt="Logo"
                width={60}
                height={60}
                className="object-contain"
                style={{ maxWidth: "100%", height: "auto" }}
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 border border-gray-200 bg-gray-50 rounded">
                <span className="text-xs text-gray-500">Logo</span>
              </div>
            )}
          </div>
        );
      }
      case "Button": {
        const buttonTextColor = block.buttonTextColor || "#ffffff";
        const buttonBackgroundColor = block.buttonBackgroundColor || "#111827";
        return (
          <div className="flex justify-center py-1">
            <button
              className="px-3 py-1 text-xs rounded"
              style={{
                backgroundColor: buttonBackgroundColor,
                color: buttonTextColor,
              }}
            >
              {block.content || "Button"}
            </button>
          </div>
        );
      }
      case "Divider": {
        const dividerLineColor = block.dividerLineColor || "#000000";
        return (
          <div className="py-1">
            <div
              style={{
                borderTop: `1px solid ${dividerLineColor}`,
                width: "100%",
              }}
            />
          </div>
        );
      }
      case "Spacer": {
        return <div className="h-2" />;
      }
      case "Social": {
        const socialLinks = block.socialLinks || [];
        const socialIconColor = block.socialIconColor || "#000000";
        const socialSize = block.socialSize || "Small";
        
        const sizeMap: Record<string, string> = {
          Small: "h-2 w-2",
          Medium: "h-3 w-3",
          Large: "h-4 w-4",
        };

        const getPlatformIcon = (platform: SocialPlatform) => {
          const iconSize = sizeMap[socialSize] || "h-3 w-3";
          switch (platform) {
            case "Facebook":
              return <Facebook className={iconSize} />;
            case "Instagram":
              return <Instagram className={iconSize} />;
            case "X":
              return <Share2 className={iconSize} />;
            default:
              return <Share2 className={iconSize} />;
          }
        };

        if (socialLinks.length === 0) {
          return (
            <div className="flex justify-center py-1">
              <div className="text-xs text-gray-400">Social</div>
            </div>
          );
        }

        return (
          <div className="flex justify-center items-center gap-1 py-1" style={{ color: socialIconColor }}>
            {socialLinks.slice(0, 3).map((link) => (
              <div key={link.id}>{getPlatformIcon(link.platform)}</div>
            ))}
          </div>
        );
      }
      case "Layout":
        return (
          <div className="flex gap-1 py-1">
            <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded text-xs text-gray-400 text-center py-1">
              Layout
            </div>
          </div>
        );
      default:
        return (
          <div className="border border-gray-200 rounded p-1 text-center text-xs text-gray-400">
            {block.label || block.type}
          </div>
        );
    }
  };

  const renderSectionPreview = (blocks: CanvasBlock[]) => {
    if (!blocks || blocks.length === 0) return null;
    
    return (
      <div className="space-y-0.5">
        {blocks.map((block, idx) => (
          <div key={block.id || idx}>{renderPreviewBlock(block)}</div>
        ))}
      </div>
    );
  };

  const hasBlocks = 
    (canvasBlocks.header && canvasBlocks.header.length > 0) ||
    (canvasBlocks.body && canvasBlocks.body.length > 0) ||
    (canvasBlocks.footer && canvasBlocks.footer.length > 0);

  if (!hasBlocks) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400">Email Template</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white p-2 overflow-hidden">
      <div className="space-y-1">
        {canvasBlocks.header && canvasBlocks.header.length > 0 && (
          <div className="border-b border-gray-100 pb-1">
            {renderSectionPreview(canvasBlocks.header)}
          </div>
        )}
        {canvasBlocks.body && canvasBlocks.body.length > 0 && (
          <div>
            {renderSectionPreview(canvasBlocks.body)}
          </div>
        )}
        {canvasBlocks.footer && canvasBlocks.footer.length > 0 && (
          <div className="border-t border-gray-100 pt-1">
            {renderSectionPreview(canvasBlocks.footer)}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatePreview;

