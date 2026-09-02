from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        code = response.status_code
        detail = response.data
        if isinstance(detail, dict):
            message = detail.pop('detail', None) or str(exc)
        else:
            message = str(exc)
        response.data = {'code': code, 'message': message, 'data': detail}
    return response
