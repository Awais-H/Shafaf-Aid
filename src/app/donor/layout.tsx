
export default function DonorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen">
            {/* Main Content */}
            {children}
        </div>
    );
}
