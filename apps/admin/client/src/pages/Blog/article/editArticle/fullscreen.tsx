import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button, Spin, Typography, message } from 'antd';
import { ArrowLeftOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from 'react-router';
import { articleService } from '@/services/blog/article';
import { ArticleEditor, type ArticleTiptapEditor } from './ArticleEditor';
import {
    extractHeadingsFromArticleEditorContent,
    parseStoredArticleContent,
    serializeArticleEditorContent,
    type ArticleEditorContent,
    type ArticleEditorHeading,
} from './articleEditorContent';
import {
    readArticleEditDraft,
    writeArticleEditDraft,
    type ArticleEditDraft,
} from './articleEditDraft';
import styles from './index.module.less';

const { Title } = Typography;
const FULLSCREEN_BODY_CLASS = 'article-editor-fullscreen-active';
const CONTENT_SYNC_DELAY_MS = 800;
const AUTO_SAVE_INTERVAL_MS = 5000;

interface FullscreenArticleEditorLocationState {
    source?: 'article-list' | 'article-settings';
    returnPath?: string;
}

function resolveFullscreenReturnPath(
    source: FullscreenArticleEditorLocationState['source'] | undefined,
    returnPath: string | undefined,
    draft: ArticleEditDraft | null,
    articleId: string | undefined,
) {
    if (returnPath) {
        return returnPath;
    }

    if (draft?.returnPath) {
        return draft.returnPath;
    }

    if (source === 'article-list') {
        return '/blog/article';
    }

    return articleId ? `/blog/article/edit/${articleId}` : '/blog/article';
}

function createEmptyArticleEditorContent(): ArticleEditorContent {
    return parseStoredArticleContent('');
}

function areHeadingsEqual(left: ArticleEditorHeading[], right: ArticleEditorHeading[]) {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((heading, index) => {
        const nextHeading = right[index];
        return (
            heading.id === nextHeading.id &&
            heading.level === nextHeading.level &&
            heading.text === nextHeading.text
        );
    });
}

function hideEditorFloatingUiBeforeRouteLeave(editor: ArticleTiptapEditor | null) {
    if (!editor || editor.isDestroyed) {
        return;
    }

    const transaction = editor.state.tr;
    let shouldDispatch = false;

    editor.state.plugins.forEach((plugin) => {
        const pluginKey = (plugin as { key?: string }).key;
        if (pluginKey?.startsWith('bubbleMenu')) {
            transaction.setMeta(plugin, 'hide');
            shouldDispatch = true;
        }
    });
    transaction.setMeta('hideDragHandle', true);
    shouldDispatch = true;

    if (shouldDispatch) {
        editor.view.dispatch(transaction);
    }

    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.blur();
}

function detachEditorNodeViewsBeforeRouteLeave(editor: ArticleTiptapEditor | null) {
    if (!editor || editor.isDestroyed) {
        return;
    }

    try {
        editor.view.setProps({ nodeViews: {} });
    } catch {
        // The route is already leaving; ignore teardown races from external node views.
    }
}

export default function FullscreenArticleEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as FullscreenArticleEditorLocationState | null;
    const [initialDraft] = useState(() => (id ? readArticleEditDraft(id) : null));
    const [initialContent] = useState<ArticleEditorContent>(
        () => initialDraft?.content ?? createEmptyArticleEditorContent(),
    );
    const [returnPath] = useState(() =>
        resolveFullscreenReturnPath(
            locationState?.source,
            locationState?.returnPath,
            initialDraft,
            id,
        ),
    );
    const draftRef = useRef<ArticleEditDraft | null>(initialDraft);
    const fullscreenEditorRef = useRef<ArticleTiptapEditor | null>(null);
    const contentSyncTimerRef = useRef<number | undefined>(undefined);
    const autoSaveInFlightRef = useRef(false);
    const lastAutoSavedContentRef = useRef<string | null>(null);
    const leaveFrameRef = useRef<number | undefined>(undefined);
    const isLeavingRef = useRef(false);
    const [tocVisible, setTocVisible] = useState(true);
    const [loading, setLoading] = useState(() => Boolean(id) && !initialDraft);
    const [loadFailed, setLoadFailed] = useState(() => !id);
    const [editorMounted, setEditorMounted] = useState(true);
    const [editorContent, setEditorContent] = useState<ArticleEditorContent>(() => initialContent);
    const editorContentRef = useRef(initialContent);
    const [headings, setHeadings] = useState<ArticleEditorHeading[]>(() =>
        extractHeadingsFromArticleEditorContent(initialContent),
    );
    const headingsRef = useRef(headings);

    const updateHeadingsFromContent = useCallback((content: ArticleEditorContent) => {
        const nextHeadings = extractHeadingsFromArticleEditorContent(content);
        if (areHeadingsEqual(headingsRef.current, nextHeadings)) {
            return;
        }

        headingsRef.current = nextHeadings;
        setHeadings(nextHeadings);
    }, []);

    const persistContentSnapshot = useCallback(
        (content: ArticleEditorContent) => {
            editorContentRef.current = content;

            if (!id) {
                return;
            }

            const nextDraft = writeArticleEditDraft(id, {
                content,
                formValues: draftRef.current?.formValues,
                returnPath,
            });

            if (nextDraft) {
                draftRef.current = nextDraft;
            }
        },
        [id, returnPath],
    );

    const clearContentSyncTimer = useCallback(() => {
        if (contentSyncTimerRef.current === undefined) {
            return;
        }

        window.clearTimeout(contentSyncTimerRef.current);
        contentSyncTimerRef.current = undefined;
    }, []);

    const syncEditorContent = useCallback(() => {
        const latestContent = fullscreenEditorRef.current?.getJSON();
        if (!latestContent) {
            return editorContentRef.current;
        }

        persistContentSnapshot(latestContent);
        updateHeadingsFromContent(latestContent);
        return latestContent;
    }, [persistContentSnapshot, updateHeadingsFromContent]);

    const saveContentToServer = useCallback(
        async (options: { notify?: boolean } = {}) => {
            if (!id) {
                if (options.notify) {
                    message.error('文章ID不存在，保存失败');
                }
                return;
            }

            if (autoSaveInFlightRef.current) {
                if (options.notify) {
                    message.info('正在保存中...');
                }
                return;
            }

            const content = syncEditorContent();
            const serializedContent = serializeArticleEditorContent(content);
            if (serializedContent === lastAutoSavedContentRef.current) {
                if (options.notify) {
                    message.success('已保存');
                }
                return;
            }

            autoSaveInFlightRef.current = true;
            try {
                await articleService.updateArticle({
                    id,
                    content: serializedContent,
                });
                lastAutoSavedContentRef.current = serializedContent;
                if (options.notify) {
                    message.success('保存成功');
                }
            } catch {
                if (options.notify) {
                    message.error('保存失败');
                }
            } finally {
                autoSaveInFlightRef.current = false;
            }
        },
        [id, syncEditorContent],
    );

    const autoSaveContent = useCallback(async () => {
        await saveContentToServer();
    }, [saveContentToServer]);

    const manualSaveContent = useCallback(async () => {
        await saveContentToServer({ notify: true });
    }, [saveContentToServer]);

    const scheduleContentSync = useCallback(() => {
        clearContentSyncTimer();
        contentSyncTimerRef.current = window.setTimeout(() => {
            contentSyncTimerRef.current = undefined;
            syncEditorContent();
        }, CONTENT_SYNC_DELAY_MS);
    }, [clearContentSyncTimer, syncEditorContent]);

    useEffect(() => {
        return () => {
            clearContentSyncTimer();
            if (leaveFrameRef.current !== undefined) {
                window.cancelAnimationFrame(leaveFrameRef.current);
            }
            syncEditorContent();
        };
    }, [clearContentSyncTimer, syncEditorContent]);

    useEffect(() => {
        document.body.classList.add(FULLSCREEN_BODY_CLASS);
        return () => {
            document.body.classList.remove(FULLSCREEN_BODY_CLASS);
        };
    }, []);

    useEffect(() => {
        if (!id || initialDraft) {
            return;
        }

        let disposed = false;

        articleService
            .getArticleDetail(id)
            .then((res) => {
                if (disposed) {
                    return;
                }

                const content = parseStoredArticleContent(res.data.content);
                editorContentRef.current = content;
                lastAutoSavedContentRef.current = serializeArticleEditorContent(content);
                setEditorContent(content);
                updateHeadingsFromContent(content);
            })
            .catch((error: unknown) => {
                if (disposed) {
                    return;
                }

                const errorMessage = error instanceof Error ? error.message : '加载文章失败';
                setLoadFailed(true);
                message.error(`加载文章失败: ${errorMessage}`);
            })
            .finally(() => {
                if (!disposed) {
                    setLoading(false);
                }
            });

        return () => {
            disposed = true;
        };
    }, [id, initialDraft, updateHeadingsFromContent]);

    const handleFullscreenEditorReady = useCallback((editor: ArticleTiptapEditor) => {
        fullscreenEditorRef.current = editor;
    }, []);

    useEffect(() => {
        if (!id || loading || loadFailed) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void autoSaveContent();
        }, AUTO_SAVE_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [autoSaveContent, id, loadFailed, loading]);

    const handleExit = useCallback(() => {
        if (isLeavingRef.current) {
            return;
        }

        isLeavingRef.current = true;
        clearContentSyncTimer();
        syncEditorContent();

        flushSync(() => {
            hideEditorFloatingUiBeforeRouteLeave(fullscreenEditorRef.current);
        });
        void autoSaveContent();

        leaveFrameRef.current = window.requestAnimationFrame(() => {
            leaveFrameRef.current = undefined;

            flushSync(() => {
                detachEditorNodeViewsBeforeRouteLeave(fullscreenEditorRef.current);
                setEditorMounted(false);
                fullscreenEditorRef.current = null;
            });

            leaveFrameRef.current = window.requestAnimationFrame(() => {
                leaveFrameRef.current = undefined;
                navigate(returnPath, { replace: true });
            });
        });
    }, [autoSaveContent, clearContentSyncTimer, navigate, returnPath, syncEditorContent]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void manualSaveContent();
                return;
            }

            if (event.key === 'Escape') {
                handleExit();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleExit, manualSaveContent]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            clearContentSyncTimer();
            syncEditorContent();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [clearContentSyncTimer, syncEditorContent]);

    const scrollToHeading = useCallback((headingText: string) => {
        const editorContainer = document.querySelector<HTMLElement>(
            `.${styles.fullscreenEditorInstance} [data-nameless-editor-content="true"]`,
        );
        if (!editorContainer) return;

        const headingElements = editorContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const el of headingElements) {
            if (el.textContent?.trim() === headingText.trim()) {
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest',
                });
                break;
            }
        }
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div className={styles.editorLoading}>
                    <Spin size="large" description="加载文章中..." />
                </div>
            );
        }

        if (loadFailed) {
            return (
                <div className={styles.errorContainer}>
                    <Title level={4}>文章不存在或加载失败</Title>
                    <Button type="primary" onClick={() => navigate('/blog/article')}>
                        返回列表
                    </Button>
                </div>
            );
        }

        if (!editorMounted) {
            return null;
        }

        return (
            <ArticleEditor
                content={editorContent}
                onUpdate={scheduleContentSync}
                onReady={handleFullscreenEditorReady}
                articleId={id}
                className={styles.fullscreenEditorInstance}
                contentClassName={styles.fullscreenEditorContent}
            />
        );
    };

    return (
        <div className={styles.fullscreenModal}>
            <div className={styles.fullscreenEditor}>
                <div
                    className={`${styles.fullscreenLeft} ${
                        tocVisible ? styles.expanded : styles.collapsed
                    }`}
                >
                    <div className={styles.leftActions}>
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={handleExit}
                            title="返回"
                            aria-label="返回"
                        />
                        <Button
                            type="text"
                            icon={tocVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                            onClick={() => setTocVisible((visible) => !visible)}
                            title={tocVisible ? '收起目录' : '展开目录'}
                            aria-label={tocVisible ? '收起目录' : '展开目录'}
                        />
                    </div>

                    {tocVisible && (
                        <div className={styles.tocContainer}>
                            <div className={styles.tocTitle}>文章目录</div>
                            <div className={styles.tocList}>
                                {headings.length > 0 ? (
                                    headings.map((heading) => (
                                        <div
                                            key={heading.id}
                                            className={`${styles.tocItem} ${
                                                styles[`tocLevel${heading.level}`]
                                            }`}
                                            onClick={() => scrollToHeading(heading.text)}
                                            title={heading.text}
                                        >
                                            {heading.text}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.tocEmpty}>暂无标题</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div
                    className={`${styles.fullscreenRight} ${
                        tocVisible ? styles.withToc : styles.withoutToc
                    }`}
                >
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
