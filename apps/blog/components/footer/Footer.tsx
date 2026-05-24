export function Footer() {
    return (
        <footer className="bg-white py-6 dark:bg-gray-900 dark:text-white">
            <div className="mx-auto max-w-7xl px-4 text-center">
                <p className="text-sm text-foreground/70">
                    &copy; {new Date().getFullYear()} {"CodeLess's"} Blog. All rights reserved.
                </p>
                <a
                    href="https://beian.miit.gov.cn"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm text-foreground/60 transition-colors hover:text-primary"
                >
                    粤ICP备XXXXXXXXXXXX号-XX
                </a>
            </div>
        </footer>
    );
}
