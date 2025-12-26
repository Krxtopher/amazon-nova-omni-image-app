import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/SettingsModal';
import {
    Settings,
    HelpCircle,
    Palette
} from 'lucide-react';

interface SidebarProps {
    className?: string;
}

/**
 * Left sidebar with Amazon Nova logo and icon-based navigation buttons
 */
export function Sidebar({ className = '' }: SidebarProps) {
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const bottomButtons = [
        {
            id: 'palette',
            icon: Palette,
            label: 'Colors',
            action: () => {
                // Future: Open color picker modal
            }
        },
        {
            id: 'settings',
            icon: Settings,
            label: 'Settings',
            action: () => {
                setIsSettingsOpen(true);
            }
        },
        {
            id: 'help',
            icon: HelpCircle,
            label: 'Help',
            action: () => {
                // Future: Open help modal or documentation
            }
        }
    ];

    const handleButtonClick = (buttonId: string, action: () => void) => {
        setActiveButton(buttonId);
        action();
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-background border-r border-border flex flex-col items-center py-4 px-2 z-30 ${className}`}
            aria-label="Main navigation"
        >
            {/* Amazon Nova Logo */}
            <div className="mb-8 flex items-center justify-center">
                <img
                    src="/AmazonNova_Symbol_Gradient_RGB.svg"
                    alt="Amazon Nova"
                    className="w-7 h-7"
                />
            </div>

            {/* Navigation Buttons */}
            <nav className="flex flex-col gap-2 flex-1">
                {/* Spacer to push bottom buttons down */}
                <div className="flex-1" />

                {/* Bottom buttons - Colors, Settings, Help */}
                {bottomButtons.map((button) => {
                    const Icon = button.icon;
                    const isActive = activeButton === button.id;

                    return (
                        <Button
                            key={button.id}
                            variant={isActive ? "default" : "ghost"}
                            size="icon"
                            className={`${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'} flex items-center justify-center [&_svg]:size-5!`}
                            onClick={() => handleButtonClick(button.id, button.action)}
                            title={button.label}
                            aria-label={button.label}
                        >
                            <Icon strokeWidth={1.5} />
                        </Button>
                    );
                })}
            </nav>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </aside>
    );
}