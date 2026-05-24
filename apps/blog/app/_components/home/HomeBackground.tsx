export function HomeBackground() {
    return (
        <>
            <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="fixed top-0 left-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-20 blur-[120px]" />
            <div className="fixed right-0 bottom-0 -z-10 h-[400px] w-[400px] translate-x-1/3 translate-y-1/3 rounded-full bg-blue-600 opacity-10 blur-[100px]" />
        </>
    );
}
