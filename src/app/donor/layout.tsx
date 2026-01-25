
import { AIChatWindow } from '@/components/ai/AIChatWindow';

export default function DonorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen">
            {/* Main Content */}
            {children}

            {/* Floating AI Chatbot - Persistent across all donor pages */}
            <AIChatWindow />
        </div>
    );
}
