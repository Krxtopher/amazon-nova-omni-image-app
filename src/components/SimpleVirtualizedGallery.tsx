import React, { useRef, useMemo } from 'react';
import { useImageStore } from '@/stores/imageStore';
import type { GalleryItem, GeneratedImage, GeneratedText } from '../types';
import { FixedMasonryGrid } from './FixedMasonryGrid';
import { createImageRenderer } from './MasonryGridImageRenderer';
import { TextCard } from './TextCard';
import type { MasonryItemRendererProps } from './FixedMasonryGrid';

interface SimpleVirtualizedGalleryProps {
    onImageDelete: (id: string) => void;
    onTextDelete: (id: string) => void;
    onImageEdit: (image: GeneratedImage) => Promise<void>;
}

/**
 * Type guards
 */
function isGeneratedImage(item: GalleryItem): item is GeneratedImage {
    return 'width' in item && 'height' in item && 'aspectRatio' in item;
}

function isGeneratedText(item: any): item is GeneratedText {
    // Check for the _isTextItem flag we add during transformation, or the original content property
    return '_isTextItem' in item || ('content' in item && !('aspectRatio' in item));
}

/**
 * Simplified VirtualizedGallery without infinite scroll conflicts
 */
export const SimpleVirtualizedGallery = React.memo(function SimpleVirtualizedGallery({
    onImageDelete,
    onTextDelete,
    onImageEdit
}: SimpleVirtualizedGalleryProps) {
    const { images, textItems } = useImageStore();
    const containerRef = useRef<HTMLDivElement>(null);

    // Memoized sorted items (only sort once when data changes)
    const sortedItems = useMemo(() => {
        const allItems: GalleryItem[] = [...images, ...textItems];



        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [images, textItems]);

    // Memoized renderer
    const renderer = useMemo(() => {
        const imageRenderer = createImageRenderer(onImageDelete, onImageEdit);

        return (props: MasonryItemRendererProps) => {
            const item = props.item as GalleryItem;

            if (isGeneratedImage(item)) {
                return imageRenderer(props);
            }

            if (isGeneratedText(item)) {
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


            return <div />;
        };
    }, [onImageDelete, onImageEdit, onTextDelete]);

    // Transform text items for masonry grid
    const masonryItems = useMemo(() => {
        const transformed = sortedItems.map(item => {
            if (isGeneratedText(item)) {
                // Add masonry properties but mark it as a text item
                return { ...item, width: 350, height: 350, _isTextItem: true };
            }
            return item;
        });

        return transformed;
    }, [sortedItems]);

    // Handle empty state
    if (sortedItems.length === 0) {
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

    return (
        <div ref={containerRef} className="w-full">
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
});

export default SimpleVirtualizedGallery;