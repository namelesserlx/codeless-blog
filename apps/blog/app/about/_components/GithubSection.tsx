import { Activity, FolderGit2, Star, Users } from 'lucide-react';
import { GitHubIcon as Github } from '@/components/icons/GitHubIcon';
import { getGitHubAboutData } from '@/components/about/github-data';
import { isGitHubAboutEnabled } from '@/config/services/github';

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
const CONTRIBUTION_COLOR_CLASSES = [
    'bg-slate-100 dark:bg-slate-800',
    'bg-sky-200 dark:bg-sky-500/40',
    'bg-sky-300 dark:bg-sky-500/60',
    'bg-sky-400 dark:bg-sky-500/80',
    'bg-sky-500 dark:bg-sky-400',
] as const;

function getContributionClass(level: number) {
    const safeLevel = Math.max(0, Math.min(level, 4));

    return CONTRIBUTION_COLOR_CLASSES[safeLevel];
}

function formatShortDate(value: string) {
    if (!value) {
        return '--';
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function getMonthLabel(dateValue: string) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(`${dateValue}T00:00:00.000Z`);
    return MONTH_NAMES[date.getUTCMonth()];
}

function getMonthMarkers(weeks: Awaited<ReturnType<typeof getGitHubAboutData>>['weeks']) {
    return weeks.map((week, weekIndex) => {
        const datedDays = week.filter((day) => day.date);

        if (datedDays.length === 0) {
            return '';
        }

        if (weekIndex === 0) {
            return getMonthLabel(datedDays[0].date);
        }

        const firstOfMonth = datedDays.find((day) => {
            const date = new Date(`${day.date}T00:00:00.000Z`);
            return date.getUTCDate() === 1;
        });

        return firstOfMonth ? getMonthLabel(firstOfMonth.date) : '';
    });
}

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof FolderGit2;
    label: string;
    value: string;
}) {
    return (
        <div className="flex min-w-[112px] flex-col rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <Icon className="mb-2 h-5 w-5 text-sky-500" />
            <span className="text-lg font-bold text-slate-900 dark:text-white">{value}</span>
            <span className="mt-1 text-xs text-slate-500">{label}</span>
        </div>
    );
}

export function GithubSectionFallback() {
    return (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                    <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-56 rounded bg-slate-100 dark:bg-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-20 w-[112px] rounded-xl bg-slate-100 dark:bg-slate-800/70"
                        />
                    ))}
                </div>
            </div>
            <div className="overflow-x-auto pb-2">
                <div className="inline-grid min-w-max grid-cols-[32px_auto] gap-x-3 gap-y-2">
                    <div />
                    <div className="flex gap-1">
                        {Array.from({ length: 53 }).map((_, weekIndex) => (
                            <div key={weekIndex} className="relative h-4 w-3 shrink-0" />
                        ))}
                    </div>

                    <div className="flex flex-col gap-1 pt-0.5 text-[11px] leading-3 text-slate-500 dark:text-slate-400">
                        {WEEKDAY_LABELS.map((label, dayIndex) => (
                            <div key={`${label}-${dayIndex}`} className="flex h-3 items-center">
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-1">
                        {Array.from({ length: 53 }).map((_, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {Array.from({ length: 7 }).map((__, dayIndex) => (
                                    <div
                                        key={dayIndex}
                                        className={`h-3 w-3 rounded-none ${getContributionClass(0)}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export async function GithubSection() {
    if (!isGitHubAboutEnabled) {
        return null;
    }

    const data = await getGitHubAboutData();
    const profileName = data.profile?.name || data.profile?.login || 'your-username';
    const profileLogin = data.profile?.login || 'your-username';
    const profileUrl = data.profile?.url || 'https://github.com/your-username';
    const profileBio = data.profile?.bio;
    const monthMarkers = getMonthMarkers(data.weeks);

    return (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                            <Github className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                GitHub 开源贡献
                            </h3>
                            <a
                                href={profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-slate-500 transition-colors hover:text-sky-500 dark:text-slate-400"
                            >
                                @{profileLogin}
                            </a>
                        </div>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {profileBio || `${profileName} 的公开仓库与最近一年的 GitHub 贡献热力图。`}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                        icon={FolderGit2}
                        label="公开仓库"
                        value={`${data.profile?.publicRepos ?? 0}`}
                    />
                    <StatCard
                        icon={Users}
                        label="关注者"
                        value={`${data.profile?.followers ?? 0}`}
                    />
                    <StatCard icon={Star} label="累计 Stars" value={`${data.totalStars}`} />
                    <StatCard
                        icon={Activity}
                        label="近一年贡献"
                        value={`${data.totalContributions}`}
                    />
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div className="inline-grid min-w-max grid-cols-[32px_auto] gap-x-3 gap-y-2">
                    <div />
                    <div className="flex gap-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                        {monthMarkers.map((label, weekIndex) => (
                            <div
                                key={`${label}-${weekIndex}`}
                                className="relative h-4 w-3 shrink-0"
                            >
                                {label ? (
                                    <span className="absolute top-0 left-0">{label}</span>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1 pt-0.5 text-[11px] leading-3 text-slate-500 dark:text-slate-400">
                        {WEEKDAY_LABELS.map((label, dayIndex) => (
                            <div key={`${label}-${dayIndex}`} className="flex h-3 items-center">
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-1">
                        {data.weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {week.map((day, dayIndex) => (
                                    <div
                                        key={`${day.date || weekIndex}-${dayIndex}`}
                                        className={`h-3 w-3 rounded-none transition-colors hover:ring-2 hover:ring-sky-500/35 ${getContributionClass(day.level)}`}
                                        title={
                                            day.date
                                                ? `${day.date} · ${day.count} contributions · ${day.rawLevel}`
                                                : 'No contributions'
                                        }
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between dark:text-slate-400">
                <div className="flex items-center gap-4">
                    <span>活跃天数 {data.activeDays}</span>
                    <span>
                        最高单日{' '}
                        {data.bestDay
                            ? `${data.bestDay.count} (${formatShortDate(data.bestDay.date)})`
                            : '0'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span>Less</span>
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, level) => (
                            <div
                                key={level}
                                className={`h-3 w-3 rounded-none ${getContributionClass(level)}`}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
