import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/SettingsModal';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import {
    Home,
    Settings,
    HelpCircle,
    Image,
    Palette,
    Download,
    TestTube,
    Columns3,
    Rows3
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
    const navigate = useNavigate();
    const { layoutMode, setLayoutMode } = useUIStore();

    const sidebarButtons = [
        {
            id: 'home',
            icon: Home,
            label: 'Home',
            action: () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        {
            id: 'gallery',
            icon: Image,
            label: 'Gallery',
            action: () => {
                const gallery = document.querySelector('[aria-label="Generated images gallery"]');
                gallery?.scrollIntoView({ behavior: 'smooth' });
            }
        },
        {
            id: 'layout',
            icon: layoutMode === 'vertical' ? Rows3 : Columns3,
            label: `Switch to ${layoutMode === 'vertical' ? 'Horizontal' : 'Vertical'} Layout`,
            action: () => {
                const newMode = layoutMode === 'vertical' ? 'horizontal' : 'vertical';
                setLayoutMode(newMode);
            }
        },
        {
            id: 'palette',
            icon: Palette,
            label: 'Colors',
            action: () => {
                // Future: Open color picker modal
            }
        },
        {
            id: 'download',
            icon: Download,
            label: 'Download',
            action: () => {
                // Future: Open download options
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
        },
        {
            id: 'demo',
            icon: TestTube,
            label: 'Demo Effects',
            action: () => {
                navigate('/demo');
            }
        },
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
                {sidebarButtons.map((button) => {
                    const Icon = button.icon;
                    const isActive = activeButton === button.id;

                    return (
                        <Button
                            key={button.id}
                            variant={isActive ? "default" : "ghost"}
                            size="icon"
                            className={`${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'} flex items-center justify-center [&_svg]:!size-[20px]`}
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