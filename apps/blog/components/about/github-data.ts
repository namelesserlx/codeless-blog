import { cache } from 'react';
import { githubAboutConfig } from '@/config/services/github';

export const GITHUB_USERNAME = githubAboutConfig.username;
const CONTRIBUTION_DAYS = 7;

export type GraphQLContributionLevel =
    | 'NONE'
    | 'FIRST_QUARTILE'
    | 'SECOND_QUARTILE'
    | 'THIRD_QUARTILE'
    | 'FOURTH_QUARTILE';

export interface ContributionDay {
    date: string;
    count: number;
    level: number;
    rawLevel: GraphQLContributionLevel;
    color: string;
}

export interface GitHubProject {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    link: string;
    stars: number;
    forks: number;
    updatedAt: string;
}

interface GitHubRepositoryTopicNode {
    topic: {
        name: string;
    };
}

interface GitHubRepositoryNode {
    id: string;
    name: string;
    description: string | null;
    url: string;
    homepageUrl: string | null;
    stargazerCount: number;
    forkCount: number;
    isArchived: boolean;
    updatedAt: string;
    primaryLanguage: {
        name: string;
    } | null;
    repositoryTopics: {
        nodes: GitHubRepositoryTopicNode[];
    };
}

interface GitHubContributionDayNode {
    contributionCount: number;
    contributionLevel: GraphQLContributionLevel;
    date: string;
    weekday: number;
    color: string;
}

interface GitHubContributionWeekNode {
    contributionDays: GitHubContributionDayNode[];
}

interface GitHubUser {
    login: string;
    name: string | null;
    bio: string | null;
    url: string;
    followers: {
        totalCount: number;
    };
    repositories: {
        totalCount: number;
        nodes: GitHubRepositoryNode[];
    };
    contributionsCollection: {
        contributionCalendar: {
            totalContributions: number;
            weeks: GitHubContributionWeekNode[];
        };
    };
}

interface GitHubGraphQLResponse {
    data?: {
        user?: GitHubUser;
    };
    errors?: Array<{
        message: string;
    }>;
}

export interface GitHubAboutData {
    profile: {
        login: string;
        name: string | null;
        bio: string | null;
        url: string;
        followers: number;
        publicRepos: number;
    } | null;
    totalStars: number;
    totalContributions: number;
    activeDays: number;
    bestDay: ContributionDay | null;
    weeks: ContributionDay[][];
    projects: GitHubProject[];
}

const GITHUB_REPORT_QUERY = `
query GitHubAboutReport($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    bio
    url
    followers {
      totalCount
    }
    repositories(
      ownerAffiliations: OWNER
      privacy: PUBLIC
      isFork: false
      first: 100
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        id
        name
        description
        url
        homepageUrl
        stargazerCount
        forkCount
        isArchived
        updatedAt
        primaryLanguage {
          name
        }
        repositoryTopics(first: 4) {
          nodes {
            topic {
              name
            }
          }
        }
      }
    }
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            contributionLevel
            date
            weekday
            color
          }
        }
      }
    }
  }
}
`;

function createEmptyDay(): ContributionDay {
    return {
        date: '',
        count: 0,
        level: 0,
        rawLevel: 'NONE',
        color: '',
    };
}

function createEmptyWeeks(weekCount = 53) {
    return Array.from({ length: weekCount }, () =>
        Array.from({ length: CONTRIBUTION_DAYS }, () => createEmptyDay()),
    );
}

function getContributionLevel(rawLevel: GraphQLContributionLevel) {
    switch (rawLevel) {
        case 'FOURTH_QUARTILE':
            return 4;
        case 'THIRD_QUARTILE':
            return 3;
        case 'SECOND_QUARTILE':
            return 2;
        case 'FIRST_QUARTILE':
            return 1;
        default:
            return 0;
    }
}

