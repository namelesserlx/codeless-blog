export function Main({ children }: { children: React.ReactNode }) {
    return (
        <main className="w-full overflow-x-hidden">
            <div className="h-full w-full">{children}</div>
        </main>
    );
}
