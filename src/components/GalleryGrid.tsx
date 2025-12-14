import type { GalleryItem, GeneratedImage, GeneratedText } from '../types';
import { FixedMasonryGrid } from './FixedMasonryGrid';
import { createImageRenderer } from './MasonryGridImageRenderer';
import { TextCard } from './TextCard';
import type { MasonryItemRendererProps } from './FixedMasonryGrid';

interface GalleryGridProps {
    items: GalleryItem[];
    onImageDelete: (id: string) => void;
    onTextDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => void;
}

/**
 * Type guard to check if an item is a GeneratedImage
 */
function isGeneratedImage(item: GalleryItem): item is GeneratedImage {
    return 'url' in item && 'width' in item && 'height' in item;
}

/**
 * Type guard to check if an item is a GeneratedText
 */
function isGeneratedText(item: GalleryItem): item is GeneratedText {
    return 'content' in item && !('url' in item);
}

/**
 * GalleryGrid component displays generated images and text responses in a responsive masonry layout
 * Requirements: 3.1, 3.2, 3.3, 3.4, 8.4
 */
export function GalleryGrid({ items, onImageDelete, onTextDelete, onImageEdit }: GalleryGridProps) {
    // Handle empty state
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-center">
                <div className="space-y-2">
                    <p className="text-lg font-medium text-muted-foreground">
                        No content yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Enter a prompt above to generate your first image
                    </p>
                </div>
            </div>
        );
    }

    // Create a unified renderer that handles both images and text
    const renderer = (props: MasonryItemRendererProps) => {
        const item = props.item as GalleryItem;

        if (isGeneratedImage(item)) {
            // Use image renderer
            const imageRenderer = createImageRenderer(onImageDelete, onImageEdit);
            return imageRenderer(props);
        }

        if (isGeneratedText(item)) {
            // Render text card with square aspect ratio (350x350 to match maxItemSize)
            const style = {
                width: props.displayWidth,
                height: props.displayHeight,
            };

            return (
                <TextCard
                    id={item.id}
                    content={item.content}
                    prompt={item.prompt}
                    createdAt={item.createdAt}
                    onDelete={onTextDelete}
                    style={style}
                />
            );
        }

        return <div />; // Return empty div instead of null to satisfy type requirements
    };

    // Transform text items to have width/height for masonry grid
    const masonryItems = items.map(item => {
        if (isGeneratedText(item)) {
            // Text cards are square, use maxItemSize for both dimensions
            return { ...item, width: 350, height: 350 };
        }
        return item;
    });

    return (
        <div className="w-full">
            <FixedMasonryGrid
                items={masonryItems}
                renderer={renderer}
                columnWidth={350}
                gap={22}
                overscan={5}
                bufferSize={200}
                className="w-full"
            />
        </div>
    );
}
