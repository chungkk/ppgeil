import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';

const errorMessages = {
    OAuthCallback: {
        vi: 'Có lỗi xảy ra khi xác thực với dịch vụ đăng nhập.',
        tip: 'Vui lòng thử lại hoặc sử dụng phương thức đăng nhập khác.',
    },
    OAuthSignin: {
        vi: 'Không thể bắt đầu quá trình đăng nhập.',
        tip: 'Kiểm tra kết nối mạng và thử lại.',
    },
    OAuthAccountNotLinked: {
        vi: 'Email này đã được liên kết với tài khoản khác.',
        tip: 'Vui lòng đăng nhập bằng phương thức bạn đã sử dụng ban đầu.',
    },
    Callback: {
        vi: 'Lỗi trong quá trình xử lý callback.',
        tip: 'Vui lòng thử đăng nhập lại.',
    },
    AccessDenied: {
        vi: 'Bạn đã từ chối quyền truy cập.',
        tip: 'Để đăng nhập, vui lòng cho phép ứng dụng truy cập thông tin cần thiết.',
    },
    Configuration: {
        vi: 'Có lỗi cấu hình server.',
        tip: 'Vui lòng liên hệ quản trị viên.',
    },
    Default: {
        vi: 'Đã xảy ra lỗi không xác định.',
        tip: 'Vui lòng thử lại sau.',
    },
};

export default function AuthError() {
    const router = useRouter();
    const { error, callbackUrl } = router.query;

    const errorInfo = errorMessages[error] || errorMessages.Default;

    const handleRetry = () => {
        // Go back to homepage or callbackUrl
        const destination = callbackUrl ? decodeURIComponent(callbackUrl) : '/';
        router.push(destination);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 50%, #c44569 100%)',
            color: 'white',
            padding: '20px',
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '400px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '40px 30px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '24px' }}>
                    <Image
                        src="/logo.jpg"
                        alt="PapaGeil"
                        width={80}
                        height={80}
                        style={{ borderRadius: '16px' }}
                    />
                </div>

                {/* Error Icon */}
                <div style={{
                    fontSize: '64px',
                    marginBottom: '16px',
                    lineHeight: 1,
                }}>
                    😔
                </div>

                {/* Title */}
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '12px',
                    margin: '0 0 12px 0',
                }}>
                    Đăng nhập thất bại
                </h1>

                {/* Error Message */}
                <p style={{
                    fontSize: '16px',
                    opacity: 0.95,
                    marginBottom: '8px',
                    lineHeight: 1.5,
                }}>
                    {errorInfo.vi}
                </p>

                {/* Tip */}
                <p style={{
                    fontSize: '14px',
                    opacity: 0.8,
                    marginBottom: '24px',
                    lineHeight: 1.5,
                }}>
                    💡 {errorInfo.tip}
                </p>

                {/* Error Code (small) */}
                {error && (
                    <p style={{
                        fontSize: '12px',
                        opacity: 0.6,
                        marginBottom: '24px',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        display: 'inline-block',
                    }}>
                        Mã lỗi: {error}
                    </p>
                )}

                {/* Buttons */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}>
                    <button
                        onClick={handleRetry}
                        style={{
                            backgroundColor: 'white',
                            color: '#c44569',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        🔄 Thử lại
                    </button>

                    <Link
                        href="/"
                        style={{
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '14px',
                            opacity: 0.9,
                            padding: '10px',
                        }}
                    >
                        ← Về trang chủ
                    </Link>
                </div>
            </div>
        </div>
    );
}
