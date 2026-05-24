interface Option {
    value: string;
    label: string;
}

/**
 * 将值转换为标签
 * @param options 选项列表
 * @param value 值
 * @returns 标签
 */
export const valueToTags = (options: Option[], value: string) => {
    return options.find((option) => option.value === value)?.label;
};
