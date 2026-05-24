import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    Card,
    Button,
    Upload,
    Avatar,
    Typography,
    Input,
    message,
    Form,
    Modal,
    Space,
    Steps,
    Tag,
} from 'antd';
import type { InputRef } from 'antd';
import {
    GithubOutlined,
    GoogleOutlined,
    UserOutlined,
    PhoneOutlined,
    MailOutlined,
    EditOutlined,
    MobileOutlined,
    LoadingOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './index.module.less';
import type { RcFile, UploadProps } from 'antd/es/upload/interface';
import type { LoginUserInfo } from '@blog/shared';
import { clientEnv } from '@/config/env';
import useUserStore from '@/stores/user';
import { userService } from '@/services/system/user';
import { authService } from '@/services/auth';
import { authStorage } from '@/utils/authStorage';
const { Text } = Typography;
type UploadRequestOptions = Parameters<NonNullable<UploadProps['customRequest']>>[0];
type SecurityModalType = 'password' | 'phone' | 'email';

interface SecurityFormValues {
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
    phone?: string;
    email?: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

const maskEmail = (email?: string) => {
    if (!email) return '-';
    const [name, domain] = email.split('@');
    if (!domain) return email;

    const visibleName = name.length <= 2 ? name[0] : `${name.slice(0, 2)}***`;
    return `${visibleName}@${domain}`;
};

// 将File对象转为base64
const getBase64 = (img: RcFile, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
};
function UserProfile() {
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<LoginUserInfo | null>(authStorage.getUserInfo());
    const updateUserInfo = useUserStore((s) => s.updateUserInfo);
    const unbindGoogle = useUserStore((s) => s.unbindGoogle);
    const unbindGithub = useUserStore((s) => s.unbindGithub);
    const [imageUrl, setImageUrl] = useState<string | null>(userInfo?.avatar || null);
    // 添加昵称编辑相关状态
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nicknameValue, setNicknameValue] = useState<string>(userInfo?.nickname || '');
    const nicknameInputRef = useRef<InputRef | null>(null);
    const [securityForm] = Form.useForm<SecurityFormValues>();
    const [securityModalType, setSecurityModalType] = useState<SecurityModalType | null>(null);
    const [securitySubmitting, setSecuritySubmitting] = useState(false);
    const [passwordStep, setPasswordStep] = useState(0);
    const [passwordChangeToken, setPasswordChangeToken] = useState<string | null>(null);
    const [sendingPasswordCode, setSendingPasswordCode] = useState(false);

    const syncUserInfoFromStorage = useCallback(() => {
        const latestUserInfo = authStorage.getUserInfo();
        setUserInfo(latestUserInfo);
        setImageUrl(latestUserInfo?.avatar || null);
        setNicknameValue(latestUserInfo?.nickname || '');
        return latestUserInfo;
    }, []);

    const refreshProfileDetail = useCallback(async () => {
        const currentUserInfo = authStorage.getUserInfo();
        if (!currentUserInfo?.id) return;

        const response = await userService.getUserDetail(currentUserInfo.id);
        if (response.code !== 0 || !response.data) return;

        const nextUserInfo: LoginUserInfo = {
            ...currentUserInfo,
            ...response.data,
            roles: response.data.userRoles.map(({ role }) => ({
                id: role.id,
                name: role.name,
                code: role.code,
                level: currentUserInfo.roles?.find((item) => item.code === role.code)?.level ?? 0,
            })),
        };

        authStorage.setUserInfo(nextUserInfo);
        setUserInfo(nextUserInfo);
        setImageUrl(nextUserInfo.avatar || null);
        setNicknameValue(nextUserInfo.nickname || '');
    }, []);

    useEffect(() => {
        void refreshProfileDetail();
    }, [refreshProfileDetail]);

    const beforeUpload = (file: RcFile) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('只能上传 JPG/PNG 格式的图片!');
        }
        const isLt3M = file.size / 1024 / 1024 < 3;
        if (!isLt3M) {
            message.error('图片大小不能超过 3MB!');
        }
        return isJpgOrPng && isLt3M;
    };

    const customUpload: NonNullable<UploadProps['customRequest']> = async ({
        file,
        onSuccess,
        onError,
    }: UploadRequestOptions) => {
        try {
            setLoading(true);

            if (!userInfo) {
                throw new Error('用户未登录');
            }

            const uploadFile = file as File;
            const result = await userService.uploadAvatar(uploadFile);
            if (result.code === 0) {
                // 更新用户信息
                const newUserInfo = {
                    ...userInfo,
                    avatar: result.data.avatar,
                };
                setUserInfo(newUserInfo);
                updateUserInfo({ avatar: result.data.avatar });

                getBase64(uploadFile as RcFile, (url) => {
                    setImageUrl(url);
                });

                if (onSuccess) {
                    onSuccess(result);
                }
                message.success('头像更新成功');
            }
        } catch (error: unknown) {
            console.error('上传失败:', error);
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof (error as { response?: { status?: number } }).response?.status ===
                    'number' &&
                (error as { response?: { status?: number } }).response?.status === 401
            ) {
                message.error('请重新登录后再试');
                return;
            }
            if (onError) {
                onError(error instanceof Error ? error : new Error('未知错误'));
            }
            message.error(`上传失败: ${getErrorMessage(error, '未知错误')}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNickname = useCallback(async () => {
        if (!userInfo) return;
        if (!nicknameValue.trim()) {
            message.error('昵称不能为空');
            return;
        }

        if (nicknameValue === userInfo.nickname) {
            setIsEditingNickname(false);
            return;
        }
        try {
            await updateUserInfo({ nickname: nicknameValue });
            syncUserInfoFromStorage();
            message.success('昵称更新成功');
        } catch (error) {
            if (error instanceof Error) {
                message.error('更新失败: ' + error.message);
            } else {
                message.error('更新失败');
            }
            // 恢复原来的昵称
            setNicknameValue(userInfo.nickname || '');
        } finally {
            setIsEditingNickname(false);
        }
    }, [nicknameValue, syncUserInfoFromStorage, updateUserInfo, userInfo]);

    const handleEditNickname = useCallback(() => {
        setIsEditingNickname(true);
        // 确保状态更新后再聚焦
        setTimeout(() => {
            nicknameInputRef.current?.focus();
        }, 0);
    }, []);

    const handleUnbindGithub = async () => {
        try {
            await unbindGithub();
            message.success('GitHub账号解绑成功');
            authStorage.updateUserInfo({ githubId: undefined });
            syncUserInfoFromStorage();
        } catch (error: unknown) {
            message.error(getErrorMessage(error, 'GitHub账号解绑失败'));
        }
    };

    const handleUnbindGoogle = async () => {
        try {
            await unbindGoogle();
            message.success('Google账号解绑成功');
            authStorage.updateUserInfo({ googleId: undefined });
            syncUserInfoFromStorage();
        } catch (error: unknown) {
            message.error(getErrorMessage(error, 'Google账号解绑失败'));
        }
    };

    const handleGithubAuth = () => {
        const clientId = clientEnv.oauth.githubClientId;
        const redirectUri = clientEnv.oauth.githubCallbackUrl;
        const state = 'bind'; // 使用state参数标识绑定操作
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`;
    };
    const handleGoogleAuth = () => {
        const clientId = clientEnv.oauth.googleClientId;
        const redirectUri = clientEnv.oauth.googleCallbackUrl;
        const state = 'bind'; // 使用state参数标识绑定操作
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email&state=${state}`;
    };

    const roleNames = useMemo(
        () => userInfo?.roles?.map((role) => role.name).filter(Boolean) ?? [],
        [userInfo?.roles],
    );

    const securityModalTitle = useMemo(() => {
        switch (securityModalType) {
            case 'password':
                return '修改登录密码';
            case 'phone':
                return userInfo?.phone ? '修改绑定手机' : '绑定手机';
            case 'email':
                return userInfo?.email ? '修改绑定邮箱' : '绑定邮箱';
            default:
                return '';
        }
    }, [securityModalType, userInfo?.email, userInfo?.phone]);

    const handleOpenSecurityModal = useCallback(
        (type: SecurityModalType) => {
            if (type === 'password' && !userInfo?.email) {
                message.warning('请先绑定邮箱后再修改密码');
                return;
            }

            setSecurityModalType(type);
            securityForm.resetFields();
            setPasswordStep(0);
            setPasswordChangeToken(null);

            if (type === 'phone') {
                securityForm.setFieldsValue({ phone: userInfo?.phone || '' });
            }

            if (type === 'email') {
                securityForm.setFieldsValue({ email: userInfo?.email || '' });
            }
        },
        [securityForm, userInfo?.email, userInfo?.phone],
    );

    const handleCloseSecurityModal = useCallback(() => {
        setSecurityModalType(null);
        setPasswordStep(0);
        setPasswordChangeToken(null);
        securityForm.resetFields();
    }, [securityForm]);

    const handleSendPasswordCode = useCallback(async () => {
        try {
            setSendingPasswordCode(true);
            const result = await authService.sendPasswordChangeCode();
            message.success(`验证码已发送至 ${maskEmail(result.data.email)}`);
        } catch (error) {
            message.error(getErrorMessage(error, '验证码发送失败'));
        } finally {
            setSendingPasswordCode(false);
        }
    }, []);

    const handleSubmitSecurityForm = useCallback(
        async (values: SecurityFormValues) => {
            if (!securityModalType) return;

            try {
                setSecuritySubmitting(true);

                if (securityModalType === 'password') {
                    if (passwordStep === 0) {
                        const result = await authService.verifyPasswordChangeCode({
                            code: values.code || '',
                        });
                        setPasswordChangeToken(result.data.token);
                        setPasswordStep(1);
                        securityForm.resetFields(['newPassword', 'confirmPassword']);
                        message.success('邮箱验证通过');
                        return;
                    }

                    if (!passwordChangeToken) {
                        message.error('请先完成邮箱验证');
                        setPasswordStep(0);
                        return;
                    }

                    await authService.changePassword({
                        token: passwordChangeToken,
                        newPassword: values.newPassword || '',
                    });
                    message.success('密码修改成功');
                }

                if (securityModalType === 'phone') {
                    await updateUserInfo({ phone: values.phone?.trim() });
                    syncUserInfoFromStorage();
                    message.success(userInfo?.phone ? '手机号修改成功' : '手机号绑定成功');
                }

                if (securityModalType === 'email') {
                    await updateUserInfo({ email: values.email?.trim() });
                    syncUserInfoFromStorage();
                    message.success(userInfo?.email ? '邮箱修改成功' : '邮箱绑定成功');
                }

                handleCloseSecurityModal();
            } catch (error) {
                message.error(getErrorMessage(error, '操作失败'));
            } finally {
                setSecuritySubmitting(false);
            }
        },
        [
            handleCloseSecurityModal,
            passwordChangeToken,
            passwordStep,
            securityForm,
            securityModalType,
            syncUserInfoFromStorage,
            updateUserInfo,
            userInfo?.email,
            userInfo?.phone,
        ],
    );

    const uploadButton = (
        <div>
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>上传</div>
        </div>
    );

    return (
        <div className={styles.profileContainer}>
            {/* 左侧头像区域 */}
            <div className={styles.basicInfo}>
                <Card
                    title="基本信息"
                    actions={[
                        <span key="registerTime">
                            注册于：
                            {userInfo?.createdAt
                                ? dayjs(userInfo.createdAt).format('YYYY-MM-DD')
                                : '-'}
                        </span>,
                    ]}
                >
                    <div className={styles.baseInfoSection}>
                        <div className={styles.avatarWrapper}>
                            <Upload
                                name="avatar"
                                listType="picture-circle"
                                className={styles.avatarUpload}
                                showUploadList={false}
                                customRequest={customUpload}
                                beforeUpload={beforeUpload}
                            >
                                {imageUrl ? <Avatar size={120} src={imageUrl} /> : uploadButton}
                            </Upload>
                            <div className={styles.nicknameWrapper}>
                                {isEditingNickname ? (
                                    <Input
                                        ref={nicknameInputRef}
                                        variant="borderless"
                                        value={nicknameValue}
                                        onChange={(e) => {
                                            setNicknameValue(e.target.value);
                                        }}
                                        onPressEnter={handleSaveNickname}
                                        onBlur={handleSaveNickname}
                                        style={{ width: 150, fontSize: 20, textAlign: 'center' }}
                                    />
                                ) : (
                                    <>
                                        <span className={styles.nickname}>{nicknameValue}</span>
                                        <EditOutlined
                                            className={styles.editIcon}
                                            onClick={handleEditNickname}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={styles.infoSection}>
                            <div className={styles.infoList}>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>
                                        <UserOutlined />
                                        用户名
                                    </div>
                                    <div className={styles.infoValue}>{userInfo?.username}</div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>
                                        <PhoneOutlined />
                                        手机号
                                    </div>
                                    <div className={styles.infoValue}>
                                        {userInfo?.phone || '未设置'}
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>
                                        <MailOutlined />
                                        邮箱
                                    </div>
                                    <div className={styles.infoValue}>
                                        {userInfo?.email || '未设置'}
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>
                                        <UserOutlined />
                                        角色
                                    </div>
                                    <div className={styles.infoValue}>
                                        {roleNames.length > 0 ? (
                                            <Space size={[4, 4]} wrap>
                                                {roleNames.map((roleName) => (
                                                    <Tag key={roleName} color="blue">
                                                        {roleName}
                                                    </Tag>
                                                ))}
                                            </Space>
                                        ) : (
                                            '-'
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className={styles.right}>
                {/* 安全设置卡片 */}
                <div className={styles.securityCard}>
                    <Card title="安全设置">
                        <div className={styles.securityList}>
                            <div className={styles.securityItem}>
                                <div className={styles.securityInfo}>
                                    <div className={styles.securityTitle}>登录密码</div>
                                    <div className={styles.securityDesc}>用于保护账号安全</div>
                                </div>
                                <div className={styles.securityAction}>
                                    <Button
                                        type="link"
                                        icon={<EditOutlined />}
                                        onClick={() => handleOpenSecurityModal('password')}
                                    >
                                        修改
                                    </Button>
                                </div>
                            </div>

                            <div className={styles.securityItem}>
                                <div className={styles.securityInfo}>
                                    <div className={styles.securityTitle}>绑定手机</div>
                                    <div className={styles.securityDesc}>
                                        {userInfo?.phone
                                            ? `已绑定：${userInfo?.phone}`
                                            : '未绑定手机号'}
                                    </div>
                                </div>
                                <div className={styles.securityAction}>
                                    <Button
                                        type="link"
                                        icon={<MobileOutlined />}
                                        onClick={() => handleOpenSecurityModal('phone')}
                                    >
                                        {userInfo?.phone ? '修改' : '绑定'}
                                    </Button>
                                </div>
                            </div>

                            <div className={styles.securityItem}>
                                <div className={styles.securityInfo}>
                                    <div className={styles.securityTitle}>绑定邮箱</div>
                                    <div className={styles.securityDesc}>
                                        {userInfo?.email
                                            ? `已绑定：${userInfo?.email}`
                                            : '未绑定邮箱'}
                                    </div>
                                </div>
                                <div className={styles.securityAction}>
                                    <Button
                                        type="link"
                                        icon={<MailOutlined />}
                                        onClick={() => handleOpenSecurityModal('email')}
                                    >
                                        {userInfo?.email ? '修改' : '绑定'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                {/* 第三方账号卡片 */}
                <div className={styles.thirdPartyCard}>
                    <Card title="第三方账号">
                        <div className={styles.thirdPartyList}>
                            <div className={styles.thirdPartyItem}>
                                <div className={styles.platformInfo}>
                                    <GithubOutlined className={styles.platformIcon} />
                                    <span className={styles.platformName}>GitHub 账号</span>
                                </div>
                                <div className={styles.platformStatus}>
                                    {userInfo?.githubId ? (
                                        <>
                                            <Text type="success" className={styles.statusText}>
                                                已绑定
                                            </Text>
                                            <Button
                                                danger
                                                size="small"
                                                className={styles.statusAction}
                                                onClick={handleUnbindGithub}
                                            >
                                                解绑
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="primary"
                                            size="small"
                                            className={styles.statusAction}
                                            onClick={handleGithubAuth}
                                        >
                                            绑定
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.thirdPartyItem}>
                                <div className={styles.platformInfo}>
                                    <GoogleOutlined className={styles.platformIcon} />
                                    <span className={styles.platformName}>Google 账号</span>
                                </div>
                                <div className={styles.platformStatus}>
                                    {userInfo && 'googleId' in userInfo && userInfo.googleId ? (
                                        <>
                                            <Text type="success" className={styles.statusText}>
                                                已绑定
                                            </Text>
                                            <Button
                                                danger
                                                size="small"
                                                className={styles.statusAction}
                                                onClick={handleUnbindGoogle}
                                            >
                                                解绑
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            type="primary"
                                            size="small"
                                            className={styles.statusAction}
                                            onClick={handleGoogleAuth}
                                        >
                                            绑定
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            <Modal
                title={securityModalTitle}
                open={Boolean(securityModalType)}
                onOk={() => securityForm.submit()}
                onCancel={handleCloseSecurityModal}
                okText={securityModalType === 'password' && passwordStep === 0 ? '下一步' : '确定'}
                confirmLoading={securitySubmitting}
                destroyOnHidden
            >
                <Form form={securityForm} layout="vertical" onFinish={handleSubmitSecurityForm}>
                    {securityModalType === 'password' && (
                        <>
                            <Steps
                                size="small"
                                current={passwordStep}
                                items={[{ title: '邮箱验证' }, { title: '设置新密码' }]}
                                style={{ marginBottom: 24 }}
                            />
                            {passwordStep === 0 && (
                                <>
                                    <Form.Item label="当前邮箱">
                                        <Input value={maskEmail(userInfo?.email)} disabled />
                                    </Form.Item>
                                    <Form.Item label="邮箱验证码" required>
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Form.Item
                                                name="code"
                                                noStyle
                                                rules={[
                                                    { required: true, message: '请输入验证码' },
                                                    { len: 6, message: '验证码为6位数字' },
                                                ]}
                                            >
                                                <Input placeholder="请输入邮箱验证码" />
                                            </Form.Item>
                                            <Button
                                                htmlType="button"
                                                loading={sendingPasswordCode}
                                                onClick={handleSendPasswordCode}
                                            >
                                                发送验证码
                                            </Button>
                                        </Space.Compact>
                                    </Form.Item>
                                </>
                            )}
                            {passwordStep === 1 && (
                                <>
                                    <Form.Item
                                        name="newPassword"
                                        label="新密码"
                                        rules={[
                                            { required: true, message: '请输入新密码' },
                                            { min: 6, message: '密码长度至少6个字符' },
                                        ]}
                                    >
                                        <Input.Password placeholder="请输入新密码" />
                                    </Form.Item>
                                    <Form.Item
                                        name="confirmPassword"
                                        label="确认新密码"
                                        dependencies={['newPassword']}
                                        rules={[
                                            { required: true, message: '请确认新密码' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (
                                                        !value ||
                                                        getFieldValue('newPassword') === value
                                                    ) {
                                                        return Promise.resolve();
                                                    }

                                                    return Promise.reject(
                                                        new Error('两次输入的密码不一致'),
                                                    );
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password placeholder="请再次输入新密码" />
                                    </Form.Item>
                                </>
                            )}
                        </>
                    )}

                    {securityModalType === 'phone' && (
                        <Form.Item
                            name="phone"
                            label="手机号"
                            rules={[
                                { required: true, message: '请输入手机号' },
                                {
                                    pattern: /^[0-9+\-\s]{6,20}$/,
                                    message: '请输入有效的手机号',
                                },
                            ]}
                        >
                            <Input placeholder="请输入手机号" />
                        </Form.Item>
                    )}

                    {securityModalType === 'email' && (
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
                    )}
                </Form>
            </Modal>
        </div>
    );
}

export { UserProfile as Component };
