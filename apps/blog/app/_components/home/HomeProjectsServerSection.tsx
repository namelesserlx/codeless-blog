import { getGitHubAboutData } from '@/components/about/github-data';
import { isGitHubAboutEnabled } from '@/config/services/github';
import { HomeProjectsSection } from './HomeProjectsSection';

export async function HomeProjectsServerSection() {
    if (!isGitHubAboutEnabled) {
        return null;
    }

    const githubData = await getGitHubAboutData();

    return <HomeProjectsSection projects={githubData.projects.slice(0, 3)} />;
}
