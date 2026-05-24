import { useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Form, Input, Select, Row, Col, message, TreeSelect } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { roleService } from '@/services/system/role';
import { Role, RoleStatus, CreateRoleRequest, UpdateRoleRequest } from '@blog/shared';

interface RoleModalProps {
    type: 'create' | 'edit';
    role?: Role;
}

interface RoleTreeNode {
    title: string;
    value: number;
    key: number;
    children: RoleTreeNode[];
}

export const RoleModal = NiceModal.create(({ type, role }: RoleModalProps) => {
    const modal = useModal();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [parentRoles, setParentRoles] = useState<Role[]>([]);

    // 获取父角色选项
    const getParentRoles = useCallback(async () => {
        try {
            // 使用 getRoleList 获取完整的角色信息，支持层级结构
            const response = await roleService.getRoleList({
                page: 1,
                pageSize: 1000,
                status: RoleStatus.ACTIVE,
            });
            // 排除当前编辑的角色
            const roles = response.data.list.filter((r) => r.id !== role?.id);
            setParentRoles(roles);
        } catch {
            message.error('获取角色列表失败');
        }
    }, [role?.id]);

    // 获取父角色选项
    useEffect(() => {
        if (modal.visible) {
            getParentRoles();
        }
    }, [modal.visible, getParentRoles]);

    // 回显数据
    useEffect(() => {
        if (modal.visible && type === 'edit' && role) {
            form.setFieldsValue({
                name: role.name,
                code: role.code,
                description: role.description,
                level: role.level,
                status: role.status,
                parentId: role.parentId,
            });
        } else if (modal.visible && type === 'create') {
            form.resetFields();
            form.setFieldsValue({
                status: RoleStatus.ACTIVE,
                level: 1,
            });
        }
    }, [modal.visible, type, role, form]);

    // 提交处理
    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (type === 'create') {
                const createData: CreateRoleRequest = {
                    ...values,
                    level: Number(values.level) || 1,
                };
                await roleService.createRole(createData);
                message.success('角色创建成功');
            } else {
                const updateData: UpdateRoleRequest = {
                    id: role!.id,
                    ...values,
                    level: Number(values.level) || 1,
                };
                await roleService.updateRole(updateData);
                message.success('角色更新成功');
            }

            modal.resolve(true);
            modal.hide();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '操作失败';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [form, type, role, modal]);

    // 取消处理
    const handleCancel = useCallback(() => {
        form.resetFields();
        modal.hide();
    }, [form, modal]);

    // 状态选项
    const statusOptions = useMemo(() => {
        return [
            { label: '激活', value: RoleStatus.ACTIVE },
            { label: '禁用', value: RoleStatus.INACTIVE },
        ];
    }, []);

    // 父角色树形数据
    const roleTreeData = useMemo(() => {
        const buildTree = (roles: Role[], parentId?: number): RoleTreeNode[] => {
            return roles
                .filter((r) => r.parentId === parentId)
                .map((r) => ({
                    title: r.name,
                    value: r.id,
                    key: r.id,
                    children: buildTree(roles, r.id),
                }));
        };
        return buildTree(parentRoles);
    }, [parentRoles]);

    // Modal配置
    const modalConfig = {
        title: type === 'create' ? '新增角色' : '编辑角色',
        open: modal.visible,
        onOk: handleSubmit,
        onCancel: handleCancel,
        confirmLoading: loading,
        width: 600,
        destroyOnHidden: true,
        afterClose: () => modal.remove(),
    };

    return (
        <Modal {...modalConfig}>
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    status: RoleStatus.ACTIVE,
                    level: 1,
                }}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="角色名称"
                            rules={[
                                { required: true, message: '请输入角色名称' },
                                { min: 2, max: 20, message: '角色名称长度为2-20个字符' },
                            ]}
                        >
                            <Input placeholder="请输入角色名称" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="code"
                            label="角色代码"
                            rules={[
                                { required: true, message: '请输入角色代码' },
                                {
                                    pattern: /^[a-zA-Z0-9_-]+$/,
                                    message: '角色代码只能包含字母、数字、下划线和横线',
                                },
                            ]}
                        >
                            <Input placeholder="请输入角色代码" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="level"
                            label="角色等级"
                            rules={[{ required: true, message: '请输入角色等级' }]}
                        >
                            <Input type="number" placeholder="数字越小权限越大" min={0} max={999} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="status" label="状态">
                            <Select placeholder="请选择状态" options={statusOptions} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="parentId" label="父角色">
                    <TreeSelect
                        placeholder="请选择父角色"
                        allowClear
                        treeData={roleTreeData}
                        showSearch
                        treeNodeFilterProp="title"
                    />
                </Form.Item>

                <Form.Item name="description" label="描述">
                    <Input.TextArea
                        rows={3}
                        placeholder="请输入角色描述"
                        maxLength={200}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
});
