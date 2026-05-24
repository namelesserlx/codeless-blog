import '../bootstrap/load-env';
import { initSearchIndexes } from '../lib/meilisearch';
import { articleSearchService } from '../services/search/article';

/**
 * 初始化 MeiliSearch 搜索引擎
 */
async function main() {
    try {
        console.log('🚀 开始初始化 MeiliSearch...');

        // 1. 初始化索引配置
        console.log('📋 步骤 1: 初始化索引配置...');
        await initSearchIndexes();

        // 2. 索引所有文章
        console.log('📋 步骤 2: 索引所有现有文章...');
        await articleSearchService.reindexAll();

        console.log('✅ MeiliSearch 初始化完成！');
        process.exit(0);
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        process.exit(1);
    }
}

main();
