"""通用工具函数"""


def client_ip(request):
    """获取客户端真实 IP（支持反向代理场景）"""
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
