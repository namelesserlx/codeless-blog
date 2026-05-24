import { useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import {
    UserStatus,
    UserStatusLabels,
    CreateUserRequest,
    UpdateUserRequest,
    RoleOption,
    UserWithRoles,
} from '@blog/shared';
import { userService } from '@/services/system/user';

interface UserModalProps {
    type: 'create' | 'edit';
    user?: UserWithRoles;
}

export const UserModal = NiceModal.create(({ type, user }: UserModalProps) => {
    const modal = useModal();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

    const getRoleOptions = useCallback(async () => {
        try {
            const response = await userService.getRoleOptions();
            setRoleOptions(response.data);
        } catch {
            message.error('获取角色选项失败');
        }
    }, []);

    useEffect(() => {
        if (modal.visible) {
            getRoleOptions();
        }
    }, [modal.visible, getRoleOptions]);

    useEffect(() => {
        if (modal.visible && type === 'edit' && user) {
            form.setFieldsValue({
                username: user.username,
                email: user.email,
                nickname: user.nickname,
                avatar: user.avatar,
                bio: user.bio,
                address: user.address,
                status: user.status,
                roleIds: user.userRoles.map((ur) => ur.role.id),
            });
        } else if (modal.visible && type === 'create') {
            form.resetFields();
            form.setFieldsValue({
                status: UserStatus.ACTIVE,
            });
        }
    }, [modal.visible, type, user, form]);

    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (type === 'create') {
                const createData: CreateUserRequest = {
                    ...values,
                    password: values.password,
                };
                await userService.createUser(createData);
                message.success('用户创建成功');
            } else {
                const updateData: UpdateUserRequest = {
                    id: user!.id,
                    ...values,
                };
                await userService.updateUser(updateData);
                message.success('用户更新成功');
            }

            modal.resolve(true);
            modal.hide();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '操作失败';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [form, type, user, modal]);

    const handleCancel = useCallback(() => {
        form.resetFields();
        modal.hide();
    }, [form, modal]);

    const statusOptions = useMemo(
        () =>
            Object.entries(UserStatusLabels)
                .filter(([value]) => type === 'edit' || value !== UserStatus.DELETED)
                .map(([value, label]) => ({
                    label,
                    value,
                })),
        [type],
    );

    const roleSelectOptions = useMemo(() => {
        return roleOptions.map((role) => ({
            label: role.name,
            value: role.id,
        }));
    }, [roleOptions]);

    const confirmPasswordRules = useMemo(
        () => [
            { required: true, message: '请确认密码' },
            ({ getFieldValue }: { getFieldValue: (name: string) => string }) => ({
                validator(_: unknown, value: string) {
                    if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                },
            }),
        ],
        [],
    );

    return (
        <Modal
            title={type === 'create' ? '新增用户' : '编辑用户'}
            open={modal.visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={loading}
            width={600}
            destroyOnHidden
            afterClose={() => modal.remove()}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    status: UserStatus.ACTIVE,
                }}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="username"
                            label="用户名"
                            rules={[
                                { required: true, message: '请输入用户名' },
                                { min: 3, max: 20, message: '用户名长度为3-20个字符' },
                            ]}
                        >
                            <Input placeholder="请输入用户名" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="email"
                            label="邮箱"
                            rules={[
                                { required: true, message: '请输入邮箱' },
                                { type: 'email', message: '请输入有效的邮箱地址' },
                            ]}
                        >
                            <Input placeholder="请输入邮箱" />
                        </Form.Item>
                    </Col>
                </Row>

                {type === 'create' && (
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="password"
                                label="密码"
                                rules={[
                                    { required: true, message: '请输入密码' },
                                    { min: 6, message: '密码长度至少6个字符' },
                                ]}
                            >
                                <Input.Password placeholder="请输入密码" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="confirmPassword"
                                label="确认密码"
                                dependencies={['password']}
                                rules={confirmPasswordRules}
                            >
                                <Input.Password placeholder="请确认密码" />
                            </Form.Item>
                        </Col>
                    </Row>
                )}

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="nickname"
                            label="昵称"
                            rules={[{ required: true, message: '请输入昵称' }]}
                        >
                            <Input placeholder="请输入昵称" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="status" label="状态">
                            <Select placeholder="请选择状态" options={statusOptions} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="phone" label="手机号">
                            <Input placeholder="请输入手机号" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="address" label="地址">
                    <Input placeholder="请输入地址" />
                </Form.Item>

                <Form.Item name="bio" label="个人简介">
                    <Input.TextArea rows={3} placeholder="请输入个人简介" />
                </Form.Item>

                <Form.Item
                    name="roleIds"
                    label="角色"
                    rules={[{ required: true, message: '请选择角色' }]}
                >
                    <Select
                        mode="multiple"
                        placeholder="请选择角色"
                        allowClear
                        options={roleSelectOptions}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
});