function getGraphQLDateRange() {
    const toDate = new Date();
    const to = new Date(
        Date.UTC(
            toDate.getUTCFullYear(),
            toDate.getUTCMonth(),
            toDate.getUTCDate(),
            23,
            59,
            59,
            999,
        ),
    );
    const from = new Date(to);
    from.setUTCFullYear(from.getUTCFullYear() - 1);
    from.setUTCHours(0, 0, 0, 0);

    return {
        from: from.toISOString(),
        to: to.toISOString(),
    };
}

async function fetchGitHubGraphQL(): Promise<GitHubGraphQLResponse | null> {
    const token = githubAboutConfig.token;
    if (!token) {
        console.warn('[about/github] missing GITHUB_TOKEN');
        return null;
    }

    const range = getGraphQLDateRange();

    try {
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'CodeLess-Blog',
            },
            body: JSON.stringify({
                query: GITHUB_REPORT_QUERY,
                variables: {
                    login: GITHUB_USERNAME,
                    from: range.from,
                    to: range.to,
                },
            }),
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            console.error('[about/github] graphql request failed', response.status);
            return null;
        }

        const result = (await response.json()) as GitHubGraphQLResponse;

        if (result.errors?.length) {
            console.error('[about/github] graphql errors', result.errors);
            return null;
        }

        return result;
    } catch (error) {
        console.error('[about/github] graphql fetch failed', error);
        return null;
    }
}

function mapProjectTags(project: GitHubRepositoryNode) {
    const tags = [
        project.primaryLanguage?.name,
        ...project.repositoryTopics.nodes.map((item) => item.topic.name),
    ].filter((tag): tag is string => Boolean(tag));

    return Array.from(new Set(tags)).slice(0, 4);
}

function mapProjects(repositories: GitHubRepositoryNode[]): GitHubProject[] {
    return [...repositories]
        .filter((project) => !project.isArchived)
        .sort((left, right) => {
            if (right.stargazerCount !== left.stargazerCount) {
                return right.stargazerCount - left.stargazerCount;
            }

            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        })
        .map((project) => ({
            id: project.id,
            title: project.name,
            description: project.description,
            tags: mapProjectTags(project),
            link: project.homepageUrl || project.url,
            stars: project.stargazerCount,
            forks: project.forkCount,
            updatedAt: project.updatedAt,
        }));
}

export const getGitHubAboutData = cache(async (): Promise<GitHubAboutData> => {
    const graphQLResult = await fetchGitHubGraphQL();
    const user = graphQLResult?.data?.user;

    if (!user) {
        return {
            profile: null,
            totalStars: 0,
            totalContributions: 0,
            activeDays: 0,
            bestDay: null,
            weeks: createEmptyWeeks(),
            projects: [],
        };
    }

    const weeks = user.contributionsCollection.contributionCalendar.weeks.map((week) => {
        const mappedWeek = Array.from({ length: CONTRIBUTION_DAYS }, () => createEmptyDay());

        week.contributionDays.forEach((day) => {
            mappedWeek[day.weekday] = {
                date: day.date,
                count: day.contributionCount,
                level: getContributionLevel(day.contributionLevel),
                rawLevel: day.contributionLevel,
                color: day.color,
            };
        });

        return mappedWeek;
    });

    const nonZeroDays = weeks
        .flat()
        .filter((day) => day.date)
        .filter((day) => day.count > 0);

    const bestDay = nonZeroDays.reduce<ContributionDay | null>(
        (currentBest, day) => (!currentBest || day.count > currentBest.count ? day : currentBest),
        null,
    );

    const projects = mapProjects(user.repositories.nodes);

    return {
        profile: {
            login: user.login,
            name: user.name,
            bio: user.bio,
            url: user.url,
            followers: user.followers.totalCount,
            publicRepos: user.repositories.totalCount,
        },
        totalStars: user.repositories.nodes.reduce(
            (sum, repository) => sum + repository.stargazerCount,
            0,
        ),
        totalContributions: user.contributionsCollection.contributionCalendar.totalContributions,
        activeDays: nonZeroDays.length,
        bestDay,
        weeks: weeks.length > 0 ? weeks : createEmptyWeeks(),
        projects,
    };
});
