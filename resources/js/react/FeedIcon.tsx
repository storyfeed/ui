import {
    Activity,
    Archive,
    Building2,
    CircleCheck,
    File,
    FileCheck,
    FilePen,
    FileUp,
    Folder,
    MessageCircle,
    SquareCheck,
    UserPlus,
    ShoppingBag,
    ChefHat,
    Utensils,
    Bike,
    Receipt,
    CreditCard,
    Image,
    Tablet,
    Tag,
    CircleX,
    Eye,
    GitMerge,
    Ticket,
    IceCreamCone,
    Radio,
    Star,
    Newspaper,
    Gamepad2,
    FerrisWheel,
    Film,
} from 'lucide-react';
import type { ComponentType } from 'react';
const ICONS: Record<string, ComponentType<any>> = {
    activity: Activity,
    archive: Archive,
    'building-2': Building2,
    'circle-check': CircleCheck,
    file: File,
    'file-check': FileCheck,
    'file-pen': FilePen,
    'file-up': FileUp,
    folder: Folder,
    'message-circle': MessageCircle,
    'square-check': SquareCheck,
    'user-plus': UserPlus,
    'shopping-bag': ShoppingBag,
    'chef-hat': ChefHat,
    utensils: Utensils,
    bike: Bike,
    receipt: Receipt,
    'credit-card': CreditCard,
    image: Image,
    tablet: Tablet,
    tag: Tag,
    'circle-x': CircleX,
    'git-merge': GitMerge,
    ticket: Ticket,
    eye: Eye,
    'ice-cream-cone': IceCreamCone,
    radio: Radio,
    star: Star,
    newspaper: Newspaper,
    'gamepad-2': Gamepad2,
    'ferris-wheel': FerrisWheel,
    film: Film,
};

export default function FeedIcon({
    icon,
    intent,
    variant = 'disc',
}: {
    icon: string | null;
    intent?: string | null;
    variant?: 'disc' | 'badge';
}) {
    const Icon = Object.hasOwn(ICONS, icon ?? '') ? ICONS[icon!] : Activity;
    return (
        <span
            className={`sf-icon-slot ${variant === 'badge' ? 'sf-badge absolute top-[calc(var(--sf-disc)-var(--sf-badge)+--spacing(0.5))] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] flex size-(--sf-badge) items-center justify-center rounded-full bg-background text-muted-foreground ring-[length:--spacing(0.375)] ring-background [&_svg]:size-2.5' : 'sf-icon flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground [&_svg]:size-3.5'}`}
            data-sf-intent={variant === 'disc' && intent ? intent : undefined}
            aria-hidden="true"
        >
            <Icon />
        </span>
    );
}
