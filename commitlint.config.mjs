export default {
    parserPreset: {
        parserOpts: {
            headerPattern: /^((?:[^\p{L}\p{N}\s]+\s+)?)?(\w+)(?:\(([^)]+)\))?(!)?:\s(.+)$/u,
            headerCorrespondence: ['emoji', 'type', 'scope', 'breaking', 'subject'],
        },
    },
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'init', // 🎉 项目初始化
                'feat', // ✨ 添加新特性
                'fix', // 🐞 修复 bug
                'docs', // 📃 仅修改文档
                'style', // 🌈 仅修改空格、格式缩进、逗号等，不改变代码逻辑
                'refactor', // 🦄 代码重构，没有新增功能或者修复 bug
                'perf', // 🎈 优化相关，比如提升性能、体验
                'test', // 🧪 增加测试用例
                'build', // 🔧 依赖、构建、工程脚本相关
                'ci', // 🎡 CI 配置相关，例如 k8s、docker 配置文件修改
                'chore', // 🐳 改变构建流程、增加依赖库、工具等
                'revert', // ↩ 回滚
            ],
        ],
        'subject-case': [0],
        'subject-full-stop': [0],
    },
};
