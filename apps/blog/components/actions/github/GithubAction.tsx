import { GitHubIcon as Github } from '@/components/icons/GitHubIcon';
export function GithubAction() {
    return (
        <a
            href="https://github.com/your-username"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary"
            aria-label="GitHub"
            target="_blank"
            rel="noopener noreferrer"
        >
            <Github size={24} />
        </a>
    );
}
