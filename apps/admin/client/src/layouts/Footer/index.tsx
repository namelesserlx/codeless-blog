import { Layout } from 'antd';
import styles from './index.module.less';

const { Footer } = Layout;

export default function BasicFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <Footer className={styles.footer}>
            <div className={styles.content}>
                <div className={styles.copyright}>
                    &copy; {currentYear} {"CodeLess's"} Blog. All rights reserved.
                </div>
                <div className={styles.links}>
                    <span className={styles.link}>
                        <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer">
                            备案号：粤ICP备XXXXXXXXXXXX号-XX
                        </a>
                    </span>
                </div>
            </div>
        </Footer>
    );
}
